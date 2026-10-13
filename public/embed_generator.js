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
// ==============================================================================

const params = new URLSearchParams(window.location.search);
let currentTable = params.get("table") || (params.get("api") ? "" : "beverley");
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
  const query = getTargetQuery();
  const sep = filename && filename.includes("?") ? "&" : "?";
  const extra = extraParams ? `&${extraParams}` : "";
  const path = filename ? `/${filename}` : "";
  return `${BASE_URL}${path}${sep}${query}${extra}`;
}

function updateDisplay() {
  if (currentColor) {
    applyEmbedTheme(currentColor);
  }
  const display = document.getElementById("apiDisplay");
  if (display) {
    if (currentApi) {
      display.textContent = `LEGACY API: ${currentApi.toUpperCase()}`;
    } else {
      display.textContent = formatTownName(currentTable || "beverley").toUpperCase();
    }
  }

  const slugInput = document.getElementById("tableSlugInput");
  if (slugInput && !currentApi) {
    slugInput.value = formatTownName(currentTable || "beverley");
  }

  const guideLink = document.getElementById("guideLinkHeader");
  if (guideLink) {
    guideLink.href = `/guide.html?table=${encodeURIComponent(currentTable || "beverley")}`;
  }

  const hubLink = document.getElementById("hubLinkHeader");
  if (hubLink) {
    hubLink.href = `/hub.html?table=${encodeURIComponent(currentTable || "beverley")}`;
  }

  const adminLink = document.getElementById("adminLinkHeader");
  if (adminLink) {
    adminLink.href = `/?table=${encodeURIComponent(currentTable || "beverley")}`;
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
  // Direct Links in alphabetical order (A to Z)
  // A
  setLink("addressLink", buildUrl("address.html"));

  // B
  setLink("beaconLink", buildUrl("beacon.html"));
  setLink("bingoLink", buildUrl("bingo.html"));

  // C
  setLink("carouselLink", buildUrl("carousel.html"));
  setLink("colouringpageLink", buildUrl("colouring_page.html"));
  setLink("countdownLink", buildUrl("countdown.html"));
  setLink("crewLink", buildUrl("crew.html"));

  // D
  setLink("doorhangerLink", buildUrl("door_hanger.html"));

  // E
  setLink("elfcamLink", buildUrl("elf_cam.html"));

  // G
  setLink("giftaidLink", buildUrl("gift_aid.html"));
  setLink("godModeLink", buildUrl("god_mode.html"));

  // K
  setLink("knowledgeBaseLink", buildUrl("knowledge-base.html"));

  // L
  setLink("letterLink", buildUrl("letter.html"));

  // M
  setLink("magicmailboxLink", buildUrl("magic_mailbox.html"));
  setLink("memorybookLink", buildUrl("memory_book.html"));

  // N
  setLink("niceListLink", buildUrl("nice_list.html"));

  // P
  setLink("partnerReportLink", buildUrl("partner_report.html"));

  // Q
  setLink("qrPosterLink", buildUrl("qr_poster.html"));

  // R
  setLink("reindeerLink", buildUrl("adopt_reindeer.html"));
  setLink("routeCardLink", buildUrl("route_card.html"));
  setLink("routeplannerLink", buildUrl("route_planner.html"));
  setLink("routesLink", buildUrl("routes.html"));

  // S
  setLink("santachatLink", buildUrl("santa_chat.html"));
  setLink("santasleighLink", buildUrl(""));
  setLink("santastudioLink", buildUrl("santa_studio.html"));
  setLink("santasBeenLink", buildUrl("santa_frame.html"));
  setLink("satnavLink", buildUrl("tracker.html", "driver=1"));
  setLink("seasonWrapLink", buildUrl("season_wrap.html"));
  setLink("blueprintLink", buildUrl("blueprint.html"));
  setLink("snowmanLink", buildUrl("snowman.html"));
  setLink("suggestLink", buildUrl("suggest.html"));

  // T
  setLink("thankYouLink", buildUrl("thank_you.html"));
  setLink("trackerLink", buildUrl("tracker.html"));
  setLink("trackerKioskLink", buildUrl("tracker.html", "kiosk=1"));

  // V
  setLink("volunteercertLink", buildUrl("volunteer_cert.html"));

  loadRoutes();
}

async function loadRoutes() {
  const gpxEl = document.getElementById("gpxList");
  if (!gpxEl) return;
  try {
    let routes = [];
    if (currentApi) {
      const res = await fetch(currentApi);
      const json = await res.json();
      routes = json.routes || [];
    } else {
      const res = await fetch(`https://turbosanta-api.beverley247.workers.dev/api/payload?table=${encodeURIComponent(currentTable || "beverley")}`);
      const json = await res.json();
      routes = json.routes || [];
    }

    if (!routes || !routes.length) {
      gpxEl.value = "No routes currently scheduled for this table.";
      return;
    }

    const output = routes.map(r => {
      const name = r.routeName || r.name || "Route";
      return buildUrl("gpx_animation.html", `route=${encodeURIComponent(name)}`);
    }).join("\r\n");

    gpxEl.value = output;
  } catch (e) {
    gpxEl.value = "GPX animation links available when routes are created.";
  }
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
