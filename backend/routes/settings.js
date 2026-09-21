import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getMarketplaceConfig, saveMarketplaceConfig } from '../services/marketplace.js';
import { getSocialLinks, saveSocialLinks, SocialLinkError } from '../services/socialLinks.js';

const router = express.Router();

// Public: the storefront needs to know whether to show cart/checkout or "contact the seller".
router.get('/marketplace', async (req, res) => {
  try {
    res.json(await getMarketplaceConfig());
  } catch (error) {
    console.error('Error fetching marketplace settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/marketplace', requireAdmin, async (req, res) => {
  try {
    res.json(await saveMarketplaceConfig({ checkout_enabled: req.body?.checkout_enabled }));
  } catch (error) {
    console.error('Error saving marketplace settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: the footer shows only the links that have been filled in.
router.get('/social', async (req, res) => {
  try {
    res.json(await getSocialLinks());
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/social', requireAdmin, async (req, res) => {
  try {
    res.json(await saveSocialLinks(req.body));
  } catch (error) {
    if (error instanceof SocialLinkError) return res.status(400).json({ error: error.message });
    console.error('Error saving social links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
