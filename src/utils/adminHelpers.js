export const PUBLIC_SLOT_OPTIONS = [
  { id: '', label: 'None (Disabled)', desc: 'Slot is empty. No extra feature rendered on your public site.' },
  { id: 'bingo', label: 'Christmas Sleigh Bingo Game', desc: 'Kerbside spotting game for families waiting on the pavement for the sleigh.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/bingo` },
  { id: 'colouring', label: 'Festive Colouring Book (A4 Printable Studio)', desc: 'Personalized A4 colouring sheets for children to print and colour at home.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/colouring_page` },
  { id: 'countdown', label: 'Christmas Eve Departure Countdown Clock', desc: 'Live countdown ticker to Santa departure from Lapland on Christmas Eve.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/countdown` },
  { id: 'door_hanger', label: 'Official Door Hanger Generator', desc: 'Printable festive door hangers with live tracking QR code for families.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/door_hanger` },
  { id: 'elf_cam', label: 'Lapland Elf Cam (Live Workshop Stream)', desc: 'Live camera feed and status updates directly from Santa Workshop in Lapland.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/elf_cam` },
  { id: 'letter', label: 'Letter to Santa (Wish List Writer)', desc: 'Festive letter stationery for children to write wish lists straight to Lapland.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/letter` },
  { id: 'magic_mailbox', label: 'Magic Lapland Mailbox (Voice Messages)', desc: 'Digital mailbox allowing children to record audio messages directly for Santa.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/magic_mailbox` },
  { id: 'nice_list', label: 'Official Lapland Nice List Certificate', desc: 'Customizable certificate proving the child made Santa Good List this Christmas.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/nice_list` },
  { id: 'santa_chat', label: 'Santa AI Voice Call (ElevenLabs Voice Hotline)', desc: 'Interactive voice call with Santa powered by ElevenLabs conversational AI.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/santa_chat` },
  { id: 'adopt_reindeer', label: 'Adopt an Official Sleigh Reindeer', desc: 'Adopt Rudolph, Dasher, Prancer, or Comet and print an adoption certificate.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/adopt_reindeer` },
  { id: 'santa_frame', label: 'Santa Visited Photo Frame Stamper', desc: 'Commemorative photo frame to stamp family pictures with date of Santa visit.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/santa_frame` },
  { id: 'santa_bot', label: 'Santa AI Chatbot (Interactive Talking Hotline)', desc: 'Universal AI Santa chatbot for families to message Santa directly about routes, reindeer, bedtime, and Lapland magic.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/santa_bot` },
  { id: 'snowman', label: 'Snowman Maker & Creator Studio', desc: 'Interactive snowman builder allowing kids to customise hats, scarves, and mittens.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/snowman` },
  { id: 'spot_santa', label: 'Spot Santa Sightings & Photo Pinning', desc: 'Community Santa sightings map allowing residents to upload photos with location.', preview: (slug) => `https://${encodeURIComponent(slug)}.roundtablesantasleigh.co.uk/spot_santa_form` }
];

export function isManagedGiftAidPlatform(url) {
  if (!url || typeof url !== 'string') return false;
  return /justgiving\.com|paypal\.com|paypal\.me|enthuse\.com|charitycheckout\.co\.uk|crowdfunder\.co\.uk|wonderful\.org|gofundme\.com/i.test(url);
}

export function getManagedPlatformName(url) {
  if (!url) return 'your platform';
  if (/paypal\.(com|me)/i.test(url)) return 'PayPal Giving Fund';
  if (/justgiving\.com/i.test(url)) return 'JustGiving';
  if (/enthuse\.com|charitycheckout\.co\.uk/i.test(url)) return 'Enthuse';
  if (/crowdfunder\.co\.uk/i.test(url)) return 'Crowdfunder';
  if (/wonderful\.org/i.test(url)) return 'Wonderful.org';
  if (/gofundme\.com/i.test(url)) return 'GoFundMe';
  return 'your charity platform';
}

/**
 * Determine whether a route is completed based on explicit status or end-of-day date cutoff.
 */
export function isRouteCompleted(route, now = new Date()) {
  if (!route) return false;
  if (route.status === 'Completed') return true;
  if (route.date) {
    const d = new Date(`${route.date}T23:59:59`);
    if (!Number.isNaN(d.getTime()) && d < now) return true;
  }
  return false;
}

/**
 * Sort routes by date, start time, then name cleanly.
 */
export function sortRoutesChronologically(a, b, desc = false) {
  const dComp = (a.date || '').localeCompare(b.date || '');
  if (dComp !== 0) return desc ? -dComp : dComp;
  const tComp = (a.start_time || '').localeCompare(b.start_time || '');
  if (tComp !== 0) return desc ? -tComp : tComp;
  return (a.name || '').localeCompare(b.name || '');
}

/**
 * Split routes into chronologically sorted planned/upcoming vs completed lists.
 */
export function partitionRoutesByCompletion(routes = [], now = new Date()) {
  const plannedRoutes = [];
  const completedRoutes = [];
  for (const r of routes) {
    if (isRouteCompleted(r, now)) {
      completedRoutes.push(r);
    } else {
      plannedRoutes.push(r);
    }
  }
  plannedRoutes.sort((a, b) => sortRoutesChronologically(a, b, false));
  completedRoutes.sort((a, b) => sortRoutesChronologically(a, b, true));
  return { plannedRoutes, completedRoutes };
}
