import React, { useState, useEffect } from 'react';
import { X, Printer, Share2, Copy, Check, Phone, Shield, Clock, MapPin, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PrintRouteSheetModal({
  isOpen,
  onClose,
  route,
  streets = [],
  volunteers = [],
  table = {},
  tableName = 'Round Table',
  tableSlug = 'beverley'
}) {
  // Helper to extract or calculate default muster time (15 mins before start time)
  const calculateDefaultMuster = (startTime) => {
    if (!startTime) return '17:45';
    const parts = startTime.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) - 15;
      if (m < 0) {
        m += 60;
        h -= 1;
      }
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '17:45';
  };

  const getInitialMeta = (r) => {
    let point = r?.meeting_point || '';
    let muster = r?.muster_time || '';
    if (r?.notes) {
      const match = r.notes.match(/<!--\s*ROUTE_META:\s*({.*?})\s*-->/s);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          if (!point && parsed.meeting_point) point = parsed.meeting_point;
          if (!muster && parsed.muster_time) muster = parsed.muster_time;
        } catch(e) {}
      }
    }
    return {
      meetingLocation: point || table?.default_muster_point || 'Depot / Pavilion Car Park',
      musterTime: muster || table?.default_muster_time || calculateDefaultMuster(r?.start_time)
    };
  };

  const initialMeta = getInitialMeta(route);
  const [leadMarshal, setLeadMarshal] = useState('');
  const [towDriver, setTowDriver] = useState('');
  const [meetingLocation, setMeetingLocation] = useState(initialMeta.meetingLocation);
  const [musterTime, setMusterTime] = useState(initialMeta.musterTime);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !route) return;
    const meta = getInitialMeta(route);
    setMeetingLocation(meta.meetingLocation);
    setMusterTime(meta.musterTime);

    const rName = String(route.name || '').trim().toLowerCase();
    const routeVols = (volunteers || []).filter(v => {
      const vr = String(v.route_name || v.RouteName || '').trim().toLowerCase();
      return !rName || vr === rName || vr.includes(rName) || rName.includes(vr);
    });
    const pool = routeVols.length > 0 ? routeVols : (volunteers || []);
    const formatVol = (v) => {
      if (!v) return '';
      const name = String(v.name || v['Volunteer Name'] || '').trim();
      const phone = String(v.phone || v['Phone'] || '').trim();
      if (name && phone) return `${name} (${phone})`;
      return name || phone || '';
    };
    const marshalVol = pool.find(v => /marshal|lead|head|organi[sz]er|coordinator|chair/i.test(String(v.role || v.Role || '')));
    const driverVol = pool.find(v => /driver|tow|vehicle|tractor/i.test(String(v.role || v.Role || '')));
    setLeadMarshal(formatVol(marshalVol));
    setTowDriver(formatVol(driverVol));
  }, [isOpen, route?.id, route?.name, volunteers]);

  if (!isOpen || !route) return null;

  // Compute full domain and clean subdomain URLs
  const cleanSlug = String(tableSlug || 'beverley').trim().toLowerCase();
  const townOrigin = `https://${cleanSlug}.roundtablesantasleigh.co.uk`;
  const townHost = `${cleanSlug}.roundtablesantasleigh.co.uk`;
  const cockpitUrl = `${townOrigin}/tracker?driver=1`;
  const cockpitDisplayText = `${townHost}/tracker?driver=1`;
  const trackerUrl = townOrigin;
  const trackerDisplayText = townHost;
  const beaconUrl = `${townOrigin}/beacon`;

  // Parse street list safely
  const streetList = (streets && streets.length > 0)
    ? streets.map(s => typeof s === 'string' ? s : (s.street_name || s.name)).filter(Boolean)
    : (route.streets && route.streets.length > 0)
      ? route.streets.map(s => typeof s === 'string' ? s : (s.street_name || s.name)).filter(Boolean)
      : [];

  // Format date nicely
  let dateFormatted = route.date || 'Tonight';
  try {
    if (route.date) {
      const d = new Date(route.date + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        dateFormatted = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
  } catch (e) {}

  const handlePrint = () => {
    const printArea = document.getElementById('route-sheet-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${(tableName || 'Round Table').toUpperCase()} Santa Sleigh - Run Sheet - ${route.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 10px;
              background: #ffffff !important;
              color: #111827 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.35;
            }
            @media print {
              body { padding: 0 !important; }
              .mobile-print-bar { display: none !important; }
            }
            .mobile-print-bar {
              display: flex;
              gap: 10px;
              margin-bottom: 14px;
              padding-bottom: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            .btn-print {
              background: #d31c1c;
              color: #ffffff;
              border: none;
              padding: 10px 18px;
              border-radius: 8px;
              font-weight: 700;
              font-size: 14px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
            }
            .btn-close {
              background: #f3f4f6;
              color: #111827;
              border: 1px solid #d1d5db;
              padding: 10px 14px;
              border-radius: 8px;
              font-size: 14px;
              cursor: pointer;
            }
            .route-sheet-print-card {
              width: 100%;
              max-width: 820px;
              margin: 0 auto;
              background: #ffffff;
              color: #111827;
              padding: 0;
            }
            .sheet-header-flex {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #111827;
              padding-bottom: 8px;
              margin-bottom: 10px;
              gap: 12px;
            }
            .sheet-contact-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              background: #f3f4f6;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 10px;
              font-size: 10.5px;
            }
            @media screen and (max-width: 600px) {
              .sheet-contact-grid {
                grid-template-columns: 1fr 1fr;
              }
            }
            .sheet-table-wrap {
              width: 100%;
              overflow: visible;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10.5px;
              border: 1.5px solid #111827;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 4px 8px;
            }
            th {
              background: #111827 !important;
              color: #ffffff !important;
            }
            .sheet-handover-grid {
              display: grid;
              grid-template-columns: 1.3fr 1fr;
              gap: 12px;
              margin-top: 10px;
              border-top: 1.5px solid #111827;
              padding-top: 8px;
              page-break-inside: avoid;
            }
            @media screen and (max-width: 600px) {
              .sheet-handover-grid {
                grid-template-columns: 1fr;
              }
            }
            a {
              color: #1d4ed8;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="mobile-print-bar">
            <button class="btn-print" onclick="window.print()">🖨️ Tap to Print / Save PDF</button>
            <button class="btn-close" onclick="window.close()">✕ Close</button>
          </div>
          <div class="route-sheet-print-card">
            ${printArea.innerHTML}
          </div>
          <script>
            function triggerPrint() {
              setTimeout(function() {
                try { window.print(); } catch(e) {}
              }, 350);
            }
            if (document.readyState === 'complete') {
              triggerPrint();
            } else {
              window.addEventListener('load', triggerPrint);
            }
          </script>
        </body>
      </html>
    `;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth <= 820);

    if (isMobile) {
      // Mobile browsers (iOS Safari & Android Chrome) cannot print from invisible iframes.
      // Opening a clean window/tab triggers the native mobile AirPrint / Print dialog directly.
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch(e) {}
        }, 500);
        return;
      }
    }

    // Desktop: Use invisible iframe for seamless in-page printing
    let printIframe = document.getElementById('print-manifest-iframe');
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'print-manifest-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.style.visibility = 'hidden';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentDocument || printIframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print fallback to window.print():', err);
        window.print();
      }
    }, 250);
  };

  const handleCopyWhatsApp = () => {
    let msg = `🎅 *${(tableName || 'ROUND TABLE').toUpperCase()} SANTA SLEIGH — TONIGHT'S RUN!* 🎅\n\n`;
    msg += `📅 *Date:* ${dateFormatted}\n`;
    msg += `📍 *Route:* ${route.name}\n`;
    msg += `📍 *Meeting Point:* ${meetingLocation}\n`;
    msg += `⏰ *Crew Muster:* ${musterTime || '17:45'} sharp (Buckets & high-vis handover)\n`;
    msg += `🦺 *Sleigh Rollout:* ${route.start_time || '18:00'} | *Finish:* ~${route.end_time || '20:30'}\n\n`;

    if (leadMarshal) msg += `🦺 *Lead Marshal:* ${leadMarshal}\n`;
    if (towDriver) msg += `🚗 *Tow Driver:* ${towDriver}\n`;
    if (leadMarshal || towDriver) msg += `\n`;

    if (streetList.length > 0) {
      msg += `🗺️ *Streets (${streetList.length}):*\n${streetList.join(', ')}\n\n`;
    }

    const routeSponsors = Array.isArray(route.sponsors) && route.sponsors.length > 0
      ? route.sponsors.filter(s => s && s.name)
      : (route.sponsor_name ? [{ name: route.sponsor_name }] : []);

    if (routeSponsors.length === 1) {
      msg += `⭐ *Tonight's Sponsor:* ${routeSponsors[0].name}\n\n`;
    } else if (routeSponsors.length > 1) {
      msg += `⭐ *Tonight's Sponsors:* ${routeSponsors.map(s => s.name).join(', ')}\n\n`;
    }

    msg += `📱 *Live Public Tracker:* ${trackerUrl}\n`;
    msg += `🚗 *Driver Cockpit (Sat-Nav & GPS):* ${cockpitUrl}\n\n`;
    msg += `🎄 *Safety Reminders:*\n`;
    msg += `• High-vis vests mandatory for all walking elves\n`;
    msg += `• Stay on pavements; never cross between tow car & sleigh\n`;
    msg += `• Dual counters required for bucket handover at the end of the night\n`;
    msg += `• Wrap up warm! Let's bring the Christmas magic! #DoMore`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(msg).then(() => {
        setIsCopied(true);
        confetti({ particleCount: 40, spread: 45, origin: { y: 0.7 } });
        setTimeout(() => setIsCopied(false), 3000);
      });
    }

    // Also offer wa.me launch
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="route-sheet-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '12px 8px'
    }}>
      {/* Print Specific & Mobile Preview CSS */}
      <style>{`
        /* Mobile Preview: Responsive on-screen presentation */
        @media screen and (max-width: 640px) {
          .route-sheet-modal-container {
            padding: 14px 10px !important;
            max-height: 96vh !important;
            border-radius: 12px !important;
          }
          .route-sheet-print-card {
            padding: 16px 12px !important;
          }
          .sheet-header-flex {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .sheet-header-right {
            text-align: left !important;
          }
          .sheet-contact-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px 12px !important;
            padding: 10px !important;
          }
          .sheet-table-wrap {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            margin-bottom: 12px !important;
          }
          .sheet-handover-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .sheet-modal-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }
          .sheet-modal-actions button {
            flex: 1 1 auto !important;
            justify-content: center !important;
            text-align: center !important;
          }
        }

        /* Physical A4 Printout Styles (for Direct Browser Print / Ctrl+P) */
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            background: #ffffff !important;
            color: #111827 !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          .route-sheet-modal-overlay,
          .route-sheet-modal-container,
          #route-sheet-print-area,
          #route-sheet-print-area * {
            visibility: visible !important;
          }
          .route-sheet-modal-overlay {
            position: static !important;
            inset: auto !important;
            display: block !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            z-index: auto !important;
          }
          .route-sheet-modal-container {
            position: static !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #route-sheet-print-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            page-break-inside: auto !important;
          }
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          .sheet-contact-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
          }
          .sheet-table-wrap {
            overflow: visible !important;
            border: none !important;
          }
          .sheet-handover-grid {
            grid-template-columns: 1.3fr 1fr !important;
          }
          a {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
          }
        }
      `}</style>

      <div className="route-sheet-modal-container" style={{
        background: '#151513',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        {/* Modal Controls Bar (hidden during print) */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(251, 175, 51, 0.15)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              <Printer size={13} />
              <span>A4 Field Clipboard Sheet (Tool 3)</span>
            </div>
            <h2 className="brand-font" style={{ fontSize: '20px', margin: 0, color: '#fff' }}>
              Print Driver & Marshal Route Manifest
            </h2>
          </div>

          <div className="sheet-modal-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.12)', borderColor: '#22c55e', color: '#86efac' }}
              title="Copy formatted run sheet & open WhatsApp"
            >
              {isCopied ? <Check size={15} /> : <Share2 size={15} />}
              <span>{isCopied ? 'Copied Briefing!' : 'Share WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} />
              <span>Print A4 Sheet</span>
            </button>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick editable contact bar before printing (hidden in printout if desired, or prints clearly) */}
        <div className="no-print" style={{
          background: '#0d0d0b',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
              Lead Marshal Contact
            </label>
            <input
              type="text"
              value={leadMarshal}
              placeholder="e.g. Dave - 07700 900123"
              onChange={(e) => setLeadMarshal(e.target.value)}
              style={{ width: '100%', background: '#151513', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
              Tow Car Driver Contact
            </label>
            <input
              type="text"
              value={towDriver}
              placeholder="e.g. Mark - 07700 900456"
              onChange={(e) => setTowDriver(e.target.value)}
              style={{ width: '100%', background: '#151513', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
              Muster / Meeting Point
            </label>
            <input
              type="text"
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
              style={{ width: '100%', background: '#151513', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
              Muster / Arrival Time (Volunteers)
            </label>
            <input
              type="time"
              value={musterTime}
              onChange={(e) => setMusterTime(e.target.value)}
              style={{ width: '100%', background: '#151513', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE A4 SHEET AREA (Styled for crisp ink-saving paper printing)
           ========================================================================= */}
        <div
          id="route-sheet-print-area"
          className="route-sheet-print-card"
          style={{
            background: '#ffffff',
            color: '#111827',
            padding: '24px 28px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: '12px',
            lineHeight: 1.4,
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div className="sheet-header-flex" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #111827',
            paddingBottom: '12px',
            marginBottom: '14px',
            gap: '12px'
          }}>
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#4b5563' }}>
                ROUND TABLE SANTA SLEIGH &middot; OFFICIAL RUN SHEET
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '2px 0 4px 0', color: '#111827' }}>
                {tableName.toUpperCase()}
              </h1>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#b91c1c' }}>
                📍 Route: {route.name}
              </div>
            </div>

            <div className="sheet-header-right" style={{ textAlign: 'right', fontSize: '12px', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '13px' }}>📅 {dateFormatted}</div>
              <div style={{ marginTop: '2px' }}>⏰ Muster: <strong>{musterTime || '17:45'}</strong> | Rollout: <strong>{route.start_time || '18:00'}</strong></div>
              <div style={{ color: '#4b5563', marginTop: '2px' }}>📍 Meet: <strong>{meetingLocation}</strong></div>
              {(() => {
                const routeSponsors = Array.isArray(route.sponsors) && route.sponsors.length > 0
                  ? route.sponsors.filter(s => s && s.name)
                  : (route.sponsor_name ? [{ name: route.sponsor_name }] : []);
                if (routeSponsors.length === 0) return null;
                return (
                  <div style={{ marginTop: '3px', fontWeight: 700, color: '#15803d' }}>
                    ⭐ Sponsored by: {routeSponsors.map(s => s.name).join(' • ')}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Incident / Emergency Contacts Bar */}
          <div className="sheet-contact-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '14px',
            fontSize: '11px'
          }}>
            <div>
              <span style={{ color: '#4b5563', display: 'block', fontWeight: 700 }}>Lead Marshal:</span>
              <strong style={{ color: leadMarshal ? '#111827' : '#6b7280', fontWeight: leadMarshal ? 700 : 500, wordBreak: 'break-word' }}>
                {leadMarshal || '____________________'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#4b5563', display: 'block', fontWeight: 700 }}>Tow Driver:</span>
              <strong style={{ color: towDriver ? '#111827' : '#6b7280', fontWeight: towDriver ? 700 : 500, wordBreak: 'break-word' }}>
                {towDriver || '____________________'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#4b5563', display: 'block', fontWeight: 700 }}>Driver Cockpit (Sat-Nav &amp; GPS):</span>
              <a
                href={cockpitUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '9.5px',
                  color: '#1d4ed8',
                  wordBreak: 'break-all',
                  textDecoration: 'underline',
                  display: 'inline-block',
                  lineHeight: 1.3
                }}
                title="Tap to open Driver Cockpit Sat-Nav in browser"
              >
                {cockpitDisplayText}
              </a>
            </div>
            <div>
              <span style={{ color: '#4b5563', display: 'block', fontWeight: 700 }}>Live Public Tracker:</span>
              <a
                href={trackerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '9.5px',
                  color: '#1d4ed8',
                  wordBreak: 'break-all',
                  textDecoration: 'underline',
                  display: 'inline-block',
                  lineHeight: 1.3
                }}
                title="Tap to open Live Public Tracker in browser"
              >
                {trackerDisplayText}
              </a>
              <div style={{ marginTop: '2px', fontSize: '9.5px', color: '#b91c1c', fontWeight: 700 }}>
                🚨 999 Emergencies &middot; 101 Police
              </div>
            </div>
          </div>

          {/* Sequential Street Checklist Table */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
              <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Street Run Sequence &amp; Progress Checklist ({streetList.length} Streets)
              </strong>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>
                Tick off as sleigh clears each road segment
              </span>
            </div>

            <div className="sheet-table-wrap">
              <table style={{
                width: '100%',
                minWidth: '500px',
                borderCollapse: 'collapse',
                fontSize: '11.5px',
                border: '1.5px solid #111827'
              }}>
                <thead>
                  <tr style={{ background: '#111827', color: '#ffffff' }}>
                    <th style={{ width: '38px', padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #374151' }}>#</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderRight: '1px solid #374151' }}>Street / Road Name</th>
                    <th style={{ width: '190px', padding: '6px 8px', textAlign: 'left', borderRight: '1px solid #374151' }}>Navigation Notes / Cul-de-sac</th>
                    <th style={{ width: '80px', padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #374151' }}>Time Passed</th>
                    <th style={{ width: '60px', padding: '6px 8px', textAlign: 'center' }}>Done [ ✓ ]</th>
                  </tr>
                </thead>
                <tbody>
                  {streetList.length > 0 ? (
                    streetList.map((street, idx) => (
                      <tr key={idx} style={{
                        background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 700, borderRight: '1px solid #e5e7eb' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '5px 10px', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>
                          {street}
                        </td>
                        <td style={{ padding: '5px 8px', color: '#4b5563', borderRight: '1px solid #e5e7eb' }}>
                          {street.toLowerCase().includes('close') || street.toLowerCase().includes('court') || street.toLowerCase().includes('mews')
                            ? '⚠️ Cul-de-sac: Walking elves only'
                            : 'Through road'}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'center', borderRight: '1px solid #e5e7eb', color: '#9ca3af' }}>
                          ____:____
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <div style={{ width: '16px', height: '16px', border: '1.5px solid #111827', margin: '0 auto', borderRadius: '3px' }}></div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>{i}</td>
                        <td style={{ padding: '8px', borderRight: '1px solid #e5e7eb' }}>__________________________________________</td>
                        <td style={{ padding: '8px', borderRight: '1px solid #e5e7eb' }}>________________________</td>
                        <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>____:____</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <div style={{ width: '16px', height: '16px', border: '1.5px solid #111827', margin: '0 auto', borderRadius: '3px' }}></div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* End of Night Dual-Count Verification Box & Safety Protocol */}
          <div className="sheet-handover-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1fr',
            gap: '12px',
            marginTop: '12px',
            borderTop: '1.5px solid #111827',
            paddingTop: '10px'
          }}>
            {/* National Sleigh Playbook Safety Rules */}
            <div style={{ fontSize: '10px', color: '#374151', lineHeight: 1.35 }}>
              <strong style={{ fontSize: '11px', color: '#111827', display: 'block', marginBottom: '3px' }}>
                🦺 Essential Field Safety Rules (RTBI National Playbook):
              </strong>
              <div>• <strong>High-vis vests mandatory</strong> for all walking elves at all times.</div>
              <div>• <strong>Pavements only:</strong> Elves must not step backward into the roadway while shaking buckets.</div>
              <div>• <strong>Never cross drawbar:</strong> Never pass between towing vehicle and the sleigh while engine running.</div>
              <div>• <strong>Child safety stop:</strong> If a child steps near the carriageway, the driver must halt immediately.</div>
            </div>

            {/* Dual Counter Sign-off Box */}
            <div style={{
              background: '#f9fafb',
              border: '1.5px dashed #9ca3af',
              borderRadius: '6px',
              padding: '8px 10px',
              fontSize: '10.5px'
            }}>
              <strong style={{ display: 'block', color: '#111827', marginBottom: '4px', textTransform: 'uppercase' }}>
                End-of-Night Dual-Count Handover
              </strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Physical Cash Counted:</span>
                <strong>£ _______________</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Counter 1 (Marshal):</span>
                <span>___________________</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Counter 2 (Treasurer):</span>
                <span>___________________</span>
              </div>
            </div>
          </div>

          {/* Footer Ribbon */}
          <div style={{
            marginTop: '10px',
            textAlign: 'center',
            fontSize: '9.5px',
            color: '#6b7280',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '4px'
          }}>
            Printed via TurboSanta Operations Engine &middot; Real-time GPS Tracker: <strong>{trackerDisplayText}</strong> &middot; #DoMore
          </div>
        </div>
      </div>
    </div>
  );
}
