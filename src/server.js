// 🚀 FORCE START LOG
console.log("🚀 SERVER FILE LOADED");

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// --- Health check (VERY IMPORTANT) ---
app.get('/', (req, res) => {
  console.log("GET /");
  res.json({ status: 'ok', message: 'Root working' });
});

app.get('/api/health', (req, res) => {
  console.log("GET /api/health");
  res.json({ status: 'ok', service: 'pulse-backend' });
});

// --- Safe route loading (prevents crash) ---
try {
  const newsRoutes = require('./routes/news');
  app.use('/api/news', newsRoutes);
  console.log("✅ News routes loaded");
} catch (err) {
  console.error("❌ Failed to load news routes:", err.message);
}

try {
  const marketRoutes = require('./routes/markets');
  app.use('/api/markets', marketRoutes);
  console.log("✅ Market routes loaded");
} catch (err) {
  console.error("❌ Failed to load market routes:", err.message);
}

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});
