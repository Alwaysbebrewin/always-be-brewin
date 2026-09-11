exports.handler = async (event) => {
  const { q } = event.queryStringParameters;
  const res = await fetch(
    `https://backend.commanderspellbook.com/api/variants/?q=${encodeURIComponent(q)}&format=edh&limit=30`
  );
  const data = await res.json();
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
