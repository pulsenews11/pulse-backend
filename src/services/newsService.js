const https = require('https');

const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const CACHE_TTL = 900000;

let cache = { top: null, topTime: 0, cats: {} };

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        clearTimeout(timeout);
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Bad JSON')); }
      });
    }).on('error', e => { clearTimeout(timeout); reject(e); });
  });
}

function normalize(article, i) {
  const pub = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const diffMin = Math.floor((Date.now() - pub.getTime()) / 60000);
  let time;
  if (diffMin < 60) time = diffMin + 'm';
  else if (diffMin < 1440) time = Math.floor(diffMin / 60) + 'h';
  else time = Math.floor(diffMin / 1440) + 'd';

  const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
  let cat = 'world';
  if (/crypto|bitcoin|ethereum|blockchain/.test(text)) cat = 'crypto';
  else if (/stock|market|s&p|nasdaq|shares/.test(text)) cat = 'stocks';
  else if (/tech|ai |apple|google|software|chip/.test(text)) cat = 'tech';
  else if (/sport|cricket|football|tennis|nba/.test(text)) cat = 'sports';
  else if (/health|medical|vaccine|disease/.test(text)) cat = 'health';
  else if (/climate|environment|carbon/.test(text)) cat = 'environment';
  else if (/politic|election|parliament|minister/.test(text)) cat = 'politics';
  else if (/business|company|ceo|startup/.test(text)) cat = 'business';
  else if (/science|research|discovery|space/.test(text)) cat = 'science';
  else if (/movie|film|music|celebrity/.test(text)) cat = 'entertainment';

  return {
    id: 'n-' + Date.now() + '-' + i,
    cat: cat,
    hl: (article.title || '').replace(/ - .*$/, '').trim(),
    sum: article.description || '',
    src: (article.source && article.source.name) ? article.source.name : 'Unknown',
    time: time,
    img: article.urlToImage || null,
    url: article.url || '',
    breaking: diffMin < 30,
  };
}

function dedup(articles) {
  const seen = new Set();
  return articles.filter(function(a) {
    const key = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (key.length < 8 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchNewsAPI(endpoint, params) {
  if (!NEWS_API_KEY) return [];
  const qs = new URLSearchParams(Object.assign({}, params, { apiKey: NEWS_API_KEY })).toString();
  var url = 'https://newsapi.org/v2/' + endpoint + '?' + qs;
  try {
    var data = await httpGet(url);
    if (data.status === 'ok' && Array.isArray(data.articles)) {
      return data.articles;
    }
    return [];
  } catch (e) {
    console.error('NewsAPI error:', e.message);
    return [];
  }
}

async function getTopNews(country, limit) {
  if (cache.top && Date.now() - cache.topTime < CACHE_TTL) {
    return cache.top.slice(0, limit);
  }
  var raw = await fetchNewsAPI('top-headlines', { country: country, pageSize: 50 });
  if (raw.length > 0) {
    var result = dedup(raw).map(function(a, i) { return normalize(a, i); });
    cache.top = result;
    cache.topTime = Date.now();
    return result.slice(0, limit);
  }
  return getMockNews().slice(0, limit);
}

async function getByCategory(cat, country, limit) {
  var key = cat + '-' + country;
  if (cache.cats[key] && Date.now() - cache.cats[key].time < CACHE_TTL) {
    return cache.cats[key].data.slice(0, limit);
  }
  var catMap = { tech: 'technology', sports: 'sports', business: 'business', entertainment: 'entertainment', science: 'science', health: 'health' };
  var apiCat = catMap[cat] || 'general';
  var raw = await fetchNewsAPI('top-headlines', { country: country, category: apiCat, pageSize: 40 });
  if (raw.length > 0) {
    var result = dedup(raw).map(function(a, i) { return normalize(a, i); });
    cache.cats[key] = { data: result, time: Date.now() };
    return result.slice(0, limit);
  }
  return getMockNews().filter(function(n) { return n.cat === cat; }).slice(0, limit);
}

async function searchNews(query) {
  var raw = await fetchNewsAPI('everything', { q: query, sortBy: 'relevancy', pageSize: 20, language: 'en' });
  if (raw.length > 0) {
    return dedup(raw).map(function(a, i) { return normalize(a, i); });
  }
  var q = query.toLowerCase();
  return getMockNews().filter(function(n) {
    return n.hl.toLowerCase().indexOf(q) !== -1 || n.sum.toLowerCase().indexOf(q) !== -1;
  });
}

function getMockNews() {
  return [
    { id: 'm1', cat: 'top', hl: 'Global AI Summit Reaches Historic Agreement on Safety Standards', sum: 'World leaders at the Geneva AI Summit agreed on binding safety protocols for frontier AI systems, marking the first enforceable international AI treaty.', src: 'Reuters', time: '12m', img: 'https://picsum.photos/seed/n1/800/500', breaking: true, url: '' },
    { id: 'm2', cat: 'top', hl: 'SpaceX Starship Completes First Crewed Mars Orbit', sum: 'Four astronauts successfully orbited Mars aboard Starship, completing humanity\'s farthest crewed spaceflight.', src: 'NASA', time: '28m', img: 'https://picsum.photos/seed/n2/800/500', breaking: true, url: '' },
    { id: 'm3', cat: 'tech', hl: 'Apple Unveils M5 Ultra With 120-Core Neural Engine', sum: 'The new M5 Ultra delivers 4x AI performance, targeting professional creative workflows and on-device LLM inference.', src: 'The Verge', time: '45m', img: 'https://picsum.photos/seed/n3/800/500', breaking: false, url: '' },
    { id: 'm4', cat: 'stocks', hl: 'S&P 500 Crosses 7,000 for First Time', sum: 'Major indices surged as mega-cap tech earnings exceeded expectations. AI infrastructure stocks led gains.', src: 'Bloomberg', time: '1h', img: 'https://picsum.photos/seed/n4/800/500', breaking: false, url: '' },
    { id: 'm5', cat: 'crypto', hl: 'Bitcoin Settles Above $150K After Institutional Wave', sum: 'Bitcoin hit all-time high as sovereign wealth funds increased digital asset allocations following regulatory clarity.', src: 'CoinDesk', time: '1h', img: 'https://picsum.photos/seed/n5/800/500', breaking: false, url: '' },
    { id: 'm6', cat: 'world', hl: 'EU Passes Landmark Digital Services Tax Reform', sum: 'European Parliament voted to overhaul digital taxation, requiring tech giants to pay taxes per member state.', src: 'Financial Times', time: '2h', img: 'https://picsum.photos/seed/n6/800/500', breaking: false, url: '' },
    { id: 'm7', cat: 'sports', hl: 'India Clinches ICC Champions Trophy in Dramatic Final', sum: 'India defeated Australia by 4 wickets in a rain-interrupted final at Lord\'s.', src: 'ESPN Cricinfo', time: '2h', img: 'https://picsum.photos/seed/n7/800/500', breaking: false, url: '' },
    { id: 'm8', cat: 'politics', hl: 'UN Votes on Climate Emergency Declaration', sum: 'Resolution passed with 156 nations supporting accelerated decarbonization targets by 2030.', src: 'BBC News', time: '3h', img: 'https://picsum.photos/seed/n8/800/500', breaking: false, url: '' },
    { id: 'm9', cat: 'health', hl: 'WHO Approves Universal mRNA Flu Vaccine', sum: 'First mRNA-based universal influenza vaccine received emergency authorization.', src: 'WHO', time: '3h', img: 'https://picsum.photos/seed/n9/800/500', breaking: false, url: '' },
    { id: 'm10', cat: 'business', hl: 'Tesla Opens First Gigafactory in Southeast Asia', sum: 'Tesla\'s Indonesia Gigafactory will produce 500,000 vehicles annually.', src: 'CNBC', time: '4h', img: 'https://picsum.photos/seed/n10/800/500', breaking: false, url: '' },
    { id: 'm11', cat: 'entertainment', hl: 'Nolan Announces Oppenheimer Sequel for 2027', sum: 'Universal confirmed Nolan\'s next film explores the hydrogen bomb race and Cold War espionage.', src: 'Variety', time: '4h', img: 'https://picsum.photos/seed/n11/800/500', breaking: false, url: '' },
    { id: 'm12', cat: 'science', hl: 'Webb Telescope Detects Possible Biosignatures on K2-18b', sum: 'Spectroscopic analysis revealed dimethyl sulfide in K2-18b\'s atmosphere.', src: 'Nature', time: '5h', img: 'https://picsum.photos/seed/n12/800/500', breaking: false, url: '' },
    { id: 'm13', cat: 'environment', hl: 'Amazon Reaches Net-Zero Deforestation Milestone', sum: 'Brazil announced zero net deforestation in the Amazon for the first time.', src: 'The Guardian', time: '5h', img: 'https://picsum.photos/seed/n13/800/500', breaking: false, url: '' },
    { id: 'm14', cat: 'country', hl: 'Australia Announces $30B Renewable Energy Plan', sum: 'Federal government unveiled the largest clean energy investment in Australian history.', src: 'ABC News', time: '6h', img: 'https://picsum.photos/seed/n15/800/500', breaking: false, url: '' },
    { id: 'm15', cat: 'regional', hl: 'Sydney Metro West Opens Ahead of Schedule', sum: 'New metro connecting Sydney CBD to Parramatta cuts commute times by 40 minutes.', src: 'SMH', time: '7h', img: 'https://picsum.photos/seed/n16/800/500', breaking: false, url: '' },
  ];
}

module.exports = { getTopNews: getTopNews, getByCategory: getByCategory, searchNews: searchNews, getMockNews: getMockNews };
