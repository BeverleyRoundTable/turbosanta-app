(function () {

    // --- PUBLIC INIT FUNCTION ---
    window.BRT_DONATE_INIT = function () {
        startDonationsWidget();
    };

    // --- THEME CACHE (mirrors tracker.html) ---
    let themeApi = "";

    function loadCachedTheme(api) {
        try {
            const c = localStorage.getItem('SANTA_THEME:' + api);
            if (c) { applyTheme({ primary_color: c }); return true; }
        } catch (e) {}
        return false;
    }

    function saveTheme(api, color) {
        try {
            if (parseColor(color)) localStorage.setItem('SANTA_THEME:' + api, String(color).trim());
            else localStorage.removeItem('SANTA_THEME:' + api);
        } catch (e) {}
    }

    function revealWidgets() {
        document.querySelectorAll('.ts-donations-wrapper.ts-theme-pending')
            .forEach(w => w.classList.remove('ts-theme-pending'));
    }

    // --- ACTUAL START FUNCTION ---
    function startDonationsWidget() {
        let apiBase = window.BRT_DONATE_API || null;

        if (!apiBase) {
            const params = new URLSearchParams(window.location.search);
            apiBase = params.get("api");
        }

        if (!apiBase) {
            console.error("❌ TurboSanta Donations: No API provided.");
            return;
        }

        const API_URL = apiBase;
        themeApi = API_URL;

        installCSS();

        document.querySelectorAll("[data-santa-mini]").forEach(injectMini);
        document.querySelectorAll("[data-santa-thermo]").forEach(injectThermo);

        if (loadCachedTheme(API_URL)) revealWidgets();
        setTimeout(revealWidgets, 3000);

        loadData(API_URL, 0);
    }

    function loadData(url, attempt) {
        fetch(url)
            .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(updateUI)
            .catch(err => {
                console.error("TurboSanta Donations error:", err);
                if (attempt < 2) setTimeout(() => loadData(url, attempt + 1), 2000 * (attempt + 1));
                else revealWidgets();
            });
    }

    // --- THEME & COLOUR PARSING ---

    function parseColor(v) {
        if (typeof v !== 'string') return null;
        const s = v.trim();
        const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
        if (hex) {
            let h = hex[1];
            if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
            if (h.length !== 6 && h.length !== 8) return null;
            return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        }
        try {
            if (/var\(|url\(|expression/i.test(s)) return null;
            if (!(window.CSS && CSS.supports && CSS.supports('color', s))) return null;
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillStyle = s;
            const out = ctx.fillStyle;
            if (out.charAt(0) === '#') return parseColor(out);
            const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(out);
            return rgb ? [+rgb[1], +rgb[2], +rgb[3]] : null;
        } catch (e) { return null; }
    }

    function readableTextOn(rgb) {
        const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
        return ((L + 0.05) / 0.05) >= (1.05 / (L + 0.05)) ? '#000000' : '#ffffff';
    }

    function applyTheme(settings) {
        const raw = settings && settings.primary_color;
        const rgb = parseColor(raw);
        
        document.querySelectorAll('.ts-donations-wrapper').forEach(wrapper => {
            if (rgb) {
                wrapper.style.setProperty('--primary', String(raw).trim());
                wrapper.style.setProperty('--primary-rgb', rgb.join(', '));
                wrapper.style.setProperty('--on-primary', readableTextOn(rgb));
            } else {
                wrapper.style.removeProperty('--primary');
                wrapper.style.removeProperty('--primary-rgb');
                wrapper.style.removeProperty('--on-primary');
            }
        });
    }

    /* ---------------------------------------------------------
       INSTALL SAFE CSS & PRELOAD EUROSTILE
    --------------------------------------------------------- */
    function installCSS() {
        // Self-preload the Eurostile font on the host page if not already present
        if (!document.getElementById("brt-eurostile-preload")) {
            const preload = document.createElement("link");
            preload.id = "brt-eurostile-preload";
            preload.rel = "preload";
            preload.href = "https://brt-23f.pages.dev/site/Eurostile_Extended_2_Bold.woff2";
            preload.as = "font";
            preload.type = "font/woff2";
            preload.crossOrigin = "anonymous";
            document.head.appendChild(preload);
        }

        if (document.getElementById("donations-v2-style")) return;

        const css = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');

@font-face {
    font-family: 'Eurostile';
    src: url('https://brt-23f.pages.dev/site/Eurostile_Extended_2_Bold.woff2') format('woff2'),
         url('https://brt-23f.pages.dev/fonts/eurostile-bold.woff2') format('woff2'),
         url('https://brt-23f.pages.dev/fonts/eurostile-bold.woff') format('woff'),
         url('https://brt-23f.pages.dev/site/Eurostile_Extended_2_Bold.otf') format('opentype');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
}

.ts-donations-wrapper {
    --primary: #FBAF33;
    --primary-rgb: 251, 175, 51;
    --on-primary: #000000;
    --primary-glow: rgba(var(--primary-rgb), 0.25);
    
    --dark: #0d0d0b;
    --surface: #161614;
    --surface-2: #1e1e1b;
    --border: rgba(255,255,255,0.08);
    --text: #eaeae5;
    --text-dim: rgba(255,255,255,0.55);
    --text-muted: rgba(255,255,255,0.3);
    --red: #D31C1C;

    font-family: 'Open Sans', sans-serif;
    color: var(--text);
    margin: 1.2rem auto 40px; 
    max-width: 480px;
    width: 100%;
    text-align: center;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
}

.ts-donations-wrapper * {
    box-sizing: border-box;
}

.ts-donations-wrapper {
    transition: opacity 0.25s ease;
}
.ts-donations-wrapper.ts-theme-pending {
    opacity: 0;
    pointer-events: none;
}

/* ---------- DONATE BUTTON STYLES ---------- */
.ts-donate-btn {
    display: inline-block;
    margin-top: 20px;
    padding: 12px 28px;
    background: var(--primary);
    color: var(--on-primary);
    font-family: 'Eurostile', sans-serif;
    font-size: 22px;
    letter-spacing: 1.5px;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 4px 15px var(--primary-glow);
    text-transform: uppercase;
}

.ts-donate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(var(--primary-rgb), 0.4);
    filter: brightness(1.1);
}

.ts-donate-btn:active {
    transform: translateY(1px);
}

/* ---------- MINI BAR ---------- */
.ts-mini-card {
    background: var(--surface);
    border-radius: 16px;
    border: 1px solid var(--border);
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    padding: 20px 24px;
}

.ts-mini-label {
    margin-bottom: 8px;
    color: var(--text-dim);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.ts-mini-track {
    width: 100%;
    height: 16px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
}
.ts-mini-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, var(--red), var(--primary));
    border-radius: 6px;
    transition: width 1s ease-out;
}
.ts-mini-val {
    margin-top: 10px;
    font-family: 'Eurostile', sans-serif;
    font-size: 26px;
    letter-spacing: 1px;
    color: var(--text);
    line-height: 1;
}
.ts-mini-val span {
    color: var(--primary);
}

/* ---------- THERMO CARD ---------- */
.ts-thermo-card {
    background: var(--surface);
    border-radius: 16px;
    border: 1px solid var(--border);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3); 
    padding: 32px 24px;
    position: relative;
    overflow: hidden;
}

.ts-thermo-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: 50%;
    transform: translateX(-50%);
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(var(--primary-rgb), 0.05) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
}

.ts-thermo-card > * {
    position: relative;
    z-index: 1;
}

.ts-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    background: rgba(var(--primary-rgb), 0.12);
    color: var(--primary);
    border: 1px solid rgba(var(--primary-rgb), 0.2);
    margin-bottom: 16px;
}

.ts-thermo-title {
    font-family: 'Eurostile', sans-serif;
    font-size: 40px;
    letter-spacing: 2px;
    margin: 0 0 24px 0;
    line-height: 1;
    color: #fff;
}
.ts-thermo-title span {
    color: var(--primary);
}

.ts-thermo-layout {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 24px;
}

.ts-thermo-bar {
    width: 32px;
    height: 240px;
    border-radius: 16px;
    overflow: hidden;
    background: var(--surface-2);
    border: 2px solid var(--border);
    box-shadow: inset 0 4px 12px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.ts-thermo-fill {
    width: 100%;
    height: 0%;
    background: linear-gradient(to top, var(--red), var(--primary));
    transition: height 1.4s ease-out;
    border-radius: 12px;
    box-shadow: 0 0 14px var(--primary-glow);
}

@keyframes tsThermoPulse {
  0%   { box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.2); }
  50%  { box-shadow: 0 0 25px rgba(var(--primary-rgb), 0.6); }
  100% { box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.2); }
}

.ts-thermo-fill.pulse {
  animation: tsThermoPulse 1.2s ease-out;
}

.ts-thermo-info {
    text-align: left;
}

.ts-thermo-amount-val {
    font-family: 'Eurostile', sans-serif;
    font-size: 56px;
    color: var(--primary);
    line-height: 1;
    letter-spacing: 1px;
    margin-bottom: 4px;
}

.ts-thermo-amount-lbl {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.ts-thermo-last {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 16px;
}

.ts-thermo-logo {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.04);
    padding: 4px;
    object-fit: contain;
    display: block;
    margin: 24px auto 0;
}

@media (max-width: 500px) {
    .ts-thermo-layout {
        flex-direction: column;
        text-align: center;
    }
    .ts-thermo-info {
        text-align: center;
    }
    .ts-thermo-bar {
        height: 180px;
    }
}
`;

        const style = document.createElement("style");
        style.id = "donations-v2-style";
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ---------------------------------------------------------
       MINI MARKUP
    --------------------------------------------------------- */
    function injectMini(el) {
        el.innerHTML = `
            <div class="ts-donations-wrapper ts-theme-pending">
                <div class="ts-mini-card">
                    <div class="ts-mini-label">Together we've raised</div>
                    <div class="ts-mini-track">
                        <div class="ts-mini-fill" id="tsMiniFill"></div>
                    </div>
                    <div class="ts-mini-val" id="tsMiniVal">Loading…</div>
                    <a href="#" target="_blank" class="ts-donate-btn" id="tsMiniDonate" style="display: none;">Donate Now</a>
                </div>
            </div>
        `;
    }

    /* ---------------------------------------------------------
       FULL MARKUP
    --------------------------------------------------------- */
    function injectThermo(el) {
        el.innerHTML = `
            <div class="ts-donations-wrapper ts-theme-pending">
                <div class="ts-thermo-card">
                    <div class="ts-hero-badge">🎄 Fundraiser</div>
                    <h3 class="ts-thermo-title">SANTA <span>SLEIGH</span></h3>
                    <div class="ts-thermo-layout">
                        <div class="ts-thermo-bar">
                            <div class="ts-thermo-fill" id="tsThermoFill"></div>
                        </div>
                        <div class="ts-thermo-info">
                            <div class="ts-thermo-amount-val" id="tsThermoAmountVal">—</div>
                            <div class="ts-thermo-amount-lbl" id="tsThermoAmountLbl">Raised of target</div>
                            <div class="ts-thermo-last" id="tsThermoLast"></div>
                        </div>
                    </div>
                    <a href="#" target="_blank" class="ts-donate-btn" id="tsThermoDonate" style="display: none;">Donate Now</a>
                    <img class="ts-thermo-logo" id="tsThermoLogo" src="">
                </div>
            </div>
        `;
    }

    /* ---------------------------------------------------------
       UPDATE UI
    --------------------------------------------------------- */
    function updateUI(fullData) {
        const donations = fullData.donations || {};
        const settings = fullData.settings || {};

        applyTheme(settings);
        saveTheme(themeApi, settings.primary_color);
        revealWidgets();

        const total  = Number(donations.total  || 0);
        const target = Number(donations.target || 0);
        const pct    = target > 0 ? Math.min(100, (total / target) * 100) : 0;
        
        const donateUrl = settings.donate_url && settings.donate_url.trim() !== "" ? settings.donate_url.trim() : null;

        /* MINI BAR */
        const mf = document.getElementById("tsMiniFill");
        const mv = document.getElementById("tsMiniVal");
        const miniBtn = document.getElementById("tsMiniDonate");
        
        if (mf) mf.style.width = pct + "%";
        if (mv) mv.innerHTML = `<span>£${total.toLocaleString("en-GB")}</span> of £${target.toLocaleString("en-GB")}`;
        
        if (miniBtn) {
            if (donateUrl) {
                miniBtn.href = donateUrl;
                miniBtn.style.display = "inline-block";
            } else {
                miniBtn.style.display = "none";
                miniBtn.removeAttribute("href");
            }
        }

        /* THERMOMETER */
        const tf    = document.getElementById("tsThermoFill");
        const taVal = document.getElementById("tsThermoAmountVal");
        const taLbl = document.getElementById("tsThermoAmountLbl");
        const tl    = document.getElementById("tsThermoLast");
        const logo  = document.getElementById("tsThermoLogo");
        const thermoBtn = document.getElementById("tsThermoDonate");

        if (tf) {
            tf.style.height = pct + "%";
            tf.classList.remove("pulse");
            void tf.offsetWidth;
            tf.classList.add("pulse");
        }

        if (taVal) taVal.textContent = `£${total.toLocaleString("en-GB")}`;
        if (taLbl) taLbl.textContent = `Raised of £${target.toLocaleString("en-GB")}`;

        if (tl) tl.textContent = "Last updated: " + (donations.lastUpdatePretty || "Awaiting first update");

        if (thermoBtn) {
            if (donateUrl) {
                thermoBtn.href = donateUrl;
                thermoBtn.style.display = "inline-block";
            } else {
                thermoBtn.style.display = "none";
                thermoBtn.removeAttribute("href");
            }
        }

        if (logo) {
            logo.src = donations.logo || settings.logo_overlay_url || "";
            logo.style.display = logo.src ? "block" : "none";
        }
    }

})();
