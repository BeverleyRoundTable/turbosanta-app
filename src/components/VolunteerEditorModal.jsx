import React, { useState, useEffect, useRef } from 'react';
import { X, UserCheck, Shield, Phone, Mail, Building, MapPin, CheckCircle2, AlertCircle, CheckSquare, Square, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { updateVolunteer, bulkRegisterVolunteers } from '../services/api';

const STANDARD_ROLES = [
  { id: 'Driver', label: '🚗 Driver (Tow Car / Sleigh Driver)', badgeColor: '#3b82f6' },
  { id: 'Collections', label: '🪣 Collections (Bucket Collector)', badgeColor: '#22c55e' },
  { id: 'Safety Walkers', label: '🦺 Safety Walkers (Flank Marshal)', badgeColor: '#10b981' },
  { id: 'Santa', label: '🎅 Santa Claus', badgeColor: '#ef4444' },
  { id: 'Navigator', label: '🗺️ Navigator / Lead Marshal', badgeColor: '#f59e0b' },
  { id: 'Music Operator', label: '🎶 Music & Sound Operator', badgeColor: '#8b5cf6' },
  { id: 'General Elf', label: '🎄 General Elf / Helper', badgeColor: '#eab308' },
  { id: 'custom', label: '✨ Custom Role...', badgeColor: '#94a3b8' }
];

export default function VolunteerEditorModal({
  isOpen,
  onClose,
  volunteer = null,
  routes = [],
  tableSlug = 'beverley',
  token = null,
  onSaved = null
}) {
  const isEditing = Boolean(volunteer && volunteer.id);

  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('Collections');
  const [customRoleText, setCustomRoleText] = useState('');
  const [selectedRouteName, setSelectedRouteName] = useState('');
  const [routeMode, setRouteMode] = useState('single'); // 'single' | 'multiple'
  const [selectedRouteIds, setSelectedRouteIds] = useState([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [overrideLimits, setOverrideLimits] = useState(false);

  const lastOpenedKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      lastOpenedKeyRef.current = null;
      return;
    }

    const currentKey = volunteer ? String(volunteer.id || volunteer['Volunteer Name'] || 'editing') : 'new_volunteer';
    if (lastOpenedKeyRef.current === currentKey) {
      return; // Modal is already open and initialized for this session. Shield user input from background polling / prop churn!
    }
    lastOpenedKeyRef.current = currentKey;

    if (volunteer) {
      setRouteMode('single');
      setName(volunteer.name || volunteer['Volunteer Name'] || '');
      const currentRole = volunteer.role || volunteer['Role'] || 'Collections';
      const matched = STANDARD_ROLES.find(r => r.id.toLowerCase() === currentRole.toLowerCase() || currentRole.toLowerCase().includes(r.id.toLowerCase()));
      if (matched && matched.id !== 'custom') {
        setSelectedRole(matched.id);
        setCustomRoleText('');
      } else {
        setSelectedRole('custom');
        setCustomRoleText(currentRole);
      }
      setSelectedRouteName(volunteer.route_name || volunteer['RouteName'] || routes[0]?.name || 'General Helper');
      setPhone(volunteer.phone || volunteer['Phone Number'] || '');
      setEmail(volunteer.email || volunteer['Email'] || '');
      setOrganisation(volunteer.organisation || volunteer['Organisation'] || '');
    } else {
      setRouteMode('single');
      setSelectedRouteIds(routes.map(r => r.id || r.name));
      setName('');
      setSelectedRole('Collections');
      setCustomRoleText('');
      setSelectedRouteName(routes[0]?.name || 'General Helper');
      setPhone('');
      setEmail('');
      setOrganisation('');
    }
    setStatusMsg('');
    setIsError(false);
  }, [isOpen, volunteer]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setIsError(true);
      setStatusMsg('Please enter the volunteer full name.');
      return;
    }

    const effectiveRole = selectedRole === 'custom' ? (customRoleText.trim() || 'General Elf') : selectedRole;

    setIsSubmitting(true);
    setStatusMsg('');
    setIsError(false);

    try {
      if (isEditing) {
        const cleanRouteName = selectedRouteName.trim() || 'General Helper';
        const matchedRoute = routes.find(r => r.name === cleanRouteName || r.id === cleanRouteName);
        const routeId = matchedRoute ? matchedRoute.id : (volunteer?.route_id || null);

        const payload = {
          id: volunteer.id,
          name: cleanName,
          role: effectiveRole,
          routeName: cleanRouteName,
          route_name: cleanRouteName,
          routeId: routeId,
          route_id: routeId,
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          organisation: organisation.trim()
        };

        const res = await updateVolunteer(tableSlug, payload, token);
        if (!res || !res.ok) {
          throw new Error(res?.error || 'Failed to update volunteer');
        }

        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
        if (onSaved) {
          onSaved({
            ...volunteer,
            ...payload
          }, false);
        }
        onClose();
      } else if (routeMode === 'multiple') {
        if (selectedRouteIds.length === 0) {
          throw new Error('Please select at least one route night.');
        }

        const targetRoutes = routes
          .filter(r => selectedRouteIds.includes(r.id || r.name))
          .map(r => ({ id: r.id, name: r.name }));

        const payload = {
          name: cleanName,
          role: effectiveRole,
          routes: targetRoutes,
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          organisation: organisation.trim(),
          override_limits: overrideLimits
        };

        const res = await bulkRegisterVolunteers(tableSlug, payload, token);
        if (!res || !res.ok) {
          throw new Error(res?.error || 'Failed to register volunteer across routes');
        }

        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        if (onSaved) {
          onSaved(payload, true);
        }
        onClose();
      } else {
        const cleanRouteName = selectedRouteName.trim() || 'General Helper';
        const matchedRoute = routes.find(r => r.name === cleanRouteName || r.id === cleanRouteName);
        const routeId = matchedRoute ? matchedRoute.id : null;

        // Create new single volunteer
        const payload = {
          name: cleanName,
          role: effectiveRole,
          routeName: cleanRouteName,
          routeId: routeId,
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          organisation: organisation.trim(),
          override_limits: overrideLimits
        };

        const res = await bulkRegisterVolunteers(tableSlug, payload, token);
        if (!res || !res.ok) {
          throw new Error(res?.error || 'Failed to register volunteer');
        }

        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        if (onSaved) {
          onSaved(payload, true);
        }
        onClose();
      }
    } catch (err) {
      setIsError(true);
      setStatusMsg(err.message || 'Error saving volunteer');
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
      background: 'rgba(0, 0, 0, 0.78)',
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
        maxWidth: '540px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
        boxSizing: 'border-box',
        color: '#fff',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(251, 175, 51, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="brand-font" style={{ fontSize: '18px', color: '#fff', margin: 0 }}>
                {isEditing ? `Edit Volunteer Details` : 'Add Volunteer to Roster'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {isEditing ? `Update role, assigned route corridor, and contact details` : 'Manually register a helper or marshal on Cloudflare D1'}
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
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mark Dissington"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Assigned Role */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Designated Role *
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
                padding: '10px 14px',
                color: '#fff',
                fontSize: '14px'
              }}
            >
              {STANDARD_ROLES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            {selectedRole === 'custom' && (
              <input
                type="text"
                value={customRoleText}
                onChange={(e) => setCustomRoleText(e.target.value)}
                placeholder="Enter custom role title..."
                style={{
                  marginTop: '8px',
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
            )}
          </div>

          {/* Assigned Route Night */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Assigned Route Night *
              </label>
              {!isEditing && routes.length > 1 && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setRouteMode('single')}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: routeMode === 'single' ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                      color: routeMode === 'single' ? '#000' : 'var(--text-muted)',
                      fontWeight: routeMode === 'single' ? 700 : 400,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Single Route
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRouteMode('multiple');
                      if (selectedRouteIds.length === 0) {
                        setSelectedRouteIds(routes.map(r => r.id || r.name));
                      }
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: routeMode === 'multiple' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                      color: routeMode === 'multiple' ? '#000' : 'var(--text-muted)',
                      fontWeight: routeMode === 'multiple' ? 700 : 400,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Multiple Routes (Multi-Run)
                  </button>
                </div>
              )}
            </div>

            {routeMode === 'single' || isEditing ? (
              <select
                value={selectedRouteName}
                onChange={(e) => setSelectedRouteName(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                <option value="General Helper">🌟 General Volunteer / Sleigh Operations</option>
                {routes.map(r => (
                  <option key={r.id || r.name} value={r.name}>
                    {r.name} {r.date ? `(${r.date})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#86efac', fontWeight: 600 }}>
                    ✓ Selected for {selectedRouteIds.length} of {routes.length} routes
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={selectAllRoutes}
                      style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllRoutes}
                      style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '6px'
                }}>
                  {routes.map(r => {
                    const key = r.id || r.name;
                    const isChecked = selectedRouteIds.includes(key);
                    return (
                      <label
                        key={key}
                        onClick={() => toggleRouteId(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isChecked ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isChecked ? (
                            <CheckSquare size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                          ) : (
                            <Square size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: '12.5px', color: isChecked ? '#fff' : 'var(--text-muted)' }}>
                            {r.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {r.date || ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Contact Details (Phone & Email) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Phone Number (WhatsApp &amp; Calls)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 07817 372764"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px 10px 34px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}
                />
                <Phone size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Email Address (Gmail Briefings)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="volunteer@example.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px 10px 34px',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
                <Mail size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Organisation / Club */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Organisation / Club / Business (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                placeholder="e.g. Rotary, 41 Club, Lollypop Guild, Spanish jam &amp; beans"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px 10px 34px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
              <Building size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: isError ? '1px solid #ef4444' : '1px solid #22c55e',
              color: isError ? '#fca5a5' : '#86efac'
            }}>
              {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Admin Override */}
          {!isEditing && (
            <div style={{
              marginTop: '4px',
              padding: '8px 12px',
              background: overrideLimits ? 'rgba(251, 175, 51, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: overrideLimits ? '1px solid rgba(251, 175, 51, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.2s ease'
            }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: overrideLimits ? '#FBAF33' : 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={overrideLimits}
                  onChange={(e) => setOverrideLimits(e.target.checked)}
                  style={{ accentColor: '#FBAF33', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: overrideLimits ? 600 : 400 }}>Admin Override (bypass route &amp; role capacity limits)</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '13px',
                background: 'var(--primary)',
                color: '#000',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Add to Roster'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
