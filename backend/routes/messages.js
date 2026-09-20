import express from 'express';
import pool from '../config/database.js';
import { createNotification } from '../services/notificationService.js';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = express.Router();

router.get('/user/:authUserId', requireSelf(), async (req, res) => {
  try {
    const { authUserId } = req.params;
    const { type = 'all' } = req.query;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE auth_user_id = ?',
      [authUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;
    let query;
    let params;

    if (type === 'archived') {
      query = `
        SELECT m.*, 
          l.title as listing_title,
          l.primary_image_url as listing_image,
          CONCAT('user', u_sender.id, '@artzyla.com') as sender_email_display,
          CONCAT('user', u_recipient.id, '@artzyla.com') as recipient_email_display,
          COALESCE(
            u_sender.business_name,
            CONCAT(COALESCE(u_sender.first_name, ''), ' ', COALESCE(u_sender.last_name, '')),
            u_sender.username,
            m.sender_name
          ) as sender_name_display,
          COALESCE(
            u_recipient.business_name,
            CONCAT(COALESCE(u_recipient.first_name, ''), ' ', COALESCE(u_recipient.last_name, '')),
            u_recipient.username
          ) as recipient_name
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u_sender ON m.sender_id = u_sender.id
        JOIN users u_recipient ON m.recipient_id = u_recipient.id
        WHERE (m.sender_id = ? OR m.recipient_id = ?) AND m.status = 'archived'
        ORDER BY m.created_at DESC
      `;
      params = [userId, userId];
    } else if (type === 'sent') {
      query = `
        SELECT m.*, 
          l.title as listing_title,
          l.primary_image_url as listing_image,
          CONCAT('user', u_sender.id, '@artzyla.com') as sender_email_display,
          CONCAT('user', u_recipient.id, '@artzyla.com') as recipient_email_display,
          COALESCE(
            u_recipient.business_name,
            CONCAT(COALESCE(u_recipient.first_name, ''), ' ', COALESCE(u_recipient.last_name, '')),
            u_recipient.username
          ) as recipient_name
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u_sender ON m.sender_id = u_sender.id
        JOIN users u_recipient ON m.recipient_id = u_recipient.id
        WHERE m.sender_id = ? AND m.status != 'archived'
        ORDER BY m.created_at DESC
      `;
      params = [userId];
    } else if (type === 'received') {
      query = `
        SELECT m.*, 
          l.title as listing_title,
          l.primary_image_url as listing_image,
          CONCAT('user', u_sender.id, '@artzyla.com') as sender_email_display,
          CONCAT('user', u_recipient.id, '@artzyla.com') as recipient_email_display,
          COALESCE(
            u_sender.business_name,
            CONCAT(COALESCE(u_sender.first_name, ''), ' ', COALESCE(u_sender.last_name, '')),
            u_sender.username,
            m.sender_name
          ) as sender_name_display
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u_sender ON m.sender_id = u_sender.id
        JOIN users u_recipient ON m.recipient_id = u_recipient.id
        WHERE m.recipient_id = ? AND m.status != 'archived'
        ORDER BY m.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT m.*, 
          l.title as listing_title,
          l.primary_image_url as listing_image,
          CONCAT('user', u_sender.id, '@artzyla.com') as sender_email_display,
          CONCAT('user', u_recipient.id, '@artzyla.com') as recipient_email_display,
          COALESCE(
            u_sender.business_name,
            CONCAT(COALESCE(u_sender.first_name, ''), ' ', COALESCE(u_sender.last_name, '')),
            u_sender.username,
            m.sender_name
          ) as sender_name_display,
          COALESCE(
            u_recipient.business_name,
            CONCAT(COALESCE(u_recipient.first_name, ''), ' ', COALESCE(u_recipient.last_name, '')),
            u_recipient.username
          ) as recipient_name
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u_sender ON m.sender_id = u_sender.id
        JOIN users u_recipient ON m.recipient_id = u_recipient.id
        WHERE (m.sender_id = ? OR m.recipient_id = ?) AND m.status != 'archived'
        ORDER BY m.created_at DESC
      `;
      params = [userId, userId];
    }

    const [messages] = await pool.execute(query, params);

    // Build a map of root messages and their replies
    // Check if parent_message_id column exists by checking if any message has it
    const hasParentColumn = messages.length > 0 && 'parent_message_id' in messages[0];
    
    if (hasParentColumn) {
      const messageMap = new Map();
      const rootMessages = [];

      // First pass: identify root messages (no parent) and build map
      messages.forEach(msg => {
        if (!msg.parent_message_id) {
          msg.replies = [];
          messageMap.set(msg.id, msg);
          rootMessages.push(msg);
        }
      });

      // Second pass: attach replies to their parent messages
      messages.forEach(msg => {
        if (msg.parent_message_id) {
          const parent = messageMap.get(msg.parent_message_id);
          if (parent) {
            parent.replies.push(msg);
          } else {
            // If parent not found in current results, treat as root
            msg.replies = [];
            messageMap.set(msg.id, msg);
            rootMessages.push(msg);
          }
        }
      });

      // Sort replies by created_at
      rootMessages.forEach(msg => {
        if (msg.replies) {
          msg.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
      });

      res.json({ messages: rootMessages });
    } else {
      // If parent_message_id column doesn't exist, return messages as-is
      res.json({ messages });
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { listingId, subject, message } = req.body;
    if (!listingId || !subject || !message) {
      return res.status(400).json({ error: 'listingId, subject, and message are required' });
    }

    const [senders] = await pool.execute(
      'SELECT id, email, username, business_name, first_name, last_name FROM users WHERE auth_user_id = ?',
      [req.auth.authUserId]
    );
    if (senders.length === 0) return res.status(404).json({ error: 'Sender not found' });
    const sender = senders[0];

    const [listings] = await pool.execute(
      'SELECT l.id, l.user_id, u.email as seller_email FROM listings l JOIN users u ON l.user_id = u.id WHERE l.id = ?',
      [listingId]
    );
    if (listings.length === 0) return res.status(404).json({ error: 'Listing not found' });
    const listing = listings[0];

    if (sender.id === listing.user_id) {
      return res.status(400).json({ error: 'You cannot message yourself' });
    }

    const senderName = sender.business_name || `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username || 'A user';

    const [result] = await pool.execute(
      `INSERT INTO messages (listing_id, sender_id, recipient_id, subject, message, sender_email, sender_name, recipient_email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [listingId, sender.id, listing.user_id, subject, message, sender.email, senderName, listing.seller_email]
    );

    try {
      await createNotification({
        userId: listing.user_id,
        type: 'message',
        title: 'New message',
        body: `${senderName} sent you a message about a listing`,
        link: '/messages',
        referenceId: result.insertId,
      });
    } catch {}

    // Email the seller (unless they turned email notifications off). Not awaited: a slow mail server must not slow the request.
    (async () => {
      try {
        const [recipients] = await pool.execute('SELECT email, email_notifications FROM users WHERE id = ?', [listing.user_id]);
        if (!recipients[0]?.email || recipients[0].email_notifications === false) return;
        const [titles] = await pool.execute('SELECT title FROM listings WHERE id = ?', [listingId]);
        const listingTitle = titles[0]?.title || 'your artwork';
        const { sendEmail, templates } = await import('../services/emailService.js');
        await sendEmail({
          to: recipients[0].email,
          subject: `New message about "${listingTitle}"`,
          template: templates.newMessage({ listingTitle, listingId, message, fromName: senderName }),
        });
      } catch (emailError) {
        console.warn('Could not send new-message email:', emailError.message);
      }
    })();

    res.json({ success: true, messageId: result.insertId });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/unread-count/:authUserId', requireSelf(), async (req, res) => {
  try {
    const { authUserId } = req.params;
    const [users] = await pool.execute('SELECT id FROM users WHERE auth_user_id = ?', [authUserId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const [[row]] = await pool.execute(
      "SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND status = 'sent'",
      [users[0].id]
    );
    res.json({ count: row.count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:messageId/read', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.auth.userId;

    await pool.execute(
      'UPDATE messages SET status = ? WHERE id = ? AND recipient_id = ?',
      ['read', messageId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:messageId/archive', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.auth.userId;

    // Archive message if user is sender or recipient
    await pool.execute(
      'UPDATE messages SET status = ? WHERE id = ? AND (sender_id = ? OR recipient_id = ?)',
      ['archived', messageId, userId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:messageId/unarchive', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.auth.userId;

    // Get the original status - if it was read, keep it read, otherwise set to sent
    const [messages] = await pool.execute(
      'SELECT status FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)',
      [messageId, userId, userId]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Determine the new status: if recipient, check if it was read before archiving
    // For simplicity, we'll set it to 'read' if it was archived from received, 'sent' otherwise
    // Actually, let's check if user is recipient - if so, set to 'read', otherwise 'sent'
    const [messageDetails] = await pool.execute(
      'SELECT recipient_id FROM messages WHERE id = ?',
      [messageId]
    );

    const newStatus = messageDetails[0]?.recipient_id === userId ? 'read' : 'sent';

    // Unarchive message - restore to read or sent status
    await pool.execute(
      'UPDATE messages SET status = ? WHERE id = ? AND (sender_id = ? OR recipient_id = ?)',
      [newStatus, messageId, userId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error unarchiving message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.auth.userId;

    // Delete message if user is sender or recipient
    await pool.execute(
      'DELETE FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)',
      [messageId, userId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:messageId/reply', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const [users] = await pool.execute(
      'SELECT id, email, username, business_name, first_name, last_name FROM users WHERE auth_user_id = ?',
      [req.auth.authUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = users[0];
    const currentUserId = currentUser.id;

    // Get the original message
    const [originalMessages] = await pool.execute(
      `SELECT m.*, 
        CONCAT('user', u_sender.id, '@artzyla.com') as sender_email_display,
        CONCAT('user', u_recipient.id, '@artzyla.com') as recipient_email_display,
        COALESCE(
          u_sender.business_name,
          CONCAT(COALESCE(u_sender.first_name, ''), ' ', COALESCE(u_sender.last_name, '')),
          u_sender.username
        ) as sender_name_display,
        COALESCE(
          u_recipient.business_name,
          CONCAT(COALESCE(u_recipient.first_name, ''), ' ', COALESCE(u_recipient.last_name, '')),
          u_recipient.username
        ) as recipient_name_display
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      JOIN users u_recipient ON m.recipient_id = u_recipient.id
      WHERE m.id = ? AND (m.sender_id = ? OR m.recipient_id = ?)`,
      [messageId, currentUserId, currentUserId]
    );

    if (originalMessages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const originalMessage = originalMessages[0];

    // Determine new sender and recipient (swap them)
    const newSenderId = originalMessage.recipient_id;
    const newRecipientId = originalMessage.sender_id;
    // Use real emails from messages table for sending (display fields are masked for UI)
    const newSenderEmail = originalMessage.recipient_email || currentUser.email;
    const newRecipientEmail = originalMessage.sender_email;
    const newSenderName = originalMessage.recipient_name_display || currentUser.business_name || 
      `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username;

    // Create reply subject with "Re: " prefix if not already present
    const replySubject = originalMessage.subject.startsWith('Re: ') 
      ? originalMessage.subject 
      : `Re: ${originalMessage.subject}`;

    // Get the root message (if original message is a reply, use its parent, otherwise use the original)
    const rootMessageId = (originalMessage.parent_message_id !== undefined && originalMessage.parent_message_id !== null) 
      ? originalMessage.parent_message_id 
      : originalMessage.id;

    const [insertResult] = await pool.execute(
      `INSERT INTO messages (
        listing_id, sender_id, recipient_id, subject, message,
        sender_email, sender_name, recipient_email, status, parent_message_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)`,
      [
        originalMessage.listing_id,
        newSenderId,
        newRecipientId,
        replySubject,
        message,
        newSenderEmail,
        newSenderName,
        newRecipientEmail,
        rootMessageId,
      ]
    );
    try {
      await createNotification({
        userId: newRecipientId,
        type: 'message',
        title: 'New message',
        body: `${newSenderName || newSenderEmail}: ${replySubject.slice(0, 80)}`,
        link: '/messages',
        referenceId: insertResult.insertId,
      });
    } catch (nErr) {
      console.warn('Could not create notification:', nErr.message);
    }

    // Send email notification
    try {
      const { sendEmail, templates } = await import('../services/emailService.js');
      const listingTitle = originalMessage.listing_title || 'Artwork';
      await sendEmail({
        to: newRecipientEmail,
        subject: replySubject,
        template: templates.messageReply({
          listingTitle,
          listingId: originalMessage.listing_id,
          message,
          fromName: newSenderName,
          from: newSenderEmail,
        }),
        replyTo: newSenderEmail,
        replyToName: newSenderName,
      });
    } catch (emailError) {
      console.error('Error sending reply email:', emailError);
    }

    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

