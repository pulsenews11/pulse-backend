// src/routes/news.js
const express = require('express');
const router = express.Router();
const { getTopNews, getNewsByCategory, searchArticles, generateSummary } = require('../services/newsService');

// GET /api/news/top?country=au&limit=25
router.get('/top', async (req, res) => {
  try {
    const country = req.query.country || 'au';
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const news = await getTopNews(country, limit);
    res.json({ success: true, count: news.length, data: news });
  } catch (err) {
    console.error('GET /news/top error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch top news' });
  }
});

// GET /api/news/category/:cat?country=au&limit=25
router.get('/category/:cat', async (req, res) => {
  try {
    const { cat } = req.params;
    const country = req.query.country || 'au';
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const news = await getNewsByCategory(cat, country, limit);
    res.json({ success: true, category: cat, count: news.length, data: news });
  } catch (err) {
    console.error(`GET /news/category/${req.params.cat} error:`, err);
    res.status(500).json({ success: false, error: 'Failed to fetch category news' });
  }
});

// GET /api/news/search?q=query&limit=20
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
    }
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const news = await searchArticles(query.trim(), limit);
    res.json({ success: true, query, count: news.length, data: news });
  } catch (err) {
    console.error('GET /news/search error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// POST /api/news/summarize
router.post('/summarize', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'title and content are required' });
    }
    const summary = await generateSummary(title, content);
    res.json({ success: true, summary });
  } catch (err) {
    console.error('POST /news/summarize error:', err);
    res.status(500).json({ success: false, error: 'Summary generation failed' });
  }
});

module.exports = router;
