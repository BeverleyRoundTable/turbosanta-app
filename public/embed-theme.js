/* ============================================================
   TurboSanta 2.0 — Embed Theme, Brand Font & Dynamic Resize Engine
   Enforces:
     1. Strict Brand Color Harmony (--primary/--gold & --accent/--red)
        via inline styles on documentElement (overrides page :root)
     2. Automatic Cloudflare D1 Theme Sync for Standalone & Embed Modes
     3. Brand Typography (@font-face Eurostile, Open Sans, DM Mono)
     4. Legacy 1.0 localStorage Poisoning Purge (SANTA_API)
     5. Zero-Scroll Dynamic Parent Resizing via postMessage
   ============================================================ */

(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var isEmbedded = (window.self !== window.top) || params.get("embed") === "1";

  // 1. Purge stale 1.0 legacy Google Apps Script keys unless explicitly passed via ?api=
  if (!params.get("api")) {
    try {
      localStorage.removeItem("SANTA_API");
      localStorage.removeItem("SANTA_PROXY");
      sessionStorage.removeItem("SANTA_API");
    } catch (_) {}
  }

  // 2. Resolve Table Slug from URL param or *.roundtablesantasleigh.co.uk subdomain
  var hostParts = window.location.hostname.split(".");
  var subSlug = (
    hostParts.length >= 3 &&
    hostParts[0] !== "www" &&
    hostParts[0] !== "admin" &&
    !window.location.hostname.includes("pages.dev") &&
    !window.location.hostname.includes("localhost")
  ) ? hostParts[0] : "";
  var tableSlug = params.get("table") || params.get("slug") || subSlug || "beverley";

  var prefetched = window.__sleighPrefetchedData && window.__sleighPrefetchedData.table;

  // In TurboSanta 2.0:
  // - primary_color (default #FBAF33) drives --primary AND --gold across all 13 public slot apps
  // - accent_color  (default #D31C1C) drives --accent  AND --red  across all 13 public slot apps
  var rawPrimary = params.get("primary") || params.get("color") || (prefetched && prefetched.primary_color) || "#FBAF33";
  var rawAccent = params.get("accent") || (prefetched && prefetched.accent_color) || "#D31C1C";

  function sanitizeHex(hex, fallback) {
    if (!hex || typeof hex !== "string") return fallback;
    var clean = hex.trim();
    if (!clean.startsWith("#")) clean = "#" + clean;
    if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
      clean = "#" + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    return /^#[0-9A-Fa-f]{6}$/.test(clean) ? clean : fallback;
  }

  function hexToRgbObj(hex) {
    var clean = sanitizeHex(hex, "#FBAF33").replace("#", "");
    var num = parseInt(clean, 16);
    if (isNaN(num)) return { r: 251, g: 175, b: 51 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function getContrastColor(r, g, b) {
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 145 ? "#000000" : "#ffffff";
  }

  var primaryColor = sanitizeHex(rawPrimary, "#FBAF33");
  var accentColor = sanitizeHex(rawAccent, "#D31C1C");

  // 3. Apply Inline CSS Variables on <html> so they ALWAYS win over page-level :root blocks
  function applyTurboSantaTheme(pHex, aHex) {
    primaryColor = sanitizeHex(pHex, primaryColor);
    accentColor = sanitizeHex(aHex, accentColor);

    var pRgb = hexToRgbObj(primaryColor);
    var aRgb = hexToRgbObj(accentColor);
    var onPrimary = getContrastColor(pRgb.r, pRgb.g, pRgb.b);
    var onAccent = getContrastColor(aRgb.r, aRgb.g, aRgb.b);

    var rootStyle = document.documentElement.style;
    // Primary / Gold variables (unified across all 13 slot apps)
    rootStyle.setProperty("--primary", primaryColor);
    rootStyle.setProperty("--primary-rgb", pRgb.r + ", " + pRgb.g + ", " + pRgb.b);
    rootStyle.setProperty("--on-primary", onPrimary);
    rootStyle.setProperty("--primary-dim", "rgba(" + pRgb.r + ", " + pRgb.g + ", " + pRgb.b + ", 0.12)");
    rootStyle.setProperty("--primary-glow", "rgba(" + pRgb.r + ", " + pRgb.g + ", " + pRgb.b + ", 0.25)");
    rootStyle.setProperty("--border-primary", "rgba(" + pRgb.r + ", " + pRgb.g + ", " + pRgb.b + ", 0.28)");

    rootStyle.setProperty("--gold", primaryColor);
    rootStyle.setProperty("--gold-rgb", pRgb.r + ", " + pRgb.g + ", " + pRgb.b);
    rootStyle.setProperty("--gold-dim", "rgba(" + pRgb.r + ", " + pRgb.g + ", " + pRgb.b + ", 0.12)");
    rootStyle.setProperty("--gold-glow", "rgba(" + pRgb.r + ", " + pRgb.g + ", " + pRgb.b + ", 0.25)");
    rootStyle.setProperty("--border-gold", "rgba(" + pRgb.r + ", " + pRgb.g + ", " + pRgb.b + ", 0.28)");

    // Accent / Red variables
    rootStyle.setProperty("--accent", accentColor);
    rootStyle.setProperty("--accent-rgb", aRgb.r + ", " + aRgb.g + ", " + aRgb.b);
    rootStyle.setProperty("--on-accent", onAccent);
    rootStyle.setProperty("--red", accentColor);

    if (window.TurboSantaEmbed) {
      window.TurboSantaEmbed.primaryColor = primaryColor;
      window.TurboSantaEmbed.accentColor = accentColor;
      window.TurboSantaEmbed.onPrimary = onPrimary;
    }
  }

  // Expose globally so individual apps can call it after fetching their own payload
  window.applyTurboSantaTheme = applyTurboSantaTheme;
  applyTurboSantaTheme(primaryColor, accentColor);

  // 4. Inject Brand Font (@font-face Eurostile) & Unified Slot Styling
  var style = document.createElement("style");
  style.id = "ts-embed-theme-styles";
  style.textContent = `
    @font-face {
      font-family: 'Eurostile';
      src: local('/site/Eurostile_Extended_2_Bold.woff2'), url('/site/Eurostile_Extended_2_Bold.woff2') format('woff2');
      font-weight: 700 900;
      font-style: normal;
      font-display: swap;
    }

    :root {
      --surface: #161614;
      --surface-2: #1e1e1b;
      --surface-3: #252522;
      --dark: #0d0d0b;
      --text: #eaeae5;
      --text-dim: rgba(255, 255, 255, 0.65);
      --text-muted: rgba(255, 255, 255, 0.35);
      --border: rgba(255, 255, 255, 0.1);
    }

    /* Embedded Mode Adjustments */
    html.ts-embedded,
    body.ts-embedded {
      background: transparent !important;
      background-image: none !important;
      min-height: 0 !important;
      height: auto !important;
      overflow-x: hidden !important;
      overflow-y: hidden !important;
    }

    body.ts-embedded {
      padding-top: 8px !important;
      padding-bottom: 16px !important;
    }

    body.ts-embedded .app,
    body.ts-embedded .controls-wrapper,
    body.ts-embedded .main-wrap,
    body.ts-embedded .container {
      padding-top: 8px !important;
      padding-bottom: 12px !important;
      max-width: 100% !important;
    }

    /* Hide redundant duplicate page-level headers when rendered inside slot sections */
    body.ts-embedded > header,
    body.ts-embedded .app > header,
    body.ts-embedded .ctrl-header,
    body.ts-embedded .page-header,
    body.ts-embedded .header-hero {
      display: none !important;
    }

    /* Clean typography & accessible button contrast */
    .btn-gold, .btn-primary, .btn-submit, .random-btn {
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      font-weight: 700 !important;
    }
    .btn-gold, .btn-submit {
      color: var(--on-primary, #000000) !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  if (isEmbedded) {
    document.documentElement.classList.add("ts-embedded");
    if (document.body) {
      document.body.classList.add("ts-embedded");
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        document.body.classList.add("ts-embedded");
      });
    }
  }

  // 5. If primary/accent weren't explicitly passed in URL params, fetch from D1 payload automatically
  if (!params.get("primary") && !params.get("color") && !prefetched) {
    var workerUrl = "https://turbosanta-api.beverley247.workers.dev/api/payload?table=" + encodeURIComponent(tableSlug);
    fetch(workerUrl)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        window.__tsPayloadCache = d;
        var tbl = d.table || {};
        var set = d.settings || {};
        var p = tbl.primary_color || set.primary_color || primaryColor;
        var a = tbl.accent_color || set.accent_color || accentColor;
        applyTurboSantaTheme(p, a);
      })
      .catch(function () {});
  }

  // 6. Scrub Emojis from Headers and Buttons for strict brand guidelines
  function cleanEmojis() {
    var targets = document.querySelectorAll("h1, h2, h3, button, .btn, .random-btn, .tab-btn");
    var emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    function scrubNode(n) {
      if (!n) return;
      if (n.nodeType === 3) {
        if (emojiRegex.test(n.nodeValue)) {
          n.nodeValue = n.nodeValue.replace(emojiRegex, "").replace(/\s{2,}/g, " ");
        }
      } else if (n.nodeType === 1) {
        if (n.closest && (
          n.closest(".preview-area") ||
          n.closest(".cert-content") ||
          n.closest("#renderArea") ||
          n.closest(".chat-wrapper") ||
          n.closest(".chip-btn") ||
          n.closest(".palette") ||
          n.closest(".stamp-row") ||
          n.closest(".parts-grid")
        )) return;
        var children = n.childNodes;
        for (var i = 0; i < children.length; i++) {
          scrubNode(children[i]);
        }
      }
    }
    targets.forEach(function (el) {
      if (el.closest && (
        el.closest(".preview-area") ||
        el.closest(".cert-content") ||
        el.closest("#renderArea") ||
        el.closest(".chat-wrapper") ||
        el.closest(".chip-btn") ||
        el.closest(".palette") ||
        el.closest(".stamp-row") ||
        el.closest(".parts-grid")
      )) return;
      scrubNode(el);
    });
  }

  // 7. Dynamic Zero-Scroll Content Height Messenger
  if (window.parent && window.parent !== window) {
    try {
      var embedCss = document.createElement("style");
      embedCss.id = "ts-embed-height-override";
      embedCss.textContent = "html, body { min-height: 0 !important; height: auto !important; }";
      (document.head || document.documentElement).appendChild(embedCss);
    } catch (_) {}
  }

  var lastSentHeight = 0;
  function getActualContentHeight() {
    if (!document.body) return 0;
    var container = document.querySelector(
      '.chat-wrapper, .santa-checker, .cert-generator, .reindeer-station, ' +
      '.frame-wrapper, .studio-wrapper, .snowman-wrapper, .spot-wrapper, ' +
      '.countdown-container, .bingo-wrap, .door-hanger-wrap, .elf-cam-wrap, ' +
      '.card, main, #app, .container'
    );
    if (container) {
      var rect = container.getBoundingClientRect();
      var cStyle = window.getComputedStyle(container);
      var mt = parseFloat(cStyle.marginTop) || 0;
      var mb = parseFloat(cStyle.marginBottom) || 0;
      var bs = window.getComputedStyle(document.body);
      var pt = parseFloat(bs.paddingTop) || 0;
      var pb = parseFloat(bs.paddingBottom) || 0;
      return Math.ceil(rect.height + mt + mb + pt + pb + 16);
    }
    var children = document.body.children;
    var maxBottom = 0;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') continue;
      if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;
      var r = el.getBoundingClientRect();
      if (r.bottom > maxBottom) maxBottom = r.bottom;
    }
    if (maxBottom > 50) return Math.ceil(maxBottom + 20);
    return document.body.scrollHeight;
  }

  function notifyParentHeight() {
    if (!document.body || window.parent === window) return;
    var currentHeight = getActualContentHeight();
    if (!currentHeight || currentHeight < 60) return;
    currentHeight = Math.min(currentHeight, 1050);

    if (Math.abs(currentHeight - lastSentHeight) >= 12) {
      lastSentHeight = currentHeight;
      window.parent.postMessage({
        type: "turbosanta-resize",
        height: currentHeight,
        path: window.location.pathname
      }, "*");
    }
  }

  window.addEventListener("load", function () {
    cleanEmojis();
    notifyParentHeight();
    setTimeout(notifyParentHeight, 250);
    setTimeout(notifyParentHeight, 800);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      cleanEmojis();
      notifyParentHeight();
    });
  } else {
    cleanEmojis();
    notifyParentHeight();
  }

  if (window.ResizeObserver && document.body) {
    new ResizeObserver(notifyParentHeight).observe(document.body);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      if (window.ResizeObserver && document.body) {
        new ResizeObserver(notifyParentHeight).observe(document.body);
      }
    });
  }

  if (window.MutationObserver) {
    var mo = new MutationObserver(function () {
      cleanEmojis();
      notifyParentHeight();
    });
    document.addEventListener("DOMContentLoaded", function () {
      mo.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  }

  window.TurboSantaEmbed = {
    notifyHeight: notifyParentHeight,
    applyTheme: applyTurboSantaTheme,
    tableSlug: tableSlug,
    primaryColor: primaryColor,
    accentColor: accentColor
  };
})();
