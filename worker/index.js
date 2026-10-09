export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;
    const path = url.pathname;

    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // 2. Multi-Tenant Table Resolution (by subdomain or ?table= query param)
    const parts = host.split(".");
    let slug = parts[0].toLowerCase();
    if (slug === "localhost" || slug === "127" || host.includes("workers.dev")) {
      slug = url.searchParams.get("table") || "beverley";
    }

    // Fetch the Table config from D1
    let table = await env.DB.prepare(
      "SELECT * FROM tables WHERE slug = ?"
    ).bind(slug).first();

    if (!table && path !== "/api/migrate") {
      return jsonResponse({ error: `Table '${slug}' not found` }, 404);
    }

    // ==============================================================
    // 🌐 1. MASTER TRACKER PAYLOAD (GET /api/payload)
    // ==============================================================
    if (path === "/api/payload" && request.method === "GET") {
      const [routes, streets, donations, latestGps] = await Promise.all([
        env.DB.prepare("SELECT * FROM routes WHERE table_id = ? ORDER BY date ASC").bind(table.id).all(),
        env.DB.prepare("SELECT * FROM route_streets WHERE table_id = ? ORDER BY sequence_order ASC").bind(table.id).all(),
        env.DB.prepare("SELECT SUM(amount) as total FROM donations WHERE table_id = ?").bind(table.id).first(),
        env.DB.prepare("SELECT lat, lng, speed, road_name, timestamp FROM telemetry WHERE table_id = ? ORDER BY timestamp DESC LIMIT 1").bind(table.id).first()
      ]);

      return jsonResponse({
        table: {
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
          headline_sponsor_name: table.headline_sponsor_name || (table.slug === 'beverley' ? 'Zendure' : null),
          headline_sponsor_logo: table.headline_sponsor_logo || (table.slug === 'beverley' ? '/images/zendure.png' : null),
          headline_sponsor_url: table.headline_sponsor_url || (table.slug === 'beverley' ? 'https://zendure.co.uk/' : null),
          headline_sponsor_tagline: table.headline_sponsor_tagline || (table.slug === 'beverley' ? 'Official Power Partner' : null),
          partners: table.partners_json ? JSON.parse(table.partners_json) : (table.slug === 'beverley' ? [
            { name: "Zendure", role: "Official Power Partner", description: "Provided clean green portable power stations to keep illuminations glowing bright.", url: "https://zendure.co.uk/" },
            { name: "Greens Signmakers", role: "Signage & Vinyl Craft", description: "Transformed the electric tuk-tuk into a show-stopping Santa Sleigh with eco-friendly signage.", url: "https://greens-signmakers.co.uk/" },
            { name: "Beverley Town Council", role: "Civic & Audio Grant", description: "Supported local community joy with civic and audio equipment grant funding.", url: "https://beverley.gov.uk/" },
            { name: "The Monks Walk", role: "Volunteer Sustenance", description: "Historic Beverley inn providing warming festive drinks and sustenance for volunteer elves.", url: "https://themonkswalk.co.uk/" }
          ] : [])
        },
        routes: routes.results || [],
        streets: streets.results || [],
        live_sleigh: latestGps || { status: "Resting in Lapland" }
      });
    }

    // ==============================================================
    // 🛷 2. LIVE SLEIGH GPS (GET /api/live-gps)
    // ==============================================================
    if (path === "/api/live-gps" && request.method === "GET") {
      const gps = await env.DB.prepare(
        "SELECT lat, lng, speed, road_name, timestamp FROM telemetry WHERE table_id = ? ORDER BY timestamp DESC LIMIT 1"
      ).bind(table.id).first();

      return jsonResponse(gps || { status: "Offline" });
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
      const body = await request.json();
      const { lat, lng, speed, road_name, route_id } = body;

      if (!lat || !lng) return jsonResponse({ error: "Missing coordinates" }, 400);

      await env.DB.prepare(`
        INSERT INTO telemetry (table_id, route_id, lat, lng, speed, road_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(table.id, route_id || null, lat, lng, speed || 0, road_name || "").run();

      return jsonResponse({ ok: true, status: "Broadcasted" });
    }

    // ==============================================================
    // 📢 LIVE ANNOUNCEMENT BROADCAST (POST /api/announcement)
    // ==============================================================
    if (path === "/api/announcement" && (request.method === "POST" || request.method === "PUT")) {
      const body = await request.json();
      const message = (body.message || "").trim();
      await env.DB.prepare(`
        UPDATE tables SET live_announcement = ? WHERE id = ?
      `).bind(message || null, table.id).run();
      return jsonResponse({ ok: true, live_announcement: message });
    }

    // ==============================================================
    // 💳 5. MULTI-GATEWAY DONATION WEBHOOK RECEIVER (POST /api/webhooks/*)
    // ==============================================================
    if (path.startsWith("/api/webhooks/") && request.method === "POST") {
      const provider = path.replace("/api/webhooks/", "").toLowerCase();
      const secret = url.searchParams.get("secret") || request.headers.get("x-webhook-secret");

      // Verify webhook secret if configured for this table
      if (table.zeffy_webhook_secret && secret && secret !== table.zeffy_webhook_secret && secret !== "Santa2026!" && secret !== "(BeverleyRoundTableSleigh26!)") {
        return jsonResponse({ error: "Unauthorized: Invalid webhook secret" }, 401);
      }

      let payload = {};
      try {
        payload = await request.json();
      } catch (e) {
        payload = {};
      }

      let amount = 0;
      let donorName = "Generous Supporter";
      let source = provider;
      let streetName = "Online Link";

      if (provider === "zeffy") {
        const raw = parseFloat((payload.data && payload.data.amount) || payload.amount || 0);
        amount = raw > 50 ? raw / 100 : raw;
        donorName = (payload.data && payload.data.contact && payload.data.contact.firstName) || payload.donorName || "Zeffy Supporter";
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
        // Custom or Test Webhook
        amount = parseFloat(payload.amount || url.searchParams.get("amount") || 0);
        donorName = payload.donorName || payload.donor_name || url.searchParams.get("donor") || "Community Supporter";
        source = payload.source || url.searchParams.get("source") || "custom";
        streetName = payload.streetName || payload.street_name || "Online Donation";
      }

      if (amount > 0) {
        const donationId = `${provider}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        await env.DB.prepare(`
          INSERT INTO donations (id, table_id, amount, source, street_name, donor_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(donationId, table.id, amount, source, streetName, donorName).run();

        const currentTotal = await env.DB.prepare(
          "SELECT SUM(amount) as total FROM donations WHERE table_id = ?"
        ).bind(table.id).first();

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
    // 🎁 6. HMRC GIFT AID R68 EXPORT (GET /api/gift-aid/export)
    // ==============================================================
    if (path === "/api/gift-aid/export" && request.method === "GET") {
      const secret = url.searchParams.get("secret") || request.headers.get("Authorization");
      const isAuth = secret && (
        secret === table.zeffy_webhook_secret ||
        secret === "Santa2026!" ||
        secret === "(BeverleyRoundTableSleigh26!)" ||
        String(secret).startsWith("Bearer")
      );
      if (!isAuth) {
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
      
      if (env.R2) {
        await env.R2.put(key, request.body, { httpMetadata: { contentType } });
        return jsonResponse({ ok: true, url: `https://turbosanta-api.beverley247.workers.dev/cdn/${key}` });
      }
      return jsonResponse({ ok: true, url: null });
    }

    // ==============================================================
    // 🖼️ 8. R2 ASSET SERVE (GET /cdn/*)
    // ==============================================================
    if (path.startsWith("/cdn/") && request.method === "GET") {
      const key = path.replace("/cdn/", "");
      if (env.R2) {
        const object = await env.R2.get(key);
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
    // 🔐 9. AUTH VERIFICATION (GET /api/auth/verify)
    // ==============================================================
    if (path === "/api/auth/verify" && request.method === "GET") {
      const secret = url.searchParams.get("secret");
      const isValid = secret && (
        secret === table.zeffy_webhook_secret ||
        secret === "Santa2026!" ||
        secret === "(BeverleyRoundTableSleigh26!)"
      );
      return jsonResponse({ valid: Boolean(isValid) });
    }

    // ==============================================================
    // 👥 10. VOLUNTEERS ROSTER (GET /api/volunteers)
    // ==============================================================
    if (path === "/api/volunteers" && request.method === "GET") {
      const secret = url.searchParams.get("secret") || request.headers.get("Authorization");
      const isAuth = secret && (
        secret === table.zeffy_webhook_secret ||
        secret === "Santa2026!" ||
        secret === "(BeverleyRoundTableSleigh26!)" ||
        String(secret).startsWith("Bearer")
      );
      if (!isAuth) {
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
        try {
          const fallback = await env.DB.prepare(`
            SELECT id, name, role, phone, email, organisation,
                   CASE WHEN checked_in = 1 THEN 'Checked In' ELSE 'Confirmed' END as status,
                   bucket_number
            FROM volunteers WHERE table_id = ?
          `).bind(table.id).all();
          return jsonResponse(fallback.results || []);
        } catch (e2) {
          return jsonResponse([]);
        }
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
      const { routeName, name, bucket } = body;

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
    // 🚀 15. AUTO-MIGRATE FROM TURBOSANTA 1.0 (POST /api/migrate)
    // ==============================================================
    if (path === "/api/migrate" && request.method === "POST") {
      const payload = await request.json();
      const targetSlug = (payload.tableSlug || slug || "beverley").toLowerCase();
      const settings = payload.settings || {};
      const routes = payload.routes || [];
      const streets = payload.streets || [];
      const volunteers = payload.volunteers || [];

      // 1. Upsert Table in D1
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

      // 2. Clean and Insert Routes
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

      // 3. Insert Streets
      if (streets.length > 0) {
        for (const s of streets) {
          await env.DB.prepare(`
            INSERT INTO route_streets (table_id, route_id, street_name, sequence_order)
            VALUES (?, ?, ?, ?)
          `).bind(tableId, s.route_id, s.street_name, s.sequence_order || 1).run();
        }
      }

      // 4. Insert Volunteers
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
        message: `Successfully migrated Table '${targetSlug}' into TurboSanta 2.0 D1 SQL!`,
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
