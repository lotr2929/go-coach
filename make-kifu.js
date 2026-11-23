/* World of Go — builds the Kifu collection. Run it by hand, in Command Prompt, in this folder:   node make-kifu.js
   It reads kifu-picks.md (the shortlist), copies the chosen game records from the source folder into kifu/, cleaning each one
   (comments, variations and source tags are dropped), replays every game on the app's own rules, and writes kifu/index.json with the
   players, date, result and length of each game plus your titles and notes. Run it again whenever you change kifu-picks.md.
   The source folder is C:\_Personal\_kifu-sourcefiles unless you give another one:   node make-kifu.js D:\games */
'use strict';
const fs = require('fs');
const path = require('path');

/* kifu-picks.md -> [{ title, blurb, games: [{ src, title, note }] }] */
function parsePicks(md) {
  const text = String(md).replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n?/g, '\n');
  const cats = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = /^##\s+(.+)$/.exec(line))) { cur = { title: m[1], blurb: '', games: [] }; cats.push(cur); continue; }
    if (!cur) continue;
    if ((m = /^-\s+(.+)$/.exec(line))) {
      const parts = m[1].split(' | ');
      cur.games.push({ src: parts[0].trim(), title: (parts[1] || '').trim(), note: parts.slice(2).join(' | ').trim() });
      continue;
    }
    cur.blurb = (cur.blurb ? cur.blurb + ' ' : '') + line;
  }
  return cats;
}

const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/* Copies and checks every game. o: { cats, sourceDir, outDir, E, SGF }. Returns { index, errors, warnings }. */
function build(o) {
  const { cats, sourceDir, outDir, E, SGF } = o;
  const errors = [], warnings = [], index = { source: "Andries Brouwer's database of Go games, https://homepages.cwi.nl/~aeb/go/games", categories: [] };
  let count = 0;
  for (const c of cats) {
    const out = { title: c.title, blurb: c.blurb, games: [] };
    for (const pick of c.games) {
      const file = path.join(sourceDir, pick.src);
      if (!fs.existsSync(file)) { errors.push('Not found: ' + pick.src); continue; }
      const g = SGF.parse(fs.readFileSync(file, 'utf8'));
      if (!g || !g.moves.length) { errors.push('No moves in: ' + pick.src); continue; }
      if (g.n > 19) { errors.push('Board bigger than 19x19 (the app cannot label it): ' + pick.src); continue; }
      const id = 'k' + String(++count).padStart(3, '0') + '-' + slug(pick.title);
      fs.writeFileSync(path.join(outDir, id + '.sgf'), SGF.toSGF(g));
      const r = SGF.replay(E, g);
      if (!r.ok) warnings.push(`Only ${r.applied} of ${g.moves.length} moves can be replayed on the app's rules: ${pick.src}`);
      out.games.push({
        id, file: 'kifu/' + id + '.sgf', title: pick.title, note: pick.note,
        black: g.info.PB || '', white: g.info.PW || '', date: g.info.DT || '', result: g.info.RE || '', event: g.info.EV || '',
        moves: g.moves.length, legal: r.applied, size: g.n, komi: g.komi, handicap: g.handicap
      });
    }
    index.categories.push(out);
  }
  return { index, errors, warnings };
}

function main() {
  const E = require('./engine.js'), SGF = require('./sgf.js');
  const sourceDir = process.argv[2] || 'C:\\_Personal\\_kifu-sourcefiles', outDir = path.join(__dirname, 'kifu');
  if (!fs.existsSync(sourceDir)) { console.log('I cannot find the source folder: ' + sourceDir); process.exit(1); }
  const cats = parsePicks(fs.readFileSync(path.join(__dirname, 'kifu-picks.md'), 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (/\.sgf$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  const r = build({ cats, sourceDir, outDir, E, SGF });
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(r.index, null, 1) + '\n');
  const n = r.index.categories.reduce((k, c) => k + c.games.length, 0);
  console.log(`Wrote ${n} games and kifu/index.json to ${outDir}`);
  for (const w of r.warnings) console.log('Note: ' + w);
  for (const e of r.errors) console.log('PROBLEM: ' + e);
  if (r.errors.length) console.log('Fix the lines above in kifu-picks.md and run this again.');
  process.exit(r.errors.length ? 1 : 0);
}

module.exports = { parsePicks, build, slug };
if (require.main === module) main();
