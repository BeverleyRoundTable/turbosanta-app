import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Bot, User, Copy, Check, X,
  ChevronDown, ChevronUp, RefreshCw, HelpCircle,
  Database, MapPin, Sliders, ExternalLink, MessageSquare,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import { askAdminAssistant } from '../services/api';

export default function AdminAssistantModal({
  isOpen,
  onOpen,
  onClose,
  tableData,
  session,
  currentTableSlug
}) {
  const [internalOpen, setInternalOpen] = useState(Boolean(isOpen));

  // Sync internal state whenever parent isOpen prop changes
  useEffect(() => {
    if (isOpen !== undefined) {
      setInternalOpen(Boolean(isOpen));
    }
  }, [isOpen]);

  const activeOpen = internalOpen;

  const handleClose = () => {
    setInternalOpen(false);
    if (onClose) onClose();
  };

  const handleOpen = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setInternalOpen(true);
    if (onOpen) onOpen();
  };

  const targetSlug = (currentTableSlug || session?.tableSlug || session?.tableId || tableData?.table?.slug || 'beverley').toLowerCase().trim();
  const tableName = tableData?.table?.name || session?.tableName || `${targetSlug.charAt(0).toUpperCase() + targetSlug.slice(1)} Round Table`;
  const rawModel = tableData?.table?.gemini_model || localStorage.getItem('turbosanta_global_gemini_model') || 'gemini-3.8-flash';
  const displayModel = rawModel.includes('3.8') ? 'Gemini 3.8 Flash' : (rawModel.includes('3.6') ? 'Gemini 3.6 Flash' : rawModel);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isSnapshotExpanded, setIsSnapshotExpanded] = useState(false);

  // Initialize messages with an informative welcome message
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: `👋 Hello **${tableName}** team! I'm **TurboSanta**, your operations and settings assistant.\n\nI have direct, real-time access to your table's **Cloudflare D1 database** and the full **TurboSanta System Guide**.\n\nAsk me anything about:\n- 🎛️ **Modular Public Slots** (AI Santa Chat, Naughty/Nice Certificate, Reindeer Adoption, etc.)\n- 🗺️ **Routes & GPX** (drawing routes, attaching GPX files directly to timetable)\n- 📍 **Driver Beacon & Sleigh Radar** (why the sleigh is "Resting in Lapland" vs "Live")\n- 💳 **Donations & Webhooks** (Zeffy, SumUp, JustGiving, Cash Buckets, Gift Aid)\n- 👥 **Crew & Volunteers** (dispatching route briefings via Gmail BCC)\n- 🎨 **Branding & Settings** (what every toggle in Table Settings changes)`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (activeOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (activeOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [activeOpen]);

  const handleSend = async (textToSend) => {
    const question = (textToSend || inputMessage).trim();
    if (!question || isLoading) return;

    const userMsg = {
      role: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build history excluding initial greetings or large blocks
      const historyPayload = messages
        .filter(m => m.role === 'user' || m.role === 'model')
        .slice(-6)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const res = await askAdminAssistant(targetSlug, {
        message: question,
        history: historyPayload,
        model: rawModel
      });

      if (res && res.ok && res.reply) {
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            text: res.reply,
            model: res.model || displayModel,
            thinkingMode: res.thinkingMode || 'adaptive',
            grounded: res.grounded !== false,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            text: `⚠️ **Unable to get answer:** ${res?.error || 'Service temporarily unreachable. Please check your network and try again.'}`,
            isError: true,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **Error connecting to assistant:** ${err.message || 'Network error'}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'model',
        text: `🧹 Chat cleared! How can I help you configure or operate the **${tableName}** sleigh today?`,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickChips = [
    { label: '🔍 Audit My Settings', prompt: 'Please audit my current table settings, routes, and donation setup. Is there anything missing or misconfigured?' },
    { label: '🎛️ How Do Slots Work?', prompt: 'How do the 2 modular public slots work on our public site? What happens when I enable or disable them?' },
    { label: '🗺️ Attach GPX to Route', prompt: 'How do I link a GPX route file created in Route Planner directly to a route in my schedule?' },
    { label: '📍 Sleigh Resting in Lapland?', prompt: 'Why is our sleigh tracker showing "Resting in Lapland"? How does the driver turn on live GPS?' },
    { label: '💳 Connect Webhooks', prompt: 'How do I connect Zeffy, SumUp, or JustGiving webhooks so donations automatically update our live thermometer?' },
    { label: '👥 Crew Volunteer Briefings', prompt: 'How do I send email briefings to our volunteer crew without triggering spam or reply-all issues?' }
  ];

  // Helper to render markdown-like text
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div style={{ lineHeight: 1.6, fontSize: '13.5px' }}>
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} style={{ color: 'var(--primary)', fontSize: '15px', fontWeight: 800, margin: '14px 0 6px 0', fontFamily: 'Eurostile, sans-serif' }}>
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={idx} style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: '16px 0 8px 0', fontFamily: 'Eurostile, sans-serif' }}>
                {line.replace('## ', '')}
              </h3>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h2 key={idx} style={{ color: 'var(--primary)', fontSize: '18px', fontWeight: 800, margin: '18px 0 8px 0', fontFamily: 'Eurostile, sans-serif' }}>
                {line.replace('# ', '')}
              </h2>
            );
          }

          // Bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
            const content = line.trim().replace(/^[-•]\s*/, '');
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', margin: '4px 0', paddingLeft: '8px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.trim().match(/^(\d+)\.\s*(.*)/);
          if (numMatch) {
            return (
              <div key={idx} style={{ display: 'flex', gap: '8px', margin: '4px 0', paddingLeft: '8px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, minWidth: '18px' }}>{numMatch[1]}.</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(numMatch[2]) }} />
              </div>
            );
          }

          // Empty lines
          if (!line.trim()) {
            return <div key={idx} style={{ height: '8px' }} />;
          }

          // Standard paragraph
          return (
            <p key={idx} style={{ margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
          );
        })}
      </div>
    );
  };

  // Safe inline markdown replacement (bold, italic, code)
  const formatInlineMarkdown = (str) => {
    if (!str) return '';
    return str
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>')
      // Italic *text*
      .replace(/\*(.*?)\*/g, '<em style="color: #e4e4e7;">$1</em>')
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<code style="background: rgba(251, 175, 51, 0.15); color: #fbbf24; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid rgba(251, 175, 51, 0.25);">$1</code>');
  };

  const routesCount = tableData?.routes?.length || 0;
  const streetsCount = tableData?.streets?.length || 0;
  const totalRaised = Number(tableData?.table?.total_raised || 0);
  const rawSlot1 = String(tableData?.table?.public_slot_1 || '').trim();
  const slot1 = (rawSlot1 && rawSlot1.toLowerCase() !== 'none' && rawSlot1.toLowerCase() !== 'disabled') ? rawSlot1 : 'None (Disabled)';
  const rawSlot2 = String(tableData?.table?.public_slot_2 || '').trim();
  const slot2 = (rawSlot2 && rawSlot2.toLowerCase() !== 'none' && rawSlot2.toLowerCase() !== 'disabled') ? rawSlot2 : 'None (Disabled)';

  return (
    <>
      {/* 🚀 Floating Action Button (FAB) - Always accessible in lower-right of admin */}
      {!activeOpen && (
        <button
          onClick={handleOpen}
          aria-label="Ask TurboSanta"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9990,
            background: 'linear-gradient(135deg, #1f1f1c 0%, #121210 100%)',
            border: '2px solid rgba(251, 175, 51, 0.7)',
            borderRadius: '50px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(251, 175, 51, 0.25)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'Eurostile, sans-serif',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '0.4px',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.8), 0 0 25px rgba(251, 175, 51, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.7)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(251, 175, 51, 0.25)';
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} color="var(--primary)" />
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e'
            }} />
          </div>
          <span>Ask TurboSanta</span>
          <span style={{
            background: 'rgba(251, 175, 51, 0.15)',
            border: '1px solid rgba(251, 175, 51, 0.35)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '10px',
            color: 'var(--primary)',
            fontWeight: 700
          }}>
            AI Help
          </span>
        </button>
      )}

      {/* 🪟 Slide-Over Drawer / Popup Modal */}
      {activeOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'stretch',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100%',
              maxHeight: '100dvh',
              background: '#151513',
              borderLeft: '1px solid rgba(251, 175, 51, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              background: 'linear-gradient(180deg, #1f1f1c 0%, #151513 100%)',
              borderBottom: '1px solid var(--border)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(251, 175, 51, 0.2) 0%, rgba(211, 28, 28, 0.2) 100%)',
                  border: '1px solid rgba(251, 175, 51, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      color: '#fff',
                      fontFamily: 'Eurostile, sans-serif',
                      fontWeight: 800,
                      letterSpacing: '0.4px'
                    }}>
                      Ask TurboSanta
                    </h3>
                    <span style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid #22c55e',
                      color: '#86efac',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
                      D1 Live
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {tableName} • {displayModel} (Adaptive 🧠)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation history"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'var(--text-muted)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close assistant"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    color: '#a1a1aa',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Live Data Grounding Bar (Collapsible) */}
            <div style={{
              background: '#0d0d0b',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '8px 16px',
              fontSize: '11.5px',
              color: 'var(--text-muted)'
            }}>
              <div
                onClick={() => setIsSnapshotExpanded(!isSnapshotExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={13} color="var(--primary)" />
                  <span style={{ color: '#fff', fontWeight: 600 }}>Active Grounding Context:</span>
                  <span>{routesCount} routes • £{totalRaised.toLocaleString()} raised</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
                  <span>{isSnapshotExpanded ? 'Hide' : 'Inspect'}</span>
                  {isSnapshotExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </div>

              {isSnapshotExpanded && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  fontSize: '11px'
                }}>
                  <div><strong>Table ID:</strong> {targetSlug}</div>
                  <div><strong>Total Streets:</strong> {streetsCount}</div>
                  <div><strong>Slot 1:</strong> <span style={{ color: slot1 === 'None (Disabled)' ? 'var(--text-muted)' : '#86efac', fontFamily: 'monospace' }}>{slot1}</span></div>
                  <div><strong>Slot 2:</strong> <span style={{ color: slot2 === 'None (Disabled)' ? 'var(--text-muted)' : '#86efac', fontFamily: 'monospace' }}>{slot2}</span></div>
                  <div><strong>Goal:</strong> £{Number(tableData?.table?.fundraising_goal || 0).toLocaleString()}</div>
                  <div><strong>Gift Aid:</strong> {tableData?.table?.enable_gift_aid ? 'Active (+25%)' : 'Disabled'}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Thinking Budget:</strong> Dynamic / Adaptive (Allocates tokens based on prompt reasoning needs)
                  </div>
                </div>
              )}
            </div>

            {/* Conversation Feed */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '100%'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                      maxWidth: '92%',
                      flexDirection: isUser ? 'row-reverse' : 'row'
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isUser ? 'rgba(251, 175, 51, 0.2)' : 'linear-gradient(135deg, #d31c1c 0%, #fbaf33 100%)',
                        border: isUser ? '1px solid var(--primary)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isUser ? 'var(--primary)' : '#000',
                        fontSize: '11px',
                        fontWeight: 800,
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {isUser ? <User size={14} /> : <Bot size={14} />}
                      </div>

                      {/* Bubble */}
                      <div style={{
                        background: isUser ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                        color: isUser ? '#000' : '#e4e4e7',
                        border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        padding: '12px 16px',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                        position: 'relative',
                        wordBreak: 'break-word'
                      }}>
                        {renderFormattedText(m.text)}

                        {/* Message Footer */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: isUser ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: '10.5px',
                          color: isUser ? 'rgba(0, 0, 0, 0.6)' : 'var(--text-muted)',
                          gap: '12px'
                        }}>
                          <span>{m.timestamp}</span>
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => handleCopy(m.text, idx)}
                              title="Copy answer"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: copiedIndex === idx ? '#22c55e' : 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 4px',
                                fontSize: '10.5px'
                              }}
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check size={12} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Thinking / Loading Indicator */}
              {isLoading && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', maxWidth: '85%' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d31c1c 0%, #fbaf33 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    flexShrink: 0
                  }}>
                    <Bot size={14} />
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(251, 175, 51, 0.3)',
                    borderRadius: '14px 14px 14px 2px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Reasoning with adaptive thinking...</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Evaluating live D1 routes, modular slots &amp; RTBI operations manual.
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div style={{
              background: '#121210',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '10px 14px',
              overflowX: 'auto',
              display: 'flex',
              gap: '6px',
              scrollbarWidth: 'none'
            }}>
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip.prompt)}
                  disabled={isLoading}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#d4d4d8',
                    borderRadius: '16px',
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(251, 175, 51, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#d4d4d8';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div style={{
              background: '#151513',
              borderTop: '1px solid var(--border)',
              padding: '14px 16px'
            }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Ask anything about ${tableName} settings, routes, GPX, or slots...`}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    background: '#0d0d0b',
                    border: '1px solid rgba(251, 175, 51, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.3)'; }}
                />

                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="btn-primary"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: (isLoading || !inputMessage.trim()) ? 0.5 : 1,
                    cursor: (isLoading || !inputMessage.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                Grounded in Cloudflare D1 table state &amp; RTBI operations guide. Shift+Enter for newline.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
