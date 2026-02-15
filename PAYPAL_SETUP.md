# PayPal Integration Setup

PayPal payment processing has been integrated into the ArtZyla marketplace.

## Backend Configuration

Add the following to your `backend/.env` file:

```env
PAYPAL_CLIENT_ID=AeQWLocDX4UmSjWmabAs8xntO10kp9jC1jy8guQLRr2OGZI31MW60hEmHZO92-z8cVsms5S1GnYgIWRU
PAYPAL_CLIENT_SECRET=EFGPoy2yHkXx4rkkfxbdEtiNSqvR13c69S2RNF9UcoGyafdIHiFl4zbPcELdxC54I_vojRzOGHyhqX8e
```

## Frontend Configuration

Add the following to your root `.env` file (or `.env.local`):

```env
VITE_PAYPAL_CLIENT_ID=AeQWLocDX4UmSjWmabAs8xntO10kp9jC1jy8guQLRr2OGZI31MW60hEmHZO92-z8cVsms5S1GnYgIWRU
```

## How It Works

1. **Checkout Flow**:
   - User fills in shipping information
   - User clicks PayPal button on payment step
   - PayPal popup opens for payment approval
   - On approval, payment is captured and order is created
   - User is redirected to order success page

2. **Payment Processing**:
   - Backend creates PayPal order with item details
   - Frontend displays PayPal buttons
   - On approval, backend captures payment
   - Order is created with PayPal transaction ID
   - Listing status is updated to 'sold'

## Testing with Sandbox

The integration uses PayPal Sandbox for testing. Use PayPal sandbox test accounts to test payments.

## Production Setup

When moving to production:
1. Update PayPal credentials to production Client ID and Secret
2. Change PayPal environment from Sandbox to Live in `backend/config/paypal.js`
3. Update return URLs to production domain
