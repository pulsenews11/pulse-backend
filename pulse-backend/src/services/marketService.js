// src/services/marketService.js
const fetch = require('node-fetch');

const COINGECKO_BASE = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const CACHE_TTL = parseInt(process.env.MARKET_CACHE_TTL) || 60; // 1 min

// ─── In-memory cache ───
const cache = {
  crypto: { data: null, timestamp: 0 },
  indices: { data: null, timestamp: 0 },
};

// ─── Crypto data from CoinGecko (free, no key needed) ───
async function getCryptoData() {
  if (cache.crypto.data && Date.now() - cache.crypto.timestamp < CACHE_TTL * 1000) {
    return cache.crypto.data;
  }

  try {
    const res = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=bitcoin,ethereum,solana,cardano,dogecoin,ripple&vs_currencies=usd,aud&include_24hr_change=true&include_market_cap=true`,
      { timeout: 8000 }
    );
    const data = await res.json();

    const formatted = {
      bitcoin: {
        sym: 'BTC',
        usd: data.bitcoin?.usd || 0,
        aud: data.bitcoin?.aud || 0,
        change24h: data.bitcoin?.usd_24h_change || 0,
        marketCap: data.bitcoin?.usd_market_cap || 0,
      },
      ethereum: {
        sym: 'ETH',
        usd: data.ethereum?.usd || 0,
        aud: data.ethereum?.aud || 0,
        change24h: data.ethereum?.usd_24h_change || 0,
        marketCap: data.ethereum?.usd_market_cap || 0,
      },
      solana: {
        sym: 'SOL',
        usd: data.solana?.usd || 0,
        aud: data.solana?.aud || 0,
        change24h: data.solana?.usd_24h_change || 0,
      },
      cardano: {
        sym: 'ADA',
        usd: data.cardano?.usd || 0,
        aud: data.cardano?.aud || 0,
        change24h: data.cardano?.usd_24h_change || 0,
      },
      dogecoin: {
        sym: 'DOGE',
        usd: data.dogecoin?.usd || 0,
        aud: data.dogecoin?.aud || 0,
        change24h: data.dogecoin?.usd_24h_change || 0,
      },
      ripple: {
        sym: 'XRP',
        usd: data.ripple?.usd || 0,
        aud: data.ripple?.aud || 0,
        change24h: data.ripple?.usd_24h_change || 0,
      },
    };

    cache.crypto = { data: formatted, timestamp: Date.now() };
    return formatted;
  } catch (err) {
    console.error('CoinGecko fetch error:', err.message);
    return cache.crypto.data || {};
  }
}

// ─── Stock indices (mock with realistic data — replace with real API in production) ───
// In production, use: Alpha Vantage, Finnhub, or Yahoo Finance API
async function getStockIndices() {
  if (cache.indices.data && Date.now() - cache.indices.timestamp < CACHE_TTL * 1000) {
    return cache.indices.data;
  }

  // For MVP, return mock-realistic data
  // Replace with real API call in production:
  // - Alpha Vantage: https://www.alphavantage.co (free tier: 25 req/day)
  // - Finnhub: https://finnhub.io (free tier: 60 req/min)
  // - Twelve Data: https://twelvedata.com
  const indices = [
    { sym: 'S&P 500', val: 7042.18 + (Math.random() - 0.5) * 20, chg: +(0.84 + (Math.random() - 0.5) * 0.3).toFixed(2), currency: 'USD' },
    { sym: 'NASDAQ', val: 22891.44 + (Math.random() - 0.5) * 50, chg: +(1.12 + (Math.random() - 0.5) * 0.4).toFixed(2), currency: 'USD' },
    { sym: 'DOW', val: 46215.33 + (Math.random() - 0.5) * 40, chg: +(0.38 + (Math.random() - 0.5) * 0.3).toFixed(2), currency: 'USD' },
    { sym: 'ASX 200', val: 8432.50 + (Math.random() - 0.5) * 15, chg: +(0.41 + (Math.random() - 0.5) * 0.3).toFixed(2), currency: 'AUD' },
    { sym: 'FTSE 100', val: 8812.30 + (Math.random() - 0.5) * 20, chg: +(0.22 + (Math.random() - 0.5) * 0.3).toFixed(2), currency: 'GBP' },
    { sym: 'NIKKEI', val: 42150.00 + (Math.random() - 0.5) * 100, chg: +(0.65 + (Math.random() - 0.5) * 0.4).toFixed(2), currency: 'JPY' },
  ];

  const stocks = [
    { sym: 'AAPL', val: 248.30 + (Math.random() - 0.5) * 3, chg: +(-0.3 + (Math.random() - 0.5) * 1).toFixed(2), currency: 'USD' },
    { sym: 'NVDA', val: 312.80 + (Math.random() - 0.5) * 5, chg: +(3.4 + (Math.random() - 0.5) * 1).toFixed(2), currency: 'USD' },
    { sym: 'TSLA', val: 421.50 + (Math.random() - 0.5) * 8, chg: +(1.9 + (Math.random() - 0.5) * 1.5).toFixed(2), currency: 'USD' },
    { sym: 'GOOGL', val: 198.40 + (Math.random() - 0.5) * 3, chg: +(0.8 + (Math.random() - 0.5) * 0.5).toFixed(2), currency: 'USD' },
    { sym: 'MSFT', val: 485.20 + (Math.random() - 0.5) * 5, chg: +(1.2 + (Math.random() - 0.5) * 0.8).toFixed(2), currency: 'USD' },
    { sym: 'AMZN', val: 224.80 + (Math.random() - 0.5) * 4, chg: +(0.6 + (Math.random() - 0.5) * 0.5).toFixed(2), currency: 'USD' },
  ];

  const forex = [
    { sym: 'AUD/USD', val: +(0.6842 + (Math.random() - 0.5) * 0.003).toFixed(4), chg: +(0.12 + (Math.random() - 0.5) * 0.1).toFixed(2) },
    { sym: 'EUR/USD', val: +(1.0892 + (Math.random() - 0.5) * 0.003).toFixed(4), chg: +(-0.05 + (Math.random() - 0.5) * 0.1).toFixed(2) },
    { sym: 'GBP/USD', val: +(1.2718 + (Math.random() - 0.5) * 0.003).toFixed(4), chg: +(0.08 + (Math.random() - 0.5) * 0.1).toFixed(2) },
  ];

  const result = {
    indices: indices.map(i => ({ ...i, val: +i.val.toFixed(2), up: i.chg > 0 })),
    stocks: stocks.map(s => ({ ...s, val: +s.val.toFixed(2), up: s.chg > 0 })),
    forex: forex.map(f => ({ ...f, up: f.chg > 0 })),
    lastUpdated: new Date().toISOString(),
  };

  cache.indices = { data: result, timestamp: Date.now() };
  return result;
}

// ─── Combined market overview ───
async function getMarketOverview() {
  const [crypto, stocks] = await Promise.all([
    getCryptoData(),
    getStockIndices(),
  ]);

  return {
    crypto,
    ...stocks,
  };
}

async function refreshMarketCache() {
  await getCryptoData();
  await getStockIndices();
}

module.exports = {
  getCryptoData,
  getStockIndices,
  getMarketOverview,
  refreshMarketCache,
};
