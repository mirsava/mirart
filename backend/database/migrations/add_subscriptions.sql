-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  max_listings INT NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  features TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tier (tier)
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  billing_period ENUM('monthly', 'yearly') NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_end_date (end_date)
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, tier, max_listings, price_monthly, price_yearly, features, display_order) VALUES
('Starter', 'starter', 5, 9.99, 99.99, 'Up to 5 active listings\nBasic analytics\nEmail support', 1),
('Professional', 'professional', 25, 24.99, 249.99, 'Up to 25 active listings\nAdvanced analytics\nPriority support\nFeatured listings', 2),
('Enterprise', 'enterprise', 100, 49.99, 499.99, 'Up to 100 active listings\nFull analytics suite\n24/7 priority support\nFeatured listings\nCustom branding', 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);
