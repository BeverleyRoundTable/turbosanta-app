import React from 'react';
import confetti from 'canvas-confetti';
import { Heart, Gift, ArrowRight, ShieldCheck } from 'lucide-react';

export default function DonationThermometer({ tableData }) {
  const table = tableData?.table || {};
  const current = Number(table.total_raised || 19);
  const target = Number(table.fundraising_goal || 8000);
  const donateUrl = table.donate_url || "https://www.zeffy.com/en-GB/donation-form/beverley-round-table-for-our-community";
  const pct = Math.min(100, Math.max(0, (current / target) * 100));

  const handleDonateClick = () => {
    // Festive Confetti Burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#FBAF33', '#D31C1C', '#FFFFFF', '#22C55E']
      });
    } catch (e) {}

    window.open(donateUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="donate" style={{
      padding: '40px 20px 60px 20px',
      maxWidth: '1000px',
      margin: '0 auto',
      scrollMarginTop: '80px'
    }}>
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          HELP US SPREAD <span style={{ color: 'var(--primary)' }}>THE MAGIC</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
          Every penny raised goes directly back into supporting our local community.
        </p>
      </div>

      {/* Thermometer Card */}
      <div style={{
        background: '#151513',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '40px 30px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        maxWidth: '560px',
        margin: '0 auto'
      }}>
        <h3 className="brand-font" style={{ fontSize: '24px', margin: '0 0 20px 0' }}>
          FUNDRAISER <span style={{ color: 'var(--primary)' }}>TARGET</span>
        </h3>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '24px',
          background: '#0d0d0b',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          margin: '20px 0',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #d31c1c 0%, #FBAF33 100%)',
            borderRadius: '12px',
            transition: 'width 1.5s ease-out',
            boxShadow: '0 0 10px rgba(251, 175, 51, 0.5)'
          }} />
        </div>

        {/* Stats */}
        <div className="brand-font" style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
          fontSize: '22px'
        }}>
          <span style={{ color: 'var(--primary)' }}>
            £{current.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            OF £{target.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Gift Aid Callout */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '13px',
          color: '#86efac',
          marginBottom: '25px'
        }}>
          <ShieldCheck size={16} />
          <span>UK Taxpayers: Add 25% extra at no cost via Gift Aid</span>
        </div>

        <div>
          <button
            onClick={handleDonateClick}
            className="btn-primary"
            style={{ width: '100%', maxWidth: '300px' }}
          >
            <Heart size={20} fill="currentColor" />
            Donate Now
          </button>
        </div>
      </div>

      {/* Volunteer Recruitment Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(29,29,26,0.95) 0%, rgba(13,13,11,0.98) 100%)',
        border: '1px solid var(--primary)',
        borderRadius: '12px',
        padding: '25px 30px',
        marginTop: '30px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        maxWidth: '800px',
        margin: '30px auto 0 auto'
      }}>
        <div style={{ flex: '1', minWidth: '280px' }}>
          <h3 className="brand-font" style={{ color: 'var(--primary)', fontSize: '22px', margin: '0 0 6px 0' }}>
            Help Keep The Sleigh Moving!
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            We need drivers, navigators, and bucket collectors. Join us as a volunteer elf this year!
          </p>
        </div>

        <a
          href="mailto:beverley247@roundtable.org.uk?subject=Santa%20Sleigh%20Volunteer%20Offer"
          className="btn-secondary"
          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
        >
          <span>Volunteer Now</span>
          <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
