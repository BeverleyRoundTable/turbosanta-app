function startRoutes() {

    /* ===== Detect API or Table from URL ===== */
    const params = new URLSearchParams(window.location.search);
    const apiBase = params.get("api");
    const hostSubMatch = (window.location.hostname || "").match(/^([a-z0-9-]+)\.roundtablesantasleigh\.co\.uk$/i);
    const hostSub = (hostSubMatch && !["www", "api", "admin", "demo", "turbosanta"].includes(hostSubMatch[1].toLowerCase())) ? hostSubMatch[1].toLowerCase() : "";
    const tableSlug = (params.get("table") || window.__TURBOSANTA_TABLE__ || hostSub || "beverley").toLowerCase().trim();
    const WORKER_ROUTES_URL = `https://turbosanta-api.beverley247.workers.dev/api/payload?table=${encodeURIComponent(tableSlug)}`;
    const ROUTES_URL = apiBase ? (apiBase + (apiBase.includes("?") ? "&" : "?") + "function=getRoutes") : WORKER_ROUTES_URL;

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
            let res = await fetch(ROUTES_URL);
            const ct = (res.headers.get("content-type") || "").toLowerCase();
            if ((!res.ok || !ct.includes("json")) && ROUTES_URL !== WORKER_ROUTES_URL) {
                res = await fetch(WORKER_ROUTES_URL);
            }
            const data = await res.json();
            const rawStreets = Array.isArray(data.streets) ? data.streets : [];
            const streetsByRoute = {};
            rawStreets.forEach(st => {
                const key = String(st.route_id || st.routeName || st.name || "").trim();
                const sName = String(st.street_name || st.street || "").trim();
                if (!key || !sName) return;
                if (!streetsByRoute[key]) streetsByRoute[key] = [];
                if (!streetsByRoute[key].includes(sName)) streetsByRoute[key].push(sName);
            });
            const routes = (data.routes || []).map(r => {
                const rName = r.routeName || r.name || "";
                const joinedStreets = (streetsByRoute[String(r.id || "")] || streetsByRoute[rName] || []).join(", ");
                return {
                    ...r,
                    routeName: rName,
                    streets: r.streets || joinedStreets,
                    gpxUrl: r.gpxUrl || r.gpx_url || "",
                    sponsorUrl: r.sponsorurl || r.sponsorUrl || r.sponsor_logo_url || r.sponsor_logo || ""
                };
            });

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
        const startTime = route["Start Time"] || route.start_time || route.startTime || "";
        const endTime = route["End Time"] || route.end_time || route.endTime || "";
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
            iconUrl: "/icons/start_icon.png", 
            iconSize: [48, 48], 
            iconAnchor: [24, 48],
            shadowUrl: null // Explicitly disable shadow
        });
        
        const endIcon = L.icon({ 
            iconUrl: "/icons/end_icon.png", 
            iconSize: [48, 48], 
            iconAnchor: [24, 48],
            shadowUrl: null // Explicitly disable shadow
        });

        const initCardMap = async (container) => {
            if (!container || container.dataset.mapInit === '1') return;
            container.dataset.mapInit = '1';

            const gpxUrl = container.getAttribute('data-gpx');
            if (!gpxUrl) return;

            // Initialize map
            const map = L.map(container.id, {
                zoomControl: true,
                scrollWheelZoom: false // Prevent page scrolling from getting stuck on the map
            });

            let baseTilesAttached = false;
            const ensureBaseTiles = () => {
                if (baseTilesAttached) return;
                baseTilesAttached = true;
                if (window.TurboMapTiles) {
                    window.TurboMapTiles.attachBaseLayer(map, { maxZoom: 19 });
                } else {
                    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
                        maxZoom: 19,
                        attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Esri, TomTom, Garmin, FAO, NOAA, USGS'
                    }).addTo(map);
                }
            };

            try {
                // Fetch the GPX file directly
                const res = await fetch(gpxUrl, { cache: "no-store" });
                if (!res.ok) throw new Error("Failed to fetch GPX");
                const text = await res.text();

                // Parse XML
                const xml = new DOMParser().parseFromString(text, "text/xml");
                const pts = [...xml.getElementsByTagName("trkpt")];
                const wpts = [...xml.getElementsByTagName("wpt")];
                if (pts.length < 2) {
                    const stopPts = (wpts.length > 0 ? wpts : pts)
                        .map(p => [parseFloat(p.getAttribute("lat")), parseFloat(p.getAttribute("lon"))])
                        .filter(c => !isNaN(c[0]) && !isNaN(c[1]));
                    if (stopPts.length === 0) return;
                    stopPts.forEach(c => L.marker(c, { icon: startIcon }).addTo(map));
                    if (stopPts.length === 1) map.setView(stopPts[0], 15);
                    else map.fitBounds(stopPts, { padding: [20, 20] });
                    ensureBaseTiles();
                    return;
                }

                // Extract coordinates
                const latLngs = pts.map(p => [
                    parseFloat(p.getAttribute("lat")),
                    parseFloat(p.getAttribute("lon"))
                ]);

                // Draw the red route line
                const routeLine = L.polyline(latLngs, { color: "#d31c1c", weight: 4, opacity: 0.95 }).addTo(map);

                // Auto-center and zoom the map to fit the route perfectly
                map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
                ensureBaseTiles();

                // Drop the pins
                L.marker(latLngs[0], { icon: startIcon }).addTo(map);
                L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(map);

            } catch (err) {
                console.error("Map rendering error:", err);
                ensureBaseTiles();
            }
        };

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        io.unobserve(entry.target);
                        initCardMap(entry.target);
                    }
                });
            }, { rootMargin: '250px' });
            mapContainers.forEach((container) => io.observe(container));
        } else {
            mapContainers.forEach(initCardMap);
        }
    }
}

setTimeout(startRoutes, 100);
