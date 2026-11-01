const fs = require('fs');

const js = fs.readFileSync('public/sleigh_v2.js', 'utf8');
const css = fs.readFileSync('public/sleigh_v2.css', 'utf8');

// 1. Verify CSS partner-logo-stage has background: transparent
const partnerStageTransparent = css.includes('.partner-logo-stage {\n  width: 100%;\n  height: 86px;\n  background: transparent;');
console.log('partner-logo-stage is transparent:', partnerStageTransparent);

// 2. Verify route-sponsors-list in CSS
const hasRouteSponsorsList = css.includes('.route-sponsors-list');
console.log('route-sponsors-list defined in CSS:', hasRouteSponsorsList);

// 3. Verify sleigh_v2.js maps over all sponsors
const mapsAllSponsors = js.includes('sponsors.map(sp => `') && js.includes('route-sponsors-list');
console.log('sleigh_v2.js maps all sponsors individually:', mapsAllSponsors);

// 4. Test Ringwood route with 2 sponsors in mock execution
const mockRoute = {
  name: 'Ringwood',
  date: '2026-12-10',
  sponsors: [
    {
      name: 'The Railway Pub & Kitchen',
      logo_url: 'https://turbosanta-api.beverley247.workers.dev/cdn/beverley/1792070959991_wgjzsb.png',
      link: 'https://www.ringwoodrailway.com/'
    },
    {
      name: '3D Landscapes',
      logo_url: 'https://3d-landscapes.co.uk/wp-content/uploads/2025/12/Logo.webp',
      link: 'https://3d-landscapes.co.uk/'
    }
  ]
};

// Test getRouteSponsors logic
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
  return list;
}

const res = getRouteSponsors(mockRoute);
console.log('Extracted sponsors count:', res.length);
res.forEach((s, i) => {
  console.log(`  Sponsor ${i+1}: ${s.name} | Logo: ${Boolean(s.logo)} | URL: ${Boolean(s.url)}`);
});
