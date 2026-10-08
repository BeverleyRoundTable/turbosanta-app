import React, { useState } from 'react';
import {
  Radio, Megaphone, Settings, Calendar, Heart, Shield,
  LogOut, ExternalLink, Save, Download, CheckCircle2,
  Users, Plus, Trash2, Edit3, Smartphone
} from 'lucide-react';
import { logoutAdmin } from '../services/auth';
import DropzoneUpload from './DropzoneUpload';
import RouteEditorModal from './RouteEditorModal';
import DriverBeacon from './DriverBeacon';

export default function AdminPortal({ session, onLogout, tableData, onUpdateTableData }) {
  const [activeTab, setActiveTab] = useState('announcements'); // Default to announcements
  const [announcementText, setAnnouncementText] = useState(tableData?.table?.live_announcement || '');
  const [saveStatus, setSaveStatus] = useState('');

  // Modals & Cockpit State
  const [isCockpitOpen, setIsCockpitOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // Settings State
  const [formData, setFormData] = useState({
    sleigh_display_name: tableData?.table?.sleigh_display_name || 'Beverley Round Table Santa Sleigh',
    fundraising_goal: tableData?.table?.fundraising_goal || 8000,
    donate_url: tableData?.table?.donate_url || 'https://www.zeffy.com/en-GB/donation-form/beverley-round-table-for-our-community',
    logo_url: 'https://brt-23f.pages.dev/icons/RTBI_Santa.png'
  });

  // Presets from the playbook
  const presets = [
    "Santa’s looking for the heaviest buckets in Town! Dig deep for local charities!",
    "Our Elves are running low on magic! Let’s fill the buckets before the end of the road!",
    "No cash? No problem! Scan the QR code or tap 'Donate' on your live tracker!",
    "We're taking a quick 2-minute 'Reindeer Rest' for photos. Come and say hello safely!",
    "This is our very last street of the night! Let's make it the loudest one yet!"
  ];

  // Handle PA broadcast update
  const handleBroadcast = (textToBroadcast) => {
    const text = textToBroadcast !== undefined ? textToBroadcast : announcementText;
    setAnnouncementText(text);

    if (onUpdateTableData) {
      onUpdateTableData(prev => ({
        ...prev,
        table: { ...prev.table, live_announcement: text || null }
      }));
    }

    setSaveStatus(text ? '📢 Announcement live on public tracker!' : 'Cleared announcement.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Route Save Handler
  const handleSaveRoute = (savedRoute, streetsArray) => {
    if (onUpdateTableData) {
      onUpdateTableData(prev => {
        const existingRoutes = prev.routes || [];
        const index = existingRoutes.findIndex(r => r.id === savedRoute.id);
        let newRoutes;
        if (index >= 0) {
          newRoutes = [...existingRoutes];
          newRoutes[index] = savedRoute;
        } else {
          newRoutes = [...existingRoutes, savedRoute];
        }

        // Replace streets for this route
        const otherStreets = (prev.streets || []).filter(s => s.route_id !== savedRoute.id);
        const newStreets = [...otherStreets, ...streetsArray];

        return {
          ...prev,
          routes: newRoutes,
          streets: newStreets
        };
      });
    }

    setSaveStatus(`Route "${savedRoute.name}" updated successfully!`);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Route Delete Handler
  const handleDeleteRoute = (routeId) => {
    if (onUpdateTableData) {
      onUpdateTableData(prev => ({
        ...prev,
        routes: (prev.routes || []).filter(r => r.id !== routeId),
        streets: (prev.streets || []).filter(s => s.route_id !== routeId)
      }));
    }
    setSaveStatus('Route deleted.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // HMRC R68 CSV Download
  const handleExportHmrc = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Title,First Name,Last Name,House name or number,Postcode,Aggregated donations,Sponsored event,Date,Amount\n" +
      "Mr,John,Smith,14,HU17 8PP,,,09/12/26,10.00\n" +
      "Mrs,Sarah,Jenkins,22 High Street,HU17 9AA,,,09/12/26,20.00\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HMRC_GiftAid_R68_${session.tableId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // IF FULLSCREEN COCKPIT IS ACTIVE
  if (isCockpitOpen) {
    return (
      <DriverBeacon
        session={session}
        onBack={() => setIsCockpitOpen(false)}
        onQuickAnnouncement={(text) => handleBroadcast(text)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0b', color: '#fff' }}>
      {/* Top Header */}
      <header style={{
        background: '#151513',
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'var(--primary)',
            color: '#000',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div className="brand-font" style={{ fontSize: '18px', fontWeight: 800 }}>
              <span>{session.tableName}</span>
              <span style={{ color: 'var(--primary)', marginLeft: '8px' }}>• God Mode 2.0</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Authenticated as <code>{session.email}</code>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Dedicated Cockpit Button */}
          <button
            onClick={() => setIsCockpitOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Smartphone size={16} />
            <span>Driver Cockpit Mode</span>
          </button>

          <a
            href="/"
            onClick={(e) => { e.preventDefault(); window.location.reload(); }}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <ExternalLink size={15} />
            <span>Public Site</span>
          </a>

          <button
            onClick={() => { logoutAdmin(); onLogout(); }}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px', borderColor: '#d31c1c', color: '#fca5a5' }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div style={{
        background: '#121210',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'announcements', label: 'Live PA Broadcast', icon: Megaphone },
          { id: 'routes', label: 'Routes & Timetables', icon: Calendar },
          { id: 'settings', label: 'Table Settings & Branding', icon: Settings },
          { id: 'giftaid', label: 'Gift Aid & HMRC', icon: Heart }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '14px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
        {saveStatus && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '12px 18px',
            color: '#86efac',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={18} />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* TAB 1: LIVE PA ANNOUNCEMENT WITH LIVE VISUAL PREVIEW */}
        {activeTab === 'announcements' && (
          <div style={{
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <h2 className="brand-font" style={{ fontSize: '24px', margin: '0 0 10px 0' }}>
              Live PA Announcement Broadcast
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Post an instant red alert banner at the very top of every family's live tracker screen.
            </p>

            {/* Visual Live Preview Box */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                LIVE PREVIEW (How it looks on family screens):
              </div>
              <div style={{
                backgroundColor: announcementText ? '#d31c1c' : '#262624',
                color: '#ffffff',
                padding: '12px 20px',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}>
                <span>📢 LIVE ANNOUNCEMENT:</span>
                <span>{announcementText || "No active announcement (Banner hidden on public site)"}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <textarea
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Type your announcement (e.g. Santa has arrived at New Road! Come wave!)..."
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
              <button
                onClick={() => handleBroadcast(announcementText)}
                className="btn-primary"
                style={{ padding: '10px 22px' }}
              >
                <Megaphone size={18} />
                <span>Publish Banner</span>
              </button>

              <button
                onClick={() => handleBroadcast('')}
                className="btn-secondary"
                style={{ padding: '10px 22px', borderColor: '#d31c1c', color: '#fca5a5' }}
              >
                Clear Announcement
              </button>
            </div>

            {/* Presets */}
            <h3 className="brand-font" style={{ fontSize: '16px', color: 'var(--primary)', marginBottom: '12px' }}>
              Quick Presets (1-Tap Broadcast):
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleBroadcast(preset)}
                  style={{
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#fff',
                    textAlign: 'left',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  📢 {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ROUTES & STREETS MANAGEMENT (WITH MODAL EDITOR) */}
        {activeTab === 'routes' && (
          <div style={{
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="brand-font" style={{ fontSize: '24px', margin: '0 0 4px 0' }}>
                  Route & Timetable Management
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                  Manage scheduled nights, street lists, and route sponsors with drag-and-drop logo uploads.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a
                  href="/route_planner.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '14px', borderColor: 'var(--primary)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                >
                  <MapPin size={18} />
                  <span>GPX Route Planner</span>
                </a>

                <button
                  onClick={() => {
                    setEditingRoute(null);
                    setIsRouteModalOpen(true);
                  }}
                  className="btn-primary"
                  style={{ padding: '10px 18px', fontSize: '14px' }}
                >
                  <Plus size={18} />
                  <span>Add New Route</span>
                </button>
              </div>
            </div>

            {/* Route Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(tableData?.routes || []).map(r => {
                const routeStreets = (tableData?.streets || []).filter(s => s.route_id === r.id);
                return (
                  <div
                    key={r.id}
                    style={{
                      background: '#0d0d0b',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <strong style={{ fontSize: '20px', color: '#fff', display: 'block', marginBottom: '4px' }}>
                        {r.name}
                      </strong>
                      <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px' }}>
                        📅 {r.date} • ⏰ {r.start_time || '18:00'} - {r.end_time || '20:30'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        <strong>Streets:</strong> {routeStreets.map(s => s.street_name).join(', ') || 'None specified'}
                      </div>
                      {r.sponsor_name && (
                        <div style={{ fontSize: '12px', color: '#86efac', marginTop: '6px' }}>
                          ⭐ Sponsored by: <strong>{r.sponsor_name}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          setEditingRoute({ ...r, streets: routeStreets });
                          setIsRouteModalOpen(true);
                        }}
                        className="btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '13px' }}
                      >
                        <Edit3 size={15} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRoute(r.id)}
                        className="btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '13px', borderColor: '#d31c1c', color: '#fca5a5' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TABLE SETTINGS & DRAG-AND-DROP LOGO UPLOAD */}
        {activeTab === 'settings' && (
          <div style={{
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <h2 className="brand-font" style={{ fontSize: '24px', margin: '0 0 10px 0' }}>
              Table Settings & Branding
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Upload your Table's logo directly and configure your fundraising target.
            </p>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Sleigh Display Name
                </label>
                <input
                  type="text"
                  value={formData.sleigh_display_name}
                  onChange={(e) => setFormData({ ...formData, sleigh_display_name: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Fundraising Target (£)
                  </label>
                  <input
                    type="number"
                    value={formData.fundraising_goal}
                    onChange={(e) => setFormData({ ...formData, fundraising_goal: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      background: '#0d0d0b',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '15px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Donation URL (Zeffy / Stripe)
                  </label>
                  <input
                    type="url"
                    value={formData.donate_url}
                    onChange={(e) => setFormData({ ...formData, donate_url: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0d0d0b',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '15px'
                    }}
                  />
                </div>
              </div>

              {/* DRAG AND DROP LOGO UPLOAD ZONE */}
              <DropzoneUpload
                label="Custom Table Logo (.png)"
                currentImage={formData.logo_url}
                onImageSelected={(dataUrl) => setFormData(prev => ({ ...prev, logo_url: dataUrl }))}
                helperText="Drag and drop your official Table or Sleigh logo (No GitHub upload required!)."
              />

              <div>
                <button
                  onClick={() => {
                    if (onUpdateTableData) {
                      onUpdateTableData(prev => ({
                        ...prev,
                        table: {
                          ...prev.table,
                          sleigh_display_name: formData.sleigh_display_name,
                          fundraising_goal: formData.fundraising_goal,
                          donate_url: formData.donate_url
                        }
                      }));
                    }
                    setSaveStatus('Settings successfully saved!');
                    setTimeout(() => setSaveStatus(''), 3000);
                  }}
                  className="btn-primary"
                  style={{ width: '100%', maxWidth: '250px' }}
                >
                  <Save size={18} />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GIFT AID & HMRC */}
        {activeTab === 'giftaid' && (
          <div style={{
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="brand-font" style={{ fontSize: '24px', margin: '0 0 4px 0' }}>
                  HMRC Gift Aid Claims
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                  Export Gift Aid schedules formatted for direct upload to HMRC Charities Online.
                </p>
              </div>

              <button
                onClick={handleExportHmrc}
                className="btn-primary"
                style={{ padding: '10px 20px' }}
              >
                <Download size={18} />
                <span>Export HMRC R68 CSV</span>
              </button>
            </div>

            <div style={{
              background: '#0d0d0b',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                HMRC R68 COMPLIANT CSV SPECIFICATION
              </span>
              <p style={{ fontSize: '15px', color: '#86efac', margin: 0, fontWeight: 600 }}>
                ✓ Pre-formatted with Title, Name, House No, Postcode, Date, and Amount (2dp, no £ symbol).
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Route Editor Modal */}
      <RouteEditorModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        route={editingRoute}
        onSaveRoute={handleSaveRoute}
        onDeleteRoute={handleDeleteRoute}
      />
    </div>
  );
}
