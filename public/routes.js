function startRoutes() {

    /* ===== Detect API from URL ===== */
    const params = new URLSearchParams(window.location.search);
    const apiBase = params.get("api");

    if (!apiBase) {
        console.error("❌ No API provided. Use ?api=YOUR_SCRIPT_URL");
        return;
    }

    const ROUTES_URL = apiBase + "?function=getRoutes";

    /* ===== Inject styling and Leaflet if missing ===== */
    if (!document.getElementById("santa-routes-style")) {
        const style = document.createElement("style");
        style.id = "santa-routes-style";
        style.textContent = `
            /* Your full CSS unchanged */
            .santa-route-map-container {
                width: 100%;
                height: 300px;
                border-radius: 10px;
                border: 1px solid var(--border);
                box-shadow: 0 12px 30px rgba(0,0,0,0.5);
                overflow: hidden;
            }
        `;
        document.head.appendChild(style);
    }

    // Inject Leaflet CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
        const leafletCss = document.createElement('link');
        leafletCss.rel = 'stylesheet';
        leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCss);
    }

    // Inject Leaflet JS
    if (!window.L) {
        const leafletJs = document.createElement('script');
        leafletJs.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(leafletJs);
    }

    const tonightEl = document.getElementById("tonights-route");
    const allEl = document.getElementById("all-routes");

    if (!tonightEl || !allEl) {
        return setTimeout(startRoutes, 200);
    }

    console.log("ROUTES: Using API → " + ROUTES_URL);

    /* ===== Friendly Date Formatter ===== */
    function formatDate(d) {
        const date = new Date(d);
        if (isNaN(date)) return d;
        return date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    (async function () {
        try {
            const res = await fetch(ROUTES_URL);
            const data = await res.json();
            const routes = (data.routes || []).slice();

            if (!routes.length) {
                tonightEl.innerHTML =
                    '<p style="text-align:center; color: var(--text-dim); padding: 24px;">No sleigh routes added yet. 🎅</p>';
                return;
            }

            /* Sort routes by date */
            routes.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

            const todayIso = new Date().toISOString().slice(0, 10);

            let tonight = routes.find(r => r.date === todayIso);
            let next = tonight || routes.find(r => r.date >= todayIso);

            /* TONIGHT OR NEXT ROUTE */
            if (next) {
                const isTonight = next.date === todayIso;
                const title = isTonight
                    ? "Tonight's Sleigh Route"
                    : "Next Sleigh Route";

                tonightEl.innerHTML =
                    `<h2 class="santa-section-title">${title}</h2>` +
                    createRouteCard(next, true);
            }

            // subtle pulse on featured route
            setTimeout(() => {
                const card = tonightEl.querySelector(".santa-route-card");
                if (card) {
                    card.classList.add("pulse");
                    setTimeout(() => card.classList.remove("pulse"), 1400);
                }
            }, 120);

            /* Divider */
            allEl.insertAdjacentHTML("beforebegin", `
                <h2 class="santa-section-title">📜 Full Route List</h2>
            `);

            /* Full route list */
            allEl.innerHTML = routes.map(r => createRouteCard(r, false)).join("");

            /* Initialize Mini Maps after DOM is updated */
            setTimeout(() => initMiniMaps(routes), 500);

        } catch (err) {
            console.error(err);
            tonightEl.innerHTML =
                '<p style="text-align:center; color: var(--red); padding: 24px;">Sorry — could not load sleigh routes.</p>';
        }
    })();

    /* --- CARD BUILDER --- */
    function createRouteCard(route, highlight) {
        const name = route.routeName || "";
        const safeNameId = name.replace(/\s+/g, '-').toLowerCase() || Math.random().toString(36).substring(7);
        
        // Fix: Make the Map ID unique so Leaflet can render duplicates
        const uniqueMapId = highlight ? `map-featured-${safeNameId}` : `map-list-${safeNameId}`;

        const dateLabel = formatDate(route.date); 
        const startTime = route["Start Time"] || "";
        const endTime = route["End Time"] || "";
        const timeStr = startTime ? ` · ${startTime}–${endTime}` : "";
        const notes = route.notes || "";
        const streets = route.streets || "";
        const gpx = route.gpxUrl || "";
        const sponsor = route.sponsorurl || route.sponsorUrl || "";

        return `
<article class="santa-route-card ${highlight ? "santa-route-card--highlight" : ""}">
    <div class="santa-route-main">
        <div class="santa-route-text">
            <h3 class="santa-route-name">${name}</h3>
            <p class="santa-route-date">📅 ${dateLabel}${timeStr}</p>
            ${notes ? `<p>${notes}</p>` : ""}
            ${streets ? `<p><strong>Streets:</strong> ${streets}</p>` : ""}
        </div>
        ${gpx ? `<div class="santa-route-map"><div id="${uniqueMapId}" class="santa-route-map-container" data-gpx="${gpx}"></div></div>` : ""}
    </div>

    ${sponsor ? `
    <div class="santa-route-sponsor">
        Proudly sponsored by<br>
        <img src="${sponsor}">
    </div>` : ""}
</article>`;
    }

    /* --- MAP INITIALIZER --- */
    function initMiniMaps(routes) {
        // Ensure Leaflet is fully loaded before firing
        if (!window.L) {
            setTimeout(() => initMiniMaps(routes), 200);
            return;
        }

        const mapContainers = document.querySelectorAll('.santa-route-map-container');
        
        // Define custom icons mimicking the exact logic from address.js
        const startIcon = L.icon({ 
            iconUrl: "https://i.ibb.co/PzDYmwzZ/Santa-Marker-4.png", 
            iconSize: [48, 48], 
            iconAnchor: [24, 48],
            shadowUrl: null // Explicitly disable shadow
        });
        
        const endIcon = L.icon({ 
            iconUrl: "https://i.ibb.co/39WF0kBd/Santa-Marker-5.png", 
            iconSize: [48, 48], 
            iconAnchor: [24, 48],
            shadowUrl: null // Explicitly disable shadow
        });

        mapContainers.forEach(async (container) => {
            const gpxUrl = container.getAttribute('data-gpx');
            if (!gpxUrl) return;

            // Initialize map
            const map = L.map(container.id, {
                zoomControl: true,
                scrollWheelZoom: false // Prevent page scrolling from getting stuck on the map
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { 
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            try {
                // Fetch the GPX file directly
                const res = await fetch(gpxUrl, { cache: "no-store" });
                if (!res.ok) throw new Error("Failed to fetch GPX");
                const text = await res.text();

                // Parse XML
                const xml = new DOMParser().parseFromString(text, "text/xml");
                const pts = [...xml.getElementsByTagName("trkpt")];
                if (pts.length < 2) return;

                // Extract coordinates
                const latLngs = pts.map(p => [
                    parseFloat(p.getAttribute("lat")),
                    parseFloat(p.getAttribute("lon"))
                ]);

                // Draw the red route line
                const routeLine = L.polyline(latLngs, { color: "#d31c1c", weight: 4, opacity: 0.95 }).addTo(map);

                // Auto-center and zoom the map to fit the route perfectly
                map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });

                // Drop the pins
                L.marker(latLngs[0], { icon: startIcon }).addTo(map);
                L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(map);

            } catch (err) {
                console.error("Map rendering error:", err);
            }
        });
    }
}

setTimeout(startRoutes, 100);
