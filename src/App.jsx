import React, { useEffect, useState } from 'react';
import LandingPortal from './components/LandingPortal';
import PublicSleigh from './components/PublicSleigh';
import AdminLoginModal from './components/AdminLoginModal';
import AdminPortal from './components/AdminPortal';
import { fetchTablePayload, getTableFallback } from './services/api';
import { getCurrentSession } from './services/auth';
import { Shield } from 'lucide-react';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTableParam = urlParams.get('table');
  const initialAdminParam = urlParams.get('admin') === '1';

  const [activeTableSlug, setActiveTableSlug] = useState(initialTableParam || null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(!!initialTableParam);

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
        console.error("Payload load error, falling back to cached/default data:", err);
        setTableData(getTableFallback(activeTableSlug));
        setLoading(false);
      });
  }, [activeTableSlug]);

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
        onLogout={() => {
          setAdminSession(null);
          setViewMode('public');
        }}
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
          <button
            onClick={() => setViewMode('admin')}
            style={{
              background: 'var(--primary, #FBAF33)',
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
          setViewMode('admin');
        }}
      />
    </div>
  );
}
