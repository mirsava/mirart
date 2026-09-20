import pool from '../config/database.js';

const SETTING_KEY = 'marketplace_config';

// Online checkout (cart, payments, payouts, shipping labels) is off by default: buyers and sellers
// arrange payment and shipping directly, and ArtZyla is not a party to the transaction.
export const DEFAULT_MARKETPLACE_CONFIG = { checkout_enabled: false };

export async function getMarketplaceConfig() {
  const [rows] = await pool.execute('SELECT setting_value FROM site_settings WHERE setting_key = ?', [SETTING_KEY]);
  return { checkout_enabled: rows[0]?.setting_value?.checkout_enabled === true };
}

export async function saveMarketplaceConfig(patch) {
  const next = { ...(await getMarketplaceConfig()) };
  if (patch.checkout_enabled !== undefined) next.checkout_enabled = patch.checkout_enabled === true;
  await pool.execute(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
    [SETTING_KEY, JSON.stringify(next)]
  );
  return next;
}

export async function isCheckoutEnabled() {
  return (await getMarketplaceConfig()).checkout_enabled;
}

// Express guard for endpoints that start a new purchase, payout onboarding or checkout shipping quote.
export async function requireCheckoutEnabled(req, res, next) {
  try {
    if (await isCheckoutEnabled()) return next();
    res.status(403).json({
      error: 'Online checkout is turned off',
      code: 'checkout_disabled',
      details: 'Payment and shipping are arranged directly between buyers and sellers. Please contact the seller.',
    });
  } catch (error) {
    console.error('Marketplace config check failed:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
