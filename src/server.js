console.log("BOOT: server file loaded");

const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  console.log("REQ: /");
  res.json({ ok: true, route: "/" });
});

app.get('/api/health', (req, res) => {
  console.log("REQ: /api/health");
  res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log("LISTENING ON", PORT);
});
