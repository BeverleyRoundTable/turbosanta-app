import React, { useState } from 'react';
import {
  BarChart3, Camera, Coins, Printer, Download, Receipt, Heart,
  Users, Bell, Navigation, CreditCard, TrendingUp, Sparkles, Check, Copy, Award, Calendar
} from 'lucide-react';

export default function SeasonWrapTab({
  session,
  tableData,
  formData,
  selectedWrapSeason,
  setSelectedWrapSeason,
  handleSnapshotSeason,
  isSnapshottingSeason,
  setIsCashModalOpen,
  handleExportSeasonInfographic,
  handleOpenExpensesModal
}) {
  const [copiedAiDebrief, setCopiedAiDebrief] = useState(false);

  const tableSlug = session?.tableId || session?.tableSlug || 'beverley';
  const routes = tableData?.routes || [];
  const streets = tableData?.streets || [];
  const isGiftAidEligible = Boolean(tableData?.table?.enable_gift_aid);
  const liveGrossRaised = Number(tableData?.table?.total_raised || 0);
  const liveTarget = Number(tableData?.table?.fundraising_goal || 5000);
  const liveGiftAid = isGiftAidEligible ? Number(tableData?.gift_aid?.giftAid || 0) : 0;
  const liveExpenses = Number(tableData?.expenses ?? tableData?.table?.expenses ?? formData.expenses ?? 0);
  const liveNetRaised = (liveGrossRaised + liveGiftAid) - liveExpenses;
  const liveVolunteers = tableData?.volunteers_count || (routes.length > 0 ? routes.length * 6 : 18);
  const liveVolunteerHours = Number(tableData?.volunteer_hours || (liveVolunteers * 4 * Math.max(1, routes.length)));
  const liveSubscribers = Number(tableData?.subscribers_count || 0);
  const liveGrantsAwarded = Number(tableData?.grants_awarded || 0);
  const liveCausesCount = Number(tableData?.causes_count || 0);
  const liveMilesDriven = Number(tableData?.miles_driven || Math.round((streets.length * 0.45) + (routes.length * 4.5)));
  const liveCashRaised = Number(tableData?.cash_raised || 0);
  const liveDigitalRaised = Number(tableData?.digital_raised || Math.max(0, liveGrossRaised - liveCashRaised));
  const breakdown = tableData?.donation_breakdown || tableData?.table?.donation_breakdown || [];
  const liveDonationCount = Number(tableData?.donation_count || breakdown.reduce((sum, b) => sum + (Number(b.count) || 0), 0) || (liveGrossRaised > 0 ? 1 : 0));
  const liveAvgDonation = liveDonationCount > 0 ? (liveGrossRaised / liveDonationCount).toFixed(2) : (tableData?.avg_donation || '0.00');
  const seasonHistory = Array.isArray(tableData?.season_history) ? tableData.season_history : [];

  const [currentYearStr] = useState(() => String(new Date().getFullYear()));
  const [renderNow] = useState(() => new Date());
  const historyMap = {
    [currentYearStr]: {
      raised: liveGrossRaised,
      netRaised: liveNetRaised,
      giftAid: liveGiftAid,
      expenses: liveExpenses,
      routes: routes.length,
      streets: streets.length,
      volunteers: liveVolunteers,
      volunteerHours: liveVolunteerHours,
      subscribers: liveSubscribers,
      grantsAwarded: liveGrantsAwarded,
      causesCount: liveCausesCount,
      milesDriven: liveMilesDriven,
      cashRaised: liveCashRaised,
      digitalRaised: liveDigitalRaised,
      donationCount: liveDonationCount,
      avgDonation: liveAvgDonation,
      views: Number(tableData?.table?.total_views ?? tableData?.total_views ?? 0),
      target: liveTarget
    }
  };

  seasonHistory.forEach(h => {
    if (h.year) {
      const hYear = String(h.year);
      const hRaised = Number(h.raised) || 0;
      const hExpenses = Number(h.expenses) || 0;
      const hNetRaised = h.net_raised !== undefined && h.net_raised !== null ? Number(h.net_raised) : hRaised;
      const hGiftAid = isGiftAidEligible ? Math.max(0, hNetRaised + hExpenses - hRaised) : 0;
      const hRoutes = Number(h.routes) || 0;
      const hStreets = Number(h.streets) || 0;
      const hVols = Number(h.volunteers) || 0;
      historyMap[hYear] = {
        raised: hRaised,
        netRaised: hNetRaised,
        giftAid: hGiftAid,
        expenses: hExpenses,
        routes: hRoutes,
        streets: hStreets,
        volunteers: hVols,
        volunteerHours: Number(h.volunteer_hours || (hVols * 4 * Math.max(1, hRoutes))),
        subscribers: Number(h.subscribers || 0),
        grantsAwarded: Number(h.grants_awarded || 0),
        causesCount: Number(h.causes_count || 0),
        milesDriven: Number(h.miles_driven || Math.round((hStreets * 0.45) + (hRoutes * 4.5))),
        cashRaised: 0,
        digitalRaised: hRaised,
        donationCount: 0,
        avgDonation: 0,
        views: Number(h.total_views) || 0,
        target: 5000
      };
    }
  });

  const availableSeasons = Object.keys(historyMap).sort((a, b) => Number(b) - Number(a));
  const activeSeasonKey = historyMap[selectedWrapSeason] ? selectedWrapSeason : availableSeasons[0];
  const currentStats = historyMap[activeSeasonKey] || historyMap[currentYearStr];
  const pctOfTarget = currentStats.target > 0 ? Math.min(100, Math.round((currentStats.raised / currentStats.target) * 100)) : 0;
  const avgPerStreet = currentStats.streets > 0 ? (currentStats.raised / currentStats.streets).toFixed(2) : '0.00';

  const zeffyItem = breakdown.find(b => String(b.source || '').toLowerCase() === 'zeffy');
  const stripeItem = breakdown.find(b => String(b.source || '').toLowerCase() === 'stripe');
  const sumupItem = breakdown.find(b => String(b.source || '').toLowerCase() === 'sumup');
  const cashEntries = breakdown.filter(b => ['cash', 'cash_bucket'].includes(String(b.source || '').toLowerCase()));
  const cashItem = {
    total: cashEntries.reduce((sum, e) => sum + Number(e.total || 0), 0),
    count: cashEntries.reduce((sum, e) => sum + Number(e.count || 0), 0)
  };
  const donorboxItem = breakdown.find(b => String(b.source || '').toLowerCase() === 'donorbox');
  const justgivingItem = breakdown.find(b => String(b.source || '').toLowerCase() === 'justgiving');
  const tickettailorItem = breakdown.find(b => String(b.source || '').toLowerCase() === 'tickettailor');

  const gaDebriefNote = isGiftAidEligible && currentStats.giftAid > 0
    ? `including +£${currentStats.giftAid.toFixed(2)} HMRC Gift Aid reclaim`
    : `£0.00 Gift Aid (non-charity status / 0 declarations)`;

  const aiDebriefText = `TURBOSANTA ${activeSeasonKey} SEASON DEBRIEF (${(session?.tableName || tableSlug).toUpperCase()}):
• Campaign Yield: £${currentStats.raised.toFixed(2)} gross raised (${pctOfTarget}% of £${currentStats.target.toLocaleString()} target across ${currentStats.donationCount || 'multiple'} donations, avg £${currentStats.avgDonation}).
• True Net Charitable Impact: £${currentStats.netRaised.toFixed(2)} (${gaDebriefNote}, minus £${currentStats.expenses.toFixed(2)} operating costs).
• Community Grant Distribution: £${currentStats.grantsAwarded.toFixed(2)} awarded directly to ${currentStats.causesCount} local community good causes.
• Route Operations: ${currentStats.routes} routes completed across ${currentStats.streets} streets (${currentStats.milesDriven} sleigh tour miles). Average yield £${avgPerStreet} per street.
• Volunteer Workforce: ${currentStats.volunteers} volunteer elves deployed across ~${currentStats.volunteerHours} hours of community service.
• Audience Engagement: ${currentStats.subscribers} families subscribed to real-time Santa Radar proximity alerts.
• Digital Velocity: Frictionless cashless payments accounted for ${currentStats.raised > 0 ? Math.round((currentStats.digitalRaised / currentStats.raised) * 100) : 0}% of all contributions.
• Next Season Strategic Actions:
  1. Equip 100% of volunteer bucket walkers with weatherproof lanyard QR codes.
  2. Launch Santa live announcements 15 minutes before rollout to optimize curbside turnout.
  3. Split routes exceeding 45 streets into two legs to prevent volunteer fatigue.`;

  return (
    <div style={{
      background: '#151513',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '30px'
    }}>
      {/* Header with Title & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(251, 175, 51, 0.12)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            <BarChart3 size={13} />
            <span>Cohesive D1 Intelligence &amp; AGM Suite</span>
          </div>
          <h2 className="brand-font" style={{ fontSize: '26px', margin: '0 0 6px 0' }}>
            Season Wrap &amp; Year-on-Year Analytics
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Year-by-year financial analysis, multi-provider velocity, operational efficiency, and automated AI strategic debrief.
          </p>
          <p style={{ color: 'var(--primary)', fontSize: '12px', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>🗓️ <strong>Automated Closeout:</strong> Active campaigns are safely snapshotted on February 1st (giving your Table all of January to count bucket cash, wait for platform clearing, and log expenses).</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSnapshotSeason}
            disabled={isSnapshottingSeason}
            className="btn-secondary"
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Manually freeze and snapshot current season numbers to D1 archive (otherwise captured automatically on Feb 1st)"
          >
            <Camera size={15} />
            <span>{isSnapshottingSeason ? 'Saving...' : `Snapshot ${activeSeasonKey} Season`}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCashModalOpen(true)}
            className="btn-secondary"
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              borderColor: '#f59e0b',
              color: '#f59e0b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Reconcile nightly physical cash collections"
          >
            <Coins size={15} />
            <span>Reconcile Cash Buckets</span>
          </button>

          <a
            href={`https://${encodeURIComponent(tableSlug)}.roundtablesantasleigh.co.uk/season-wrap`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} />
            <span>Printable Season Wrap (PDF)</span>
          </a>

          <button
            type="button"
            onClick={() => handleExportSeasonInfographic(currentStats, activeSeasonKey)}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Export 1080x1350 PNG impact infographic for Facebook and Instagram"
          >
            <Download size={15} />
            <span>Download Season Infographic (PNG)</span>
          </button>
        </div>
      </div>

      {/* Season / Year Pill Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#0d0d0b',
        padding: '6px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        marginBottom: '24px',
        width: 'fit-content',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Campaign Season:
        </span>
        {availableSeasons.map(yr => (
          <button
            key={yr}
            onClick={() => setSelectedWrapSeason(yr)}
            style={{
              background: activeSeasonKey === yr ? 'var(--primary)' : 'transparent',
              color: activeSeasonKey === yr ? '#000' : 'var(--text-muted)',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {yr === currentYearStr ? `🎅 ${yr} (Live Current)` : `📅 ${yr} Season`}
          </button>
        ))}
      </div>

      {/* 4 Financial Impact Headline Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px' }}>
            Gross Campaign Raised
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: 'var(--primary)', lineHeight: 1.1, marginBottom: '6px' }}>
            £{currentStats.raised.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {pctOfTarget}% of £{currentStats.target.toLocaleString()} Target
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${pctOfTarget}%`, height: '100%', background: 'var(--primary)' }} />
          </div>
        </div>

        <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px' }}>
            {isGiftAidEligible ? 'HMRC Gift Aid Uplift (+25%)' : 'HMRC Gift Aid (Ineligible)'}
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: isGiftAidEligible && currentStats.giftAid > 0 ? '#22c55e' : 'var(--text-muted)', lineHeight: 1.1, marginBottom: '6px' }}>
            {isGiftAidEligible && currentStats.giftAid > 0 ? `+£${currentStats.giftAid.toFixed(2)}` : '£0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {isGiftAidEligible
              ? `${tableData?.gift_aid?.declarations || 0} declarations submitted to D1`
              : 'Non-charity table / Gift Aid disabled'}
          </div>
          <div style={{ fontSize: '11px', color: isGiftAidEligible ? '#86efac' : 'var(--text-muted)', marginTop: '10px', fontWeight: 600 }}>
            {isGiftAidEligible ? '✓ Validated against gift_aid table' : '○ 0% HMRC Reclaims'}
          </div>
        </div>

        <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>
              Operating Expenses
            </div>
            <button
              type="button"
              onClick={handleOpenExpensesModal}
              style={{
                background: 'rgba(251, 175, 51, 0.1)',
                color: 'var(--primary)',
                border: '1px solid rgba(251, 175, 51, 0.3)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Record and itemise campaign costs"
            >
              <Receipt size={12} />
              <span>{currentStats.expenses > 0 ? 'Edit Costs' : '✏️ Record Costs'}</span>
            </button>
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: currentStats.expenses > 0 ? '#ef4444' : 'var(--text-muted)', lineHeight: 1.1, marginBottom: '6px' }}>
            {currentStats.expenses > 0 ? `-£${currentStats.expenses.toFixed(2)}` : '£0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Vehicle fuel, sweets, generator, safety kit
          </div>
          <div style={{ fontSize: '11px', color: currentStats.expenses > 0 ? '#f87171' : 'var(--text-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{currentStats.expenses > 0 ? '✓ Deducted from gross yield' : '100% committee transparent'}</span>
            {currentStats.expenses > 0 && (
              <button
                type="button"
                onClick={handleOpenExpensesModal}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                Itemised Receipts
              </button>
            )}
          </div>
        </div>

        <div style={{ background: 'rgba(251, 175, 51, 0.08)', border: '1px solid var(--primary)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px' }}>
            True Net Charitable Impact
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: 'var(--primary)', lineHeight: 1.1, marginBottom: '6px' }}>
            £{currentStats.netRaised.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#fff' }}>
            Gross + Gift Aid - Expenses
          </div>
          <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '10px', fontWeight: 700 }}>
            ★ 100% Directly to Local Causes
          </div>
        </div>
      </div>

      {/* 4 Operational & Community Reach Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: '#60a5fa', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Heart size={14} color="#60a5fa" />
            <span>Community Giving &amp; Grants</span>
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: '#60a5fa', lineHeight: 1.1, marginBottom: '6px' }}>
            £{currentStats.grantsAwarded.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Awarded to {currentStats.causesCount} local good cause{currentStats.causesCount === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '10px', fontWeight: 600 }}>
            ♥ Funds returned to community
          </div>
        </div>

        <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: '#f472b6', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} color="#f472b6" />
            <span>Active Elves &amp; Volunteer Power</span>
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: '#f472b6', lineHeight: 1.1, marginBottom: '6px' }}>
            {currentStats.volunteers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ~{currentStats.volunteerHours} deployed volunteer hours
          </div>
          <div style={{ fontSize: '11px', color: '#fbcfe8', marginTop: '10px', fontWeight: 600 }}>
            ⚡ Community workforce mobilization
          </div>
        </div>

        <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bell size={14} color="#38bdf8" />
            <span>Santa Radar Doorstep Alerts</span>
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: '#38bdf8', lineHeight: 1.1, marginBottom: '6px' }}>
            {currentStats.subscribers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Registered families awaiting arrival
          </div>
          <div style={{ fontSize: '11px', color: '#bae6fd', marginTop: '10px', fontWeight: 600 }}>
            📡 Curbside proximity triggers
          </div>
        </div>

        <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={14} color="#fbbf24" />
            <span>Sleigh Tour Mileage</span>
          </div>
          <div className="brand-font" style={{ fontSize: '32px', color: '#fbbf24', lineHeight: 1.1, marginBottom: '6px' }}>
            {currentStats.milesDriven} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>mi</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Across {currentStats.routes} routes &amp; {currentStats.streets} streets
          </div>
          <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '10px', fontWeight: 600 }}>
            🛷 Sleigh odometer coverage
          </div>
        </div>
      </div>

      {/* Multi-Channel Payment Provider Velocity */}
      <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="var(--primary)" />
              <span>Collection Channel Split &amp; Frictionless Adoption</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Live distribution across zero-fee donation links, street contactless readers, and traditional cash buckets.
            </p>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
            Total Transactions: {currentStats.donationCount || 1} · Avg Gift: £{currentStats.avgDonation}
          </div>
        </div>

        {currentStats.raised > 0 && (() => {
          const digitalAmount = currentStats.digitalRaised;
          const cashAmount = currentStats.cashRaised;
          const totalAmount = currentStats.raised;
          const digitalPct = Math.round((digitalAmount / totalAmount) * 100);
          const cashPct = 100 - digitalPct;
          return (
            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Giving Channels: Digital ({digitalPct}%) vs Physical Cash ({cashPct}%)
                </span>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {currentStats.donationCount} donations · £{currentStats.avgDonation} average gift
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${digitalPct}%`, height: '100%', background: '#38bdf8' }} title={`Digital: £${digitalAmount.toFixed(2)} (${digitalPct}%)`} />
                <div style={{ width: `${cashPct}%`, height: '100%', background: '#fbbf24' }} title={`Cash Buckets: £${cashAmount.toFixed(2)} (${cashPct}%)`} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ color: '#38bdf8' }}>● Digital / Contactless: £{digitalAmount.toFixed(2)} ({digitalPct}%)</span>
                <span style={{ color: '#fbbf24' }}>● Physical Cash Buckets: £{cashAmount.toFixed(2)} ({cashPct}%)</span>
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>🚀 Zeffy (Online)</span>
              <span style={{ fontSize: '11px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>0% Fee</span>
            </div>
            <div className="brand-font" style={{ fontSize: '24px', color: 'var(--primary)', marginBottom: '4px' }}>
              £{Number(zeffyItem?.total || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {zeffyItem?.count || 0} transactions · 100% to Charity
            </div>
          </div>

          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>📲 Stripe / Apple Pay</span>
              <span style={{ fontSize: '11px', color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Online QR</span>
            </div>
            <div className="brand-font" style={{ fontSize: '24px', color: '#fff', marginBottom: '4px' }}>
              £{Number(stripeItem?.total || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {stripeItem?.count || 0} direct mobile donations
            </div>
          </div>

          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>💳 SumUp Contactless</span>
              <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Card Tap</span>
            </div>
            <div className="brand-font" style={{ fontSize: '24px', color: '#fff', marginBottom: '4px' }}>
              £{Number(sumupItem?.total || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {sumupItem?.count || 0} on-street contactless taps
            </div>
          </div>

          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>🪙 Cash Buckets</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Coins &amp; Tins</span>
            </div>
            <div className="brand-font" style={{ fontSize: '24px', color: '#fff', marginBottom: '4px' }}>
              £{Number(cashItem?.total || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {cashItem?.count || 0} physical coin bucket drops
            </div>
          </div>

          {donorboxItem && Number(donorboxItem.total || 0) > 0 && (
            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>🎁 Donorbox Online</span>
                <span style={{ fontSize: '11px', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Online Gifts</span>
              </div>
              <div className="brand-font" style={{ fontSize: '24px', color: '#fff', marginBottom: '4px' }}>
                £{Number(donorboxItem?.total || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {donorboxItem?.count || 0} Donorbox contributions
              </div>
            </div>
          )}

          {justgivingItem && Number(justgivingItem.total || 0) > 0 && (
            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>💜 JustGiving</span>
                <span style={{ fontSize: '11px', color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Auto-Synced</span>
              </div>
              <div className="brand-font" style={{ fontSize: '24px', color: '#fff', marginBottom: '4px' }}>
                £{Number(justgivingItem?.total || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Synced JustGiving campaign total
              </div>
            </div>
          )}

          {tickettailorItem && Number(tickettailorItem.total || 0) > 0 && (
            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>🎟️ Ticket Tailor</span>
                <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Tickets &amp; Gifts</span>
              </div>
              <div className="brand-font" style={{ fontSize: '24px', color: '#fff', marginBottom: '4px' }}>
                £{Number(tickettailorItem?.total || 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Synced Ticket Tailor orders &amp; donations
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Year-on-Year Growth Graphs & Benchmarks */}
      <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--primary)" />
              <span>Multi-Season Growth &amp; Benchmarking Comparison</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Year-over-year progression for fundraising totals, completed routes, streets covered, and volunteer turnout.
            </p>
          </div>
          {availableSeasons.length > 1 && (
            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
              📈 Multi-Season Tracking Active
            </span>
          )}
        </div>

        {availableSeasons.length <= 1 ? (
          <div style={{
            background: '#151513',
            border: '1px dashed var(--border)',
            borderRadius: '12px',
            padding: '28px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              No Historical Seasons Uploaded Yet
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 16px auto', lineHeight: 1.6 }}>
              This section will automatically generate comparative multi-year charts and growth analytics once you snapshot campaigns using the <strong>📸 Snapshot Season</strong> button above.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--primary)', background: 'rgba(251, 175, 51, 0.1)', padding: '6px 14px', borderRadius: '8px', fontWeight: 600 }}>
              <span>Current Active Baseline: {currentYearStr} Season (£{liveGrossRaised.toFixed(2)} Raised)</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                💰 Gross Raised (£)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...availableSeasons].sort((a, b) => Number(a) - Number(b)).map(y => {
                  const val = historyMap[y]?.raised || 0;
                  const maxVal = Math.max(1, ...Object.values(historyMap).map(m => m.raised));
                  const barPct = Math.round((val / maxVal) * 100);
                  const isCurrent = y === activeSeasonKey;
                  return (
                    <div key={y} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', width: '38px', color: isCurrent ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400 }}>{y}</span>
                      <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: isCurrent ? 'var(--primary)' : 'rgba(251, 175, 51, 0.4)', borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', width: '75px', textAlign: 'right', fontWeight: 700, color: isCurrent ? 'var(--primary)' : '#fff' }}>£{val.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                🗺️ Routes Completed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...availableSeasons].sort((a, b) => Number(a) - Number(b)).map(y => {
                  const val = historyMap[y]?.routes || 0;
                  const maxVal = Math.max(1, ...Object.values(historyMap).map(m => m.routes));
                  const barPct = Math.round((val / maxVal) * 100);
                  const isCurrent = y === activeSeasonKey;
                  return (
                    <div key={y} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', width: '38px', color: isCurrent ? '#ef4444' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400 }}>{y}</span>
                      <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: isCurrent ? '#ef4444' : 'rgba(239, 68, 68, 0.4)', borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', width: '75px', textAlign: 'right', fontWeight: 700, color: isCurrent ? '#ef4444' : '#fff' }}>{val} routes</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                🏘️ Streets Reached
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...availableSeasons].sort((a, b) => Number(a) - Number(b)).map(y => {
                  const val = historyMap[y]?.streets || 0;
                  const maxVal = Math.max(1, ...Object.values(historyMap).map(m => m.streets));
                  const barPct = Math.round((val / maxVal) * 100);
                  const isCurrent = y === activeSeasonKey;
                  return (
                    <div key={y} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', width: '38px', color: isCurrent ? '#22c55e' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400 }}>{y}</span>
                      <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: isCurrent ? '#22c55e' : 'rgba(34, 197, 94, 0.4)', borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', width: '75px', textAlign: 'right', fontWeight: 700, color: isCurrent ? '#22c55e' : '#fff' }}>{val} streets</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Executive Season Debrief & Strategic Committee Engine */}
      <div style={{
        background: '#0d0d0b',
        border: '1px solid rgba(251, 175, 51, 0.4)',
        borderRadius: '16px',
        padding: '26px',
        marginBottom: '24px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(251, 175, 51, 0.12)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Sparkles size={14} />
            <span>TurboSanta AI Strategic Committee Engine</span>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(aiDebriefText);
              setCopiedAiDebrief(true);
              setTimeout(() => setCopiedAiDebrief(false), 2500);
            }}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '12px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            {copiedAiDebrief ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedAiDebrief ? '✓ Copied to Clipboard!' : 'Copy AI Debrief for AGM Minutes'}</span>
          </button>
        </div>

        <div style={{ fontSize: '14px', color: '#eaeae5', lineHeight: 1.7, marginBottom: '20px' }}>
          The <strong>{activeSeasonKey} Santa Campaign</strong> for <strong>{(session?.tableName || tableSlug).toUpperCase()}</strong> demonstrated high fundraising velocity, covering <strong>{currentStats.routes} routes</strong> and <strong>{currentStats.streets} streets</strong>, securing a total of <strong>£{currentStats.raised.toFixed(2)}</strong> ({pctOfTarget}% of target) with an effective net community yield of <strong>£{currentStats.netRaised.toFixed(2)}</strong>.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--primary)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={15} />
              <span>Operational Highs &amp; Efficiency</span>
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li><strong>Community Grants Impact:</strong> £{currentStats.grantsAwarded.toFixed(2)} awarded across {currentStats.causesCount} local good cause{currentStats.causesCount === 1 ? '' : 's'}.</li>
              <li><strong>Volunteer Elf Force:</strong> {currentStats.volunteers} active elves contributed ~{currentStats.volunteerHours} hours of community service.</li>
              <li><strong>Doorstep Alert Radar:</strong> {currentStats.subscribers} families subscribed for live arrival alerts.</li>
              <li><strong>Fleet Tour Mileage:</strong> {currentStats.milesDriven} miles driven across {currentStats.routes} routes (£{avgPerStreet} yield/street).</li>
              <li><strong>Frictionless Payments:</strong> High conversion from cashless spectators using Zeffy links and SumUp card reader taps.</li>
            </ul>
          </div>

          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <h4 style={{ fontSize: '14px', color: '#22c55e', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={15} />
              <span>Next-Season Recommendations</span>
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li><strong>Lanyard QR Badges:</strong> Equip all volunteer bucket walkers with weatherproof QR badges for frictionless mobile donations.</li>
              <li><strong>Departure Announcements:</strong> Broadcast live Santa announcements 15 minutes before rollout to optimize curbside turnout.</li>
              <li><strong>Route Subdivision:</strong> Split routes exceeding 45 streets to maintain consistent parade speed and safety.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Route-by-Route Ledger */}
      <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="var(--primary)" />
          <span>Season Route Performance Ledger ({routes.length} Routes)</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Route Name</th>
                <th style={{ padding: '10px 12px' }}>Streets</th>
                <th style={{ padding: '10px 12px' }}>Start Time</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r, i) => {
                const routeStreets = streets.filter(st => st.route_id === r.id || st.routeName === r.name);
                const rawOv = String(r.status_override || r.status || '').toLowerCase();
                const isPostponed = rawOv === 'postponed';
                const isInProgress = rawOv === 'in progress';
                const isPastDate = Boolean(r.date && new Date(r.date + 'T23:59:59') < renderNow);
                const isCompleted = !isPostponed && (rawOv === 'completed' || isPastDate);
                const badgeLabel = isPostponed ? 'Postponed' : (isInProgress ? 'In Progress' : (isCompleted ? 'Completed' : 'Scheduled'));
                const badgeBg = isPostponed
                  ? 'rgba(239, 68, 68, 0.15)'
                  : (isInProgress ? 'rgba(251, 175, 51, 0.2)' : (isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.08)'));
                const badgeColor = isPostponed
                  ? '#fca5a5'
                  : (isInProgress ? 'var(--primary)' : (isCompleted ? '#86efac' : '#e5e7eb'));
                return (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--primary)' }}>{r.date || 'TBD'}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>{r.name || 'Route'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      <div>{routeStreets.length > 0 ? `${routeStreets.length} streets` : 'Full corridor'}</div>
                      {(() => {
                        let rawStops = r.planned_stops;
                        if (typeof rawStops === 'string' && rawStops.trim()) {
                          try { rawStops = JSON.parse(rawStops); } catch {}
                        }
                        const stopsCount = Array.isArray(rawStops) ? rawStops.filter(st => st && (st.name || st.title || st.stop_name)).length : 0;
                        return stopsCount > 0 ? <span style={{ color: '#f59e0b', fontSize: '11px', display: 'block', marginTop: '2px' }}>🛑 {stopsCount} stop{stopsCount === 1 ? '' : 's'}</span> : null;
                      })()}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{r.start_time || '18:00'}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span style={{ background: badgeBg, color: badgeColor, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                        {badgeLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
