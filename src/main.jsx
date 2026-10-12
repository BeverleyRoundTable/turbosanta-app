import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("TurboSanta caught a rendering error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1D1D1A',
          color: '#FFFFFF',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#FBAF33', marginBottom: '12px', fontFamily: 'Eurostile, sans-serif' }}>
            🎅 Sleigh Dashboard Notice
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '480px', marginBottom: '24px', fontSize: '14px' }}>
            {this.state.error?.message || "An unexpected error occurred while loading this view."}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#FBAF33',
                color: '#000',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('turbosanta_admin_session');
                window.location.href = '/?view=landing';
              }}
              style={{
                background: '#161614',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '10px 22px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Go to Landing Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
