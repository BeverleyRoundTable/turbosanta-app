import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Play, Square, Compass, Battery, ArrowLeft,
  ExternalLink, Navigation, Volume2, VolumeX, MessageSquare, Check, Sparkles
} from 'lucide-react';

export default function DriverBeacon({ session, onBack, onQuickAnnouncement }) {
  // Mode: 'satnav' (Full Waze-style 3D Turn-by-Turn GPS Sat-Nav) | 'standby' (Low-Power Battery-Saver Beacon)
  const [cockpitMode, setCockpitMode] = useState('satnav');
  const [broadcastToast, setBroadcastToast] = useState('');

  // Standby Beacon Mode State
  const [isActive, setIsActive] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [gpsStats, setGpsStats] = useState({
    lat: null,
    lng: null,
    speedMph: 0,
    accuracyMeters: null,
    heading: null,
    roadName: 'Lapland Depot',
    lastFixTime: null,
    txCount: 0
  });

  const [batteryLevel, setBatteryLevel] = useState(null);
  const [transmissionLog, setTransmissionLog] = useState([]);
  const [audioFeedback, setAudioFeedback] = useState(true);

  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);

  const tableSlug = session?.tableId || 'beverley';
  const tableName = session?.tableName || 'Santa Sleigh';
  const satNavUrl = `/tracker.html?table=${encodeURIComponent(tableSlug)}&driver=1&auth=1`;

  // Monitor Battery
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(batt => {
        setBatteryLevel(Math.round(batt.level * 100));
        batt.addEventListener('levelchange', () => setBatteryLevel(Math.round(batt.level * 100)));
      }).catch(() => {});
    }
  }, []);

  // Audio Ping generator using Web Audio API (for standby beacon)
  const playBeaconBeep = () => {
    if (!audioFeedback) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  // Screen Wake Lock & High-Accuracy GPS Watch for Standby Mode
  useEffect(() => {
    if (cockpitMode !== 'standby' || !isActive) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      setWakeLockActive(false);
      return;
    }

    // 1. Activate Screen Wake Lock
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(lock => {
          wakeLockRef.current = lock;
          setWakeLockActive(true);
        })
        .catch(err => {
          console.warn("WakeLock couldn't be granted:", err);
          setWakeLockActive(false);
        });
    }

    // 2. High-Accuracy Continuous Watch
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, accuracy, heading } = pos.coords;
          const speedMph = speed ? Math.round(speed * 2.237) : 0;
          const accuracyMeters = Math.round(accuracy);
          const nowTime = new Date().toLocaleTimeString();

          setGpsStats(prev => ({
            lat: latitude,
            lng: longitude,
            speedMph,
            accuracyMeters,
            heading: heading ? Math.round(heading) : null,
            roadName: prev.roadName,
            lastFixTime: nowTime,
            txCount: prev.txCount + 1
          }));

          setTransmissionLog(prev => [
            `[${nowTime}] GPS FIX sent (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) • ${accuracyMeters}m acc`,
            ...prev.slice(0, 4)
          ]);

          playBeaconBeep();

          // Transmit directly to Cloudflare Edge API
          fetch(`https://turbosanta-api.beverley247.workers.dev/api/telemetry?table=${encodeURIComponent(tableSlug)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
              speed: speedMph,
              road_name: "Active Santa Route"
            })
          }).catch(e => console.warn("GPS Beacon telemetry push failed:", e));
        },
        (err) => {
          console.error("GPS Beacon error:", err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000
        }
      );
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, [cockpitMode, isActive, audioFeedback, tableSlug]);

  const triggerAnnouncement = (text) => {
    if (onQuickAnnouncement) {
      onQuickAnnouncement(text);
      setBroadcastToast(`Broadcasted: "${text}"`);
      setTimeout(() => setBroadcastToast(''), 3500);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      backgroundColor: '#0a0a09',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Open Sans, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Universal Top HUD Header */}
      <header style={{
        background: '#151513',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        zIndex: 50
      }}>
        {/* Left: Back & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Admin</span>
          </button>

          <div>
            <div className="brand-font" style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{tableName}</span>
              <span style={{ color: 'var(--primary)', fontSize: '12px' }}>• DRIVER COCKPIT</span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher Pills */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '3px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          <button
            onClick={() => setCockpitMode('satnav')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: cockpitMode === 'satnav' ? 'var(--primary)' : 'transparent',
              color: cockpitMode === 'satnav' ? '#000' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Navigation size={14} />
            <span>3D Sat-Nav & Voice</span>
          </button>

          <button
            onClick={() => setCockpitMode('standby')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: cockpitMode === 'standby' ? 'var(--primary)' : 'transparent',
              color: cockpitMode === 'standby' ? '#000' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Radio size={14} />
            <span>Battery-Saver Beacon</span>
          </button>
        </div>

        {/* Right: Actions & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
          {batteryLevel !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: batteryLevel < 20 ? '#d31c1c' : '#86efac', fontWeight: 700 }}>
              <Battery size={15} />
              <span>{batteryLevel}%</span>
            </span>
          )}

          <a
            href={satNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(251, 175, 51, 0.12)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none'
            }}
            title="Open pure fullscreen Sat-Nav in new window for dashboard phone mount"
          >
            <ExternalLink size={14} />
            <span>Mount / Full Window</span>
          </a>
        </div>
      </header>

      {/* Broadcast Toast Notification */}
      {broadcastToast && (
        <div style={{
          background: '#00e676',
          color: '#000',
          fontWeight: 800,
          fontSize: '12px',
          padding: '8px 16px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          zIndex: 60
        }}>
          <Check size={16} />
          <span>{broadcastToast}</span>
        </div>
      )}

      {/* MODE 1: FULL 3D SAT-NAV COCKPIT (Waze-style Heading-Up Navigation) */}
      {cockpitMode === 'satnav' && (
        <div style={{ flex: 1, position: 'relative', width: '100%', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
          {/* Embedded Fullscreen MapLibre 3D Turn-by-Turn GPS Tracker */}
          <iframe
            src={satNavUrl}
            title="TurboSanta Sat-Nav Turn-by-Turn Cockpit"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              flex: 1,
              background: '#151513'
            }}
            allow="geolocation; wake-lock; autoplay"
          />

          {/* Quick 1-Tap Cab Announcements Bar (Overlaid at bottom) */}
          <div style={{
            background: 'rgba(18, 18, 16, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            overflowX: 'auto',
            flexWrap: 'nowrap',
            zIndex: 40
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              📢 1-Tap Cab Alerts:
            </span>

            <button
              onClick={() => triggerAnnouncement("🎅 Ho Ho Ho! Santa has arrived on your street!")}
              style={{
                background: '#1c1c18',
                border: '1px solid #22c55e',
                color: '#86efac',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🎅 Sleigh on Street!
            </button>

            <button
              onClick={() => triggerAnnouncement("📸 Pausing for 2 minutes for photos! Come say hello!")}
              style={{
                background: '#1c1c18',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              📸 2-Min Photo Stop
            </button>

            <button
              onClick={() => triggerAnnouncement("⏳ Running 10 minutes late — don't worry, we're on our way!")}
              style={{
                background: '#1c1c18',
                border: '1px solid #d31c1c',
                color: '#fca5a5',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ⏳ 10 Mins Late
            </button>

            <button
              onClick={() => triggerAnnouncement("🏃 Moving off to the next street! Thank you for the warm welcome!")}
              style={{
                background: '#1c1c18',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🏃 Moving to Next Street
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: STANDBY BATTERY-SAVER BEACON */}
      {cockpitMode === 'standby' && (
        <div style={{
          flex: 1,
          padding: '24px 20px',
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}>
          {/* Big Giant Beacon Button */}
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <button
              onClick={() => setIsActive(!isActive)}
              style={{
                width: 'min(220px, 55vw)',
                height: 'min(220px, 55vw)',
                borderRadius: '50%',
                background: isActive
                  ? 'radial-gradient(circle, #22c55e 0%, #15803d 100%)'
                  : 'radial-gradient(circle, #d31c1c 0%, #7f1d1d 100%)',
                border: '6px solid #ffffff',
                color: '#ffffff',
                fontFamily: 'Eurostile, sans-serif',
                fontSize: '20px',
                fontWeight: 900,
                textTransform: 'uppercase',
                boxShadow: isActive
                  ? '0 0 60px rgba(34, 197, 94, 0.8), inset 0 0 20px rgba(255,255,255,0.4)'
                  : '0 0 40px rgba(211, 28, 28, 0.5), inset 0 0 20px rgba(0,0,0,0.5)',
                cursor: 'pointer',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'transform 0.15s'
              }}
            >
              {isActive ? <Square size={40} /> : <Play size={44} />}
              <span>{isActive ? "STOP BEACON" : "START BEACON"}</span>
            </button>

            <div style={{ marginTop: '14px' }}>
              <span className="brand-font" style={{
                fontSize: '16px',
                color: isActive ? '#86efac' : '#fca5a5',
                letterSpacing: '1px'
              }}>
                {isActive ? 'TRANSMITTING SANTA RADAR LIVE' : 'GPS BEACON STANDBY'}
              </span>
            </div>
          </div>

          {/* Speedometer & Stats Card */}
          <div style={{
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            textAlign: 'center',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Speed</div>
              <div className="brand-font" style={{ fontSize: '32px', color: 'var(--primary)', lineHeight: 1.1 }}>
                {gpsStats.speedMph}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MPH</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</div>
              <div className="brand-font" style={{ fontSize: '32px', color: '#fff', lineHeight: 1.1 }}>
                {gpsStats.accuracyMeters ? `±${gpsStats.accuracyMeters}` : '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>METERS</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fixes Sent</div>
              <div className="brand-font" style={{ fontSize: '32px', color: '#86efac', lineHeight: 1.1 }}>
                {gpsStats.txCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PINGS</div>
            </div>
          </div>

          {/* 1-Tap Quick Action Presets */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>
              Quick PA Alert (1-Tap Cab Broadcast):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => triggerAnnouncement("We're taking a quick 2-minute Reindeer Rest! Come wave to Santa!")}
                style={{
                  background: '#1c1c18',
                  border: '1px solid var(--primary)',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                ☕ 2-Min Reindeer Rest
              </button>

              <button
                onClick={() => triggerAnnouncement("Santa is running 10 minutes behind schedule. We're on our way!")}
                style={{
                  background: '#1c1c18',
                  border: '1px solid #d31c1c',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                ⏳ Running 10 Mins Late
              </button>
            </div>
          </div>

          {/* Transmission Log Terminal */}
          <div style={{
            background: '#0d0d0b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#86efac',
            maxHeight: '80px',
            overflowY: 'auto'
          }}>
            {transmissionLog.length > 0 ? (
              transmissionLog.map((log, i) => <div key={i}>{log}</div>)
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Ready. Press START BEACON to transmit GPS.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
