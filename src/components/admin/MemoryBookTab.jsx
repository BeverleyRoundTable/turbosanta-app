import React from 'react';
import {
  Camera, Video, Image as ImageIcon, FolderDown, ExternalLink,
  HardDrive, AlertTriangle, Trash2, Filter, Sparkles, CheckCircle2, Download
} from 'lucide-react';

export default function MemoryBookTab({
  session,
  currentTableSlug,
  tableData,
  selectedSeason,
  setSelectedSeason,
  storageQuota,
  memoryItems,
  memoryModerationFilter,
  setMemoryModerationFilter,
  handleBatchDownloadSeason,
  handleDownloadAllHistoricalMedia,
  handlePurgeYearMedia,
  handleModerateMemory,
  handleDeleteMemory,
  handleDownloadMedia
}) {
  const availableMediaSeasons = ['2026'];
  if (Array.isArray(tableData?.season_history)) {
    tableData.season_history.forEach(h => {
      if (h.year && !availableMediaSeasons.includes(String(h.year))) {
        availableMediaSeasons.push(String(h.year));
      }
    });
  }
  availableMediaSeasons.sort((a, b) => Number(b) - Number(a));

  const seasonItems = memoryItems.filter(m => m.year === selectedSeason);
  const pendingCount = seasonItems.filter(m => m.status === 'pending').length;
  const approvedCount = seasonItems.filter(m => m.status === 'approved').length;
  const hiddenCount = seasonItems.filter(m => m.status === 'hidden' || m.status === 'rejected').length;

  const displayItems = seasonItems.filter(m => {
    if (memoryModerationFilter === 'pending') return m.status === 'pending';
    if (memoryModerationFilter === 'approved') return m.status === 'approved';
    if (memoryModerationFilter === 'hidden') return m.status === 'hidden' || m.status === 'rejected';
    return true;
  });

  return (
    <div>
      <div style={{
        background: '#151513',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: 'clamp(16px, 4vw, 30px)',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h2 className="brand-font" style={{ fontSize: 'clamp(20px, 4vw, 24px)', margin: '0 0 6px 0', color: '#fff', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              Community Polaroids & Social Media Vault
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, overflowWrap: 'break-word' }}>
              Download community photos and video clips for your Instagram, Facebook, and press releases.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '500px' }}>
            <button
              onClick={handleBatchDownloadSeason}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '13px', flex: '1 1 200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <FolderDown size={16} />
              <span>Download All {selectedSeason} Media (Batch)</span>
            </button>

            <a
              href={`https://${encodeURIComponent(currentTableSlug)}.roundtablesantasleigh.co.uk/memory-book`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '10px 18px', fontSize: '13px', textDecoration: 'none', flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center' }}
            >
              <ExternalLink size={15} />
              <span>View Public Gallery</span>
            </a>
          </div>
        </div>

        {/* CLOUDFLARE R2 BUCKET STORAGE CAPACITY & ARCHIVE QUOTA METER */}
        <div style={{
          background: storageQuota.percent >= 85 ? 'rgba(239, 68, 68, 0.08)' : (storageQuota.percent >= 70 ? 'rgba(245, 158, 11, 0.08)' : '#0d0d0b'),
          border: storageQuota.percent >= 85 ? '1px solid rgba(239, 68, 68, 0.4)' : (storageQuota.percent >= 70 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)'),
          borderRadius: '14px',
          padding: '18px 22px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: storageQuota.percent >= 85 ? 'rgba(239, 68, 68, 0.2)' : (storageQuota.percent >= 70 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(251, 175, 51, 0.15)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <HardDrive size={18} color={storageQuota.percent >= 85 ? '#ef4444' : (storageQuota.percent >= 70 ? '#f59e0b' : 'var(--primary)')} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '15px', color: '#fff', letterSpacing: '0.5px' }}>
                    Cloudflare R2 Bucket Storage Capacity
                  </strong>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                    background: storageQuota.percent >= 85 ? 'rgba(239, 68, 68, 0.2)' : (storageQuota.percent >= 70 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.15)'),
                    color: storageQuota.percent >= 85 ? '#ef4444' : (storageQuota.percent >= 70 ? '#f59e0b' : '#22c55e'),
                    border: `1px solid ${storageQuota.percent >= 85 ? 'rgba(239, 68, 68, 0.4)' : (storageQuota.percent >= 70 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(34, 197, 94, 0.3)')}`
                  }}>
                    {storageQuota.percent >= 85 ? 'High Storage Alert' : (storageQuota.percent >= 70 ? 'Approaching Limit' : 'Safe Tier Active ($0 Cost)')}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Shared storage across all Round Table sleighs. Limit: 10,000 files before Cloudflare storage fees apply.
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: storageQuota.percent >= 85 ? '#ef4444' : (storageQuota.percent >= 70 ? '#f59e0b' : '#fff'), fontFamily: 'var(--font-mono)' }}>
                {storageQuota.count.toLocaleString()} / 10,000 <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({storageQuota.percent}%)</span>
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
            <div style={{
              width: `${Math.min(100, Math.max(1, storageQuota.percent))}%`,
              height: '100%',
              background: storageQuota.percent >= 85 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : (storageQuota.percent >= 70 ? 'linear-gradient(90deg, #22c55e, #f59e0b)' : 'linear-gradient(90deg, #22c55e, #3b82f6)'),
              borderRadius: '4px',
              transition: 'width 0.5s ease-out'
            }} />
          </div>

          {storageQuota.percent >= 70 ? (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: storageQuota.percent >= 85 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: storageQuota.percent >= 85 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '12px'
            }}>
              <AlertTriangle size={18} color={storageQuota.percent >= 85 ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#fff', lineHeight: 1.5 }}>
                <strong>Safe Storage Limit Warning:</strong> You have reached {storageQuota.percent}% of the 10,000 image bucket limit!
                Please download your season media archive to keep your photos safely preserved on your local PC or Google Drive, then purge older seasons to maintain $0 storage costs.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💡</span>
              <span><strong>Storage Reminder:</strong> Download all media at the end of each Christmas season so older media can be safely cleared to keep storage completely free.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleDownloadAllHistoricalMedia}
              style={{
                background: '#1e1e1b', border: '1px solid var(--border)', color: '#fff',
                borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
              }}
            >
              <FolderDown size={14} />
              <span>Download Full Vault Archive ({memoryItems.length} Files)</span>
            </button>

            {selectedSeason !== '2026' && (
              <button
                onClick={() => handlePurgeYearMedia(selectedSeason)}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444',
                  borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
                <span>Purge {selectedSeason} Media to Free Space</span>
              </button>
            )}
          </div>
        </div>

        {/* Season / Year Time Machine Selector */}
        <div style={{
          background: '#0d0d0b',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxSizing: 'border-box',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} />
              Active Christmas Season:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {availableMediaSeasons.map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedSeason(yr)}
                  style={{
                    background: selectedSeason === yr ? 'var(--primary)' : '#1e1e1b',
                    color: selectedSeason === yr ? '#000' : '#fff',
                    border: selectedSeason === yr ? 'none' : '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {yr === '2026' ? '⭐ 2026 (Current)' : `📅 ${yr} Season`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#86efac', fontWeight: 600 }}>
            ✓ Photos & videos are isolated by season.
          </div>
        </div>
      </div>

      {/* Architecture Explainer Pill */}
      <div style={{
        background: 'rgba(251, 175, 51, 0.08)',
        border: '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '14px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        fontSize: '13px',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        boxSizing: 'border-box',
        maxWidth: '100%'
      }}>
        <div style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={16} />
        </div>
        <div>
          <strong style={{ color: '#fff' }}>Modern Storage Architecture:</strong> Structured submission records (dates, captions, GPS routes, approval) are indexed in your Table&apos;s <strong>Cloudflare D1 SQL database</strong>. Large binary photos and MP4 videos are served via high-speed <strong>Cloudflare Object Storage (R2 / CDN)</strong>, eliminating Google Drive dependencies and speed bottlenecks.
        </div>
      </div>

      {/* Moderation Status Bar */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {[
          { id: 'all', label: `All Media (${seasonItems.length})` },
          { id: 'pending', label: `⚠️ Needs Screening (${pendingCount})`, highlight: pendingCount > 0 },
          { id: 'approved', label: `✅ Live in Memory Book (${approvedCount})` },
          { id: 'hidden', label: `🚫 Hidden / Rejected (${hiddenCount})` }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setMemoryModerationFilter(f.id)}
            style={{
              background: memoryModerationFilter === f.id
                ? (f.highlight ? '#d97706' : 'var(--primary)')
                : (f.highlight ? 'rgba(245, 158, 11, 0.15)' : '#1e1e1b'),
              color: memoryModerationFilter === f.id ? '#000' : (f.highlight ? '#fbbf24' : '#fff'),
              border: f.highlight ? '1px solid #f59e0b' : '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid of Season Media */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {displayItems.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '36px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <Camera size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 className="brand-font" style={{ fontSize: '18px', color: '#fff', marginBottom: '6px' }}>
              No {memoryModerationFilter !== 'all' ? memoryModerationFilter : ''} Submissions for {selectedSeason}
            </h3>
            <p style={{ fontSize: '13px', maxWidth: '460px', margin: '0 auto 24px' }}>
              When families upload photos or videos via the public tracker, they will appear in the screening queue for admin approval before going live.
            </p>

            <div style={{
              maxWidth: '480px',
              margin: '0 auto',
              textAlign: 'left',
              background: '#0d0d0b',
              border: '1px dashed rgba(251, 175, 51, 0.35)',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{
                  background: 'rgba(251, 175, 51, 0.15)',
                  color: 'var(--primary)',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  ✨ Sample Submission Preview (Not Public)
                </span>
                <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 600 }}>
                  Screening Layout
                </span>
              </div>

              <div style={{
                background: '#151513',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '140px',
                  background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--primary)'
                }}>
                  <Sparkles size={28} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    [Family Photo Uploaded via Public Tracker]
                  </span>
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ color: '#fff', fontSize: '14px' }}>The Davies Family</strong>
                    <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      Pending Screening
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#e5e7eb', fontStyle: 'italic', lineHeight: 1.4 }}>
                    &quot;The kids loved waving to Santa on Woodhall Way! Rudolph&apos;s glowing nose was amazing. Thank you Round Table! 🌟&quot;
                  </p>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span>📍 Molescroft &amp; Woodhall Way</span>
                    <span>Dec 14 • 18:35</span>
                  </div>
                </div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                🔒 Zero mock photos exist in Cloudflare R2. Only approved community uploads are visible in your public Memory Book.
              </p>
            </div>
          </div>
        ) : (
          displayItems.map(item => (
            <div
              key={item.id}
              style={{
                background: '#151513',
                border: item.status === 'pending' ? '1px solid #f59e0b' : '1px solid var(--border)',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: item.status === 'pending' ? '0 8px 24px rgba(245, 158, 11, 0.2)' : '0 8px 24px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '200px', background: '#000' }}>
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    poster={item.poster}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.caption}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                    title="Click to view full size image in new tab"
                    onClick={() => window.open(item.url, '_blank')}
                  />
                )}

                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: item.type === 'video' ? '#ef4444' : '#3b82f6',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {item.type === 'video' ? <Video size={12} /> : <ImageIcon size={12} />}
                  <span>{item.type}</span>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  background: item.status === 'pending'
                    ? 'rgba(217, 119, 6, 0.95)'
                    : item.status === 'approved'
                    ? 'rgba(22, 163, 74, 0.9)'
                    : 'rgba(220, 38, 38, 0.9)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  letterSpacing: '1px'
                }}>
                  {item.status === 'pending' ? '⚠️ PENDING REVIEW (HIDDEN FROM PUBLIC)' : item.status === 'approved' ? '✅ LIVE IN PUBLIC GALLERY' : '🚫 HIDDEN'}
                </div>
              </div>

              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    📍 {item.route} • {item.time}
                  </div>
                  <p style={{ fontSize: '14px', color: '#fff', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    &quot;{item.caption}&quot;
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Submitted by: <strong>{item.author}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {item.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleModerateMemory(item.id, 'approved')}
                        style={{
                          flex: 1,
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>Approve &amp; Publish</span>
                      </button>
                      <button
                        onClick={() => handleDeleteMemory(item.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid #ef4444',
                          color: '#fca5a5',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const ext = item.type === 'video' ? 'mp4' : 'jpg';
                          const name = `${session?.tableId || currentTableSlug || 'table'}_santa_${item.year}_${item.id}.${ext}`;
                          handleDownloadMedia(item.url, name);
                        }}
                        className="btn-primary"
                        style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleModerateMemory(item.id, item.status === 'approved' ? 'hidden' : 'approved')}
                        style={{
                          background: item.status === 'approved' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          border: item.status === 'approved' ? '1px solid #ef4444' : '1px solid #22c55e',
                          color: item.status === 'approved' ? '#fca5a5' : '#86efac',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {item.status === 'approved' ? 'Hide' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDeleteMemory(item.id)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        title="Delete permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
