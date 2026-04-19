const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

console.log('BOOT: server file loaded');

app.get('/', (req, res) => {
  res.json({ ok: true, route: '/' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('LISTENING ON', PORT);
});
