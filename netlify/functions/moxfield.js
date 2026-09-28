// Proxies Moxfield's unofficial deck API — it doesn't send CORS headers for
// browser requests from other origins, so this call has to go through a
// server-side function the same way netlify/functions/spellbook.js proxies
// Commander Spellbook.
exports.handler = async (event) => {
  const { deckId } = event.queryStringParameters || {};
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (!deckId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing deckId parameter' }) };
  }

  const url = `https://api.moxfield.com/v2/decks/all/${encodeURIComponent(deckId)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AlwaysBeBrewin/1.0', 'Accept': 'application/json' }
    });
    console.log(`[moxfield] GET ${url} -> ${res.status}`);

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: `Moxfield API returned ${res.status}` }) };
    }

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    console.error(`[moxfield] Error fetching ${url}:`, err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
