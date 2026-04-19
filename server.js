const http = require('http');

const PORT = process.env.PORT || 3000;

const MOCK_NEWS = [
  { id: 1, cat: 'top', hl: 'Global AI Summit Reaches Historic Agreement', sum: 'World leaders agreed on binding AI safety protocols.', src: 'Reuters', time: '12m', breaking: true },
  { id: 2, cat: 'top', hl: 'SpaceX Starship Completes Mars Orbit', sum: 'Four astronauts orbited Mars aboard Starship.', src: 'NASA', time: '28m', breaking: true },
  { id: 3, cat: 'tech', hl: 'Apple Unveils M5 Ultra Chip', sum: 'New M5 delivers 4x AI performance.', src: 'The Verge', time: '45m', breaking: false },
  { id: 4, cat: 'stocks', hl: 'S&P 500 Crosses 7,000', sum: 'Major indices surged on tech earnings.', src: 'Bloomberg', time: '1h', breaking: false },
  { id: 5, cat: 'crypto', hl: 'Bitcoin Above $150K', sum: 'BTC hit all-time high on institutional buying.', src: 'CoinDesk', time: '1h', breaking: false },
  { id: 6, cat: 'world', hl: 'EU Digital Tax Reform Passes', sum: 'Tech giants must pay taxes per member state.', src: 'Financial Times', time: '2h', breaking: false },
  { id: 7, cat: 'sports', hl: 'India Wins ICC Champions Trophy', sum: 'India beat Australia by 4 wickets at Lords.', src: 'ESPN', time: '2h', breaking: false },
  { id: 8, cat: 'health', hl: 'WHO Approves Universal Flu Vaccine', sum: 'First mRNA flu vaccine gets emergency approval.', src: 'WHO', time: '3h', breaking: false },
  { id: 9, cat: 'science', hl: 'Webb Telescope Finds Biosignatures', sum: 'Dimethyl sulfide detected on exoplanet K2-18b.', src: 'Nature', time: '5h', breaking: false },
  { id: 10, cat: 'business', hl: 'Tesla Opens Southeast Asia Factory', sum: 'Indonesia Gigafactory to produce 500K cars yearly.', src: 'CNBC', time: '4h', breaking: false },
];

const MARKETS = {
  indices: [
    { sym: 'S&P 500', val: '7,042', chg: '+0.84%', up: true },
    { sym: 'NASDAQ', val: '22,891', chg: '+1.12%', up: true },
    { sym: 'ASX 200', val: '8,432', chg: '+0.41%', up: true },
  ],
  stocks: [
    { sym: 'NVDA', val: '$312.80', chg: '+3.4%', up: true },
    { sym: 'AAPL', val: '$248.30', chg: '-0.3%', up: false },
    { sym: 'TSLA', val: '$421.50', chg: '+1.9%', up: true },
  ],
  crypto: [
    { sym: 'BTC', val: '$151,240', chg: '+2.8%', up: true },
    { sym: 'ETH', val: '$8,920', chg: '+1.6%', up: true },
  ],
};

function json(res, data, status) {
  res.writeHead(status || 200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(function (req, res) {
  var url = req.url.split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (url === '/' || url === '') {
    return json(res, {
      name: 'Pulse News API',
      version: '1.0.0',
      status: 'running',
      port: PORT,
    });
  }

  if (url === '/api/health') {
    return json(res, {
      status: 'ok',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      port: PORT,
    });
  }

  if (url === '/api/news/top') {
    return json(res, { success: true, count: MOCK_NEWS.length, data: MOCK_NEWS });
  }

  if (url.startsWith('/api/news/category/')) {
    var cat = url.replace('/api/news/category/', '');
    var filtered = MOCK_NEWS.filter(function (n) { return n.cat === cat; });
    return json(res, { success: true, category: cat, count: filtered.length, data: filtered });
  }

  if (url === '/api/news/search') {
    return json(res, { success: true, query: '', count: MOCK_NEWS.length, data: MOCK_NEWS });
  }

  if (url === '/api/markets/overview') {
    return json(res, { success: true, data: MARKETS });
  }

  if (url === '/api/markets/crypto') {
    return json(res, { success: true, data: MARKETS.crypto });
  }

  if (url === '/api/markets/stocks') {
    return json(res, { success: true, data: { indices: MARKETS.indices, stocks: MARKETS.stocks } });
  }

  json(res, { error: 'Not found', path: url }, 404);
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('Pulse News API running on 0.0.0.0:' + PORT);
});
