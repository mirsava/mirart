import express from 'express';
import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getPromotionConfig,
  savePromotionConfig,
  quotePromotion,
  nextBumpAt,
  getFeatureCredits,
  applyPromotion,
  getListingPromotionState,
} from '../services/promotions.js';
import {
  listFeaturedArtistWeeks,
  getCurrentFeaturedArtist,
  applyFeaturedArtistBooking,
  weekStartOf,
} from '../services/featuredArtist.js';

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PROMOTION_KIND = 'listing_promotion';
const FEATURED_ARTIST_KIND = 'featured_artist';

const stripeErrorResponse = (res, error, label) => {
  if (error.type === 'StripeAuthenticationError') {
    console.error('Stripe rejected STRIPE_SECRET_KEY (expired or revoked). Replace it in backend/.env and restart:', error.message);
    return res.status(503).json({ error: 'Payments are temporarily unavailable. Please try again later.' });
  }
  console.error(`${label}:`, error);
  return res.status(500).json({ error: 'Failed to start payment', details: error.message });
};

const publicConfig = (config) => ({
  enabled: config.enabled,
  feature_options: config.feature_options,
  bump_price: config.bump_price,
  bump_cooldown_hours: config.bump_cooldown_hours,
  plan_feature_credits: config.plan_feature_credits,
  plan_feature_days: config.plan_feature_days,
  listing_pass_enabled: config.listing_pass_enabled,
  listing_pass_price: config.listing_pass_price,
  listing_pass_days: config.listing_pass_days,
  featured_artist_enabled: config.featured_artist_enabled,
  featured_artist_price: config.featured_artist_price,
  featured_artist_weeks_ahead: config.featured_artist_weeks_ahead,
});

// Loads a listing the caller may promote: they own it and it is live. A listing pass may also be bought for a
// draft or inactive listing, since paying for it is what puts the listing live.
async function loadPromotableListing(listingId, auth, { requireActive = true } = {}) {
  if (!/^\d+$/.test(String(listingId))) return { status: 404, error: 'Listing not found' };
  const [rows] = await pool.execute(
    'SELECT id, user_id, title, status, featured_until, bumped_at FROM listings WHERE id = ?',
    [listingId]
  );
  const listing = rows[0];
  if (!listing) return { status: 404, error: 'Listing not found' };
  if (listing.user_id !== auth.userId && !auth.isAdmin) {
    return { status: 403, error: 'You can only promote your own listings' };
  }
  if (requireActive && listing.status !== 'active') return { status: 400, error: 'Only active listings can be promoted' };
  if (!requireActive && !['draft', 'inactive', 'active'].includes(listing.status)) {
    return { status: 400, error: `A ${listing.status} listing cannot be put live` };
  }
  return { listing };
}

// Prices and options, plus the caller's free plan features when signed in.
router.get('/options', async (req, res) => {
  try {
    const config = await getPromotionConfig();
    const credits = req.auth?.userId ? await getFeatureCredits(req.auth.userId, config) : null;
    res.json({ ...publicConfig(config), credits });
  } catch (error) {
    console.error('Error fetching promotion options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured', details: 'Add STRIPE_SECRET_KEY to .env' });
    }
    const config = await getPromotionConfig();
    const { listing_id, type, days, return_url_base } = req.body || {};
    // The on/off switch covers features and bumps; listing passes have their own switch (checked by quotePromotion).
    if (!config.enabled && type !== 'listing_pass') {
      return res.status(403).json({ error: 'Listing promotions are not available right now' });
    }
    const quote = quotePromotion(config, type, days);
    if (!quote) return res.status(400).json({ error: 'Choose a valid promotion option' });

    const { listing, status, error } = await loadPromotableListing(listing_id, req.auth, { requireActive: type !== 'listing_pass' });
    if (!listing) return res.status(status).json({ error });

    if (type === 'bump') {
      const next = nextBumpAt(listing, config);
      if (next) {
        return res.status(400).json({ error: 'This listing was bumped recently', next_bump_at: next.toISOString() });
      }
    }

    const baseUrl = (return_url_base || FRONTEND_URL).replace(/\/$/, '');
    const name = {
      feature: `Feature listing for ${quote.days} days`,
      bump: 'Bump listing to the top',
      listing_pass: `Keep listing live for ${quote.days} days`,
    }[type];
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name, description: String(listing.title).slice(0, 200) },
          unit_amount: Math.round(quote.price * 100),
        },
        quantity: 1,
      }],
      customer_email: req.auth.email || undefined,
      metadata: {
        kind: PROMOTION_KIND,
        listing_id: String(listing.id),
        user_id: String(listing.user_id),
        auth_user_id: req.auth.authUserId,
        type,
        days: quote.days ? String(quote.days) : '',
        amount: String(quote.price),
      },
      success_url: `${baseUrl}/promotion-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    stripeErrorResponse(res, error, 'Error creating promotion checkout');
  }
});

// Public: this week's featured artist for the homepage (null when the slot is empty).
router.get('/featured-artist', async (req, res) => {
  try {
    const config = await getPromotionConfig();
    res.json({ artist: config.featured_artist_enabled ? await getCurrentFeaturedArtist() : null });
  } catch (error) {
    console.error('Error fetching featured artist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/featured-artist/weeks', requireAuth, async (req, res) => {
  try {
    const config = await getPromotionConfig();
    res.json({
      enabled: config.featured_artist_enabled,
      price: config.featured_artist_price,
      weeks: await listFeaturedArtistWeeks(config, req.auth.userId),
    });
  } catch (error) {
    console.error('Error listing featured artist weeks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/featured-artist/checkout', requireAuth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured', details: 'Add STRIPE_SECRET_KEY to .env' });
    const config = await getPromotionConfig();
    if (!config.featured_artist_enabled) return res.status(403).json({ error: 'Featured artist spots are not available right now' });
    if (!req.auth.userId) return res.status(400).json({ error: 'User profile not found' });

    const { week_start, return_url_base } = req.body || {};
    const week = (await listFeaturedArtistWeeks(config, req.auth.userId)).find((w) => w.week_start === week_start);
    if (!week) return res.status(400).json({ error: 'Choose one of the listed weeks' });
    if (week.taken) return res.status(409).json({ error: 'That week is already booked. Please pick another.' });

    const [active] = await pool.execute("SELECT COUNT(*) AS count FROM listings WHERE user_id = ? AND status = 'active'", [req.auth.userId]);
    if (!Number(active[0]?.count)) {
      return res.status(400).json({ error: 'You need at least one active listing to be the featured artist' });
    }

    const baseUrl = (return_url_base || FRONTEND_URL).replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Featured artist: week of ${week_start}`, description: 'Homepage spotlight and the weekly email' },
          unit_amount: Math.round(config.featured_artist_price * 100),
        },
        quantity: 1,
      }],
      customer_email: req.auth.email || undefined,
      metadata: {
        kind: FEATURED_ARTIST_KIND,
        user_id: String(req.auth.userId),
        auth_user_id: req.auth.authUserId,
        week_start,
      },
      success_url: `${baseUrl}/promotion-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard`,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    stripeErrorResponse(res, error, 'Error creating featured artist checkout');
  }
});

// Called by the success page after Stripe redirects back. Safe to call repeatedly.
router.get('/confirm', requireAuth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const sessionId = String(req.query.session_id || '');
    if (!sessionId.startsWith('cs_')) return res.status(400).json({ error: 'session_id is required' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata || {};
    if (metadata.kind !== PROMOTION_KIND && metadata.kind !== FEATURED_ARTIST_KIND) {
      return res.status(400).json({ error: 'This payment is not a listing promotion' });
    }
    if (metadata.auth_user_id !== req.auth.authUserId && !req.auth.isAdmin) {
      return res.status(403).json({ error: 'This payment belongs to another account' });
    }
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed yet. Please wait a moment and refresh the page.' });
    }

    if (metadata.kind === FEATURED_ARTIST_KIND) {
      const booking = await applyFeaturedArtistBooking(session);
      return res.json({ success: true, applied: booking.applied, type: 'featured_artist', week_start: booking.week_start, moved: Boolean(booking.moved), listing: null });
    }

    const listingId = parseInt(metadata.listing_id, 10);
    const type = ['feature', 'bump', 'listing_pass'].includes(metadata.type) ? metadata.type : 'bump';
    const days = type === 'bump' ? null : parseInt(metadata.days, 10);
    const { applied } = await applyPromotion(pool, {
      listingId,
      userId: parseInt(metadata.user_id, 10),
      type,
      days,
      amount: (session.amount_total ?? 0) / 100,
      source: 'stripe',
      stripeSessionId: session.id,
    });

    const listing = await getListingPromotionState(listingId);
    res.json({ success: true, applied, type, days, listing });
  } catch (error) {
    console.error('Error confirming promotion:', error);
    res.status(500).json({ error: 'Failed to confirm promotion', details: error.message });
  }
});

// Spend one of the plan's included features.
router.post('/listings/:id/use-credit', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const config = await getPromotionConfig();
    if (!config.enabled) return res.status(403).json({ error: 'Listing promotions are not available right now' });

    const { listing, status, error } = await loadPromotableListing(req.params.id, req.auth);
    if (!listing) return res.status(status).json({ error });

    await conn.beginTransaction();
    // Lock the owner's row so two simultaneous requests cannot both spend the last credit.
    await conn.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [listing.user_id]);
    const credits = await getFeatureCredits(listing.user_id, config, conn);
    if (credits.remaining <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'No included features left on your plan this month' });
    }
    await applyPromotion(conn, { listingId: listing.id, userId: listing.user_id, type: 'feature', days: credits.days, source: 'plan' });
    await conn.commit();

    res.json({
      success: true,
      listing: await getListingPromotionState(listing.id),
      credits: { ...credits, used: credits.used + 1, remaining: credits.remaining - 1 },
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('Error using feature credit:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

router.get('/admin/config', requireAdmin, async (req, res) => {
  try {
    const config = await getPromotionConfig();
    const [stats] = await pool.execute(
      `SELECT
         COALESCE(SUM(amount), 0) AS revenue_total,
         COALESCE(SUM(CASE WHEN created_at > now() - interval '30 days' THEN amount ELSE 0 END), 0) AS revenue_30d,
         COUNT(*) AS paid_count,
         COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS paid_count_30d
       FROM listing_promotions WHERE source = 'stripe'`
    );
    const [featured] = await pool.execute(
      `SELECT COUNT(*) AS featured_now FROM listings WHERE status = 'active' AND featured_until > now()`
    );
    const [artistStats] = await pool.execute(
      `SELECT
         COALESCE(SUM(amount), 0) AS revenue_total,
         COALESCE(SUM(CASE WHEN created_at > now() - interval '30 days' THEN amount ELSE 0 END), 0) AS revenue_30d,
         COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS paid_count_30d,
         COUNT(*) FILTER (WHERE week_start >= ?::date) AS upcoming_weeks
       FROM featured_artist_bookings WHERE source = 'stripe'`,
      [weekStartOf()]
    );
    const s = stats[0] || {};
    const a = artistStats[0] || {};
    res.json({
      config,
      stats: {
        revenue_total: parseFloat(s.revenue_total || 0) + parseFloat(a.revenue_total || 0),
        revenue_30d: parseFloat(s.revenue_30d || 0) + parseFloat(a.revenue_30d || 0),
        paid_count: Number(s.paid_count || 0),
        paid_count_30d: Number(s.paid_count_30d || 0) + Number(a.paid_count_30d || 0),
        featured_now: Number(featured[0]?.featured_now || 0),
        featured_artist_weeks_booked: Number(a.upcoming_weeks || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching promotion config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/config', requireAdmin, async (req, res) => {
  try {
    res.json({ config: await savePromotionConfig(req.body || {}) });
  } catch (error) {
    console.error('Error saving promotion config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin curation: feature a listing for free (days > 0) or remove its featured spot (days = 0).
router.put('/admin/listings/:id/feature', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(404).json({ error: 'Listing not found' });
    const days = Math.min(365, Math.max(0, parseInt(req.body?.days, 10) || 0));
    const [rows] = await pool.execute('SELECT id, user_id FROM listings WHERE id = ?', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Listing not found' });

    if (days === 0) {
      await pool.execute('UPDATE listings SET featured_until = NULL WHERE id = ?', [id]);
    } else {
      await applyPromotion(pool, { listingId: rows[0].id, userId: rows[0].user_id, type: 'feature', days, source: 'admin' });
    }
    res.json({ success: true, listing: await getListingPromotionState(rows[0].id) });
  } catch (error) {
    console.error('Error updating featured listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
