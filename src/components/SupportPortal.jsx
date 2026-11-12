import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, LifeBuoy, UploadCloud, Trash2,
  ExternalLink, Shield, Search, Filter, Image as ImageIcon, FileText,
  Smartphone, Monitor, Calendar, ArrowLeft, Copy, Plus, RefreshCw,
  FileSpreadsheet, Sparkles, X, ChevronDown, ChevronRight, HelpCircle,
  Video
} from 'lucide-react';
import {
  submitSupportTicket,
  fetchSupportTickets,
  updateSupportTicket,
  uploadSupportScreenshot,
  fetchPublicTables
} from '../services/api';
import { getCurrentSession, isNationalAdmin } from '../services/auth';

const RAG_CONFIG = {
  red: {
    label: 'RED — Critical Showstopper',
    shortLabel: 'Critical',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.45)',
    glow: '0 0 16px rgba(239, 68, 68, 0.25)',
    description: 'Sleigh tracker offline, donations failing, route not loading on tour night, or safety critical bug.'
  },
  amber: {
    label: 'AMBER — High Priority (Pre-Tour)',
    shortLabel: 'High',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.45)',
    glow: '0 0 16px rgba(234, 179, 8, 0.25)',
    description: 'Feature malfunctioning, route timings off, volunteer crew signups failing. Needed before your tour dates start.'
  },
  green: {
    label: 'GREEN — Minor / 2027 Wishlist',
    shortLabel: 'Minor',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.45)',
    glow: '0 0 16px rgba(34, 197, 94, 0.25)',
    description: 'Cosmetic tweak, typo, visual polish, general question, or a new feature suggestion for next year.'
  }
};

const CATEGORIES = [
  { id: 'tracking', label: '🛰️ Live GPS Tracker & Radar Map' },
  { id: 'routes', label: '📍 Street Routes, GPX & Planned Stops' },
  { id: 'alerts', label: '🔔 Doorstep Approaching Alerts (SMS/Email)' },
  { id: 'donations', label: '💳 Donations & Webhooks (Zeffy, SumUp, JustGiving)' },
  { id: 'volunteers', label: '👥 Volunteers, Crew Rota & Safety Briefings' },
  { id: 'admin', label: '⚙️ Admin Portal, Settings & Logins' },
  { id: 'public_page', label: '🎄 Public Sleigh Page (Appearance, FAQs, Music)' },
  { id: 'ai_santa', label: '🤖 AI Santa / Magic Mailbox' },
  { id: 'other', label: '❓ Other / General Question' }
];

export function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|mov|m4v|ogv)($|\?)/i.test(url) || url.includes('/support-videos/');
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  scheduled_january: { label: 'Scheduled for Jan ❄️', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  resolved: { label: 'Resolved ✅', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  closed: { label: 'Closed', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)' }
};

export default function SupportPortal({ session: propSession, onBackToAdmin, onBackToHome }) {
  const session = propSession || getCurrentSession();
  const isSuperUser = Boolean(
    session?.isNationalAdmin ||
    session?.email?.toLowerCase().includes('beverley247') ||
    session?.email?.toLowerCase().startsWith('national') ||
    (session?.email && isNationalAdmin(session.email))
  );

  const [activeTab, setActiveTab] = useState(isSuperUser ? 'catalogue' : 'submit');
  const [tablesList, setTablesList] = useState([]);

  // Auto-detected environment details
  const autoEnv = useMemo(() => {
    if (typeof window === 'undefined') return { browser: '', os: '' };
    const ua = navigator.userAgent;
    let browser = 'Browser';
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/')) browser = 'Safari';

    let os = 'Unknown Device';
    if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/Windows NT/.test(ua)) os = 'Windows';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    const screenRes = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;
    return {
      browser: `${browser} (${screenRes})`,
      os: `${os}`
    };
  }, []);

  // Form State
  const [tableSlug, setTableSlug] = useState(session?.tableSlug || session?.tableId || '');
  const [tableName, setTableName] = useState(session?.tableName || '');
  const [contactName, setContactName] = useState(
    session?.email ? session.email.split('@')[0].replace(/[._-]/g, ' ') : ''
  );
  const [contactEmail, setContactEmail] = useState(session?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [ragStatus, setRagStatus] = useState('amber');
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [pageUrl, setPageUrl] = useState(
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const [deviceInfo, setDeviceInfo] = useState(autoEnv.os);
  const [browserInfo, setBrowserInfo] = useState(autoEnv.browser);
  const [screenshots, setScreenshots] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Ticket history & Catalogue State
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueRagFilter, setCatalogueRagFilter] = useState('all');
  const [catalogueStatusFilter, setCatalogueStatusFilter] = useState('all');
  const [catalogueTableFilter, setCatalogueTableFilter] = useState('all');
  const [activeTicketModal, setActiveTicketModal] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [modalStatus, setModalStatus] = useState('open');
  const [modalRag, setModalRag] = useState('amber');
  const [notifyRecipient, setNotifyRecipient] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);

  // Load tables for selector
  useEffect(() => {
    fetchPublicTables()
      .then((tables) => {
        if (Array.isArray(tables)) setTablesList(tables);
      })
      .catch(() => {});
  }, []);

  // Sync table name when table slug changes
  useEffect(() => {
    if (tableSlug && tablesList.length > 0) {
      const match = tablesList.find(t => t.slug === tableSlug);
      if (match) setTableName(match.sleigh_display_name || match.town_name);
    }
  }, [tableSlug, tablesList]);

  // Load Tickets (for Table or Superadmin)
  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const params = {};
      if (isSuperUser) {
        if (catalogueTableFilter !== 'all') params.table = catalogueTableFilter;
        if (catalogueRagFilter !== 'all') params.rag = catalogueRagFilter;
        if (catalogueStatusFilter !== 'all') params.status = catalogueStatusFilter;
        if (catalogueSearch) params.search = catalogueSearch;
      } else {
        if (session?.tableSlug) params.table = session.tableSlug;
        if (contactEmail) params.email = contactEmail;
      }

      const res = await fetchSupportTickets(params);
      if (res?.tickets) {
        setTickets(res.tickets);
      }
    } catch (err) {
      console.warn("Could not load support tickets:", err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [isSuperUser, catalogueTableFilter, catalogueRagFilter, catalogueStatusFilter, catalogueSearch, session?.tableSlug, contactEmail]);

  useEffect(() => {
    if (activeTab === 'my_tickets' || activeTab === 'catalogue') {
      loadTickets();
    }
  }, [activeTab, loadTickets]);

  // Clipboard Paste Screenshot Listener (Ctrl+V anywhere on page)
  useEffect(() => {
    const handlePaste = async (e) => {
      if (activeTab !== 'submit') return;
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await uploadFile(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  // Screenshot & Video Upload Handler
  const uploadFile = async (file) => {
    if (!file) return;
    const maxMb = 50;
    if (file.size > maxMb * 1024 * 1024) {
      alert(`File size exceeds ${maxMb}MB limit. Please compress or take a shorter screen clip.`);
      return;
    }
    setIsUploadingImage(true);
    try {
      const res = await uploadSupportScreenshot(file);
      if (res?.url) {
        setScreenshots(prev => [...prev, res.url]);
      }
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Form Submission
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage("Please enter an issue title / summary.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please provide a detailed description so we can replicate or fix the issue.");
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setErrorMessage("Please enter a valid contact email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        table_id: tableSlug || 'general',
        table_name: tableName || tableSlug || 'Round Table',
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        contact_phone: contactPhone.trim(),
        rag_status: ragStatus,
        category,
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: stepsToReproduce.trim(),
        page_url: pageUrl.trim(),
        device_info: deviceInfo.trim(),
        browser_info: browserInfo.trim(),
        screenshot_urls: screenshots
      };

      const res = await submitSupportTicket(payload);
      if (res?.ok) {
        setSubmitSuccess(res.ticket);
        // Reset inputs
        setTitle('');
        setDescription('');
        setStepsToReproduce('');
        setScreenshots([]);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit ticket. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status & Note Updates for Admin Catalogue
  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    setUpdatingTicketId(ticketId);
    try {
      const isResolved = newStatus === 'resolved' || newStatus === 'closed';
      await updateSupportTicket(ticketId, { status: newStatus, notify_recipient: isResolved });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (activeTicketModal?.id === ticketId) {
        setActiveTicketModal(prev => ({ ...prev, status: newStatus }));
        setModalStatus(newStatus);
      }
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleUpdateTicketRag = async (ticketId, newRag) => {
    setUpdatingTicketId(ticketId);
    try {
      await updateSupportTicket(ticketId, { rag_status: newRag });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, rag_status: newRag } : t));
      if (activeTicketModal?.id === ticketId) {
        setActiveTicketModal(prev => ({ ...prev, rag_status: newRag }));
        setModalRag(newRag);
      }
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleSaveModalTicket = async (ticketId) => {
    setUpdatingTicketId(ticketId);
    try {
      const isResolved = modalStatus === 'resolved' || modalStatus === 'closed';
      await updateSupportTicket(ticketId, {
        status: modalStatus,
        rag_status: modalRag,
        admin_notes: adminNoteInput,
        notify_recipient: isResolved ? notifyRecipient : false
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? {
        ...t,
        status: modalStatus,
        rag_status: modalRag,
        admin_notes: adminNoteInput
      } : t));
      const recipientEmail = activeTicketModal?.contact_email;
      const tktNum = activeTicketModal?.ticket_number || ticketId;
      setActiveTicketModal(null);
      if (isResolved && notifyRecipient && recipientEmail) {
        alert(`✅ Ticket #${tktNum} marked as ${modalStatus.toUpperCase()}!\n\nAn automated resolution email with your engineering notes was dispatched to ${recipientEmail}.`);
      } else {
        alert("Ticket details updated successfully.");
      }
    } catch (err) {
      alert(`Failed to save ticket: ${err.message}`);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleSaveAdminNotes = async (ticketId) => {
    setUpdatingTicketId(ticketId);
    try {
      await updateSupportTicket(ticketId, { admin_notes: adminNoteInput });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, admin_notes: adminNoteInput } : t));
      if (activeTicketModal?.id === ticketId) {
        setActiveTicketModal(prev => ({ ...prev, admin_notes: adminNoteInput }));
      }
      alert("Admin note saved.");
    } catch (err) {
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Export Catalogue to CSV
  const handleExportCSV = () => {
    if (tickets.length === 0) {
      alert("No tickets to export.");
      return;
    }
    const headers = [
      "Ticket #", "RAG Rating", "Status", "Table", "Category", "Title",
      "Description", "Steps to Reproduce", "Contact Name", "Contact Email",
      "Contact Phone", "Device", "Browser", "URL", "Screenshots Count", "Admin Notes", "Created At"
    ];
    const rows = tickets.map(t => [
      t.ticket_number || '',
      (t.rag_status || '').toUpperCase(),
      t.status || '',
      `"${(t.table_name || t.table_id || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.steps_to_reproduce || '').replace(/"/g, '""')}"`,
      `"${(t.contact_name || '').replace(/"/g, '""')}"`,
      `"${(t.contact_email || '').replace(/"/g, '""')}"`,
      `"${(t.contact_phone || '').replace(/"/g, '""')}"`,
      `"${(t.device_info || '').replace(/"/g, '""')}"`,
      `"${(t.browser_info || '').replace(/"/g, '""')}"`,
      `"${(t.page_url || '').replace(/"/g, '""')}"`,
      Array.isArray(t.screenshot_urls) ? t.screenshot_urls.length : 0,
      `"${(t.admin_notes || '').replace(/"/g, '""')}"`,
      t.created_at || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `santa_sleigh_support_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const red = tickets.filter(t => t.rag_status === 'red' && t.status !== 'resolved' && t.status !== 'closed').length;
    const amber = tickets.filter(t => t.rag_status === 'amber' && t.status !== 'resolved' && t.status !== 'closed').length;
    const green = tickets.filter(t => t.rag_status === 'green' && t.status !== 'resolved' && t.status !== 'closed').length;
    const scheduledJan = tickets.filter(t => t.status === 'scheduled_january').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    return { total, red, amber, green, scheduledJan, resolved };
  }, [tickets]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1D1D1A',
      color: '#eaeae5',
      fontFamily: 'Open Sans, -apple-system, BlinkMacSystemFont, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* TOP HEADER */}
      <header style={{
        backgroundColor: '#161614',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/icons/RTBI_Santa.png"
            alt="RTBI Santa"
            style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(251, 175, 51, 0.4)' }}
          />
          <div>
            <div style={{
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '17px',
              letterSpacing: '0.8px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>TURBO SANTA SUPPORT &amp; ISSUE TRACKER</span>
              <span style={{
                backgroundColor: 'rgba(251, 175, 51, 0.18)',
                color: '#FBAF33',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700
              }}>
                RAG TRIAGE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
              Official National Round Table Santa Sleigh Fleet Engineering
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {session && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              color: '#86efac'
            }}>
              <CheckCircle2 size={13} />
              <span>{session.email}</span>
            </div>
          )}

          {onBackToAdmin && (
            <button
              onClick={onBackToAdmin}
              style={{
                backgroundColor: 'rgba(251, 175, 51, 0.12)',
                color: '#FBAF33',
                border: '1px solid rgba(251, 175, 51, 0.35)',
                borderRadius: '8px',
                padding: '7px 14px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 700,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={13} />
              <span>Back to Admin</span>
            </button>
          )}

          <a
            href="/"
            onClick={(e) => {
              if (onBackToHome) {
                e.preventDefault();
                onBackToHome();
              }
            }}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 700,
              fontSize: '11px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Public Home</span>
          </a>
        </div>
      </header>

      {/* MID-NOVEMBER CODE FREEZE NOTICE BANNER */}
      <section style={{
        maxWidth: '1080px',
        margin: '24px auto 0',
        padding: '0 20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(22, 22, 20, 0.98) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '16px',
          padding: '18px 24px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '15px',
                letterSpacing: '0.6px',
                color: '#ffffff',
                marginBottom: '4px'
              }}>
                PRE-SEASON CODE FREEZE POLICY &bull; MID-NOVEMBER TO JANUARY
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', margin: 0, lineHeight: 1.6 }}>
                Starting mid-November, platform updates are strictly locked down across the national fleet to guarantee 100% stability and prevent downtime while sleighs are out on the road.
                <strong> Only Critical 🔴 RED showstoppers</strong> (e.g. radar offline, donations broken on tour night) will be patched in December.
                All <strong>🟡 AMBER</strong> issues will be triaged prior to the freeze, and <strong>🟢 GREEN</strong> items (cosmetic tweaks, wishlists) will be queued for the January post-season release.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TAB NAVIGATION */}
      <section style={{
        maxWidth: '1080px',
        margin: '24px auto 0',
        padding: '0 20px',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('submit')}
            style={{
              backgroundColor: activeTab === 'submit' ? '#FBAF33' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'submit' ? '#000000' : '#eaeae5',
              border: activeTab === 'submit' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '10px 18px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <Plus size={15} />
            <span>Submit Issue / Ticket</span>
          </button>

          <button
            onClick={() => setActiveTab('my_tickets')}
            style={{
              backgroundColor: activeTab === 'my_tickets' ? '#FBAF33' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'my_tickets' ? '#000000' : '#eaeae5',
              border: activeTab === 'my_tickets' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '10px 18px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 800,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s'
            }}
          >
            <LifeBuoy size={15} />
            <span>My Submitted Tickets</span>
          </button>

          {isSuperUser && (
            <button
              onClick={() => setActiveTab('catalogue')}
              style={{
                backgroundColor: activeTab === 'catalogue' ? '#D31C1C' : 'rgba(211, 28, 28, 0.15)',
                color: '#ffffff',
                border: activeTab === 'catalogue' ? '1px solid #ef4444' : '1px solid rgba(211, 28, 28, 0.4)',
                borderRadius: '8px',
                padding: '10px 18px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s'
              }}
            >
              <Shield size={15} />
              <span>National Catalogue ({tickets.length})</span>
            </button>
          )}
        </div>

        {activeTab === 'catalogue' && isSuperUser && (
          <button
            onClick={handleExportCSV}
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#86efac',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontFamily: 'Eurostile, sans-serif',
              fontWeight: 700,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
        )}
      </section>

      {/* MAIN CONTENT AREA */}
      <main style={{
        maxWidth: '1080px',
        margin: '24px auto',
        padding: '0 20px 60px',
        width: '100%',
        boxSizing: 'border-box',
        flex: 1
      }}>
        {/* ============================================================== */}
        {/* TAB 1: SUBMIT SUPPORT TICKET FORM                              */}
        {/* ============================================================== */}
        {activeTab === 'submit' && (
          <div>
            {submitSuccess ? (
              <div style={{
                backgroundColor: '#161614',
                border: '2px solid #22c55e',
                borderRadius: '20px',
                padding: '36px',
                textAlign: 'center',
                maxWidth: '680px',
                margin: '0 auto',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)'
              }}>
                <CheckCircle2 size={56} color="#22c55e" style={{ margin: '0 auto 16px' }} />
                <h2 style={{
                  fontFamily: 'Eurostile, sans-serif',
                  fontSize: '26px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  margin: '0 0 10px 0'
                }}>
                  Support Ticket #{submitSuccess.ticket_number} Logged!
                </h2>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: RAG_CONFIG[submitSuccess.rag_status]?.bg,
                  color: RAG_CONFIG[submitSuccess.rag_status]?.color,
                  border: `1px solid ${RAG_CONFIG[submitSuccess.rag_status]?.border}`,
                  padding: '4px 14px',
                  borderRadius: '50px',
                  fontWeight: 800,
                  fontSize: '12px',
                  fontFamily: 'Eurostile, sans-serif',
                  marginBottom: '16px'
                }}>
                  {RAG_CONFIG[submitSuccess.rag_status]?.label}
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                  Your ticket has been catalogued. We will review your issue, inspect the environment details and screenshots, and provide an update to <strong>{contactEmail}</strong>.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setSubmitSuccess(null);
                      setActiveTab('my_tickets');
                    }}
                    style={{
                      backgroundColor: '#FBAF33',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontFamily: 'Eurostile, sans-serif',
                      fontWeight: 800,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    View My Tickets &rarr;
                  </button>
                  <button
                    onClick={() => setSubmitSuccess(null)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontFamily: 'Eurostile, sans-serif',
                      fontWeight: 700,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Log Another Issue
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} style={{
                backgroundColor: '#161614',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '30px',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)'
              }}>
                <div style={{ marginBottom: '26px' }}>
                  <h2 style={{
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '22px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    margin: '0 0 6px 0'
                  }}>
                    Log an Issue or Bug Report
                  </h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                    Please provide complete details so we can diagnose and resolve the issue quickly without back-and-forth guessing.
                  </p>
                </div>

                {errorMessage && (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#fca5a5',
                    fontSize: '13px',
                    marginBottom: '20px'
                  }}>
                    {errorMessage}
                  </div>
                )}

                {/* 1. RAG STATUS SELECTOR */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#FBAF33',
                    marginBottom: '10px'
                  }}>
                    1. Select RAG Priority Rating *
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '12px'
                  }}>
                    {Object.entries(RAG_CONFIG).map(([key, cfg]) => {
                      const isSelected = ragStatus === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setRagStatus(key)}
                          style={{
                            backgroundColor: isSelected ? cfg.bg : 'rgba(255, 255, 255, 0.03)',
                            border: `2px solid ${isSelected ? cfg.color : 'rgba(255, 255, 255, 0.08)'}`,
                            borderRadius: '14px',
                            padding: '16px',
                            cursor: 'pointer',
                            boxShadow: isSelected ? cfg.glow : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{
                              fontFamily: 'Eurostile, sans-serif',
                              fontWeight: 800,
                              fontSize: '13px',
                              color: cfg.color,
                              textTransform: 'uppercase'
                            }}>
                              {cfg.label}
                            </span>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? cfg.color : 'rgba(255, 255, 255, 0.3)'}`,
                              backgroundColor: isSelected ? cfg.color : 'transparent'
                            }} />
                          </div>
                          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.45 }}>
                            {cfg.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. TABLE & CATEGORY */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '18px',
                  marginBottom: '22px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Eurostile, sans-serif',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: '6px'
                    }}>
                      Your Table / Town *
                    </label>
                    <input
                      type="text"
                      value={tableName || tableSlug}
                      onChange={(e) => {
                        setTableName(e.target.value);
                        setTableSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      }}
                      placeholder="e.g. Stokesley, Beverley 247, Lichfield..."
                      required
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Eurostile, sans-serif',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.8)',
                      marginBottom: '6px'
                    }}>
                      Affected Area / Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1d1d1a',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. TITLE & DESCRIPTION */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '6px'
                  }}>
                    Issue Title / One-Line Summary *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Planned stop timings not calculating on Route 1, Doorstep alert popup error..."
                    required
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '6px'
                  }}>
                    Detailed Description (What happened, what did you expect, exact error text) *
                  </label>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Please answer:\n1. What were you doing or trying to do?\n2. What actually happened? (Include exact error message or behaviour)\n3. What did you expect to happen instead?`}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      color: '#ffffff',
                      fontSize: '13px',
                      lineHeight: 1.55,
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '6px'
                  }}>
                    Steps to Reproduce (Optional but highly recommended)
                  </label>
                  <textarea
                    rows={3}
                    value={stepsToReproduce}
                    onChange={(e) => setStepsToReproduce(e.target.value)}
                    placeholder="1. Go to Admin Portal -> Routes&#10;2. Click on 'Edit Stops'&#10;3. Save route and notice stop timing doesn't update..."
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* 4. SCREENSHOTS & PASTE DROPZONE */}
                <div style={{ marginBottom: '26px' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '6px'
                  }}>
                    Screenshots &amp; Video Recordings (Paste with Ctrl+V or upload)
                  </label>

                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files?.[0]) {
                        await uploadFile(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: '2px dashed rgba(251, 175, 51, 0.35)',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      marginBottom: '12px',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <UploadCloud size={28} color="#FBAF33" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                      Drag and drop image or video clip here, or paste from clipboard (Ctrl+V)
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                      PNG, JPG, WebP, GIF, MP4, WebM, MOV supported (up to 50MB)
                    </div>
                    <label style={{
                      backgroundColor: 'rgba(251, 175, 51, 0.18)',
                      color: '#FBAF33',
                      border: '1px solid rgba(251, 175, 51, 0.4)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontFamily: 'Eurostile, sans-serif',
                      fontWeight: 700,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'inline-block'
                    }}>
                      <span>{isUploadingImage ? 'Uploading...' : 'Browse Screenshot / Video File'}</span>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) uploadFile(e.target.files[0]);
                        }}
                        style={{ display: 'none' }}
                        disabled={isUploadingImage}
                      />
                    </label>
                  </div>

                  {screenshots.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '10px'
                    }}>
                      {screenshots.map((url, i) => {
                        const isVid = isVideoUrl(url);
                        return (
                          <div key={i} style={{
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            aspectRatio: '1',
                            backgroundColor: '#0a0a08'
                          }}>
                            {isVid ? (
                              <div
                                onClick={() => setZoomImage(url)}
                                style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer' }}
                              >
                                <video
                                  src={url}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'rgba(0, 0, 0, 0.35)'
                                }}>
                                  <Video size={24} color="#FBAF33" />
                                </div>
                              </div>
                            ) : (
                              <img
                                src={url}
                                alt={`Upload ${i + 1}`}
                                onClick={() => setZoomImage(url)}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(0, 0, 0, 0.75)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. ENVIRONMENT & CONTACT DETAILS */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                  marginBottom: '26px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Eurostile, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px'
                    }}>
                      Device / OS (Auto-Detected)
                    </label>
                    <input
                      type="text"
                      value={deviceInfo}
                      onChange={(e) => setDeviceInfo(e.target.value)}
                      placeholder="e.g. Windows 11, iPhone 15 iOS 18"
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Eurostile, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px'
                    }}>
                      Browser (Auto-Detected)
                    </label>
                    <input
                      type="text"
                      value={browserInfo}
                      onChange={(e) => setBrowserInfo(e.target.value)}
                      placeholder="e.g. Chrome 130, Safari"
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Eurostile, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px'
                    }}>
                      Your Contact Name
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Ben, John Smith"
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Eurostile, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px'
                    }}>
                      Your Contact Email *
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="yourname@roundtable.org.uk"
                      required
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: 'Eurostile, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px'
                    }}>
                      Contact Phone (Recommended for 🔴 Red)
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="07..."
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: ragStatus === 'red' ? '#ef4444' : (ragStatus === 'amber' ? '#FBAF33' : '#22c55e'),
                      color: ragStatus === 'amber' ? '#000000' : '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 28px',
                      fontFamily: 'Eurostile, sans-serif',
                      fontWeight: 800,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                  >
                    {isSubmitting ? 'Cataloguing Ticket...' : `Submit Ticket (${ragStatus.toUpperCase()})`}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2 & 3: TICKET LIST / CATALOGUE                             */}
        {/* ============================================================== */}
        {(activeTab === 'my_tickets' || activeTab === 'catalogue') && (
          <div>
            {/* KPI METRICS (FOR SUPERUSER CATALOGUE) */}
            {activeTab === 'catalogue' && isSuperUser && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <div style={{ backgroundColor: '#161614', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontWeight: 700 }}>Total Logged</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', fontFamily: 'Eurostile, sans-serif' }}>{metrics.total}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#fca5a5', textTransform: 'uppercase', fontWeight: 700 }}>🔴 Critical Red</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', fontFamily: 'Eurostile, sans-serif' }}>{metrics.red}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.35)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#fde047', textTransform: 'uppercase', fontWeight: 700 }}>🟡 Amber (Pre-Tour)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#eab308', fontFamily: 'Eurostile, sans-serif' }}>{metrics.amber}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#86efac', textTransform: 'uppercase', fontWeight: 700 }}>🟢 Green (Wishlist)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e', fontFamily: 'Eurostile, sans-serif' }}>{metrics.green}</div>
                </div>
                <div style={{ backgroundColor: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.35)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#d8b4fe', textTransform: 'uppercase', fontWeight: 700 }}>❄️ Scheduled Jan</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#c084fc', fontFamily: 'Eurostile, sans-serif' }}>{metrics.scheduledJan}</div>
                </div>
                <div style={{ backgroundColor: '#161614', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#86efac', textTransform: 'uppercase', fontWeight: 700 }}>Resolved / Closed</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e', fontFamily: 'Eurostile, sans-serif' }}>{metrics.resolved}</div>
                </div>
              </div>
            )}

            {/* FILTERS & SEARCH */}
            <div style={{
              backgroundColor: '#161614',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                <Search size={16} color="#FBAF33" />
                <input
                  type="text"
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  placeholder="Search by title, description, ticket #, or town..."
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                />
              </div>

              {isSuperUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={catalogueRagFilter}
                    onChange={(e) => setCatalogueRagFilter(e.target.value)}
                    style={{
                      backgroundColor: '#1d1d1a',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">All RAG Ratings</option>
                    <option value="red">🔴 Red (Critical)</option>
                    <option value="amber">🟡 Amber (High)</option>
                    <option value="green">🟢 Green (Low/Jan)</option>
                  </select>

                  <select
                    value={catalogueStatusFilter}
                    onChange={(e) => setCatalogueStatusFilter(e.target.value)}
                    style={{
                      backgroundColor: '#1d1d1a',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="scheduled_january">Scheduled Jan ❄️</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    onClick={loadTickets}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#eaeae5',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Refresh</span>
                  </button>
                </div>
              )}
            </div>

            {/* TICKETS LIST */}
            {isLoadingTickets ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Loading catalogue tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#161614',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <LifeBuoy size={40} color="rgba(255, 255, 255, 0.2)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontFamily: 'Eurostile, sans-serif', fontSize: '17px', margin: '0 0 6px 0', color: '#ffffff' }}>
                  No Tickets Found
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 16px 0' }}>
                  {activeTab === 'catalogue' ? 'No tickets match the active filters.' : 'You have not submitted any issues yet.'}
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  style={{
                    backgroundColor: '#FBAF33',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontFamily: 'Eurostile, sans-serif',
                    fontWeight: 800,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  Log An Issue Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {tickets.map(ticket => {
                  const rag = RAG_CONFIG[ticket.rag_status] || RAG_CONFIG.amber;
                  const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  return (
                    <div
                      key={ticket.id}
                      style={{
                        backgroundColor: '#161614',
                        border: `1px solid ${ticket.rag_status === 'red' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '14px',
                        padding: '18px 22px',
                        position: 'relative',
                        boxShadow: ticket.rag_status === 'red' ? '0 4px 20px rgba(239, 68, 68, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: rag.bg,
                            color: rag.color,
                            border: `1px solid ${rag.border}`,
                            padding: '3px 9px',
                            borderRadius: '50px',
                            fontWeight: 800,
                            fontSize: '11px',
                            fontFamily: 'Eurostile, sans-serif',
                            textTransform: 'uppercase'
                          }}>
                            {rag.shortLabel}
                          </span>

                          <span style={{
                            backgroundColor: st.bg,
                            color: st.color,
                            padding: '3px 9px',
                            borderRadius: '50px',
                            fontWeight: 700,
                            fontSize: '11px'
                          }}>
                            {st.label}
                          </span>

                          <span style={{
                            fontFamily: 'Eurostile, sans-serif',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: '#FBAF33'
                          }}>
                            #{ticket.ticket_number || ticket.id.slice(-4)}
                          </span>

                          <span style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontWeight: 600
                          }}>
                            &bull; {ticket.table_name || ticket.table_id}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>

                      <h3 style={{
                        fontFamily: 'Eurostile, sans-serif',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: '0 0 8px 0'
                      }}>
                        {ticket.title}
                      </h3>

                      <p style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.75)',
                        margin: '0 0 12px 0',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line'
                      }}>
                        {ticket.description}
                      </p>

                      {ticket.steps_to_reproduce && (
                        <div style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginBottom: '12px',
                          whiteSpace: 'pre-line'
                        }}>
                          <strong style={{ color: '#FBAF33' }}>Steps to Reproduce:</strong><br />
                          {ticket.steps_to_reproduce}
                        </div>
                      )}

                      {/* Screenshot & Video thumbnails */}
                      {Array.isArray(ticket.screenshot_urls) && ticket.screenshot_urls.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          {ticket.screenshot_urls.map((attUrl, i) => {
                            const isVid = isVideoUrl(attUrl);
                            return (
                              <div
                                key={i}
                                onClick={() => setZoomImage(attUrl)}
                                style={{
                                  position: 'relative',
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  cursor: 'pointer',
                                  backgroundColor: '#0a0a08'
                                }}
                              >
                                {isVid ? (
                                  <>
                                    <video
                                      src={attUrl}
                                      muted
                                      playsInline
                                      preload="metadata"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{
                                      position: 'absolute',
                                      inset: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: 'rgba(0, 0, 0, 0.35)'
                                    }}>
                                      <Video size={16} color="#FBAF33" />
                                    </div>
                                  </>
                                ) : (
                                  <img
                                    src={attUrl}
                                    alt="Attachment"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Metadata bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.45)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        paddingTop: '10px'
                      }}>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>Area: <strong>{ticket.category}</strong></span>
                          {ticket.contact_name && <span>Reporter: <strong>{ticket.contact_name}</strong></span>}
                          {ticket.contact_email && <span>Email: <strong>{ticket.contact_email}</strong></span>}
                          {ticket.device_info && <span>Device: <strong>{ticket.device_info}</strong></span>}
                        </div>

                        {/* SuperAdmin controls */}
                        {isSuperUser && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              value={ticket.status}
                              disabled={updatingTicketId === ticket.id}
                              onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value)}
                              style={{
                                backgroundColor: '#1d1d1a',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="scheduled_january">Schedule for Jan ❄️</option>
                              <option value="resolved">Resolved ✅</option>
                              <option value="closed">Closed</option>
                            </select>

                            <button
                              onClick={() => {
                                setActiveTicketModal(ticket);
                                setAdminNoteInput(ticket.admin_notes || '');
                                setModalStatus(ticket.status || 'open');
                                setModalRag(ticket.rag_status || 'amber');
                                setNotifyRecipient(true);
                              }}
                              style={{
                                backgroundColor: 'rgba(251, 175, 51, 0.15)',
                                color: '#FBAF33',
                                border: '1px solid rgba(251, 175, 51, 0.35)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Notes / Manage
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Display Admin Notes if present */}
                      {ticket.admin_notes && (
                        <div style={{
                          marginTop: '10px',
                          backgroundColor: 'rgba(251, 175, 51, 0.08)',
                          borderLeft: '3px solid #FBAF33',
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: '#fef3c7',
                          borderRadius: '0 6px 6px 0'
                        }}>
                          <strong>Engineering Team Note:</strong> {ticket.admin_notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* SUPERADMIN MODAL: MANAGE TICKET & INTERNAL NOTES */}
      {activeTicketModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#161614',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '18px',
                color: '#ffffff'
              }}>
                Manage Ticket #{activeTicketModal.ticket_number}
              </div>
              <button
                onClick={() => setActiveTicketModal(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px', fontSize: '14px', fontWeight: 700, color: '#FBAF33' }}>
              {activeTicketModal.title}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  Update RAG Rating
                </label>
                <select
                  value={modalRag}
                  onChange={(e) => setModalRag(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1d1d1a',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '12px'
                  }}
                >
                  <option value="red">🔴 Red (Critical Showstopper)</option>
                  <option value="amber">🟡 Amber (Pre-tour Priority)</option>
                  <option value="green">🟢 Green (Wishlist / Jan)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  Update Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1d1d1a',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '12px'
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="scheduled_january">Scheduled for January ❄️</option>
                  <option value="resolved">Resolved ✅</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Engineering Notes / Resolution Details (Visible to Table)
              </label>
              <textarea
                rows={4}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="e.g. Fixed in release v2.4, or: Requires route re-upload, or: Deferred to post-season January update..."
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Auto-Email Resolution Checkbox */}
            {(modalStatus === 'resolved' || modalStatus === 'closed') && (
              <div style={{
                marginBottom: '18px',
                padding: '10px 14px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#86efac',
                  fontWeight: 600
                }}>
                  <input
                    type="checkbox"
                    checked={notifyRecipient}
                    onChange={(e) => setNotifyRecipient(e.target.checked)}
                    style={{ accentColor: '#22c55e', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>
                    Auto-email resolution briefing to <strong>{activeTicketModal.contact_name ? `${activeTicketModal.contact_name} (${activeTicketModal.contact_email})` : activeTicketModal.contact_email}</strong>
                  </span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActiveTicketModal(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleSaveModalTicket(activeTicketModal.id)}
                disabled={updatingTicketId === activeTicketModal.id}
                style={{
                  backgroundColor: (modalStatus === 'resolved' || modalStatus === 'closed') ? '#22c55e' : '#FBAF33',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000000',
                  padding: '8px 18px',
                  fontFamily: 'Eurostile, sans-serif',
                  fontWeight: 800,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {updatingTicketId === activeTicketModal.id
                  ? 'Saving...'
                  : (modalStatus === 'resolved' || modalStatus === 'closed')
                    ? (notifyRecipient ? 'Save & Email Resolution ✅' : 'Save & Mark Resolved ✅')
                    : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZOOM IMAGE / VIDEO MODAL */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.94)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 200,
            cursor: 'zoom-out'
          }}
        >
          {isVideoUrl(zoomImage) ? (
            <video
              src={zoomImage}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '95vw',
                maxHeight: '92vh',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: '#000000',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
              }}
            />
          ) : (
            <img
              src={zoomImage}
              alt="Enlarged screenshot"
              style={{
                maxWidth: '95vw',
                maxHeight: '92vh',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
              }}
            />
          )}
        </div>
      )}

      {/* FOOTER */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: '#161614',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.45)'
      }}>
        <div>Round Table Great Britain &amp; Ireland &bull; Santa Sleigh Engineering Support</div>
        <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.3)' }}>
          Tickets are reviewed based on RAG severity. Critical issues receive priority on tour nights.
        </div>
      </footer>
    </div>
  );
}
