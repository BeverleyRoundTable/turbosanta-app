const fs = require('fs');

const js = fs.readFileSync('public/sleigh_v2.js', 'utf8');

// Verify ARCADE_CATALOG includes santa_chat, santa_studio, spot_santa
const hasSantaChat = js.includes('santa_chat:');
const hasSantaStudio = js.includes('santa_studio:');
const hasSpotSanta = js.includes('spot_santa:');

console.log('hasSantaChat:', hasSantaChat);
console.log('hasSantaStudio:', hasSantaStudio);
console.log('hasSpotSanta:', hasSpotSanta);

// Verify that defaultOrder and slice(0, 8) are GONE
const hasDefaultOrder = js.includes('const defaultOrder');
const hasSlice8 = js.includes('.slice(0, 8)');
console.log('defaultOrder removed:', !hasDefaultOrder);
console.log('slice(0, 8) removed:', !hasSlice8);

// Simulate the logic with mock table data
const mockCases = [
  { slug: 'stockton', table: { public_slot_1: 'letter', public_slot_2: 'elf_cam' }, expectedCount: 2 },
  { slug: 'beverley', table: { public_slot_1: 'santa_chat', public_slot_2: null }, expectedCount: 1 },
  { slug: 'abergavenny', table: { public_slot_1: 'santa_chat', public_slot_2: 'letter' }, expectedCount: 2 },
  { slug: 'ringwood', table: { public_slot_1: null, public_slot_2: null }, expectedCount: 0 },
  { slug: 'cheltenham', table: { public_slot_1: 'none', public_slot_2: 'disabled' }, expectedCount: 0 }
];

mockCases.forEach(c => {
  const table = c.table;
  const resolveSlot = (slotVal) => {
    if (!slotVal) return null;
    const s = String(slotVal).trim().toLowerCase();
    if (!s || s === 'none' || s === 'disabled' || s === 'false' || s === 'null') return null;
    return s;
  };
  const raw1 = resolveSlot(table.public_slot_1);
  const raw2 = resolveSlot(table.public_slot_2);
  const selected = [raw1, raw2].filter(Boolean);
  const ok = selected.length === c.expectedCount;
  console.log(`${ok ? '✓' : '✗'} ${c.slug}: got ${selected.length} items (${selected.join(', ') || 'none/hidden'}), expected ${c.expectedCount}`);
});
