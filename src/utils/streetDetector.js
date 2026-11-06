/**
 * TurboSanta Fast Street Detection Engine
 *
 * Replaces slow sequential 1.1s/req Nominatim polling (~2-5 minutes per route)
 * with parallel dual-profile OSRM road-graph batch snapping + turn-aware sampling
 * + targeted gap-fill fallback (~0.2s - 0.6s per route).
 */

const CAR_SERVERS = [
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  'https://router.project-osrm.org/route/v1/driving'
];
const FOOT_SERVER = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';

const GENERIC_NON_NAMES = /^(unnamed|unnamed road|footpath|footway|cycleway|bridleway|path|track|service|service road|parking aisle|driveway|alley|steps|corridor|walkway)$/i;

const routeStreetCache = new Map();
const reverseGridCache = new Map();

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLon = (lon2 - lon1) * rad;
  const y = Math.sin(dLon) * Math.cos(lat2 * rad);
  const x =
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
    Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function cleanStreetName(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  // Filter OSM-DE foot profile crossing junction concatenations ("Road A / Road B")
  if (s.includes(' / ')) return '';
  if (GENERIC_NON_NAMES.test(s)) return '';
  return s;
}

/**
 * Smart geometry-aware sampler:
 * 1. Filters < 3m stationary GPS jitter
 * 2. Captures sharp turns (>= 32 deg after >= 12m) so short closes/cul-de-sacs aren't skipped
 * 3. Samples straight stretches every `intervalM` (default 32m)
 */
export function sampleRouteSmart(pts, intervalM = 32) {
  if (!Array.isArray(pts) || pts.length === 0) return [];
  if (pts.length === 1) return [pts[0]];

  // 1. De-jitter stationary GPS points (< 3m)
  const clean = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = clean[clean.length - 1];
    if (haversineMeters(prev[0], prev[1], pts[i][0], pts[i][1]) >= 3 || i === pts.length - 1) {
      clean.push(pts[i]);
    }
  }
  if (clean.length < 2) return [pts[0], pts[pts.length - 1]];

  // 2. Turn-aware + distance interval sampling
  const sampled = [clean[0]];
  let distSinceSample = 0;
  let lastBearing = bearingDeg(clean[0][0], clean[0][1], clean[1][0], clean[1][1]);

  for (let i = 1; i < clean.length - 1; i++) {
    const segDist = haversineMeters(clean[i - 1][0], clean[i - 1][1], clean[i][0], clean[i][1]);
    distSinceSample += segDist;

    const nextBearing = bearingDeg(clean[i][0], clean[i][1], clean[i + 1][0], clean[i + 1][1]);
    const turn = angleDiff(lastBearing, nextBearing);

    if (distSinceSample >= intervalM || (distSinceSample >= 12 && turn >= 32)) {
      sampled.push(clean[i]);
      distSinceSample = 0;
      lastBearing = nextBearing;
    }
  }

  const lastPt = clean[clean.length - 1];
  const lastSample = sampled[sampled.length - 1];
  if (lastSample[0] !== lastPt[0] || lastSample[1] !== lastPt[1]) {
    sampled.push(lastPt);
  }
  return sampled;
}

async function fetchOsrmCarBatch(coordStr, signal) {
  for (const base of CAR_SERVERS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5500);
      const onAbort = () => ctrl.abort();
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      try {
        const res = await fetch(`${base}/${coordStr}?steps=true&overview=false`, {
          signal: ctrl.signal
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.code === 'Ok') return json;
        }
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
      }
    } catch {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    }
  }
  return null;
}

async function fetchOsrmFootBatch(coordStr, signal) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const onAbort = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    try {
      const res = await fetch(`${FOOT_SERVER}/${coordStr}?steps=true&overview=false`, {
        signal: ctrl.signal
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.code === 'Ok') return json;
      }
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  }
  return null;
}

async function reverseGeocodePointCached(lat, lon, signal) {
  const gridKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (reverseGridCache.has(gridKey)) return reverseGridCache.get(gridKey);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const onAbort = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&zoom=17&addressdetails=1&countrycodes=gb,ie&email=turbosanta@beverleyroundtable.co.uk`,
        { headers: { 'Accept-Language': 'en' }, signal: ctrl.signal }
      );
      if (!res.ok) return '';
      const data = await res.json();
      const addr = data?.address || {};
      const road = cleanStreetName(
        addr.road || addr.residential || addr.pedestrian || addr.footway || addr.cycleway || addr.path || addr.street
      );
      if (road) reverseGridCache.set(gridKey, road);
      return road;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  } catch {
    return '';
  }
}

/**
 * Extract [[lat, lon], ...] from raw GPX XML text
 */
export function extractPointsFromGpxText(gpxText) {
  if (!gpxText || typeof DOMParser === 'undefined') return [];
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, 'text/xml');
  let nodes = xml.querySelectorAll('trkpt');
  if (!nodes.length) nodes = xml.querySelectorAll('rtept');
  if (!nodes.length) nodes = xml.querySelectorAll('wpt');

  const pts = [];
  nodes.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute('lat'));
    const lon = parseFloat(pt.getAttribute('lon'));
    if (!isNaN(lat) && !isNaN(lon)) pts.push([lat, lon]);
  });
  return pts;
}

/**
 * Fetch and parse GPX from URL or data URI, then run fast street detection.
 */
export async function detectStreetsFromGpxUrl(gpxUrl, options = {}) {
  if (!gpxUrl) return { streets: [], elapsedMs: 0 };
  let gpxText = '';
  const u = String(gpxUrl).trim();
  if (u.startsWith('data:')) {
    const parts = u.split(',');
    const isB64 = parts[0].includes(';base64');
    gpxText = isB64 ? decodeURIComponent(escape(atob(parts[1]))) : decodeURIComponent(parts[1]);
  } else {
    const resolved = u.startsWith('/cdn/')
      ? `https://turbosanta-api.beverley247.workers.dev${u}`
      : u;
    const res = await fetch(resolved, { cache: 'no-store', signal: options.signal });
    if (!res.ok) throw new Error(`Failed to fetch GPX (HTTP ${res.status})`);
    gpxText = await res.text();
  }
  const pts = extractPointsFromGpxText(gpxText);
  return detectStreetsFromPoints(pts, options);
}

/**
 * Fast parallel street detector along an array of [lat, lon] points.
 */
export async function detectStreetsFromPoints(pts, { forceRefresh = false, onProgress, signal } = {}) {
  const t0 = performance.now();
  if (!Array.isArray(pts) || pts.length < 2) {
    return { streets: [], elapsedMs: 0 };
  }

  const samples = sampleRouteSmart(pts, 32);
  const fingerprint = `${samples.length}:${samples[0][0].toFixed(5)},${samples[0][1].toFixed(5)}:${samples[Math.floor(samples.length / 2)][0].toFixed(5)}:${samples[samples.length - 1][0].toFixed(5)},${samples[samples.length - 1][1].toFixed(5)}`;

  if (!forceRefresh && routeStreetCache.has(fingerprint)) {
    const cached = routeStreetCache.get(fingerprint);
    if (onProgress) onProgress(100, cached.length);
    return { streets: [...cached], elapsedMs: Math.round(performance.now() - t0), cached: true };
  }

  // Split into overlapping chunks of 70 points so URL stays compact (~1.3KB) & every leg is preserved
  const CHUNK_SIZE = 70;
  const chunks = [];
  for (let start = 0; start < samples.length; start += CHUNK_SIZE - 1) {
    const slice = samples.slice(start, start + CHUNK_SIZE);
    if (slice.length >= 2) {
      chunks.push({ startIdx: start, points: slice });
    }
    if (start + CHUNK_SIZE >= samples.length) break;
  }

  const slotStreets = Array.from({ length: samples.length }, () => []);
  const slotMatched = new Array(samples.length).fill(false);
  let anyOsrmSuccess = false;
  let completedChunks = 0;

  if (onProgress) onProgress(10, 0);

  // Execute chunks with concurrency cap of 4 pairs (= up to 280 sample points / ~9km per parallel wave)
  const CONCURRENCY = 4;
  for (let c = 0; c < chunks.length; c += CONCURRENCY) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const wave = chunks.slice(c, c + CONCURRENCY);

    await Promise.all(
      wave.map(async ({ startIdx, points }) => {
        const coordStr = points.map((p) => `${p[1].toFixed(5)},${p[0].toFixed(5)}`).join(';');
        const [carRes, footRes] = await Promise.all([
          fetchOsrmCarBatch(coordStr, signal),
          fetchOsrmFootBatch(coordStr, signal)
        ]);

        if (carRes || footRes) anyOsrmSuccess = true;

        const carWps = carRes?.waypoints || [];
        const footWps = footRes?.waypoints || [];
        const carLegs = carRes?.routes?.[0]?.legs || [];
        const footLegs = footRes?.routes?.[0]?.legs || [];

        for (let i = 0; i < points.length; i++) {
          const globalIdx = startIdx + i;
          const cw = carWps[i];
          const fw = footWps[i];
          const cName = cleanStreetName(cw?.name);
          const fName = cleanStreetName(fw?.name);
          const cDist = cw?.distance ?? Infinity;
          const fDist = fw?.distance ?? Infinity;

          if (cDist <= 18) {
            slotMatched[globalIdx] = true;
            if (cName) slotStreets[globalIdx].push(cName);
          } else if (fDist <= 18 && fName) {
            slotMatched[globalIdx] = true;
            slotStreets[globalIdx].push(fName);
          } else if (cDist <= 26 && cName) {
            slotMatched[globalIdx] = true;
            slotStreets[globalIdx].push(cName);
          } else if (fDist <= 24 && fName) {
            slotMatched[globalIdx] = true;
            slotStreets[globalIdx].push(fName);
          }

          if (i < points.length - 1) {
            const directDist = haversineMeters(
              points[i][0],
              points[i][1],
              points[i + 1][0],
              points[i + 1][1]
            );
            const cLeg = carLegs[i];
            const fLeg = footLegs[i];

            if (cLeg && cLeg.distance <= directDist * 1.35 + 20) {
              (cLeg.steps || []).forEach((st) => {
                const n = cleanStreetName(st.name);
                if (n) slotStreets[globalIdx].push(n);
              });
            } else if (cDist > 18 && fLeg && fLeg.distance <= directDist * 1.35 + 20) {
              (fLeg.steps || []).forEach((st) => {
                const n = cleanStreetName(st.name);
                if (n) slotStreets[globalIdx].push(n);
              });
            }
          }
        }

        completedChunks++;
        if (onProgress) {
          const pct = Math.min(92, Math.round((completedChunks / chunks.length) * 85) + 10);
          onProgress(pct, 0);
        }
      })
    );
  }

  // Targeted gap-fill for brand-new private/unmapped housing estate stretches (>= 55m unmatched)
  if (anyOsrmSuccess) {
    const gapMidpoints = [];
    let gapStart = -1;
    let gapDist = 0;

    for (let i = 0; i < samples.length; i++) {
      if (!slotMatched[i]) {
        if (gapStart === -1) {
          gapStart = i;
          gapDist = 0;
        } else {
          gapDist += haversineMeters(
            samples[i - 1][0],
            samples[i - 1][1],
            samples[i][0],
            samples[i][1]
          );
        }
      } else if (gapStart !== -1) {
        if (gapDist >= 55 || i - gapStart >= 3) {
          gapMidpoints.push(Math.floor((gapStart + i - 1) / 2));
        }
        gapStart = -1;
        gapDist = 0;
      }
    }
    if (gapStart !== -1 && (gapDist >= 55 || samples.length - gapStart >= 3)) {
      gapMidpoints.push(Math.floor((gapStart + samples.length - 1) / 2));
    }

    const cappedGaps = gapMidpoints.slice(0, 5);
    for (let g = 0; g < cappedGaps.length; g++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const idx = cappedGaps[g];
      const road = await reverseGeocodePointCached(samples[idx][0], samples[idx][1], signal);
      if (road) slotStreets[idx].push(road);
      if (g < cappedGaps.length - 1) {
        await new Promise((r) => setTimeout(r, 1050));
      }
    }
  } else {
    // Full fallback if OSRM servers are completely unreachable
    const fallbackSamples = sampleRouteSmart(pts, 75);
    for (let i = 0; i < fallbackSamples.length; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const road = await reverseGeocodePointCached(fallbackSamples[i][0], fallbackSamples[i][1], signal);
      if (road) slotStreets[Math.min(i, slotStreets.length - 1)].push(road);
      if (onProgress) onProgress(Math.round(((i + 1) / fallbackSamples.length) * 95), 0);
      if (i < fallbackSamples.length - 1) {
        await new Promise((r) => setTimeout(r, 1050));
      }
    }
  }

  // Flatten slots in exact route traversal order & deduplicate case-insensitively
  const seen = new Set();
  const streets = [];
  for (let i = 0; i < slotStreets.length; i++) {
    for (const name of slotStreets[i]) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        streets.push(name);
      }
    }
  }

  if (streets.length > 0) {
    routeStreetCache.set(fingerprint, streets);
  }
  if (onProgress) onProgress(100, streets.length);

  return {
    streets,
    elapsedMs: Math.round(performance.now() - t0),
    cached: false
  };
}
