/* Go Coach tests for the Go Coach grade (grade.js). Run by test.js. */
const assert = require('assert');

module.exports = async function (t) {
  const GR = require('./grade.js');

  await t('grade: the scale, the computer levels and handicap', () => {
    assert.strictEqual(GR.toR(20), 100); assert.strictEqual(GR.toR(1), 2000); assert.strictEqual(GR.toR(0), 2100);
    assert(Math.abs(GR.expected(GR.toR(10), GR.toR(11)) - 0.7) < 0.03, 'one grade stronger wins about 70%');
    assert.strictEqual(GR.opponentKyu({ size: 9, level: 'hard', handicap: 0, human: 1 }), 8);
    assert.strictEqual(GR.opponentKyu({ size: 9, level: 'hard', handicap: 2, human: 1 }), 14); /* your two stones make it weaker */
    assert.strictEqual(GR.opponentKyu({ size: 9, level: 'hard', handicap: 2, human: 2 }), 2);  /* its two stones make it stronger */
    assert.strictEqual(GR.gameWeight({ moves: 40 }), 1);
    assert.strictEqual(GR.gameWeight({ moves: 40, helped: true }), 0.5);
    for (const g of [{ moves: 40, guided: true }, { moves: 40, both: true }, { moves: 40, edited: true }, { moves: 5 }]) assert.strictEqual(GR.gameWeight(g), 0);
  });

  await t('grade: wins against a stronger computer raise it, losses lower it, and the whole grade is steady', () => {
    let st = GR.fresh();
    let r = GR.apply(st, 20, 1, 1); st = r.st;
    assert(r.after < r.before, 'a win moves the estimate towards a stronger grade (fewer kyu)');
    assert.strictEqual(st.whole, Math.ceil(r.after));
    const first = st.whole;
    for (let k = 0; k < 12; k++) st = GR.apply(st, 8, 1, 1).st; /* keeps beating Hard */
    assert(st.whole < first, 'promoted after a run of wins');
    const est = GR.toKyu(st.r), whole = st.whole;
    st = GR.apply(st, 30, 0, 1).st; /* one bad loss to Easy */
    assert(GR.toKyu(st.r) > est, 'a loss lowers the estimate');
    assert.strictEqual(st.whole, whole, 'one loss does not change the steady grade');
    const d = GR.display({ r: GR.toR(17.623), whole: 18 });
    assert.deepStrictEqual(d, { whole: 18, unit: 'kyu', est: '17.62' });
    assert.deepStrictEqual(GR.display({ r: GR.toR(-0.4), whole: 0 }), { whole: 1, unit: 'dan', est: '1.40' });
    assert.strictEqual(GR.display(GR.fresh()), null, 'nothing shown before the first result');
    assert(Math.abs(GR.lessonKyu(0, 23) - 30) < 1e-9 && Math.abs(GR.lessonKyu(22, 23) - 18) < 1e-9);
  });
};
