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
    workerApi: (typeof window !== "undefined" && (window.location.hostname.includes("roundtablesantasleigh.co.uk") || window.location.hostname.includes("pages.dev") || window.location.hostname.includes("localhost"))) ? window.location.origin : "https://roundtablesantasleigh.co.uk"
  };

  var KNOWN_AGENTS = {
    "beverley": "agent_4401kxaqcqygfb4940wnc4a9haeh",
    "abergavenny": "agent_2101m5d5sktze0rb4mchkhaz1aqj"
  };

  var WIDGET_TAG = "elevenlabs-convai";
  var EMBED_SRC = (window.location.origin.includes("localhost") || window.location.origin.includes("roundtablesantasleigh.co.uk") || window.location.origin.includes("pages.dev"))
    ? "/convai-widget-embed.js"
    : "https://roundtablesantasleigh.co.uk/convai-widget-embed.js";

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

  function buildRouteInfo(todayRoute, nextRoute, townName) {
    var town = townName || "town";
    var parts = [];
    if (todayRoute) {
      parts.push("The sleigh IS out tonight in " + town + " on the " + (todayRoute.routeName || todayRoute.name || "local") + " route.");
      if (todayRoute.start_time) parts.push("Approximate start time is " + todayRoute.start_time + ".");
      if (todayRoute.streets) parts.push("Streets tonight: " + todayRoute.streets + ".");
    } else {
      parts.push("The sleigh is not out in " + town + " tonight.");
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
            return (d && d.table && d.table.elevenlabs_agent_id) || (KNOWN_AGENTS && KNOWN_AGENTS[slug]) || CONFIG.agentId;
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
      .then(function (data) {
        if (data && data.table && data.table.logo_url) {
          var iconEl = document.getElementById("site-favicon") || document.querySelector("link[rel='icon']");
          if (iconEl && iconEl.href !== data.table.logo_url) iconEl.href = data.table.logo_url;
          var appleIconEl = document.getElementById("site-apple-touch-icon") || document.querySelector("link[rel='apple-touch-icon']");
          if (appleIconEl && appleIconEl.href !== data.table.logo_url) appleIconEl.href = data.table.logo_url;
        }
        return {
          routes: data.routes || [],
          table: data.table || {}
        };
      });
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

    if (injectStyle()) return;

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
    }, 50);

    setTimeout(function () { clearInterval(timer); }, 6000);
  }

  function injectWidget(agentId) {
    if (injected) return;
    var finalAgentId = param("agent_id") || agentId || (KNOWN_AGENTS && KNOWN_AGENTS[resolveTableSlug()]) || CONFIG.agentId;
    if (!finalAgentId || finalAgentId === "PASTE_AGENT_ID_HERE") {
      console.warn("[SantaChat] No agent ID set — widget not loaded.");
      return;
    }

    var el = document.querySelector(WIDGET_TAG);
    if (!el) {
      el = document.createElement(WIDGET_TAG);
      el.setAttribute("agent-id", finalAgentId);
      el.setAttribute("default-expanded", "true");
      el.setAttribute("always-expanded", "true");
      el.setAttribute("show-resize-button", "true");

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
    }

    if (!window.customElements || !window.customElements.get(WIDGET_TAG)) {
      if (!document.querySelector('script[src*="convai-widget"]')) {
        var script = document.createElement("script");
        script.src = EMBED_SRC;
        script.async = true;
        script.type = "text/javascript";
        document.head.appendChild(script);
      }
    }

    injected = true;
    console.info("[SantaChat] ElevenLabs ConvAI loaded (instant). Agent: " + finalAgentId);
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

    resolveMountAndOpts();

    if (!CONFIG.enabled && !hasPreviewFlag()) {
      console.info("[SantaChat] Disabled.");
      return;
    }

    var gated = CONFIG.routeNightsOnly && !OPTS.always;
    var show = hasPreviewFlag() || !gated || OPTS.always || inManualWindow();
    if (!show) return;

    var initialAgentId = param("agent_id") || (KNOWN_AGENTS && KNOWN_AGENTS[slug]) || CONFIG.agentId;

    // Fast sync: resolve agent ID & route info before mounting to prevent
    // mid-call attribute mutations from terminating active conversations.
    var syncTimeout = setTimeout(function () {
      if (!injected) {
        injectWidget(initialAgentId);
      }
    }, 1000);

    Promise.all([
      fetchAgentSecret(slug).catch(function () { return initialAgentId; }),
      fetchRoutes(slug).catch(function () { return { routes: [], table: {} }; })
    ]).then(function (results) {
      clearTimeout(syncTimeout);
      var agentId = results[0] || initialAgentId;
      var routeData = results[1] || {};
      var routes = routeData.routes || [];
      var table = routeData.table || {};

      var rawTown = (table.name || slug || "Round Table")
        .replace(/santa'?s?/i, "")
        .replace(/sleigh/i, "")
        .replace(/round\s+table/i, "")
        .trim();
      var townName = rawTown ? (rawTown.charAt(0).toUpperCase() + rawTown.slice(1)) : (slug.charAt(0).toUpperCase() + slug.slice(1));

      var todayRoute = getTodayRoute(routes);
      var nextRoute = getNextRoute(routes);
      lastRouteInfo = buildRouteInfo(todayRoute, nextRoute, townName);

      var shouldShow = hasPreviewFlag() || !gated ||
        (todayRoute && withinHours(CONFIG.routeDayHours)) ||
        OPTS.always || inManualWindow();

      if (shouldShow) {
        if (!injected) {
          injectWidget(agentId);
        }
      } else if (injected) {
        removeWidget();
      }
    }).catch(function (e) {
      clearTimeout(syncTimeout);
      console.warn("[SantaChat] Background sync error:", e);
      if (!injected) {
        injectWidget(initialAgentId);
      }
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
