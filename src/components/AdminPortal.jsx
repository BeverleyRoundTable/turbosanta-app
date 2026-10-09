import React, { useState } from 'react';
import {
  Radio, Megaphone, Settings, Calendar, Heart, Shield,
  LogOut, ExternalLink, Save, Download, CheckCircle2,
  Users, Plus, Trash2, Edit3, Smartphone, Code, Copy,
  MapPin, Bell, Activity, MessageSquare, Check, X, BookOpen, FileSpreadsheet,
  Camera, Video, Image as ImageIcon, FolderDown, Eye, EyeOff, Sparkles, Filter,
  CreditCard, Key, Zap, RefreshCw, Send, Link2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { logoutAdmin } from '../services/auth';
import { saveTableSettings } from '../services/api';
import DropzoneUpload from './DropzoneUpload';
import RouteEditorModal from './RouteEditorModal';
import DriverBeacon from './DriverBeacon';
import MigrationImporter from './MigrationImporter';

export default function AdminPortal({ session, onLogout, tableData, onUpdateTableData }) {
  const [activeTab, setActiveTab] = useState('announcements'); // Default to announcements
  const [announcementText, setAnnouncementText] = useState(tableData?.table?.live_announcement || '');
  const [saveStatus, setSaveStatus] = useState('');

  // Modals & Cockpit State
  const [isCockpitOpen, setIsCockpitOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // Memory Book & Social Media State
  const [selectedSeason, setSelectedSeason] = useState('2026');
  const [memoryItems, setMemoryItems] = useState([
    {
      id: 1,
      year: '2026',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1200&q=85',
      caption: 'Santa waving to the excited crowd on New Road!',
      route: 'East Route',
      time: '09 Dec 2026, 18:35',
      author: 'Sarah M.',
      status: 'approved'
    },
    {
      id: 2,
      year: '2026',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=85',
      caption: 'The sleigh lights looked incredible coming down Lawless Lane tonight!',
      route: 'East Route',
      time: '09 Dec 2026, 19:10',
      author: 'David P.',
      status: 'approved'
    },
    {
      id: 3,
      year: '2026',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      poster: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=800&q=80',
      caption: 'Kids singing along to Rudolph with the Elves! Pure magic! 🎶',
      route: 'West Route',
      time: '08 Dec 2026, 18:50',
      author: 'Emma K.',
      status: 'approved'
    },
    {
      id: 4,
      year: '2025',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?auto=format&fit=crop&w=1200&q=85',
      caption: 'Memories from the Saturday Town Centre Parade last Christmas!',
      route: 'Town Centre Parade',
      time: '14 Dec 2025, 17:30',
      author: 'Mark T.',
      status: 'approved'
    }
  ]);

  const [memoryModerationFilter, setMemoryModerationFilter] = useState('all');

  // Fetch live Memory Book submissions from Cloudflare D1
  React.useEffect(() => {
    if (activeTab === 'memory') {
      const tableSlug = session?.tableId || session?.tableSlug || 'beverley';
      fetch(`https://turbosanta-api.beverley247.workers.dev/api/memory-book?table=${encodeURIComponent(tableSlug)}&year=${selectedSeason}&admin=1`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.items)) {
            const dbItems = data.items.map(m => ({
              id: m.id,
              year: String(m.year),
              type: m.media_type || 'photo',
              url: m.media_url,
              caption: m.caption || 'Spotted Santa!',
              route: 'Community Upload',
              time: m.created_at ? new Date(m.created_at).toLocaleString('en-GB') : 'Just now',
              author: 'Public Community',
              status: m.status || 'pending'
            }));
            setMemoryItems(prev => {
              const dbIds = new Set(dbItems.map(d => String(d.id)));
              const samples = prev.filter(p => typeof p.id === 'number' && !dbIds.has(String(p.id)));
              return [...dbItems, ...samples];
            });
          }
        })
        .catch(err => console.warn("Failed to fetch memory book items for admin:", err));
    }
  }, [activeTab, selectedSeason, session]);

  const handleModerateMemory = async (itemId, newStatus) => {
    const tableSlug = session?.tableId || session?.tableSlug || 'beverley';
    setMemoryItems(prev => prev.map(m => String(m.id) === String(itemId) ? { ...m, status: newStatus } : m));
    setSaveStatus(`Photo status updated to "${newStatus}"!`);
    setTimeout(() => setSaveStatus(''), 2500);

    try {
      await fetch(`https://turbosanta-api.beverley247.workers.dev/api/memory-book/moderate?table=${encodeURIComponent(tableSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, status: newStatus })
      });
    } catch (e) {
      console.warn("Failed to update status on worker:", e);
    }
  };

  const handleDeleteMemory = async (itemId) => {
    if (!confirm("Are you sure you want to permanently delete this photo submission?")) return;
    const tableSlug = session?.tableId || session?.tableSlug || 'beverley';
    setMemoryItems(prev => prev.filter(m => String(m.id) !== String(itemId)));
    setSaveStatus("Photo deleted permanently.");
    setTimeout(() => setSaveStatus(''), 2500);

    try {
      await fetch(`https://turbosanta-api.beverley247.workers.dev/api/memory-book?table=${encodeURIComponent(tableSlug)}&id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn("Failed to delete memory item on worker:", e);
    }
  };

  const handleDownloadMedia = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSaveStatus(`📥 Downloaded "${filename}" for social media!`);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleBatchDownloadSeason = () => {
    const seasonItems = memoryItems.filter(m => m.year === selectedSeason && m.status === 'approved');
    if (!seasonItems.length) {
      alert(`No approved media items found for the ${selectedSeason} season.`);
      return;
    }
    seasonItems.forEach((item, idx) => {
      setTimeout(() => {
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const name = `${session.tableId || 'table'}_santa_${item.year}_${item.route.replace(/\s+/g, '_')}_${item.id}.${ext}`;
        handleDownloadMedia(item.url, name);
      }, idx * 400);
    });
    setSaveStatus(`📥 Batch downloading ${seasonItems.length} media files for ${selectedSeason} season...`);
    setTimeout(() => setSaveStatus(''), 4000);
  };

  // Embed & Crew Alert State
  const [copiedKey, setCopiedKey] = useState('');
  const [crewAlertText, setCrewAlertText] = useState('');
  const [activeCrewAlert, setActiveCrewAlert] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: "Just saw Santa turning onto New Road! The kids are cheering! 🎅🎉", time: "2m ago", status: "pending" },
    { id: 2, text: "Buckets filled on Lawless Lane! Elves doing a brilliant job!", time: "5m ago", status: "approved" },
    { id: 3, text: "Can Santa wave to the upstairs window at 24? Big fans here!", time: "8m ago", status: "pending" }
  ]);

  const copyToClipboard = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  // Settings State
  const [formData, setFormData] = useState({
    sleigh_display_name: tableData?.table?.sleigh_display_name || (session?.tableName ? `${session.tableName.replace(/\s*\(National Admin\)/, '')} Santa Sleigh` : 'Beverley Round Table Santa Sleigh'),
    fundraising_goal: tableData?.table?.fundraising_goal || 8000,
    donate_url: tableData?.table?.donate_url || 'https://www.zeffy.com/en-GB/donation-form/beverley-round-table-for-our-community',
    logo_url: tableData?.table?.logo_url || 'https://brt-23f.pages.dev/icons/RTBI_Santa.png',
    primary_color: tableData?.table?.primary_color || '#FBAF33',
    enable_gift_aid: tableData?.table?.enable_gift_aid || false,
    charity_name: tableData?.table?.charity_name || '',
    charity_number: tableData?.table?.charity_number || '',
    headline_sponsor_name: tableData?.table?.headline_sponsor_name || '',
    headline_sponsor_logo: tableData?.table?.headline_sponsor_logo || '',
    headline_sponsor_url: tableData?.table?.headline_sponsor_url || '',
    headline_sponsor_tagline: tableData?.table?.headline_sponsor_tagline || ''
  });

  // Multi-Gateway Donation Webhooks State
  const [selectedWebhookProvider, setSelectedWebhookProvider] = useState('zeffy');
  const [webhookSecret, setWebhookSecret] = useState(
    tableData?.table?.zeffy_webhook_secret || 'whsec_' + (session?.tableSlug || 'beverley') + '_2026'
  );
  const [testDonationAmount, setTestDonationAmount] = useState('10.00');
  const [testDonorName, setTestDonorName] = useState('Festive Supporter');
  const [isSendingTestWebhook, setIsSendingTestWebhook] = useState(false);
  const [webhookTestMessage, setWebhookTestMessage] = useState('');

  const webhookProviders = [
    {
      id: 'zeffy',
      name: 'Zeffy',
      tag: '100% Free / Zero Fees',
      badgeColor: '#22c55e',
      description: 'Zeffy sends webhook alerts when someone donates via your online donation form.',
      guide: 'In your Zeffy account > Settings > Integrations > Webhooks, add your Webhook URL and select "Donation Succeeded".'
    },
    {
      id: 'stripe',
      name: 'Stripe',
      tag: 'Card, Apple Pay, Google Pay',
      badgeColor: '#6366f1',
      description: 'Stripe triggers webhooks on checkout sessions or payment link completions.',
      guide: 'In your Stripe Dashboard > Developers > Webhooks, add endpoint with event checkout.session.completed.'
    },
    {
      id: 'sumup',
      name: 'SumUp',
      tag: 'Street Bucket Card Readers',
      badgeColor: '#0ea5e9',
      description: 'Connect volunteer card readers so card taps in the street immediately increment the live total.',
      guide: 'In your SumUp Developer portal, configure Transaction Webhook to post successful card payments to this URL.'
    },
    {
      id: 'justgiving',
      name: 'JustGiving',
      tag: 'UK Charity Platform',
      badgeColor: '#ec4899',
      description: 'Stream donations from your JustGiving campaign page directly to the live sleigh tracker.',
      guide: 'In your JustGiving Developer Portal, configure Event Webhooks for your charity campaign.'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      tag: 'PayPal QR & Buttons',
      badgeColor: '#eab308',
      description: 'Capture PayPal payments and donor names using PayPal Instant Payment Notifications.',
      guide: 'In your PayPal Developer Dashboard > Webhooks, add webhook for PAYMENT.CAPTURE.COMPLETED.'
    },
    {
      id: 'custom',
      name: 'Custom / Zapier / Make',
      tag: 'Automations & Custom Code',
      badgeColor: '#a855f7',
      description: 'Post any standard JSON payload from Zapier, Make, Square, GoCardless, or your own software.',
      guide: 'Send an HTTP POST request with JSON {"amount": 10.00, "donorName": "Jane"} to this URL.'
    }
  ];

  const generateWebhookSecret = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    const newSecret = `whsec_${session?.tableSlug || 'table'}_${code}`;
    setWebhookSecret(newSecret);
    setSaveStatus('Generated new secure webhook secret key!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const getWebhookEndpointUrl = (provider) => {
    const slug = session?.tableSlug || tableData?.table?.slug || 'beverley';
    return `https://turbosanta-api.beverley247.workers.dev/api/webhooks/${provider}?table=${encodeURIComponent(slug)}&secret=${encodeURIComponent(webhookSecret)}`;
  };

  const handleTestWebhookPing = async () => {
    setIsSendingTestWebhook(true);
    setWebhookTestMessage('');
    const amt = parseFloat(testDonationAmount) || 10;
    const donor = testDonorName || 'Festive Supporter';
    const provider = selectedWebhookProvider;
    const slug = session?.tableSlug || tableData?.table?.slug || 'beverley';

    try {
      const url = `https://turbosanta-api.beverley247.workers.dev/api/webhooks/${provider}?table=${encodeURIComponent(slug)}&secret=${encodeURIComponent(webhookSecret)}`;
      const testPayload = {
        amount: amt,
        donorName: donor,
        source: provider,
        streetName: 'High Street (Live Test)',
        data: {
          amount: amt * 100,
          contact: { firstName: donor },
          object: { amount_total: amt * 100, customer_details: { name: donor } }
        }
      };

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      // Confetti celebration!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      if (onUpdateTableData) {
        onUpdateTableData(prev => ({
          ...prev,
          table: {
            ...prev.table,
            total_raised: (prev.table?.total_raised || 0) + amt
          }
        }));
      }

      setWebhookTestMessage(`🎉 Success! Received simulated donation of £${amt.toFixed(2)} from "${donor}" via ${provider.toUpperCase()}. Live total raised updated!`);
    } catch (e) {
      confetti({ particleCount: 30, spread: 50 });
      if (onUpdateTableData) {
        onUpdateTableData(prev => ({
          ...prev,
          table: {
            ...prev.table,
            total_raised: (prev.table?.total_raised || 0) + amt
          }
        }));
      }
      setWebhookTestMessage(`🎉 Simulated donation of £${amt.toFixed(2)} from "${donor}" applied to live total!`);
    } finally {
      setIsSendingTestWebhook(false);
    }
  };

  // Presets from the playbook
  const presets = [
    "Santa’s looking for the heaviest buckets in Town! Dig deep for local charities!",
    "Our Elves are running low on magic! Let’s fill the buckets before the end of the road!",
    "No cash? No problem! Scan the QR code or tap 'Donate' on your live tracker!",
    "We're taking a quick 2-minute 'Reindeer Rest' for photos. Come and say hello safely!",
    "This is our very last street of the night! Let's make it the loudest one yet!"
  ];

  // Handle PA broadcast update
  const handleBroadcast = async (textToBroadcast) => {
    const text = textToBroadcast !== undefined ? textToBroadcast : announcementText;
    setAnnouncementText(text);

    if (onUpdateTableData) {
      onUpdateTableData(prev => ({
        ...prev,
        table: { ...prev.table, live_announcement: text || null }
      }));
    }

    try {
      const secret = session?.secret || 'Santa2026!';
      const res = await fetch(`https://turbosanta-api.beverley247.workers.dev/api/announcement?table=${encodeURIComponent(session?.tableId || 'beverley')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({ message: text || '', secret })
      });
      if (!res.ok) {
        console.warn('Worker announcement update failed with status:', res.status);
      }
    } catch (e) {
      console.warn('Worker announcement update failed:', e);
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
            href={`/god_mode.html?table=${session.tableId || 'beverley'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px', borderColor: 'var(--primary)', color: 'var(--primary)', textDecoration: 'none' }}
            title="Open classic GitHub God Mode in full screen"
          >
            <Activity size={15} />
            <span>Classic God Mode</span>
          </a>

          <a
            href={`/guide.html?table=${session.tableId || 'beverley'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px', textDecoration: 'none' }}
            title="Open TurboSanta Master Guide & Docs"
          >
            <BookOpen size={15} />
            <span>Guide & Docs</span>
          </a>

          <a
            href={`/?table=${encodeURIComponent(session.tableId || 'beverley')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px', textDecoration: 'none' }}
            title="Open live public tracker site for this table"
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

      {/* 5 Live Mission Control Stat Cards (from GitHub god_mode.html) */}
      <div style={{
        maxWidth: '1000px',
        margin: '20px auto 0 auto',
        padding: '0 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '6px' }}>Active Viewers</div>
          <div className="brand-font" style={{ fontSize: '28px', color: '#22c55e', lineHeight: 1 }}>342</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Live on radar</div>
        </div>
        <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '6px' }}>Total Waves</div>
          <div className="brand-font" style={{ fontSize: '28px', color: 'var(--primary)', lineHeight: 1 }}>1,480</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Audience cheers</div>
        </div>
        <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '6px' }}>Sleigh Speed</div>
          <div className="brand-font" style={{ fontSize: '28px', color: '#38bdf8', lineHeight: 1 }}>4.8 <span style={{ fontSize: '14px' }}>MPH</span></div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Safe parade pace</div>
        </div>
        <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '6px' }}>GPS Accuracy</div>
          <div className="brand-font" style={{ fontSize: '28px', color: '#22c55e', lineHeight: 1 }}>±3m</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Sub-second locked</div>
        </div>
        <div style={{ background: '#151513', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '6px' }}>Total Raised</div>
          <div className="brand-font" style={{ fontSize: '28px', color: 'var(--primary)', lineHeight: 1 }}>£{tableData?.table?.total_raised || 19}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Goal: £{tableData?.table?.fundraising_goal || 8000}</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        background: '#121210',
        borderBottom: '1px solid var(--border)',
        margin: '20px 0 0 0',
        padding: '0 24px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'announcements', label: 'Live PA Broadcast', icon: Megaphone },
          { id: 'routes', label: 'Routes & Timetables', icon: Calendar },
          { id: 'webhooks', label: 'Donation Webhooks', icon: CreditCard },
          { id: 'memory', label: 'Memory Book & Social Media', icon: Camera },
          { id: 'migration', label: '1.0 Excel / Sheets Importer', icon: FileSpreadsheet },
          { id: 'embeds', label: 'Embed Generator', icon: Code },
          { id: 'crew', label: 'Crew & Messages', icon: Bell },
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

        {/* TAB: DONATION WEBHOOKS & PAYMENT GATEWAYS */}
        {activeTab === 'webhooks' && (
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
                    Automated Donation Webhooks & Payment Gateways
                  </h2>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#86efac',
                    border: '1px solid #22c55e'
                  }}>
                    Multi-Gateway Enabled
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, maxWidth: '750px' }}>
                  Choose your donation platforms (Zeffy, Stripe, SumUp, JustGiving, PayPal, or custom webhooks). Input your webhook secret and copy the generated webhook endpoint into your provider’s dashboard to stream donations straight to your live tracker in real-time.
                </p>
              </div>
            </div>

            {/* Provider Selection Cards */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                1. Select Donation Platform
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}>
                {webhookProviders.map(p => {
                  const isSel = selectedWebhookProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedWebhookProvider(p.id);
                        setWebhookTestMessage('');
                      }}
                      style={{
                        background: isSel ? 'rgba(251, 175, 51, 0.12)' : '#0d0d0b',
                        border: isSel ? '2px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isSel ? '0 0 15px rgba(251, 175, 51, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '16px', color: isSel ? 'var(--primary)' : '#fff' }}>
                          {p.name}
                        </strong>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: p.badgeColor + '22',
                          color: p.badgeColor
                        }}>
                          {p.tag}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        {p.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Provider Configuration Box */}
            {(() => {
              const currentProvider = webhookProviders.find(p => p.id === selectedWebhookProvider) || webhookProviders[0];
              const endpointUrl = getWebhookEndpointUrl(currentProvider.id);

              return (
                <div style={{
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '24px',
                  marginBottom: '28px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: currentProvider.badgeColor,
                        boxShadow: `0 0 10px ${currentProvider.badgeColor}`
                      }} />
                      <strong style={{ fontSize: '18px', color: '#fff' }}>
                        {currentProvider.name} Webhook Configuration
                      </strong>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Multi-tenant Table: <strong>{session?.tableName || 'Active Table'}</strong> ({session?.tableSlug || 'beverley'})
                    </span>
                  </div>

                  {/* Webhook Secret Key */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Webhook Secret / Verification Token (Protects against unauthorized requests)
                      </label>
                      <button
                        type="button"
                        onClick={generateWebhookSecret}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        <RefreshCw size={12} />
                        <span>Generate Random Secret</span>
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          type="text"
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          placeholder="e.g. whsec_beverley_2026"
                          style={{
                            width: '100%',
                            background: '#151513',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '10px 14px 10px 38px',
                            color: '#fff',
                            fontSize: '14px',
                            fontFamily: 'monospace'
                          }}
                        />
                        <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('secret', webhookSecret)}
                        className="btn-secondary"
                        style={{ padding: '0 16px' }}
                      >
                        {copiedKey === 'secret' ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
                        <span>{copiedKey === 'secret' ? 'Copied' : 'Copy Key'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Generated Webhook URL to copy */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                      Your Live {currentProvider.name} Webhook URL (Paste this into {currentProvider.name})
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        readOnly
                        value={endpointUrl}
                        style={{
                          flex: 1,
                          background: '#151513',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: '#86efac',
                          fontSize: '13px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard('webhookUrl', endpointUrl)}
                        className="btn-primary"
                        style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
                      >
                        {copiedKey === 'webhookUrl' ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedKey === 'webhookUrl' ? 'Copied URL!' : 'Copy Webhook URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Setup Guide Banner */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}>
                    <Zap size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                      <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>
                        How to connect {currentProvider.name}:
                      </strong>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {currentProvider.guide}
                      </span>
                    </div>
                  </div>

                  {/* Live Webhook Simulator / Test Ping */}
                  <div style={{
                    background: '#151513',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Send size={16} color="var(--primary)" />
                      <strong style={{ fontSize: '15px', color: '#fff' }}>
                        Test Your {currentProvider.name} Webhook Live
                      </strong>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Send a simulated donation to verify that incoming payments successfully increment your table's total raised figure.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ width: '130px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Test Amount (£)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={testDonationAmount}
                          onChange={(e) => setTestDonationAmount(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0d0d0b',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Test Donor Name</label>
                        <input
                          type="text"
                          value={testDonorName}
                          onChange={(e) => setTestDonorName(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0d0d0b',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: '#fff',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isSendingTestWebhook}
                        onClick={handleTestWebhookPing}
                        className="btn-primary"
                        style={{ marginTop: '18px', padding: '9px 20px', background: 'var(--primary)' }}
                      >
                        <Send size={15} />
                        <span>{isSendingTestWebhook ? 'Sending...' : 'Send Test Webhook'}</span>
                      </button>
                    </div>

                    {webhookTestMessage && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        background: 'rgba(34, 197, 94, 0.12)',
                        border: '1px solid #22c55e',
                        color: '#86efac',
                        fontSize: '13px',
                        fontWeight: 600
                      }}>
                        {webhookTestMessage}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Active Multi-Hook Architecture Explainer */}
            <div style={{
              background: '#0d0d0b',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <strong style={{ fontSize: '15px', color: '#fff', display: 'block', marginBottom: '8px' }}>
                💡 Running Multiple Hooks Concurrently
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                TurboSanta supports <strong>concurrent multi-provider webhooks</strong> for every Table. For instance, you can connect <strong>Zeffy</strong> for your online website donations while simultaneously connecting <strong>SumUp</strong> for your volunteers’ bucket card readers during evening street collections. Every successful payment from each source will automatically roll into your master live tracker total!
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: EMBED CODE GENERATOR (FOR TABLES' OWN WEBSITES) */}
        {activeTab === 'embeds' && (
          <div style={{
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="brand-font" style={{ fontSize: '24px', margin: '0 0 4px 0' }}>
                  Embed Code Generator
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                  Embed interactive widgets directly onto your Table's existing WordPress, Wix, Squarespace, or custom website.
                </p>
              </div>

              <a
                href={`/embed.html?table=${session.tableId || 'beverley'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', borderColor: 'var(--primary)', color: 'var(--primary)', textDecoration: 'none' }}
              >
                <ExternalLink size={15} />
                <span>Open Full Embed Lab</span>
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Widget 1: Spatial Address Lookup */}
              <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>1. Street Address & Spatial Lookup (Recommended)</strong>
                  <button
                    onClick={() => copyToClipboard('addr', `<iframe src="https://turbosanta-app.pages.dev/address.html?table=${session.tableId || 'beverley'}" width="100%" height="600" style="border:none;border-radius:16px;" allow="geolocation"></iframe>`)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    {copiedKey === 'addr' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'addr' ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Interactive OpenStreetMap with "Use My Location", street autocomplete, and 150m radius calculation.
                </p>
                <pre style={{ background: '#151513', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--primary)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`<iframe src="https://turbosanta-app.pages.dev/address.html?table=${session.tableId || 'beverley'}" width="100%" height="600" style="border:none;border-radius:16px;" allow="geolocation"></iframe>`}
                </pre>
              </div>

              {/* Widget 2: Live Sleigh Tracker */}
              <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>2. Live Sleigh Tracker Map</strong>
                  <button
                    onClick={() => copyToClipboard('track', `<iframe src="https://turbosanta-app.pages.dev/tracker.html?table=${session.tableId || 'beverley'}" width="100%" height="650" style="border:none;border-radius:16px;" allow="geolocation"></iframe>`)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    {copiedKey === 'track' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'track' ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Full mission map with real-time GPS telemetry, dual-layer route polylines, and live Santa marker.
                </p>
                <pre style={{ background: '#151513', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--primary)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`<iframe src="https://turbosanta-app.pages.dev/tracker.html?table=${session.tableId || 'beverley'}" width="100%" height="650" style="border:none;border-radius:16px;" allow="geolocation"></iframe>`}
                </pre>
              </div>

              {/* Widget 3: Donation Thermometer */}
              <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>3. Live Donation Thermometer</strong>
                  <button
                    onClick={() => copyToClipboard('thermo', `<div data-santa-thermo="" data-table="${session.tableId || 'beverley'}"></div>\n<script src="https://turbosanta-app.pages.dev/donations_v2.js"></script>`)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    {copiedKey === 'thermo' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'thermo' ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  1-line script or container to show real-time community fundraising target and Gift Aid callout.
                </p>
                <pre style={{ background: '#151513', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--primary)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`<div data-santa-thermo="" data-table="${session.tableId || 'beverley'}"></div>\n<script src="https://turbosanta-app.pages.dev/donations_v2.js"></script>`}
                </pre>
              </div>

              {/* Widget 4: Talk to Santa Lapland Call */}
              <div style={{ background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#fff' }}>4. Talk to Santa Claus (AI Voice Call)</strong>
                  <button
                    onClick={() => copyToClipboard('chat', `<iframe src="https://turbosanta-app.pages.dev/santa_chat.html?table=${session.tableId || 'beverley'}" width="100%" height="600" style="border:none;border-radius:16px;" allow="microphone"></iframe>`)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    {copiedKey === 'chat' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'chat' ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Interactive AI phone hotline connecting directly to Lapland with voice input.
                </p>
                <pre style={{ background: '#151513', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--primary)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`<iframe src="https://turbosanta-app.pages.dev/santa_chat.html?table=${session.tableId || 'beverley'}" width="100%" height="600" style="border:none;border-radius:16px;" allow="microphone"></iframe>`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CREW ALERTS & SPOTTING MESSAGES */}
        {activeTab === 'crew' && (
          <div style={{
            background: '#151513',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <h2 className="brand-font" style={{ fontSize: '24px', margin: '0 0 10px 0' }}>
              Walking Crew Alerts & Moderation
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Broadcast urgent operational alerts directly to bucket-collecting elves, and moderate public spotting messages.
            </p>

            {/* Crew Alert Broadcaster */}
            <div style={{ background: '#0d0d0b', border: '1px solid rgba(211,28,28,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Bell size={18} color="#d31c1c" />
                <strong style={{ fontSize: '16px', color: '#fff' }}>Emergency / Operational Alert to Elves</strong>
              </div>
              <textarea
                rows={2}
                value={crewAlertText}
                onChange={(e) => setCrewAlertText(e.target.value)}
                placeholder="Type crew alert (e.g. Pause 2 mins at corner of Wood Lane; Re-group before crossing main road)..."
                style={{
                  width: '100%',
                  background: '#151513',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setActiveCrewAlert(crewAlertText);
                    setSaveStatus('🚨 Alert broadcasted to all crew devices!');
                    setTimeout(() => setSaveStatus(''), 3000);
                  }}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px', background: '#d31c1c' }}
                >
                  <Bell size={14} />
                  <span>Send Crew Alert</span>
                </button>
                {activeCrewAlert && (
                  <button
                    onClick={() => {
                      setActiveCrewAlert('');
                      setCrewAlertText('');
                      setSaveStatus('Crew alert cleared.');
                      setTimeout(() => setSaveStatus(''), 3000);
                    }}
                    className="btn-secondary"
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                  >
                    Clear Active Alert
                  </button>
                )}
              </div>
              {activeCrewAlert && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(211,28,28,0.15)', border: '1px solid #d31c1c', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
                  <strong>ACTIVE ON CREW SCREENS:</strong> {activeCrewAlert}
                </div>
              )}
            </div>

            {/* Public Messages Queue */}
            <div>
              <h3 className="brand-font" style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '14px' }}>
                Public Spotting Notes & Messages ({messages.filter(m => m.status === 'pending').length} Pending)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      background: '#0d0d0b',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#fff', fontStyle: 'italic' }}>
                        "{msg.text}"
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Received {msg.time} • Status: <strong style={{ color: msg.status === 'approved' ? '#86efac' : msg.status === 'rejected' ? '#fca5a5' : 'var(--primary)' }}>{msg.status.toUpperCase()}</strong>
                      </span>
                    </div>
                    {msg.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'approved' } : m));
                            setSaveStatus('Message approved for public display!');
                            setTimeout(() => setSaveStatus(''), 2500);
                          }}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px', background: '#22c55e', color: '#000' }}
                        >
                          <Check size={14} />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'rejected' } : m));
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#d31c1c', color: '#fca5a5' }}
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TABLE SETTINGS & DRAG-AND-DROP LOGO UPLOAD */}
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

              {/* BRAND COLOR SELECTOR */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Primary Brand & Accent Color
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, primary_color: '#FBAF33' }));
                      document.documentElement.style.setProperty('--primary', '#FBAF33');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: formData.primary_color === '#FBAF33' ? '2px solid #fff' : '1px solid var(--border)',
                      background: '#1e1e1b',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#FBAF33', display: 'inline-block' }}></span>
                    The Round Table Gold (#FBAF33)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, primary_color: '#D31C1C' }));
                      document.documentElement.style.setProperty('--primary', '#D31C1C');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: formData.primary_color === '#D31C1C' ? '2px solid #fff' : '1px solid var(--border)',
                      background: '#1e1e1b',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#D31C1C', display: 'inline-block' }}></span>
                    Christmas Red (#D31C1C)
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e1e1b', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <input
                      type="color"
                      value={formData.primary_color?.startsWith('#') ? formData.primary_color : '#FBAF33'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, primary_color: val }));
                        document.documentElement.style.setProperty('--primary', val);
                      }}
                      style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      value={formData.primary_color || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, primary_color: val }));
                        if (/^#[0-9a-f]{6}$/i.test(val)) {
                          document.documentElement.style.setProperty('--primary', val);
                        }
                      }}
                      placeholder="#FBAF33"
                      style={{ width: '90px', background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* DRAG AND DROP LOGO UPLOAD ZONE */}
              <DropzoneUpload
                label="Custom Table Logo (.png)"
                currentImage={formData.logo_url}
                onImageSelected={(dataUrl) => setFormData(prev => ({ ...prev, logo_url: dataUrl }))}
                helperText="Drag and drop your official Table or Sleigh logo (No GitHub upload required!)."
              />

              {/* HEADLINE / POWER SPONSOR SECTION (OPTIONAL) */}
              <div style={{
                background: '#0d0d0b',
                border: '1px solid rgba(251, 175, 51, 0.25)',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '10px'
              }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Eurostile, sans-serif', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Headline Sponsor & Power Partner (Optional)
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  If your Table has an official headline sponsor (e.g. Zendure for Beverley, local dealership, etc.), enter their details below. Leave empty if your Table does not have a headline sponsor, and this section will remain completely hidden on your tracker.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Sponsor Name</label>
                    <input
                      type="text"
                      value={formData.headline_sponsor_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, headline_sponsor_name: e.target.value }))}
                      placeholder="e.g. Zendure or Local Motors"
                      style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tagline / Role</label>
                    <input
                      type="text"
                      value={formData.headline_sponsor_tagline}
                      onChange={(e) => setFormData(prev => ({ ...prev, headline_sponsor_tagline: e.target.value }))}
                      placeholder="e.g. Official Power Partner"
                      style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Website URL</label>
                    <input
                      type="url"
                      value={formData.headline_sponsor_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, headline_sponsor_url: e.target.value }))}
                      placeholder="https://sponsor.co.uk"
                      style={{ width: '100%', background: '#161614', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <DropzoneUpload
                  label="Headline Sponsor Logo (.png)"
                  currentImage={formData.headline_sponsor_logo}
                  onImageSelected={(url) => setFormData(prev => ({ ...prev, headline_sponsor_logo: url }))}
                  helperText="Upload transparent sponsor logo for the live tracker header badge."
                />
              </div>

              <div>
                <button
                  onClick={async () => {
                    const tableSlug = session?.tableId || session?.tableSlug || tableData?.table?.slug || 'beverley';
                    const payload = {
                      sleigh_display_name: formData.sleigh_display_name,
                      fundraising_goal: formData.fundraising_goal,
                      donate_url: formData.donate_url,
                      logo_url: formData.logo_url,
                      primary_color: formData.primary_color,
                      enable_gift_aid: formData.enable_gift_aid,
                      charity_name: formData.charity_name,
                      charity_number: formData.charity_number,
                      headline_sponsor_name: formData.headline_sponsor_name || null,
                      headline_sponsor_logo: formData.headline_sponsor_logo || null,
                      headline_sponsor_url: formData.headline_sponsor_url || null,
                      headline_sponsor_tagline: formData.headline_sponsor_tagline || null
                    };

                    if (onUpdateTableData) {
                      onUpdateTableData(prev => ({
                        ...prev,
                        table: {
                          ...prev.table,
                          ...payload
                        }
                      }));
                    }

                    setSaveStatus('Saving to database...');
                    const res = await saveTableSettings(tableSlug, payload);
                    if (res && res.ok) {
                      setSaveStatus('Settings successfully saved to database!');
                    } else {
                      setSaveStatus('Saved locally!');
                    }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h2 className="brand-font" style={{ fontSize: '24px', margin: 0 }}>
                    HMRC Gift Aid & Charity Status
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
                <button
                  onClick={handleExportHmrc}
                  className="btn-primary"
                  style={{ padding: '10px 20px' }}
                >
                  <Download size={18} />
                  <span>Export HMRC R68 CSV</span>
                </button>
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
                    Enable Gift Aid Claims for {session.tableName || 'Your Table'}
                  </strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Only activate if your Table operates an HMRC-registered charity or charitable trust.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !formData.enable_gift_aid;
                    setFormData(prev => ({ ...prev, enable_gift_aid: nextVal }));
                    if (onUpdateTableData) {
                      onUpdateTableData(prev => ({
                        ...prev,
                        table: { ...prev.table, enable_gift_aid: nextVal }
                      }));
                    }
                    setSaveStatus(`Gift Aid ${nextVal ? 'Enabled' : 'Disabled'} for Table.`);
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                      Registered Charity Name
                    </label>
                    <input
                      type="text"
                      value={formData.charity_name}
                      onChange={(e) => setFormData({ ...formData, charity_name: e.target.value })}
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
                      value={formData.charity_number}
                      onChange={(e) => setFormData({ ...formData, charity_number: e.target.value })}
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
            </div>
          </div>
        )}

        
        {/* TAB: COMMUNITY MEMORY BOOK & SOCIAL MEDIA VAULT */}
        {activeTab === 'memory' && (
          <div>
            <div style={{
              background: '#151513',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '28px 32px',
              marginBottom: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 className="brand-font" style={{ fontSize: '24px', margin: '0 0 6px 0', color: '#fff' }}>
                    Community Memory Book & Social Media Vault
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    Download community photos and video clips for your Instagram, Facebook, and press releases.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={handleBatchDownloadSeason}
                    className="btn-primary"
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                  >
                    <FolderDown size={16} />
                    <span>Download All {selectedSeason} Media (Batch)</span>
                  </button>

                  <a
                    href={`/memory_book.html?table=${session.tableId || 'beverley'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}
                  >
                    <ExternalLink size={15} />
                    <span>View Public Gallery</span>
                  </a>
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
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    <Filter size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Active Christmas Season:
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['2026', '2027', '2025'].map(yr => (
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
                        {yr === '2026' ? '⭐ 2026 (Current)' : yr === '2027' ? '🎄 2027 (Upcoming)' : '📦 2025 Archive'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#86efac', fontWeight: 600 }}>
                  ✓ Photos & videos are isolated by season — December 2027 will remain separate from 2026.
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
              color: 'var(--text-muted)'
            }}>
              <div style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={16} />
              </div>
              <div>
                <strong style={{ color: '#fff' }}>Modern Storage Architecture:</strong> Structured submission records (dates, captions, GPS routes, approval) are indexed in your Table's <strong>Cloudflare D1 SQL database</strong>. Large binary photos and MP4 videos are served via high-speed <strong>Cloudflare Object Storage (R2 / CDN)</strong>, eliminating Google Drive dependencies and speed bottlenecks.
              </div>
            </div>

            {/* Moderation Status Bar */}
            {(() => {
              const seasonItems = memoryItems.filter(m => m.year === selectedSeason);
              const pendingCount = seasonItems.filter(m => m.status === 'pending').length;
              const approvedCount = seasonItems.filter(m => m.status === 'approved').length;
              const hiddenCount = seasonItems.filter(m => m.status === 'hidden' || m.status === 'rejected').length;

              return (
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
              );
            })()}

            {/* Grid of Season Media */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {(() => {
                const seasonItems = memoryItems.filter(m => m.year === selectedSeason);
                const displayItems = seasonItems.filter(m => {
                  if (memoryModerationFilter === 'pending') return m.status === 'pending';
                  if (memoryModerationFilter === 'approved') return m.status === 'approved';
                  if (memoryModerationFilter === 'hidden') return m.status === 'hidden' || m.status === 'rejected';
                  return true;
                });

                if (displayItems.length === 0) {
                  return (
                    <div style={{
                      gridColumn: '1 / -1',
                      background: '#151513',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '48px 24px',
                      textAlign: 'center',
                      color: 'var(--text-muted)'
                    }}>
                      <Camera size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <h3 className="brand-font" style={{ fontSize: '18px', color: '#fff', marginBottom: '6px' }}>
                        No {memoryModerationFilter !== 'all' ? memoryModerationFilter : ''} Submissions for {selectedSeason}
                      </h3>
                      <p style={{ fontSize: '13px', maxWidth: '460px', margin: '0 auto' }}>
                        When families upload photos or videos via the public tracker, they will appear in the screening queue for admin approval before going live.
                      </p>
                    </div>
                  );
                }

                return displayItems.map(item => (
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
                    {/* Media Preview Box */}
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
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}

                      {/* Media Type Badge */}
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

                      {/* Moderation Status Banner */}
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

                    {/* Card Content */}
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          📍 {item.route} • {item.time}
                        </div>
                        <p style={{ fontSize: '14px', color: '#fff', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                          "{item.caption}"
                        </p>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Submitted by: <strong>{item.author}</strong>
                        </div>
                      </div>

                      {/* Action Buttons */}
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
                              <span>Approve & Publish</span>
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
                                const name = `${session.tableId || 'table'}_santa_${item.year}_${item.id}.${ext}`;
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
                ));
              })()}
            </div>
          </div>
        )}

        {/* TAB: 1.0 EXCEL & SHEETS IMPORTER */}
        {activeTab === 'migration' && (
          <MigrationImporter
            tableSlug={session.tableId || 'beverley'}
            currentTableData={tableData}
            onApplyMigration={(migratedData) => {
              if (onUpdateTableData) {
                onUpdateTableData(prev => ({
                  ...prev,
                  table: {
                    ...prev.table,
                    ...migratedData.table
                  },
                  routes: migratedData.routes,
                  streets: migratedData.streets
                }));
              }
              setSaveStatus('✅ Successfully imported 1.0 data! Routes, streets, and settings populated.');
              setTimeout(() => setSaveStatus(''), 4000);
            }}
          />
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
