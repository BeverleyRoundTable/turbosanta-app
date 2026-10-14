import React, { useEffect, useState } from 'react';
import LandingPortal from './components/LandingPortal';
import PublicSleigh from './components/PublicSleigh';
import AdminLoginModal from './components/AdminLoginModal';
import AdminPortal from './components/AdminPortal';
import { fetchTablePayload, getTableFallback } from './services/api';
import { getCurrentSession, logoutAdmin } from './services/auth';
import { Shield } from 'lucide-react';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const getInitialTable = () => {
    const tableParam = urlParams.get('table');
    if (tableParam) return tableParam;
    const host = window.location.hostname.toLowerCase();
    if (host.includes('beverleyroundtable.co.uk') || host.startsWith('beverley.')) {
      return 'beverley';
    }
    // Town subdomains on roundtablesantasleigh.co.uk (e.g. beverley.roundtablesantasleigh.co.uk)
    if (host.endsWith('.roundtablesantasleigh.co.uk')) {
      const sub = host.replace('.roundtablesantasleigh.co.uk', '').split('.')[0];
      if (sub && sub !== 'www' && sub !== 'santa' && sub !== 'demo' && sub !== 'admin' && sub !== 'turbosanta') {
        return sub;
      }
    }
    // Custom domains with subdomains (excluding root roundtablesantasleigh.co.uk)
    const parts = host.split('.');
    if (parts.length > 2 && !host.includes('roundtablesantasleigh.co.uk') && !host.includes('pages.dev') && !host.includes('workers.dev') && !host.includes('localhost')) {
      const sub = parts[0];
      if (sub !== 'www' && sub !== 'santa' && sub !== 'demo' && sub !== 'admin' && sub !== 'turbosanta') {
        return sub;
      }
    }
    return null;
  };
  const initialTableParam = getInitialTable();
  const initialAdminParam = urlParams.get('admin') === '1' || urlParams.get('admin') === 'true' || urlParams.get('god') === '1' || urlParams.get('god') === 'true';
  const isPublicExplicitlyRequested = urlParams.get('view') === 'public' || urlParams.get('public') === '1';
  const isLandingRequested = urlParams.get('view') === 'landing' || urlParams.get('landing') === '1';
  const [landingRequested, setLandingRequested] = useState(isLandingRequested);

  const pathname = window.location.pathname.toLowerCase();
  if (pathname === '/gift-aid' || pathname === '/gift-aid/' || pathname === '/sleigh/gift_aid' || pathname === '/sleigh/gift_aid/') {
    window.location.replace(`/gift_aid.html${window.location.search}`);
    return null;
  }

  // Admin Authentication State
  const initialSession = getCurrentSession();
  const [adminSession, setAdminSession] = useState(initialSession);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginInitialEmail, setLoginInitialEmail] = useState('');

  // When already logged in, the default site is the Admin Portal!
  // Unless user specifically requested public or landing preview.
  const shouldDefaultToAdmin = Boolean(
    initialAdminParam || 
    (initialSession && !isPublicExplicitlyRequested && !landingRequested)
  );

  const [viewMode, setViewMode] = useState(shouldDefaultToAdmin ? 'admin' : 'public');

  // Active table slug:
  // 1. Explicit ?table= query parameter or subdomain
  // 2. Active admin session's table slug
  // 3. Fallback to null (triggers LandingPortal if not logged in)
  const resolvedTableSlug = initialTableParam || (initialSession ? (initialSession.tableSlug || initialSession.tableId || 'beverley') : null);
  const [activeTableSlug, setActiveTableSlug] = useState(resolvedTableSlug);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(Boolean(resolvedTableSlug && (shouldDefaultToAdmin || initialTableParam)));

  const handleLogout = () => {
    logoutAdmin();
    setAdminSession(null);
    setActiveTableSlug(null);
    setLandingRequested(true);
    setViewMode('public');
    try {
      localStorage.removeItem("turbosanta_admin_session");
      localStorage.removeItem("ts2_admin_session");
      sessionStorage.clear();
    } catch (e) {}

    // Hard redirect to clean homepage at roundtablesantasleigh.co.uk
    const host = window.location.hostname.toLowerCase();
    const homeUrl = (host.includes('roundtablesantasleigh.co.uk') || host.includes('pages.dev'))
      ? 'https://roundtablesantasleigh.co.uk/'
      : window.location.origin + '/';
    window.location.replace(homeUrl);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isAdminRequested = params.get('admin') === '1' || params.get('admin') === 'true' || params.get('god') === '1' || params.get('god') === 'true';
    if (isAdminRequested) {
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
        console.error("Payload load error, falling back to cached/default data:", err);
        setTableData(getTableFallback(activeTableSlug));
        setLoading(false);
      });
  }, [activeTableSlug]);

  // ROOT LANDING & PORTAL LOGIN VIEW (when no table is specified, or landing view requested)
  const isLandingView = (landingRequested || !activeTableSlug) && viewMode !== 'admin';
  if (isLandingView) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <LandingPortal
          session={adminSession}
          onOpenLogin={(email) => {
            if (email) setLoginInitialEmail(email);
            setIsLoginModalOpen(true);
          }}
          onSelectTable={(slug) => {
            setLandingRequested(false);
            setActiveTableSlug(slug);
            const url = new URL(window.location.href);
            url.searchParams.delete('view');
            url.searchParams.delete('landing');
            url.searchParams.set('table', slug);
            window.history.pushState(null, '', url.pathname + url.search);
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
            setLandingRequested(false);
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
        backgroundColor: '#1D1D1A'
      }}>
        <div style={{
          width: '54px',
          height: '54px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: 'var(--primary, #FBAF33)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <h2 className="brand-font" style={{ color: 'var(--primary, #FBAF33)', fontSize: '22px' }}>
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
        onLogout={handleLogout}
        tableData={tableData}
        onUpdateTableData={setTableData}
      />
    );
  }

  // OPTIMAL PUBLIC SLEIGH TRACKER VIEW
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* If logged in as admin, show subtle top bar with button to switch to God Mode */}
      {adminSession && (
        <div style={{
          background: '#000',
          borderBottom: '1px solid var(--primary, #FBAF33)',
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <span style={{ color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} />
            <span>Signed in as <strong>{adminSession.email}</strong></span>
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setViewMode('admin')}
              className="brand-font"
              style={{
                background: 'var(--primary, #FBAF33)',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '11px',
                letterSpacing: '1px'
              }}
            >
              Open God Mode Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid #7f1d1d',
                borderRadius: '4px',
                padding: '6px 12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* The Optimal Santa Sleigh Public Page */}
      <PublicSleigh
        tableData={tableData}
        activeTableSlug={activeTableSlug}
        onOpenLogin={() => {
          if (adminSession) {
            setViewMode('admin');
          } else {
            setIsLoginModalOpen(true);
          }
        }}
      />

      {/* Admin Login Modal (Magic Link & Google Workspace) */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        initialEmail={loginInitialEmail}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(session) => {
          setAdminSession(session);
          const slug = session.tableSlug || activeTableSlug || 'beverley';
          setActiveTableSlug(slug);
          setViewMode('admin');
          setLandingRequested(false);
          window.history.pushState(null, '', `/?table=${encodeURIComponent(slug)}&admin=1`);
        }}
      />
    </div>
  );
}
