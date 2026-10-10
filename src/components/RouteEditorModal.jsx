import React, { useState, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Building2, Save, Trash2, UploadCloud, FileText, CheckCircle2, Navigation, ExternalLink } from 'lucide-react';
import DropzoneUpload from './DropzoneUpload';
import { uploadAssetToR2 } from '../services/api';

export default function RouteEditorModal({ isOpen, onClose, route, onSaveRoute, onDeleteRoute }) {
  if (!isOpen) return null;

  const isEditing = Boolean(route?.id);
  const gpxFileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: route?.id || `route_${Date.now()}`,
    name: route?.name || '',
    date: route?.date || new Date().toISOString().slice(0, 10),
    start_time: route?.start_time || '18:00',
    end_time: route?.end_time || '20:30',
    gpx_url: route?.gpx_url || route?.gpxUrl || '',
    gpx_file_name: route?.gpx_file_name || (route?.gpx_url ? 'route.gpx' : ''),
    planned_stops: route?.planned_stops || [],
    streetsText: route?.streets?.map(s => s.street_name).join(', ') || '',
    sponsor_name: route?.sponsor_name || '',
    sponsor_link: route?.sponsor_link || '',
    sponsor_description: route?.sponsor_description || '',
    sponsor_logo_url: route?.sponsor_logo_url || ''
  });

  const [gpxStats, setGpxStats] = useState(
    route?.gpx_url
      ? { pointsCount: 'Loaded', stopsCount: route?.planned_stops?.length || 0, distanceMi: '—' }
      : null
  );
  const [isParsingGpx, setIsParsingGpx] = useState(false);
  const [isGpxDragging, setIsGpxDragging] = useState(false);

  const handleGpxFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.gpx') && !file.type.includes('xml')) {
      alert("Please upload a valid .gpx file.");
      return;
    }

    setIsParsingGpx(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        // 1. Auto-tag Route Name if empty
        const nameNode = xml.querySelector("name");
        const gpxName = nameNode ? nameNode.textContent.trim() : "";

        // 2. Parse trackpoints <trkpt> & route points <rtept>
        const trkpts = Array.from(xml.querySelectorAll("trkpt"));
        const rtepts = Array.from(xml.querySelectorAll("rtept"));
        const trackNodes = trkpts.length ? trkpts : rtepts;
        const pointsCount = trackNodes.length;

        // 3. Parse planned stops <wpt>
        const wpts = Array.from(xml.querySelectorAll("wpt"));
        const stops = wpts.map((w, idx) => {
          const lat = parseFloat(w.getAttribute("lat"));
          const lng = parseFloat(w.getAttribute("lon"));
          const stopNameNode = w.querySelector("name");
          return {
            id: `stop_${idx + 1}`,
            lat,
            lng,
            name: stopNameNode ? stopNameNode.textContent.trim() : `Planned Stop ${idx + 1}`
          };
        });

        // 4. Calculate route distance in miles
        let distKm = 0;
        let lastLat = null, lastLng = null;
        trackNodes.forEach(pt => {
          const lat = parseFloat(pt.getAttribute("lat"));
          const lng = parseFloat(pt.getAttribute("lon"));
          if (lastLat !== null && lastLng !== null) {
            const dLat = (lat - lastLat) * Math.PI / 180;
            const dLng = (lng - lastLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lastLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            distKm += 6371 * 2 * Math.asin(Math.sqrt(a));
          }
          lastLat = lat;
          lastLng = lng;
        });
        const distanceMi = (distKm * 0.621371).toFixed(2);

        // 5. Upload GPX to R2 or embed data URL
        const blob = new Blob([text], { type: "application/gpx+xml" });
        const r2Url = await uploadAssetToR2(blob);
        const finalGpxUrl = r2Url || `data:application/gpx+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;

        setFormData(prev => ({
          ...prev,
          name: prev.name || gpxName || file.name.replace(/\.gpx$/i, ''),
          gpx_url: finalGpxUrl,
          gpx_file_name: file.name,
          planned_stops: stops
        }));

        setGpxStats({
          fileName: file.name,
          pointsCount,
          stopsCount: stops.length,
          distanceMi,
          stops
        });
      } catch (err) {
        console.error("GPX parse error:", err);
        alert("Error parsing GPX file: " + err.message);
      } finally {
        setIsParsingGpx(false);
      }
    };
    reader.readAsText(file);
  };

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
      padding: 'clamp(8px, 2.5vw, 20px)'
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
          padding: 'clamp(14px, 3vw, 20px) clamp(16px, 4vw, 28px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0d0d0b',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <h2 className="brand-font" style={{ fontSize: 'clamp(16px, 3.5vw, 22px)', margin: 0, color: '#fff' }}>
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
        <form onSubmit={handleSubmit} style={{ padding: 'clamp(16px, 3.5vw, 24px) clamp(12px, 3.5vw, 28px)' }}>
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

            {/* GPX Track & Planned Stops Upload */}
            <div style={{
              background: '#0d0d0b',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#fff', fontWeight: 600, margin: 0 }}>
                    GPX Route File (Dense Track & Planned Stops)
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Attach your high-resolution .gpx file with road geometry and waypoint stops.
                  </span>
                </div>
                <a
                  href="/route_planner.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: 'var(--primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  <Navigation size={13} />
                  <span>Open Route Planner</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              {/* Upload Drop Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsGpxDragging(true); }}
                onDragLeave={() => setIsGpxDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsGpxDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleGpxFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => gpxFileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isGpxDragging ? 'var(--primary)' : formData.gpx_url ? '#2ecc71' : 'var(--border)'}`,
                  background: isGpxDragging ? 'rgba(251, 175, 51, 0.08)' : formData.gpx_url ? 'rgba(46, 204, 113, 0.05)' : '#161614',
                  borderRadius: '10px',
                  padding: '18px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="file"
                  ref={gpxFileInputRef}
                  accept=".gpx,application/gpx+xml,application/xml,text/xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleGpxFile(e.target.files[0]);
                    }
                  }}
                />

                {isParsingGpx ? (
                  <div style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}>
                    ⚡ Parsing dense GPX track and extracting waypoint stops...
                  </div>
                ) : formData.gpx_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={22} color="#2ecc71" />
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>
                          {formData.gpx_file_name || 'route.gpx'}
                        </strong>
                        <span style={{ color: '#86efac', fontSize: '12px' }}>
                          ✓ Dense GPX Attached {gpxStats?.pointsCount ? `(${gpxStats.pointsCount} points, ${gpxStats.distanceMi} mi)` : ''}
                        </span>
                      </div>
                    </div>
                    {gpxStats?.stopsCount > 0 && (
                      <span style={{
                        background: 'rgba(251, 175, 51, 0.15)',
                        color: 'var(--primary)',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        ⭐ {gpxStats.stopsCount} Planned Stops
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <UploadCloud size={24} color="var(--primary)" />
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                      Drop your .gpx route file here or click to browse
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Supports dense trackpoints from TurboSanta Planner, Garmin, Strava, OS Maps
                    </span>
                  </div>
                )}
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '20px'
          }}>
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
                style={{
                  borderColor: '#d31c1c',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  flex: '1 1 auto',
                  minWidth: '110px'
                }}
              >
                <Trash2 size={15} />
                <span>Delete Route</span>
              </button>
            ) : null}

            <div style={{
              display: 'flex',
              gap: '8px',
              flex: '2 1 auto',
              justifyContent: 'flex-end',
              minWidth: '190px'
            }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  flex: '1 1 auto',
                  justifyContent: 'center'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  flex: '2 1 auto',
                  whiteSpace: 'nowrap',
                  justifyContent: 'center'
                }}
              >
                <Save size={16} />
                <span>Save Route</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
