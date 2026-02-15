import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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
import paypalRouter from './routes/paypal.js';

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/paypal', paypalRouter);

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

// Start server
app.listen(PORT, () => {
  console.log(`\n=== SERVER STARTED ===`);
  console.log(`Server is running on port ${PORT}`);
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

