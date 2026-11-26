/* Go Coach tests for reading the fight (reading.js): the position Boon analysed on 27 Nov 2026, and random positions.
   Run by test.js (node test.js runs everything). */
const assert = require('assert');

module.exports = async function (t) {
  const E = require('./engine.js'), R = require('./reading.js');
  const name = c => (c === 1 ? 'Black' : 'White');
  const P = c => (9 - +c.slice(1)) * 9 + 'ABCDEFGHJ'.indexOf(c[0]);

  await t('reading: Boon\'s position (White just played C8) picks A (E8) and explains why', () => {
    const s = E.newState(9);
    for (const c of 'C8 D8 E7 G7 D6 C4 D4 C3 E3 F3 G3'.split(' ')) s.board[P(c)] = 2;
    for (const c of 'C7 D7 F7 C6 F6 G6 D5 F5 H5 E4 F4 G4'.split(' ')) s.board[P(c)] = 1;
    const r = R.read(E, s, ['E8', 'C5', 'E5', 'G8', 'E6'].map(P), name);
    assert(r, 'expected a reading');
    assert.strictEqual(r.letter, 'A');
    assert.strictEqual(r.answer, 'Answer: A (E8).');
    const text = r.sections.map(x => x.head + '\n' + x.text).join('\n');
    for (const bit of ['D6 has one liberty (E6), so it is already in atari.', 'E7 has two liberties (E6 and E8).', 'C8 and D8 are safe',
      'The only slightly thin stone is D5', 'puts E7 in atari and cuts it off from C8 and D8', 'If White connects at E6, Black E5 captures D6, E6 and E7.',
      'If White ignores it, Black E6 captures D6 and E7.', 'If White ataris D5 at C5, Black E6 still captures D6 and E7 and saves D5.',
      'E (E6) is good but smaller', 'C (E5) works only if White connects at E6', 'D (G8) puts G7 in atari, but White answers at H7 and escapes.',
      'B (C5) protects D5, which does not need it yet.']) assert(text.includes(bit), 'missing: ' + bit + '\n' + text);
  });

  await t('reading: nothing to read on an empty board, and random positions never break it', () => {
    assert.strictEqual(R.read(E, E.newState(9), [P('E5')], name), null);
    let seed = 7;
    const rnd = k => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k; };
    for (let k = 0; k < 150; k++) {
      const n = [9, 13, 19][k % 3], s = E.newState(n);
      for (let i = 0; i < 20 + rnd(n * n / 2); i++) { let ok = false; for (let tries = 0; tries < 20 && !ok; tries++) ok = E.play(s, rnd(n * n)).ok; if (!ok) E.pass(s); }
      const empties = [...s.board.keys()].filter(i => !s.board[i]).slice(0, 5);
      const r = R.read(E, s, empties, name);
      if (r) assert(!/NaN|undefined|[{}]/.test(r.sections.map(x => x.head + x.text).join('') + r.answer), 'odd text in a reading');
    }
  });
};
