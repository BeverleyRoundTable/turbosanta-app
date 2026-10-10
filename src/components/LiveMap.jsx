import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Compass, Maximize2, Minimize2, Radio, Wrench, Sparkles, Building2, Calendar } from 'lucide-react';
import { fetchLiveGps } from '../services/api';
import WorkshopOverlay from './WorkshopOverlay';

// Dynamic route points fallback (empty by default — genuine data only)
const BEVERLEY_ROUTE_POINTS = [];

export default function LiveMap({ tableData }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [gpsData, setGpsData] = useState({
    status: "Resting in Lapland",
    lat: 52.4708,
    lng: -1.9207,
    road_name: "Round Table HQ"
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Initialize Leaflet Map with the exact OpenStreetMap style from tracker.html & address.html
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Beverley route start
    const map = L.map(mapContainerRef.current, {
      center: [53.8532, -0.4465],
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    // 🗺️ EXACT OPENSTREETMAP TILE LAYER FROM tracker.html & address.html
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 🎄 DUAL-LAYER ROUTE LINE (Gold Glow + Red Core, identical to tracker.html lines 2712-2713)
    L.polyline(BEVERLEY_ROUTE_POINTS, {
      color: "#ffd700",
      weight: 8,
      opacity: 0.55
    }).addTo(map);

    L.polyline(BEVERLEY_ROUTE_POINTS, {
      color: "#d31c1c",
      weight: 4,
      opacity: 0.95
    }).addTo(map);

    // 📍 START POINT MARKER
    const startIcon = L.icon({
      iconUrl: 'https://brt-23f.pages.dev/icons/start_icon.png',
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -40]
    });
    L.marker(BEVERLEY_ROUTE_POINTS[0], { icon: startIcon })
      .bindPopup("<b>Route Starts Here</b><br>Starts at 18:00")
      .addTo(map);

    // 🏁 END POINT MARKER
    const endIcon = L.icon({
      iconUrl: 'https://brt-23f.pages.dev/icons/end_icon.png',
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -40]
    });
    L.marker(BEVERLEY_ROUTE_POINTS[BEVERLEY_ROUTE_POINTS.length - 1], { icon: endIcon })
      .bindPopup("<b>Route Finish Point</b><br>Estimated 20:30")
      .addTo(map);

    // 🎅 SANTA SLEIGH LIVE POSITION MARKER
    const santaIcon = L.divIcon({
      className: 'custom-santa-marker',
      html: `
        <div style="position: relative; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(251, 175, 51, 0.45); animation: pulse-ring 2s infinite ease-out;"></div>
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #1D1D1A; border: 2px solid #FBAF33; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.6); z-index: 2;">
            <img src="https://brt-23f.pages.dev/icons/brt_sleigh_icon.png" style="width: 32px; height: 32px; object-fit: contain;" alt="Sleigh" onerror="this.onerror=null; this.src='https://brt-23f.pages.dev/icons/RTBI_Santa.png';" />
          </div>
        </div>
      `,
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });

    const marker = L.marker(BEVERLEY_ROUTE_POINTS[0], { icon: santaIcon }).addTo(map);

    marker.bindPopup(`
      <div style="text-align: center; padding: 6px;">
        <strong style="color: #FBAF33; font-size: 16px;">🎅 Santa's Sleigh</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #fff;">Status: Resting in Lapland</p>
      </div>
    `);

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Poll GPS Every 5 Seconds
  useEffect(() => {
    let isMounted = true;

    const pollGps = async () => {
      try {
        const data = await fetchLiveGps("beverley");
        if (!isMounted) return;

        setGpsData(data);
        setLastUpdated(new Date());

        if (data.lat && data.lng && markerRef.current) {
          const newPos = [data.lat, data.lng];
          markerRef.current.setLatLng(newPos);

          const popupContent = `
            <div style="text-align: center; padding: 6px;">
              <strong style="color: #FBAF33; font-size: 16px;">🎅 Santa Sleigh</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #fff;">
                ${data.road_name ? `📍 ${data.road_name}` : data.status || 'Resting in Lapland'}
              </p>
            </div>
          `;
          markerRef.current.setPopupContent(popupContent);
        }
      } catch (err) {
        console.warn("GPS poll error:", err);
      }
    };

    pollGps();
    const interval = setInterval(pollGps, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCenter = () => {
    if (mapInstanceRef.current && gpsData.lat && gpsData.lng) {
      mapInstanceRef.current.setView([gpsData.lat, gpsData.lng], 16, { animate: true });
      if (markerRef.current) markerRef.current.openPopup();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
  };

  const isResting = gpsData.status?.toLowerCase().includes("resting") || !gpsData.road_name;
  const table = tableData?.table || {};
  const routes = tableData?.routes || [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoute = routes.find(r => r.date === todayStr);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);

  return (
    <section id="tracker" style={{
      padding: '40px 20px 60px 20px',
      maxWidth: '1100px',
      margin: '0 auto',
      scrollMarginTop: '80px'
    }}>
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          LIVE <span style={{ color: 'var(--primary)' }}>TRACKER</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '14px' }}>
          Watch Santa's sleigh move in real-time as he visits the streets!
        </p>

        {/* Santa's Workshop Trigger Pill */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setIsWorkshopOpen(true)}
            style={{
              backgroundColor: 'rgba(251, 175, 51, 0.12)',
              border: '1px solid rgba(251, 175, 51, 0.35)',
              color: 'var(--primary)',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'Eurostile, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Wrench size={14} />
            <span>🚜 Santa's Workshop & Countdown</span>
          </button>
        </div>
      </div>

      {/* Headline Sponsor Badge (ONLY IF TABLE HAS ONE DEFINED - Zendure for Beverley, hides if null for others) */}
      {table.headline_sponsor_name && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            background: '#151513',
            border: '1px solid rgba(0,240,255,0.4)',
            padding: '6px 18px',
            borderRadius: '999px',
            boxShadow: '0 0 20px rgba(0,240,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <span style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>
              Powered by
            </span>
            {table.headline_sponsor_logo && (
              <img
                src={table.headline_sponsor_logo}
                alt={table.headline_sponsor_name}
                style={{ height: '24px', background: '#fff', padding: '2px 8px', borderRadius: '6px', objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <span style={{
              borderLeft: '1px solid #374151',
              paddingLeft: '12px',
              fontFamily: 'Eurostile, sans-serif',
              fontSize: '11px',
              color: '#00f0ff',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {table.headline_sponsor_tagline || 'Official Sponsor'}
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f0ff', display: 'inline-block' }} />
            </span>
          </div>
        </div>
      )}

      {/* Tonight's Route Sponsor Pill (If today's route has a sponsor) */}
      {todayRoute && todayRoute.sponsor_name && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            background: 'rgba(251, 175, 51, 0.1)',
            border: '1px solid rgba(251, 175, 51, 0.4)',
            borderRadius: '999px',
            padding: '6px 18px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
          }}>
            <Building2 size={15} color="var(--primary)" />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700 }}>
              Tonight's Route Sponsored by:
            </span>
            <strong style={{ fontSize: '13px', color: '#fff' }}>{todayRoute.sponsor_name}</strong>
            {todayRoute.sponsor_logo && (
              <img src={todayRoute.sponsor_logo} alt={todayRoute.sponsor_name} style={{ height: '20px', objectFit: 'contain', background: '#fff', padding: '1px 6px', borderRadius: '4px' }} />
            )}
          </div>
        </div>
      )}

      {/* Map Border Wrapper (Uses cyan electric flow for Zendure, standard golden/amber festive for other tables) */}
      <div className={table.headline_sponsor_name === 'Zendure' ? 'zendure-power-wrapper' : 'sleigh-map-wrapper'}>
        <div className={table.headline_sponsor_name === 'Zendure' ? 'zendure-power-inner' : 'sleigh-map-inner'}>
          {/* Status Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#151513',
            borderBottom: '1px solid var(--border)',
            borderRadius: '1.8rem 1.8rem 0 0',
            padding: '14px 20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isResting ? '#38bdf8' : '#22c55e',
            boxShadow: isResting ? '0 0 10px #38bdf8' : '0 0 10px #22c55e',
            animation: isResting ? 'none' : 'pulse-ring 1.5s infinite'
          }} />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>
            {isResting ? (
              <span>🎅 RESTING IN LAPLAND</span>
            ) : (
              <span style={{ color: '#22c55e' }}>🛷 ON THE MOVE: {gpsData.road_name}</span>
            )}
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>

          <button
            onClick={handleCenter}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
            title="Center on Santa"
          >
            <Compass size={16} />
            <span>Center</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Map Container with Authentic OpenStreetMap Look */}
      <div style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : '560px',
        zIndex: isFullscreen ? 99999 : 1,
        borderRadius: isFullscreen ? '0' : '0 0 16px 16px',
        overflow: 'hidden',
        border: isFullscreen ? 'none' : '1px solid var(--border)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.7)'
      }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Map Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(21, 21, 19, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 14px',
          fontSize: '12px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ffffff'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '4px', background: '#d31c1c', border: '1px solid #ffd700', borderRadius: '2px', display: 'inline-block' }}></span>
            <span>Tonight's Route</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Radio size={14} color="var(--primary)" />
            <span>Live Beacon Active</span>
          </span>
        </div>
      </div>
      {/* End of inner and outer map wrappers */}
        </div>
      </div>

      {/* Santa's Workshop Countdown & MOT Maintenance Overlay */}
      <WorkshopOverlay
        isOpen={isWorkshopOpen}
        onClose={() => setIsWorkshopOpen(false)}
        routes={routes}
        tableData={tableData}
      />
    </section>
  );
}
