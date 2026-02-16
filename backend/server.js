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
});
}

