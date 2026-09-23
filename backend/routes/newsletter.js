import express from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  subscribe,
  unsubscribe,
  unsubscribeEmail,
  isSubscribed,
  countSubscribers,
  getNewsletterConfig,
  setNewsletterEnabled,
  sendTestNewsletter,
  runWeeklyNewsletterJob,
  NewsletterError,
} from '../services/newsletter.js';

const router = express.Router();

router.post('/subscribe', async (req, res) => {
  try {
    await subscribe(req.body?.email, req.auth?.userId ?? null);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof NewsletterError) return res.status(400).json({ error: error.message });
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// The signed-in user's weekly email preference (by their account email).
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({ subscribed: await isSubscribed(req.auth.email) });
  } catch (error) {
    console.error('Error reading newsletter preference:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    if (!req.auth.email) return res.status(400).json({ error: 'Your account has no email address' });
    if (req.body?.subscribed === true) await subscribe(req.auth.email, req.auth.userId);
    else await unsubscribeEmail(req.auth.email);
    res.json({ subscribed: await isSubscribed(req.auth.email) });
  } catch (error) {
    console.error('Error saving newsletter preference:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/unsubscribe', async (req, res) => {
  try {
    const found = await unsubscribe(req.body?.token);
    if (!found) return res.status(404).json({ error: 'This unsubscribe link is not valid' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/status', requireAdmin, async (req, res) => {
  try {
    res.json({ ...(await getNewsletterConfig()), subscribers: await countSubscribers() });
  } catch (error) {
    console.error('Error fetching newsletter status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/config', requireAdmin, async (req, res) => {
  try {
    await setNewsletterEnabled(req.body?.enabled);
    res.json({ ...(await getNewsletterConfig()), subscribers: await countSubscribers() });
  } catch (error) {
    console.error('Error saving newsletter config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sends a preview copy to the signed-in admin.
router.post('/admin/send-test', requireAdmin, async (req, res) => {
  try {
    if (!req.auth.email) return res.status(400).json({ error: 'Your account has no email address' });
    await sendTestNewsletter(req.auth.email);
    res.json({ success: true, to: req.auth.email });
  } catch (error) {
    if (error instanceof NewsletterError) return res.status(400).json({ error: error.message });
    console.error('Error sending test newsletter:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/admin/send-now', requireAdmin, async (req, res) => {
  try {
    const result = await runWeeklyNewsletterJob({ force: true });
    if (result.skipped) return res.status(400).json({ error: 'Nothing to send yet: no featured artist, featured listings or new listings this week' });
    res.json({ success: true, sent: result.sent });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
