const CANDIDATE_BASE_URLS = [
  'https://backend.commanderspellbook.com/variants/'
];

// Builds an ordered list of query strings to try against the Commander
// Spellbook API. Callers already using Scryfall-style `card:` syntax are
// passed through untouched; plain text gets tried as a single card name
// first, then (when it looks like multiple card names typed together)
// re-tried as separate `card:"..."` clauses.
function buildQueryVariants(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [''];

  if (/card:/i.test(trimmed)) return [trimmed];

  const variants = [`card:"${trimmed}"`];
  const words = trimmed.split(/\s+/).filter(Boolean);

  const separatorParts = trimmed
    .split(/\s*(?:,|;|\/|&|\+|\band\b)\s*/i)
    .map(p => p.trim())
    .filter(Boolean);

  if (separatorParts.length > 1) {
    variants.push(separatorParts.map(p => `card:"${p}"`).join(' '));
  } else if (words.length > 3) {
    // No explicit separator but a long query — assume it's multiple card
    // names typed back-to-back and chunk it two words at a time.
    const chunks = [];
    for (let i = 0; i < words.length; i += 2) {
      chunks.push(words.slice(i, i + 2).join(' '));
    }
    variants.push(chunks.map(c => `card:"${c}"`).join(' '));
  }

  return [...new Set(variants)];
}

exports.handler = async (event) => {
  const { q } = event.queryStringParameters || {};
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const queryVariants = buildQueryVariants(q);

  let lastError = null;
  let lastEmptyData = null;

  for (const queryStr of queryVariants) {
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
        const results = data.results || data.variants || [];

        if (results.length > 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
          };
        }

        // Successful but empty — keep it in case no variant finds anything.
        lastEmptyData = data;
      } catch (err) {
        console.error(`[spellbook] Error fetching ${url}:`, err);
        lastError = err.message || String(err);
      }
    }
  }

  if (lastEmptyData) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(lastEmptyData)
    };
  }

  console.error(`[spellbook] All API endpoints/queries failed. Last error: ${lastError}`);
  return {
    statusCode: 502,
    headers,
    body: JSON.stringify({
      error: 'Failed to fetch data from Commander Spellbook API',
      details: lastError
    })
  };
};
