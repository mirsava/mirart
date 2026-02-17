-- Add Stripe Connect fields for artists to receive payouts
ALTER TABLE users ADD COLUMN stripe_account_id VARCHAR(255) NULL AFTER profile_image_url;
CREATE INDEX idx_users_stripe_account ON users(stripe_account_id);

-- Track Stripe transfers for orders (funds released to artist on delivery)
ALTER TABLE orders ADD COLUMN stripe_transfer_id VARCHAR(255) NULL AFTER payment_intent_id;
