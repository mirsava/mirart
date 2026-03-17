import dotenv from 'dotenv';
import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';

dotenv.config();

async function recreateStripeProductsFromPlans() {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const [plans] = await pool.execute(
    `SELECT id, name, description, tier, max_listings, price_monthly, price_yearly, features, display_order, is_active
     FROM subscription_plans
     ORDER BY display_order ASC, id ASC`
  );

  if (!plans.length) {
    console.log('No subscription plans found in database.');
    return;
  }

  let createdCount = 0;

  for (const plan of plans) {
    const maxListings = Number(plan.max_listings || 0);
    const activeListingLimit = maxListings >= 999999 ? 'unlimited' : String(maxListings);
    const features = String(plan.features || '')
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, 15);

    const product = await stripe.products.create({
      name: String(plan.name || plan.tier || `Plan ${plan.id}`),
      description: plan.description || undefined,
      active: Boolean(plan.is_active),
      metadata: {
        tier: String(plan.tier || ''),
        active_listing_limit: activeListingLimit,
        source_plan_id: String(plan.id),
      },
      marketing_features: features.map((name) => ({ name })),
    });

    const monthly = Number(plan.price_monthly || 0);
    const yearly = Number(plan.price_yearly || 0);

    let defaultPriceId = null;
    if (monthly > 0) {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(monthly * 100),
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      defaultPriceId = monthlyPrice.id;
    }

    if (yearly > 0) {
      await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(yearly * 100),
        currency: 'usd',
        recurring: { interval: 'year' },
      });
    }

    if (defaultPriceId) {
      await stripe.products.update(product.id, { default_price: defaultPriceId });
    }

    await pool.execute(
      'UPDATE subscription_plans SET stripe_product_id = ? WHERE id = ?',
      [product.id, plan.id]
    );

    createdCount += 1;
    console.log(`Created Stripe product for plan #${plan.id}: ${product.id}`);
  }

  console.log(`Completed. Recreated ${createdCount} Stripe product(s).`);
}

recreateStripeProductsFromPlans()
  .catch((error) => {
    console.error('Failed to recreate Stripe products:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch {}
  });
