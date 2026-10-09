import React, { useState } from 'react';
import { Mail, Shield, KeyRound, ArrowRight, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { requestMagicLink, verifyMagicLink, loginWithGoogleWorkspace } from '../services/auth';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess, initialEmail }) {
  const [activeTab, setActiveTab] = useState('google'); // Default to Google Workspace SSO
  const [email, setEmail] = useState(initialEmail || '');

  React.useEffect(() => {
    setEmail(initialEmail || '');
  }, [initialEmail]);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('SANTA_GOOGLE_CLIENT_ID') || ''
  );
  const [showConfigId, setShowConfigId] = useState(false);

  if (!isOpen) return null;

  // Handle Master Password / Direct Verification
  const handlePasswordLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await verifyMagicLink(email, password);
      onLoginSuccess(session);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Workspace Login
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const session = await loginWithGoogleWorkspace(email);
      onLoginSuccess(session);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20000,
      padding: '20px'
    }}>
      <div style={{
        background: '#151513',
        border: '2px solid var(--primary)',
        borderRadius: '20px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(251, 175, 51, 0.25)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={22} />
        </button>

        {/* Header */}
        <div style={{
          padding: '32px 32px 20px 32px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(251, 175, 51, 0.08) 0%, transparent 100%)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 0 20px rgba(251, 175, 51, 0.5)'
          }}>
            <Shield size={28} />
          </div>

          <h2 className="brand-font" style={{ fontSize: '26px', margin: '0 0 6px 0', color: '#fff' }}>
            God Mode 2.0
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            Round Table Volunteer & Sleigh Admin Portal
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(251, 175, 51, 0.1)',
            border: '1px solid rgba(251, 175, 51, 0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            color: 'var(--primary)',
            marginTop: '12px',
            fontWeight: 700
          }}>
            <span>🔒 Restricted to @roundtable.org.uk</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: '#0d0d0b'
        }}>
          <button
            onClick={() => { setActiveTab('google'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'google' ? '#151513' : 'transparent',
              color: activeTab === 'google' ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'google' ? '2px solid var(--primary)' : 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google Sign-In</span>
          </button>
          <button
            onClick={() => { setActiveTab('password'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'password' ? '#151513' : 'transparent',
              color: activeTab === 'password' ? 'var(--primary)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'password' ? '2px solid var(--primary)' : 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <KeyRound size={16} />
            <span>Master Password</span>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '28px 32px 32px 32px' }}>
          {error && (
            <div style={{
              background: 'rgba(211, 28, 28, 0.15)',
              border: '1px solid #d31c1c',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GOOGLE WORKSPACE OAUTH */}
          {activeTab === 'google' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                Instant single sign-on with your official <strong>@roundtable.org.uk</strong> Google Workspace account.
              </p>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google Workspace</span>
              </button>

              <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Target domain: <code>@roundtable.org.uk</code>
              </div>
            </div>
          )}

          {/* TAB 2: TABLE MASTER PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordLogin}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Table Official Email:
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px'
              }}>
                <Mail size={18} color="var(--primary)" style={{ marginRight: '10px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. beverley247@roundtable.org.uk"
                  required
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Table Master Password:
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '20px'
              }}>
                <KeyRound size={18} color="var(--primary)" style={{ marginRight: '10px' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Table Password"
                  required
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
              >
                <span>{loading ? "Verifying..." : "Verify & Enter God Mode"}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
