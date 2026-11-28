/* Builds lesson game 1, "Discovering Go" (lessons/README.md, "Lesson games"), and checks it. Building only; never part of the app.
   Run: node tools/lessons/build-game-2026-11-28.js   then   node make-lessons.js
   Checks, and refuses to write the file if any fails:
   - every move is legal, and every capture, liberty count and score the notes rely on is what engine.js finds (`expect`);
   - with KataGo's results (tools/katago/results/<id>-top.json, made by tools/katago/top-moves.js for exactly these moves):
     every Black move is within 1.5 points of KataGo's best, and at a "Your turn" point within 0.3 (KataGo's best or as good);
   - the game ends with every border closed, so the count is exact.
   The top moves shown by Hint (LB, A to E) are KataGo's. The words are the writer's own reading, checked against the position. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'engine.js'));
const GAME = require('./game-01-discovering-go.js');

const n = GAME.size, L = 'ABCDEFGHJKLMNOPQRST';
const idx = c => (n - +c.slice(1)) * n + L.indexOf(c[0]);
const sgfPt = c => { const i = idx(c); return String.fromCharCode(97 + (i % n)) + String.fromCharCode(97 + ((i / n) | 0)); };
const esc = t => t.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
const fail = [];
const g = E.geom(n);

/* KataGo's view of each turn. */
const topFile = path.join(ROOT, 'tools', 'katago', 'results', GAME.id + '-top.json');
const moves = GAME.moves.map(m => m.m);
let top = null;
if (fs.existsSync(topFile)) {
  top = JSON.parse(fs.readFileSync(topFile, 'utf8'));
  if (top.moves.join(' ') !== moves.join(' ')) { fail.push(`${topFile} is for other moves: run tools/katago/top-moves.js again`); top = null; }
} else fail.push(`no KataGo results: run node tools/katago/top-moves.js ${path.relative(ROOT, topFile)} 400 ${n} "${moves.join(' ')}"`);

/* Checks the claims about a position: captured stones, liberties, atari. */
function expectations(s, ex, where, captured) {
  if (ex.cap) { const got = captured.map(i => E.coord(n, i)).sort().join(' '), want = ex.cap.slice().sort().join(' '); if (got !== want) fail.push(`${where}: captures ${got || 'nothing'}, the note says ${want || 'nothing'}`); }
  else if (captured.length) fail.push(`${where}: captures ${captured.map(i => E.coord(n, i)).join(' ')} but the note does not say so (add cap)`);
  for (const [c, k] of Object.entries(ex.libs || {})) {
    const i = idx(c);
    if (!s.board[i]) { fail.push(`${where}: no stone at ${c}`); continue; }
    const got = E.flood(g, s.board, i).libs.length;
    if (got !== k) fail.push(`${where}: ${c} has ${got} liberties, the note says ${k}`);
  }
}

/* A side line (a mistake the player can try): checked like the game, from the position before it. */
function sideLine(s, w, where) {
  const t = E.clone(s), nodes = [];
  w.line.forEach((c, k) => {
    const r = E.play(t, idx(c));
    if (!r.ok) { fail.push(`${where} side line ${c}: illegal (${r.reason})`); return; }
    expectations(t, (w.expect || [])[k] || {}, `${where} side line ${c}`, r.captured);
    nodes.push(`;${k % 2 ? 'W' : 'B'}[${sgfPt(c)}]` + (w.notes[k] ? `C[${esc(w.notes[k])}]` : ''));
  });
  if (!w.notes[w.line.length - 1]) fail.push(`${where} side line: its last move needs a note`);
  return '(' + nodes.join('') + ')';
}

const s = E.newState(n, 0);
let sgf = `(;GM[1]FF[4]CA[UTF-8]SZ[${n}]KM[6.5]RU[Chinese]TY[story]GN[${esc(GAME.title)}]DI[${GAME.di}]PL[B]` +
  `C[${esc(GAME.intro.join('\n\n'))}]`;
const lbFor = t => (top && top.turns[t] ? 'LB' + top.turns[t].top.map((m, k) => `[${sgfPt(m.move)}:${'ABCDE'[k]}]`).join('') : '');
sgf += lbFor(0);
const nodes = [], sides = [];
GAME.moves.forEach((mv, t) => {
  const side = t % 2 ? 'W' : 'B', where = `move ${t + 1} (${side} ${mv.m})`;
  /* Black's move: checked against KataGo; the mistakes the player may try are its side branches. */
  sides[t] = '';
  if (side === 'B') {
    const kg = top && top.turns[t];
    if (kg) {
      const limit = mv.yourTurn ? 0.3 : 1.5;
      if (kg.loss === null) fail.push(`${where}: KataGo did not consider this move`);
      else if (kg.loss > limit) fail.push(`${where}: ${kg.loss} points worse than KataGo's ${kg.top[0].move} (limit ${limit})`);
    }
    for (const w of mv.wrong || []) {
      if (w.line[0] === mv.m) fail.push(`${where}: a side line starts with the game's own move`);
      sides[t] += sideLine(s, w, where);
    }
  } else if (mv.wrong) fail.push(`${where}: side lines belong on Black's moves`);
  const r = E.play(s, idx(mv.m));
  if (!r.ok) { fail.push(`${where}: illegal (${r.reason})`); return; }
  expectations(s, mv.expect || {}, where, r.captured);
  /* The note shown after this move, then the "Your turn" task and the words for the top moves at Black's next move. */
  const next = GAME.moves[t + 1];
  const paras = [mv.note];
  if (next && next.yourTurn) paras.push('Your turn: ' + next.yourTurn);
  if (next && next.best) paras.push('Best: ' + next.best);
  const c = paras.filter(Boolean).join('\n\n');
  nodes[t] = `;${side}[${sgfPt(mv.m)}]` + (c ? `C[${esc(c)}]` : '') + (side === 'W' && next ? lbFor(t + 1) : '');
});
/* The tree: after each node, the game's next move and, beside it, the side lines for that move. */
let rest = '';
for (let t = nodes.length - 1; t >= 0; t--) rest = nodes[t] + (sides[t + 1] ? '(' + rest + ')' + sides[t + 1] : rest);
sgf += (sides[0] ? '(' + rest + ')' + sides[0] : rest) + ')';
if (GAME.moves[0].yourTurn) fail.push('move 1 cannot be a "Your turn" point (put the task in the introduction)');

/* The end: every border closed, and the count as the last note says. */
const sc = E.scoreArea(n, s.board);
const empty = [...s.board].filter(v => !v).length, counted = [...sc.terr].filter(v => v).length;
if (empty !== counted) fail.push(`the game ends with ${empty - counted} empty point(s) that belong to neither side: close every border`);
if (GAME.score && (GAME.score.black !== sc.black || GAME.score.white !== sc.white)) fail.push(`the count is Black ${sc.black}, White ${sc.white}; the notes say Black ${GAME.score.black}, White ${GAME.score.white}`);
console.log(`Count: Black ${sc.black}, White ${sc.white} + 6.5 komi = ${sc.white + 6.5}`);

if (fail.length) { console.error(fail.join('\n')); console.error(`\n${fail.length} problem(s): ${GAME.file} not written.`); process.exit(1); }
fs.mkdirSync(path.dirname(path.join(ROOT, GAME.file)), { recursive: true });
fs.writeFileSync(path.join(ROOT, GAME.file), sgf + '\n');
console.log('Wrote ' + GAME.file);
