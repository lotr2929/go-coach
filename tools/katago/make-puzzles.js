/* Makes Go Coach "decisive move" games from KataGo's findings (tools/katago/find-decisive.js).
   Each is a lesson file: the position before the move, "Find <colour>'s move", the right move (from the game, confirmed
   as KataGo's best) and the next best move as the wrong try. Every sentence in the text comes from the kifu file's own
   details (players, ranks, event, year, result) or from KataGo's numbers; nothing is invented. A hand-written story
   can replace the drafted one later. Difficulty is a first estimate from how obvious the move is (KataGo's prior) until
   the human-style model has ranked it.
   Usage: node tools/katago/make-puzzles.js [maxPerGame=3] [firstNumber=210]   Then: node make-lessons.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const maxPer = +process.argv[2] || 3;
let num = +process.argv[3] || 210;
const COLS = 'ABCDEFGHJKLMNOPQRST';
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'kifu', 'index.json'), 'utf8'));
const info = {}; for (const c of index.categories) for (const g of c.games) info[g.id] = g;
const sgfOf = (gtp, size) => { if (!gtp || gtp === 'pass') return ''; const x = COLS.indexOf(gtp[0]), y = size - +gtp.slice(1); return String.fromCharCode(97 + x) + String.fromCharCode(97 + y); };

function stonesBefore(sgf, size, before) { /* the board before move number `before` (1-based), with captures */
  const g = Array.from({ length: size }, () => Array(size).fill(0));
  const nb = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < size && b < size);
  const group = (x, y) => { const c = g[y][x], seen = new Set([x + ',' + y]), st = [[x, y]], libs = new Set(); while (st.length) { const [a, b] = st.pop(); for (const [p, q] of nb(a, b)) { if (g[q][p] === 0) libs.add(p + ',' + q); else if (g[q][p] === c && !seen.has(p + ',' + q)) { seen.add(p + ',' + q); st.push([p, q]); } } } return { seen, libs }; };
  const remove = r => { for (const k of r.seen) { const [a, b] = k.split(',').map(Number); g[b][a] = 0; } };
  const moves = [...sgf.matchAll(/;([BW])\[([a-z]{2})\]/g)].map(m => [m[1] === 'B' ? 1 : 2, m[2].charCodeAt(0) - 97, m[2].charCodeAt(1) - 97]);
  for (const [c, x, y] of moves.slice(0, before - 1)) {
    g[y][x] = c;
    for (const [p, q] of nb(x, y)) if (g[q][p] === 3 - c) { const r = group(p, q); if (!r.libs.size) remove(r); }
    const r = group(x, y); if (!r.libs.size) remove(r);
  }
  const list = c => { let o = ''; for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (g[y][x] === c) o += '[' + String.fromCharCode(97 + x) + String.fromCharCode(97 + y) + ']'; return o; };
  return { ab: list(1), aw: list(2) };
}
const kyuFor = p => (p >= .7 ? 25 : p >= .5 ? 21 : p >= .35 ? 18 : p >= .2 ? 15 : p >= .1 ? 12 : 10);
const bandFor = k => (k >= 25 ? '30-25k' : k >= 20 ? '25-20k' : k >= 15 ? '20-15k' : '15-10k');
const esc = s => s.replace(/[\]\\]/g, '\\$&');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pts = x => (Math.abs(x - Math.round(x)) < .05 ? String(Math.round(x)) : x.toFixed(1));

let made = 0;
for (const f of fs.readdirSync(path.join(__dirname, 'results')).filter(f => /^decisive-.*\.json$/.test(f)).sort()) {
  const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', f), 'utf8')), g = info[R.id];
  if (!g) continue;
  const sgf = fs.readFileSync(path.join(ROOT, g.file), 'utf8');
  const pick = R.picks.filter(p => p.turn >= 4 && p.prior < .9 && p.second && p.second !== 'pass')
    .sort((a, b) => b.gap * (1 - b.prior) - a.gap * (1 - a.prior)).slice(0, maxPer);
  for (const p of pick) {
    const colour = p.colour === 'B' ? 'Black' : 'White', other = p.colour === 'B' ? 'White' : 'Black';
    const frac = p.turn / p.of, phase = frac < .25 ? 'Early in the game' : frac < .7 ? 'In the middle of the game' : 'Near the end of the game';
    const rank = (k) => { const m = sgf.match(new RegExp(k + '\\[([^\\]]*)\\]')); return m && m[1] ? ', ' + m[1] : ''; };
    const when = [g.event, g.date].filter(Boolean).join(', ');
    const res = (g.result || '').match(/^([BW])\+(.*)$/);
    let went = '';
    if (res) {
      const won = res[1] === p.colour, by = res[2] === 'R' ? 'by resignation' : /^\d/.test(res[2]) ? `by ${res[2]} points` : '';
      went = won ? ` ${colour} went on to win the game${by ? ' ' + by : ''}.` : ` ${colour} went on to lose the game${by ? ' ' + by : ''}.`;
    }
    const kyu = kyuFor(p.prior), band = bandFor(kyu), id = `p0${num}-${slug(g.title)}-move-${p.turn}`.slice(0, 70);
    const st = stonesBefore(sgf, R.size, p.turn);
    const who = `${g.black} (Black${rank('BR')}) against ${g.white} (White${rank('WR')})`;
    const intro = `${phase}: ${who}${when ? ', ' + when : ''}. Move ${p.turn} of ${p.of}. ${colour} to play.\n\nTask: Find ${colour}'s move.`;
    const right = `RIGHT ${p.best} is the move, and KataGo's first choice. The next best try, ${p.second}, is about ${pts(p.gap)} points worse for ${colour}.${went}`;
    const wrong = `${p.second} is the second best try, but KataGo reads it as about ${pts(p.gap)} points worse than ${p.best}. Look again.`;
    const out = `(;GM[1]FF[4]CA[UTF-8]SZ[${R.size}]GN[${esc(g.title)}: move ${p.turn}]DI[${kyu}k]PL[${p.colour}]PB[${esc(g.black)}]PW[${esc(g.white)}]${g.date ? 'DT[' + g.date + ']' : ''}\nAB${st.ab}\nAW${st.aw}\nC[${esc(intro)}]\n(;${p.colour}[${sgfOf(p.best, R.size)}]C[${esc(right)}])\n(;${p.colour}[${sgfOf(p.second, R.size)}]C[${esc(wrong)}])\n)\n`;
    fs.mkdirSync(path.join(ROOT, 'lessons', band), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'lessons', band, id + '.sgf'), out);
    num++; made++;
  }
}
console.log(`${made} games written into lessons/. Now run: node make-lessons.js`);
