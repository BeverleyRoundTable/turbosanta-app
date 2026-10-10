import React from 'react';
import { MapPin, Calendar, Heart, HelpCircle, Users } from 'lucide-react';

export default function Navbar({ tableData, onBackToPortal }) {
  const table = tableData?.table || {};
  const displayName = table.sleigh_display_name || "Beverley Round Table Santa Sleigh";
  const announcement = table.live_announcement;

  // Split title parts for branding highlight
  const match = displayName.match(/(.*?\bRound Table\b)/i);
  const prefix = match ? match[1] : displayName;
  const suffix = match ? displayName.substring(match[0].length) : '';

  return (
    <>
      {/* Live PA Announcement Banner */}
      {announcement && (
        <div style={{
          backgroundColor: '#d31c1c',
          color: '#ffffff',
          padding: '10px 20px',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span>📢 LIVE ANNOUNCEMENT:</span>
          <span>{announcement}</span>
        </div>
      )}

      {/* Main Navigation Bar */}
      <nav style={{
        backgroundColor: 'rgba(21, 21, 19, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        {/* Brand */}
        <a href="#hero" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          textDecoration: 'none',
          color: 'var(--text-main)'
        }}>
          <img
            src="https://brt-23f.pages.dev/icons/RTBI_Santa.png"
            alt="Round Table Santa"
            style={{
              height: '46px',
              width: '46px',
              objectFit: 'contain',
              borderRadius: '50%',
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 0 10px rgba(251, 175, 51, 0.3)'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'var(--primary)',
              color: '#1D1D1A',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing: '1px',
              fontFamily: "'Eurostile Extended Bold', 'Eurostile', sans-serif"
            }}>
              DO MORE
            </span>
            <div className="brand-font" style={{ fontSize: '20px', fontWeight: 800 }}>
              <span style={{ color: 'var(--primary)' }}>{prefix}</span>
              {suffix && <span> {suffix}</span>}
            </div>
          </div>
        </a>

        {/* Links */}
        <div style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
          <a href="#tracker" style={{
            color: 'var(--text-main)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.2s'
          }}>
            <MapPin size={16} color="var(--primary)" />
            Live Tracker
          </a>

          <a href="#routes" style={{
            color: 'var(--text-main)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Calendar size={16} color="var(--primary)" />
            Routes
          </a>

          <a href="#donate" style={{
            color: 'var(--text-main)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Heart size={16} color="var(--primary)" />
            Donate
          </a>

          <a href="#faq" style={{
            color: 'var(--text-main)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <HelpCircle size={16} color="var(--primary)" />
            FAQ
          </a>

          <a href="#about" style={{
            color: 'var(--text-main)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Users size={16} color="var(--primary)" />
            About
          </a>

          <a
            href="/"
            onClick={(e) => {
              if (onBackToPortal) {
                e.preventDefault();
                onBackToPortal();
              }
            }}
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(251, 175, 51, 0.1)',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(251, 175, 51, 0.3)'
            }}
          >
            <span>All Tables</span>
          </a>
        </div>
      </nav>
    </>
  );
}
