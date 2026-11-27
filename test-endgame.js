/* Tests for endgame.js: when the computer passes first or resigns (Boon, 27 Nov 2026). Run by test.js. */
const assert = require('assert');
const E = require('./engine.js'), EG = require('./endgame.js');
const n = 9;
function make(rows, moves) {
  const s = E.newState(n, 0);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') s.board[y * n + x] = 1; if (ch === 'O') s.board[y * n + x] = 2; }));
  s.moves = new Array(moves).fill({ i: 0 }); s.turn = 2;
  return s;
}
module.exports = async t => {
  await t('the computer passes first only when every empty area belongs to one side', () => {
    assert.strictEqual(EG.decide(E, make(Array(9).fill('...XO....'), 60), 2, 7, {}), 'pass');
    assert.strictEqual(EG.decide(E, make(Array(8).fill('...XO....').concat(['...X.O...']), 60), 2, 7, {}), null, 'a neutral point is left');
    assert.strictEqual(EG.decide(E, make(Array(9).fill('...XO....'), 20), 2, 7, {}), null, 'too early in the game');
  });
  await t('the computer resigns after three turns clearly lost, never in an open game', () => {
    const lost = make(['XXXXXXXXX', 'X.X.X.X.X', 'XXXXXXXXX', '.........', '....OO...', '.........', 'XXXXXXXXX', 'X.X.X.X.X', 'XXXXXXXXX'], 60), mem = {};
    assert.deepStrictEqual([1, 2, 3].map(() => EG.decide(E, lost, 2, 30, mem)), [null, null, 'resign']);
    const open = make(['.........', '..X...O..', '.........', '.........', '....X....', '.........', '..O...X..', '.........', '.........'], 50);
    assert.strictEqual(EG.decide(E, open, 2, 40, {}), null);
  });
};
