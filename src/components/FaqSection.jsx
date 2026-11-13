import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { normalizeFaqs } from '../utils/faqs';

export default function FaqSection({ faqs: customFaqs = null }) {
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = normalizeFaqs(customFaqs);

  if (!faqs || faqs.length === 0) return null;

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" style={{
      padding: '40px 20px 60px 20px',
      maxWidth: '900px',
      margin: '0 auto',
      scrollMarginTop: '80px'
    }}>
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          FAQ & <span style={{ color: 'var(--primary)' }}>SAFETY RULES</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
          Important information about the sleigh routes and how to enjoy the magic safely.
        </p>
      </div>

      {/* Accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              style={{
                background: '#151513',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                transition: 'border-color 0.2s'
              }}
            >
              <button
                onClick={() => toggle(idx)}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isOpen ? 'rgba(251, 175, 51, 0.06)' : 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '17px',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={20}
                  color="var(--primary)"
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    flexShrink: 0,
                    marginLeft: '12px'
                  }}
                />
              </button>

              {isOpen && (
                <div style={{
                  padding: '0 24px 20px 24px',
                  color: 'var(--text-muted)',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  borderTop: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <p style={{ marginTop: '16px' }}>{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
