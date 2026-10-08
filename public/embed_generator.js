// ================================
// Santa Sleigh Embed Generator
// Strict Mode – API REQUIRED
// ================================

// Read API from ?api=
const params = new URLSearchParams(window.location.search);
const api = params.get("api");

// Strict Mode → No fallback allowed
if (!api) {
    document.getElementById("apiDisplay").textContent =
        "❌ No API detected – add ?api=YOUR_SCRIPT_URL";

    // Disable all outputs so users cannot copy invalid code
    const fields = document.querySelectorAll("textarea");
    fields.forEach(f => f.value = "❌ ERROR: No API detected. Add ?api=YOUR_SCRIPT_URL");

    throw new Error("API missing – embed generator halted.");
}

document.getElementById("apiDisplay").textContent = api;

// Helper
function ensureApi() { return api; }

// ================================
// Santa Sleigh Main App
// ================================
const santasleighLink = `
https://santarouter.beverley247.workers.dev/?api=${ensureApi()}
`;

// ================================
// Mini Thermometer
// ================================
const miniThermo = `
<div data-santa-mini></div>
<script>
(function() {
    const s = document.createElement('script');
    s.src = 'https://brt-23f.pages.dev/sleigh/donations_v2.js';
    s.onload = () => { 
        const gasUrl = '${ensureApi()}';
        window.BRT_DONATE_API = 'https://santaproxy.beverley247.workers.dev/?ttl=10&target=' + encodeURIComponent(gasUrl); 
        if (typeof BRT_DONATE_INIT === 'function') BRT_DONATE_INIT(); 
    };
    document.head.appendChild(s);
})();
</script>
`;

// ================================
// Full Thermometer
// ================================
const fullThermo = `
<div data-santa-thermo></div>
<script>
(function() {
    const s = document.createElement('script');
    s.src = 'https://brt-23f.pages.dev/sleigh/donations_v2.js';
    s.onload = () => {
        const gasUrl = '${ensureApi()}';
        window.BRT_DONATE_API = 'https://santaproxy.beverley247.workers.dev/?ttl=10&target=' + encodeURIComponent(gasUrl);
        if (typeof BRT_DONATE_INIT === 'function') BRT_DONATE_INIT();
    };
    document.head.appendChild(s);
})();
</script>
`;

// ================================
// Carousel Embed
// ================================
const carouselLink = `
<iframe
  src="https://brt-23f.pages.dev/sleigh/carousel?api=${ensureApi()}"
  style="width:100%;height:450px;border:none;border-radius:12px;overflow:hidden;background:transparent;"
  allowtransparency="true"
  scrolling="no"
  loading="lazy">
</iframe>
`;

// ================================
// ADDRESS LOOKUP — FINAL iFrame Version
// ================================
const addressLink = `
https://brt-23f.pages.dev/sleigh/address.html?api=${ensureApi()}
`;

const addressLookup = `
<div style="width:100%;max-width:900px;margin:0 auto;">
  <iframe
    id="addressFrame"
    src="https://brt-23f.pages.dev/sleigh/address.html?api=${ensureApi()}"
    style="width:100%;height:550px;border:none;border-radius:12px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    allow="geolocation"
    scrolling="no"
    loading="lazy"
  ></iframe>
</div>

<script>
  window.addEventListener("message", (e) => {
    if (e.data.addressLookupHeight) {
      const frame = document.getElementById("addressFrame");
      if (frame) frame.style.height = e.data.addressLookupHeight + "px";
    }
  });
</script>
`;

// ================================
// Santa Nice List (auto-height iframe)
// ================================
const niceListEmbed = `
<div style="width:100%;max-width:720px;margin:0 auto;">
  <iframe
    id="niceListFrame"
    src="https://brt-23f.pages.dev/sleigh/nice_list.html?api=${ensureApi()}"
    style="width:100%;border:none;border-radius:15px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy"
  ></iframe>
</div>

<script>
  window.addEventListener("message", (e) => {
    if (e.data.niceListHeight) {
      const frame = document.getElementById("niceListFrame");
      if (frame) frame.style.height = e.data.niceListHeight + "px";
    }
  });
</script>
`;

// ================================
// Santa’s Been (Photo Generator)
// ================================
const santasBeenEmbed = `
<div style="width:100%;max-width:420px;margin:0 auto;">
  <iframe
    id="santasBeenFrame"
    src="https://brt-23f.pages.dev/sleigh/santa_frame.html?api=${ensureApi()}"
    style="width:100%;border:none;border-radius:20px;overflow:hidden;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy"
  ></iframe>
</div>

<script>
  window.addEventListener("message", (e) => {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.santasBeenHeight) {
      const frame = document.getElementById("santasBeenFrame");
      if (frame) {
        frame.style.height = e.data.santasBeenHeight + "px";
        frame.style.minHeight = e.data.santasBeenHeight + "px";
      }
    }
  });
</script>
`;

// ================================
// Snowman Maker (Build + Face Photo)
// ================================
const snowmanFrameEmbed = `
<div style="width:100%;max-width:900px;margin:0 auto;">
  <iframe
    id="snowmanFrame"
    src="https://brt-23f.pages.dev/sleigh/snowman.html?api=${ensureApi()}"
    style="width:100%;border:none;border-radius:20px;overflow:hidden;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy"
  ></iframe>
</div>

<script>
window.addEventListener("message", (e) => {
  if (!e.data || typeof e.data !== "object") return;
  if (!("snowmanFrameHeight" in e.data)) return;

  const frame = document.getElementById("snowmanFrame");
  if (frame) {
    frame.style.height = e.data.snowmanFrameHeight + "px";
    frame.style.minHeight = e.data.snowmanFrameHeight + "px";
  }
});
</script>
`;

// ================================
// Tracker Embeds
// ================================
const trackerLink = `
https://brt-23f.pages.dev/sleigh/tracker?api=${ensureApi()}
`;

const recommendedTracker = `
<div style="width:90vw;max-width:1000px;margin:0 auto;padding:0 8px;">
<iframe
  src="https://brt-23f.pages.dev/sleigh/tracker.html?api=${ensureApi()}"
  style="width:100%;height:80vh;min-height:490px;border:none;border-radius:15px;overflow:hidden;box-shadow:0 4px 18px #0002;background:transparent;"
  allowtransparency="true"
  allow="geolocation"
  scrolling="no"
  loading="lazy"
></iframe>
</div>
`;

// ================================
// Tracker – Kiosk / TV Mode
// ================================
const trackerKioskLink = `
https://brt-23f.pages.dev/sleigh/tracker.html?api=${ensureApi()}&kiosk=1
`;

const recommendedTrackerKiosk = `
<div style="width:100vw;max-width:1200px;margin:0 auto;">
<iframe
  src="https://brt-23f.pages.dev/sleigh/tracker.html?api=${ensureApi()}&kiosk=1"
  style="width:100%;height:85vh;min-height:600px;border:none;border-radius:15px;overflow:hidden;background:transparent;"
  allowtransparency="true"
  scrolling="no"
  loading="lazy"
  referrerpolicy="no-referrer"
></iframe>
</div>
`;

// ================================
// Routes Embed
// ================================
const routesLink = `
https://brt-23f.pages.dev/sleigh/routes.html?api=${ensureApi()}
`;

const recommendedRoutes = `
<div style="width:100%;max-width:1000px;margin:0 auto;">
  <iframe
    id="routesFrame"
    src="https://brt-23f.pages.dev/sleigh/routes.html?api=${ensureApi()}"
    style="width:100%;border:none;border-radius:15px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy"
  ></iframe>
</div>

<script>
  window.addEventListener("message", (e) => {
    if (e.data.routesHeight) {
      const frame = document.getElementById("routesFrame");
      if (frame) frame.style.height = e.data.routesHeight + "px";
    }
  });
</script>
`;

// ================================
// Route Card
// ================================
const routeCardLink = `
https://brt-23f.pages.dev/sleigh/route_card?api=${ensureApi()}
`;

const recommendedRouteCard = `
<div style="width:100%;max-width:1000px;margin:0 auto;">
  <iframe
    id="routeCardFrame"
    src="https://brt-23f.pages.dev/sleigh/route_card?api=${ensureApi()}"
    style="width:100%;border:none;border-radius:15px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy"
  ></iframe>
</div>

<script>
  window.addEventListener("message", (e) => {
    if (e.data.routeCardHeight) {
      const frame = document.getElementById("routeCardFrame");
      if (frame) frame.style.height = e.data.routeCardHeight + "px";
    }
  });
</script>
`;

// ================================
// GPX Animation Routes List
// ================================
async function loadRoutes() {
    try {
        const res = await fetch(ensureApi());
        const json = await res.json();

        if (!json.routes || !Array.isArray(json.routes)) {
            document.getElementById("gpxList").value = "No routes found in API.";
            return;
        }

       const output = json.routes
    .map(r =>
        `https://brt-23f.pages.dev/sleigh/gpx_animation.html?api=${ensureApi()}&route=${encodeURIComponent(r.routeName)}`
    )
    .join("\r\n");

        document.getElementById("gpxList").value = output;

    } catch (e) {
        document.getElementById("gpxList").value = "Error reading GPX routes.";
    }
}
loadRoutes();

// ================================
// Season Wrap Report
// ================================
const seasonWrapLink = `
https://brt-23f.pages.dev/sleigh/season_wrap?api=${ensureApi()}
`;

// ================================
// God Mode Dashboard
// ================================
const godModeLink = `
https://brt-23f.pages.dev/sleigh/god_mode?api=${ensureApi()}
`;

// ================================
// QR Poster Generator
// ================================
const qrPosterLink = `
https://brt-23f.pages.dev/sleigh/qr_poster?api=${ensureApi()}
`;

// ================================
// Thank You Card
// ================================
const thankYouLink = `
https://brt-23f.pages.dev/sleigh/thank_you?api=${ensureApi()}
`;

// ================================
// Reindeer Adoption
// ================================
const reindeerLink = `
https://brt-23f.pages.dev/sleigh/adopt_reindeer?api=${ensureApi()}
`;

// ================================
// Crew Signup-Check-in
// ================================
const crewLink = `
https://brt-23f.pages.dev/sleigh/crew?api=${ensureApi()}
`;

// ================================
// Letter to Santa
// ================================
const letterLink = `
https://brt-23f.pages.dev/sleigh/letter?api=${ensureApi()}
`;

const recommendedLetter = `
<div style="width:100%;max-width:600px;margin:0 auto;">
  <iframe
    id="letterFrame"
    src="https://brt-23f.pages.dev/sleigh/letter.html?api=${ensureApi()}"
    style="width:100%;border:none;border-radius:16px;transition:height .25s ease;background:transparent;"
    allowtransparency="true"
    scrolling="no"
    loading="lazy"
  ></iframe>
</div>

<script>
  window.addEventListener("message", (e) => {
    if (e.data.letterHeight) {
      const frame = document.getElementById("letterFrame");
      if (frame) frame.style.height = e.data.letterHeight + "px";
    }
  });
</script>
`;

// ================================
// Suggest New Routes
// ================================
const suggestLink = `
https://brt-23f.pages.dev/sleigh/suggest?api=${ensureApi()}
`;

// ================================
// Elf Cam
// ================================
const elfcamLink = `
https://brt-23f.pages.dev/sleigh/lf_cam?api=${ensureApi()}
`;

// ================================
// Sat Nav
// ================================
const satnavLink = `
https://brt-23f.pages.dev/sleigh/tracker.html?api=${ensureApi()}&driver=1
`;

// ================================
// Beacon (GPS Logger)
// ================================
const beaconLink = `
https://brt-23f.pages.dev/sleigh/beacon?api=${ensureApi()}
`;

// ================================
// Door Hanger
// ================================
const doorhangerLink = `
https://brt-23f.pages.dev/sleigh/door_hanger?api=${ensureApi()}
`;

// ================================
// Colouring Page
// ================================
const colouringpageLink = `
https://brt-23f.pages.dev/sleigh/colouring_page?api=${ensureApi()}
`;

// ================================
// Volunteer Certificate
// ================================
const volunteercertLink = `
https://brt-23f.pages.dev/sleigh/volunteer_cert?api=${ensureApi()}
`;

// ================================
// Santa Bingo
// ================================
const bingoLink = `
https://brt-23f.pages.dev/sleigh/bingo?api=${ensureApi()}
`;

// ================================
// Route Planner
// ================================
const routeplannerLink = `
https://brt-23f.pages.dev/sleigh/route_planner?api=${ensureApi()}
`;

// ================================
// Countdown
// ================================
const countdownLink = `
https://brt-23f.pages.dev/sleigh/countdown?api=${ensureApi()}
`;

// ================================
// Gift Aid
// ================================
const giftaidLink = `
https://brt-23f.pages.dev/sleigh/gift_aid?api=${ensureApi()}
`;

// ================================
// Memory Book
// ================================
const memorybookLink = `
https://brt-23f.pages.dev/sleigh/memory_book?api=${ensureApi()}
`;

// ================================
// Magic Mailbox
// ================================
const magicmailboxLink = `
https://brt-23f.pages.dev/sleigh/magic_mailbox?api=${ensureApi()}
`;

// ================================
// Santa Studio
// ================================
const santastudioLink = `
https://brt-23f.pages.dev/sleigh/santa_studio?api=${ensureApi()}
`;

// ================================
// Inject into UI textareas
// ================================
document.getElementById("santasleighLink").value = santasleighLink.trim();
document.getElementById("miniThermo").value = miniThermo.trim();
document.getElementById("fullThermo").value = fullThermo.trim();
document.getElementById("carouselLink").value = carouselLink.trim();
document.getElementById("addressLink").value = addressLink.trim();
document.getElementById("addressLookup").value = addressLookup.trim();
document.getElementById("niceListEmbed").value = niceListEmbed.trim();
document.getElementById("santasBeenEmbed").value = santasBeenEmbed.trim();
document.getElementById("trackerLink").value = trackerLink.trim();
document.getElementById("recommendedTracker").value = recommendedTracker.trim();
document.getElementById("trackerKioskLink").value = trackerKioskLink.trim();
document.getElementById("recommendedTrackerKiosk").value = recommendedTrackerKiosk.trim();
document.getElementById("routesLink").value = routesLink.trim();
document.getElementById("routeCardLink").value = routeCardLink.trim();
document.getElementById("recommendedRouteCard").value = recommendedRouteCard.trim();
document.getElementById("recommendedRoutes").value = recommendedRoutes.trim();
document.getElementById("snowmanFrameEmbed").value = snowmanFrameEmbed.trim();
document.getElementById("seasonWrapLink").value = seasonWrapLink.trim();
document.getElementById("godModeLink").value = godModeLink.trim();
document.getElementById("qrPosterLink").value = qrPosterLink.trim();
document.getElementById("thankYouLink").value = thankYouLink.trim();
document.getElementById("reindeerLink").value = reindeerLink.trim();
document.getElementById("crewLink").value = crewLink.trim();
document.getElementById("letterLink").value = letterLink.trim();
document.getElementById("recommendedLetter").value = recommendedLetter.trim();
document.getElementById("suggestLink").value = suggestLink.trim();
document.getElementById("elfcamLink").value = elfcamLink.trim();
document.getElementById("satnavLink").value = satnavLink.trim();
document.getElementById("beaconLink").value = beaconLink.trim();
document.getElementById("doorhangerLink").value = doorhangerLink.trim();
document.getElementById("colouringpageLink").value = colouringpageLink.trim();
document.getElementById("volunteercertLink").value = volunteercertLink.trim(); 
document.getElementById("bingoLink").value = bingoLink.trim();
document.getElementById("routeplannerLink").value = routeplannerLink.trim();
document.getElementById("countdownLink").value = countdownLink.trim();
document.getElementById("giftaidLink").value = giftaidLink.trim();
document.getElementById("memorybookLink").value = memorybookLink.trim();
document.getElementById("magicmailboxLink").value = magicmailboxLink.trim();
document.getElementById("santastudioLink").value = santastudioLink.trim();
