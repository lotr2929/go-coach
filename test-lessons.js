/* Go Coach tests: the lesson positions do what their words claim. Run by test.js (node test.js).
   The ladder and the net are read out move by move with a small capture reader, so a change to a diagram that breaks the lesson is caught. */
const assert = require('assert');
const E = require('./engine.js');
const LS = require('./lessons.js');
const g = E.geom(9), P = (x, y) => y * 9 + x;
const libs = (s, p) => E.flood(g, s.board, p).libs;
function play(s, i, c) {
  const r = E.tryPlay(g, s.board, i, c, s.ko);
  return r.ok ? Object.assign({}, s, { board: r.board, ko: r.ko }) : null;
}
/* Black to move: can Black capture the white group at p within d moves? ladder: Black may only give atari. */
function black(s, p, d, ladder) {
  if (!s.board[p]) return true;
  const L = libs(s, p);
  if (L.length === 1) return true;
  if (d <= 0 || L.length > 2) return false;
  const cand = new Set(L);
  if (!ladder) for (const x of L) for (const j of g.nb[x]) if (!s.board[j]) cand.add(j);
  for (const m of cand) {
    const t = play(s, m, 1);
    if (t && t.board[p] && (!ladder || libs(t, p).length === 1) && white(t, p, d - 1, ladder)) return true;
  }
  return false;
}
/* White to move: does Black still capture, whatever White does (extend, or capture a black stone in atari)? */
function white(s, p, d, ladder) {
  if (!s.board[p]) return true;
  const grp = E.flood(g, s.board, p), opts = new Set(grp.libs);
  for (const st of grp.stones) for (const j of g.nb[st]) if (s.board[j] === 1) { const bl = libs(s, j); if (bl.length === 1) opts.add(bl[0]); }
  for (const m of opts) { const t = play(s, m, 2); if (t && !black(t, p, d - 1, ladder)) return false; }
  return true;
}
const lesson = id => { const L = LS.list.find(l => l.id === id); return { L, s: LS.setup(L) }; };

module.exports = async t => {
  await t('lessons: the border is sealed only by closing the gap', () => {
    const { L, s } = lesson('border');
    assert.strictEqual(E.scoreArea(9, s.board).terr[P(1, 4)], 0, 'before: Black’s side leaks');
    assert.strictEqual(LS.handle(L, s, P(3, 4)).status, 'win');
    assert.strictEqual(E.scoreArea(9, s.board).terr[P(1, 4)], 1);
  });
  await t('lessons: the neutral point A counts for nobody, B for Black', () => {
    const { s } = lesson('dame'), terr = E.scoreArea(9, s.board).terr;
    assert.strictEqual(terr[P(4, 4)], 0); assert.strictEqual(terr[P(1, 4)], 1);
  });
  await t('lessons: the ladder fails because of the breaker, and works without it', () => {
    const { s } = lesson('ladder'), p = P(2, 2);
    assert.strictEqual(black(s, p, 40, true), false, 'with X on the board the ladder must fail');
    const t2 = Object.assign({}, s, { board: s.board.slice() }); t2.board[P(6, 6)] = 0;
    assert.strictEqual(black(t2, p, 40, true), true, 'without X the ladder must capture');
  });
  await t('lessons: in the net lesson only the net captures; atari lets White escape', () => {
    const { L, s } = lesson('net'), p = P(4, 4);
    const [[x, y]] = L.solution;
    assert(white(play(s, P(x, y), 1), p, 10, false), 'after the net, White must not escape');
    for (const m of libs(s, p)) assert(!white(play(s, m, 1), p, 10, false), 'an atari must let White escape');
    assert.strictEqual(LS.handle(L, LS.setup(L), P(x, y)).status, 'win');
  });
};
