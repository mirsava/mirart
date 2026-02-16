-- Add stripe_product_id to subscription_plans for Stripe subscription mode
ALTER TABLE subscription_plans ADD COLUMN stripe_product_id VARCHAR(255) NULL AFTER display_order;

-- Update existing plans with Stripe Product IDs
UPDATE subscription_plans SET stripe_product_id = 'prod_TzSm42oBUO77ax' WHERE tier = 'starter';
UPDATE subscription_plans SET stripe_product_id = 'prod_TzSmufdMNiztkM' WHERE tier = 'professional';
UPDATE subscription_plans SET stripe_product_id = 'prod_TzSnMMYvDF4ajU' WHERE tier = 'enterprise';
