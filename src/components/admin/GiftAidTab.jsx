import React from 'react';
import { RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { isManagedGiftAidPlatform, getManagedPlatformName } from '../../utils/adminHelpers';

export default function GiftAidTab({
  session,
  currentTableSlug,
  formData,
  setFormData,
  onUpdateTableData,
  saveTableSettings,
  setSaveStatus,
  giftAidSummary,
  giftAidLoading,
  loadGiftAidSummary,
  handleExportHmrc,
  handleMarkGiftAidClaimed
}) {
  return (
    <div style={{
      background: '#151513',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '30px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 className="brand-font" style={{ fontSize: '24px', margin: 0 }}>
              HMRC Gift Aid &amp; Charity Status
            </h2>
            <span style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: formData.enable_gift_aid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.08)',
              color: formData.enable_gift_aid ? '#86efac' : 'var(--text-muted)',
              border: formData.enable_gift_aid ? '1px solid #22c55e' : '1px solid var(--border)'
            }}>
              {formData.enable_gift_aid ? 'Active (Registered Charity)' : 'Optional / Disabled (Non-Charity Table)'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, maxWidth: '650px' }}>
            Not all Round Tables are registered charities. Gift Aid is an optional feature. If your Table is not a registered charity, leave this turned off so all Gift Aid prompts are hidden from public screens.
          </p>
        </div>

        {formData.enable_gift_aid && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadGiftAidSummary}
              className="btn-secondary"
              style={{ padding: '10px 14px' }}
            >
              <RefreshCw size={16} />
              <span>{giftAidLoading ? 'Loading...' : 'Refresh Ledger'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportHmrc('All')}
              className="btn-primary"
              style={{ padding: '10px 20px' }}
            >
              <Download size={18} />
              <span>Export HMRC R68 CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* CHARITY TOGGLE & CONFIGURATION CARD */}
      <div style={{
        background: '#0d0d0b',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <strong style={{ fontSize: '16px', color: '#fff', display: 'block', marginBottom: '4px' }}>
              Enable Gift Aid Claims for {session?.tableName || 'Your Table'}
            </strong>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Only activate if your Table operates an HMRC-registered charity or charitable trust.
            </span>
          </div>

          <button
            type="button"
            onClick={async () => {
              const nextVal = !formData.enable_gift_aid;
              setFormData(prev => ({ ...prev, enable_gift_aid: nextVal }));
              if (onUpdateTableData) {
                onUpdateTableData(prev => ({
                  ...prev,
                  table: { ...prev.table, enable_gift_aid: nextVal }
                }));
              }
              const tableSlug = currentTableSlug || session?.tableSlug || session?.tableId || 'beverley';
              setSaveStatus('Updating Gift Aid status in database...');
              const res = await saveTableSettings(tableSlug, {
                enable_gift_aid: nextVal,
                charity_name: formData.charity_name,
                charity_number: formData.charity_number,
                collection_permit: formData.collection_permit || null
              });
              if (res && res.ok) {
                setSaveStatus(`Gift Aid ${nextVal ? 'Enabled' : 'Disabled'} in database!`);
              } else {
                setSaveStatus(`Gift Aid ${nextVal ? 'Enabled' : 'Disabled'} locally.`);
              }
              setTimeout(() => setSaveStatus(''), 2500);
            }}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              background: formData.enable_gift_aid ? '#d31c1c' : '#22c55e',
              color: formData.enable_gift_aid ? '#fff' : '#000'
            }}
          >
            {formData.enable_gift_aid ? 'Disable Gift Aid' : 'Enable Gift Aid (+25%)'}
          </button>
        </div>

        {formData.enable_gift_aid && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Registered Charity Name
              </label>
              <input
                type="text"
                value={formData.charity_name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, charity_name: val }));
                }}
                placeholder="e.g. Beverley Round Table Community Fund"
                style={{
                  width: '100%',
                  background: '#151513',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Charity Commission Number / HMRC Reference
              </label>
              <input
                type="text"
                value={formData.charity_number || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, charity_number: val }));
                }}
                placeholder="e.g. 1198234 or XA12345"
                style={{
                  width: '100%',
                  background: '#151513',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Street Collection Permit / Council Licence No.
              </label>
              <input
                type="text"
                value={formData.collection_permit || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, collection_permit: val }));
                }}
                placeholder="e.g. CP/2026/049 or Borough Lic. #1234"
                style={{
                  width: '100%',
                  background: '#151513',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

        {formData.enable_gift_aid && isManagedGiftAidPlatform(formData.donate_url || formData.justgiving_url) && (
          <div style={{
            marginTop: '16px',
            padding: '14px 16px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>🛡️</span>
            <div>
              <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                Automatic Duplicate Prevention Active ({getManagedPlatformName(formData.donate_url || formData.justgiving_url)})
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
                Your online donation link uses <strong>{getManagedPlatformName(formData.donate_url || formData.justgiving_url)}</strong>, which automatically claims Gift Aid directly from HMRC on online gifts.
                <br />
                TurboSanta automatically forwards online donors straight to your payment page without an extra declaration, ensuring <strong>no duplicate HMRC claims</strong>. Any Gift Aid declarations captured in TurboSanta (via <code>/giftaid</code> QR codes or links) and the HMRC R68 CSV export are reserved exclusively for <strong>cash and street collection donations</strong>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* D1 SQL DATABASE STORAGE STATUS */}
      <div style={{
        background: '#0d0d0b',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
          <strong style={{ color: '#fff', fontSize: '15px' }}>D1 SQL Database Audit: <code>gift_aid</code> Table</strong>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
          When donors submit Gift Aid declarations, the row is recorded in Cloudflare D1 with donor title, full name, house number, postcode, donation amount, date, and status (<code>Pending</code>).
        </p>
        <div style={{
          background: '#151513',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '14px 18px',
          fontSize: '13px',
          color: '#86efac',
          fontFamily: 'monospace'
        }}>
          ✓ HMRC R68 Columns: Title | First Name | Last Name | House No | Postcode | Date | Amount
        </div>

        {/* Live Cloudflare D1 HMRC Gift Aid Ledger */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginTop: '18px', marginBottom: '18px' }}>
          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Declarations in D1</div>
            <div className="brand-font" style={{ fontSize: '24px', color: '#fff' }}>{giftAidSummary.declarations}</div>
          </div>
          <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Eligible Donations</div>
            <div className="brand-font" style={{ fontSize: '24px', color: 'var(--primary)' }}>£{Number(giftAidSummary.totalDonations || 0).toFixed(2)}</div>
          </div>
          <div style={{ background: '#151513', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#86efac', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>HMRC 25% Reclaim</div>
            <div className="brand-font" style={{ fontSize: '24px', color: '#22c55e' }}>+£{Number(giftAidSummary.totalGiftAid || 0).toFixed(2)}</div>
          </div>
        </div>

        {giftAidSummary.entries.length > 0 ? (
          <div style={{
            marginTop: '12px',
            background: '#151513',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '10px',
            padding: '16px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <strong style={{ color: '#fff', fontSize: '14px' }}>
                Live Gift Aid Declarations ({giftAidSummary.entries.length})
              </strong>
              {giftAidSummary.entries.some(e => (e.status || 'Pending') === 'Pending') && (
                <button
                  type="button"
                  onClick={() => handleMarkGiftAidClaimed(null)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#22c55e', color: '#86efac' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Mark All Pending as Claimed</span>
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#fff', textAlign: 'left', minWidth: '580px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Donor Name</th>
                    <th style={{ padding: '8px 10px' }}>House &amp; Postcode</th>
                    <th style={{ padding: '8px 10px' }}>Donation</th>
                    <th style={{ padding: '8px 10px' }}>Gift Aid (+25%)</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {giftAidSummary.entries.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{entry.date || '—'}</td>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{entry.name || 'Donor'}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                        {[entry.house_name_or_number, entry.postcode].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700 }}>£{Number(entry.amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px', color: '#86efac', fontWeight: 700 }}>+£{Number(entry.giftAid || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          background: entry.status === 'Claimed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 175, 51, 0.15)',
                          color: entry.status === 'Claimed' ? '#86efac' : 'var(--primary)',
                          border: entry.status === 'Claimed' ? '1px solid #22c55e' : '1px solid rgba(251, 175, 51, 0.4)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {entry.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: '18px',
            background: '#151513',
            border: '1px dashed rgba(251, 175, 51, 0.35)',
            borderRadius: '10px',
            padding: '16px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  ✨ Sample HMRC Record (Preview Only — Zero Reclaims Filed)
                </span>
                <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 600 }}>
                  Template Layout
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Visualizing HMRC R68 export columns
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#fff', textAlign: 'left', minWidth: '550px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>Title</th>
                    <th style={{ padding: '8px 10px' }}>Donor Name</th>
                    <th style={{ padding: '8px 10px' }}>House &amp; Postcode</th>
                    <th style={{ padding: '8px 10px' }}>Donation</th>
                    <th style={{ padding: '8px 10px' }}>Gift Aid (+25%)</th>
                    <th style={{ padding: '8px 10px' }}>HMRC Taxpayer Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '10px', color: 'var(--primary)', fontWeight: 700 }}>Mr</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>John Smith</td>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>14 Molescroft Road, HU17 8PP</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>£10.00</td>
                    <td style={{ padding: '10px', color: '#86efac', fontWeight: 700 }}>+£2.50</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid #22c55e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                        Eligible UK Taxpayer
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              💡 Note: When donors submit Gift Aid declarations via your public turnkey site or Gift Aid form, live rows appear here automatically and export directly via the HMRC R68 CSV button above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
