/* ============================================================
   TurboSanta — "Talk to Santa" widget loader  v3.1
   ElevenLabs Agents integration — tracker + Carrd embeds
   ------------------------------------------------------------
   TRACKER (floating bubble, route-night gated):
     <script src="/sleigh/santa-chat.js" defer></script>

   CARRD "Chat" SECTION (open box inside the section):
     <div id="santa-chat-box" data-always="1"
          style="max-width:420px;margin:0 auto;min-height:520px;"></div>
     <script src="https://brt-23f.pages.dev/sleigh/santa-chat.js" defer></script>

   The loader mounts into #santa-chat-box if it exists anywhere
   on the page (Carrd-safe — Carrd relocates embed scripts, so
   attributes on the div, not the script tag). Options on the div:
     data-always="1"     available any time (ignore route gating)
     data-width/-height  box size (default 400px / 500px)

   No #santa-chat-box div = floating corner bubble (tracker mode).
   Driver satnav URLs (?driver=1) are always skipped.
   ============================================================ */

(function () {
  "use strict";

  var CONFIG = {
    agentId: "agent_4401kxaqcqygfb4940wnc4a9haeh",

    // Master switch. False = widget never loads anywhere.
    enabled: true,

    // Tracker Apps Script endpoint. Used for route-night gating
    // and for telling Santa tonight's route. If empty, the
    // page's ?api= parameter is used instead.
    apiUrl: "https://script.google.com/macros/s/AKfycbwl88G_1QGwp6uN1JEGV2Abd7FAwQg7Id3_ufSNW_n1e7rsPAw-ZUor5vlqL8_GBfCK/exec",

    // true  = floating widget only appears on route days
    //         (data-always="1" overrides this per embed)
    routeNightsOnly: true,

    // On route days, when is Santa taking calls? (local time)
    routeDayHours: { start: "15:00", end: "21:30" },

    // Manual fallback windows if the API is unreachable.
    // Empty = always available while enabled.
    schedule: [],

    labels: {
      action: "Talk to Santa",
      start: "Ho ho ho — tap to talk!",
      end: "Back to Lapland"
    },

    // Optional https:// image for the floating button. Leave ""
    // to use the avatar set in the ElevenLabs Widget tab.
    avatarUrl: "",

    // ?santa=1 forces the widget on for testing.
    previewParam: "santa"
  };

  var WIDGET_TAG = "elevenlabs-convai";
  var EMBED_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

  // Per-embed options. Carrd relocates embed scripts (currentScript
  // becomes null), so the mount div is the reliable carrier.
  var SCRIPT = document.currentScript; // may be null — fallback only
  var MOUNT = null;
  var OPTS = { always: false, width: "100%", height: "500px" };

  function resolveMountAndOpts() {
    MOUNT = document.getElementById("santa-chat-box");
    if (!MOUNT && SCRIPT && SCRIPT.dataset && SCRIPT.dataset.inline === "1") {
      MOUNT = SCRIPT.parentElement;
    }
    var d = (MOUNT && MOUNT.dataset) || (SCRIPT && SCRIPT.dataset) || {};
    if (d.always === "1") OPTS.always = true;
    if (d.width) OPTS.width = d.width;
    if (d.height) OPTS.height = d.height;
  }

  var injected = false;
  var lastRouteInfo = "Route details unavailable — check the tracker map with a grown-up.";

  /* ---------- helpers ---------- */

  function param(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) { return null; }
  }

  function resolveApiUrl() {
    return CONFIG.apiUrl || param("api") || "";
  }

  function hasPreviewFlag() {
    return param(CONFIG.previewParam) === "1";
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10); // matches God Mode convention
  }

  function getTodayRoute(routes) {
    var today = todayISO();
    return routes.find(function (r) { return r.date === today; }) || null;
  }

  function getNextRoute(routes) {
    var today = todayISO();
    return routes
      .filter(function (r) { return r.date && r.date > today; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); })[0] || null;
  }

  function fmtDate(d) {
    var dt = new Date(d + "T00:00:00");
    return isNaN(dt) ? d : dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  function withinHours(hours) {
    var now = new Date();
    var hm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
    return hm >= hours.start && hm <= hours.end;
  }

  function inManualWindow() {
    if (!CONFIG.schedule || CONFIG.schedule.length === 0) return true;
    var now = new Date();
    return CONFIG.schedule.some(function (w) {
      var s = new Date(w.start), e = new Date(w.end);
      return !isNaN(s) && !isNaN(e) && now >= s && now <= e;
    });
  }

  function buildRouteInfo(todayRoute, nextRoute) {
    var parts = [];
    if (todayRoute) {
      parts.push("The sleigh IS out tonight on the " + (todayRoute.routeName || "Beverley") + " route.");
      if (todayRoute.streets) parts.push("Streets tonight: " + todayRoute.streets + ".");
    } else {
      parts.push("The sleigh is not out tonight.");
    }
    if (nextRoute) {
      parts.push("Next visit: " + fmtDate(nextRoute.date) +
        (nextRoute.routeName ? " (" + nextRoute.routeName + " route)" : "") + ".");
    }
    return parts.join(" ") || lastRouteInfo;
  }

  function fetchRoutes(apiUrl) {
    return fetch(apiUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("API " + res.status);
        return res.json();
      })
      .then(function (data) { return data.routes || []; });
  }

  /* ---------- widget ---------- */

  function ensureInlineStyle() {
    if (document.getElementById("santa-inline-style")) return;
    var style = document.createElement("style");
    style.id = "santa-inline-style";
    style.textContent =
      WIDGET_TAG + ".santa-inline{" +
      "position:relative !important;inset:auto !important;display:block;" +
      "--elevenlabs-convai-widget-width:" + OPTS.width + ";" +
      "--elevenlabs-convai-widget-height:" + OPTS.height + ";}";
    document.head.appendChild(style);
  }

  function injectWidget() {
    if (injected) return;
    if (!CONFIG.agentId || CONFIG.agentId === "PASTE_AGENT_ID_HERE") {
      console.warn("[SantaChat] No agent ID set — widget not loaded.");
      return;
    }

    var el = document.createElement(WIDGET_TAG);
    el.setAttribute("agent-id", CONFIG.agentId);
    el.setAttribute("dynamic-variables", JSON.stringify({ route_info: lastRouteInfo }));
    if (CONFIG.labels.action) el.setAttribute("action-text", CONFIG.labels.action);
    if (CONFIG.labels.start) el.setAttribute("start-call-text", CONFIG.labels.start);
    if (CONFIG.labels.end) el.setAttribute("end-call-text", CONFIG.labels.end);
    if (CONFIG.avatarUrl) el.setAttribute("avatar-image-url", CONFIG.avatarUrl);

    if (MOUNT) {
      // Inline mode: open box where the embed sits
      ensureInlineStyle();
      el.className = "santa-inline";
      el.setAttribute("variant", "expanded");
      MOUNT.appendChild(el);
    } else {
      // Floating mode: corner bubble
      document.body.appendChild(el);
    }

    var script = document.createElement("script");
    script.src = EMBED_SRC;
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    injected = true;
    console.info("[SantaChat] Widget loaded (" + (MOUNT ? "inline" : "floating") + "). route_info: " + lastRouteInfo);
  }

  function removeWidget() {
    var el = document.querySelector(WIDGET_TAG);
    if (el) el.remove();
    injected = false;
    console.info("[SantaChat] Widget removed.");
  }

  /* ---------- decide & init ---------- */

  function init() {
    // Never load over the driver's satnav view
    if (param("driver") === "1" && !hasPreviewFlag()) return;

    resolveMountAndOpts();

    if (!CONFIG.enabled && !hasPreviewFlag()) {
      console.info("[SantaChat] Disabled.");
      return;
    }

    var apiUrl = resolveApiUrl();
    var gated = CONFIG.routeNightsOnly && !OPTS.always;

    if (!apiUrl) {
      if (hasPreviewFlag() || !gated || inManualWindow()) injectWidget();
      else console.info("[SantaChat] Hidden (no API, manual schedule). Append ?santa=1 to preview.");
      return;
    }

    fetchRoutes(apiUrl)
      .then(function (routes) {
        var todayRoute = getTodayRoute(routes);
        var nextRoute = getNextRoute(routes);
        lastRouteInfo = buildRouteInfo(todayRoute, nextRoute);

        var show = hasPreviewFlag() || !gated ||
          (todayRoute && withinHours(CONFIG.routeDayHours));

        if (show) injectWidget();
        else console.info("[SantaChat] Hidden (no route tonight / outside hours). Append ?santa=1 to preview.");
      })
      .catch(function (e) {
        console.warn("[SantaChat] API unreachable (" + e.message + ") — fallback behaviour.");
        if (hasPreviewFlag() || !gated || inManualWindow()) injectWidget();
      });
  }

  /* Public hooks — ready for God Mode wiring:
       SantaChat.show() / SantaChat.hide() / SantaChat.status() */
  window.SantaChat = {
    show: injectWidget,
    hide: removeWidget,
    status: function () {
      return {
        enabled: CONFIG.enabled,
        preview: hasPreviewFlag(),
        inline: !!MOUNT,
        always: OPTS.always,
        apiUrl: resolveApiUrl() || "(none)",
        routeInfo: lastRouteInfo,
        injected: injected
      };
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
