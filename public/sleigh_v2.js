/* ==========================================================================
   TurboSanta V2 — Ground-Up Public Sleigh Runtime
   Zero-Iframe-Soup Interactive GPX Radar, 0ms Street Search, Adaptive Impact
   ========================================================================== */
(function () {
  'use strict';

  const API_ORIGIN = 'https://turbosanta-api.beverley247.workers.dev';
  const DEFAULT_RICH_TABLE = 'stockton';

  function isGiftAidEnabled(tbl = state.payload?.table) {
    if (!tbl) return false;
    const val = tbl.enable_gift_aid;
    return val === true || val === 1 || val === '1' || val === 'true';
  }

  const PUBLIC_FEATURE_CATALOG = {
    bingo: {
      id: 'bingo',
      anchorId: 'bingo',
      navLabel: 'Bingo',
      badge: 'Interactive Family Game',
      title: 'CHRISTMAS',
      titleHighlight: 'BINGO',
      description: 'Play along with interactive digital Christmas Bingo while you wait for Santa to visit your street!',
      embedSrc: slug => `/bingo.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/bingo.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Play Bingo Full-Screen',
      height: 720,
      maxWidth: 900
    },
    colouring: {
      id: 'colouring',
      anchorId: 'colouring',
      navLabel: 'Colouring',
      badge: 'Printable Lapland Studio',
      title: 'FESTIVE',
      titleHighlight: 'COLOURING BOOK',
      description: "Personalise and print free Santa Sleigh colouring sheets at home on A4 paper! Add your child's name and share their artwork with our sleigh volunteers!",
      embedSrc: slug => `/colouring_page.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/colouring_page.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Colouring Studio Full-Screen',
      height: 800,
      maxWidth: 1000
    },
    countdown: {
      id: 'countdown',
      anchorId: 'countdown',
      navLabel: 'Countdown',
      badge: 'Lapland Departure Clock',
      title: 'CHRISTMAS EVE',
      titleHighlight: 'COUNTDOWN',
      description: "Watch the live countdown tick away to Santa's big departure from Lapland on Christmas Eve!",
      embedSrc: slug => `/countdown.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/countdown.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'View Countdown Full-Screen',
      height: 420,
      maxWidth: 840
    },
    door_hanger: {
      id: 'door_hanger',
      anchorId: 'door-hanger',
      navLabel: 'Door Hanger',
      badge: 'Printable Sleigh Alert',
      title: 'OFFICIAL',
      titleHighlight: 'DOOR HANGER',
      description: 'Customise and print festive Santa Sleigh door hangers for your front door with live tracking QR code so Santa knows to stop!',
      embedSrc: slug => `/door_hanger.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/door_hanger.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Door Hanger Full-Screen',
      height: 740,
      maxWidth: 840
    },
    elf_cam: {
      id: 'elf_cam',
      anchorId: 'elf-cam',
      navLabel: 'Elf Cam',
      badge: 'Live from Lapland Workshop',
      title: 'LAPLAND',
      titleHighlight: 'ELF CAM',
      description: "Tune in directly to Santa's Workshop in Lapland! See elf packing status, current Rovaniemi weather, and live sleigh camera telemetry.",
      embedSrc: slug => `/elf_cam.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/elf_cam.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Elf Cam Full-Screen',
      height: 680,
      maxWidth: 840
    },
    letter: {
      id: 'letter',
      anchorId: 'letter',
      navLabel: 'Letter to Santa',
      badge: 'Official Lapland Post',
      title: 'LETTER TO',
      titleHighlight: 'SANTA',
      description: 'Children can write their Christmas wish list on official Round Table festive stationery and print it out to send directly to Lapland!',
      embedSrc: slug => `/letter.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/letter.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Write Letter Full-Screen',
      height: 760,
      maxWidth: 900
    },
    magic_mailbox: {
      id: 'magic_mailbox',
      anchorId: 'magic-mailbox',
      navLabel: 'Magic Mailbox',
      badge: 'Direct Audio Line to Santa',
      title: 'MAGIC LAPLAND',
      titleHighlight: 'MAILBOX',
      description: "Record and post your digital voice messages and festive questions directly to Santa's elves in Lapland.",
      embedSrc: slug => `/magic_mailbox.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => (typeof window !== 'undefined' && window.location.hostname.includes('roundtablesantasleigh.co.uk')) ? `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/magic_mailbox` : `/magic_mailbox.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Magic Mailbox Full-Screen',
      height: 700,
      maxWidth: 840,
      allowMicrophone: true
    },
    nice_list: {
      id: 'nice_list',
      anchorId: 'nice-list',
      navLabel: 'Nice List',
      badge: 'Lapland Certified',
      title: 'OFFICIAL',
      titleHighlight: 'NICE LIST CERTIFICATE',
      description: "Customise and print an official Lapland certificate certifying that your child has officially made Santa's Good List this Christmas.",
      embedSrc: slug => `/nice_list.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/nice_list.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Generate Certificate Full-Screen',
      height: 740,
      maxWidth: 900
    },
    adopt_reindeer: {
      id: 'adopt_reindeer',
      anchorId: 'adopt-reindeer',
      navLabel: 'Adopt Reindeer',
      badge: 'Official Sleigh Keeper',
      title: 'ADOPT A',
      titleHighlight: 'SLEIGH REINDEER',
      description: "Adopt one of Santa's flying reindeer, choose your keeper name, and print your official Round Table adoption certificate!",
      embedSrc: slug => `/adopt_reindeer.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/adopt_reindeer.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Adopt a Reindeer Full-Screen',
      height: 740,
      maxWidth: 900
    },
    santa_bot: {
      id: 'santa_bot',
      anchorId: 'santa-bot',
      navLabel: 'Talk to Santa',
      badge: 'Lapland Live AI Hotline',
      title: 'TALK TO',
      titleHighlight: 'SANTA',
      description: "Children and families can message Santa directly in Lapland! Ask when he is visiting your street, how Rudolph is doing, or hear a jolly festive story.",
      embedSrc: slug => `/santa_bot.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/santa_bot.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Santa AI Chat Full-Screen',
      height: 720,
      maxWidth: 820,
      allowMicrophone: true
    },
    santa_chat: {
      id: 'santa_chat',
      anchorId: 'santa-chat',
      navLabel: 'Talk to Santa',
      badge: 'Live Audio Connection to Lapland',
      title: 'TALK TO',
      titleHighlight: 'SANTA LIVE',
      description: 'Children and families can speak directly with Santa in Lapland on the live festive telephone hotline!',
      embedSrc: slug => {
        const origin = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? location.origin : 'https://roundtablesantasleigh.co.uk';
        return `${origin}/santa_chat.html?table=${encodeURIComponent(slug)}`;
      },
      fullscreenSrc: slug => {
        const origin = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? location.origin : 'https://roundtablesantasleigh.co.uk';
        return `${origin}/santa_chat.html?table=${encodeURIComponent(slug)}`;
      },
      fullscreenLabel: 'Open Voice Hotline Full-Screen',
      height: 680,
      maxWidth: 760,
      allowMicrophone: true
    },
    santa_frame: {
      id: 'santa_frame',
      anchorId: 'santa-frame',
      navLabel: 'Santa Visited',
      badge: 'Memory Photo Stamper',
      title: 'SANTA VISITED',
      titleHighlight: 'PHOTO FRAME',
      description: 'Upload a festive family photo to stamp it with our official Santa Visited commemorative frame and date stamp.',
      embedSrc: slug => `/santa_frame.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/santa_frame.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Photo Frame Full-Screen',
      height: 720,
      maxWidth: 840
    },
    santa_studio: {
      id: 'santa_studio',
      anchorId: 'santa-studio',
      navLabel: 'Santa Studio',
      badge: 'Workshop Voice Booth',
      title: 'SANTA',
      titleHighlight: 'AUDIO STUDIO',
      description: 'Festive voice recording and reply booth for volunteers and families to exchange holiday cheer.',
      embedSrc: slug => `/santa_studio.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/santa_studio.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Audio Studio Full-Screen',
      height: 740,
      maxWidth: 840,
      allowMicrophone: true
    },
    snowman: {
      id: 'snowman',
      anchorId: 'snowman-builder',
      navLabel: 'Snowman Maker',
      badge: 'Interactive Winter Builder',
      title: 'SNOWMAN',
      titleHighlight: 'CREATOR STUDIO',
      description: 'Customise and build your own snowman with hats, scarves, jumpers, and mittens to download and share with family!',
      embedSrc: slug => `/snowman.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/snowman.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Open Snowman Maker Full-Screen',
      height: 720,
      maxWidth: 900
    },
    spot_santa: {
      id: 'spot_santa',
      anchorId: 'spot-santa',
      navLabel: 'Spot Santa',
      badge: 'Community Sightings',
      title: 'SPOT',
      titleHighlight: 'SANTA SIGHTINGS',
      description: 'Snap a photo of Santa passing down your street and pin your sighting to our community map!',
      embedSrc: slug => `/spot_santa_form.html?table=${encodeURIComponent(slug)}`,
      fullscreenSrc: slug => `/spot_santa_form.html?table=${encodeURIComponent(slug)}`,
      fullscreenLabel: 'Submit Sighting Full-Screen',
      height: 700,
      maxWidth: 600
    }
  };
  PUBLIC_FEATURE_CATALOG.santa_studio = PUBLIC_FEATURE_CATALOG.santa_bot;

  // --- Application State ---
  const state = {
    slug: resolveInitialSlug(),
    simMode: 'auto', // 'auto' | 'live' | 'rain'
    payload: null,
    routes: [],
    streetsByRoute: new Map(), // routeId -> [streetName]
    allStreetRecords: [],      // [{ street, route, lat, lng }]
    selectedRouteId: null,
    expandedRouteStreets: new Set(),
    routeFilterTab: 'upcoming',
    routeFilterQuery: '',
    selectedTierAmount: 5,
    alertCoords: null,
    countdownTimer: null,
    cheerMessages: [],
    cheerIndex: 0,
    audioEl: null,
    isMusicPlaying: false
  };

  function resolveInitialSlug() {
    const rawSearch = window.location.search || '';
    const m = /[?&]table=([^&#]+)/i.exec(rawSearch);
    if (m && m[1]) {
      return decodeURIComponent(m[1]).trim().toLowerCase();
    }
    const host = (window.location.hostname || '').toLowerCase();
    if (host.endsWith('.roundtablesantasleigh.co.uk')) {
      const sub = host.replace('.roundtablesantasleigh.co.uk', '').split('.')[0];
      if (sub && !['www', 'admin', 'national', 'turbosanta', 'santa', 'demo'].includes(sub)) {
        return sub;
      }
    }
    if (window.__sleighTableSlug && window.__sleighTableSlug !== 'national') {
      return String(window.__sleighTableSlug).toLowerCase();
    }
    return DEFAULT_RICH_TABLE;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseHexRgb(v) {
    if (typeof v !== 'string') return null;
    const hex = /^#([0-9a-f]{3,8})$/i.exec(v.trim());
    if (!hex) return null;
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length < 6) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function readableTextOn(rgb) {
    if (!rgb) return '#090a0d';
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    return ((L + 0.05) / 0.05) >= (1.05 / (L + 0.05)) ? '#090a0d' : '#ffffff';
  }

  function applyBrandTheme(table) {
    const root = document.documentElement;
    const pRgb = parseHexRgb(table.primary_color) || [251, 175, 51];
    const aRgb = parseHexRgb(table.accent_color) || [211, 28, 28];
    const primaryHex = parseHexRgb(table.primary_color) ? table.primary_color.trim() : '#FBAF33';
    const accentHex = parseHexRgb(table.accent_color) ? table.accent_color.trim() : '#D31C1C';

    root.style.setProperty('--primary', primaryHex);
    root.style.setProperty('--primary-rgb', pRgb.join(', '));
    root.style.setProperty('--on-primary', readableTextOn(pRgb));
    root.style.setProperty('--accent', accentHex);
    root.style.setProperty('--accent-rgb', aRgb.join(', '));

    let customStyle = document.getElementById('v2-tenant-custom-css');
    if (table.custom_css && String(table.custom_css).trim()) {
      if (!customStyle) {
        customStyle = document.createElement('style');
        customStyle.id = 'v2-tenant-custom-css';
        document.head.appendChild(customStyle);
      }
      customStyle.textContent = table.custom_css;
    } else if (customStyle) {
      customStyle.remove();
    }
  }

  function extractTownName(table, slug) {
    const raw = table?.sleigh_display_name || table?.name || slug || 'Community';
    let cleaned = raw
      .replace(/round\s*table/gi, '')
      .replace(/santa'?s?\s*sleigh/gi, '')
      .replace(/\b\d+\b/g, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (!cleaned) cleaned = String(slug || 'Community');

    const overrides = {
      'knowleanddorridge': 'Knowle and Dorridge',
      'knowle-and-dorridge': 'Knowle and Dorridge',
      'knowle-dorridge': 'Knowle and Dorridge',
      'isleofwight': 'Isle of Wight',
      'meltonmowbray': 'Melton Mowbray'
    };
    const lowerKey = cleaned.toLowerCase().replace(/[-_\s]+/g, '');
    if (overrides[lowerKey]) return overrides[lowerKey];

    // Generic 'and' detector: splits compound words containing 'and' e.g. knowleanddorridge -> Knowle and Dorridge
    cleaned = cleaned.replace(/([a-z]{2,})and([a-z]{2,})/gi, (match, p1, p2) => {
      const w1 = p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase();
      const w2 = p2.charAt(0).toUpperCase() + p2.slice(1).toLowerCase();
      return `${w1} and ${w2}`;
    });

    return cleaned
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((w, idx) => (idx > 0 && w.toLowerCase() === 'and') ? 'and' : (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(' ') || 'Community';
  }

  function parseLocalRouteDate(dateStr) {
    if (!dateStr) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr).trim());
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function todayMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function isRoutePostponed(route, idx) {
    if (state.simMode === 'rain' && idx === 0) return true;
    const st = String(route.status_override || route.status || '').toLowerCase();
    return st.includes('postponed') || st.includes('cancelled') || st.includes('rain');
  }

  function isRouteLive(route, idx) {
    if (state.simMode === 'live' && idx === 0) return true;
    if (state.simMode === 'rain' && idx === 0) return false;
    const st = String(route.status_override || route.status || '').toLowerCase();
    return st === 'in progress' || st === 'live' || st === 'active';
  }

  function isRouteToday(route) {
    const d = parseLocalRouteDate(route.date);
    if (!d) return false;
    const t = todayMidnight();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  function isRouteCompleted(route, idx) {
    if (isRouteLive(route, idx) || isRoutePostponed(route, idx)) return false;
    const st = String(route.status || '').toLowerCase();
    if (st === 'completed') return true;
    const d = parseLocalRouteDate(route.date);
    if (!d) return false;
    return d.getTime() < todayMidnight().getTime();
  }

  function getRouteSponsors(route) {
    if (!route) return [];
    const list = [];
    if (Array.isArray(route.sponsors) && route.sponsors.length > 0) {
      route.sponsors.forEach(s => {
        if (s && (s.name || s.sponsor_name || s.logo_url || s.sponsor_logo || s.sponsor_logo_url)) {
          list.push({
            name: (s.name || s.sponsor_name || 'Route Sponsor').trim(),
            logo: (s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '').trim(),
            url: (s.link || s.sponsor_link || s.url || '').trim()
          });
        }
      });
      if (list.length > 0) return list;
    }
    if (route.sponsors_json) {
      try {
        const parsed = typeof route.sponsors_json === 'string' ? JSON.parse(route.sponsors_json) : route.sponsors_json;
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(s => {
            if (s && (s.name || s.sponsor_name || s.logo_url || s.sponsor_logo || s.sponsor_logo_url)) {
              list.push({
                name: (s.name || s.sponsor_name || 'Route Sponsor').trim(),
                logo: (s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '').trim(),
                url: (s.link || s.sponsor_link || s.url || '').trim()
              });
            }
          });
          if (list.length > 0) return list;
        }
      } catch (e) {}
    }
    if (route.notes) {
      try {
        const match = route.notes.match(/<!--\s*SPONSORS_DATA:\s*(\[.*?\])\s*-->/s) ||
                      route.notes.match(/\[SPONSORS_JSON:\s*(\[.*?\])\s*\]/s);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach(s => {
              if (s && (s.name || s.sponsor_name || s.logo_url || s.sponsor_logo || s.sponsor_logo_url)) {
                list.push({
                  name: (s.name || s.sponsor_name || 'Route Sponsor').trim(),
                  logo: (s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '').trim(),
                  url: (s.link || s.sponsor_link || s.url || '').trim()
                });
              }
            });
            if (list.length > 0) return list;
          }
        }
      } catch (e) {}
    }
    if (route.sponsor_name || route.sponsor_logo_url || route.sponsor_logo) {
      list.push({
        name: (route.sponsor_name || 'Official Route Sponsor').trim(),
        logo: (route.sponsor_logo_url || route.sponsor_logo || '').trim(),
        url: (route.sponsor_link || '').trim()
      });
    }
    return list;
  }

  function buildSubdomainToolUrl(toolPath) {
    const host = (window.location.hostname || '').toLowerCase();
    const cleanPath = toolPath.startsWith('/') ? toolPath : `/${toolPath}`;
    if (host.endsWith('.roundtablesantasleigh.co.uk')) {
      return `https://${encodeURIComponent(state.slug)}.roundtablesantasleigh.co.uk${cleanPath}`;
    }
    const sep = cleanPath.includes('?') ? '&' : '?';
    return `${cleanPath}${sep}table=${encodeURIComponent(state.slug)}`;
  }

  // --- Embedded Live Widgets: Genuine Tracker Radar & Spatial Address Lookup ---
  function prettyTrackerUrl(slug) {
    const s = slug || state.slug;
    const host = (window.location.hostname || '').toLowerCase();
    const domain = 'roundtablesantasleigh.co.uk';
    if (host.endsWith('.' + domain)) {
      return `${window.location.protocol}//${s}.${domain}/tracker`;
    }
    return `/tracker.html?table=${encodeURIComponent(s)}`;
  }

  function prettyAddressesUrl(slug) {
    const s = slug || state.slug;
    const host = (window.location.hostname || '').toLowerCase();
    const domain = 'roundtablesantasleigh.co.uk';
    if (host.endsWith('.' + domain)) {
      return `${window.location.protocol}//${s}.${domain}/address`;
    }
    return `/address.html?table=${encodeURIComponent(s)}`;
  }

  function frameUrl(page, api, slug) {
    const s = slug || state.slug;
    const file = page.endsWith('.html') ? page : `${page}.html`;
    let url = `/${file}?table=${encodeURIComponent(s)}`;
    if (api) {
      url = `/${file}?api=${encodeURIComponent(api)}&proxy=${encodeURIComponent('https://turbosanta-api.beverley247.workers.dev/?target=' + encodeURIComponent(api))}`;
    }
    if (file === 'tracker.html') {
      if (state.simMode === 'live') {
        url += '&demo=1';
      }
      const shareBase = prettyTrackerUrl(s);
      if (shareBase) url += '&shareBase=' + encodeURIComponent(shareBase);
    } else if (file === 'address.html') {
      const shareBase = prettyAddressesUrl(s);
      if (shareBase) url += '&shareBase=' + encodeURIComponent(shareBase);
    }
    return url;
  }

  function renderFrames(slug) {
    const s = slug || state.slug;
    const trackerIframe = document.getElementById('tracker-iframe');
    const addressIframe = document.getElementById('address-iframe');
    const fsLink = document.getElementById('tracker-fullscreen');

    const trackerUrl = frameUrl('tracker.html', null, s);
    const addressUrl = frameUrl('address.html', null, s);

    if (trackerIframe && trackerIframe.getAttribute('src') !== trackerUrl) {
      trackerIframe.src = trackerUrl;
    }
    if (addressIframe && addressIframe.getAttribute('src') !== addressUrl) {
      addressIframe.src = addressUrl;
    }
    if (fsLink) {
      fsLink.href = prettyTrackerUrl(s);
    }
  }

  let frameMessageBound = false;
  function bindFrameMessages() {
    if (frameMessageBound) return;
    frameMessageBound = true;

    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;

      // 1. Forward confirmed house pin from address-iframe to tracker-iframe
      if (e.data.type === 'turbosanta-pin-saved' && e.data.pin) {
        const trackerIframe = document.getElementById('tracker-iframe');
        if (trackerIframe && trackerIframe.contentWindow) {
          try {
            trackerIframe.contentWindow.postMessage(e.data, '*');
          } catch (_) {}
        }
        return;
      }

      // 2. Smoothly scroll to routes/streets when requested by iframe button
      if (e.data.type === 'turbosanta-scroll-to-routes') {
        const target = document.getElementById('streets') || document.getElementById('routes');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      // 3. Dynamic auto-resizing of iframes based on their content height
      const rawH = e.data.height || e.data.frameHeight || e.data.routesHeight || e.data.letterHeight || e.data.niceListHeight || e.data.santasBeenHeight || e.data.snowmanFrameHeight || e.data.addressLookupHeight;
      if (typeof rawH === 'number' && rawH > 60) {
        const targetH = Math.min(Math.max(Math.round(rawH), 320), 1200);
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          if (iframes[i].contentWindow === e.source) {
            const currentH = parseInt(iframes[i].style.height, 10) || iframes[i].offsetHeight || 0;
            if (Math.abs(currentH - targetH) < 16) break;
            iframes[i].style.height = targetH + 'px';
            iframes[i].setAttribute('height', targetH);
            break;
          }
        }
      }
    });
  }

  function selectRouteAndFocus(routeId, scrollMapIntoView = false) {
    state.selectedRouteId = routeId ? String(routeId) : null;
    const cards = document.querySelectorAll('[data-route-card]');
    cards.forEach(c => {
      const match = routeId && c.getAttribute('data-route-card') === String(routeId);
      c.classList.toggle('is-selected', Boolean(match));
    });

    if (scrollMapIntoView) {
      const trackerSec = document.getElementById('tracker');
      if (trackerSec) {
        trackerSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    const trackerIframe = document.getElementById('tracker-iframe');
    if (trackerIframe && trackerIframe.contentWindow && routeId) {
      try {
        trackerIframe.contentWindow.postMessage({
          type: 'turbosanta-select-route',
          routeId: String(routeId)
        }, '*');
      } catch (_) {}
    }
  }

  function rebuildStreetSearchIndex() {
    state.streetsByRoute.clear();
    state.allStreetRecords = [];

    const rawStreets = state.payload?.streets || [];
    const routeById = new Map(state.routes.map(r => [String(r.id), r]));

    rawStreets.forEach(s => {
      const rId = String(s.route_id || '');
      const name = String(s.street_name || s.name || '').trim();
      if (!name) return;
      if (!state.streetsByRoute.has(rId)) state.streetsByRoute.set(rId, []);
      const arr = state.streetsByRoute.get(rId);
      if (!arr.some(existing => existing.toLowerCase() === name.toLowerCase())) {
        arr.push(name);
        const route = routeById.get(rId);
        if (route) {
          state.allStreetRecords.push({ street: name, route, lat: s.lat || null, lng: s.lng || null });
        }
      }
    });
  }

  function isLikelyUkPostcode(q) {
    return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(String(q || '').trim());
  }

  // --- Date & Calendar Formatting ---
  function formatFriendlyDate(dateStr) {
    const d = parseLocalRouteDate(dateStr);
    if (!d) return 'Date TBC';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function findNextUpcomingRoute() {
    const nowMid = todayMidnight().getTime();
    const upcoming = state.routes
      .map(r => ({ r, d: parseLocalRouteDate(r.date) }))
      .filter(x => x.d && x.d.getTime() >= nowMid)
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    return upcoming[0]?.r || state.routes[0] || null;
  }

  function downloadRouteIcs(route) {
    const d = parseLocalRouteDate(route.date);
    if (!d) return;
    const [sh, sm] = String(route.start_time || '18:00').split(':').map(n => parseInt(n, 10) || 0);
    const [eh, em] = String(route.end_time || '20:30').split(':').map(n => parseInt(n, 10) || 0);

    const pad = n => String(n).padStart(2, '0');
    const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const dtStart = `${ymd}T${pad(sh)}${pad(sm)}00`;
    const dtEnd = `${ymd}T${pad(eh)}${pad(em)}00`;
    const sleighName = state.payload?.table?.sleigh_display_name || 'Round Table Santa Sleigh';
    const streets = (state.streetsByRoute.get(String(route.id)) || []).slice(0, 20).join(', ');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TurboSanta//Round Table Santa Sleigh//EN',
      'BEGIN:VEVENT',
      `UID:sleigh-${route.id}@roundtablesantasleigh.co.uk`,
      `DTSTAMP:${ymd}T120000Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:🎅 ${sleighName} — ${route.name}`,
      `DESCRIPTION:Santa visits ${route.name}! Track live at https://${state.slug}.roundtablesantasleigh.co.uk . Streets: ${streets}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Santa_Sleigh_${String(route.name || 'Route').replace(/[^a-z0-9]+/gi, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // --- UI Renderers ---
  function renderHeaderAndHero() {
    const table = state.payload?.table || {};
    const town = extractTownName(table, state.slug);
    let displayName = table.sleigh_display_name || table.name || `${town} Round Table Santa Sleigh`;
    displayName = displayName.replace(/([a-z]{2,})and([a-z]{2,})/gi, (match, p1, p2) => {
      const w1 = p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase();
      const w2 = p2.charAt(0).toUpperCase() + p2.slice(1).toLowerCase();
      return `${w1} and ${w2}`;
    });

    document.title = `${displayName} — Live Radar & Street Schedule`;
    const logoEl = document.getElementById('header-logo');
    if (logoEl) {
      logoEl.src = table.logo_url || '/icons/RTBI_Santa.png';
      logoEl.onerror = () => { logoEl.src = '/icons/RTBI_Santa.png'; };
    }
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = displayName;
    const headerKicker = document.getElementById('header-kicker');
    if (headerKicker) headerKicker.textContent = table.table_number ? `Round Table #${table.table_number}` : 'Official Community Sleigh';

    const heroTown = document.getElementById('hero-town-hl');
    if (heroTown) heroTown.textContent = town;

    const heroDonateLbl = document.getElementById('hero-donate-label') || document.querySelector('#hero-donate-cta span');
    if (heroDonateLbl) {
      heroDonateLbl.textContent = isGiftAidEnabled(table) ? 'Donate (+25% Gift Aid)' : 'Donate Online';
    }

    // Announcement Banner
    const strip = document.getElementById('announcement-strip');
    if (strip) {
      if (state.simMode === 'rain') {
        const rName = state.routes[0]?.name || 'Tonight’s Route';
        strip.textContent = `🌧️ WEATHER UPDATE: ${rName} has been postponed due to high winds & heavy rain. New rain-check date will be announced shortly!`;
        strip.className = 'announcement-strip visible is-urgent';
      } else if (table.live_announcement && String(table.live_announcement).trim()) {
        const msg = String(table.live_announcement).trim();
        const urgent = /postponed|cancel|weather|warning|rain|ice/i.test(msg);
        strip.textContent = msg;
        strip.className = `announcement-strip visible${urgent ? ' is-urgent' : ''}`;
      } else {
        strip.className = 'announcement-strip';
      }
    }

    // Status & Countdown Pill
    const badge = document.getElementById('hero-status-badge');
    const badgeText = document.getElementById('hero-status-text');
    const cdChip = document.getElementById('hero-countdown-chip');
    const cdText = document.getElementById('hero-countdown-text');

    clearInterval(state.countdownTimer);
    const liveNow = state.simMode === 'live' || Boolean(state.payload?.live_sleigh?.is_fresh) || state.routes.some((r, i) => isRouteLive(r, i));

    if (state.simMode === 'rain') {
      badge.className = 'live-status-badge is-postponed';
      badgeText.textContent = `Rain-Check: ${state.routes[0]?.name || 'Route'} Postponed`;
      if (cdChip) cdChip.style.display = 'none';
    } else if (liveNow) {
      const activeR = state.routes.find((r, i) => isRouteLive(r, i)) || state.routes[0];
      badge.className = 'live-status-badge is-live';
      badgeText.textContent = `LIVE NOW: ${activeR ? activeR.name : 'Santa Is On The Streets!'}`;
      if (cdChip) {
        cdChip.style.display = 'inline-flex';
        cdText.textContent = 'Live GPS Radar Active';
      }
    } else {
      badge.className = 'live-status-badge';
      const nextR = findNextUpcomingRoute();
      if (nextR) {
        const todayMatch = isRouteToday(nextR);
        badgeText.textContent = todayMatch
          ? `Tonight: ${nextR.name} (${nextR.start_time || '18:00'})`
          : `Next Sleigh Night: ${formatFriendlyDate(nextR.date)} — ${nextR.name}`;
        startNextRouteCountdown(nextR, cdChip, cdText);
      } else {
        badgeText.textContent = `${town} Sleigh Season Hub`;
        if (cdChip) cdChip.style.display = 'none';
      }
    }

    // Fullscreen tracker & crew links
    const fsLink = document.getElementById('tracker-fullscreen');
    if (fsLink) fsLink.href = prettyTrackerUrl(state.slug);
    const crewLink = document.getElementById('volunteer-crew-link');
    if (crewLink) crewLink.href = buildSubdomainToolUrl('/crew');
    const gaOnlyLink = document.getElementById('impact-giftaid-only-btn');
    if (gaOnlyLink) gaOnlyLink.href = buildSubdomainToolUrl('/giftaid');

    // Footer & Socials
    const clubHeading = document.getElementById('footer-club-heading');
    if (clubHeading) clubHeading.textContent = `${town.toUpperCase()} ROUND TABLE`;
    const copyName = document.getElementById('copyright-name');
    if (copyName) copyName.textContent = displayName;
    const copyYear = document.getElementById('copyright-year');
    if (copyYear) copyYear.textContent = String(new Date().getFullYear());

    const socialsWrap = document.getElementById('footer-social-pills');
    if (socialsWrap) {
      const links = [
        table.facebook_url && { href: table.facebook_url, icon: 'fa-brands fa-facebook', label: 'Facebook' },
        table.instagram_url && { href: table.instagram_url, icon: 'fa-brands fa-instagram', label: 'Instagram' },
        table.tiktok_url && { href: table.tiktok_url, icon: 'fa-brands fa-tiktok', label: 'TikTok' },
        table.website_url && { href: table.website_url, icon: 'fa-solid fa-globe', label: 'Club Website' }
      ].filter(Boolean);

      socialsWrap.innerHTML = links.map(l => `
        <a href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer" class="btn-glass btn-sm">
          <i class="${l.icon}" style="color:var(--primary);"></i>
          <span>${escapeHtml(l.label)}</span>
        </a>
      `).join('');
    }

    // Compare V1 link in Test Lab
    const v1Link = document.getElementById('lab-compare-v1');
    if (v1Link) v1Link.href = `/santasleigh.html?table=${encodeURIComponent(state.slug)}`;
  }

  function startNextRouteCountdown(route, chipEl, textEl) {
    if (!chipEl || !textEl || !route?.date) return;
    const d = parseLocalRouteDate(route.date);
    if (!d) {
      chipEl.style.display = 'none';
      return;
    }
    const [sh, sm] = String(route.start_time || '18:00').split(':').map(n => parseInt(n, 10) || 0);
    const targetMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm, 0).getTime();

    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        chipEl.style.display = 'none';
        return;
      }
      chipEl.style.display = 'inline-flex';
      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      textEl.textContent = days > 0
        ? `Departs in ${days}d ${hrs}h ${mins}m`
        : `Departs in ${hrs}h ${mins}m`;
    };
    tick();
    state.countdownTimer = setInterval(tick, 30000);
  }

  function renderHeroMetrics() {
    const routesEl = document.getElementById('metric-routes');
    const streetsEl = document.getElementById('metric-streets');
    const localEl = document.getElementById('metric-local');
    if (routesEl) routesEl.textContent = String(state.routes.length || 0);
    if (streetsEl) streetsEl.textContent = String(state.allStreetRecords.length || (state.payload?.streets?.length || 0));

    const partnersCount = (state.payload?.partners?.length || 0);
    const grantsCount = (state.payload?.approved_grants?.length || 0);
    if (localEl) {
      localEl.textContent = (partnersCount + grantsCount) > 0 ? '100%' : '100%';
    }
  }

  function renderRoutesGrid() {
    const grid = document.getElementById('routes-bento-grid');
    const countSpan = document.getElementById('all-routes-count');
    if (countSpan) countSpan.textContent = String(state.routes.length);
    if (!grid) return;

    if (state.routes.length === 0) {
      grid.innerHTML = `
        <div class="glass-bento-card" style="grid-column: 1 / -1; text-align:center; padding:42px 24px;">
          <div style="font-size:34px;">🛷</div>
          <h3 style="font-size:20px;">Routes Being Finalised By Our Elves</h3>
          <p style="font-size:14px; color:var(--text-secondary); max-width:480px; margin:0 auto;">
            Our volunteer route planners are putting the finishing touches on this year’s sleigh dates. Register for a free Doorstep Alert above to be notified first!
          </p>
        </div>
      `;
      return;
    }

    const q = state.routeFilterQuery.trim().toLowerCase();

    // Smart auto-fallback: if 'upcoming' has 0 routes (e.g. off-season dates), show all
    const hasAnyUpcoming = state.routes.some((r, idx) => !isRouteCompleted(r, idx));
    const effectiveTab = (state.routeFilterTab === 'upcoming' && !hasAnyUpcoming) ? 'all' : state.routeFilterTab;

    const visibleRoutes = state.routes.filter((route, idx) => {
      if (effectiveTab === 'upcoming' && isRouteCompleted(route, idx)) return false;
      if (!q) return true;
      const streets = state.streetsByRoute.get(String(route.id)) || [];
      const sponsors = getRouteSponsors(route);
      return (
        String(route.name || '').toLowerCase().includes(q) ||
        String(route.date || '').toLowerCase().includes(q) ||
        streets.some(s => s.toLowerCase().includes(q)) ||
        sponsors.some(sp => sp.name.toLowerCase().includes(q))
      );
    });

    if (visibleRoutes.length === 0) {
      grid.innerHTML = `
        <div class="glass-bento-card" style="grid-column: 1 / -1; text-align:center; padding:34px 20px;">
          <p style="color:var(--text-secondary);">No routes matched "<strong>${escapeHtml(state.routeFilterQuery)}</strong>". Try clearing the filter or switching to All Routes.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = visibleRoutes.map((route) => {
      const origIdx = state.routes.indexOf(route);
      const d = parseLocalRouteDate(route.date);
      const monthStr = d ? d.toLocaleDateString('en-GB', { month: 'short' }) : 'DEC';
      const dayStr = d ? String(d.getDate()).padStart(2, '0') : '--';
      const dowStr = d ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : 'TBC';

      const live = isRouteLive(route, origIdx);
      const postponed = isRoutePostponed(route, origIdx);
      const today = isRouteToday(route);
      const completed = isRouteCompleted(route, origIdx);
      const isSelected = String(state.selectedRouteId) === String(route.id);

      let statusBadge = `<span class="r-badge">Scheduled</span>`;
      if (live) statusBadge = `<span class="r-badge live">● Live On Street</span>`;
      else if (postponed) statusBadge = `<span class="r-badge postponed">🌧️ Postponed</span>`;
      else if (today) statusBadge = `<span class="r-badge tonight">✨ Tonight</span>`;
      else if (completed) statusBadge = `<span class="r-badge completed">✓ Visited</span>`;

      const sponsors = getRouteSponsors(route);
      const sponsorHtml = sponsors.length > 0 ? `
        <div class="route-sponsors-list">
          ${sponsors.map(sp => `
            <${sp.url ? `a href="${escapeHtml(sp.url)}" target="_blank" rel="noopener noreferrer"` : 'div'} class="route-sponsor-strip">
              ${sp.logo ? `<div class="sponsor-logo-pedestal"><img src="${escapeHtml(sp.logo)}" alt="${escapeHtml(sp.name)}" loading="lazy"></div>` : ''}
              <div class="sponsor-strip-meta">
                <div class="sponsor-strip-kicker">Night Sponsored By</div>
                <div class="sponsor-strip-name">${escapeHtml(sp.name)}</div>
              </div>
              ${sp.url ? '<i class="fa-solid fa-arrow-up-right-from-square" style="font-size:11px; color:var(--text-muted); margin-left:auto;"></i>' : ''}
            </${sp.url ? 'a' : 'div'}>
          `).join('')}
        </div>
      ` : '';

      const allStreets = state.streetsByRoute.get(String(route.id)) || [];
      const isExpanded = state.expandedRouteStreets.has(String(route.id)) || Boolean(q);
      const previewStreets = isExpanded ? allStreets : allStreets.slice(0, 7);
      const hiddenCount = Math.max(0, allStreets.length - previewStreets.length);

      const streetsHtml = allStreets.length > 0 ? `
        <div class="route-streets-wrap">
          ${previewStreets.map(st => {
            const matched = q && st.toLowerCase().includes(q);
            return `<span class="street-chip${matched ? ' matched' : ''}">${escapeHtml(st)}</span>`;
          }).join('')}
          ${hiddenCount > 0 ? `<button type="button" class="street-more-btn" data-expand-route="${escapeHtml(route.id)}">+${hiddenCount} more streets</button>` : ''}
        </div>
      ` : `<div style="font-size:12px; color:var(--text-muted);">Tap "Show on Map" to view the full GPX road corridor.</div>`;

      const cardClasses = [
        'route-card-v2',
        isSelected ? 'is-selected' : '',
        (today || live) ? 'is-tonight' : '',
        postponed ? 'is-postponed' : ''
      ].filter(Boolean).join(' ');

      return `
        <article class="${cardClasses}" data-route-card="${escapeHtml(route.id)}">
          <div class="route-card-top">
            <div class="date-calendar-Leaf tabular">
              <div class="date-leaf-month">${escapeHtml(monthStr)}</div>
              <div class="date-leaf-day brand-font">${escapeHtml(dayStr)}</div>
              <div class="date-leaf-dow">${escapeHtml(dowStr)}</div>
            </div>
            <div class="route-head-info">
              <div class="route-status-row">
                ${statusBadge}
                ${allStreets.length > 0 ? `<span class="r-badge tabular">${allStreets.length} Streets</span>` : ''}
              </div>
              <h3 class="route-name-title">${escapeHtml(route.name)}</h3>
              <div class="route-time-line tabular">
                <span><i class="fa-regular fa-clock" style="color:var(--primary);"></i> ${escapeHtml(route.start_time || '18:00')} – ${escapeHtml(route.end_time || '20:30')}</span>
              </div>
            </div>
          </div>

          ${postponed && route.postponed_note ? `<div style="font-size:12px; color:#fcd34d; background:rgba(245,158,11,0.12); padding:8px 10px; border-radius:9px;">${escapeHtml(route.postponed_note)}</div>` : ''}
          ${sponsorHtml}
          ${streetsHtml}

          <div class="route-card-actions">
            <button type="button" class="r-action-btn" data-map-route="${escapeHtml(route.id)}">
              <i class="fa-solid fa-map-location-dot" style="color:var(--primary);"></i>
              <span>Show on Radar</span>
            </button>
            <button type="button" class="r-action-btn" data-notify-route="${escapeHtml(route.id)}">
              <i class="fa-solid fa-bell"></i>
              <span>Alert Me</span>
            </button>
            <button type="button" class="r-action-btn icon-only" data-ics-route="${escapeHtml(route.id)}" title="Add route night to phone calendar" aria-label="Add to calendar">
              <i class="fa-regular fa-calendar-plus"></i>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Wire Route Card Interactions
    grid.querySelectorAll('[data-expand-route]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rId = btn.getAttribute('data-expand-route');
        state.expandedRouteStreets.add(rId);
        renderRoutesGrid();
      });
    });

    grid.querySelectorAll('[data-map-route]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectRouteAndFocus(btn.getAttribute('data-map-route'), true);
      });
    });

    grid.querySelectorAll('[data-notify-route]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDoorstepAlertModal({ routeId: btn.getAttribute('data-notify-route') });
      });
    });

    grid.querySelectorAll('[data-ics-route]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = state.routes.find(x => String(x.id) === String(btn.getAttribute('data-ics-route')));
        if (r) downloadRouteIcs(r);
      });
    });
  }

  function renderFundraisingAndImpact() {
    const table = state.payload?.table || {};
    const currency = table.currency || '£';
    const isGa = isGiftAidEnabled(table);
    const internalRaised = Number(table.total_raised || 0);
    const externalRaised = Number(table.external_raised_total || 0);
    const giftAidBonus = isGa ? Number(state.payload?.gift_aid?.giftAid || 0) : 0;
    const totalRaised = internalRaised + externalRaised + giftAidBonus;
    const goal = Number(table.fundraising_goal || 5000);

    const kicker = document.getElementById('fundraiser-kicker');
    const bigAmt = document.getElementById('fundraiser-big-amount');
    const goalLbl = document.getElementById('fundraiser-goal-label');
    const bar = document.getElementById('fundraiser-bar');
    const subnote = document.getElementById('fundraiser-subnote');

    if (totalRaised > 0) {
      const pct = goal > 0 ? Math.min(100, Math.max(6, Math.round((totalRaised / goal) * 100))) : 100;
      if (kicker) kicker.innerHTML = `<i class="fa-solid fa-fire"></i> Live Community Total (${pct}% of Goal)`;
      if (bigAmt) bigAmt.textContent = `${currency}${totalRaised.toLocaleString('en-GB', { minimumFractionDigits: totalRaised % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
      if (goalLbl) goalLbl.textContent = `Target: ${currency}${goal.toLocaleString('en-GB')}`;
      if (bar) bar.style.width = `${pct}%`;
      if (subnote) {
        const count = Number(state.payload?.donation_count || 0);
        subnote.textContent = count > 0
          ? `Supported by ${count} generous doorstep & online donations${isGa && giftAidBonus > 0 ? ` (including ${currency}${giftAidBonus.toFixed(2)} HMRC Gift Aid)` : ''}!`
          : 'Every penny goes directly to local community charities and good causes.';
      }
    } else {
      // Pre-Season Launch Mode: Inspiring & purposeful instead of an empty £0 bar
      if (kicker) kicker.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${new Date().getFullYear()} Community Appeal Target`;
      if (bigAmt) bigAmt.textContent = `${currency}${goal.toLocaleString('en-GB')}`;
      if (goalLbl) goalLbl.textContent = '100% Volunteer-Run • Zero Admin Cut';
      if (bar) bar.style.width = '12%';
      if (subnote) {
        subnote.textContent = isGa
          ? 'Be among the first supporters of this year’s sleigh appeal — every £1 becomes £1.25 with free HMRC Gift Aid!'
          : 'Be among the first supporters of this year’s sleigh appeal — 100% of donations go directly to local community charities and good causes.';
      }
    }

    const charityEl = document.getElementById('impact-charity-name');
    if (charityEl) {
      const cName = table.charity_name || table.sleigh_display_name || 'our Round Table';
      const cNum = table.charity_number ? ` (Registered Charity #${table.charity_number})` : '';
      charityEl.textContent = `${cName}${cNum}`;
    }

    // Beneficiaries & Approved Public Grants + Charity Partners
    const chipsWrap = document.getElementById('beneficiary-chips');
    if (chipsWrap) {
      const names = new Set();
      (state.payload?.approved_grants || []).forEach(g => {
        const n = String(g.org_name || g.organisation_name || '').trim();
        if (n) names.add(n);
      });
      (state.payload?.partners || []).forEach(p => {
        if (/charity|rescue|mind|hospice|food|trust/i.test(String(p.role || '') + ' ' + String(p.name || ''))) {
          if (p.name) names.add(String(p.name).trim());
        }
      });

      if (names.size > 0) {
        chipsWrap.innerHTML = Array.from(names).map(n => `
          <span class="beneficiary-chip"><i class="fa-solid fa-heart" style="color:var(--primary);"></i> ${escapeHtml(n)}</span>
        `).join('');
      } else {
        chipsWrap.innerHTML = `
          <span class="beneficiary-chip"><i class="fa-solid fa-school" style="color:var(--primary);"></i> Local Schools &amp; Youth Clubs</span>
          <span class="beneficiary-chip"><i class="fa-solid fa-basket-shopping" style="color:var(--primary);"></i> Community Food Banks</span>
          <span class="beneficiary-chip"><i class="fa-solid fa-hand-holding-heart" style="color:var(--primary);"></i> Grassroots Charities</span>
        `;
      }
    }

    const grantBtn = document.getElementById('open-grant-btn');
    if (grantBtn) {
      grantBtn.style.display = table.enable_grant_nominations === false ? 'none' : 'inline-flex';
    }

    // Toggle Gift Aid Calculator and Buttons based on table setting
    const calcBox = document.getElementById('giftaid-calc-box');
    if (calcBox) calcBox.style.display = isGa ? 'block' : 'none';

    const gaOnlyBtn = document.getElementById('impact-giftaid-only-btn');
    if (gaOnlyBtn) gaOnlyBtn.style.display = isGa ? 'inline-flex' : 'none';

    const donateBtn = document.getElementById('impact-donate-btn');
    if (donateBtn) {
      donateBtn.innerHTML = isGa
        ? '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Boost by 25% &amp; Donate Now</span>'
        : '<i class="fa-solid fa-heart"></i><span>Donate Online to Sleigh Appeal</span>';
    }

    if (isGa) {
      updateGiftAidCalculator(state.selectedTierAmount);
    }
  }

  function updateGiftAidCalculator(amt) {
    state.selectedTierAmount = Number(amt) || 5;
    document.querySelectorAll('.tier-pill').forEach(btn => {
      btn.classList.toggle('active', Number(btn.getAttribute('data-amt')) === state.selectedTierAmount);
    });
    const bonus = state.selectedTierAmount * 0.25;
    const total = state.selectedTierAmount + bonus;
    const baseEl = document.getElementById('calc-base');
    const bonusEl = document.getElementById('calc-bonus');
    const totalEl = document.getElementById('calc-total');
    if (baseEl) baseEl.textContent = `£${state.selectedTierAmount.toFixed(2)}`;
    if (bonusEl) bonusEl.textContent = `£${bonus.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `£${total.toFixed(2)}`;

    const modalAmt = document.getElementById('v2-ga-amount');
    if (modalAmt) modalAmt.value = String(state.selectedTierAmount);
  }

  function renderModularSlots() {
    const container = document.getElementById('modular-feature-slots');
    if (!container) return;

    const table = state.payload?.table || {};
    const settings = state.payload?.settings || {};
    const slug = state.slug || 'beverley';

    const resolveSlot = (slotVal) => {
      if (!slotVal) return null;
      const s = String(slotVal).trim().toLowerCase();
      if (!s || s === 'none' || s === 'disabled' || s === 'false' || s === 'null') return null;
      return s;
    };

    const raw1 = resolveSlot(table.public_slot_1 || settings.public_slot_1);
    const raw2 = resolveSlot(table.public_slot_2 || settings.public_slot_2);

    const slot1 = (raw1 && PUBLIC_FEATURE_CATALOG[raw1]) ? PUBLIC_FEATURE_CATALOG[raw1] : null;
    const slot2 = (raw2 && raw2 !== raw1 && PUBLIC_FEATURE_CATALOG[raw2]) ? PUBLIC_FEATURE_CATALOG[raw2] : null;

    const activeSlots = [slot1, slot2].filter(Boolean);
    const slotSignature = activeSlots.map(s => s.id).join(',');

    // Synchronize Desktop Nav Links (Inserted right before Memory Wall)
    document.querySelectorAll('.nav-modular-slot').forEach(n => n.remove());
    const navLinks = document.querySelector('.desktop-nav');
    const navTarget = document.getElementById('nav-memory-wall') || document.querySelector('.desktop-nav a[href="#memories"]');
    if (navLinks && activeSlots.length) {
      activeSlots.forEach(slot => {
        const navA = document.createElement('a');
        navA.href = '#' + slot.anchorId;
        navA.textContent = slot.navLabel;
        navA.className = 'nav-modular-slot';
        if (navTarget) navLinks.insertBefore(navA, navTarget);
        else navLinks.appendChild(navA);
      });
    }

    // Prevent tearing down and reloading active iframes (such as live Santa calls) on background intervals
    if (container.dataset.renderedSlots === slotSignature) {
      return;
    }
    container.dataset.renderedSlots = slotSignature;
    container.innerHTML = '';

    if (!activeSlots.length) return;

    const primaryHex = table.primary_color || '#D31C1C';
    const accentHex = table.accent_color || '#FBAF33';

    activeSlots.forEach(slot => {
      const isSantaChat = slot.id === 'santa_chat';
      let targetSrc = slot.embedSrc(slug);
      if (!isSantaChat) {
        const joinChar = targetSrc.includes('?') ? '&' : '?';
        targetSrc += joinChar + 'embed=1&primary=' + encodeURIComponent(primaryHex) + '&accent=' + encodeURIComponent(accentHex);
      }

      const sec = document.createElement('section');
      sec.className = 'page-section modular-slot-section';
      sec.id = slot.anchorId;

      const fsSrc = slot.fullscreenSrc ? slot.fullscreenSrc(slug) : null;

      sec.innerHTML = `
        <div class="container" style="max-width:${slot.maxWidth || 1000}px;">
          <div class="section-head">
            <div>
              <div class="section-eyebrow"><i class="fa-solid fa-sparkles"></i> ${escapeHtml(slot.badge || 'Interactive Lapland Experience')}</div>
              <h2 class="section-title">${slot.title} <span class="hl">${slot.titleHighlight}</span></h2>
              <p class="section-subtitle">${escapeHtml(slot.description || '')}</p>
            </div>
          </div>
          <div class="iframe-container">
            <div class="iframe-chrome">
              <div class="iframe-chrome-left">
                <span class="chrome-pulse" aria-hidden="true"></span>
                <span>${escapeHtml(slot.badge || slot.navLabel)}</span>
              </div>
              <div class="iframe-chrome-actions">
                ${fsSrc ? `
                  <a class="tracker-fs" href="${escapeHtml(fsSrc)}" target="_blank" rel="noopener">
                    <span>${escapeHtml(slot.fullscreenLabel || 'Open Full-Screen')}</span>
                    <i class="fa-solid fa-up-right-from-square"></i>
                  </a>
                ` : ''}
              </div>
            </div>
            <iframe
              id="${slot.anchorId}-iframe"
              class="modular-slot-iframe"
              height="${slot.height || 720}"
              title="${escapeHtml(slot.title)} ${escapeHtml(slot.titleHighlight)}"
              allow="${isSantaChat ? 'microphone *; autoplay *; speaker-selection *; clipboard-write *' : 'camera; microphone; geolocation; autoplay'}"
              loading="${isSantaChat ? 'eager' : 'lazy'}"
              scrolling="no"
              src="${targetSrc}"
            ></iframe>
          </div>
        </div>
      `;

      container.appendChild(sec);
    });
  }

  async function loadAndRenderMemoryWall() {
    const grid = document.getElementById('memory-wall-grid');
    if (!grid) return;

    const activeSlug = state.payload?.table?.slug || state.slug;
    let items = [];
    try {
      const res = await fetch(`${API_ORIGIN}/api/memory-book?table=${encodeURIComponent(activeSlug)}`);
      const data = await res.json();
      if (Array.isArray(data?.items)) items = data.items;
    } catch (e) {}

    const uploadCardHtml = `
      <div class="memory-upload-tile" id="inline-memory-upload-tile" role="button" tabindex="0">
        <div style="font-size:34px;">📸</div>
        <h3 style="font-size:17px; color:#fff;">Add Your Sleigh Photo</h3>
        <p style="font-size:12.5px; color:var(--text-secondary); max-width:240px;">
          Spotted Santa tonight? Tap to upload your pavement photo to our community memory wall!
        </p>
        <span class="mini-action-pill">Upload Photo</span>
      </div>
    `;

    const photosHtml = items.slice(0, 7).map(item => {
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return `
        <div class="polaroid-card" data-full-img="${escapeHtml(item.media_url)}" data-caption="${escapeHtml(item.caption || 'Spotted Santa!')}">
          <div class="polaroid-img-wrap">
            <img src="${escapeHtml(item.media_url)}" alt="${escapeHtml(item.caption || 'Santa Sleigh Memory')}" loading="lazy">
          </div>
          <div class="polaroid-caption">${escapeHtml(item.caption || 'Spotted Santa!')}</div>
          ${dateStr ? `<div class="polaroid-date">${escapeHtml(dateStr)}</div>` : ''}
        </div>
      `;
    }).join('');

    grid.innerHTML = photosHtml + uploadCardHtml;

    document.getElementById('inline-memory-upload-tile')?.addEventListener('click', () => openModal('photo-modal'));

    grid.querySelectorAll('.polaroid-card').forEach(card => {
      card.addEventListener('click', () => {
        const imgUrl = card.getAttribute('data-full-img');
        if (imgUrl) window.open(imgUrl, '_blank', 'noopener');
      });
    });
  }

  function renderPartnersPedestal() {
    const section = document.getElementById('partners');
    const grid = document.getElementById('partners-pedestal-grid');
    if (!section || !grid) return;

    const merged = [];
    const seen = new Set();

    const addPartner = (name, logo, url, role) => {
      const cleanName = String(name || '').trim();
      if (!cleanName && !logo) return;
      const key = (cleanName || logo).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({ name: cleanName || 'Community Partner', logo: logo || '', url: url || '', role: role || 'Official Partner' });
    };

    (state.payload?.partners || []).forEach(p => {
      addPartner(p.name, p.logo || p.logo_url, p.url || p.link, p.role || 'Official Partner');
    });

    // Also include route-level corporate sponsors so they get full recognition
    state.routes.forEach(r => {
      getRouteSponsors(r).forEach(sp => {
        addPartner(sp.name, sp.logo, sp.url, `${r.name} Sponsor`);
      });
    });

    if (merged.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    grid.innerHTML = merged.map(p => {
      const tag = p.url ? 'a' : 'div';
      const attrs = p.url ? `href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer"` : '';
      return `
        <${tag} ${attrs} class="partner-pedestal-card">
          ${p.logo ? `<div class="partner-logo-stage"><img src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.name)}" loading="lazy"></div>` : ''}
          <span class="partner-role-pill">${escapeHtml(p.role)}</span>
          <div class="partner-name">${escapeHtml(p.name)}</div>
        </${tag}>
      `;
    }).join('');
  }

  async function loadAndStartCheerTicker() {
    try {
      const res = await fetch(`${API_ORIGIN}/api/messages?table=${encodeURIComponent(state.slug)}`);
      const data = await res.json();
      state.cheerMessages = Array.isArray(data?.messages) ? data.messages : [];
    } catch (e) {
      state.cheerMessages = [];
    }

    const tickerEl = document.getElementById('cheer-ticker-text');
    if (!tickerEl) return;

    const fallbackCheers = [
      'Wave to Santa and our volunteer elves when the sleigh passes your street!',
      '100% of every coin and contactless tap goes back to local community causes!',
      'Tip: Tap "Pin Alert" on the radar to get an email when Santa is 250m away!'
    ];

    const pool = state.cheerMessages.length > 0
      ? state.cheerMessages.map(m => `"${m.message}" — ${m.author_name || 'Local Supporter'}`)
      : fallbackCheers;

    tickerEl.textContent = pool[0];
    if (pool.length > 1) {
      setInterval(() => {
        state.cheerIndex = (state.cheerIndex + 1) % pool.length;
        tickerEl.textContent = pool[state.cheerIndex];
      }, 6500);
    }
  }

  // --- Background Media & Sleigh Jingles ---
  function applyBackgroundAndMusic() {
    const table = state.payload?.table || {};
    const mediaLayer = document.getElementById('sky-media-layer');
    if (mediaLayer) {
      if (table.background_mode === 'image' && table.background_url) {
        mediaLayer.innerHTML = `<img src="${escapeHtml(table.background_url)}" alt="">`;
      } else {
        const vidUrl = table.background_video_url || '/media/santa.mp4';
        mediaLayer.innerHTML = `<video autoplay loop muted playsinline webkit-playsinline disablePictureInPicture src="${escapeHtml(vidUrl)}"></video>`;
      }
    }

    const musicBtn = document.getElementById('music-toggle-btn');
    if (state.audioEl) {
      state.audioEl.pause();
      state.audioEl = null;
      state.isMusicPlaying = false;
    }

    if (table.music_mode && table.music_mode !== 'none' && table.music_custom_url) {
      if (musicBtn) musicBtn.style.display = 'inline-flex';
      state.audioEl = new Audio(table.music_custom_url);
      state.audioEl.loop = table.music_loop !== false;
      state.audioEl.volume = Math.min(1, Math.max(0.05, Number(table.music_volume ?? 0.45)));
    } else if (musicBtn) {
      musicBtn.style.display = 'none';
    }
  }

  // --- Modals & Form Submissions ---
  function openModal(id) {
    document.getElementById(id)?.classList.add('open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    if (id === 'theater-modal') {
      const ifr = document.getElementById('theater-iframe');
      if (ifr) ifr.src = 'about:blank';
    }
  }

  function openTheaterModal(item) {
    const titleEl = document.getElementById('theater-title');
    const iconEl = document.getElementById('theater-icon');
    const fsLink = document.getElementById('theater-fs-link');
    const ifr = document.getElementById('theater-iframe');

    const targetUrl = `${item.path}?table=${encodeURIComponent(state.slug)}`;
    if (titleEl) titleEl.textContent = item.title;
    if (iconEl) iconEl.textContent = item.icon;
    if (fsLink) fsLink.href = buildSubdomainToolUrl(item.path);
    if (ifr) ifr.src = targetUrl;
    openModal('theater-modal');
  }

  function openDonateFlow() {
    const table = state.payload?.table || {};
    const donateUrl = table.donate_url || table.justgiving_url || '';
    if (isGiftAidEnabled(table)) {
      openModal('giftaid-modal');
    } else if (donateUrl) {
      window.open(donateUrl, '_blank', 'noopener');
    } else {
      alert('Online donation details will be announced soon. Thank you for supporting our Santa Sleigh appeal!');
    }
  }

  function openDoorstepAlertModal(opts = {}) {
    const routeSel = document.getElementById('v2-alert-route');
    const statusEl = document.getElementById('v2-alert-coords-status');
    const pcInput = document.getElementById('v2-alert-postcode');

    if (routeSel) {
      routeSel.innerHTML = `<option value="">Any Nearby Sleigh Route (250m Radius)</option>` +
        state.routes.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)} — ${escapeHtml(formatFriendlyDate(r.date))}</option>`).join('');
      if (opts.routeId) routeSel.value = String(opts.routeId);
    }

    if (opts.lat && opts.lng) {
      state.alertCoords = { lat: opts.lat, lng: opts.lng };
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = `✓ Exact doorstep coordinates locked (${opts.lat.toFixed(4)}, ${opts.lng.toFixed(4)})`;
      }
      if (pcInput && opts.label) pcInput.value = opts.label;
    } else {
      state.alertCoords = null;
      if (statusEl) statusEl.style.display = 'none';
      if (pcInput && opts.label) pcInput.value = opts.label;
    }

    openModal('alert-modal');
  }

  // --- Master Table Loader ---
  async function loadTableExperience(targetSlug, usePrefetched = false) {
    state.slug = targetSlug || DEFAULT_RICH_TABLE;
    state.selectedRouteId = null;
    state.expandedRouteStreets.clear();
    state.simTickIndex = 0;

    // Highlight active Test Lab button
    document.querySelectorAll('[data-table]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-table') === state.slug);
    });
    const allSelect = document.getElementById('lab-all-tables');
    if (allSelect) allSelect.value = state.slug;
    const compareLink = document.getElementById('lab-compare-v1');
    if (compareLink) compareLink.href = `/santasleigh.html?table=${encodeURIComponent(state.slug)}`;

    try {
      let data = null;
      if (usePrefetched && window.__sleighPrefetchedData && window.__sleighPrefetchedData?.table?.slug === state.slug) {
        data = window.__sleighPrefetchedData;
      } else {
        const res = await fetch(`${API_ORIGIN}/api/payload?table=${encodeURIComponent(state.slug)}`);
        data = await res.json();
      }

      state.payload = data || {};
      state.routes = Array.isArray(data?.routes) ? data.routes : [];

      // CRITICAL: Synchronize state.slug with canonical table slug from database if normalized
      if (data?.table?.slug) {
        state.slug = data.table.slug;
      }

      applyBrandTheme(data?.table || {});
      applyBackgroundAndMusic();
      rebuildStreetSearchIndex();
      renderHeaderAndHero();
      renderHeroMetrics();
      renderRoutesGrid();
      renderFundraisingAndImpact();
      renderModularSlots();
      renderPartnersPedestal();

      // Parallel non-blocking loads: GPX tracks, Memory Wall, Live Cheer, View counter
      renderFrames(state.slug);
      loadAndRenderMemoryWall();
      loadAndStartCheerTicker();
      fetch(`${API_ORIGIN}/api/track-view?table=${encodeURIComponent(state.slug)}`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error('Failed to load sleigh experience:', err);
    }
  }

  async function populateTestLabTablesDropdown() {
    const sel = document.getElementById('lab-all-tables');
    if (!sel) return;
    try {
      const res = await fetch(`${API_ORIGIN}/api/public/tables`);
      const data = await res.json();
      if (Array.isArray(data?.tables)) {
        sel.innerHTML = `<option value="">Switch Live Table (${data.tables.length})...</option>` +
          data.tables.map(t => `<option value="${escapeHtml(t.slug)}">${escapeHtml(t.town_name || t.slug)}</option>`).join('');
        sel.value = state.slug;
      }
    } catch (e) {}
  }

  // --- Subtle 60fps Winter Snowfall ---
  function initSnowCanvas() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.getElementById('snow-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });

    const flakes = Array.from({ length: 48 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.1 + 0.7,
      vy: Math.random() * 0.65 + 0.25,
      vx: (Math.random() - 0.5) * 0.35,
      o: Math.random() * 0.55 + 0.2
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      flakes.forEach(f => {
        f.y += f.vy;
        f.x += f.vx;
        if (f.y > h) { f.y = -5; f.x = Math.random() * w; }
        if (f.x > w) f.x = 0;
        if (f.x < 0) f.x = w;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.o})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // --- Wire DOM Events ---
  function bindEvents() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clean') === '1') {
      const lab = document.getElementById('test-lab-bar');
      if (lab) lab.style.display = 'none';
    }

    // Test Lab Table Switcher
    document.querySelectorAll('[data-table]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextSlug = btn.getAttribute('data-table');
        const u = new URL(window.location.href);
        u.searchParams.set('table', nextSlug);
        window.history.replaceState({}, '', u.toString());
        loadTableExperience(nextSlug, false);
      });
    });

    document.getElementById('lab-all-tables')?.addEventListener('change', (e) => {
      const nextSlug = e.target.value;
      if (!nextSlug) return;
      const u = new URL(window.location.href);
      u.searchParams.set('table', nextSlug);
      window.history.replaceState({}, '', u.toString());
      loadTableExperience(nextSlug, false);
    });

    // Test Lab Simulation Toggles
    document.querySelectorAll('[data-sim]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.simMode = btn.getAttribute('data-sim') || 'auto';
        document.querySelectorAll('[data-sim]').forEach(b => b.classList.toggle('active', b === btn));
        renderHeaderAndHero();
        renderRoutesGrid();
        renderFrames(state.slug);
      });
    });

    document.getElementById('lab-hide-btn')?.addEventListener('click', () => {
      const lab = document.getElementById('test-lab-bar');
      if (lab) lab.style.display = 'none';
    });

    // Route Filter Tabs & Inline Search
    document.querySelectorAll('[data-rfilter]').forEach(tab => {
      tab.addEventListener('click', () => {
        state.routeFilterTab = tab.getAttribute('data-rfilter') || 'upcoming';
        document.querySelectorAll('[data-rfilter]').forEach(t => t.classList.toggle('active', t === tab));
        renderRoutesGrid();
      });
    });

    document.getElementById('routes-filter-input')?.addEventListener('input', (e) => {
      state.routeFilterQuery = e.target.value;
      renderRoutesGrid();
    });

    // Gift Aid Tier Calculator Pills
    document.querySelectorAll('.tier-pill').forEach(btn => {
      btn.addEventListener('click', () => updateGiftAidCalculator(btn.getAttribute('data-amt')));
    });

    // Donate, Alert, Grant, Cheer, Photo Triggers
    ['header-donate-btn', 'hero-donate-cta', 'impact-donate-btn', 'mobile-dock-donate'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', openDonateFlow);
    });

    document.getElementById('hero-alert-cta')?.addEventListener('click', () => openDoorstepAlertModal({}));
    document.getElementById('open-grant-btn')?.addEventListener('click', () => openModal('grant-modal'));
    document.getElementById('open-cheer-btn')?.addEventListener('click', () => openModal('cheer-modal'));
    document.getElementById('open-photo-upload-btn')?.addEventListener('click', () => openModal('photo-modal'));

    document.getElementById('hero-share-cta')?.addEventListener('click', async () => {
      const shareUrl = window.location.href;
      const title = document.title;
      if (navigator.share) {
        try { await navigator.share({ title, url: shareUrl }); return; } catch (e) {}
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Sleigh tracker link copied to clipboard!');
      } catch (e) {}
    });

    // Music Toggle
    document.getElementById('music-toggle-btn')?.addEventListener('click', () => {
      if (!state.audioEl) return;
      const lbl = document.getElementById('music-btn-label');
      if (state.isMusicPlaying) {
        state.audioEl.pause();
        state.isMusicPlaying = false;
        if (lbl) lbl.textContent = 'Jingles';
      } else {
        state.audioEl.play().then(() => {
          state.isMusicPlaying = true;
          if (lbl) lbl.textContent = 'Playing';
        }).catch(() => {});
      }
    });

    // Modal Closers
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
    });
    document.querySelectorAll('.modal-backdrop-v2').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal(backdrop.id);
      });
    });

    // Form 1: +25% Gift Aid Pre-Checkout
    document.getElementById('v2-ga-skip')?.addEventListener('click', () => {
      const url = state.payload?.table?.donate_url || state.payload?.table?.justgiving_url || '';
      closeModal('giftaid-modal');
      if (url) window.open(url, '_blank', 'noopener');
    });

    document.getElementById('v2-giftaid-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('v2-ga-submit');
      btn.disabled = true;
      btn.textContent = 'Recording HMRC Gift Aid...';

      const body = {
        table_slug: state.slug,
        firstName: document.getElementById('v2-ga-first').value.trim(),
        lastName: document.getElementById('v2-ga-last').value.trim(),
        address1: document.getElementById('v2-ga-address').value.trim(),
        postcode: document.getElementById('v2-ga-postcode').value.trim().toUpperCase(),
        amount: parseFloat(document.getElementById('v2-ga-amount').value) || 5,
        email: document.getElementById('v2-ga-email').value.trim()
      };

      try {
        const res = await fetch(`${API_ORIGIN}/api/gift-aid?table=${encodeURIComponent(state.slug)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          alert(data.error || 'Please check your Gift Aid details and try again.');
        } else {
          closeModal('giftaid-modal');
          const donateUrl = state.payload?.table?.donate_url || state.payload?.table?.justgiving_url || '';
          if (donateUrl) {
            window.open(donateUrl, '_blank', 'noopener');
          } else {
            alert('Thank you! Your +25% HMRC Gift Aid declaration has been recorded.');
          }
        }
      } catch (err) {
        alert('Network error — please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Save +25% Gift Aid &amp; Continue to Donate &#8594;</span>';
      }
    });

    // Form 2: Doorstep 250m Proximity Email Alert
    document.getElementById('v2-alert-gps-btn')?.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        state.alertCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const st = document.getElementById('v2-alert-coords-status');
        if (st) {
          st.style.display = 'block';
          st.textContent = `✓ GPS coordinates locked (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
        }
      });
    });

    document.getElementById('v2-alert-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('v2-alert-submit');
      const email = document.getElementById('v2-alert-email').value.trim();
      const pc = document.getElementById('v2-alert-postcode').value.trim();
      const routeId = document.getElementById('v2-alert-route').value || null;

      btn.disabled = true;
      btn.textContent = 'Activating Doorstep Alert...';

      try {
        let coords = state.alertCoords;
        if (!coords && pc) {
          const town = extractTownName(state.payload?.table, state.slug);
          const q = isLikelyUkPostcode(pc) ? pc : `${pc}, ${town}, UK`;
          const gRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=${encodeURIComponent(q)}`);
          const gData = await gRes.json();
          if (Array.isArray(gData) && gData[0]) {
            coords = { lat: parseFloat(gData[0].lat), lng: parseFloat(gData[0].lon) };
          }
        }
        if (!coords) {
          alert('Please enter a valid UK postcode or tap "Use GPS" so we know when Santa is 250m from your home!');
          btn.disabled = false;
          btn.textContent = 'Activate My Free Doorstep Alert';
          return;
        }

        const res = await fetch(`${API_ORIGIN}/api/subscribe?table=${encodeURIComponent(state.slug)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: state.slug,
            lat: coords.lat,
            lng: coords.lng,
            email,
            route_id: routeId
          })
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          alert(data.error || 'Could not register alert — please try again.');
        } else {
          closeModal('alert-modal');
          alert('🔔 Doorstep Alert Activated! We will email you when Santa departs and when his sleigh approaches within 250m.');
        }
      } catch (err) {
        alert('Network error — please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Activate My Free Doorstep Alert</span>';
      }
    });

    // Form 3: Local Cause Grant Nomination
    document.getElementById('v2-grant-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('v2-gr-submit');
      btn.disabled = true;
      btn.textContent = 'Submitting Nomination...';

      try {
        const res = await fetch(`${API_ORIGIN}/api/grants?table=${encodeURIComponent(state.slug)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: state.slug,
            org_name: document.getElementById('v2-gr-org').value.trim(),
            contact_name: document.getElementById('v2-gr-name').value.trim(),
            contact_email: document.getElementById('v2-gr-email').value.trim(),
            contact_phone: document.getElementById('v2-gr-phone').value.trim(),
            amount_requested: parseFloat(document.getElementById('v2-gr-amount').value) || 0,
            cause_summary: document.getElementById('v2-gr-summary').value.trim()
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          alert(data.error || 'Could not submit nomination.');
        } else {
          closeModal('grant-modal');
          e.target.reset();
          alert(data.message || 'Thank you! Your local cause nomination has been sent to the Round Table committee.');
        }
      } catch (err) {
        alert('Network error — please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Submit Local Cause Nomination</span>';
      }
    });

    // Form 4: Live Community Cheer
    document.getElementById('v2-cheer-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('v2-cheer-submit');
      btn.disabled = true;
      btn.textContent = 'Sending Cheer...';

      try {
        const res = await fetch(`${API_ORIGIN}/api/messages?table=${encodeURIComponent(state.slug)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorName: document.getElementById('v2-cheer-author').value.trim() || 'Local Family',
            message: document.getElementById('v2-cheer-msg').value.trim()
          })
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          alert(data.error || 'Could not post cheer right now.');
        } else {
          closeModal('cheer-modal');
          e.target.reset();
          loadAndStartCheerTicker();
          alert('🎄 Festive cheer sent to Santa & the elves!');
        }
      } catch (err) {
        alert('Network error — please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Send Festive Cheer</span>';
      }
    });

    // Form 5: Memory Wall Photo Upload (Client-side compressed JPEG -> POST /api/memory-book)
    document.getElementById('v2-photo-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('v2-photo-file');
      const file = fileInput?.files?.[0];
      if (!file) return;

      const btn = document.getElementById('v2-photo-submit');
      btn.disabled = true;
      btn.textContent = 'Optimising & Uploading...';

      try {
        const imageData = await compressImageToDataUrl(file, 1280, 0.82);
        const res = await fetch(`${API_ORIGIN}/api/memory-book?table=${encodeURIComponent(state.slug)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData,
            caption: document.getElementById('v2-photo-caption').value.trim() || 'Spotted Santa!'
          })
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          alert(data.error || 'Could not upload photo right now.');
        } else {
          closeModal('photo-modal');
          e.target.reset();
          loadAndRenderMemoryWall();
          alert('📸 Thank you! Your photo has been submitted to the Digital Memory Book!');
        }
      } catch (err) {
        alert('Could not process photo — please try another image.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><span>Upload to Memory Book</span>';
      }
    });

    // Open Gift Aid checkout automatically if ?donate=1
    if (params.get('donate') === '1') {
      setTimeout(openDonateFlow, 600);
    }
  }

  function compressImageToDataUrl(file, maxDim = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const c = document.createElement('canvas');
          c.width = width;
          c.height = height;
          c.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Bootstrap ---
  document.addEventListener('DOMContentLoaded', () => {
    initSnowCanvas();
    bindFrameMessages();
    bindEvents();
    populateTestLabTablesDropdown();
    loadTableExperience(state.slug, true);
  });
})();
