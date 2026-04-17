// src/routes/markets.js
const express = require('express');
const router = express.Router();
const { getCryptoData, getStockIndices, getMarketOverview } = require('../services/marketService');

// GET /api/markets/overview — all market data combined
router.get('/overview', async (req, res) => {
  try {
    const data = await getMarketOverview();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/overview error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch market data' });
  }
});

// GET /api/markets/crypto
router.get('/crypto', async (req, res) => {
  try {
    const data = await getCryptoData();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/crypto error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch crypto data' });
  }
});

// GET /api/markets/stocks
router.get('/stocks', async (req, res) => {
  try {
    const data = await getStockIndices();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/stocks error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stock data' });
  }
});

module.exports = router;
