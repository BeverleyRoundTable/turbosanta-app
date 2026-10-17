import React, { useEffect, useState, useMemo } from 'react';
import { Share2, MapPin, ExternalLink, Star, ChevronDown } from 'lucide-react';
import { API_BASE } from '../services/api';
import { extractRouteSponsors } from '../utils/sponsors';
import RouteStreetsPreview from './RouteStreetsPreview';
import SnowEffect from './SnowEffect';

const DEFAULT_LOGO = '/icons/RTBI_Santa.png';
const DEFAULT_BG = '/icons/site_background.png';
const DEFAULT_VIDEO_MP4 = '/media/santa.mp4';
const DEFAULT_VIDEO_WEBM = '/media/santa.webm';
const BG_OVERLAY = 'linear-gradient(180deg, rgba(29, 29, 26, 0.55) 0%, rgba(0, 0, 0, 0.8) 100%)';

function parseColor(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

function readableTextOn(rgb) {
  if (!rgb) return '#000000';
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return ((L + 0.05) / 0.05) >= (1.05 / (L + 0.05)) ? '#000000' : '#ffffff';
}

function parseRouteDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return isNaN(d) ? null : d;
}

export const PUBLIC_FEATURE_CATALOG = {
  bingo: {
    id: 'bingo',
    anchorId: 'sleigh-bingo',
    navLabel: 'Sleigh Bingo',
    badge: 'Kerbside Family Game',
    title: 'CHRISTMAS SLEIGH',
    titleHighlight: 'BINGO GAME',
    description: "Play along while waiting on the pavement! Tap off items as Santa passes by: flashing lights, Rudolph's nose, mince pies, and festive hats.",
    embedSrc: (slug) => `/bingo.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/bingo.html?table=${encodeURIComponent(slug)}`,
    fullscreenLabel: 'Play Sleigh Bingo Full-Screen',
    height: 700,
    maxWidth: 840
  },
  colouring: {
    id: 'colouring',
    anchorId: 'colouring',
    navLabel: 'Colouring',
    badge: 'Free Printable Holiday Activities',
    title: 'FESTIVE',
    titleHighlight: 'COLOURING BOOK',
    description: "Personalise and print free Santa Sleigh colouring sheets at home on A4 paper! Add your child's name and share their artwork with our sleigh volunteers!",
    embedSrc: (slug) => `/colouring_page.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/colouring_page.html?table=${encodeURIComponent(slug)}`,
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
    embedSrc: (slug) => `/countdown.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/countdown.html?table=${encodeURIComponent(slug)}`,
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
    description: "Customise and print festive Santa Sleigh door hangers for your front door with live tracking QR code so Santa knows to stop!",
    embedSrc: (slug) => `/door_hanger.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/door_hanger.html?table=${encodeURIComponent(slug)}`,
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
    embedSrc: (slug) => `/elf_cam.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/elf_cam.html?table=${encodeURIComponent(slug)}`,
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
    description: "Children can write their Christmas wish list on official Round Table festive stationery and print it out to send directly to Lapland!",
    embedSrc: (slug) => `/letter.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/letter.html?table=${encodeURIComponent(slug)}`,
    fullscreenLabel: 'Open Letter Writer Full-Screen',
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
    embedSrc: (slug) => `/magic_mailbox.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/magic_mailbox.html?table=${encodeURIComponent(slug)}`,
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
    embedSrc: (slug) => `/nice_list.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/nice_list.html?table=${encodeURIComponent(slug)}`,
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
    embedSrc: (slug) => `/adopt_reindeer.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/adopt_reindeer.html?table=${encodeURIComponent(slug)}`,
    fullscreenLabel: 'Adopt a Reindeer Full-Screen',
    height: 740,
    maxWidth: 900
  },
  santa_chat: {
    id: 'santa_chat',
    anchorId: 'santa-chat',
    navLabel: 'Santa Voice Call',
    badge: 'Live Audio Connection to Lapland',
    title: 'TALK TO',
    titleHighlight: 'SANTA',
    description: "Children and families can speak directly with Santa in Lapland! Ask when he is visiting your street, how Rudolph is doing, or hear a jolly festive story.",
    embedSrc: (slug) => `/santa_chat.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/santa_chat.html?table=${encodeURIComponent(slug)}`,
    fullscreenLabel: 'Open Voice Hotline Full-Screen',
    height: 680,
    maxWidth: 760,
    allowMicrophone: true
  },
  santa_bot: {
    id: 'santa_bot',
    anchorId: 'santa-bot',
    navLabel: 'Talk to Santa',
    badge: 'Lapland Live AI Hotline',
    title: 'TALK TO',
    titleHighlight: 'SANTA',
    description: "Children and families can message Santa directly in Lapland! Ask when he is visiting your street, how Rudolph is doing, or hear a jolly festive story.",
    embedSrc: (slug) => `/santa_bot.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/santa_bot.html?table=${encodeURIComponent(slug)}`,
    fullscreenLabel: 'Open Santa AI Chat Full-Screen',
    height: 720,
    maxWidth: 820,
    allowMicrophone: true
  },
  santa_frame: {
    id: 'santa_frame',
    anchorId: 'santa-frame',
    navLabel: 'Santa Visited',
    badge: 'Memory Photo Stamper',
    title: 'SANTA VISITED',
    titleHighlight: 'PHOTO FRAME',
    description: "Upload a festive family photo to stamp it with our official Santa Visited commemorative frame and date stamp.",
    embedSrc: (slug) => `/santa_frame.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/santa_frame.html?table=${encodeURIComponent(slug)}`,
    fullscreenLabel: 'Open Photo Frame Full-Screen',
    height: 720,
    maxWidth: 840
  },
  snowman: {
    id: 'snowman',
    anchorId: 'snowman-builder',
    navLabel: 'Snowman Maker',
    badge: 'Interactive Winter Builder',
    title: 'SNOWMAN',
    titleHighlight: 'CREATOR STUDIO',
    description: "Customise and build your own snowman with hats, scarves, jumpers, and mittens to download and share with family!",
    embedSrc: (slug) => `/snowman.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/snowman.html?table=${encodeURIComponent(slug)}`,
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
    description: "Snap a photo of Santa passing down your street and pin your sighting to our community map!",
    embedSrc: (slug) => `/spot_santa_form.html?table=${encodeURIComponent(slug)}`,
    fullscreenSrc: (slug) => `/spot_santa_form.html?table=${encodeURIComponent(slug)}`,
    fullscreenLabel: 'Submit Sighting Full-Screen',
    height: 700,
    maxWidth: 600
  }
};

// Backwards compatibility alias for deprecated santa_studio
PUBLIC_FEATURE_CATALOG.santa_studio = PUBLIC_FEATURE_CATALOG.santa_bot;

export function getOperatorTableName(table = {}, slug = '') {
  const activeSlug = (slug || table.slug || '').trim();
  const townFromSlug = activeSlug
    ? activeSlug
        .split(/[-_]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    : '';

  let raw = (table.table_name || table.name || '').trim();

  if (raw) {
    let cleaned = raw
      .replace(/\s*[-–—:]\s*santa(?:['\u2019]s)?\s*sleigh.*$/i, '')
      .replace(/\s+santa(?:['\u2019]s)?\s*sleigh.*$/i, '')
      .replace(/\s+santa(?:['\u2019]s)?.*$/i, '')
      .replace(/\s+sleigh.*$/i, '')
      .trim();

    if (cleaned) {
      if (!/\bround\s+table\b/i.test(cleaned)) {
        cleaned = `${cleaned} Round Table`;
      }
      return cleaned;
    }
  }

  if (townFromSlug) {
    return `${townFromSlug} Round Table`;
  }

  return 'Round Table';
}

export default function PublicSleigh({ tableData, activeTableSlug, onOpenLogin }) {
  const [addressFrameHeight, setAddressFrameHeight] = useState(500);
  const [showFab, setShowFab] = useState(false);
  const [showGiftAidCheckoutModal, setShowGiftAidCheckoutModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({
    org_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    amount_requested: '',
    cause_summary: ''
  });
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [grantStatusMsg, setGrantStatusMsg] = useState('');
  const currentYear = new Date().getFullYear();

  const table = tableData?.table || {};
  const approvedGrants = Array.isArray(tableData?.approved_grants) ? tableData.approved_grants : [];
  const primaryColor = table.primary_color || '#FBAF33';
  const primaryRgb = parseColor(primaryColor);
  const onPrimaryColor = readableTextOn(primaryRgb);

  const operatorTableName = getOperatorTableName(table, activeTableSlug);
  const siteName = table.sleigh_display_name || `${operatorTableName} Santa Sleigh`;
  const logoUrl = table.logo_url || DEFAULT_LOGO;
  const bgImage = (table.background_url && table.background_url.trim()) ? table.background_url.trim() : DEFAULT_BG;
  const effectiveDonateUrl = table.donate_url || table.justgiving_url || '';

  // Open Gift Aid Pre-Checkout Modal or scroll to #donate when arriving via ?donate=1 QR code
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('donate') === '1') {
      if (table.enable_gift_aid && effectiveDonateUrl) {
        setShowGiftAidCheckoutModal(true);
      } else {
        const el = document.getElementById('donate');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [table.enable_gift_aid, effectiveDonateUrl]);

  const handleDonateClick = (e) => {
    if (table.enable_gift_aid && effectiveDonateUrl) {
      e.preventDefault();
      setShowGiftAidCheckoutModal(true);
    }
  };

  const handleSubmitGrantNomination = async (e) => {
    e.preventDefault();
    if (!grantForm.org_name.trim() || !grantForm.contact_email.trim() || !grantForm.cause_summary.trim()) {
      setGrantStatusMsg('❌ Please fill in the organisation name, contact email, and how the funds will help.');
      return;
    }
    setIsSubmittingGrant(true);
    setGrantStatusMsg('');
    try {
      const slug = (activeTableSlug || table.slug || 'beverley').toLowerCase().trim();
      const res = await fetch(`${API_BASE}/api/grants?table=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: grantForm.org_name.trim(),
          contact_name: grantForm.contact_name.trim(),
          contact_email: grantForm.contact_email.trim(),
          contact_phone: grantForm.contact_phone.trim(),
          amount_requested: parseFloat(grantForm.amount_requested) || 0,
          cause_summary: grantForm.cause_summary.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Submission failed');
      setGrantStatusMsg('✅ Thank you! Your local cause grant application has been sent to the Round Table committee.');
      setGrantForm({ org_name: '', contact_name: '', contact_email: '', contact_phone: '', amount_requested: '', cause_summary: '' });
      setTimeout(() => {
        setShowGrantModal(false);
        setGrantStatusMsg('');
      }, 2200);
    } catch (err) {
      setGrantStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  // Ambient Video Settings (Default festive Santa video or custom upload)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const storedBgMode = typeof window !== 'undefined' ? localStorage.getItem(`turbosanta_${activeTableSlug}_bg_mode`) : null;
  const storedVideoUrl = typeof window !== 'undefined' ? (localStorage.getItem(`turbosanta_${activeTableSlug}_bg_video_url`) || localStorage.getItem(`turbosanta_${activeTableSlug}_bg_video`)) : null;
  const customVideoUrl = table.background_video_url || storedVideoUrl || '';
  const bgMode = (table.background_mode !== undefined && table.background_mode !== null && table.background_mode !== '')
    ? table.background_mode
    : (storedBgMode || 'image');
  const isVideoEnabled = (bgMode === 'video' || bgMode === 'custom_video');
  const videoMp4 = (bgMode === 'custom_video' && customVideoUrl) ? customVideoUrl : DEFAULT_VIDEO_MP4;
  const videoWebm = (bgMode === 'custom_video' && table.background_video_webm) ? table.background_video_webm : (bgMode === 'custom_video' ? '' : DEFAULT_VIDEO_WEBM);

  // Listen to zero-scroll dynamic iframe height updates & cross-iframe pin sync
  useEffect(() => {
    const handleResizeMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === 'turbosanta-pin-saved' && e.data.pin) {
        const trackerIframe = document.getElementById('tracker-iframe');
        if (trackerIframe && trackerIframe.contentWindow) {
          try {
            trackerIframe.contentWindow.postMessage(e.data, '*');
          } catch (_) {}
        }
        return;
      }
      if (e.data.type === 'turbosanta-scroll-to-routes') {
        const routesSection = document.getElementById('routes');
        if (routesSection) {
          routesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      if (e.data.type === 'turbosanta-resize' || e.data.height || e.data.frameHeight || e.data.routesHeight || e.data.letterHeight || e.data.niceListHeight || e.data.santasBeenHeight || e.data.snowmanFrameHeight || e.data.addressLookupHeight) {
        const h = e.data.height || e.data.frameHeight || e.data.routesHeight || e.data.letterHeight || e.data.niceListHeight || e.data.santasBeenHeight || e.data.snowmanFrameHeight || e.data.addressLookupHeight;
        if (typeof h === 'number' && h > 60) {
          const iframes = document.querySelectorAll('iframe');
          for (let i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow === e.source) {
              iframes[i].style.height = `${h + 8}px`;
              iframes[i].setAttribute('height', `${h + 8}`);
              break;
            }
          }
        }
      }
    };
    window.addEventListener('message', handleResizeMsg);
    return () => window.removeEventListener('message', handleResizeMsg);
  }, []);

  // 👁️ Record unique visit beacon to update D1 total_views (session deduplicated)
  useEffect(() => {
    if (activeTableSlug) {
      try {
        const sessionKey = 'ts_view_counted_' + activeTableSlug;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, '1');
          const beaconEndpoint = `${API_BASE}/api/track-view?table=${encodeURIComponent(activeTableSlug)}`;
          if (navigator.sendBeacon) {
            navigator.sendBeacon(beaconEndpoint);
          } else {
            fetch(beaconEndpoint, { method: 'POST', keepalive: true }).catch(() => {});
          }
        }
      } catch (e) {}
    }
  }, [activeTableSlug]);

  const videoRef = React.useRef(null);
  const heroRef = React.useRef(null);

  useEffect(() => {
    if (!videoRef.current || !isVideoEnabled || prefersReducedMotion) return;
    const v = videoRef.current;
    v.defaultMuted = true;
    v.muted = true;
    try {
      v.load();
    } catch (e) {}
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const onTouch = () => {
          v.defaultMuted = true;
          v.muted = true;
          v.play().catch(() => {});
          window.removeEventListener('touchstart', onTouch);
          window.removeEventListener('click', onTouch);
        };
        window.addEventListener('touchstart', onTouch, { passive: true });
        window.addEventListener('click', onTouch, { passive: true });
      });
    }
  }, [isVideoEnabled, prefersReducedMotion, videoMp4]);

  // Pause ambient hero video when user scrolls down past hero to save GPU & battery
  useEffect(() => {
    if (!heroRef.current || !videoRef.current || !isVideoEnabled || prefersReducedMotion) return;
    const v = videoRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }, { threshold: 0.05 });

    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [isVideoEnabled, prefersReducedMotion]);

  // Listen for dynamic iframe resizing from address.html
  useEffect(() => {
    const handleMessage = (e) => {
      const h = e.data && Number(e.data.addressLookupHeight);
      if (Number.isFinite(h) && h >= 100 && h <= 5000) {
        setAddressFrameHeight(Math.round(h));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Top-level Screen Wake Lock for Public View Page (keeps phone/tablet screens awake while watching Santa)
  const [isScreenAwake, setIsScreenAwake] = useState(false);
  useEffect(() => {
    let wakeLock = null;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLock = await navigator.wakeLock.request('screen');
          setIsScreenAwake(true);
          wakeLock.addEventListener('release', () => {
            setIsScreenAwake(false);
            wakeLock = null;
          });
        }
      } catch (err) {
        setIsScreenAwake(false);
      }
    };

    requestLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    const handleFirstTouch = () => {
      if (!wakeLock) requestLock();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', handleFirstTouch, { once: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointerdown', handleFirstTouch);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Floating Action Button visibility on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowFab(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Process Routes and Tonight's Spotlight
  const { todayItem, otherRoutes } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rawRoutes = tableData?.routes || [];
    const rawStreets = tableData?.streets || [];

    const processed = rawRoutes
      .map(r => {
        const d = parseRouteDate(r.date);
        if (!d) return null;
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);

        const routeStreets = r.streets || (rawStreets.filter(s => s.route_id === r.id).map(s => s.street_name).join(', ')) || '';

        const routeSponsors = extractRouteSponsors(r);

        return {
          ...r,
          d,
          day,
          routeName: r.name || r.routeName,
          streets: routeStreets,
          sponsors: routeSponsors,
          sponsorName: routeSponsors.map(s => s.name).filter(Boolean).join(' • ') || r.sponsor_name || r.sponsorName,
          sponsorUrl: routeSponsors[0]?.logo_url || r.sponsor_logo_url || r.sponsorUrl || r.sponsor_logo,
          sponsorLink: routeSponsors[0]?.link || r.sponsor_link || r.sponsorLink,
          sponsorDescription: routeSponsors[0]?.description || r.sponsor_description || r.sponsorDescription
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.day - b.day);

    const foundToday = processed.find(item => item.day.getTime() === today.getTime());
    const others = processed.filter(item => item !== foundToday);

    return { todayItem: foundToday, otherRoutes: others };
  }, [tableData]);

  // Native Web Share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: siteName,
        text: `Santa is on his way! Track the ${siteName} live:`,
        url: window.location.href
      }).catch(err => {
        if (err && err.name !== 'AbortError') console.error(err);
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const fundraisingGoal = Number(table.fundraising_goal) || 0;
  const totalRaised = Number(table.total_raised) || 0;
  const progressPct = fundraisingGoal > 0 ? Math.min(100, Math.round((totalRaised / fundraisingGoal) * 100)) : 0;

  const isBeverley = activeTableSlug === 'beverley' || table.slug === 'beverley';

  const resolveSlot = (slotVal) => {
    if (!slotVal || slotVal === 'none' || slotVal === 'disabled' || slotVal === '') return null;
    if (slotVal === 'santa_chat' && !isBeverley) return null;
    return slotVal;
  };

  const rawSlot1 = resolveSlot(table.public_slot_1);
  const rawSlot2 = resolveSlot(table.public_slot_2);
  const slot1Meta = rawSlot1 && PUBLIC_FEATURE_CATALOG[rawSlot1] ? PUBLIC_FEATURE_CATALOG[rawSlot1] : null;
  const slot2Meta = rawSlot2 && rawSlot2 !== rawSlot1 && PUBLIC_FEATURE_CATALOG[rawSlot2] ? PUBLIC_FEATURE_CATALOG[rawSlot2] : null;
  const activeSlots = [slot1Meta, slot2Meta].filter(Boolean);

  const cleanSlug = (activeTableSlug || table.slug || 'beverley').toLowerCase().trim();
  const isPrettyHost = typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('roundtablesantasleigh.co.uk');
  const trackerFullUrl = isPrettyHost
    ? `https://${cleanSlug}.roundtablesantasleigh.co.uk/tracker`
    : `/tracker.html?table=${encodeURIComponent(cleanSlug)}`;
  const crewFullUrl = isPrettyHost
    ? `https://${cleanSlug}.roundtablesantasleigh.co.uk/crew`
    : `/crew.html?table=${encodeURIComponent(cleanSlug)}`;
  const giftAidFullUrl = isPrettyHost
    ? `https://${cleanSlug}.roundtablesantasleigh.co.uk/giftaid`
    : `/gift_aid.html?table=${encodeURIComponent(cleanSlug)}`;

  const heroPartners = useMemo(() => {
    if (Array.isArray(tableData?.partners) && tableData.partners.length > 0) {
      return tableData.partners;
    }
    if (table?.partners_json) {
      try {
        const parsed = typeof table.partners_json === 'string' ? JSON.parse(table.partners_json) : table.partners_json;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (Array.isArray(table?.partners) && table.partners.length > 0) {
      return table.partners;
    }
    if (table?.headline_sponsor_name || table?.headline_sponsor_logo) {
      return [{
        name: table.headline_sponsor_name || '',
        role: table.headline_sponsor_tagline || 'Official Power Partner',
        logo: table.headline_sponsor_logo || '',
        url: table.headline_sponsor_url || ''
      }];
    }
    return [];
  }, [tableData, table]);

  return (
    <div style={{
      fontFamily: "'Open Sans', sans-serif",
      backgroundColor: '#1D1D1A',
      color: '#FFFFFF',
      minHeight: '100vh',
      lineHeight: 1.6,
      position: 'relative',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      '--primary': primaryColor,
      '--on-primary': onPrimaryColor,
      '--border': 'rgba(255, 255, 255, 0.15)',
      '--bg-dark': '#1D1D1A',
      '--bg-card': '#000000',
      '--text-muted': 'rgba(255, 255, 255, 0.7)'
    }}>
      {/* Background with Dark Vignette & Poster Fallback */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#1D1D1A'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `${BG_OVERLAY}, url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Pleasant Festive Ambient Snowfall Overlay */}
      <SnowEffect zIndex={3} opacity={0.65} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
        {/* Live Announcement Bar */}
        {table.live_announcement && (
          <div style={{
            background: 'var(--primary)',
            color: 'var(--on-primary)',
            padding: '10px 16px',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '14px',
            width: '100%',
            maxWidth: '100vw',
            boxSizing: 'border-box'
          }}>
            {table.live_announcement.replace(/^\s*(\?\?|📢|🎅)+\s*/g, '')}
          </div>
        )}

        {/* Navigation */}
        <nav className="public-navbar">
          <div className="public-navbar-brand">
            <img
              src={logoUrl}
              alt={`${siteName} logo`}
              onError={(e) => { e.currentTarget.src = DEFAULT_LOGO; }}
            />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="brand-font">
                {siteName}
              </span>
            </div>
          </div>

          <div className="public-navbar-links">
            <a href="#tracker" className="brand-font">Tracker</a>
            <a href="#routes" className="brand-font">Routes</a>
            <a href="#photos" className="brand-font">Photos</a>
            {activeSlots.map(slot => (
              <a key={slot.id} href={`#${slot.anchorId}`} className="brand-font">{slot.navLabel}</a>
            ))}
            <a href="#faq" className="brand-font">FAQ</a>
            <a href="#donate" className="brand-font nav-donate-pill">Donate</a>
          </div>
        </nav>

        {/* Hero Section */}
        <header
          ref={heroRef}
          style={{
            position: 'relative',
            padding: '70px 20px 80px',
            textAlign: 'center',
            overflow: 'hidden',
            backgroundColor: isVideoEnabled ? '#1D1D1A' : 'transparent',
            background: isVideoEnabled ? '#1D1D1A' : 'radial-gradient(circle at center, rgba(0,0,0,0.5) 0%, transparent 70%)'
          }}
        >
          {/* Ambient Video Background Layer in Hero Banner Only */}
          {isVideoEnabled && (
            <div style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              zIndex: 0,
              pointerEvents: 'none'
            }}>
              <video
                key={videoMp4}
                ref={videoRef}
                src={videoMp4}
                autoPlay
                loop
                muted
                playsInline
                webkit-playsinline="true"
                disablePictureInPicture
                poster={bgImage}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  minWidth: '100%',
                  minHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  transform: 'translate(-50%, -50%)',
                  objectFit: 'cover',
                  opacity: 0.65,
                  pointerEvents: 'none'
                }}
              >
                {videoWebm && <source src={videoWebm} type="video/webm" />}
                <source src={videoMp4} type="video/mp4" />
              </video>
              {/* Bottom Gradient Fade Overlay into solid #1D1D1A */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(29, 29, 26, 0.35) 0%, rgba(29, 29, 26, 0.6) 65%, #1D1D1A 100%)',
                pointerEvents: 'none'
              }} />
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="brand-font" style={{
              fontSize: 'clamp(22px, 5.8vw, 56px)',
              lineHeight: 1.14,
              marginBottom: '15px',
              color: '#FFFFFF',
              textShadow: '0 4px 10px rgba(0,0,0,0.8)',
              overflowWrap: 'break-word',
              wordBreak: 'normal',
              textAlign: 'center',
              maxWidth: '100%'
            }}>
              {(() => {
                const match = siteName.match(/^(.*?)\s+(Round Table)\s*(.*?)$/i);
                if (match) {
                  const townPart = match[1].trim();
                  const rtPart = match[2].trim();
                  const suffix = match[3].trim() || 'Santa Sleigh';
                  return (
                    <>
                      <span style={{ display: 'inline-block' }}>{townPart}</span>{' '}
                      <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{rtPart}</span>{' '}
                      <span style={{ color: 'var(--primary)', display: 'inline-block', whiteSpace: 'nowrap' }}>{suffix}</span>
                    </>
                  );
                }
                const suffixMatch = siteName.match(/(.*?\bRound Table\b)\s*(.*)/i);
                if (suffixMatch && suffixMatch[2]) {
                  return (
                    <>
                      <span>{suffixMatch[1]} </span>
                      <span style={{ color: 'var(--primary)', display: 'inline-block', whiteSpace: 'nowrap' }}>{suffixMatch[2]}</span>
                    </>
                  );
                }
                return <span style={{ color: 'var(--primary)' }}>{siteName}</span>;
              })()}
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 30px', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>
              Follow Santa live on his journey, check when he is visiting your street, and help us raise vital funds for the local community this Christmas!
            </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <a
              href="#tracker"
              className="brand-font"
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                background: 'var(--primary)',
                color: 'var(--on-primary)',
                fontSize: '18px',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                cursor: 'pointer'
              }}
            >
              Track Santa Live
            </a>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share this tracker"
              style={{
                background: 'transparent',
                border: '2px solid var(--border)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '12px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px'
              }}
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>

          {heroPartners && heroPartners.length > 0 && (
            <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                color: 'var(--primary)',
                marginBottom: '14px',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)'
              }}>
                <span style={{ display: 'inline-block', width: '24px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--primary))' }} />
                PARTNERED WITH
                <span style={{ display: 'inline-block', width: '24px', height: '1px', background: 'linear-gradient(90deg, var(--primary), transparent)' }} />
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                justifyContent: 'center',
                gap: heroPartners.length >= 5 ? '10px' : '16px',
                maxWidth: '960px',
                margin: '0 auto'
              }}>
                {heroPartners.map((p, pIdx) => {
                  const pName = p.name || '';
                  const pRole = p.role || p.tagline || 'Official Partner';
                  const pLogo = p.logo || p.logo_url || '';
                  const pUrl = p.url || p.link || p.website || p.website_url || '';
                  const isSingle = heroPartners.length === 1;
                  const isMulti = heroPartners.length >= 5;

                  const BadgeWrapper = pUrl ? 'a' : 'div';
                  const wrapperProps = pUrl ? {
                    href: pUrl,
                    target: '_blank',
                    rel: 'noopener noreferrer sponsored'
                  } : {};

                  return (
                    <BadgeWrapper
                      key={pIdx}
                      {...wrapperProps}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: isSingle ? '16px' : (isMulti ? '10px' : '14px'),
                        padding: isSingle ? '12px 24px' : (isMulti ? '8px 14px' : '10px 18px'),
                        background: 'rgba(18, 20, 24, 0.82)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(251, 175, 51, 0.35)',
                        borderRadius: '14px',
                        textDecoration: 'none',
                        color: '#FFFFFF',
                        boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
                        transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease'
                      }}
                    >
                      {pLogo && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'transparent',
                          borderRadius: isMulti ? '8px' : '10px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          padding: isSingle ? '8px 14px' : (isMulti ? '4px 8px' : '6px 12px'),
                          boxShadow: 'none'
                        }}>
                          <img
                            src={pLogo}
                            alt={pName ? `${pName} logo` : 'Partner logo'}
                            style={{
                              display: 'block',
                              objectFit: 'contain',
                              height: isSingle ? '75px' : (isMulti ? '44px' : '60px'),
                              maxWidth: isSingle ? '240px' : (isMulti ? '120px' : '175px')
                            }}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div style={{ textAlign: 'left', lineHeight: 1.25, minWidth: 0 }}>
                        {pRole && (
                          <div style={{
                            fontSize: isSingle ? '11px' : (isMulti ? '9px' : '10px'),
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: 'var(--primary)',
                            fontWeight: 800,
                            marginBottom: '3px'
                          }}>
                            {pRole}
                          </div>
                        )}
                        {pName && (
                          <div style={{
                            fontSize: isSingle ? '17px' : (isMulti ? '13px' : '15px'),
                            fontWeight: 700,
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: isSingle ? '280px' : (isMulti ? '160px' : '220px')
                          }}>
                            {pName}
                          </div>
                        )}
                      </div>
                    </BadgeWrapper>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

        {/* 1. Live Tracker Section (Embedding tracker.html) */}
        <section id="tracker" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              LIVE <span style={{ color: 'var(--primary)' }}>TRACKER</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Watch Santa's sleigh move in real-time as he visits the streets!
            </p>
            {isScreenAwake && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '12px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '12px',
                color: '#86efac',
                fontWeight: 600
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                <span>Screen Stay-Awake: Active · Display will not sleep</span>
              </div>
            )}
          </div>

          <div style={{
            width: '100%',
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}>
            <iframe
              id="tracker-iframe"
              src={`/tracker.html?table=${encodeURIComponent(activeTableSlug)}`}
              title="Santa Tracker"
              allow="geolocation; screen-wake-lock"
              scrolling="no"
              style={{
                width: '100%',
                height: '75svh',
                minHeight: '520px',
                border: 'none',
                display: 'block'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            marginTop: '18px'
          }}>
            <a
              id="tracker-fullscreen"
              href={trackerFullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-font"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '999px',
                background: 'rgba(251, 175, 51, 0.12)',
                border: '1px solid rgba(251, 175, 51, 0.35)',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                letterSpacing: '0.8px',
                textTransform: 'uppercase'
              }}
            >
              Open Tracker Full-Screen &rarr;
            </a>

            <a
              href="#routes"
              className="brand-font"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                letterSpacing: '0.8px',
                textTransform: 'uppercase'
              }}
            >
              🔔 Get Doorstep Email Alert &rarr;
            </a>
          </div>
        </section>

        {/* 2. Donations & Volunteering Section */}
        <section id="donate" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              HELP US SPREAD <span style={{ color: 'var(--primary)' }}>THE MAGIC</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Every penny raised goes directly back into supporting our local community.
            </p>
          </div>

          <div style={{
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '40px 30px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            maxWidth: '520px',
            margin: '0 auto'
          }}>
            <h3 className="brand-font" style={{ fontSize: '22px', marginBottom: '20px', color: '#FFFFFF' }}>
              FUNDRAISER <span style={{ color: 'var(--primary)' }}>TARGET</span>
            </h3>

            <div style={{
              width: '100%',
              height: '24px',
              background: '#1D1D1A',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              margin: '20px 0'
            }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--primary)',
                borderRadius: '12px',
                transition: 'width 1.5s ease-out'
              }} />
            </div>

            <div className="brand-font" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '22px' }}>
              <span style={{ color: 'var(--primary)' }}>£{totalRaised.toLocaleString()}</span>
              <span style={{ color: 'var(--text-muted)' }}>OF £{fundraisingGoal.toLocaleString()}</span>
            </div>

            {effectiveDonateUrl && (
              <a
                href={effectiveDonateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDonateClick}
                className="brand-font"
                style={{
                  display: 'inline-block',
                  padding: '12px 30px',
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                  fontSize: '18px',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
              >
                Donate Now
              </a>
            )}

            {Boolean(table.enable_gift_aid) && (
              <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <a
                  href={giftAidFullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#86efac',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <span>✨ Donated at the sleigh? Boost it by 25% for free with Gift Aid &rarr;</span>
                </a>
              </div>
            )}
          </div>

          {/* Volunteer Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(29,29,26,0.95) 0%, rgba(0,0,0,0.98) 100%)',
            border: '1px solid var(--primary)',
            borderRadius: '16px',
            padding: '30px 24px',
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            maxWidth: '520px',
            margin: '24px auto 0',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div>
              <h3 className="brand-font" style={{ color: 'var(--primary)', fontSize: '22px', marginBottom: '8px' }}>
                Help Keep The Sleigh Moving!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                We need drivers, navigators, and bucket collectors. Volunteer as an elf this year!
              </p>
            </div>
            <a
              href={crewFullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-font"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 28px',
                background: 'transparent',
                color: 'var(--primary)',
                border: '2px solid var(--primary)',
                fontSize: '15px',
                textDecoration: 'none',
                borderRadius: '8px',
                textTransform: 'uppercase',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              Volunteer Now &rarr;
            </a>
          </div>

          {/* Where Your Donations Go & Local Cause Grant Nominations */}
          <div style={{
            background: '#000000',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '28px 24px',
            margin: '24px auto 0',
            maxWidth: '520px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(251, 175, 51, 0.12)',
              border: '1px solid rgba(251, 175, 51, 0.35)',
              color: 'var(--primary)',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '4px 12px',
              borderRadius: '99px',
              marginBottom: '10px'
            }}>
              💛 100% Back Into Our Community
            </div>
            <h3 className="brand-font" style={{ color: '#FFFFFF', fontSize: '21px', marginBottom: '8px' }}>
              Where Your <span style={{ color: 'var(--primary)' }}>Donations Go</span>
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Every pound collected by {operatorTableName} funds local charities, schools, foodbanks, youth groups, and families in need right here in our town.
            </p>

            {approvedGrants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px', textAlign: 'left' }}>
                {approvedGrants.map((g, idx) => (
                  <div
                    key={g.id || idx}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <strong style={{ color: '#FFFFFF', fontSize: '14px', display: 'block' }}>{g.org_name}</strong>
                      {g.cause_summary && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.4 }}>{g.cause_summary}</span>
                      )}
                    </div>
                    {Number(g.amount_awarded) > 0 && (
                      <span className="brand-font" style={{ color: '#86efac', fontSize: '15px', fontWeight: 800 }}>
                        £{Number(g.amount_awarded).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setGrantStatusMsg(''); setShowGrantModal(true); }}
              className="brand-font"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '11px 22px',
                background: 'rgba(251, 175, 51, 0.14)',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                fontSize: '13px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.6px',
                cursor: 'pointer'
              }}
            >
              🤝 Nominate a Local Cause / Apply for a Grant &rarr;
            </button>
          </div>
        </section>

        {/* 3. Routes & Schedule Section (Embedding address.html & Tonight's Spotlight) */}
        <section id="routes" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              ROUTE <span style={{ color: 'var(--primary)' }}>SCHEDULE</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Find out exactly when Santa is coming to your neighbourhood.
            </p>
          </div>

          {/* Address Lookup iFrame */}
          <div style={{
            width: '100%',
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            marginBottom: '40px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <iframe
              id="address-iframe"
              src={`/address.html?table=${encodeURIComponent(activeTableSlug)}`}
              height={addressFrameHeight}
              title="Address Lookup"
              scrolling="no"
              loading="lazy"
              allow="geolocation"
              style={{
                width: '100%',
                height: `${addressFrameHeight}px`,
                border: 'none',
                display: 'block'
              }}
            />
          </div>

          {/* Dedicated Spotlight for Tonight's Route */}
          {todayItem && (
            <div style={{
              background: '#000000',
              border: todayItem.status_override === 'Postponed' ? '2px solid #ef4444' : '2px solid var(--primary)',
              borderRadius: '16px',
              padding: '26px 30px',
              marginBottom: '35px',
              boxShadow: '0 0 25px rgba(251, 175, 51, 0.2), 0 10px 30px rgba(0,0,0,0.6)',
              display: 'grid',
              gridTemplateColumns: (todayItem.sponsors && todayItem.sponsors.length > 0) ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
              gap: '25px',
              alignItems: 'center'
            }}>
              <div>
                <div
                  className="brand-font"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: todayItem.status_override === 'Postponed' ? '#ef4444' : 'var(--primary)',
                    color: todayItem.status_override === 'Postponed' ? '#FFFFFF' : 'var(--on-primary)',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    marginBottom: '10px'
                  }}>
                  <Star size={14} fill="currentColor" /> {todayItem.status_override === 'Postponed' ? '🌧️ WEATHER UPDATE — POSTPONED' : "TONIGHT'S ROUTE"}
                </div>

                <div
                  className="brand-font"
                  style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '15px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>
                  {todayItem.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {todayItem.start_time && ` | ${todayItem.start_time} - ${todayItem.end_time || '20:30'}`}
                </div>

                <h3 className="brand-font" style={{ fontSize: '32px', color: '#FFFFFF', margin: '4px 0 10px 0' }}>
                  {todayItem.routeName}
                </h3>

                {todayItem.postponed_note && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.14)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                    🌧️ {todayItem.postponed_note}
                  </div>
                )}

                <RouteStreetsPreview
                  streets={todayItem.streets}
                  routeName={todayItem.routeName}
                  dateText={todayItem.d ? todayItem.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                  timeText={todayItem.start_time ? `${todayItem.start_time} - ${todayItem.end_time || '20:30'}` : ''}
                  previewLimit={6}
                  accentColor="var(--primary)"
                  onViewMap={() => {
                    const el = document.getElementById('sleigh-map') || document.getElementById('routes');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>

              {todayItem.sponsors && todayItem.sponsors.length > 0 && (
                <div style={{
                  background: 'rgba(251, 175, 51, 0.06)',
                  border: '1px solid var(--primary)',
                  borderRadius: '12px',
                  padding: '18px',
                  boxShadow: '0 0 15px rgba(251, 175, 51, 0.15)'
                }}>
                  <div
                    className="brand-font"
                    style={{ fontSize: '12px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '12px', letterSpacing: '1.2px' }}>
                    ⭐ {todayItem.sponsors.length > 1 ? "TONIGHT'S SPONSORS:" : "TONIGHT'S SPONSOR:"}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: todayItem.sponsors.length > 1 ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr',
                    gap: '14px'
                  }}>
                    {todayItem.sponsors.map((sp, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: todayItem.sponsors.length > 1 ? '10px' : '0',
                        background: todayItem.sponsors.length > 1 ? 'rgba(255,255,255,0.03)' : 'transparent',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          {sp.logo_url && (
                            <img
                              src={sp.logo_url}
                              alt={sp.name}
                              style={{ width: '56px', height: '56px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '8px', padding: '4px', flexShrink: 0 }}
                            />
                          )}
                          <div>
                            {sp.link ? (
                              <a
                                href={sp.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '16px', textDecoration: 'none' }}
                              >
                                {sp.name} &rarr;
                              </a>
                            ) : (
                              <strong style={{ color: '#FFFFFF', fontSize: '16px' }}>{sp.name}</strong>
                            )}
                          </div>
                        </div>
                        {sp.description && (
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            {sp.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Routes Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {otherRoutes.length === 0 && !todayItem && (
              <p style={{ color: 'var(--text-muted)' }}>No routes scheduled yet. Check back soon!</p>
            )}

            {otherRoutes.map((r, idx) => {
              const isPast = r.day < new Date(new Date().setHours(0,0,0,0));
              return (
                <div
                  key={idx}
                  style={{
                    background: '#000000',
                    border: r.status_override === 'Postponed' ? '1px solid #ef4444' : '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isPast ? 0.5 : 1
                  }}
                >
                  <div
                    className="brand-font"
                    style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '5px', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>
                    {r.status_override === 'Postponed' && <span style={{ color: '#fca5a5' }}>🌧️ POSTPONED | </span>}
                    {isPast && r.status_override !== 'Postponed' && <span style={{ color: '#FFFFFF' }}>✓ COMPLETED | </span>}
                    {r.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {r.start_time && ` | ${r.start_time} - ${r.end_time || '20:30'}`}
                  </div>

                  <h3 className="brand-font" style={{ color: '#FFFFFF', fontSize: '22px', marginBottom: '10px' }}>
                    {r.routeName}
                  </h3>

                  {r.postponed_note && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
                      🌧️ {r.postponed_note}
                    </div>
                  )}

                  <RouteStreetsPreview
                    streets={r.streets}
                    routeName={r.routeName}
                    dateText={r.d ? r.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                    timeText={r.start_time ? `${r.start_time} - ${r.end_time || '20:30'}` : ''}
                    previewLimit={5}
                    accentColor="var(--primary)"
                    onViewMap={() => {
                      const el = document.getElementById('sleigh-map') || document.getElementById('routes');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />

                  {r.sponsors && r.sponsors.length > 0 && (
                    <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                      <div
                        className="brand-font"
                        style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', letterSpacing: '1.2px' }}>
                        SPONSORED BY:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {r.sponsors.map((sp, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {sp.logo_url && (
                              <img
                                src={sp.logo_url}
                                alt={sp.name}
                                style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '6px', padding: '3px', flexShrink: 0 }}
                              />
                            )}
                            <div>
                              {sp.link ? (
                                <a href={sp.link} target="_blank" rel="noopener noreferrer" style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '13px', textDecoration: 'none' }}>
                                  {sp.name} &rarr;
                                </a>
                              ) : (
                                <strong style={{ color: '#FFFFFF', fontSize: '13px' }}>{sp.name}</strong>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>


        {/* 5. Community Partners (Only if explicitly configured for this table) */}
        {(() => {
          const partners = (heroPartners && heroPartners.length > 0)
            ? heroPartners
            : ((table.partners && Array.isArray(table.partners) && table.partners.length > 0) ? table.partners : []);

          if (!partners || partners.length === 0) return null;

          return (
            <section id="partners" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                color: 'var(--primary)',
                marginBottom: '10px'
              }}>
                <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--primary))' }} />
                LOCAL SUPPORT
                <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'linear-gradient(90deg, var(--primary), transparent)' }} />
              </div>
              <h2 className="brand-font" style={{ fontSize: '38px', margin: '0 0 10px 0', color: '#FFFFFF' }}>
                COMMUNITY <span style={{ color: 'var(--primary)' }}>PARTNERS</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '32px' }}>
                Thank you to the generous local organisations keeping the magic rolling.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px',
                textAlign: 'left'
              }}>
                {partners.map((p, idx) => {
                  const pLogo = p.logo || p.logo_url || '';
                  const pName = p.name || '';
                  const pRole = p.role || p.tagline || 'Partner';
                  const pUrl = p.url || p.link || p.website || p.website_url || '';

                  return (
                    <div key={idx} style={{ background: '#000000', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {pLogo && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            borderRadius: '10px',
                            padding: '4px 6px',
                            boxShadow: 'none',
                            flexShrink: 0
                          }}>
                            {pUrl ? (
                              <a href={pUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                                <img
                                  src={pLogo}
                                  alt={pName ? `${pName} logo` : 'Partner logo'}
                                  style={{ height: '52px', maxWidth: '160px', objectFit: 'contain', display: 'block' }}
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <img
                                src={pLogo}
                                alt={pName ? `${pName} logo` : 'Partner logo'}
                                style={{ height: '52px', maxWidth: '160px', objectFit: 'contain', display: 'block' }}
                                loading="lazy"
                              />
                            )}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            className="brand-font"
                            style={{ color: 'var(--primary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 800, marginBottom: '4px' }}>
                            {pRole}
                          </div>
                          <h3 className="brand-font" style={{ fontSize: '20px', color: '#FFFFFF', margin: 0 }}>
                            {pName}
                          </h3>
                        </div>
                      </div>

                      {p.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                          {p.description}
                        </p>
                      )}
                      {pUrl && (
                        <a href={pUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none', marginTop: '4px' }}>
                          Visit {pName} &rarr;
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* 6. Community Polaroids Section (Embedding memory_book.html) */}
        <section id="photos" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', scrollMarginTop: '80px', position: 'relative' }}>
          <span id="memory-book" style={{ position: 'absolute', top: '-80px', left: 0, height: 1, width: 1, opacity: 0, pointerEvents: 'none' }} />
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              COMMUNITY <span style={{ color: 'var(--primary)' }}>POLAROIDS</span>
            </h2>
          {(() => {
            const socialUrl = table.instagram_url || table.facebook_url || table.tiktok_url || '';
            const match = socialUrl.match(/(?:@|instagram\.com\/|tiktok\.com\/@?|facebook\.com\/)([\w\.-]+)/i);
            const handle = match && match[1] && !['profile.php', 'pages', 'groups'].includes(match[1].toLowerCase()) ? ('@' + match[1].replace(/\/$/, '')) : (isBeverley ? '@beverleyroundtable' : null);
            return (
              <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                Spotted Santa? Snap a photo or video and pin your festive polaroids to our community wall!
                {handle && (
                  <span> Posting on socials? Tag us <strong
                    style={{ color: 'var(--primary)', cursor: 'pointer' }}
                    title="Tap to copy handle"
                    onClick={(e) => {
                      navigator.clipboard?.writeText(handle).then(() => {
                        const target = e.currentTarget;
                        const orig = target.textContent;
                        target.textContent = 'Copied! ✓';
                        setTimeout(() => { target.textContent = orig; }, 1500);
                      }).catch(() => {});
                    }}
                  >{handle}</strong> so we can re-share!</span>
                )}
              </p>
            );
          })()}
          </div>

          <div style={{
            width: '100%',
            background: '#000000',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <iframe
              id="memory-book-iframe"
              src={`/memory_book.html?table=${encodeURIComponent(activeTableSlug)}`}
              height="960"
              scrolling="no"
              title="Community Polaroids"
              loading="lazy"
              allow="camera; microphone; geolocation"
              style={{
                width: '100%',
                height: '960px',
                border: 'none',
                display: 'block'
              }}
            />
          </div>
        </section>

        {/* MODULAR PUBLIC FEATURE SLOTS (Max 2 Slots: Underneath Memory Book & Above FAQ) */}
        {activeSlots.map((slot) => {
          const isSlotSanta = slot.id === 'santa_chat';
          return (
            <section
              key={slot.id}
              id={slot.anchorId}
              style={{
                padding: '60px 20px',
                maxWidth: slot.maxWidth ? `${slot.maxWidth}px` : '1000px',
                margin: '0 auto',
                scrollMarginTop: '80px',
                position: 'relative'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(251, 175, 51, 0.1)',
                  border: '1px solid rgba(251, 175, 51, 0.3)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <span>{slot.badge}</span>
                </div>
                <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)', margin: '0 0 10px 0' }}>
                  {slot.title} <span style={{ color: 'var(--primary)' }}>{slot.titleHighlight}</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '640px', margin: '0 auto' }}>
                  {slot.description}
                </p>
              </div>

              <div style={{
                width: '100%',
                maxWidth: slot.maxWidth ? `${slot.maxWidth}px` : '1000px',
                margin: '0 auto',
                background: '#151513',
                borderRadius: '24px',
                border: isSlotSanta ? '2px solid rgba(251, 175, 51, 0.4)' : '1px solid var(--border)',
                overflow: 'hidden',
                boxShadow: isSlotSanta
                  ? '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(251, 175, 51, 0.15)'
                  : '0 20px 50px rgba(0,0,0,0.7)'
              }}>
                {(() => {
                  let targetSrc = slot.embedSrc(activeTableSlug);
                  const joinChar = targetSrc.includes('?') ? '&' : '?';
                  targetSrc += `${joinChar}embed=1&primary=${encodeURIComponent(primaryColor)}&accent=${encodeURIComponent(table.accent_color || '#FBAF33')}`;
                  if (isSlotSanta) {
                    targetSrc += `&provider=gemini`;
                  }
                  return (
                    <iframe
                      id={`feature-${slot.id}-embed`}
                      src={targetSrc}
                      scrolling="no"
                      allow="camera; microphone; geolocation; autoplay"
                      style={{ width: '100%', height: `${slot.height}px`, border: 'none', display: 'block', overflow: 'hidden' }}
                      title={`${slot.title} ${slot.titleHighlight}`}
                      loading="lazy"
                    />
                  );
                })()}
              </div>

              {slot.fullscreenSrc && (
                <div style={{ textAlign: 'center', marginTop: '18px' }}>
                  <a
                    href={slot.fullscreenSrc(activeTableSlug)}
                    target="_blank"
                    rel="noreferrer"
                    className="brand-font"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(251, 175, 51, 0.15)',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      padding: '10px 22px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}
                  >
                    <span>{slot.fullscreenLabel} &rarr;</span>
                  </a>
                </div>
              )}
            </section>
          );
        })}

        {/* 7. FAQ & Safety Section */}
        <section id="faq" style={{ padding: '60px 20px', maxWidth: '840px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              FAQ & <span style={{ color: 'var(--primary)' }}>SAFETY RULES</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Important information about the sleigh routes and how to enjoy the magic safely.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              {
                q: "Will you definitely come down my street tonight?",
                a: "Our routes are a guide, not a guarantee. We are entirely run by volunteers and rely on good weather, clear traffic, and having enough people to safely operate the sleigh. Sometimes we have to cut a route short due to rain, ice, or time restrictions. Please use the live tracker to see exactly where we are!"
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
                a: "Absolutely! We are always looking for enthusiastic volunteers to help collect donations, act as safety walkers, or even drive the towing vehicle. Reach out to us via our social media channels below to get involved."
              }
            ].map((faq, idx) => (
              <details
                key={idx}
                style={{
                  background: '#000000',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
              >
                <summary style={{
                  padding: '18px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '17px',
                  color: '#FFFFFF'
                }}>
                  <span>{faq.q}</span>
                  <ChevronDown size={20} color="var(--primary)" />
                </summary>
                <div style={{
                  padding: '18px 22px',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '15px',
                  lineHeight: 1.6
                }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* 8. About Us Section */}
        <section id="about" style={{ padding: '60px 20px', maxWidth: '840px', margin: '0 auto', scrollMarginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 className="brand-font" style={{ fontSize: '38px', color: '#FFFFFF' }}>
              WHO <span style={{ color: 'var(--primary)' }}>WE ARE</span>
            </h2>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '40px 30px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '20px' }}>
              The Santa Sleigh is proudly operated by <strong style={{ color: 'var(--primary)' }}>{operatorTableName}</strong>.
            </p>
            <p style={{ marginBottom: '20px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Round Table is an events-based club for young men aged 18-45 focused on delivering a programme of social and community events. Whether it be trying a new sport, going on an adventure, or raising money for our communities, we aim to have fun, make friends, and live life to the fullest.
            </p>
            <p className="brand-font" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#FFFFFF' }}>
              Find the friends you've been missing. <span style={{ color: 'var(--primary)' }}>Do More in {currentYear}.</span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '28px', flexWrap: 'wrap' }}>
              <a
                href={table.website_url || 'https://www.roundtable.co.uk'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '24px',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <ExternalLink size={14} /> Official Site
              </a>
              {table.facebook_url && (
                <a href={table.facebook_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '24px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Facebook</a>
              )}
              {table.instagram_url && (
                <a href={table.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '24px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Instagram</a>
              )}
              {table.tiktok_url && (
                <a href={table.tiktok_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '24px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>TikTok</a>
              )}
            </div>
          </div>
        </section>

        {/* Floating Action Button (FAB) for Map */}
        {showFab && (
          <a
            href="#tracker"
            className="brand-font"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: 'var(--primary)',
              color: 'var(--on-primary)',
              padding: '14px 22px',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: 800,
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 999,
              transition: 'transform 0.2s'
            }}
          >
            <MapPin size={18} /> Live Map
          </a>
        )}

        {/* Pre-Checkout +25% Gift Aid Boost Modal */}
        {showGiftAidCheckoutModal && (
          <div
            onClick={() => setShowGiftAidCheckoutModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflowY: 'auto'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#161614',
                border: '1px solid var(--primary)',
                borderRadius: '18px',
                maxWidth: '580px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: '20px',
                position: 'relative',
                boxShadow: '0 24px 60px rgba(0,0,0,0.85)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                <div className="brand-font" style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: 800 }}>
                  ✨ Boost Your Donation by +25% with Gift Aid?
                </div>
                <button
                  type="button"
                  onClick={() => setShowGiftAidCheckoutModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              {effectiveDonateUrl && (
                <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                  <a
                    href={effectiveDonateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowGiftAidCheckoutModal(false)}
                    className="brand-font"
                    style={{
                      display: 'block',
                      padding: '12px 18px',
                      background: 'var(--primary)',
                      color: 'var(--on-primary)',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: '15px',
                      textTransform: 'uppercase'
                    }}
                  >
                    💳 Skip Gift Aid — Go Straight to Online Donation &rarr;
                  </a>
                </div>
              )}

              <iframe
                src={`/gift_aid.html?table=${encodeURIComponent(cleanSlug)}&checkout=1`}
                title="Gift Aid Pre-Checkout Declaration"
                style={{ width: '100%', height: '680px', border: 'none', borderRadius: '12px', background: 'transparent' }}
              />
            </div>
          </div>
        )}

        {/* Local Cause Grant Application / Nomination Modal */}
        {showGrantModal && (
          <div
            onClick={() => setShowGrantModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflowY: 'auto'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#161614',
                border: '1px solid var(--primary)',
                borderRadius: '18px',
                maxWidth: '500px',
                width: '100%',
                padding: '28px 24px',
                position: 'relative',
                boxShadow: '0 24px 60px rgba(0,0,0,0.85)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="brand-font" style={{ fontSize: '22px', color: 'var(--primary)', margin: 0 }}>
                  💛 Nominate a Local Cause
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
                Know a local school, sports club, foodbank, charity, or community project that could benefit from a {operatorTableName} Santa Sleigh grant? Submit an application below!
              </p>

              <form onSubmit={handleSubmitGrantNomination} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Organisation / Cause Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={grantForm.org_name}
                    onChange={(e) => setGrantForm(prev => ({ ...prev, org_name: e.target.value }))}
                    placeholder="e.g. St Nicholas Primary PTA / Local Youth Club"
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: '#fff', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={grantForm.contact_name}
                      onChange={(e) => setGrantForm(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="Your name"
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Amount Requested (£)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={grantForm.amount_requested}
                      onChange={(e) => setGrantForm(prev => ({ ...prev, amount_requested: e.target.value }))}
                      placeholder="e.g. 250"
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={grantForm.contact_email}
                      onChange={(e) => setGrantForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="you@example.com"
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={grantForm.contact_phone}
                      onChange={(e) => setGrantForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="07..."
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: '#fff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    How Will This Grant Help Our Community? *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={grantForm.cause_summary}
                    onChange={(e) => setGrantForm(prev => ({ ...prev, cause_summary: e.target.value }))}
                    placeholder="Tell us briefly what the funds would be used for..."
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0b', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 14px', color: '#fff', fontSize: '14px', fontFamily: 'inherit' }}
                  />
                </div>

                {grantStatusMsg && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: grantStatusMsg.startsWith('✅') ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                    border: grantStatusMsg.startsWith('✅') ? '1px solid #22c55e' : '1px solid #ef4444',
                    color: grantStatusMsg.startsWith('✅') ? '#86efac' : '#fca5a5',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>
                    {grantStatusMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingGrant}
                  className="brand-font"
                  style={{
                    marginTop: '6px',
                    padding: '13px 20px',
                    background: 'var(--primary)',
                    color: 'var(--on-primary)',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmittingGrant ? 'Submitting Application...' : '💛 Submit Grant Nomination'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '40px 20px',
          borderTop: '1px solid var(--border)',
          marginTop: '60px',
          background: '#000000',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          <p>&copy; {currentYear} {siteName}. Powered by TurboSanta.</p>
        </footer>
      </div>
    </div>
  );
}
