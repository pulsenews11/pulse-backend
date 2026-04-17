// src/routes/markets.js
const express = require('express');
const router = express.Router();
const markets = require('../services/marketService');

// GET /api/markets/overview
router.get('/overview', async (req, res) => {
  try {
    const data = await markets.getOverview();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/overview:', err.message);
    res.json({ success: true, data: markets.getFallback() });
  }
});

// GET /api/markets/crypto
router.get('/crypto', async (req, res) => {
  try {
    const data = await markets.getCrypto();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/crypto:', err.message);
    res.json({ success: true, data: {} });
  }
});

// GET /api/markets/stocks
router.get('/stocks', async (req, res) => {
  try {
    const data = await markets.getStocks();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/stocks:', err.message);
    res.json({ success: true, data: markets.getFallback() });
  }
});

module.exports = router;
