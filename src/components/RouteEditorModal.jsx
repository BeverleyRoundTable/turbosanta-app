import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Building2, Save, Trash2 } from 'lucide-react';
import DropzoneUpload from './DropzoneUpload';

export default function RouteEditorModal({ isOpen, onClose, route, onSaveRoute, onDeleteRoute }) {
  if (!isOpen) return null;

  const isEditing = Boolean(route?.id);

  const [formData, setFormData] = useState({
    id: route?.id || `route_${Date.now()}`,
    name: route?.name || '',
    date: route?.date || new Date().toISOString().slice(0, 10),
    start_time: route?.start_time || '18:00',
    end_time: route?.end_time || '20:30',
    streetsText: route?.streets?.map(s => s.street_name).join(', ') || '',
    sponsor_name: route?.sponsor_name || '',
    sponsor_link: route?.sponsor_link || '',
    sponsor_description: route?.sponsor_description || '',
    sponsor_logo_url: route?.sponsor_logo_url || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a route name.");
      return;
    }

    const streetsArray = formData.streetsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map((st, idx) => ({
        id: `${formData.id}_st_${idx}`,
        route_id: formData.id,
        street_name: st,
        sequence_order: idx + 1
      }));

    const updatedRoute = {
      ...formData,
      streets: streetsArray
    };

    onSaveRoute(updatedRoute, streetsArray);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 25000,
      padding: '20px'
    }}>
      <div style={{
        background: '#151513',
        border: '2px solid var(--primary)',
        borderRadius: '20px',
        maxWidth: '650px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(251, 175, 51, 0.25)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0d0d0b',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <h2 className="brand-font" style={{ fontSize: '22px', margin: 0, color: '#fff' }}>
            {isEditing ? `Edit Route: ${route.name}` : 'Add New Sleigh Route'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {/* Basic Route Details */}
          <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Route Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. East Route, Molescroft, Woodmansey"
                required
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Street Timetable (Comma-separated)
              </label>
              <textarea
                rows={3}
                value={formData.streetsText}
                onChange={(e) => setFormData({ ...formData, streetsText: e.target.value })}
                placeholder="New Road, Old Hill, Lawless Lane, Willow Drive, Mill Lane"
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  lineHeight: '1.5'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Residents can instantly search any of these streets on the public tracker map.
              </span>
            </div>
          </div>

          {/* Route Sponsor Section (with Drag & Drop Logo Upload) */}
          <div style={{
            background: '#0d0d0b',
            border: '1px solid rgba(251, 175, 51, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 className="brand-font" style={{ fontSize: '16px', color: 'var(--primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} />
              <span>Route Sponsor Attribution</span>
            </h3>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Sponsor Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor_name}
                    onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                    placeholder="e.g. Acme Plumbing Ltd"
                    style={{
                      width: '100%',
                      background: '#151513',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Sponsor Website Link
                  </label>
                  <input
                    type="url"
                    value={formData.sponsor_link}
                    onChange={(e) => setFormData({ ...formData, sponsor_link: e.target.value })}
                    placeholder="https://example.co.uk"
                    style={{
                      width: '100%',
                      background: '#151513',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Sponsor Promotional Note (Displays on Tonight's Spotlight)
                </label>
                <input
                  type="text"
                  value={formData.sponsor_description}
                  onChange={(e) => setFormData({ ...formData, sponsor_description: e.target.value })}
                  placeholder="Proudly keeping Santa on the road for Beverley charities!"
                  style={{
                    width: '100%',
                    background: '#151513',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Direct Drag & Drop Upload for Sponsor Logo */}
              <DropzoneUpload
                label="Sponsor Logo (.png)"
                currentImage={formData.sponsor_logo_url}
                onImageSelected={(url) => setFormData({ ...formData, sponsor_logo_url: url })}
                helperText="Upload sponsor's transparent logo directly (No GitHub upload required!)."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            {isEditing && onDeleteRoute ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete route "${formData.name}"?`)) {
                    onDeleteRoute(formData.id);
                    onClose();
                  }
                }}
                className="btn-secondary"
                style={{ borderColor: '#d31c1c', color: '#fca5a5', padding: '10px 16px' }}
              >
                <Trash2 size={16} />
                <span>Delete Route</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '10px 18px' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '10px 24px' }}
              >
                <Save size={18} />
                <span>Save Route</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
