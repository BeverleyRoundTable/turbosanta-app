import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Check, AlertTriangle, Eye, EyeOff, Users, Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sendVolunteerBroadcastEmail } from '../services/api';

export default function VolunteerEmailModal({
  isOpen,
  onClose,
  volunteers = [],
  routes = [],
  table = {},
  currentTableSlug = 'beverley',
  initialRouteName = 'all',
  onSuccess
}) {
  if (!isOpen) return null;

  const [selectedRoute, setSelectedRoute] = useState(initialRouteName || 'all');
  const [selectedTemplate, setSelectedTemplate] = useState('briefing');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [showRecipients, setShowRecipients] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  const tableName = table.sleigh_display_name || table.name || 'Round Table Santa Sleigh';
  const gmailConnected = Boolean(table.gmail_connected);
  const senderEmail = table.gmail_connected_email || table.admin_email || 'santa@roundtable.org.uk';

  // Helper getters for volunteer records
  const getVolName = (v) => v.name || v["Volunteer Name"] || 'Volunteer';
  const getVolEmail = (v) => (v.email || v["Email"] || '').trim();
  const getVolRoute = (v) => (v.route_name || v["RouteName"] || '').trim();
  const getVolRole = (v) => v.role || v["Role"] || 'Volunteer';

  // Compute recipient list based on selected route
  const matchingVolunteers = volunteers.filter(v => {
    const email = getVolEmail(v);
    if (!email || !email.includes('@')) return false;
    if (selectedRoute === 'all') return true;
    const vRoute = getVolRoute(v).toLowerCase();
    const targetRoute = selectedRoute.toLowerCase();
    return vRoute === targetRoute;
  });

  // Unique email list
  const recipientEmails = Array.from(new Set(matchingVolunteers.map(v => getVolEmail(v).toLowerCase())));

  // Available unique route names
  const uniqueRouteOptions = Array.from(new Set([
    ...routes.map(r => r.name).filter(Boolean),
    ...volunteers.map(v => getVolRoute(v)).filter(Boolean)
  ]));

  // Generate template content based on template type and route
  const getTemplateContent = (type, routeName) => {
    const activeRouteObj = routes.find(r => r.name === routeName || r.id === routeName);
    const startTm = activeRouteObj?.start_time || '18:00';
    const routeDisplay = routeName && routeName !== 'all' ? routeName : 'Upcoming Sleigh Route';
    const cleanSlug = String(currentTableSlug || table.slug || 'beverley').trim().toLowerCase();
    const trackerLink = `https://${cleanSlug}.roundtablesantasleigh.co.uk/tracker`;

    if (type === 'weather') {
      return {
        subject: `⚠️ Sleigh Route Update / Weather Alert — ${routeDisplay}`,
        body: `Hi Volunteer Team,

Important operational update regarding our Santa Sleigh route for ${routeDisplay}:

Due to adverse weather conditions (rain / high winds / icy roads), tonight's sleigh run is currently delayed / postponed. 

The safety of our volunteer elves, drivers, and the families waiting outside is our highest priority. 

We are monitoring the conditions closely and will send an updated muster time or rescheduled date as soon as possible.

Thank you for your patience and support!

Best regards,
${tableName} Organizers`
      };
    }

    if (type === 'urgent') {
      return {
        subject: `🪣 Urgent Callout: Extra Volunteer Elves Needed Tonight! (${routeDisplay})`,
        body: `Hi Team,

We are short of a few pairs of walking elves and bucket collectors for our sleigh route tonight on ${routeDisplay}!

If you or any friends, partners, or family members are free to join us for an hour or two with a hi-vis vest and collection tin, we would love to have you.

Muster Time: ${startTm}
Route: ${routeDisplay}

Please reply directly to this email or meet us at the start point. Let's make sure the sleigh rolls tonight!

Best regards,
${tableName} Organizers`
      };
    }

    if (type === 'thanks') {
      return {
        subject: `❤️ Massive Thank You from Santa & ${tableName}!`,
        body: `Hi Team,

A huge, heartfelt THANK YOU to every single volunteer who walked, collected, drove, navigated, and brought the Christmas spirit to life on our sleigh route!

Thanks to your incredible dedication, we were able to bring holiday magic to hundreds of local children and raise vital donations for community charities.

Every penny we collected goes directly back into supporting local families, youth groups, and good causes in our area.

We could not do this without you!

Warmest festive wishes,
${tableName} Team`
      };
    }

    if (type === 'custom') {
      return {
        subject: `🎅 Update from ${tableName} — ${routeDisplay}`,
        body: `Hi Team,

Write your custom volunteer briefing message here...

Best regards,
${tableName} Organizers`
      };
    }

    // Default: Briefing
    return {
      subject: `🎅 Volunteer Briefing & Muster Reminder — ${routeDisplay}`,
      body: `Hi Team,

Thank you for volunteering with the ${tableName}! Here is your operational briefing for our upcoming route:

Route: ${routeDisplay}
Muster Time: ${startTm}

Important volunteer briefing & reminders:
• Please dress warmly in waterproof layers and wear sturdy walking shoes or boots.
• High-visibility vests, torches, and sealed collection buckets / QR code lanyards will be provided at muster.
• Keep children safe on the pavement and stay alert to passing traffic at all times.
• Live Sleigh Tracker: ${trackerLink}

Looking forward to bringing the Christmas magic tonight!

Best regards,
${tableName} Organizers`
    };
  };

  // Populate initial text on open or route change
  useEffect(() => {
    const t = getTemplateContent(selectedTemplate, selectedRoute);
    setSubject(t.subject);
    setBodyText(t.body);
    setFeedback(null);
  }, [selectedRoute]);

  const handleSelectTemplate = (templateKey) => {
    setSelectedTemplate(templateKey);
    const t = getTemplateContent(templateKey, selectedRoute);
    setSubject(t.subject);
    setBodyText(t.body);
    setFeedback(null);
  };

  const handleSendBroadcast = async (testOnly = false) => {
    if (!subject.trim()) {
      alert("Please provide an email subject.");
      return;
    }
    if (!bodyText.trim()) {
      alert("Please provide an email message body.");
      return;
    }
    if (!testOnly && recipientEmails.length === 0) {
      alert("No volunteer recipients with valid email addresses found for this route.");
      return;
    }

    setFeedback(null);
    if (testOnly) {
      setIsSendingTest(true);
    } else {
      setIsSending(true);
    }

    try {
      const res = await sendVolunteerBroadcastEmail(currentTableSlug, {
        routeName: selectedRoute,
        subject: subject.trim(),
        message: bodyText.trim(),
        testOnly: !!testOnly,
        testEmail: senderEmail
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: res.message || (testOnly
            ? `Test preview successfully sent to ${senderEmail}!`
            : `Successfully sent to ${recipientEmails.length} volunteer(s) via official Google Workspace BCC!`)
        });
        if (!testOnly) {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
          if (onSuccess) onSuccess(res);
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Failed to send email. Please check your Gmail connection in Settings."
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || "An unexpected error occurred while sending."
      });
    } finally {
      setIsSending(false);
      setIsSendingTest(false);
    }
  };

  // Fallback to traditional mailto client
  const handleOpenInMailApp = () => {
    if (recipientEmails.length === 0) {
      alert("No email addresses found for the selected volunteers.");
      return;
    }
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(recipientEmails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#151513',
        border: '1px solid rgba(251, 175, 51, 0.3)',
        borderRadius: '16px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(251, 175, 51, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(180deg, rgba(251, 175, 51, 0.1) 0%, rgba(21, 21, 19, 0.6) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(251, 175, 51, 0.15)',
              border: '1px solid rgba(251, 175, 51, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={18} color="var(--primary)" />
            </div>
            <div>
              <h3 className="brand-font" style={{ fontSize: '18px', color: '#fff', margin: 0 }}>
                Volunteer Crew Email Composer
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0 0' }}>
                Broadcast briefings &amp; alerts with automatic GDPR-compliant BCC.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '20px 22px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Sender & Gmail Status Banner */}
          <div style={{
            background: '#0d0d0b',
            border: `1px solid ${gmailConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</span>
              <strong style={{ fontSize: '13px', color: '#fff' }}>{senderEmail}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: gmailConnected ? '#86efac' : '#fde047',
                background: gmailConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                border: `1px solid ${gmailConnected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {gmailConnected ? '● Google Workspace Active' : '⚠️ Gmail Not Connected'}
              </span>
            </div>
          </div>

          {/* Route Selector & BCC Count Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            alignItems: 'center'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Select Route / Audience:
              </label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="all">🌟 All Sleigh Routes ({volunteers.filter(v => getVolEmail(v).includes('@')).length} volunteer emails)</option>
                {uniqueRouteOptions.map(rn => {
                  const count = volunteers.filter(v => getVolRoute(v) === rn && getVolEmail(v).includes('@')).length;
                  return (
                    <option key={rn} value={rn}>
                      {rn} ({count} email{count === 1 ? '' : 's'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                BCC Delivery Scope:
              </label>
              <div style={{
                background: '#0d0d0b',
                border: '1px solid rgba(251, 175, 51, 0.25)',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} color="var(--primary)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    {recipientEmails.length} {recipientEmails.length === 1 ? 'Volunteer' : 'Volunteers'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#86efac', background: 'rgba(34, 197, 94, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                    🔒 100% BCC
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecipients(!showRecipients)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  {showRecipients ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showRecipients ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Recipient Tags Preview */}
          {showRecipients && (
            <div style={{
              background: '#0a0a09',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 12px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Volunteers who will receive this email in Bcc:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {matchingVolunteers.map((v, i) => (
                  <span key={i} style={{
                    fontSize: '11px',
                    background: '#151513',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    color: '#e5e7eb'
                  }}>
                    {getVolName(v)} &bull; <code style={{ color: 'var(--primary)' }}>{getVolEmail(v)}</code>
                  </span>
                ))}
                {matchingVolunteers.length === 0 && (
                  <span style={{ fontSize: '12px', color: '#fca5a5' }}>
                    No volunteer emails found for this route selection.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Preset Templates */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Quick Templates:
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'briefing', label: '📋 Muster Briefing' },
                { key: 'weather', label: '🌧️ Weather Alert' },
                { key: 'urgent', label: '🪣 Urgent Extra Elves' },
                { key: 'thanks', label: '❤️ Thank You' },
                { key: 'custom', label: '✍️ Custom Blank' }
              ].map(tpl => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.key)}
                  style={{
                    background: selectedTemplate === tpl.key ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedTemplate === tpl.key ? '#000' : '#e5e7eb',
                    border: `1px solid ${selectedTemplate === tpl.key ? 'var(--primary)' : 'rgba(255, 255, 255, 0.12)'}`,
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: selectedTemplate === tpl.key ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Email Subject Line:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. 🎅 Volunteer Briefing & Muster Reminder"
              style={{
                width: '100%',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 600,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Message Body */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Email Message Body:
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {bodyText.length} characters &bull; {bodyText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={9}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Type your volunteer message here..."
              style={{
                width: '100%',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#fff',
                fontSize: '13px',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ✨ Will be sent as a festive Round Table email with your logo, route badge, and a direct button to Santa's live tracker.
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div style={{
              background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
              fontSize: '13px'
            }}>
              {feedback.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
              <span style={{ flex: 1 }}>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#0d0d0b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Secondary Actions (Test & Mailto) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {gmailConnected && (
              <button
                type="button"
                onClick={() => handleSendBroadcast(true)}
                disabled={isSending || isSendingTest}
                className="btn-secondary"
                style={{
                  padding: '9px 13px',
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title={`Send a preview copy to ${senderEmail}`}
              >
                <Sparkles size={14} className={isSendingTest ? 'animate-spin' : ''} />
                <span>{isSendingTest ? 'Sending Test...' : 'Send Test Copy to Me'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenInMailApp}
              disabled={recipientEmails.length === 0}
              className="btn-secondary"
              style={{
                padding: '9px 13px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Open external mail client (Outlook/Apple Mail) as fallback"
            >
              <ExternalLink size={14} />
              <span>Open in Mail App</span>
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSending || isSendingTest}
              className="btn-secondary"
              style={{ padding: '9px 14px', fontSize: '12px' }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSendBroadcast(false)}
              disabled={isSending || isSendingTest || recipientEmails.length === 0 || !gmailConnected}
              className="btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--primary)',
                color: '#000',
                fontWeight: 800,
                opacity: (recipientEmails.length === 0 || !gmailConnected) ? 0.6 : 1
              }}
              title={!gmailConnected ? 'Please connect Gmail in Settings first' : `Send to ${recipientEmails.length} volunteer(s)`}
            >
              <Send size={14} className={isSending ? 'animate-spin' : ''} />
              <span>
                {isSending
                  ? 'Sending via Gmail...'
                  : `Send to ${recipientEmails.length} Volunteers (BCC)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
