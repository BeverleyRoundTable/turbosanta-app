/**
 * TurboSanta 2.0 Cloudflare Edge Router ("Santa Router")
 * Domain: roundtablesantasleigh.co.uk & *.roundtablesantasleigh.co.uk
 * 
 * Architecture:
 * - Root Domain (roundtablesantasleigh.co.uk):
 *     /          -> Universal Landing & Admin Login Portal (index.html)
 *     /national  -> National Leaderboard & Fleet Map (national.html)
 *     /knowledge -> National Knowledge Base (knowledge-base.html)
 * 
 * - Town Subdomains ({town}.roundtablesantasleigh.co.uk, e.g. beverley.roundtablesantasleigh.co.uk):
 *     /            -> Public Santa Sleigh Tracker (santasleigh.html)
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
 * - Automatic Social Share Tags:
 *     Injects dynamic OpenGraph (og:title, og:image, og:description) and Twitter Cards
 *     tailored to the town for beautiful sharing on WhatsApp, Facebook, and Instagram.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase().replace(/\/$/, '') || '/';
    const origin = url.origin;

    // Configurable backends with defaults
    const PAGES_URL = (env?.PAGES_URL || 'https://turbosanta-app.pages.dev').replace(/\/$/, '');
    const LEGACY_PAGES_URL = (env?.LEGACY_PAGES_URL || 'https://brt-23f.pages.dev').replace(/\/$/, '');
    const API_URL = (env?.API_URL || 'https://turbosanta-api.beverley247.workers.dev').replace(/\/$/, '');

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // 2. Static Asset Pass-Through (Fast edge cache)
    const isStaticAsset = 
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
      /\.(png|jpg|jpeg|svg|webp|gif|webm|mp4|woff2|woff|ttf|css|js|json)$/.test(path);

    if (isStaticAsset) {
      // Primary fetch from current Pages build, fallback to legacy assets if needed
      try {
        let res = await fetch(`${PAGES_URL}${url.pathname}`, {
          cf: { cacheEverything: true, cacheTtl: 3600 }
        });
        if (res.status === 404) {
          res = await fetch(`${LEGACY_PAGES_URL}${url.pathname}`, {
            cf: { cacheEverything: true, cacheTtl: 3600 }
          });
        }
        return res;
      } catch (e) {
        return fetch(`${LEGACY_PAGES_URL}${url.pathname}`, {
          cf: { cacheEverything: true, cacheTtl: 3600 }
        });
      }
    }

    // 3. API Proxy Pass-Through
    if (path.startsWith('/api/') || path === '/api') {
      const targetApiUrl = new URL(`${API_URL}${url.pathname}${url.search}`);
      const headers = new Headers(request.headers);
      headers.set('Host', new URL(API_URL).hostname);
      const apiReq = new Request(targetApiUrl.toString(), {
        method: request.method,
        headers: headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow'
      });
      return fetch(apiReq);
    }

    // 4. Host Domain Parsing
    const isRootDomain = 
      host === 'roundtablesantasleigh.co.uk' || 
      host === 'www.roundtablesantasleigh.co.uk' ||
      host === 'localhost' ||
      host === '127.0.0.1';

    // -------------------------------------------------------------
    // 🚀 SUBDOMAIN RESOLUTION & LEGACY BACKWARD COMPATIBILITY
    // -------------------------------------------------------------
    const parts = host.split('.');
    const rawSubdomain = parts[0].toLowerCase();

    if (rawSubdomain === 'turbosanta' || rawSubdomain === 'national') {
      return Response.redirect('https://roundtablesantasleigh.co.uk/', 301);
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

    // Determine Town Slug (from subdomain, or fallback to query param)
    const townSlug = isRootDomain ? (url.searchParams.get('table') || 'beverley').toLowerCase() : rawSubdomain;

    // -------------------------------------------------------------
    // 🗺️ PATH-BASED FEATURE ROUTING & TEMPLATE RESOLUTION
    // -------------------------------------------------------------
    let templateFile = null;
    let modeTitle = 'Live Tracker';
    let modeDescSuffix = 'Follow Santa live tonight, check the schedule, and donate!';

    if (path === '/crew' || path === '/crew.html') {
      templateFile = '/crew.html';
      modeTitle = 'Volunteer Crew Hub';
      modeDescSuffix = 'Volunteer briefing, street crew check-in, bucket assignments, and live coordination.';
    } else if (path === '/godmode' || path === '/god_mode' || path === '/god_mode.html' || path === '/godmode.html') {
      templateFile = '/god_mode.html';
      modeTitle = 'Classic God Mode';
      modeDescSuffix = 'Mission Control: Live GPS beacon monitor, PA soundboard, and driver coordination.';
    } else if (path === '/address' || path === '/addresses' || path === '/address.html' || path === '/addresses.html') {
      templateFile = '/address.html';
      modeTitle = 'Street & Address Finder';
      modeDescSuffix = 'Search your street or use your location to see exactly when Santa visits your doorstep.';
    } else if (path === '/tracker' || path === '/tracker.html') {
      templateFile = '/tracker.html';
      modeTitle = 'Fullscreen Live Tracker';
      modeDescSuffix = 'Full-screen satellite map with real-time GPS tracking of Santa Claus.';
    } else if (path === '/guide' || path === '/guide.html') {
      templateFile = '/guide.html';
      modeTitle = 'Elf & Crew Guide';
      modeDescSuffix = 'Volunteer operations handbook, safety rules, and briefing checklist.';
    } else if (path === '/memory-book' || path === '/memory_book' || path === '/memory_book.html' || path === '/memory-book.html') {
      templateFile = '/memory_book.html';
      modeTitle = 'Community Memory Book';
      modeDescSuffix = 'Festive photo gallery and messages from families across the community.';
    } else if (path === '/giftaid' || path === '/gift_aid' || path === '/gift-aid' || path === '/gift_aid.html' || path === '/giftaid.html') {
      templateFile = '/gift_aid.html';
      modeTitle = 'HMRC Gift Aid Booster';
      modeDescSuffix = 'Boost your charitable donation by 25% at zero extra cost.';
    } else if (path === '/planner' || path === '/route-planner' || path === '/route_planner' || path === '/route_planner.html' || path === '/planner.html') {
      templateFile = '/route_planner.html';
      modeTitle = 'Route Planner';
      modeDescSuffix = 'Inspect, create, and refine GPX route polylines and street stops.';
    } else if (path === '/embed' || path === '/embed.html') {
      templateFile = '/embed.html';
      modeTitle = 'Embeddable Widgets';
      modeDescSuffix = 'Embed codes for websites and social portals.';
    } else if (path === '/hub' || path === '/hub.html') {
      templateFile = '/hub.html';
      modeTitle = 'Operations Hub';
      modeDescSuffix = 'Unified dispatch and volunteer briefing hub.';
    } else if (path === '/beacon' || path === '/beacon.html') {
      templateFile = '/beacon.html';
      modeTitle = 'Driver Beacon';
      modeDescSuffix = 'GPS telemetry beacon transmitter.';
    } else if (path === '/season-wrap' || path === '/season_wrap' || path === '/season_wrap.html') {
      templateFile = '/season_wrap.html';
      modeTitle = 'Season Wrap & Impact Report';
      modeDescSuffix = 'Year-end fundraising and route metrics review.';
    } else if (isRootDomain && (path === '/national' || path === '/national.html')) {
      templateFile = '/national.html';
      modeTitle = 'National Fleet Overview';
      modeDescSuffix = 'Authorized national board overview.';
    } else if (path === '/knowledge' || path === '/wiki' || path === '/kb' || path === '/knowledge-base.html') {
      templateFile = '/knowledge-base.html';
      modeTitle = 'Knowledge Base';
      modeDescSuffix = 'Lessons learned and organizer tips for Round Table Santa Sleighs.';
    } else if (path === '/partner-report' || path === '/partner_report' || path === '/partner_report.html') {
      templateFile = '/partner_report.html';
      modeTitle = 'Partner Report';
      modeDescSuffix = 'Corporate partner summary report.';
    } else if (path.endsWith('.html') && path !== '/index.html') {
      // Pass through any other direct HTML file (e.g. countdown.html, nice_list.html, etc.)
      templateFile = path;
    }

    // -------------------------------------------------------------
    // 🌐 ROOT DOMAIN VS SUBDOMAIN ROUTING RESOLUTION
    // -------------------------------------------------------------
    if (isRootDomain) {
      if (templateFile) {
        // If an explicit template or subfeature was requested on root domain
        // (e.g. /hub.html?table=beverley, /tracker.html, /national.html, etc.)
        // proceed below to fetch and render that template!
      } else if (path === '/' || path === '') {
        // If visiting root with ?table=xxx and not requesting admin, redirect to clean subdomain
        const queryTable = url.searchParams.get('table');
        const isAdmin = url.searchParams.get('admin') === '1' || url.searchParams.get('admin') === 'true';
        if (queryTable && !isAdmin) {
          return Response.redirect(`https://${queryTable.toLowerCase()}.roundtablesantasleigh.co.uk/${url.search}`, 302);
        }
        // Universal Landing & Admin App
        return fetch(`${PAGES_URL}/index.html`);
      } else {
        // Unknown route on root: SPA fallback
        return fetch(`${PAGES_URL}/index.html`);
      }
    } else {
      // On town subdomains, root "/" serves the public santasleigh tracker
      if (!templateFile && (path === '/' || path === '')) {
        templateFile = '/santasleigh.html';
      }
    }

    if (!templateFile) {
      templateFile = '/santasleigh.html';
    }

    // -------------------------------------------------------------
    // 🎨 SERVER-SIDE SOCIAL METADATA & DATA INJECTION
    // -------------------------------------------------------------
    let templateResponse = null;
    try {
      templateResponse = await fetch(`${PAGES_URL}${templateFile}`, {
        cf: { cacheEverything: true, cacheTtl: 300 }
      });
      if (!templateResponse.ok) {
        templateResponse = await fetch(`${LEGACY_PAGES_URL}${templateFile}`, {
          cf: { cacheEverything: true, cacheTtl: 300 }
        });
      }
    } catch(e) {
      templateResponse = await fetch(`${LEGACY_PAGES_URL}${templateFile}`, {
        cf: { cacheEverything: true, cacheTtl: 300 }
      });
    }

    if (!templateResponse || !templateResponse.ok) {
      return new Response(`Template ${templateFile} not found on Pages origin.`, { status: 404 });
    }

    // Fetch Table Metadata from Edge API (Cache for 60s)
    let tableMeta = null;
    try {
      const cache = caches.default;
      const metaKey = new Request(`https://${host}/__edge_cache_table_meta_${townSlug}`);
      let cachedMeta = await cache.match(metaKey);

      if (cachedMeta) {
        tableMeta = await cachedMeta.json();
      } else {
        const payloadRes = await fetch(`${API_URL}/api/payload?table=${encodeURIComponent(townSlug)}`, {
          cf: { cacheEverything: true, cacheTtl: 60 }
        });
        if (payloadRes.ok) {
          tableMeta = await payloadRes.json();
          ctx.waitUntil(cache.put(metaKey, new Response(JSON.stringify(tableMeta), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
          })));
        }
      }
    } catch (e) {
      // Fallback silently if offline or cold
    }

    // Formatting Display Titles & Open Graph Cards
    const tableObj = tableMeta?.table || {};
    const rawDisplayName = tableObj.sleigh_display_name || tableObj.name || (townSlug.charAt(0).toUpperCase() + townSlug.slice(1) + ' Round Table Santa Sleigh');
    const cleanTownName = rawDisplayName.replace(/santa'?s?/i, '').replace(/sleigh/i, '').replace(/round\s+table/i, '').trim() || (townSlug.charAt(0).toUpperCase() + townSlug.slice(1));
    const fullDisplayTitle = `${cleanTownName} Round Table Santa Sleigh — ${modeTitle}`;
    const description = `${cleanTownName} Round Table: ${modeDescSuffix}`;
    const ogImage = tableObj.logo_url || tableObj.headline_sponsor_logo || 'https://brt-23f.pages.dev/icons/RTBI_Santa.png';

    // HTMLRewriter transforms the HTML at edge speed
    const headInjection = `
      <title>${fullDisplayTitle}</title>
      <meta property="og:title" content="${fullDisplayTitle}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${ogImage}" />
      <meta property="og:url" content="${url.href}" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${fullDisplayTitle}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${ogImage}" />

      <script>
        // Injected by TurboSanta Cloudflare Edge Router
        window.__TURBOSANTA_DEFAULT_TABLE__ = "${townSlug}";
        window.__sleighTableSlug = "${townSlug}";
        ${tableMeta ? `window.__sleighPrefetchedData = ${JSON.stringify(tableMeta).replace(/</g, '\\u003c')};` : ''}

        // URLSearchParams automatic polyfill for zero-query routing
        (function() {
          const _origGet = URLSearchParams.prototype.get;
          URLSearchParams.prototype.get = function(name) {
            if (name === 'table') {
              const val = _origGet.call(this, name);
              return val || '${townSlug}';
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
      </script>
    `;

    const rewriter = new HTMLRewriter()
      .on('title, meta[property^="og:"], meta[name^="twitter:"]', {
        element(el) { el.remove(); }
      })
      .on('head', {
        element(el) {
          el.append(headInjection, { html: true });
        }
      });

    return rewriter.transform(
      new Response(templateResponse.body, {
        status: templateResponse.status,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=60',
          'X-TurboSanta-Town': townSlug,
          'X-TurboSanta-Mode': modeTitle
        }
      })
    );
  }
};
