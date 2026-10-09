import React, { useEffect, useState, useMemo } from 'react';
import { Share2, MapPin, ExternalLink, Star, ChevronDown, CheckCircle2 } from 'lucide-react';

const DEFAULT_LOGO = 'https://brt-23f.pages.dev/icons/RTBI_Santa.png';
const DEFAULT_BG = 'https://brt-23f.pages.dev/icons/site_background.png';
const BG_OVERLAY = 'linear-gradient(180deg, rgba(29, 29, 26, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%)';

function parseColor(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

function readableTextOn(rgb) {
  if (!rgb) return '#000000';
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return ((L + 0.05) / 0.05) >= (1.05 / (L + 0.05)) ? '#000000' : '#ffffff';
}

function parseRouteDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return isNaN(d) ? null : d;
}

export default function PublicSleigh({ tableData, activeTableSlug, onOpenLogin, onBackToPortal }) {
  const [addressFrameHeight, setAddressFrameHeight] = useState(500);
  const [showFab, setShowFab] = useState(false);
  const currentYear = new Date().getFullYear();

  const table = tableData?.table || {};
  const primaryColor = table.primary_color || '#FBAF33';
  const primaryRgb = parseColor(primaryColor);
  const onPrimaryColor = readableTextOn(primaryRgb);

  const siteName = table.sleigh_display_name || (table.name ? `${table.name} Santa Sleigh` : 'Santa Sleigh');
  const logoUrl = table.logo_url || DEFAULT_LOGO;
  const bgImage = table.background_url || DEFAULT_BG;

  // Listen for dynamic iframe resizing from address.html
  useEffect(() => {
    const handleMessage = (e) => {
      const h = e.data && Number(e.data.addressLookupHeight);
      if (Number.isFinite(h) && h >= 100 && h <= 5000) {
        setAddressFrameHeight(Math.round(h));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Floating Action Button visibility on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowFab(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Process Routes and Tonight's Spotlight
  const { todayItem, otherRoutes } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rawRoutes = tableData?.routes || [];
    const rawStreets = tableData?.streets || [];

    const processed = rawRoutes
      .map(r => {
        const d = parseRouteDate(r.date);
        if (!d) return null;
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);

        const routeStreets = r.streets || (rawStreets.filter(s => s.route_id === r.id).map(s => s.street_name).join(', ')) || '';

        return {
          ...r,
          d,
          day,
          routeName: r.name || r.routeName,
          streets: routeStreets,
          sponsorName: r.sponsor_name || r.sponsorName,
          sponsorUrl: r.sponsor_logo_url || r.sponsorUrl,
          sponsorLink: r.sponsor_link || r.sponsorLink,
          sponsorDescription: r.sponsor_description || r.sponsorDescription
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.day - b.day);

    const foundToday = processed.find(item => item.day.getTime() === today.getTime());
    const others = processed.filter(item => item !== foundToday);

    return { todayItem: foundToday, otherRoutes: others };
  }, [tableData]);

  // Native Web Share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: siteName,
        text: `Santa is on his way! Track the ${siteName} live:`,
        url: window.location.href
      }).catch(err => {
        if (err && err.name !== 'AbortError') console.error(err);
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const fundraisingGoal = Number(table.fundraising_goal) || 0;
  const totalRaised = Number(table.total_raised) || 0;
  const progressPct = fundraisingGoal > 0 ? Math.min(100, Math.round((totalRaised / fundraisingGoal) * 100)) : 0;

  const isBeverley = activeTableSlug === 'beverley' || table.slug === 'beverley';

  return (
    <div style={{
      fontFamily: "'Open Sans', sans-serif",
      backgroundColor: '#1D1D1A',
      color: '#FFFFFF',
      minHeight: '100vh',
      lineHeight: 1.6,
      position: 'relative',
      '--primary': primaryColor,
      '--on-primary': onPrimaryColor,
      '--border': 'rgba(255, 255, 255, 0.15)',
      '--bg-dark': '#1D1D1A',
      '--bg-card': '#000000',
      '--text-muted': 'rgba(255, 255, 255, 0.7)'
    }}>
      {/* Background with Dark Vignette */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: `${BG_OVERLAY}, url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Live Announcement Bar */}
        {table.live_announcement && (
          <div style={{
            background: 'var(--primary)',
            color: 'var(--on-primary)',
            padding: '10px 20px',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '14px'
          }}>
            🎅 {table.live_announcement}
          </div>
        )}

        {/* Navigation */}
        <nav style={{
          background: '#000000',
          borderBottom: '1px solid var(--border)',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img
              src={logoUrl}
              alt={`${siteName} logo`}
              style={{
                height: '48px',
                width: '48px',
                objectFit: 'contain',
                borderRadius: '50%',
                background: '#FFFFFF',
                padding: '2px'
              }}
              onError={(e) => { e.currentTarget.src = DEFAULT_LOGO; }}
            />
            <span className="brand-font" style={{ fontSize: '20px', color: '#FFFFFF', fontWeight: 700, textTransform: 'uppercase' }}>
              {siteName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <a href="#tracker" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 600, textTransform: 'uppercase', fontSize: '13px' }}>Live Tracker</a>
            <a href="#routes" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 600, textTransform: 'uppercase', fontSize: '13px' }}>Routes</a>
            <a href="#memory-book" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 600, textTransform: 'uppercase', fontSize: '13px' }}>Memory Book</a>
            <a href="#donate" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 600, textTransform: 'uppercase', fontSize: '13px' }}>Donate</a>
            {onBackToPortal && (
              <button
                onClick={onBackToPortal}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}
              >
                Change Table
              </button>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <header style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.5) 0%, transparent 70%)'
        }}>
          <h1 className="brand-font" style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginBottom: '15px', color: '#FFFFFF', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>
            <span style={{ color: 'var(--primary)' }}>{siteName}</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 30px', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>
            Follow Santa live on his journey, check when he is visiting your street, and help us raise vital funds for the local community this Christmas!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <a
              href="#tracker"
              className="brand-font"
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                background: 'var(--primary)',
                color: 'var(--on-primary)',
                fontSize: '18px',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                cursor: 'pointer'
              }}
            >
              Track Santa Live
            </a>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share this tracker"
              style={{
                background: 'transparent',
                border: '2px solid var(--border)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '12px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px'
              }}
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* 1. Live Tracker Section (Embedding tracker.html) */}
        <section id="tracker" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              LIVE <span style="color: var(--primary);" style={{ color: 'var(--primary)' }}>TRACKER</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Watch Santa's sleigh move in real-time as he visits the streets!
            </p>
          </div>

          <div style={{
            width: '100%',
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}>
            <iframe
              id="tracker-iframe"
              src={`/tracker.html?table=${encodeURIComponent(activeTableSlug)}`}
              title="Santa Tracker"
              allow="geolocation; screen-wake-lock"
              scrolling="no"
              style={{
                width: '100%',
                height: '75svh',
                minHeight: '520px',
                border: 'none',
                display: 'block'
              }}
            />
          </div>

          <a
            id="tracker-fullscreen"
            href={`/tracker.html?table=${encodeURIComponent(activeTableSlug)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: '16px',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none'
            }}
          >
            Open the tracker full-screen &rarr;
          </a>
        </section>

        {/* 2. Donations & Volunteering Section */}
        <section id="donate" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              HELP US SPREAD <span style={{ color: 'var(--primary)' }}>THE MAGIC</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Every penny raised goes directly back into supporting our local community.
            </p>
          </div>

          <div style={{
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '40px 30px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            maxWidth: '520px',
            margin: '0 auto'
          }}>
            <h3 className="brand-font" style={{ fontSize: '22px', marginBottom: '20px', color: '#FFFFFF' }}>
              FUNDRAISER <span style={{ color: 'var(--primary)' }}>TARGET</span>
            </h3>

            <div style={{
              width: '100%',
              height: '24px',
              background: '#1D1D1A',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              margin: '20px 0'
            }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--primary)',
                borderRadius: '12px',
                transition: 'width 1.5s ease-out'
              }} />
            </div>

            <div className="brand-font" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '22px' }}>
              <span style={{ color: 'var(--primary)' }}>£{totalRaised.toLocaleString()}</span>
              <span style={{ color: 'var(--text-muted)' }}>OF £{fundraisingGoal.toLocaleString()}</span>
            </div>

            {table.donate_url && (
              <a
                href={table.donate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-font"
                style={{
                  display: 'inline-block',
                  padding: '12px 30px',
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                  fontSize: '18px',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
              >
                Donate Now
              </a>
            )}
          </div>

          {/* Volunteer Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(29,29,26,0.95) 0%, rgba(0,0,0,0.98) 100%)',
            border: '1px solid var(--primary)',
            borderRadius: '12px',
            padding: '25px',
            marginTop: '30px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
            maxWidth: '640px',
            margin: '30px auto 0'
          }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <h3 className="brand-font" style={{ color: 'var(--primary)', fontSize: '22px', marginBottom: '6px' }}>
                Help Keep The Sleigh Moving!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                We need drivers, navigators, and bucket collectors. Volunteer as an elf this year!
              </p>
            </div>
            <a
              href={`/crew.html?table=${encodeURIComponent(activeTableSlug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-font"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 20px',
                background: 'transparent',
                color: 'var(--primary)',
                border: '2px solid var(--primary)',
                fontSize: '16px',
                textDecoration: 'none',
                borderRadius: '8px',
                textTransform: 'uppercase',
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}
            >
              Volunteer Now &rarr;
            </a>
          </div>
        </section>

        {/* 3. Routes & Schedule Section (Embedding address.html & Tonight's Spotlight) */}
        <section id="routes" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              ROUTE <span style={{ color: 'var(--primary)' }}>SCHEDULE</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Find out exactly when Santa is coming to your neighbourhood.
            </p>
          </div>

          {/* Address Lookup iFrame */}
          <div style={{
            width: '100%',
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            marginBottom: '40px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <iframe
              id="address-iframe"
              src={`/address.html?table=${encodeURIComponent(activeTableSlug)}`}
              height={addressFrameHeight}
              title="Address Lookup"
              scrolling="no"
              loading="lazy"
              allow="geolocation"
              style={{
                width: '100%',
                height: `${addressFrameHeight}px`,
                border: 'none',
                display: 'block'
              }}
            />
          </div>

          {/* Dedicated Spotlight for Tonight's Route */}
          {todayItem && (
            <div style={{
              background: '#000000',
              border: '2px solid var(--primary)',
              borderRadius: '16px',
              padding: '26px 30px',
              marginBottom: '35px',
              boxShadow: '0 0 25px rgba(251, 175, 51, 0.2), 0 10px 30px rgba(0,0,0,0.6)',
              display: 'grid',
              gridTemplateColumns: todayItem.sponsorName ? '1.1fr 1fr' : '1fr',
              gap: '25px',
              alignItems: 'center'
            }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  marginBottom: '10px'
                }}>
                  <Star size={14} fill="currentColor" /> TONIGHT'S ROUTE
                </div>

                <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {todayItem.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {todayItem.start_time && ` | ${todayItem.start_time} - ${todayItem.end_time || '20:30'}`}
                </div>

                <h3 className="brand-font" style={{ fontSize: '32px', color: '#FFFFFF', margin: '4px 0 10px 0' }}>
                  {todayItem.routeName}
                </h3>

                {todayItem.streets && (
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {todayItem.streets}
                  </div>
                )}
              </div>

              {todayItem.sponsorName && (
                <div style={{
                  background: 'rgba(251, 175, 51, 0.06)',
                  border: '1px solid var(--primary)',
                  borderRadius: '12px',
                  padding: '18px',
                  boxShadow: '0 0 15px rgba(251, 175, 51, 0.15)'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '10px', letterSpacing: '0.5px' }}>
                    ⭐ TONIGHT'S SPONSOR:
                  </div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '8px' }}>
                    {todayItem.sponsorUrl && (
                      <img
                        src={todayItem.sponsorUrl}
                        alt={todayItem.sponsorName}
                        style={{ width: '60px', height: '60px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '8px', padding: '4px', flexShrink: 0 }}
                      />
                    )}
                    <div>
                      {todayItem.sponsorLink ? (
                        <a
                          href={todayItem.sponsorLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '17px', textDecoration: 'none' }}
                        >
                          {todayItem.sponsorName} &rarr;
                        </a>
                      ) : (
                        <strong style={{ color: '#FFFFFF', fontSize: '17px' }}>{todayItem.sponsorName}</strong>
                      )}
                    </div>
                  </div>
                  {todayItem.sponsorDescription && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {todayItem.sponsorDescription}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Routes Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {otherRoutes.length === 0 && !todayItem && (
              <p style={{ color: 'var(--text-muted)' }}>No routes scheduled yet. Check back soon!</p>
            )}

            {otherRoutes.map((r, idx) => {
              const isPast = r.day < new Date(new Date().setHours(0,0,0,0));
              return (
                <div
                  key={idx}
                  style={{
                    background: '#000000',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isPast ? 0.5 : 1
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '5px', textTransform: 'uppercase', fontSize: '13px' }}>
                    {isPast && <span style={{ color: '#FFFFFF' }}>✓ COMPLETED | </span>}
                    {r.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {r.start_time && ` | ${r.start_time} - ${r.end_time || '20:30'}`}
                  </div>

                  <h3 className="brand-font" style={{ color: '#FFFFFF', fontSize: '22px', marginBottom: '10px' }}>
                    {r.routeName}
                  </h3>

                  {r.streets && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '15px' }}>
                      {r.streets}
                    </div>
                  )}

                  {r.sponsorName && (
                    <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>
                        SPONSORED BY:
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {r.sponsorUrl && (
                          <img
                            src={r.sponsorUrl}
                            alt={r.sponsorName}
                            style={{ width: '44px', height: '44px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '6px', padding: '3px', flexShrink: 0 }}
                          />
                        )}
                        {r.sponsorLink ? (
                          <a href={r.sponsorLink} target="_blank" rel="noopener noreferrer" style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>
                            {r.sponsorName} &rarr;
                          </a>
                        ) : (
                          <strong style={{ color: '#FFFFFF', fontSize: '14px' }}>{r.sponsorName}</strong>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Inside Santa's Workshop Blueprint (Beverley Custom Isolated) */}
        {(isBeverley || Boolean(table.enable_blueprint)) && (
          <section id="blueprint" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center', scrollMarginTop: '80px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', margin: '0 0 10px 0', color: '#FFFFFF' }}>
              INSIDE SANTA'S <span style={{ color: 'var(--primary)' }}>WORKSHOP</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '24px' }}>
              Tap the glowing dots on the electric sleigh to see the magic under the hood!
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              padding: '8px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}>
              <iframe
                src={`/blueprint.html?table=${encodeURIComponent(activeTableSlug)}`}
                title="Santa Sleigh Blueprint"
                style={{ width: '100%', height: '560px', border: 'none', borderRadius: '18px', background: '#151513' }}
                loading="lazy"
              />
            </div>
          </section>
        )}

        {/* 5. Community Partners (Beverley or Opted-In) */}
        {(() => {
          const partners = (table.partners && table.partners.length > 0)
            ? table.partners
            : (isBeverley ? [
                { name: "Zendure", role: "Official Power Partner", description: "Provided clean green portable power stations to keep the illuminations glowing bright.", url: "https://zendure.co.uk/" },
                { name: "Greens Signmakers", role: "Signage & Vinyl Craft", description: "Transformed the electric tuk-tuk into a show-stopping Santa Sleigh with eco-friendly signage.", url: "https://greens-signmakers.co.uk/" },
                { name: "Beverley Town Council", role: "Civic & Audio Grant", description: "Supported local community joy with civic and audio equipment grant funding.", url: "https://beverley.gov.uk/" },
                { name: "The Monks Walk", role: "Volunteer Sustenance", description: "Historic Beverley inn providing warming festive drinks and sustenance for volunteer elves.", url: "https://themonkswalk.co.uk/" }
              ] : []);

          if (!partners || partners.length === 0) return null;

          return (
            <section id="partners" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
              <h2 className="brand-font" style={{ fontSize: '38px', margin: '0 0 10px 0', color: '#FFFFFF' }}>
                COMMUNITY <span style={{ color: 'var(--primary)' }}>PARTNERS</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '32px' }}>
                Thank you to the generous local organisations keeping the magic rolling.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                textAlign: 'left'
              }}>
                {partners.map((p, idx) => (
                  <div key={idx} style={{ background: '#000000', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
                    <div style={{ color: 'var(--primary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: '6px' }}>
                      {p.role || 'Partner'}
                    </div>
                    <h3 className="brand-font" style={{ fontSize: '20px', color: '#FFFFFF', marginBottom: '8px' }}>
                      {p.name}
                    </h3>
                    {p.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                        {p.description}
                      </p>
                    )}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>
                        Visit {p.name} &rarr;
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* 6. Digital Memory Book Section (Embedding memory_book.html) */}
        <section id="memory-book" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              DIGITAL <span style={{ color: 'var(--primary)' }}>MEMORY BOOK</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Spotted Santa? Help us build our digital memory book and share your photos!
            </p>
          </div>

          <div style={{
            width: '100%',
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <iframe
              id="memory-book-iframe"
              src={`/memory_book.html?table=${encodeURIComponent(activeTableSlug)}`}
              height="850"
              title="Santa Memory Book"
              loading="lazy"
              allow="camera; microphone; geolocation"
              style={{
                width: '100%',
                height: '850px',
                border: 'none',
                display: 'block'
              }}
            />
          </div>
        </section>

        {/* 7. FAQ & Safety Section */}
        <section id="faq" style={{ padding: '60px 20px', maxWidth: '840px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              FAQ & <span style={{ color: 'var(--primary)' }}>SAFETY RULES</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Important information about the sleigh routes and how to enjoy the magic safely.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              {
                q: "Will you definitely come down my street tonight?",
                a: "Our routes are a guide, not a guarantee. We are entirely run by volunteers and rely on good weather, clear traffic, and having enough people to safely operate the sleigh. Sometimes we have to cut a route short due to rain, ice, or time restrictions. Please use the live tracker to see exactly where we are!"
              },
              {
                q: "Why didn't you turn down my cul-de-sac?",
                a: "The Santa Sleigh is very large and difficult to manoeuvre. If there are parked cars blocking a turning circle, or if a cul-de-sac is too tight for us to safely turn around, the driver will make the decision to stay on the main road. If you live down a tight street, please come out to the nearest junction to wave to Santa!"
              },
              {
                q: "Can my children climb onto the sleigh for a photo?",
                a: "For safety and insurance reasons, no one is allowed on the sleigh while it is moving or during the street collections. You are very welcome to take photos of Santa from the pavement. Please ensure children do not run into the road towards the moving vehicle."
              },
              {
                q: "Where does the donated money go?",
                a: "Every single penny collected goes directly into our local Round Table charity fund. Throughout the year, we distribute this money to local good causes, community groups, food banks, and individuals in need right here in our town."
              },
              {
                q: "Do you accept card donations?",
                a: "Yes! Our elves carry contactless card readers alongside their traditional buckets. You can also donate right here on this website using the Donate button at the top of the page."
              },
              {
                q: "Can I volunteer to help?",
                a: "Absolutely! We are always looking for enthusiastic volunteers to help collect donations, act as safety walkers, or even drive the towing vehicle. Reach out to us via our social media channels below to get involved."
              }
            ].map((faq, idx) => (
              <details
                key={idx}
                style={{
                  background: '#000000',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
              >
                <summary style={{
                  padding: '18px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '17px',
                  color: '#FFFFFF'
                }}>
                  <span>{faq.q}</span>
                  <ChevronDown size={20} color="var(--primary)" />
                </summary>
                <div style={{
                  padding: '18px 22px',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '15px',
                  lineHeight: 1.6
                }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* 8. About Us Section */}
        <section id="about" style={{ padding: '60px 20px', maxWidth: '840px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF' }}>
              WHO <span style={{ color: 'var(--primary)' }}>WE ARE</span>
            </h2>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '40px 30px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '20px' }}>
              The Santa Sleigh is proudly operated by <strong style={{ color: 'var(--primary)' }}>{table.name || 'Round Table'}</strong>.
            </p>
            <p style={{ marginBottom: '20px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Round Table is an events-based club for young men aged 18-45 focused on delivering a programme of social and community events. Whether it be trying a new sport, going on an adventure, or raising money for our communities, we aim to have fun, make friends, and live life to the fullest.
            </p>
            <p className="brand-font" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#FFFFFF' }}>
              Find the friends you've been missing. <span style={{ color: 'var(--primary)' }}>Do More in {currentYear}.</span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '28px', flexWrap: 'wrap' }}>
              <a
                href={table.website_url || 'https://www.roundtable.co.uk'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '24px',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <ExternalLink size={14} /> Official Site
              </a>
              {table.facebook_url && (
                <a href={table.facebook_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '24px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Facebook</a>
              )}
              {table.instagram_url && (
                <a href={table.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '24px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Instagram</a>
              )}
            </div>
          </div>
        </section>

        {/* Floating Action Button (FAB) for Map */}
        {showFab && (
          <a
            href="#tracker"
            className="brand-font"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: 'var(--primary)',
              color: 'var(--on-primary)',
              padding: '14px 22px',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: 800,
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 999,
              transition: 'transform 0.2s'
            }}
          >
            <MapPin size={18} /> Live Map
          </a>
        )}

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '40px 20px',
          borderTop: '1px solid var(--border)',
          marginTop: '60px',
          background: '#000000',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          <p>&copy; {currentYear} {siteName}. Powered by TurboSanta.</p>
          {onOpenLogin && (
            <p style={{ marginTop: '12px' }}>
              <button
                onClick={onOpenLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Organiser & Admin Login
              </button>
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
