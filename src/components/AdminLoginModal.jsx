import React, { useState } from 'react';
import { Mail, Shield, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { loginWithGoogleWorkspace } from '../services/auth';

const OFFICIAL_GOOGLE_CLIENT_ID = "174929950272-ehpf04nea7ev4j8gfosq5acg6dvfmc95.apps.googleusercontent.com";

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const googleBtnRef = React.useRef(null);

  // Initialize official Google Identity Services (GIS)
  React.useEffect(() => {
    if (!isOpen) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || OFFICIAL_GOOGLE_CLIENT_ID;

    const handleGoogleCallback = async (response) => {
      if (!response || !response.credential) return;
      setError('');
      setLoading(true);
      try {
        const session = await loginWithGoogleWorkspace(response.credential);
        onLoginSuccess(session);
        onClose();
      } catch (err) {
        setError(err.message || "Google Workspace sign-in failed.");
      } finally {
        setLoading(false);
      }
    };

    const initGsi = () => {
      if (window.google?.accounts?.id && clientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
            hd: "roundtable.org.uk"
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 320
            });
            setGsiReady(true);
          }
        } catch (err) {
          console.warn("Google Accounts ID init error:", err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
          aria-label="Close"
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
            <span>🔒 Google Authentication Enforced</span>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px 32px 32px 32px' }}>
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
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '22px', lineHeight: '1.5' }}>
              Sign in securely with your official <strong>@roundtable.org.uk</strong> Google Workspace account.
            </p>

            {/* Official Google Identity Services One-Click Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '44px',
              marginBottom: '16px'
            }}>
              <div ref={googleBtnRef} id="googleSignInBtnDiv" style={{ display: 'flex', justifyContent: 'center' }}></div>
            </div>

            {loading && (
              <div style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '14px', fontWeight: 600 }}>
                Authenticating with Google Workspace...
              </div>
            )}

            <div style={{
              marginTop: '22px',
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: '1.6'
            }}>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: '2px' }}>
                🔒 Hosted Domain Policy Active
              </div>
              <div>
                Only official <code>@roundtable.org.uk</code> Google accounts are permitted.
              </div>
              <div style={{ opacity: 0.75, marginTop: '2px' }}>
                Zero hardcoded passwords. Personal @gmail.com accounts are denied access.
              </div>
            </div>

            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'rgba(251, 175, 51, 0.08)',
              border: '1px solid rgba(251, 175, 51, 0.25)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.5,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Mail size={16} color="#FBAF33" style={{ flexShrink: 0 }} />
              <div>
                Need access to your Round Table workspace email? Contact{' '}
                <a href="mailto:secretary@roundtable.org.uk" style={{ color: '#FBAF33', fontWeight: 700, textDecoration: 'underline' }}>
                  secretary@roundtable.org.uk
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
