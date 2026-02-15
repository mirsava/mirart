import express from 'express';
import { sendContactEmail, verifySMTPConnection } from '../services/emailService.js';
import pool from '../config/database.js';

const router = express.Router();

router.post('/contact-seller', async (req, res) => {
  try {
    const {
      listingId,
      subject,
      message,
      buyerEmail,
      buyerName,
    } = req.body;

    if (!listingId || !message || !buyerEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: listingId, message, and buyerEmail are required' 
      });
    }

    const [listings] = await pool.execute(
      `SELECT l.*, u.email as seller_email, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username
        ) as seller_name
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?`,
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listings[0];

    if (!listing.seller_email) {
      return res.status(400).json({ error: 'Seller email not available' });
    }

    const result = await sendContactEmail({
      to: listing.seller_email,
      from: buyerEmail,
      fromName: buyerName || 'ArtZyla User',
      subject: subject || `Inquiry about: ${listing.title}`,
      message: message,
      listingTitle: listing.title,
      listingId: listingId,
      source: 'Artwork Inquiry',
      sourceDetail: `Contact form from gallery — ${listing.title}`,
    });

    const [buyers] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ? OR email = ?',
      [buyerEmail, buyerEmail]
    );

    let senderId = null;
    if (buyers.length > 0) {
      senderId = buyers[0].id;
    } else {
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [buyerEmail]
      );
      if (users.length > 0) {
        senderId = users[0].id;
      }
    }

    await pool.execute(
      `INSERT INTO messages (
        listing_id, sender_id, recipient_id, subject, message,
        sender_email, sender_name, recipient_email, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [
        listingId,
        senderId || listing.user_id,
        listing.user_id,
        subject || `Inquiry about: ${listing.title}`,
        message,
        buyerEmail,
        buyerName || null,
        listing.seller_email,
      ]
    );

    res.json({
      success: true,
      message: result.mocked 
        ? 'Email sent (mock mode - SMTP not configured)' 
        : 'Email sent successfully',
      mocked: result.mocked,
    });
  } catch (error) {
    console.error('Error in contact-seller endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      message: error.message 
    });
  }
});

router.get('/verify-smtp', async (req, res) => {
  try {
    const result = await verifySMTPConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to verify SMTP',
      message: error.message 
    });
  }
});

export default router;

