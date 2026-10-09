import React, { useState, useEffect } from 'react';
import { X, Calendar, Wrench, Heart, Sparkles, Compass } from 'lucide-react';

export default function WorkshopOverlay({ isOpen, onClose, routes = [], tableData }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [hasValidDates, setHasValidDates] = useState(false);
  const [nextRoute, setNextRoute] = useState(null);
  const [motProgress, setMotProgress] = useState(78);
  const [motMessage, setMotMessage] = useState('Polishing the bells...');
  const [reindeerProgress, setReindeerProgress] = useState(85);
  const [elfProgress, setElfProgress] = useState(92);

  const table = tableData?.table || {};

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const futureRoutes = routes
      .filter(r => r.date && !isNaN(new Date(r.date)) && new Date(r.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (futureRoutes.length > 0) {
      setNextRoute(futureRoutes[0]);
      setHasValidDates(true);
    } else {
      setNextRoute(null);
      setHasValidDates(false);
    }
  }, [routes]);

  useEffect(() => {
    if (!nextRoute) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nextRoute.date).getTime();
      const diff = target - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });

        // Calculate seasonal progress based on time through year
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
        const totalYear = target - startOfYear;
        const elapsed = now - startOfYear;
        const rawPct = Math.max(10, Math.min(100, (elapsed / totalYear) * 100));
        setMotProgress(Math.floor(rawPct));

        if (rawPct < 20) setMotMessage('Oiling the runners...');
        else if (rawPct < 35) setMotMessage('Deep-cleaning the upholstery...');
        else if (rawPct < 50) setMotMessage('Re-painting the chassis...');
        else if (rawPct < 65) setMotMessage('Checking the aerodynamics...');
        else if (rawPct < 80) setMotMessage('Upgrading sat-nav software...');
        else if (rawPct < 95) setMotMessage('Testing magic thrusters & lights...');
        else setMotMessage('Sleigh MOT passed & ready for takeoff!');

        setReindeerProgress(Math.floor(Math.min(100, rawPct * 1.04)));
        setElfProgress(Math.floor(Math.min(100, rawPct * 1.08)));
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setMotProgress(100);
        setMotMessage('Sleigh MOT passed & ready for takeoff!');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRoute]);

  if (!isOpen) return null;

  const upcomingRoutes = routes
    .filter(r => r.date && new Date(r.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(13, 13, 11, 0.92)',
      backdropFilter: 'blur(10px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: '#161614',
        border: '1px solid rgba(251, 175, 51, 0.35)',
        borderRadius: '24px',
        padding: '36px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(251, 175, 51, 0.15)',
        position: 'relative',
        textAlign: 'center'
      }}>
        {/* Festive Top Gradient Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          background: 'linear-gradient(90deg, #d31c1c, #FBAF33)'
        }} />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#eaeae5',
            cursor: 'pointer'
          }}
          aria-label="Close Santa's Workshop"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div style={{
          fontFamily: 'Eurostile, sans-serif',
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          color: '#ffffff',
          marginBottom: '6px',
          lineHeight: 1.1
        }}>
          SANTA'S <span style={{ color: '#FBAF33' }}>WORKSHOP</span>
        </div>

        <p style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.6)',
          margin: '0 0 20px 0',
          lineHeight: 1.5
        }}>
          The sleigh is currently undergoing off-season maintenance. We'll be back on the road in:
        </p>

        {/* Countdown Box */}
        <div style={{
          backgroundColor: '#0d0d0b',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          {hasValidDates ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              fontFamily: 'Eurostile, monospace'
            }}>
              <div style={{ minWidth: '55px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#FBAF33' }}>{timeLeft.days}</div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.45)' }}>Days</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.3)' }}>:</div>
              <div style={{ minWidth: '55px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>{String(timeLeft.hours).padStart(2, '0')}</div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.45)' }}>Hours</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.3)' }}>:</div>
              <div style={{ minWidth: '55px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>{String(timeLeft.minutes).padStart(2, '0')}</div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.45)' }}>Mins</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.3)' }}>:</div>
              <div style={{ minWidth: '55px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#2ecc71' }}>{String(timeLeft.seconds).padStart(2, '0')}</div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.45)' }}>Secs</div>
              </div>
            </div>
          ) : (
            <div style={{
              fontFamily: 'Eurostile, sans-serif',
              fontSize: '20px',
              fontWeight: 800,
              color: '#FBAF33',
              letterSpacing: '1px'
            }}>
              DATES COMING SOON
            </div>
          )}
        </div>

        {/* MOT & Maintenance Progress Bars */}
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {/* Sleigh MOT */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)' }}>
              <span>Sleigh MOT & Waxing</span>
              <span style={{ color: '#FBAF33' }}>{motProgress}%</span>
            </div>
            <div style={{ backgroundColor: '#0d0d0b', borderRadius: '8px', height: '10px', overflow: 'hidden', marginTop: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ width: `${motProgress}%`, height: '100%', background: 'linear-gradient(90deg, #d31c1c, #FBAF33)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#eaeae5', fontStyle: 'italic', marginTop: '4px' }}>
              {motMessage}
            </div>
          </div>

          {/* Reindeer Flight Training */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)' }}>
              <span>Reindeer Flight Training</span>
              <span style={{ color: '#2ecc71' }}>{reindeerProgress}%</span>
            </div>
            <div style={{ backgroundColor: '#0d0d0b', borderRadius: '8px', height: '10px', overflow: 'hidden', marginTop: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ width: `${reindeerProgress}%`, height: '100%', background: 'linear-gradient(90deg, #2ecc71, #86efac)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#eaeae5', fontStyle: 'italic', marginTop: '4px' }}>
              High-altitude conditioning & formation drills
            </div>
          </div>

          {/* Elf Recruitment */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)' }}>
              <span>Elf Recruitment & Roster</span>
              <span style={{ color: '#3b82f6' }}>{elfProgress}%</span>
            </div>
            <div style={{ backgroundColor: '#0d0d0b', borderRadius: '8px', height: '10px', overflow: 'hidden', marginTop: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ width: `${elfProgress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#eaeae5', fontStyle: 'italic', marginTop: '4px' }}>
              Toy packing & sleigh cheer certifications complete
            </div>
          </div>
        </div>

        {/* Upcoming Routes Schedule Preview */}
        {upcomingRoutes.length > 0 && (
          <div style={{
            backgroundColor: '#0d0d0b',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '14px',
            textAlign: 'left',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#FBAF33',
              letterSpacing: '1px',
              marginBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '4px'
            }}>
              Upcoming Scheduled Routes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingRoutes.map((r, i) => (
                <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                    {new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span style={{ fontWeight: 700, color: i === 0 ? '#FBAF33' : '#ffffff' }}>
                    {r.name || r.routeName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {table.donate_url && (
            <a
              href={table.donate_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#FBAF33',
                color: '#000000',
                textDecoration: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                fontFamily: 'Eurostile, sans-serif',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Heart size={16} />
              <span>Donate to Support Good Causes</span>
            </a>
          )}

          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.6)',
              border: 'none',
              padding: '8px',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Bypass & View Live Map
          </button>
        </div>
      </div>
    </div>
  );
}
