import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getMarketplaceConfig, saveMarketplaceConfig } from '../services/marketplace.js';

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

export default router;
