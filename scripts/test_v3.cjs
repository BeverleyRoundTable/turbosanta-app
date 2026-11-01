const fs = require('fs');

const v3 = fs.readFileSync('public/sleigh_v3.html', 'utf8');

const checks = [
  ['Title', v3.includes('<title>Santa Sleigh — Live Community Radar & Routes (V3)</title>')],
  ['Test lab bar', v3.includes('id="test-lab-bar"')],
  ['Test lab JS', v3.includes('initV3TestLab')],
  ['Tracker iframe', v3.includes('id="tracker-iframe"')],
  ['Address iframe', v3.includes('id="address-iframe"')],
  ['Memory book iframe', v3.includes('id="memory-book-iframe"')],
  ['Donations section', v3.includes('id="donate"')],
  ['Gift aid modal', v3.includes('sleigh-giftaid-modal')],
  ['Grants showcase', v3.includes('id="grants-showcase-card"')],
  ['Music player', v3.includes('id="ts-festive-music-player"')],
  ['White logo pedestal CSS', v3.includes('.partner-card-logo-box')],
  ['Obsidian glass tokens', v3.includes('--bg-dark: #07090e;')]
];

checks.forEach(([name, ok]) => {
  console.log(`${ok ? '✓' : '✗'} ${name}: ${ok}`);
});
