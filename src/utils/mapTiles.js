/**
 * Shared 3-Tier Map Tile Layer Helper (React / ESM)
 *
 * Tier 1 (Primary — UK & Ireland): Self-hosted Protomaps v4 uk.pmtiles on Cloudflare R2
 * Tier 2 (Fallback #1 + Outside UK/Ireland e.g. Lapland): Esri World Street Map
 * Tier 3 (Last-Resort Fallback #2): Canonical single-host OpenStreetMap (tile.openstreetmap.org)
 */
import L from 'leaflet';
import { leafletLayer as createProtomapsLeafletLayer } from 'protomaps-leaflet';

const WORKER_MAPS_URL = 'https://turbosanta-api.beverley247.workers.dev/maps/uk.pmtiles';
const ESRI_STREET_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTR = 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Esri, TomTom, Garmin, FAO, NOAA, USGS';
let _probePromise = null;

export function resolvePmtilesUrl() {
  const h = (typeof location !== 'undefined' && location.hostname) ? location.hostname.toLowerCase() : '';
  if (h === 'roundtablesantasleigh.co.uk' || h.endsWith('.roundtablesantasleigh.co.uk')) {
    return '/maps/uk.pmtiles';
  }
  return WORKER_MAPS_URL;
}

export function isInsideUkIreland(latlng) {
  if (!latlng) return false;
  const lat = typeof latlng.lat === 'number' ? latlng.lat : Number(latlng[0]);
  const lng = typeof latlng.lng === 'number' ? latlng.lng : Number(latlng[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 49.0 && lat <= 61.0 && lng >= -11.0 && lng <= 2.2;
}

export function probeR2(pmtilesUrl) {
  const url = pmtilesUrl || resolvePmtilesUrl();
  if (_probePromise) return _probePromise;
  _probePromise = (async () => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch {} }, 4000) : null;
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        signal: ctrl ? ctrl.signal : undefined
      });
      if (!res || !res.ok) return false;
      const ar = (res.headers?.get('accept-ranges') || '').toLowerCase();
      return ar !== 'none';
    } catch {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();
  return _probePromise;
}

export function createR2Layer(opts = {}) {
  return createProtomapsLeafletLayer({
    url: opts.pmtilesUrl || resolvePmtilesUrl(),
    flavor: opts.flavor || 'light',
    lang: 'en',
    maxDataZoom: opts.maxDataZoom || 15,
    maxZoom: opts.maxZoom || 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &middot; <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>'
  });
}

export function createEsriLayer(opts = {}) {
  return L.tileLayer(ESRI_STREET_URL, {
    maxZoom: opts.maxZoom || 19,
    attribution: ESRI_ATTR
  });
}

export const createFallbackRasterLayer = createEsriLayer;
export const createCartoLayer = createEsriLayer;

export function createOsmLayer(opts = {}) {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: opts.maxZoom || 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  });
}

export function attachBaseLayer(map, opts = {}) {
  if (!map) return null;
  if (map._turboBaseTilesHandle) return map._turboBaseTilesHandle;

  const pmtilesUrl = opts.pmtilesUrl || resolvePmtilesUrl();
  let r2Layer = null;
  try {
    r2Layer = createR2Layer({ pmtilesUrl, flavor: opts.flavor, maxDataZoom: opts.maxDataZoom, maxZoom: opts.maxZoom });
  } catch {}
  const esriLayer = createEsriLayer(opts);
  const osmLayer = createOsmLayer(opts);

  let r2Healthy = Boolean(r2Layer);
  let esriHealthy = true;
  let manualOverride = false;
  let internalSwap = false;
  let activeTier = null;
  let activeLayer = null;

  const getMapInsideUk = () => {
    try {
      const c = map.getCenter();
      if (c) return isInsideUkIreland(c);
    } catch {}
    return true;
  };

  const setTier = (tier) => {
    let target = tier === 'r2' ? r2Layer : (tier === 'osm' ? osmLayer : esriLayer);
    if (!target) target = esriLayer;
    if (activeLayer === target && map.hasLayer(target)) {
      activeTier = tier;
      return;
    }
    internalSwap = true;
    try {
      if (activeLayer && map.hasLayer(activeLayer)) {
        map.removeLayer(activeLayer);
      }
      if (!map.hasLayer(target)) {
        target.addTo(map);
      }
      activeLayer = target;
      activeTier = target === r2Layer ? 'r2' : (target === osmLayer ? 'osm' : 'esri');
    } finally {
      internalSwap = false;
    }
  };

  const syncBounds = () => {
    if (manualOverride) return;
    if (r2Layer && r2Healthy && getMapInsideUk()) {
      setTier('r2');
    } else if (esriHealthy) {
      setTier('esri');
    } else {
      setTier('osm');
    }
  };

  let r2Errors = [];
  if (r2Layer) {
    r2Layer.on('tileerror', () => {
      const now = Date.now();
      r2Errors = r2Errors.filter((ts) => now - ts < 10000);
      r2Errors.push(now);
      if (r2Errors.length >= 4 && r2Healthy) {
        r2Healthy = false;
        if (!manualOverride && activeTier === 'r2') {
          setTier(esriHealthy ? 'esri' : 'osm');
        }
      }
    });
  }

  let esriErrors = [];
  esriLayer.on('tileerror', () => {
    const now = Date.now();
    esriErrors = esriErrors.filter((ts) => now - ts < 10000);
    esriErrors.push(now);
    if (esriErrors.length >= 4 && esriHealthy) {
      esriHealthy = false;
      if (!manualOverride && activeTier === 'esri') {
        setTier('osm');
      }
    }
  });

  if (r2Layer && r2Healthy && getMapInsideUk()) {
    setTier('r2');
  } else {
    setTier('esri');
  }

  if (r2Layer) {
    probeR2(pmtilesUrl).then((ok) => {
      if (!ok) {
        r2Healthy = false;
        if (!manualOverride && activeTier === 'r2') {
          setTier(esriHealthy ? 'esri' : 'osm');
        }
      }
    });
  }

  map.on('moveend', syncBounds);

  let layerControl = null;
  if (opts.layerControl === true) {
    const baseLayers = {};
    if (r2Layer) baseLayers['UK Fast Map (R2)'] = r2Layer;
    baseLayers['Esri Street Map'] = esriLayer;
    baseLayers['Classic OSM'] = osmLayer;
    layerControl = L.control.layers(baseLayers, null, {
      position: opts.controlPosition || 'topright'
    }).addTo(map);

    map.on('baselayerchange', (e) => {
      if (internalSwap || !e?.layer) return;
      activeLayer = e.layer;
      if (e.layer === r2Layer) {
        activeTier = 'r2';
        manualOverride = !getMapInsideUk();
      } else if (e.layer === esriLayer) {
        activeTier = 'esri';
        manualOverride = true;
      } else if (e.layer === osmLayer) {
        activeTier = 'osm';
        manualOverride = true;
      }
    });
  }

  const handle = {
    getTier: () => activeTier,
    r2Layer,
    esriLayer,
    osmLayer,
    layerControl,
    syncBounds
  };
  map._turboBaseTilesHandle = handle;
  return handle;
}
