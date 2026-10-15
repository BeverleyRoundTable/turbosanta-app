import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Building2, Save, Trash2, UploadCloud, FileText, CheckCircle2, Navigation, ExternalLink, Sparkles, Plus } from 'lucide-react';
import DropzoneUpload from './DropzoneUpload';
import { uploadAssetToR2 } from '../services/api';
import { extractRouteSponsors } from '../utils/sponsors';

function formatRouteDateWithWeekday(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RouteEditorModal({ isOpen, onClose, route, onSaveRoute, onDeleteRoute, tableSlug = 'beverley' }) {
  if (!isOpen) return null;

  const isCopy = Boolean(route?.isCopy);
  const isEditing = Boolean(route?.id) && !isCopy;
  const gpxFileInputRef = useRef(null);

  const getInitialSponsors = () => {
    return extractRouteSponsors(route);
  };

  const extractRouteMeta = (r) => {
    let meeting_point = r?.meeting_point || '';
    let muster_time = r?.muster_time || '';
    if (r?.notes) {
      const m = r.notes.match(/<!--\s*ROUTE_META:\s*({.*?})\s*-->/s);
      if (m && m[1]) {
        try {
          const parsed = JSON.parse(m[1]);
          if (!meeting_point && parsed.meeting_point) meeting_point = parsed.meeting_point;
          if (!muster_time && parsed.muster_time) muster_time = parsed.muster_time;
        } catch(e) {}
      }
    }
    return { meeting_point, muster_time };
  };

  const initialMeta = extractRouteMeta(route);
  const [sponsors, setSponsors] = useState(getInitialSponsors);

  const [formData, setFormData] = useState({
    id: route?.id || `route_${Date.now()}`,
    name: route?.name || '',
    date: route?.date || new Date().toISOString().slice(0, 10),
    start_time: route?.start_time || '18:00',
    end_time: route?.end_time || '20:30',
    meeting_point: initialMeta.meeting_point,
    muster_time: initialMeta.muster_time,
    gpx_url: route?.gpx_url || route?.gpxUrl || '',
    gpx_file_name: route?.gpx_file_name || (route?.gpx_url ? 'route.gpx' : ''),
    planned_stops: route?.planned_stops || [],
    streetsText: route?.streets?.map(s => typeof s === 'string' ? s : s.street_name).join(', ') || '',
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

  useEffect(() => {
    if (!isOpen) return;
    const meta = extractRouteMeta(route);
    setSponsors(extractRouteSponsors(route));
    setFormData({
      id: route?.id || `route_${Date.now()}`,
      name: route?.name || '',
      date: route?.date || new Date().toISOString().slice(0, 10),
      start_time: route?.start_time || '18:00',
      end_time: route?.end_time || '20:30',
      meeting_point: meta.meeting_point,
      muster_time: meta.muster_time,
      gpx_url: route?.gpx_url || route?.gpxUrl || '',
      gpx_file_name: route?.gpx_file_name || (route?.gpx_url ? 'route.gpx' : ''),
      planned_stops: route?.planned_stops || [],
      streetsText: route?.streets?.map(s => typeof s === 'string' ? s : s.street_name).join(', ') || '',
      sponsor_name: route?.sponsor_name || '',
      sponsor_link: route?.sponsor_link || '',
      sponsor_description: route?.sponsor_description || '',
      sponsor_logo_url: route?.sponsor_logo_url || ''
    });
    setGpxStats(
      route?.gpx_url
        ? { pointsCount: 'Loaded', stopsCount: route?.planned_stops?.length || 0, distanceMi: '—' }
        : null
    );
  }, [isOpen, route]);

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

        // 5. Upload GPX to Cloudflare R2 (or fallback to data URI if offline/unconfigured)
        const r2Url = await uploadAssetToR2(file, tableSlug);
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

  const handleAddSponsor = () => {
    setSponsors(prev => [
      ...prev,
      { name: '', link: '', description: '', logo_url: '' }
    ]);
  };

  const handleRemoveSponsor = (index) => {
    setSponsors(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSponsor = (index, field, value) => {
    setSponsors(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a route name.");
      return;
    }

    const isPastOriginal = route?.date && new Date(route.date + 'T23:59:59') < new Date();
    const isNewDateFuture = formData.date && new Date(formData.date + 'T23:59:59') >= new Date();

    let targetId = formData.id;
    if (isEditing && isPastOriginal && isNewDateFuture) {
      const wantCopy = window.confirm(
        `💡 You are changing the date of a completed route from ${route.date} to ${formData.date}.\n\n` +
        `Would you like to SAVE AS A NEW ROUTE for next year instead? This preserves your Table's official past season records and Gift Aid audit.\n\n` +
        `Click "OK" to Save as New Route (Recommended).\n` +
        `Click "Cancel" to Overwrite the past route.`
      );
      if (wantCopy) {
        targetId = `route_${Date.now()}`;
      }
    }

    const streetsArray = formData.streetsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map((st, idx) => ({
        id: `${targetId}_st_${idx}`,
        route_id: targetId,
        street_name: st,
        sequence_order: idx + 1
      }));

    const validSponsors = sponsors
      .map(s => ({
        name: (s.name || '').trim(),
        link: (s.link || '').trim(),
        description: (s.description || '').trim(),
        logo_url: (s.logo_url || '').trim()
      }))
      .filter(s => s.name || s.logo_url);

    const existingNotes = (route?.notes || formData?.notes || '')
      .replace(/<!--\s*SPONSORS_DATA:.*?-->/gs, '')
      .replace(/<!--\s*ROUTE_META:.*?-->/gs, '')
      .trim();

    const routeMeta = {
      meeting_point: (formData.meeting_point || '').trim(),
      muster_time: (formData.muster_time || '').trim()
    };
    const hasMeta = Boolean(routeMeta.meeting_point || routeMeta.muster_time);

    let finalNotes = existingNotes;
    if (validSponsors.length > 0) {
      finalNotes = finalNotes
        ? `${finalNotes}\n<!-- SPONSORS_DATA:${JSON.stringify(validSponsors)} -->`
        : `<!-- SPONSORS_DATA:${JSON.stringify(validSponsors)} -->`;
    }
    if (hasMeta) {
      finalNotes = finalNotes
        ? `${finalNotes}\n<!-- ROUTE_META:${JSON.stringify(routeMeta)} -->`
        : `<!-- ROUTE_META:${JSON.stringify(routeMeta)} -->`;
    }

    const updatedRoute = {
      ...formData,
      id: targetId,
      meeting_point: routeMeta.meeting_point,
      muster_time: routeMeta.muster_time,
      streets: streetsArray,
      notes: finalNotes,
      sponsors: validSponsors,
      sponsors_json: validSponsors.length > 0 ? JSON.stringify(validSponsors) : null,
      sponsor_name: validSponsors.map(s => s.name).filter(Boolean).join(' • ') || (validSponsors[0]?.name || ''),
      sponsor_link: validSponsors[0]?.link || '',
      sponsor_description: validSponsors[0]?.description || '',
      sponsor_logo_url: validSponsors[0]?.logo_url || ''
    };
    delete updatedRoute.isCopy;
    delete updatedRoute.originalDate;

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
            {isCopy ? `Copy Route for Next Season: ${route.name}` : (isEditing ? `Edit Route: ${route.name}` : 'Add New Sleigh Route')}
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
          {isCopy && (
            <div style={{
              background: 'rgba(251, 175, 51, 0.1)',
              border: '1px solid rgba(251, 175, 51, 0.35)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Sparkles size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#fff', lineHeight: 1.4 }}>
                <strong>Duplicating Route for Next Season:</strong> All street lists, GPX trace, and sponsor details are pre-filled. The date below has been automatically matched to the equivalent weekday next year ({formatRouteDateWithWeekday(formData.date)}) — adjust if needed.
              </div>
            </div>
          )}

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
                {formData.date && (
                  <div style={{ fontSize: '11px', color: isCopy ? 'var(--primary)' : 'var(--text-muted)', marginTop: '4px' }}>
                    {isCopy ? '📅 Pre-selected equivalent weekday: ' : '📅 '}
                    <strong>{formatRouteDateWithWeekday(formData.date)}</strong>
                  </div>
                )}
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

            {/* Muster / Meeting Point & Volunteer Arrival Time */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Muster / Meeting Point
                </label>
                <input
                  type="text"
                  value={formData.meeting_point}
                  onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
                  placeholder="e.g. Depot / Pavilion Car Park"
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
                  Muster / Arrival Time (Volunteers)
                </label>
                <input
                  type="time"
                  value={formData.muster_time}
                  onChange={(e) => setFormData({ ...formData, muster_time: e.target.value })}
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
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Leave blank to auto-default to 15 mins before start time.
                </span>
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
                  href={`/route_planner.html?table=${encodeURIComponent(tableSlug || 'beverley')}`}
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

          {/* Route Sponsor Section (with Multi-Sponsor Support & Drag & Drop Logo Upload) */}
          <div style={{
            background: '#0d0d0b',
            border: '1px solid rgba(251, 175, 51, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 className="brand-font" style={{ fontSize: '16px', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} />
                <span>Route Sponsor Attribution</span>
                <span style={{ fontSize: '12px', fontWeight: 'normal', color: sponsors.length ? '#86efac' : 'var(--text-muted)' }}>
                  {sponsors.length === 0 ? '(0 — Hidden on tracker)' : sponsors.length === 1 ? '(1 sponsor)' : `(${sponsors.length} sponsors)`}
                </span>
              </h3>

              <button
                type="button"
                onClick={handleAddSponsor}
                className="btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)'
                }}
              >
                <Plus size={14} />
                <span>Add Sponsor</span>
              </button>
            </div>

            {sponsors.length === 0 ? (
              <div style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--border)',
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  No sponsors assigned to this route. If this night has local business sponsors (or multiple co-sponsors), click below to add them.
                </p>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  When left empty, the sponsor section will be completely hidden from the public tracker for this route.
                </p>
                <button
                  type="button"
                  onClick={handleAddSponsor}
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} />
                  <span>Add Sponsor to Route</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sponsors.map((sp, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Sponsor #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSponsor(idx)}
                        className="btn-secondary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          color: '#fca5a5',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Sponsor Company Name
                          </label>
                          <input
                            type="text"
                            value={sp.name}
                            onChange={(e) => handleUpdateSponsor(idx, 'name', e.target.value)}
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
                            value={sp.link}
                            onChange={(e) => handleUpdateSponsor(idx, 'link', e.target.value)}
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
                          value={sp.description}
                          onChange={(e) => handleUpdateSponsor(idx, 'description', e.target.value)}
                          placeholder="Proudly keeping Santa on the road for local charities!"
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

                      <DropzoneUpload
                        label="Sponsor Logo (.png)"
                        currentImage={sp.logo_url}
                        onImageSelected={(url) => handleUpdateSponsor(idx, 'logo_url', url)}
                        helperText="Upload sponsor's transparent logo directly (No GitHub upload required!)."
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSponsor}
                  className="btn-secondary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                    marginTop: '4px'
                  }}
                >
                  <Plus size={15} />
                  <span>Add Another Sponsor</span>
                </button>
              </div>
            )}
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
                <span>{isCopy ? 'Save as New Route' : 'Save Route'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
