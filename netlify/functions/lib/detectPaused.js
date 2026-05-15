const PAUSE_SIGNATURES = [
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
  "id=\"netlify-error-page\"",
  "class=\"netlify-error",
];

const PAUSE_REGEXES = [
  /exceeded.{0,40}limit/i,
  /<title[^>]*>\s*site not available\s*<\/title>/i,
];

const MESSAGES = {
  active: {
    messagePt: "Site no ar",
    messageEn: "Site is serving content",
  },
  paused: {
    messagePt: "Pausado pelo Netlify (limite de uso)",
    messageEn: "Paused by Netlify (usage limit reached)",
  },
  error: {
    messagePt: "Indisponível ou erro de conexão",
    messageEn: "Unreachable or connection error",
  },
};

function normalizeBody(bodyText) {
  return (bodyText || "").toLowerCase();
}

function matchesPauseSignature(normalizedBody) {
  for (const sig of PAUSE_SIGNATURES) {
    if (normalizedBody.includes(sig)) return true;
  }
  for (const re of PAUSE_REGEXES) {
    if (re.test(normalizedBody)) return true;
  }
  if (normalizedBody.includes("netlify") && normalizedBody.includes("paused")) {
    return true;
  }
  return false;
}

function hasExpectedContent(bodyText, expectInBody) {
  if (!expectInBody || expectInBody.length === 0) return true;
  const lower = (bodyText || "").toLowerCase();
  return expectInBody.some((s) => lower.includes(s.toLowerCase()));
}

/**
 * @param {{ statusCode: number|null, headers?: Record<string,string>, bodyText: string, expectInBody?: string[], fetchError?: string }}
 * @returns {{ state: 'active'|'paused'|'error', reason: string, messagePt: string, messageEn: string }}
 */
function classifyNetlifySite({
  statusCode,
  bodyText = "",
  expectInBody,
  fetchError,
}) {
  const normalized = normalizeBody(bodyText);

  if (fetchError === "timeout") {
    return result("error", "timeout");
  }
  if (fetchError === "network") {
    return result("error", "network");
  }

  if (matchesPauseSignature(normalized)) {
    return result("paused", "netlify_usage_pause");
  }

  if (statusCode === null || statusCode === undefined) {
    return result("error", "network");
  }

  if (statusCode >= 500) {
    return result("error", "http_5xx");
  }

  if (!bodyText || bodyText.trim().length === 0) {
    return result("error", "empty_response");
  }

  if (statusCode >= 400) {
    if (statusCode === 404 && normalized.includes("site not")) {
      return result("paused", "netlify_not_deployed");
    }
    return result("error", `http_${statusCode}`);
  }

  if (expectInBody && expectInBody.length > 0) {
    if (!hasExpectedContent(bodyText, expectInBody)) {
      if (bodyText.length < 500) {
        return result("paused", "content_mismatch_small");
      }
      return result("error", "content_mismatch");
    }
  } else if (bodyText.trim().length < 200) {
    return result("error", "body_too_small");
  }

  if (statusCode >= 200 && statusCode < 400) {
    return result("active", "ok");
  }

  return result("error", "unknown");
}

function result(state, reason) {
  const msgs = MESSAGES[state] || MESSAGES.error;
  return {
    state,
    reason,
    messagePt: msgs.messagePt,
    messageEn: msgs.messageEn,
  };
}

module.exports = { classifyNetlifySite, matchesPauseSignature, MESSAGES };
