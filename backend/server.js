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
import pool from './config/database.js';
import announcementsRouter from './routes/announcements.js';
import notificationsRouter from './routes/notifications.js';
import supportChatRouter from './routes/supportChat.js';
import authRouter from './routes/auth.js';
import { attachAuth } from './middleware/auth.js';

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
app.use(attachAuth);

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

const SITE_URL = (process.env.FRONTEND_URL || 'https://artzyla.com').replace(/\/$/, '');

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const getListingPath = (id, title) => {
  const slug = slugify(title);
  return slug ? `/painting/${slug}-${id}` : `/painting/${id}`;
};

const STATIC_SITEMAP_ENTRIES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/gallery', changefreq: 'daily', priority: '0.9' },
  { path: '/gallery?category=Painting', changefreq: 'daily', priority: '0.8' },
  { path: '/gallery?category=Woodworking', changefreq: 'daily', priority: '0.8' },
  { path: '/gallery?category=Prints', changefreq: 'daily', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/subscription-plans', changefreq: 'weekly', priority: '0.8' },
  { path: '/artist-signup', changefreq: 'monthly', priority: '0.6' },
];

const sendSitemapIndex = (_req, res) => {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-listings.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
  res.send(xml);
};

app.get('/sitemap.xml', sendSitemapIndex);
app.get('/api/sitemap.xml', sendSitemapIndex);

const sendStaticSitemap = (_req, res) => {
  const lastmod = new Date().toISOString();
  const urls = STATIC_SITEMAP_ENTRIES.map(
    (entry) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  ).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
};

app.get('/sitemap-static.xml', sendStaticSitemap);
app.get('/api/sitemap-static.xml', sendStaticSitemap);

const sendListingsSitemap = async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT l.id, l.title, l.created_at
       FROM listings l
       JOIN users u ON l.user_id = u.id
       WHERE l.status = 'active' AND COALESCE(u.blocked, FALSE) = FALSE
       ORDER BY l.created_at DESC`
    );

    const urls = rows
      .map((row) => {
        const loc = `${SITE_URL}${getListingPath(row.id, row.title)}`;
        const lastmod = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
        return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap listings generation failed:', error);
    res.status(500).send('Failed to generate sitemap');
  }
};

app.get('/sitemap-listings.xml', sendListingsSitemap);
app.get('/api/sitemap-listings.xml', sendListingsSitemap);

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
app.use('/api/auth', authRouter);
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
  try {
    const supportChatDefaults = { enabled: true, hours_start: 9, hours_end: 17, timezone: 'America/Los_Angeles', offline_message: 'Support is currently offline. Please leave a message and we will get back to you.', welcome_message: 'Hi! How can we help you today?' };
    await pool.execute(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('support_chat_config', ?) ON CONFLICT (setting_key) DO NOTHING",
      [JSON.stringify(supportChatDefaults)]
    );
    await pool.execute(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('user_chat_enabled', ?) ON CONFLICT (setting_key) DO NOTHING",
      [JSON.stringify(false)]
    );
    await pool.execute(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('test_data_enabled', ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value",
      [JSON.stringify(false)]
    );
  } catch (err) {
    console.warn('[Startup] Site settings seed failed:', err?.message || err);
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

