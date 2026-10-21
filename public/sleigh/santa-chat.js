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
    var p = param("table");
    if (p) return p.toLowerCase().trim();
    try {
      var host = window.location.hostname.toLowerCase();
      if (host.endsWith(".roundtablesantasleigh.co.uk")) {
        var sub = host.replace(".roundtablesantasleigh.co.uk", "").split(".")[0];
        if (sub && sub !== "www" && sub !== "api" && sub !== "admin") {
          return sub;
        }
      }
      var parts = host.split(".");
      if (parts.length > 2 && !host.includes("pages.dev") && !host.includes("workers.dev") && !host.includes("localhost")) {
        if (parts[0] && parts[0] !== "www") return parts[0];
      }
    } catch (e) {}
    return "beverley";
  }

  function cleanText(str) {
    if (!str) return "";
    return String(str)
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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

  function buildRouteInfo(routes, streets, townName) {
    var town = townName || "town";
    var streetList = streets || [];
    var routeList = routes || [];

    // Map streets by route_id
    var streetsByRoute = {};
    for (var i = 0; i < streetList.length; i++) {
      var s = streetList[i];
      if (!s || !s.route_id || !s.street_name) continue;
      if (!streetsByRoute[s.route_id]) streetsByRoute[s.route_id] = [];
      var name = cleanText(s.street_name);
      if (name && streetsByRoute[s.route_id].indexOf(name) === -1) {
        streetsByRoute[s.route_id].push(name);
      }
    }

    // Also include any inline streets defined directly on the route object
    for (var j = 0; j < routeList.length; j++) {
      var r = routeList[j];
      if (r && r.id && r.streets && typeof r.streets === "string" && r.streets.trim()) {
        if (!streetsByRoute[r.id]) streetsByRoute[r.id] = [];
        var extra = r.streets.split(/[,;\n\r]+/);
        for (var k = 0; k < extra.length; k++) {
          var ename = cleanText(extra[k]);
          if (ename && streetsByRoute[r.id].indexOf(ename) === -1) {
            streetsByRoute[r.id].push(ename);
          }
        }
      }
    }

    var today = todayISO();
    var sortedRoutes = routeList.slice().sort(function (a, b) {
      return (a.date || "").localeCompare(b.date || "");
    });
    var todayRoute = sortedRoutes.find(function (item) { return item.date === today; });

    var parts = [];
    if (todayRoute) {
      var tName = cleanText(todayRoute.name || todayRoute.routeName || "local");
      var tTime = todayRoute.start_time ? " starting around " + cleanText(todayRoute.start_time) : "";
      parts.push("TONIGHT: The sleigh IS out visiting " + town + " tonight on the '" + tName + "' route" + tTime + ".");
      var tStreets = (streetsByRoute[todayRoute.id] || []).join(", ");
      if (tStreets) {
        parts.push("Streets visited tonight: " + tStreets + ".");
      }
    } else {
      parts.push("TONIGHT: The sleigh is not out in " + town + " tonight.");
    }

    if (sortedRoutes.length > 0) {
      var summaries = [];
      for (var m = 0; m < sortedRoutes.length; m++) {
        var rt = sortedRoutes[m];
        var rtName = cleanText(rt.name || rt.routeName || "Route");
        var rtDate = fmtDate(rt.date);
        var rtTime = rt.start_time ? " (starts " + cleanText(rt.start_time) + ")" : "";
        var rtStreets = (streetsByRoute[rt.id] || []).join(", ");
        summaries.push(rtDate + " - " + rtName + rtTime + ": " + (rtStreets || "Check tracker map"));
      }
      parts.push("FULL " + town.toUpperCase() + " SCHEDULE & STREETS: " + summaries.join(" | ") + ".");
      parts.push("When asked when Santa visits a street, tell the child the exact scheduled date, route name, and start time above. If their street is not on this schedule, say the elves plan new streets every year and to watch the live tracker map with a grown-up.");
    } else {
      parts.push("The elves are still finalizing the route schedule for " + town + " — please check the tracker map.");
    }

    return parts.join(" ");
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
          streets: data.streets || [],
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
    var finalAgentId = param("agent_id") || agentId || (KNOWN_AGENTS && KNOWN_AGENTS[resolveTableSlug()]) || CONFIG.agentId;
    if (!finalAgentId || finalAgentId === "PASTE_AGENT_ID_HERE") {
      console.warn("[SantaChat] No agent ID set — widget not loaded.");
      return;
    }

    var cleanRoute = cleanText(lastRouteInfo);
    var el = document.querySelector(WIDGET_TAG);
    if (!el) {
      el = document.createElement(WIDGET_TAG);
      el.setAttribute("agent-id", finalAgentId);
      el.setAttribute("default-expanded", "true");
      el.setAttribute("always-expanded", "true");
      el.setAttribute("show-resize-button", "true");

      if (cleanRoute) {
        try {
          el.setAttribute("dynamic-variables", JSON.stringify({ route_info: cleanRoute }));
        } catch (e) {
          console.warn("[SantaChat] Dynamic variables error:", e);
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
    } else {
      if (finalAgentId && el.getAttribute("agent-id") !== finalAgentId) {
        el.setAttribute("agent-id", finalAgentId);
      }
      if (cleanRoute) {
        try {
          el.setAttribute("dynamic-variables", JSON.stringify({ route_info: cleanRoute }));
        } catch (e) {}
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
    console.info("[SantaChat] ElevenLabs ConvAI loaded. Agent: " + finalAgentId + ", Route info length: " + cleanRoute.length);
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

    // Safety timeout in case network stalls completely: 3500ms
    var syncTimeout = setTimeout(function () {
      if (!injected) {
        console.warn("[SantaChat] Timeout fallback — injecting widget with fallback agent ID");
        injectWidget(initialAgentId);
      }
    }, 3500);

    Promise.all([
      fetchAgentSecret(slug).catch(function () { return initialAgentId; }),
      fetchRoutes(slug).catch(function () { return { routes: [], streets: [], table: {} }; })
    ]).then(function (results) {
      clearTimeout(syncTimeout);
      var agentId = results[0] || initialAgentId;
      var routeData = results[1] || {};
      var routes = routeData.routes || [];
      var streets = routeData.streets || [];
      var table = routeData.table || {};

      var rawTown = (table.name || slug || "Round Table")
        .replace(/santa'?s?/i, "")
        .replace(/sleigh/i, "")
        .replace(/round\s+table/i, "")
        .trim();
      var townName = rawTown ? (rawTown.charAt(0).toUpperCase() + rawTown.slice(1)) : (slug.charAt(0).toUpperCase() + slug.slice(1));

      var todayRoute = getTodayRoute(routes);
      lastRouteInfo = buildRouteInfo(routes, streets, townName);

      var shouldShow = hasPreviewFlag() || !gated ||
        (todayRoute && withinHours(CONFIG.routeDayHours)) ||
        OPTS.always || inManualWindow();

      if (shouldShow) {
        injectWidget(agentId);
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
