import React from 'react';
import { Globe, Users, Heart } from 'lucide-react';

export default function AboutSection({ tableData }) {
  const currentYear = new Date().getFullYear();
  const table = tableData?.table || {};
  const tableName = table.name || "Beverley Round Table";

  const socialLinks = [
    { label: "Website", url: "https://beverleyroundtable.co.uk", icon: "🌐" },
    { label: "Facebook", url: "https://www.facebook.com/beverleyroundtable", icon: "📘" },
    { label: "Instagram", url: "https://www.instagram.com/beverleyroundtable/", icon: "📸" },
    { label: "TikTok", url: "https://www.tiktok.com/@beverleyroundtable", icon: "🎵" }
  ];

  return (
    <section id="about" style={{
      padding: '40px 20px 60px 20px',
      maxWidth: '900px',
      margin: '0 auto',
      scrollMarginTop: '80px'
    }}>
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          WHO <span style={{ color: 'var(--primary)' }}>WE ARE</span>
        </h2>
      </div>

      {/* About Card */}
      <div style={{
        background: 'rgba(21, 21, 19, 0.9)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '40px 30px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <p style={{ fontSize: '20px', marginBottom: '18px', fontWeight: 600 }}>
          The Santa Sleigh is proudly organized by <strong style={{ color: 'var(--primary)' }}>{tableName}</strong>.
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.7', marginBottom: '24px', maxWidth: '750px', margin: '0 auto 24px auto' }}>
          Round Table is an events-based club for young men aged 18–45 focused on delivering a rich programme of social and community events. Whether it's trying a new sport, going on an adventure, or raising money for our communities, we aim to have fun, make friends, and live life to the fullest.
        </p>

        <p className="brand-font" style={{ fontSize: '17px', color: '#ffffff', letterSpacing: '1px', marginBottom: '30px' }}>
          Find the friends you've been missing. <span style={{ color: 'var(--primary)' }}>Do More in {currentYear}.</span>
        </p>

        {/* Social Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {socialLinks.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                borderRadius: '50px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
