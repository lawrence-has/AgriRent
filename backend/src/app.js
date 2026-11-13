const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const equipmentRoutes = require('./routes/equipment');
const reservationRoutes = require('./routes/reservations');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const pushRoutes = require('./routes/pushSubscription');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const archiveRoutes = require('./routes/archive');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security headers ─────────────────────────────────────────────
app.use((req, res, next) => {
  // Prevent browsers from MIME-sniffing responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Block clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Basic XSS protection header
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Don't leak referrer info
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Remove Express fingerprint
  res.removeHeader('X-Powered-By');
  next();
});

// ── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:4173', // Vite preview
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global API rate limit ────────────────────────────────────────
// 200 requests per minute per IP — prevents DoS on the API
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/api/health', // don't limit health checks
});
app.use('/api', globalLimiter);

// ── Body parsers ─────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' })); // reduced from 10mb — no need for large JSON
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Static uploads ───────────────────────────────────────────────
// Only serve image files — block other file types
app.use('/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}, express.static(path.join(__dirname, '../uploads')));

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/archive', archiveRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 ──────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// ── Global error handler ─────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
