/* Go Coach tests: saved games (savegames.js) are stored as game records (sgf.js fromState) and must reopen exactly as they were,
   and export and import as SGF files. Run by test.js (node test.js). */
const assert = require('assert');
const E = require('./engine.js');
const SGF = require('./sgf.js');
const same = (a, b) => {
  assert.deepStrictEqual(Array.from(a.board), Array.from(b.board));
  assert.deepStrictEqual([a.turn, a.ko, a.passes, a.komi, a.handicap, a.moves.length, a.hist.length], [b.turn, b.ko, b.passes, b.komi, b.handicap, b.moves.length, b.hist.length]);
  assert.deepStrictEqual(a.caps, b.caps);
};
module.exports = async t => {
  await t('a saved game reopens as it was (handicap, capture, pass)', () => {
    const s = E.newState(9, 2), P = (x, y) => y * 9 + x;
    for (const i of [P(4, 4), P(0, 0), P(1, 0), P(2, 0)]) assert(E.play(s, i).ok); /* White, Black, White, Black */
    E.pass(s); /* White passes */
    assert.strictEqual(E.play(s, P(1, 1)).captured.length, 1); /* Black captures the white stone at the edge */
    assert(E.play(s, P(8, 8)).ok);
    const r = SGF.toState(E, JSON.parse(JSON.stringify(SGF.fromState(s))));
    assert(r.ok); same(r.s, s);
    const back = SGF.toState(E, SGF.parse(SGF.toSGF(SGF.fromState(s)))); /* through an exported file and back */
    assert(back.ok); same(back.s, s);
  });
  await t('a set-up position with no moves keeps its side to move', () => {
    const s = E.newState(9, 0);
    s.board[10] = 1; s.board[11] = 2; s.board[12] = 2; s.turn = 1;
    const r = SGF.toState(E, SGF.fromState(s));
    same(r.s, s);
  });
};
