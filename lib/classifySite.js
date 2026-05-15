const NETLIFY_PAUSE_SIGNATURES = [
  "site not available",
  "site not found",
  "this site is paused",
  "your site is paused",
  "site is paused",
  "paused due to",
  "usage limit",
  "monthly usage",
  "credit balance",
  "out of credits",
  "bandwidth limit",
  "has been paused",
  "project is paused",
  "team has been paused",
  "netlify-error-page",
  'id="netlify-error-page"',
  'class="netlify-error',
];

const VERCEL_PAUSE_SIGNATURES = [
  "deployment not found",
  "deployment is not found",
  "this deployment cannot be accessed",
  "deployment is temporarily unavailable",
  "the deployment you are trying to access",
  "no deployment found",
  "resource limit",
  "bandwidth limit",
  "account suspended",
  "exceeded the fair use",
  "function_invocation",
  "out of bandwidth",
];

const PAUSE_REGEXES = {
  netlify: [/exceeded.{0,40}limit/i, /<title[^>]*>\s*site not available\s*<\/title>/i],
  vercel: [/deployment.{0,30}not found/i, /exceeded.{0,40}(limit|bandwidth)/i],
  generic: [/exceeded.{0,40}limit/i],
};

const MESSAGES = {
  active: {
    messagePt: "Site no ar",
    messageEn: "Site is serving content",
  },
  paused: {
    netlify: {
      messagePt: "Pausado — limite de uso Netlify",
      messageEn: "Paused — Netlify usage limit",
    },
    vercel: {
      messagePt: "Pausado ou indisponível — limite Vercel",
      messageEn: "Paused or unavailable — Vercel limit",
    },
    generic: {
      messagePt: "Pausado ou indisponível — limite do host",
      messageEn: "Paused or unavailable — host limit",
    },
  },
  error: {
    messagePt: "Indisponível ou erro de conexão",
    messageEn: "Unreachable or connection error",
  },
};

function normalizeBody(bodyText) {
  return (bodyText || "").toLowerCase();
}

function matchesSignatures(normalizedBody, signatures) {
  for (const sig of signatures) {
    if (normalizedBody.includes(sig)) return true;
  }
  return false;
}

function matchesPauseRegexes(normalizedBody, platform) {
  const list = PAUSE_REGEXES[platform] || PAUSE_REGEXES.generic;
  for (const re of list) {
    if (re.test(normalizedBody)) return true;
  }
  return false;
}

function matchesPlatformPause(normalizedBody, platform) {
  if (platform === "netlify") {
    if (matchesSignatures(normalizedBody, NETLIFY_PAUSE_SIGNATURES)) return true;
    if (normalizedBody.includes("netlify") && normalizedBody.includes("paused")) {
      return true;
    }
  }
  if (platform === "vercel") {
    if (matchesSignatures(normalizedBody, VERCEL_PAUSE_SIGNATURES)) return true;
    if (normalizedBody.includes("vercel") && normalizedBody.includes("paused")) {
      return true;
    }
  }
  if (matchesPauseRegexes(normalizedBody, platform)) return true;
  return false;
}

function hasExpectedContent(bodyText, expectInBody) {
  if (!expectInBody || expectInBody.length === 0) return true;
  const lower = (bodyText || "").toLowerCase();
  return expectInBody.some((s) => lower.includes(s.toLowerCase()));
}

/**
 * @param {{ statusCode: number|null, bodyText?: string, expectInBody?: string[], fetchError?: string, platform?: string }}
 */
function classifySite({
  statusCode,
  bodyText = "",
  expectInBody,
  fetchError,
  platform = "generic",
}) {
  const normalized = normalizeBody(bodyText);
  const host = ["netlify", "vercel"].includes(platform) ? platform : "generic";

  if (fetchError === "timeout") {
    return result("error", "timeout", host);
  }
  if (fetchError === "network") {
    return result("error", "network", host);
  }

  if (matchesPlatformPause(normalized, host)) {
    return result("paused", `${host}_usage_pause`, host);
  }

  if (statusCode === null || statusCode === undefined) {
    return result("error", "network", host);
  }

  if (statusCode >= 500) {
    return result("error", "http_5xx", host);
  }

  if (!bodyText || bodyText.trim().length === 0) {
    return result("error", "empty_response", host);
  }

  if (statusCode >= 400) {
    if (host === "netlify" && statusCode === 404 && normalized.includes("site not")) {
      return result("paused", "netlify_not_deployed", host);
    }
    if (host === "vercel" && (statusCode === 404 || statusCode === 410)) {
      if (normalized.includes("deployment") || normalized.includes("not found")) {
        return result("paused", "vercel_not_deployed", host);
      }
    }
    return result("error", `http_${statusCode}`, host);
  }

  if (expectInBody && expectInBody.length > 0) {
    if (!hasExpectedContent(bodyText, expectInBody)) {
      if (bodyText.length < 500) {
        return result("paused", "content_mismatch_small", host);
      }
      return result("error", "content_mismatch", host);
    }
  } else if (bodyText.trim().length < 200) {
    return result("error", "body_too_small", host);
  }

  if (statusCode >= 200 && statusCode < 400) {
    return result("active", "ok", host);
  }

  return result("error", "unknown", host);
}

function result(state, reason, host) {
  let messagePt;
  let messageEn;
  if (state === "paused") {
    const pausedMsgs = MESSAGES.paused[host] || MESSAGES.paused.generic;
    messagePt = pausedMsgs.messagePt;
    messageEn = pausedMsgs.messageEn;
  } else {
    const msgs = MESSAGES[state] || MESSAGES.error;
    messagePt = msgs.messagePt;
    messageEn = msgs.messageEn;
  }
  return { state, reason, messagePt, messageEn, platform: host };
}

/** @deprecated use classifySite */
function classifyNetlifySite(opts) {
  return classifySite({ ...opts, platform: "netlify" });
}

module.exports = {
  classifySite,
  classifyNetlifySite,
  NETLIFY_PAUSE_SIGNATURES,
  VERCEL_PAUSE_SIGNATURES,
};
