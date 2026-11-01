import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, Share2, MessageCircle, Newspaper, RefreshCw } from 'lucide-react';
import { getAdminAuthToken } from '../services/auth';

function generateClientFallbackPosts({ route, tableData, currentTableSlug }) {
  const table = tableData?.table || {};
  const town = (table.sleigh_display_name || table.name || currentTableSlug || 'Round Table').replace(/round table/gi, '').replace(/santa sleigh/gi, '').trim();
  const sleighName = table.sleigh_display_name || table.name || `${town} Round Table Santa Sleigh`;
  const routeName = route?.name || "Tonight's Sleigh Route";
  const dateStr = route?.date || new Date().toISOString().split('T')[0];
  const raisedNum = parseFloat(String(route?.cash_raised !== undefined ? route.cash_raised : (tableData?.total_raised || '0')).replace(/[^0-9.]/g, '')) || 0;
  const totalNum = parseFloat(String(tableData?.total_raised || tableData?.donations?.total || '0').replace(/[^0-9.]/g, '')) || 0;

  const routeStreets = (Array.isArray(route?.streets) && route.streets.length > 0)
    ? route.streets
    : (tableData?.streets || []).filter(s => String(s.route_id) === String(route?.id));
  const streetsStr = routeStreets.map(s => typeof s === 'string' ? s : (s.street_name || s.name || '')).filter(Boolean).join(', ');

  const grants = Array.isArray(tableData?.grants) ? tableData.grants : [];
  const charityNames = grants.map(g => g.org_name || g.organisation_name || g.name).filter(Boolean);
  const charityText = charityNames.length > 0
    ? charityNames.slice(0, 3).join(', ')
    : (table.charity_name || 'local community causes and foodbanks');

  const sponsor = route?.sponsor_name || table.headline_sponsor_name || '';
  const donateUrl = table.donate_url || (typeof window !== 'undefined' ? window.location.origin : '');
  const cleanTown = (town || 'Local').replace(/[^a-zA-Z0-9]/g, '');

  const raisedStr = raisedNum > 0
    ? `🪙 Tonight's Collections: Thanks to your amazing generosity, tonight we collected £${raisedNum.toLocaleString('en-GB', { minimumFractionDigits: (raisedNum % 1 !== 0 ? 2 : 0), maximumFractionDigits: 2 })} in bucket and card donations!`
    : `🪙 Every single penny dropped into our buckets and donated online stays 100% local.`;
  const totalStr = (totalNum > 0 && totalNum > raisedNum)
    ? ` That brings our season running total to £${totalNum.toLocaleString('en-GB', { minimumFractionDigits: (raisedNum % 1 !== 0 ? 2 : 0), maximumFractionDigits: 2 })}! ❤️`
    : '';

  const facebook_instagram = `🎅✨ WHAT A MAGICAL NIGHT! ✨🛷

Tonight, Santa and our volunteer elves toured ${routeName}${dateStr ? ` (${dateStr})` : ''}! 🌟

A massive, heartfelt THANK YOU to every family, child, and resident who came to their doors and windows, braved the cold, cheered Santa on, and donated! You made tonight truly unforgettable.
${streetsStr ? `\n📍 Streets & Stops Visited:\n${streetsStr}\n` : ''}
${raisedStr}${totalStr}
${charityText ? `\n❤️ Where Your Donations Go:\nAll funds raised directly support ${charityText} across our local community.\n` : ''}
${sponsor ? `\n🤝 Route Sponsor Shout-Out:\nSpecial thanks to ${sponsor} for their generous support of tonight's sleigh!\n` : ''}
👏 A huge shoutout to our volunteer marshals, collectors, and sleigh drivers who braved the evening chill to keep Santa moving safely and bring smiles to everyone.

📍 Live Sleigh Tracker & Online Donations:
👉 ${donateUrl}

#RoundTable #SantaSleigh #${cleanTown}RoundTable #CommunitySpirit #LocalCauses #DoMore #Christmas2026`;

  const whatsapp_crew = `🎅🛷 *TEAM SANTA WRAP-UP — ${routeName.toUpperCase()}* 🎄

Huge thank you to everyone who stepped up to marshal, collect, and drive tonight! 👏✨

${streetsStr ? `📍 *Streets covered:* ${streetsStr}\n` : ''}${raisedNum > 0 ? `🪙 *Tonight's bucket & contactless total:* £${raisedNum.toLocaleString('en-GB', { minimumFractionDigits: (raisedNum % 1 !== 0 ? 2 : 0), maximumFractionDigits: 2 })}!\n` : ''}${totalNum > 0 && totalNum > raisedNum ? `🌟 *Season running total:* £${totalNum.toLocaleString('en-GB', { minimumFractionDigits: (raisedNum % 1 !== 0 ? 2 : 0), maximumFractionDigits: 2 })}!\n` : ''}
You kept the children safe, kept the carols playing, and brought huge smiles to so many families across ${town}. Get home safe, warm up, and thank you for being amazing volunteers! 💪🔥`;

  const pressSnippetStreets = streetsStr ? streetsStr.split(',').slice(0, 5).join(', ') : town;
  const press_snippet = `The ${sleighName} completed another successful festive community tour on ${routeName}, visiting families across ${pressSnippetStreets}. Generous local residents contributed ${raisedNum > 0 ? `£${raisedNum.toLocaleString('en-GB', { minimumFractionDigits: (raisedNum % 1 !== 0 ? 2 : 0), maximumFractionDigits: 2 })}` : 'vital funds'} to the volunteer collectors, with all proceeds directly benefiting ${charityText}. Full route schedules, live GPS tracking, and online donation options are available at ${donateUrl}.`;

  return { facebook_instagram, whatsapp_crew, press_snippet };
}



export default function SocialPostModal({
  isOpen,
  onClose,
  route = null,
  tableData = {},
  currentTableSlug = 'beverley',
  session = null
}) {
  const [activeTab, setActiveTab] = useState('facebook'); // 'facebook' | 'whatsapp' | 'press'
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState({
    facebook_instagram: '',
    whatsapp_crew: '',
    press_snippet: ''
  });
  const [copiedKey, setCopiedKey] = useState('');
  const [error, setError] = useState('');

  const table = tableData?.table || {};
  const tableName = table.sleigh_display_name || table.name || 'Round Table Santa Sleigh';

  const generatePosts = async () => {
    setLoading(true);
    setError('');
    const tableSlug = currentTableSlug || session?.tableId || session?.tableSlug || 'beverley';
    const token = session?.googleCredential || session?.token || getAdminAuthToken(tableSlug);

    const routeStreets = (Array.isArray(route?.streets) && route.streets.length > 0)
      ? route.streets
      : (tableData?.streets || []).filter(s => String(s.route_id) === String(route?.id));
    const streetNames = routeStreets
      .map(s => (typeof s === 'string' ? s : (s.street_name || s.name || '')))
      .filter(Boolean)
      .join(', ');

    const payload = {
      secret: token,
      routeId: route?.id,
      routeName: route?.name || "Tonight's Sleigh Tour",
      date: route?.date || new Date().toISOString().split('T')[0],
      raised: route?.cash_raised !== undefined ? route.cash_raised : (tableData?.total_raised || tableData?.donations?.total || '0'),
      totalRaised: tableData?.total_raised || tableData?.donations?.total || '0',
      distance: route?.distance_km ? `${route.distance_km} km` : '',
      streets: streetNames,
      sponsor: route?.sponsor_name || table?.headline_sponsor_name || '',
      sponsors: route?.sponsor_name || table?.headline_sponsor_name || '',
      donateUrl: table?.donate_url || ''
    };

    try {
      const res = await fetch(`https://turbosanta-api.beverley247.workers.dev/api/ai/social-post?table=${encodeURIComponent(tableSlug)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok && data.posts && (data.posts.facebook_instagram || data.posts.whatsapp_crew)) {
        setPosts({
          facebook_instagram: data.posts.facebook_instagram || '',
          whatsapp_crew: data.posts.whatsapp_crew || '',
          press_snippet: data.posts.press_snippet || ''
        });
      } else {
        // Smoothly fall back to client template generator
        const fallback = generateClientFallbackPosts({ route, tableData, currentTableSlug });
        setPosts(fallback);
      }
    } catch (err) {
      // Smoothly fall back to client template generator on network failure
      const fallback = generateClientFallbackPosts({ route, tableData, currentTableSlug });
      setPosts(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generatePosts();
    }
  }, [isOpen, route?.id]);

  if (!isOpen) return null;

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  const currentText = activeTab === 'facebook'
    ? posts.facebook_instagram
    : activeTab === 'whatsapp'
      ? posts.whatsapp_crew
      : posts.press_snippet;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#151513',
        border: '1px solid var(--border-gold)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(251,175,51,0.12) 0%, rgba(21,21,19,0.95) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(251,175,51,0.2)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Share2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: 800 }}>
                AI Social & PR Generator
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {route?.name || tableName} • Instant Round Table community copy
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
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: '#0d0d0b',
          padding: '0 16px'
        }}>
          {[
            { id: 'facebook', label: '📘 Facebook & Instagram', icon: Share2 },
            { id: 'whatsapp', label: '💬 WhatsApp Volunteer Crew', icon: MessageCircle },
            { id: 'press', label: '📰 Local Press Snippet', icon: Newspaper }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Sparkles size={36} color="var(--primary)" style={{ animation: 'spin 2s linear infinite', margin: '0 auto 14px', display: 'block' }} />
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                Gemini is crafting community copy...
              </div>
              <div style={{ fontSize: '13px' }}>
                Analyzing tonight's route stats, streets, volunteers, and sponsor shout-outs.
              </div>
            </div>
          ) : error ? (
            <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', color: '#fca5a5' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Failed to generate copy:</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>{error}</p>
              <button
                type="button"
                onClick={generatePosts}
                style={{ marginTop: '12px', padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Feel free to edit before copying:
                </span>
                <button
                  type="button"
                  onClick={generatePosts}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--primary)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={12} />
                  <span>Regenerate with Gemini</span>
                </button>
              </div>

              <textarea
                rows={12}
                value={currentText}
                onChange={(e) => {
                  const val = e.target.value;
                  setPosts(prev => ({
                    ...prev,
                    [activeTab === 'facebook' ? 'facebook_instagram' : activeTab === 'whatsapp' ? 'whatsapp_crew' : 'press_snippet']: val
                  }));
                }}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: '#0d0d0b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Close
          </button>

          <button
            type="button"
            disabled={loading || !currentText}
            onClick={() => copyText(activeTab, currentText)}
            className="btn-primary"
            style={{
              padding: '10px 22px',
              fontSize: '13px',
              background: copiedKey === activeTab ? '#16a34a' : 'var(--primary)',
              color: '#000',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {copiedKey === activeTab ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedKey === activeTab ? 'Copied to Clipboard! ✨' : `Copy ${activeTab === 'facebook' ? 'Post' : activeTab === 'whatsapp' ? 'WhatsApp' : 'Press Snippet'}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}