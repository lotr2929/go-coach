/* Go Coach tests for lessons from files (problems.js, make-lessons.js, lessons/). Run by test.js. */
const assert = require('assert');

module.exports = async function (t) {
  const fs = require('fs'), E = require('./engine.js'), PR = require('./problems.js');

  await t('lessons folder: every lesson is valid and lessons/index.json is up to date', () => {
    const { index, errors } = require('./make-lessons.js').build();
    assert.deepStrictEqual(errors, [], errors.join('\n'));
    assert(index.lessons.length >= 5, 'at least the five starter lessons');
    assert.strictEqual(fs.readFileSync('lessons/index.json', 'utf8'), JSON.stringify(index, null, 1) + '\n', 'lessons/index.json is out of date: run node make-lessons.js');
    for (let k = 1; k < index.lessons.length; k++) assert(index.lessons[k - 1].kyu >= index.lessons[k].kyu, 'easiest first');
  });

  await t('lessons folder: a two-step lesson follows both right lines, the opponent\'s answers and wrong moves', () => {
    const P = PR.fromSGF(fs.readFileSync('lessons/25-20k/p0102-push-to-the-edge.sgf', 'utf8'), 'p0102');
    const at = c => (9 - +c.slice(1)) * 9 + 'ABCDEFGHJ'.indexOf(c[0]);
    assert.strictEqual(P.kyu, 20); assert.strictEqual(P.turn, 1); assert(P.task.startsWith('Capture'));
    let r = PR.step(P.root, at('A2'));
    assert.strictEqual(r.result, 'go'); assert.strictEqual(r.reply, at('B1'));
    r = PR.step(r.at, at('C1'));
    assert.strictEqual(r.result, 'right'); assert(r.comment.startsWith('Now White'), 'RIGHT is not shown to the player');
    r = PR.step(PR.step(P.root, at('B1')).at, at('A3'));
    assert.strictEqual(r.result, 'right');
    assert.strictEqual(PR.step(P.root, at('E5')).result, 'wrong');
    assert([at('A2'), at('B1')].includes(PR.hint(P.root)));
    assert.strictEqual(PR.kyuOf('2d'), -1); assert.strictEqual(PR.kyuOf('18k'), 18); assert.strictEqual(PR.kyuOf(''), null);
  });

  await t('lessons folder: the checker names what is wrong with a bad lesson', () => {
    const bad = PR.fromSGF('(;GM[1]FF[4]SZ[9]PL[B]AB[ee](;B[ee]C[RIGHT])(;W[aa]C[x]))', 'bad');
    const p = PR.problemsWith(bad, E).join('\n');
    for (const bit of ['GN', 'DI', 'C (the introduction)', 'illegal move (occupied)', 'expected Black to move']) assert(p.includes(bit), 'missing: ' + bit + '\n' + p);
  });
};
