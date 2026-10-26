import React, { useState, useEffect } from 'react';
import { X, Shield, Copy, Check, RefreshCw, Sparkles, Send } from 'lucide-react';
import { getAdminAuthToken } from '../services/auth';

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

    const payload = {
      secret: token,
      routeName: route?.name || "Upcoming Sleigh Route",
      date: route?.date || new Date().toISOString().split('T')[0],
      musterPoint: route?.muster_point || table?.default_muster_point || "Muster point",
      musterTime: route?.muster_time || table?.default_muster_time || "17:45",
      startTime: route?.start_time || "18:00",
      streets: Array.isArray(route?.streets) ? route.streets.map(s => s.street_name || s).join(', ') : '',
      sponsor: route?.sponsor_name || table?.headline_sponsor_name || ''
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
        setError(data.error || 'Failed to generate tactical crew briefing');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
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
