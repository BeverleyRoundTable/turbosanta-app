import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Search, ArrowRight, Shield, Sparkles, Navigation, Calendar, Heart, CheckCircle2, Users, ExternalLink
} from 'lucide-react';
import { fetchPublicTables } from '../services/api';

export default function PublicDirectory({ session, onNavigateAdmin, onSelectTable }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchPublicTables()
      .then((list) => {
        if (mounted) {
          setTables(Array.isArray(list) ? list : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => {
      const town = (t.town_name || '').toLowerCase();
      const name = (t.sleigh_display_name || '').toLowerCase();
      const slug = (t.slug || '').toLowerCase();
      const num = t.table_number ? String(t.table_number) : '';
      return town.includes(q) || name.includes(q) || slug.includes(q) || num.includes(q);
    });
  }, [tables, searchQuery]);

  const handleOpenTown = (tableItem) => {
    const slug = (tableItem?.slug || '').toLowerCase().trim();
    if (!slug) return;
    const host = window.location.hostname.toLowerCase();
    if (host.includes('roundtablesantasleigh.co.uk')) {
      window.location.href = `https://${slug}.roundtablesantasleigh.co.uk/`;
    } else if (onSelectTable) {
      onSelectTable(slug);
    } else {
      window.location.href = `/?table=${encodeURIComponent(slug)}`;
    }
  };

  const handleGoToAdmin = (e) => {
    if (e) e.preventDefault();
    if (onNavigateAdmin) {
      onNavigateAdmin();
    } else {
      window.location.href = '/admin';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d0d0b',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(211, 28, 28, 0.16) 0%, rgba(251, 175, 51, 0.06) 35%, rgba(13, 13, 11, 1) 75%)',
      color: '#eaeae5',
      fontFamily: "'Open Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* TOP HEADER */}
      <header style={{
        backgroundColor: 'rgba(22, 22, 20, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/icons/RTBI_Santa.png"
            alt="Round Table Santa Sleigh"
            style={{
              height: '44px',
              width: '44px',
              borderRadius: '50%',
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '2px',
              boxShadow: '0 0 14px rgba(251, 175, 51, 0.4)'
            }}
          />
          <div>
            <div style={{
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '19px',
              letterSpacing: '1px',
              lineHeight: 1.1,
              color: '#ffffff'
            }}>
              ROUND TABLE <span style={{ color: '#FBAF33' }}>SANTA SLEIGH</span>
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px'
            }}>
              Official Community Sleigh Finder
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href="https://www.roundtable.co.uk/contact"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: 'rgba(251, 175, 51, 0.12)',
              color: '#FBAF33',
              border: '1px solid rgba(251, 175, 51, 0.45)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FBAF33';
              e.currentTarget.style.color = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(251, 175, 51, 0.12)';
              e.currentTarget.style.color = '#FBAF33';
            }}
          >
            <Users size={13} />
            <span>Join Round Table (18–45)</span>
          </a>

          <a
            href="/admin"
            onClick={handleGoToAdmin}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: '#eaeae5',
              border: '1px solid rgba(251, 175, 51, 0.35)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 700,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FBAF33';
              e.currentTarget.style.backgroundColor = 'rgba(251, 175, 51, 0.14)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.35)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
            }}
          >
            <Shield size={13} color="#FBAF33" />
            <span>{session ? 'Admin Portal' : 'Organiser Login'}</span>
          </a>
        </div>
      </header>

      {/* ACTIVE ORGANISER SESSION BAR */}
      {session && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.18) 0%, rgba(22, 22, 20, 0.95) 100%)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.35)',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86efac', fontWeight: 600 }}>
            <CheckCircle2 size={15} />
            <span>Signed in as <strong>{session.email}</strong></span>
          </div>
          <a
            href="/admin"
            onClick={handleGoToAdmin}
            style={{
              backgroundColor: '#2ecc71',
              color: '#000',
              padding: '6px 14px',
              borderRadius: '6px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              textDecoration: 'none'
            }}
          >
            Go to Table Admin Portal →
          </a>
        </div>
      )}

      {/* HERO & SEARCH */}
      <section style={{
        maxWidth: '1060px',
        margin: '0 auto',
        padding: '48px 24px 28px',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(251, 175, 51, 0.12)',
          border: '1px solid rgba(251, 175, 51, 0.35)',
          borderRadius: '50px',
          padding: '6px 16px',
          marginBottom: '18px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#FBAF33',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          <Sparkles size={14} />
          <span>Live Santa Sleigh Tracker &amp; Route Schedules</span>
        </div>

        <h1 style={{
          fontFamily: 'Eurostile, sans-serif',
          fontSize: 'clamp(30px, 5vw, 52px)',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          lineHeight: 1.1,
          margin: '0 0 14px 0',
          color: '#ffffff'
        }}>
          Find Your Local <br />
          <span style={{ color: '#FBAF33' }}>Santa Sleigh</span>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2vw, 17px)',
          color: 'rgba(255, 255, 255, 0.72)',
          maxWidth: '660px',
          margin: '0 auto 32px',
          lineHeight: 1.6
        }}>
          Select your town below to track Santa live on the map, check street route dates and times, receive doorstep alerts, and support local community causes.
        </p>

        {/* TOWN SEARCH BAR */}
        <div style={{
          maxWidth: '620px',
          margin: '0 auto',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#161614',
            border: '2px solid rgba(251, 175, 51, 0.45)',
            borderRadius: '16px',
            padding: '6px 18px',
            boxShadow: '0 14px 36px rgba(0, 0, 0, 0.55), 0 0 24px rgba(251, 175, 51, 0.12)'
          }}>
            <Search size={20} color="#FBAF33" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for your town (e.g. Beverley, Lichfield, Shirley, Abergavenny...)"
              aria-label="Search for your town"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                padding: '14px 12px',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'inherit',
                minWidth: 0
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#eaeae5',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 10px'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* REGISTERED TABLES DIRECTORY GRID */}
      <section style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '12px 24px 64px',
        width: '100%',
        boxSizing: 'border-box',
        flex: 1
      }}>
        {/* ROUND TABLE RECRUITMENT PUSH: DO MORE WITH YOUR EVENINGS */}
        <div style={{
          marginTop: '6px',
          marginBottom: '36px',
          background: 'linear-gradient(135deg, rgba(251, 175, 51, 0.09) 0%, rgba(211, 28, 28, 0.06) 50%, rgba(22, 22, 20, 0.98) 100%)',
          border: '1px solid rgba(251, 175, 51, 0.35)',
          borderRadius: '24px',
          padding: 'clamp(24px, 4vw, 38px)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(251, 175, 51, 0.08)'
        }}>
          {/* Subtle festive background glow / badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(251, 175, 51, 0.15)',
              border: '1px solid rgba(251, 175, 51, 0.4)',
              borderRadius: '50px',
              padding: '5px 14px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#FBAF33',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              <Users size={14} />
              <span>Behind The Sleigh • For Men Aged 18 to 45</span>
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              fontWeight: 700
            }}>
              Round Table Great Britain &amp; Ireland
            </div>
          </div>

          <div style={{ maxWidth: '820px' }}>
            <h2 style={{
              fontFamily: 'Eurostile, sans-serif',
              fontSize: 'clamp(22px, 3.5vw, 34px)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              lineHeight: 1.15,
              margin: '0 0 12px 0',
              color: '#ffffff'
            }}>
              Do More With Your Evenings — <span style={{ color: '#FBAF33' }}>Join Round Table</span>
            </h2>

            <p style={{
              fontSize: 'clamp(14px, 1.8vw, 16px)',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: 1.6,
              margin: '0 0 24px 0'
            }}>
              The sleigh touring your street tonight doesn&rsquo;t happen by magic — it&rsquo;s planned, towed, and marshalled by young local guys from Round Table. But Christmas is just <em>one</em> month of what we do.
            </p>
          </div>

          {/* 3 Pillars: Social, Charity, Wellbeing */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px 18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#FBAF33', fontWeight: 700, fontSize: '14px', fontFamily: 'Eurostile, sans-serif' }}>
                <Sparkles size={16} />
                <span>UNBEATABLE SOCIAL LIFE</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.68)', margin: 0, lineHeight: 1.55 }}>
                Break out of the work-home-couch routine. From curry nights, comedy clubs, and pub quizzes to go-karting, paddleboarding, and weekends away — make a great group of lifelong mates.
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px 18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#2ecc71', fontWeight: 700, fontSize: '14px', fontFamily: 'Eurostile, sans-serif' }}>
                <Heart size={16} />
                <span>COMMUNITY &amp; CHARITY</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.68)', margin: 0, lineHeight: 1.55 }}>
                Give back where you live. Alongside the iconic Santa Sleigh, Tables organise beer festivals, firework displays, and food bank collections, raising millions across the UK.
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px 18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#60a5fa', fontWeight: 700, fontSize: '14px', fontFamily: 'Eurostile, sans-serif' }}>
                <Shield size={16} />
                <span>CAMARADERIE &amp; WELLBEING</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.68)', margin: 0, lineHeight: 1.55 }}>
                Making new mates as an adult can be tough. Round Table gives guys a welcoming space to unwind, blow off steam, share laughs, and build lasting confidence and lifelong friendships.
              </p>
            </div>
          </div>

          {/* CTA BAR */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                Male aged 18 to 45? Try your first night with zero obligation.
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
                Come along to an activity or a pint, meet the lads, and see if it’s for you.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="https://www.roundtable.co.uk/contact"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: '#FBAF33',
                  color: '#000000',
                  fontFamily: 'Eurostile, sans-serif',
                  fontWeight: 800,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(251, 175, 51, 0.35)',
                  transition: 'transform 0.15s, background-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffc25c';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FBAF33';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>Find Your Local Table (Get In Touch)</span>
                <ExternalLink size={14} />
              </a>

              <a
                href="https://www.roundtable.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontFamily: 'Eurostile, sans-serif',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  padding: '11px 18px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.6)';
                  e.currentTarget.style.color = '#FBAF33';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.color = '#ffffff';
                }}
              >
                <span>About Round Table</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{
            fontFamily: 'Eurostile, sans-serif',
            fontSize: '14px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MapPin size={16} color="#FBAF33" />
            <span>
              {loading
                ? 'Loading Registered Towns...'
                : `Registered Sleigh Towns (${filteredTables.length})`}
            </span>
          </div>
          {searchQuery && !loading && (
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)' }}>
              Showing matches for &ldquo;<strong style={{ color: '#FBAF33' }}>{searchQuery}</strong>&rdquo;
            </div>
          )}
        </div>

        {loading ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              border: '3px solid rgba(255, 255, 255, 0.12)',
              borderTopColor: '#FBAF33',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 14px'
            }} />
            <div style={{ fontFamily: 'Eurostile, sans-serif', letterSpacing: '0.8px' }}>
              LOADING SLEIGH DIRECTORY...
            </div>
          </div>
        ) : filteredTables.length === 0 ? (
          <div style={{
            backgroundColor: '#161614',
            border: '1px dashed rgba(255, 255, 255, 0.18)',
            borderRadius: '20px',
            padding: '44px 24px',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '16px auto'
          }}>
            <MapPin size={32} color="#FBAF33" style={{ marginBottom: '12px' }} />
            <h3 style={{
              fontFamily: 'Eurostile, sans-serif',
              fontSize: '20px',
              margin: '0 0 8px 0',
              color: '#ffffff'
            }}>
              No matching town found
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)',
              margin: '0 0 20px 0',
              lineHeight: 1.5
            }}>
              We couldn&rsquo;t find a registered Santa Sleigh matching &ldquo;{searchQuery}&rdquo;. Try clearing your search to browse all registered Round Table towns.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                backgroundColor: '#FBAF33',
                color: '#000000',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              Show All Towns
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '18px'
          }}>
            {filteredTables.map((t) => {
              const brandColor = t.primary_color || '#FBAF33';
              const logoSrc = t.logo_url || '/icons/RTBI_Santa.png';
              return (
                <a
                  key={t.slug}
                  href={`https://${t.slug}.roundtablesantasleigh.co.uk/`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenTown(t);
                  }}
                  style={{
                    backgroundColor: '#161614',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '18px',
                    padding: '22px',
                    textDecoration: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '18px',
                    transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.55)';
                    e.currentTarget.style.boxShadow = '0 14px 32px rgba(0, 0, 0, 0.55), 0 0 20px rgba(251, 175, 51, 0.14)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${brandColor}, #FBAF33)`
                  }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      backgroundColor: '#000000',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    }}>
                      <img
                        src={logoSrc}
                        alt={t.town_name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/icons/RTBI_Santa.png';
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '10px'
                        }}
                      />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <h2 style={{
                          fontFamily: 'Eurostile, sans-serif',
                          fontSize: '20px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.6px',
                          margin: 0,
                          color: '#ffffff',
                          lineHeight: 1.15
                        }}>
                          {t.town_name}
                        </h2>
                        {t.table_number && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(251, 175, 51, 0.14)',
                            color: '#FBAF33',
                            border: '1px solid rgba(251, 175, 51, 0.3)',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            fontFamily: 'Eurostile, sans-serif'
                          }}>
                            RT #{t.table_number}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginTop: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {t.sleigh_display_name}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '11px',
                    padding: '10px 14px',
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: '#FBAF33'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Navigation size={14} />
                      <span>Track Santa &amp; Routes</span>
                    </span>
                    <ArrowRight size={15} />
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* WHAT YOU CAN DO ON YOUR LOCAL SLEIGH PAGE */}
        <div style={{
          marginTop: '56px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px'
        }}>
          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '22px'
          }}>
            <Navigation size={20} color="#FBAF33" style={{ marginBottom: '10px' }} />
            <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '16px', margin: '0 0 6px 0', color: '#ffffff' }}>
              LIVE GPS SLEIGH RADAR
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.55 }}>
              Watch Santa and his volunteer elves travel down your street in real time on our interactive map.
            </p>
          </div>

          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '22px'
          }}>
            <Calendar size={20} color="#2ecc71" style={{ marginBottom: '10px' }} />
            <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '16px', margin: '0 0 6px 0', color: '#ffffff' }}>
              STREET LISTS &amp; DOORSTEP ALERTS
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.55 }}>
              Search your street name to check which night Santa visits and drop a pin for an automatic approaching alert.
            </p>
          </div>

          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '22px'
          }}>
            <Heart size={20} color="#ef4444" style={{ marginBottom: '10px' }} />
            <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '16px', margin: '0 0 6px 0', color: '#ffffff' }}>
              100% FOR LOCAL GOOD CAUSES
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.55 }}>
              Every Round Table Santa Sleigh is run by local volunteers raising funds for charities and families in your community.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: '#161614',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '28px 24px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <img
            src="/icons/RTBI_Santa.png"
            alt="RTBI"
            style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#000000', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '1px' }}
          />
          <span style={{ fontFamily: 'Eurostile, sans-serif', fontWeight: 800, color: '#FBAF33', letterSpacing: '1px' }}>
            ROUND TABLE GREAT BRITAIN &amp; IRELAND
          </span>
        </div>
        <p style={{ margin: '0 0 8px 0' }}>
          <a
            href="https://www.roundtable.co.uk/contact"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FBAF33', textDecoration: 'underline', fontWeight: 700 }}
          >
            Join Round Table (Men 18–45)
          </a>
          {' • '}
          <a href="/privacy" style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'underline', fontWeight: 600 }}>Privacy Policy &amp; GDPR</a>
          {' • '}
          <a
            href="/admin"
            onClick={handleGoToAdmin}
            style={{ color: 'rgba(255, 255, 255, 0.75)', textDecoration: 'underline', fontWeight: 600 }}
          >
            Round Table Organiser &amp; Admin Portal (/admin)
          </a>
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)' }}>
          Built for voluntary community service. Santa tracking, street routes, and donations are managed by each local Round Table.
        </p>
      </footer>
    </div>
  );
}
