import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LiveMap from './components/LiveMap';
import DonationThermometer from './components/DonationThermometer';
import RouteSchedule from './components/RouteSchedule';
import FaqSection from './components/FaqSection';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';
import ElfChatWidget from './components/ElfChatWidget';
import AdminLoginModal from './components/AdminLoginModal';
import AdminPortal from './components/AdminPortal';
import { fetchTablePayload } from './services/api';
import { getCurrentSession } from './services/auth';
import { MapPin, Shield } from 'lucide-react';

import LandingPortal from './components/LandingPortal';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTableParam = urlParams.get('table');
  const initialAdminParam = urlParams.get('admin') === '1';

  const [activeTableSlug, setActiveTableSlug] = useState(initialTableParam || null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(!!initialTableParam);
  const [showFab, setShowFab] = useState(false);

  // Admin Authentication State
  const [adminSession, setAdminSession] = useState(getCurrentSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginInitialEmail, setLoginInitialEmail] = useState('');
  const [viewMode, setViewMode] = useState(initialAdminParam && adminSession ? 'admin' : 'public');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      if (adminSession) {
        setViewMode('admin');
      } else {
        setIsLoginModalOpen(true);
      }
    }
  }, [adminSession]);

  useEffect(() => {
    if (!activeTableSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchTablePayload(activeTableSlug)
      .then(data => {
        setTableData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Payload load error:", err);
        setTableData({
          table: {
            id: activeTableSlug,
            name: `${activeTableSlug.charAt(0).toUpperCase() + activeTableSlug.slice(1)} Round Table`,
            sleigh_display_name: `${activeTableSlug.charAt(0).toUpperCase() + activeTableSlug.slice(1)} Round Table Santa Sleigh`,
            fundraising_goal: 8000,
            total_raised: 19,
            donate_url: 'https://www.zeffy.com/en-GB/donation-form/beverley-round-table-for-our-community'
          },
          routes: [
            {
              id: `${activeTableSlug}_route_1`,
              name: 'Main Route',
              date: '2026-12-09',
              start_time: '18:00',
              end_time: '20:30'
            }
          ],
          streets: [
            { id: 1, route_id: `${activeTableSlug}_route_1`, street_name: 'High Street' },
            { id: 2, route_id: `${activeTableSlug}_route_1`, street_name: 'Church Lane' }
          ]
        });
        setLoading(false);
      });
  }, [activeTableSlug]);

  // Floating Action Button on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setShowFab(true);
      } else {
        setShowFab(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ROOT LANDING & PORTAL LOGIN VIEW (when no table is specified)
  if (!activeTableSlug && viewMode !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <LandingPortal
          session={adminSession}
          onOpenLogin={(email) => {
            if (email) setLoginInitialEmail(email);
            setIsLoginModalOpen(true);
          }}
          onSelectTable={(slug) => {
            setActiveTableSlug(slug);
            window.history.pushState(null, '', `/?table=${encodeURIComponent(slug)}`);
          }}
        />

        {/* Admin Login Modal (Magic Link & Google Workspace) */}
        <AdminLoginModal
          isOpen={isLoginModalOpen}
          initialEmail={loginInitialEmail}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(session) => {
            setAdminSession(session);
            const slug = session.tableSlug || 'beverley';
            setActiveTableSlug(slug);
            setViewMode('admin');
            window.history.pushState(null, '', `/?table=${encodeURIComponent(slug)}&admin=1`);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-dark)'
      }}>
        <div style={{
          width: '54px',
          height: '54px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <h2 className="brand-font" style={{ color: 'var(--primary)', fontSize: '22px' }}>
          Loading Sleigh Radar...
        </h2>
      </div>
    );
  }

  // IF ADMIN VIEW IS ACTIVE AND LOGGED IN
  if (viewMode === 'admin' && adminSession) {
    return (
      <AdminPortal
        session={adminSession}
        onLogout={() => {
          setAdminSession(null);
          setViewMode('public');
        }}
        tableData={tableData}
        onUpdateTableData={setTableData}
      />
    );
  }

  // PUBLIC TRACKER VIEW
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* If logged in as admin, show subtle top bar with button to switch to God Mode */}
      {adminSession && (
        <div style={{
          background: '#000',
          borderBottom: '1px solid var(--primary)',
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px'
        }}>
          <span style={{ color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} />
            <span>Signed in as <strong>{adminSession.email}</strong></span>
          </span>
          <button
            onClick={() => setViewMode('admin')}
            style={{
              background: 'var(--primary)',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '11px',
              textTransform: 'uppercase'
            }}
          >
            Open God Mode Dashboard
          </button>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        tableData={tableData}
        onBackToPortal={() => {
          setActiveTableSlug(null);
          window.history.pushState(null, '', '/');
        }}
      />

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Hero tableData={tableData} />
        <LiveMap tableData={tableData} />
        <DonationThermometer tableData={tableData} />
        <RouteSchedule tableData={tableData} />

        {/* Inside Santa's Workshop Blueprint (from santasleigh.html) */}
        <section id="blueprint" style={{
          padding: '50px 20px',
          maxWidth: '1000px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 10px 0' }}>
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
              src="/blueprint.html"
              title="Santa Sleigh Blueprint"
              style={{ width: '100%', height: '560px', border: 'none', borderRadius: '18px', background: '#151513' }}
              loading="lazy"
            />
          </div>
        </section>

        {/* Build & Community Partners Section (Conditionally rendered, hides if none defined) */}
        {(() => {
          const tableSlug = tableData?.table?.slug;
          const partners = (tableData?.table?.partners && tableData.table.partners.length > 0)
            ? tableData.table.partners
            : (tableSlug === 'beverley' ? [
                { name: "Zendure", role: "Official Power Partner", description: "Provided clean green portable power stations to keep the illuminations glowing bright and music playing loud.", url: "https://zendure.co.uk/" },
                { name: "Greens Signmakers", role: "Signage & Vinyl Craft", description: "Transformed the electric tuk-tuk into a show-stopping Santa Sleigh with eco-friendly signage and bespoke liveries.", url: "https://greens-signmakers.co.uk/" },
                { name: "Beverley Town Council", role: "Civic & Audio Grant", description: "Generously funded high-definition audio equipment so Santa's carols spread clearer and louder than ever.", url: "https://www.beverley.gov.uk/" },
                { name: "Acklams Coaches", role: "Sleigh Hangar & Depot", description: "Housing the sleigh safely in their depot throughout December, keeping Santa's ride secure and protected.", url: "https://acklamscoaches.co.uk/" }
              ] : []);

          if (!partners || partners.length === 0) return null;

          return (
            <section id="partners" style={{
              padding: '50px 20px',
              maxWidth: '1100px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 10px 0' }}>
                COMMUNITY <span style={{ color: '#d31c1c' }}>PARTNERS</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '32px' }}>
                Meet the local organisations and businesses supporting our Santa Sleigh for the community.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                textAlign: 'left'
              }}>
                {partners.map((p, idx) => (
                  <div key={idx} style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
                    <div style={{ color: p.role?.includes('Power') ? '#00f0ff' : 'var(--primary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, marginBottom: '6px' }}>
                      {p.role || 'Community Partner'}
                    </div>
                    <h3 className="brand-font" style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
                      {p.name}
                    </h3>
                    {p.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
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

        <FaqSection />
        <AboutSection tableData={tableData} />

        {/* Live Webhook Ticker Bar (from santasleigh.html) */}
        <section style={{
          background: '#000000',
          borderTop: '1px solid rgba(211,28,28,0.3)',
          borderBottom: '1px solid rgba(211,28,28,0.3)',
          padding: '16px 24px',
          position: 'relative',
          zIndex: 20
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#d31c1c',
                boxShadow: '0 0 10px #d31c1c',
                animation: 'pulse-ring 1.5s infinite'
              }} />
              <span className="brand-font" style={{ fontSize: '12px', letterSpacing: '1.5px', color: '#e5e7eb', textTransform: 'uppercase' }}>
                Live Zeffy Webhook
              </span>
            </div>

            <div className="brand-font" style={{ fontSize: '22px', color: '#ffffff' }}>
              £<span style={{ color: 'var(--primary)' }}>{tableData?.table?.total_raised || 19}</span> <span style={{ color: '#d31c1c', fontSize: '16px' }}>Raised</span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Listening for Zeffy drops & Gift Aid declarations...
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        tableData={tableData}
        onOpenAdminModal={() => {
          if (adminSession) {
            setViewMode('admin');
          } else {
            setIsLoginModalOpen(true);
          }
        }}
      />

      {/* Floating Action Button for Map */}
      {showFab && (
        <a
          href="#tracker"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            background: 'var(--primary)',
            color: '#000000',
            padding: '12px 20px',
            borderRadius: '50px',
            fontFamily: 'Eurostile, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            textTransform: 'uppercase',
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9998,
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <MapPin size={18} />
          <span>Live Map</span>
        </a>
      )}

      {/* Floating AI Sleigh Elf Chat Widget */}
      <ElfChatWidget tableData={tableData} />

      {/* Admin Login Modal (Magic Link & Google Workspace) */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(session) => {
          setAdminSession(session);
          setViewMode('admin');
        }}
      />
    </div>
  );
}
