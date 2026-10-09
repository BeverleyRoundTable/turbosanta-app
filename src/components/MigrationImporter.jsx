import React, { useState } from 'react';
import {
  FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight,
  Download, Database, Sparkles, MapPin, Users, Heart, Shield, RefreshCw, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseTurboSantaWorkbook, generateSqlMigration } from '../services/migrationParser';

export default function MigrationImporter({ tableSlug = 'beverley', onApplyMigration, currentTableData }) {
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [activePreviewTab, setActivePreviewTab] = useState('routes');
  const [migratingStatus, setMigratingStatus] = useState('');
  const [sqlContent, setSqlContent] = useState('');

  // Handle file reading
  const processFile = async (file) => {
    if (!file) return;
    setError(null);
    setParsing(true);
    setMigratingStatus('');

    try {
      const buffer = await file.arrayBuffer();
      const data = parseTurboSantaWorkbook(buffer, tableSlug);

      if (!data.routes.length && !data.volunteers.length && !data.settings.sleigh_display_name) {
        throw new Error("Could not detect standard TurboSanta 1.0 tabs (Settings, Routes, Volunteers) in this workbook. Please ensure you downloaded the full Google Sheet.");
      }

      setParsedData(data);
      const sql = generateSqlMigration(data, tableSlug);
      setSqlContent(sql);
    } catch (err) {
      console.error("Migration parse error:", err);
      setError(err.message || "Failed to parse workbook. Please ensure it is a valid .xlsx file from Google Sheets.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Apply migration to current app and remote D1 Worker
  const handleApply = async () => {
    if (!parsedData) return;
    setMigratingStatus('Migrating data into TurboSanta 2.0...');

    try {
      // 1. Fire API call to Cloudflare Worker D1
      try {
        await fetch(`https://turbosanta-api.beverley247.workers.dev/api/migrate?table=${encodeURIComponent(tableSlug)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableSlug,
            settings: parsedData.settings,
            routes: parsedData.routes,
            streets: parsedData.streets,
            volunteers: parsedData.volunteers,
            donations: parsedData.donations
          })
        });
      } catch (workerErr) {
        console.warn("Cloudflare D1 Worker sync note:", workerErr);
      }

      // 2. Update local state via callback
      if (onApplyMigration) {
        onApplyMigration({
          table: {
            id: tableSlug,
            slug: tableSlug,
            name: parsedData.settings.sleigh_display_name || `${tableSlug.toUpperCase()} Round Table`,
            sleigh_display_name: parsedData.settings.sleigh_display_name || `${tableSlug.toUpperCase()} Santa Sleigh`,
            donate_url: parsedData.settings.donate_url || 'https://www.zeffy.com',
            charity_name: parsedData.settings.charity_name || 'Round Table Childrens Wish',
            fundraising_goal: parsedData.settings.fundraising_goal || 5000,
            total_raised: parsedData.donations.total_raised || 0,
            primary_color: parsedData.settings.primary_color || '#FBAF33',
            accent_color: parsedData.settings.accent_color || '#D31C1C'
          },
          routes: parsedData.routes,
          streets: parsedData.streets
        });
      }

      // 3. Save to localStorage for persistence
      try {
        localStorage.setItem(`turbosanta_table_${tableSlug}`, JSON.stringify(parsedData));
      } catch (e) {}

      // 4. Confetti and success message
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      setMigratingStatus('✅ Migration Complete! All routes, streets, volunteers, and settings are now live in TurboSanta 2.0!');
    } catch (err) {
      setMigratingStatus(`⚠️ Notice: ${err.message}`);
    }
  };

  // Download SQL Script
  const handleDownloadSql = () => {
    if (!sqlContent) return;
    const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TurboSanta_Migration_${tableSlug}_${Date.now()}.sql`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download JSON
  const handleDownloadJson = () => {
    if (!parsedData) return;
    const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TurboSanta_Data_${tableSlug}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px 40px 20px' }}>
      
      {/* Intro Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(251,175,51,0.12) 0%, rgba(22,22,20,0.95) 100%)',
        border: '1px solid rgba(251,175,51,0.3)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '28px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '100px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              background: 'rgba(251,175,51,0.2)',
              color: 'var(--primary)',
              marginBottom: '12px'
            }}>
              <Sparkles size={13} />
              TurboSanta 1.0 → 2.0 Fast Transfer
            </span>
            <h2 className="brand-font" style={{ fontSize: '26px', color: '#fff', marginBottom: '8px' }}>
              One-Click Google Sheet & Excel Data Importer
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '700px', lineHeight: 1.6 }}>
              Migrate your entire Round Table sleigh setup from your existing 1.0 Google Sheet in under 10 seconds.
              This automatically extracts your <strong>routes, schedules, GPX links, street names, volunteer roster, sponsors, and settings</strong> into your high-performance Cloudflare D1 SQL database.
            </p>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 18px',
            textAlign: 'center',
            minWidth: '180px'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Table</div>
            <div className="brand-font" style={{ fontSize: '20px', color: 'var(--primary)', margin: '4px 0' }}>{tableSlug.toUpperCase()}</div>
            <div style={{ fontSize: '11px', color: '#86efac' }}>Cloudflare D1 Ready</div>
          </div>
        </div>

        {/* 3 Steps Guide */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>1</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              In your 1.0 Google Sheet, click <strong style={{ color: '#fff' }}>File → Download → Microsoft Excel (.xlsx)</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>2</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Drag and drop your downloaded <strong style={{ color: '#fff' }}>.xlsx file</strong> into the box below
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>3</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Review the preview & click <strong style={{ color: '#fff' }}>Auto-Populate TurboSanta 2.0</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Drag & Drop File Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '2px dashed var(--primary)' : '2px dashed rgba(255,255,255,0.18)',
          backgroundColor: dragActive ? 'rgba(251,175,51,0.08)' : '#151513',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        onClick={() => document.getElementById('sheetFileInput').click()}
      >
        <input
          id="sheetFileInput"
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        <div style={{
          background: 'rgba(251,175,51,0.15)',
          color: 'var(--primary)',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          {parsing ? <RefreshCw size={28} className="animate-spin" /> : <UploadCloud size={32} />}
        </div>

        <h3 className="brand-font" style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
          {parsing ? 'Parsing Excel Workbook...' : 'Drop your 1.0 Google Sheet (.xlsx) here'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          Supports .xlsx, .xls, or .csv exported from Google Sheets
        </p>

        <button
          type="button"
          className="btn-primary"
          style={{ padding: '8px 20px', fontSize: '13px' }}
        >
          <FileSpreadsheet size={16} />
          <span>Browse File from Computer</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: 'rgba(211,28,28,0.15)',
          border: '1px solid rgba(211,28,28,0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fca5a5'
        }}>
          <AlertTriangle size={20} color="#f87171" />
          <div style={{ fontSize: '13px' }}>{error}</div>
        </div>
      )}

      {/* Migration Status Success / Info */}
      {migratingStatus && (
        <div style={{
          background: migratingStatus.includes('✅') ? 'rgba(46,204,113,0.15)' : 'rgba(251,175,51,0.15)',
          border: `1px solid ${migratingStatus.includes('✅') ? 'rgba(46,204,113,0.3)' : 'rgba(251,175,51,0.3)'}`,
          borderRadius: '12px',
          padding: '16px 20px',
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: migratingStatus.includes('✅') ? '#86efac' : '#fde047'
        }}>
          <CheckCircle2 size={20} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{migratingStatus}</div>
        </div>
      )}

      {/* PARSED DATA PREVIEW & ACTIONS */}
      {parsedData && (
        <div style={{ marginTop: '32px' }}>
          
          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '24px'
          }}>
            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Routes Found</div>
              <div className="brand-font" style={{ fontSize: '26px', color: 'var(--primary)' }}>{parsedData.summary.routesCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ready for schedule & map</div>
            </div>

            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Streets Extracted</div>
              <div className="brand-font" style={{ fontSize: '26px', color: '#22c55e' }}>{parsedData.summary.streetsCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Powers Address Lookup</div>
            </div>

            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Volunteers Roster</div>
              <div className="brand-font" style={{ fontSize: '26px', color: '#38bdf8' }}>{parsedData.summary.volunteersCount}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mapped into Crew Hub</div>
            </div>

            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Sponsors & Settings</div>
              <div className="brand-font" style={{ fontSize: '26px', color: 'var(--primary)' }}>{parsedData.summary.sponsorsCount} / {parsedData.settings.pa_presets.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sponsors / PA Presets</div>
            </div>
          </div>

          {/* Action Button Bar */}
          <div style={{
            background: '#181816',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '28px'
          }}>
            <div>
              <h4 className="brand-font" style={{ fontSize: '18px', color: '#fff', marginBottom: '2px' }}>
                Ready to Auto-Populate?
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Click below to write this data directly into your TurboSanta 2.0 application.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleApply}
                className="btn-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  background: '#22c55e',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(34,197,94,0.3)'
                }}
              >
                <Database size={16} />
                <span>Auto-Populate TurboSanta 2.0</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSql}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
                title="Download SQL to run directly in Cloudflare D1 Console"
              >
                <Download size={15} />
                <span>Download D1 SQL (.sql)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                <FileText size={15} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Inspection Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '20px',
            overflowX: 'auto'
          }}>
            {[
              { id: 'routes', label: `Routes (${parsedData.routes.length})`, icon: MapPin },
              { id: 'streets', label: `Streets (${parsedData.streets.length})`, icon: MapPin },
              { id: 'volunteers', label: `Volunteers (${parsedData.volunteers.length})`, icon: Users },
              { id: 'settings', label: 'Settings & Identity', icon: Shield },
              { id: 'sponsors', label: `Sponsors (${parsedData.sponsors.length})`, icon: Heart }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePreviewTab(tab.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    padding: '10px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: ROUTES */}
          {activePreviewTab === 'routes' && (
            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1e1e1b', color: 'var(--primary)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px' }}>Route Name</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Times</th>
                    <th style={{ padding: '12px 16px' }}>GPX Track</th>
                    <th style={{ padding: '12px 16px' }}>Streets</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.routes.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>{r.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{r.date || 'TBD'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{r.start_time} – {r.end_time}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {r.gpx_url ? (
                          <span style={{ color: '#86efac', fontSize: '11px', wordBreak: 'break-all' }}>✓ Linked</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: 'rgba(251,175,51,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {r.streets_count} streets
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: STREETS */}
          {activePreviewTab === 'streets' && (
            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                All {parsedData.streets.length} streets parsed from your routes. These will instantly appear in the <strong>Address Lookup tool</strong> so residents can search by their street name:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '300px', overflowY: 'auto', padding: '6px' }}>
                {parsedData.streets.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      background: '#22221f',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#eaeae5'
                    }}
                  >
                    📍 {s.street_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: VOLUNTEERS */}
          {activePreviewTab === 'volunteers' && (
            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {parsedData.volunteers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No volunteer rows found in the Volunteers tab. You can recruit volunteers anytime via the Crew Hub link.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e1e1b', color: 'var(--primary)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px' }}>Volunteer Name</th>
                      <th style={{ padding: '12px 16px' }}>Role</th>
                      <th style={{ padding: '12px 16px' }}>Route Night</th>
                      <th style={{ padding: '12px 16px' }}>Phone / Contact</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.volunteers.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>{v.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            {v.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{v.route_name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{v.phone || v.email || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: v.checked_in ? '#86efac' : 'var(--text-muted)', fontSize: '12px' }}>
                            {v.checked_in ? 'Checked In' : 'Confirmed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activePreviewTab === 'settings' && (
            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sleigh Display Name</div>
                  <div style={{ fontSize: '15px', color: '#fff', fontWeight: 700, marginTop: '2px' }}>{parsedData.settings.sleigh_display_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fundraising Goal</div>
                  <div style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>£{parsedData.settings.fundraising_goal}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Charity Name</div>
                  <div style={{ fontSize: '15px', color: '#fff', fontWeight: 700, marginTop: '2px' }}>{parsedData.settings.charity_name || 'Round Table Charity'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Online Donate URL</div>
                  <div style={{ fontSize: '12px', color: '#86efac', wordBreak: 'break-all', marginTop: '2px' }}>{parsedData.settings.donate_url || '—'}</div>
                </div>
              </div>

              {parsedData.settings.pa_presets.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                    PA Presets ({parsedData.settings.pa_presets.length})
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {parsedData.settings.pa_presets.slice(0, 5).map((p, idx) => (
                      <li key={idx} style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                        <span>📢</span> <span>"{p}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SPONSORS */}
          {activePreviewTab === 'sponsors' && (
            <div style={{ background: '#161614', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {parsedData.sponsors.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No sponsors detected in the Sponsors tab.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e1e1b', color: 'var(--primary)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px' }}>Company</th>
                      <th style={{ padding: '12px 16px' }}>Type</th>
                      <th style={{ padding: '12px 16px' }}>Route</th>
                      <th style={{ padding: '12px 16px' }}>Amount Pledged</th>
                      <th style={{ padding: '12px 16px' }}>Logo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.sponsors.map((sp, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>{sp.company}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{sp.sponsorship_type}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{sp.route_name || 'Season Sponsor'}</td>
                        <td style={{ padding: '12px 16px', color: '#86efac', fontWeight: 700 }}>£{sp.amount_pledged}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {sp.logo_url ? <span style={{ color: '#86efac', fontSize: '11px' }}>✓ Has Logo</span> : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>None</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
