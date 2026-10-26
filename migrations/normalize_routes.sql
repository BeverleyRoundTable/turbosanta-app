-- Normalization Migration for 22 Route IDs
-- Updates routes and all referring foreign key tables safely

-- Route: route_1792092425190 -> abergavenny_abergavenny_mardy
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'abergavenny_abergavenny_mardy', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792092425190';
UPDATE route_streets SET route_id = 'abergavenny_abergavenny_mardy' WHERE route_id = 'route_1792092425190';
UPDATE volunteers SET route_id = 'abergavenny_abergavenny_mardy' WHERE route_id = 'route_1792092425190';
UPDATE subscribers SET route_id = 'abergavenny_abergavenny_mardy' WHERE route_id = 'route_1792092425190';
UPDATE telemetry SET route_id = 'abergavenny_abergavenny_mardy' WHERE route_id = 'route_1792092425190';
UPDATE donations SET route_id = 'abergavenny_abergavenny_mardy' WHERE route_id = 'route_1792092425190';
UPDATE live_messages SET route_id = 'abergavenny_abergavenny_mardy' WHERE route_id = 'route_1792092425190';
UPDATE safety_checklists SET route_id = 'abergavenny_abergavenny_mardy' WHERE route_id = 'route_1792092425190';
DELETE FROM routes WHERE id = 'route_1792092425190';

-- Route: route_1791821745059 -> abergavenny_govilon_and_gilwern
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'abergavenny_govilon_and_gilwern', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1791821745059';
UPDATE route_streets SET route_id = 'abergavenny_govilon_and_gilwern' WHERE route_id = 'route_1791821745059';
UPDATE volunteers SET route_id = 'abergavenny_govilon_and_gilwern' WHERE route_id = 'route_1791821745059';
UPDATE subscribers SET route_id = 'abergavenny_govilon_and_gilwern' WHERE route_id = 'route_1791821745059';
UPDATE telemetry SET route_id = 'abergavenny_govilon_and_gilwern' WHERE route_id = 'route_1791821745059';
UPDATE donations SET route_id = 'abergavenny_govilon_and_gilwern' WHERE route_id = 'route_1791821745059';
UPDATE live_messages SET route_id = 'abergavenny_govilon_and_gilwern' WHERE route_id = 'route_1791821745059';
UPDATE safety_checklists SET route_id = 'abergavenny_govilon_and_gilwern' WHERE route_id = 'route_1791821745059';
DELETE FROM routes WHERE id = 'route_1791821745059';

-- Route: route_1791839516252 -> abergavenny_maindiff_llanfoist_llanellen
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'abergavenny_maindiff_llanfoist_llanellen', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1791839516252';
UPDATE route_streets SET route_id = 'abergavenny_maindiff_llanfoist_llanellen' WHERE route_id = 'route_1791839516252';
UPDATE volunteers SET route_id = 'abergavenny_maindiff_llanfoist_llanellen' WHERE route_id = 'route_1791839516252';
UPDATE subscribers SET route_id = 'abergavenny_maindiff_llanfoist_llanellen' WHERE route_id = 'route_1791839516252';
UPDATE telemetry SET route_id = 'abergavenny_maindiff_llanfoist_llanellen' WHERE route_id = 'route_1791839516252';
UPDATE donations SET route_id = 'abergavenny_maindiff_llanfoist_llanellen' WHERE route_id = 'route_1791839516252';
UPDATE live_messages SET route_id = 'abergavenny_maindiff_llanfoist_llanellen' WHERE route_id = 'route_1791839516252';
UPDATE safety_checklists SET route_id = 'abergavenny_maindiff_llanfoist_llanellen' WHERE route_id = 'route_1791839516252';
DELETE FROM routes WHERE id = 'route_1791839516252';

-- Route: route_1791872387550 -> abergavenny_parc_croesonnen
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'abergavenny_parc_croesonnen', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1791872387550';
UPDATE route_streets SET route_id = 'abergavenny_parc_croesonnen' WHERE route_id = 'route_1791872387550';
UPDATE volunteers SET route_id = 'abergavenny_parc_croesonnen' WHERE route_id = 'route_1791872387550';
UPDATE subscribers SET route_id = 'abergavenny_parc_croesonnen' WHERE route_id = 'route_1791872387550';
UPDATE telemetry SET route_id = 'abergavenny_parc_croesonnen' WHERE route_id = 'route_1791872387550';
UPDATE donations SET route_id = 'abergavenny_parc_croesonnen' WHERE route_id = 'route_1791872387550';
UPDATE live_messages SET route_id = 'abergavenny_parc_croesonnen' WHERE route_id = 'route_1791872387550';
UPDATE safety_checklists SET route_id = 'abergavenny_parc_croesonnen' WHERE route_id = 'route_1791872387550';
DELETE FROM routes WHERE id = 'route_1791872387550';

-- Route: route_1791892996316 -> cheltenham_up_hatherley_morrisons
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'cheltenham_up_hatherley_morrisons', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1791892996316';
UPDATE route_streets SET route_id = 'cheltenham_up_hatherley_morrisons' WHERE route_id = 'route_1791892996316';
UPDATE volunteers SET route_id = 'cheltenham_up_hatherley_morrisons' WHERE route_id = 'route_1791892996316';
UPDATE subscribers SET route_id = 'cheltenham_up_hatherley_morrisons' WHERE route_id = 'route_1791892996316';
UPDATE telemetry SET route_id = 'cheltenham_up_hatherley_morrisons' WHERE route_id = 'route_1791892996316';
UPDATE donations SET route_id = 'cheltenham_up_hatherley_morrisons' WHERE route_id = 'route_1791892996316';
UPDATE live_messages SET route_id = 'cheltenham_up_hatherley_morrisons' WHERE route_id = 'route_1791892996316';
UPDATE safety_checklists SET route_id = 'cheltenham_up_hatherley_morrisons' WHERE route_id = 'route_1791892996316';
DELETE FROM routes WHERE id = 'route_1791892996316';

-- Route: route_1792695087633 -> nuneaton_whitestone
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'nuneaton_whitestone', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792695087633';
UPDATE route_streets SET route_id = 'nuneaton_whitestone' WHERE route_id = 'route_1792695087633';
UPDATE volunteers SET route_id = 'nuneaton_whitestone' WHERE route_id = 'route_1792695087633';
UPDATE subscribers SET route_id = 'nuneaton_whitestone' WHERE route_id = 'route_1792695087633';
UPDATE telemetry SET route_id = 'nuneaton_whitestone' WHERE route_id = 'route_1792695087633';
UPDATE donations SET route_id = 'nuneaton_whitestone' WHERE route_id = 'route_1792695087633';
UPDATE live_messages SET route_id = 'nuneaton_whitestone' WHERE route_id = 'route_1792695087633';
UPDATE safety_checklists SET route_id = 'nuneaton_whitestone' WHERE route_id = 'route_1792695087633';
DELETE FROM routes WHERE id = 'route_1792695087633';

-- Route: ringwood_route_1792747877800 -> ringwood_wimborne_provisional
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'ringwood_wimborne_provisional', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'ringwood_route_1792747877800';
UPDATE route_streets SET route_id = 'ringwood_wimborne_provisional' WHERE route_id = 'ringwood_route_1792747877800';
UPDATE volunteers SET route_id = 'ringwood_wimborne_provisional' WHERE route_id = 'ringwood_route_1792747877800';
UPDATE subscribers SET route_id = 'ringwood_wimborne_provisional' WHERE route_id = 'ringwood_route_1792747877800';
UPDATE telemetry SET route_id = 'ringwood_wimborne_provisional' WHERE route_id = 'ringwood_route_1792747877800';
UPDATE donations SET route_id = 'ringwood_wimborne_provisional' WHERE route_id = 'ringwood_route_1792747877800';
UPDATE live_messages SET route_id = 'ringwood_wimborne_provisional' WHERE route_id = 'ringwood_route_1792747877800';
UPDATE safety_checklists SET route_id = 'ringwood_wimborne_provisional' WHERE route_id = 'ringwood_route_1792747877800';
DELETE FROM routes WHERE id = 'ringwood_route_1792747877800';

-- Route: shirley_route_1792443043889 -> shirley_dickens_heath
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'shirley_dickens_heath', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'shirley_route_1792443043889';
UPDATE route_streets SET route_id = 'shirley_dickens_heath' WHERE route_id = 'shirley_route_1792443043889';
UPDATE volunteers SET route_id = 'shirley_dickens_heath' WHERE route_id = 'shirley_route_1792443043889';
UPDATE subscribers SET route_id = 'shirley_dickens_heath' WHERE route_id = 'shirley_route_1792443043889';
UPDATE telemetry SET route_id = 'shirley_dickens_heath' WHERE route_id = 'shirley_route_1792443043889';
UPDATE donations SET route_id = 'shirley_dickens_heath' WHERE route_id = 'shirley_route_1792443043889';
UPDATE live_messages SET route_id = 'shirley_dickens_heath' WHERE route_id = 'shirley_route_1792443043889';
UPDATE safety_checklists SET route_id = 'shirley_dickens_heath' WHERE route_id = 'shirley_route_1792443043889';
DELETE FROM routes WHERE id = 'shirley_route_1792443043889';

-- Route: route_1792532521531 -> stockton_bishopsgarth
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_bishopsgarth', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792532521531';
UPDATE route_streets SET route_id = 'stockton_bishopsgarth' WHERE route_id = 'route_1792532521531';
UPDATE volunteers SET route_id = 'stockton_bishopsgarth' WHERE route_id = 'route_1792532521531';
UPDATE subscribers SET route_id = 'stockton_bishopsgarth' WHERE route_id = 'route_1792532521531';
UPDATE telemetry SET route_id = 'stockton_bishopsgarth' WHERE route_id = 'route_1792532521531';
UPDATE donations SET route_id = 'stockton_bishopsgarth' WHERE route_id = 'route_1792532521531';
UPDATE live_messages SET route_id = 'stockton_bishopsgarth' WHERE route_id = 'route_1792532521531';
UPDATE safety_checklists SET route_id = 'stockton_bishopsgarth' WHERE route_id = 'route_1792532521531';
DELETE FROM routes WHERE id = 'route_1792532521531';

-- Route: route_1792532306403 -> stockton_egglescliffe_allens_west
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_egglescliffe_allens_west', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792532306403';
UPDATE route_streets SET route_id = 'stockton_egglescliffe_allens_west' WHERE route_id = 'route_1792532306403';
UPDATE volunteers SET route_id = 'stockton_egglescliffe_allens_west' WHERE route_id = 'route_1792532306403';
UPDATE subscribers SET route_id = 'stockton_egglescliffe_allens_west' WHERE route_id = 'route_1792532306403';
UPDATE telemetry SET route_id = 'stockton_egglescliffe_allens_west' WHERE route_id = 'route_1792532306403';
UPDATE donations SET route_id = 'stockton_egglescliffe_allens_west' WHERE route_id = 'route_1792532306403';
UPDATE live_messages SET route_id = 'stockton_egglescliffe_allens_west' WHERE route_id = 'route_1792532306403';
UPDATE safety_checklists SET route_id = 'stockton_egglescliffe_allens_west' WHERE route_id = 'route_1792532306403';
DELETE FROM routes WHERE id = 'route_1792532306403';

-- Route: route_1792532876484 -> stockton_ingleby_barwick_beckfields
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_ingleby_barwick_beckfields', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792532876484';
UPDATE route_streets SET route_id = 'stockton_ingleby_barwick_beckfields' WHERE route_id = 'route_1792532876484';
UPDATE volunteers SET route_id = 'stockton_ingleby_barwick_beckfields' WHERE route_id = 'route_1792532876484';
UPDATE subscribers SET route_id = 'stockton_ingleby_barwick_beckfields' WHERE route_id = 'route_1792532876484';
UPDATE telemetry SET route_id = 'stockton_ingleby_barwick_beckfields' WHERE route_id = 'route_1792532876484';
UPDATE donations SET route_id = 'stockton_ingleby_barwick_beckfields' WHERE route_id = 'route_1792532876484';
UPDATE live_messages SET route_id = 'stockton_ingleby_barwick_beckfields' WHERE route_id = 'route_1792532876484';
UPDATE safety_checklists SET route_id = 'stockton_ingleby_barwick_beckfields' WHERE route_id = 'route_1792532876484';
DELETE FROM routes WHERE id = 'route_1792532876484';

-- Route: route_1792396498744 -> stockton_ingleby_barwick_lowfields_broom_hill
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_ingleby_barwick_lowfields_broom_hill', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792396498744';
UPDATE route_streets SET route_id = 'stockton_ingleby_barwick_lowfields_broom_hill' WHERE route_id = 'route_1792396498744';
UPDATE volunteers SET route_id = 'stockton_ingleby_barwick_lowfields_broom_hill' WHERE route_id = 'route_1792396498744';
UPDATE subscribers SET route_id = 'stockton_ingleby_barwick_lowfields_broom_hill' WHERE route_id = 'route_1792396498744';
UPDATE telemetry SET route_id = 'stockton_ingleby_barwick_lowfields_broom_hill' WHERE route_id = 'route_1792396498744';
UPDATE donations SET route_id = 'stockton_ingleby_barwick_lowfields_broom_hill' WHERE route_id = 'route_1792396498744';
UPDATE live_messages SET route_id = 'stockton_ingleby_barwick_lowfields_broom_hill' WHERE route_id = 'route_1792396498744';
UPDATE safety_checklists SET route_id = 'stockton_ingleby_barwick_lowfields_broom_hill' WHERE route_id = 'route_1792396498744';
DELETE FROM routes WHERE id = 'route_1792396498744';

-- Route: route_1792396738551 -> stockton_ingleby_barwick_round_hill_sober_hall
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_ingleby_barwick_round_hill_sober_hall', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792396738551';
UPDATE route_streets SET route_id = 'stockton_ingleby_barwick_round_hill_sober_hall' WHERE route_id = 'route_1792396738551';
UPDATE volunteers SET route_id = 'stockton_ingleby_barwick_round_hill_sober_hall' WHERE route_id = 'route_1792396738551';
UPDATE subscribers SET route_id = 'stockton_ingleby_barwick_round_hill_sober_hall' WHERE route_id = 'route_1792396738551';
UPDATE telemetry SET route_id = 'stockton_ingleby_barwick_round_hill_sober_hall' WHERE route_id = 'route_1792396738551';
UPDATE donations SET route_id = 'stockton_ingleby_barwick_round_hill_sober_hall' WHERE route_id = 'route_1792396738551';
UPDATE live_messages SET route_id = 'stockton_ingleby_barwick_round_hill_sober_hall' WHERE route_id = 'route_1792396738551';
UPDATE safety_checklists SET route_id = 'stockton_ingleby_barwick_round_hill_sober_hall' WHERE route_id = 'route_1792396738551';
DELETE FROM routes WHERE id = 'route_1792396738551';

-- Route: route_1792532778725 -> stockton_ingleby_barwick_the_rings
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_ingleby_barwick_the_rings', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792532778725';
UPDATE route_streets SET route_id = 'stockton_ingleby_barwick_the_rings' WHERE route_id = 'route_1792532778725';
UPDATE volunteers SET route_id = 'stockton_ingleby_barwick_the_rings' WHERE route_id = 'route_1792532778725';
UPDATE subscribers SET route_id = 'stockton_ingleby_barwick_the_rings' WHERE route_id = 'route_1792532778725';
UPDATE telemetry SET route_id = 'stockton_ingleby_barwick_the_rings' WHERE route_id = 'route_1792532778725';
UPDATE donations SET route_id = 'stockton_ingleby_barwick_the_rings' WHERE route_id = 'route_1792532778725';
UPDATE live_messages SET route_id = 'stockton_ingleby_barwick_the_rings' WHERE route_id = 'route_1792532778725';
UPDATE safety_checklists SET route_id = 'stockton_ingleby_barwick_the_rings' WHERE route_id = 'route_1792532778725';
DELETE FROM routes WHERE id = 'route_1792532778725';

-- Route: route_1792396784490 -> stockton_levendale_spitalfields_willey_flatts
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_levendale_spitalfields_willey_flatts', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792396784490';
UPDATE route_streets SET route_id = 'stockton_levendale_spitalfields_willey_flatts' WHERE route_id = 'route_1792396784490';
UPDATE volunteers SET route_id = 'stockton_levendale_spitalfields_willey_flatts' WHERE route_id = 'route_1792396784490';
UPDATE subscribers SET route_id = 'stockton_levendale_spitalfields_willey_flatts' WHERE route_id = 'route_1792396784490';
UPDATE telemetry SET route_id = 'stockton_levendale_spitalfields_willey_flatts' WHERE route_id = 'route_1792396784490';
UPDATE donations SET route_id = 'stockton_levendale_spitalfields_willey_flatts' WHERE route_id = 'route_1792396784490';
UPDATE live_messages SET route_id = 'stockton_levendale_spitalfields_willey_flatts' WHERE route_id = 'route_1792396784490';
UPDATE safety_checklists SET route_id = 'stockton_levendale_spitalfields_willey_flatts' WHERE route_id = 'route_1792396784490';
DELETE FROM routes WHERE id = 'route_1792396784490';

-- Route: route_1792396467045 -> stockton_ragworth_roseworth
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_ragworth_roseworth', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792396467045';
UPDATE route_streets SET route_id = 'stockton_ragworth_roseworth' WHERE route_id = 'route_1792396467045';
UPDATE volunteers SET route_id = 'stockton_ragworth_roseworth' WHERE route_id = 'route_1792396467045';
UPDATE subscribers SET route_id = 'stockton_ragworth_roseworth' WHERE route_id = 'route_1792396467045';
UPDATE telemetry SET route_id = 'stockton_ragworth_roseworth' WHERE route_id = 'route_1792396467045';
UPDATE donations SET route_id = 'stockton_ragworth_roseworth' WHERE route_id = 'route_1792396467045';
UPDATE live_messages SET route_id = 'stockton_ragworth_roseworth' WHERE route_id = 'route_1792396467045';
UPDATE safety_checklists SET route_id = 'stockton_ragworth_roseworth' WHERE route_id = 'route_1792396467045';
DELETE FROM routes WHERE id = 'route_1792396467045';

-- Route: route_1792532566757 -> stockton_rimswell_fairfield_hartburn
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_rimswell_fairfield_hartburn', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792532566757';
UPDATE route_streets SET route_id = 'stockton_rimswell_fairfield_hartburn' WHERE route_id = 'route_1792532566757';
UPDATE volunteers SET route_id = 'stockton_rimswell_fairfield_hartburn' WHERE route_id = 'route_1792532566757';
UPDATE subscribers SET route_id = 'stockton_rimswell_fairfield_hartburn' WHERE route_id = 'route_1792532566757';
UPDATE telemetry SET route_id = 'stockton_rimswell_fairfield_hartburn' WHERE route_id = 'route_1792532566757';
UPDATE donations SET route_id = 'stockton_rimswell_fairfield_hartburn' WHERE route_id = 'route_1792532566757';
UPDATE live_messages SET route_id = 'stockton_rimswell_fairfield_hartburn' WHERE route_id = 'route_1792532566757';
UPDATE safety_checklists SET route_id = 'stockton_rimswell_fairfield_hartburn' WHERE route_id = 'route_1792532566757';
DELETE FROM routes WHERE id = 'route_1792532566757';

-- Route: route_1792395946087 -> stockton_stokesley_1_north_east
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_stokesley_1_north_east', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792395946087';
UPDATE route_streets SET route_id = 'stockton_stokesley_1_north_east' WHERE route_id = 'route_1792395946087';
UPDATE volunteers SET route_id = 'stockton_stokesley_1_north_east' WHERE route_id = 'route_1792395946087';
UPDATE subscribers SET route_id = 'stockton_stokesley_1_north_east' WHERE route_id = 'route_1792395946087';
UPDATE telemetry SET route_id = 'stockton_stokesley_1_north_east' WHERE route_id = 'route_1792395946087';
UPDATE donations SET route_id = 'stockton_stokesley_1_north_east' WHERE route_id = 'route_1792395946087';
UPDATE live_messages SET route_id = 'stockton_stokesley_1_north_east' WHERE route_id = 'route_1792395946087';
UPDATE safety_checklists SET route_id = 'stockton_stokesley_1_north_east' WHERE route_id = 'route_1792395946087';
DELETE FROM routes WHERE id = 'route_1792395946087';

-- Route: route_1792530676246 -> stockton_stokesley_2_west
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_stokesley_2_west', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792530676246';
UPDATE route_streets SET route_id = 'stockton_stokesley_2_west' WHERE route_id = 'route_1792530676246';
UPDATE volunteers SET route_id = 'stockton_stokesley_2_west' WHERE route_id = 'route_1792530676246';
UPDATE subscribers SET route_id = 'stockton_stokesley_2_west' WHERE route_id = 'route_1792530676246';
UPDATE telemetry SET route_id = 'stockton_stokesley_2_west' WHERE route_id = 'route_1792530676246';
UPDATE donations SET route_id = 'stockton_stokesley_2_west' WHERE route_id = 'route_1792530676246';
UPDATE live_messages SET route_id = 'stockton_stokesley_2_west' WHERE route_id = 'route_1792530676246';
UPDATE safety_checklists SET route_id = 'stockton_stokesley_2_west' WHERE route_id = 'route_1792530676246';
DELETE FROM routes WHERE id = 'route_1792530676246';

-- Route: route_1792396421114 -> stockton_thornaby_1_west_south
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_thornaby_1_west_south', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792396421114';
UPDATE route_streets SET route_id = 'stockton_thornaby_1_west_south' WHERE route_id = 'route_1792396421114';
UPDATE volunteers SET route_id = 'stockton_thornaby_1_west_south' WHERE route_id = 'route_1792396421114';
UPDATE subscribers SET route_id = 'stockton_thornaby_1_west_south' WHERE route_id = 'route_1792396421114';
UPDATE telemetry SET route_id = 'stockton_thornaby_1_west_south' WHERE route_id = 'route_1792396421114';
UPDATE donations SET route_id = 'stockton_thornaby_1_west_south' WHERE route_id = 'route_1792396421114';
UPDATE live_messages SET route_id = 'stockton_thornaby_1_west_south' WHERE route_id = 'route_1792396421114';
UPDATE safety_checklists SET route_id = 'stockton_thornaby_1_west_south' WHERE route_id = 'route_1792396421114';
DELETE FROM routes WHERE id = 'route_1792396421114';

-- Route: route_1792532393476 -> stockton_thornaby_2_east_north
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_thornaby_2_east_north', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792532393476';
UPDATE route_streets SET route_id = 'stockton_thornaby_2_east_north' WHERE route_id = 'route_1792532393476';
UPDATE volunteers SET route_id = 'stockton_thornaby_2_east_north' WHERE route_id = 'route_1792532393476';
UPDATE subscribers SET route_id = 'stockton_thornaby_2_east_north' WHERE route_id = 'route_1792532393476';
UPDATE telemetry SET route_id = 'stockton_thornaby_2_east_north' WHERE route_id = 'route_1792532393476';
UPDATE donations SET route_id = 'stockton_thornaby_2_east_north' WHERE route_id = 'route_1792532393476';
UPDATE live_messages SET route_id = 'stockton_thornaby_2_east_north' WHERE route_id = 'route_1792532393476';
UPDATE safety_checklists SET route_id = 'stockton_thornaby_2_east_north' WHERE route_id = 'route_1792532393476';
DELETE FROM routes WHERE id = 'route_1792532393476';

-- Route: route_1792614954233 -> stockton_yarm_high_street
INSERT INTO routes (
  id, table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
)
SELECT 
  'stockton_yarm_high_street', table_id, name, date, start_time, end_time, status, notes, gpx_url, 
  map_image_url, mp4_render_url, sponsor_name, sponsor_logo_url, sponsor_link, 
  sponsor_description, created_at, sponsor_logo, sponsors_json, status_override, 
  postponed_note, briefing_sent_at, muster_time, muster_point, planned_stops
FROM routes WHERE id = 'route_1792614954233';
UPDATE route_streets SET route_id = 'stockton_yarm_high_street' WHERE route_id = 'route_1792614954233';
UPDATE volunteers SET route_id = 'stockton_yarm_high_street' WHERE route_id = 'route_1792614954233';
UPDATE subscribers SET route_id = 'stockton_yarm_high_street' WHERE route_id = 'route_1792614954233';
UPDATE telemetry SET route_id = 'stockton_yarm_high_street' WHERE route_id = 'route_1792614954233';
UPDATE donations SET route_id = 'stockton_yarm_high_street' WHERE route_id = 'route_1792614954233';
UPDATE live_messages SET route_id = 'stockton_yarm_high_street' WHERE route_id = 'route_1792614954233';
UPDATE safety_checklists SET route_id = 'stockton_yarm_high_street' WHERE route_id = 'route_1792614954233';
DELETE FROM routes WHERE id = 'route_1792614954233';

