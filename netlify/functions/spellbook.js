const CANDIDATE_BASE_URLS = [
  'https://backend.commanderspellbook.com/api/variants/',
  'https://commanderspellbook.com/api/variants/'
];

exports.handler = async (event) => {
  const { q } = event.queryStringParameters || {};
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  let lastError = null;

  for (const baseUrl of CANDIDATE_BASE_URLS) {
    const url = `${baseUrl}?q=${encodeURIComponent(q)}&format=edh&limit=30`;

    try {
      const res = await fetch(url);
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
      details: lastError
    })
  };
};
