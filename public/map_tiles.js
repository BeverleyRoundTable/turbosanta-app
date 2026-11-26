/**
 * TurboMapTiles — Shared 3-Tier Map Tile Layer Helper (Classic Scripts)
 *
 * Tier 1 (Primary — UK & Ireland): Self-hosted Protomaps v4 uk.pmtiles on Cloudflare R2
 * Tier 2 (Fallback #1 + Outside UK/Ireland e.g. Lapland): CARTO Voyager (@2x CDN)
 * Tier 3 (Last-Resort Fallback #2): Canonical single-host OpenStreetMap (tile.openstreetmap.org)
 */
(function (global) {
  'use strict';

  var WORKER_MAPS_URL = 'https://turbosanta-api.beverley247.workers.dev/maps/uk.pmtiles';
  var _probePromise = null;

  function resolvePmtilesUrl() {
    var h = (typeof location !== 'undefined' && location.hostname) ? location.hostname.toLowerCase() : '';
    if (h === 'roundtablesantasleigh.co.uk' || h.endsWith('.roundtablesantasleigh.co.uk')) {
      return '/maps/uk.pmtiles';
    }
    return WORKER_MAPS_URL;
  }

  function isInsideUkIreland(latlng) {
    if (!latlng) return false;
    var lat = typeof latlng.lat === 'number' ? latlng.lat : Number(latlng[0]);
    var lng = typeof latlng.lng === 'number' ? latlng.lng : Number(latlng[1]);
    if (!isFinite(lat) || !isFinite(lng)) return false;
    return lat >= 49.0 && lat <= 61.0 && lng >= -11.0 && lng <= 2.2;
  }

  function probeR2(pmtilesUrl) {
    var url = pmtilesUrl || resolvePmtilesUrl();
    if (_probePromise) return _probePromise;
    _probePromise = (function () {
      try {
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 4000) : null;
        return fetch(url, {
          method: 'HEAD',
          signal: ctrl ? ctrl.signal : undefined
        }).then(function (res) {
          if (timer) clearTimeout(timer);
          if (!res || !res.ok) return false;
          var ar = res.headers && res.headers.get ? (res.headers.get('accept-ranges') || '').toLowerCase() : '';
          return ar !== 'none';
        }).catch(function () {
          if (timer) clearTimeout(timer);
          return false;
        });
      } catch (_) {
        return Promise.resolve(false);
      }
    })();
    return _probePromise;
  }

  function createR2Layer(opts) {
    if (typeof global.protomapsL === 'undefined' || typeof global.protomapsL.leafletLayer !== 'function') {
      return null;
    }
    var o = opts || {};
    return global.protomapsL.leafletLayer({
      url: o.pmtilesUrl || resolvePmtilesUrl(),
      flavor: o.flavor || 'light',
      lang: 'en',
      maxDataZoom: o.maxDataZoom || 15,
      maxZoom: o.maxZoom || 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &middot; <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>'
    });
  }

  function createCartoLayer(opts) {
    var o = opts || {};
    return global.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: o.maxZoom || 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
    });
  }

  function createOsmLayer(opts) {
    var o = opts || {};
    return global.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: o.maxZoom || 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    });
  }

  function attachBaseLayer(map, opts) {
    if (!map || typeof global.L === 'undefined') return null;
    if (map._turboBaseTilesHandle) return map._turboBaseTilesHandle;

    var o = opts || {};
    var pmtilesUrl = o.pmtilesUrl || resolvePmtilesUrl();
    var r2Layer = createR2Layer({ pmtilesUrl: pmtilesUrl, flavor: o.flavor, maxDataZoom: o.maxDataZoom, maxZoom: o.maxZoom });
    var cartoLayer = createCartoLayer(o);
    var osmLayer = createOsmLayer(o);

    var r2Healthy = Boolean(r2Layer);
    var cartoHealthy = true;
    var manualOverride = false;
    var internalSwap = false;
    var activeTier = null;
    var activeLayer = null;

    function getMapInsideUk() {
      try {
        var c = map.getCenter();
        if (c) return isInsideUkIreland(c);
      } catch (_) {}
      return true;
    }

    function setTier(tier) {
      var target = tier === 'r2' ? r2Layer : (tier === 'osm' ? osmLayer : cartoLayer);
      if (!target) target = cartoLayer;
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
        activeTier = (target === r2Layer) ? 'r2' : ((target === osmLayer) ? 'osm' : 'carto');
      } finally {
        internalSwap = false;
      }
    }

    function syncBounds() {
      if (manualOverride) return;
      if (r2Layer && r2Healthy && getMapInsideUk()) {
        setTier('r2');
      } else if (cartoHealthy) {
        setTier('carto');
      } else {
        setTier('osm');
      }
    }

    // Track sliding-window tile errors for automatic graceful fallback
    var r2Errors = [];
    if (r2Layer) {
      r2Layer.on('tileerror', function () {
        var now = Date.now();
        r2Errors = r2Errors.filter(function (ts) { return now - ts < 10000; });
        r2Errors.push(now);
        if (r2Errors.length >= 4 && r2Healthy) {
          r2Healthy = false;
          if (!manualOverride && activeTier === 'r2') {
            setTier(cartoHealthy ? 'carto' : 'osm');
          }
        }
      });
    }

    var cartoErrors = [];
    cartoLayer.on('tileerror', function () {
      var now = Date.now();
      cartoErrors = cartoErrors.filter(function (ts) { return now - ts < 10000; });
      cartoErrors.push(now);
      if (cartoErrors.length >= 4 && cartoHealthy) {
        cartoHealthy = false;
        if (!manualOverride && activeTier === 'carto') {
          setTier('osm');
        }
      }
    });

    // Mount Tier 1 immediately if inside UK & Ireland and protomapsL is available, else Tier 2
    if (r2Layer && r2Healthy && getMapInsideUk()) {
      setTier('r2');
    } else {
      setTier('carto');
    }

    // Probe R2 in background; downgrade cleanly if uk.pmtiles is unavailable or rejects range
    if (r2Layer) {
      probeR2(pmtilesUrl).then(function (ok) {
        if (!ok) {
          r2Healthy = false;
          if (!manualOverride && activeTier === 'r2') {
            setTier(cartoHealthy ? 'carto' : 'osm');
          }
        }
      });
    }

    map.on('moveend', syncBounds);

    var layerControl = null;
    if (o.layerControl === true && global.L && typeof global.L.control.layers === 'function') {
      var baseLayers = {};
      if (r2Layer) baseLayers['UK Fast Map (R2)'] = r2Layer;
      baseLayers['CARTO Voyager'] = cartoLayer;
      baseLayers['Classic OSM'] = osmLayer;
      layerControl = global.L.control.layers(baseLayers, null, {
        position: o.controlPosition || 'topright'
      }).addTo(map);

      map.on('baselayerchange', function (e) {
        if (internalSwap || !e || !e.layer) return;
        activeLayer = e.layer;
        if (e.layer === r2Layer) {
          activeTier = 'r2';
          manualOverride = !getMapInsideUk();
        } else if (e.layer === cartoLayer) {
          activeTier = 'carto';
          manualOverride = true;
        } else if (e.layer === osmLayer) {
          activeTier = 'osm';
          manualOverride = true;
        }
      });
    }

    var handle = {
      getTier: function () { return activeTier; },
      r2Layer: r2Layer,
      cartoLayer: cartoLayer,
      osmLayer: osmLayer,
      layerControl: layerControl,
      syncBounds: syncBounds
    };
    map._turboBaseTilesHandle = handle;
    return handle;
  }

  global.TurboMapTiles = {
    get PMTILES_URL() { return resolvePmtilesUrl(); },
    isInsideUkIreland: isInsideUkIreland,
    probeR2: probeR2,
    createR2Layer: createR2Layer,
    createCartoLayer: createCartoLayer,
    createOsmLayer: createOsmLayer,
    attachBaseLayer: attachBaseLayer
  };
})(typeof window !== 'undefined' ? window : this);
