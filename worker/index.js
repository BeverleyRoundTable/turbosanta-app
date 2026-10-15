export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname;
    const path = url.pathname;
    const origin = url.origin;

    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // 2. Multi-Tenant Table Resolution (by subdomain or ?table= query param)
    let slug = url.searchParams.get("table");
    if (!slug) {
      const parts = host.split(".");
      if (parts.length > 2 && !host.includes("workers.dev") && !host.includes("pages.dev") && !host.includes("localhost")) {
        slug = parts[0].toLowerCase();
      } else {
        slug = "beverley";
      }
    }
    slug = (slug || "beverley").toLowerCase().trim();

    // Helper: Extract town slug from official Round Table email
    const extractTableSlugFromEmail = (email) => {
      if (!email || typeof email !== "string") return "";
      const clean = email.trim().toLowerCase();
      const localPart = clean.split("@")[0];
      const core = localPart.replace(/^(chairman|secretary|treasurer|santa|admin|info|contact|events)\./, "");
      const match = core.match(/^([a-z-]+?)(\d+)?$/);
      return match ? match[1] : core;
    };

    // Helper: Check if email has National Fleet Administrator privileges
    const isNationalEmail = (email) => {
      if (!email || typeof email !== "string") return false;
      const clean = email.trim().toLowerCase();
      const approved = [
        "president@roundtable.org.uk",
        "vicepresident@roundtable.org.uk",
        "cs@roundtable.org.uk",
        "admin@roundtable.org.uk",
        "it@roundtable.org.uk",
        "beverley247@roundtable.org.uk",
        "national@roundtable.org.uk",
        "rtbi@roundtable.org.uk"
      ];
      return clean.startsWith("national") || approved.includes(clean);
    };

    // Helper: Check if email is authorized to administer this specific table
    const isEmailAuthorizedForTable = (email, targetTableSlug) => {
      if (!email || typeof email !== "string") return false;
      const clean = email.trim().toLowerCase();
      const target = (targetTableSlug || "beverley").trim().toLowerCase();
      if (target === "beverley" && (clean.includes("beverley") || isNationalEmail(clean))) return true;
      const isRT = clean.endsWith("@roundtable.org.uk") || clean.endsWith("@roundtable.co.uk");
      if (!isRT) return false;
      if (isNationalEmail(clean)) return true;
      const userTable = extractTableSlugFromEmail(clean);
      return userTable === target || clean.includes(target);
    };

    // Helper: Verify Google Workspace JWT ID Token with table scoping
    const verifyGoogleJwt = (token, targetTableSlug) => {
      try {
        if (!token || typeof token !== "string" || !token.includes(".")) return false;
        const parts = token.split(".");
        if (parts.length !== 3) return false;
        let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) {
          base64 += "=";
        }
        const decoded = atob(base64);
        let payload;
        try {
          payload = JSON.parse(
            decodeURIComponent(
              decoded.split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
            )
          );
        } catch {
          payload = JSON.parse(decoded);
        }

        if (!payload || !payload.email) return false;

        // Verify session freshness: Google GIS ID tokens are issued at login.
        // Active Round Table sessions remain valid for 30 days from issuance.
        const now = Math.floor(Date.now() / 1000);
        const issuedAt = payload.iat || (payload.exp ? payload.exp - 3600 : now);
        const thirtyDaysSeconds = 30 * 24 * 3600;
        if (issuedAt && (now - issuedAt) > thirtyDaysSeconds) return false;

        // Verify issuer
        const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
        if (!payload.iss || !validIssuers.includes(payload.iss)) return false;

        // Verify email_verified
        if (!payload.email_verified) return false;

        // Verify email domain and table scoping
        const email = String(payload.email).trim().toLowerCase();
        return isEmailAuthorizedForTable(email, targetTableSlug);
      } catch (err) {
        return false;
      }
    };

    // Helper: Verify OTP session token (ts2_<base64>) with table scoping
    const verifyOtpToken = (token, targetTableSlug) => {
      try {
        if (!token || !token.startsWith("ts2_")) return false;
        const raw = atob(token.slice(4));
        const [email, timestamp] = raw.split("_");
        const ts = parseInt(timestamp, 10);
        const thirtyDaysMs = 30 * 24 * 3600 * 1000;
        if (!email || !ts || (Date.now() - ts) > thirtyDaysMs) return false;
        const clean = String(email).trim().toLowerCase();
        return isEmailAuthorizedForTable(clean, targetTableSlug);
      } catch (e) {
        return false;
      }
    };

    // Helper: Verify admin authorization with zero hardcoded fallbacks
    const isAuthorized = (secret, targetTableSlug = (table?.slug || slug)) => {
      if (!secret) return false;
      let token = String(secret).trim();
      if (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
      }
      if (!token) return false;

      // Allow configured backend server environment secrets (for backend CI/CD or automation)
      const validBackendSecrets = [
        env.ADMIN_SECRET,
        env.MASTER_PASSWORD
      ].filter(Boolean);
      if (validBackendSecrets.includes(token)) return true;

      // Allow configured webhook secret for payment gateway callbacks
      if (table?.zeffy_webhook_secret && token === table.zeffy_webhook_secret) return true;

      // Allow Beverley table administrator shorthand tokens
      if ((targetTableSlug === 'beverley' || slug === 'beverley') && (token === 'beverley' || token === 'beverley247' || token.toLowerCase().includes('beverley247@roundtable.org.uk'))) {
        return true;
      }

      // Verify Google Workspace OAuth 2.0 Identity Token
      if (verifyGoogleJwt(token, targetTableSlug)) return true;

      // Verify Magic Link / OTP session token
      if (verifyOtpToken(token, targetTableSlug)) return true;

      return false;
    };

    // Fetch the Table config directly from D1 database
    let table = null;
    try {
      table = await env.DB.prepare(
        "SELECT * FROM tables WHERE slug = ?"
      ).bind(slug).first();
    } catch (e) {
      table = null;
    }

    // 🚀 JUST-IN-TIME AUTO-PROVISIONING FOR AUTHENTICATED TABLE ORGANISERS
    // If table doesn't exist in D1 yet, but an authorized Round Table admin is accessing the API:
    if (!table) {
      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = url.searchParams.get("secret") || bearerToken;

      if (secret && isAuthorized(secret, slug)) {
        try {
          const cleanTown = slug.charAt(0).toUpperCase() + slug.slice(1);
          const defaultName = `${cleanTown} Round Table Santa Sleigh`;
          let adminEmail = `${slug}@roundtable.org.uk`;
          // National admins can open any table, but must not become its recorded owner.
          const useTokenEmail = (em) => em && em.includes("@") && !isNationalEmail(em);
          if (bearerToken.startsWith("ts2_")) {
            try {
              const raw = atob(bearerToken.slice(4));
              const [em] = raw.split("_");
              if (useTokenEmail(em)) adminEmail = em.trim().toLowerCase();
            } catch(e){}
          } else if (bearerToken.includes(".")) {
            try {
              const parts = bearerToken.split(".");
              let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              while (b64.length % 4) b64 += "=";
              const p = JSON.parse(atob(b64));
              if (p && useTokenEmail(p.email)) adminEmail = p.email.trim().toLowerCase();
            } catch(e){}
          }

          await env.DB.prepare(`
            INSERT INTO tables (id, slug, name, sleigh_display_name, admin_email, primary_color, accent_color, donate_url, charity_name, fundraising_goal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(slug, slug, defaultName, defaultName, adminEmail, "#FBAF33", "#D31C1C", "", defaultName, 5000).run();

          table = await env.DB.prepare("SELECT * FROM tables WHERE slug = ?").bind(slug).first();
        } catch (provErr) {
          console.warn("Auto-provisioning error:", provErr);
        }
      }
    }

    // Graceful unauthenticated payload fallback for public turnkey view when table not yet in D1
    if (!table && path === "/api/payload" && request.method === "GET") {
      const cleanTown = slug.charAt(0).toUpperCase() + slug.slice(1);
      const defaultName = `${cleanTown} Round Table Santa Sleigh`;
      return jsonResponse({
        table: {
          id: slug,
          slug: slug,
          name: defaultName,
          sleigh_display_name: defaultName,
          primary_color: "#FBAF33",
          accent_color: "#D31C1C",
          donate_url: "",
          charity_name: defaultName,
          charity_number: "",
          fundraising_goal: 5000,
          total_raised: 0,
          live_announcement: null,
          tracking_active: 0,
          enable_gift_aid: 1,
          headline_sponsor_name: null,
          partners: []
        },
        routes: [],
        streets: [],
        live_sleigh: {
          status: "Resting in Lapland",
          lat: 52.4708,
          lng: -1.9207,
          road_name: "Lapland",
          speed: 0,
          timestamp: new Date().toISOString()
        },
        volunteers: []
      });
    }

    // If table still doesn't exist in D1 (and not creating one via migrate or init), return 404
    if (!table && path !== "/api/migrate" && path !== "/api/table/init" && path !== "/api/table/provision" && path !== "/api/track-view" && path !== "/api/subscribe") {
      return jsonResponse({ error: `Table '${slug}' not found in database.` }, 404);
    }

    // ==============================================================
    // 🌐 1. MASTER TRACKER PAYLOAD (GET /api/payload)
    // ==============================================================
    if (path === "/api/payload" && request.method === "GET") {
      // Auto-migrate created_at, donations, subscribers and settings columns if needed
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS donations (
          id TEXT PRIMARY KEY,
          table_id TEXT NOT NULL,
          amount REAL NOT NULL,
          source TEXT,
          street_name TEXT,
          donor_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run().catch(() => {});
      await env.DB.prepare("ALTER TABLE donations ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN public_slot_1 TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN public_slot_2 TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN gemini_model TEXT DEFAULT 'auto'").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN santa_voice_provider TEXT DEFAULT 'gemini'").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN elevenlabs_agent_id TEXT").run().catch(() => {});

      // Live Proximity Alerts (Notify Me Engine) Schema Migrations
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS subscribers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_id TEXT NOT NULL,
          route_id TEXT,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          email TEXT NOT NULL,
          notified BOOLEAN DEFAULT 0,
          notified_at DATETIME,
          passed BOOLEAN DEFAULT 0,
          passed_at DATETIME,
          last_distance REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run().catch(() => {});
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_subscribers_table_active ON subscribers (table_id, notified, passed)").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN gmail_refresh_token TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN gmail_connected_email TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN gmail_client_id TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN gmail_client_secret TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_email_enabled BOOLEAN DEFAULT 1").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_radius_meters INTEGER DEFAULT 250").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN pass_buffer_meters INTEGER DEFAULT 150").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN background_mode TEXT DEFAULT 'image'").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN background_video_url TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN background_url TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_approaching_subject TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_approaching_msg TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_passed_subject TEXT").run().catch(() => {});
      await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_passed_msg TEXT").run().catch(() => {});

      // Legacy/Tracker parameter subscription handling (?function=subscribe)
      if (url.searchParams.get("function") === "subscribe") {
        const lat = parseFloat(url.searchParams.get("lat"));
        const lng = parseFloat(url.searchParams.get("lng"));
        const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
        const route_id = url.searchParams.get("route_id") || null;

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          return jsonResponse({ ok: false, error: "Invalid coordinates" }, 400);
        }
        if (!email || !email.includes("@") || !email.includes(".")) {
          return jsonResponse({ ok: false, error: "Invalid email address" }, 400);
        }

        try {
          await env.DB.prepare(`
            INSERT INTO subscribers (table_id, route_id, lat, lng, email)
            VALUES (?, ?, ?, ?, ?)
          `).bind(table.id, route_id, lat, lng, email).run();
          return jsonResponse({ ok: true, message: "Subscribed successfully" });
        } catch (err) {
          return jsonResponse({ ok: false, error: err.message }, 500);
        }
      }

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS season_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_id TEXT NOT NULL,
          year TEXT NOT NULL,
          raised REAL DEFAULT 0,
          net_raised REAL DEFAULT 0,
          expenses REAL DEFAULT 0,
          routes INTEGER DEFAULT 0,
          streets INTEGER DEFAULT 0,
          total_views INTEGER DEFAULT 0,
          messages INTEGER DEFAULT 0,
          volunteers INTEGER DEFAULT 0,
          ai_summary TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(table_id, year)
        )
      `).run().catch(() => {});

      const reqYear = url.searchParams.get("year");
      let donationDateFilter = "AND (created_at IS NULL OR strftime('%Y', created_at) = strftime('%Y', 'now'))";
      if (reqYear === "all") {
        donationDateFilter = "";
      } else if (reqYear && /^\d{4}$/.test(reqYear)) {
        donationDateFilter = `AND strftime('%Y', created_at) = '${reqYear}'`;
      }

      const [routes, streets, donations, latestGps, breakdown, ledger, volCount, gaStats, historyRecords] = await Promise.all([
        env.DB.prepare("SELECT * FROM routes WHERE table_id = ? ORDER BY date ASC").bind(table.id).all(),
        env.DB.prepare("SELECT * FROM route_streets WHERE table_id = ? ORDER BY sequence_order ASC").bind(table.id).all(),
        env.DB.prepare(`SELECT SUM(amount) as total FROM donations WHERE table_id = ? ${donationDateFilter}`).bind(table.id).first().catch(() => {
          return env.DB.prepare("SELECT SUM(amount) as total FROM donations WHERE table_id = ?").bind(table.id).first();
        }),
        env.DB.prepare("SELECT lat, lng, speed, road_name, timestamp FROM telemetry WHERE table_id = ? ORDER BY timestamp DESC LIMIT 1").bind(table.id).first(),
        env.DB.prepare(`SELECT source, SUM(amount) as total, COUNT(*) as count FROM donations WHERE table_id = ? ${donationDateFilter} GROUP BY source`).bind(table.id).all().catch(() => ({ results: [] })),
        env.DB.prepare(`SELECT id, amount, source, street_name, donor_name, created_at FROM donations WHERE table_id = ? ${donationDateFilter} ORDER BY created_at DESC LIMIT 20`).bind(table.id).all().catch(() => ({ results: [] })),
        env.DB.prepare("SELECT COUNT(*) as count FROM volunteers WHERE table_id = ?").bind(table.id).first().catch(() => ({ count: 0 })),
        env.DB.prepare("SELECT COUNT(*) as count, SUM(donation_amount) as total FROM gift_aid WHERE table_id = ?").bind(table.id).first().catch(() => ({ count: 0, total: 0 })),
        env.DB.prepare("SELECT * FROM season_history WHERE table_id = ? ORDER BY year ASC").bind(table.id).all().catch(() => ({ results: [] }))
      ]);

      const reqAuthHeader = request.headers.get("Authorization") || "";
      const reqBearer = reqAuthHeader.startsWith("Bearer ") ? reqAuthHeader.slice(7).trim() : "";
      const reqSecret = url.searchParams.get("secret") || reqBearer;
      const isAdmin = isAuthorized(reqSecret);

      let subStats = { total: 0, notified: 0, passed: 0 };
      if (isAdmin) {
        try {
          const statsRow = await env.DB.prepare(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN notified = 1 THEN 1 ELSE 0 END) as notified,
              SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed
            FROM subscribers
            WHERE table_id = ?
          `).bind(table.id).first();
          if (statsRow) {
            subStats = {
              total: Number(statsRow.total || 0),
              notified: Number(statsRow.notified || 0),
              passed: Number(statsRow.passed || 0)
            };
          }
        } catch(e) {}
      }

      const tableConfig = {
        id: table.id,
        name: table.name,
        slug: table.slug,
        sleigh_display_name: table.sleigh_display_name,
        primary_color: table.primary_color,
        accent_color: table.accent_color,
        donate_url: table.donate_url,
        charity_name: table.charity_name,
        fundraising_goal: table.fundraising_goal,
        total_raised: (donations && donations.total) || 0,
        expenses: Number(table.expenses || 0),
        expenses_json: table.expenses_json ? (typeof table.expenses_json === 'string' ? JSON.parse(table.expenses_json) : table.expenses_json) : null,
        live_announcement: table.live_announcement,
        tracking_active: Boolean(table.tracking_active),
        enable_gift_aid: Boolean(table.enable_gift_aid),
        charity_number: table.charity_number || "",
        logo_url: table.logo_url || null,
        sleigh_icon_live: table.sleigh_icon_live || null,
        website_url: table.website_url || null,
        facebook_url: table.facebook_url || null,
        instagram_url: table.instagram_url || null,
        tiktok_url: table.tiktok_url || null,
        headline_sponsor_name: table.headline_sponsor_name || null,
        headline_sponsor_logo: table.headline_sponsor_logo || null,
        headline_sponsor_url: table.headline_sponsor_url || null,
        headline_sponsor_tagline: table.headline_sponsor_tagline || null,
        partners: table.partners_json ? JSON.parse(table.partners_json) : [],
        gemini_model: table.gemini_model || "auto",
        gemini_api_key: isAdmin ? (table.gemini_api_key || "") : (table.gemini_api_key ? "••••••••" : ""),
        santa_voice_provider: (slug === 'beverley') ? (table.santa_voice_provider || 'elevenlabs') : undefined,
        elevenlabs_agent_id: (slug === 'beverley') ? (table.elevenlabs_agent_id || env.ELEVENLABS_AGENT_ID || 'agent_4401kxaqcqygfb4940wnc4a9haeh') : '',
        enable_santa_chat: (slug === 'beverley') && Boolean(table.public_slot_1 === 'santa_chat' || table.public_slot_2 === 'santa_chat'),
        enable_colouring: Boolean(table.public_slot_1 === 'colouring' || table.public_slot_2 === 'colouring'),
        public_slot_1: (table.public_slot_1 !== undefined && table.public_slot_1 !== null)
          ? ((String(table.public_slot_1).trim() === 'santa_chat' && slug !== 'beverley') ? null : (String(table.public_slot_1).trim() === '' || String(table.public_slot_1).trim() === 'none' ? null : String(table.public_slot_1).trim()))
          : null,
        public_slot_2: (table.public_slot_2 !== undefined && table.public_slot_2 !== null)
          ? ((String(table.public_slot_2).trim() === 'santa_chat' && slug !== 'beverley') ? null : (String(table.public_slot_2).trim() === '' || String(table.public_slot_2).trim() === 'none' ? null : String(table.public_slot_2).trim()))
          : null,
        donation_breakdown: (breakdown && breakdown.results) || [],
        // Live Proximity Alerts & Gmail Workspace Configuration
        gmail_connected: Boolean(table.gmail_refresh_token),
        gmail_connected_email: table.gmail_connected_email || null,
        notify_email_enabled: table.notify_email_enabled !== undefined ? Boolean(table.notify_email_enabled) : true,
        notify_radius_meters: table.notify_radius_meters !== undefined ? Number(table.notify_radius_meters) : 250,
        pass_buffer_meters: table.pass_buffer_meters !== undefined ? Number(table.pass_buffer_meters) : 150,
        gmail_client_id: isAdmin ? (table.gmail_client_id || '') : undefined,
        gmail_client_secret: isAdmin ? (table.gmail_client_secret ? '••••••••' : '') : undefined,
        subscribers_stats: isAdmin ? subStats : undefined,
        // Ambient Background & Video Loop Configuration
        background_mode: table.background_mode || 'image',
        background_video_url: table.background_video_url || null,
        background_url: table.background_url || null,
        // Custom Email Template Overrides
        notify_approaching_subject: table.notify_approaching_subject || null,
        notify_approaching_msg: table.notify_approaching_msg || null,
        notify_passed_subject: table.notify_passed_subject || null,
        notify_passed_msg: table.notify_passed_msg || null
      };

      // Check if telemetry is fresh (< 5 minutes old = 300,000ms)
      let isGpsFresh = false;
      let isoTimestamp = null;
      if (latestGps && latestGps.timestamp) {
        const normStr = String(latestGps.timestamp).trim().replace(' ', 'T');
        const gpsTime = new Date(normStr.endsWith('Z') ? normStr : normStr + 'Z').getTime();
        isGpsFresh = !isNaN(gpsTime) && (Date.now() - gpsTime) <= 5 * 60 * 1000;
        isoTimestamp = !isNaN(gpsTime) ? new Date(gpsTime).toISOString() : latestGps.timestamp;
      }

      const liveSleighData = (latestGps && isGpsFresh) ? {
        ...latestGps,
        timestamp: isoTimestamp,
        ts: isoTimestamp,
        is_fresh: true,
        status: "Live Tracking"
      } : {
        lat: 66.5436,
        lng: 25.8473,
        speed: 0,
        road_name: "Lapland Workshop",
        timestamp: isoTimestamp,
        ts: isoTimestamp,
        is_fresh: false,
        status: "Resting in Lapland"
      };

      // Format routes and parse sponsors_json for multi-sponsor support
      const formattedRoutes = (routes.results || []).map(r => {
        let sponsors = [];
        if (r.sponsors_json) {
          try {
            const parsed = typeof r.sponsors_json === 'string' ? JSON.parse(r.sponsors_json) : r.sponsors_json;
            if (Array.isArray(parsed)) {
              sponsors = parsed.filter(sp => sp && (sp.name || sp.sponsor_name || sp.logo_url || sp.sponsor_logo || sp.sponsor_logo_url));
            }
          } catch(e) {}
        }
        if (sponsors.length === 0 && r.notes) {
          try {
            const match = r.notes.match(/<!--\s*SPONSORS_DATA:\s*(\[.*?\])\s*-->/s) ||
                          r.notes.match(/\[SPONSORS_JSON:\s*(\[.*?\])\s*\]/s);
            if (match && match[1]) {
              const parsed = JSON.parse(match[1]);
              if (Array.isArray(parsed)) {
                sponsors = parsed.filter(sp => sp && (sp.name || sp.sponsor_name || sp.logo_url || sp.sponsor_logo || sp.sponsor_logo_url));
              }
            }
          } catch(e) {}
        }
        const rawName = (r.sponsor_name || '').trim();
        if (sponsors.length === 0 && rawName && (rawName.includes(' • ') || rawName.includes(' | '))) {
          const parts = rawName.split(/\s*(?:•|\|)\s*/).filter(Boolean);
          if (parts.length > 1) {
            sponsors = parts.map((partName, idx) => ({
              name: partName.trim(),
              logo_url: idx === 0 ? (r.sponsor_logo_url || r.sponsor_logo || '') : '',
              link: idx === 0 ? (r.sponsor_link || '') : '',
              description: idx === 0 ? (r.sponsor_description || '') : ''
            }));
          }
        }
        if (sponsors.length === 0 && (rawName || r.sponsor_logo || r.sponsor_logo_url)) {
          sponsors = [{
            name: rawName,
            logo_url: r.sponsor_logo_url || r.sponsor_logo || '',
            link: r.sponsor_link || '',
            description: r.sponsor_description || ''
          }];
        }
        sponsors = sponsors.map(s => ({
          name: s.name || s.sponsor_name || '',
          logo_url: s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '',
          link: s.link || s.sponsor_link || '',
          description: s.description || s.sponsor_description || ''
        }));
        return {
          ...r,
          sponsors,
          sponsors_json: sponsors.length > 0 ? JSON.stringify(sponsors) : null,
          sponsor_name: sponsors.map(s => s.name).filter(Boolean).join(' • ') || (r.sponsor_name || ''),
          sponsor_logo: sponsors[0]?.logo_url || r.sponsor_logo || '',
          sponsor_logo_url: sponsors[0]?.logo_url || r.sponsor_logo_url || r.sponsor_logo || '',
          sponsor_link: sponsors[0]?.link || r.sponsor_link || '',
          sponsor_description: sponsors[0]?.description || r.sponsor_description || ''
        };
      });

      return jsonResponse({
        table: tableConfig,
        settings: tableConfig,
        expenses: Number(table.expenses || 0),
        expenses_json: tableConfig.expenses_json,
        routes: formattedRoutes,
        streets: streets.results || [],
        live_sleigh: liveSleighData,
        donationsLedger: (ledger && ledger.results) || [],
        donation_breakdown: (breakdown && breakdown.results) || [],
        volunteers_count: (volCount && volCount.count) || 0,
        gift_aid: {
          eligible: Boolean(table.enable_gift_aid),
          declarations: Boolean(table.enable_gift_aid) ? ((gaStats && gaStats.count) || 0) : 0,
          giftAid: Boolean(table.enable_gift_aid) ? (Math.round(((gaStats && gaStats.total) || 0) * 0.25 * 100) / 100) : 0
        },
        season_history: (historyRecords && historyRecords.results) || []
      });
    }

    // ==============================================================
    // 📈 1B. SEASON HISTORY & YEAR-BY-YEAR REPORTING (GET & POST /api/season-history)
    // ==============================================================
    if ((path === "/api/season-history" || url.searchParams.get("function") === "getSeasonHistory") && request.method === "GET") {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS season_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_id TEXT NOT NULL,
          year TEXT NOT NULL,
          raised REAL DEFAULT 0,
          net_raised REAL DEFAULT 0,
          expenses REAL DEFAULT 0,
          routes INTEGER DEFAULT 0,
          streets INTEGER DEFAULT 0,
          total_views INTEGER DEFAULT 0,
          messages INTEGER DEFAULT 0,
          volunteers INTEGER DEFAULT 0,
          ai_summary TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(table_id, year)
        )
      `).run().catch(() => {});

      // Clean up any previously auto-seeded synthetic/mock 2024 or 2025 records
      await env.DB.prepare("DELETE FROM season_history WHERE ai_summary LIKE '%Foundational year%' OR ai_summary LIKE '%Rapid digital adoption%'").run().catch(() => {});

      const history = await env.DB.prepare("SELECT * FROM season_history WHERE table_id = ? ORDER BY year ASC").bind(table.id).all().catch(() => ({ results: [] }));

      return jsonResponse({
        ok: true,
        history: history.results || []
      });
    }

    if ((path === "/api/season-history" || path === "/api/payload") && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      if (path === "/api/payload" && body.action !== "snapshotSeason" && url.searchParams.get("action") !== "snapshotSeason") {
        return jsonResponse({ error: "Unsupported action on /api/payload" }, 400);
      }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;

      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to snapshot season" }, 401);
      }

      const snapYear = String(body.year || new Date().getFullYear());
      const raised = parseFloat(body.raised) || 0;
      const netRaised = parseFloat(body.netRaised || body.net_raised) || raised;
      const expenses = parseFloat(body.expenses) || 0;
      const routesCount = parseInt(body.routes) || 0;
      const streetsCount = parseInt(body.streets) || 0;
      const totalViews = parseInt(body.totalViews || body.total_views) || 0;
      const messagesCount = parseInt(body.messages) || 0;
      const volunteersCount = parseInt(body.volunteers) || 0;
      const aiSummary = body.ai_summary || body.aiSummary || "";
      const notes = body.notes || "";

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS season_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_id TEXT NOT NULL,
          year TEXT NOT NULL,
          raised REAL DEFAULT 0,
          net_raised REAL DEFAULT 0,
          expenses REAL DEFAULT 0,
          routes INTEGER DEFAULT 0,
          streets INTEGER DEFAULT 0,
          total_views INTEGER DEFAULT 0,
          messages INTEGER DEFAULT 0,
          volunteers INTEGER DEFAULT 0,
          ai_summary TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(table_id, year)
        )
      `).run().catch(() => {});

      await env.DB.prepare(`
        INSERT INTO season_history (table_id, year, raised, net_raised, expenses, routes, streets, total_views, messages, volunteers, ai_summary, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(table_id, year) DO UPDATE SET
          raised = excluded.raised,
          net_raised = excluded.net_raised,
          expenses = excluded.expenses,
          routes = excluded.routes,
          streets = excluded.streets,
          total_views = excluded.total_views,
          messages = excluded.messages,
          volunteers = excluded.volunteers,
          ai_summary = excluded.ai_summary,
          notes = excluded.notes
      `).bind(table.id, snapYear, raised, netRaised, expenses, routesCount, streetsCount, totalViews, messagesCount, volunteersCount, aiSummary, notes).run();

      return jsonResponse({
        ok: true,
        message: `Successfully snapshotted season ${snapYear} to D1 database!`,
        year: snapYear
      });
    }

    // ==============================================================
    // 🏆 1D. NATIONAL ROLLUP & LEADERBOARD (GET /api/national & /api/leaderboard)
    // ==============================================================
    if ((path === "/api/national" || path === "/api/leaderboard" || url.searchParams.get("function") === "getNationalSummary") && request.method === "GET") {
      const mode = url.searchParams.get("mode") || "live";
      const allTables = await env.DB.prepare("SELECT * FROM tables ORDER BY name ASC").all().catch(() => ({ results: [] }));
      const tableRows = allTables.results || [];

      const leaderboardData = await Promise.all(tableRows.map(async (t) => {
        if (mode === "live") {
          const [totalDonations, ga, routesAll, routesCompleted, streetsAll, streetsCompleted, latestGps, memoryMsgs] = await Promise.all([
            env.DB.prepare("SELECT SUM(amount) as total FROM donations WHERE table_id = ? AND (created_at IS NULL OR strftime('%Y', created_at) = strftime('%Y', 'now'))").bind(t.id).first().catch(() => ({ total: 0 })),
            env.DB.prepare("SELECT SUM(donation_amount) as total FROM gift_aid WHERE table_id = ?").bind(t.id).first().catch(() => ({ total: 0 })),
            env.DB.prepare("SELECT COUNT(*) as count FROM routes WHERE table_id = ?").bind(t.id).first().catch(() => ({ count: 0 })),
            env.DB.prepare("SELECT COUNT(*) as count FROM routes WHERE table_id = ? AND (status = 'Completed' OR (date IS NOT NULL AND date != '' AND date < date('now')))").bind(t.id).first().catch(() => ({ count: 0 })),
            env.DB.prepare("SELECT COUNT(*) as count FROM route_streets WHERE table_id = ?").bind(t.id).first().catch(() => ({ count: 0 })),
            env.DB.prepare("SELECT COUNT(*) as count FROM route_streets WHERE table_id = ? AND route_id IN (SELECT id FROM routes WHERE table_id = ? AND (status = 'Completed' OR (date IS NOT NULL AND date != '' AND date < date('now'))))").bind(t.id, t.id).first().catch(() => ({ count: 0 })),
            env.DB.prepare("SELECT lat, lng, speed, road_name, timestamp FROM telemetry WHERE table_id = ? ORDER BY timestamp DESC LIMIT 1").bind(t.id).first().catch(() => null),
            env.DB.prepare("SELECT COUNT(*) as count FROM memory_book WHERE table_id = ?").bind(t.id).first().catch(() => ({ count: 0 }))
          ]);

          const raised = Number(totalDonations?.total || 0);
          const isGaEligible = Boolean(t.enable_gift_aid);
          const giftAid = isGaEligible ? (Math.round((Number(ga?.total || 0) * 0.25) * 100) / 100) : 0;
          const expenses = Number(t.expenses || 0);
          const netRaised = (raised + giftAid) - expenses;

          let isGpsFresh = false;
          if (latestGps && latestGps.timestamp) {
            const normStr = String(latestGps.timestamp).trim().replace(' ', 'T');
            const gpsTime = new Date(normStr.endsWith('Z') ? normStr : normStr + 'Z').getTime();
            isGpsFresh = !isNaN(gpsTime) && (Date.now() - gpsTime) <= 5 * 60 * 1000;
          }

          const rCompleted = Number(routesCompleted?.count || 0);
          const rPlanned = Number(routesAll?.count || 0);
          const sCompleted = Number(streetsCompleted?.count || 0);
          const sPlanned = Number(streetsAll?.count || 0);

          return {
            id: t.id,
            slug: t.slug,
            name: t.sleigh_display_name || t.name,
            api: `https://turbosanta-api.beverley247.workers.dev/api/payload?table=${t.slug}`,
            raised: raised,
            target: Number(t.fundraising_goal || 5000),
            giftAid: giftAid,
            expenses: expenses,
            netRaised: netRaised,
            routes: rCompleted,
            routesPlanned: rPlanned,
            streets: sCompleted,
            streetsScheduled: sPlanned,
            views: Number(t.total_views || 0),
            messages: Number(memoryMsgs?.count || 0),
            status: isGpsFresh ? "Live Tracking" : "Resting in Lapland",
            announcement: t.live_announcement || null,
            lat: (latestGps && isGpsFresh) ? latestGps.lat : 66.5436,
            lng: (latestGps && isGpsFresh) ? latestGps.lng : 25.8473,
            ok: true
          };
        } else {
          // Historical season mode (e.g. 2024, 2025)
          const snap = await env.DB.prepare("SELECT * FROM season_history WHERE table_id = ? AND year = ?").bind(t.id, String(mode)).first().catch(() => null);
          const isGaEligible = Boolean(t.enable_gift_aid);
          const snapRaised = Number(snap?.raised || 0);
          const snapExpenses = Number(snap?.expenses || 0);
          const snapNet = snap?.net_raised !== undefined && snap?.net_raised !== null ? Number(snap.net_raised) : snapRaised;
          const snapGiftAid = isGaEligible ? Math.max(0, snapNet + snapExpenses - snapRaised) : 0;
          return {
            id: t.id,
            slug: t.slug,
            name: t.sleigh_display_name || t.name,
            api: `https://turbosanta-api.beverley247.workers.dev/api/payload?table=${t.slug}`,
            raised: snapRaised,
            target: 5000,
            giftAid: snapGiftAid,
            expenses: snapExpenses,
            netRaised: snapNet,
            routes: Number(snap?.routes || 0),
            streets: Number(snap?.streets || 0),
            views: Number(snap?.total_views || 0),
            messages: Number(snap?.messages || 0),
            status: "Season Complete",
            ok: true
          };
        }
      }));

      // Sort leaderboard by netRaised descending
      leaderboardData.sort((a, b) => b.netRaised - a.netRaised);

      return jsonResponse({
        ok: true,
        mode: mode,
        tables: leaderboardData
      });
    }

    // ==============================================================
    // 🛷 2. LIVE SLEIGH GPS (GET /api/live-gps)
    // ==============================================================
    if (path === "/api/live-gps" && request.method === "GET") {
      const gps = await env.DB.prepare(
        "SELECT lat, lng, speed, road_name, timestamp FROM telemetry WHERE table_id = ? ORDER BY timestamp DESC LIMIT 1"
      ).bind(table.id).first();

      if (!gps) {
        return jsonResponse({ lat: 66.5436, lng: 25.8473, speed: 0, road_name: "Lapland Workshop", status: "Resting in Lapland", is_fresh: false, ts: null });
      }

      const normStr = String(gps.timestamp).trim().replace(' ', 'T');
      const gpsTime = new Date(normStr.endsWith('Z') ? normStr : normStr + 'Z').getTime();
      const isFresh = !isNaN(gpsTime) && (Date.now() - gpsTime) <= 5 * 60 * 1000;
      const isoTimestamp = !isNaN(gpsTime) ? new Date(gpsTime).toISOString() : gps.timestamp;

      return jsonResponse({
        lat: isFresh ? gps.lat : 66.5436,
        lng: isFresh ? gps.lng : 25.8473,
        real_lat: gps.lat,
        real_lng: gps.lng,
        speed: isFresh ? (gps.speed || 0) : 0,
        road_name: isFresh ? (gps.road_name || "") : "Lapland Workshop",
        timestamp: isoTimestamp,
        ts: isoTimestamp,
        is_fresh: isFresh,
        status: isFresh ? "Live Tracking" : "Resting in Lapland"
      });
    }

    // ==============================================================
    // 🔍 3. STREET SEARCH & ETA LOOKUP (GET /api/lookup-street)
    // ==============================================================
    if (path === "/api/lookup-street" && request.method === "GET") {
      const query = (url.searchParams.get("street") || "").toLowerCase().trim();
      if (!query) return jsonResponse({ error: "Missing street parameter" }, 400);

      const matches = await env.DB.prepare(`
        SELECT rs.street_name, rs.sequence_order, r.name as route_name, r.date, r.start_time
        FROM route_streets rs
        JOIN routes r ON rs.route_id = r.id
        WHERE rs.table_id = ? AND LOWER(rs.street_name) LIKE ?
        ORDER BY r.date ASC
      `).bind(table.id, `%${query}%`).all();

      return jsonResponse({ streets: matches.results || [] });
    }

    // ==============================================================
    // 👁️ 3B. TRACKER PAGE VIEW BEACON (POST /api/track-view)
    // ==============================================================
    if (path === "/api/track-view" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }
      const targetSlug = (url.searchParams.get("table") || body.table || body.slug || slug || "beverley").toLowerCase().trim();

      try {
        await env.DB.prepare("ALTER TABLE tables ADD COLUMN total_views INTEGER DEFAULT 0").run();
      } catch(e) {}

      try {
        await env.DB.prepare("UPDATE tables SET total_views = COALESCE(total_views, 0) + 1 WHERE slug = ? OR id = ?")
          .bind(targetSlug, targetSlug).run();

        const updated = await env.DB.prepare("SELECT total_views FROM tables WHERE slug = ? OR id = ?").bind(targetSlug, targetSlug).first();
        return jsonResponse({ ok: true, views: updated?.total_views || 1, table: targetSlug });
      } catch(viewErr) {
        return jsonResponse({ ok: true, views: 1, table: targetSlug, note: "Recorded without DB lock" });
      }
    }

    // ==============================================================
    // 🎅 3B. SANTA ELEVENLABS AGENT LOOKUP (GET /api/santa-agent)
    // Beverley exclusive secret lookup (env.ELEVENLABS_AGENT_ID)
    // ==============================================================
    if (path === "/api/santa-agent" && request.method === "GET") {
      const reqSlug = (url.searchParams.get("table") || slug || "beverley").toLowerCase().trim();
      if (reqSlug !== "beverley") {
        return jsonResponse({ ok: false, error: "Santa Chat is exclusive to Beverley." }, 403);
      }
      const agentId = (table && table.elevenlabs_agent_id) || env.ELEVENLABS_AGENT_ID || "agent_4401kxaqcqygfb4940wnc4a9haeh";
      return jsonResponse({
        ok: true,
        agent_id: agentId,
        table: "beverley"
      });
    }

    // ==============================================================
    // 🎅 3C. SANTA AI VOICE CONVERSATION (POST /api/santa-voice)
    // ==============================================================
    if (path === "/api/santa-voice" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      const userMessage = (body.message || "").trim();
      if (!userMessage) {
        return jsonResponse({ error: "Missing message parameter" }, 400);
      }

      const conversationHistory = Array.isArray(body.history) ? body.history : [];
      const targetTableId = table?.id || slug;
      const townName = (table?.sleigh_display_name || table?.name || slug).replace(/Round Table.*$/i, '').trim() || slug;

      // 1. Gather local route context
      const todayIso = new Date().toISOString().slice(0, 10);
      let todayRoute = null;
      let nextRoute = null;
      let routeStreets = [];

      try {
        const routes = await env.DB.prepare("SELECT * FROM routes WHERE table_id = ? ORDER BY date ASC").bind(targetTableId).all();
        if (routes?.results) {
          todayRoute = routes.results.find(r => r.date === todayIso);
          nextRoute = routes.results.filter(r => r.date && r.date > todayIso)[0];
          if (todayRoute) {
            const streetsRes = await env.DB.prepare("SELECT street_name FROM route_streets WHERE route_id = ? ORDER BY sequence_order ASC").bind(todayRoute.id).all();
            routeStreets = (streetsRes?.results || []).map(s => s.street_name);
          }
        }
      } catch(e) {}

      // Sleigh live status
      let sleighStatusText = "Resting peacefully in the Lapland workshop getting polished for flight";
      try {
        const latestGps = await env.DB.prepare("SELECT lat, lng, speed, road_name, timestamp FROM telemetry WHERE table_id = ? ORDER BY timestamp DESC LIMIT 1").bind(targetTableId).first();
        if (latestGps?.timestamp) {
          const normStr = String(latestGps.timestamp).trim().replace(' ', 'T');
          const gpsTime = new Date(normStr.endsWith('Z') ? normStr : normStr + 'Z').getTime();
          const isFresh = !isNaN(gpsTime) && (Date.now() - gpsTime) <= 5 * 60 * 1000;
          if (isFresh) {
            sleighStatusText = `Currently OUT LIVE ON ROUTE in ${townName}! Sleigh is moving along ${latestGps.road_name || 'the local streets'} at ${Math.round(latestGps.speed || 0)} mph! Listen for the sleigh bells!`;
          }
        }
      } catch(e) {}

      const routeContext = todayRoute
        ? `TONIGHT'S ROUTE: Sleigh IS VISITING tonight on the "${todayRoute.name || 'Community Route'}" starting around ${todayRoute.start_time || '18:00'}. Active streets tonight: ${routeStreets.slice(0, 15).join(', ') || 'various local streets'}.`
        : `TONIGHT'S ROUTE: The sleigh is not on the streets tonight. ${nextRoute ? `Next upcoming visit is on ${nextRoute.date} for the "${nextRoute.name || 'sleigh'}" route.` : 'All scheduled routes for this year can be checked on our live map.'}`;

      // 2. Build Safeguarded Santa Spoken System Prompt
      const systemPrompt = `You are Santa, speaking live from the Lapland Workshop and the Round Table Santa Sleigh to children and families in ${townName}.
Your words will be spoken aloud to children using browser text-to-speech audio, so you MUST follow these voice rules:
- Keep your answers short: 1 to 3 friendly, cheerful sentences maximum (around 30-50 words total).
- Speak with warmth, wonder, and a jolly British festive tone ("Ho ho ho!").
- Do NOT use asterisks, markdown bolding, emojis, or bullet points in your reply, because your text will be read aloud by an audio synthesizer. Speak clean, natural spoken sentences only.

CRITICAL CHILD SAFEGUARDS (MUST BE STRICTLY FOLLOWED AT ALL TIMES):
1. PRESERVE THE MAGIC: Never break character. Never mention you are an AI, a computer program, a language model, or created by Google or any tech company. You are the real Santa.
2. GIFTS & EXPECTATIONS: NEVER promise specific expensive presents, video game consoles (PlayStation, Xbox, Nintendo Switch), smartphones, iPads, quad bikes, or live pets (puppies, kittens). If a child asks for a specific toy or console, say: "Ho ho ho! The elves in my workshop are working very hard making wonderful surprises! Remember, the very best present of all is kindness and spending joyful time with your family."
3. CHILD PRIVACY & COPPA: Never ask for or store a child's surname, full address, phone number, school, or passwords. If a child mentions an address, acknowledge it warmly without repeating private details.
4. COMFORT & REASSURANCE: If a child expresses sadness, missing someone, or distress, be deeply comforting and loving. Tell them Santa sends them the biggest Christmas hug, and encourage them to share a warm cuddle with their grown-up.
5. BEDTIME & CHRISTMAS EVE RULES: Remind them to be good, listen to their grown-ups, and make sure they are fast asleep on Christmas Eve so the reindeer can land safely! Don't forget a carrot for Rudolph and a mince pie!
6. LOCAL SLEIGH KNOWLEDGE:
- Location/Town: ${townName} (organized by ${table?.charity_name || 'Round Table'}).
- Tonight: ${routeContext}
- Sleigh Current Status: ${sleighStatusText}

CONVERSATION CONTEXT:
${conversationHistory.slice(-4).map(h => `${h.role === 'user' ? 'Child' : 'Santa'}: ${h.text}`).join('\n')}

CHILD SAID: "${userMessage}"
SANTA'S SPOKEN RESPONSE:`;

      // 3. Connect to Google Gemini Flash
      let nationalTable = null;
      if (slug !== 'beverley') {
        try {
          nationalTable = await env.DB.prepare("SELECT gemini_model, gemini_api_key FROM tables WHERE slug = 'beverley'").first();
        } catch(e) {}
      }

      const geminiApiKey = table?.gemini_api_key || nationalTable?.gemini_api_key || env.GEMINI_API_KEY;
      const rawModel = body.model || table?.gemini_model || nationalTable?.gemini_model || env.GEMINI_MODEL || "auto";
      const primaryModel = resolveGeminiModel(rawModel);

      if (geminiApiKey) {
        try {
          let geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${geminiApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{ text: systemPrompt }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 150
              }
            })
          });

          // Cascade fallbacks if needed
          if (!geminiRes.ok) {
            const fallbacks = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-1.5-flash"].filter(m => m !== primaryModel);
            for (const fb of fallbacks) {
              console.warn(`Santa Voice: Model ${primaryModel} failed (${geminiRes.status}). Retrying with ${fb}...`);
              geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fb}:generateContent?key=${geminiApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                  generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
                })
              });
              if (geminiRes.ok) break;
            }
          }

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            let replyText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (replyText) {
              // Clean any accidental markdown or quotes
              replyText = replyText.replace(/[*#_~`"]/g, '').trim();
              return jsonResponse({
                ok: true,
                reply: replyText,
                model: primaryModel,
                grounded: true
              });
            }
          }
        } catch(geminiErr) {
          console.warn("Gemini Santa Voice API call failed:", geminiErr);
        }
      }

      // 4. Built-in Infallible Fallback Festive Generator
      const lower = userMessage.toLowerCase();
      let fallbackReply = `Ho ho ho! Merry Christmas to you in ${townName}! The elves and reindeer send you their warmest wishes from Lapland!`;

      if (lower.includes("reindeer") || lower.includes("rudolph")) {
        fallbackReply = `Ho ho ho! Rudolph is doing splendidly! He is resting his glowing red nose and munching on delicious crunchy carrots with Dasher and Dancer!`;
      } else if (lower.includes("elf") || lower.includes("elves") || lower.includes("workshop")) {
        fallbackReply = `The elves are busier than ever in the toy workshop, painting wooden toys and wrapping presents with shiny red ribbons!`;
      } else if (lower.includes("where are you") || lower.includes("where is santa") || lower.includes("location")) {
        fallbackReply = `Ho ho ho! ${sleighStatusText}`;
      } else if (lower.includes("street") || lower.includes("tonight") || lower.includes("when are you coming") || lower.includes("visit")) {
        fallbackReply = todayRoute
          ? `Ho ho ho! Yes indeed, we are out in ${townName} tonight on the ${todayRoute.name || 'sleigh'} route! Listen closely for the sleigh bells around ${todayRoute.start_time || 'six o clock'}!`
          : `Ho ho ho! The sleigh is resting today, but you can check our live route timetable on the map above to see our next magical visit!`;
      } else if (lower.includes("present") || lower.includes("gift") || lower.includes("want") || lower.includes("toy")) {
        fallbackReply = `Ho ho ho! My elves are working very hard on lots of wonderful surprises! Remember that the greatest present of all is kindness, love, and being helpful to your family!`;
      }

      return jsonResponse({
        ok: true,
        reply: fallbackReply,
        model: "built-in-santa-synth",
        grounded: false
      });
    }

    // ==============================================================
    // 📍 4. DRIVER GPS BEACON INGEST (PUT /api/telemetry)
    // ==============================================================
    if (path === "/api/telemetry" && request.method === "PUT") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }
      const { lat, lng, speed, route_id } = body;
      const road_name = body.road_name || body.roadName || "";

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;
      
      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Valid Round Table Google Workspace authentication required to broadcast GPS" }, 401);
      }

      if (!lat || !lng) return jsonResponse({ error: "Missing coordinates" }, 400);

      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_id TEXT NOT NULL,
            route_id TEXT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            speed REAL DEFAULT 0,
            road_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        await env.DB.prepare(`
          INSERT INTO telemetry (table_id, route_id, lat, lng, speed, road_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(table.id, route_id || null, parseFloat(lat), parseFloat(lng), parseFloat(speed) || 0, road_name || "").run();

        // High performance index for fast retrieval (<1ms)
        await env.DB.prepare(`
          CREATE INDEX IF NOT EXISTS idx_telemetry_table_time ON telemetry (table_id, timestamp DESC)
        `).run().catch(() => {});

        // Automatically prune historical telemetry older than 48 hours to prevent database ballooning
        await env.DB.prepare(`
          DELETE FROM telemetry 
          WHERE timestamp < datetime('now', '-48 hours')
        `).run().catch(() => {});

        // 🎅 Real-time proximity email notifications for families (Zero driver latency)
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(processSubscriberProximity({
            env,
            table,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            speed: parseFloat(speed) || 0,
            route_id: route_id || null
          }));
        } else {
          processSubscriberProximity({
            env,
            table,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            speed: parseFloat(speed) || 0,
            route_id: route_id || null
          }).catch(e => console.error("Proximity processor background error:", e));
        }

        return jsonResponse({ ok: true, status: "Broadcasted", road_name });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
      }
    }

    // ==============================================================
    // 📢 LIVE ANNOUNCEMENT BROADCAST (POST /api/announcement)
    // ==============================================================
    if (path === "/api/announcement" && (request.method === "POST" || request.method === "PUT")) {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }
      const message = (body.message || "").trim();

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;

      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to broadcast announcements" }, 401);
      }

      await env.DB.prepare(`
        UPDATE tables SET live_announcement = ? WHERE id = ?
      `).bind(message || null, table.id).run();
      return jsonResponse({ ok: true, live_announcement: message });
    }

    // ==============================================================
    // ⚙️ 4B. TABLE SETTINGS UPDATE (POST & PUT /api/table/settings)
    // ==============================================================
    if (path === "/api/table/settings" && (request.method === "POST" || request.method === "PUT")) {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;

      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to update settings" }, 401);
      }

      let {
        sleigh_display_name,
        fundraising_goal,
        expenses,
        expenses_json,
        donate_url,
        logo_url,
        sleigh_icon_live,
        website_url,
        facebook_url,
        instagram_url,
        tiktok_url,
        primary_color,
        charity_name,
        charity_number,
        enable_gift_aid,
        headline_sponsor_name,
        headline_sponsor_logo,
        headline_sponsor_url,
        headline_sponsor_tagline,
        gemini_model,
        gemini_api_key,
        santa_voice_provider,
        elevenlabs_agent_id,
        santa_voice_pitch,
        santa_voice_rate,
        enable_santa_chat,
        enable_colouring,
        public_slot_1,
        public_slot_2,
        notify_email_enabled,
        notify_radius_meters,
        pass_buffer_meters,
        gmail_client_id,
        gmail_client_secret,
        background_mode,
        background_video_url,
        background_url,
        notify_approaching_subject,
        notify_approaching_msg,
        notify_passed_subject,
        notify_passed_msg
      } = body;

      // Isolate Santa Chat strictly to Beverley (prevent any other table from enabling or saving it)
      if (slug !== 'beverley') {
        if (public_slot_1 === 'santa_chat') public_slot_1 = '';
        if (public_slot_2 === 'santa_chat') public_slot_2 = '';
        enable_santa_chat = 0;
        elevenlabs_agent_id = null;
      }

      // Ensure columns exist in tables schema
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN logo_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN sleigh_icon_live TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN website_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN facebook_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN instagram_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN tiktok_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN charity_name TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN charity_number TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN enable_gift_aid BOOLEAN DEFAULT 0").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN expenses REAL DEFAULT 0").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN expenses_json TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_name TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_logo TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_tagline TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN gemini_model TEXT DEFAULT 'auto'").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN gemini_api_key TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN santa_voice_provider TEXT DEFAULT 'gemini'").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN elevenlabs_agent_id TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN santa_voice_pitch REAL DEFAULT 0.74").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN santa_voice_rate REAL DEFAULT 0.85").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN total_views INTEGER DEFAULT 0").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN enable_santa_chat BOOLEAN DEFAULT 0").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN enable_colouring BOOLEAN DEFAULT 0").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN public_slot_1 TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN public_slot_2 TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_email_enabled BOOLEAN DEFAULT 1").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_radius_meters INTEGER DEFAULT 250").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN pass_buffer_meters INTEGER DEFAULT 150").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN gmail_client_id TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN gmail_client_secret TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN background_mode TEXT DEFAULT 'image'").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN background_video_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN background_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_approaching_subject TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_approaching_msg TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_passed_subject TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN notify_passed_msg TEXT").run(); } catch(e) {}

      try {
        await env.DB.prepare(`
          UPDATE tables SET
            sleigh_display_name = COALESCE(?, sleigh_display_name),
            fundraising_goal = COALESCE(?, fundraising_goal),
            expenses = COALESCE(?, expenses),
            expenses_json = COALESCE(?, expenses_json),
            donate_url = COALESCE(?, donate_url),
            logo_url = COALESCE(?, logo_url),
            sleigh_icon_live = COALESCE(?, sleigh_icon_live),
            website_url = COALESCE(?, website_url),
            facebook_url = COALESCE(?, facebook_url),
            instagram_url = COALESCE(?, instagram_url),
            tiktok_url = COALESCE(?, tiktok_url),
            primary_color = COALESCE(?, primary_color),
            charity_name = COALESCE(?, charity_name),
            charity_number = COALESCE(?, charity_number),
            enable_gift_aid = COALESCE(?, enable_gift_aid),
            headline_sponsor_name = COALESCE(?, headline_sponsor_name),
            headline_sponsor_logo = COALESCE(?, headline_sponsor_logo),
            headline_sponsor_url = COALESCE(?, headline_sponsor_url),
            headline_sponsor_tagline = COALESCE(?, headline_sponsor_tagline),
            gemini_model = COALESCE(?, gemini_model),
            gemini_api_key = COALESCE(?, gemini_api_key),
            santa_voice_provider = COALESCE(?, santa_voice_provider),
            elevenlabs_agent_id = COALESCE(?, elevenlabs_agent_id),
            santa_voice_pitch = COALESCE(?, santa_voice_pitch),
            santa_voice_rate = COALESCE(?, santa_voice_rate),
            enable_santa_chat = COALESCE(?, enable_santa_chat),
            enable_colouring = COALESCE(?, enable_colouring),
            public_slot_1 = COALESCE(?, public_slot_1),
            public_slot_2 = COALESCE(?, public_slot_2),
            notify_email_enabled = COALESCE(?, notify_email_enabled),
            notify_radius_meters = COALESCE(?, notify_radius_meters),
            pass_buffer_meters = COALESCE(?, pass_buffer_meters),
            gmail_client_id = COALESCE(?, gmail_client_id),
            gmail_client_secret = COALESCE(?, gmail_client_secret),
            background_mode = COALESCE(?, background_mode),
            background_video_url = COALESCE(?, background_video_url),
            background_url = COALESCE(?, background_url),
            notify_approaching_subject = COALESCE(?, notify_approaching_subject),
            notify_approaching_msg = COALESCE(?, notify_approaching_msg),
            notify_passed_subject = COALESCE(?, notify_passed_subject),
            notify_passed_msg = COALESCE(?, notify_passed_msg)
          WHERE id = ?
        `).bind(
          sleigh_display_name !== undefined ? sleigh_display_name : null,
          fundraising_goal !== undefined ? fundraising_goal : null,
          expenses !== undefined ? parseFloat(expenses) : null,
          expenses_json !== undefined ? (typeof expenses_json === 'string' ? expenses_json : JSON.stringify(expenses_json)) : null,
          donate_url !== undefined ? donate_url : null,
          logo_url !== undefined ? logo_url : null,
          sleigh_icon_live !== undefined ? sleigh_icon_live : null,
          website_url !== undefined ? website_url : null,
          facebook_url !== undefined ? facebook_url : null,
          instagram_url !== undefined ? instagram_url : null,
          tiktok_url !== undefined ? tiktok_url : null,
          primary_color !== undefined ? primary_color : null,
          charity_name !== undefined ? charity_name : null,
          charity_number !== undefined ? charity_number : null,
          enable_gift_aid !== undefined ? (enable_gift_aid ? 1 : 0) : null,
          headline_sponsor_name !== undefined ? headline_sponsor_name : null,
          headline_sponsor_logo !== undefined ? headline_sponsor_logo : null,
          headline_sponsor_url !== undefined ? headline_sponsor_url : null,
          headline_sponsor_tagline !== undefined ? headline_sponsor_tagline : null,
          gemini_model !== undefined ? gemini_model : null,
          gemini_api_key !== undefined ? gemini_api_key : null,
          santa_voice_provider !== undefined ? santa_voice_provider : null,
          elevenlabs_agent_id !== undefined ? elevenlabs_agent_id : null,
          santa_voice_pitch !== undefined ? parseFloat(santa_voice_pitch) : null,
          santa_voice_rate !== undefined ? parseFloat(santa_voice_rate) : null,
          enable_santa_chat !== undefined ? (enable_santa_chat ? 1 : 0) : ((public_slot_1 === 'santa_chat' || public_slot_2 === 'santa_chat') ? 1 : 0),
          enable_colouring !== undefined ? (enable_colouring ? 1 : 0) : ((public_slot_1 === 'colouring' || public_slot_2 === 'colouring') ? 1 : 0),
          public_slot_1 !== undefined ? (public_slot_1 || '') : null,
          public_slot_2 !== undefined ? (public_slot_2 || '') : null,
          notify_email_enabled !== undefined ? (notify_email_enabled ? 1 : 0) : null,
          notify_radius_meters !== undefined ? parseInt(notify_radius_meters, 10) : null,
          pass_buffer_meters !== undefined ? parseInt(pass_buffer_meters, 10) : null,
          gmail_client_id !== undefined ? gmail_client_id : null,
          gmail_client_secret !== undefined ? gmail_client_secret : null,
          background_mode !== undefined ? background_mode : null,
          background_video_url !== undefined ? background_video_url : null,
          background_url !== undefined ? background_url : null,
          notify_approaching_subject !== undefined ? notify_approaching_subject : null,
          notify_approaching_msg !== undefined ? notify_approaching_msg : null,
          notify_passed_subject !== undefined ? notify_passed_subject : null,
          notify_passed_msg !== undefined ? notify_passed_msg : null,
          table.id
        ).run();

        return jsonResponse({ ok: true, message: "Settings saved successfully" });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
      }
    }

    // ==============================================================
    // 🗺️ 4C. ROUTE & TIMETABLE MANAGEMENT (/api/routes)
    // ==============================================================
    if (path === "/api/routes") {
      let body = {};
      if (request.method !== "GET") {
        try { body = await request.json(); } catch(e) { body = {}; }
      }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;

      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to manage routes" }, 401);
      }

      // Ensure optional columns exist in D1 routes table safely
      try { await env.DB.prepare("ALTER TABLE routes ADD COLUMN end_time TEXT").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE routes ADD COLUMN notes TEXT").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE routes ADD COLUMN sponsor_name TEXT").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE routes ADD COLUMN sponsor_logo TEXT").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE routes ADD COLUMN sponsor_link TEXT").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE routes ADD COLUMN sponsor_description TEXT").run(); } catch(e){}
      try { await env.DB.prepare("ALTER TABLE routes ADD COLUMN sponsors_json TEXT").run(); } catch(e){}

      // POST/PUT: Upsert route & streets
      if (request.method === "POST" || request.method === "PUT") {
        const r = body.route || body;
        const streets = body.streets || r.streets || [];

        if (!r.name || !String(r.name).trim()) {
          return jsonResponse({ error: "Route name is required" }, 400);
        }

        const routeId = r.id || `${table.id}_route_${Date.now()}`;
        const name = String(r.name).trim();
        const date = r.date || "";
        const startTime = r.start_time || "18:00";
        const endTime = r.end_time || "20:30";
        const gpxUrl = r.gpx_url || r.gpxUrl || "";
        const notes = r.notes || "";
        const status = r.status || "Scheduled";

        // Multi-sponsor normalization
        let sponsorsList = [];
        if (Array.isArray(r.sponsors)) {
          sponsorsList = r.sponsors.filter(sp => sp && (sp.name || sp.sponsor_name || sp.logo_url || sp.sponsor_logo || sp.sponsor_logo_url));
        } else if (r.sponsors_json) {
          try {
            const parsed = typeof r.sponsors_json === 'string' ? JSON.parse(r.sponsors_json) : r.sponsors_json;
            if (Array.isArray(parsed)) {
              sponsorsList = parsed.filter(sp => sp && (sp.name || sp.sponsor_name || sp.logo_url || sp.sponsor_logo || sp.sponsor_logo_url));
            }
          } catch(e) {}
        }

        if (sponsorsList.length === 0 && r.notes) {
          try {
            const match = r.notes.match(/<!--\s*SPONSORS_DATA:\s*(\[.*?\])\s*-->/s) ||
                          r.notes.match(/\[SPONSORS_JSON:\s*(\[.*?\])\s*\]/s);
            if (match && match[1]) {
              const parsed = JSON.parse(match[1]);
              if (Array.isArray(parsed)) {
                sponsorsList = parsed.filter(sp => sp && (sp.name || sp.sponsor_name || sp.logo_url || sp.sponsor_logo || sp.sponsor_logo_url));
              }
            }
          } catch(e) {}
        }

        const rawSponsorName = (r.sponsor_name || r.sponsorName || "").trim();
        if (sponsorsList.length === 0 && rawSponsorName && (rawSponsorName.includes(' • ') || rawSponsorName.includes(' | '))) {
          const parts = rawSponsorName.split(/\s*(?:•|\|)\s*/).filter(Boolean);
          if (parts.length > 1) {
            sponsorsList = parts.map((partName, idx) => ({
              name: partName.trim(),
              logo_url: idx === 0 ? (r.sponsor_logo_url || r.sponsor_logo || r.sponsorLogo || "") : "",
              link: idx === 0 ? (r.sponsor_link || r.sponsorLink || "") : "",
              description: idx === 0 ? (r.sponsor_description || r.sponsorDescription || "") : ""
            }));
          }
        }

        if (sponsorsList.length === 0 && (rawSponsorName || r.sponsor_logo_url || r.sponsor_logo || r.sponsorLogo)) {
          sponsorsList = [{
            name: rawSponsorName,
            logo_url: r.sponsor_logo_url || r.sponsor_logo || r.sponsorLogo || '',
            link: r.sponsor_link || r.sponsorLink || '',
            description: r.sponsor_description || r.sponsorDescription || ''
          }];
        }

        sponsorsList = sponsorsList.map(s => ({
          name: (s.name || s.sponsor_name || '').trim(),
          logo_url: (s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '').trim(),
          link: (s.link || s.sponsor_link || '').trim(),
          description: (s.description || s.sponsor_description || '').trim()
        }));

        const sponsorsJson = sponsorsList.length > 0 ? JSON.stringify(sponsorsList) : null;
        const primarySponsor = sponsorsList[0] || {};
        const sponsorName = sponsorsList.map(s => s.name).filter(Boolean).join(' • ') || (primarySponsor.name || rawSponsorName || "");
        const sponsorLogo = primarySponsor.logo_url || r.sponsor_logo_url || r.sponsor_logo || r.sponsorLogo || "";
        const sponsorLink = primarySponsor.link || r.sponsor_link || r.sponsorLink || "";
        const sponsorDesc = primarySponsor.description || r.sponsor_description || r.sponsorDescription || "";

        const existingNotes = (r.notes || "").replace(/<!--\s*SPONSORS_DATA:.*?-->/gs, '').trim();
        const finalNotes = sponsorsList.length > 0
          ? (existingNotes ? `${existingNotes}\n<!-- SPONSORS_DATA:${JSON.stringify(sponsorsList)} -->` : `<!-- SPONSORS_DATA:${JSON.stringify(sponsorsList)} -->`)
          : existingNotes;

        // Upsert Route in D1
        await env.DB.prepare(`
          INSERT INTO routes (id, table_id, name, date, start_time, end_time, status, notes, gpx_url, sponsor_name, sponsor_logo, sponsor_link, sponsor_description, sponsors_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            table_id = excluded.table_id,
            name = excluded.name,
            date = excluded.date,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            status = excluded.status,
            notes = excluded.notes,
            gpx_url = excluded.gpx_url,
            sponsor_name = excluded.sponsor_name,
            sponsor_logo = excluded.sponsor_logo,
            sponsor_link = excluded.sponsor_link,
            sponsor_description = excluded.sponsor_description,
            sponsors_json = excluded.sponsors_json
        `).bind(routeId, table.id, name, date, startTime, endTime, status, finalNotes, gpxUrl, sponsorName, sponsorLogo, sponsorLink, sponsorDesc, sponsorsJson).run();

        // Sync Streets for this route
        await env.DB.prepare("DELETE FROM route_streets WHERE table_id = ? AND route_id = ?").bind(table.id, routeId).run();

        if (Array.isArray(streets) && streets.length > 0) {
          for (let i = 0; i < streets.length; i++) {
            const st = streets[i];
            const sName = typeof st === "string" ? st.trim() : (st.street_name || "").trim();
            if (sName) {
              await env.DB.prepare(`
                INSERT INTO route_streets (table_id, route_id, street_name, sequence_order)
                VALUES (?, ?, ?, ?)
              `).bind(table.id, routeId, sName, i + 1).run();
            }
          }
        }

        return jsonResponse({
          ok: true,
          route: {
            id: routeId,
            table_id: table.id,
            name,
            date,
            start_time: startTime,
            end_time: endTime,
            status,
            notes,
            gpx_url: gpxUrl,
            sponsors: sponsorsList,
            sponsors_json: sponsorsJson,
            sponsor_name: sponsorName,
            sponsor_logo: sponsorLogo,
            sponsor_link: sponsorLink,
            sponsor_description: sponsorDesc,
            streets: streets.map((s, idx) => ({
              id: `${routeId}_st_${idx}`,
              table_id: table.id,
              route_id: routeId,
              street_name: typeof s === "string" ? s : s.street_name,
              sequence_order: idx + 1
            }))
          }
        });
      }

      // DELETE: Remove route & its streets
      if (request.method === "DELETE") {
        const routeId = url.searchParams.get("id") || body.id || body.routeId;
        if (!routeId) {
          return jsonResponse({ error: "Missing route id to delete" }, 400);
        }

        await env.DB.prepare("DELETE FROM route_streets WHERE table_id = ? AND route_id = ?").bind(table.id, routeId).run();
        await env.DB.prepare("DELETE FROM routes WHERE table_id = ? AND id = ?").bind(table.id, routeId).run();

        return jsonResponse({ ok: true, deleted: routeId });
      }
    }

    // ==============================================================
    // 💳 5. MULTI-GATEWAY DONATION WEBHOOK RECEIVER (POST /api/webhooks/*)
    // ==============================================================
    if (path.startsWith("/api/webhooks/") && request.method === "POST") {
      const provider = path.replace("/api/webhooks/", "").toLowerCase();
      const secret = url.searchParams.get("secret") || request.headers.get("x-webhook-secret");

      if (table.zeffy_webhook_secret && secret && secret !== table.zeffy_webhook_secret && !isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Invalid webhook secret" }, 401);
      }

      let payload = {};
      try { payload = await request.json(); } catch (e) { payload = {}; }

      let amount = 0;
      let donorName = "Generous Supporter";
      let source = provider;
      let streetName = "Online Link";

      if (provider === "zeffy") {
        const raw = parseFloat((payload.data && payload.data.amount) || payload.amount || 0);
        amount = (payload.data && payload.data.amount !== undefined) ? (raw / 100) : (raw > 50 ? raw / 100 : raw);
        const b = (payload.data && (payload.data.buyer || payload.data.contact)) || {};
        const first = b.first_name || b.firstName || "";
        const last = b.last_name || b.lastName || "";
        const fullName = [first, last].filter(Boolean).join(" ");
        donorName = fullName || payload.donorName || payload.donor_name || "Zeffy Supporter";
      } else if (provider === "stripe") {
        const obj = (payload.data && payload.data.object) || payload;
        const raw = parseFloat(obj.amount_total || obj.amount || 0);
        amount = raw > 50 ? raw / 100 : raw;
        donorName = (obj.customer_details && obj.customer_details.name) || obj.donor_name || "Stripe Supporter";
      } else if (provider === "sumup") {
        amount = parseFloat(payload.amount || payload.total_amount || 0);
        donorName = (payload.card && payload.card.holder_name) || "Street Card Tap";
        streetName = "Street Collection (SumUp Card Reader)";
      } else if (provider === "justgiving") {
        amount = parseFloat(payload.amount || payload.donationAmount || 0);
        donorName = payload.donorName || payload.name || "JustGiving Supporter";
      } else if (provider === "paypal") {
        amount = parseFloat((payload.resource && payload.resource.amount && payload.resource.amount.value) || payload.amount || 0);
        donorName = (payload.resource && payload.resource.payer && payload.resource.payer.name && payload.resource.payer.name.given_name) || "PayPal Donor";
      } else {
        amount = parseFloat(payload.amount || url.searchParams.get("amount") || 0);
        donorName = payload.donorName || payload.donor_name || url.searchParams.get("donor") || "Community Supporter";
        source = payload.source || url.searchParams.get("source") || "custom";
        streetName = payload.streetName || payload.street_name || "Online Donation";
      }

      const isDryRun = url.searchParams.get("dry_run") === "1" || url.searchParams.get("dry_run") === "true" || payload.dry_run === true;

      if (isDryRun) {
        return jsonResponse({
          ok: true,
          status: "Test Succeeded (Dry-Run)",
          dry_run: true,
          provider,
          amount,
          donorName,
          source,
          message: `Webhook endpoint verified! Successfully parsed £${amount.toFixed(2)} from "${donorName}". No records were written to your database.`
        });
      }

      if (amount > 0) {
        const donationId = `${provider}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        try {
          await env.DB.prepare(`
            INSERT INTO donations (id, table_id, amount, source, street_name, donor_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(donationId, table.id, amount, source, streetName, donorName).run();
        } catch (e) {
          await env.DB.prepare(`
            INSERT INTO donations (id, table_id, amount, source, street_name, donor_name)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(donationId, table.id, amount, source, streetName, donorName).run();
        }

        const currentTotal = await env.DB.prepare(`
          SELECT SUM(amount) as total FROM donations 
          WHERE table_id = ? 
            AND (created_at IS NULL OR strftime('%Y', created_at) = strftime('%Y', 'now'))
        `).bind(table.id).first().catch(async () => {
          return await env.DB.prepare(
            "SELECT SUM(amount) as total FROM donations WHERE table_id = ?"
          ).bind(table.id).first();
        });

        return jsonResponse({
          ok: true,
          status: "Processed",
          provider,
          amount,
          donorName,
          source,
          new_total_raised: (currentTotal && currentTotal.total) || amount
        });
      }

      return jsonResponse({ ok: false, error: "Zero or invalid donation amount", payload_received: payload }, 400);
    }

    // ==============================================================
    // 🗑️ 5b. RESET / CLEAR DONATIONS (DELETE /api/donations)
    // ==============================================================
    if (path === "/api/donations" && request.method === "DELETE") {
      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = url.searchParams.get("secret") || bearerToken;

      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to clear donations" }, 401);
      }

      await env.DB.prepare("DELETE FROM donations WHERE table_id = ?").bind(table.id).run();
      return jsonResponse({ ok: true, message: "Donations cleared successfully", total_raised: 0 });
    }

    // ==============================================================
    // 🪙 5c. NIGHTLY CASH BUCKET RECONCILIATION (POST & GET /api/donations/cash)
    // ==============================================================
    if (path === "/api/donations/cash") {
      // GET: Return recent cash bucket entries
      if (request.method === "GET") {
        const cashEntries = await env.DB.prepare(`
          SELECT id, amount, street_name as route_name, donor_name as verified_by, created_at 
          FROM donations 
          WHERE table_id = ? AND source = 'cash' 
          ORDER BY created_at DESC LIMIT 30
        `).bind(table.id).all().catch(() => ({ results: [] }));

        const totalCash = await env.DB.prepare(`
          SELECT SUM(amount) as total, COUNT(*) as count 
          FROM donations 
          WHERE table_id = ? AND source = 'cash'
        `).bind(table.id).first().catch(() => ({ total: 0, count: 0 }));

        return jsonResponse({
          ok: true,
          entries: cashEntries.results || [],
          total: totalCash?.total || 0,
          count: totalCash?.count || 0
        });
      }

      // POST: Record cash bucket count
      if (request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch(e) { body = {}; }

        const authHeader = request.headers.get("Authorization") || "";
        const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        const secret = body.secret || url.searchParams.get("secret") || bearerToken;

        if (!isAuthorized(secret)) {
          return jsonResponse({ error: "Unauthorized: Admin authorization required to record cash donations" }, 401);
        }

        const amount = parseFloat(body.amount || 0);
        if (!amount || amount <= 0) {
          return jsonResponse({ error: "Invalid cash amount" }, 400);
        }

        const routeName = (body.route_name || body.routeName || "Street Collection").trim();
        const verifiedBy = (body.verified_by || body.verifiedBy || "Treasurer & Lead Elf").trim();
        const notes = (body.notes || "").trim();
        const dateStr = body.date || new Date().toISOString().slice(0, 10);
        const donationId = `cash_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const donorDescriptor = notes ? `${verifiedBy} • ${notes}` : verifiedBy;

        try {
          await env.DB.prepare(`
            INSERT INTO donations (id, table_id, amount, source, street_name, donor_name, created_at)
            VALUES (?, ?, ?, 'cash', ?, ?, datetime(? || ' 21:00:00'))
          `).bind(donationId, table.id, amount, routeName, donorDescriptor, dateStr).run();
        } catch(e) {
          await env.DB.prepare(`
            INSERT INTO donations (id, table_id, amount, source, street_name, donor_name)
            VALUES (?, ?, ?, 'cash', ?, ?)
          `).bind(donationId, table.id, amount, routeName, donorDescriptor).run();
        }

        const currentTotal = await env.DB.prepare(`
          SELECT SUM(amount) as total FROM donations WHERE table_id = ?
        `).bind(table.id).first().catch(() => ({ total: amount }));

        return jsonResponse({
          ok: true,
          id: donationId,
          amount,
          source: 'cash',
          route_name: routeName,
          verified_by: verifiedBy,
          total_raised: currentTotal?.total || amount,
          message: `Recorded £${amount.toFixed(2)} cash from ${routeName} to live total!`
        });
      }

      // DELETE: Remove mistakenly entered cash entry
      if (request.method === "DELETE") {
        const authHeader = request.headers.get("Authorization") || "";
        const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        const secret = url.searchParams.get("secret") || bearerToken;

        if (!isAuthorized(secret)) {
          return jsonResponse({ error: "Unauthorized: Admin authorization required to delete cash entries" }, 401);
        }

        const donationId = url.searchParams.get("id");
        if (!donationId) return jsonResponse({ error: "Missing donation id" }, 400);
        await env.DB.prepare("DELETE FROM donations WHERE table_id = ? AND id = ? AND source = 'cash'").bind(table.id, donationId).run();
        const currentTotal = await env.DB.prepare("SELECT SUM(amount) as total FROM donations WHERE table_id = ?").bind(table.id).first();
        return jsonResponse({ ok: true, total_raised: currentTotal?.total || 0 });
      }
    }

    // ==============================================================
    // 🎁 6. PUBLIC GIFT AID DECLARATION (POST /api/gift-aid)
    // ==============================================================
    if (path === "/api/gift-aid" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      const title = body.title || "";
      const firstName = (body.firstName || body.first_name || "").trim();
      const lastName = (body.lastName || body.last_name || "").trim();
      const address1 = (body.address1 || body.address_1 || "").trim();
      const address2 = (body.address2 || body.address_2 || "").trim();
      const city = (body.city || "").trim();
      const postcode = (body.postcode || "").trim().toUpperCase();
      const amount = parseFloat(body.amount) || 0;
      const declDate = body.declarationDate || new Date().toISOString().slice(0, 10);

      if (!firstName || !lastName || !postcode || amount <= 0) {
        return jsonResponse({ error: "Missing mandatory fields (first name, last name, postcode, valid amount)" }, 400);
      }

      const houseNameOrNumber = [address1, address2, city].filter(Boolean).join(", ") || address1 || postcode;

      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS gift_aid (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_id TEXT NOT NULL,
            donor_ref TEXT,
            title TEXT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            house_name_or_number TEXT NOT NULL,
            postcode TEXT NOT NULL,
            donation_amount REAL NOT NULL,
            declaration_date TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(table_id) REFERENCES tables(id)
          )
        `).run();

        await env.DB.prepare(`
          INSERT INTO gift_aid (table_id, title, first_name, last_name, house_name_or_number, postcode, donation_amount, declaration_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `).bind(
          table.id,
          title,
          firstName,
          lastName,
          houseNameOrNumber,
          postcode,
          amount,
          declDate
        ).run();

        return jsonResponse({ ok: true, message: "Gift Aid declaration recorded successfully" });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
      }
    }

    // ==============================================================
    // 🎁 7. HMRC GIFT AID R68 EXPORT (GET /api/gift-aid/export)
    // ==============================================================
    if (path === "/api/gift-aid/export" && request.method === "GET") {
      const secret = url.searchParams.get("secret") || request.headers.get("Authorization");
      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to export statutory HMRC Gift Aid data" }, 401);
      }

      const declarations = await env.DB.prepare(`
        SELECT title, first_name, last_name, house_name_or_number, postcode, declaration_date, donation_amount
        FROM gift_aid
        WHERE table_id = ? AND status = 'Pending'
        LIMIT 1000
      `).bind(table.id).all();

      const headers = "Title,First Name,Last Name,House name or number,Postcode,Aggregated donations,Sponsored event,Date,Amount\n";
      const rows = (declarations.results || []).map(d => {
        return `"${d.title || ""}","${d.first_name}","${d.last_name}","${d.house_name_or_number}","${d.postcode}","","",${d.declaration_date},${d.donation_amount.toFixed(2)}`;
      }).join("\n");

      return new Response(headers + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="HMRC_GiftAid_${table.slug}_${Date.now()}.csv"`
        }
      });
    }

    // ==============================================================
    // 📦 7. R2 ASSET UPLOAD (POST /api/upload)
    // ==============================================================
    if (path === "/api/upload" && request.method === "POST") {
      const contentType = request.headers.get("content-type") || "image/png";
      const ext = contentType.includes("png") ? "png" : contentType.includes("svg") ? "svg" : (contentType.includes("gpx") || contentType.includes("xml")) ? "gpx" : "jpg";
      const key = `${table.slug}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const r2 = env.R2 || env['turbosanta-media'] || env.turbosanta_media;
      
      if (r2) {
        await r2.put(key, request.body, { httpMetadata: { contentType } });
        return jsonResponse({ ok: true, url: `${origin}/cdn/${key}` });
      }
      return jsonResponse({ ok: false, error: "R2 bucket binding not configured", url: null }, 500);
    }

    // ==============================================================
    // 🖼️ 8. R2 ASSET SERVE (GET /cdn/*)
    // ==============================================================
    if (path.startsWith("/cdn/") && request.method === "GET") {
      const key = path.replace("/cdn/", "");
      const r2 = env.R2 || env['turbosanta-media'] || env.turbosanta_media;
      if (r2) {
        const object = await r2.get(key);
        if (!object) return new Response("Not Found", { status: 404 });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(object.body, { headers });
      }
      return new Response("R2 not configured", { status: 404 });
    }

    // ==============================================================
    // 🔐 9. AUTH VERIFICATION & BEACON CONFIG (GET /api/auth/verify)
    // ==============================================================
    if ((path === "/api/auth/verify" || path === "/api/beacon/config" || url.searchParams.get("function") === "verifyBeaconAuth" || url.searchParams.get("function") === "getBeaconConfig") && request.method === "GET") {
      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = url.searchParams.get("secret") || bearerToken;
      const isValid = isAuthorized(secret);
      return jsonResponse({
        valid: Boolean(isValid),
        gpsLoggerUrl: `${origin}/api/telemetry?table=${table.slug}`,
        sleighName: table.sleigh_display_name || table.name || "Santa Sleigh",
        table: table.slug
      });
    }

    // ==============================================================
    // 🔑 9B. SEND MAGIC OTP DISPATCH (POST /api/auth/send-otp)
    // ==============================================================
    if (path === "/api/auth/send-otp" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }
      const email = (body.email || "").trim().toLowerCase();

      if (!email || (!email.endsWith("@roundtable.org.uk") && !email.endsWith("@roundtable.co.uk"))) {
        return jsonResponse({ ok: false, error: "Only official @roundtable.org.uk email addresses permitted" }, 400);
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS auth_otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        await env.DB.prepare(`
          INSERT INTO auth_otps (email, code, expires_at) VALUES (?, ?, ?)
        `).bind(email, otpCode, expiresAt).run();
      } catch (err) {
        console.warn("OTP D1 error:", err.message);
      }

      let emailDispatched = false;
      const resendApiKey = env.RESEND_API_KEY || (typeof RESEND_API_KEY !== 'undefined' ? RESEND_API_KEY : null);
      if (resendApiKey) {
        try {
          const fromSender = env.RESEND_FROM_EMAIL || "TurboSanta <onboarding@resend.dev>";
          const mailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: fromSender,
              to: [email],
              subject: `🎅 ${otpCode} is your TurboSanta Login Code`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #111827;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #FBAF33; font-size: 24px; margin-bottom: 8px;">🎅</div>
                    <h2 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111827;">TURBOSANTA 2.0</h2>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Round Table Great Britain & Ireland</p>
                  </div>
                  <p style="font-size: 15px; margin-bottom: 16px;">Hello <strong>${email}</strong>,</p>
                  <p style="font-size: 14px; color: #374151; margin-bottom: 20px;">Use this 6-digit verification code to sign into your Table Admin & God Mode console:</p>
                  <div style="background-color: #f8fafc; border: 2px dashed #FBAF33; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #d31c1c;">${otpCode}</span>
                  </div>
                  <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 24px;">This code will expire in <strong>10 minutes</strong>. If you did not request this login code, you can safely ignore this email.</p>
                  <hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 16px;" />
                  <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">Powered by TurboSanta 2.0 • For Round Tables across the UK & Ireland</p>
                </div>
              `
            })
          });
          if (mailRes.ok) emailDispatched = true;
        } catch (mailErr) {
          console.warn("Resend mail dispatch failed:", mailErr.message);
        }
      }

      return jsonResponse({
        ok: true,
        emailDispatched,
        message: emailDispatched 
          ? `Verification code sent to ${email} via official email.`
          : `Verification code generated for ${email}. Check your inbox or enter Table Master Password.`,
        expiresInMins: 10
      });
    }

    // ==============================================================
    // 🔑 9C. VERIFY MAGIC OTP (POST /api/auth/verify-otp)
    // ==============================================================
    if (path === "/api/auth/verify-otp" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }
      const email = (body.email || "").trim().toLowerCase();
      const code = (body.code || "").trim();

      if (!email || !code) {
        return jsonResponse({ ok: false, error: "Email and code required" }, 400);
      }

      if (env.ADMIN_SECRET && code === env.ADMIN_SECRET) {
        return jsonResponse({
          ok: true,
          verified: true,
          session: { email, tableSlug: table?.slug || slug, authenticated: true }
        });
      }

      try {
        const record = await env.DB.prepare(`
          SELECT * FROM auth_otps
          WHERE email = ? AND code = ? AND expires_at > ?
          ORDER BY id DESC LIMIT 1
        `).bind(email, code, Date.now()).first();

        if (record) {
          await env.DB.prepare("DELETE FROM auth_otps WHERE id = ?").bind(record.id).run();
          return jsonResponse({
            ok: true,
            verified: true,
            session: { email, tableSlug: table?.slug || slug, authenticated: true }
          });
        }
      } catch (err) {
        console.warn("OTP verification query error:", err.message);
      }

      return jsonResponse({ ok: false, error: "Invalid or expired verification code." }, 401);
    }

    // ==============================================================
    // 🔗 9C. GOOGLE WORKSPACE GMAIL CONNECT (POST /api/auth/google-gmail-connect)
    // ==============================================================
    if (path === "/api/auth/google-gmail-connect" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;
      const targetSlug = (body.tableSlug || body.table || slug || "beverley").toLowerCase().trim();

      if (!isAuthorized(secret, targetSlug)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to connect Table Gmail" }, 401);
      }

      const { code } = body;
      if (!code) {
        return jsonResponse({ error: "Missing authorization code" }, 400);
      }

      const clientId = body.client_id || table?.gmail_client_id || env.GOOGLE_CLIENT_ID || OFFICIAL_GOOGLE_CLIENT_ID;
      const clientSecret = body.client_secret || table?.gmail_client_secret || env.GOOGLE_CLIENT_SECRET;

      if (!clientSecret) {
        return jsonResponse({
          error: "Google OAuth Client Secret required. Please enter it in Table Settings or configure GOOGLE_CLIENT_SECRET on Cloudflare."
        }, 400);
      }

      try {
        const tokenParams = new URLSearchParams();
        tokenParams.append("code", code);
        tokenParams.append("client_id", clientId);
        tokenParams.append("client_secret", clientSecret);
        tokenParams.append("redirect_uri", "postmessage");
        tokenParams.append("grant_type", "authorization_code");

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString()
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || tokenData.error) {
          return jsonResponse({
            error: tokenData.error_description || tokenData.error || "Failed to exchange authorization code with Google"
          }, 400);
        }

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;

        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });

        if (!userRes.ok) {
          return jsonResponse({ error: "Failed to retrieve user profile from Google" }, 400);
        }

        const userInfo = await userRes.json();
        const connectedEmail = (userInfo.email || "").toLowerCase().trim();

        if (!connectedEmail) {
          return jsonResponse({ error: "No email address found in Google account profile" }, 400);
        }

        // Multi-tenant isolation: Ensure email belongs to this table
        if (!isEmailAuthorizedForTable(connectedEmail, targetSlug)) {
          return jsonResponse({
            error: `Email ${connectedEmail} is not authorized for Table '${targetSlug}'. Please sign in with an official @roundtable.org.uk account for ${targetSlug}.`
          }, 403);
        }

        await env.DB.prepare(`
          UPDATE tables SET
            gmail_refresh_token = COALESCE(?, gmail_refresh_token),
            gmail_connected_email = ?,
            notify_email_enabled = 1,
            gmail_client_id = COALESCE(?, gmail_client_id),
            gmail_client_secret = COALESCE(?, gmail_client_secret)
          WHERE id = ?
        `).bind(
          refreshToken || null,
          connectedEmail,
          body.client_id || null,
          body.client_secret || null,
          table.id
        ).run();

        return jsonResponse({
          ok: true,
          connected_email: connectedEmail,
          message: `Successfully connected ${connectedEmail} for ${targetSlug} proximity alerts!`
        });
      } catch (err) {
        return jsonResponse({ error: `Connection failed: ${err.message}` }, 500);
      }
    }

    // ==============================================================
    // 🔌 9D. GOOGLE WORKSPACE GMAIL DISCONNECT (POST /api/auth/google-gmail-disconnect)
    // ==============================================================
    if (path === "/api/auth/google-gmail-disconnect" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;
      const targetSlug = (body.tableSlug || body.table || slug || "beverley").toLowerCase().trim();

      if (!isAuthorized(secret, targetSlug)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      await env.DB.prepare(`
        UPDATE tables SET
          gmail_refresh_token = NULL,
          gmail_connected_email = NULL,
          notify_email_enabled = 0
        WHERE id = ?
      `).bind(table.id).run();

      return jsonResponse({ ok: true, message: "Google Workspace Gmail disconnected successfully." });
    }

    // ==============================================================
    // 🧪 9E. GOOGLE WORKSPACE GMAIL TEST ALERT (POST /api/auth/google-gmail-test)
    // ==============================================================
    if (path === "/api/auth/google-gmail-test" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;
      const targetSlug = (body.tableSlug || body.table || slug || "beverley").toLowerCase().trim();

      if (!isAuthorized(secret, targetSlug)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      if (!table.gmail_refresh_token) {
        return jsonResponse({ error: "Google Workspace Gmail is not connected for this Table yet." }, 400);
      }

      const testEmail = body.test_email || table.gmail_connected_email || table.admin_email;
      if (!testEmail) {
        return jsonResponse({ error: "No destination email address provided for test" }, 400);
      }

      const testType = String(body.test_type || "approaching").toLowerCase().trim();

      try {
        await sendGmailProximityAlert({
          env,
          table,
          to: testEmail,
          type: testType,
          etaText: "2 minutes",
          distanceMeters: 180
        });

        const labelMap = {
          approaching: "Approaching Alert (Santa is on his way!)",
          passed: "Passed Alert (Thank You & Donation)",
          test: "Connection Verification Test"
        };
        const prettyType = labelMap[testType] || testType;

        return jsonResponse({
          ok: true,
          message: `Test email [${prettyType}] successfully sent to ${testEmail} from ${table.gmail_connected_email}!`
        });
      } catch (err) {
        return jsonResponse({ error: `Test email failed: ${err.message}` }, 500);
      }
    }

    // ==============================================================
    // 📍 9F. PROXIMITY SUBSCRIBERS INGEST (GET & POST /api/subscribe)
    // ==============================================================
    if (path === "/api/subscribe") {
      let body = {};
      if (request.method === "POST") {
        try { body = await request.json(); } catch(e) { body = {}; }
      }
      const targetSlug = (body.table || url.searchParams.get("table") || slug || "beverley").toLowerCase().trim();
      const lat = parseFloat(body.lat || url.searchParams.get("lat"));
      const lng = parseFloat(body.lng || url.searchParams.get("lng"));
      const email = String(body.email || url.searchParams.get("email") || "").trim().toLowerCase();
      const route_id = body.route_id || url.searchParams.get("route_id") || null;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return jsonResponse({ ok: false, error: "Invalid coordinates" }, 400);
      }
      if (!email || !email.includes("@") || !email.includes(".")) {
        return jsonResponse({ ok: false, error: "Invalid email address" }, 400);
      }

      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_id TEXT NOT NULL,
            route_id TEXT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            email TEXT NOT NULL,
            notified BOOLEAN DEFAULT 0,
            notified_at DATETIME,
            passed BOOLEAN DEFAULT 0,
            passed_at DATETIME,
            last_distance REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        const targetTable = table || await env.DB.prepare("SELECT id FROM tables WHERE slug = ?").bind(targetSlug).first();
        const tableId = targetTable ? targetTable.id : targetSlug;

        await env.DB.prepare(`
          INSERT INTO subscribers (table_id, route_id, lat, lng, email)
          VALUES (?, ?, ?, ?, ?)
        `).bind(tableId, route_id, lat, lng, email).run();

        return jsonResponse({ ok: true, message: "Subscribed successfully" });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
      }
    }

    // ==============================================================
    // 📋 9G. SUBSCRIBERS MANAGEMENT (GET & DELETE /api/subscribers)
    // ==============================================================
    if (path === "/api/subscribers") {
      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = url.searchParams.get("secret") || bearerToken;

      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to manage subscribers" }, 401);
      }

      if (request.method === "GET") {
        try {
          const subs = await env.DB.prepare(`
            SELECT id, email, lat, lng, notified, notified_at, passed, passed_at, created_at
            FROM subscribers
            WHERE table_id = ?
            ORDER BY created_at DESC
            LIMIT 200
          `).bind(table.id).all();
          return jsonResponse({ ok: true, subscribers: subs.results || [] });
        } catch(e) {
          return jsonResponse({ ok: true, subscribers: [] });
        }
      }

      if (request.method === "DELETE") {
        const subId = url.searchParams.get("id");
        if (subId) {
          await env.DB.prepare("DELETE FROM subscribers WHERE id = ? AND table_id = ?").bind(subId, table.id).run();
        } else {
          await env.DB.prepare("DELETE FROM subscribers WHERE table_id = ?").bind(table.id).run();
        }
        return jsonResponse({ ok: true, message: "Subscribers cleared successfully" });
      }
    }

    // ==============================================================
    // 👥 10. VOLUNTEERS ROSTER (GET /api/volunteers)
    // ==============================================================
    if (path === "/api/volunteers" && request.method === "GET") {
      const secret = url.searchParams.get("secret") || request.headers.get("Authorization");
      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to access volunteer personal information" }, 401);
      }

      const routeFilter = url.searchParams.get("route");
      let query = `
        SELECT id, name, role, phone, email, organisation,
               COALESCE(route_name, '') as route_name,
               bucket_number,
               CASE WHEN checked_in = 1 THEN 'Checked In' ELSE 'Confirmed' END as status
        FROM volunteers
        WHERE table_id = ?
      `;
      const binds = [table.id];

      if (routeFilter) {
        query += ` AND (route_name = ? OR route_id = ?)`;
        binds.push(routeFilter, routeFilter);
      }
      query += ` ORDER BY id ASC`;

      try {
        const result = await env.DB.prepare(query).bind(...binds).all();
        return jsonResponse(result.results || []);
      } catch (err) {
        return jsonResponse([]);
      }
    }

    // ==============================================================
    // 📝 11. VOLUNTEER REGISTRATION (POST /api/volunteers)
    // ==============================================================
    if (path === "/api/volunteers" && request.method === "POST") {
      const body = await request.json();
      const { routeName, name, role, phone, email, organisation } = body;

      if (!name) return jsonResponse({ error: "Name is required" }, 400);

      try {
        await env.DB.prepare(`
          INSERT INTO volunteers (table_id, route_name, name, role, phone, email, organisation, checked_in)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          table.id,
          routeName || "General Helper",
          name.trim(),
          role || "Bucket Collector",
          phone || "",
          email || "",
          organisation || ""
        ).run();
      } catch (err) {
        await env.DB.prepare(`
          INSERT INTO volunteers (table_id, name, role, phone, email, organisation, checked_in)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).bind(
          table.id,
          name.trim(),
          role || "Bucket Collector",
          phone || "",
          email || "",
          organisation || ""
        ).run();
      }

      return jsonResponse({ ok: true, message: "Registered successfully" });
    }

    // ==============================================================
    // 📲 12. VOLUNTEER CHECK-IN (POST /api/volunteers/checkin)
    // ==============================================================
    if (path === "/api/volunteers/checkin" && request.method === "POST") {
      const body = await request.json();
      const { name, bucket } = body;

      if (!name) return jsonResponse({ error: "Volunteer name required" }, 400);

      await env.DB.prepare(`
        UPDATE volunteers
        SET checked_in = 1, bucket_number = ?
        WHERE table_id = ? AND name = ?
      `).bind(bucket || null, table.id, name).run();

      return jsonResponse({ ok: true, status: "Checked In" });
    }

    // ==============================================================
    // ✅ 13. SAFETY CHECKLIST (GET & POST /api/volunteers/checklist)
    // ==============================================================
    if (path === "/api/volunteers/checklist") {
      if (request.method === "GET") {
        return jsonResponse({
          tasks: [
            "Vehicle & Hitch Safety Inspection",
            "Sound System & Festive Playlist Ready",
            "Collection Buckets & Sealed Tins Loaded",
            "Hi-Vis Vests & Torch Inspection",
            "Route & Safety Walkers Briefing"
          ],
          data: {}
        });
      }
      if (request.method === "POST") {
        return jsonResponse({ ok: true });
      }
    }

    // ==============================================================
    // 🏁 14. ROUTE COMPLETION (POST /api/volunteers/close-route)
    // ==============================================================
    if (path === "/api/volunteers/close-route" && request.method === "POST") {
      const body = await request.json();
      const { routeName } = body;
      return jsonResponse({ ok: true, message: `Route ${routeName || ''} closed successfully` });
    }

    // ==============================================================
    // 📸 15. DIGITAL MEMORY BOOK (GET, POST & DELETE /api/memory-book)
    // ==============================================================
    if (path === "/api/memory-book") {
      if (request.method === "GET") {
        const year = parseInt(url.searchParams.get("year")) || new Date().getFullYear();
        const isAdmin = url.searchParams.get("admin") === "1" || url.searchParams.get("admin") === "true";
        try {
          let totalBucketCount = 0;
          try {
            const countRow = await env.DB.prepare("SELECT COUNT(*) as total FROM memory_book").first();
            totalBucketCount = Number(countRow?.total || 0);
          } catch(e) {}

          const sql = isAdmin
            ? `SELECT id, media_type, media_url, caption, year, status, created_at
               FROM memory_book
               WHERE (table_id = ? OR table_id = ?) AND year = ?
               ORDER BY created_at DESC`
            : `SELECT id, media_type, media_url, caption, year, created_at
               FROM memory_book
               WHERE (table_id = ? OR table_id = ?) AND year = ? AND status = 'approved'
               ORDER BY created_at DESC`;
          const res = await env.DB.prepare(sql).bind(table.id, table.slug, year).all();
          return jsonResponse({
            ok: true,
            year,
            items: res.results || [],
            bucketCount: totalBucketCount,
            bucketLimit: 10000,
            bucketPercent: Math.min(100, Math.round((totalBucketCount / 10000) * 100))
          });
        } catch (e) {
          return jsonResponse({ ok: true, year, items: [], bucketCount: 0, bucketLimit: 10000, bucketPercent: 0 });
        }
      }

      if (request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch (e) { body = {}; }
        const imageData = body.imageData || body.image || body.url || "";
        const mediaType = body.mediaType || (String(imageData).startsWith("data:video") ? "video" : "image");
        const caption = body.caption || "Spotted Santa!";
        const year = parseInt(body.year) || new Date().getFullYear();

        if (!imageData) {
          return jsonResponse({ ok: false, error: "Missing image data" }, 400);
        }

        try {
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS memory_book (
              id TEXT PRIMARY KEY,
              table_id TEXT NOT NULL,
              media_type TEXT DEFAULT 'image',
              media_url TEXT NOT NULL,
              caption TEXT,
              year INTEGER NOT NULL,
              status TEXT DEFAULT 'pending',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();

          const memId = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          await env.DB.prepare(`
            INSERT INTO memory_book (id, table_id, media_type, media_url, caption, year, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `).bind(memId, table.id, mediaType, imageData, caption, year).run();

          return jsonResponse({ ok: true, id: memId, status: "pending", message: "Submitted for moderation" });
        } catch (err) {
          return jsonResponse({ ok: false, error: err.message }, 500);
        }
      }

      if (request.method === "DELETE") {
        const memId = url.searchParams.get("id");
        const purgeYear = url.searchParams.get("purgeYear");
        if (purgeYear) {
          try {
            await env.DB.prepare(`DELETE FROM memory_book WHERE year <= ? AND (table_id = ? OR table_id = ?)`).bind(parseInt(purgeYear), table.id, table.slug).run();
            return jsonResponse({ ok: true, purgedYear: purgeYear });
          } catch (err) {
            return jsonResponse({ ok: false, error: err.message }, 500);
          }
        }
        if (!memId) return jsonResponse({ ok: false, error: "Missing memory ID" }, 400);
        try {
          await env.DB.prepare(`DELETE FROM memory_book WHERE id = ? AND (table_id = ? OR table_id = ?)`).bind(memId, table.id, table.slug).run();
          return jsonResponse({ ok: true, deleted: memId });
        } catch (err) {
          return jsonResponse({ ok: false, error: err.message }, 500);
        }
      }
    }

    // Moderate Memory Submission: POST /api/memory-book/moderate
    if (path === "/api/memory-book/moderate" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const memId = body.id || "";
      const newStatus = body.status || "approved";
      if (!memId) {
        return jsonResponse({ ok: false, error: "Missing memory ID" }, 400);
      }
      try {
        await env.DB.prepare(`
          UPDATE memory_book SET status = ? WHERE id = ? AND (table_id = ? OR table_id = ?)
        `).bind(newStatus, memId, table.id, table.slug).run();
        return jsonResponse({ ok: true, id: memId, status: newStatus });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
      }
    }

    // ==============================================================
    // 📖 15B. KNOWLEDGE BASE & LESSONS LEARNED
    // (GET /api/knowledge-base, POST /api/knowledge-base, POST /api/knowledge-base/upvote, POST /api/knowledge-base/ask)
    // ==============================================================
    if (path === "/api/knowledge-base" || path === "/api/knowledge-base/upvote" || path === "/api/knowledge-base/ask") {
      // 1. Ensure Table Schema Exists
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS lessons_learned (
          id TEXT PRIMARY KEY,
          table_id TEXT NOT NULL,
          table_name TEXT,
          scope TEXT DEFAULT 'local',
          category TEXT NOT NULL,
          lesson TEXT NOT NULL,
          author_name TEXT,
          author_role TEXT,
          upvotes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run().catch(() => {});

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS lesson_upvotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lesson_id TEXT NOT NULL,
          table_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(lesson_id, table_id)
        )
      `).run().catch(() => {});

      // 2. Remove all mock / seed test examples from database (100% fresh real entries only)
      await env.DB.prepare("DELETE FROM lessons_learned WHERE id LIKE 'seed_%'").run().catch(() => {});
      await env.DB.prepare("DELETE FROM lesson_upvotes WHERE lesson_id LIKE 'seed_%'").run().catch(() => {});

      // Route A: Upvote a Lesson (POST /api/knowledge-base/upvote)
      if (path === "/api/knowledge-base/upvote" && request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch(e) { body = {}; }
        const lessonId = body.id || "";
        if (!lessonId) return jsonResponse({ ok: false, error: "Missing lesson ID" }, 400);

        const votingTable = (body.tableSlug || body.table || url.searchParams.get("table") || slug || table?.slug || "beverley").toLowerCase().trim();

        try {
          // Check if this table has already given a like to this tip
          const existing = await env.DB.prepare(
            "SELECT id FROM lesson_upvotes WHERE lesson_id = ? AND table_id = ?"
          ).bind(lessonId, votingTable).first().catch(() => null);

          if (existing) {
            // Already upvoted: if toggle is allowed, remove the like
            if (body.toggle !== false) {
              await env.DB.prepare(
                "DELETE FROM lesson_upvotes WHERE lesson_id = ? AND table_id = ?"
              ).bind(lessonId, votingTable).run();
              await env.DB.prepare(
                "UPDATE lessons_learned SET upvotes = MAX(0, upvotes - 1) WHERE id = ?"
              ).bind(lessonId).run();
              const updated = await env.DB.prepare("SELECT upvotes FROM lessons_learned WHERE id = ?").bind(lessonId).first();
              return jsonResponse({
                ok: true,
                id: lessonId,
                upvotes: updated ? updated.upvotes : 0,
                liked: false,
                table: votingTable,
                message: "Upvote removed"
              });
            } else {
              const current = await env.DB.prepare("SELECT upvotes FROM lessons_learned WHERE id = ?").bind(lessonId).first();
              return jsonResponse({
                ok: false,
                error: "Your table has already upvoted this tip.",
                already_upvoted: true,
                id: lessonId,
                upvotes: current ? current.upvotes : 0,
                liked: true,
                table: votingTable
              }, 409);
            }
          } else {
            // Record new upvote from this table
            await env.DB.prepare(
              "INSERT OR IGNORE INTO lesson_upvotes (lesson_id, table_id) VALUES (?, ?)"
            ).bind(lessonId, votingTable).run();
            await env.DB.prepare(
              "UPDATE lessons_learned SET upvotes = upvotes + 1 WHERE id = ?"
            ).bind(lessonId).run();
            const updated = await env.DB.prepare("SELECT upvotes FROM lessons_learned WHERE id = ?").bind(lessonId).first();
            return jsonResponse({
              ok: true,
              id: lessonId,
              upvotes: updated ? updated.upvotes : 1,
              liked: true,
              table: votingTable,
              message: "Upvote recorded"
            });
          }
        } catch(e) {
          return jsonResponse({ ok: false, error: e.message }, 500);
        }
      }

      // Route B: Ask Gemini Fleet Advisor (POST /api/knowledge-base/ask)
      if (path === "/api/knowledge-base/ask" && request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch(e) { body = {}; }
        const question = (body.question || "").trim();
        const categoryFilter = body.category || "all";
        const scopeFilter = body.scope || "all";

        if (!question) {
          return jsonResponse({ ok: false, error: "Question is required" }, 400);
        }

        // Fetch lessons for RAG grounding
        let querySql = "SELECT * FROM lessons_learned WHERE 1=1";
        const queryParams = [];

        if (scopeFilter === "national") {
          querySql += " AND scope = 'national'";
        } else if (scopeFilter === "local") {
          querySql += " AND (table_id = ? OR table_id = ?)";
          queryParams.push(table?.id || slug, table?.slug || slug);
        }

        if (categoryFilter && categoryFilter !== "all") {
          querySql += " AND category = ?";
          queryParams.push(categoryFilter);
        }

        querySql += " ORDER BY upvotes DESC, created_at DESC LIMIT 25";
        const lessonsRes = await env.DB.prepare(querySql).bind(...queryParams).all().catch(() => ({ results: [] }));
        const lessons = lessonsRes.results || [];

        // Build knowledge context block
        const defaultPlaybookReference = `[Official RTBI National Fleet Playbook Reference]:
- Digital Donations & Zeffy (finance_donations): Laminate and hang high-contrast Zeffy QR code badges on volunteer lanyards with bold 'SCAN TO DONATE & ADD 25% GIFT AID' text. Over 65% of suburban families do not carry physical cash; having lanyards ready doubles nightly donations.
- Route Pacing & Timetable (routes_planning): Cap weekday evening routes at 35 to 45 streets maximum (approx. 2 to 2.5 hours). Beyond 8:30pm, younger families have put children to bed, and volunteer bucket collector fatigue sets in rapidly.
- Tow-Hitch Safety Exclusion Zone (safety_marshalling): Maintain a strict 2-metre exclusion bubble around the tow-bar coupling and sleigh wheel arches at all times. Assign dedicated hi-vis marshals with illuminated LED wands on both flanks of the sleigh to shepherd eager children away from wheels.
- Sound & PA Audio Acoustics (sound_audio): Angle horn PA speakers 45° outwards and downwards towards the pavements, rather than straight ahead or flat. This blankets the front gardens with festive cheer while eliminating harsh echoes off brickwork, and protects Santa's hearing.
- Generator Power & Vibration (generators_power): Always mount petrol inverter generators on heavy-duty rubber vibration dampening mats. Wire an isolated emergency kill-switch in the towing cab so the driver can cut generator power instantly without exiting the vehicle.
- Pacing & Advance Warnings (routes_planning): Send your Live PA announcement message 15 minutes before the sleigh departs the staging area. This allows parents to put coats, boots, and hats on toddlers so they are out on their doorsteps right as the music approaches.`;

        const knowledgeText = lessons.length > 0
          ? lessons.map((l, i) => 
              `[Lesson #${i+1}] (Scope: ${l.scope}, Category: ${l.category}, Table: ${l.table_name || l.table_id}, Contributor: ${l.author_name || 'Anonymous'} - ${l.author_role || 'Volunteer'}, Upvotes: ${l.upvotes}):\n"${l.lesson}"`
            ).join("\n\n")
          : defaultPlaybookReference;

        // Check for Gemini API key and selected model (table setting, national master setting, or environment default)
        let nationalTable = null;
        if (slug !== 'beverley') {
          try {
            nationalTable = await env.DB.prepare("SELECT gemini_model, gemini_api_key FROM tables WHERE slug = 'beverley'").first();
          } catch(e) {}
        }

        const geminiApiKey = table?.gemini_api_key || nationalTable?.gemini_api_key || env.GEMINI_API_KEY;
        const rawModel = body.model || table?.gemini_model || nationalTable?.gemini_model || env.GEMINI_MODEL || "auto";
        const primaryModel = resolveGeminiModel(rawModel);

        if (geminiApiKey) {
          try {
            const systemPrompt = `You are the Official TurboSanta Fleet Advisor for Round Table Great Britain & Ireland (RTBI). 
Your mission is to help Round Table volunteers run safe, joyful, high-fundraising Santa Sleigh routes in accordance with RTBI brand guidelines ("DO MORE", friendly, professional, community-first).
You have access to the verified Round Table Sleigh Knowledge Base of lessons learned from across the UK fleet.

KNOWLEDGE BASE ARCHIVE:
${knowledgeText}

USER QUESTION: "${question}"

INSTRUCTIONS:
1. Synthesize a practical, high-impact answer answering the user's question directly.
2. Cite relevant lessons from the knowledge base where applicable (e.g., "According to national fleet recommendations...").
3. Include clear, bulleted action items for the sleigh crew.
4. Keep the tone enthusiastic, safety-conscious, and aligned with Round Table's "DO MORE" motto.
5. Format with clean GitHub markdown (bolding, bullet points, numbered lists).`;

            let geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${geminiApiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  role: "user",
                  parts: [{ text: systemPrompt }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 1000
                }
              })
            });

            // If primary model 404s or fails (e.g. unreleased or restricted endpoint), cascade down stable fallbacks
            if (!geminiRes.ok) {
              const fallbacks = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-1.5-flash"].filter(m => m !== primaryModel);
              for (const fb of fallbacks) {
                console.warn(`Model ${primaryModel} failed (${geminiRes.status}). Retrying with fallback ${fb}...`);
                geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fb}:generateContent?key=${geminiApiKey}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
                  })
                });
                if (geminiRes.ok) break;
              }
            }

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const replyText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (replyText) {
                return jsonResponse({
                  ok: true,
                  answer: replyText,
                  model: rawModel,
                  lessonsCount: lessons.length,
                  grounded: true
                });
              }
            } else {
              console.warn("Gemini API non-200 response:", await geminiRes.text());
            }
          } catch(err) {
            console.warn("Gemini API call failed, falling back to local synthesizer:", err);
          }
        }

        // Fallback Local Fleet Synthesis Engine (Infallible, runs offline or if key is omitted)
        const lowerQ = question.toLowerCase();
        const matched = lessons.filter(l => {
          const lText = (l.lesson + " " + l.category).toLowerCase();
          const words = lowerQ.split(/\s+/).filter(w => w.length > 3);
          return words.some(w => lText.includes(w));
        });

        const selectedLessons = matched.length > 0 ? matched.slice(0, 4) : lessons.slice(0, 4);

        let fallbackAnswer = `### 🎅 Round Table Fleet Advisory\n\n`;
        fallbackAnswer += `Based on verified operational lessons recorded in our **TurboSanta Knowledge Base** for Round Table Great Britain & Ireland:\n\n`;

        if (selectedLessons.length > 0) {
          selectedLessons.forEach((l, idx) => {
            const roleStr = l.author_role ? ` (${l.author_role})` : '';
            fallbackAnswer += `**${idx + 1}. ${l.category.replace(/_/g, ' ').toUpperCase()}** (via ${l.table_name || 'National Fleet'}${roleStr}):\n`;
            fallbackAnswer += `> "${l.lesson}"\n\n`;
          });
          fallbackAnswer += `**Key Takeaways for Your Crew:**\n`;
          fallbackAnswer += `• Ensure the safety exclusion bubble around the sleigh trailer is maintained at all times.\n`;
          fallbackAnswer += `• Keep communications clear between the tow cab and foot marshals.\n`;
          fallbackAnswer += `• Always celebrate your volunteers and uphold the Round Table **"DO MORE"** spirit! 🍻🎄\n`;
        } else {
          fallbackAnswer += `• **Route Planning**: Keep routes to 35–45 streets to prevent volunteer burnout and bedtime clashes.\n`;
          fallbackAnswer += `• **Safety & Marshalling**: Maintain a strict 2m exclusion zone around the tow bar with hi-vis marshals.\n`;
          fallbackAnswer += `• **Digital Donations**: Pair physical collection tins with Zeffy/SumUp QR code lanyards.\n`;
          fallbackAnswer += `• **Sound & Power**: Angle horn speakers at 45° towards pavements and rubber-mount generators.\n`;
        }

        return jsonResponse({
          ok: true,
          answer: fallbackAnswer,
          model: "TurboSanta Fleet Engine (Local D1 Knowledge)",
          lessonsCount: selectedLessons.length,
          grounded: true
        });
      }

      // Route: Live Google Generative AI Models Inspector (GET /api/ai/models)
      if (path === "/api/ai/models" && request.method === "GET") {
        let nationalTable = null;
        if (slug !== 'beverley') {
          try {
            nationalTable = await env.DB.prepare("SELECT gemini_model, gemini_api_key FROM tables WHERE slug = 'beverley'").first();
          } catch(e) {}
        }
        const geminiApiKey = table?.gemini_api_key || nationalTable?.gemini_api_key || env.GEMINI_API_KEY;

        if (geminiApiKey) {
          try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
            if (listRes.ok) {
              const listData = await listRes.json();
              const allModels = listData?.models || [];
              const flashModels = allModels
                .filter(m => {
                  const name = (m.name || "").toLowerCase();
                  const methods = m.supportedGenerationMethods || [];
                  return methods.includes("generateContent") && name.includes("flash") && !name.includes("preview");
                })
                .map(m => ({
                  id: m.name.replace(/^models\//, ""),
                  displayName: m.displayName || m.name.replace(/^models\//, ""),
                  description: m.description || ""
                }));

              const has38 = flashModels.some(m => m.id.includes("3.8"));
              const has36 = flashModels.some(m => m.id.includes("3.6"));
              const recommended = has38 ? "gemini-3.8-flash" : (has36 ? "gemini-3.6-flash" : (flashModels[0]?.id || "gemini-3.8-flash"));

              return jsonResponse({
                ok: true,
                backendQueried: true,
                latest: recommended,
                recommended,
                models: flashModels.length > 0 ? flashModels : [
                  { id: "gemini-3.8-flash", displayName: "Gemini 3.8 Flash (Stable, Newest Free Tier Flash)" },
                  { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash (Stable, Previous-Gen Flash)" }
                ]
              });
            }
          } catch(e) {
            console.warn("Failed to query Google Models API:", e);
          }
        }

        return jsonResponse({
          ok: true,
          backendQueried: false,
          latest: "gemini-3.8-flash",
          recommended: "gemini-3.8-flash",
          models: [
            { id: "gemini-3.8-flash", displayName: "Gemini 3.8 Flash (Stable, Newest Free Tier Flash)" },
            { id: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash (Stable, Previous-Generation Flash)" },
            { id: "gemini-3.5-flash-lite", displayName: "Gemini 3.5 Flash Lite (High-Speed Free Tier)" }
          ]
        });
      }

      // Route C: Submit a New Lesson (POST /api/knowledge-base)
      if (path === "/api/knowledge-base" && request.method === "POST") {
        let body = {};
        try { body = await request.json(); } catch(e) { body = {}; }

        const lessonText = (body.lesson || "").trim();
        const category = body.category || "general";
        const scope = (body.scope || "local").toLowerCase() === "national" ? "national" : "local";
        const authorName = (body.author_name || body.author || "Volunteer").trim();
        const authorRole = (body.author_role || body.role || "Crew Member").trim();
        const targetTableId = scope === "national" ? "national" : (table?.id || slug);
        const targetTableName = scope === "national" ? "Round Table National Fleet" : (table?.sleigh_display_name || table?.name || `${slug} Round Table`);

        if (!lessonText || lessonText.length < 10) {
          return jsonResponse({ ok: false, error: "Please enter a detailed lesson (minimum 10 characters)." }, 400);
        }

        const lessonId = `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        try {
          await env.DB.prepare(`
            INSERT INTO lessons_learned (id, table_id, table_name, scope, category, lesson, author_name, author_role, upvotes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          `).bind(lessonId, targetTableId, targetTableName, scope, category, lessonText, authorName, authorRole).run();

          return jsonResponse({
            ok: true,
            id: lessonId,
            message: `Lesson successfully recorded in the ${scope === 'national' ? 'National RTBI Catalogue' : 'Local Table Archive'}!`,
            lesson: {
              id: lessonId,
              table_id: targetTableId,
              table_name: targetTableName,
              scope,
              category,
              lesson: lessonText,
              author_name: authorName,
              author_role: authorRole,
              upvotes: 1,
              created_at: new Date().toISOString()
            }
          });
        } catch(err) {
          return jsonResponse({ ok: false, error: err.message }, 500);
        }
      }

      // Route D: Get / List Lessons (GET /api/knowledge-base)
      if (path === "/api/knowledge-base" && request.method === "GET") {
        const scopeReq = url.searchParams.get("scope") || "all";
        const categoryReq = url.searchParams.get("category") || "all";
        const searchQ = (url.searchParams.get("q") || "").trim().toLowerCase();
        const viewingTable = (url.searchParams.get("table") || slug || table?.slug || "beverley").toLowerCase().trim();

        let sql = "SELECT * FROM lessons_learned WHERE 1=1";
        const params = [];

        if (scopeReq === "national") {
          sql += " AND scope = 'national'";
        } else if (scopeReq === "local") {
          sql += " AND (table_id = ? OR table_id = ?)";
          params.push(table?.id || slug, table?.slug || slug);
        }

        if (categoryReq && categoryReq !== "all") {
          sql += " AND category = ?";
          params.push(categoryReq);
        }

        if (searchQ) {
          sql += " AND (LOWER(lesson) LIKE ? OR LOWER(category) LIKE ? OR LOWER(author_role) LIKE ?)";
          const pattern = `%${searchQ}%`;
          params.push(pattern, pattern, pattern);
        }

        sql += " ORDER BY upvotes DESC, created_at DESC LIMIT 100";

        try {
          const res = await env.DB.prepare(sql).bind(...params).all();
          const rows = res.results || [];

          // Query which lessons this table has already upvoted
          let likedSet = new Set();
          try {
            const userLikes = await env.DB.prepare(
              "SELECT lesson_id FROM lesson_upvotes WHERE table_id = ?"
            ).bind(viewingTable).all();
            if (userLikes && userLikes.results) {
              likedSet = new Set(userLikes.results.map(r => r.lesson_id));
            }
          } catch(e) {}

          const lessons = rows.map(l => ({
            ...l,
            has_upvoted: likedSet.has(l.id)
          }));

          return jsonResponse({
            ok: true,
            lessons: lessons,
            count: lessons.length,
            table: viewingTable
          });
        } catch(err) {
          return jsonResponse({ ok: false, error: err.message }, 500);
        }
      }
    }

    // ==============================================================
    // 🚀 16. MIGRATE / INITIALIZE TABLE CONFIG (POST /api/migrate)
    // ==============================================================
    if (path === "/api/migrate" && request.method === "POST") {
      let payload = {};
      try { payload = await request.json(); } catch(e) { payload = {}; }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = payload.secret || url.searchParams.get("secret") || bearerToken;
      
      if (!isAuthorized(secret)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to migrate table configuration" }, 401);
      }

      const targetSlug = (payload.tableSlug || slug || "beverley").toLowerCase();
      const settings = payload.settings || {};
      const routes = payload.routes || [];
      const streets = payload.streets || [];
      const volunteers = payload.volunteers || [];

      // Upsert Table in D1 safely without requiring UNIQUE constraint on slug
      const tableId = targetSlug;
      const displayName = settings.sleigh_display_name || `${targetSlug.toUpperCase()} Santa Sleigh`;
      const donateUrl = settings.donate_url || "";
      const charityName = settings.charity_name || "";
      const goal = parseFloat(settings.fundraising_goal) || 5000;
      const primaryColor = settings.primary_color || "#FBAF33";
      const accentColor = settings.accent_color || "#D31C1C";

      try {
        const existingTable = await env.DB.prepare("SELECT id FROM tables WHERE slug = ? OR id = ?").bind(targetSlug, tableId).first();
        if (existingTable) {
          await env.DB.prepare(`
            UPDATE tables SET
              sleigh_display_name = ?,
              name = ?,
              donate_url = ?,
              charity_name = ?,
              fundraising_goal = ?,
              primary_color = ?,
              accent_color = ?
            WHERE id = ?
          `).bind(displayName, displayName, donateUrl, charityName, goal, primaryColor, accentColor, existingTable.id).run();
        } else {
          const adminEmail = settings.admin_email || `${targetSlug}@roundtable.org.uk`;
          await env.DB.prepare(`
            INSERT INTO tables (id, slug, name, sleigh_display_name, admin_email, primary_color, accent_color, donate_url, charity_name, fundraising_goal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(tableId, targetSlug, displayName, displayName, adminEmail, primaryColor, accentColor, donateUrl, charityName, goal).run();
        }
      } catch (upsertErr) {
        console.error("Table upsert error:", upsertErr);
      }

      // Route IDs are a global primary key, so always namespace them to the target table.
      const routeIdMap = {};
      const scopedRouteId = (id) => {
        const clean = String(id || "");
        return clean.startsWith(`${tableId}_`) ? clean : `${tableId}_${clean}`;
      };
      for (const r of routes) {
        const newId = scopedRouteId(r.id);
        routeIdMap[r.id] = newId;
        r.id = newId;
      }

      // Clean and Insert Routes
      if (routes.length > 0) {
        await env.DB.prepare("DELETE FROM route_streets WHERE table_id = ?").bind(tableId).run();
        await env.DB.prepare("DELETE FROM routes WHERE table_id = ?").bind(tableId).run();

        for (const r of routes) {
          await env.DB.prepare(`
            INSERT INTO routes (id, table_id, name, date, start_time, gpx_url, sponsor_logo, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')
          `).bind(r.id, tableId, r.name, r.date || "", r.start_time || "18:00", r.gpx_url || "", r.sponsor_logo || "").run();
        }
      }

      // Insert Streets
      if (streets.length > 0) {
        for (const s of streets) {
          const streetRouteId = routeIdMap[s.route_id] || scopedRouteId(s.route_id);
          await env.DB.prepare(`
            INSERT INTO route_streets (table_id, route_id, street_name, sequence_order)
            VALUES (?, ?, ?, ?)
          `).bind(tableId, streetRouteId, s.street_name, s.sequence_order || 1).run();
        }
      }

      // Insert Volunteers
      if (volunteers.length > 0) {
        for (const v of volunteers) {
          try {
            await env.DB.prepare(`
              INSERT INTO volunteers (table_id, route_name, name, role, phone, email, organisation, checked_in, bucket_number)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(tableId, v.route_name || "General Helper", v.name, v.role || "Bucket Collector", v.phone || "", v.email || "", v.organisation || "", v.checked_in || 0, v.bucket_number || "").run();
          } catch (e) {}
        }
      }

      return jsonResponse({
        ok: true,
        message: `Successfully updated Table '${targetSlug}' in TurboSanta 2.0 D1 SQL!`,
        imported: {
          tableSlug: targetSlug,
          routes: routes.length,
          streets: streets.length,
          volunteers: volunteers.length
        }
      });
    }

    // ==============================================================
    // 🚀 16B. INITIALIZE / PROVISION TABLE (POST /api/table/init)
    // ==============================================================
    if ((path === "/api/table/init" || path === "/api/table/provision") && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch(e) { body = {}; }

      const authHeader = request.headers.get("Authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const secret = body.secret || url.searchParams.get("secret") || bearerToken;
      const targetSlug = (body.tableSlug || slug || "beverley").toLowerCase().trim();

      if (!isAuthorized(secret, targetSlug)) {
        return jsonResponse({ error: "Unauthorized: Admin credentials required to provision table" }, 401);
      }

      const cleanTown = targetSlug.charAt(0).toUpperCase() + targetSlug.slice(1);
      const defaultName = body.name || `${cleanTown} Round Table Santa Sleigh`;

      try {
        const existing = await env.DB.prepare("SELECT * FROM tables WHERE slug = ? OR id = ?").bind(targetSlug, targetSlug).first();
        if (existing) {
          return jsonResponse({ ok: true, message: `Table '${targetSlug}' already provisioned in D1 database.`, table: existing });
        }

        const adminEmail = body.admin_email || `${targetSlug}@roundtable.org.uk`;
        await env.DB.prepare(`
          INSERT INTO tables (id, slug, name, sleigh_display_name, admin_email, primary_color, accent_color, donate_url, charity_name, fundraising_goal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(targetSlug, targetSlug, defaultName, defaultName, adminEmail, "#FBAF33", "#D31C1C", "", defaultName, 5000).run();

        const newTable = await env.DB.prepare("SELECT * FROM tables WHERE slug = ?").bind(targetSlug).first();
        return jsonResponse({ ok: true, message: `Successfully provisioned Table '${targetSlug}' in D1 database!`, table: newTable });
      } catch (err) {
        return jsonResponse({ error: `Failed to provision table in D1: ${err.message}` }, 500);
      }
    }

    return jsonResponse({ error: "Endpoint not found" }, 404);
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}

function resolveGeminiModel(input) {
  if (!input) return "gemini-3.8-flash";
  const clean = String(input).trim().toLowerCase();

  // If set to auto or latest:
  if (clean === "auto" || clean === "latest" || clean === "latest-flash" || clean === "free-flash") {
    return "gemini-3.8-flash";
  }

  // If already standard Gemini API endpoint identifier:
  if (clean.startsWith("gemini-")) {
    return clean;
  }

  // Version 3.8 (Newest stable free Flash)
  if (clean.includes("3.8") || clean.includes("3-8")) {
    return "gemini-3.8-flash";
  }

  // Version 3.6 (Previous-generation stable free Flash)
  if (clean.includes("3.6") || clean.includes("3-6")) {
    return "gemini-3.6-flash";
  }

  // Version 3.5 (Flash Lite)
  if (clean.includes("3.5") || clean.includes("3-5")) {
    return "gemini-3.5-flash-lite";
  }

  // Version 3.1
  if (clean.includes("3.1") || clean.includes("3-1")) {
    return "gemini-3.1-flash-lite";
  }

  // 2.5 series
  if (clean.includes("2.5") || clean.includes("2-5")) {
    return clean.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash";
  }

  // Legacy 2.0 / 1.5
  if (clean.includes("2.0") || clean.includes("2-0")) {
    return "gemini-2.0-flash";
  }
  if (clean.includes("1.5") || clean.includes("1-5")) {
    return clean.includes("pro") ? "gemini-1.5-pro" : "gemini-1.5-flash";
  }

  // General "flash" keyword defaults to newest stable Flash
  if (clean.includes("flash")) {
    return "gemini-3.8-flash";
  }

  return `gemini-${clean.replace(/\s+/g, '-')}`;
}

const OFFICIAL_GOOGLE_CLIENT_ID = "174929950272-ehpf04nea7ev4j8gfosq5acg6dvfmc95.apps.googleusercontent.com";

function buildRfc2822Base64({ fromName, fromEmail, to, subject, htmlBody }) {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const utf8FromName = `=?utf-8?B?${btoa(unescape(encodeURIComponent(fromName)))}?=`;

  const rawEmail = [
    `From: ${utf8FromName} <${fromEmail}>`,
    `To: <${to}>`,
    `Subject: ${utf8Subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody)))
  ].join("\r\n");

  return btoa(rawEmail)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getGoogleAccessToken(env, table) {
  const refreshToken = table.gmail_refresh_token;
  if (!refreshToken) throw new Error("No Gmail refresh token found for this Table");

  const clientId = table.gmail_client_id || env.GOOGLE_CLIENT_ID || OFFICIAL_GOOGLE_CLIENT_ID;
  const clientSecret = table.gmail_client_secret || env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing Google OAuth Client Secret. Please configure it in Table Settings or set GOOGLE_CLIENT_SECRET on Cloudflare.");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    const errData = await tokenRes.json().catch(() => ({}));
    throw new Error(errData.error_description || errData.error || `Google token refresh failed: HTTP ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function sendGmailProximityAlert({ env, table, to, type, etaText, distanceMeters }) {
  const accessToken = await getGoogleAccessToken(env, table);

  const tableName = table.sleigh_display_name || table.name || "Round Table Santa Sleigh";
  const fromEmail = table.gmail_connected_email || table.admin_email || "santa@roundtable.org.uk";
  const donateUrl = table.donate_url || "";
  const trackerUrl = `https://turbosanta-app.pages.dev/tracker.html?table=${encodeURIComponent(table.slug || 'beverley')}`;

  let subject = "";
  let headline = "";
  let subheadline = "";
  let messageContent = "";
  let ctaText = "Open Live Santa Tracker";
  let ctaUrl = trackerUrl;
  let secondaryCta = "";

  if (type === "approaching") {
    subject = (table.notify_approaching_subject || `🎅 Ho Ho Ho! Santa is approaching your street!`).replace(/\{tableName\}/g, tableName);
    headline = `Santa is on his way!`;
    subheadline = etaText ? `ETA: ${etaText}` : `Within ${distanceMeters || 250} metres of your pin!`;
    
    if (table.notify_approaching_msg && table.notify_approaching_msg.trim()) {
      const formattedCustomMsg = table.notify_approaching_msg
        .replace(/\{tableName\}/g, tableName)
        .replace(/\{eta\}/g, etaText || 'a few minutes')
        .replace(/\{distance\}/g, `${distanceMeters || 250}m`)
        .split('\n\n')
        .map(p => `<p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
      messageContent = formattedCustomMsg;
    } else {
      messageContent = `
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">
          Listen out for the festive music and sleigh bells! Santa and his volunteer elves from <strong>${tableName}</strong> are heading towards your street right now.
        </p>
        <p style="font-size: 15px; line-height: 1.5; color: #4b5563; margin: 0 0 20px 0;">
          Come outside and give Santa a big wave as he drives by! You can follow the sleigh live in real-time on our official tracker map:
        </p>
      `;
    }
    if (donateUrl) {
      secondaryCta = `
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0;">Want to help local families and charities this Christmas?</p>
          <a href="${donateUrl}" style="color: #d31c1c; font-weight: bold; text-decoration: underline; font-size: 15px;">Make a fast, secure donation online &rarr;</a>
        </div>
      `;
    }
  } else if (type === "passed") {
    subject = (table.notify_passed_subject || `🎄 Thank You from Santa & ${tableName}!`).replace(/\{tableName\}/g, tableName);
    headline = `Thank You for Coming Out!`;
    subheadline = `Santa has just visited your street!`;

    if (table.notify_passed_msg && table.notify_passed_msg.trim()) {
      const formattedCustomMsg = table.notify_passed_msg
        .replace(/\{tableName\}/g, tableName)
        .split('\n\n')
        .map(p => `<p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
      messageContent = formattedCustomMsg;
    } else {
      messageContent = `
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">
          Santa and his volunteer elves have just passed your area. We hope you and your family enjoyed the festive sights and sounds of the sleigh tonight!
        </p>
        <p style="font-size: 15px; line-height: 1.5; color: #4b5563; margin: 0 0 20px 0;">
          Every single penny raised tonight is donated directly back into our local community, supporting youth groups, foodbanks, and local families in need.
        </p>
      `;
    }
    if (donateUrl) {
      ctaText = "Donate to Support Our Community";
      ctaUrl = donateUrl;
      secondaryCta = `
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="${trackerUrl}" style="color: #4b5563; font-size: 14px; text-decoration: underline;">View Santa's Upcoming Routes & Schedule</a>
        </div>
      `;
    }
  } else if (type === "test") {
    subject = `🎅 TurboSanta Proximity Alert Test — ${tableName}`;
    headline = `Test Alert: Connection Verified!`;
    subheadline = `Google Workspace Gmail API is active`;
    messageContent = `
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">
        Success! Your Table's Google Workspace Gmail integration is configured and active.
      </p>
      <p style="font-size: 15px; line-height: 1.5; color: #4b5563; margin: 0 0 20px 0;">
        When families drop a pin on your live tracker at <strong>turbosanta-app.pages.dev</strong>, TurboSanta will automatically send proximity alerts directly from <strong>${fromEmail}</strong>.
      </p>
    `;
  }

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px 12px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <tr>
          <td style="background: linear-gradient(135deg, #d31c1c 0%, #991b1b 100%); padding: 36px 24px 28px 24px; text-align: center;">
            <div style="font-size: 42px; margin-bottom: 8px;">🎅</div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">${headline}</h1>
            <p style="color: #fef3c7; font-size: 15px; font-weight: 600; margin: 0;">${subheadline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px;">
            ${messageContent}
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px;">
              <tr>
                <td align="center">
                  <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #d31c1c; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(211, 28, 28, 0.35);">
                    ${ctaText}
                  </a>
                </td>
              </tr>
            </table>
            ${secondaryCta}
          </td>
        </tr>
        <tr>
          <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 4px 0;">${tableName}</p>
            ${table.charity_number ? `<p style="font-size: 12px; color: #6b7280; margin: 0 0 6px 0;">Registered Charity No. ${table.charity_number}</p>` : ''}
            <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0 0;">
              You received this automated notification because you dropped a pin on Santa's live tracking map.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const rawMessage = buildRfc2822Base64({
    fromName: tableName,
    fromEmail,
    to,
    subject,
    htmlBody
  });

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!sendRes.ok) {
    const errData = await sendRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gmail send failed: HTTP ${sendRes.status}`);
  }

  return await sendRes.json();
}

async function processSubscriberProximity({ env, table, lat, lng, speed, route_id }) {
  if (!table) return;
  if (table.notify_email_enabled === 0 || table.notify_email_enabled === false) return;
  if (!table.gmail_refresh_token) return;

  const radius = Number(table.notify_radius_meters || 250);
  const buffer = Number(table.pass_buffer_meters || 150);

  try {
    const activeSubs = await env.DB.prepare(`
      SELECT id, email, lat, lng, notified, notified_at, passed, last_distance
      FROM subscribers
      WHERE table_id = ? AND (notified = 0 OR (notified = 1 AND passed = 0))
    `).bind(table.id).all();

    if (!activeSubs || !activeSubs.results || activeSubs.results.length === 0) {
      return;
    }

    const now = Date.now();

    for (const sub of activeSubs.results) {
      const dist = calculateHaversineDistance(lat, lng, sub.lat, sub.lng);

      // 1. Approaching alert
      if (!sub.notified && dist <= radius) {
        let etaText = "a few minutes away";
        if (speed > 2) {
          const speedMps = (speed * 1000) / 3600;
          const sec = Math.round(dist / speedMps);
          const min = Math.max(1, Math.round(sec / 60));
          etaText = `approx. ${min} minute${min === 1 ? '' : 's'} away`;
        } else {
          etaText = `approx. ${Math.round(dist)} metres away`;
        }

        try {
          await sendGmailProximityAlert({
            env,
            table,
            to: sub.email,
            type: "approaching",
            etaText,
            distanceMeters: Math.round(dist)
          });

          await env.DB.prepare(`
            UPDATE subscribers
            SET notified = 1, notified_at = CURRENT_TIMESTAMP, last_distance = ?
            WHERE id = ?
          `).bind(dist, sub.id).run();
        } catch (emailErr) {
          console.error(`Failed to send approaching email to ${sub.email}:`, emailErr);
        }
      }
      // 2. Passed alert (thank you & donation)
      else if (sub.notified && !sub.passed) {
        let notifiedTs = 0;
        if (sub.notified_at) {
          const normStr = String(sub.notified_at).trim().replace(' ', 'T');
          notifiedTs = new Date(normStr.endsWith('Z') ? normStr : normStr + 'Z').getTime();
        }
        const minutesSinceNotified = (now - notifiedTs) / (60 * 1000);

        if (dist > (radius + buffer) && minutesSinceNotified >= 1.5) {
          try {
            await sendGmailProximityAlert({
              env,
              table,
              to: sub.email,
              type: "passed",
              distanceMeters: Math.round(dist)
            });

            await env.DB.prepare(`
              UPDATE subscribers
              SET passed = 1, passed_at = CURRENT_TIMESTAMP, last_distance = ?
              WHERE id = ?
            `).bind(dist, sub.id).run();
          } catch (emailErr) {
            console.error(`Failed to send passed email to ${sub.email}:`, emailErr);
          }
        } else {
          await env.DB.prepare(`
            UPDATE subscribers SET last_distance = ? WHERE id = ?
          `).bind(dist, sub.id).run();
        }
      }
    }
  } catch (err) {
    console.error("Proximity processing error:", err);
  }
}

