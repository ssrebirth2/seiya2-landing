const fs = require("fs");
const path = require("path");
const { classifyNetlifySite } = require("./lib/detectPaused");

const SITES_PATH = path.join(__dirname, "../../config/sites.json");
const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 12 * 1024;

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

function loadSites() {
  const raw = fs.readFileSync(SITES_PATH, "utf8");
  return JSON.parse(raw);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "NetlifySiteMonitor/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const reader = res.body?.getReader?.();
    let bodyText = "";

    if (reader) {
      const chunks = [];
      let total = 0;
      while (total < MAX_BODY_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.length;
        if (total >= MAX_BODY_BYTES) break;
      }
      const buf = Buffer.concat(chunks);
      bodyText = buf.slice(0, MAX_BODY_BYTES).toString("utf8");
    } else {
      const buf = Buffer.from(await res.arrayBuffer());
      bodyText = buf.slice(0, MAX_BODY_BYTES).toString("utf8");
    }

    return {
      statusCode: res.status,
      bodyText,
      latencyMs: Date.now() - start,
      fetchError: null,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    if (err.name === "AbortError") {
      return { statusCode: null, bodyText: "", latencyMs, fetchError: "timeout" };
    }
    return { statusCode: null, bodyText: "", latencyMs, fetchError: "network" };
  } finally {
    clearTimeout(timer);
  }
}

async function checkSite(site) {
  const { statusCode, bodyText, latencyMs, fetchError } = await fetchWithTimeout(
    site.url
  );

  const classification = classifyNetlifySite({
    statusCode,
    bodyText,
    expectInBody: site.expectInBody,
    fetchError,
  });

  return {
    id: site.id,
    label: site.label,
    url: site.url,
    state: classification.state,
    httpStatus: statusCode,
    latencyMs,
    reason: classification.reason,
    messagePt: classification.messagePt,
    messageEn: classification.messageEn,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== "GET") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const sites = loadSites();
    const results = await Promise.all(sites.map(checkSite));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        checkedAt: new Date().toISOString(),
        sites: results,
      }),
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
