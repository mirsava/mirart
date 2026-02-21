# Stripe Connect Marketplace Workflow

This document describes the end-to-end flow for the Stripe Connect Express marketplace.

## Overview

| Step | Description | Implementation |
|------|-------------|----------------|
| 1 | Seller signs up on your site | Cognito auth + `users` table |
| 2 | Platform creates Connected Account | `POST /api/stripe/connect/create-account` |
| 3 | Seller completes Stripe onboarding (KYC) | Account Link → Stripe hosted onboarding |
| 4 | Customer purchases item | Stripe Checkout (manual capture) |
| 5 | Payment is authorized | Funds held, not captured |
| 6 | Stripe splits funds | Platform fee → platform; remaining → seller |
| 7 | Buyer confirms receipt | Capture + transfer to seller |

## Detailed Flow

### 1. Seller Signup

- Seller registers via Cognito (sign up / sign in)
- User record created in `users` table with `cognito_username`, `email`, etc.

### 2. Create Connected Account

**When:** Seller goes to **Artist Dashboard** → **Settings** → **Payouts** and clicks "Set up payouts"

**API:** `POST /api/stripe/connect/create-account`
- Creates Stripe Express account: `stripe.accounts.create({ type: 'express', ... })`
- Stores `stripe_account_id` in `users` table

**Alternative:** During checkout, if the artist (seller) hasn't set up, they see "Set up payouts now" and can complete setup before paying.

### 3. Stripe Onboarding (KYC)

**API:** `POST /api/stripe/connect/create-account-link`
- Creates Account Link with `type: 'account_onboarding'`
- Seller is redirected to Stripe's hosted onboarding
- Seller completes identity verification, bank details, etc.
- Returns to Artist Dashboard (or Checkout if started from there)

### 4. Customer Purchases

**Flow:**
1. Buyer adds items to cart
2. Goes to Checkout, fills shipping info
3. Clicks "Pay with Card (Stripe)"
4. Redirected to Stripe Checkout
5. Enters card details
6. Payment is **authorized** (not captured) — `capture_method: 'manual'`

### 5. Payment Processing

- PaymentIntent created with `requires_capture`
- Funds are held on the buyer's card
- Order created with status `paid` when session is confirmed

### 6. Fund Split (Destination Charge)

- **Platform fee:** $10 per item (included in line items)
- **Artist amount:** `(item price × quantity) - platform fee`
- `transfer_data`: `{ destination: seller_stripe_account_id, amount: artist_amount_cents }`
- Transfer is created when the charge is **captured**

### 7. Payout After Buyer Confirms Receipt

**Flow:**
1. Seller ships item, marks order as "Shipped" (or buys shipping label)
2. Buyer receives item
3. Buyer goes to **Orders** → **Purchases** → clicks "Confirm delivery"
4. **API:** `PUT /api/orders/:orderId/confirm-delivery`
5. Backend captures the PaymentIntent: `stripe.paymentIntents.capture()`
6. Stripe automatically creates the transfer to the seller's connected account
7. Order status → `delivered`
8. Seller receives payout via Stripe's standard payout schedule

## Key Files

| Component | File |
|-----------|------|
| Create account | `backend/routes/stripe.js` — `POST /connect/create-account` |
| Account link | `backend/routes/stripe.js` — `POST /connect/create-account-link` |
| Checkout session | `backend/routes/stripe.js` — `POST /create-checkout-session` |
| Confirm session | `backend/routes/stripe.js` — `GET /confirm-session` |
| Confirm delivery | `backend/routes/orders.js` — `PUT /:orderId/confirm-delivery` |
| Payouts UI | `src/pages/ArtistDashboard.tsx` — Settings tab |
| Checkout | `src/pages/Checkout.tsx` |
| Orders | `src/pages/Orders.tsx` |

## Database

- `users.stripe_account_id` — Stripe Connect account ID
- `orders.payment_intent_id` — Stripe PaymentIntent ID
- `orders.stripe_transfer_id` — Transfer ID (set when delivery confirmed)

## Run Migrations

```bash
npm run migrate-stripe-connect
```

See `backend/STRIPE_SETUP.md` for Stripe Dashboard configuration.
