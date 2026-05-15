const { HEADERS, runStatusCheck } = require("../lib/checkSites");

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = await runStatusCheck();
    for (const [key, value] of Object.entries(HEADERS)) {
      res.setHeader(key, value);
    }
    return res.status(200).json(payload);
  } catch (err) {
    for (const [key, value] of Object.entries(HEADERS)) {
      res.setHeader(key, value);
    }
    return res.status(500).json({
      error: "Failed to check sites",
      message: err.message,
    });
  }
};
