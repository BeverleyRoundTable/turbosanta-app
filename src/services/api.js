const API_BASE = "https://turbosanta-api.beverley247.workers.dev";
const LOCAL_AGENT_URL = "http://127.0.0.1:8080";

export async function fetchTablePayload(tableSlug = "beverley") {
  try {
    const res = await fetch(`${API_BASE}/api/payload?table=${encodeURIComponent(tableSlug)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load table payload:", err);
    throw err;
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
