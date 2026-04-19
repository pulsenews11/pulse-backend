console.log("🚀 SERVER STARTING...");
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const newsRoutes = require('./routes/news');
const marketRoutes = require('./routes/markets');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('short'));
app.use(express.json());

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
}));

app.get('/', (req, res) => {
  res.json({
    name: 'Pulse News API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET  /api/health',
      'GET  /api/news/top',
      'GET  /api/news/category/:cat',
      'GET  /api/news/search?q=query',
      'GET  /api/markets/overview',
      'GET  /api/markets/crypto',
      'GET  /api/markets/stocks',
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

app.use('/api/news', newsRoutes);
app.use('/api/markets', marketRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Pulse News API running on 0.0.0.0:' + PORT);
});
