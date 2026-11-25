/* Summarises match results: wins for Go Coach's computer per pairing.
   Usage: node tools/katago/summarise.js tools/katago/results/<file>.jsonl
   Measuring tool only; never part of the app. */
const fs = require('fs');
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(l => JSON.parse(l));
const groups = {};
for (const r of rows) {
  const k = `${r.level} vs ${r.rank}` + (r.hcap ? ` (Go Coach takes ${r.hcap} stones)` : '') + ` ${r.n || 9}x${r.n || 9}`;
  (groups[k] = groups[k] || []).push(r);
}
for (const k of Object.keys(groups)) {
  const ok = groups[k].filter(r => !r.error), won = ok.filter(r => r.gcWon).length;
  console.log(`${k}: won ${won} of ${ok.length}` + (ok.length < groups[k].length ? `, ${groups[k].length - ok.length} errors` : ''));
}
