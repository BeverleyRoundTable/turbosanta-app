import React, { useState } from 'react';
import { 
  MapPin, Shield, Users, ArrowRight, ExternalLink, Sparkles, 
  Search, FileSpreadsheet, Code, Globe, Radio, CheckCircle2,
  Calendar, Heart, HeartHandshake, Download, Eye, Smartphone, BookOpen
} from 'lucide-react';
import { parseTableDetailsFromEmail, isRoundTableEmail } from '../services/auth';

export default function LandingPortal({ onOpenLogin, session, onSelectTable }) {
  const [inputVal, setInputVal] = useState(session?.email || '');
  const [searchTown, setSearchTown] = useState('');

  // Auto-detect table details from input
  const detected = parseTableDetailsFromEmail(inputVal);

  const popularTables = [
    { name: 'Beverley Round Table #247', slug: 'beverley', town: 'Beverley', email: 'beverley247@roundtable.org.uk' },
    { name: 'Shirley Round Table #414', slug: 'shirley', town: 'Shirley', email: 'shirley414@roundtable.org.uk' },
    { name: 'Doncaster Round Table', slug: 'doncaster', town: 'Doncaster', email: 'doncaster@roundtable.org.uk' },
    { name: 'Ellon Round Table #379', slug: 'ellon', town: 'Ellon', email: 'ellon379@roundtable.org.uk' }
  ];

  const filteredTables = popularTables.filter(t => 
    t.town.toLowerCase().includes(searchTown.toLowerCase()) ||
    t.name.toLowerCase().includes(searchTown.toLowerCase())
  );

  const handleLaunchHub = () => {
    if (!detected) return;
    window.location.href = `/hub.html?table=${encodeURIComponent(detected.slug)}`;
  };

  const handleViewTracker = () => {
    if (!detected) return;
    if (onSelectTable) {
      onSelectTable(detected.slug);
    } else {
      window.location.href = `/?table=${encodeURIComponent(detected.slug)}`;
    }
  };

  const handleOpenAdmin = () => {
    if (session) {
      const slug = detected?.slug || session.tableSlug || 'beverley';
      window.location.href = `/?table=${encodeURIComponent(slug)}&admin=1`;
    } else {
      onOpenLogin(inputVal || '');
    }
  };

  const handleOpenCrew = () => {
    if (!detected) return;
    window.location.href = `/crew.html?table=${encodeURIComponent(detected.slug)}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d0d0b',
      color: '#eaeae5',
      fontFamily: "'Open Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* TOP HEADER */}
      <header style={{
        backgroundColor: '#161614',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="https://brt-23f.pages.dev/icons/RTBI_Santa.png"
            alt="Round Table Santa"
            style={{
              height: '44px',
              width: '44px',
              borderRadius: '50%',
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 0 12px rgba(251, 175, 51, 0.35)'
            }}
          />
          <div>
            <div style={{
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '20px',
              letterSpacing: '1px',
              lineHeight: 1.1
            }}>
              TURBO<span style={{ color: '#FBAF33' }}>SANTA</span>
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.55)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Round Table Santa Sleigh Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a
            href="/guide.html"
            style={{
              color: '#eaeae5',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookOpen size={15} color="#FBAF33" />
            <span className="desktop-only">Guide & Docs</span>
          </a>

          <a
            href="/migrate.html"
            style={{
              color: '#eaeae5',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileSpreadsheet size={15} color="#2ecc71" />
            <span className="desktop-only">1.0 Migration</span>
          </a>

          <a
            href="/embed.html"
            style={{
              color: '#eaeae5',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Code size={15} color="#3b82f6" />
            <span className="desktop-only">Embeds</span>
          </a>

          <button
            onClick={() => onOpenLogin(inputVal)}
            style={{
              backgroundColor: '#FBAF33',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Shield size={14} />
            <span>{session ? 'Table Admin' : 'Sign In'}</span>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '50px 24px 30px',
        textAlign: 'center',
        width: '100%'
      }}>
        {/* National Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(251, 175, 51, 0.12)',
          border: '1px solid rgba(251, 175, 51, 0.3)',
          borderRadius: '50px',
          padding: '6px 16px',
          marginBottom: '20px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#FBAF33',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          <Sparkles size={14} />
          <span>Official RTBI Platform • Multi-Table 2.0</span>
        </div>

        <h1 style={{
          fontFamily: 'Eurostile, sans-serif',
          fontSize: 'clamp(32px, 5vw, 54px)',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          lineHeight: 1.1,
          margin: '0 0 16px 0',
          color: '#ffffff'
        }}>
          The Santa Sleigh Platform <br />
          <span style={{ color: '#FBAF33' }}>For Round Tables</span>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)',
          color: 'rgba(255, 255, 255, 0.65)',
          maxWidth: '720px',
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}>
          Live GPS sleigh telemetry, interactive street route schedules, real-time community fundraising, and volunteer crew dispatch for Round Tables across Great Britain and Ireland.
        </p>

        {/* LOGGED IN NOTIFICATION (IF ACTIVE) */}
        {session && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 21, 19, 0.8) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '16px',
            padding: 'clamp(14px, 3.5vw, 18px) clamp(14px, 4vw, 24px)',
            maxWidth: '680px',
            margin: '0 auto 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            textAlign: 'left',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{
                color: '#86efac',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>Active Session: {session.email}</span>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', marginTop: '4px', wordBreak: 'break-word' }}>
                Managing: <strong>{session.tableName || detected?.tableName || 'Table Dashboard'}</strong>
              </div>
            </div>
            <button
              onClick={() => window.location.href = `/?table=${encodeURIComponent(session.tableSlug || detected?.slug || 'beverley')}&admin=1`}
              style={{
                backgroundColor: '#2ecc71',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '12px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                maxWidth: '100%'
              }}
            >
              Open Admin Portal →
            </button>
          </div>
        )}

        {/* TABLE PORTAL & LOGIN CARD */}
        <div style={{
          backgroundColor: '#161614',
          border: '2px solid rgba(251, 175, 51, 0.4)',
          borderRadius: '24px',
          padding: '36px',
          maxWidth: '680px',
          margin: '0 auto',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(251, 175, 51, 0.15)',
          textAlign: 'left',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(251, 175, 51, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBAF33'
            }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{
                fontFamily: 'Eurostile, sans-serif',
                fontSize: '22px',
                fontWeight: 800,
                margin: 0,
                color: '#ffffff'
              }}>
                TABLE COMMAND & LOGIN GATEWAY
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Enter your official Round Table email or town to launch your Table tools
              </p>
            </div>
          </div>

          {/* INPUT FORM */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#FBAF33',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Table Email or Town / Slug
            </label>
            <div style={{
              display: 'flex',
              backgroundColor: '#0d0d0b',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              overflow: 'hidden',
              alignItems: 'center',
              padding: '2px 14px'
            }}>
              <Search size={18} color="rgba(255, 255, 255, 0.4)" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search town or Table email (e.g. York or shirley414@roundtable.org.uk)"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  padding: '14px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'inherit'
                }}
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 8px'
                  }}
                  title="Clear input"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* AUTO-DETECTION / SELECTION BADGE */}
          {detected ? (
            <div style={{
              backgroundColor: '#1e1e1b',
              border: '1px solid rgba(251, 175, 51, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.5px' }}>
                  Identified Table:
                </div>
                <div style={{
                  fontFamily: 'Eurostile, sans-serif',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#FBAF33'
                }}>
                  {detected.tableName}
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(251, 175, 51, 0.12)',
                border: '1px solid rgba(251, 175, 51, 0.3)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                color: '#FBAF33',
                fontFamily: 'monospace'
              }}>
                ?table={detected.slug}
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '13px'
            }}>
              <Search size={15} color="#FBAF33" />
              <span>Select a Table below or type your town / Round Table email above</span>
            </div>
          )}

          {/* QUICK ACTION BUTTONS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {/* Launch Table Hub */}
            <button
              onClick={handleLaunchHub}
              disabled={!detected}
              style={{
                backgroundColor: detected ? '#FBAF33' : '#232320',
                color: detected ? '#000000' : 'rgba(255, 255, 255, 0.3)',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 18px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: detected ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                opacity: detected ? 1 : 0.6
              }}
              onMouseEnter={(e) => { if (detected) e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={(e) => { if (detected) e.currentTarget.style.filter = 'none'; }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={16} />
                <span>Launch Table Hub</span>
              </span>
              <ArrowRight size={16} />
            </button>

            {/* Admin Portal */}
            <button
              onClick={handleOpenAdmin}
              style={{
                backgroundColor: '#1e1e1b',
                color: '#ffffff',
                border: '1px solid rgba(251, 175, 51, 0.4)',
                borderRadius: '12px',
                padding: '14px 18px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FBAF33'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.4)'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="#FBAF33" />
                <span>Table Admin Portal</span>
              </span>
              <ArrowRight size={16} />
            </button>

            {/* Public Sleigh Tracker */}
            <button
              onClick={handleViewTracker}
              disabled={!detected}
              style={{
                backgroundColor: '#1e1e1b',
                color: detected ? '#eaeae5' : 'rgba(255, 255, 255, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 18px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'uppercase',
                cursor: detected ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: detected ? 1 : 0.6
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color={detected ? '#FBAF33' : 'rgba(255, 255, 255, 0.3)'} />
                <span>View Public Tracker</span>
              </span>
              <Eye size={15} />
            </button>

            {/* Volunteer Crew Ops */}
            <button
              onClick={handleOpenCrew}
              disabled={!detected}
              style={{
                backgroundColor: '#1e1e1b',
                color: detected ? '#eaeae5' : 'rgba(255, 255, 255, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 18px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'uppercase',
                cursor: detected ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: detected ? 1 : 0.6
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={16} color={detected ? '#2ecc71' : 'rgba(255, 255, 255, 0.3)'} />
                <span>Volunteer Crew Link</span>
              </span>
              <ExternalLink size={15} />
            </button>
          </div>

          {/* POPULAR TABLES CHIPS */}
          <div>
            <div style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.5)',
              fontWeight: 700,
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Quick Select Table:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {popularTables.map(t => {
                const isSelected = detected?.slug === t.slug;
                return (
                  <button
                    key={t.slug}
                    onClick={() => setInputVal(isSelected ? '' : t.email)}
                    style={{
                      backgroundColor: isSelected ? 'rgba(251, 175, 51, 0.2)' : '#1e1e1b',
                      color: isSelected ? '#FBAF33' : '#eaeae5',
                      border: `1px solid ${isSelected ? '#FBAF33' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '20px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PUBLIC TOWN FINDER SECTION */}
      <section style={{
        backgroundColor: '#161614',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '50px 24px',
        marginTop: '30px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontFamily: 'Eurostile, sans-serif',
              fontSize: '28px',
              fontWeight: 800,
              textTransform: 'uppercase',
              margin: '0 0 8px 0',
              color: '#ffffff'
            }}>
              Looking for Santa in <span style={{ color: '#FBAF33' }}>Your Town?</span>
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px', margin: 0 }}>
              Search for your local Round Table Santa Sleigh to track the sleigh live and check street dates
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {filteredTables.map(t => (
              <div
                key={t.slug}
                style={{
                  backgroundColor: '#1e1e1b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'transform 0.2s, border-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div>
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(46, 204, 113, 0.15)',
                    color: '#2ecc71',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    Active Season 2026
                  </div>
                  <h3 style={{
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '18px',
                    fontWeight: 800,
                    margin: '0 0 6px 0',
                    color: '#ffffff'
                  }}>
                    {t.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Live GPS tracker, street list & online community donations.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`/?table=${t.slug}`}
                    style={{
                      flex: 1,
                      backgroundColor: '#FBAF33',
                      color: '#000000',
                      textDecoration: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontFamily: 'Eurostile, sans-serif',
                      fontWeight: 800,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <MapPin size={14} />
                    <span>View Sleigh</span>
                  </a>

                  <a
                    href={`/hub.html?table=${t.slug}`}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#eaeae5',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      textDecoration: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontFamily: 'Eurostile, sans-serif',
                      fontWeight: 700,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Table Hub"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOOL SUITE FOR TABLES */}
      <section style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '60px 24px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{
            fontFamily: 'Eurostile, sans-serif',
            fontSize: '28px',
            fontWeight: 800,
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
            color: '#ffffff'
          }}>
            BUILT FOR EVERY ROUND TABLE
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px', margin: 0 }}>
            Everything your Table needs to run a high-tech Santa Sleigh in your community
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px'
        }}>
          {/* Feature 1 */}
          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(251, 175, 51, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBAF33',
              marginBottom: '16px'
            }}>
              <Globe size={22} />
            </div>
            <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
              TABLE COMMAND HUB
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
              Every Table gets their own dedicated link launchpad (`/hub.html?table=...`) with QR poster generators, public links, and crew dispatch.
            </p>
            <a href="/hub.html?table=beverley" style={{ color: '#FBAF33', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Explore Hub Example →
            </a>
          </div>

          {/* Feature 2 */}
          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(46, 204, 113, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2ecc71',
              marginBottom: '16px'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
              1.0 TO 2.0 MIGRATOR
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
              Switching from old SantaSleigh 1.0? Simply upload your existing Google Sheet or Excel file to auto-populate routes and stops in 30 seconds.
            </p>
            <a href="/migrate.html" style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Open Sheet Migrator →
            </a>
          </div>

          {/* Feature 3 */}
          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              marginBottom: '16px'
            }}>
              <Code size={22} />
            </div>
            <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
              EMBED INTO YOUR SITE
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
              Have your own custom WordPress, Squarespace, or club website? Drop our 1-line iframe codes to display live maps, thermometers, and elf cams.
            </p>
            <a href="/embed.html" style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Get Embed Codes →
            </a>
          </div>

          {/* Feature 4: Volunteer Crew Hub */}
          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              marginBottom: '16px'
            }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
              VOLUNTEER CREW HUB
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
              Streamline street collections with volunteer check-in, bucket tracking, briefing checklists, and live route coordination.
            </p>
            <a href="/crew.html?table=beverley" style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Explore Crew Hub →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: '#161614',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '30px 24px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <img
            src="https://brt-23f.pages.dev/icons/RTBI_Santa.png"
            alt="RTBI"
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fff', padding: '1px' }}
          />
          <span style={{ fontFamily: 'Eurostile, sans-serif', fontWeight: 800, color: '#FBAF33', letterSpacing: '1px' }}>
            ROUND TABLE GREAT BRITAIN & IRELAND
          </span>
        </div>
        <p style={{ margin: '0 0 8px 0' }}>
          TurboSanta 2.0 • Adopt, Adapt, Improve.
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)' }}>
          Built for voluntary community service. Santa tracking, street routes, and Gift Aid tax declarations are managed per local Table.
        </p>
      </footer>
    </div>
  );
}
