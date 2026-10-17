/* ============================================================
   TurboSanta — Embed Theme & Dynamic Resize Engine v1.0
   Enforces:
     1. Strict Brand Color Harmony (primary, accent, gold, red)
     2. Zero-Scroll Dynamic Parent Resizing via postMessage
     3. Streamlined Embedded Layout (removes duplicate hero headers)
     4. Brand Typography & Zero Emojis in Controls
   ============================================================ */

(function () {
  "use strict";

  // 1. Detect Environment & Table Parameters
  var params = new URLSearchParams(window.location.search);
  var isEmbedded = (window.self !== window.top) || params.get("embed") === "1";
  var prefetched = window.__sleighPrefetchedData && window.__sleighPrefetchedData.table;

  var primaryColor = params.get("primary") || (prefetched && prefetched.primary_color) || "#D31C1C";
  var accentColor = params.get("accent") || (prefetched && prefetched.accent_color) || "#FBAF33";

  // Sanitize hex colors
  if (!primaryColor.startsWith("#")) primaryColor = "#" + primaryColor;
  if (!accentColor.startsWith("#")) accentColor = "#" + accentColor;

  // 2. Inject Harmonious Theme Styles
  var style = document.createElement("style");
  style.id = "ts-embed-theme-styles";
  style.textContent = `
    :root {
      --primary: ${primaryColor};
      --accent: ${accentColor};
      --gold: ${accentColor};
      --gold-glow: ${accentColor}40;
      --gold-dim: ${accentColor}1f;
      --red: ${primaryColor};
      --border-gold: ${accentColor}33;
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

    /* Clean typography & button styling */
    .btn-gold, .btn-primary, .random-btn {
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      font-weight: 700 !important;
    }
  `;
  document.head.appendChild(style);

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

  // 3. Scrub Emojis from Headers and Buttons for strict brand guidelines
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
        if (n.closest && (n.closest(".preview-area") || n.closest(".cert-content") || n.closest("#renderArea"))) return;
        var children = n.childNodes;
        for (var i = 0; i < children.length; i++) {
          scrubNode(children[i]);
        }
      }
    }
    targets.forEach(function (el) {
      if (el.closest && (el.closest(".preview-area") || el.closest(".cert-content") || el.closest("#renderArea"))) return;
      scrubNode(el);
    });
  }

  // 4. Dynamic Zero-Scroll Content Height Messenger
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
      var style = window.getComputedStyle(container);
      var mt = parseFloat(style.marginTop) || 0;
      var mb = parseFloat(style.marginBottom) || 0;
      var bs = window.getComputedStyle(document.body);
      var pt = parseFloat(bs.paddingTop) || 0;
      var pb = parseFloat(bs.paddingBottom) || 0;
      return Math.ceil(rect.height + mt + mb + pt + pb + 12);
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
    currentHeight = Math.min(currentHeight, 960);

    // Only post if height changed significantly (>= 16px) to break recursive loops
    if (Math.abs(currentHeight - lastSentHeight) >= 16) {
      lastSentHeight = currentHeight;
      window.parent.postMessage({
        type: "turbosanta-resize",
        height: currentHeight,
        path: window.location.pathname
      }, "*");
    }
  }

  // Bind observers for continuous zero-scroll adaptability
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
    primaryColor: primaryColor,
    accentColor: accentColor
  };
})();
