import React, { useState } from 'react';
import { Sparkles, MapPin, Share2, Check } from 'lucide-react';

export default function Hero({ tableData }) {
  const table = tableData?.table || {};
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: "Track Santa's sleigh live with Beverley Round Table!",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <header id="hero" style={{
      padding: '70px 20px 50px 20px',
      textAlign: 'center',
      background: 'radial-gradient(circle at center, rgba(251, 175, 51, 0.08) 0%, transparent 70%)',
      position: 'relative'
    }}>
      {/* Festive Pill Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(251, 175, 51, 0.12)',
        border: '1px solid rgba(251, 175, 51, 0.4)',
        padding: '6px 16px',
        borderRadius: '30px',
        color: 'var(--primary)',
        fontSize: '13px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '20px'
      }}>
        <Sparkles size={16} />
        <span>Official Round Table Santa Sleigh 2026</span>
      </div>

      {/* Main Headline */}
      <h1 style={{
        fontSize: 'clamp(36px, 6vw, 64px)',
        lineHeight: 1.15,
        margin: '0 auto 20px auto',
        maxWidth: '900px',
        color: 'var(--text-main)',
        textShadow: '0 4px 20px rgba(0,0,0,0.8)'
      }}>
        FOLLOW SANTA <span style={{ color: 'var(--primary)' }}>LIVE</span> ON HIS JOURNEY
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: '18px',
        color: 'var(--text-muted)',
        maxWidth: '650px',
        margin: '0 auto 35px auto',
        textShadow: '0 2px 10px rgba(0,0,0,0.9)'
      }}>
        Follow Santa live on his journey, check when he is visiting your street, and help us raise vital funds for the local community this Christmas!
      </p>

      {/* CTA Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <a href="#tracker" className="btn-primary">
          <MapPin size={20} />
          Track Santa Live
        </a>

        <button
          onClick={handleShare}
          className="btn-secondary"
          title="Share this tracker"
          aria-label="Share this tracker"
        >
          {copied ? <Check size={18} color="#22c55e" /> : <Share2 size={18} />}
          <span>{copied ? "Link Copied!" : "Share Tracker"}</span>
        </button>
      </div>
    </header>
  );
}
