import React, { useState, useEffect } from 'react';
import { X, Shield, Copy, Check, RefreshCw, Sparkles, Send } from 'lucide-react';
import { getAdminAuthToken } from '../services/auth';
import { extractRouteSponsors } from '../utils/sponsors';

function generateClientFallbackBriefing({ route, tableData, currentTableSlug }) {
  const table = tableData?.table || {};
  const town = (table.sleigh_display_name || table.name || currentTableSlug || 'Round Table').replace(/round table/gi, '').replace(/santa sleigh/gi, '').trim();
  const sleighName = table.sleigh_display_name || table.name || `${town} Round Table Santa Sleigh`;
  const routeName = route?.name || "Tonight's Sleigh Route";
  const dateStr = route?.date || new Date().toISOString().split('T')[0];
  const musterPoint = route?.muster_point || table.default_muster_point || "Muster Area";
  const musterTime = route?.muster_time || table.default_muster_time || "17:45";
  const startTime = route?.start_time || "18:00";

  const allSponsors = extractRouteSponsors(route);
  const routeCharities = allSponsors.filter(s => s.type === 'charity').map(s => s.name).filter(Boolean);
  const routeBusinesses = allSponsors.filter(s => s.type !== 'charity').map(s => s.name).filter(Boolean);

  const sponsor = routeBusinesses.join(' • ') || route?.sponsor_name || table.headline_sponsor_name || '';
  const charity = routeCharities.join(' & ') || '';

  const routeStreets = (Array.isArray(route?.streets) && route.streets.length > 0)
    ? route.streets
    : (tableData?.streets || []).filter(s => String(s.route_id) === String(route?.id));
  const streetsStr = routeStreets.map(s => typeof s === 'string' ? s : (s.street_name || s.name || '')).filter(Boolean).join(', ');

  return `### 🛷 ${sleighName} — Volunteer Crew Briefing
**Route:** ${routeName} | **Date:** ${dateStr}
**Muster:** ${musterTime} at ${musterPoint} | **Rollout:** ${startTime} promptly
${sponsor ? `**Route Sponsor:** ${sponsor}\n` : ''}${charity ? `**Tonight's Beneficiary Charity:** ${charity}\n` : ''}
---

### 1. 🛷 Route & Schedule Overview
- Tonight's route covers: **${routeName}**
${streetsStr ? `- **Key Streets:** ${streetsStr}` : '- Residential roads and avenues as marked on the live navigator.'}
- Rollout commences at **${startTime}**. Please ensure you are signed in and geared up by **${musterTime}**.

### 2. ⚠️ Safety & Marshaling Protocols
- **2-Metre Safety Bubble:** Maintain a strict 2m exclusion zone around the sleigh and towing vehicle. No member of the public or child should ever approach the tow-hitch or wheels.
- **Children on Pavements:** Excited children often dart out from driveways. Marshals on foot must actively guide children and families to stay safely on the pavement.
- **Crossing Roads:** Only cross at safe, well-lit junctions with clear sightlines. Always step out together and never cross directly in front of approaching traffic.
- **Sleigh Pacing:** Sleigh speed is capped at walking pace (approx 2–3 mph). Keep visual contact with the driver at all times.

### 3. 🦺 Gear, Visibility & Bucket Handling
- **High-Vis Fastened:** All marshals must wear an approved, high-visibility vest fastened at the front.
- **Warm & Dry:** Layers, sturdy waterproof boots, and warm gloves are essential.
- **Bucket Security:** Keep collection buckets sealed and securely tethered to your wrist. Direct any contactless donors to the tap-to-donate readers or the QR codes on the sleigh.

### 4. 🎄 Volunteer Spirit & Community Impact
- Thank you for volunteering your time tonight! Round Table Santa Sleighs bring immense joy to thousands of children and raise crucial funds for local community causes.
- Smile, wave, DO MORE, stay safe, and let's make it a magical night! 🎅✨`;
}



export default function CrewBriefingAiModal({
  isOpen,
  onClose,
  route = null,
  tableData = {},
  currentTableSlug = 'beverley',
  session = null
}) {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const table = tableData?.table || {};
  const tableName = table.sleigh_display_name || table.name || 'Round Table Santa Sleigh';

  const generateBriefing = async () => {
    setLoading(true);
    setError('');
    const tableSlug = currentTableSlug || session?.tableId || session?.tableSlug || 'beverley';
    const token = session?.googleCredential || session?.token || getAdminAuthToken(tableSlug);

    const routeStreets = (Array.isArray(route?.streets) && route.streets.length > 0)
      ? route.streets
      : (tableData?.streets || []).filter(s => String(s.route_id) === String(route?.id));
    const streetNames = routeStreets
      .map(s => (typeof s === 'string' ? s : (s.street_name || s.name || '')))
      .filter(Boolean)
      .join(', ');

    const payload = {
      secret: token,
      routeId: route?.id,
      routeName: route?.name || "Upcoming Sleigh Route",
      date: route?.date || new Date().toISOString().split('T')[0],
      musterPoint: route?.muster_point || table?.default_muster_point || "Muster point",
      musterTime: route?.muster_time || table?.default_muster_time || "17:45",
      startTime: route?.start_time || "18:00",
      streets: streetNames,
      sponsor: route?.sponsor_name || table?.headline_sponsor_name || '',
      sponsors: route?.sponsor_name || table?.headline_sponsor_name || ''
    };

    try {
      const res = await fetch(`https://turbosanta-api.beverley247.workers.dev/api/ai/crew-briefing?table=${encodeURIComponent(tableSlug)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok && data.briefing) {
        setBriefing(data.briefing);
      } else {
        const fallback = generateClientFallbackBriefing({ route, tableData, currentTableSlug });
        setBriefing(fallback);
      }
    } catch (err) {
      const fallback = generateClientFallbackBriefing({ route, tableData, currentTableSlug });
      setBriefing(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateBriefing();
    }
  }, [isOpen, route?.id]);

  if (!isOpen) return null;

  const copyBriefing = () => {
    navigator.clipboard.writeText(briefing);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#151513',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, rgba(21,21,19,0.95) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fca5a5'
            }}>
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: 800 }}>
                Tactical Volunteer Crew Briefing
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {route?.name || tableName} • Safety & Marshaling Dispatch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Sparkles size={36} color="#ef4444" style={{ animation: 'spin 2s linear infinite', margin: '0 auto 14px', display: 'block' }} />
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                Gemini is synthesizing tactical route safety...
              </div>
              <div style={{ fontSize: '13px' }}>
                Analyzing street names, road crossings, tow-hitch exclusion bubble, and muster check-in.
              </div>
            </div>
          ) : error ? (
            <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', color: '#fca5a5' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Failed to generate briefing:</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>{error}</p>
              <button
                type="button"
                onClick={generateBriefing}
                style={{ marginTop: '12px', padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Ready to paste into WhatsApp, email, or print:
                </span>
                <button
                  type="button"
                  onClick={generateBriefing}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--primary)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={12} />
                  <span>Regenerate</span>
                </button>
              </div>

              <textarea
                rows={14}
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: '#0d0d0b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Close
          </button>

          <button
            type="button"
            disabled={loading || !briefing}
            onClick={copyBriefing}
            className="btn-primary"
            style={{
              padding: '10px 22px',
              fontSize: '13px',
              background: copied ? '#16a34a' : 'var(--primary)',
              color: '#000',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard! ✨' : 'Copy Briefing for Marshals'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}