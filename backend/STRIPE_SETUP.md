# Stripe Payment Setup

ArtZyla uses Stripe for payment processing (artwork purchases and subscription plans).

## Required Credentials

Add these to your `backend/.env` file:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

For production, use your live key: `sk_live_xxxxxxxxxxxx`

## Getting Your Stripe Keys

1. Create a Stripe account at [https://stripe.com](https://stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode, `sk_live_` for live)
4. Add it to `backend/.env` as `STRIPE_SECRET_KEY`

## Test Mode

In test mode, use Stripe's test card numbers:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires auth:** `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

## Subscription Products

For recurring subscriptions, your Stripe Products are linked to plans:

| Tier         | Stripe Product ID      |
|--------------|------------------------|
| starter      | prod_TzSm42oBUO77ax    |
| professional | prod_TzSmufdMNiztkM    |
| enterprise   | prod_TzSnMMYvDF4ajU    |

Run the migration to add these to your database:
```bash
npm run migrate-stripe-product
```

**Note:** In Stripe Dashboard, ensure each Product has recurring Prices configured (monthly and yearly) that match your plan amounts. The checkout uses `price_data` with your Product ID, so Prices are created at checkout time.

## Redirect URLs

Stripe redirects customers to your site after payment. The frontend automatically sends `window.location.origin` so redirects go to the correct URL (e.g. `http://localhost:5173` or `https://yoursite.com`).

If redirects fail, ensure:
- Your frontend and backend CORS allow the frontend origin
- For production, use HTTPS
- `FRONTEND_URL` in `backend/.env` is used as fallback when the client doesn't send `return_url_base`

## Optional: Publishable Key (Frontend)

If you add Stripe Elements (embedded card form) in the future, you'll need the publishable key:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
```

The current implementation uses Stripe Checkout (redirect flow), which does not require the publishable key on the frontend.

## Webhooks (Optional)

For production, consider adding a webhook endpoint to handle async events (e.g. `checkout.session.completed`). This provides a backup if the user closes the browser before the redirect completes.

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-api.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`
4. Add `STRIPE_WEBHOOK_SECRET` to `.env`
