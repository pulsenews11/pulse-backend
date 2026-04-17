// src/services/newsService.js
const fetch = require('node-fetch');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const NEWS_API_BASE = 'https://newsapi.org/v2';
const CACHE_TTL = parseInt(process.env.NEWS_CACHE_TTL) || 900; // 15 min

// ─── In-memory cache ───
const cache = {
  topNews: { data: null, timestamp: 0 },
  categories: {},
  summaries: {},
};

// ─── Category mapping ───
const CATEGORY_MAP = {
  tech: 'technology',
  sports: 'sports',
  business: 'business',
  entertainment: 'entertainment',
  science: 'science',
  health: 'health',
  politics: 'general',
  environment: 'science', // closest match
  stocks: 'business',
  crypto: 'business',
};

// Country code mapping
const COUNTRY_CODES = {
  australia: 'au', usa: 'us', india: 'in', uk: 'gb',
  canada: 'ca', germany: 'de', japan: 'jp', brazil: 'br',
  france: 'fr', singapore: 'sg',
};

// ─── Fetch from NewsAPI ───
async function fetchFromNewsAPI(endpoint, params = {}) {
  const query = new URLSearchParams({ ...params, apiKey: NEWS_API_KEY });
  const url = `${NEWS_API_BASE}/${endpoint}?${query}`;

  try {
    const res = await fetch(url, { timeout: 10000 });
    const data = await res.json();

    if (data.status === 'ok' && data.articles) {
      return data.articles;
    }
    console.warn(`NewsAPI returned status: ${data.status}`, data.message);
    return [];
  } catch (err) {
    console.error(`NewsAPI fetch error: ${err.message}`);
    return [];
  }
}

// ─── Normalize article format ───
function normalizeArticle(article, index) {
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const now = new Date();
  const diffMs = now - publishedAt;
  const diffMin = Math.floor(diffMs / 60000);

  let timeAgo;
  if (diffMin < 60) timeAgo = `${diffMin}m`;
  else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)}h`;
  else timeAgo = `${Math.floor(diffMin / 1440)}d`;

  return {
    id: `news-${Date.now()}-${index}`,
    cat: guessCategory(article),
    hl: (article.title || '').replace(/ - .*$/, '').trim(), // Remove source suffix
    sum: article.description || '',
    fullContent: article.content || '',
    src: article.source?.name || 'Unknown',
    time: timeAgo,
    img: article.urlToImage || null,
    url: article.url || '',
    publishedAt: article.publishedAt,
    breaking: diffMin < 30, // Breaking if < 30 min old
  };
}

// ─── Guess category from content ───
function guessCategory(article) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  if (/crypto|bitcoin|ethereum|blockchain|defi|nft/i.test(text)) return 'crypto';
  if (/stock|market|s&p|nasdaq|shares|trading|dow|index|earnings/i.test(text)) return 'stocks';
  if (/tech|ai |artificial|apple|google|microsoft|software|chip|quantum/i.test(text)) return 'tech';
  if (/sport|cricket|football|tennis|nba|fifa|olympic|match|goal/i.test(text)) return 'sports';
  if (/health|medical|vaccine|disease|hospital|who |fda|drug/i.test(text)) return 'health';
  if (/climate|environment|carbon|rainforest|emission|renewable|solar/i.test(text)) return 'environment';
  if (/politic|election|parliament|minister|government|senate|congress|vote/i.test(text)) return 'politics';
  if (/business|company|ceo|revenue|startup|merger|acquisition/i.test(text)) return 'business';
  if (/science|research|study|discovery|space|nasa|physics/i.test(text)) return 'science';
  if (/movie|film|music|celebrity|entertainment|oscar|grammy|actor/i.test(text)) return 'entertainment';
  return 'world';
}

// ─── Deduplicate articles (by similar headlines) ───
function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter(article => {
    // Create a simplified key from headline (first 50 chars, lowercase, stripped)
    const key = (article.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 50);

    if (key.length < 10) return false; // Skip empty/short headlines
    if (seen.has(key)) return false;

    // Also check for similar keys (80% match)
    for (const existing of seen) {
      if (similarity(key, existing) > 0.8) return false;
    }

    seen.add(key);
    return true;
  });
}

function similarity(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  const editDist = editDistance(longer, shorter);
  return (longerLength - editDist) / longerLength;
}

function editDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ─── Generate AI Summary ───
async function generateSummary(title, content) {
  // Check summary cache
  const cacheKey = title.substring(0, 100);
  if (cache.summaries[cacheKey] && Date.now() - cache.summaries[cacheKey].timestamp < 3600000) {
    return cache.summaries[cacheKey].data;
  }

  if (!OPENAI_API_KEY) return content.substring(0, 200);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a news summarizer for Pulse News app. Create a concise 2-3 sentence summary. Be factual, clear, use simple language. Include key numbers/facts. No editorializing.',
          },
          {
            role: 'user',
            content: `Summarize this news:\n\nTitle: ${title}\n\nContent: ${content}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.2,
      }),
      timeout: 8000,
    });

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content || content.substring(0, 200);

    // Cache the summary
    cache.summaries[cacheKey] = { data: summary, timestamp: Date.now() };

    return summary;
  } catch (err) {
    console.error('AI summary error:', err.message);
    return content.substring(0, 200);
  }
}

// ─── Public API ───

async function getTopNews(country = 'au', limit = 25) {
  // Check cache
  const cacheKey = `top-${country}`;
  if (cache.topNews.data && Date.now() - cache.topNews.timestamp < CACHE_TTL * 1000) {
    return cache.topNews.data.slice(0, limit);
  }

  const articles = await fetchFromNewsAPI('top-headlines', {
    country,
    pageSize: 50, // Fetch more for dedup
  });

  const deduped = deduplicateArticles(articles);
  const normalized = deduped.map((a, i) => normalizeArticle(a, i));

  // Cache
  cache.topNews = { data: normalized, timestamp: Date.now() };

  return normalized.slice(0, limit);
}

async function getNewsByCategory(category, country = 'au', limit = 25) {
  const cacheKey = `cat-${category}-${country}`;
  if (cache.categories[cacheKey] && Date.now() - cache.categories[cacheKey].timestamp < CACHE_TTL * 1000) {
    return cache.categories[cacheKey].data.slice(0, limit);
  }

  const apiCategory = CATEGORY_MAP[category] || 'general';
  const articles = await fetchFromNewsAPI('top-headlines', {
    country,
    category: apiCategory,
    pageSize: 40,
  });

  const deduped = deduplicateArticles(articles);
  const normalized = deduped.map((a, i) => normalizeArticle(a, i));

  cache.categories[cacheKey] = { data: normalized, timestamp: Date.now() };

  return normalized.slice(0, limit);
}

async function searchArticles(query, limit = 20) {
  const articles = await fetchFromNewsAPI('everything', {
    q: query,
    sortBy: 'relevancy',
    pageSize: limit,
    language: 'en',
  });

  const deduped = deduplicateArticles(articles);
  return deduped.map((a, i) => normalizeArticle(a, i));
}

async function refreshNewsCache() {
  console.log('[Cache] Refreshing top news...');
  await getTopNews('au', 25);

  // Pre-warm popular categories
  const popularCats = ['tech', 'business', 'sports', 'health', 'science'];
  for (const cat of popularCats) {
    await getNewsByCategory(cat, 'au', 25);
    await new Promise(r => setTimeout(r, 200)); // Rate limit courtesy
  }
}

module.exports = {
  getTopNews,
  getNewsByCategory,
  searchArticles,
  generateSummary,
  refreshNewsCache,
};
