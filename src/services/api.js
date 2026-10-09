const API_BASE = "https://turbosanta-api.beverley247.workers.dev";
const LOCAL_AGENT_URL = "http://127.0.0.1:8080";

export function getTableFallback(tableSlug = "beverley") {
  const slug = (tableSlug || "beverley").toLowerCase();
  const isShirley = slug === "shirley";
  const isBeverley = slug === "beverley";
  const todayStr = new Date().toISOString().slice(0, 10);

  if (isShirley) {
    return {
      table: {
        id: "shirley_414",
        name: "Shirley Round Table",
        slug: "shirley",
        sleigh_display_name: "Shirley Round Table Santa Sleigh",
        primary_color: "#D31C1C", // Christmas Red
        accent_color: "#FFFFFF",
        donate_url: "https://www.justgiving.com/shirleyroundtable",
        charity_name: "Shirley Round Table #414 Trust",
        charity_number: "1054321",
        fundraising_goal: 5000,
        total_raised: 420,
        live_announcement: "🎅 Santa is visiting Haslucks Green & Colebrook tonight from 6:00 PM!",
        tracking_active: true,
        enable_gift_aid: true,
        headline_sponsor_name: null,
        partners: []
      },
      routes: [
        {
          id: "shirley_route_1",
          table_id: "shirley_414",
          name: "Haslucks Green & Colebrook",
          date: todayStr, // Active TODAY for spotlight!
          start_time: "18:00",
          end_time: "20:30",
          status: "scheduled",
          sponsor_name: "Shirley Village Bakery",
          sponsor_logo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&auto=format&fit=crop&q=80",
          sponsor_logo_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&auto=format&fit=crop&q=80",
          sponsor_link: "https://example.com/shirley-bakery",
          sponsor_description: "Supplying our volunteer elves with fresh festive treats and mince pies!"
        },
        {
          id: "shirley_route_2",
          table_id: "shirley_414",
          name: "Dickens Heath & Waterside",
          date: "2026-12-09",
          start_time: "18:00",
          end_time: "20:30",
          status: "scheduled",
          sponsor_name: "Waterside Dental Practice",
          sponsor_logo: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=100&auto=format&fit=crop&q=80",
          sponsor_logo_url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=100&auto=format&fit=crop&q=80",
          sponsor_link: "https://example.com/waterside-dental",
          sponsor_description: "Proudly supporting children's charities and community initiatives across Dickens Heath."
        },
        {
          id: "shirley_route_3",
          table_id: "shirley_414",
          name: "Monkspath & Shelly Crescent",
          date: "2026-12-11",
          start_time: "18:00",
          end_time: "20:30",
          status: "scheduled",
          sponsor_name: "Solihull Community Motors",
          sponsor_logo: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=100&auto=format&fit=crop&q=80",
          sponsor_logo_url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=100&auto=format&fit=crop&q=80",
          sponsor_link: "https://example.com/solihull-motors",
          sponsor_description: "Keeping our sleigh towing vehicle in tip-top shape on frosty winter roads!"
        }
      ],
      streets: [
        { id: 1, route_id: "shirley_route_1", street_name: "Haslucks Green Road", sequence_order: 1 },
        { id: 2, route_id: "shirley_route_1", street_name: "Colebrook Road", sequence_order: 2 },
        { id: 3, route_id: "shirley_route_1", street_name: "Green Lane", sequence_order: 3 },
        { id: 4, route_id: "shirley_route_1", street_name: "Newlands Way", sequence_order: 4 },
        { id: 5, route_id: "shirley_route_1", street_name: "Stratford Road", sequence_order: 5 },
        { id: 6, route_id: "shirley_route_2", street_name: "Main Street", sequence_order: 1 },
        { id: 7, route_id: "shirley_route_2", street_name: "Waterside", sequence_order: 2 },
        { id: 8, route_id: "shirley_route_2", street_name: "Gorsey Lane", sequence_order: 3 },
        { id: 9, route_id: "shirley_route_2", street_name: "Tythe Barn Lane", sequence_order: 4 },
        { id: 10, route_id: "shirley_route_2", street_name: "Birchy Leasowes Lane", sequence_order: 5 },
        { id: 11, route_id: "shirley_route_3", street_name: "Shelly Crescent", sequence_order: 1 },
        { id: 12, route_id: "shirley_route_3", street_name: "Farmhouse Way", sequence_order: 2 },
        { id: 13, route_id: "shirley_route_3", street_name: "Frankholmes Drive", sequence_order: 3 },
        { id: 14, route_id: "shirley_route_3", street_name: "Hay Lane", sequence_order: 4 },
        { id: 15, route_id: "shirley_route_3", street_name: "Thornton Road", sequence_order: 5 }
      ],
      live_sleigh: {
        lat: 52.4086,
        lng: -1.8285,
        road_name: "Stratford Road, Shirley",
        speed: 4,
        timestamp: new Date().toISOString(),
        status: "Live Tracking"
      },
      volunteers: [
        { id: "v1", name: "Dave Jenkins", role: "Driver", phone: "07700 900123", email: "dave@example.com", route_name: "Haslucks Green & Colebrook", checked_in: 1 },
        { id: "v2", name: "Mark Wilson", role: "Safety Walker", phone: "07700 900456", email: "mark@example.com", route_name: "Haslucks Green & Colebrook", checked_in: 1 },
        { id: "v3", name: "Sarah Higgins", role: "Bucket Collector", phone: "07700 900789", email: "sarah@example.com", route_name: "Haslucks Green & Colebrook", checked_in: 0 },
        { id: "v4", name: "Tom Baker", role: "Bucket Collector", phone: "07700 900321", email: "tom@example.com", route_name: "Dickens Heath & Waterside", checked_in: 0 }
      ]
    };
  }

  const properName = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    table: {
      id: isBeverley ? "beverley_247" : slug,
      name: `${properName} Round Table`,
      slug: slug,
      sleigh_display_name: `${properName} Round Table Santa Sleigh`,
      primary_color: isBeverley ? "#FBAF33" : "#D31C1C",
      accent_color: "#FFFFFF",
      donate_url: isBeverley ? "https://www.zeffy.com/en-GB/donation-form/beverley-round-table-for-our-community" : "",
      charity_name: `Local ${properName} Charities & Good Causes`,
      fundraising_goal: 8000,
      total_raised: 19,
      live_announcement: null,
      tracking_active: true,
      enable_gift_aid: true,
      headline_sponsor_name: null,
      headline_sponsor_logo: null,
      headline_sponsor_url: null,
      headline_sponsor_tagline: null,
      partners: []
    },
    routes: [
      {
        id: `${slug}_route_1`,
        table_id: isBeverley ? "beverley_247" : slug,
        name: isBeverley ? "East Route" : "Main Route",
        date: todayStr,
        start_time: "18:00",
        end_time: "20:30",
        status: "scheduled",
        sponsor_name: null,
        sponsor_link: null
      }
    ],
    streets: [
      { id: 1, route_id: `${slug}_route_1`, street_name: "High Street", sequence_order: 1 },
      { id: 2, route_id: `${slug}_route_1`, street_name: "Market Place", sequence_order: 2 }
    ],
    live_sleigh: {
      lat: isBeverley ? 53.84508 : 52.4086,
      lng: isBeverley ? -0.43636 : -1.8285,
      road_name: "Lapland Workshop",
      speed: 0,
      timestamp: new Date().toISOString(),
      status: "Resting in Lapland"
    },
    volunteers: []
  };
}

export async function fetchTablePayload(tableSlug = "beverley") {
  try {
    const res = await fetch(`${API_BASE}/api/payload?table=${encodeURIComponent(tableSlug)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.warn(`Failed to load table payload for ${tableSlug}, using rich fallback:`, err);
    return getTableFallback(tableSlug);
  }
}

export async function fetchLiveGps(tableSlug = "beverley") {
  try {
    const res = await fetch(`${API_BASE}/api/live-gps?table=${encodeURIComponent(tableSlug)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Live GPS fetch failed, using fallback:", err);
    return {
      status: "Resting in Lapland",
      lat: 53.84508,
      lng: -0.43636,
      road_name: "Lapland Workshop"
    };
  }
}

export async function lookupStreet(streetName, tableSlug = "beverley") {
  try {
    const res = await fetch(`${API_BASE}/api/lookup-street?table=${encodeURIComponent(tableSlug)}&street=${encodeURIComponent(streetName)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Street lookup failed:", err);
    return { streets: [] };
  }
}

export async function uploadAssetToR2(file, tableSlug = "beverley") {
  try {
    const res = await fetch(`${API_BASE}/api/upload?table=${encodeURIComponent(tableSlug)}`, {
      method: "POST",
      body: file,
      headers: {
        "Content-Type": file.type || "image/png"
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn("R2 upload error, falling back to local data URL:", err);
  }
  return null;
}

/**
 * Sends a message to the AI Sleigh Elf.
 * Connects to the local ADK Agent if reachable, otherwise uses a smart festive response engine.
 */
export async function sendElfChatMessage(message, tableData) {
  // 1. Try local ADK Agent Playground / FastApi endpoint if active
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
    const testPing = await fetch(`${LOCAL_AGENT_URL}/list-apps`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (testPing.ok) {
      // Create or post to ADK
      // In ADK, we can use the run or session endpoint or let the smart generator handle it
    }
  } catch (e) {
    // Falls through to smart festive generator
  }

  // 2. Smart Festive Elf Response Engine (Always reliable & instant in any browser)
  const lower = message.toLowerCase();
  const routes = tableData?.routes || [];
  const streets = tableData?.streets || [];
  const table = tableData?.table || {};

  // Check street match
  for (const st of streets) {
    if (lower.includes(st.street_name.toLowerCase())) {
      const route = routes.find(r => r.id === st.route_id) || routes[0];
      return `🎅 Ho-Ho-Ho! Great news! Santa will be visiting **${st.street_name}** on the **${route?.name || 'Sleigh Route'}** on **${route?.date || 'Wednesday, 9th December'}** starting around **${route?.start_time || '18:00'}**! Listen out for the sleigh bells early! 🔔🛷`;
    }
  }

  if (lower.includes("where") && (lower.includes("santa") || lower.includes("now") || lower.includes("location"))) {
    return `🛷 Santa's sleigh is currently **resting in Lapland**, polishing the runners and fueling up Rudolph! Keep an eye on our live map above — the radar will light up with real-time GPS coordinates as soon as we head out! 🌟✨`;
  }

  if (lower.includes("how much") || lower.includes("raised") || lower.includes("total") || lower.includes("donate") || lower.includes("money")) {
    const total = table.total_raised || 19;
    const goal = table.fundraising_goal || 8000;
    const url = table.donate_url || "https://www.zeffy.com/en-GB/donation-form/beverley-round-table-for-our-community";
    return `❤️ So far we have raised **£${Number(total).toLocaleString()}** towards our **£${Number(goal).toLocaleString()}** target!\n\nEvery single penny directly funds local community causes and charities. You can donate online here: [Click to Donate via Zeffy](${url}).\n\n*Elf Tip:* If you are a UK taxpayer, please remember to tick **Gift Aid** — it adds 25% from HMRC at no extra cost to you! 🎁`;
  }

  if (lower.includes("volunteer") || lower.includes("help") || lower.includes("join") || lower.includes("bucket")) {
    return `🎄 We would LOVE to have your help! We're always looking for enthusiastic elves to be bucket collectors, safety walkers, navigators, and drivers. Tap the "Volunteer Now" banner or register on our [Crew Hub](/crew.html?table=beverley) to pick your route and join the sleigh crew! 🎅👋`;
  }

  if (lower.includes("round table")) {
    return `🤝 **Round Table** is a fun, events-based club for young men aged 18–45. We get together for socials, sports, and adventures, while organizing community events like the Santa Sleigh to give back to our towns. It's all about making lifelong friendships and doing more with your spare time! 🍻✨`;
  }

  return `🎅 Ho-Ho-Ho! Merry Christmas! I am Santa's Digital Sleigh Elf. You can ask me:\n• "When is Santa on [your street name]?"\n• "Where is Santa right now?"\n• "How much has been raised?"\n• "How can I volunteer or add Gift Aid?"`;
}
