import pool from '../config/database.js';

async function testTables() {
  try {
    console.log('Testing database connection...');
    await pool.execute('SELECT 1');
    console.log('✓ Database connection successful\n');

    console.log('Checking for subscription_plans table...');
    try {
      const [plans] = await pool.execute('SELECT COUNT(*) as count FROM subscription_plans');
      console.log(`✓ subscription_plans table exists with ${plans[0].count} rows`);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('✗ subscription_plans table does NOT exist');
      } else {
        throw error;
      }
    }

    console.log('\nChecking for user_subscriptions table...');
    try {
      const [subs] = await pool.execute('SELECT COUNT(*) as count FROM user_subscriptions');
      console.log(`✓ user_subscriptions table exists with ${subs[0].count} rows`);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('✗ user_subscriptions table does NOT exist');
      } else {
        throw error;
      }
    }

    console.log('\nCreating tables if they don\'t exist...');
    
    // Create subscription_plans table
    await pool.execute(`
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
      )
    `);
    console.log('✓ Created subscription_plans table');

    // Create user_subscriptions table
    await pool.execute(`
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
      )
    `);
    console.log('✓ Created user_subscriptions table');

    // Insert default plans
    await pool.execute(`
      INSERT INTO subscription_plans (name, tier, max_listings, price_monthly, price_yearly, features, display_order) VALUES
      ('Starter', 'starter', 5, 9.99, 99.99, 'Up to 5 active listings\nBasic analytics\nEmail support', 1),
      ('Professional', 'professional', 25, 24.99, 249.99, 'Up to 25 active listings\nAdvanced analytics\nPriority support\nFeatured listings', 2),
      ('Enterprise', 'enterprise', 100, 49.99, 499.99, 'Up to 100 active listings\nFull analytics suite\n24/7 priority support\nFeatured listings\nCustom branding', 3)
      ON DUPLICATE KEY UPDATE name=VALUES(name)
    `);
    console.log('✓ Inserted/Updated subscription plans');

    console.log('\n✓ All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('   Code:', error.code);
    if (error.sql) {
      console.error('   SQL:', error.sql.substring(0, 200));
    }
    process.exit(1);
  }
}

testTables();
