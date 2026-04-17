// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const { subscribeToTopic, unsubscribeFromTopic, sendToDevice } = require('../services/notificationService');

// POST /api/notifications/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || !topic) {
      return res.status(400).json({ success: false, error: 'token and topic are required' });
    }

    const validTopics = ['breaking', 'tech', 'sports', 'stocks', 'crypto', 'politics', 'business', 'health', 'science', 'entertainment'];
    if (!validTopics.includes(topic)) {
      return res.status(400).json({ success: false, error: `Invalid topic. Valid: ${validTopics.join(', ')}` });
    }

    const result = await subscribeToTopic(token, topic);
    res.json(result);
  } catch (err) {
    console.error('POST /notifications/subscribe error:', err);
    res.status(500).json({ success: false, error: 'Subscription failed' });
  }
});

// POST /api/notifications/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || !topic) {
      return res.status(400).json({ success: false, error: 'token and topic are required' });
    }

    const result = await unsubscribeFromTopic(token, topic);
    res.json(result);
  } catch (err) {
    console.error('POST /notifications/unsubscribe error:', err);
    res.status(500).json({ success: false, error: 'Unsubscription failed' });
  }
});

// POST /api/notifications/test — send a test notification
router.post('/test', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const result = await sendToDevice(
      token,
      '⚡ Pulse News',
      'Notifications are working! You\'ll receive breaking news alerts here.',
      { type: 'test' }
    );
    res.json(result);
  } catch (err) {
    console.error('POST /notifications/test error:', err);
    res.status(500).json({ success: false, error: 'Test notification failed' });
  }
});

module.exports = router;
