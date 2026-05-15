const { HEADERS, runStatusCheck } = require("../../lib/checkSites");

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== "GET") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const payload = await runStatusCheck();
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify(payload),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        error: "Failed to check sites",
        message: err.message,
      }),
    };
  }
};
