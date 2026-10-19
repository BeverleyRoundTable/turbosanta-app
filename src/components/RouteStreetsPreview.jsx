import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Search, X, Star, ChevronRight, Navigation } from 'lucide-react';

/**
 * Safely parse any format of streets input into a clean string array.
 */
function parseStreetsList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map(s => {
        if (typeof s === 'string') return s.trim();
        if (s && typeof s === 'object') return (s.street_name || s.name || '').trim();
        return '';
      })
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Check if a street entry denotes a designated Santa Stop.
 */
function isSantaStop(name) {
  return /santa\s*stop/i.test(name || '');
}

/**
 * Clean up Santa Stop name for display (e.g. "SANTA STOP - Cwm Road" -> "Cwm Road").
 */
function formatStopLabel(name) {
  if (!name) return '';
  const isStop = isSantaStop(name);
  if (!isStop) return name;
  const stripped = name.replace(/santa\s*stop[:\s\-]*/i, '').trim();
  return stripped ? `🎅 STOP: ${stripped}` : '🎅 SANTA STOP';
}

/**
 * RouteStreetsPreview:
 * Renders a compact chip/pill preview on the route card, with a "+N more" badge
 * and an interactive modal drawer containing the full searchable street list.
 */
export default function RouteStreetsPreview({
  streets,
  routeName,
  dateText,
  timeText,
  previewLimit = 5,
  accentColor = 'var(--primary, #FBAF33)',
  onViewMap
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const modalContentRef = useRef(null);

  const allStreets = useMemo(() => parseStreetsList(streets), [streets]);
  const santaStopsCount = useMemo(() => allStreets.filter(isSantaStop).length, [allStreets]);

  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredModalStreets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allStreets;
    return allStreets.filter(s => s.toLowerCase().includes(q));
  }, [allStreets, search]);

  if (!allStreets || allStreets.length === 0) {
    return (
      <div style={{ fontSize: '13px', color: 'var(--text-muted, #888)', fontStyle: 'italic', marginBottom: '14px' }}>
        Full street list publishing soon.
      </div>
    );
  }

  const visibleStreets = allStreets.slice(0, previewLimit);
  const remainingCount = allStreets.length - visibleStreets.length;

  const handleOpenModal = (e) => {
    e.stopPropagation();
    setSearch('');
    setIsOpen(true);
  };

  const handleCloseModal = (e) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
  };

  const modalMarkup = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      onClick={handleCloseModal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '88vh',
          backgroundColor: '#141412',
          border: '1px solid rgba(251, 175, 51, 0.35)',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(251, 175, 51, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(251, 175, 51, 0.08) 0%, rgba(20, 20, 18, 0.4) 100%)',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Close dialog"
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(211, 28, 28, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(211, 28, 28, 1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
          >
            <X size={18} />
          </button>

          {(dateText || timeText) && (
            <div
              className="brand-font"
              style={{
                color: accentColor,
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{dateText}</span>
              {timeText && <span style={{ opacity: 0.6 }}>• {timeText}</span>}
            </div>
          )}

          <h3
            className="brand-font"
            style={{
              fontSize: '22px',
              color: '#FFFFFF',
              margin: '0 0 6px 0',
              paddingRight: '36px',
              lineHeight: 1.2
            }}
          >
            {routeName || 'Route Street List'}
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#E5E7EB',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              {allStreets.length} total streets & roads
            </span>
            {santaStopsCount > 0 && (
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#FECACA',
                background: 'rgba(211, 28, 28, 0.3)',
                border: '1px solid rgba(211, 28, 28, 0.5)',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Star size={12} fill="currentColor" /> {santaStopsCount} Santa {santaStopsCount === 1 ? 'Stop' : 'Stops'}
              </span>
            )}
          </div>
        </div>

        {/* Live Search Input */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: '#191916'
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: accentColor,
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${allStreets.length} streets on this route...`}
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                fontSize: '14px',
                color: '#FFFFFF',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={e => e.currentTarget.style.borderColor = accentColor}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #888)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Street List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {filteredModalStreets.length > 0 ? (
            filteredModalStreets.map((street, idx) => {
              const isStop = isSantaStop(street);
              const originalIndex = allStreets.indexOf(street) + 1;
              return (
                <div
                  key={idx}
                  style={{
                    padding: isStop ? '10px 14px' : '9px 12px',
                    borderRadius: '8px',
                    background: isStop
                      ? 'linear-gradient(90deg, rgba(211, 28, 28, 0.25) 0%, rgba(211, 28, 28, 0.12) 100%)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isStop
                      ? '1px solid rgba(211, 28, 28, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: isStop ? '#FECACA' : 'rgba(255, 255, 255, 0.4)',
                      background: isStop ? 'rgba(211, 28, 28, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      flexShrink: 0
                    }}>
                      #{originalIndex}
                    </span>

                    <span style={{
                      fontSize: '14px',
                      fontWeight: isStop ? 800 : 500,
                      color: isStop ? '#FFFFFF' : '#E5E7EB',
                      wordBreak: 'break-word'
                    }}>
                      {formatStopLabel(street)}
                    </span>
                  </div>

                  {isStop && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color: '#FFFFFF',
                      backgroundColor: '#D31C1C',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      boxShadow: '0 0 10px rgba(211, 28, 28, 0.6)',
                      flexShrink: 0
                    }}>
                      Designated Stop
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: 'var(--text-muted, #888)',
              fontSize: '14px'
            }}>
              No streets or stops match "<strong>{search}</strong>".
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#191916',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #888)' }}>
            Showing {filteredModalStreets.length} of {allStreets.length} streets
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onViewMap && (
              <button
                type="button"
                onClick={() => {
                  handleCloseModal();
                  onViewMap();
                }}
                className="brand-font"
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Navigation size={13} />
                <span>View on Map</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCloseModal}
              className="brand-font"
              style={{
                padding: '7px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#000000',
                backgroundColor: accentColor,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ marginTop: '4px', marginBottom: '14px', display: 'flex', flexDirection: 'column' }}>
      {/* Pills Container (Clamped Preview) */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center'
      }}>
        {visibleStreets.map((street, idx) => {
          const isStop = isSantaStop(street);
          return (
            <span
              key={idx}
              style={{
                fontSize: '11px',
                fontWeight: isStop ? 800 : 500,
                color: isStop ? '#FFFFFF' : '#E0E0DC',
                backgroundColor: isStop ? 'rgba(211, 28, 28, 0.85)' : 'rgba(255, 255, 255, 0.06)',
                border: isStop ? '1px solid rgba(255, 120, 120, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                lineHeight: 1.3,
                boxShadow: isStop ? '0 0 10px rgba(211, 28, 28, 0.4)' : 'none'
              }}
            >
              {isStop ? <Star size={11} fill="currentColor" /> : <MapPin size={10} style={{ opacity: 0.5 }} />}
              <span>{formatStopLabel(street)}</span>
            </span>
          );
        })}

        {remainingCount > 0 && (
          <span
            onClick={handleOpenModal}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: accentColor,
              backgroundColor: 'rgba(251, 175, 51, 0.1)',
              border: '1px solid rgba(251, 175, 51, 0.25)',
              padding: '3px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              lineHeight: 1.3
            }}
          >
            +{remainingCount} more...
          </span>
        )}
      </div>

      {/* Button to open full route streets drawer */}
      {remainingCount > 0 && (
        <button
          type="button"
          onClick={handleOpenModal}
          className="brand-font"
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(251, 175, 51, 0.08)',
            color: accentColor,
            border: '1px solid rgba(251, 175, 51, 0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(251, 175, 51, 0.18)';
            e.currentTarget.style.borderColor = accentColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(251, 175, 51, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(251, 175, 51, 0.3)';
          }}
        >
          <MapPin size={13} />
          <span>View All {allStreets.length} Streets & Stops</span>
          <ChevronRight size={14} style={{ opacity: 0.7 }} />
        </button>
      )}

      {/* Portal Modal */}
      {modalMarkup}
    </div>
  );
}
