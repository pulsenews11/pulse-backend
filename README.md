# Pulse News API

Backend for Pulse News app.

## Endpoints

- `GET /` — API info
- `GET /api/health` — Health check
- `GET /api/news/top?country=au&limit=25` — Top headlines
- `GET /api/news/category/:cat?country=au` — By category
- `GET /api/news/search?q=query` — Search
- `GET /api/markets/overview` — All market data
- `GET /api/markets/crypto` — Crypto prices
- `GET /api/markets/stocks` — Stock indices

## Local

```
npm install
npm start
```

## Deploy

Push to GitHub → Railway auto-deploys via Dockerfile.

Add `NODE_ENV=production` in Railway Variables tab.
Add `NEWS_API_KEY` for real news (optional — mock data works without it).
