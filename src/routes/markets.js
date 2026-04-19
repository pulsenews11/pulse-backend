const express = require('express');
const router = express.Router();
const markets = require('../services/marketService');

router.get('/overview', async (req, res) => {
  try {
    const data = await markets.getOverview();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/overview:', err.message);
    res.json({ success: true, data: markets.getFallback() });
  }
});

router.get('/crypto', async (req, res) => {
  try {
    const data = await markets.getCrypto();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /markets/crypto:', err.message);
    res.json({ success: true, data: {} });
  }
});

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
