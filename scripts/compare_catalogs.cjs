const fs = require('fs');
const v1 = fs.readFileSync('public/santasleigh.html', 'utf8');
const v2 = fs.readFileSync('public/sleigh_v2.js', 'utf8');

// Parse keys in V1 PUBLIC_FEATURE_CATALOG
const v1Start = v1.indexOf('const PUBLIC_FEATURE_CATALOG = {');
const v1End = v1.indexOf('};', v1Start);
const v1Block = v1.slice(v1Start, v1End);
const v1Keys = [...v1Block.matchAll(/^\s*([a-z0-9_]+):\s*{/gm)].map(m => m[1]);
console.log('V1 Catalog keys:', v1Keys);

// Parse keys in V2 ARCADE_CATALOG
const v2Start = v2.indexOf('const ARCADE_CATALOG = {');
const v2End = v2.indexOf('};', v2Start);
const v2Block = v2.slice(v2Start, v2End);
const v2Keys = [...v2Block.matchAll(/^\s*([a-z0-9_]+):\s*{/gm)].map(m => m[1]);
console.log('V2 Catalog keys:', v2Keys);
