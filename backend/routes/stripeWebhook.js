import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';
import { applyPromotion } from '../services/promotions.js';
import { applyFeaturedArtistBooking } from '../services/featuredArtist.js';
import { activateSubscriptionFromSession } from '../services/subscriptionCheckout.js';

const PROMOTION_KIND = 'listing_promotion';
const FEATURED_ARTIST_KIND = 'featured_artist';
const stripeId = (value) => (typeof value === 'string' ? value : value?.id || null);

// Applies whatever a paid Checkout Session bought. Every branch is idempotent, because the success page may
// already have applied it (and Stripe may deliver the same event more than once).
export async function fulfillCheckoutSession(session) {
  if (session.payment_status !== 'paid') return 'unpaid';
  const metadata = session.metadata || {};

  if (metadata.kind === PROMOTION_KIND) {
    const type = ['feature', 'bump', 'listing_pass'].includes(metadata.type) ? metadata.type : 'bump';
    const { applied } = await applyPromotion(pool, {
      listingId: parseInt(metadata.listing_id, 10),
      userId: parseInt(metadata.user_id, 10),
      type,
      days: type === 'bump' ? null : parseInt(metadata.days, 10),
      amount: (session.amount_total ?? 0) / 100,
      source: 'stripe',
      stripeSessionId: session.id,
    });
    return applied ? 'promotion applied' : 'promotion already applied';
  }

  if (metadata.kind === FEATURED_ARTIST_KIND) {
    const result = await applyFeaturedArtistBooking(session);
    return result.applied ? 'featured artist booked' : 'featured artist already booked';
  }

  if (metadata.is_subscription === 'true' && metadata.plan_id) {
    const result = await activateSubscriptionFromSession(session);
    if (result.error) return `subscription not recorded: ${result.error}`;
    return result.alreadyRecorded ? 'subscription already recorded' : 'subscription recorded';
  }

  // Artwork orders are still confirmed by the order success page.
  return 'ignored';
}

// A renewal charge succeeded: extend the plan to the end of the newly paid period.
export async function extendSubscriptionFromInvoice(invoice) {
  const subscriptionId = stripeId(invoice.subscription) || stripeId(invoice.parent?.subscription_details?.subscription);
  if (!subscriptionId) return 'no subscription';
  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  if (!periodEnd) return 'no period';
  const [result] = await pool.execute(
    `UPDATE user_subscriptions
     SET end_date = GREATEST(end_date, (to_timestamp(?) AT TIME ZONE 'UTC')::date), status = 'active', auto_renew = TRUE
     WHERE payment_intent_id = ?
     RETURNING id, user_id`,
    [periodEnd, subscriptionId]
  );
  const sub = result.rows?.[0];
  if (sub && invoice.id) {
    // Revenue record for the renewal; the invoice id makes a redelivered event a no-op.
    await pool.execute(
      `INSERT INTO subscription_payments (user_id, subscription_id, stripe_invoice_id, amount, period_end)
       VALUES (?, ?, ?, ?, (to_timestamp(?) AT TIME ZONE 'UTC')::date)
       ON CONFLICT (stripe_invoice_id) DO NOTHING`,
      [sub.user_id, sub.id, invoice.id, (invoice.amount_paid ?? 0) / 100, periodEnd]
    );
  }
  return result.affectedRows ? 'subscription extended' : 'subscription not found';
}

// The artist (or an admin) cancelled in Stripe: keep access until end_date, but stop treating it as renewing.
export async function markSubscriptionCancelled(subscription) {
  await pool.execute('UPDATE user_subscriptions SET auto_renew = FALSE WHERE payment_intent_id = ?', [subscription.id]);
  return 'subscription marked cancelled';
}

// POST /api/stripe/webhook. Must receive the raw request body so the signature can be checked.
export async function stripeWebhookHandler(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    console.error('Stripe webhook received but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (error) {
    console.warn('Stripe webhook signature check failed:', error.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    let outcome = 'ignored';
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        outcome = await fulfillCheckoutSession(event.data.object);
        break;
      case 'invoice.paid':
        if (event.data.object.billing_reason === 'subscription_cycle') {
          outcome = await extendSubscriptionFromInvoice(event.data.object);
        }
        break;
      case 'customer.subscription.deleted':
        outcome = await markSubscriptionCancelled(event.data.object);
        break;
      default:
        break;
    }
    if (outcome !== 'ignored') console.log(`[Stripe webhook] ${event.type} ${event.id}: ${outcome}`);
    res.json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry the event later.
    console.error(`[Stripe webhook] ${event.type} ${event.id} failed:`, error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
