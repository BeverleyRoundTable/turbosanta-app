import React, { useState } from 'react';
import { ChevronDown, ShieldAlert } from 'lucide-react';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: "Will you definitely come down my street tonight?",
      a: "Our routes are a guide, not a guarantee. We are entirely run by volunteers and rely on good weather, clear traffic, and having enough people to safely operate the sleigh. Sometimes we have to cut a route short due to rain, ice, or time restrictions. Please use the live tracker above to see exactly where we are!"
    },
    {
      q: "Why didn't you turn down my cul-de-sac?",
      a: "The Santa Sleigh is very large and difficult to manoeuvre. If there are parked cars blocking a turning circle, or if a cul-de-sac is too tight for us to safely turn around, the driver will make the decision to stay on the main road. If you live down a tight street, please come out to the nearest junction to wave to Santa!"
    },
    {
      q: "Can my children climb onto the sleigh for a photo?",
      a: "For safety and insurance reasons, no one is allowed on the sleigh while it is moving or during the street collections. You are very welcome to take photos of Santa from the pavement. Please ensure children do not run into the road towards the moving vehicle."
    },
    {
      q: "Where does the donated money go?",
      a: "Every single penny collected goes directly into our local Round Table charity fund. Throughout the year, we distribute this money to local good causes, community groups, food banks, and individuals in need right here in our town."
    },
    {
      q: "Do you accept card donations?",
      a: "Yes! Our elves carry contactless card readers alongside their traditional buckets. You can also donate right here on this website using the Donate button at the top of the page."
    },
    {
      q: "Can I volunteer to help?",
      a: "Absolutely! We are always looking for enthusiastic volunteers to help collect donations, act as safety walkers, or even drive the towing vehicle. Reach out to us via our email or social media channels below to get involved."
    }
  ];

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
