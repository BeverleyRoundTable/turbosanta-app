import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Building2, Save, Trash2, UploadCloud, FileText, CheckCircle2, Navigation, ExternalLink, Sparkles, Plus, Heart } from 'lucide-react';
import DropzoneUpload from './DropzoneUpload';
import { uploadAssetToR2 } from '../services/api';
import { extractRouteSponsors } from '../utils/sponsors';
import { detectStreetsFromPoints, detectStreetsFromGpxUrl } from '../utils/streetDetector';

export function slugifyRouteId(tableSlug, name) {
  const cleanTable = String(tableSlug || 'beverley').toLowerCase().trim();
  const cleanName = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleanName ? `${cleanTable}_${cleanName}` : `${cleanTable}_route_${Date.now()}`;
}

function formatRouteDateWithWeekday(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function calculateMusterFromStart(startTimeStr, offsetMinutes = 15) {
  if (!startTimeStr || !startTimeStr.includes(':')) return '17:45';
  const parts = startTimeStr.split(':').map(Number);
  if (isNaN(parts[0])) return '17:45';
  let totalMins = (parts[0] || 18) * 60 + (parts[1] || 0) - offsetMinutes;
  if (totalMins < 0) totalMins += 1440;
  const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const m = String(totalMins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function resolveInitialMusterTime(routeMusterTime, startTimeStr, tableDefaultTime) {
  if (routeMusterTime && String(routeMusterTime).trim()) {
    return String(routeMusterTime).trim();
  }
  if (tableDefaultTime && String(tableDefaultTime).trim()) {
    return String(tableDefaultTime).trim();
  }
  return calculateMusterFromStart(startTimeStr || '18:00', 15);
}

function resolveInitialMeetingPoint(routeMeetingPoint, tableDefaultPoint) {
  if (routeMeetingPoint && String(routeMeetingPoint).trim()) {
    return String(routeMeetingPoint).trim();
  }
  if (tableDefaultPoint && String(tableDefaultPoint).trim()) {
    return String(tableDefaultPoint).trim();
  }
  return '';
}

export default function RouteEditorModal({ isOpen, onClose, route, onSaveRoute, onDeleteRoute, tableSlug = 'beverley', table = {} }) {
  const isCopy = Boolean(route?.isCopy);
  const isEditing = Boolean(route?.id) && !isCopy;
  const gpxFileInputRef = useRef(null);

  const defaultMusterPoint = table?.default_muster_point || '';
  const defaultMusterTime = table?.default_muster_time || '';

  const getInitialSponsors = () => {
    return extractRouteSponsors(route);
  };

  const extractRouteMeta = (r) => {
    let meeting_point = r?.muster_point || r?.meeting_point || '';
    let muster_time = r?.muster_time || '';
    let route_type = r?.route_type || (r?.is_static ? 'static' : 'tour');
    let static_stop_name = r?.static_stop_name || '';
    let static_stop_time = r?.static_stop_time || '';
    let lead_marshal = r?.lead_marshal || '';
    let tow_driver = r?.tow_driver || '';
    let max_volunteers = 15;
    let max_santas = 1;
    let max_drivers = 1;
    let max_lead_marshals = 1;
    let max_collectors = 8;
    let max_marshals = 4;
    let max_tech = 1;
    let volunteer_closed = false;

    if (r?.notes) {
      const m = r.notes.match(/<!--\s*ROUTE_META:\s*({.*?})\s*-->/s);
      if (m && m[1]) {
        try {
          const parsed = JSON.parse(m[1]);
          if (!meeting_point && (parsed.muster_point || parsed.meeting_point)) meeting_point = parsed.muster_point || parsed.meeting_point;
          if (!muster_time && parsed.muster_time) muster_time = parsed.muster_time;
          if (parsed.route_type) route_type = parsed.route_type;
          if (parsed.static_stop_name) static_stop_name = parsed.static_stop_name;
          if (parsed.static_stop_time) static_stop_time = parsed.static_stop_time;
          if (!lead_marshal && parsed.lead_marshal) lead_marshal = parsed.lead_marshal;
          if (!tow_driver && parsed.tow_driver) tow_driver = parsed.tow_driver;
          if (parsed.max_volunteers !== undefined) max_volunteers = Number(parsed.max_volunteers);
          if (parsed.max_santas !== undefined) max_santas = Number(parsed.max_santas);
          if (parsed.max_drivers !== undefined) max_drivers = Number(parsed.max_drivers);
          if (parsed.max_lead_marshals !== undefined) max_lead_marshals = Number(parsed.max_lead_marshals);
          if (parsed.max_collectors !== undefined) max_collectors = Number(parsed.max_collectors);
          if (parsed.max_marshals !== undefined) max_marshals = Number(parsed.max_marshals);
          if (parsed.max_tech !== undefined) max_tech = Number(parsed.max_tech);
          if (parsed.volunteer_closed !== undefined) volunteer_closed = Boolean(parsed.volunteer_closed);
        } catch(e) {}
      }
    }
    return {
      meeting_point, muster_time, route_type, static_stop_name, static_stop_time, lead_marshal, tow_driver,
      max_volunteers, max_santas, max_drivers, max_lead_marshals, max_collectors, max_marshals, max_tech, volunteer_closed
    };
  };

  const initialMeta = extractRouteMeta(route);
  const [sponsors, setSponsors] = useState(getInitialSponsors);

  const initialStartTime = route?.start_time || '18:00';
  const [formData, setFormData] = useState({
    id: route?.id || `route_${Date.now()}`,
    name: route?.name || '',
    date: route?.date || new Date().toISOString().slice(0, 10),
    route_type: initialMeta.route_type,
    static_stop_name: initialMeta.static_stop_name,
    static_stop_time: initialMeta.static_stop_time,
    start_time: initialStartTime,
    end_time: route?.end_time || '20:30',
    sleigh_speed: (route?.sleigh_speed !== undefined && route?.sleigh_speed !== null && !isNaN(Number(route.sleigh_speed))) ? Number(route.sleigh_speed) : 3.0,
    meeting_point: resolveInitialMeetingPoint(initialMeta.meeting_point, defaultMusterPoint),
    muster_time: resolveInitialMusterTime(initialMeta.muster_time, initialStartTime, defaultMusterTime),
    gpx_url: route?.gpx_url || route?.gpxUrl || '',
    gpx_file_name: route?.gpx_file_name || (route?.gpx_url ? 'route.gpx' : ''),
    planned_stops: route?.planned_stops || [],
    streetsText: route?.streets?.map(s => typeof s === 'string' ? s : s.street_name).join(', ') || '',
    sponsor_name: route?.sponsor_name || '',
    sponsor_link: route?.sponsor_link || '',
    sponsor_description: route?.sponsor_description || '',
    sponsor_logo_url: route?.sponsor_logo_url || route?.sponsor_logo || '',
    max_volunteers: initialMeta.max_volunteers,
    max_santas: initialMeta.max_santas,
    max_drivers: initialMeta.max_drivers,
    max_lead_marshals: initialMeta.max_lead_marshals,
    max_collectors: initialMeta.max_collectors,
    max_marshals: initialMeta.max_marshals,
    max_tech: initialMeta.max_tech !== undefined ? initialMeta.max_tech : 1,
    volunteer_closed: initialMeta.volunteer_closed
  });

  const [gpxStats, setGpxStats] = useState(
    route?.gpx_url
      ? { pointsCount: 'Loaded', stopsCount: route?.planned_stops?.length || 0, distanceMi: '—' }
      : null
  );
  const [isParsingGpx, setIsParsingGpx] = useState(false);
  const [isGpxDragging, setIsGpxDragging] = useState(false);
  const [isDetectingStreets, setIsDetectingStreets] = useState(false);
  const [streetDetectStatus, setStreetDetectStatus] = useState('');
  const lastOpenedRouteKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      lastOpenedRouteKeyRef.current = null;
      return;
    }
    const routeKey = route?.id ? `${route.id}_${route.isCopy ? 'copy' : 'edit'}` : 'new_route';
    if (lastOpenedRouteKeyRef.current === routeKey) {
      return; // RouteEditorModal is already open and initialized for this route session. Shield user edits from background prop churn!
    }
    lastOpenedRouteKeyRef.current = routeKey;
    setStreetDetectStatus('');

    const meta = extractRouteMeta(route);
    setSponsors(extractRouteSponsors(route));
    const rStart = route?.start_time || '18:00';
    setFormData({
      id: route?.id || `route_${Date.now()}`,
      name: route?.name || '',
      date: route?.date || new Date().toISOString().slice(0, 10),
      route_type: meta.route_type,
      static_stop_name: meta.static_stop_name,
      static_stop_time: meta.static_stop_time,
      start_time: rStart,
      end_time: route?.end_time || '20:30',
      sleigh_speed: (route?.sleigh_speed !== undefined && route?.sleigh_speed !== null && !isNaN(Number(route.sleigh_speed))) ? Number(route.sleigh_speed) : 3.0,
      meeting_point: resolveInitialMeetingPoint(meta.meeting_point, defaultMusterPoint),
      muster_time: resolveInitialMusterTime(meta.muster_time, rStart, defaultMusterTime),
      gpx_url: route?.gpx_url || route?.gpxUrl || '',
      gpx_file_name: route?.gpx_file_name || (route?.gpx_url ? 'route.gpx' : ''),
      planned_stops: route?.planned_stops || [],
      streetsText: route?.streets?.map(s => typeof s === 'string' ? s : s.street_name).join(', ') || '',
      sponsor_name: route?.sponsor_name || '',
      sponsor_link: route?.sponsor_link || '',
      sponsor_description: route?.sponsor_description || '',
      sponsor_logo_url: route?.sponsor_logo_url || route?.sponsor_logo || '',
      max_volunteers: meta.max_volunteers,
      max_santas: meta.max_santas,
      max_drivers: meta.max_drivers,
      max_lead_marshals: meta.max_lead_marshals,
      max_collectors: meta.max_collectors,
      max_marshals: meta.max_marshals,
      max_tech: meta.max_tech,
      volunteer_closed: meta.volunteer_closed
    });
    setGpxStats(
      route?.gpx_url
        ? { pointsCount: 'Loaded', stopsCount: route?.planned_stops?.length || 0, distanceMi: '—' }
        : null
    );
  }, [isOpen, route, defaultMusterPoint, defaultMusterTime]);

  // Real-time synchronization when GPX track is tacked from Route Planner
  useEffect(() => {
    if (!isOpen) return;

    const handleGpxAttached = (e) => {
      const data = e.data;
      if (!data || data.type !== 'TURBOSANTA_GPX_ATTACHED') return;
      if (data.routeId && formData.id && data.routeId !== formData.id) return;

      setFormData(prev => ({
        ...prev,
        gpx_url: data.gpxUrl || prev.gpx_url,
        gpx_file_name: data.fileName || prev.gpx_file_name || 'route_planner.gpx',
        planned_stops: data.stops || prev.planned_stops || [],
        sleigh_speed: (data.sleighSpeed !== undefined && data.sleighSpeed !== null && !isNaN(Number(data.sleighSpeed))) ? Number(data.sleighSpeed) : (prev.sleigh_speed || 3.0),
        end_time: data.endTime || prev.end_time,
        streetsText: data.detectedStreets && data.detectedStreets.length > 0
          ? data.detectedStreets.join(', ')
          : prev.streetsText
      }));

      if (data.pointsCount || data.distanceMi) {
        setGpxStats({
          fileName: data.fileName || 'route_planner.gpx',
          pointsCount: data.pointsCount || 0,
          stopsCount: (data.stops || []).length,
          distanceMi: data.distanceMi || '—',
          stops: data.stops || []
        });
      }
    };

    window.addEventListener('message', handleGpxAttached);
    let bc = null;
    try {
      bc = new BroadcastChannel('turbosanta_routes');
      bc.onmessage = handleGpxAttached;
    } catch (err) {}

    return () => {
      window.removeEventListener('message', handleGpxAttached);
      if (bc) bc.close();
    };
  }, [isOpen, formData.id]);

  if (!isOpen) return null;

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
            name: stopNameNode ? stopNameNode.textContent.trim() : `Planned Stop ${idx + 1}`,
            allocated_mins: 5,
            tally: 0
          };
        });

        // 4. Calculate route distance in miles & collect track coordinates
        let distKm = 0;
        let lastLat = null, lastLng = null;
        const trackCoords = [];
        trackNodes.forEach(pt => {
          const lat = parseFloat(pt.getAttribute("lat"));
          const lng = parseFloat(pt.getAttribute("lon"));
          if (!isNaN(lat) && !isNaN(lng)) {
            trackCoords.push([lat, lng]);
            if (lastLat !== null && lastLng !== null) {
              const dLat = (lat - lastLat) * Math.PI / 180;
              const dLng = (lng - lastLng) * Math.PI / 180;
              const a = Math.sin(dLat / 2) ** 2 + Math.cos(lastLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
              distKm += 6371 * 2 * Math.asin(Math.sqrt(a));
            }
            lastLat = lat;
            lastLng = lng;
          }
        });
        const distanceMi = (distKm * 0.621371).toFixed(2);

        // 5. Upload GPX to Cloudflare R2 AND detect streets in parallel (~0.3s)
        const [r2Url, streetResult] = await Promise.all([
          uploadAssetToR2(file, tableSlug),
          trackCoords.length >= 2
            ? detectStreetsFromPoints(trackCoords).catch(() => ({ streets: [], elapsedMs: 0 }))
            : Promise.resolve({ streets: [], elapsedMs: 0 })
        ]);
        const finalGpxUrl = r2Url || `data:application/gpx+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;

        const autoStreets = streetResult?.streets || [];
        if (autoStreets.length > 0) {
          setStreetDetectStatus(`⚡ ${autoStreets.length} streets detected (${(streetResult.elapsedMs / 1000).toFixed(2)}s)`);
        }

        setFormData(prev => ({
          ...prev,
          name: prev.name || gpxName || file.name.replace(/\.gpx$/i, ''),
          gpx_url: finalGpxUrl,
          gpx_file_name: file.name,
          planned_stops: stops,
          streetsText: (!prev.streetsText || !prev.streetsText.trim()) && autoStreets.length > 0
            ? autoStreets.join(', ')
            : prev.streetsText
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

  const handleAutoDetectStreets = async () => {
    if (!formData.gpx_url || isDetectingStreets) return;
    setIsDetectingStreets(true);
    setStreetDetectStatus('⚡ Scanning GPX road graph…');
    try {
      const res = await detectStreetsFromGpxUrl(formData.gpx_url);
      if (res.streets && res.streets.length > 0) {
        setFormData(prev => ({ ...prev, streetsText: res.streets.join(', ') }));
        setStreetDetectStatus(`⚡ ${res.streets.length} streets detected in ${(res.elapsedMs / 1000).toFixed(2)}s`);
      } else {
        setStreetDetectStatus('No named streets detected along this GPX track.');
      }
    } catch (err) {
      setStreetDetectStatus('Could not scan GPX: ' + (err.message || 'Check connection'));
    } finally {
      setIsDetectingStreets(false);
    }
  };

  const handleAddSponsor = (defaultType = 'sponsor') => {
    setSponsors(prev => [
      ...prev,
      { type: defaultType === 'charity' ? 'charity' : 'sponsor', name: '', link: '', description: '', logo_url: '' }
    ]);
  };

  const handleRemoveSponsor = (index) => {
    setSponsors(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSponsor = (index, field, value) => {
    setSponsors(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleStartTimeChange = (newStartTime) => {
    setFormData(prev => {
      const oldExpectedMuster = calculateMusterFromStart(prev.start_time, 15);
      const isAutoLinked = !prev.muster_time || prev.muster_time === oldExpectedMuster;
      return {
        ...prev,
        start_time: newStartTime,
        muster_time: isAutoLinked ? calculateMusterFromStart(newStartTime, 15) : prev.muster_time
      };
    });
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
    if (!targetId || targetId.startsWith('route_') || isCopy) {
      targetId = slugifyRouteId(tableSlug, formData.name);
    }
    if (isEditing && isPastOriginal && isNewDateFuture) {
      const wantCopy = window.confirm(
        `💡 You are changing the date of a completed route from ${route.date} to ${formData.date}.\n\n` +
        `Would you like to SAVE AS A NEW ROUTE for next year instead? This preserves your Table's official past season records and Gift Aid audit.\n\n` +
        `Click "OK" to Save as New Route (Recommended).\n` +
        `Click "Cancel" to Overwrite the past route.`
      );
      if (wantCopy) {
        const nextYear = new Date(formData.date).getFullYear();
        targetId = `${slugifyRouteId(tableSlug, formData.name)}_${nextYear}`;
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
        type: (s.type || 'sponsor').toLowerCase().trim() === 'charity' ? 'charity' : 'sponsor',
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
      muster_time: (formData.muster_time || '').trim(),
      route_type: formData.route_type || 'tour',
      is_static: formData.route_type === 'static' ? 1 : 0,
      static_stop_name: (formData.static_stop_name || '').trim(),
      static_stop_time: (formData.static_stop_time || '').trim(),
      lead_marshal: (formData.lead_marshal || initialMeta.lead_marshal || route?.lead_marshal || '').trim(),
      tow_driver: (formData.tow_driver || initialMeta.tow_driver || route?.tow_driver || '').trim(),
      max_volunteers: parseInt(formData.max_volunteers, 10) || 15,
      max_santas: parseInt(formData.max_santas, 10) || 1,
      max_drivers: parseInt(formData.max_drivers, 10) || 1,
      max_lead_marshals: parseInt(formData.max_lead_marshals, 10) || 1,
      max_collectors: parseInt(formData.max_collectors, 10) || 8,
      max_marshals: parseInt(formData.max_marshals, 10) || 4,
      max_tech: (formData.max_tech !== undefined && !isNaN(parseInt(formData.max_tech, 10))) ? parseInt(formData.max_tech, 10) : 1,
      volunteer_closed: Boolean(formData.volunteer_closed)
    };
    const hasMeta = Boolean(
      routeMeta.meeting_point || routeMeta.muster_time || routeMeta.static_stop_name ||
      routeMeta.route_type === 'static' || routeMeta.lead_marshal || routeMeta.tow_driver ||
      routeMeta.volunteer_closed || routeMeta.max_volunteers !== 15
    );

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
      route_type: routeMeta.route_type,
      is_static: routeMeta.is_static,
      static_stop_name: routeMeta.static_stop_name,
      static_stop_time: routeMeta.static_stop_time,
      muster_point: routeMeta.meeting_point,
      meeting_point: routeMeta.meeting_point,
      muster_time: routeMeta.muster_time,
      lead_marshal: routeMeta.lead_marshal,
      tow_driver: routeMeta.tow_driver,
      streets: streetsArray,
      notes: finalNotes,
      sponsors: validSponsors,
      sponsors_json: validSponsors.length > 0 ? JSON.stringify(validSponsors) : null,
      sponsor_name: validSponsors.filter(s => s.type !== 'charity').map(s => s.name).filter(Boolean).join(' • ') || (validSponsors[0]?.name || ''),
      sponsor_link: validSponsors[0]?.link || '',
      sponsor_description: validSponsors[0]?.description || '',
      sponsor_logo: validSponsors[0]?.logo_url || '',
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

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Route Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, route_type: 'tour' }))}
                  style={{
                    background: formData.route_type !== 'static' ? 'rgba(251, 175, 51, 0.15)' : '#0d0d0b',
                    border: `1px solid ${formData.route_type !== 'static' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: formData.route_type !== 'static' ? '#fff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  🚗 Street Touring Run
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, route_type: 'static' }))}
                  style={{
                    background: formData.route_type === 'static' ? 'rgba(168, 85, 247, 0.18)' : '#0d0d0b',
                    border: `1px solid ${formData.route_type === 'static' ? '#c084fc' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: formData.route_type === 'static' ? '#fff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  🎪 Static Appearance / Grotto
                </button>
              </div>
            </div>

            {formData.route_type !== 'static' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#fff', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎪 Pre-Route Static Stop (Optional)</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    For static appearance earlier that day (e.g. 15 mins before street run)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    value={formData.static_stop_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, static_stop_name: e.target.value }))}
                    placeholder="Location (e.g. Tesco Superstore Grotto / Woolpack Pub)"
                    style={{
                      width: '100%',
                      background: '#0d0d0b',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="text"
                    value={formData.static_stop_time || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, static_stop_time: e.target.value }))}
                    placeholder="Time (e.g. 16:30 – 17:30)"
                    style={{
                      width: '100%',
                      background: '#0d0d0b',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

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
                  onChange={(e) => handleStartTimeChange(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Sleigh Pace (MPH)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={formData.sleigh_speed !== undefined ? formData.sleigh_speed : 3}
                  onChange={(e) => {
                    const sp = parseFloat(e.target.value) || 3;
                    setFormData(prev => ({ ...prev, sleigh_speed: sp }));
                  }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Muster / Meeting Point
                  </label>
                  {defaultMusterPoint && formData.meeting_point !== defaultMusterPoint && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, meeting_point: defaultMusterPoint }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                      title={`Reset to table default: ${defaultMusterPoint}`}
                    >
                      📍 Use Table Default
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.meeting_point}
                  onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
                  placeholder={defaultMusterPoint ? `Table Default: ${defaultMusterPoint}` : "e.g. Depot / Pavilion Car Park"}
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
                  {defaultMusterPoint && formData.meeting_point === defaultMusterPoint ? (
                    <span style={{ color: '#22c55e' }}>✓ Pulled from Table Settings default</span>
                  ) : (
                    'Assembly location for volunteer elves & bucket collectors.'
                  )}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Muster / Arrival Time (Volunteers)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {defaultMusterTime && formData.muster_time !== defaultMusterTime && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, muster_time: defaultMusterTime }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        title={`Reset to table default: ${defaultMusterTime}`}
                      >
                        🔄 Table Default ({defaultMusterTime})
                      </button>
                    )}
                    {formData.muster_time !== calculateMusterFromStart(formData.start_time, 15) && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, muster_time: calculateMusterFromStart(formData.start_time, 15) }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#60a5fa',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        title="Calculate 15 mins before start time"
                      >
                        ⚡ 15m Prior ({calculateMusterFromStart(formData.start_time, 15)})
                      </button>
                    )}
                  </div>
                </div>
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
                  {defaultMusterTime && formData.muster_time === defaultMusterTime ? (
                    <span style={{ color: '#22c55e' }}>✓ Pulled from Table Settings default ({defaultMusterTime})</span>
                  ) : formData.muster_time === calculateMusterFromStart(formData.start_time, 15) ? (
                    <span style={{ color: '#60a5fa' }}>⚡ Auto: 15 minutes before departure ({formData.start_time})</span>
                  ) : (
                    'Custom arrival time for this route.'
                  )}
                </span>
              </div>
            </div>

            {/* Volunteer Capacity & Roster Limits */}
            <div style={{
              background: '#0d0d0b',
              border: formData.volunteer_closed ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#fff', fontWeight: 700, margin: 0 }}>
                    👥 Volunteer Capacity &amp; Crew Limits
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sets per-route limits for public registration. When reached, slots are politely declined.
                  </span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: formData.volunteer_closed ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.volunteer_closed)}
                    onChange={(e) => setFormData(prev => ({ ...prev, volunteer_closed: e.target.checked }))}
                    style={{ accentColor: '#ef4444', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>{formData.volunteer_closed ? '🔒 Registrations Closed (Marked Full)' : 'Mark Route Full / Closed'}</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Max Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.max_volunteers !== undefined ? formData.max_volunteers : 15}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_volunteers: parseInt(e.target.value, 10) || 15 }))}
                    style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    🎅 Santa (Max)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.max_santas !== undefined ? formData.max_santas : 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_santas: parseInt(e.target.value, 10) || 1 }))}
                    style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    🚐 Driver (Max)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.max_drivers !== undefined ? formData.max_drivers : 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_drivers: parseInt(e.target.value, 10) || 1 }))}
                    style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    🦺 Lead Marshall
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.max_lead_marshals !== undefined ? formData.max_lead_marshals : 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_lead_marshals: parseInt(e.target.value, 10) || 1 }))}
                    style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    🪣 Collectors (Max)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.max_collectors !== undefined ? formData.max_collectors : 8}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_collectors: parseInt(e.target.value, 10) || 8 }))}
                    style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    🚶 Walkers (Max)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.max_marshals !== undefined ? formData.max_marshals : 4}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_marshals: parseInt(e.target.value, 10) || 4 }))}
                    style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    📡 Tech / GPS (Max)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.max_tech !== undefined ? formData.max_tech : 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_tech: e.target.value === '' ? 0 : (parseInt(e.target.value, 10) || 0) }))}
                    style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
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
                  href={`/route_planner.html?table=${encodeURIComponent(tableSlug || 'beverley')}&routeId=${encodeURIComponent(formData.id || '')}`}
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

            {/* Planned Stops on GPX Section */}
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
                    🛑 Planned Stops ({formData.planned_stops?.length || 0})
                    {formData.planned_stops && formData.planned_stops.length > 0 && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                        ⏱️ {(formData.planned_stops || []).reduce((sum, s) => sum + (parseInt(s.allocated_mins, 10) || 0), 0)}m total dwell
                      </span>
                    )}
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Actual stopping points (pubs, schools, greens). Shown as interactive pins on the public tracker.
                  </span>
                </div>
                <a
                  href={`/route_planner.html?table=${encodeURIComponent(tableSlug || 'beverley')}&routeId=${encodeURIComponent(formData.id || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11px',
                    color: 'var(--primary)',
                    background: 'rgba(251, 175, 51, 0.1)',
                    border: '1px solid rgba(251, 175, 51, 0.3)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none',
                    fontWeight: 700
                  }}
                >
                  <Navigation size={12} />
                  <span>Mark Stops on Map (Route Planner) &rarr;</span>
                </a>
              </div>

              {formData.planned_stops && formData.planned_stops.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {formData.planned_stops.map((stop, sIdx) => (
                    <div key={stop.id || `stop-${sIdx}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#161614',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}>
                      <span style={{
                        background: '#D31C1C',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {sIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={stop.name || ''}
                        onChange={(e) => {
                          const updated = [...formData.planned_stops];
                          updated[sIdx] = { ...updated[sIdx], name: e.target.value };
                          setFormData(prev => ({ ...prev, planned_stops: updated }));
                        }}
                        placeholder={`Stop ${sIdx + 1} Name (e.g. Red Lion Pub)`}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                      {/* Stop Dwell Time Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#0e0e0c', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 5px' }} title="Allocated stop dwell time added to route duration">
                        <span style={{ fontSize: '10px', color: '#38bdf8' }}>⏱️</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formData.planned_stops];
                            const cur = (updated[sIdx].allocated_mins !== undefined && updated[sIdx].allocated_mins !== null) ? Number(updated[sIdx].allocated_mins) : 5;
                            updated[sIdx] = { ...updated[sIdx], allocated_mins: Math.max(0, cur - 5) };
                            setFormData(prev => ({ ...prev, planned_stops: updated }));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 2px', fontSize: '10px', fontWeight: 700 }}
                        >-5m</button>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          value={(stop.allocated_mins !== undefined && stop.allocated_mins !== null) ? stop.allocated_mins : 5}
                          onChange={(e) => {
                            const updated = [...formData.planned_stops];
                            updated[sIdx] = { ...updated[sIdx], allocated_mins: Math.max(0, parseInt(e.target.value, 10) || 0) };
                            setFormData(prev => ({ ...prev, planned_stops: updated }));
                          }}
                          style={{ width: '32px', background: 'transparent', border: 'none', color: '#38bdf8', textAlign: 'center', fontSize: '11px', fontWeight: 700, outline: 'none' }}
                        />
                        <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 600 }}>m</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formData.planned_stops];
                            const cur = (updated[sIdx].allocated_mins !== undefined && updated[sIdx].allocated_mins !== null) ? Number(updated[sIdx].allocated_mins) : 5;
                            updated[sIdx] = { ...updated[sIdx], allocated_mins: cur + 5 };
                            setFormData(prev => ({ ...prev, planned_stops: updated }));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '0 2px', fontSize: '10px', fontWeight: 700 }}
                        >+5m</button>
                      </div>

                      {/* Crowd attendance tally */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#0e0e0c', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 5px' }} title="Crowd attendance tally for this stop">
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>👥</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formData.planned_stops];
                            const cur = updated[sIdx].tally || 0;
                            updated[sIdx] = { ...updated[sIdx], tally: Math.max(0, cur - 1) };
                            setFormData(prev => ({ ...prev, planned_stops: updated }));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 2px', fontSize: '11px', fontWeight: 700 }}
                        >-</button>
                        <input
                          type="number"
                          min="0"
                          value={stop.tally || 0}
                          onChange={(e) => {
                            const updated = [...formData.planned_stops];
                            updated[sIdx] = { ...updated[sIdx], tally: Math.max(0, parseInt(e.target.value, 10) || 0) };
                            setFormData(prev => ({ ...prev, planned_stops: updated }));
                          }}
                          style={{ width: '38px', background: 'transparent', border: 'none', color: 'var(--primary)', textAlign: 'center', fontSize: '11px', fontWeight: 700, outline: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formData.planned_stops];
                            const cur = updated[sIdx].tally || 0;
                            updated[sIdx] = { ...updated[sIdx], tally: cur + 1 };
                            setFormData(prev => ({ ...prev, planned_stops: updated }));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 2px', fontSize: '11px', fontWeight: 700 }}
                        >+</button>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {Number(stop.lat).toFixed(4)}, {Number(stop.lng).toFixed(4)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.planned_stops.filter((_, idx) => idx !== sIdx);
                          setFormData(prev => ({ ...prev, planned_stops: updated }));
                          setGpxStats(prev => prev ? ({ ...prev, stopsCount: updated.length }) : prev);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          fontSize: '13px'
                        }}
                        title="Delete stop"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  border: '1px dashed var(--border)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>No planned stops marked on this route yet.</span>
                  <a
                    href={`/route_planner.html?table=${encodeURIComponent(tableSlug || 'beverley')}&routeId=${encodeURIComponent(formData.id || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#FBAF33', fontWeight: 700, textDecoration: 'none' }}
                  >
                    + Click Map to Drop Stops &rarr;
                  </a>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>
                  Street Timetable (Comma-separated)
                </label>
                {formData.gpx_url && (
                  <button
                    type="button"
                    onClick={handleAutoDetectStreets}
                    disabled={isDetectingStreets}
                    style={{
                      fontSize: '11px',
                      color: isDetectingStreets ? 'var(--text-muted)' : 'var(--primary)',
                      background: 'rgba(251, 175, 51, 0.1)',
                      border: '1px solid rgba(251, 175, 51, 0.35)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      cursor: isDetectingStreets ? 'wait' : 'pointer',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Instantly detect all street names along the attached GPX route"
                  >
                    <span>{isDetectingStreets ? '⏳ Scanning GPX…' : '⚡ Auto-Detect from GPX'}</span>
                  </button>
                )}
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Residents can instantly search any of these streets on the public tracker map.
                </span>
                {streetDetectStatus && (
                  <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 600 }}>
                    {streetDetectStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Route Sponsor & Charity Section (with Multi-Sponsor Support & Dropdown Option) */}
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
                <span>Sponsors & Charity Beneficiaries</span>
                <span style={{ fontSize: '12px', fontWeight: 'normal', color: sponsors.length ? '#86efac' : 'var(--text-muted)' }}>
                  {(() => {
                    if (sponsors.length === 0) return '(0 — Hidden on tracker)';
                    const bizCount = sponsors.filter(s => s.type !== 'charity').length;
                    const charCount = sponsors.filter(s => s.type === 'charity').length;
                    const parts = [];
                    if (bizCount > 0) parts.push(`${bizCount} sponsor${bizCount > 1 ? 's' : ''}`);
                    if (charCount > 0) parts.push(`${charCount} charity${charCount > 1 ? ' charities' : ''}`);
                    return `(${parts.join(', ')})`;
                  })()}
                </span>
              </h3>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleAddSponsor('sponsor')}
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
                <button
                  type="button"
                  onClick={() => handleAddSponsor('charity')}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: 'rgba(244, 114, 182, 0.6)',
                    color: '#f472b6'
                  }}
                >
                  <Heart size={13} />
                  <span>Add Charity</span>
                </button>
              </div>
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
                  No sponsors or beneficiary charities assigned to this route. You can add local businesses sponsoring tonight's route, and/or attribute tonight's collection to a chosen local charity cause.
                </p>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  When left empty, the sponsor spotlight will be completely hidden from the public tracker for this route.
                </p>
                <div style={{ display: 'inline-flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleAddSponsor('sponsor')}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    <Plus size={14} />
                    <span>Add Business Sponsor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSponsor('charity')}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(244, 114, 182, 0.6)', color: '#f472b6' }}
                  >
                    <Heart size={13} />
                    <span>Add Charity Beneficiary</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sponsors.map((sp, idx) => {
                  const isCharity = sp.type === 'charity';
                  return (
                    <div key={idx} style={{
                      background: isCharity ? 'rgba(244, 114, 182, 0.04)' : 'rgba(255, 255, 255, 0.03)',
                      border: isCharity ? '1px solid rgba(244, 114, 182, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: isCharity ? '#f472b6' : 'var(--primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {isCharity ? <Heart size={14} /> : <Building2 size={14} />}
                          {isCharity ? `Beneficiary Charity #${idx + 1}` : `Business Sponsor #${idx + 1}`}
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
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: isCharity ? '#f472b6' : 'var(--primary)',
                              marginBottom: '4px'
                            }}>
                              Attribution Type
                            </label>
                            <select
                              value={sp.type || 'sponsor'}
                              onChange={(e) => handleUpdateSponsor(idx, 'type', e.target.value)}
                              style={{
                                width: '100%',
                                background: '#151513',
                                border: `1px solid ${isCharity ? 'rgba(244, 114, 182, 0.5)' : 'rgba(251, 175, 51, 0.5)'}`,
                                borderRadius: '6px',
                                padding: '8px 12px',
                                color: '#fff',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                              }}
                            >
                              <option value="sponsor">🏢 Route Sponsor (Business Partner)</option>
                              <option value="charity">❤️ Charity Beneficiary (Tonight's Collection Cause)</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              {isCharity ? 'Charity / Good Cause Name' : 'Sponsor Company Name'}
                            </label>
                            <input
                              type="text"
                              value={sp.name}
                              onChange={(e) => handleUpdateSponsor(idx, 'name', e.target.value)}
                              placeholder={isCharity ? "e.g. Daisy Chain Autism Charity or Foodbank" : "e.g. Acme Plumbing Ltd"}
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

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              {isCharity ? 'Charity Website or Donate Link' : 'Sponsor Website Link'}
                            </label>
                            <input
                              type="url"
                              value={sp.link}
                              onChange={(e) => handleUpdateSponsor(idx, 'link', e.target.value)}
                              placeholder={isCharity ? "https://daisychainproject.co.uk" : "https://example.co.uk"}
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
                              {isCharity ? "Charity Note (Displays on Tonight's Spotlight)" : "Sponsor Note (Displays on Tonight's Spotlight)"}
                            </label>
                            <input
                              type="text"
                              value={sp.description}
                              onChange={(e) => handleUpdateSponsor(idx, 'description', e.target.value)}
                              placeholder={isCharity ? "All bucket and card donations collected on tonight's route support this cause!" : "Proudly keeping Santa on the road for local charities!"}
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

                        <DropzoneUpload
                          label={isCharity ? "Charity Logo (.png)" : "Sponsor Logo (.png)"}
                          currentImage={sp.logo_url}
                          tableSlug={tableSlug}
                          onImageSelected={(url) => handleUpdateSponsor(idx, 'logo_url', url)}
                          helperText={isCharity ? "Upload charity or good cause transparent logo directly." : "Upload sponsor's transparent logo directly (No GitHub upload required!)."}
                        />
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleAddSponsor('sponsor')}
                    className="btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Another Sponsor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSponsor('charity')}
                    className="btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: 'rgba(244, 114, 182, 0.6)',
                      color: '#f472b6'
                    }}
                  >
                    <Heart size={14} />
                    <span>Add Another Charity</span>
                  </button>
                </div>
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
