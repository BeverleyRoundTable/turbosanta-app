/* TurboSanta: Rooftop Rush 3D — WebGL Christmas Arcade Engine */
(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    console.error("Three.js failed to load.");
    return;
  }

  const SAVE_KEY = "turbosanta_game_save_v1";
  const LANE_X = [-3.6, 0, 3.6];
  const BASE_SLEIGH_Y = 3.0;
  const CHUNK_LEN = 18;
  const CHUNK_COUNT = 11;

  const SKINS = [
    { id: "classic", name: "Round Table Classic", price: 0, body: 0xc81e1e, trim: 0xfbaf33, runner: 0xe2e8f0, emissive: 0x220404 },
    { id: "aurora", name: "Aurora Midnight", price: 45, body: 0x0f766e, trim: 0x5eead4, runner: 0x99f6e4, emissive: 0x042f2e },
    { id: "gold24k", name: "Golden Roundel 24K", price: 90, body: 0xd97706, trim: 0xfef08a, runner: 0xfde047, emissive: 0x451a03 },
    { id: "cyber", name: "Cyber-Sleigh 3000", price: 140, body: 0x1e1b4b, trim: 0x38bdf8, runner: 0xa855f7, emissive: 0x1e1b4b }
  ];

  const UPGRADES = [
    { id: "hearts", name: "Reinforced Runners", desc: "+1 Max Sleigh Heart per level", costs: [30, 65, 110] },
    { id: "turbo", name: "Rudolph Afterburner", desc: "+1.5s Turbo Boost duration", costs: [25, 55, 95] },
    { id: "magnet", name: "Elf Magnet Coil", desc: "+3s Coin Magnet duration", costs: [25, 55, 95] },
    { id: "chute", name: "Precision Gift Chute", desc: "Wider chimney bullseye target", costs: [30, 60, 100] }
  ];

  const ACHIEVEMENTS = [
    { id: "first_drop", title: "First Chimney Bullseye", desc: "Deliver your very first present down a chimney." },
    { id: "hat_trick", title: "Deck the Roofs", desc: "Reach a x4 festive combo streak." },
    { id: "fever_eight", title: "Sleigh Fever x8!", desc: "Max out the combo multiplier at x8." },
    { id: "santa_express", title: "Rudolph's Afterburner", desc: "Ignite Rudolph's Turbo Boost." },
    { id: "sharpshooter", title: "Elfin Sniper", desc: "Deliver 15 presents in a single flight." },
    { id: "high_roller", title: "Charity Collector", desc: "Grab 25 Charity Coins in one run." },
    { id: "distance_hero", title: "Round the Town", desc: "Fly 1,000 metres in a single run." },
    { id: "aurora_flier", title: "Aurora Skyline", desc: "Reach the 1,800m Aurora Skyline biome." },
    { id: "blitz_ace", title: "Christmas Eve Legend", desc: "Score 5,000+ points in 2-Min Blitz." },
    { id: "custom_ride", title: "Lapland Mechanic", desc: "Unlock a Workshop upgrade or Sleigh Skin." }
  ];

  const BIOMES = [
    { minDist: 0, name: "Victorian High Street", icon: "❄️", sky: 0x070d20, fog: 0x091128, housePalette: [0x7c2d12, 0x854d0e, 0x475569] },
    { minDist: 600, name: "Cathedral Square", icon: "⛪", sky: 0x0a1634, fog: 0x0d1b3e, housePalette: [0x334155, 0x3b4252, 0x57534e] },
    { minDist: 1200, name: "Frostpine Viaduct", icon: "🌲", sky: 0x061d24, fog: 0x08242b, housePalette: [0x5c3a21, 0x43302b, 0x1e3a3a] },
    { minDist: 1800, name: "Aurora Skyline", icon: "✨", sky: 0x0c0a26, fog: 0x110e36, housePalette: [0x312e81, 0x1e293b, 0x4c1d95] }
  ];

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function hashStringToSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createMulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function loadSave() {
    const def = {
      coins: 0,
      bestScores: { endless: 0, blitz: 0, daily: {}, dailyDate: getTodayKey() },
      bestCombo: 1,
      totalPresents: 0,
      totalRuns: 0,
      selectedTown: "national",
      selectedSkin: "classic",
      unlockedSkins: ["classic"],
      upgrades: { hearts: 0, turbo: 0, magnet: 0, chute: 0 },
      achievements: [],
      muted: false
    };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return def;
      const parsed = JSON.parse(raw);
      return {
        ...def,
        ...parsed,
        bestScores: { ...def.bestScores, ...(parsed.bestScores || {}) },
        upgrades: { ...def.upgrades, ...(parsed.upgrades || {}) },
        unlockedSkins: Array.isArray(parsed.unlockedSkins) ? parsed.unlockedSkins : ["classic"],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : []
      };
    } catch {
      return def;
    }
  }

  function persistSave(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {}
  }

  /* ================= POLYPHONIC CHRISTMAS SYNTH & SFX ================= */
  class SleighAudio {
    constructor(isMuted) {
      this.ctx = null;
      this.muted = Boolean(isMuted);
      this.musicTimer = null;
      this.noteIdx = 0;
      this.melody = [
        [659.25, 0.2], [659.25, 0.2], [659.25, 0.4],
        [659.25, 0.2], [659.25, 0.2], [659.25, 0.4],
        [659.25, 0.2], [783.99, 0.2], [523.25, 0.25], [587.33, 0.15], [659.25, 0.6],
        [698.46, 0.2], [698.46, 0.2], [698.46, 0.25], [698.46, 0.15],
        [698.46, 0.2], [659.25, 0.2], [659.25, 0.2], [659.25, 0.15],
        [659.25, 0.2], [587.33, 0.2], [587.33, 0.2], [659.25, 0.2], [587.33, 0.4], [783.99, 0.4]
      ];
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    setMuted(m) {
      this.muted = Boolean(m);
      if (this.muted) this.stopMusic();
    }

    tone(freq, dur, type = "triangle", gainVal = 0.08, delay = 0) {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }

    startMusic() {
      if (this.muted || this.musicTimer) return;
      this.ensureContext();
      const playStep = () => {
        if (this.muted || !this.musicTimer) return;
        const [freq, dur] = this.melody[this.noteIdx % this.melody.length];
        this.tone(freq, dur * 0.9, "triangle", 0.032, 0);
        this.tone(freq * 0.5, dur * 0.9, "sine", 0.018, 0);
        this.noteIdx++;
        this.musicTimer = setTimeout(playStep, Math.max(150, dur * 820));
      };
      this.musicTimer = setTimeout(playStep, 120);
    }

    stopMusic() {
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
    }

    sfxDrop() {
      this.tone(420, 0.09, "sine", 0.07, 0);
      this.tone(310, 0.12, "sine", 0.06, 0.05);
    }

    sfxBullseye(combo) {
      const base = 523.25 * Math.pow(1.06, Math.min(combo, 10));
      this.tone(base, 0.11, "triangle", 0.11, 0);
      this.tone(base * 1.25, 0.13, "triangle", 0.11, 0.06);
      this.tone(base * 1.5, 0.22, "sine", 0.12, 0.12);
    }

    sfxCoin() {
      this.tone(987.77, 0.07, "sine", 0.07, 0);
      this.tone(1318.51, 0.16, "sine", 0.08, 0.06);
    }

    sfxPowerup() {
      this.tone(523.25, 0.08, "sawtooth", 0.05, 0);
      this.tone(659.25, 0.09, "sawtooth", 0.05, 0.07);
      this.tone(783.99, 0.12, "triangle", 0.09, 0.14);
      this.tone(1046.5, 0.24, "sine", 0.1, 0.2);
    }

    sfxJump() {
      this.tone(280, 0.07, "sine", 0.07, 0);
      this.tone(440, 0.14, "sine", 0.08, 0.04);
    }

    sfxTurbo() {
      [261.63, 329.63, 392.0, 523.25, 659.25].forEach((f, i) => {
        this.tone(f, 0.22, "sawtooth", 0.045, i * 0.045);
      });
    }

    sfxHit() {
      this.tone(165, 0.18, "sawtooth", 0.12, 0);
      this.tone(110, 0.28, "square", 0.08, 0.07);
    }

    sfxAchievement() {
      [587.33, 739.99, 880, 1174.66].forEach((f, i) => {
        this.tone(f, 0.2, "triangle", 0.09, i * 0.08);
      });
    }
  }

  let _publicTablesCache = [];

  /* ================= TOWN DIRECTORY LOADER ================= */
  async function populateTownSelector(save) {
    const select = document.getElementById("town-select");
    const host = window.location.hostname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const urlTown = (params.get("table") || "").toLowerCase().trim();
    const subTown = host.endsWith(".roundtablesantasleigh.co.uk")
      ? host.replace(".roundtablesantasleigh.co.uk", "").split(".")[0]
      : "";
    const detectedTown = urlTown || (subTown && subTown !== "www" && subTown !== "admin" ? subTown : "");
    if (detectedTown) save.selectedTown = detectedTown;

    let tables = [
      { slug: "beverley", town_name: "Beverley", table_number: "247" },
      { slug: "abergavenny", town_name: "Abergavenny" },
      { slug: "darlington", town_name: "Darlington" },
      { slug: "lichfield", town_name: "Lichfield" },
      { slug: "loughborough", town_name: "Loughborough" },
      { slug: "middlesbrough", town_name: "Middlesbrough" },
      { slug: "shirley", town_name: "Shirley" },
      { slug: "stockton", town_name: "Stockton" }
    ];

    try {
      const apiBase = host.includes("roundtablesantasleigh.co.uk")
        ? window.location.origin
        : "https://turbosanta-api.beverley247.workers.dev";
      const res = await fetch(`${apiBase}/api/public/tables`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.tables) && data.tables.length > 0) {
          tables = data.tables;
        }
      }
    } catch {}

    _publicTablesCache = tables;

    if (!select) return;
    select.innerHTML = "";
    const addOpt = (val, label) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      select.appendChild(opt);
    };
    addOpt("national", "Round Table Great Britain & Ireland (National)");
    for (const t of tables) {
      const num = t.table_number ? ` #${t.table_number}` : "";
      addOpt(String(t.slug || "").toLowerCase(), `${t.town_name || t.slug} Round Table${num}`);
    }

    const validValues = new Set(Array.from(select.options).map((o) => o.value));
    select.value = validValues.has(save.selectedTown) ? save.selectedTown : "national";
    updateTownLinks(select.value, _publicTablesCache);
  }

  function updateTownLinks(slug, tablesList = _publicTablesCache) {
    const clean = (slug || "national").toLowerCase().trim();
    const isNational = !clean || clean === "national";
    const prefTable = window.__sleighPrefetchedData?.table;
    const matched = (Array.isArray(tablesList) ? tablesList : []).find((t) => String(t?.slug || "").toLowerCase() === clean);
    const townLabel = isNational
      ? "Round Table"
      : (matched?.town_name || (prefTable?.slug === clean ? (prefTable.town_alias || prefTable.name) : "") || (clean.charAt(0).toUpperCase() + clean.slice(1)));

    const hubUrl = isNational
      ? "https://roundtablesantasleigh.co.uk/"
      : `https://${encodeURIComponent(clean)}.roundtablesantasleigh.co.uk/`;
    const gameShareUrl = isNational
      ? "https://roundtablesantasleigh.co.uk/game"
      : `https://${encodeURIComponent(clean)}.roundtablesantasleigh.co.uk/game`;

    const eyebrow = document.getElementById("menu-brand-eyebrow");
    if (eyebrow) {
      eyebrow.textContent = isNational ? "🎅 Round Table Official Arcade" : `🎅 ${townLabel} Round Table Arcade`;
    }

    const l1 = document.getElementById("menu-track-real-link");
    const l2 = document.getElementById("over-real-sleigh-link");
    if (l1) {
      l1.href = hubUrl;
      l1.textContent = isNational ? "View Real Sleigh Hub ↗" : `Track ${townLabel} Sleigh ↗`;
    }
    if (l2) {
      l2.href = hubUrl;
      l2.textContent = isNational ? "🎅 Track Real Round Table Sleigh →" : `🎅 Track ${townLabel} Santa Sleigh →`;
    }

    const donateBtn = document.getElementById("over-donate-link");
    if (donateBtn) {
      const rawDonate = !isNational && prefTable?.slug === clean ? (prefTable.donate_url || prefTable.justgiving_url || "") : "";
      const safeDonate = typeof rawDonate === "string" && /^https?:\/\//i.test(rawDonate.trim()) ? rawDonate.trim() : "";
      if (safeDonate) {
        donateBtn.href = safeDonate;
        donateBtn.textContent = `❤️ Support ${townLabel} Charity Appeal →`;
        donateBtn.style.display = "inline-flex";
      } else {
        donateBtn.style.display = "none";
      }
    }

    return gameShareUrl;
  }

  /* ================= MAIN 3D GAME ENGINE ================= */
  class TurboSanta3DGame {
    constructor() {
      this.save = loadSave();
      this.audio = new SleighAudio(this.save.muted);
      this.mode = "endless";
      this.state = "menu"; // menu | playing | paused | gameover
      this.rng = Math.random;

      // Gameplay runtime state
      this.lane = 1;
      this.targetX = LANE_X[1];
      this.currentX = LANE_X[1];
      this.jumpY = 0;
      this.jumpVy = 0;
      this.isGrounded = true;
      this.distance = 0;
      this.score = 0;
      this.runCoins = 0;
      this.giftsHit = 0;
      this.giftsDropped = 0;
      this.combo = 1;
      this.maxComboRun = 1;
      this.hearts = 3;
      this.maxHearts = 3;
      this.turboMeter = 0;
      this.turboTimer = 0;
      this.shieldTimer = 0;
      this.magnetTimer = 0;
      this.invulnTimer = 0;
      this.blitzTimeLeft = 120;
      this.currentBiomeIdx = 0;
      this.lastDropCooldown = 0;
      this.shakeTime = 0;

      // Collections in active 3D scene
      this.chunks = [];
      this.nextChunkZ = -24;
      this.droppedGifts = [];
      this.particles = [];
      this.smokePuffs = [];
      this.reindeerLegs = [];
      this.nextGiftColors = [0xd31c1c, 0x16a34a, 0x2563eb, 0xd97706, 0x9333ea];

      this.initThree();
      this.buildSharedAssets();
      this.buildAtmosphere();
      this.buildSleighRig(this.save.selectedSkin);
      this.resetWorldChunks();
      this.bindInputs();
      this.refreshMenuUI();
      populateTownSelector(this.save);

      this.lastFrameTime = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    initThree() {
      const container = document.getElementById("game-canvas-wrap");
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(BIOMES[0].sky);
      this.scene.fog = new THREE.FogExp2(BIOMES[0].fog, 0.0085);

      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(56, w / h, 0.2, 260);
      this.camera.position.set(0, 6.2, 9.6);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.innerHTML = "";
      container.appendChild(this.renderer.domElement);

      // Lights
      this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.72);
      this.scene.add(this.hemiLight);

      this.moonLight = new THREE.DirectionalLight(0xe0f2fe, 1.15);
      this.moonLight.position.set(22, 38, 18);
      this.moonLight.castShadow = true;
      this.moonLight.shadow.mapSize.width = 1024;
      this.moonLight.shadow.mapSize.height = 1024;
      this.moonLight.shadow.camera.near = 5;
      this.moonLight.shadow.camera.far = 110;
      const d = 24;
      this.moonLight.shadow.camera.left = -d;
      this.moonLight.shadow.camera.right = d;
      this.moonLight.shadow.camera.top = d;
      this.moonLight.shadow.camera.bottom = -d;
      this.scene.add(this.moonLight);

      window.addEventListener("resize", () => {
        const nw = window.innerWidth;
        const nh = window.innerHeight;
        this.camera.aspect = nw / nh;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(nw, nh);
      });
    }

    buildSharedAssets() {
      this.geo = {
        box1: new THREE.BoxGeometry(1, 1, 1),
        groundPlane: new THREE.PlaneGeometry(42, CHUNK_LEN + 0.5),
        houseBody: new THREE.BoxGeometry(3.15, 2.5, 4.4),
        roofSlope: new THREE.BoxGeometry(2.35, 0.24, 4.7),
        windowPane: new THREE.PlaneGeometry(0.62, 0.78),
        chimney: new THREE.BoxGeometry(1.15, 1.05, 1.15),
        chimneyTrim: new THREE.BoxGeometry(1.32, 0.2, 1.32),
        targetHalo: new THREE.TorusGeometry(0.95, 0.08, 10, 28),
        aimHalo: new THREE.TorusGeometry(0.88, 0.09, 10, 28),
        coin: new THREE.CylinderGeometry(0.46, 0.46, 0.14, 18),
        carrotBody: new THREE.ConeGeometry(0.24, 0.9, 10),
        carrotTop: new THREE.ConeGeometry(0.22, 0.38, 7),
        shieldOrb: new THREE.OctahedronGeometry(0.48, 0),
        magnetBody: new THREE.TorusGeometry(0.36, 0.11, 8, 16, Math.PI),
        pieBase: new THREE.CylinderGeometry(0.46, 0.36, 0.24, 14),
        aerialPole: new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6),
        aerialCross: new THREE.BoxGeometry(2.6, 0.14, 0.14),
        towerBody: new THREE.BoxGeometry(2.15, 5.8, 2.15),
        towerSpire: new THREE.ConeGeometry(1.65, 2.1, 4),
        treeCone1: new THREE.ConeGeometry(1.3, 2.5, 7),
        treeCone2: new THREE.ConeGeometry(0.95, 2.0, 7),
        trunk: new THREE.CylinderGeometry(0.22, 0.28, 1.0, 6),
        lampPost: new THREE.CylinderGeometry(0.07, 0.1, 3.2, 7),
        lampGlow: new THREE.SphereGeometry(0.24, 10, 10),
        presentBox: new THREE.BoxGeometry(0.68, 0.68, 0.68),
        ribbonBandA: new THREE.BoxGeometry(0.73, 0.72, 0.16),
        ribbonBandB: new THREE.BoxGeometry(0.16, 0.72, 0.73),
        particleCube: new THREE.BoxGeometry(0.18, 0.18, 0.18),
        smokeSphere: new THREE.SphereGeometry(0.28, 8, 8)
      };

      this.mat = {
        snowGround: new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.92 }),
        streetPath: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }),
        snowCap: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 }),
        winLit: new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.9 }),
        brickChimney: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.9 }),
        flueGlow: new THREE.MeshBasicMaterial({ color: 0xfbaf33 }),
        targetHalo: new THREE.MeshBasicMaterial({ color: 0xfbaf33 }),
        coinGold: new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x92400e, metalness: 0.75, roughness: 0.22 }),
        carrotOrange: new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xc2410c, roughness: 0.4 }),
        carrotLeaf: new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d }),
        shieldBlue: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, metalness: 0.6, roughness: 0.2 }),
        magnetRed: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, metalness: 0.5 }),
        pieCrust: new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0x78350f, roughness: 0.7 }),
        aerialMetal: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, emissive: 0x475569, metalness: 0.8, roughness: 0.3 }),
        warnStripe: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626 }),
        towerStone: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 }),
        towerRoof: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 }),
        pineGreen: new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 }),
        woodDark: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }),
        ironDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 }),
        lampBulb: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
        ribbonGold: new THREE.MeshStandardMaterial({ color: 0xfbaf33, emissive: 0x78350f, metalness: 0.5 }),
        smoke: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.55 })
      };
    }

    buildAtmosphere() {
      // Starfield
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 220;
        starPos[i * 3 + 1] = 18 + Math.random() * 75;
        starPos[i * 3 + 2] = -20 - Math.random() * 190;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, transparent: true, opacity: 0.85 });
      this.stars = new THREE.Points(starGeo, starMat);
      this.scene.add(this.stars);

      // Moon
      const moonGeo = new THREE.SphereGeometry(7.5, 24, 24);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
      this.moon = new THREE.Mesh(moonGeo, moonMat);
      this.moon.position.set(-28, 38, -145);
      this.scene.add(this.moon);

      // Procedural Aurora Borealis Ribbon
      const auroraGeo = new THREE.PlaneGeometry(140, 26, 28, 4);
      const auroraMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
      this.auroraMesh.position.set(0, 32, -125);
      this.auroraMesh.rotation.x = 0.35;
      this.auroraBasePos = Float32Array.from(auroraGeo.attributes.position.array);
      this.scene.add(this.auroraMesh);

      // Falling Snowfall Particle System
      const snowGeo = new THREE.BufferGeometry();
      this.snowCount = 520;
      this.snowPositions = new Float32Array(this.snowCount * 3);
      for (let i = 0; i < this.snowCount; i++) {
        this.snowPositions[i * 3] = (Math.random() - 0.5) * 34;
        this.snowPositions[i * 3 + 1] = Math.random() * 20;
        this.snowPositions[i * 3 + 2] = 12 - Math.random() * 70;
      }
      snowGeo.setAttribute("position", new THREE.BufferAttribute(this.snowPositions, 3));
      const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.85 });
      this.snowSystem = new THREE.Points(snowGeo, snowMat);
      this.scene.add(this.snowSystem);
    }

    buildSleighRig(skinId) {
      if (this.sleighGroup) {
        this.scene.remove(this.sleighGroup);
      }
      if (this.aimRing) {
        this.scene.remove(this.aimRing);
      }
      this.reindeerLegs = [];

      const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
      const root = new THREE.Group();
      root.position.set(this.currentX, BASE_SLEIGH_Y, 0);

      const bodyMat = new THREE.MeshStandardMaterial({
        color: skin.body,
        emissive: skin.emissive,
        metalness: skin.id === "gold24k" ? 0.78 : 0.35,
        roughness: 0.3
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: skin.trim,
        emissive: skin.trim,
        emissiveIntensity: skin.id === "cyber" ? 0.65 : 0.25,
        metalness: 0.7,
        roughness: 0.2
      });
      const runnerMat = new THREE.MeshStandardMaterial({
        color: skin.runner,
        metalness: 0.85,
        roughness: 0.18
      });

      // Twin Sleigh Runners + Curled Fronts
      [-0.72, 0.72].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.7), runnerMat);
        rail.position.set(rx, -0.58, 0.1);
        rail.castShadow = true;
        root.add(rail);

        const curl = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 12, Math.PI), runnerMat);
        curl.rotation.y = Math.PI / 2;
        curl.position.set(rx, -0.38, -1.22);
        root.add(curl);

        const strutFront = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.09), runnerMat);
        strutFront.position.set(rx, -0.38, -0.65);
        root.add(strutFront);

        const strutBack = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.09), runnerMat);
        strutBack.position.set(rx, -0.38, 0.75);
        root.add(strutBack);
      });

      // Sleigh Hull & Trim
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.68, 2.25), bodyMat);
      hull.position.set(0, -0.05, 0.15);
      hull.castShadow = true;
      root.add(hull);

      const trimTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.11, 2.32), trimMat);
      trimTop.position.set(0, 0.32, 0.15);
      root.add(trimTop);

      const backRest = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.55, 0.22), bodyMat);
      backRest.position.set(0, 0.45, 1.15);
      backRest.rotation.x = 0.22;
      root.add(backRest);

      // Toy Sack + Mini Presents in back
      const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 1), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9 }));
      sack.position.set(-0.22, 0.45, 0.72);
      root.add(sack);

      const box1 = new THREE.Mesh(this.geo.presentBox, new THREE.MeshStandardMaterial({ color: 0x16a34a }));
      box1.scale.set(0.55, 0.55, 0.55);
      box1.position.set(0.35, 0.42, 0.78);
      root.add(box1);

      // Santa Claus Pilot
      const santaGroup = new THREE.Group();
      santaGroup.position.set(0, 0.42, -0.15);
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.62, 10), new THREE.MeshStandardMaterial({ color: 0xd31c1c }));
      torso.position.y = 0.22;
      santaGroup.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfed7aa }));
      head.position.y = 0.68;
      santaGroup.add(head);

      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), this.mat.snowCap);
      beard.position.set(0, 0.57, -0.09);
      santaGroup.add(beard);

      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0xd31c1c }));
      hat.position.set(0, 0.95, 0.05);
      hat.rotation.x = 0.35;
      santaGroup.add(hat);

      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.mat.snowCap);
      pom.position.set(0, 1.12, 0.2);
      santaGroup.add(pom);
      root.add(santaGroup);

      // Twin Reindeer Team (Rudolph Lead + Dasher Wingman)
      const furMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
      const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.7 });
      [
        { x: -0.48, z: -2.95, isRudolph: true },
        { x: 0.48, z: -2.45, isRudolph: false }
      ].forEach((cfg, idx) => {
        const deer = new THREE.Group();
        deer.position.set(cfg.x, -0.15, cfg.z);

        const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.95), furMat);
        dBody.castShadow = true;
        deer.add(dBody);

        const dNeck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.28), furMat);
        dNeck.position.set(0, 0.34, -0.34);
        dNeck.rotation.x = -0.35;
        deer.add(dNeck);

        const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.44), furMat);
        dHead.position.set(0, 0.56, -0.5);
        deer.add(dHead);

        if (cfg.isRudolph) {
          const redNoseMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 2.0 });
          const nose = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), redNoseMat);
          nose.position.set(0, 0.56, -0.74);
          deer.add(nose);

          this.rudolphLight = new THREE.PointLight(0xff2a2a, 1.4, 9);
          this.rudolphLight.position.set(0, 0.56, -0.95);
          deer.add(this.rudolphLight);
        }

        // Antlers
        [-0.12, 0.12].forEach((ax) => {
          const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 5), antlerMat);
          antler.position.set(ax, 0.82, -0.38);
          antler.rotation.z = ax < 0 ? 0.3 : -0.3;
          deer.add(antler);
        });

        // Articulated Legs for gallop animation
        [
          { lx: -0.14, lz: -0.32, phase: idx * 1.4 },
          { lx: 0.14, lz: -0.32, phase: idx * 1.4 + 0.5 },
          { lx: -0.14, lz: 0.32, phase: idx * 1.4 + Math.PI },
          { lx: 0.14, lz: 0.32, phase: idx * 1.4 + Math.PI + 0.5 }
        ].forEach((legCfg) => {
          const pivot = new THREE.Group();
          pivot.position.set(legCfg.lx, -0.16, legCfg.lz);
          const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.12), furMat);
          legMesh.position.y = -0.22;
          pivot.add(legMesh);
          pivot.userData.phase = legCfg.phase;
          deer.add(pivot);
          this.reindeerLegs.push(pivot);
        });

        // Glowing Golden Harness Rein back to Sleigh
        const reinLen = Math.abs(cfg.z) - 0.85;
        const rein = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, reinLen, 5),
          new THREE.MeshBasicMaterial({ color: 0xfbaf33 })
        );
        rein.rotation.x = Math.PI / 2;
        rein.position.set(cfg.x * 0.55, 0.15, cfg.z * 0.5 - 0.15);
        root.add(rein);

        root.add(deer);
      });

      // Shield Dome visual (shown only when Shield is active)
      this.shieldBubble = new THREE.Mesh(
        new THREE.SphereGeometry(2.15, 22, 18),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          transparent: true,
          opacity: 0.25,
          wireframe: true
        })
      );
      this.shieldBubble.visible = false;
      root.add(this.shieldBubble);

      this.sleighGroup = root;
      this.scene.add(root);

      // Rooftop Present-Drop Aiming Reticle at z = 0 below the sleigh
      this.aimRing = new THREE.Group();
      const ringMesh = new THREE.Mesh(this.geo.aimHalo, new THREE.MeshBasicMaterial({ color: 0xfbaf33, transparent: true, opacity: 0.85 }));
      ringMesh.rotation.x = Math.PI / 2;
      this.aimRingMesh = ringMesh;
      this.aimRing.add(ringMesh);
      this.aimRing.position.set(this.currentX, 1.48, 0);
      this.scene.add(this.aimRing);
    }

    resetWorldChunks() {
      for (const ch of this.chunks) {
        this.scene.remove(ch.group);
      }
      this.chunks = [];
      for (const g of this.droppedGifts) this.scene.remove(g.mesh);
      this.droppedGifts = [];
      for (const p of this.particles) this.scene.remove(p.mesh);
      this.particles = [];
      for (const s of this.smokePuffs) this.scene.remove(s.mesh);
      this.smokePuffs = [];

      this.nextChunkZ = 18;
      for (let i = 0; i < CHUNK_COUNT; i++) {
        this.spawnNextChunk(i < 2); // First 2 chunks safe warmup
      }
    }

    spawnNextChunk(safeOnly = false) {
      const zCenter = this.nextChunkZ - CHUNK_LEN;
      this.nextChunkZ = zCenter;

      const biomeIdx = this.getBiomeIndexForDistance(this.distance);
      const biome = BIOMES[biomeIdx];
      const houseColors = biome.housePalette;

      const group = new THREE.Group();
      group.position.set(0, 0, zCenter);

      // Ground snow + central dark street beneath rooftops
      const snowPlane = new THREE.Mesh(this.geo.groundPlane, this.mat.snowGround);
      snowPlane.rotation.x = -Math.PI / 2;
      snowPlane.position.y = -2.2;
      snowPlane.receiveShadow = true;
      group.add(snowPlane);

      // Side Festive Pine Trees & Warm Street Lamps flanking the 3 rooftop lanes
      [-8.5, 8.5].forEach((sx, sIdx) => {
        if (this.rng() < 0.85) {
          const tree = new THREE.Group();
          tree.position.set(sx + (sIdx === 0 ? -1 : 1) * (this.rng() * 1.6), -2.2, (this.rng() - 0.5) * 8);
          const trunk = new THREE.Mesh(this.geo.trunk, this.mat.woodDark);
          trunk.position.y = 0.5;
          tree.add(trunk);
          const c1 = new THREE.Mesh(this.geo.treeCone1, this.mat.pineGreen);
          c1.position.y = 2.0;
          tree.add(c1);
          const c2 = new THREE.Mesh(this.geo.treeCone2, this.mat.pineGreen);
          c2.position.y = 3.2;
          tree.add(c2);
          group.add(tree);
        }

        const lamp = new THREE.Group();
        lamp.position.set(sx * 0.72, -2.2, 0);
        const post = new THREE.Mesh(this.geo.lampPost, this.mat.ironDark);
        post.position.y = 1.6;
        lamp.add(post);
        const bulb = new THREE.Mesh(this.geo.lampGlow, this.mat.lampBulb);
        bulb.position.y = 3.3;
        lamp.add(bulb);
        group.add(lamp);
      });

      const chunkData = {
        group,
        z: zCenter,
        chimneys: [],
        obstacles: [],
        collectibles: []
      };

      // Houses placed under each of the 3 lanes (spaced neatly at two rows per chunk: z = -4.5 and z = +4.5)
      const houseMat = new THREE.MeshStandardMaterial({
        color: houseColors[Math.floor(this.rng() * houseColors.length)],
        roughness: 0.85
      });

      const targetLane = this.rng() < 0.88 ? Math.floor(this.rng() * 3) : -1;
      let obstacleLane = -1;
      if (!safeOnly && this.rng() < 0.78) {
        obstacleLane = Math.floor(this.rng() * 3);
        if (obstacleLane === targetLane && this.rng() < 0.7) {
          obstacleLane = (targetLane + 1) % 3;
        }
      }

      // Row at local z = 0 inside chunk
      for (let lIdx = 0; lIdx < 3; lIdx++) {
        const lx = LANE_X[lIdx];
        // Townhouse model on this lane
        const house = new THREE.Group();
        house.position.set(lx, -0.95, 0);

        const body = new THREE.Mesh(this.geo.houseBody, houseMat);
        body.castShadow = true;
        body.receiveShadow = true;
        house.add(body);

        // Pitched snowy roof left/right halves
        const roofL = new THREE.Mesh(this.geo.roofSlope, this.mat.snowCap);
        roofL.position.set(-0.85, 1.55, 0);
        roofL.rotation.z = 0.55;
        roofL.receiveShadow = true;
        house.add(roofL);

        const roofR = new THREE.Mesh(this.geo.roofSlope, this.mat.snowCap);
        roofR.position.set(0.85, 1.55, 0);
        roofR.rotation.z = -0.55;
        roofR.receiveShadow = true;
        house.add(roofR);

        // Glowing front windows
        [-0.85, 0.85].forEach((wx) => {
          const win = new THREE.Mesh(this.geo.windowPane, this.mat.winLit);
          win.position.set(wx, 0.15, 2.22);
          house.add(win);
        });

        group.add(house);

        // Target Chimney on targetLane!
        if (lIdx === targetLane && lIdx !== obstacleLane) {
          const chim = new THREE.Group();
          chim.position.set(lx, 1.0, 0);

          const cStack = new THREE.Mesh(this.geo.chimney, this.mat.brickChimney);
          cStack.castShadow = true;
          chim.add(cStack);

          const cRim = new THREE.Mesh(this.geo.chimneyTrim, this.mat.snowCap);
          cRim.position.y = 0.55;
          chim.add(cRim);

          const flue = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.75), this.mat.flueGlow);
          flue.position.y = 0.63;
          chim.add(flue);

          const halo = new THREE.Mesh(this.geo.targetHalo, this.mat.targetHalo);
          halo.rotation.x = Math.PI / 2;
          halo.position.y = 0.85;
          chim.add(halo);

          group.add(chim);
          chunkData.chimneys.push({
            lane: lIdx,
            x: lx,
            localZ: 0,
            halo,
            flue,
            delivered: false
          });
        }

        // Obstacles on obstacleLane (avoiding chimney overlap)
        if (lIdx === obstacleLane && !safeOnly) {
          const isTallTower = this.rng() < 0.42;
          if (isTallTower) {
            const tower = new THREE.Group();
            tower.position.set(lx, 2.9, 0);
            const tBody = new THREE.Mesh(this.geo.towerBody, this.mat.towerStone);
            tBody.castShadow = true;
            tower.add(tBody);
            const spire = new THREE.Mesh(this.geo.towerSpire, this.mat.towerRoof);
            spire.position.y = 3.9;
            spire.rotation.y = Math.PI / 4;
            tower.add(spire);
            group.add(tower);
            chunkData.obstacles.push({
              type: "tower",
              lane: lIdx,
              x: lx,
              localZ: 0,
              hitYMax: 6.8,
              hit: false
            });
          } else {
            // Jumpable TV Aerial / Garland Barrier
            const aerial = new THREE.Group();
            aerial.position.set(lx, 1.85, 0);
            const pole = new THREE.Mesh(this.geo.aerialPole, this.mat.aerialMetal);
            aerial.add(pole);
            const bar = new THREE.Mesh(this.geo.aerialCross, this.mat.warnStripe);
            bar.position.y = 1.15;
            aerial.add(bar);
            group.add(aerial);
            chunkData.obstacles.push({
              type: "aerial",
              lane: lIdx,
              x: lx,
              localZ: 0,
              hitYMax: 3.45,
              hit: false
            });
          }
        }
      }

      // Spawn Collectibles along free/jump spots in chunk
      const collectLane = Math.floor(this.rng() * 3);
      const laneHasTower = chunkData.obstacles.some((o) => o.lane === collectLane && o.type === "tower");
      if (!laneHasTower) {
        const laneHasAerial = chunkData.obstacles.some((o) => o.lane === collectLane && o.type === "aerial");
        const cy = laneHasAerial ? 5.05 : 3.05;
        const roll = this.rng();
        let kind = "coin";
        if (!safeOnly && roll > 0.91) kind = "shield";
        else if (!safeOnly && roll > 0.83) kind = "magnet";
        else if (!safeOnly && roll > 0.72) kind = "carrot";
        else if (!safeOnly && roll > 0.67 && this.hearts < this.maxHearts) kind = "pie";

        const mesh = this.createCollectibleMesh(kind);
        const cz = laneHasAerial ? 0 : -5.5;
        mesh.position.set(LANE_X[collectLane], cy, cz);
        group.add(mesh);
        chunkData.collectibles.push({
          kind,
          mesh,
          lane: collectLane,
          x: LANE_X[collectLane],
          y: cy,
          localZ: cz,
          collected: false
        });

        // Second coin trailing behind when coin
        if (kind === "coin" && !laneHasAerial && this.rng() < 0.65) {
          const c2 = this.createCollectibleMesh("coin");
          c2.position.set(LANE_X[collectLane], cy, 4.5);
          group.add(c2);
          chunkData.collectibles.push({
            kind: "coin",
            mesh: c2,
            lane: collectLane,
            x: LANE_X[collectLane],
            y: cy,
            localZ: 4.5,
            collected: false
          });
        }
      }

      this.scene.add(group);
      this.chunks.push(chunkData);
    }

    createCollectibleMesh(kind) {
      const g = new THREE.Group();
      if (kind === "coin") {
        const c = new THREE.Mesh(this.geo.coin, this.mat.coinGold);
        c.rotation.z = Math.PI / 2;
        g.add(c);
      } else if (kind === "carrot") {
        const body = new THREE.Mesh(this.geo.carrotBody, this.mat.carrotOrange);
        body.rotation.x = Math.PI;
        const leaf = new THREE.Mesh(this.geo.carrotTop, this.mat.carrotLeaf);
        leaf.position.y = 0.55;
        g.add(body, leaf);
      } else if (kind === "shield") {
        const orb = new THREE.Mesh(this.geo.shieldOrb, this.mat.shieldBlue);
        g.add(orb);
      } else if (kind === "magnet") {
        const mag = new THREE.Mesh(this.geo.magnetBody, this.mat.magnetRed);
        g.add(mag);
      } else if (kind === "pie") {
        const pie = new THREE.Mesh(this.geo.pieBase, this.mat.pieCrust);
        g.add(pie);
      }
      return g;
    }

    getBiomeIndexForDistance(dist) {
      let idx = 0;
      for (let i = BIOMES.length - 1; i >= 0; i--) {
        if (dist >= BIOMES[i].minDist) {
          idx = i;
          break;
        }
      }
      return idx;
    }

    steer(dir) {
      if (this.state !== "playing") return;
      const next = Math.max(0, Math.min(2, this.lane + dir));
      if (next !== this.lane) {
        this.lane = next;
        this.targetX = LANE_X[next];
      }
    }

    jump() {
      if (this.state !== "playing") return;
      if (this.isGrounded) {
        this.isGrounded = false;
        this.jumpVy = 13.5;
        this.audio.sfxJump();
      }
    }

    dropPresent() {
      if (this.state !== "playing" || this.lastDropCooldown > 0) return;
      this.lastDropCooldown = 0.16;
      this.giftsDropped++;
      this.audio.sfxDrop();

      const col = this.nextGiftColors[this.giftsDropped % this.nextGiftColors.length];
      const boxGroup = new THREE.Group();
      const box = new THREE.Mesh(this.geo.presentBox, new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
      const ribA = new THREE.Mesh(this.geo.ribbonBandA, this.mat.ribbonGold);
      const ribB = new THREE.Mesh(this.geo.ribbonBandB, this.mat.ribbonGold);
      boxGroup.add(box, ribA, ribB);
      boxGroup.position.set(this.currentX, BASE_SLEIGH_Y + this.jumpY - 0.35, 0);
      this.scene.add(boxGroup);

      this.droppedGifts.push({
        mesh: boxGroup,
        x: this.currentX,
        vy: -7.5,
        resolved: false
      });
    }

    activateTurbo() {
      if (this.state !== "playing" || this.turboMeter < 100 || this.turboTimer > 0) return;
      this.turboMeter = 0;
      const turboBonusSecs = (this.save.upgrades.turbo || 0) * 1.5;
      this.turboTimer = 5.5 + turboBonusSecs;
      this.invulnTimer = Math.max(this.invulnTimer, this.turboTimer + 0.8);
      this.audio.sfxTurbo();
      this.showWorldPopup("🔥 RUDOLPH TURBO!", this.currentX, BASE_SLEIGH_Y + this.jumpY + 1.4, "#FBAF33");
      this.unlockAchievement("santa_express");
      document.getElementById("fx-vignette").className = "turbo";
    }

    startGame(modeOverride) {
      if (modeOverride) this.mode = modeOverride;
      if (this.mode === "daily") {
        this.rng = createMulberry32(hashStringToSeed(`turbosanta-${getTodayKey()}`));
      } else {
        this.rng = Math.random;
      }

      this.lane = 1;
      this.targetX = LANE_X[1];
      this.currentX = LANE_X[1];
      this.jumpY = 0;
      this.jumpVy = 0;
      this.isGrounded = true;
      this.distance = 0;
      this.score = 0;
      this.runCoins = 0;
      this.giftsHit = 0;
      this.giftsDropped = 0;
      this.combo = 1;
      this.maxComboRun = 1;
      this.maxHearts = 3 + (this.save.upgrades.hearts || 0);
      this.hearts = this.maxHearts;
      this.turboMeter = 0;
      this.turboTimer = 0;
      this.shieldTimer = 0;
      this.magnetTimer = 0;
      this.invulnTimer = 0;
      this.blitzTimeLeft = 120;
      this.currentBiomeIdx = 0;
      this.lastDropCooldown = 0;
      this.shakeTime = 0;

      this.scene.background.setHex(BIOMES[0].sky);
      this.scene.fog.color.setHex(BIOMES[0].fog);
      this.buildSleighRig(this.save.selectedSkin);
      this.resetWorldChunks();

      document.getElementById("fx-vignette").className = "";
      document.getElementById("menu-overlay").classList.add("hidden");
      document.getElementById("pause-overlay").classList.add("hidden");
      document.getElementById("gameover-overlay").classList.add("hidden");
      document.getElementById("controls-dock").classList.remove("hidden");

      const isBlitz = this.mode === "blitz";
      document.getElementById("hud-timer-box").style.display = isBlitz ? "block" : "none";
      document.getElementById("hud-timer-sep").style.display = isBlitz ? "block" : "none";

      this.state = "playing";
      this.announceBiome(BIOMES[0]);
      this.audio.startMusic();
      this.updateHUD();
    }

    pauseGame() {
      if (this.state !== "playing") return;
      this.state = "paused";
      this.audio.stopMusic();
      document.getElementById("pause-overlay").classList.remove("hidden");
    }

    resumeGame() {
      if (this.state !== "paused") return;
      this.state = "playing";
      this.lastFrameTime = performance.now();
      document.getElementById("pause-overlay").classList.add("hidden");
      this.audio.startMusic();
    }

    endGame() {
      if (this.state === "gameover") return;
      this.state = "gameover";
      this.audio.stopMusic();
      document.getElementById("controls-dock").classList.add("hidden");
      document.getElementById("fx-vignette").className = "";

      const finalScore = Math.floor(this.score);
      this.save.coins += this.runCoins;
      this.save.totalPresents += this.giftsHit;
      this.save.totalRuns++;
      this.save.bestCombo = Math.max(this.save.bestCombo || 1, this.maxComboRun);

      let isNewBest = false;
      const todayKey = getTodayKey();
      if (this.mode === "endless" && finalScore > (this.save.bestScores.endless || 0)) {
        this.save.bestScores.endless = finalScore;
        isNewBest = true;
      } else if (this.mode === "blitz") {
        if (finalScore > (this.save.bestScores.blitz || 0)) {
          this.save.bestScores.blitz = finalScore;
          isNewBest = true;
        }
        if (finalScore >= 5000) this.unlockAchievement("blitz_ace");
      } else if (this.mode === "daily") {
        if (!this.save.bestScores.daily) this.save.bestScores.daily = {};
        if (finalScore > (this.save.bestScores.daily[todayKey] || 0)) {
          this.save.bestScores.daily[todayKey] = finalScore;
          isNewBest = true;
        }
      }

      persistSave(this.save);
      this.refreshMenuUI();

      const accuracy = this.giftsDropped > 0 ? Math.round((this.giftsHit / this.giftsDropped) * 100) : 0;
      document.getElementById("over-new-best").style.display = isNewBest ? "block" : "none";
      document.getElementById("over-score").textContent = finalScore.toLocaleString();
      document.getElementById("over-gifts").textContent = String(this.giftsHit);
      document.getElementById("over-accuracy").textContent = `${accuracy}%`;
      document.getElementById("over-coins").textContent = `+${this.runCoins}`;
      document.getElementById("over-badge").textContent = this.mode === "blitz" ? "⚡ 2-Minute Blitz Complete" : (this.mode === "daily" ? "📅 Daily Challenge Complete" : "❄️ Flight Complete");
      document.getElementById("over-subtitle").textContent = `You flew ${Math.floor(this.distance).toLocaleString()}m over Christmas rooftops with a max x${this.maxComboRun} streak!`;
      document.getElementById("gameover-overlay").classList.remove("hidden");
    }

    unlockAchievement(id) {
      if (this.save.achievements.includes(id)) return;
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      if (!ach) return;
      this.save.achievements.push(id);
      persistSave(this.save);
      this.audio.sfxAchievement();

      const toast = document.getElementById("ach-toast");
      document.getElementById("ach-toast-name").textContent = ach.title;
      toast.classList.add("visible");
      setTimeout(() => toast.classList.remove("visible"), 3200);
      this.refreshMenuUI();
    }

    announceBiome(biome) {
      const banner = document.getElementById("biome-banner");
      banner.textContent = `${biome.icon} ${biome.name}`;
      banner.classList.add("visible");
      setTimeout(() => banner.classList.remove("visible"), 2600);
    }

    showWorldPopup(text, wx, wy, color = "#FBAF33") {
      const v = new THREE.Vector3(wx, wy, 0);
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
      const el = document.createElement("div");
      el.className = "world-popup";
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.color = color;
      document.getElementById("fx-popups").appendChild(el);
      setTimeout(() => el.remove(), 920);
    }

    spawnBurst(x, y, z, colorHex, count = 16) {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(this.geo.particleCube, mat);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.particles.push({
          mesh,
          vx: (Math.random() - 0.5) * 9,
          vy: 2 + Math.random() * 8,
          vz: (Math.random() - 0.5) * 8,
          life: 0.65 + Math.random() * 0.25
        });
      }
    }

    loop(now) {
      requestAnimationFrame(this.loop);
      const rawDt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      this.animateAtmosphere(now * 0.001, dt);

      if (this.state === "menu" || this.state === "paused" || this.state === "gameover") {
        // Gentle idle hover preview behind menus
        if (this.sleighGroup) {
          this.sleighGroup.position.y = BASE_SLEIGH_Y + Math.sin(now * 0.0025) * 0.16;
          const angle = this.state === "menu" ? Math.sin(now * 0.0005) * 0.35 : 0;
          this.sleighGroup.rotation.y = angle;
          this.animateReindeer(now * 0.005);
        }
        this.camera.position.set(0, 5.8, 9.6);
        this.camera.lookAt(0, 2.2, -16);
        this.renderer.render(this.scene, this.camera);
        return;
      }

      this.updatePlaying(dt, now);
      this.renderer.render(this.scene, this.camera);
    }

    animateReindeer(phaseBase) {
      for (const leg of this.reindeerLegs) {
        leg.rotation.x = Math.sin(phaseBase + (leg.userData.phase || 0)) * 0.65;
      }
    }

    animateAtmosphere(sec, dt) {
      if (this.auroraMesh && this.auroraBasePos) {
        const attr = this.auroraMesh.geometry.attributes.position;
        for (let i = 0; i < attr.count; i++) {
          const bx = this.auroraBasePos[i * 3];
          const by = this.auroraBasePos[i * 3 + 1];
          const bz = this.auroraBasePos[i * 3 + 2];
          attr.setZ(i, bz + Math.sin(bx * 0.08 + sec * 1.1) * 4.5);
          attr.setY(i, by + Math.cos(bx * 0.05 + sec * 0.9) * 1.6);
        }
        attr.needsUpdate = true;
        this.auroraMesh.material.color.setHSL(0.42 + Math.sin(sec * 0.25) * 0.08, 0.85, 0.55);
      }

      if (this.snowSystem) {
        const attr = this.snowSystem.geometry.attributes.position;
        const driftZ = this.state === "playing" ? 18 : 3;
        for (let i = 0; i < this.snowCount; i++) {
          let sy = attr.getY(i) - dt * 3.4;
          let sz = attr.getZ(i) + dt * driftZ;
          if (sy < -1) sy = 19;
          if (sz > 14) sz = -55;
          attr.setY(i, sy);
          attr.setZ(i, sz);
        }
        attr.needsUpdate = true;
      }
    }

    updatePlaying(dt, now) {
      if (this.lastDropCooldown > 0) this.lastDropCooldown -= dt;
      if (this.invulnTimer > 0) this.invulnTimer -= dt;
      if (this.shieldTimer > 0) this.shieldTimer -= dt;
      if (this.magnetTimer > 0) this.magnetTimer -= dt;
      if (this.shakeTime > 0) this.shakeTime -= dt;

      if (this.turboTimer > 0) {
        this.turboTimer -= dt;
        if (this.turboTimer <= 0) {
          document.getElementById("fx-vignette").className = "";
        }
      }

      if (this.mode === "blitz") {
        this.blitzTimeLeft -= dt;
        if (this.blitzTimeLeft <= 0) {
          this.blitzTimeLeft = 0;
          this.endGame();
          return;
        }
      }

      // Base speed ramps up with distance + Turbo multiplier
      const baseSpeed = 23 + Math.min(20, this.distance * 0.0085);
      const currentSpeed = this.turboTimer > 0 ? baseSpeed * 1.55 : baseSpeed;

      this.distance += currentSpeed * dt;
      this.score += currentSpeed * dt * (0.65 * this.combo);

      if (this.distance >= 1000) this.unlockAchievement("distance_hero");
      const nextBiomeIdx = this.getBiomeIndexForDistance(this.distance);
      if (nextBiomeIdx !== this.currentBiomeIdx) {
        this.currentBiomeIdx = nextBiomeIdx;
        this.announceBiome(BIOMES[nextBiomeIdx]);
        if (nextBiomeIdx === 3) this.unlockAchievement("aurora_flier");
      }
      this.scene.background.lerp(new THREE.Color(BIOMES[this.currentBiomeIdx].sky), dt * 0.9);
      this.scene.fog.color.lerp(new THREE.Color(BIOMES[this.currentBiomeIdx].fog), dt * 0.9);

      // Smooth Sleigh Steering & Banking
      const dx = this.targetX - this.currentX;
      this.currentX += dx * Math.min(1, dt * 13);
      if (!this.isGrounded) {
        this.jumpVy -= 34 * dt;
        this.jumpY += this.jumpVy * dt;
        if (this.jumpY <= 0) {
          this.jumpY = 0;
          this.jumpVy = 0;
          this.isGrounded = true;
        }
      }

      const hoverBob = this.isGrounded ? Math.sin(now * 0.008) * 0.1 : 0;
      const sleighY = BASE_SLEIGH_Y + this.jumpY + hoverBob;
      this.sleighGroup.position.set(this.currentX, sleighY, 0);
      this.sleighGroup.rotation.z = THREE.MathUtils.clamp(-dx * 0.14, -0.42, 0.42);
      this.sleighGroup.rotation.x = this.isGrounded ? 0 : THREE.MathUtils.clamp(this.jumpVy * 0.025, -0.25, 0.35);
      this.sleighGroup.rotation.y = 0;
      this.sleighGroup.visible = this.invulnTimer > 0 ? Math.floor(now * 0.02) % 2 === 0 || this.turboTimer > 0 : true;
      this.shieldBubble.visible = this.shieldTimer > 0;
      if (this.shieldBubble.visible) this.shieldBubble.rotation.y += dt * 1.4;

      this.animateReindeer(now * (this.turboTimer > 0 ? 0.024 : 0.015));

      // Turbo sparkle trail
      if (this.turboTimer > 0 || Math.random() < 0.45) {
        this.spawnBurst(
          this.currentX + (Math.random() - 0.5) * 0.8,
          sleighY - 0.35,
          1.2,
          this.turboTimer > 0 ? 0xfbbf24 : 0x38bdf8,
          1
        );
      }

      // Scroll world chunks & evaluate collisions / chimney locks
      const chuteTolerance = 1.65 + (this.save.upgrades.chute || 0) * 0.35;
      let aimLockedOnChimney = false;

      for (const ch of this.chunks) {
        ch.z += currentSpeed * dt;
        ch.group.position.z = ch.z;

        // Chimneys: rotate halo, highlight aim reticle when in drop window, check missed chimneys
        for (const chim of ch.chimneys) {
          const wz = ch.z + chim.localZ;
          chim.halo.rotation.z += dt * 2.2;
          if (!chim.delivered && Math.abs(wz) < chuteTolerance && Math.abs(this.currentX - chim.x) < chuteTolerance) {
            aimLockedOnChimney = true;
          }
          if (!chim.delivered && wz > 6.5) {
            chim.delivered = true;
            if (this.combo > 1) {
              this.combo = 1;
              this.showWorldPopup("MISSED CHIMNEY!", chim.x, 1.8, "#F87171");
            }
          }
        }

        // Collectibles
        for (const col of ch.collectibles) {
          if (col.collected) continue;
          col.mesh.rotation.y += dt * 3.0;
          const wz = ch.z + col.localZ;
          // Elf Magnet pulls nearby coins
          if (this.magnetTimer > 0 && col.kind === "coin" && wz > -20 && wz < 4) {
            col.x = THREE.MathUtils.lerp(col.x, this.currentX, dt * 8);
            col.y = THREE.MathUtils.lerp(col.y, sleighY, dt * 8);
            col.mesh.position.set(col.x, col.y, col.localZ);
          }

          if (Math.abs(wz) < 1.35 && Math.abs(col.x - this.currentX) < 1.35 && Math.abs(col.y - sleighY) < 1.5) {
            col.collected = true;
            col.mesh.visible = false;
            this.handleCollectible(col);
          }
        }

        // Obstacles collision
        for (const obs of ch.obstacles) {
          if (obs.hit) continue;
          const wz = ch.z + obs.localZ;
          if (Math.abs(wz) < 1.1 && Math.abs(obs.x - this.currentX) < 1.15 && sleighY < obs.hitYMax) {
            obs.hit = true;
            if (this.turboTimer > 0) {
              // Turbo blasts straight through hazards!
              this.score += 120;
              this.spawnBurst(obs.x, sleighY, wz, 0xfbaf33, 18);
              this.showWorldPopup("SMASH! +120", obs.x, sleighY + 1, "#FBAF33");
            } else if (this.shieldTimer > 0) {
              this.shieldTimer = 0;
              this.invulnTimer = 1.5;
              this.audio.sfxHit();
              this.spawnBurst(this.currentX, sleighY, 0, 0x38bdf8, 22);
              this.showWorldPopup("SHIELD SAVED!", this.currentX, sleighY + 1, "#38BDF8");
            } else if (this.invulnTimer <= 0) {
              this.handleCrash();
            }
          }
        }
      }

      // Recycle old chunks & spawn ahead
      while (this.chunks.length > 0 && this.chunks[0].z > 22) {
        const old = this.chunks.shift();
        this.scene.remove(old.group);
        this.spawnNextChunk(false);
      }

      // Update aiming reticle right under the sleigh
      this.aimRing.position.set(this.currentX, 1.55, 0);
      this.aimRingMesh.material.color.setHex(aimLockedOnChimney ? 0x22c55e : 0xfbaf33);
      const aimPulse = aimLockedOnChimney ? 1.24 + Math.sin(now * 0.025) * 0.1 : 0.92;
      this.aimRing.scale.set(aimPulse, aimPulse, aimPulse);

      // Update falling presents
      for (let i = this.droppedGifts.length - 1; i >= 0; i--) {
        const g = this.droppedGifts[i];
        g.vy -= 26 * dt;
        g.mesh.position.y += g.vy * dt;
        g.mesh.position.z += currentSpeed * dt; // stays aligned with ground frame where released
        g.mesh.rotation.y += dt * 4;
        g.mesh.rotation.x += dt * 2.5;

        if (!g.resolved && g.mesh.position.y <= 1.65) {
          g.resolved = true;
          const gx = g.mesh.position.x;
          const gz = g.mesh.position.z;
          let matched = null;
          for (const ch of this.chunks) {
            for (const chim of ch.chimneys) {
              if (chim.delivered) continue;
              const cz = ch.z + chim.localZ;
              if (Math.hypot(gx - chim.x, gz - cz) <= chuteTolerance) {
                matched = { chim, cz };
                break;
              }
            }
            if (matched) break;
          }

          if (matched) {
            matched.chim.delivered = true;
            matched.chim.halo.visible = false;
            matched.chim.flue.material = new THREE.MeshBasicMaterial({ color: 0x22c55e });
            this.giftsHit++;
            this.combo = Math.min(8, this.combo + 1);
            this.maxComboRun = Math.max(this.maxComboRun, this.combo);
            const pts = 100 * this.combo;
            this.score += pts;
            this.turboMeter = Math.min(100, this.turboMeter + 12);
            this.audio.sfxBullseye(this.combo);
            this.spawnBurst(matched.chim.x, 1.8, matched.cz, 0xfbaf33, 24);
            this.showWorldPopup(`🎁 BULLSEYE! +${pts}`, matched.chim.x, 2.3, "#4ADE80");

            if (this.giftsHit >= 1) this.unlockAchievement("first_drop");
            if (this.combo >= 4) this.unlockAchievement("hat_trick");
            if (this.combo >= 8) this.unlockAchievement("fever_eight");
            if (this.giftsHit >= 15) this.unlockAchievement("sharpshooter");
          } else {
            this.combo = 1;
            this.spawnBurst(gx, 1.1, gz, 0xe2e8f0, 8);
          }

          this.scene.remove(g.mesh);
          this.droppedGifts.splice(i, 1);
        } else if (g.mesh.position.y < -2.5) {
          this.scene.remove(g.mesh);
          this.droppedGifts.splice(i, 1);
        }
      }

      // Update particle bursts
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.vy -= 14 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += (p.vz + currentSpeed * 0.45) * dt;
        p.mesh.scale.setScalar(Math.max(0.05, p.life * 1.4));
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          this.particles.splice(i, 1);
        }
      }

      // Dynamic Chase Camera (FOV kick during Turbo + camera shake on crash)
      const targetFov = this.turboTimer > 0 ? 67 : 56;
      this.camera.fov += (targetFov - this.camera.fov) * dt * 6;
      this.camera.updateProjectionMatrix();

      const shakeX = this.shakeTime > 0 ? (Math.random() - 0.5) * 0.45 : 0;
      const shakeY = this.shakeTime > 0 ? (Math.random() - 0.5) * 0.45 : 0;
      this.camera.position.set(this.currentX * 0.58 + shakeX, 6.2 + this.jumpY * 0.42 + shakeY, 9.6);
      this.camera.lookAt(this.currentX * 0.45, 2.2 + this.jumpY * 0.2, -18);

      this.updateHUD();
    }

    handleCollectible(col) {
      const sy = BASE_SLEIGH_Y + this.jumpY;
      if (col.kind === "coin") {
        this.runCoins++;
        const pts = 25 * this.combo;
        this.score += pts;
        this.audio.sfxCoin();
        this.spawnBurst(col.x, col.y, 0, 0xfbbf24, 10);
        if (this.runCoins >= 25) this.unlockAchievement("high_roller");
      } else if (col.kind === "carrot") {
        this.turboMeter = Math.min(100, this.turboMeter + 38);
        this.score += 75;
        this.audio.sfxPowerup();
        this.spawnBurst(col.x, col.y, 0, 0xf97316, 14);
        this.showWorldPopup("🥕 +TURBO", this.currentX, sy + 0.9, "#FB923C");
      } else if (col.kind === "shield") {
        this.shieldTimer = 10;
        this.audio.sfxPowerup();
        this.spawnBurst(col.x, col.y, 0, 0x38bdf8, 16);
        this.showWorldPopup("🛡️ SHIELD BELL!", this.currentX, sy + 0.9, "#38BDF8");
      } else if (col.kind === "magnet") {
        this.magnetTimer = 10 + (this.save.upgrades.magnet || 0) * 3;
        this.audio.sfxPowerup();
        this.spawnBurst(col.x, col.y, 0, 0xef4444, 16);
        this.showWorldPopup("🧲 COIN MAGNET!", this.currentX, sy + 0.9, "#F87171");
      } else if (col.kind === "pie") {
        this.audio.sfxPowerup();
        if (this.hearts < this.maxHearts) {
          this.hearts++;
          this.showWorldPopup("❤️ +1 HEART", this.currentX, sy + 0.9, "#4ADE80");
        } else {
          this.score += 200;
          this.showWorldPopup("🥧 +200 BONUS!", this.currentX, sy + 0.9, "#FBAF33");
        }
      }
    }

    handleCrash() {
      this.audio.sfxHit();
      this.combo = 1;
      this.shakeTime = 0.38;
      this.invulnTimer = 1.6;
      const v = document.getElementById("fx-vignette");
      v.className = "damage";
      setTimeout(() => {
        if (this.turboTimer > 0) v.className = "turbo";
        else v.className = "";
      }, 260);

      this.spawnBurst(this.currentX, BASE_SLEIGH_Y + this.jumpY, 0, 0xef4444, 22);
      if (this.mode === "blitz") {
        // Blitz deducts points on crash instead of ending the 2-minute timer
        this.score = Math.max(0, this.score - 250);
        this.showWorldPopup("-250 BUMP!", this.currentX, BASE_SLEIGH_Y + 1, "#F87171");
        return;
      }

      this.hearts--;
      if (this.hearts <= 0) {
        this.hearts = 0;
        this.updateHUD();
        this.endGame();
      } else {
        this.showWorldPopup("OUCH! -1 ❤️", this.currentX, BASE_SLEIGH_Y + 1, "#F87171");
      }
    }

    updateHUD() {
      document.getElementById("hud-score").textContent = Math.floor(this.score).toLocaleString();
      document.getElementById("hud-gifts").textContent = String(this.giftsHit);
      document.getElementById("hud-coins").textContent = String(this.runCoins);
      document.getElementById("hud-dist").textContent = `${Math.floor(this.distance).toLocaleString()}m`;

      const heartsEl = document.getElementById("hud-hearts");
      heartsEl.textContent = this.mode === "blitz"
        ? "⚡ BLITZ"
        : ("❤️".repeat(this.hearts) + "🖤".repeat(Math.max(0, this.maxHearts - this.hearts)));

      const comboEl = document.getElementById("hud-combo");
      comboEl.classList.toggle("active", this.combo > 1);
      comboEl.classList.toggle("fever", this.combo >= 6);
      comboEl.textContent = this.combo >= 8 ? `🔥 x8 FEVER!` : `🔥 x${this.combo}`;

      if (this.mode === "blitz") {
        const secs = Math.ceil(this.blitzTimeLeft);
        const mm = String(Math.floor(secs / 60)).padStart(2, "0");
        const ss = String(secs % 60).padStart(2, "0");
        document.getElementById("hud-timer").textContent = `${mm}:${ss}`;
      }

      const pct = Math.min(100, Math.round(this.turboMeter));
      document.getElementById("hud-turbo-fill").style.width = `${pct}%`;
      document.getElementById("hud-turbo-pct").textContent = pct >= 100 ? "READY!" : `${pct}%`;
      document.getElementById("turbo-meter-wrap").classList.toggle("ready", pct >= 100);
      document.getElementById("ctrl-turbo").classList.toggle("ready", pct >= 100);

      const buffs = [];
      if (this.turboTimer > 0) buffs.push(`<span class="buff-chip">🔥 Turbo ${Math.ceil(this.turboTimer)}s</span>`);
      if (this.shieldTimer > 0) buffs.push(`<span class="buff-chip">🛡️ Shield ${Math.ceil(this.shieldTimer)}s</span>`);
      if (this.magnetTimer > 0) buffs.push(`<span class="buff-chip">🧲 Magnet ${Math.ceil(this.magnetTimer)}s</span>`);
      document.getElementById("hud-buffs").innerHTML = buffs.join("");
    }

    refreshMenuUI() {
      const todayKey = getTodayKey();
      document.getElementById("menu-bank-coins").textContent = String(this.save.coins || 0);
      document.getElementById("best-endless").textContent = (this.save.bestScores.endless || 0).toLocaleString();
      document.getElementById("best-blitz").textContent = (this.save.bestScores.blitz || 0).toLocaleString();
      document.getElementById("best-daily").textContent = ((this.save.bestScores.daily || {})[todayKey] || 0).toLocaleString();
      document.getElementById("daily-date-label").textContent = `Seed: ${todayKey}`;
      document.getElementById("menu-badge-count").textContent = `${this.save.achievements.length}/${ACHIEVEMENTS.length}`;
      document.getElementById("btn-mute").textContent = this.audio.muted ? "🔇" : "🔊";

      // Upgrades list
      const upWrap = document.getElementById("upgrades-list");
      upWrap.innerHTML = UPGRADES.map((u) => {
        const lvl = this.save.upgrades[u.id] || 0;
        const max = u.costs.length;
        const cost = lvl < max ? u.costs[lvl] : null;
        const canBuy = cost !== null && this.save.coins >= cost;
        return `
          <div class="upgrade-item">
            <div>
              <div style="font-weight:700;font-size:13px;">${u.name} <span style="color:var(--primary)">Lv ${lvl}/${max}</span></div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${u.desc}</div>
            </div>
            <button class="btn-sm" data-buy-upgrade="${u.id}" ${!canBuy ? "disabled" : ""}>
              ${cost === null ? "MAXED" : `🪙 ${cost}`}
            </button>
          </div>
        `;
      }).join("");

      // Skins list
      const skWrap = document.getElementById("skins-list");
      skWrap.innerHTML = SKINS.map((s) => {
        const unlocked = this.save.unlockedSkins.includes(s.id);
        const equipped = this.save.selectedSkin === s.id;
        const canBuy = !unlocked && this.save.coins >= s.price;
        return `
          <div class="upgrade-item">
            <div>
              <div style="font-weight:700;font-size:13px;">${s.name}</div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${equipped ? "Equipped in Hangar" : (unlocked ? "Unlocked" : `Unlock with ${s.price} coins`)}</div>
            </div>
            <button class="btn-sm" data-skin="${s.id}" ${(!unlocked && !canBuy) || equipped ? "disabled" : ""}>
              ${equipped ? "EQUIPPED" : (unlocked ? "EQUIP" : `🪙 ${s.price}`)}
            </button>
          </div>
        `;
      }).join("");

      // Badges drawer
      document.getElementById("badges-list").innerHTML = ACHIEVEMENTS.map((a) => {
        const has = this.save.achievements.includes(a.id);
        return `
          <div class="ach-row ${has ? "unlocked" : ""}">
            <span style="font-size:20px;">${has ? "🏆" : "🔒"}</span>
            <div>
              <div style="font-size:12.5px;font-weight:700;">${a.title}</div>
              <div style="font-size:11px;color:var(--muted);">${a.desc}</div>
            </div>
          </div>
        `;
      }).join("");

      upWrap.querySelectorAll("[data-buy-upgrade]").forEach((btn) => {
        btn.addEventListener("click", () => this.buyUpgrade(btn.getAttribute("data-buy-upgrade")));
      });
      skWrap.querySelectorAll("[data-skin]").forEach((btn) => {
        btn.addEventListener("click", () => this.handleSkinClick(btn.getAttribute("data-skin")));
      });
    }

    buyUpgrade(id) {
      const up = UPGRADES.find((u) => u.id === id);
      if (!up) return;
      const lvl = this.save.upgrades[id] || 0;
      if (lvl >= up.costs.length) return;
      const cost = up.costs[lvl];
      if (this.save.coins < cost) return;
      this.save.coins -= cost;
      this.save.upgrades[id] = lvl + 1;
      persistSave(this.save);
      this.audio.sfxPowerup();
      this.unlockAchievement("custom_ride");
      this.refreshMenuUI();
    }

    handleSkinClick(id) {
      const skin = SKINS.find((s) => s.id === id);
      if (!skin) return;
      if (!this.save.unlockedSkins.includes(id)) {
        if (this.save.coins < skin.price) return;
        this.save.coins -= skin.price;
        this.save.unlockedSkins.push(id);
        this.unlockAchievement("custom_ride");
      }
      this.save.selectedSkin = id;
      persistSave(this.save);
      this.audio.sfxPowerup();
      this.buildSleighRig(id);
      this.refreshMenuUI();
    }

    bindInputs() {
      // Menu tab switching
      document.querySelectorAll(".tab-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
          const target = pill.getAttribute("data-tab");
          document.querySelectorAll(".tab-pill").forEach((p) => p.classList.toggle("active", p === pill));
          document.getElementById("tab-play").style.display = target === "play" ? "block" : "none";
          document.getElementById("tab-workshop").style.display = target === "workshop" ? "block" : "none";
          document.getElementById("tab-badges").style.display = target === "badges" ? "block" : "none";
        });
      });

      // Mode cards
      document.querySelectorAll(".mode-card").forEach((card) => {
        card.addEventListener("click", () => {
          document.querySelectorAll(".mode-card").forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");
          this.mode = card.getAttribute("data-mode") || "endless";
        });
      });

      // Town selector
      document.getElementById("town-select").addEventListener("change", (e) => {
        this.save.selectedTown = e.target.value;
        persistSave(this.save);
        updateTownLinks(this.save.selectedTown);
      });

      // Buttons
      document.getElementById("btn-start-flight").addEventListener("click", () => this.startGame());
      document.getElementById("btn-play-again").addEventListener("click", () => this.startGame());
      document.getElementById("btn-restart-from-pause").addEventListener("click", () => this.startGame());
      document.getElementById("btn-resume").addEventListener("click", () => this.resumeGame());
      document.getElementById("btn-pause").addEventListener("click", () => {
        if (this.state === "playing") this.pauseGame();
        else if (this.state === "paused") this.resumeGame();
      });
      document.getElementById("btn-quit-to-menu").addEventListener("click", () => {
        this.state = "menu";
        this.audio.stopMusic();
        document.getElementById("pause-overlay").classList.add("hidden");
        document.getElementById("controls-dock").classList.add("hidden");
        document.getElementById("menu-overlay").classList.remove("hidden");
        this.refreshMenuUI();
      });
      document.getElementById("btn-open-workshop").addEventListener("click", () => {
        this.state = "menu";
        document.getElementById("gameover-overlay").classList.add("hidden");
        document.getElementById("menu-overlay").classList.remove("hidden");
        document.querySelector('.tab-pill[data-tab="workshop"]')?.click();
      });

      document.getElementById("btn-mute").addEventListener("click", () => {
        const nextMuted = !this.audio.muted;
        this.audio.setMuted(nextMuted);
        this.save.muted = nextMuted;
        persistSave(this.save);
        document.getElementById("btn-mute").textContent = nextMuted ? "🔇" : "🔊";
        if (!nextMuted && this.state === "playing") this.audio.startMusic();
      });

      document.getElementById("btn-share-score").addEventListener("click", () => {
        const townSel = document.getElementById("town-select");
        const townSlug = (townSel?.value || this.save.selectedTown || "national").toLowerCase().trim();
        const townLabel = townSel?.selectedOptions?.[0]?.textContent || "Round Table Santa Sleigh";
        const shareUrl = (!townSlug || townSlug === "national")
          ? "https://roundtablesantasleigh.co.uk/game"
          : `https://${encodeURIComponent(townSlug)}.roundtablesantasleigh.co.uk/game`;
        const text = `🎅 TurboSanta: Rooftop Rush 3D\nI scored ${Math.floor(this.score).toLocaleString()} pts (${this.giftsHit} chimneys hit, max x${this.maxComboRun} combo) flying for ${townLabel}!\nPlay now: ${shareUrl}`;
        if (navigator.share) {
          navigator.share({ title: "TurboSanta: Rooftop Rush 3D", text, url: shareUrl }).catch(() => {});
        } else if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById("btn-share-score");
            btn.textContent = "✅ COPIED!";
            setTimeout(() => { btn.textContent = "📤 Share Score"; }, 2000);
          }).catch(() => {});
        }
      });

      // Keyboard controls
      window.addEventListener("keydown", (e) => {
        const code = e.code;
        if (this.state === "playing") {
          if (code === "ArrowLeft" || code === "KeyA") { e.preventDefault(); this.steer(-1); }
          else if (code === "ArrowRight" || code === "KeyD") { e.preventDefault(); this.steer(1); }
          else if (code === "ArrowUp" || code === "KeyW") { e.preventDefault(); this.jump(); }
          else if (code === "Space" || code === "ArrowDown" || code === "KeyS") { e.preventDefault(); this.dropPresent(); }
          else if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyE" || code === "KeyF") { e.preventDefault(); this.activateTurbo(); }
          else if (code === "KeyP" || code === "Escape") { e.preventDefault(); this.pauseGame(); }
        } else if (this.state === "paused" && (code === "KeyP" || code === "Escape")) {
          e.preventDefault();
          this.resumeGame();
        }
      });

      // On-screen buttons
      const tapAction = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          fn();
        });
      };
      tapAction("ctrl-left", () => this.steer(-1));
      tapAction("ctrl-right", () => this.steer(1));
      tapAction("ctrl-jump", () => this.jump());
      tapAction("ctrl-drop", () => this.dropPresent());
      tapAction("ctrl-turbo", () => this.activateTurbo());

      // Touch swipe gestures directly on the 3D stage
      const canvasWrap = document.getElementById("game-canvas-wrap");
      let touchStart = null;
      canvasWrap.addEventListener("touchstart", (e) => {
        if (this.state !== "playing" || e.touches.length === 0) return;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
      }, { passive: true });
      canvasWrap.addEventListener("touchend", (e) => {
        if (this.state !== "playing" || !touchStart || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStart.x;
        const dy = e.changedTouches[0].clientY - touchStart.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        touchStart = null;
        if (Math.max(absX, absY) < 22) {
          this.dropPresent();
        } else if (absX > absY) {
          this.steer(dx > 0 ? 1 : -1);
        } else if (dy < -24) {
          this.jump();
        } else {
          this.dropPresent();
        }
      }, { passive: true });
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    new TurboSanta3DGame();
  });
})();
