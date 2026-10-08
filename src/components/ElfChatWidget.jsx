import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, MessageSquare } from 'lucide-react';
import { sendElfChatMessage } from '../services/api';

export default function ElfChatWidget({ tableData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "HO-HO-HO! 🎅 I am Santa's Digital Sleigh Elf. Ask me when Santa is visiting your street, where he is right now, or how our charity fundraiser is going!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await sendElfChatMessage(text, tableData);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "🎅 Brrr! A chilly gust interrupted my connection to Lapland. Please ask again!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "When is Santa on Lawless Lane?",
    "Where is Santa right now?",
    "How much has Beverley raised?",
    "How can I volunteer or add Gift Aid?"
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #d31c1c 0%, #FBAF33 100%)',
            color: '#000',
            border: 'none',
            borderRadius: '50px',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'Eurostile, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            textTransform: 'uppercase',
            boxShadow: '0 8px 30px rgba(251, 175, 51, 0.4)',
            cursor: 'pointer',
            zIndex: 9999,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ fontSize: '20px' }}>🎅</span>
          <span>Ask Santa's Elf</span>
          <Sparkles size={16} />
        </button>
      )}

      {/* Chat Drawer Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: 'min(400px, calc(100vw - 32px))',
          height: 'min(580px, calc(100vh - 48px))',
          background: '#151513',
          border: '2px solid var(--primary)',
          borderRadius: '16px',
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(251, 175, 51, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1c1c18 0%, #0d0d0b 100%)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                🎅
              </div>
              <div>
                <strong className="brand-font" style={{ color: '#fff', fontSize: '16px' }}>
                  Santa's Sleigh Elf
                </strong>
                <div style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                  <span>AI Co-Pilot Online</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                  color: m.role === 'user' ? '#000' : '#fff',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  lineHeight: '1.45',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {m.text}
              </div>
            ))}

            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--primary)',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={16} className="animate-spin" />
                <span>Elf is checking with Lapland...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (if few messages) */}
          {messages.length <= 2 && (
            <div style={{
              padding: '8px 16px',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              borderTop: '1px solid var(--border)'
            }}>
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  style={{
                    background: 'rgba(251, 175, 51, 0.1)',
                    border: '1px solid rgba(251, 175, 51, 0.3)',
                    color: '#fff',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '8px',
              background: '#0d0d0b'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a street, time, or donation..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: '#1c1c18',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                background: 'var(--primary)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '0 16px',
                cursor: 'pointer',
                opacity: (!input.trim() || isLoading) ? 0.5 : 1
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
