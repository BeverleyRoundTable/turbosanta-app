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

export default function App() {
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFab, setShowFab] = useState(false);

  // Admin Authentication State
  const [adminSession, setAdminSession] = useState(getCurrentSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('public'); // 'public' or 'admin'

  // Extract table from query string ?table=beverley or default to beverley
  const getTableSlug = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('table') || 'beverley';
  };

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
    const slug = getTableSlug();
    fetchTablePayload(slug)
      .then(data => {
        setTableData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Payload load error:", err);
        setTableData({
          table: {
            id: 'beverley_247',
            name: 'Beverley Round Table',
            sleigh_display_name: 'Beverley Round Table Santa Sleigh',
            fundraising_goal: 8000,
            total_raised: 19,
            donate_url: 'https://www.zeffy.com/en-GB/donation-form/beverley-round-table-for-our-community'
          },
          routes: [
            {
              id: 'bev_east_route',
              name: 'East Route',
              date: '2026-12-09',
              start_time: '18:00',
              end_time: '20:30'
            }
          ],
          streets: [
            { id: 1, route_id: 'bev_east_route', street_name: 'New Road' },
            { id: 2, route_id: 'bev_east_route', street_name: 'Old Hill' },
            { id: 3, route_id: 'bev_east_route', street_name: 'Lawless Lane' }
          ]
        });
        setLoading(false);
      });
  }, []);

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
      <Navbar tableData={tableData} />

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

        {/* Build Partners Section (from santasleigh.html) */}
        <section id="partners" style={{
          padding: '50px 20px',
          maxWidth: '1100px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 10px 0' }}>
            OUR BUILD <span style={{ color: '#d31c1c' }}>PARTNERS</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '32px' }}>
            Meet the incredible local organisations who provided the equipment, craft, and support to bring our electric Tuk-Tuk sleigh to life.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            textAlign: 'left'
          }}>
            <div style={{ background: '#151513', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '16px', padding: '22px' }}>
              <div style={{ color: '#00f0ff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, marginBottom: '6px' }}>Official Power Partner</div>
              <h3 className="brand-font" style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>Zendure</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                Provided clean green portable power stations to keep the illuminations glowing bright and music playing loud.
              </p>
              <a href="https://zendure.co.uk/" target="_blank" rel="noopener noreferrer" style={{ color: '#00f0ff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>
                Visit Zendure &rarr;
              </a>
            </div>

            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
              <div style={{ color: '#d31c1c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, marginBottom: '6px' }}>Signage & Vinyl Craft</div>
              <h3 className="brand-font" style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>Greens Signmakers</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                Transformed the electric tuk-tuk into a show-stopping Santa Sleigh with eco-friendly signage and bespoke liveries.
              </p>
              <a href="https://greens-signmakers.co.uk/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>
                Visit Greens &rarr;
              </a>
            </div>

            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
              <div style={{ color: '#d31c1c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, marginBottom: '6px' }}>Civic & Audio Grant</div>
              <h3 className="brand-font" style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>Beverley Town Council</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                Generously funded high-definition audio equipment so Santa's carols spread clearer and louder than ever.
              </p>
              <a href="https://www.beverley.gov.uk/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>
                Visit Town Council &rarr;
              </a>
            </div>

            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
              <div style={{ color: '#d31c1c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, marginBottom: '6px' }}>Sleigh Hangar & Depot</div>
              <h3 className="brand-font" style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>Acklams Coaches</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                Housing the sleigh safely in their depot throughout December, keeping Santa's ride secure and protected.
              </p>
              <a href="https://acklamscoaches.co.uk/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none' }}>
                Visit Acklams &rarr;
              </a>
            </div>
          </div>
        </section>

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
