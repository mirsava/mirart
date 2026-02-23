import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import usersRouter from './routes/users.js';
import listingsRouter from './routes/listings.js';
import dashboardRouter from './routes/dashboard.js';
import uploadRouter from './routes/upload.js';
import ordersRouter from './routes/orders.js';
import likesRouter from './routes/likes.js';
import emailRouter from './routes/email.js';
import messagesRouter from './routes/messages.js';
import adminRouter from './routes/admin.js';
import chatRouter from './routes/chat.js';
import commentsRouter from './routes/comments.js';
import subscriptionsRouter from './routes/subscriptions.js';
import stripeRouter from './routes/stripe.js';
import shippingRouter from './routes/shipping.js';
import { stripe } from './config/stripe.js';
import announcementsRouter from './routes/announcements.js';
import notificationsRouter from './routes/notifications.js';
import supportChatRouter from './routes/supportChat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow the configured frontend URL
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173'
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate email previews at startup (so /email-previews/ works without running script)
const emailPreviewsDir = path.join(__dirname, 'email-previews');
try {
  const { buildTemplate, templates } = await import('./services/emailService.js');
  const sampleData = {
    contact: { listingTitle: 'Sunset Over the Mountains', listingId: 42, message: "Hi! I'm very interested in this piece.\n\nCould you tell me more?", fromName: 'Jane Doe', from: 'jane@example.com' },
    messageReply: { listingTitle: 'Abstract Blue #3', listingId: 18, message: "Thanks! Yes, the piece is still available.", fromName: 'John Smith', from: 'john@example.com' },
    welcome: { userName: 'Alex', loginUrl: process.env.FRONTEND_URL || 'http://localhost:5173' },
    verificationCode: { userName: 'Alex', code: '847291', expiresInMinutes: 24 },
    passwordReset: { userName: 'Alex', code: '382916', expiresInMinutes: 60 },
    passwordChanged: { userName: 'Alex' },
  };
  mkdirSync(emailPreviewsDir, { recursive: true });
  for (const [name, builder] of Object.entries(templates)) {
    const template = builder(sampleData[name] || {});
    writeFileSync(path.join(emailPreviewsDir, `${name}.html`), buildTemplate(template).html.trim(), 'utf8');
  }
  const indexHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email Previews</title><style>body{font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto}h1{color:#4a3a9a}ul{list-style:none;padding:0}li{margin:0.5rem 0}a{color:#534bae;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><h1>Email Template Previews</h1><p>Sample HTML for each template.</p><ul>${Object.keys(templates).map((n) => `<li><a href="${n}.html">${n}.html</a></li>`).join('')}</ul></body></html>`;
  writeFileSync(path.join(emailPreviewsDir, 'index.html'), indexHtml, 'utf8');
} catch (err) {
  console.warn('Could not generate email previews:', err.message);
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/email-previews', express.static(emailPreviewsDir));

// Debug middleware to log all requests
app.use((req, res, next) => {
  if (req.path.includes('subscriptions') || req.url.includes('subscriptions')) {
    console.log(`[DEBUG] Subscriptions request: ${req.method} ${req.path} ${req.url} ${req.originalUrl}`);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ArtZyla API is running' });
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/likes', likesRouter);
app.use('/api/email', emailRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/support-chat', supportChatRouter);

// 404 handler - must be after all routes
app.use((req, res, next) => {
  console.log(`[404] Route not found: ${req.method} ${req.path} ${req.url}`);
  console.log(`[404] Original URL: ${req.originalUrl}`);
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export app for testing (supertest)
export { app };

// Start server (skip when running tests)
if (process.env.NODE_ENV !== 'test') {
app.listen(PORT, async () => {
  console.log(`\n=== SERVER STARTED ===`);
  console.log(`Server is running on port ${PORT}`);

  const pool = (await import('./config/database.js')).default;
  try {
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'default_shipping_preference'",
      [process.env.DB_NAME || 'mirart']
    );
    if (cols.length === 0) {
      await pool.execute("ALTER TABLE users ADD COLUMN default_shipping_preference VARCHAR(20) DEFAULT 'buyer'");
      console.log('[Startup] Added default_shipping_preference column to users');
    }
    const [carrierCols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'default_shipping_carrier'",
      [process.env.DB_NAME || 'mirart']
    );
    if (carrierCols.length === 0) {
      await pool.execute("ALTER TABLE users ADD COLUMN default_shipping_carrier VARCHAR(20) DEFAULT 'shippo'");
      console.log('[Startup] Added default_shipping_carrier column to users');
    }
    const [listPrefCols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'shipping_preference'",
      [process.env.DB_NAME || 'mirart']
    );
    if (listPrefCols.length === 0) {
      await pool.execute("ALTER TABLE listings ADD COLUMN shipping_preference VARCHAR(20) DEFAULT NULL");
      await pool.execute("ALTER TABLE listings ADD COLUMN shipping_carrier VARCHAR(20) DEFAULT NULL");
      console.log('[Startup] Added shipping_preference and shipping_carrier columns to listings');
    }
    const [listReturnCols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'return_days'",
      [process.env.DB_NAME || 'mirart']
    );
    if (listReturnCols.length === 0) {
      await pool.execute("ALTER TABLE listings ADD COLUMN return_days INT DEFAULT NULL");
      console.log('[Startup] Added return_days column to listings');
    }
    const [returnCols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'default_return_days'",
      [process.env.DB_NAME || 'mirart']
    );
    if (returnCols.length === 0) {
      await pool.execute("ALTER TABLE users ADD COLUMN default_return_days INT DEFAULT 30");
      console.log('[Startup] Added default_return_days column to users');
    }
    const parcelDefaults = { weight_oz: 24, length_in: 24, width_in: 18, height_in: 3 };
    for (const col of Object.keys(parcelDefaults)) {
      const [pc] = await pool.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = ?",
        [process.env.DB_NAME || 'mirart', col]
      );
      if (pc.length === 0) {
        await pool.execute(`ALTER TABLE listings ADD COLUMN ${col} DECIMAL(10, 2) DEFAULT ${parcelDefaults[col]}`);
        console.log(`[Startup] Added ${col} column to listings`);
      }
    }
    const userAddressCols = [
      { name: 'address_line1', sql: 'ADD COLUMN address_line1 VARCHAR(255) NULL' },
      { name: 'address_line2', sql: 'ADD COLUMN address_line2 VARCHAR(255) NULL' },
      { name: 'address_city', sql: 'ADD COLUMN address_city VARCHAR(100) NULL' },
      { name: 'address_state', sql: 'ADD COLUMN address_state VARCHAR(100) NULL' },
      { name: 'address_zip', sql: 'ADD COLUMN address_zip VARCHAR(20) NULL' },
      { name: 'address_country', sql: "ADD COLUMN address_country VARCHAR(10) DEFAULT 'US'" },
      { name: 'billing_line1', sql: 'ADD COLUMN billing_line1 VARCHAR(255) NULL' },
      { name: 'billing_line2', sql: 'ADD COLUMN billing_line2 VARCHAR(255) NULL' },
      { name: 'billing_city', sql: 'ADD COLUMN billing_city VARCHAR(100) NULL' },
      { name: 'billing_state', sql: 'ADD COLUMN billing_state VARCHAR(100) NULL' },
      { name: 'billing_zip', sql: 'ADD COLUMN billing_zip VARCHAR(20) NULL' },
      { name: 'billing_country', sql: "ADD COLUMN billing_country VARCHAR(10) DEFAULT 'US'" },
    ];
    for (const { name, sql } of userAddressCols) {
      const [ac] = await pool.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?",
        [process.env.DB_NAME || 'mirart', name]
      );
      if (ac.length === 0) {
        await pool.execute(`ALTER TABLE users ${sql}`);
        console.log(`[Startup] Added ${name} column to users`);
      }
    }
    const listingCols = [
      { name: 'shipping_info', sql: 'ADD COLUMN shipping_info TEXT DEFAULT NULL' },
      { name: 'returns_info', sql: 'ADD COLUMN returns_info TEXT DEFAULT NULL' },
      { name: 'special_instructions', sql: 'ADD COLUMN special_instructions TEXT DEFAULT NULL' },
      { name: 'allow_comments', sql: 'ADD COLUMN allow_comments BOOLEAN DEFAULT TRUE' },
      { name: 'quantity_available', sql: 'ADD COLUMN quantity_available INT DEFAULT 1' }
    ];
    for (const { name, sql } of listingCols) {
      const [lc] = await pool.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = ?",
        [process.env.DB_NAME || 'mirart', name]
      );
      if (lc.length === 0) {
        await pool.execute(`ALTER TABLE listings ${sql}`);
        console.log(`[Startup] Added ${name} column to listings`);
      }
    }
  } catch (err) {
    console.warn('[Startup] Shipping migration:', err?.message || err);
  }

  try {
    const orderReturnCols = [
      { name: 'return_status', sql: "ADD COLUMN return_status VARCHAR(30) DEFAULT NULL AFTER status" },
      { name: 'return_reason', sql: "ADD COLUMN return_reason TEXT DEFAULT NULL AFTER return_status" },
      { name: 'return_requested_at', sql: "ADD COLUMN return_requested_at TIMESTAMP NULL DEFAULT NULL AFTER return_reason" },
    ];
    for (const { name, sql } of orderReturnCols) {
      const [oc] = await pool.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?",
        [process.env.DB_NAME || 'mirart', name]
      );
      if (oc.length === 0) {
        await pool.execute(`ALTER TABLE orders ${sql}`);
        console.log(`[Startup] Added ${name} column to orders`);
      }
    }
  } catch (err) {
    console.warn('[Startup] Order return columns migration:', err?.message || err);
  }

  try {
    const trackingCols = [
      { name: 'shipping_carrier', sql: "ADD COLUMN shipping_carrier VARCHAR(50) NULL" },
      { name: 'tracking_status', sql: "ADD COLUMN tracking_status VARCHAR(50) NULL" },
      { name: 'tracking_last_updated', sql: "ADD COLUMN tracking_last_updated TIMESTAMP NULL" },
      { name: 'shipped_at', sql: "ADD COLUMN shipped_at TIMESTAMP NULL" },
      { name: 'delivered_at', sql: "ADD COLUMN delivered_at TIMESTAMP NULL" },
      { name: 'shippo_transaction_id', sql: "ADD COLUMN shippo_transaction_id VARCHAR(100) NULL" },
      { name: 'shippo_rate_id', sql: "ADD COLUMN shippo_rate_id VARCHAR(100) NULL" },
    ];
    for (const { name, sql } of trackingCols) {
      const [tc] = await pool.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?",
        [process.env.DB_NAME || 'mirart', name]
      );
      if (tc.length === 0) {
        await pool.execute(`ALTER TABLE orders ${sql}`);
        console.log(`[Startup] Added ${name} column to orders`);
      }
    }
  } catch (err) {
    console.warn('[Startup] Tracking columns migration:', err?.message || err);
  }

  try {
    const [ratingCol] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listing_comments' AND COLUMN_NAME = 'rating'",
      [process.env.DB_NAME || 'mirart']
    );
    if (ratingCol.length === 0) {
      await pool.execute("ALTER TABLE listing_comments ADD COLUMN rating TINYINT NULL AFTER comment");
      console.log('[Startup] Added rating column to listing_comments');
    }
  } catch (err) {
    console.warn('[Startup] Rating column migration:', err?.message || err);
  }

  try {
    const [tables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_announcements'",
      [process.env.DB_NAME || 'mirart']
    );
    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE admin_announcements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          message TEXT NOT NULL,
          target_type ENUM('all', 'authenticated', 'artists', 'buyers', 'admins', 'specific') NOT NULL DEFAULT 'all',
          target_user_ids JSON NULL,
          severity ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
          is_active BOOLEAN DEFAULT TRUE,
          start_date DATETIME NULL,
          end_date DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active_dates (is_active, start_date, end_date)
        )
      `);
      console.log('[Startup] Created admin_announcements table');
    }
  } catch (err) {
    console.warn('[Startup] Announcements migration:', err?.message || err);
  }

  try {
    const [tables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications'",
      [process.env.DB_NAME || 'mirart']
    );
    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          body TEXT,
          link VARCHAR(500),
          reference_id INT,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_read (user_id, read_at),
          INDEX idx_created (created_at)
        )
      `);
      console.log('[Startup] Created notifications table');
    }
  } catch (err) {
    console.warn('[Startup] Notifications migration:', err?.message || err);
  }

  try {
    const [ssTables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'site_settings'",
      [process.env.DB_NAME || 'mirart']
    );
    if (ssTables.length === 0) {
      await pool.execute(`
        CREATE TABLE site_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await pool.execute(
        "INSERT INTO site_settings (setting_key, setting_value) VALUES ('support_chat_config', ?)",
        [JSON.stringify({ enabled: true, hours_start: 9, hours_end: 17, timezone: 'America/Los_Angeles', offline_message: 'Support is currently offline. Please leave a message and we will get back to you.', welcome_message: 'Hi! How can we help you today?' })]
      );
      console.log('[Startup] Created site_settings table with support chat defaults');
    }
  } catch (err) {
    console.warn('[Startup] Site settings migration:', err?.message || err);
  }

  try {
    const [ucRow] = await pool.execute(
      "SELECT setting_key FROM site_settings WHERE setting_key = 'user_chat_enabled'"
    );
    if (ucRow.length === 0) {
      await pool.execute(
        "INSERT INTO site_settings (setting_key, setting_value) VALUES ('user_chat_enabled', ?)",
        [JSON.stringify(false)]
      );
      console.log('[Startup] Added user_chat_enabled setting (default: off)');
    }
  } catch (err) {
    console.warn('[Startup] User chat setting migration:', err?.message || err);
  }

  try {
    const [scTables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'support_chat_messages'",
      [process.env.DB_NAME || 'mirart']
    );
    if (scTables.length === 0) {
      await pool.execute(`
        CREATE TABLE support_chat_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          user_email VARCHAR(255) NULL,
          user_name VARCHAR(255) NULL,
          sender ENUM('user', 'admin') NOT NULL,
          message TEXT NOT NULL,
          admin_id INT NULL,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id, created_at),
          INDEX idx_unread (sender, read_at)
        )
      `);
      console.log('[Startup] Created support_chat_messages table');
    }
  } catch (err) {
    console.warn('[Startup] Support chat migration:', err?.message || err);
  }

  try {
    const { runSubscriptionExpirationJob } = await import('./services/subscriptionExpiration.js');
    await runSubscriptionExpirationJob();
  } catch (err) {
    console.warn('[Startup] Subscription expiration job failed:', err?.message || err);
  }
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\n=== REGISTERED ROUTES ===`);
  console.log(`Subscriptions routes registered at /api/subscriptions`);
  console.log(`Test route: http://localhost:${PORT}/api/subscriptions/test`);
  console.log(`Admin plans route: http://localhost:${PORT}/api/subscriptions/admin/plans`);
  console.log(`\n=== VERIFYING SUBSCRIPTIONS ROUTER ===`);
  if (subscriptionsRouter && subscriptionsRouter.stack) {
    console.log(`Subscriptions router stack length: ${subscriptionsRouter.stack.length}`);
    subscriptionsRouter.stack.forEach((layer, index) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        console.log(`  Route ${index + 1}: ${methods} ${layer.route.path}`);
      }
    });
  } else {
    console.log(`ERROR: Subscriptions router not properly initialized!`);
  }
  console.log(`\n`);

  // Tracking poll: check shipped orders every 30 minutes for delivery status
  const TRACKING_POLL_INTERVAL = 30 * 60 * 1000;
  async function pollShippedOrders() {
    try {
      const { shippoConfig } = await import('./config/shippo.js');
      if (!shippoConfig.isConfigured) return;

      const [orders] = await pool.execute(
        "SELECT id, tracking_number, shipping_carrier, tracking_status, buyer_id, seller_id, order_number, payment_intent_id FROM orders WHERE status = 'shipped' AND tracking_number IS NOT NULL"
      );
      if (orders.length === 0) return;

      const { createNotification } = await import('./services/notificationService.js');

      for (const order of orders) {
        try {
          const carrier = order.shipping_carrier || 'usps';
          const res = await fetch('https://api.goshippo.com/tracks', {
            method: 'POST',
            headers: {
              Authorization: `ShippoToken ${shippoConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ carrier, tracking_number: order.tracking_number }),
          });
          const data = await res.json();
          const newStatus = data.tracking_status?.status || 'UNKNOWN';
          const oldStatus = order.tracking_status || '';

          if (newStatus !== oldStatus) {
            await pool.execute(
              'UPDATE orders SET tracking_status = ?, tracking_last_updated = NOW() WHERE id = ?',
              [newStatus, order.id]
            );

            if (newStatus === 'TRANSIT' && oldStatus !== 'TRANSIT') {
              await createNotification({ userId: order.buyer_id, type: 'order', title: 'Order in transit', body: `Order ${order.order_number} is on its way.`, link: `/orders?order=${order.id}`, referenceId: order.id, severity: 'info' }).catch(() => {});
            }
            if (newStatus === 'DELIVERED') {
              await pool.execute(
                "UPDATE orders SET status = 'delivered', delivered_at = NOW() WHERE id = ?",
                [order.id]
              );

              // Auto-capture Stripe payment and transfer to seller
              if (order.payment_intent_id && stripe) {
                try {
                  const pi = await stripe.paymentIntents.retrieve(order.payment_intent_id);
                  if (pi.status === 'requires_capture') {
                    await stripe.paymentIntents.capture(order.payment_intent_id);
                  }
                  if (pi.transfer_group) {
                    const [orderRow] = await pool.execute('SELECT artist_earnings, seller_id FROM orders WHERE id = ?', [order.id]);
                    if (orderRow.length > 0) {
                      const [seller] = await pool.execute('SELECT stripe_account_id FROM users WHERE id = ?', [orderRow[0].seller_id]);
                      if (seller.length > 0 && seller[0].stripe_account_id) {
                        await stripe.transfers.create({
                          amount: Math.round(parseFloat(orderRow[0].artist_earnings) * 100),
                          currency: 'usd',
                          destination: seller[0].stripe_account_id,
                          transfer_group: pi.transfer_group,
                        });
                      }
                    }
                  }
                } catch (stripeErr) {
                  console.warn(`[Tracking] Stripe auto-capture failed for order ${order.id}:`, stripeErr.message);
                }
              }

              await createNotification({ userId: order.buyer_id, type: 'order', title: 'Order delivered', body: `Order ${order.order_number} has been delivered.`, link: `/orders?order=${order.id}`, referenceId: order.id, severity: 'success' }).catch(() => {});
              await createNotification({ userId: order.seller_id, type: 'order', title: 'Order delivered', body: `Order ${order.order_number} has been delivered. Payment released.`, link: `/orders?order=${order.id}`, referenceId: order.id, severity: 'success' }).catch(() => {});
            }
          }
        } catch (orderErr) {
          console.warn(`[Tracking] Failed to poll order ${order.id}:`, orderErr.message);
        }
      }
    } catch (err) {
      console.warn('[Tracking] Poll error:', err.message);
    }
  }

  setTimeout(pollShippedOrders, 60000);
  setInterval(pollShippedOrders, TRACKING_POLL_INTERVAL);
  console.log('[Tracking] Polling shipped orders every 30 minutes');
});
}

