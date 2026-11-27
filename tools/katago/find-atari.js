/* Finds "busy board" puzzle positions in the famous games (kifu/): moments where exactly one opposing group is in atari
   and can be captured (spot the atari), or exactly one of the player's own groups is in atari and can be saved (save your
   stones), with nothing else in atari, so the puzzle has one clear idea. Ko captures are left out. Building only; never part
   of the app (tools/katago/README.md). Usage: node tools/katago/find-atari.js [minStones=20]
   Writes tools/katago/results/atari-candidates.json, which rank-puzzles.js checks and ranks with KataGo. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), E = require(path.join(ROOT, 'engine.js'));
const minStones = +(process.argv[2] || 20);

/* Saving a group: some move leaves it with 3+ liberties, or out of reach for six opponent moves (as in the puzzle builder). */
function saver(g, b, t, me) {
  const flood = i => E.flood(g, b, i);
  function catches(bb, d) {
    if (!bb[t]) return true;
    if (d === 0) return false;
    for (const m of E.flood(g, bb, t).libs) { const r = E.tryPlay(g, bb, m, 3 - me, -1); if (r.ok && (!r.board[t] || !gets(r.board, d - 1))) return true; }
    return false;
  }
  function gets(bb, d) {
    const gr = E.flood(g, bb, t);
    if (gr.libs.length >= 3) return true;
    for (const m of moves(bb)) { const r = E.tryPlay(g, bb, m, me, -1); if (r.ok && r.board[t] && !catches(r.board, d)) return true; }
    return false;
  }
  function moves(bb) {
    const gr = E.flood(g, bb, t), set = new Set(gr.libs);
    for (const s of gr.stones) for (const j of g.nb[s]) if (bb[j] === 3 - me) { const a = E.flood(g, bb, j); if (a.libs.length === 1) set.add(a.libs[0]); }
    return [...set];
  }
  return moves(b).filter(m => { const r = E.tryPlay(g, b, m, me, -1); return r.ok && r.board[t] && !catches(r.board, 6); });
}

const out = [];
for (const f of fs.readdirSync(path.join(ROOT, 'kifu')).filter(f => f.endsWith('.sgf')).sort()) {
  const sgf = fs.readFileSync(path.join(ROOT, 'kifu', f), 'utf8');
  const n = +(sgf.match(/SZ\[(\d+)\]/) || [0, 19])[1], g = E.geom(n);
  const moves = [...sgf.matchAll(/;([BW])\[([a-z]{0,2})\]/g)].map(m => ({ c: m[1] === 'B' ? 1 : 2, p: m[2].length === 2 ? (m[2].charCodeAt(1) - 97) * n + m[2].charCodeAt(0) - 97 : -1 }));
  let b = new Array(n * n).fill(0), ko = -1;
  for (const [col, key] of [[1, 'AB'], [2, 'AW']]) { const m = sgf.match(new RegExp(key + '((?:\\[[a-z]{2}\\])+)')); if (m) for (const x of m[1].matchAll(/\[([a-z]{2})\]/g)) b[(x[1].charCodeAt(1) - 97) * n + x[1].charCodeAt(0) - 97] = col; }
  moves.forEach((mv, t) => {
    const me = mv.c, stones = b.filter(Boolean).length;
    if (stones >= minStones) {
      const seen = new Set(), theirs = [], mine = [];
      for (let i = 0; i < n * n; i++) if (b[i] && !seen.has(i)) {
        const gr = E.flood(g, b, i); gr.stones.forEach(s => seen.add(s));
        if (gr.libs.length === 1) (b[i] === me ? mine : theirs).push({ at: i, lib: gr.libs[0], size: gr.stones.length });
      }
      if (theirs.length === 1 && !mine.length) {
        const r = E.tryPlay(g, b, theirs[0].lib, me, ko);
        const isKo = r.ok && theirs[0].size === 1 && E.flood(g, r.board, theirs[0].lib).libs.length === 1;
        if (r.ok && !isKo) out.push({ game: f.replace(/\.sgf$/, ''), n, turn: t, kind: 'capture', colour: me, answer: [theirs[0].lib], target: theirs[0].at, size: theirs[0].size, stones, played: mv.p, board: b.join('') });
      }
      if (mine.length === 1 && !theirs.length) {
        const ans = saver(g, b, mine[0].at, me);
        if (ans.length) out.push({ game: f.replace(/\.sgf$/, ''), n, turn: t, kind: 'save', colour: me, answer: ans, target: mine[0].at, size: mine[0].size, stones, played: mv.p, board: b.join('') });
      }
    }
    if (mv.p >= 0) { const r = E.tryPlay(g, b, mv.p, mv.c, ko); if (r.ok) { b = r.board; ko = r.ko; } }
  });
}
const dir = path.join(__dirname, 'results'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'atari-candidates.json'), JSON.stringify(out));
const by = k => out.reduce((m, o) => (m[k(o)] = (m[k(o)] || 0) + 1, m), {});
console.log(out.length, 'candidates', JSON.stringify(by(o => o.kind + ' ' + o.n + 'x' + o.n)));
console.log('answer was the move played:', out.filter(o => o.answer.includes(o.played)).length);
