/**
 * TurboSanta 2.0 Cloudflare Edge Router ("Santa Router")
 * Domain: roundtablesantasleigh.co.uk & *.roundtablesantasleigh.co.uk
 * 
 * Architecture:
 * - Root Domain (roundtablesantasleigh.co.uk):
 *     /          -> Universal Landing & Admin Login Portal (index.html) + Edge SSR Directory
 *     /national  -> National Leaderboard & Fleet Map (national.html)
 *     /knowledge -> National Knowledge Base (knowledge-base.html)
 *     /support   -> Organiser Ticket & Support Portal (index.html SPA)
 * 
 * - Town Subdomains ({town}.roundtablesantasleigh.co.uk, e.g. beverley.roundtablesantasleigh.co.uk):
 *     /            -> Public Santa Sleigh Tracker (sleigh_v2.html) + Full Edge SSR & Schema.org
 *     /v1          -> Legacy V1 Tracker (santasleigh.html)
 *     /crew        -> Volunteer Crew Hub & Check-in (crew.html)
 *     /godmode     -> Classic God Mode Sleigh Telemetry & PA (god_mode.html)
 *     /address     -> Spatial Street Address Lookup (address.html)
 *     /tracker     -> Fullscreen Live GPS Tracker (tracker.html)
 *     /guide       -> Operations & Elf Briefing Guide (guide.html)
 *     /memory-book -> Public Community Memory Book (memory_book.html)
 *     /giftaid     -> HMRC Gift Aid Booster (gift_aid.html)
 *     /planner     -> Route Planner & GPX Editor (route_planner.html)
 *     /embed       -> Embeddable Widgets Lab (embed.html)
 * 
 * - Backward Compatibility (Automatic 301 Permanent Redirects):
 *     {town}crew.roundtablesantasleigh.co.uk      -> {town}.roundtablesantasleigh.co.uk/crew
 *     {town}godmode.roundtablesantasleigh.co.uk   -> {town}.roundtablesantasleigh.co.uk/godmode
 *     {town}tracker.roundtablesantasleigh.co.uk   -> {town}.roundtablesantasleigh.co.uk/tracker
 *     {town}addresses.roundtablesantasleigh.co.uk -> {town}.roundtablesantasleigh.co.uk/address
 *     {town}giftaid.roundtablesantasleigh.co.uk   -> {town}.roundtablesantasleigh.co.uk/giftaid
 * 
 * - Automatic Edge SEO & Social Share Tags:
 *     Injects dynamic SEO <title>, <meta name="description">, <link rel="canonical">,
 *     host-specific single-subdomain XML sitemaps, Schema.org JSON-LD (NGO, Event, FAQPage),
 *     OpenGraph/Twitter cards, and pre-rendered SSR HTML for instant Google & Bing indexing.
 */

// Canonical aliases for legacy or multi-word table slugs
const CANONICAL_ALIASES = {
  'meltonmowbray': 'melton-mowbray',
  'melton': 'melton-mowbray',
  'darlingtonbondgate': 'darlington',
  'darlington-bondgate': 'darlington',
  'darlingtontongate': 'darlington',
  'westonsupermare': 'weston-super-mare',
  'newcastleupontyne': 'newcastle-upon-tyne',
  'stratforduponavon': 'stratford-upon-avon',
  'isle-of-wight': 'isleofwight',
  'isle_of_wight': 'isleofwight',
  'iow': 'isleofwight',
  'isleofwight': 'isleofwight',
  'knowle-and-dorridge': 'knowleanddorridge',
  'knowle-dorridge': 'knowleanddorridge',
  'knowle_and_dorridge': 'knowleanddorridge',
  'knowleanddorridge': 'knowleanddorridge',
  'moldandbuckley': 'mold',
  'mold-and-buckley': 'mold',
  'mold_and_buckley': 'mold',
  'mold-buckley': 'mold'
};
const resolveCanonicalTown = (t) => (t && CANONICAL_ALIASES[t.toLowerCase()]) || t;

const INDEXNOW_KEY = 'ts8f4d9e2c1b74356890fedcba987654';

const escHtml = (val) => String(val || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const escAttr = escHtml;

const normaliseClockTime = (t, fallback = '17:30') => {
  if (!t || typeof t !== 'string') return fallback;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return fallback;
  const hh = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
  return `${hh}:${m[2]}`;
};

const extractDistinctAreas = (seoAreasRaw, routesList, cleanTownName) => {
  const seen = new Set();
  const out = [];
  const townLower = String(cleanTownName || '').toLowerCase().trim();
  if (townLower) seen.add(townLower);

  const pushArea = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const cleaned = raw
      .replace(/\b(route|night|tour|evening|sleigh|static|switch\s*on|christmas\s*lights|supermarket|tesco|morrisons|asda|sainsburys?|aldis?|lidls?)\b.*$/i, '')
      .replace(/^\s*(route|night)\s*\d+\s*[-:–—]?\s*/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^[-:–—,&\s]+|[-:–—,&\s]+$/g, '')
      .trim();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 44 || /^\d+$/.test(cleaned)) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  };

  if (seoAreasRaw && typeof seoAreasRaw === 'string') {
    for (const part of seoAreasRaw.split(/[,;\n|]+/)) {
      const trimmed = part.trim();
      if (trimmed && trimmed.length >= 2 && trimmed.length <= 50) {
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(trimmed);
        }
      }
    }
  }

  // Automatically enrich with distinct route area/village names if organiser hasn't manually typed areas
  if (out.length < 6 && Array.isArray(routesList)) {
    for (const r of routesList) {
      if (!r?.name) continue;
      for (const seg of String(r.name).split(/\s*(?:,|\/|&|\band\b)\s*/i)) {
        pushArea(seg);
        if (out.length >= 10) break;
      }
      if (out.length >= 10) break;
    }
  }
  return out;
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const PAGES_URL = (env?.PAGES_URL || 'https://turbosanta-app.pages.dev').replace(/\/$/, '');
    try {
      const path = url.pathname.toLowerCase().replace(/\/$/, '') || '/';

      // Configurable backends with defaults
      const API_URL = (env?.API_URL || 'https://turbosanta-api.beverley247.workers.dev').replace(/\/$/, '');
      const fetchApi = (reqOrUrl, init) => {
        if (env?.API && typeof env.API.fetch === 'function') {
          const reqObj = reqOrUrl instanceof Request ? reqOrUrl : new Request(reqOrUrl, init);
          return env.API.fetch(reqObj);
        }
        return fetch(reqOrUrl, init);
      };

      // 1. CORS Preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With, Accept'
          }
        });
      }

      // Host Domain Parsing (used by SEO handlers & routing)
      const isRootDomain =
        host === 'roundtablesantasleigh.co.uk' ||
        host === 'www.roundtablesantasleigh.co.uk' ||
        host === 'localhost' ||
        host === '127.0.0.1';

      const parts = host.split('.');
      const rawSubdomain = parts[0].toLowerCase().replace(/[^a-z0-9-_]/g, '');

      // 2. IndexNow Key Verification, Dynamic Host-Aware Sitemap & Robots.txt
      if (path === `/${INDEXNOW_KEY}.txt`) {
        return new Response(INDEXNOW_KEY, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }

      if (path === '/sitemap.xml') {
        if (rawSubdomain === 'shirley') {
          return Response.redirect('https://shirleyroundtable.co.uk/sitemap.xml', 301);
        }
        try {
          const isTownSub = !isRootDomain && rawSubdomain && !['www', 'national', 'turbosanta', 'admin', 'knowledge', 'wiki', 'elves', 'partner-report', 'partner_report'].includes(rawSubdomain);
          const sitemapApiTarget = isTownSub
            ? `${API_URL}/api/sitemap.xml?scope=town&table=${encodeURIComponent(resolveCanonicalTown(rawSubdomain))}`
            : `${API_URL}/api/sitemap.xml`;
          const sitemapRes = await fetchApi(sitemapApiTarget, {
            cf: { cacheEverything: true, cacheTtl: 1800 }
          });
          if (sitemapRes.ok) return sitemapRes;
        } catch (e) {}
        return fetch(`${PAGES_URL}/sitemap.xml`, {
          cf: { cacheEverything: true, cacheTtl: 3600 }
        });
      }

      if (path === '/robots.txt') {
        const canonicalSub = (!isRootDomain && rawSubdomain && rawSubdomain !== 'www')
          ? resolveCanonicalTown(rawSubdomain)
          : null;
        const sitemapHost = canonicalSub
          ? `${canonicalSub}.roundtablesantasleigh.co.uk`
          : 'roundtablesantasleigh.co.uk';

        const sitemapUrl = (canonicalSub === 'shirley')
          ? 'https://shirleyroundtable.co.uk/sitemap.xml'
          : `https://${sitemapHost}/sitemap.xml`;

        const robotsTxt = [
          `# Official Robots.txt for ${sitemapHost}`,
          `User-agent: *`,
          `Allow: /`,
          `Allow: /tracker`,
          `Allow: /address`,
          `Allow: /memory-book`,
          `Allow: /giftaid`,
          `Allow: /privacy`,
          `Allow: /knowledge`,
          `Allow: /api/payload`,
          `Allow: /api/public/`,
          `Allow: /api/live-gps`,
          `Allow: /api/lookup-street`,
          ``,
          `Disallow: /admin`,
          `Disallow: /support`,
          `Disallow: /national`,
          `Disallow: /godmode`,
          `Disallow: /god_mode`,
          `Disallow: /crew`,
          `Disallow: /hub`,
          `Disallow: /beacon`,
          `Disallow: /planner`,
          `Disallow: /route-planner`,
          `Disallow: /migrate`,
          `Disallow: /partner-report`,
          `Disallow: /santa_studio`,
          `Disallow: /qr_poster`,
          `Disallow: /volunteer_cert`,
          `Disallow: /api/admin/`,
          `Disallow: /api/auth/`,
          `Disallow: /api/telemetry`,
          `Disallow: /api/support/`,
          ``,
          `Sitemap: ${sitemapUrl}`
        ].join('\n');

        return new Response(robotsTxt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600'
          }
        });
      }

      // 3. API & R2 CDN Proxy Pass-Through (with edge cache support for public GET endpoints)
      if (path.startsWith('/api/') || path === '/api' || path.startsWith('/cdn/')) {
        const targetApiUrl = new URL(`${API_URL}${url.pathname}${url.search}`);
        // If called on a town subdomain or with an alias ?table=, forward the canonical slug
        if (targetApiUrl.searchParams.get('table')) {
          targetApiUrl.searchParams.set('table', resolveCanonicalTown(targetApiUrl.searchParams.get('table')));
        } else if (!isRootDomain) {
          const subSlug = host.split('.')[0].toLowerCase();
          if (subSlug && subSlug !== 'www' && subSlug !== 'national') {
            targetApiUrl.searchParams.set('table', resolveCanonicalTown(subSlug));
          }
        }
        const headers = new Headers(request.headers);
        headers.set('Host', new URL(API_URL).hostname);
        const apiReq = new Request(targetApiUrl.toString(), {
          method: request.method,
          headers: headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'follow'
        });
        return fetchApi(apiReq);
      }

      // 4. Static Asset Pass-Through (Fast edge cache)
      const isStaticAsset =
        !path.startsWith('/cdn/') &&
        !path.startsWith('/api/') &&
        (
          path.startsWith('/assets/') ||
          path.startsWith('/icons/') ||
          path.startsWith('/images/') ||
          path.startsWith('/site/') ||
          path.startsWith('/sleigh/') ||
          path === '/sw.js' ||
          path === '/manifest.json' ||
          path === '/favicon.svg' ||
          path === '/donations_v2.js' ||
          path === '/santa-chat.js' ||
          path === '/routes.js' ||
          path === '/embed_generator.js' ||
          /\.(png|jpg|jpeg|svg|webp|gif|webm|mp4|mp3|wav|ogg|m4a|gpx|ico|pdf|woff2|woff|ttf|css|js|json|txt|xml)$/.test(path)
        );

      if (isStaticAsset) {
        return fetch(`${PAGES_URL}${url.pathname}`, {
          cf: { cacheEverything: true, cacheTtl: 3600 }
        });
      }

      // -------------------------------------------------------------
      // 🚀 SUBDOMAIN RESOLUTION & LEGACY BACKWARD COMPATIBILITY
      // -------------------------------------------------------------
      if (rawSubdomain === 'admin') {
        return Response.redirect(`https://roundtablesantasleigh.co.uk/admin${url.search}`, 302);
      }
      if (rawSubdomain === 'support') {
        return Response.redirect(`https://roundtablesantasleigh.co.uk/support${url.search}`, 302);
      }
      if (rawSubdomain === 'turbosanta' || rawSubdomain === 'national') {
        return Response.redirect('https://roundtablesantasleigh.co.uk/', 301);
      }
      if (rawSubdomain === 'meltonmowbray' || rawSubdomain === 'melton') {
        return Response.redirect(`https://melton-mowbray.roundtablesantasleigh.co.uk${url.pathname}${url.search}`, 301);
      }
      if (rawSubdomain === 'darlingtonbondgate' || rawSubdomain === 'darlington-bondgate' || rawSubdomain === 'darlingtontongate') {
        return Response.redirect(`https://darlington.roundtablesantasleigh.co.uk${url.pathname}${url.search}`, 301);
      }
      if (rawSubdomain === 'westonsupermare' || rawSubdomain === 'newcastleupontyne' || rawSubdomain === 'stratforduponavon') {
        return Response.redirect(`https://${CANONICAL_ALIASES[rawSubdomain]}.roundtablesantasleigh.co.uk${url.pathname}${url.search}`, 301);
      }
      if (rawSubdomain === 'isle-of-wight' || rawSubdomain === 'isle_of_wight' || rawSubdomain === 'iow') {
        return Response.redirect(`https://isleofwight.roundtablesantasleigh.co.uk${url.pathname}${url.search}`, 301);
      }
      if (rawSubdomain === 'knowle-and-dorridge' || rawSubdomain === 'knowle-dorridge' || rawSubdomain === 'knowle_and_dorridge') {
        return Response.redirect(`https://knowleanddorridge.roundtablesantasleigh.co.uk${url.pathname}${url.search}`, 301);
      }
      if (rawSubdomain === 'mold-and-buckley' || rawSubdomain === 'mold-buckley' || rawSubdomain === 'mold_and_buckley' || rawSubdomain === 'moldandbuckley') {
        return Response.redirect(`https://mold.roundtablesantasleigh.co.uk${url.pathname}${url.search}`, 301);
      }
      if (['knowledge', 'wiki', 'elves'].includes(rawSubdomain)) {
        return fetch(`${PAGES_URL}/knowledge-base.html`);
      }
      if (['partner-report', 'partner_report'].includes(rawSubdomain)) {
        return fetch(`${PAGES_URL}/partner_report.html`);
      }

      // Check for Legacy Suffixes (301 Permanent Redirect to Clean Paths)
      if (rawSubdomain.endsWith('crew') && rawSubdomain !== 'crew') {
        const town = rawSubdomain.replace(/crew$/, '');
        return Response.redirect(`https://${town}.roundtablesantasleigh.co.uk/crew${url.search}`, 301);
      }
      if (rawSubdomain.endsWith('godmode') && rawSubdomain !== 'godmode') {
        const town = rawSubdomain.replace(/godmode$/, '');
        return Response.redirect(`https://${town}.roundtablesantasleigh.co.uk/godmode${url.search}`, 301);
      }
      if (rawSubdomain.endsWith('tracker') && rawSubdomain !== 'tracker') {
        const town = rawSubdomain.replace(/tracker$/, '');
        return Response.redirect(`https://${town}.roundtablesantasleigh.co.uk/tracker${url.search}`, 301);
      }
      if ((rawSubdomain.endsWith('addresses') || rawSubdomain.endsWith('address')) && !['address', 'addresses'].includes(rawSubdomain)) {
        const town = rawSubdomain.replace(/addresses?$/, '');
        return Response.redirect(`https://${town}.roundtablesantasleigh.co.uk/address${url.search}`, 301);
      }
      if (rawSubdomain.endsWith('giftaid') && rawSubdomain !== 'giftaid') {
        const town = rawSubdomain.replace(/giftaid$/, '');
        return Response.redirect(`https://${town}.roundtablesantasleigh.co.uk/giftaid${url.search}`, 301);
      }
      if (rawSubdomain.endsWith('guide') && rawSubdomain !== 'guide') {
        const town = rawSubdomain.replace(/guide$/, '');
        return Response.redirect(`https://${town}.roundtablesantasleigh.co.uk/guide${url.search}`, 301);
      }

      // Determine Town Slug (from subdomain, or explicit ?table= param; defaults to 'national' on root domain)
      const explicitTableParam = (url.searchParams.get('table') || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      const rawTownSlug = isRootDomain ? (explicitTableParam || 'national') : rawSubdomain;
      const townSlug = resolveCanonicalTown(rawTownSlug);

      // Shirley Round Table: Canonical Town Site Redirect (SEO Consolidation)
      // Visually redirects town turnkey site traffic to https://shirleyroundtable.co.uk so search engines rank their own domain,
      // without affecting the admin portal amendments or operational driver/volunteer tools.
      if (!isRootDomain && townSlug === 'shirley') {
        // 1. Admin & Organizer Management: redirect directly to the main admin portal for Shirley amendments
        const isAdminReq =
          path === '/admin' || path === '/admin/' || path === '/admin.html' || path.startsWith('/admin/') ||
          path === '/support' || path === '/support/' || path.startsWith('/support/') ||
          url.searchParams.get('admin') === '1' || url.searchParams.get('admin') === 'true' ||
          url.searchParams.get('god') === '1' || url.searchParams.get('god') === 'true';

        if (isAdminReq) {
          const newSearch = new URLSearchParams(url.search);
          if (!newSearch.get('table')) newSearch.set('table', 'shirley');
          newSearch.delete('admin');
          newSearch.delete('god');
          const qs = newSearch.toString() ? `?${newSearch.toString()}` : '';
          const cleanAdminPath = path.startsWith('/support') ? '/support' : '/admin';
          return Response.redirect(`https://roundtablesantasleigh.co.uk${cleanAdminPath}${qs}`, 302);
        }

        // 2. Operational Volunteer & Driver Tools: preserve access if needed
        const isOperationalTool =
          (path.startsWith('/tracker') && (url.searchParams.has('driver') || url.searchParams.has('pin') || url.searchParams.has('demo'))) ||
          path === '/beacon' || path === '/beacon.html' ||
          path === '/godmode' || path === '/god_mode' || path === '/godmode.html' || path === '/god_mode.html' ||
          path === '/crew' || path === '/crew.html' ||
          path === '/planner' || path === '/route-planner' || path === '/route_planner' || path === '/route_planner.html' ||
          path === '/santa_studio' || path === '/santa_studio.html' ||
          path === '/hub' || path === '/hub.html' ||
          path === '/qr_poster' || path === '/qr-poster' || path === '/volunteer_cert' || path === '/volunteer-cert';

        if (!isOperationalTool) {
          // 3. Public Turnkey Site & Visitors: 301 Permanent Redirect to Shirley's own website for unified SEO rankings
          const dest = (path === '/tracker' || path === '/tracker.html')
            ? 'https://shirleyroundtable.co.uk/#tracker'
            : `https://shirleyroundtable.co.uk/${url.search ? url.search : ''}`;
          return Response.redirect(dest, 301);
        }
      }

      // -------------------------------------------------------------
      // 🗺️ PATH-BASED FEATURE ROUTING & TEMPLATE RESOLUTION
      // -------------------------------------------------------------
      let templateFile = null;
      let modeTitle = 'Live Tracker';
      let modeDescSuffix = 'Follow Santa live tonight, check the schedule, and donate!';
      let canonicalPath = '/';
      let isNoIndexRoute = false;

      if (path === '/crew' || path === '/crew.html') {
        templateFile = '/crew.html';
        modeTitle = 'Volunteer Crew Hub';
        modeDescSuffix = 'Volunteer briefing, street crew check-in, bucket assignments, and live coordination.';
        canonicalPath = '/crew';
        isNoIndexRoute = true;
      } else if (path === '/godmode' || path === '/god_mode' || path === '/god_mode.html' || path === '/godmode.html') {
        templateFile = '/god_mode.html';
        modeTitle = 'Classic God Mode';
        modeDescSuffix = 'Mission Control: Live GPS beacon monitor, PA soundboard, and driver coordination.';
        canonicalPath = '/godmode';
        isNoIndexRoute = true;
      } else if (path === '/address' || path === '/addresses' || path === '/address.html' || path === '/addresses.html') {
        templateFile = '/address.html';
        modeTitle = 'Street & Postcode Finder';
        modeDescSuffix = 'Search your street or postcode to see exact dates and times when Santa visits your road.';
        canonicalPath = '/address';
      } else if (path === '/tracker' || path === '/tracker.html' || path === '/trackerdemo' || path === '/tracker-demo' || path === '/tracker_demo' || path === '/demo') {
        templateFile = '/tracker.html';
        const isDemo = path.includes('demo');
        modeTitle = isDemo ? 'Live Tracker Simulator & Demo' : 'Fullscreen Live GPS Tracker';
        modeDescSuffix = 'Watch Santa move in real-time across local streets on our fullscreen live GPS radar map.';
        canonicalPath = '/tracker';
        if (isDemo) isNoIndexRoute = true;
      } else if (path === '/guide' || path === '/guide.html') {
        templateFile = '/guide.html';
        modeTitle = 'Elf & Crew Guide';
        modeDescSuffix = 'Volunteer operations handbook, safety rules, and briefing checklist.';
        canonicalPath = '/guide';
        isNoIndexRoute = true;
      } else if (path === '/memory-book' || path === '/memory_book' || path === '/memory_book.html' || path === '/memory-book.html') {
        templateFile = '/memory_book.html';
        modeTitle = 'Community Memory Book';
        modeDescSuffix = 'Festive photo gallery and kerbside memories shared by local families.';
        canonicalPath = '/memory-book';
      } else if (path === '/giftaid' || path === '/gift_aid' || path === '/gift-aid' || path === '/gift_aid.html' || path === '/giftaid.html') {
        templateFile = '/gift_aid.html';
        modeTitle = 'HMRC Gift Aid Booster';
        modeDescSuffix = 'Boost your charitable sleigh donation by 25% at zero extra cost.';
        canonicalPath = '/giftaid';
      } else if (path === '/planner' || path === '/route-planner' || path === '/route_planner' || path === '/route_planner.html' || path === '/planner.html') {
        templateFile = '/route_planner.html';
        modeTitle = 'Route Planner';
        modeDescSuffix = 'Inspect, create, and refine GPX route polylines and street stops.';
        canonicalPath = '/planner';
        isNoIndexRoute = true;
      } else if (path === '/embed' || path === '/embed.html') {
        templateFile = '/embed.html';
        modeTitle = 'Embeddable Widgets';
        modeDescSuffix = 'Embed codes for websites and social portals.';
        canonicalPath = '/embed';
        isNoIndexRoute = true;
      } else if (path === '/hub' || path === '/hub.html') {
        templateFile = '/hub.html';
        modeTitle = 'Operations Hub';
        modeDescSuffix = 'Unified dispatch and volunteer briefing hub.';
        canonicalPath = '/hub';
        isNoIndexRoute = true;
      } else if (path === '/beacon' || path === '/beacon.html') {
        templateFile = '/beacon.html';
        modeTitle = 'Driver Beacon';
        modeDescSuffix = 'GPS telemetry beacon transmitter.';
        canonicalPath = '/beacon';
        isNoIndexRoute = true;
      } else if (path === '/season-wrap' || path === '/season_wrap' || path === '/season_wrap.html') {
        templateFile = '/season_wrap.html';
        modeTitle = 'Season Wrap & Impact Report';
        modeDescSuffix = 'Year-end fundraising and community impact summary.';
        canonicalPath = '/season-wrap';
      } else if (path === '/privacy' || path === '/privacy.html') {
        templateFile = '/privacy.html';
        modeTitle = 'Privacy Policy & GDPR';
        modeDescSuffix = 'Official UK GDPR, Data Protection and Gift Aid retention policy.';
        canonicalPath = '/privacy';
      } else if (isRootDomain && (path === '/national' || path === '/national.html')) {
        templateFile = '/national.html';
        modeTitle = 'National Fleet Overview';
        modeDescSuffix = 'Authorized national board overview.';
        canonicalPath = '/national';
        isNoIndexRoute = true;
      } else if (path === '/knowledge' || path === '/wiki' || path === '/kb' || path === '/knowledge-base.html') {
        templateFile = '/knowledge-base.html';
        modeTitle = 'Knowledge Base';
        modeDescSuffix = 'Lessons learned and organizer tips for Round Table Santa Sleighs.';
        canonicalPath = '/knowledge';
      } else if (path === '/partner-report' || path === '/partner_report' || path === '/partner_report.html') {
        templateFile = '/partner_report.html';
        modeTitle = 'Partner Report';
        modeDescSuffix = 'Corporate partner summary report.';
        canonicalPath = '/partner-report';
        isNoIndexRoute = true;
      } else if (path === '/qr_poster' || path === '/qr-poster' || path === '/qr_poster.html' || path === '/qr-poster.html') {
        templateFile = '/qr_poster.html';
        modeTitle = 'QR Poster Generator';
        modeDescSuffix = 'Printable QR code posters for Santa Sleigh routes and venues.';
        canonicalPath = '/qr_poster';
        isNoIndexRoute = true;
      } else if (path === '/volunteer_cert' || path === '/volunteer-cert' || path === '/volunteer_cert.html' || path === '/volunteer-cert.html') {
        templateFile = '/volunteer_cert.html';
        modeTitle = 'Volunteer Certificate';
        modeDescSuffix = 'Personalized volunteer appreciation certificate generator.';
        canonicalPath = '/volunteer_cert';
        isNoIndexRoute = true;
      } else if (path === '/migrate' || path === '/migrate.html') {
        templateFile = '/migrate.html';
        modeTitle = 'Google Sheets Migration Wizard';
        modeDescSuffix = '1-click automated migration from legacy spreadsheets.';
        canonicalPath = '/migrate';
        isNoIndexRoute = true;
      } else if (
        path === '/travelboast' ||
        path === '/travelboast_test' ||
        path === '/travelboast_test.html' ||
        path === '/travelboast.html' ||
        path === '/route-video' ||
        path === '/route_video' ||
        path === '/mp4'
      ) {
        templateFile = '/travelboast_test.html';
        modeTitle = 'Route MP4 Social Video Generator';
        modeDescSuffix = 'Top-down tracker route animation and MP4 video generator for social media.';
        canonicalPath = '/route-video';
        isNoIndexRoute = true;
      } else if (path === '/admin' || path === '/admin/' || path === '/admin.html' || path === '/support' || path === '/support/') {
        const cleanAdminPath = path.startsWith('/support') ? '/support' : '/admin';
        if (!isRootDomain && townSlug && townSlug !== 'national') {
          const newSearch = new URLSearchParams(url.search);
          if (!newSearch.get('table')) newSearch.set('table', townSlug);
          newSearch.delete('admin');
          const qs = newSearch.toString() ? `?${newSearch.toString()}` : '';
          return Response.redirect(`https://roundtablesantasleigh.co.uk${cleanAdminPath}${qs}`, 302);
        }
        const spaRes = await fetch(`${PAGES_URL}/index.html`);
        const outHeaders = new Headers(spaRes.headers);
        outHeaders.set('X-Robots-Tag', 'noindex, nofollow');
        outHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return new Response(spaRes.body, { status: spaRes.status, headers: outHeaders });
      } else {
        const cleanSubFeatures = [
          '/bingo', '/colouring_page', '/countdown', '/door_hanger', '/elf_cam',
          '/letter', '/magic_mailbox', '/nice_list', '/adopt_reindeer', '/santa_bot', '/santa_chat',
          '/santa_frame', '/santa_studio', '/snowman', '/spot_santa_form', '/suggest'
        ];

        let effectivePath = path;
        if (effectivePath === '/magic_mialbox' || effectivePath === '/magic_mialbox.html' || effectivePath === '/magic-mailbox' || effectivePath === '/magic-mailbox.html') {
          effectivePath = '/magic_mailbox';
        }

        if (isRootDomain) {
          const queryTable = (url.searchParams.get('table') || url.searchParams.get('slug') || '').toLowerCase().trim();
          const isAdmin = url.searchParams.get('admin') === '1' || url.searchParams.get('admin') === 'true';
          const cleanReqPath = effectivePath.replace(/\.html$/, '');
          if (queryTable && !isAdmin && cleanSubFeatures.includes(cleanReqPath)) {
            const newSearch = new URLSearchParams(url.search);
            newSearch.delete('table');
            newSearch.delete('slug');
            const qs = newSearch.toString() ? `?${newSearch.toString()}` : '';
            return Response.redirect(`https://${resolveCanonicalTown(queryTable)}.roundtablesantasleigh.co.uk${cleanReqPath}${qs}`, 302);
          }
        }

        if (!isRootDomain) {
          if (path === '/magic_mialbox' || path === '/magic_mialbox.html') {
            return Response.redirect(`https://${rawSubdomain}.roundtablesantasleigh.co.uk/magic_mailbox${url.search}`, 301);
          }
          if (path.endsWith('.html') && cleanSubFeatures.includes(path.replace(/\.html$/, ''))) {
            return Response.redirect(`https://${rawSubdomain}.roundtablesantasleigh.co.uk${path.replace(/\.html$/, '')}${url.search}`, 301);
          }
        }

        if (cleanSubFeatures.includes(effectivePath)) {
          templateFile = `${effectivePath}.html`;
          canonicalPath = effectivePath;
          if (effectivePath === '/magic_mailbox') {
            modeTitle = 'Magic Mailbox — Send Santa a Voice Message';
            modeDescSuffix = 'Record and post your festive audio messages directly to Santa and his elves!';
          } else if (effectivePath === '/santa_chat') {
            modeTitle = 'Santa Voice Hotline';
            modeDescSuffix = 'Speak live directly with Santa in Lapland on the festive telephone hotline!';
          } else if (effectivePath === '/santa_studio') {
            modeTitle = 'Santa Recording Studio';
            modeDescSuffix = "Listen to children's audio messages and record personalized Santa replies.";
            isNoIndexRoute = true;
          }
        } else if (path === '/v1' || path === '/santasleigh' || path === '/santasleigh.html') {
          templateFile = '/santasleigh.html';
          canonicalPath = '/';
          isNoIndexRoute = true;
        } else if (path === '/v2' || path === '/sleigh_v2' || path === '/sleigh_v2.html') {
          templateFile = '/sleigh_v2.html';
          canonicalPath = '/';
          isNoIndexRoute = true;
        } else if (path.endsWith('.html') && path !== '/index.html') {
          templateFile = path;
          canonicalPath = path.replace(/\.html$/, '');
        }
      }

      if (url.searchParams.has('lab') || url.searchParams.has('sim') || url.searchParams.has('demo') || url.searchParams.get('embed') === '1') {
        isNoIndexRoute = true;
      }

      // -------------------------------------------------------------
      // 🌐 ROOT DOMAIN LANDING PAGE — FULL EDGE SSR TOWN DIRECTORY
      // -------------------------------------------------------------
      if (isRootDomain) {
        if (templateFile) {
          // Proceed below to render explicit root template (e.g. /knowledge, /privacy, /national)
        } else if (path === '/' || path === '') {
          const queryTable = url.searchParams.get('table');
          const isAdmin = url.searchParams.get('admin') === '1' || url.searchParams.get('admin') === 'true' || url.searchParams.get('god') === '1' || url.searchParams.get('god') === 'true';
          if (isAdmin) {
            const newSearch = new URLSearchParams(url.search);
            newSearch.delete('admin');
            newSearch.delete('god');
            const qs = newSearch.toString() ? `?${newSearch.toString()}` : '';
            return Response.redirect(`https://roundtablesantasleigh.co.uk/admin${qs}`, 302);
          }
          if (queryTable) {
            return Response.redirect(`https://${resolveCanonicalTown(queryTable.toLowerCase())}.roundtablesantasleigh.co.uk/${url.search}`, 302);
          }

          // Fetch index.html and registered public tables in parallel for Edge SSR
          const [indexRes, publicTablesData] = await Promise.all([
            fetch(`${PAGES_URL}/index.html`),
            (async () => {
              try {
                const r = await fetchApi(`${API_URL}/api/public/tables`);
                if (r.ok) return await r.json();
              } catch (e) {}
              return null;
            })()
          ]);

          if (!indexRes || !indexRes.ok) {
            return fetch(`${PAGES_URL}/index.html`);
          }

          const publicTables = Array.isArray(publicTablesData?.tables) ? publicTablesData.tables : [];
          const seasonYear = new Date().getFullYear();
          const rootTitle = `Round Table Santa Sleigh Tracker ${seasonYear} — Find Your Local Town, Routes & Street Times`;
          const rootDesc = `Official Round Table Great Britain & Ireland Santa Sleigh directory (${publicTables.length || 30}+ towns). Select your town to watch the live GPS Santa tracker, search street route dates & times, set doorstep alerts, and support local charities.`;
          const rootOgImage = 'https://roundtablesantasleigh.co.uk/icons/RTBI_Santa_dark.png?v=2';

          const rootSchema = {
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://roundtablesantasleigh.co.uk/#organization',
                name: 'Round Table Great Britain & Ireland Santa Sleigh',
                alternateName: ['Round Table Santa Sleigh', 'RTBI Santa Sleigh'],
                url: 'https://roundtablesantasleigh.co.uk/',
                logo: rootOgImage,
                sameAs: ['https://www.roundtable.co.uk', 'https://www.roundtable.co.uk/contact']
              },
              {
                '@type': 'WebSite',
                '@id': 'https://roundtablesantasleigh.co.uk/#website',
                url: 'https://roundtablesantasleigh.co.uk/',
                name: 'Round Table Santa Sleigh',
                publisher: { '@id': 'https://roundtablesantasleigh.co.uk/#organization' }
              },
              ...(publicTables.length > 0 ? [{
                '@type': 'ItemList',
                name: 'Official Round Table Santa Sleigh Towns',
                numberOfItems: publicTables.length,
                itemListElement: publicTables.map((t, idx) => ({
                  '@type': 'ListItem',
                  position: idx + 1,
                  name: t.sleigh_display_name || `${t.town_name} Round Table Santa Sleigh`,
                  url: (t.slug === 'shirley' || t.website_url) ? (t.website_url || 'https://shirleyroundtable.co.uk/') : `https://${t.slug}.roundtablesantasleigh.co.uk/`
                }))
              }] : [])
            ]
          };

          const rootHeadInjection = `
            <title>${escAttr(rootTitle)}</title>
            <meta name="description" content="${escAttr(rootDesc)}" />
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <link rel="canonical" href="https://roundtablesantasleigh.co.uk/" />
            <meta property="og:title" content="${escAttr(rootTitle)}" />
            <meta property="og:description" content="${escAttr(rootDesc)}" />
            <meta property="og:image" content="${escAttr(rootOgImage)}" />
            <meta property="og:url" content="https://roundtablesantasleigh.co.uk/" />
            <meta property="og:type" content="website" />
            <meta property="og:locale" content="en_GB" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${escAttr(rootTitle)}" />
            <meta name="twitter:description" content="${escAttr(rootDesc)}" />
            <meta name="twitter:image" content="${escAttr(rootOgImage)}" />
            ${env?.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${escAttr(env.GOOGLE_SITE_VERIFICATION)}" />` : ''}
            <script type="application/ld+json">${JSON.stringify(rootSchema).replace(/</g, '\\u003c')}</script>
            ${publicTables.length > 0 ? `<script>window.__PREFETCHED_PUBLIC_TABLES__ = ${JSON.stringify(publicTables).replace(/</g, '\\u003c')};</script>` : ''}
          `;

          const ssrTownListHtml = publicTables.length > 0 ? `
            <main style="max-width:1060px;margin:0 auto;padding:48px 24px;color:#eaeae5;font-family:'Open Sans',sans-serif;">
              <h1 style="color:#ffffff;font-size:36px;margin-bottom:12px;">Find Your Local Round Table Santa Sleigh (${seasonYear})</h1>
              <p style="color:rgba(255,255,255,0.75);font-size:16px;line-height:1.6;margin-bottom:28px;">
                Select your local Round Table below to track Santa Claus live on GPS radar, check street-by-street December route schedules, get automatic doorstep alerts, and support 100% local community charities.
              </p>
              <nav aria-label="Registered Round Table Santa Sleigh Towns">
                <ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">
                  ${publicTables.map(t => `
                    <li style="background:#161614;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:16px;">
                      <a href="${(t.slug === 'shirley' || t.website_url) ? (t.website_url || 'https://shirleyroundtable.co.uk/') : `https://${escAttr(t.slug)}.roundtablesantasleigh.co.uk/`}" style="color:#FBAF33;font-weight:700;text-decoration:none;font-size:16px;display:block;">
                        ${escHtml(t.town_name)} Santa Sleigh
                      </a>
                      <div style="color:rgba(255,255,255,0.68);font-size:13px;margin-top:4px;">
                        ${escHtml(t.sleigh_display_name)}${t.seo_areas ? ` — Covering ${escHtml(t.seo_areas)}` : ''}
                      </div>
                    </li>
                  `).join('')}
                </ul>
              </nav>
            </main>
          ` : '';

          const rootRewriter = new HTMLRewriter()
            .on('title, meta[name="description"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]', {
              element(el) { el.remove(); }
            })
            .on('head', {
              element(el) { el.append(rootHeadInjection, { html: true }); }
            })
            .on('div#root', {
              element(el) {
                if (ssrTownListHtml) {
                  el.setInnerContent(ssrTownListHtml, { html: true });
                }
              }
            });

          return rootRewriter.transform(
            new Response(indexRes.body, {
              status: indexRes.status,
              headers: {
                'Content-Type': 'text/html;charset=UTF-8',
                'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
                'X-TurboSanta-Town': 'national',
                'X-TurboSanta-Mode': 'Public Directory SSR',
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'strict-origin-when-cross-origin'
              }
            })
          );
        } else {
          // Unknown route on root: SPA fallback
          const spaRes = await fetch(`${PAGES_URL}/index.html`);
          const outHeaders = new Headers(spaRes.headers);
          outHeaders.set('X-Robots-Tag', 'noindex, nofollow');
          return new Response(spaRes.body, { status: spaRes.status, headers: outHeaders });
        }
      } else {
        // On town subdomains, root "/" serves the public turnkey tracker (V2 experience)
        if (!templateFile && (path === '/' || path === '')) {
          templateFile = '/sleigh_v2.html';
          canonicalPath = '/';
        }
      }

      if (!templateFile) {
        templateFile = '/sleigh_v2.html';
        canonicalPath = '/';
      }

      // -------------------------------------------------------------
      // 🎨 SERVER-SIDE SEO, STRUCTURED DATA & HTML BODY SSR (PARALLEL)
      // -------------------------------------------------------------
      const cleanTemplateFile = templateFile.replace(/\.html$/, '');

      const fetchTemplatePromise = (async () => {
        try {
          let res = await fetch(`${PAGES_URL}${cleanTemplateFile}`, { redirect: 'follow' });
          if (!res || !res.ok) {
            res = await fetch(`${PAGES_URL}${templateFile}`, { redirect: 'follow' });
          }
          return res;
        } catch (e) {
          try {
            return await fetch(`${PAGES_URL}${templateFile}`, { redirect: 'follow' });
          } catch (err) {
            return null;
          }
        }
      })();

      const fetchMetaPromise = (async () => {
        if (townSlug && townSlug !== 'national') {
          try {
            const payloadRes = await fetchApi(`${API_URL}/api/payload?table=${encodeURIComponent(townSlug)}`);
            if (payloadRes.ok) {
              return await payloadRes.json();
            }
          } catch (e) {
            // Fallback silently if offline or cold
          }
        }
        return null;
      })();

      const [templateResponse, tableMeta] = await Promise.all([fetchTemplatePromise, fetchMetaPromise]);

      if (!templateResponse || !templateResponse.ok) {
        return new Response(`Template ${templateFile} not found on Pages origin.`, { status: 404 });
      }

      const tableObj = tableMeta?.table || {};
      const routesList = Array.isArray(tableMeta?.routes) ? tableMeta.routes : [];
      const streetsList = Array.isArray(tableMeta?.streets) ? tableMeta.streets : [];
      const isNationalScope = !townSlug || townSlug === 'national';

      // 301 Permanent Redirect for custom/dynamic Subdomain Aliases (e.g. moldandbuckley -> mold)
      if (!isRootDomain && tableObj.slug && tableObj.slug !== rawSubdomain && rawSubdomain !== 'www') {
        return Response.redirect(`https://${tableObj.slug}.roundtablesantasleigh.co.uk${url.pathname}${url.search}`, 301);
      }

      const formatTownName = (str) => {
        if (!str) return 'Round Table';
        let clean = String(str).replace(/round\s*table/gi, '').replace(/santa'?s?\s*sleigh/gi, '').trim();
        const overrides = {
          'knowleanddorridge': 'Knowle and Dorridge',
          'knowle-and-dorridge': 'Knowle and Dorridge',
          'knowle-dorridge': 'Knowle and Dorridge',
          'isleofwight': 'Isle of Wight',
          'isle-of-wight': 'Isle of Wight',
          'meltonmowbray': 'Melton Mowbray',
          'melton-mowbray': 'Melton Mowbray',
          'westonsupermare': 'Weston-super-Mare',
          'weston-super-mare': 'Weston-super-Mare',
          'newcastleupontyne': 'Newcastle upon Tyne',
          'stratforduponavon': 'Stratford-upon-Avon',
          'darlingtonbondgate': 'Darlington',
          'mold': 'Mold and Buckley',
          'moldandbuckley': 'Mold and Buckley',
          'mold-and-buckley': 'Mold and Buckley',
          'mold-buckley': 'Mold and Buckley'
        };
        const key = clean.toLowerCase().replace(/[-_\s]+/g, '');
        if (overrides[key]) return overrides[key];
        clean = clean.replace(/([a-z]{2,})and([a-z]{2,})/gi, '$1 and $2');
        return clean
          .split(/[-_\s]+/)
          .filter(Boolean)
          .map((w, idx) => (idx > 0 && w.toLowerCase() === 'and') ? 'and' : (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
          .join(' ') || 'Round Table';
      };

      const canonicalSlug = isNationalScope ? 'national' : (tableObj.slug || townSlug);
      const canonicalOrigin = isNationalScope
        ? 'https://roundtablesantasleigh.co.uk'
        : `https://${canonicalSlug}.roundtablesantasleigh.co.uk`;
      const canonicalUrl = `${canonicalOrigin}${canonicalPath === '/' ? '/' : canonicalPath}`;

      const rawDisplayName = isNationalScope
        ? 'Round Table Great Britain & Ireland Santa Sleigh'
        : (tableObj.town_alias ? `${tableObj.town_alias} Round Table Santa Sleigh` : (tableObj.sleigh_display_name || tableObj.name || (formatTownName(townSlug) + ' Round Table Santa Sleigh')));
      const cleanTownName = isNationalScope
        ? 'Round Table Great Britain & Ireland'
        : (tableObj.town_alias || formatTownName(rawDisplayName || townSlug));

      // Determine active sleigh season year (from scheduled routes or current year)
      let seasonYear = new Date().getFullYear();
      for (const r of routesList) {
        const ym = String(r?.date || '').match(/^(20\d{2})-/);
        if (ym) {
          const ry = parseInt(ym[1], 10);
          if (ry >= seasonYear) seasonYear = ry;
        }
      }

      const coveredAreasList = isNationalScope
        ? []
        : extractDistinctAreas(tableObj.seo_areas, routesList, cleanTownName);
      const areaPreview = coveredAreasList.slice(0, 15).join(', ');

      const hasDonateUrl = Boolean(
        (tableObj.donate_url && String(tableObj.donate_url).trim() && String(tableObj.donate_url).trim() !== '#' && String(tableObj.donate_url).trim().toLowerCase() !== 'none') ||
        (tableObj.justgiving_url && String(tableObj.justgiving_url).trim() && String(tableObj.justgiving_url).trim() !== '#' && String(tableObj.justgiving_url).trim().toLowerCase() !== 'none')
      );

      // Build High-Intent Search Engine Title & Meta Description
      const isMainTownLanding = !isNationalScope && canonicalPath === '/' && templateFile === '/sleigh_v2.html';
      let seoTitle;
      if (isNationalScope) {
        seoTitle = `Round Table Santa Sleigh — ${modeTitle}`;
      } else if (isMainTownLanding) {
        seoTitle = (tableObj.seo_title && String(tableObj.seo_title).trim())
          ? String(tableObj.seo_title).trim()
          : `${cleanTownName} Santa Sleigh ${seasonYear} — Live Tracker, Routes & Street Times | ${cleanTownName} Round Table`;
      } else {
        seoTitle = `${cleanTownName} Santa Sleigh — ${modeTitle} | ${cleanTownName} Round Table`;
      }

      let seoDescription;
      if (isNationalScope) {
        seoDescription = `Round Table Great Britain & Ireland: ${modeDescSuffix}`;
      } else if (isMainTownLanding) {
        if (tableObj.seo_description && String(tableObj.seo_description).trim()) {
          seoDescription = String(tableObj.seo_description).trim();
        } else if (routesList.length > 0) {
          const ctaAction = hasDonateUrl ? 'donate locally' : 'support our community';
          seoDescription = `Official ${cleanTownName} Round Table Santa Sleigh ${seasonYear} live GPS tracker & street schedule (${routesList.length} route nights${areaPreview ? ` covering ${areaPreview}` : ''}). Check when Father Christmas visits your street, set doorstep alerts & ${ctaAction}.`;
        } else {
          const ctaTopic = hasDonateUrl ? 'local community charity appeal' : 'local community festive tour';
          seoDescription = `Official ${cleanTownName} Round Table Santa Sleigh live GPS tracker, December street route dates${areaPreview ? ` (${areaPreview})` : ''}, doorstep alerts, and ${ctaTopic}.`;
        }
      } else {
        seoDescription = `${cleanTownName} Round Table Santa Sleigh: ${modeDescSuffix}${areaPreview ? ` Covering ${cleanTownName}, ${areaPreview}.` : ''}`;
      }

      // Build Search Keywords (Used by Bing/Edge/DuckDuckGo + custom table keywords)
      const splitTownParts = !isNationalScope
        ? String(cleanTownName)
            .split(/\s*(?:&|\band\b|,|\/)\s*/i)
            .map(p => p.trim())
            .filter(p => p.length >= 3 && !/^(district|area|surrounding|villages?|valley|vale|borough)$/i.test(p) && p.toLowerCase() !== cleanTownName.toLowerCase())
        : [];

      const keywordItems = !isNationalScope ? Array.from(new Set([
        ...splitTownParts.map(p => `${p} Santa Sleigh`),
        `${cleanTownName} Santa Sleigh`,
        `Santa Sleigh ${cleanTownName}`,
        `${cleanTownName} Round Table`,
        `${cleanTownName} Round Table Santa Sleigh`,
        `${cleanTownName} Santa Tracker`,
        `${cleanTownName} Father Christmas`,
        ...coveredAreasList.slice(0, 20).map(a => `${a} Santa Sleigh`),
        ...(tableObj.seo_keywords ? String(tableObj.seo_keywords).split(/[,;\n]+/).map(k => k.trim()).filter(Boolean) : [])
      ])) : [];

      // Exclusively use the Table's custom logo; NEVER fall back to a corporate sponsor logo on social link previews
      let ogImage = tableObj.logo_url || '';
      if (!ogImage || ogImage.includes('RTBI_Santa.png') || ogImage === '/icons/RTBI_Santa.png') {
        ogImage = 'https://roundtablesantasleigh.co.uk/icons/RTBI_Santa_dark.png?v=2';
      } else if (ogImage.startsWith('/')) {
        ogImage = `https://roundtablesantasleigh.co.uk${ogImage}`;
      }

      // Group streets by route_id for Schema.org Events & SSR route cards
      const streetsByRoute = new Map();
      for (const s of streetsList) {
        if (!s?.route_id || !s?.street_name) continue;
        if (!streetsByRoute.has(s.route_id)) streetsByRoute.set(s.route_id, []);
        streetsByRoute.get(s.route_id).push(s.street_name);
      }

      // Build Schema.org Structured Data (@graph: NGO + WebSite + Scheduled Route Events + FAQPage)
      let jsonLdScript = '';
      if (!isNationalScope && !isNoIndexRoute) {
        const sameAsLinks = [
          tableObj.website_url,
          tableObj.facebook_url,
          tableObj.instagram_url,
          tableObj.tiktok_url
        ].filter(u => typeof u === 'string' && /^https?:\/\//i.test(u.trim())).map(u => u.trim());

        const areaServedPlaces = [cleanTownName, ...coveredAreasList]
          .slice(0, 15)
          .map(placeName => ({ '@type': 'Place', name: placeName }));

        const graph = [
          {
            '@type': 'NGO',
            '@id': `${canonicalOrigin}/#organization`,
            name: rawDisplayName,
            alternateName: Array.from(new Set([
              ...splitTownParts.map(p => `${p} Santa Sleigh`),
              ...splitTownParts.map(p => `${p} Round Table`),
              `${cleanTownName} Santa Sleigh`,
              `${cleanTownName} Round Table`,
              ...(tableObj.table_number ? [`${cleanTownName} Round Table #${tableObj.table_number}`] : [])
            ])),
            url: `${canonicalOrigin}/`,
            logo: ogImage,
            image: ogImage,
            description: seoDescription,
            areaServed: areaServedPlaces,
            parentOrganization: {
              '@type': 'Organization',
              name: 'Round Table Great Britain & Ireland',
              url: 'https://www.roundtable.co.uk'
            },
            ...(sameAsLinks.length > 0 ? { sameAs: sameAsLinks } : {})
          },
          {
            '@type': 'WebSite',
            '@id': `${canonicalOrigin}/#website`,
            url: `${canonicalOrigin}/`,
            name: `${cleanTownName} Santa Sleigh`,
            publisher: { '@id': `${canonicalOrigin}/#organization` }
          }
        ];

        if (isMainTownLanding && routesList.length > 0) {
          const datedRoutes = routesList
            .filter(r => r && r.name && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '').trim()))
            .slice(0, 20);

          for (const r of datedRoutes) {
            const rDate = String(r.date).trim();
            const sTime = normaliseClockTime(r.start_time, '17:30');
            const eTime = normaliseClockTime(r.end_time, '20:30');
            const rStreets = (streetsByRoute.get(r.id) || []).slice(0, 10);
            const isPostponed = /postponed|cancel/i.test(`${r.status_override || ''} ${r.status || ''}`);

            graph.push({
              '@type': 'Event',
              name: `${cleanTownName} Santa Sleigh — ${r.name}`,
              startDate: `${rDate}T${sTime}:00`,
              endDate: `${rDate}T${eTime}:00`,
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              eventStatus: isPostponed ? 'https://schema.org/EventPostponed' : 'https://schema.org/EventScheduled',
              isAccessibleForFree: true,
              image: [ogImage],
              description: `Santa Claus and ${cleanTownName} Round Table volunteer elves visit ${r.name}${rStreets.length > 0 ? ` (including ${rStreets.join(', ')})` : ''}. Watch the live GPS tracker at ${canonicalOrigin}/`,
              location: {
                '@type': 'Place',
                name: `${r.name}, ${cleanTownName}`,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: cleanTownName,
                  addressCountry: 'GB'
                }
              },
              organizer: { '@id': `${canonicalOrigin}/#organization` }
            });
          }
        }

        if (isMainTownLanding) {
          let faqItems = [];
          try {
            const rawFaqs = tableObj.faqs || (tableObj.faqs_json ? (typeof tableObj.faqs_json === 'string' ? JSON.parse(tableObj.faqs_json) : tableObj.faqs_json) : null);
            if (Array.isArray(rawFaqs) && rawFaqs.length > 0) {
              faqItems = rawFaqs
                .map(f => ({ q: String(f?.q || f?.question || '').trim(), a: String(f?.a || f?.answer || '').trim() }))
                .filter(f => f.q && f.a)
                .slice(0, 10);
            }
          } catch (_) {}

          if (faqItems.length === 0) {
            faqItems = [
              {
                q: `When is the ${cleanTownName} Santa Sleigh visiting my street?`,
                a: `Check our street-by-street ${cleanTownName} Round Table Santa Sleigh schedule and search your road or postcode at ${canonicalOrigin}/ to see exact dates, times, and live GPS tracking.`
              },
              {
                q: `How do I track the ${cleanTownName} Santa Sleigh live tonight?`,
                a: `Open the live GPS Sleigh Radar at ${canonicalOrigin}/tracker on any phone or computer to watch Santa move turn-by-turn in real time, or set a free 250m Doorstep Alert.`
              },
              hasDonateUrl ? {
                q: `Do ${cleanTownName} Round Table sleigh elves accept contactless card donations as well as cash?`,
                a: `Yes! Volunteer collectors carry traditional sealed cash buckets alongside QR codes and online donation options, with 100% of proceeds supporting local ${cleanTownName} charities and good causes.`
              } : {
                q: `How can I support our local ${cleanTownName} Santa Sleigh?`,
                a: `You can support us by coming out to wave to Santa, sharing our live tracker with friends and neighbours, or volunteering as an elf to walk alongside the sleigh!`
              }
            ];
          }

          graph.push({
            '@type': 'FAQPage',
            mainEntity: faqItems.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: f.a
              }
            }))
          });
        }

        jsonLdScript = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
      }

      const robotsDirective = isNoIndexRoute
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

      const verificationTokens = Array.from(new Set([
        tableObj.google_site_verification,
        env?.GOOGLE_SITE_VERIFICATION
      ].filter(v => typeof v === 'string' && v.trim())));

      const headInjection = `
        <title>${escAttr(seoTitle)}</title>
        <meta name="description" content="${escAttr(seoDescription)}" />
        ${keywordItems.length > 0 ? `<meta name="keywords" content="${escAttr(keywordItems.join(', '))}" />` : ''}
        <meta name="robots" content="${robotsDirective}" />
        <link rel="canonical" href="${escAttr(canonicalUrl)}" />
        ${!isNationalScope ? `<meta name="geo.region" content="GB" />\n        <meta name="geo.placename" content="${escAttr(cleanTownName)}" />` : ''}
        ${verificationTokens.map(tok => `<meta name="google-site-verification" content="${escAttr(tok.trim())}" />`).join('\n        ')}
        <meta property="og:title" content="${escAttr(seoTitle)}" />
        <meta property="og:description" content="${escAttr(seoDescription)}" />
        <meta property="og:site_name" content="${escAttr(rawDisplayName)}" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:image" content="${escAttr(ogImage)}" />
        <meta property="og:image:secure_url" content="${escAttr(ogImage)}" />
        <meta property="og:image:width" content="500" />
        <meta property="og:image:height" content="500" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:url" content="${escAttr(canonicalUrl)}" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escAttr(seoTitle)}" />
        <meta name="twitter:description" content="${escAttr(seoDescription)}" />
        <meta name="twitter:image" content="${escAttr(ogImage)}" />
        ${jsonLdScript}

        ${!isNationalScope ? `<script>
          // Injected by TurboSanta Cloudflare Edge Router
          window.__TURBOSANTA_DEFAULT_TABLE__ = "${canonicalSlug}";
          window.__sleighTableSlug = "${canonicalSlug}";
          ${tableMeta ? `window.__sleighPrefetchedData = ${JSON.stringify(tableMeta).replace(/</g, '\\u003c')};` : ''}

          // URLSearchParams automatic polyfill for zero-query routing
          (function() {
            const _origGet = URLSearchParams.prototype.get;
            URLSearchParams.prototype.get = function(name) {
              if (name === 'table') {
                const val = _origGet.call(this, name);
                return val || '${canonicalSlug}';
              }
              return _origGet.call(this, name);
            };
            const _origHas = URLSearchParams.prototype.has;
            URLSearchParams.prototype.has = function(name) {
              if (name === 'table') {
                return true;
              }
              return _origHas.call(this, name);
            };
          })();
        </script>` : ''}
      `;

      let rewriter = new HTMLRewriter()
        .on('title, meta[name="description"], meta[name="keywords"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]', {
          element(el) { el.remove(); }
        })
        .on('head', {
          element(el) {
            el.append(headInjection, { html: true });
          }
        });

      // Pre-render Town-Specific Semantic HTML into sleigh_v2.html for Wave-1 Search Engine Crawlers
      if (isMainTownLanding) {
        const ssrSubcopy = hasDonateUrl
          ? `Follow the official ${cleanTownName} Round Table Santa Sleigh live on GPS radar${coveredAreasList.length > 0 ? ` across ${cleanTownName}, ${coveredAreasList.slice(0, 15).join(', ')}` : ''}, check street-by-street December route dates and times, set automatic doorstep alerts, and help our volunteers raise vital funds for local causes.`
          : `Follow the official ${cleanTownName} Round Table Santa Sleigh live on GPS radar${coveredAreasList.length > 0 ? ` across ${cleanTownName}, ${coveredAreasList.slice(0, 15).join(', ')}` : ''}, check street-by-street December route dates and times, set automatic doorstep alerts, and join our volunteers in bringing festive cheer to our local community this Christmas!`;

        const ssrRoutesHtml = routesList.length > 0
          ? routesList.slice(0, 24).map((r) => {
              const rStreets = (streetsByRoute.get(r.id) || []).slice(0, 18);
              const dateLabel = r.date ? `${r.date}${r.start_time ? ` • ${r.start_time}` : ''}` : 'Scheduled Sleigh Route';
              return `<article class="glass-bento-card"><div class="section-eyebrow">${escHtml(dateLabel)}</div><h3>${escHtml(r.name || `${cleanTownName} Route`)}</h3>${rStreets.length > 0 ? `<p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">Streets: ${escHtml(rStreets.join(', '))}</p>` : ''}</article>`;
            }).join('')
          : '';

        let customLinksArr = [];
        if (tableObj.custom_links_json) {
          try {
            const cl = typeof tableObj.custom_links_json === 'string' ? JSON.parse(tableObj.custom_links_json) : tableObj.custom_links_json;
            if (Array.isArray(cl)) customLinksArr = cl.filter(item => item && (item.label || item.name) && item.url);
          } catch (_) {}
        } else if (Array.isArray(tableObj.custom_links)) {
          customLinksArr = tableObj.custom_links;
        }

        const ssrSocialLinks = [
          tableObj.website_url && { href: tableObj.website_url, label: `${cleanTownName} Round Table Website` },
          tableObj.facebook_url && { href: tableObj.facebook_url, label: 'Facebook' },
          tableObj.instagram_url && { href: tableObj.instagram_url, label: 'Instagram' },
          tableObj.tiktok_url && { href: tableObj.tiktok_url, label: 'TikTok' },
          tableObj.ladies_circle_url && { href: tableObj.ladies_circle_url, label: 'Ladies Circle' },
          tableObj.club_41_url && { href: tableObj.club_41_url, label: '41 Club' },
          tableObj.tangent_url && { href: tableObj.tangent_url, label: 'Tangent Club' },
          ...customLinksArr.map(cl => ({ href: cl.url, label: cl.label || cl.name }))
        ].filter(Boolean);

        const ssrSocialHtml = ssrSocialLinks.map(l =>
          `<a href="${escAttr(l.href)}" target="_blank" rel="noopener noreferrer" class="btn-glass btn-sm"><span>${escHtml(l.label)}</span></a>`
        ).join('');

        rewriter = rewriter
          .on('#header-title', {
            element(el) { el.setInnerContent(rawDisplayName); }
          })
          .on('#hero-town-hl', {
            element(el) { el.setInnerContent(cleanTownName); }
          })
          .on('#hero-subcopy', {
            element(el) { el.setInnerContent(ssrSubcopy); }
          })
          .on('#metric-routes', {
            element(el) {
              if (routesList.length > 0) el.setInnerContent(String(routesList.length));
            }
          })
          .on('#metric-streets', {
            element(el) {
              if (streetsList.length > 0) el.setInnerContent(String(streetsList.length));
            }
          })
          .on('#all-routes-count', {
            element(el) {
              el.setInnerContent(String(routesList.length));
            }
          })
          .on('#routes-bento-grid', {
            element(el) {
              if (ssrRoutesHtml) el.setInnerContent(ssrRoutesHtml, { html: true });
            }
          })
          .on('#impact-charity-name', {
            element(el) {
              el.setInnerContent(tableObj.charity_name || `${cleanTownName} Round Table`);
            }
          })
          .on('#footer-club-heading', {
            element(el) {
              el.setInnerContent(`${cleanTownName.toUpperCase()} ROUND TABLE`);
            }
          })
          .on('#footer-social-pills', {
            element(el) {
              if (ssrSocialHtml) el.setInnerContent(ssrSocialHtml, { html: true });
            }
          })
          .on('#copyright-name', {
            element(el) {
              el.setInnerContent(rawDisplayName);
            }
          });

        if (!hasDonateUrl) {
          rewriter = rewriter
            .on('#header-donate-btn', {
              element(el) { el.setAttribute('style', 'display:none;'); }
            })
            .on('#hero-donate-cta', {
              element(el) { el.setAttribute('style', 'display:none;'); }
            })
            .on('#mobile-dock-donate', {
              element(el) { el.setAttribute('style', 'display:none;'); }
            });

          if (Number(tableObj.total_raised || 0) <= 0) {
            rewriter = rewriter
              .on('#fundraiser-card', {
                element(el) { el.setAttribute('style', 'display:none;'); }
              })
              .on('#impact-side-stack', {
                element(el) { el.setAttribute('class', 'impact-side-stack span-full'); }
              });
          }
        }
      }

      const responseHeaders = {
        'Content-Type': 'text/html;charset=UTF-8',
        'X-TurboSanta-Town': canonicalSlug,
        'X-TurboSanta-Mode': modeTitle,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };

      if (isNoIndexRoute) {
        responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        responseHeaders['Pragma'] = 'no-cache';
        responseHeaders['Expires'] = '0';
        responseHeaders['X-Robots-Tag'] = 'noindex, nofollow';
      } else {
        responseHeaders['Cache-Control'] = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300';
      }

      return rewriter.transform(
        new Response(templateResponse.body, {
          status: templateResponse.status,
          headers: responseHeaders
        })
      );
    } catch (routerErr) {
      console.error('[FATAL_ROUTER_UNHANDLED_EXCEPTION]', routerErr?.stack || routerErr);
      return fetch(`${PAGES_URL}${url.pathname}${url.search}`, {
        headers: request.headers,
        redirect: 'follow'
      });
    }
  }
};
