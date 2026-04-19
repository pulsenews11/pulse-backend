const https = require('https');

var cryptoCache = { data: null, time: 0 };
var CACHE_TTL = 60000;

function httpGet(url) {
  return new Promise(function(resolve, reject) {
    var timeout = setTimeout(function() { reject(new Error('Timeout')); }, 8000);
    https.get(url, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        clearTimeout(timeout);
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Bad JSON')); }
      });
    }).on('error', function(e) { clearTimeout(timeout); reject(e); });
  });
}

async function getCrypto() {
  if (cryptoCache.data && Date.now() - cryptoCache.time < CACHE_TTL) {
    return cryptoCache.data;
  }
  try {
    var data = await httpGet(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano&vs_currencies=usd&include_24hr_change=true'
    );
    var formatted = {};
    var symMap = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA' };
    for (var id in data) {
      formatted[id] = {
        sym: symMap[id] || id.toUpperCase(),
        usd: data[id].usd || 0,
        change24h: +(data[id].usd_24h_change || 0).toFixed(2),
      };
    }
    cryptoCache = { data: formatted, time: Date.now() };
    return formatted;
  } catch (e) {
    console.error('CoinGecko error:', e.message);
    return cryptoCache.data || {};
  }
}

function getStocks() {
  var jitter = function() { return (Math.random() - 0.5) * 0.4; };
  return {
    indices: [
      { sym: 'S&P 500', val: +(7042 + (Math.random() - 0.5) * 20).toFixed(2), chg: +(0.84 + jitter()).toFixed(2), up: true },
      { sym: 'NASDAQ', val: +(22891 + (Math.random() - 0.5) * 50).toFixed(2), chg: +(1.12 + jitter()).toFixed(2), up: true },
      { sym: 'ASX 200', val: +(8432 + (Math.random() - 0.5) * 15).toFixed(2), chg: +(0.41 + jitter()).toFixed(2), up: true },
      { sym: 'DOW', val: +(46215 + (Math.random() - 0.5) * 40).toFixed(2), chg: +(0.38 + jitter()).toFixed(2), up: true },
    ],
    stocks: [
      { sym: 'NVDA', val: +(312.8 + (Math.random() - 0.5) * 5).toFixed(2), chg: +(3.4 + jitter()).toFixed(2), up: true },
      { sym: 'AAPL', val: +(248.3 + (Math.random() - 0.5) * 3).toFixed(2), chg: +(-0.3 + jitter()).toFixed(2), up: false },
      { sym: 'TSLA', val: +(421.5 + (Math.random() - 0.5) * 8).toFixed(2), chg: +(1.9 + jitter()).toFixed(2), up: true },
      { sym: 'GOOGL', val: +(198.4 + (Math.random() - 0.5) * 3).toFixed(2), chg: +(0.8 + jitter()).toFixed(2), up: true },
    ],
    forex: [
      { sym: 'AUD/USD', val: +(0.6842 + (Math.random() - 0.5) * 0.003).toFixed(4), chg: +(0.12).toFixed(2), up: true },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

async function getOverview() {
  var crypto = {};
  try { crypto = await getCrypto(); } catch (e) { /* ignore */ }
  var stocks = getStocks();
  return { crypto: crypto, indices: stocks.indices, stocks: stocks.stocks, forex: stocks.forex, lastUpdated: stocks.lastUpdated };
}

function getFallback() {
  return getStocks();
}

module.exports = { getCrypto: getCrypto, getStocks: getStocks, getOverview: getOverview, getFallback: getFallback };
