import React, { useEffect, useState, Suspense, lazy } from 'react';
import { fetchTablePayload, getTableFallback } from './services/api';
import { getCurrentSession, logoutAdmin } from './services/auth';
import { Shield } from 'lucide-react';

const PublicDirectory = lazy(() => import('./components/PublicDirectory'));
const LandingPortal = lazy(() => import('./components/LandingPortal'));
const PublicSleigh = lazy(() => import('./components/PublicSleigh'));
const AdminLoginModal = lazy(() => import('./components/AdminLoginModal'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));

const FullPageLoader = ({ label = 'Loading Sleigh Radar...' }) => (
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
      {label}
    </h2>
  </div>
);

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const host = window.location.hostname.toLowerCase();

  const getInitialTable = () => {
    const tableParam = urlParams.get('table');
    if (tableParam) return tableParam.toLowerCase().trim();
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
  const initialAdminParam =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    host.startsWith('admin.') ||
    urlParams.get('admin') === '1' ||
    urlParams.get('admin') === 'true' ||
    urlParams.get('god') === '1' ||
    urlParams.get('god') === 'true';

  const isPublicExplicitlyRequested = urlParams.get('view') === 'public' || urlParams.get('public') === '1';
  const isGatewayRequested = urlParams.get('view') === 'landing' || urlParams.get('view') === 'gateway' || urlParams.get('landing') === '1';
  const [gatewayRequested, setGatewayRequested] = useState(isGatewayRequested);
  const [isAdminRoute, setIsAdminRoute] = useState(initialAdminParam);

  const cleanRouteMap = {
    '/tracker': '/tracker.html',
    '/address': '/address.html',
    '/addresses': '/address.html',
    '/crew': '/crew.html',
    '/giftaid': '/gift_aid.html',
    '/gift-aid': '/gift_aid.html',
    '/gift_aid': '/gift_aid.html',
    '/sleigh/gift_aid': '/gift_aid.html',
    '/route_planner': '/route_planner.html',
    '/route-planner': '/route_planner.html',
    '/qr_poster': '/qr_poster.html',
    '/qr-poster': '/qr_poster.html',
    '/beacon': '/beacon.html',
    '/god_mode': '/god_mode.html',
    '/god-mode': '/god_mode.html',
    '/memory_book': '/memory_book.html',
    '/memory-book': '/memory_book.html',
    '/migrate': '/migrate.html',
    '/season_wrap': '/season_wrap.html',
    '/partner_report': '/partner_report.html',
    '/volunteer_cert': '/volunteer_cert.html',
    '/guide': '/guide.html',
    '/hub': '/hub.html',
    '/embed': '/embed.html'
  };

  // Admin Authentication State
  const initialSession = getCurrentSession();
  const [adminSession, setAdminSession] = useState(initialSession);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginInitialEmail, setLoginInitialEmail] = useState(initialTableParam || '');

  // Default to Admin Portal only when on /admin (or ?admin=1) and logged in
  const shouldDefaultToAdmin = Boolean(
    initialAdminParam && initialSession && !isPublicExplicitlyRequested && !gatewayRequested
  );

  const [viewMode, setViewMode] = useState(shouldDefaultToAdmin ? 'admin' : 'public');

  // Active table slug:
  // On public root (/), initialTableParam is null -> renders PublicDirectory.
  // On /admin, resolves from ?table= param or active adminSession.
  const resolvedTableSlug = initialTableParam || (initialAdminParam && initialSession ? (initialSession.tableSlug || initialSession.tableId || 'beverley') : null);
  const [activeTableSlug, setActiveTableSlug] = useState(resolvedTableSlug);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(Boolean(resolvedTableSlug && (shouldDefaultToAdmin || initialTableParam)));

  const handleLogout = () => {
    logoutAdmin();
    setAdminSession(null);
    setActiveTableSlug(null);
    setGatewayRequested(true);
    setViewMode('public');
    try {
      localStorage.removeItem("turbosanta_admin_session");
      localStorage.removeItem("ts2_admin_session");
      sessionStorage.clear();
    } catch (e) {}

    // Redirect back to /admin login gateway
    const logoutUrl = (host.includes('roundtablesantasleigh.co.uk') || host.includes('pages.dev'))
      ? 'https://roundtablesantasleigh.co.uk/admin'
      : window.location.origin + '/admin';
    window.location.replace(logoutUrl);
  };

  useEffect(() => {
    if (isAdminRoute && !gatewayRequested) {
      if (adminSession) {
        const isBeverley = adminSession.email === 'beverley247@roundtable.org.uk' || adminSession.tableSlug === 'beverley' || (adminSession.email && adminSession.email.includes('beverley'));
        if (adminSession.isNationalAdmin && !isBeverley) {
          window.location.href = '/national.html';
          return;
        }
        const targetSlug = initialTableParam || adminSession.tableSlug || adminSession.tableId || 'beverley';
        if (!activeTableSlug) setActiveTableSlug(targetSlug);
        setViewMode('admin');
      } else if (initialTableParam) {
        setLoginInitialEmail(initialTableParam);
        setIsLoginModalOpen(true);
      }
    }
  }, [adminSession, isAdminRoute, gatewayRequested, initialTableParam, activeTableSlug]);

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

  if (cleanRouteMap[pathname]) {
    window.location.replace(`${cleanRouteMap[pathname]}${window.location.search}`);
    return null;
  }

  // 1. PUBLIC ROOT DIRECTORY VIEW (roundtablesantasleigh.co.uk/)
  // Shown whenever a visitor lands on the root domain without a specific table or /admin path
  const isPublicRootDirectory = !isAdminRoute && !activeTableSlug && viewMode !== 'admin';
  if (isPublicRootDirectory) {
    return (
      <Suspense fallback={<FullPageLoader label="Loading Round Table Sleigh Directory..." />}>
        <PublicDirectory
          session={adminSession}
          onNavigateAdmin={() => {
            setIsAdminRoute(true);
            if (adminSession && !gatewayRequested) {
              const slug = adminSession.tableSlug || adminSession.tableId || 'beverley';
              setActiveTableSlug(slug);
              setViewMode('admin');
              window.history.pushState(null, '', `/admin?table=${encodeURIComponent(slug)}`);
            } else {
              window.history.pushState(null, '', '/admin');
            }
          }}
          onSelectTable={(slug) => {
            setActiveTableSlug(slug);
            const url = new URL(window.location.href);
            url.searchParams.set('table', slug);
            window.history.pushState(null, '', url.pathname + url.search);
          }}
        />
      </Suspense>
    );
  }

  // 2. ORGANISER COMMAND & ADMIN LOGIN GATEWAY (/admin when not logged in or when gateway requested)
  const isOrganiserGateway = isAdminRoute && (gatewayRequested || !adminSession || viewMode !== 'admin');
  if (isOrganiserGateway) {
    return (
      <Suspense fallback={<FullPageLoader label="Loading Table Command Gateway..." />}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <LandingPortal
            session={adminSession}
            onOpenLogin={(email) => {
              if (email) setLoginInitialEmail(email);
              setIsLoginModalOpen(true);
            }}
            onSelectTable={(slug) => {
              setGatewayRequested(false);
              setIsAdminRoute(false);
              setActiveTableSlug(slug);
              window.history.pushState(null, '', `/?table=${encodeURIComponent(slug)}`);
            }}
          />

          {/* Admin Login Modal (Magic Link & Google Workspace) */}
          {isLoginModalOpen && (
            <AdminLoginModal
              isOpen={isLoginModalOpen}
              initialEmail={loginInitialEmail}
              onClose={() => setIsLoginModalOpen(false)}
              onLoginSuccess={(session) => {
                setAdminSession(session);
                const isBeverley = session.email === 'beverley247@roundtable.org.uk' || session.tableSlug === 'beverley' || (session.email && session.email.includes('beverley'));
                if (session.isNationalAdmin && !isBeverley) {
                  window.location.href = '/national.html';
                  return;
                }
                const slug = session.tableSlug || 'beverley';
                setActiveTableSlug(slug);
                setViewMode('admin');
                setGatewayRequested(false);
                window.history.pushState(null, '', `/admin?table=${encodeURIComponent(slug)}`);
              }}
            />
          )}
        </div>
      </Suspense>
    );
  }

  if (loading) {
    return <FullPageLoader />;
  }

  // 3. AUTHENTICATED TABLE ADMIN PORTAL (/admin)
  if (viewMode === 'admin' && adminSession) {
    return (
      <Suspense fallback={<FullPageLoader label="Loading Mission Control..." />}>
        <AdminPortal
          session={adminSession}
          onLogout={handleLogout}
          tableData={tableData}
          onUpdateTableData={setTableData}
        />
      </Suspense>
    );
  }

  // 4. PUBLIC SLEIGH TRACKER VIEW ({town}.roundtablesantasleigh.co.uk or /?table={town})
  return (
    <Suspense fallback={<FullPageLoader />}>
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
                onClick={() => {
                  const isBeverley = adminSession.email === 'beverley247@roundtable.org.uk' || adminSession.tableSlug === 'beverley' || (adminSession.email && adminSession.email.includes('beverley'));
                  if (adminSession.isNationalAdmin && !isBeverley) {
                    window.location.href = '/national.html';
                    return;
                  }
                  setIsAdminRoute(true);
                  setViewMode('admin');
                  window.history.pushState(null, '', `/admin?table=${encodeURIComponent(activeTableSlug || adminSession.tableSlug || 'beverley')}`);
                }}
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
              const isBeverley = adminSession.email === 'beverley247@roundtable.org.uk' || adminSession.tableSlug === 'beverley' || (adminSession.email && adminSession.email.includes('beverley'));
              if (adminSession.isNationalAdmin && !isBeverley) {
                window.location.href = '/national.html';
                return;
              }
              setIsAdminRoute(true);
              setViewMode('admin');
              window.history.pushState(null, '', `/admin?table=${encodeURIComponent(activeTableSlug || adminSession.tableSlug || 'beverley')}`);
            } else {
              setIsLoginModalOpen(true);
            }
          }}
        />

        {/* Admin Login Modal (Magic Link & Google Workspace) */}
        {isLoginModalOpen && (
          <AdminLoginModal
            isOpen={isLoginModalOpen}
            initialEmail={loginInitialEmail}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={(session) => {
              setAdminSession(session);
              const isBeverley = session.email === 'beverley247@roundtable.org.uk' || session.tableSlug === 'beverley' || (session.email && session.email.includes('beverley'));
              if (session.isNationalAdmin && !isBeverley) {
                window.location.href = '/national.html';
                return;
              }
              const slug = session.tableSlug || activeTableSlug || 'beverley';
              setActiveTableSlug(slug);
              setIsAdminRoute(true);
              setViewMode('admin');
              setGatewayRequested(false);
              window.history.pushState(null, '', `/admin?table=${encodeURIComponent(slug)}`);
            }}
          />
        )}
      </div>
    </Suspense>
  );
}
