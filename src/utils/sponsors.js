/**
 * Charity detection heuristic.
 * Matches explicit type === 'charity', is_charity flags, or key charitable terminology
 * across name, role, tagline, or description.
 */
export function isCharityPartner(entity) {
  if (!entity) return false;
  if (entity.type === 'charity') return true;
  if (entity.is_charity === true || entity.isCharity === true) return true;
  const text = `${entity.name || entity.sponsor_name || ''} ${entity.role || entity.tagline || ''} ${entity.description || entity.sponsor_description || ''}`.toLowerCase();
  const charityRegex = /\b(charity|charities|charitable|foodbank|food\s*bank|larder|pantry|hospice|foundation|trust|good\s*cause|cause|beneficiary|appeal|rescue|air\s*ambulance|cic|cio|shelter|mind|autism|cancer|macmillan|mcmillan|marie\s*curie|rspca|rnli|barnardo|barnardos|nspcc|samaritans|age\s*uk|red\s*cross|salvation\s*army|scouts|guides|brownies|cadets|rotary|round\s*table\s*trust)\b/i;
  return charityRegex.test(text);
}

/**
 * Unified sponsor extractor for route objects.
 * Handles:
 * 1. Array of sponsors already present: route.sponsors
 * 2. JSON string: route.sponsors_json
 * 3. Fallback embedded in notes: <!-- SPONSORS_DATA:[...] --> or [SPONSORS_JSON:...]
 * 4. Joined string decomposition: "Jim's Plumbing • Sharon's Cleaning" or "A | B"
 * 5. Single legacy sponsor fields: sponsor_name, sponsor_logo, sponsor_link, sponsor_description
 */
export function extractRouteSponsors(route) {
  if (!route) return [];

  const normalizeType = (t, entity) => {
    const clean = String(t || '').toLowerCase().trim();
    if (clean === 'charity') return 'charity';
    if (clean === 'sponsor') return 'sponsor';
    return isCharityPartner(entity) ? 'charity' : 'sponsor';
  };

  // 1. Array of sponsors already parsed
  if (Array.isArray(route.sponsors) && route.sponsors.length > 0) {
    const valid = route.sponsors
      .filter(s => s && (s.name || s.sponsor_name || s.logo_url || s.sponsor_logo || s.sponsor_logo_url))
      .map(s => {
        const item = {
          name: (s.name || s.sponsor_name || '').trim(),
          logo_url: (s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '').trim(),
          link: (s.link || s.sponsor_link || '').trim(),
          description: (s.description || s.sponsor_description || '').trim()
        };
        return {
          type: normalizeType(s.type, { ...item, ...s }),
          ...item
        };
      });
    if (valid.length > 0) return valid;
  }

  // 2. sponsors_json field
  if (route.sponsors_json) {
    try {
      const parsed = typeof route.sponsors_json === 'string' ? JSON.parse(route.sponsors_json) : route.sponsors_json;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed
          .filter(s => s && (s.name || s.sponsor_name || s.logo_url || s.sponsor_logo || s.sponsor_logo_url))
          .map(s => {
            const item = {
              name: (s.name || s.sponsor_name || '').trim(),
              logo_url: (s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '').trim(),
              link: (s.link || s.sponsor_link || '').trim(),
              description: (s.description || s.sponsor_description || '').trim()
            };
            return {
              type: normalizeType(s.type, { ...item, ...s }),
              ...item
            };
          });
        if (valid.length > 0) return valid;
      }
    } catch (e) {}
  }

  // 3. Fallback in notes: <!-- SPONSORS_DATA:[...] --> or [SPONSORS_JSON:...]
  if (route.notes) {
    try {
      const match = route.notes.match(/<!--\s*SPONSORS_DATA:\s*(\[.*?\])\s*-->/s) ||
                    route.notes.match(/\[SPONSORS_JSON:\s*(\[.*?\])\s*\]/s);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed
            .filter(s => s && (s.name || s.sponsor_name || s.logo_url || s.sponsor_logo || s.sponsor_logo_url))
            .map(s => {
              const item = {
                name: (s.name || s.sponsor_name || '').trim(),
                logo_url: (s.logo_url || s.sponsor_logo_url || s.sponsor_logo || '').trim(),
                link: (s.link || s.sponsor_link || '').trim(),
                description: (s.description || s.sponsor_description || '').trim()
              };
              return {
                type: normalizeType(s.type, { ...item, ...s }),
                ...item
              };
            });
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {}
  }

  // 4. Auto-decompose joined sponsor names: "Jim's Plumbing • Sharon's Cleaning"
  const rawName = (route.sponsor_name || route.sponsorName || '').trim();
  if (rawName && (rawName.includes(' • ') || rawName.includes(' | '))) {
    const parts = rawName.split(/\s*(?:•|\|)\s*/).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((pName, idx) => {
        const item = {
          name: pName.trim(),
          logo_url: idx === 0 ? (route.sponsor_logo || route.sponsor_logo_url || route.sponsorLogo || '').trim() : '',
          link: idx === 0 ? (route.sponsor_link || route.sponsorLink || '').trim() : '',
          description: idx === 0 ? (route.sponsor_description || route.sponsorDescription || '').trim() : ''
        };
        return {
          type: isCharityPartner(item) ? 'charity' : 'sponsor',
          ...item
        };
      });
    }
  }

  // 5. Single legacy sponsor
  if (rawName || route.sponsor_logo || route.sponsor_logo_url || route.sponsorLogo) {
    const legacyObj = {
      name: rawName,
      logo_url: (route.sponsor_logo || route.sponsor_logo_url || route.sponsorLogo || '').trim(),
      link: (route.sponsor_link || route.sponsorLink || '').trim(),
      description: (route.sponsor_description || route.sponsorDescription || '').trim()
    };
    return [{
      type: isCharityPartner(legacyObj) ? 'charity' : 'sponsor',
      ...legacyObj
    }];
  }

  return [];
}
