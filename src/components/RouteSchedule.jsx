import React, { useState } from 'react';
import { Search, Star, Clock, CheckCircle2, MapPin, Building2, ExternalLink } from 'lucide-react';

export default function RouteSchedule({ tableData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const routes = tableData?.routes || [];
  const streets = tableData?.streets || [];

  // Find if there is a route today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRoute = routes.find(r => r.date === todayStr);

  // Filter routes or streets based on user search
  const filteredStreets = searchQuery.trim()
    ? streets.filter(s => s.street_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <section id="routes" style={{
      padding: '40px 20px 60px 20px',
      maxWidth: '1100px',
      margin: '0 auto',
      scrollMarginTop: '80px'
    }}>
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 8px 0', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          ROUTE <span style={{ color: 'var(--primary)' }}>SCHEDULE</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
          Wondering when Santa’s visiting your area? Search your street on the interactive map below to see when the magic is arriving!
        </p>
      </div>

      {/* Address Spatial Lookup Map (from GitHub address.html) */}
      <div style={{
        maxWidth: '960px',
        margin: '0 auto 48px auto',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: '8px',
        borderRadius: '24px',
        border: '1px solid rgba(211, 28, 28, 0.3)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        <iframe
          src={`/address.html?table=${tableData?.table?.slug || 'beverley'}`}
          title="Santa Address & Street Lookup"
          style={{
            width: '100%',
            height: '640px',
            border: 'none',
            borderRadius: '20px',
            backgroundColor: '#151513',
            display: 'block'
          }}
          allow="geolocation"
          loading="lazy"
        />
      </div>

      {/* Street Search Filter */}
      <div style={{
        maxWidth: '650px',
        margin: '0 auto 40px auto',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#151513',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px 18px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
          transition: 'border-color 0.2s'
        }}>
          <Search size={22} color="var(--primary)" style={{ flexShrink: 0, marginRight: '12px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your street (e.g. Lawless Lane, New Road)..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px'
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Street Search Results Dropdown */}
        {searchQuery.trim() && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: '#151513',
            border: '1px solid var(--primary)',
            borderRadius: '12px',
            padding: '14px',
            zIndex: 100,
            boxShadow: '0 12px 30px rgba(0,0,0,0.8)'
          }}>
            {filteredStreets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredStreets.map(st => {
                  const parentRoute = routes.find(r => r.id === st.route_id);
                  return (
                    <div key={st.id} style={{
                      padding: '10px',
                      background: 'rgba(251, 175, 51, 0.08)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '16px' }}>📍 {st.street_name}</strong>
                        <div style={{ fontSize: '13px', color: 'var(--primary)' }}>
                          Route: {parentRoute?.name || 'Scheduled Route'}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>
                        <div>{parentRoute?.date ? new Date(parentRoute.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date TBA'}</div>
                        <div>{parentRoute?.start_time ? `Start: ${parentRoute.start_time}` : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No direct matches found for "{searchQuery}". Check the route list below or ask our AI Sleigh Elf!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tonight's Route Spotlight (if active today) */}
      {todayRoute && (
        <div style={{
          background: '#151513',
          border: '2px solid var(--primary)',
          borderRadius: '16px',
          padding: '28px 32px',
          marginBottom: '35px',
          boxShadow: '0 0 30px rgba(251, 175, 51, 0.25), 0 10px 30px rgba(0, 0, 0, 0.6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--primary)',
              color: '#000',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: '20px',
              marginBottom: '10px'
            }}>
              <Star size={14} fill="currentColor" />
              TONIGHT'S ROUTE
            </div>

            <div style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase' }}>
              {new Date(todayRoute.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {todayRoute.start_time && ` • ${todayRoute.start_time} - ${todayRoute.end_time || '20:30'}`}
            </div>

            <h3 className="brand-font" style={{ fontSize: '32px', margin: '6px 0 14px 0' }}>
              {todayRoute.name}
            </h3>

            {/* Streets */}
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              <strong>Streets on route:</strong>{' '}
              {streets.filter(s => s.route_id === todayRoute.id).map(s => s.street_name).join(', ') || 'See live map for details'}
            </div>
          </div>

          {/* Sponsor Box if available */}
          {todayRoute.sponsor_name && (
            <div style={{
              background: 'rgba(251, 175, 51, 0.08)',
              border: '1px solid var(--primary)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                ⭐ TONIGHT'S SPONSOR:
              </div>
              <strong style={{ fontSize: '18px', color: '#fff' }}>{todayRoute.sponsor_name}</strong>
              {todayRoute.sponsor_description && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
                  {todayRoute.sponsor_description}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Routes Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {routes.map(r => {
          const routeStreets = streets.filter(s => s.route_id === r.id);
          const isPast = r.date && new Date(r.date) < new Date(todayStr);

          return (
            <div key={r.id} style={{
              background: '#151513',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              opacity: isPast ? 0.6 : 1,
              transition: 'transform 0.2s, border-color 0.2s'
            }}>
              {/* Date & Time */}
              <div style={{
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {isPast && <CheckCircle2 size={16} color="#22c55e" />}
                <span>
                  {r.date ? new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBA'}
                  {r.start_time && ` • ${r.start_time} - ${r.end_time || '20:30'}`}
                </span>
              </div>

              {/* Route Title */}
              <h3 className="brand-font" style={{ fontSize: '24px', margin: '0 0 12px 0' }}>
                {r.name}
              </h3>

              {/* Street list */}
              <div style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                marginBottom: '16px',
                flex: 1
              }}>
                {routeStreets.length > 0 ? (
                  routeStreets.map(s => s.street_name).join(', ')
                ) : (
                  <span>Full street list publishing soon.</span>
                )}
              </div>

              {/* Sponsor Box */}
              {r.sponsor_name && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: '12px',
                  marginTop: 'auto',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--primary)'
                }}>
                  <Building2 size={16} />
                  <span>Sponsored by <strong>{r.sponsor_name}</strong></span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
