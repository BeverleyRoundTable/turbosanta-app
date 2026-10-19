import React from 'react';

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
        &copy; {currentYear} <strong>{displayName}</strong>. All rights reserved. •{' '}
        <a
          href="/privacy"
          style={{
            color: 'var(--primary)',
            textDecoration: 'underline',
            transition: 'color 0.2s',
            fontWeight: 600
          }}
        >
          Privacy Policy &amp; GDPR
        </a>
      </p>

      <p style={{ margin: '0 0 20px 0', fontSize: '13px' }}>
        Powered by <strong>TurboSanta 2.0</strong> • Built on Cloudflare Edge + Google Gemini AI •{' '}
        <a
          href="https://paymentrequest.natwestpayit.com/reusable-link/2f1fd0ee-360a-4bbd-8e9a-fd07e641970e"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'rgba(255, 255, 255, 0.45)',
            textDecoration: 'underline',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'}
        >
          Support the Project
        </a>
      </p>
    </footer>
  );
}
