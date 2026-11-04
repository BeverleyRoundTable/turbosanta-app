import React, { useState, useEffect } from 'react';
import { X, Users, Sparkles, CheckSquare, Square, Calendar, Shield, Building, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { bulkRegisterVolunteers } from '../services/api';

const STANDARD_ROLES = [
  { id: 'Collections', label: '🪣 Collections (Bucket Collector)', badgeColor: '#22c55e' },
  { id: 'Driver', label: '🚗 Driver (Tow Car / Sleigh Driver)', badgeColor: '#3b82f6' },
  { id: 'Safety Walkers', label: '🦺 Safety Walkers (Flank Marshal)', badgeColor: '#10b981' },
  { id: 'Santa', label: '🎅 Santa Claus', badgeColor: '#ef4444' },
  { id: 'Navigator', label: '🗺️ Navigator / Lead Marshal', badgeColor: '#f59e0b' },
  { id: 'Music Operator', label: '🎶 Music & Sound Operator', badgeColor: '#8b5cf6' },
  { id: 'General Elf', label: '🎄 General Elf / Helper', badgeColor: '#eab308' },
  { id: 'custom', label: '✨ Custom Role...', badgeColor: '#94a3b8' }
];

export default function BulkCrewAssignModal({
  isOpen,
  onClose,
  routes = [],
  tableSlug = 'beverley',
  tableName = 'Round Table',
  token = null,
  onSaved = null
}) {
  const [namesText, setNamesText] = useState('');
  const [selectedRole, setSelectedRole] = useState('Collections');
  const [customRoleText, setCustomRoleText] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [selectedRouteIds, setSelectedRouteIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNamesText('');
      setSelectedRole('Collections');
      setCustomRoleText('');
      setOrganisation(tableName ? `${tableName} Members` : 'Round Table');
      // Default: select all active routes
      setSelectedRouteIds(routes.map(r => r.id || r.name));
      setStatusMsg('');
      setIsError(false);
    }
  }, [isOpen, routes, tableName]);

  if (!isOpen) return null;

  // Parse names from textarea (splits on newlines, commas, semicolons)
  const parsedNames = namesText
    .split(/[\r\n,;]+/)
    .map(n => n.trim())
    .filter(n => n.length > 0);

  // Deduplicate case-insensitively while preserving original casing
  const uniqueNames = [];
  const seenLower = new Set();
  for (const n of parsedNames) {
    const l = n.toLowerCase();
    if (!seenLower.has(l)) {
      seenLower.add(l);
      uniqueNames.push(n);
    }
  }

  const toggleRouteId = (rId) => {
    setSelectedRouteIds(prev =>
      prev.includes(rId) ? prev.filter(id => id !== rId) : [...prev, rId]
    );
  };

  const selectAllRoutes = () => {
    setSelectedRouteIds(routes.map(r => r.id || r.name));
  };

  const deselectAllRoutes = () => {
    setSelectedRouteIds([]);
  };

  const selectWeekdayRoutes = () => {
    const weekdayIds = routes.filter(r => {
      if (!r.date) return true;
      const day = new Date(r.date + 'T12:00:00').getDay();
      return day >= 1 && day <= 5;
    }).map(r => r.id || r.name);
    setSelectedRouteIds(weekdayIds);
  };

  const selectWeekendRoutes = () => {
    const weekendIds = routes.filter(r => {
      if (!r.date) return false;
      const day = new Date(r.date + 'T12:00:00').getDay();
      return day === 0 || day === 6;
    }).map(r => r.id || r.name);
    setSelectedRouteIds(weekendIds);
  };

  const effectiveRole = selectedRole === 'custom' ? (customRoleText.trim() || 'General Elf') : selectedRole;
  const totalSlotsCount = uniqueNames.length * selectedRouteIds.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uniqueNames.length === 0) {
      setIsError(true);
      setStatusMsg('Please enter or paste at least one member name.');
      return;
    }
    if (selectedRouteIds.length === 0) {
      setIsError(true);
      setStatusMsg('Please select at least one sleigh route night.');
      return;
    }

    const targetRoutes = routes
      .filter(r => selectedRouteIds.includes(r.id || r.name))
      .map(r => ({ id: r.id, name: r.name }));

    setIsSubmitting(true);
    setStatusMsg('');
    setIsError(false);

    try {
      const payload = {
        names: uniqueNames,
        routes: targetRoutes,
        role: effectiveRole,
        organisation: organisation.trim() || `${tableName} Members`
      };

      const res = await bulkRegisterVolunteers(tableSlug, payload, token);
      if (!res || !res.ok) {
        throw new Error(res?.error || 'Failed to bulk assign crew');
      }

      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      if (onSaved) {
        onSaved(payload, true);
      }
      onClose();
    } catch (err) {
      setIsError(true);
      setStatusMsg(err.message || 'Error saving bulk crew assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#151513',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 24px 48px rgba(0,0,0,0.85)',
        boxSizing: 'border-box',
        color: '#fff',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.25) 100%)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              <Users size={20} />
            </div>
            <div>
              <h3 className="brand-font" style={{ fontSize: '18px', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚡ Bulk Crew Multi-Run Sign Up</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Quickly sign up a roster of Table members across multiple sleigh runs at once.
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
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: Member Names List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                1. Crew &amp; Table Member Names *
              </label>
              <span style={{ fontSize: '11px', color: uniqueNames.length > 0 ? '#86efac' : 'var(--text-muted)', fontWeight: 600 }}>
                {uniqueNames.length > 0 ? `👥 ${uniqueNames.length} member(s) detected` : 'Paste list below'}
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder="Paste or type names (one per line, or comma-separated)&#10;e.g.&#10;Jason Williams&#10;Mark Davies&#10;Dave Thomas&#10;Chris Taylor"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                resize: 'vertical'
              }}
            />
            {uniqueNames.length > 0 && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                maxHeight: '70px',
                overflowY: 'auto',
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                {uniqueNames.map((n, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(251, 191, 36, 0.15)',
                      color: '#fef08a',
                      fontSize: '11.5px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Role & Organisation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                2. Designated Role *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              >
                {STANDARD_ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Organisation / Group
              </label>
              <input
                type="text"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                placeholder="e.g. Stockton Round Table"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          {selectedRole === 'custom' && (
            <div>
              <input
                type="text"
                value={customRoleText}
                onChange={(e) => setCustomRoleText(e.target.value)}
                placeholder="Enter custom role title..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>
          )}

          {/* Step 3: Select Sleigh Routes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                3. Select Sleigh Routes to Assign *
              </label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={selectAllRoutes}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  All ({routes.length})
                </button>
                <button
                  type="button"
                  onClick={selectWeekdayRoutes}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Mon-Fri
                </button>
                <button
                  type="button"
                  onClick={selectWeekendRoutes}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Sat-Sun
                </button>
                <button
                  type="button"
                  onClick={deselectAllRoutes}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={{
              maxHeight: '190px',
              overflowY: 'auto',
              background: '#0d0d0b',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px'
            }}>
              {routes.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No routes configured yet. Add routes in the Timetable first.
                </div>
              ) : (
                routes.map(r => {
                  const key = r.id || r.name;
                  const isChecked = selectedRouteIds.includes(key);
                  let formattedDate = r.date || '';
                  try {
                    if (r.date) {
                      const d = new Date(r.date + 'T12:00:00');
                      if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                      }
                    }
                  } catch (e) {}

                  return (
                    <label
                      key={key}
                      onClick={() => toggleRouteId(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: isChecked ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        userSelect: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isChecked ? (
                          <CheckSquare size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
                        ) : (
                          <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: '13px', color: isChecked ? '#fff' : 'var(--text-muted)', fontWeight: isChecked ? 600 : 400 }}>
                          {r.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {formattedDate} {r.start_time ? `(${r.start_time})` : ''}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Preview Summary Box */}
          <div style={{
            background: totalSlotsCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${totalSlotsCount > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>
                {totalSlotsCount > 0 ? `⚡ ${totalSlotsCount} Volunteer Slot(s) Ready` : 'Ready to configure assignments'}
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {uniqueNames.length} member(s) &times; {selectedRouteIds.length} route(s) = {totalSlotsCount} entries on Cloudflare D1
              </p>
            </div>
            <span style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              background: totalSlotsCount > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: totalSlotsCount > 0 ? '#86efac' : 'var(--text-muted)'
            }}>
              Role: {effectiveRole}
            </span>
          </div>

          {statusMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
              border: `1px solid ${isError ? '#ef4444' : '#22c55e'}`,
              color: isError ? '#fca5a5' : '#86efac',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalSlotsCount === 0}
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                background: totalSlotsCount > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#333',
                color: '#000',
                border: 'none',
                cursor: totalSlotsCount > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={15} />
              <span>
                {isSubmitting
                  ? 'Assigning Crew...'
                  : totalSlotsCount > 0
                    ? `Assign ${uniqueNames.length} Members across ${selectedRouteIds.length} Runs (${totalSlotsCount} Slots)`
                    : 'Assign Crew to Runs'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
