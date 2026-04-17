// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const newsRoutes = require('./routes/news');
const marketRoutes = require('./routes/markets');
const notificationRoutes = require('./routes/notifications');
const { refreshNewsCache } = require('./services/newsService');
const { refreshMarketCache } = require('./services/marketService');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───
app.use(helmet());
app.use(cors({
  origin: [
    'https://pulsenews.com.au',
    'https://www.pulsenews.com.au',
    'http://localhost:3000',
    'http://localhost:19006', // Expo web
  ],
  methods: ['GET', 'POST'],
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── Routes ───
app.use('/api/news', newsRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Scheduled Jobs ───
// Refresh news cache every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('[CRON] Refreshing news cache...');
  try {
    await refreshNewsCache();
    console.log('[CRON] News cache refreshed');
  } catch (err) {
    console.error('[CRON] News refresh failed:', err.message);
  }
});

// Refresh market data every 1 minute
cron.schedule('* * * * *', async () => {
  try {
    await refreshMarketCache();
  } catch (err) {
    console.error('[CRON] Market refresh failed:', err.message);
  }
});

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`⚡ Pulse News API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initial cache warm-up
  refreshNewsCache().catch(console.error);
  refreshMarketCache().catch(console.error);
});

module.exports = app;
