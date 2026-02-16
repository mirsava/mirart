-- Widen payment_intent_id to accommodate Stripe IDs (subscription, session, etc.)
-- Stripe IDs can be longer than 255 chars when expanded objects are stored by mistake

ALTER TABLE user_subscriptions MODIFY COLUMN payment_intent_id VARCHAR(500) NULL;
ALTER TABLE orders MODIFY COLUMN payment_intent_id VARCHAR(500) NULL;
