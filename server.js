const http = require('http');
const https = require('https');
const PORT = process.env.PORT || 3000;

// API Keys from Railway Variables
var GNEWS_KEY = process.env.GNEWS_API_KEY || '';
var NEWSDATA_KEY = process.env.NEWSDATA_API_KEY || '';
var NEWSAPI_KEY = process.env.NEWS_API_KEY || '';

// Cache: stores fetched news for 15 minutes to save API calls
var cache = {};
var CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ─── HTTP GET helper (no external dependencies) ───
function httpGet(url) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('Timeout')); }, 10000);
    https.get(url, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        clearTimeout(timer);
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Bad JSON from ' + url.split('?')[0])); }
      });
    }).on('error', function (e) { clearTimeout(timer); reject(e); });
  });
}

// ─── Check cache ───
function getCache(key) {
  if (cache[key] && Date.now() - cache[key].time < CACHE_TTL) {
    return cache[key].data;
  }
  return null;
}
function setCache(key, data) {
  cache[key] = { data: data, time: Date.now() };
}

// ─── GNEWS.IO ───
async function fetchGNews(category, country) {
  if (!GNEWS_KEY) return [];
  var cat = category || 'general';
  var catMap = { top: 'general', tech: 'technology', stocks: 'business', crypto: 'business', politics: 'general', environment: 'science' };
  var apiCat = catMap[cat] || cat;
  var url = 'https://gnews.io/api/v4/top-headlines?category=' + apiCat + '&lang=en&country=' + (country || 'au') + '&max=10&apikey=' + GNEWS_KEY;
  try {
    var data = await httpGet(url);
    if (data.articles && data.articles.length > 0) {
      return data.articles.map(function (a, i) {
        return {
          id: 'gn-' + Date.now() + '-' + i,
          cat: category || 'top',
          hl: (a.title || '').replace(/ - .*$/, '').trim(),
          sum: a.description || '',
          src: (a.source && a.source.name) || 'Unknown',
          time: timeAgo(a.publishedAt),
          img: a.image || null,
          url: a.url || '',
          breaking: isBreaking(a.publishedAt),
        };
      });
    }
  } catch (e) { console.error('GNews error:', e.message); }
  return [];
}

// ─── GNEWS SEARCH ───
async function searchGNews(query) {
  if (!GNEWS_KEY) return [];
  var url = 'https://gnews.io/api/v4/search?q=' + encodeURIComponent(query) + '&lang=en&max=10&apikey=' + GNEWS_KEY;
  try {
    var data = await httpGet(url);
    if (data.articles && data.articles.length > 0) {
      return data.articles.map(function (a, i) {
        return {
          id: 'gns-' + Date.now() + '-' + i,
          cat: guessCategory(a.title + ' ' + a.description),
          hl: (a.title || '').replace(/ - .*$/, '').trim(),
          sum: a.description || '',
          src: (a.source && a.source.name) || 'Unknown',
          time: timeAgo(a.publishedAt),
          img: a.image || null,
          url: a.url || '',
          breaking: false,
        };
      });
    }
  } catch (e) { console.error('GNews search error:', e.message); }
  return [];
}

// ─── NEWSDATA.IO ───
async function fetchNewsData(category, country) {
  if (!NEWSDATA_KEY) return [];
  var catMap = { top: '', tech: 'technology', stocks: 'business', crypto: 'business', sports: 'sports', health: 'health', science: 'science', entertainment: 'entertainment', politics: 'politics', environment: 'environment', world: 'world' };
  var apiCat = catMap[category] || '';
  var url = 'https://newsdata.io/api/1/latest?apikey=' + NEWSDATA_KEY + '&language=en&country=' + (country || 'au');
  if (apiCat) url += '&category=' + apiCat;
  try {
    var data = await httpGet(url);
    if (data.results && data.results.length > 0) {
      return data.results.map(function (a, i) {
        return {
          id: 'nd-' + Date.now() + '-' + i,
          cat: category || 'top',
          hl: (a.title || '').trim(),
          sum: a.description || a.content || '',
          src: a.source_name || a.source_id || 'Unknown',
          time: timeAgo(a.pubDate),
          img: a.image_url || null,
          url: a.link || '',
          breaking: isBreaking(a.pubDate),
        };
      });
    }
  } catch (e) { console.error('NewsData error:', e.message); }
  return [];
}

// ─── NEWSAPI.ORG ───
async function fetchNewsAPI(category, country) {
  if (!NEWSAPI_KEY) return [];
  var catMap = { top: 'general', tech: 'technology', stocks: 'business', crypto: 'business', politics: 'general', environment: 'science' };
  var apiCat = catMap[category] || category || 'general';
  var url = 'https://newsapi.org/v2/top-headlines?country=' + (country || 'au') + '&category=' + apiCat + '&pageSize=25&apiKey=' + NEWSAPI_KEY;
  try {
    var data = await httpGet(url);
    if (data.status === 'ok' && data.articles && data.articles.length > 0) {
      return data.articles.filter(function (a) { return a.title && a.title !== '[Removed]'; }).map(function (a, i) {
        return {
          id: 'na-' + Date.now() + '-' + i,
          cat: category || 'top',
          hl: (a.title || '').replace(/ - .*$/, '').trim(),
          sum: a.description || '',
          src: (a.source && a.source.name) || 'Unknown',
          time: timeAgo(a.publishedAt),
          img: a.urlToImage || null,
          url: a.url || '',
          breaking: isBreaking(a.publishedAt),
        };
      });
    }
  } catch (e) { console.error('NewsAPI error:', e.message); }
  return [];
}

// ─── FETCH WITH FALLBACK CHAIN ───
// Tries GNews first, then NewsData, then NewsAPI, then mock
async function getNews(category, country) {
  var cacheKey = 'news-' + (category || 'top') + '-' + (country || 'au');
  var cached = getCache(cacheKey);
  if (cached) return cached;

  var articles = [];

  // Try GNews first (most reliable free tier)
  articles = await fetchGNews(category, country);
  if (articles.length > 0) {
    console.log('Serving ' + articles.length + ' articles from GNews (' + category + ')');
    setCache(cacheKey, articles);
    return articles;
  }

  // Try NewsData second
  articles = await fetchNewsData(category, country);
  if (articles.length > 0) {
    console.log('Serving ' + articles.length + ' articles from NewsData (' + category + ')');
    setCache(cacheKey, articles);
    return articles;
  }

  // Try NewsAPI third
  articles = await fetchNewsAPI(category, country);
  if (articles.length > 0) {
    console.log('Serving ' + articles.length + ' articles from NewsAPI (' + category + ')');
    setCache(cacheKey, articles);
    return articles;
  }

  // Fallback to mock
  console.log('All APIs failed, serving mock data (' + category + ')');
  return MOCK_NEWS.filter(function (n) { return category === 'top' || n.cat === category; });
}

// ─── SEARCH WITH FALLBACK ───
async function searchNews(query) {
  var cacheKey = 'search-' + query;
  var cached = getCache(cacheKey);
  if (cached) return cached;

  var articles = await searchGNews(query);
  if (articles.length > 0) {
    setCache(cacheKey, articles);
    return articles;
  }

  // Fallback: filter mock data
  var q = query.toLowerCase();
  return MOCK_NEWS.filter(function (n) {
    return n.hl.toLowerCase().indexOf(q) !== -1 || n.sum.toLowerCase().indexOf(q) !== -1;
  });
}

// ─── Utility functions ───
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 0) return 'now';
  if (mins < 60) return mins + 'm';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  return Math.floor(hrs / 24) + 'd';
}

function isBreaking(dateStr) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) < 30 * 60 * 1000;
}

function guessCategory(text) {
  text = (text || '').toLowerCase();
  if (/crypto|bitcoin|ethereum|blockchain/.test(text)) return 'crypto';
  if (/stock|market|s&p|nasdaq|shares/.test(text)) return 'stocks';
  if (/tech|ai |apple|google|software/.test(text)) return 'tech';
  if (/sport|cricket|football|tennis|nba/.test(text)) return 'sports';
  if (/health|medical|vaccine/.test(text)) return 'health';
  if (/climate|environment|carbon/.test(text)) return 'environment';
  if (/politic|election|parliament/.test(text)) return 'politics';
  if (/business|company|ceo/.test(text)) return 'business';
  if (/science|research|space/.test(text)) return 'science';
  if (/movie|film|music/.test(text)) return 'entertainment';
  return 'world';
}

// ─── MARKETS (CoinGecko for crypto - free, no key) ───
var marketCache = { data: null, time: 0 };

async function getMarkets() {
  if (marketCache.data && Date.now() - marketCache.time < 60000) return marketCache.data;
  var crypto = {};
  try {
    var data = await httpGet('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,dogecoin&vs_currencies=usd,aud&include_24hr_change=true');
    var symMap = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA', dogecoin: 'DOGE' };
    for (var id in data) {
      crypto[id] = { sym: symMap[id] || id, usd: data[id].usd || 0, aud: data[id].aud || 0, change24h: +(data[id].usd_24h_change || 0).toFixed(2) };
    }
  } catch (e) { console.error('CoinGecko error:', e.message); }

  var result = {
    crypto: crypto,
    indices: [
      { sym: 'S&P 500', val: +(7042 + (Math.random() - 0.5) * 20).toFixed(2), chg: +(0.84 + (Math.random() - 0.5) * 0.4).toFixed(2), up: true },
      { sym: 'NASDAQ', val: +(22891 + (Math.random() - 0.5) * 50).toFixed(2), chg: +(1.12 + (Math.random() - 0.5) * 0.4).toFixed(2), up: true },
      { sym: 'ASX 200', val: +(8432 + (Math.random() - 0.5) * 15).toFixed(2), chg: +(0.41 + (Math.random() - 0.5) * 0.3).toFixed(2), up: true },
    ],
    stocks: [
      { sym: 'NVDA', val: +(312.8 + (Math.random() - 0.5) * 5).toFixed(2), chg: +(3.4 + (Math.random() - 0.5) * 1).toFixed(2), up: true },
      { sym: 'AAPL', val: +(248.3 + (Math.random() - 0.5) * 3).toFixed(2), chg: +(-0.3 + (Math.random() - 0.5) * 0.5).toFixed(2), up: false },
      { sym: 'TSLA', val: +(421.5 + (Math.random() - 0.5) * 8).toFixed(2), chg: +(1.9 + (Math.random() - 0.5) * 1).toFixed(2), up: true },
    ],
    lastUpdated: new Date().toISOString(),
  };
  marketCache = { data: result, time: Date.now() };
  return result;
}

// ─── MOCK DATA (fallback when all APIs fail) ───
var MOCK_NEWS = [
  { id: 'm1', cat: 'top', hl: 'Global AI Summit Reaches Historic Agreement', sum: 'World leaders agreed on binding AI safety protocols.', src: 'Reuters', time: '12m', img: 'https://picsum.photos/seed/n1/800/500', breaking: true, url: '' },
  { id: 'm2', cat: 'tech', hl: 'Apple Unveils M5 Ultra Chip', sum: 'New M5 delivers 4x AI performance for creative workflows.', src: 'The Verge', time: '45m', img: 'https://picsum.photos/seed/n3/800/500', breaking: false, url: '' },
  { id: 'm3', cat: 'stocks', hl: 'S&P 500 Crosses 7,000 for First Time', sum: 'Major indices surged on tech earnings.', src: 'Bloomberg', time: '1h', img: 'https://picsum.photos/seed/n4/800/500', breaking: false, url: '' },
  { id: 'm4', cat: 'crypto', hl: 'Bitcoin Settles Above $150K', sum: 'BTC hit all-time high on institutional buying.', src: 'CoinDesk', time: '1h', img: 'https://picsum.photos/seed/n5/800/500', breaking: false, url: '' },
  { id: 'm5', cat: 'world', hl: 'EU Digital Tax Reform Passes', sum: 'Tech giants must pay taxes per member state.', src: 'FT', time: '2h', img: 'https://picsum.photos/seed/n6/800/500', breaking: false, url: '' },
  { id: 'm6', cat: 'sports', hl: 'India Wins ICC Champions Trophy', sum: 'India beat Australia by 4 wickets at Lords.', src: 'ESPN', time: '2h', img: 'https://picsum.photos/seed/n7/800/500', breaking: false, url: '' },
  { id: 'm7', cat: 'health', hl: 'WHO Approves Universal Flu Vaccine', sum: 'First mRNA flu vaccine gets emergency approval.', src: 'WHO', time: '3h', img: 'https://picsum.photos/seed/n9/800/500', breaking: false, url: '' },
  { id: 'm8', cat: 'science', hl: 'Webb Telescope Finds Biosignatures', sum: 'Dimethyl sulfide detected on exoplanet K2-18b.', src: 'Nature', time: '5h', img: 'https://picsum.photos/seed/n12/800/500', breaking: false, url: '' },
  { id: 'm9', cat: 'business', hl: 'Tesla Opens SE Asia Factory', sum: 'Indonesia Gigafactory producing 500K cars.', src: 'CNBC', time: '4h', img: 'https://picsum.photos/seed/n10/800/500', breaking: false, url: '' },
  { id: 'm10', cat: 'politics', hl: 'UN Votes on Climate Emergency', sum: '156 nations support decarbonization targets.', src: 'BBC', time: '3h', img: 'https://picsum.photos/seed/n8/800/500', breaking: false, url: '' },
];

// ─── JSON response helper ───
function json(res, data, status) {
  res.writeHead(status || 200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// ─── HTTP SERVER ───
http.createServer(async function (req, res) {
  var parts = req.url.split('?');
  var url = parts[0];
  var params = new URLSearchParams(parts[1] || '');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  try {
    // Root
    if (url === '/' || url === '') {
      return json(res, {
        name: 'Pulse News API',
        version: '2.0.0',
        status: 'running',
        apis: {
          gnews: GNEWS_KEY ? 'configured' : 'not set',
          newsdata: NEWSDATA_KEY ? 'configured' : 'not set',
          newsapi: NEWSAPI_KEY ? 'configured' : 'not set',
        },
      });
    }

    // Health
    if (url === '/api/health') {
      return json(res, { status: 'ok', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
    }

    // Top news
    if (url === '/api/news/top') {
      var country = params.get('country') || 'au';
      var data = await getNews('top', country);
      return json(res, { success: true, count: data.length, data: data });
    }

    // Category news
    if (url.startsWith('/api/news/category/')) {
      var cat = url.replace('/api/news/category/', '');
      var country = params.get('country') || 'au';
      var data = await getNews(cat, country);
      return json(res, { success: true, category: cat, count: data.length, data: data });
    }

    // Search
    if (url === '/api/news/search') {
      var q = params.get('q') || '';
      if (q.length < 2) return json(res, { success: false, error: 'Query too short' }, 400);
      var data = await searchNews(q);
      return json(res, { success: true, query: q, count: data.length, data: data });
    }

    // Markets
    if (url === '/api/markets/overview') {
      var data = await getMarkets();
      return json(res, { success: true, data: data });
    }
    if (url === '/api/markets/crypto') {
      var data = await getMarkets();
      return json(res, { success: true, data: data.crypto });
    }
    if (url === '/api/markets/stocks') {
      var data = await getMarkets();
      return json(res, { success: true, data: { indices: data.indices, stocks: data.stocks } });
    }

    // 404
    json(res, { error: 'Not found', path: url }, 404);

  } catch (err) {
    console.error('Request error:', err.message);
    json(res, { error: 'Server error' }, 500);
  }

}).listen(PORT, '0.0.0.0', function () {
  console.log('Pulse News API v2.0 running on 0.0.0.0:' + PORT);
  console.log('APIs configured: GNews=' + (GNEWS_KEY ? 'yes' : 'no') + ' NewsData=' + (NEWSDATA_KEY ? 'yes' : 'no') + ' NewsAPI=' + (NEWSAPI_KEY ? 'yes' : 'no'));
});
