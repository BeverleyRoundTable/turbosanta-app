import React, { useState } from 'react';
import { X, Printer, QrCode, Sparkles, Check, ExternalLink, Image as ImageIcon, Heart, Gift } from 'lucide-react';

export default function PrintLanyardsModal({
  isOpen,
  onClose,
  tableName = 'Round Table',
  tableSlug = 'beverley',
  donateUrl = '',
  logoUrl = '',
  enableGiftAid = true,
  adminSecret = ''
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('lanyards'); // 'lanyards' | 'poster'
  const [qrTarget, setQrTarget] = useState('donate'); // 'donate' | 'tracker'

  const cleanSlug = (tableSlug || 'beverley').toLowerCase().trim();
  const townDomain = `${cleanSlug}.roundtablesantasleigh.co.uk`;
  const townUrl = `https://${townDomain}`;

  const trackerUrl = townUrl;
  const effectiveDonateUrl = donateUrl || `${townUrl}/?donate=1`;

  const currentQrUrl = qrTarget === 'donate' ? effectiveDonateUrl : trackerUrl;
  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=4&data=${encodeURIComponent(currentQrUrl)}`;

  const handlePrint = () => {
    const printArea = document.getElementById('printable-lanyards-area');
    if (!printArea) {
      window.print();
      return;
    }

    const title = activeTab === 'lanyards' ? 'Volunteer Lanyard Badges (4-Up)' : 'Santa Sleigh Poster';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${(tableName || 'Round Table').toUpperCase()} - ${title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #111827 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .print-wrapper {
              width: 100%;
              max-width: 194mm;
              margin: 0 auto;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    `;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth <= 820);

    if (isMobile) {
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

    // Use full-size off-screen A4 iframe for reliable Chromium print rasterization
    let printIframe = document.getElementById('print-lanyards-iframe');
    if (printIframe) {
      try { printIframe.remove(); } catch(e) {}
    }

    printIframe = document.createElement('iframe');
    printIframe.id = 'print-lanyards-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.left = '-9999px';
    printIframe.style.top = '-9999px';
    printIframe.style.width = '210mm';
    printIframe.style.height = '297mm';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentDocument || printIframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    const doPrint = () => {
      try {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print():', err);
        window.print();
      }
    };

    // Ensure all remote QR images are decoded/loaded before invoking print
    setTimeout(() => {
      const images = Array.from(doc.images || []);
      const pending = images.filter(img => !img.complete);
      if (pending.length > 0) {
        let done = 0;
        const onDone = () => {
          done++;
          if (done >= pending.length) doPrint();
        };
        pending.forEach(img => {
          img.onload = onDone;
          img.onerror = onDone;
        });
        setTimeout(doPrint, 1500);
      } else {
        doPrint();
      }
    }, 150);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, qrTarget, enableGiftAid]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      {/* Print Specific CSS to isolate printout cleanly */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-lanyards-area, #printable-lanyards-area * {
            visibility: visible !important;
          }
          #printable-lanyards-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>

      <div style={{
        background: '#151513',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '880px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        {/* Modal Controls Bar */}
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              <QrCode size={13} />
              <span>QR Badges &amp; Shop Posters (Tool 4)</span>
            </div>
            <h2 className="brand-font" style={{ fontSize: '20px', margin: 0, color: '#fff' }}>
              Print Weatherproof Lanyard Badges &amp; Posters
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

        {/* Options & Tab Switcher (no-print) */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          background: '#0d0d0b',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '10px 16px'
        }}>
          {/* Format Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('lanyards')}
              style={{
                background: activeTab === 'lanyards' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'lanyards' ? '#111' : '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🪪 4-Up Cut-out Lanyard Badges (95x65mm)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('poster')}
              style={{
                background: activeTab === 'poster' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'poster' ? '#111' : '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🏪 A4 Shop Window Poster
            </button>
            <a
              href={`/qr_poster.html?table=${encodeURIComponent(cleanSlug)}&mode=lanyards&qr=${enableGiftAid ? 'donate_giftaid' : 'direct_donate'}&secret=${encodeURIComponent(adminSecret || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#86efac',
                border: '1px solid #22c55e',
                borderRadius: '6px',
                padding: '6px 14px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
              title="Open Print Studio for 6-Up Double-Sided Elf Lanyards with Route Contacts & Guidelines (Tool 4)"
            >
              <ExternalLink size={13} />
              <span>🪪 6-Up Double-Sided Lanyards (Print Studio ↗)</span>
            </a>
          </div>

          {/* QR Destination Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>QR Destination:</span>
            <select
              value={qrTarget}
              onChange={(e) => setQrTarget(e.target.value)}
              style={{
                background: '#151513',
                border: '1px solid var(--border)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            >
              <option value="donate">Donation Checkout Link (Zeffy/Stripe/SumUp)</option>
              <option value="tracker">Live Public Sleigh Site ({townDomain})</option>
            </select>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE AREA
           ========================================================================= */}
        <div id="printable-lanyards-area">
          {activeTab === 'lanyards' ? (
            /* -------------------------------------------------------------
               MODE A: 4-UP LANYARD CUT-OUT BADGES (2x2 Grid with Scissor Lines)
               ------------------------------------------------------------- */
            <div style={{
              background: '#ffffff',
              color: '#111827',
              padding: '16px',
              borderRadius: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '10px', color: '#6b7280' }} className="no-print">
                ✂️ Standard 95mm x 65mm Volunteer Lanyard Size &middot; Cut along dotted guidelines and insert into plastic badge holders.
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {[1, 2, 3, 4].map(idx => (
                  <div
                    key={idx}
                    style={{
                      border: '2px dashed #9ca3af',
                      borderRadius: '10px',
                      padding: '14px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '260px',
                      position: 'relative'
                    }}
                  >
                    {/* Scissor indicator */}
                    <div style={{ position: 'absolute', top: '-10px', left: '10px', background: '#fff', padding: '0 4px', fontSize: '10px', color: '#6b7280' }}>
                      ✂️ Cut Badge #{idx}
                    </div>

                    {/* Badge Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #111827', paddingBottom: '6px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '18px' }}>🎅</span>
                        )}
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#4b5563', lineHeight: 1 }}>
                            ROUND TABLE SANTA SLEIGH
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>
                            {tableName}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, background: '#fee2e2', color: '#b91c1c', border: '1px solid #ef4444', padding: '2px 5px', borderRadius: '4px' }}>
                        VOLUNTEER CREW
                      </span>
                    </div>

                    {/* Badge Core: QR Code + Call to Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                      <div style={{
                        border: '1.5px solid #111827',
                        borderRadius: '6px',
                        padding: '4px',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <img
                          src={qrCodeImgSrc}
                          alt="Donation QR Code"
                          style={{ width: '105px', height: '105px', display: 'block' }}
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#b91c1c', textTransform: 'uppercase', lineHeight: 1.15, marginBottom: '4px' }}>
                          NO CASH? TAP OR SCAN!
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                          Support our local children &amp; community causes.
                        </div>
                        <div style={{ fontSize: '9px', color: '#4b5563', lineHeight: 1.3 }}>
                          ✓ Apple Pay &middot; Google Pay &middot; Card<br />
                          ✓ 100% of proceeds stay local<br />
                          {enableGiftAid ? (
                            <span>✓ Gift Aid +25% eligible</span>
                          ) : (
                            <span>✓ Direct to local youth &amp; charities</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge Footer */}
                    <div style={{
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '8.5px',
                      color: '#4b5563'
                    }}>
                      <span>Live Tracker: <strong>{townDomain}</strong></span>
                      <strong>#DoMore &middot; RTBI</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* -------------------------------------------------------------
               MODE B: A4 SHOP WINDOW / COUNTER POSTER
               ------------------------------------------------------------- */
            <div style={{
              background: '#ffffff',
              color: '#111827',
              padding: '36px 32px',
              borderRadius: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textAlign: 'center',
              border: '2px solid #111827'
            }}>
              {/* Festive Top Banner */}
              <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#b91c1c', marginBottom: '6px' }}>
                🎄 COMMUNITY CHRISTMAS APPEAL &middot; {tableName.toUpperCase()} 🎄
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: 900, margin: '0 0 8px 0', color: '#111827', lineHeight: 1.15 }}>
                SANTA IS COMING TO OUR STREETS!
              </h1>
              <p style={{ fontSize: '16px', color: '#374151', margin: '0 auto 24px auto', maxWidth: '600px', lineHeight: 1.4 }}>
                Track Santa’s sleigh live in real-time as he visits our neighbourhood, or tap below to make a safe contactless donation.
              </p>

              {/* Huge QR Code in Festive Border */}
              <div style={{
                display: 'inline-block',
                border: '3px solid #111827',
                borderRadius: '16px',
                padding: '16px',
                background: '#ffffff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}>
                <img
                  src={qrCodeImgSrc}
                  alt="Santa Tracker & Donation QR Code"
                  style={{ width: '220px', height: '220px', display: 'block' }}
                />
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: '#111827' }}>
                  SCAN WITH PHONE CAMERA
                </div>
              </div>

              {/* Instructions Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                maxWidth: '650px',
                margin: '0 auto 28px auto',
                textAlign: 'left'
              }}>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#b91c1c', marginBottom: '4px' }}>
                    📍 1. Live GPS Sleigh Tracker
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }}>
                    See exactly which street Santa is on right now and follow his journey door to door.
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#15803d', marginBottom: '4px' }}>
                    💛 2. Support Local Causes
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }}>
                    100% of proceeds support local youth groups, food banks, elderly care and community charities.
                  </div>
                </div>
              </div>

              {/* Manual URL link */}
              <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '20px' }}>
                Direct web address: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>{townDomain}</strong>
              </div>

              {/* Footer */}
              <div style={{
                borderTop: '1.5px solid #111827',
                paddingTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#6b7280'
              }}>
                <div>Organised with pride by <strong>{tableName}</strong></div>
                <div>Round Table Britain &amp; Ireland &middot; Charity &amp; Fellowship &middot; #DoMore</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
