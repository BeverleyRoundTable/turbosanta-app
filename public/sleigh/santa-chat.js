/* ============================================================
   TurboSanta — "Talk to Santa" Voice Hotline (Beverley Exclusive)
   Powered by ElevenLabs Conversational AI (@elevenlabs/convai-widget-embed)
   Dynamic Secret Lookup: looks up env.ELEVENLABS_AGENT_ID via Cloudflare Worker
   Full-Box Sizing: auto-expands to occupy 100% of the iframe/container viewport
   ============================================================ */

(function () {
  "use strict";

  var CONFIG = {
    // Default fallback agent ID
    agentId: "agent_4401kxaqcqygfb4940wnc4a9haeh",

    enabled: true,
    routeNightsOnly: false, // Accessible all season in modular embed
    routeDayHours: { start: "15:00", end: "21:30" },

    schedule: [],

    labels: {
      action: "Talk to Santa",
      start: "Ho ho ho — tap to talk!",
      end: "Back to Lapland"
    },

    avatarUrl: "",
    previewParam: "santa",
    workerApi: "https://turbosanta-api.beverley247.workers.dev"
  };

  var WIDGET_TAG = "elevenlabs-convai";
  var EMBED_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

  var SCRIPT = document.currentScript;
  var MOUNT = null;
  var OPTS = { always: true, width: "100%", height: "100%" };

  function resolveMountAndOpts() {
    MOUNT = document.getElementById("santa-chat-box");
    if (!MOUNT && SCRIPT && SCRIPT.dataset && SCRIPT.dataset.inline === "1") {
      MOUNT = SCRIPT.parentElement;
    }
    var d = (MOUNT && MOUNT.dataset) || (SCRIPT && SCRIPT.dataset) || {};
    if (d.always === "1" || param("always") === "1" || param("santa") === "1") OPTS.always = true;
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

  function resolveTableSlug() {
    return (param("table") || "beverley").toLowerCase().trim();
  }

  function hasPreviewFlag() {
    return param(CONFIG.previewParam) === "1" || param("always") === "1";
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function getTodayRoute(routes) {
    var today = todayISO();
    return (routes || []).find(function (r) { return r.date === today; }) || null;
  }

  function getNextRoute(routes) {
    var today = todayISO();
    return (routes || [])
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
      parts.push("The sleigh IS out tonight on the " + (todayRoute.routeName || todayRoute.name || "Beverley") + " route.");
      if (todayRoute.streets) parts.push("Streets tonight: " + todayRoute.streets + ".");
    } else {
      parts.push("The sleigh is not out tonight.");
    }
    if (nextRoute) {
      parts.push("Next visit: " + fmtDate(nextRoute.date) +
        (nextRoute.routeName || nextRoute.name ? " (" + (nextRoute.routeName || nextRoute.name) + " route)" : "") + ".");
    }
    return parts.join(" ") || lastRouteInfo;
  }

  /* Fetch agent ID from Cloudflare Secret (/api/santa-agent) with fallback to payload */
  function fetchAgentSecret(slug) {
    var url = CONFIG.workerApi + "/api/santa-agent?table=" + encodeURIComponent(slug);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Status " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok && data.agent_id) return data.agent_id;
        throw new Error("No agent_id returned");
      })
      .catch(function () {
        // Fallback to /api/payload
        var payloadUrl = CONFIG.workerApi + "/api/payload?table=" + encodeURIComponent(slug);
        return fetch(payloadUrl)
          .then(function (r) { return r.json(); })
          .then(function (d) {
            return (d && d.table && d.table.elevenlabs_agent_id) || CONFIG.agentId;
          })
          .catch(function () {
            return CONFIG.agentId;
          });
      });
  }

  function fetchRoutes(slug) {
    var payloadUrl = CONFIG.workerApi + "/api/payload?table=" + encodeURIComponent(slug);
    return fetch(payloadUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("API " + res.status);
        return res.json();
      })
      .then(function (data) { return data.routes || []; });
  }

  /* ---------- widget styling & injection ---------- */

  function ensureInlineStyle() {
    if (document.getElementById("santa-inline-style")) return;
    var style = document.createElement("style");
    style.id = "santa-inline-style";
    style.textContent =
      WIDGET_TAG + ".santa-inline {" +
      "position:absolute !important;inset:0 !important;display:block !important;" +
      "width:100% !important;height:100% !important;" +
      "--el-overlay-padding:8px !important;" +
      "--el-sheet-radius:24px !important;" +
      "}";
    document.head.appendChild(style);
  }

  function ensureShadowFillStyle(el) {
    if (!el) return;
    function injectStyle() {
      try {
        if (!el.shadowRoot) return false;
        var sheet = el.shadowRoot.querySelector(".sheet");
        if (sheet && !el.shadowRoot.getElementById("santa-fill-style")) {
          var s = document.createElement("style");
          s.id = "santa-fill-style";
          s.textContent =
            ".overlay {" +
            "  inset: 8px !important;" +
            "  right: 8px !important;" +
            "}" +
            ".sheet {" +
            "  width: 100% !important;" +
            "  max-width: 100% !important;" +
            "  height: 100% !important;" +
            "  max-height: 100% !important;" +
            "  border-radius: 24px !important;" +
            "}";
          el.shadowRoot.appendChild(s);
        }
        return true;
      } catch (e) { return false; }
    }

    var obs = null;
    var timer = setInterval(function () {
      if (el.shadowRoot) {
        injectStyle();
        if (!obs && window.MutationObserver) {
          obs = new MutationObserver(function () {
            injectStyle();
          });
          obs.observe(el.shadowRoot, { childList: true, subtree: true });
        }
      }
    }, 300);
  }

  function injectWidget(agentId) {
    if (injected) return;
    var finalAgentId = param("agent_id") || agentId || CONFIG.agentId;
    if (!finalAgentId || finalAgentId === "PASTE_AGENT_ID_HERE") {
      console.warn("[SantaChat] No agent ID set — widget not loaded.");
      return;
    }

    var el = document.createElement(WIDGET_TAG);
    el.setAttribute("agent-id", finalAgentId);

    // Safely inject dynamic variables if valid ASCII string
    if (lastRouteInfo && typeof lastRouteInfo === "string") {
      var cleanRoute = lastRouteInfo.replace(/[^\x20-\x7E]/g, "").trim();
      if (cleanRoute) {
        try {
          el.setAttribute("dynamic-variables", JSON.stringify({ route_info: cleanRoute }));
        } catch (e) {
          console.warn("[SantaChat] Dynamic variables error:", e);
        }
      }
    }

    if (CONFIG.labels.action) el.setAttribute("action-text", CONFIG.labels.action);
    if (CONFIG.labels.start) el.setAttribute("start-call-text", CONFIG.labels.start);
    if (CONFIG.labels.end) el.setAttribute("end-call-text", CONFIG.labels.end);
    if (CONFIG.avatarUrl) el.setAttribute("avatar-image-url", CONFIG.avatarUrl);

    if (MOUNT) {
      ensureInlineStyle();
      el.className = "santa-inline";
      el.setAttribute("placement", "bottom");
      MOUNT.appendChild(el);
      ensureShadowFillStyle(el);
    } else {
      document.body.appendChild(el);
    }

    var script = document.createElement("script");
    script.src = EMBED_SRC;
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    injected = true;
    console.info("[SantaChat] ElevenLabs ConvAI loaded (inline). Agent: " + finalAgentId);
  }

  function removeWidget() {
    var el = document.querySelector(WIDGET_TAG);
    if (el) el.remove();
    injected = false;
    console.info("[SantaChat] Widget removed.");
  }

  /* ---------- decide & init ---------- */

  function init() {
    if (param("driver") === "1" && !hasPreviewFlag()) return;

    var slug = resolveTableSlug();
    // Strictly isolate Santa Chat to Beverley
    if (slug !== "beverley" && !param("agent_id") && !hasPreviewFlag()) {
      console.info("[SantaChat] Santa Chat is exclusive to Beverley.");
      return;
    }

    resolveMountAndOpts();

    if (!CONFIG.enabled && !hasPreviewFlag()) {
      console.info("[SantaChat] Disabled.");
      return;
    }

    var gated = CONFIG.routeNightsOnly && !OPTS.always;

    // Fetch secret agent ID and routes in parallel
    Promise.all([
      fetchAgentSecret(slug),
      fetchRoutes(slug).catch(function () { return []; })
    ]).then(function (results) {
      var agentId = results[0];
      var routes = results[1] || [];

      var todayRoute = getTodayRoute(routes);
      var nextRoute = getNextRoute(routes);
      lastRouteInfo = buildRouteInfo(todayRoute, nextRoute);

      var show = hasPreviewFlag() || !gated ||
        (todayRoute && withinHours(CONFIG.routeDayHours)) ||
        OPTS.always || inManualWindow();

      if (show) {
        injectWidget(agentId);
      } else {
        console.info("[SantaChat] Hidden (no route tonight / outside hours). Append ?santa=1 to preview.");
      }
    }).catch(function (e) {
      console.warn("[SantaChat] Init error (" + e.message + ") — using fallback agent ID.");
      injectWidget(CONFIG.agentId);
    });
  }

  window.SantaChat = {
    show: function () { injectWidget(); },
    hide: removeWidget,
    status: function () {
      return {
        enabled: CONFIG.enabled,
        preview: hasPreviewFlag(),
        inline: !!MOUNT,
        always: OPTS.always,
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
