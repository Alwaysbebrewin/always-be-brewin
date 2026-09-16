const CANDIDATE_BASE_URLS = [
  'https://backend.commanderspellbook.com/variants/'
];

// The frontend sends a pipe-separated `cards` param — one card name per
// filled search box — which we turn into a separate card:"..." clause
// each, so multi-card searches actually AND across all named cards
// instead of concatenating into one malformed query string. Plain `q`
// text (any other caller) still gets wrapped as a single card-name search.
function buildQuery(cardsParam, q) {
  if (cardsParam) {
    const names = cardsParam.split('|').map(c => c.trim()).filter(Boolean);
    if (names.length > 0) {
      return names.map(c => `card:"${c}"`).join(' ');
    }
  }
  const trimmed = (q || '').trim();
  if (!trimmed) return '';
  return /card:/i.test(trimmed) ? trimmed : `card:"${trimmed}"`;
}

exports.handler = async (event) => {
  const { cards, q } = event.queryStringParameters || {};
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const queryStr = buildQuery(cards, q);

  let lastError = null;

  for (const baseUrl of CANDIDATE_BASE_URLS) {
    const url = `${baseUrl}?q=${encodeURIComponent(queryStr)}&limit=30`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AlwaysBeBrewin/1.0' }
      });
      console.log(`[spellbook] GET ${url} -> ${res.status}`);

      if (!res.ok) {
        lastError = `${url} responded with status ${res.status}`;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        lastError = `${url} responded with non-JSON content-type "${contentType}"`;
        continue;
      }

      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data)
      };
    } catch (err) {
      console.error(`[spellbook] Error fetching ${url}:`, err);
      lastError = err.message || String(err);
    }
  }

  console.error(`[spellbook] All API endpoints failed. Last error: ${lastError}`);
  return {
    statusCode: 502,
    headers,
    body: JSON.stringify({
      error: 'Failed to fetch data from Commander Spellbook API',
      details: lastError,
      results: [],
      variants: []
    })
  };
};
