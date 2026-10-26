const fs = require('fs');
const path = require('path');

const mappings = [
  { oldId: 'route_1792092425190', newId: 'abergavenny_abergavenny_mardy' },
  { oldId: 'route_1791821745059', newId: 'abergavenny_govilon_and_gilwern' },
  { oldId: 'route_1791839516252', newId: 'abergavenny_maindiff_llanfoist_llanellen' },
  { oldId: 'route_1791872387550', newId: 'abergavenny_parc_croesonnen' },
  { oldId: 'route_1791892996316', newId: 'cheltenham_up_hatherley_morrisons' },
  { oldId: 'route_1792695087633', newId: 'nuneaton_whitestone' },
  { oldId: 'ringwood_route_1792747877800', newId: 'ringwood_wimborne_provisional' },
  { oldId: 'shirley_route_1792443043889', newId: 'shirley_dickens_heath' },
  { oldId: 'route_1792532521531', newId: 'stockton_bishopsgarth' },
  { oldId: 'route_1792532306403', newId: 'stockton_egglescliffe_allens_west' },
  { oldId: 'route_1792532876484', newId: 'stockton_ingleby_barwick_beckfields' },
  { oldId: 'route_1792396498744', newId: 'stockton_ingleby_barwick_lowfields_broom_hill' },
  { oldId: 'route_1792396738551', newId: 'stockton_ingleby_barwick_round_hill_sober_hall' },
  { oldId: 'route_1792532778725', newId: 'stockton_ingleby_barwick_the_rings' },
  { oldId: 'route_1792396784490', newId: 'stockton_levendale_spitalfields_willey_flatts' },
  { oldId: 'route_1792396467045', newId: 'stockton_ragworth_roseworth' },
  { oldId: 'route_1792532566757', newId: 'stockton_rimswell_fairfield_hartburn' },
  { oldId: 'route_1792395946087', newId: 'stockton_stokesley_1_north_east' },
  { oldId: 'route_1792530676246', newId: 'stockton_stokesley_2_west' },
  { oldId: 'route_1792396421114', newId: 'stockton_thornaby_1_west_south' },
  { oldId: 'route_1792532393476', newId: 'stockton_thornaby_2_east_north' },
  { oldId: 'route_1792614954233', newId: 'stockton_yarm_high_street' }
];

let sql = `-- Normalization Migration for 22 Route IDs
-- Updates routes and all referring foreign key tables safely

`;

for (const m of mappings) {
  sql += `-- Route: ${m.oldId} -> ${m.newId}\n`;
  sql += `INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  '${m.newId}', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = '${m.oldId}';\n`;

  sql += `UPDATE route_streets SET route_id = '${m.newId}' WHERE route_id = '${m.oldId}';\n`;
  sql += `UPDATE volunteers SET route_id = '${m.newId}' WHERE route_id = '${m.oldId}';\n`;
  sql += `UPDATE subscribers SET route_id = '${m.newId}' WHERE route_id = '${m.oldId}';\n`;
  sql += `UPDATE telemetry SET route_id = '${m.newId}' WHERE route_id = '${m.oldId}';\n`;
  sql += `UPDATE donations SET route_id = '${m.newId}' WHERE route_id = '${m.oldId}';\n`;
  sql += `UPDATE live_messages SET route_id = '${m.newId}' WHERE route_id = '${m.oldId}';\n`;
  sql += `UPDATE safety_checklists SET route_id = '${m.newId}' WHERE route_id = '${m.oldId}';\n`;
  sql += `DELETE FROM routes WHERE id = '${m.oldId}';\n\n`;
}

const outDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'normalize_routes.sql'), sql, 'utf8');
console.log('Generated normalize_routes.sql successfully with ' + mappings.length + ' routes.');
