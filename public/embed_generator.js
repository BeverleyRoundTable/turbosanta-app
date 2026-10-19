function formatTownName(str) {
  if (!str) return 'Beverley';
  return str
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ==============================================================================
// TurboSanta — Multi-Tenant Universal Direct Links Generator
// Supports both Cloudflare D1 Multi-Tenant (?table=slug) and Legacy Sheets (?api=)
// Strictly Curated 14 Public Interactive Features
// ==============================================================================

function detectSubdomainSlug() {
  const host = (window.location.hostname || "").toLowerCase();
  if (host.endsWith(".roundtablesantasleigh.co.uk")) {
    const sub = host.replace(".roundtablesantasleigh.co.uk", "").split(".")[0].replace(/(tracker|crew|addresses|godmode)$/, "");
    if (sub && sub !== "www" && sub !== "santa" && sub !== "demo" && sub !== "admin" && sub !== "turbosanta") {
      return sub;
    }
  }
  return "";
}

const params = new URLSearchParams(window.location.search);
let currentTable = params.get("table") || detectSubdomainSlug() || (params.get("api") ? "" : "beverley");
let currentApi = params.get("api") || "";
let currentColor = params.get("color") || "";

const CUSTOM_DOMAIN = "https://roundtablesantasleigh.co.uk";
const BASE_URL = (window.location.hostname.includes("roundtablesantasleigh.co.uk"))
  ? window.location.origin
  : CUSTOM_DOMAIN;

function applyEmbedTheme(colorHex) {
  if (!colorHex) {
    document.documentElement.style.removeProperty('--gold');
    document.documentElement.style.removeProperty('--primary');
    return;
  }
  const hex = colorHex.startsWith('#') ? colorHex : '#' + colorHex;
  document.documentElement.style.setProperty('--gold', hex);
  document.documentElement.style.setProperty('--primary', hex);
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (m) {
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    document.documentElement.style.setProperty('--gold-dim', `rgba(${r},${g},${b},0.12)`);
    document.documentElement.style.setProperty('--gold-glow', `rgba(${r},${g},${b},0.25)`);
    document.documentElement.style.setProperty('--border-gold', `rgba(${r},${g},${b},0.2)`);
  }
}

function getTargetQuery() {
  let query = "";
  if (currentApi) {
    query = `api=${encodeURIComponent(currentApi)}`;
  } else {
    query = `table=${encodeURIComponent(currentTable || "beverley")}`;
  }
  if (currentColor) {
    query += `&color=${encodeURIComponent(currentColor.replace('#', ''))}`;
  }
  return query;
}

function updateColorTheme(newColor) {
  currentColor = (newColor || "").trim();
  const select = document.getElementById("colorThemeSelect");
  if (select) {
    if (currentColor === '#FBAF33' || currentColor === 'FBAF33') select.value = '#FBAF33';
    else if (currentColor === '#D31C1C' || currentColor === 'D31C1C') select.value = '#D31C1C';
    else if (currentColor) select.value = 'custom';
    else select.value = '';
  }
  const picker = document.getElementById("customColorPicker");
  if (picker && currentColor && currentColor.startsWith('#')) {
    picker.value = currentColor;
  }
  const newUrl = new URL(window.location.href);
  if (currentColor) {
    newUrl.searchParams.set("color", currentColor.replace('#', ''));
  } else {
    newUrl.searchParams.delete("color");
  }
  window.history.replaceState({}, "", newUrl);
  applyEmbedTheme(currentColor);
  generateAllEmbeds();
}
window.updateColorTheme = updateColorTheme;

function buildUrl(filename, extraParams = "") {
  const cleanPath = filename ? `/${filename.replace(/^\/+/, "").replace(/\.html$/i, "")}` : "";
  if (currentApi) {
    const query = getTargetQuery();
    const sep = filename && filename.includes("?") ? "&" : "?";
    const extra = extraParams ? `&${extraParams}` : "";
    return `${BASE_URL}${cleanPath}.html${sep}${query}${extra}`;
  }
  const slug = encodeURIComponent((currentTable || "beverley").toLowerCase().trim());
  const townOrigin = `https://${slug}.roundtablesantasleigh.co.uk`;
  const qp = [];
  if (currentColor) qp.push(`color=${encodeURIComponent(currentColor.replace('#', ''))}`);
  if (extraParams) qp.push(extraParams);
  const qs = qp.length ? (cleanPath.includes("?") ? `&${qp.join("&")}` : `?${qp.join("&")}`) : "";
  return `${townOrigin}${cleanPath}${qs}`;
}

function updateDisplay() {
  if (currentColor) {
    applyEmbedTheme(currentColor);
  }
  const slug = (currentTable || "beverley").toLowerCase().trim();
  const townOrigin = `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk`;
  const display = document.getElementById("apiDisplay");
  if (display) {
    if (currentApi) {
      display.textContent = `LEGACY API: ${currentApi.toUpperCase()}`;
    } else {
      display.textContent = formatTownName(slug).toUpperCase();
    }
  }

  const slugInput = document.getElementById("tableSlugInput");
  if (slugInput && !currentApi) {
    slugInput.value = formatTownName(slug);
  }

  const guideLink = document.getElementById("guideLinkHeader");
  if (guideLink) {
    guideLink.href = `${townOrigin}/guide`;
  }

  const hubLink = document.getElementById("hubLinkHeader");
  if (hubLink) {
    hubLink.href = `${townOrigin}/hub`;
  }

  const adminLink = document.getElementById("adminLinkHeader");
  if (adminLink) {
    adminLink.href = `${townOrigin}/?admin=1`;
  }

  generateAllEmbeds();
}

function updateTableSlug(newSlug) {
  const input = document.getElementById("tableSlugInput");
  const rawSlug = (newSlug !== undefined ? newSlug : (input ? input.value : "beverley")).trim();
  const slug = rawSlug.toLowerCase().replace(/\s+/g, '-');
  if (input) input.value = formatTownName(rawSlug);
  if (slug) {
    currentTable = slug;
    currentApi = "";
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("table", slug);
    newUrl.searchParams.delete("api");
    window.history.replaceState({}, "", newUrl);
    updateDisplay();
  }
}
window.updateTableSlug = updateTableSlug;

function setLink(id, url) {
  setValue(id, url);
  const openEl = document.getElementById(id + "_open");
  if (openEl) {
    openEl.href = url;
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = (val || "").trim();
}

function generateAllEmbeds() {
  // Direct Links in alphabetical order (A to Z) for the 14 Curated Public Features
  // 01: Bingo
  setLink("bingoLink", buildUrl("bingo"));

  // 02: Colouring
  setLink("colouringpageLink", buildUrl("colouring_page"));

  // 03: Countdown
  setLink("countdownLink", buildUrl("countdown"));

  // 04: Door Hanger
  setLink("doorhangerLink", buildUrl("door_hanger"));

  // 05: Elf Cam (Lapland)
  setLink("elfcamLink", buildUrl("elf_cam"));

  // 06: Letter to Santa
  setLink("letterLink", buildUrl("letter"));

  // 07: Magic Mailbox
  setLink("magicmailboxLink", buildUrl("magic_mailbox"));

  // 08: Nice List
  setLink("niceListLink", buildUrl("nice_list"));

  // 09: Reindeer Adoption
  setLink("reindeerLink", buildUrl("adopt_reindeer"));

  // 10: Santa Chat Hotline
  setLink("santachatLink", buildUrl("santa_chat"));

  // 11: Santa Frame
  setLink("santasBeenLink", buildUrl("santa_frame"));

  // 12: Santa Studio
  setLink("santastudioLink", buildUrl("santa_studio"));

  // 13: Snowman Maker
  setLink("snowmanLink", buildUrl("snowman"));

  // 14: Spot Santa Sightings
  setLink("spotsantaLink", buildUrl("spot_santa_form"));

  // Update card counter
  filterLinks(document.getElementById('filterInput')?.value || '');
}

function filterLinks(query) {
  const q = (query || "").toLowerCase().trim();
  const cards = document.querySelectorAll('.card[data-title]');
  let visibleCount = 0;
  cards.forEach(card => {
    const title = (card.getAttribute('data-title') || '').toLowerCase();
    const desc = (card.querySelector('.card-desc')?.textContent || '').toLowerCase();
    const matches = !q || title.includes(q) || desc.includes(q);
    card.style.display = matches ? '' : 'none';
    if (matches) visibleCount++;
  });
  const countEl = document.getElementById('linkCount');
  if (countEl) {
    countEl.textContent = q ? `SHOWING ${visibleCount} OF ${cards.length} LINKS` : `${cards.length} LINKS AVAILABLE`;
  }
}
window.filterLinks = filterLinks;

document.addEventListener("DOMContentLoaded", () => {
  updateDisplay();
});
