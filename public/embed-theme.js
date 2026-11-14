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
  function getContentRoot() {
    if (!document.body) return null;
    return document.querySelector(
      '.app, #address-root, .chat-wrapper, .santa-checker, .cert-generator, .reindeer-station, ' +
      '.frame-wrapper, .studio-wrapper, .snowman-wrapper, .spot-wrapper, ' +
      '.countdown-container, .bingo-wrap, .door-hanger-wrap, .elf-cam-wrap, ' +
      'main, #app, .container, .wrapper, .card'
    );
  }

  function getActualContentHeight() {
    if (!document.body) return 0;
    var container = getContentRoot();
    if (container) {
      var cStyle = window.getComputedStyle(container);
      var mt = parseFloat(cStyle.marginTop) || 0;
      var mb = parseFloat(cStyle.marginBottom) || 0;
      var bs = window.getComputedStyle(document.body);
      var pt = parseFloat(bs.paddingTop) || 0;
      var pb = parseFloat(bs.paddingBottom) || 0;
      return Math.ceil(container.offsetHeight + mt + mb + pt + pb + 16);
    }
    var children = document.body.children;
    var maxBottom = 0;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT' || el.tagName === 'CANVAS') continue;
      if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;
      var bottom = el.offsetTop + el.offsetHeight;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    if (maxBottom > 50) return Math.ceil(maxBottom + 24);
    return document.body.offsetHeight;
  }

  function notifyParentHeight() {
    if (!document.body || window.parent === window) return;
    var currentHeight = getActualContentHeight();
    if (!currentHeight || currentHeight < 60) return;
    currentHeight = Math.min(currentHeight, 1400);

    if (Math.abs(currentHeight - lastSentHeight) >= 16) {
      lastSentHeight = currentHeight;
      window.parent.postMessage({
        type: "turbosanta-resize",
        height: currentHeight,
        path: window.location.pathname
      }, "*");
    }
  }

  function bindContentResizeObserver() {
    if (!window.ResizeObserver || !document.body) return;
    var target = getContentRoot() || document.body;
    new ResizeObserver(notifyParentHeight).observe(target);
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
      bindContentResizeObserver();
    });
  } else {
    cleanEmojis();
    notifyParentHeight();
    bindContentResizeObserver();
  }

  if (window.MutationObserver) {
    var mo = new MutationObserver(function () {
      cleanEmojis();
      if (!window.ResizeObserver) notifyParentHeight();
    });
    document.addEventListener("DOMContentLoaded", function () {
      mo.observe(document.body, { childList: true, subtree: true });
    });
  }

  window.TurboSantaEmbed = {
    notifyHeight: notifyParentHeight,
    applyTheme: applyTurboSantaTheme,
    tableSlug: tableSlug,
    primaryColor: primaryColor,
    accentColor: accentColor
  };

  // 8. Unified In-App Browser (Facebook/Instagram) & Mobile Save/Share Helper
  var API_DOWNLOAD_URL = "https://turbosanta-api.beverley247.workers.dev/api/download-file";

  function getUa() {
    return (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "";
  }

  function isInAppBrowser() {
    return /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram|Messenger|Line\/|MicroMessenger|TikTok|BytedanceWebview|Musical_ly/i.test(getUa());
  }

  function isIOS() {
    var ua = getUa();
    if (/iPad|iPhone|iPod/i.test(ua)) return true;
    try {
      return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    } catch (_) {
      return false;
    }
  }

  function isAndroid() {
    return /Android/i.test(getUa());
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    var parts = dataUrl.split(",");
    if (parts.length < 2) return null;
    var meta = parts[0];
    var mimeMatch = /^data:([^;]+)/i.exec(meta);
    var mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    var bstr = atob(parts[1]);
    var n = bstr.length;
    var u8 = new Uint8Array(n);
    for (var i = 0; i < n; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  function postHttpsDownload(opts) {
    opts = opts || {};
    var payload = opts.base64 || opts.dataUrl || "";
    if (!payload) return false;
    try {
      var form = document.createElement("form");
      form.method = "POST";
      form.enctype = "multipart/form-data";
      form.action = API_DOWNLOAD_URL;
      form.target = opts.target || "_top";
      form.style.display = "none";

      var fields = {
        filename: opts.filename || "turbosanta_download",
        mime: opts.mime || "image/png",
        disposition: opts.disposition || "attachment",
        data: payload
      };
      Object.keys(fields).forEach(function (k) {
        var inp = document.createElement("input");
        inp.type = "hidden";
        inp.name = k;
        inp.value = fields[k];
        form.appendChild(inp);
      });
      document.body.appendChild(form);
      form.submit();
      setTimeout(function () {
        if (form.parentNode) form.parentNode.removeChild(form);
      }, 2000);
      return true;
    } catch (e) {
      return false;
    }
  }

  function triggerBrowserAnchorDownload(href, filename, revokeAfter) {
    var a = document.createElement("a");
    a.href = href;
    a.download = filename || "download";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
      if (revokeAfter) {
        try { URL.revokeObjectURL(href); } catch (_) {}
      }
    }, 1500);
  }

  function downloadFile(opts) {
    opts = opts || {};
    var filename = opts.filename || "turbosanta_download";
    var mime = opts.mime || "image/png";
    var useServerFallback = isInAppBrowser();

    if (useServerFallback) {
      var disp = (isIOS() && mime === "application/pdf") ? "inline" : "attachment";
      if (opts.dataUrl || opts.base64) {
        postHttpsDownload({
          dataUrl: opts.dataUrl,
          base64: opts.base64,
          filename: filename,
          mime: mime,
          disposition: disp,
          target: "_top"
        });
        return Promise.resolve({ ok: true, method: "https-form" });
      }
      if (opts.blob) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onloadend = function () {
            postHttpsDownload({
              dataUrl: reader.result,
              filename: filename,
              mime: mime,
              disposition: disp,
              target: "_top"
            });
            resolve({ ok: true, method: "https-form" });
          };
          reader.readAsDataURL(opts.blob);
        });
      }
    }

    if (opts.blob) {
      var objUrl = URL.createObjectURL(opts.blob);
      triggerBrowserAnchorDownload(objUrl, filename, true);
      return Promise.resolve({ ok: true, method: "blob" });
    }
    if (opts.dataUrl) {
      try {
        var b = dataUrlToBlob(opts.dataUrl);
        if (b) {
          var u = URL.createObjectURL(b);
          triggerBrowserAnchorDownload(u, filename, true);
          return Promise.resolve({ ok: true, method: "data-blob" });
        }
      } catch (_) {}
      triggerBrowserAnchorDownload(opts.dataUrl, filename, false);
      return Promise.resolve({ ok: true, method: "data-url" });
    }
    return Promise.resolve({ ok: false });
  }

  function shareFile(opts) {
    opts = opts || {};
    var filename = opts.filename || "turbosanta_certificate.png";
    var mime = opts.mime || "image/png";
    var blob = opts.blob || (opts.dataUrl ? dataUrlToBlob(opts.dataUrl) : null);

    if (blob && typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File === "function") {
      try {
        var file = new File([blob], filename, { type: mime });
        var sharePayload = {
          files: [file],
          title: opts.title || "TurboSanta Certificate"
        };
        if (opts.text) sharePayload.text = opts.text;
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          return navigator.share(sharePayload)
            .then(function () { return { ok: true, method: "share" }; })
            .catch(function (err) {
              if (err && err.name === "AbortError") {
                return { ok: false, aborted: true };
              }
              return downloadFile(opts);
            });
        }
      } catch (_) {}
    }
    return downloadFile(opts);
  }

  function getPreferredExternalUrl() {
    try {
      if (window.top && window.top.location && window.top.location.href) {
        return window.top.location.href;
      }
    } catch (_) {}
    return window.location.href;
  }

  function getChromeIntentUrl(targetUrl) {
    var clean = String(targetUrl || "").replace(/^https?:\/\//i, "");
    return "intent://" + clean + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent(targetUrl) + ";end";
  }

  function injectInAppNotice(container) {
    if (!isInAppBrowser() || !document.body) return;
    if (document.getElementById("ts-inapp-browser-notice")) return;
    var root = container || getContentRoot() || document.body;
    if (!root) return;

    var notice = document.createElement("div");
    notice.id = "ts-inapp-browser-notice";
    notice.style.cssText = [
      "margin: 12px auto 16px",
      "padding: 12px 14px",
      "border-radius: 10px",
      "background: rgba(251, 175, 51, 0.10)",
      "border: 1px solid rgba(251, 175, 51, 0.35)",
      "color: #eaeae5",
      "font-family: 'Open Sans', sans-serif",
      "font-size: 12px",
      "line-height: 1.5",
      "text-align: center",
      "max-width: 580px"
    ].join(";");

    var extUrl = getPreferredExternalUrl();
    if (isAndroid()) {
      notice.innerHTML =
        "<strong style='color:var(--primary,#FBAF33);'>Facebook / In-App Browser Tip:</strong> " +
        "If saving or printing is restricted here, tap below to open in Chrome or press &amp; hold any generated image to save it." +
        "<div style='margin-top:8px;'>" +
        "<a target='_top' rel='noopener' href='" + getChromeIntentUrl(extUrl) + "' " +
        "style='display:inline-block;padding:7px 14px;border-radius:7px;background:var(--primary,#FBAF33);color:var(--on-primary,#000);font-weight:700;text-decoration:none;font-size:12px;'>" +
        "Open in Chrome ↗</a></div>";
    } else {
      notice.innerHTML =
        "<strong style='color:var(--primary,#FBAF33);'>iPhone In-App Browser Tip:</strong> " +
        "Tap <strong>Save / Share Image</strong> or press &amp; hold any generated certificate image to <strong>Save to Photos</strong> — or tap <strong>⋯ / Compass</strong> &rarr; <strong>Open in Safari</strong>.";
    }

    root.appendChild(notice);
    setTimeout(notifyParentHeight, 60);
  }

  function autoAttachActivityNotice() {
    var p = (window.location.pathname || "").toLowerCase();
    var isActivity = /nice_list|adopt_reindeer|santa_frame|snowman_frame|snowman|elf_cam|colouring_page|bingo|door_hanger/.test(p);
    if (isActivity) {
      injectInAppNotice();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoAttachActivityNotice);
  } else {
    autoAttachActivityNotice();
  }

  window.TurboSantaDownload = {
    API_DOWNLOAD_URL: API_DOWNLOAD_URL,
    isInAppBrowser: isInAppBrowser,
    isIOS: isIOS,
    isAndroid: isAndroid,
    dataUrlToBlob: dataUrlToBlob,
    downloadFile: downloadFile,
    shareFile: shareFile,
    injectInAppNotice: injectInAppNotice
  };
})();
