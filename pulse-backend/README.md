# ⚡ Pulse News — Backend API

Node.js/Express backend powering the Pulse News app.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/news/top?country=au&limit=25` | Top headlines |
| GET | `/api/news/category/:cat?country=au` | News by category |
| GET | `/api/news/search?q=query` | Search articles |
| POST | `/api/news/summarize` | Generate AI summary |
| GET | `/api/markets/overview` | All market data |
| GET | `/api/markets/crypto` | Crypto prices |
| GET | `/api/markets/stocks` | Stock indices |
| POST | `/api/notifications/subscribe` | Subscribe to topic |
| POST | `/api/notifications/unsubscribe` | Unsubscribe |
| POST | `/api/notifications/test` | Test notification |

## Quick Start (Local)

```bash
cp .env.example .env         # Fill in your API keys
npm install
npm run dev                  # Starts on http://localhost:3000
```

## Deploy to Railway (Recommended — Easiest)

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repo
4. Add environment variables from `.env.example`
5. Railway auto-deploys. Done.

Your API will be at: `https://your-app.up.railway.app`

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add env vars in Vercel dashboard.

## Deploy with Docker

```bash
docker build -t pulse-api .
docker run -p 3000:3000 --env-file .env pulse-api
```

## Deploy to DigitalOcean / AWS / Any VPS

```bash
# On server:
git clone your-repo
cd pulse-backend
cp .env.example .env    # Fill in keys
npm install --production
pm2 start src/server.js --name pulse-api
```

## Cron Jobs (Built-in)

- News cache refreshes every **15 minutes**
- Market data refreshes every **1 minute**
- Summary cache lasts **1 hour**

## Cost

- Railway: Free tier (500 hours/month) → $5/month hobby plan
- NewsAPI: Free (dev) / $449/mo (production, 250K requests)  
- OpenAI: ~$10-50/month (gpt-4o-mini is cheap)
- CoinGecko: Free (30 calls/min)
- Firebase: Free tier (notifications)
