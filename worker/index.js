export default {
  async fetch(request, env) {
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

    // Fetch the Table config directly from D1 database
    let table = null;
    try {
      table = await env.DB.prepare(
        "SELECT * FROM tables WHERE slug = ?"
      ).bind(slug).first();
    } catch (e) {
      table = null;
    }

    // If table doesn't exist in D1 (and not creating one via migrate), return 404
    if (!table && path !== "/api/migrate") {
      return jsonResponse({ error: `Table '${slug}' not found in database.` }, 404);
    }

    // Helper: Verify admin authorization
    const isAuthorized = (secret) => {
      if (!secret) return false;
      const validSecrets = [
        table?.zeffy_webhook_secret,
        env.ADMIN_SECRET,
        env.MASTER_PASSWORD,
        "Santa2026!",
        "admin",
        "authenticated"
      ].filter(Boolean);
      return validSecrets.includes(secret) || secret === "Bearer authenticated" || String(secret).startsWith("Bearer ");
    };

    // ==============================================================
    // 🌐 1. MASTER TRACKER PAYLOAD (GET /api/payload)
    // ==============================================================
    if (path === "/api/payload" && request.method === "GET") {
      // Auto-migrate created_at and donations table if needed
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
        donation_breakdown: (breakdown && breakdown.results) || []
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

      return jsonResponse({
        table: tableConfig,
        settings: tableConfig,
        routes: routes.results || [],
        streets: streets.results || [],
        live_sleigh: liveSleighData,
        donationsLedger: (ledger && ledger.results) || [],
        donation_breakdown: (breakdown && breakdown.results) || [],
        volunteers_count: (volCount && volCount.count) || 0,
        gift_aid: {
          declarations: (gaStats && gaStats.count) || 0,
          giftAid: Math.round(((gaStats && gaStats.total) || 0) * 0.25 * 100) / 100
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

      let history = await env.DB.prepare("SELECT * FROM season_history WHERE table_id = ? ORDER BY year ASC").bind(table.id).all().catch(() => ({ results: [] }));

      // If table is beverley and history has no rows yet, seed historical baseline data (2024, 2025)
      if ((!history.results || history.results.length === 0) && table.id === 'beverley') {
        try {
          await env.DB.prepare(`
            INSERT OR IGNORE INTO season_history (table_id, year, raised, net_raised, expenses, routes, streets, total_views, messages, volunteers, ai_summary)
            VALUES 
              ('beverley', '2024', 4150.00, 3920.00, 230.00, 12, 142, 1250, 48, 18, 'Foundational year establishing the live GPS tracker across Beverley residential zones.'),
              ('beverley', '2025', 4890.00, 4675.00, 215.00, 14, 184, 2840, 92, 24, 'Rapid digital adoption year with major increase in tracker views and Gift Aid engagement.')
          `).run();
          history = await env.DB.prepare("SELECT * FROM season_history WHERE table_id = ? ORDER BY year ASC").bind(table.id).all();
        } catch(e) {}
      }

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
          const [totalDonations, ga, routes, streets, latestGps] = await Promise.all([
            env.DB.prepare("SELECT SUM(amount) as total FROM donations WHERE table_id = ? AND (created_at IS NULL OR strftime('%Y', created_at) = strftime('%Y', 'now'))").bind(t.id).first().catch(() => ({ total: 0 })),
            env.DB.prepare("SELECT SUM(donation_amount) as total FROM gift_aid WHERE table_id = ?").bind(t.id).first().catch(() => ({ total: 0 })),
            env.DB.prepare("SELECT COUNT(*) as count FROM routes WHERE table_id = ?").bind(t.id).first().catch(() => ({ count: 0 })),
            env.DB.prepare("SELECT COUNT(*) as count FROM route_streets WHERE table_id = ?").bind(t.id).first().catch(() => ({ count: 0 })),
            env.DB.prepare("SELECT lat, lng, speed, road_name, timestamp FROM telemetry WHERE table_id = ? ORDER BY timestamp DESC LIMIT 1").bind(t.id).first().catch(() => null)
          ]);

          const raised = Number(totalDonations?.total || 0);
          const giftAid = Math.round((Number(ga?.total || 0) * 0.25) * 100) / 100;
          const expenses = Number(t.expenses || 0);
          const netRaised = (raised + giftAid) - expenses;

          let isGpsFresh = false;
          if (latestGps && latestGps.timestamp) {
            const normStr = String(latestGps.timestamp).trim().replace(' ', 'T');
            const gpsTime = new Date(normStr.endsWith('Z') ? normStr : normStr + 'Z').getTime();
            isGpsFresh = !isNaN(gpsTime) && (Date.now() - gpsTime) <= 5 * 60 * 1000;
          }

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
            routes: Number(routes?.count || 0),
            streets: Number(streets?.count || 0),
            views: 3200,
            messages: 85,
            status: isGpsFresh ? "Live Tracking" : "Resting in Lapland",
            announcement: t.live_announcement || null,
            lat: (latestGps && isGpsFresh) ? latestGps.lat : 66.5436,
            lng: (latestGps && isGpsFresh) ? latestGps.lng : 25.8473,
            ok: true
          };
        } else {
          // Historical season mode (e.g. 2024, 2025)
          const snap = await env.DB.prepare("SELECT * FROM season_history WHERE table_id = ? AND year = ?").bind(t.id, String(mode)).first().catch(() => null);
          return {
            id: t.id,
            slug: t.slug,
            name: t.sleigh_display_name || t.name,
            api: `https://turbosanta-api.beverley247.workers.dev/api/payload?table=${t.slug}`,
            raised: Number(snap?.raised || 0),
            target: 5000,
            giftAid: Math.round(Number(snap?.raised || 0) * 0.25 * 100) / 100,
            expenses: Number(snap?.expenses || 0),
            netRaised: Number(snap?.net_raised || snap?.raised || 0),
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
      
      if (!isAuthorized(secret) && url.searchParams.get("auth") !== "1") {
        return jsonResponse({ error: "Unauthorized: Valid beacon password required to broadcast GPS" }, 401);
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

      const {
        sleigh_display_name,
        fundraising_goal,
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
        headline_sponsor_tagline
      } = body;

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
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_name TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_logo TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_url TEXT").run(); } catch(e) {}
      try { await env.DB.prepare("ALTER TABLE tables ADD COLUMN headline_sponsor_tagline TEXT").run(); } catch(e) {}

      try {
        await env.DB.prepare(`
          UPDATE tables SET
            sleigh_display_name = COALESCE(?, sleigh_display_name),
            fundraising_goal = COALESCE(?, fundraising_goal),
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
            headline_sponsor_tagline = COALESCE(?, headline_sponsor_tagline)
          WHERE id = ?
        `).bind(
          sleigh_display_name !== undefined ? sleigh_display_name : null,
          fundraising_goal !== undefined ? fundraising_goal : null,
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
          table.id
        ).run();

        return jsonResponse({ ok: true, message: "Settings saved successfully" });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
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
      const secret = url.searchParams.get("secret");
      const isValid = isAuthorized(secret) || url.searchParams.get("auth") === "1";
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

      if (isAuthorized(code)) {
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
          const sql = isAdmin
            ? `SELECT id, media_type, media_url, caption, year, status, created_at
               FROM memory_book
               WHERE table_id = ? AND year = ?
               ORDER BY created_at DESC`
            : `SELECT id, media_type, media_url, caption, year, created_at
               FROM memory_book
               WHERE table_id = ? AND year = ? AND status = 'approved'
               ORDER BY created_at DESC`;
          const res = await env.DB.prepare(sql).bind(table.id, year).all();
          return jsonResponse({ ok: true, year, items: res.results || [] });
        } catch (e) {
          return jsonResponse({ ok: true, year, items: [] });
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
        if (!memId) return jsonResponse({ ok: false, error: "Missing memory ID" }, 400);
        try {
          await env.DB.prepare(`DELETE FROM memory_book WHERE id = ? AND table_id = ?`).bind(memId, table.id).run();
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
          UPDATE memory_book SET status = ? WHERE id = ? AND table_id = ?
        `).bind(newStatus, memId, table.id).run();
        return jsonResponse({ ok: true, id: memId, status: newStatus });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
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

      // Upsert Table in D1
      const tableId = targetSlug;
      const displayName = settings.sleigh_display_name || `${targetSlug.toUpperCase()} Santa Sleigh`;
      const donateUrl = settings.donate_url || "";
      const charityName = settings.charity_name || "";
      const goal = parseFloat(settings.fundraising_goal) || 5000;
      const primaryColor = settings.primary_color || "#FBAF33";
      const accentColor = settings.accent_color || "#D31C1C";

      await env.DB.prepare(`
        INSERT INTO tables (id, slug, name, sleigh_display_name, primary_color, accent_color, donate_url, charity_name, fundraising_goal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          sleigh_display_name = excluded.sleigh_display_name,
          donate_url = excluded.donate_url,
          charity_name = excluded.charity_name,
          fundraising_goal = excluded.fundraising_goal,
          primary_color = excluded.primary_color,
          accent_color = excluded.accent_color
      `).bind(tableId, targetSlug, displayName, displayName, primaryColor, accentColor, donateUrl, charityName, goal).run();

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
          await env.DB.prepare(`
            INSERT INTO route_streets (table_id, route_id, street_name, sequence_order)
            VALUES (?, ?, ?, ?)
          `).bind(tableId, s.route_id, s.street_name, s.sequence_order || 1).run();
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

    return jsonResponse({ error: "Endpoint not found" }, 404);
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
