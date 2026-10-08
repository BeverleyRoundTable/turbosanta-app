import React from 'react';
import { Lock } from 'lucide-react';

export default function Footer({ tableData, onOpenAdminModal }) {
  const currentYear = new Date().getFullYear();
  const table = tableData?.table || {};
  const displayName = table.sleigh_display_name || "Beverley Round Table Santa Sleigh";

  return (
    <footer style={{
      textAlign: 'center',
      padding: '50px 20px 40px 20px',
      borderTop: '1px solid var(--border)',
      marginTop: '60px',
      background: '#0d0d0b',
      color: 'var(--text-muted)',
      fontSize: '14px'
    }}>
      <p style={{ margin: '0 0 10px 0' }}>
        &copy; {currentYear} <strong>{displayName}</strong>. All rights reserved.
      </p>

      <p style={{ margin: '0 0 20px 0', fontSize: '13px' }}>
        Powered by <strong>TurboSanta 2.0</strong> • Built on Cloudflare Edge + Google Gemini AI
      </p>

      {/* Admin Portal Gateway Link */}
      <div style={{ marginTop: '16px' }}>
        <button
          type="button"
          onClick={onOpenAdminModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--primary)';
            e.currentTarget.style.background = 'rgba(251, 175, 51, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
            e.currentTarget.style.background = 'none';
          }}
        >
          <Lock size={13} />
          <span>Table Volunteer / Admin Sign In (@roundtable.org.uk)</span>
        </button>
      </div>
    </footer>
  );
}
