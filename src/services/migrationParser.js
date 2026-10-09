import * as XLSX from 'xlsx';

/**
 * Converts an Excel serial date number (e.g. 45995) or raw string into ISO YYYY-MM-DD
 */
export function formatExcelDate(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
    // Excel serial date starting from 1899-12-30
    const utcDays = Math.floor(val - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const ukMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ukMatch) {
    const d = ukMatch[1].padStart(2, '0');
    const m = ukMatch[2].padStart(2, '0');
    const y = ukMatch[3];
    return `${y}-${m}-${d}`;
  }
  return str;
}

/**
 * Converts an Excel time fraction (e.g. 0.75 -> 18:00) or raw string into HH:MM
 */
export function formatExcelTime(val) {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'number' && val >= 0 && val <= 1) {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
  const str = String(val).trim();
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  return str;
}

/**
 * Slugifies a string for database IDs
 */
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extracts Google Sheet ID from any standard Google Sheets URL
 */
export function extractGoogleSheetId(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Main parser function: takes an ArrayBuffer / Uint8Array and returns structured TurboSanta 2.0 data
 */
export function parseTurboSantaWorkbook(arrayBuffer, tableSlug = 'beverley') {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = wb.SheetNames;

  const result = {
    source: 'excel',
    tableSlug,
    sheetNames,
    settings: {
      sleigh_name: '',
      sleigh_display_name: '',
      donate_url: '',
      charity_name: '',
      fundraising_goal: 5000,
      primary_color: '#FBAF33',
      accent_color: '#D31C1C',
      pa_presets: [],
      volunteer_roles: []
    },
    routes: [],
    streets: [],
    volunteers: [],
    sponsors: [],
    donations: {
      goal: 5000,
      total_raised: 0,
      ledger: []
    },
    giftAid: [],
    checklist: [],
    summary: {
      routesCount: 0,
      streetsCount: 0,
      volunteersCount: 0,
      sponsorsCount: 0,
      donationsCount: 0
    }
  };

  // Helper to find sheet by case-insensitive name
  const findSheet = (pattern) => {
    const name = sheetNames.find(s => s.toLowerCase().includes(pattern.toLowerCase()));
    return name ? wb.Sheets[name] : null;
  };

  // =========================================================================
  // 1. SETTINGS SHEET
  // =========================================================================
  const settingsSheet = findSheet('setting');
  if (settingsSheet) {
    const rows = XLSX.utils.sheet_to_json(settingsSheet, { header: 1 });
    const kv = {};

    rows.forEach(r => {
      if (!Array.isArray(r)) return;
      const key = r[0] ? String(r[0]).trim().toLowerCase() : '';
      const val = r[1] !== undefined ? String(r[1]).trim() : '';
      if (key && val) {
        kv[key] = val;
      }

      // Column S (index 18) = PA Presets
      if (r[18] && typeof r[18] === 'string' && r[18].trim() && r[18].trim() !== '.' && !r[18].includes('Preset PA')) {
        result.settings.pa_presets.push(r[18].trim());
      }
      // Column U (index 20) = Volunteer Roles
      if (r[20] && typeof r[20] === 'string' && r[20].trim() && r[20].trim() !== '.' && !r[20].includes('Crew Roles')) {
        result.settings.volunteer_roles.push(r[20].trim());
      }
    });

    if (kv.sleigh_display_name) result.settings.sleigh_display_name = kv.sleigh_display_name;
    else if (kv.sleigh_name) result.settings.sleigh_display_name = `${kv.sleigh_name.toUpperCase()} Santa Sleigh`;

    if (kv.sleigh_name) result.settings.sleigh_name = kv.sleigh_name;
    if (kv.donate_url) result.settings.donate_url = kv.donate_url;
    if (kv.charity_name) result.settings.charity_name = kv.charity_name;
    if (kv.fundraising_goal) result.settings.fundraising_goal = parseFloat(kv.fundraising_goal) || 5000;
    if (kv.primary_color) result.settings.primary_color = kv.primary_color;
    if (kv.accent_color) result.settings.accent_color = kv.accent_color;
  }

  // Fallback defaults for settings if blank
  if (!result.settings.sleigh_display_name) {
    result.settings.sleigh_display_name = `${tableSlug.charAt(0).toUpperCase() + tableSlug.slice(1)} Round Table Santa Sleigh`;
  }

  // =========================================================================
  // 2. ROUTES SHEET
  // =========================================================================
  const routesSheet = findSheet('route');
  if (routesSheet) {
    const rawRows = XLSX.utils.sheet_to_json(routesSheet, { header: 1 });
    if (rawRows.length > 0) {
      const headerRow = rawRows[0] || [];

      // Find standard columns
      const colMap = {};
      headerRow.forEach((col, idx) => {
        if (!col) return;
        const c = String(col).toLowerCase().trim();
        if (c === 'routename' || c === 'name' || c === 'route') colMap.name = idx;
        else if (c === 'date') colMap.date = idx;
        else if (c.includes('start')) colMap.startTime = idx;
        else if (c.includes('end')) colMap.endTime = idx;
        else if (c === 'gpxurl' || c.includes('gpx')) colMap.gpx = idx;
        else if (c === 'sponsorurl' || c.includes('sponsor')) colMap.sponsor = idx;
        else if (c === 'streets' || c.includes('street')) colMap.streets = idx;
      });

      // Find example columns fallback
      const exMap = {};
      headerRow.forEach((col, idx) => {
        if (!col) return;
        const c = String(col).toLowerCase().trim();
        if (c.includes('example_routename')) exMap.name = idx;
        else if (c.includes('example_date')) exMap.date = idx;
        else if (c.includes('example_start')) exMap.startTime = idx;
        else if (c.includes('example_end')) exMap.endTime = idx;
        else if (c.includes('example_gpx')) exMap.gpx = idx;
        else if (c.includes('example_sponsor')) exMap.sponsor = idx;
        else if (c.includes('example_streets')) exMap.streets = idx;
      });

      let streetSeq = 1;

      // First pass: try standard columns
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        let nameVal = colMap.name !== undefined ? row[colMap.name] : (row[4] || row[0]);
        if (!nameVal) continue;
        const nameStr = String(nameVal).trim();
        if (nameStr.startsWith('Example_') || nameStr === '') continue;

        const dateRaw = colMap.date !== undefined ? row[colMap.date] : row[0];
        const startRaw = colMap.startTime !== undefined ? row[colMap.startTime] : row[2];
        const endRaw = colMap.endTime !== undefined ? row[colMap.endTime] : row[3];
        const gpxRaw = colMap.gpx !== undefined ? row[colMap.gpx] : row[5];
        const sponsorRaw = colMap.sponsor !== undefined ? row[colMap.sponsor] : row[6];
        const streetsRaw = colMap.streets !== undefined ? row[colMap.streets] : row[8];

        const routeId = `${tableSlug}_${slugify(nameStr)}`;
        const parsedDate = formatExcelDate(dateRaw);
        const parsedStart = formatExcelTime(startRaw);
        const parsedEnd = formatExcelTime(endRaw);

        // Parse streets
        const routeStreetNames = [];
        if (streetsRaw) {
          const list = String(streetsRaw)
            .split(/[,;\n\r]+/)
            .map(s => s.trim())
            .filter(Boolean);
          list.forEach(sName => {
            if (!routeStreetNames.includes(sName)) {
              routeStreetNames.push(sName);
              result.streets.push({
                id: streetSeq++,
                route_id: routeId,
                street_name: sName,
                sequence_order: routeStreetNames.length
              });
            }
          });
        }

        result.routes.push({
          id: routeId,
          table_id: tableSlug,
          name: nameStr,
          date: parsedDate,
          start_time: parsedStart || '18:00',
          end_time: parsedEnd || '20:30',
          gpx_url: gpxRaw ? String(gpxRaw).trim() : '',
          sponsor_logo: sponsorRaw ? String(sponsorRaw).trim() : '',
          status: 'Scheduled',
          streets_count: routeStreetNames.length,
          streets: routeStreetNames
        });
      }

      // Second pass: if no standard routes were filled in, parse example rows if populated
      if (result.routes.length === 0 && exMap.name !== undefined) {
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const nameVal = row[exMap.name];
          if (!nameVal) continue;
          let nameStr = String(nameVal).trim();
          if (nameStr === '') continue;

          // Clean up example name if it starts with Example_
          const cleanName = nameStr.replace(/^Example_/i, '').replace(/_/g, ' ');

          const dateRaw = exMap.date !== undefined ? row[exMap.date] : null;
          const startRaw = exMap.startTime !== undefined ? row[exMap.startTime] : null;
          const endRaw = exMap.endTime !== undefined ? row[exMap.endTime] : null;
          const gpxRaw = exMap.gpx !== undefined ? row[exMap.gpx] : null;
          const sponsorRaw = exMap.sponsor !== undefined ? row[exMap.sponsor] : null;
          const streetsRaw = exMap.streets !== undefined ? row[exMap.streets] : null;

          const routeId = `${tableSlug}_${slugify(cleanName)}`;
          const parsedDate = formatExcelDate(dateRaw);
          const parsedStart = formatExcelTime(startRaw);
          const parsedEnd = formatExcelTime(endRaw);

          const routeStreetNames = [];
          if (streetsRaw) {
            const list = String(streetsRaw)
              .split(/[,;\n\r]+/)
              .map(s => s.trim())
              .filter(Boolean);
            list.forEach(sName => {
              if (!routeStreetNames.includes(sName)) {
                routeStreetNames.push(sName);
                result.streets.push({
                  id: streetSeq++,
                  route_id: routeId,
                  street_name: sName,
                  sequence_order: routeStreetNames.length
                });
              }
            });
          }

          result.routes.push({
            id: routeId,
            table_id: tableSlug,
            name: cleanName,
            date: parsedDate,
            start_time: parsedStart || '18:00',
            end_time: parsedEnd || '20:30',
            gpx_url: gpxRaw ? String(gpxRaw).trim() : '',
            sponsor_logo: sponsorRaw ? String(sponsorRaw).trim() : '',
            status: 'Scheduled',
            streets_count: routeStreetNames.length,
            streets: routeStreetNames
          });
        }
      }
    }
  }

  // =========================================================================
  // 3. ROADLOOKUP SHEET
  // =========================================================================
  const roadSheet = findSheet('roadlookup') || findSheet('streets');
  if (roadSheet) {
    const rawRoads = XLSX.utils.sheet_to_json(roadSheet, { header: 1 });
    if (rawRoads.length > 1) {
      let extraSeq = result.streets.length + 1;
      for (let i = 1; i < rawRoads.length; i++) {
        const row = rawRoads[i];
        if (!row || !row[0]) continue;
        const streetName = String(row[0]).trim();
        const routeName = row[1] ? String(row[1]).trim() : '';
        if (streetName && !streetName.startsWith('Example_')) {
          const matchingRoute = result.routes.find(r => r.name.toLowerCase() === routeName.toLowerCase());
          const routeId = matchingRoute ? matchingRoute.id : (result.routes[0]?.id || `${tableSlug}_route_1`);

          const alreadyAdded = result.streets.some(s => s.route_id === routeId && s.street_name.toLowerCase() === streetName.toLowerCase());
          if (!alreadyAdded) {
            result.streets.push({
              id: extraSeq++,
              route_id: routeId,
              street_name: streetName,
              sequence_order: result.streets.filter(s => s.route_id === routeId).length + 1
            });
          }
        }
      }
    }
  }

  // =========================================================================
  // 4. VOLUNTEERS SHEET
  // =========================================================================
  const volSheet = findSheet('volunteer');
  if (volSheet) {
    const volRows = XLSX.utils.sheet_to_json(volSheet, { header: 1 });
    if (volRows.length > 1) {
      for (let i = 1; i < volRows.length; i++) {
        const r = volRows[i];
        if (!r || r.length === 0) continue;
        const name = r[2] ? String(r[2]).trim() : (r[1] ? String(r[1]).trim() : '');
        if (!name || name.startsWith('Example_') || name === '.') continue;

        const routeName = r[1] ? String(r[1]).trim() : (r[0] ? String(r[0]).trim() : '');
        const role = r[3] ? String(r[3]).trim() : 'Bucket Collector';
        const phone = r[4] ? String(r[4]).trim() : '';
        const email = r[5] ? String(r[5]).trim() : '';
        const org = r[6] ? String(r[6]).trim() : '';
        const bucket = r[8] ? String(r[8]).trim() : '';
        const checkedIn = String(r[7]).toLowerCase().includes('check') || r[7] === true || r[7] === 1;

        result.volunteers.push({
          id: result.volunteers.length + 1,
          table_id: tableSlug,
          route_name: routeName || 'General Sleigh Night',
          name,
          role,
          phone,
          email,
          organisation: org,
          checked_in: checkedIn ? 1 : 0,
          bucket_number: bucket
        });
      }
    }
  }

  // =========================================================================
  // 5. SPONSORS SHEET
  // =========================================================================
  const sponsorSheet = findSheet('sponsor');
  if (sponsorSheet) {
    const spRows = XLSX.utils.sheet_to_json(sponsorSheet, { header: 1 });
    if (spRows.length > 1) {
      for (let i = 1; i < spRows.length; i++) {
        const r = spRows[i];
        if (!r) continue;
        // Check primary col 0 or example col 15
        const company = r[0] ? String(r[0]).trim() : (r[15] ? String(r[15]).trim() : '');
        if (!company) continue;

        const isExample = !r[0] && r[15];
        const offset = isExample ? 15 : 0;

        result.sponsors.push({
          company,
          contact_name: r[offset + 1] ? String(r[offset + 1]).trim() : '',
          email: r[offset + 2] ? String(r[offset + 2]).trim() : '',
          phone: r[offset + 3] ? String(r[offset + 3]).trim() : '',
          sponsorship_type: r[offset + 4] ? String(r[offset + 4]).trim() : 'Route Sponsor',
          amount_pledged: parseFloat(r[offset + 5]) || 0,
          amount_received: parseFloat(r[offset + 6]) || 0,
          route_name: r[offset + 7] ? String(r[offset + 7]).trim() : '',
          logo_url: r[offset + 8] ? String(r[offset + 8]).trim() : '',
          notes: r[offset + 11] ? String(r[offset + 11]).trim() : '',
          link: r[offset + 12] ? String(r[offset + 12]).trim() : '',
          description: r[offset + 13] ? String(r[offset + 13]).trim() : ''
        });
      }
    }
  }

  // =========================================================================
  // 6. DONATIONS SHEET
  // =========================================================================
  const donSheet = findSheet('donation');
  if (donSheet) {
    const donRows = XLSX.utils.sheet_to_json(donSheet, { header: 1 });
    if (donRows.length > 1) {
      const row1 = donRows[1] || [];
      if (row1[0] && typeof row1[0] === 'number') result.donations.goal = row1[0];
      if (row1[1] && typeof row1[1] === 'number') result.donations.total_raised = row1[1];

      for (let i = 1; i < donRows.length; i++) {
        const r = donRows[i];
        if (!r) continue;
        const routeSource = r[5] ? String(r[5]).trim() : '';
        const cash = parseFloat(r[6]) || 0;
        const card = parseFloat(r[7]) || 0;
        const total = parseFloat(r[8]) || (cash + card);

        if (total > 0 || (routeSource && !routeSource.startsWith('Example_'))) {
          result.donations.ledger.push({
            date: formatExcelDate(r[4]),
            source: routeSource || 'Route Bucket Collection',
            cash,
            card,
            total
          });
        }
      }
    }
  }

  // Update summary counts
  result.summary.routesCount = result.routes.length;
  result.summary.streetsCount = result.streets.length;
  result.summary.volunteersCount = result.volunteers.length;
  result.summary.sponsorsCount = result.sponsors.length;
  result.summary.donationsCount = result.donations.ledger.length;

  return result;
}

/**
 * Generates ready-to-run Cloudflare D1 SQL statements from the parsed data
 */
export function generateSqlMigration(data, tableSlug = 'beverley') {
  const lines = [
    `-- ==============================================================================`,
    `-- TurboSanta 2.0 Auto-Generated D1 SQL Migration Script for '${tableSlug}'`,
    `-- Generated on ${new Date().toISOString()}`,
    `-- ==============================================================================\n`,
    `-- 1. Table Config Upsert`,
    `INSERT INTO tables (id, slug, name, sleigh_display_name, primary_color, accent_color, donate_url, charity_name, fundraising_goal)`,
    `VALUES (`,
    `  '${tableSlug}',`,
    `  '${tableSlug}',`,
    `  '${(data.settings.sleigh_display_name || 'Round Table Santa').replace(/'/g, "''")}',`,
    `  '${(data.settings.sleigh_display_name || 'Round Table Santa Sleigh').replace(/'/g, "''")}',`,
    `  '${data.settings.primary_color || '#FBAF33'}',`,
    `  '${data.settings.accent_color || '#D31C1C'}',`,
    `  '${(data.settings.donate_url || '').replace(/'/g, "''")}',`,
    `  '${(data.settings.charity_name || '').replace(/'/g, "''")}',`,
    `  ${data.settings.fundraising_goal || 5000}`,
    `)`,
    `ON CONFLICT(slug) DO UPDATE SET`,
    `  sleigh_display_name = excluded.sleigh_display_name,`,
    `  donate_url = excluded.donate_url,`,
    `  fundraising_goal = excluded.fundraising_goal;\n`
  ];

  // Routes
  if (data.routes && data.routes.length > 0) {
    lines.push(`-- 2. Clean old routes and insert new ones`);
    lines.push(`DELETE FROM route_streets WHERE table_id = '${tableSlug}';`);
    lines.push(`DELETE FROM routes WHERE table_id = '${tableSlug}';\n`);

    data.routes.forEach(r => {
      lines.push(`INSERT INTO routes (id, table_id, name, date, start_time, gpx_url, sponsor_logo, status) VALUES (`);
      lines.push(`  '${r.id}', '${tableSlug}', '${r.name.replace(/'/g, "''")}', '${r.date}', '${r.start_time}', '${(r.gpx_url || '').replace(/'/g, "''")}', '${(r.sponsor_logo || '').replace(/'/g, "''")}', 'Scheduled'`);
      lines.push(`);`);
    });
    lines.push('');
  }

  // Streets
  if (data.streets && data.streets.length > 0) {
    lines.push(`-- 3. Insert ${data.streets.length} Street Records for Spatial Address Lookup`);
    data.streets.forEach(s => {
      lines.push(`INSERT INTO route_streets (table_id, route_id, street_name, sequence_order) VALUES ('${tableSlug}', '${s.route_id}', '${s.street_name.replace(/'/g, "''")}', ${s.sequence_order});`);
    });
    lines.push('');
  }

  // Volunteers
  if (data.volunteers && data.volunteers.length > 0) {
    lines.push(`-- 4. Insert ${data.volunteers.length} Volunteer Records`);
    data.volunteers.forEach(v => {
      lines.push(`INSERT INTO volunteers (table_id, route_name, name, role, phone, email, organisation, checked_in, bucket_number) VALUES (`);
      lines.push(`  '${tableSlug}', '${v.route_name.replace(/'/g, "''")}', '${v.name.replace(/'/g, "''")}', '${v.role.replace(/'/g, "''")}', '${v.phone.replace(/'/g, "''")}', '${v.email.replace(/'/g, "''")}', '${v.organisation.replace(/'/g, "''")}', ${v.checked_in}, '${v.bucket_number.replace(/'/g, "''")}'`);
      lines.push(`);`);
    });
    lines.push('');
  }

  return lines.join('\n');
}
