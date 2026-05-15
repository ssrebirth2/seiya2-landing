const API = "/api/status";
const PLACEHOLDER_COUNT = 3;

const STATE_UI = {
  checking: {
    cardClass: "site-card--checking",
    badgeClass: "badge--checking",
    badgePt: "Verificando…",
    badgeEn: "Checking…",
    messagePt: "Aguarde",
    messageEn: "Please wait",
  },
  active: {
    cardClass: "site-card--active",
    badgeClass: "badge--active",
    badgePt: "No ar",
    badgeEn: "Live",
  },
  paused: {
    cardClass: "site-card--paused",
    badgeClass: "badge--paused",
    badgePt: "Pausado",
    badgeEn: "Paused",
    messagePt: "Pausado — limite de uso Netlify",
    messageEn: "Paused — Netlify usage limit",
  },
  error: {
    cardClass: "site-card--error",
    badgeClass: "badge--error",
    badgePt: "Indisponível",
    badgeEn: "Unreachable",
  },
};

const grid = document.getElementById("sites-grid");
const lastCheckedEl = document.getElementById("last-checked");
const checkedTimeEl = document.getElementById("checked-time");
const globalErrorEl = document.getElementById("global-error");

function renderSkeletons() {
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = Array.from({ length: PLACEHOLDER_COUNT }, () =>
    '<div class="skeleton" aria-hidden="true"></div>'
  ).join("");
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function renderCard(site) {
  const ui = STATE_UI[site.state] || STATE_UI.error;

  return `
    <article class="site-card ${ui.cardClass}" data-state="${escapeHtml(site.state)}">
      <header class="site-card__header">
        <div>
          <h2 class="site-card__label">${escapeHtml(site.label)}</h2>
          <a class="site-card__url" href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.url)}</a>
        </div>
        <div class="badge ${ui.badgeClass}">
          <span>${escapeHtml(ui.badgePt)}</span>
          <span class="badge__en">${escapeHtml(ui.badgeEn)}</span>
        </div>
      </header>
    </article>
  `;
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
  renderSkeletons();

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
