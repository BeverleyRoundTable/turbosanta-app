// ==============================================================================
// TurboSanta — Multi-Tenant Universal Embed Generator
// Supports both Cloudflare D1 Multi-Tenant (?table=slug) and Legacy Sheets (?api=)
// ==============================================================================

const params = new URLSearchParams(window.location.search);
let currentTable = params.get("table") || (params.get("api") ? "" : "beverley");
let currentApi = params.get("api") || "";

const BASE_URL = window.location.origin;

function getTargetQuery() {
  if (currentApi) {
    return `api=${encodeURIComponent(currentApi)}`;
  }
  return `table=${encodeURIComponent(currentTable || "beverley")}`;
}

function buildUrl(filename, extraParams = "") {
  const query = getTargetQuery();
  const sep = filename.includes("?") ? "&" : "?";
  const extra = extraParams ? `&${extraParams}` : "";
  return `${BASE_URL}/${filename}${sep}${query}${extra}`;
}

function updateDisplay() {
  const display = document.getElementById("apiDisplay");
  if (display) {
    if (currentApi) {
      display.textContent = `Legacy API: ${currentApi}`;
    } else {
      display.textContent = `Active Table: ${currentTable || "beverley"}`;
    }
  }

  const slugInput = document.getElementById("tableSlugInput");
  if (slugInput && !currentApi) {
    slugInput.value = currentTable || "beverley";
  }

  generateAllEmbeds();
}

function updateTableSlug(newSlug) {
  const input = document.getElementById("tableSlugInput");
  const slug = (newSlug !== undefined ? newSlug : (input ? input.value : "beverley")).trim().toLowerCase();
  if (slug) {
    currentTable = slug;
    currentApi = "";
    // Update URL query string without reloading
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("table", slug);
    newUrl.searchParams.delete("api");
    window.history.replaceState({}, "", newUrl);
    updateDisplay();
  }
}
window.updateTableSlug = updateTableSlug;

function generateAllEmbeds() {
  // 1. Santa Sleigh Turnkey App
  const santasleighUrl = buildUrl("santasleigh.html");
  setValue("santasleighLink", santasleighUrl);
  setValue("santasleighEmbed", `<div style="width:100%;max-width:1200px;margin:0 auto;">
  <iframe
    src="${santasleighUrl}"
    style="width:100%;height:100vh;min-height:800px;border:none;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.5);"
    allow="geolocation; screen-wake-lock; camera; microphone"
    loading="lazy">
  </iframe>
</div>`);

  // 2. Thermometers
  const miniThermo = `<div data-santa-mini></div>
<script>
(function() {
    const s = document.createElement('script');
    s.src = '${BASE_URL}/donations_v2.js';
    s.onload = () => { 
        window.BRT_DONATE_API = 'https://turbosanta-api.beverley247.workers.dev/api/payload?${getTargetQuery()}'; 
        if (typeof BRT_DONATE_INIT === 'function') BRT_DONATE_INIT(); 
    };
    document.head.appendChild(s);
})();
<\/script>`;
  setValue("miniThermo", miniThermo);

  const fullThermo = `<div data-santa-thermo></div>
<script>
(function() {
    const s = document.createElement('script');
    s.src = '${BASE_URL}/donations_v2.js';
    s.onload = () => {
        window.BRT_DONATE_API = 'https://turbosanta-api.beverley247.workers.dev/api/payload?${getTargetQuery()}';
        if (typeof BRT_DONATE_INIT === 'function') BRT_DONATE_INIT();
    };
    document.head.appendChild(s);
})();
<\/script>`;
  setValue("fullThermo", fullThermo);

  // 3. Carousel
  setValue("carouselLink", `<iframe
  src="${buildUrl("carousel.html")}"
  style="width:100%;height:450px;border:none;border-radius:16px;overflow:hidden;background:transparent;"
  allowtransparency="true"
  scrolling="no"
  loading="lazy">
</iframe>`);

  // 4. Address & Street Lookup
  const addressUrl = buildUrl("address.html");
  setValue("addressLink", addressUrl);
  setValue("addressLookup", `<div style="width:100%;max-width:900px;margin:0 auto;">
  <iframe
    id="addressFrame"
    src="${addressUrl}"
    style="width:100%;height:550px;border:none;border-radius:16px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    allow="geolocation"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>
<script>
  window.addEventListener("message", (e) => {
    if (e.data && e.data.addressLookupHeight) {
      const frame = document.getElementById("addressFrame");
      if (frame) frame.style.height = e.data.addressLookupHeight + "px";
    }
  });
<\/script>`);

  // 5. Nice List
  setValue("niceListEmbed", `<div style="width:100%;max-width:720px;margin:0 auto;">
  <iframe
    id="niceListFrame"
    src="${buildUrl("nice_list.html")}"
    style="width:100%;height:500px;border:none;border-radius:16px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  // 6. Santa's Been Photo Frame
  setValue("santasBeenEmbed", `<div style="width:100%;max-width:440px;margin:0 auto;">
  <iframe
    id="santasBeenFrame"
    src="${buildUrl("santa_frame.html")}"
    style="width:100%;height:560px;border:none;border-radius:20px;overflow:hidden;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  // 7. Tracker Embeds
  const trackerUrl = buildUrl("tracker.html");
  setValue("trackerLink", trackerUrl);
  setValue("recommendedTracker", `<div style="width:100%;max-width:1000px;margin:0 auto;">
  <iframe
    src="${trackerUrl}"
    style="width:100%;height:80vh;min-height:550px;border:none;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.5);background:transparent;"
    allowtransparency="true"
    allow="geolocation; screen-wake-lock"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  // 8. Tracker Kiosk Mode
  const trackerKioskUrl = buildUrl("tracker.html", "kiosk=1");
  setValue("trackerKioskLink", trackerKioskUrl);
  setValue("recommendedTrackerKiosk", `<div style="width:100%;margin:0 auto;">
  <iframe
    src="${trackerKioskUrl}"
    style="width:100%;height:90vh;min-height:600px;border:none;border-radius:16px;overflow:hidden;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  // 9. Routes List & Route Card
  const routesUrl = buildUrl("routes.html");
  setValue("routesLink", routesUrl);
  setValue("recommendedRoutes", `<div style="width:100%;max-width:1000px;margin:0 auto;">
  <iframe
    id="routesFrame"
    src="${routesUrl}"
    style="width:100%;height:600px;border:none;border-radius:16px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  const routeCardUrl = buildUrl("route_card.html");
  setValue("routeCardLink", routeCardUrl);
  setValue("recommendedRouteCard", `<div style="width:100%;max-width:800px;margin:0 auto;">
  <iframe
    id="routeCardFrame"
    src="${routeCardUrl}"
    style="width:100%;height:350px;border:none;border-radius:16px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  // 10. Snowman Face Photo
  setValue("snowmanFrameEmbed", `<div style="width:100%;max-width:900px;margin:0 auto;">
  <iframe
    src="${buildUrl("snowman.html")}"
    style="width:100%;height:600px;border:none;border-radius:20px;overflow:hidden;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  // 11. Reports & Admin
  setValue("seasonWrapLink", buildUrl("season_wrap.html"));
  setValue("godModeLink", buildUrl("god_mode.html"));
  setValue("qrPosterLink", buildUrl("qr_poster.html"));
  setValue("thankYouLink", buildUrl("thank_you.html"));
  setValue("reindeerLink", buildUrl("adopt_reindeer.html"));
  
  // 12. Crew Hub & Volunteer Sign-Up
  const crewUrl = buildUrl("crew.html");
  setValue("crewLink", crewUrl);
  setValue("crewEmbed", `<div style="width:100%;max-width:900px;margin:0 auto;">
  <iframe
    src="${crewUrl}"
    style="width:100%;height:750px;border:none;border-radius:16px;background:transparent;"
    loading="lazy">
  </iframe>
</div>`);

  // 13. Letters & Mailbox
  const letterUrl = buildUrl("letter.html");
  setValue("letterLink", letterUrl);
  setValue("recommendedLetter", `<div style="width:100%;max-width:600px;margin:0 auto;">
  <iframe
    src="${letterUrl}"
    style="width:100%;height:650px;border:none;border-radius:16px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  // 14. Interactive Widgets
  setValue("suggestLink", buildUrl("suggest.html"));
  setValue("elfcamLink", buildUrl("elf_cam.html"));
  setValue("satnavLink", buildUrl("tracker.html", "driver=1"));
  setValue("beaconLink", buildUrl("beacon.html"));
  setValue("doorhangerLink", buildUrl("door_hanger.html"));
  setValue("colouringpageLink", buildUrl("colouring_page.html"));
  setValue("volunteercertLink", buildUrl("volunteer_cert.html"));
  setValue("bingoLink", buildUrl("bingo.html"));
  setValue("routeplannerLink", buildUrl("route_planner.html"));

  const countdownUrl = buildUrl("countdown.html");
  setValue("countdownLink", countdownUrl);
  setValue("countdownEmbed", `<div style="width:100%;max-width:600px;margin:0 auto;">
  <iframe
    src="${countdownUrl}"
    style="width:100%;height:180px;border:none;border-radius:12px;background:transparent;"
    scrolling="no"
    loading="lazy">
  </iframe>
</div>`);

  const giftaidUrl = buildUrl("gift_aid.html");
  setValue("giftaidLink", giftaidUrl);
  setValue("giftaidEmbed", `<div style="width:100%;max-width:700px;margin:0 auto;">
  <iframe
    src="${giftaidUrl}"
    style="width:100%;height:650px;border:none;border-radius:16px;background:transparent;"
    loading="lazy">
  </iframe>
</div>`);

  const memorybookUrl = buildUrl("memory_book.html");
  setValue("memorybookLink", memorybookUrl);
  setValue("memorybookEmbed", `<div style="width:100%;max-width:1000px;margin:0 auto;">
  <iframe
    src="${memorybookUrl}"
    style="width:100%;height:850px;border:none;border-radius:16px;background:transparent;"
    allow="camera; microphone; geolocation"
    loading="lazy">
  </iframe>
</div>`);

  const santachatUrl = buildUrl("santa_chat.html");
  setValue("santachatLink", santachatUrl);
  setValue("santachatEmbed", `<div style="width:100%;max-width:500px;margin:0 auto;">
  <iframe
    src="${santachatUrl}"
    style="width:100%;height:600px;border:none;border-radius:24px;background:#1d1d1a;"
    allow="microphone"
    loading="lazy">
  </iframe>
</div>`);

  const blueprintUrl = buildUrl("blueprint.html");
  setValue("blueprintLink", blueprintUrl);
  setValue("blueprintEmbed", `<div style="width:100%;max-width:1000px;margin:0 auto;">
  <iframe
    src="${blueprintUrl}"
    style="width:100%;height:620px;border:none;border-radius:24px;background:transparent;"
    loading="lazy">
  </iframe>
</div>`);

  setValue("magicmailboxLink", buildUrl("magic_mailbox.html"));
  setValue("santastudioLink", buildUrl("santa_studio.html"));

  loadRoutes();
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = (val || "").trim();
}

async function loadRoutes() {
  const gpxEl = document.getElementById("gpxList");
  if (!gpxEl) return;
  try {
    let routes = [];
    if (currentApi) {
      const res = await fetch(currentApi);
      const json = await res.json();
      routes = json.routes || [];
    } else {
      const res = await fetch(`https://turbosanta-api.beverley247.workers.dev/api/payload?table=${encodeURIComponent(currentTable || "beverley")}`);
      const json = await res.json();
      routes = json.routes || [];
    }

    if (!routes || !routes.length) {
      gpxEl.value = "No routes currently scheduled for this table.";
      return;
    }

    const output = routes.map(r => {
      const name = r.routeName || r.name || "Route";
      return buildUrl("gpx_animation.html", `route=${encodeURIComponent(name)}`);
    }).join("\r\n");

    gpxEl.value = output;
  } catch (e) {
    gpxEl.value = "GPX animation links available when routes are created.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateDisplay();
});
