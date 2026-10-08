import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Square, Shield, Compass, Battery, Clock, Bell, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function DriverBeacon({ session, onBack, onQuickAnnouncement }) {
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

  // Monitor Battery
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(batt => {
        setBatteryLevel(Math.round(batt.level * 100));
        batt.addEventListener('levelchange', () => setBatteryLevel(Math.round(batt.level * 100)));
      }).catch(() => {});
    }
  }, []);

  // Audio Ping generator using Web Audio API
  const playBeaconBeep = () => {
    if (!audioFeedback) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  // Screen Wake Lock & High-Accuracy GPS Watch
  useEffect(() => {
    if (!isActive) {
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
          fetch(`https://turbosanta-api.beverley247.workers.dev/api/telemetry?table=${encodeURIComponent(session?.tableId || 'beverley')}`, {
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
  }, [isActive, audioFeedback]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Open Sans, sans-serif'
    }}>
      {/* Top Header */}
      <div style={{
        background: '#151513',
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} />
          <span>Exit Cockpit</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px' }}>
          {batteryLevel !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: batteryLevel < 20 ? '#d31c1c' : '#86efac' }}>
              <Battery size={16} />
              <span>{batteryLevel}%</span>
            </span>
          )}

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: wakeLockActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(211, 28, 28, 0.15)',
            border: `1px solid ${wakeLockActive ? '#22c55e' : '#d31c1c'}`,
            color: wakeLockActive ? '#86efac' : '#fca5a5',
            padding: '3px 10px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '11px'
          }}>
            <span>{wakeLockActive ? "🟢 SCREEN AWAKE" : "⚠️ WAKE LOCK OFF"}</span>
          </span>
        </div>
      </div>

      {/* Main Cockpit Body */}
      <div style={{
        flex: 1,
        padding: '24px 20px',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}>
        {/* Big Giant Beacon Button */}
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button
            onClick={() => setIsActive(!isActive)}
            style={{
              width: 'min(240px, 60vw)',
              height: 'min(240px, 60vw)',
              borderRadius: '50%',
              background: isActive
                ? 'radial-gradient(circle, #22c55e 0%, #15803d 100%)'
                : 'radial-gradient(circle, #d31c1c 0%, #7f1d1d 100%)',
              border: '6px solid #ffffff',
              color: '#ffffff',
              fontFamily: 'Eurostile, sans-serif',
              fontSize: '22px',
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
              gap: '12px',
              transition: 'transform 0.15s'
            }}
          >
            {isActive ? <Square size={44} /> : <Play size={48} />}
            <span>{isActive ? "STOP BEACON" : "START BEACON"}</span>
          </button>

          <div style={{ marginTop: '16px' }}>
            <span className="brand-font" style={{
              fontSize: '18px',
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
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          textAlign: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Speed</div>
            <div className="brand-font" style={{ fontSize: '36px', color: 'var(--primary)', lineHeight: 1.1 }}>
              {gpsStats.speedMph}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MPH</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</div>
            <div className="brand-font" style={{ fontSize: '36px', color: '#fff', lineHeight: 1.1 }}>
              {gpsStats.accuracyMeters ? `±${gpsStats.accuracyMeters}` : '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>METERS</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fixes Sent</div>
            <div className="brand-font" style={{ fontSize: '36px', color: '#86efac', lineHeight: 1.1 }}>
              {gpsStats.txCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PINGS</div>
          </div>
        </div>

        {/* 1-Tap Quick Action Presets (For driver/navigator in the cab) */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>
            Quick PA Alert (1-Tap Cab Broadcast):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => onQuickAnnouncement && onQuickAnnouncement("We're taking a quick 2-minute Reindeer Rest! Come wave to Santa!")}
              style={{
                background: '#1c1c18',
                border: '1px solid var(--primary)',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              ☕ 2-Min Reindeer Rest
            </button>

            <button
              onClick={() => onQuickAnnouncement && onQuickAnnouncement("Santa is running 10 minutes behind schedule. We're on our way!")}
              style={{
                background: '#1c1c18',
                border: '1px solid #d31c1c',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
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
          padding: '12px 14px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#86efac',
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          {transmissionLog.length > 0 ? (
            transmissionLog.map((log, i) => <div key={i}>{log}</div>)
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Ready. Press START BEACON to transmit GPS.</div>
          )}
        </div>
      </div>
    </div>
  );
}
