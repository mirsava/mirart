-- ArtZyla marketplace schema for Supabase Postgres.
-- Idempotent: safe to re-run via `npm run init-db`.
-- The backend connects as the `postgres` role (bypasses RLS). RLS is enabled on every
-- table with no policies so the public Supabase REST API (anon key) cannot read or write them.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users: one row per Supabase Auth user (auth.users.id)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  business_name VARCHAR(255),
  phone VARCHAR(20),
  country VARCHAR(100),
  website VARCHAR(255),
  specialties TEXT,
  experience_level VARCHAR(50),
  bio TEXT,
  profile_image_url VARCHAR(500),
  signature_url VARCHAR(500),
  stripe_account_id VARCHAR(255),
  user_type VARCHAR(10) NOT NULL DEFAULT 'artist' CHECK (user_type IN ('artist', 'buyer', 'admin')),
  default_allow_comments BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  comment_notifications BOOLEAN DEFAULT TRUE,
  default_special_instructions TEXT,
  active BOOLEAN DEFAULT TRUE,
  blocked BOOLEAN DEFAULT FALSE,
  default_shipping_preference VARCHAR(20) DEFAULT 'buyer',
  default_shipping_carrier VARCHAR(20) DEFAULT 'shippo',
  default_return_days INTEGER,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_zip VARCHAR(20),
  address_country VARCHAR(10) DEFAULT 'US',
  billing_line1 VARCHAR(255),
  billing_line2 VARCHAR(255),
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_zip VARCHAR(20),
  billing_country VARCHAR(10) DEFAULT 'US',
  social_instagram VARCHAR(255),
  social_tiktok VARCHAR(255),
  social_behance VARCHAR(255),
  social_youtube VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_stripe_account ON users (stripe_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_format') THEN
    ALTER TABLE users ADD CONSTRAINT users_username_format CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,64}$');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Painting','Woodworking','Prints','Sculpture','Photography','Digital Art','Ceramics','Textiles','Jewelry','Mixed Media','Other')),
  subcategory VARCHAR(100),
  price NUMERIC(10,2),
  listing_type VARCHAR(20) DEFAULT 'fixed_price' CHECK (listing_type IN ('fixed_price','auction')),
  starting_bid NUMERIC(10,2),
  current_bid NUMERIC(10,2),
  reserve_price NUMERIC(10,2),
  auction_end_date TIMESTAMPTZ,
  bid_count INTEGER DEFAULT 0,
  primary_image_url VARCHAR(500),
  image_urls JSONB,
  dimensions VARCHAR(100),
  medium VARCHAR(100),
  year INTEGER,
  in_stock BOOLEAN DEFAULT TRUE,
  shipping_info TEXT,
  returns_info TEXT,
  special_instructions TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','inactive','sold','archived')),
  views INTEGER DEFAULT 0,
  allow_comments BOOLEAN DEFAULT TRUE,
  shipping_preference VARCHAR(20),
  shipping_carrier VARCHAR(20),
  return_days INTEGER,
  weight_oz NUMERIC(10,2) DEFAULT 24.00,
  length_in NUMERIC(10,2) DEFAULT 24.00,
  width_in NUMERIC(10,2) DEFAULT 24.00,
  height_in NUMERIC(10,2) DEFAULT 3.00,
  quantity_available INTEGER DEFAULT 1,
  fixed_shipping_fee NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'listings'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%Prints%'
  ) THEN
    ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_check;
    ALTER TABLE listings ADD CONSTRAINT listings_category_check
      CHECK (category IN ('Painting','Woodworking','Prints','Sculpture','Photography','Digital Art','Ceramics','Textiles','Jewelry','Mixed Media','Other'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings (user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at);
-- Paid promotions: featured_until pins a listing above the rest until it passes; bumped_at moves it back to the top of "newest".
ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMPTZ;
-- Pay-per-listing: while paid_until is in the future the listing may be active without using a plan slot.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_listings_featured_until ON listings (featured_until);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_listing UNIQUE (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_listing_id ON likes (listing_id);

CREATE TABLE IF NOT EXISTS listing_comments (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id INTEGER REFERENCES listing_comments(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  rating SMALLINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_comments_listing_id ON listing_comments (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_comments_user_id ON listing_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_listing_comments_created_at ON listing_comments (created_at);
CREATE INDEX IF NOT EXISTS idx_listing_comments_parent ON listing_comments (parent_comment_id);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  recipient_email VARCHAR(255) NOT NULL,
  parent_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','read','archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON messages (listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages (parent_message_id);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_listing ON chat_conversations (listing_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user1 ON chat_conversations (user1_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user2 ON chat_conversations (user2_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations (last_message_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages (read_at);

CREATE TABLE IF NOT EXISTS support_chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  sender VARCHAR(10) NOT NULL CHECK (sender IN ('user','admin')),
  message TEXT NOT NULL,
  admin_id INTEGER,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_chat_user ON support_chat_messages (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_chat_unread ON support_chat_messages (sender, read_at);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  reference_id INTEGER,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at);

CREATE TABLE IF NOT EXISTS admin_announcements (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  target_type VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (target_type IN ('all','authenticated','artists','buyers','admins','specific')),
  target_user_ids JSONB,
  severity VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('info','warning','success','error')),
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_active_dates ON admin_announcements (is_active, start_date, end_date);

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_listings INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0.00,
  pending_orders INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  artist_earnings NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  return_status VARCHAR(30),
  return_reason TEXT,
  return_requested_at TIMESTAMPTZ,
  shipping_address TEXT,
  payment_intent_id VARCHAR(500),
  stripe_transfer_id VARCHAR(255),
  shipping_carrier VARCHAR(50),
  tracking_status VARCHAR(50),
  tracking_last_updated TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  shippo_transaction_id VARCHAR(100),
  shippo_rate_id VARCHAR(100),
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  label_url VARCHAR(500),
  shipping_cost NUMERIC(10,2) DEFAULT 0.00,
  payout_amount NUMERIC(10,2),
  payout_stripe_fee NUMERIC(10,2),
  payout_label_cost NUMERIC(10,2),
  payout_commission_percent NUMERIC(5,2),
  payout_commission_amount NUMERIC(10,2),
  shipping_fee_charged NUMERIC(10,2) DEFAULT 0.00,
  shipping_label_cost NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders (listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  tier VARCHAR(50) NOT NULL UNIQUE,
  max_listings INTEGER NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly NUMERIC(10,2) NOT NULL,
  features TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  stripe_product_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default subscription plans (edit prices in the admin dashboard, or use "Sync from Stripe").
-- stripe_product_id links each plan to its Stripe product; checkout needs it.
INSERT INTO subscription_plans (name, tier, max_listings, price_monthly, price_yearly, features, display_order, stripe_product_id) VALUES
  ('Starter', 'starter', 5, 9.99, 99.99, E'Up to 5 active listings\nBasic analytics\nEmail support', 1, 'prod_TzSm42oBUO77ax'),
  ('Professional', 'professional', 25, 24.99, 249.99, E'Up to 25 active listings\nAdvanced analytics\nPriority support\nFeatured listings', 2, 'prod_TzSmufdMNiztkM'),
  ('Enterprise', 'enterprise', 100, 49.99, 499.99, E'Up to 100 active listings\nFull analytics suite\n24/7 priority support\nFeatured listings\nCustom branding', 3, 'prod_TzSnMMYvDF4ajU')
ON CONFLICT (tier) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
  billing_period VARCHAR(10) NOT NULL CHECK (billing_period IN ('monthly','yearly')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_intent_id VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions (end_date);

-- One row per applied promotion. stripe_session_id is unique so confirming a payment twice applies it once.
CREATE TABLE IF NOT EXISTS listing_promotions (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_type VARCHAR(20) NOT NULL,
  days INTEGER,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  source VARCHAR(20) NOT NULL CHECK (source IN ('stripe','plan','admin')),
  stripe_session_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_promotions_listing ON listing_promotions (listing_id);
ALTER TABLE listing_promotions DROP CONSTRAINT IF EXISTS listing_promotions_promotion_type_check;
ALTER TABLE listing_promotions ADD CONSTRAINT listing_promotions_promotion_type_check
  CHECK (promotion_type IN ('feature','bump','listing_pass'));
CREATE INDEX IF NOT EXISTS idx_listing_promotions_user_source ON listing_promotions (user_id, source, created_at);

-- Paid homepage "Featured Artist" slot: one artist per week (Monday to Sunday, UTC).
CREATE TABLE IF NOT EXISTS featured_artist_bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  source VARCHAR(20) NOT NULL CHECK (source IN ('stripe','admin')),
  stripe_session_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_featured_artist_bookings_user ON featured_artist_bookings (user_id);

-- One row per renewal reminder sent. expires_at is part of the key, so extending a pass or feature re-arms reminders.
CREATE TABLE IF NOT EXISTS listing_reminders (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('listing_pass','feature')),
  expires_at TIMESTAMPTZ NOT NULL,
  stage VARCHAR(10) NOT NULL CHECK (stage IN ('7d','1d')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_listing_reminder UNIQUE (listing_id, kind, expires_at, stage)
);

-- Weekly "new art" email. Anyone can subscribe from the footer; every email carries a one-click unsubscribe link.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

-- Keep updated_at fresh on every UPDATE (replaces MySQL's ON UPDATE CURRENT_TIMESTAMP)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','listings','listing_comments','messages','chat_conversations','admin_announcements',
    'site_settings','dashboard_stats','orders','subscription_plans','user_subscriptions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$I', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

-- Lock every table away from the public REST API; the backend uses the postgres role, which bypasses RLS.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','listings','likes','listing_comments','messages','chat_conversations','chat_messages',
    'support_chat_messages','notifications','admin_announcements','site_settings','dashboard_stats',
    'orders','subscription_plans','user_subscriptions','listing_promotions',
    'featured_artist_bookings','listing_reminders','newsletter_subscribers'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Create the app profile row whenever a Supabase Auth user signs up. Profile fields arrive in
-- the signUp() user metadata. Only 'buyer'/'artist' can be self-selected; admins are promoted via `npm run set-admin`.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  new_user_id INTEGER;
BEGIN
  INSERT INTO public.users (
    auth_user_id, email, username, first_name, last_name, business_name, phone, country,
    website, specialties, experience_level, user_type,
    address_line1, address_line2, address_city, address_state, address_zip, address_country
  ) VALUES (
    NEW.id,
    lower(NEW.email),
    CASE WHEN meta->>'username' ~ '^[A-Za-z0-9_]{3,64}$' THEN meta->>'username' END,
    NULLIF(meta->>'first_name', ''),
    NULLIF(meta->>'last_name', ''),
    NULLIF(meta->>'business_name', ''),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'country', ''),
    NULLIF(meta->>'website', ''),
    CASE
      WHEN jsonb_typeof(meta->'specialties') = 'array' THEN (meta->'specialties')::text
      WHEN NULLIF(meta->>'specialties', '') IS NOT NULL THEN to_jsonb(string_to_array(meta->>'specialties', ', '))::text
    END,
    NULLIF(meta->>'experience_level', ''),
    CASE WHEN meta->>'user_type' = 'buyer' THEN 'buyer' ELSE 'artist' END,
    NULLIF(meta->>'address_line1', ''),
    NULLIF(meta->>'address_line2', ''),
    NULLIF(meta->>'address_city', ''),
    NULLIF(meta->>'address_state', ''),
    NULLIF(meta->>'address_zip', ''),
    COALESCE(NULLIF(meta->>'address_country', ''), 'US')
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO new_user_id;

  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.dashboard_stats (user_id) VALUES (new_user_id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
