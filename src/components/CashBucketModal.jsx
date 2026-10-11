import React, { useState, useEffect } from 'react';
import { X, Coins, Check, Trash2, Calendar, MapPin, Users, FileText, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { recordCashDonation, fetchCashDonations, deleteCashDonation } from '../services/api';

export default function CashBucketModal({ isOpen, onClose, routes = [], tableSlug = 'beverley', onDonationRecorded }) {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(routes[0]?.name || 'Street Collection');
  const [verifiedBy, setVerifiedBy] = useState('Treasurer & Lead Elf');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayStr);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [cashEntries, setCashEntries] = useState([]);
  const [totalCash, setTotalCash] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = async () => {
    setIsLoading(true);
    const res = await fetchCashDonations(tableSlug);
    if (res && res.ok) {
      setCashEntries(res.entries || []);
      setTotalCash(res.total || 0);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, [tableSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setStatusMsg('Please enter a valid cash amount greater than £0.00');
      return;
    }

    setIsSubmitting(true);
    setStatusMsg('');

    const res = await recordCashDonation(tableSlug, {
      amount: parsedAmt,
      route_name: selectedRoute,
      verified_by: verifiedBy,
      notes: notes,
      date: date
    });

    setIsSubmitting(false);

    if (res && res.ok) {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
      setStatusMsg(`✓ Recorded £${parsedAmt.toFixed(2)} cash to live total!`);
      setAmount('');
      setNotes('');
      loadEntries();
      if (onDonationRecorded) {
        onDonationRecorded(res.total_raised);
      }
      setTimeout(() => setStatusMsg(''), 4000);
    } else {
      setStatusMsg(res?.error || 'Failed to record cash donation.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this cash entry? This will reduce the live total.")) return;
    const res = await deleteCashDonation(tableSlug, id);
    if (res && res.ok) {
      loadEntries();
      if (onDonationRecorded) onDonationRecorded(res.total_raised);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#151513',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(251, 175, 51, 0.15)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
              <Coins size={14} />
              <span>End-of-Night Cash Reconciler</span>
            </div>
            <h2 className="brand-font" style={{ fontSize: '22px', margin: 0, color: '#fff' }}>
              Nightly Cash Bucket Tally
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Log counted cash & coin buckets from tonight's route to update the live public thermometer.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Total Cash Banner */}
        <div style={{
          background: '#0d0d0b',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>
              Total Physical Cash Recorded
            </span>
            <div className="brand-font" style={{ fontSize: '26px', color: '#22c55e', lineHeight: 1.1 }}>
              £{Number(totalCash || 0).toFixed(2)}
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#86efac', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
            ✓ Integrates with live fundraising thermometer
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                Amount Counted (£ GBP) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: 800, fontSize: '16px' }}>£</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#151513',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px 10px 28px',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                Associated Route
              </label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                style={{
                  width: '100%',
                  background: '#151513',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              >
                {routes.map(r => (
                  <option key={r.id} value={r.name}>{r.name} ({r.date || 'Scheduled'})</option>
                ))}
                <option value="Static / Supermarket Collection">Static / Supermarket Bucket Collection</option>
                <option value="General Street Collection">General Street Collection</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                Verified By (Dual Counter Rule)
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="e.g. Dave & Mark (Treasurer & Marshal)"
                style={{
                  width: '100%',
                  background: '#151513',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
                Collection Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  background: '#151513',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>
              Notes / Bucket Numbers (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Buckets #1-#4 sealed; £12.50 in copper coins"
              style={{
                width: '100%',
                background: '#151513',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {statusMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: statusMsg.startsWith('✓') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMsg.startsWith('✓') ? '#22c55e' : '#ef4444'}`,
              color: statusMsg.startsWith('✓') ? '#86efac' : '#fca5a5',
              fontSize: '13px',
              marginBottom: '14px',
              fontWeight: 600
            }}>
              {statusMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Coins size={16} />
            <span>{isSubmitting ? 'Recording...' : 'Record Cash to Live Total'}</span>
          </button>
        </form>

        {/* Recent Cash Entries Log */}
        <div>
          <h3 className="brand-font" style={{ fontSize: '16px', color: '#fff', margin: '0 0 12px 0' }}>
            Recent Cash Entries ({cashEntries.length})
          </h3>
          {isLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Loading entries...</div>
          ) : cashEntries.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px', background: '#0d0d0b', borderRadius: '8px', border: '1px solid var(--border)' }}>
              No physical cash entries recorded yet this season.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {cashEntries.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <strong style={{ color: '#22c55e', fontSize: '15px' }}>
                      +£{Number(entry.amount || 0).toFixed(2)}
                    </strong>
                    <div style={{ fontSize: '12px', color: '#fff', marginTop: '2px' }}>
                      📍 {entry.route_name || 'Street Collection'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Verified by: {entry.verified_by || 'Treasurer'} • {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : 'Recorded'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '6px' }}
                    title="Remove entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
