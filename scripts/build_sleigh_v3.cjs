const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'public', 'santasleigh.html');
const destPath = path.join(__dirname, '..', 'public', 'sleigh_v3.html');

let src = fs.readFileSync(srcPath, 'utf8');

// 1. Meta & Title Updates
src = src.replace('<title>Santa Sleigh</title>', '<title>Santa Sleigh — Live Community Radar & Routes (V3)</title>');
src = src.replace('<meta name="theme-color" content="#121316">', '<meta name="theme-color" content="#07090e">');

// 2. V3 Visual Enhancements CSS
const v3VisualCss = `
        /* ==========================================================================
           TurboSanta V3 — Flagship Presentation (V1 Architecture + V2 Obsidian Glass)
           ========================================================================== */
        :root {
            --primary: #FBAF33;
            --accent: #FFFFFF;
            --bg-dark: #07090e;
            --bg-card: rgba(14, 18, 26, 0.78);
            --bg-card-solid: #0d1017;
            --bg-elevated: rgba(255, 255, 255, 0.05);
            --text-main: #f8fafc;
            --text-muted: rgba(241, 245, 249, 0.72);
            --border: rgba(255, 255, 255, 0.09);
            --border-highlight: rgba(255, 255, 255, 0.18);
            --on-primary: #080a0f;
            --primary-rgb: 251, 175, 51;
            --bg-overlay: radial-gradient(circle at 50% 0%, rgba(var(--primary-rgb), 0.14) 0%, transparent 60%), linear-gradient(180deg, rgba(7, 9, 14, 0.5) 0%, rgba(7, 9, 14, 0.85) 45%, #07090e 100%);
            --radius-lg: 22px;
            --radius-md: 14px;
            --radius-pill: 999px;
            --shadow-card: 0 24px 60px -18px rgba(0, 0, 0, 0.78), inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
            --shadow-glow: 0 0 38px rgba(var(--primary-rgb), 0.22);
            --emerald: #10b981;
            --amber: #f59e0b;
            --crimson: #ef4444;
        }

        /* --- V3 Top Test Lab Toolbar --- */
        .test-lab-bar {
            background: linear-gradient(90deg, rgba(13, 17, 26, 0.96) 0%, rgba(22, 28, 42, 0.96) 100%);
            border-bottom: 1px solid rgba(var(--primary-rgb), 0.35);
            padding: 8px 16px;
            position: sticky;
            top: 0;
            z-index: 120;
            font-size: 12px;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            font-family: 'Open Sans', sans-serif;
        }
        .test-lab-inner {
            max-width: 1320px;
            margin: 0 auto;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        .test-lab-left,
        .test-lab-right {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        .lab-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(var(--primary-rgb), 0.16);
            color: var(--primary);
            border: 1px solid rgba(var(--primary-rgb), 0.4);
            padding: 3px 10px;
            border-radius: 999px;
            font-weight: 800;
            font-size: 11px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            font-family: 'Eurostile', 'Open Sans', sans-serif;
        }
        .lab-pill {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(241, 245, 249, 0.74);
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.18s ease;
            font-family: inherit;
        }
        .lab-pill:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
        }
        .lab-pill.active {
            background: var(--primary);
            color: var(--on-primary);
            border-color: var(--primary);
        }
        .lab-pill.sim-live.active {
            background: var(--emerald);
            color: #04130d;
            border-color: var(--emerald);
        }
        .lab-pill.sim-rain.active {
            background: var(--amber);
            color: #140c00;
            border-color: var(--amber);
        }
        .lab-select {
            background: rgba(10, 13, 20, 0.9);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            outline: none;
            font-family: inherit;
        }
        .lab-link {
            color: rgba(241, 245, 249, 0.74);
            text-decoration: none;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            transition: all 0.18s ease;
        }
        .lab-link:hover {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.28);
        }
        .lab-link.active-version {
            background: rgba(var(--primary-rgb), 0.2);
            border-color: var(--primary);
            color: var(--primary);
        }

        /* --- V2 Obsidian Glass Visual Polish Overrides --- */
        #site-bg-overlay {
            background-image: radial-gradient(circle at 50% 0%, rgba(var(--primary-rgb), 0.14) 0%, transparent 60%),
                              linear-gradient(180deg, rgba(7, 9, 14, 0.5) 0%, rgba(7, 9, 14, 0.85) 45%, #07090e 100%) !important;
        }
        nav {
            background: rgba(10, 13, 19, 0.84) !important;
            backdrop-filter: blur(24px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(140%) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .hero-content {
            background: rgba(12, 16, 24, 0.68) !important;
            backdrop-filter: blur(24px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(140%) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 26px !important;
            padding: 44px 36px !important;
            box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.85), inset 0 1px 0 0 rgba(255, 255, 255, 0.12) !important;
            max-width: 860px !important;
            margin: 0 auto !important;
        }
        .hero-status {
            background: rgba(16, 185, 129, 0.14) !important;
            border: 1px solid rgba(16, 185, 129, 0.38) !important;
            color: #34d399 !important;
            border-radius: 999px !important;
            padding: 8px 20px !important;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.2) !important;
        }
        .hero-status .status-dot {
            background: #34d399 !important;
            box-shadow: 0 0 10px #34d399 !important;
        }
        .btn {
            background: linear-gradient(135deg, var(--primary) 0%, rgba(var(--primary-rgb), 0.88) 100%) !important;
            color: var(--on-primary) !important;
            border-radius: 14px !important;
            box-shadow: 0 10px 28px -4px rgba(var(--primary-rgb), 0.45), 0 2px 6px rgba(0,0,0,0.3) !important;
        }
        .btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 14px 36px -4px rgba(var(--primary-rgb), 0.6), 0 4px 10px rgba(0,0,0,0.4) !important;
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.06) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.14) !important;
            box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.4) !important;
            border-radius: 14px !important;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.28) !important;
            color: #ffffff !important;
            transform: translateY(-2px) !important;
        }
        .iframe-container {
            background: var(--bg-card) !important;
            backdrop-filter: blur(24px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(140%) !important;
            border-radius: var(--radius-lg) !important;
            border: 1px solid var(--border) !important;
            box-shadow: var(--shadow-card) !important;
        }
        .iframe-chrome {
            background: rgba(10, 13, 19, 0.72) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important;
        }
        .today-spotlight-card {
            background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.14) 0%, rgba(14, 18, 26, 0.88) 100%) !important;
            border: 1px solid rgba(var(--primary-rgb), 0.38) !important;
            border-radius: 20px !important;
            box-shadow: 0 24px 60px -15px rgba(0, 0, 0, 0.8), 0 0 32px rgba(var(--primary-rgb), 0.2) !important;
        }
        .route-card {
            background: var(--bg-card) !important;
            backdrop-filter: blur(18px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(18px) saturate(140%) !important;
            border: 1px solid var(--border) !important;
            border-radius: 18px !important;
            box-shadow: var(--shadow-card) !important;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease !important;
        }
        .route-card:hover {
            transform: translateY(-4px) !important;
            border-color: rgba(var(--primary-rgb), 0.45) !important;
            box-shadow: 0 28px 70px -15px rgba(0, 0, 0, 0.85), 0 0 32px rgba(var(--primary-rgb), 0.22) !important;
        }

        /* --- Crisp White Logo Pedestals --- */
        .partner-card-logo-box {
            background: #ffffff !important;
            border-radius: 12px !important;
            padding: 8px 14px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25) !important;
            max-width: 120px !important;
            max-height: 58px !important;
            flex-shrink: 0 !important;
        }
        .partner-card-logo-box img {
            height: 44px !important;
            max-width: 104px !important;
            object-fit: contain !important;
            display: block !important;
        }
        .sponsor-card {
            background: #ffffff !important;
            border-radius: 14px !important;
            padding: 16px 20px !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.45) !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .sponsor-card:hover {
            transform: translateY(-4px) scale(1.02) !important;
            box-shadow: 0 16px 32px rgba(0,0,0,0.6), 0 0 20px rgba(var(--primary-rgb), 0.25) !important;
        }
        .route-sponsor-box,
        .route-sponsor-item {
            background: #ffffff !important;
            border-radius: 10px !important;
            padding: 6px 12px !important;
        }
        .thermo-card,
        .grants-showcase-card,
        .about-card {
            background: var(--bg-card) !important;
            backdrop-filter: blur(20px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(140%) !important;
            border: 1px solid var(--border) !important;
            border-radius: 20px !important;
            box-shadow: var(--shadow-card) !important;
        }
        .volunteer-banner {
            background: rgba(14, 18, 26, 0.75) !important;
            backdrop-filter: blur(18px) !important;
            border: 1px solid var(--border) !important;
            border-radius: 18px !important;
        }
        .faq-item {
            background: rgba(14, 18, 26, 0.75) !important;
            backdrop-filter: blur(16px) !important;
            border: 1px solid var(--border) !important;
            border-radius: 14px !important;
        }
`;

src = src.replace('</style>', v3VisualCss + '\n    </style>');

// 3. Insert V3 Test Lab Bar right after <body class="is-pending">
const testLabBarHtml = `
    <!-- V3 Test Lab Bar (V1 Architecture & Features + V2 Obsidian Glass Presentation) -->
    <div class="test-lab-bar" id="test-lab-bar">
      <div class="test-lab-inner">
        <div class="test-lab-left">
          <span class="lab-badge"><i class="fa-solid fa-flask"></i> V3 Test Lab</span>
          <button type="button" class="lab-pill" data-table="stockton" title="14 GPX Routes, 174 Streets, 4 Partners, Grant">Stockton (14 Routes)</button>
          <button type="button" class="lab-pill" data-table="ringwood" title="10 GPX Routes, 9 Route Sponsors, Crimson Theme">Ringwood (9 Sponsors)</button>
          <button type="button" class="lab-pill" data-table="cheltenham" title="8 GPX Routes, 5 Live Memory Photos">Cheltenham (Photos)</button>
          <button type="button" class="lab-pill" data-table="abergavenny" title="4 Routes, 291 Streets, Voice Santa">Abergavenny (291 Streets)</button>
          <button type="button" class="lab-pill" data-table="beverley" title="Live Donations, Custom Crest, Red/Gold">Beverley</button>
          <select id="lab-all-tables" class="lab-select" aria-label="Switch live Round Table dataset">
            <option value="">All Live Tables...</option>
          </select>
        </div>
        <div class="test-lab-right">
          <button type="button" class="lab-pill active" data-sim="auto">Live State</button>
          <button type="button" class="lab-pill sim-live" data-sim="live"><i class="fa-solid fa-satellite-dish"></i> Simulate Sleigh LIVE</button>
          <button type="button" class="lab-pill sim-rain" data-sim="rain"><i class="fa-solid fa-cloud-showers-heavy"></i> Simulate Rain-Check</button>
          <a id="lab-compare-v1" href="/santasleigh.html?table=stockton" target="_blank" rel="noopener" class="lab-link">Compare V1 &#8599;</a>
          <a id="lab-compare-v2" href="/v2?table=stockton" target="_blank" rel="noopener" class="lab-link">Compare V2 &#8599;</a>
          <span class="lab-link active-version">V3 Active</span>
          <button type="button" id="lab-hide-btn" class="lab-pill" title="Hide preview toolbar" aria-label="Hide preview toolbar">&#10005;</button>
        </div>
      </div>
    </div>
`;

src = src.replace('<body class="is-pending">', '<body class="is-pending">\n' + testLabBarHtml);

// 4. Test Lab JS Controller & PostMessage Pin Relay
const testLabJs = `
    // --- V3 Test Lab Toolbar & Multi-Tenant Runtime Switcher ---
    (function initV3TestLab() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('clean') === '1') {
            const bar = document.getElementById('test-lab-bar');
            if (bar) bar.style.display = 'none';
            return;
        }

        const currentSlug = window.__sleighTableSlug || 'stockton';

        function updateCompareLinks(slug) {
            const v1Link = document.getElementById('lab-compare-v1');
            const v2Link = document.getElementById('lab-compare-v2');
            if (v1Link) v1Link.href = '/santasleigh.html?table=' + encodeURIComponent(slug);
            if (v2Link) v2Link.href = '/v2?table=' + encodeURIComponent(slug);
        }
        updateCompareLinks(currentSlug);

        // Highlight active pill
        document.querySelectorAll('[data-table]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-table') === currentSlug);
        });

        // Populate dropdown with all 19 live tables
        const sel = document.getElementById('lab-all-tables');
        if (sel) {
            fetch(CFG.workerApi + '/api/public/tables')
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data && data.tables)) {
                        sel.innerHTML = '<option value="">All Live Tables (' + data.tables.length + ')...</option>' +
                            data.tables.map(t => '<option value="' + (t.slug || '') + '">' + (t.town_name || t.name || t.slug) + '</option>').join('');
                        sel.value = currentSlug;
                    }
                })
                .catch(() => {});
        }

        function switchTable(newSlug) {
            if (!newSlug || newSlug === window.__sleighTableSlug) return;
            window.__sleighTableSlug = newSlug;
            const u = new URL(window.location.href);
            u.searchParams.set('table', newSlug);
            window.history.replaceState({}, '', u.toString());

            document.querySelectorAll('[data-table]').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-table') === newSlug);
            });
            if (sel) sel.value = newSlug;
            updateCompareLinks(newSlug);

            fetch(CFG.workerApi + '/api/payload?table=' + encodeURIComponent(newSlug) + '&_t=' + Date.now())
                .then(r => r.json())
                .then(raw => {
                    const data = checkPayload(raw);
                    applySettings(adaptWorkerPayload(data, 'Just now'), '');
                    renderFrames('');
                })
                .catch(err => {
                    console.error('Failed to switch table:', err);
                });
        }

        document.querySelectorAll('[data-table]').forEach(btn => {
            btn.addEventListener('click', () => switchTable(btn.getAttribute('data-table')));
        });

        if (sel) {
            sel.addEventListener('change', (e) => switchTable(e.target.value));
        }

        // Simulation Toggles
        let simMode = 'auto';
        let originalAnnouncement = null;

        document.querySelectorAll('[data-sim]').forEach(btn => {
            btn.addEventListener('click', () => {
                simMode = btn.getAttribute('data-sim') || 'auto';
                document.querySelectorAll('[data-sim]').forEach(b => b.classList.toggle('active', b === btn));

                const tracker = document.getElementById('tracker-iframe');
                const heroStatus = document.getElementById('hero-status');
                const heroStatusText = document.getElementById('hero-status-text');
                const announceBar = document.getElementById('announcement-bar');

                if (simMode === 'live') {
                    if (tracker) {
                        const tUrl = new URL(tracker.src, window.location.href);
                        tUrl.searchParams.set('demo', '1');
                        tracker.src = tUrl.toString();
                    }
                    if (heroStatus && heroStatusText) {
                        heroStatus.hidden = false;
                        heroStatusText.textContent = '🎅 Santa Is Live On Route Now!';
                        heroStatus.style.background = 'rgba(16, 185, 129, 0.18)';
                        heroStatus.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                    }
                } else if (simMode === 'rain') {
                    if (announceBar) {
                        if (originalAnnouncement === null) originalAnnouncement = announceBar.innerHTML;
                        announceBar.innerHTML = '🌧️ <strong>Weather Update:</strong> Tonight’s route is temporarily postponed due to severe rain and ice for safety. The team will roll out on the next clear night!';
                        announceBar.style.display = 'block';
                        announceBar.style.background = 'linear-gradient(90deg, #b45309 0%, #d97706 100%)';
                    }
                    if (heroStatus && heroStatusText) {
                        heroStatus.hidden = false;
                        heroStatusText.textContent = "⚠️ Tonight's Route Postponed (Rain-Check)";
                        heroStatus.style.background = 'rgba(245, 158, 11, 0.18)';
                        heroStatus.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                    }
                } else {
                    // Auto / Live State
                    if (tracker) {
                        const tUrl = new URL(tracker.src, window.location.href);
                        tUrl.searchParams.delete('demo');
                        tracker.src = tUrl.toString();
                    }
                    if (announceBar && originalAnnouncement !== null) {
                        announceBar.innerHTML = originalAnnouncement;
                        if (!originalAnnouncement.trim()) announceBar.style.display = 'none';
                        announceBar.style.background = '';
                    }
                    refreshSleighData().catch(() => {});
                }
            });
        });

        // Dismiss bar
        const hideBtn = document.getElementById('lab-hide-btn');
        if (hideBtn) {
            hideBtn.addEventListener('click', () => {
                const bar = document.getElementById('test-lab-bar');
                if (bar) bar.style.display = 'none';
            });
        }

        // Forward turbosanta-pin-saved message from address iframe to tracker iframe
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'turbosanta-pin-saved') {
                const trk = document.getElementById('tracker-iframe');
                if (trk && trk.contentWindow) {
                    trk.contentWindow.postMessage(e.data, '*');
                }
            }
        });
    })();
`;

src = src.replace('</body>', '<script>' + testLabJs + '</script>\n</body>');

fs.writeFileSync(destPath, src, 'utf8');
console.log('Successfully generated public/sleigh_v3.html! Size:', src.length);
