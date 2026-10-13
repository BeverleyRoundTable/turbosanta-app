/* ============================================================
   TurboSanta — "Talk to Santa" Voice & Chat Loader v4.0
   Dual-Engine Architecture:
     1. ElevenLabs Agents (Personal / Beverley mode)
     2. Google Gemini Flash 3.8 Voice Santa (Fleet mode for all tables)
   ------------------------------------------------------------
   TRACKER (floating bubble, route-night gated):
     <script src="/santa-chat.js" defer></script>

   CARRD / EMBED / FULL SECTION (mount box inside the page):
     <div id="santa-chat-box" data-always="1"
          style="max-width:460px;margin:0 auto;min-height:520px;"></div>
     <script src="/santa-chat.js" defer></script>

   Query parameters:
     ?provider=gemini        force Gemini 3.8 Flash Voice Santa
     ?provider=elevenlabs    force ElevenLabs agent widget
     ?agent_id=...           override ElevenLabs Agent ID
     ?table=beverley         load specific table schedule and context
     ?santa=1 / ?always=1    bypass route hours gating (test mode)
   ============================================================ */

(function () {
  "use strict";

  var CONFIG = {
    // ElevenLabs Agent ID (loaded dynamically from D1 table config, or ?agent_id= param)
    agentId: "",

    enabled: true,
    routeNightsOnly: true,
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

  var ELEVENLABS_TAG = "elevenlabs-convai";
  var ELEVENLABS_SCRIPT = "https://unpkg.com/@elevenlabs/convai-widget-embed";

  var SCRIPT = document.currentScript;
  var MOUNT = null;
  var OPTS = { always: false, width: "100%", height: "520px" };

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
  var activeEngine = null;
  var lastRouteInfo = "Route details unavailable — check the tracker map with a grown-up.";
  var tablePayload = null;

  /* ---------- helpers ---------- */

  function param(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) { return null; }
  }

  function resolveTableSlug() {
    return param("table") || "beverley";
  }

  function resolveAgentId() {
    return param("agent_id") || (tablePayload && tablePayload.table && tablePayload.table.elevenlabs_agent_id) || CONFIG.agentId;
  }

  function resolveApiUrl() {
    var tableParam = resolveTableSlug();
    return CONFIG.workerApi + "/api/payload?table=" + encodeURIComponent(tableParam);
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

  function buildRouteInfo(todayRoute, nextRoute, town) {
    var parts = [];
    var area = town || "Beverley";
    if (todayRoute) {
      parts.push("The sleigh IS out tonight on the " + (todayRoute.name || area) + " route.");
      if (todayRoute.streets) parts.push("Streets tonight: " + todayRoute.streets + ".");
    } else {
      parts.push("The sleigh is not out tonight.");
    }
    if (nextRoute) {
      parts.push("Next visit: " + fmtDate(nextRoute.date) +
        (nextRoute.name ? " (" + nextRoute.name + " route)" : "") + ".");
    }
    return parts.join(" ") || lastRouteInfo;
  }

  function fetchPayload(apiUrl) {
    return fetch(apiUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("API " + res.status);
        return res.json();
      })
      .then(function (data) {
        tablePayload = data;
        return data;
      });
  }

  /* ============================================================
     ENGINE 1: ELEVENLABS AGENTS (Personal / Beverley default)
     ============================================================ */

  function ensureElevenLabsInlineStyle() {
    if (document.getElementById("santa-elevenlabs-inline-style")) return;
    var style = document.createElement("style");
    style.id = "santa-elevenlabs-inline-style";
    style.textContent =
      ELEVENLABS_TAG + ".santa-inline{" +
      "position:absolute !important;inset:0 !important;display:block !important;" +
      "width:100% !important;height:100% !important;}";
    document.head.appendChild(style);
  }

  function injectElevenLabsWidget() {
    if (injected) return;
    var currentAgentId = resolveAgentId();
    if (!currentAgentId || currentAgentId === "PASTE_AGENT_ID_HERE") {
      console.warn("[SantaChat] No ElevenLabs agent ID configured — defaulting to Gemini Voice Santa.");
      injectGeminiVoiceWidget(tablePayload);
      return;
    }

    var el = document.createElement(ELEVENLABS_TAG);
    el.setAttribute("agent-id", currentAgentId);
    el.setAttribute("dynamic-variables", JSON.stringify({ route_info: lastRouteInfo }));
    if (CONFIG.labels.action) el.setAttribute("action-text", CONFIG.labels.action);
    if (CONFIG.labels.start) el.setAttribute("start-call-text", CONFIG.labels.start);
    if (CONFIG.labels.end) el.setAttribute("end-call-text", CONFIG.labels.end);
    if (CONFIG.avatarUrl) el.setAttribute("avatar-image-url", CONFIG.avatarUrl);

    if (MOUNT) {
      ensureElevenLabsInlineStyle();
      el.className = "santa-inline";
      el.setAttribute("placement", "bottom");
      MOUNT.appendChild(el);
    } else {
      document.body.appendChild(el);
    }

    var script = document.createElement("script");
    script.src = ELEVENLABS_SCRIPT;
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    injected = true;
    activeEngine = "elevenlabs";
    console.info("[SantaChat] ElevenLabs Widget loaded (" + (MOUNT ? "inline" : "floating") + "). Agent: " + currentAgentId);
  }

  /* ============================================================
     ENGINE 2: GOOGLE GEMINI FLASH 3.8 VOICE SANTA (Fleet Default)
     ============================================================ */

  function ensureGeminiVoiceStyles() {
    if (document.getElementById("santa-gemini-styles")) return;
    var style = document.createElement("style");
    style.id = "santa-gemini-styles";
    style.textContent = `
      .ts-santa-card {
        background: radial-gradient(circle at 50% 0%, #2a2a22 0%, #151513 80%);
        border: 2px solid #FBAF33;
        border-radius: 20px;
        box-shadow: 0 15px 45px rgba(0,0,0,0.7), 0 0 25px rgba(251, 175, 51, 0.2);
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        width: 100%;
        max-width: 480px;
        margin: 0 auto;
        box-sizing: border-box;
      }
      .ts-santa-card * { box-sizing: border-box; }
      .ts-header {
        background: linear-gradient(180deg, rgba(211, 28, 28, 0.3) 0%, rgba(21, 21, 19, 0) 100%);
        padding: 18px 20px 12px;
        text-align: center;
        border-bottom: 1px solid rgba(251, 175, 51, 0.2);
        position: relative;
      }
      .ts-avatar-wrap {
        position: relative;
        display: inline-block;
        margin-bottom: 8px;
      }
      .ts-avatar {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        background: #111;
        border: 3px solid #FBAF33;
        box-shadow: 0 0 16px rgba(251, 175, 51, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 34px;
        margin: 0 auto;
      }
      .ts-status-dot {
        position: absolute;
        bottom: 2px;
        right: 4px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #22c55e;
        border: 2px solid #151513;
        box-shadow: 0 0 8px #22c55e;
      }
      .ts-title {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #fff;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      }
      .ts-subtitle {
        margin: 4px 0 0;
        font-size: 12px;
        color: #FBAF33;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .ts-route-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(251, 175, 51, 0.3);
        border-radius: 12px;
        padding: 5px 12px;
        font-size: 11px;
        color: #e5e7eb;
        margin-top: 8px;
        max-width: 90%;
        line-height: 1.3;
      }
      .ts-dialog-area {
        flex: 1;
        padding: 16px 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 200px;
        max-height: 320px;
      }
      .ts-bubble {
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.45;
        max-width: 90%;
        animation: tsFadeIn 0.25s ease-out;
      }
      .ts-bubble.santa {
        align-self: flex-start;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(251, 175, 51, 0.25);
        color: #fff;
        border-bottom-left-radius: 4px;
      }
      .ts-bubble.user {
        align-self: flex-end;
        background: #FBAF33;
        color: #000;
        font-weight: 600;
        border-bottom-right-radius: 4px;
      }
      .ts-controls {
        padding: 16px 20px 20px;
        background: rgba(0,0,0,0.35);
        border-top: 1px solid rgba(255,255,255,0.06);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .ts-mic-btn {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        background: linear-gradient(135deg, #d31c1c 0%, #FBAF33 100%);
        border: 3px solid #fff;
        box-shadow: 0 6px 20px rgba(211, 28, 28, 0.5), 0 0 15px rgba(251, 175, 51, 0.3);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
        outline: none;
        user-select: none;
      }
      .ts-mic-btn:hover {
        transform: scale(1.05);
      }
      .ts-mic-btn:active {
        transform: scale(0.96);
      }
      .ts-mic-btn.listening {
        background: #d31c1c;
        animation: tsPulse 1.2s infinite;
      }
      .ts-mic-btn.speaking {
        background: #22c55e;
        border-color: #FBAF33;
        animation: tsPulseGreen 1.2s infinite;
      }
      .ts-mic-btn.thinking {
        background: #4b5563;
        cursor: wait;
      }
      .ts-status-label {
        font-size: 13px;
        font-weight: 700;
        color: #FBAF33;
        letter-spacing: 0.3px;
        text-align: center;
        min-height: 18px;
      }
      .ts-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 4px;
      }
      .ts-chip {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #d1d5db;
        border-radius: 14px;
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .ts-chip:hover {
        background: rgba(251, 175, 51, 0.2);
        color: #FBAF33;
        border-color: #FBAF33;
      }
      .ts-text-fallback {
        width: 100%;
        display: flex;
        gap: 8px;
        margin-top: 6px;
      }
      .ts-text-fallback input {
        flex: 1;
        background: #1c1c18;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        padding: 8px 12px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }
      .ts-text-fallback input:focus {
        border-color: #FBAF33;
      }
      .ts-text-fallback button {
        background: #FBAF33;
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 0 14px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
      }
      @keyframes tsPulse {
        0% { box-shadow: 0 0 0 0 rgba(211, 28, 28, 0.7); }
        70% { box-shadow: 0 0 0 16px rgba(211, 28, 28, 0); }
        100% { box-shadow: 0 0 0 0 rgba(211, 28, 28, 0); }
      }
      @keyframes tsPulseGreen {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        70% { box-shadow: 0 0 0 16px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }
      @keyframes tsFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .ts-floating-launcher {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: linear-gradient(135deg, #d31c1c 0%, #FBAF33 100%);
        color: #000;
        border: none;
        border-radius: 50px;
        padding: 14px 22px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        font-size: 15px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 8px 30px rgba(251, 175, 51, 0.4);
        cursor: pointer;
        z-index: 99999;
      }
    `;
    document.head.appendChild(style);
  }

  function injectGeminiVoiceWidget(payload) {
    if (injected) return;
    ensureGeminiVoiceStyles();

    var slug = resolveTableSlug();
    var tableInfo = (payload && payload.table) || {};
    var town = (tableInfo.sleigh_display_name || tableInfo.name || slug).replace(/Round Table.*$/i, '').trim() || slug;
    var routes = (payload && payload.routes) || [];
    var todayRoute = getTodayRoute(routes);
    var nextRoute = getNextRoute(routes);

    var routeBadgeText = todayRoute
      ? "🛷 Out tonight on the " + (todayRoute.name || "sleigh") + " route!"
      : (nextRoute ? "📅 Next sleigh visit: " + fmtDate(nextRoute.date) : "✨ Resting in Lapland workshop");

    // Conversation state
    var history = [];
    var turnCount = 0;
    var maxTurns = 4;
    var isListening = false;
    var isSpeaking = false;
    var isThinking = false;
    var recognition = null;

    // Speech Recognition setup
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-GB";
      } catch (e) {
        recognition = null;
      }
    }

    // Build DOM structure
    var card = document.createElement("div");
    card.className = "ts-santa-card";

    card.innerHTML = `
      <div class="ts-header">
        <div class="ts-avatar-wrap">
          <div class="ts-avatar">🎅</div>
          <div class="ts-status-dot" title="Connected to Lapland"></div>
        </div>
        <h3 class="ts-title">Talk to Santa</h3>
        <div class="ts-subtitle">${town} Round Table Sleigh</div>
        <div class="ts-route-badge">${routeBadgeText}</div>
      </div>

      <div class="ts-dialog-area" id="ts-dialog-area">
        <div class="ts-bubble santa">
          Ho ho ho! Merry Christmas! I am Santa speaking to you live from Lapland! 
          Tap the big golden microphone below to speak with me!
        </div>
      </div>

      <div class="ts-controls">
        <button type="button" class="ts-mic-btn" id="ts-mic-btn" aria-label="Tap to speak with Santa">
          🎙️
        </button>
        <div class="ts-status-label" id="ts-status-label">Tap microphone to speak</div>

        <div class="ts-chips">
          <button type="button" class="ts-chip" data-q="When is Santa visiting my street?">When are you on my street?</button>
          <button type="button" class="ts-chip" data-q="How are Rudolph and the reindeer doing?">How is Rudolph?</button>
          <button type="button" class="ts-chip" data-q="What are the elves making in the workshop?">What are the elves making?</button>
        </div>

        <form class="ts-text-fallback" id="ts-text-form">
          <input type="text" id="ts-text-input" placeholder="Or type a question for Santa..." maxlength="120" />
          <button type="submit">Ask</button>
        </form>
      </div>
    `;

    if (MOUNT) {
      MOUNT.innerHTML = "";
      MOUNT.appendChild(card);
    } else {
      // Floating launcher button
      var launcher = document.createElement("button");
      launcher.className = "ts-floating-launcher";
      launcher.innerHTML = "<span>🎅</span><span>Talk to Santa</span>";
      document.body.appendChild(launcher);

      var modalOverlay = document.createElement("div");
      modalOverlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:100000;display:none;align-items:center;justify-content:center;padding:16px;";
      modalOverlay.appendChild(card);
      document.body.appendChild(modalOverlay);

      launcher.onclick = function () {
        modalOverlay.style.display = "flex";
      };
      modalOverlay.onclick = function (e) {
        if (e.target === modalOverlay) {
          modalOverlay.style.display = "none";
          if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
      };
    }

    injected = true;
    activeEngine = "gemini";

    // References
    var dialogArea = card.querySelector("#ts-dialog-area");
    var micBtn = card.querySelector("#ts-mic-btn");
    var statusLabel = card.querySelector("#ts-status-label");
    var textForm = card.querySelector("#ts-text-form");
    var textInput = card.querySelector("#ts-text-input");

    function addBubble(role, text) {
      var b = document.createElement("div");
      b.className = "ts-bubble " + role;
      b.textContent = text;
      dialogArea.appendChild(b);
      dialogArea.scrollTop = dialogArea.scrollHeight;
    }

    function setStatus(text, stateClass) {
      statusLabel.textContent = text;
      micBtn.className = "ts-mic-btn" + (stateClass ? " " + stateClass : "");
    }

    function speakSanta(text, callback) {
      if (!window.speechSynthesis) {
        if (callback) callback();
        return;
      }
      window.speechSynthesis.cancel();
      var utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.88;
      utt.pitch = 0.82; // Deep, warm Santa voice

      var voices = window.speechSynthesis.getVoices();
      var ukVoice = voices.find(function (v) {
        return v.lang && (v.lang === "en-GB" || v.lang.startsWith("en-GB")) && !v.name.includes("Female");
      }) || voices.find(function (v) {
        return v.lang && v.lang.startsWith("en-");
      });
      if (ukVoice) utt.voice = ukVoice;

      isSpeaking = true;
      setStatus("Santa is speaking... 🔊", "speaking");

      utt.onend = function () {
        isSpeaking = false;
        setStatus("Tap microphone to speak", "");
        if (callback) callback();
      };
      utt.onerror = function () {
        isSpeaking = false;
        setStatus("Tap microphone to speak", "");
        if (callback) callback();
      };

      window.speechSynthesis.speak(utt);
    }

    function handleSend(userText) {
      if (!userText || !userText.trim() || isThinking) return;
      var clean = userText.trim();
      addBubble("user", clean);
      history.push({ role: "user", text: clean });
      turnCount++;

      // Stop speech if running
      if (window.speechSynthesis) window.speechSynthesis.cancel();

      // Check max turn wrap-up safeguard
      if (turnCount > maxTurns) {
        var wrapUp = "Ho ho ho! Rudolph is jingling his harness bells, which means it is time for me to feed the reindeer! Remember to be extra good, listen to your grown-ups, and get straight to bed on Christmas Eve! Merry Christmas to all!";
        addBubble("santa", wrapUp);
        speakSanta(wrapUp);
        micBtn.style.opacity = "0.5";
        micBtn.disabled = true;
        setStatus("Santa has dashed back to Lapland! 🎄", "");
        return;
      }

      isThinking = true;
      setStatus("Santa is thinking... ✨", "thinking");

      fetch(CONFIG.workerApi + "/api/santa-voice?table=" + encodeURIComponent(slug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: history
        })
      })
      .then(function (res) {
        if (!res.ok) throw new Error("API " + res.status);
        return res.json();
      })
      .then(function (data) {
        isThinking = false;
        var reply = data.reply || "Ho ho ho! The elves and reindeer send their warmest love!";
        history.push({ role: "santa", text: reply });
        addBubble("santa", reply);
        speakSanta(reply);
      })
      .catch(function (err) {
        isThinking = false;
        console.warn("Santa Voice error:", err);
        var fallback = "Ho ho ho! A snowy winter gust rattled our Lapland radio! Remember to always be kind to your family, and keep an eye on our live tracker!";
        addBubble("santa", fallback);
        speakSanta(fallback);
      });
    }

    // Microphone toggle click
    micBtn.onclick = function () {
      if (isSpeaking) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        isSpeaking = false;
        setStatus("Tap microphone to speak", "");
        return;
      }

      if (isListening) {
        if (recognition) recognition.stop();
        isListening = false;
        setStatus("Tap microphone to speak", "");
        return;
      }

      if (!recognition) {
        alert("Microphone recognition is not supported in this browser. Please use the text box below to speak with Santa!");
        return;
      }

      try {
        isListening = true;
        setStatus("Listening to you... Speak now! 🔴", "listening");
        recognition.start();
      } catch (e) {
        isListening = false;
        setStatus("Tap microphone to speak", "");
      }
    };

    if (recognition) {
      recognition.onresult = function (event) {
        isListening = false;
        var transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSend(transcript);
        } else {
          setStatus("Tap microphone to speak", "");
        }
      };
      recognition.onerror = function (event) {
        isListening = false;
        setStatus("Couldn't hear you clearly. Tap again!", "");
      };
      recognition.onend = function () {
        if (isListening) {
          isListening = false;
          setStatus("Tap microphone to speak", "");
        }
      };
    }

    // Chip quick suggestions
    card.querySelectorAll(".ts-chip").forEach(function (btn) {
      btn.onclick = function () {
        handleSend(btn.getAttribute("data-q"));
      };
    });

    // Text input submission
    textForm.onsubmit = function (e) {
      e.preventDefault();
      var val = textInput.value;
      if (val) {
        textInput.value = "";
        handleSend(val);
      }
    };

    console.info("[SantaChat] Gemini 3.8 Flash Voice Santa loaded for " + town + ".");
  }

  /* ============================================================
     MASTER DECISION & INITIALIZATION
     ============================================================ */

  function init() {
    if (param("driver") === "1" && !hasPreviewFlag()) return;

    resolveMountAndOpts();

    if (!CONFIG.enabled && !hasPreviewFlag()) {
      console.info("[SantaChat] Disabled.");
      return;
    }

    var apiUrl = resolveApiUrl();
    var gated = CONFIG.routeNightsOnly && !OPTS.always;
    var slug = resolveTableSlug();

    fetchPayload(apiUrl)
      .then(function (payload) {
        var routes = (payload && payload.routes) || [];
        var todayRoute = getTodayRoute(routes);
        var nextRoute = getNextRoute(routes);
        var town = (payload.table && (payload.table.sleigh_display_name || payload.table.name)) || slug;
        lastRouteInfo = buildRouteInfo(todayRoute, nextRoute, town);

        var show = hasPreviewFlag() || !gated ||
          (todayRoute && withinHours(CONFIG.routeDayHours));

        if (!show) {
          console.info("[SantaChat] Hidden (no route tonight / outside hours). Append ?santa=1 to preview.");
          return;
        }

        // Determine Provider:
        // Priority:
        // 1. URL param ?provider=gemini or ?provider=elevenlabs
        // 2. URL param ?agent_id= -> elevenlabs
        // 3. Table settings: table.santa_voice_provider ('elevenlabs' vs 'gemini')
        // 4. If table is 'beverley', default to 'elevenlabs' (preserves user's personal agent!)
        // 5. Otherwise default to 'gemini' (Flash 3.8 Voice Santa for all other tables)
        var forcedProvider = param("provider");
        var tableProvider = payload.table && payload.table.santa_voice_provider;
        var explicitAgent = param("agent_id") || (payload.table && payload.table.elevenlabs_agent_id);
        var hasExplicitAgent = Boolean(explicitAgent);
        var isBeverley = (!slug || slug === "beverley");

        var selectedProvider = "gemini";
        if (forcedProvider === "elevenlabs" || forcedProvider === "gemini") {
          selectedProvider = forcedProvider;
        } else if (isBeverley) {
          // Beverley can have either Gemini or ElevenLabs
          if (tableProvider === "gemini") {
            selectedProvider = "gemini";
          } else if (tableProvider === "elevenlabs" || hasExplicitAgent) {
            selectedProvider = "elevenlabs";
          } else {
            selectedProvider = "elevenlabs";
          }
        } else {
          // All other tables rely on Gemini solely
          selectedProvider = "gemini";
        }

        if (selectedProvider === "elevenlabs") {
          injectElevenLabsWidget();
        } else {
          injectGeminiVoiceWidget(payload);
        }
      })
      .catch(function (e) {
        console.warn("[SantaChat] Payload unreachable (" + e.message + ") — fallback behaviour.");
        if (hasPreviewFlag() || !gated || inManualWindow()) {
          var isBeverley = (resolveTableSlug() === "beverley");
          if (param("provider") === "gemini" || (!isBeverley && param("provider") !== "elevenlabs")) {
            injectGeminiVoiceWidget(null);
          } else {
            injectElevenLabsWidget();
          }
        }
      });
  }

  window.SantaChat = {
    show: function () {
      if (activeEngine === "elevenlabs") injectElevenLabsWidget();
      else injectGeminiVoiceWidget(tablePayload);
    },
    hide: function () {
      var el1 = document.querySelector(ELEVENLABS_TAG);
      if (el1) el1.remove();
      var el2 = document.querySelector(".ts-santa-card");
      if (el2) el2.remove();
      injected = false;
    },
    status: function () {
      return {
        enabled: CONFIG.enabled,
        engine: activeEngine,
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
