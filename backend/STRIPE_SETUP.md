# Stripe Payment Setup

ArtZyla uses Stripe for payment processing (artwork purchases and subscription plans). Artwork purchases use **Stripe Connect** with **manual capture**—funds are held until the buyer confirms delivery, then transferred to the artist.

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

## Stripe Connect (Artwork Payouts)

See `docs/STRIPE_CONNECT_WORKFLOW.md` for the full end-to-end flow.

Artwork purchases use Stripe Connect so artists receive payouts when buyers confirm delivery:

1. **Enable Connect** in Stripe Dashboard → **Settings** → **Connect**
2. **Enable card payments for connected accounts** (required to fix "accounts do not currently support card payment"):
   - Go to **Settings** → **Connect** → **Payment Methods**
   - Find **Cards** and set the dropdown to **On by default**
   - Click **Review changes** and confirm
   - This allows your connected accounts (artists) to receive card payments
3. Run the migration: `npm run migrate-stripe-connect`
4. Artists set up payouts in **Artist Dashboard** → **Settings** → **Payouts**
5. Flow: Buyer pays (auth only) → Seller ships → Buyer confirms delivery → Funds captured and transferred to artist

### "Accounts do not support card_payments without transfers"

Stripe requires connected accounts to have **both** `card_payments` and `transfers` capabilities. The platform:

1. **Account creation**: Requests both `card_payments` and `transfers` when creating Express accounts.
2. **Checkout**: Uses **destination charges** with `transfer_data` so the PaymentIntent specifies the connected account and amount.

**If you have existing accounts created before this fix:** They may need the `transfers` capability. In Stripe Dashboard → Connect → Accounts, open the account and ensure both capabilities are enabled. Or create a new account (delete the old `stripe_account_id` from the user and run setup again).

- **Single-artist checkout only**: Carts must contain items from one artist. Multi-artist carts will show: "Please checkout items from one artist at a time."
- **Payouts**: Artists must use a **bank account** for payouts, not a debit card. See "Accounts do not support card payouts" in troubleshooting.

## Webhooks (Optional)

For production, consider adding a webhook endpoint to handle async events (e.g. `checkout.session.completed`). This provides a backup if the user closes the browser before the redirect completes.

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-api.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`
4. Add `STRIPE_WEBHOOK_SECRET` to `.env`
