const API = "/api/status";
const SITES_CONFIG = "/config/sites.json";

const PLATFORM_META = {
  netlify: {
    icon: "/icons/netlify.svg",
    label: "Netlify",
    fallback: "N",
  },
  vercel: {
    icon: "/icons/vercel.svg",
    label: "Vercel",
    fallback: "V",
  },
  cloudflare: {
    icon: "/icons/cloudflare.svg",
    label: "Cloudflare",
    fallback: "C",
  },
  github: {
    icon: "/icons/github.svg",
    label: "GitHub",
    fallback: "G",
  },
  render: {
    icon: "/icons/render.svg",
    label: "Render",
    fallback: "R",
  },
  firebase: {
    icon: "/icons/firebase.svg",
    label: "Firebase",
    fallback: "F",
  },
  generic: { icon: null, label: "Host", fallback: "?" },
};

const STATE_UI = {
  active: {
    cardClass: "site-card--active",
    badgeClass: "badge--active",
    badgeLabel: "Live",
  },
  paused: {
    cardClass: "site-card--paused",
    badgeClass: "badge--paused",
    badgePt: "Pausado",
    badgeEn: "Paused",
  },
  error: {
    cardClass: "site-card--error",
    badgeClass: "badge--error",
    badgePt: "Indisponível",
    badgeEn: "Unreachable",
  },
};

function resolvePlatform(site) {
  if (site.platform && PLATFORM_META[site.platform]) return site.platform;
  try {
    const h = new URL(site.url).hostname;
    if (h.endsWith(".netlify.app")) return "netlify";
    if (h.endsWith(".vercel.app")) return "vercel";
    if (h.endsWith(".pages.dev")) return "cloudflare";
    if (h.endsWith(".github.io")) return "github";
    if (h.endsWith(".onrender.com")) return "render";
    if (h.endsWith(".web.app") || h.endsWith(".firebaseapp.com")) return "firebase";
  } catch {
    /* ignore */
  }
  return "generic";
}

function platformIconUrl(platform) {
  const meta = platformMeta(platform);
  return meta.icon || null;
}

function platformMeta(platform) {
  return PLATFORM_META[platform] || PLATFORM_META.generic;
}

function badgeLabel(ui, state) {
  if (state === "active") return ui.badgeLabel;
  return ui.badgePt;
}

function renderBadgeHtml(ui, state) {
  if (state === "active") {
    return `
      <div class="badge ${ui.badgeClass} badge--single">
        <span class="badge__dot" aria-hidden="true"></span>
        <span class="badge__text badge__text--single">${escapeHtml(ui.badgeLabel)}</span>
      </div>`;
  }
  return `
      <div class="badge ${ui.badgeClass}">
        <span class="badge__dot" aria-hidden="true"></span>
        <span class="badge__text">
          <span>${escapeHtml(ui.badgePt)}</span>
          <span class="badge__en">${escapeHtml(ui.badgeEn)}</span>
        </span>
      </div>`;
}

const grid = document.getElementById("sites-grid");
const lastCheckedEl = document.getElementById("last-checked");
const checkedTimeEl = document.getElementById("checked-time");
const globalErrorEl = document.getElementById("global-error");

async function loadSitesManifest() {
  try {
    const res = await fetch(SITES_CONFIG, { cache: "no-store" });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const SKELETON_CARD = [
  '<article class="site-card site-card--skeleton" aria-hidden="true">',
  '  <div class="site-card__inner">',
  '    <div class="site-card__icon-wrap site-card__icon-wrap--skeleton"></div>',
  '    <div class="site-card__body">',
  '      <div class="skeleton-line skeleton-line--title"></div>',
  '      <div class="skeleton-line skeleton-line--url"></div>',
  "    </div>",
  '    <div class="skeleton-pill"></div>',
  "  </div>",
  "</article>",
].join("\n");

function renderSkeletons(count) {
  const n = Math.max(1, count || 1);
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = Array.from({ length: n }, () => SKELETON_CARD).join("");
}

function escapeHtml(str) {
  const el = document.createElement("div");
  el.textContent = str;
  return el.innerHTML;
}

function parseSiteUrl(url) {
  try {
    const u = new URL(url);
    return { hostname: u.hostname, href: u.href };
  } catch {
    return { hostname: url, href: url };
  }
}


function onPlatformIconError(img) {
  const wrap = img.closest(".site-card__icon-wrap");
  if (!wrap) return;
  img.hidden = true;
  const letter = wrap.dataset.fallback || "?";
  let el = wrap.querySelector(".site-card__favicon-fallback");
  if (!el) {
    el = document.createElement("span");
    el.className = "site-card__favicon-fallback";
    el.setAttribute("aria-hidden", "true");
    wrap.appendChild(el);
  }
  el.textContent = letter;
  el.hidden = false;
}

window.onPlatformIconError = onPlatformIconError;

function renderCard(site) {
  const ui = STATE_UI[site.state] || STATE_UI.error;
  const state = site.state || "error";
  const { hostname, href } = parseSiteUrl(site.url);
  const platform = resolvePlatform(site);
  const meta = platformMeta(platform);
  const icon = platformIconUrl(platform);
  const statusLabel = badgeLabel(ui, state);

  const iconClass =
    icon && icon.endsWith(".svg")
      ? "site-card__favicon site-card__favicon--svg"
      : "site-card__favicon";
  const iconHtml = icon
    ? `<img class="${iconClass}" src="${escapeHtml(icon)}" alt="${escapeHtml(meta.label)}" width="48" height="48" loading="lazy" decoding="async" onerror="onPlatformIconError(this)" />`
    : `<span class="site-card__favicon-fallback" aria-hidden="true">${escapeHtml(meta.fallback)}</span>`;

  return [
    `<article class="site-card ${ui.cardClass}" data-state="${escapeHtml(state)}" data-platform="${escapeHtml(platform)}">`,
    `  <a class="site-card__link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(hostname)} — ${escapeHtml(statusLabel)}">`,
    '    <div class="site-card__inner">',
    `      <div class="site-card__icon-wrap site-card__icon-wrap--${escapeHtml(platform)}" data-fallback="${escapeHtml(meta.fallback)}">`,
    iconHtml,
    "      </div>",
    '      <div class="site-card__body">',
    `        <p class="site-card__host">${escapeHtml(hostname)}</p>`,
    `        <p class="site-card__url">${escapeHtml(href)}</p>`,
    "      </div>",
    renderBadgeHtml(ui, state).trim(),
    "    </div>",
    "  </a>",
    "</article>",
  ].join("\n");
}

function renderSites(sites) {
  grid.innerHTML = sites.map(renderCard).join("");
  grid.setAttribute("aria-busy", "false");
}

function showGlobalError(msg) {
  globalErrorEl.hidden = false;
  globalErrorEl.textContent = msg;
}

function hideGlobalError() {
  globalErrorEl.hidden = true;
  globalErrorEl.textContent = "";
}

function formatCheckedAt(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

async function fetchStatus() {
  hideGlobalError();
  const manifest = await loadSitesManifest();
  renderSkeletons(manifest.length);

  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`API respondeu ${res.status}`);
    }
    const data = await res.json();
    if (!data.sites || !Array.isArray(data.sites)) {
      throw new Error("Resposta inválida da API");
    }

    renderSites(data.sites);

    if (data.checkedAt) {
      lastCheckedEl.hidden = false;
      checkedTimeEl.dateTime = data.checkedAt;
      checkedTimeEl.textContent = formatCheckedAt(data.checkedAt);
    }
  } catch (err) {
    showGlobalError(
      `Não foi possível verificar os sites. / Could not check sites: ${err.message}`
    );
    grid.innerHTML = "";
    grid.setAttribute("aria-busy", "false");
  }
}

document.addEventListener("DOMContentLoaded", fetchStatus);
