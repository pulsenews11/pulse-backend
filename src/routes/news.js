const express = require('express');
const router = express.Router();
const news = require('../services/newsService');

router.get('/top', async (req, res) => {
  try {
    const country = req.query.country || 'au';
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const data = await news.getTopNews(country, limit);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('GET /news/top:', err.message);
    res.json({ success: true, count: 0, data: news.getMockNews() });
  }
});

router.get('/category/:cat', async (req, res) => {
  try {
    const { cat } = req.params;
    const country = req.query.country || 'au';
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const data = await news.getByCategory(cat, country, limit);
    res.json({ success: true, category: cat, count: data.length, data });
  } catch (err) {
    console.error('GET /news/category:', err.message);
    const mock = news.getMockNews().filter(n => n.cat === req.params.cat);
    res.json({ success: true, category: req.params.cat, count: mock.length, data: mock });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ success: false, error: 'Query must be at least 2 chars' });
    }
    const data = await news.searchNews(q);
    res.json({ success: true, query: q, count: data.length, data });
  } catch (err) {
    console.error('GET /news/search:', err.message);
    res.json({ success: true, query: req.query.q, count: 0, data: [] });
  }
});

module.exports = router;
