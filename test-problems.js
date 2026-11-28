/* Go Coach tests for lessons from files (problems.js, make-lessons.js, lessons/). Run by test.js. */
const assert = require('assert');

module.exports = async function (t) {
  const fs = require('fs'), E = require('./engine.js'), PR = require('./problems.js');

  for (const name of ['lessons', 'puzzles']) await t(`${name} folder: every file is valid and ${name}/index.json is up to date`, () => {
    const { index, errors } = require('./make-lessons.js').build(name);
    assert.deepStrictEqual(errors, [], errors.join('\n'));
    assert(index.lessons.length >= 5, 'at least the five starter lessons');
    assert.strictEqual(fs.readFileSync(`${name}/index.json`, 'utf8'), JSON.stringify(index, null, 1) + '\n', `${name}/index.json is out of date: run node make-lessons.js`);
    for (let k = 1; k < index.lessons.length; k++) assert(index.lessons[k - 1].kyu >= index.lessons[k].kyu, 'easiest first');
  });

  await t('lessons folder: a ladder lesson follows the chase, the opponent\'s answers and a wrong try', () => {
    const P = PR.fromSGF(fs.readFileSync('lessons/25-20k/p0103-the-ladder.sgf', 'utf8'), 'p0103');
    const at = c => (9 - +c.slice(1)) * 9 + 'ABCDEFGHJ'.indexOf(c[0]);
    assert.strictEqual(P.kyu, 21); assert.strictEqual(P.turn, 1); assert(P.task.startsWith('Capture'));
    let r = PR.step(P.root, at('D5'));
    assert.strictEqual(r.result, 'go'); assert.strictEqual(r.reply, at('E4'));
    for (const [mine, theirs] of [['F4', 'E5'], ['E6', 'F5'], ['G5', 'F6'], ['F7', 'G6'], ['H6', 'G7'], ['G8', 'H7']]) {
      r = PR.step(r.at, at(mine)); assert.strictEqual(r.result, 'go', mine); assert.strictEqual(r.reply, at(theirs), mine);
    }
    const w = PR.step(P.root, at('E4'));
    assert.strictEqual(w.result, 'wrong'); assert.strictEqual(w.reply, at('D5')); assert(/other side/.test(w.comment));
    assert.strictEqual(PR.step(P.root, at('A1')).result, 'wrong');
    assert.strictEqual(PR.hint(P.root), at('D5'));
    const corner = PR.fromSGF(fs.readFileSync('lessons/25-20k/p0102-trapped-in-the-corner.sgf', 'utf8'), 'p0102');
    for (const c of ['A2', 'B1', 'C1', 'A3']) assert.strictEqual(PR.step(corner.root, at(c)).result, 'right', c);
    assert(!/^RIGHT/.test(PR.step(corner.root, at('A2')).comment), 'RIGHT is not shown to the player');
    assert.strictEqual(PR.kyuOf('2d'), -1); assert.strictEqual(PR.kyuOf('18k'), 18); assert.strictEqual(PR.kyuOf(''), null);
  });

  await t('lesson games: the main line, Your turn, the top moves and a wrong move', () => {
    const at = c => (9 - +c.slice(1)) * 9 + 'ABCDEFGHJ'.indexOf(c[0]);
    const P = PR.fromSGF('(;GM[1]FF[4]SZ[9]TY[story]GN[Test game]DI[30k]PL[B]C[A game.]LB[gc:A][cg:B]' +
      ';B[gc]C[A corner.\n\nYour turn: take another corner.\n\nBest: the other corners.];W[gg]C[White too.]LB[cc:A]' +
      '(;B[cc]C[Good.];W[cg]C[The end.])(;B[ee]C[The centre is smaller here.]))', 'test');
    assert(P.story); assert.deepStrictEqual(PR.problemsWith(P, E), []);
    assert(!PR.yourTurn(P.root)); assert.deepStrictEqual(PR.bestMoves(P.root, 9).map(m => m.label + E.coord(9, m.point)), ['AG7', 'BC3']);
    let r = PR.storyStep(P.root, at('G7'));
    assert(r.ok && !r.end); assert.strictEqual(r.reply.point, at('G3'));
    assert.strictEqual(PR.note(r.mine.comment), 'A corner.\n\nYour turn: take another corner.', 'Best: is kept back');
    assert.strictEqual(PR.bestWords(r.mine), 'the other corners.');
    assert(PR.yourTurn(r.mine) === true && !PR.yourTurn(r.at));
    const w = PR.storyStep(r.at, at('E5'));
    assert(!w.ok); assert(/smaller/.test(PR.note(w.side.comment)));
    assert(!PR.storyStep(r.at, at('A1')).side, 'a move the file does not show');
    r = PR.storyStep(r.at, at('C7'));
    assert(r.ok && r.end); assert.strictEqual(PR.note(r.at.comment), 'The end.');
    assert(PR.problemsWith(PR.fromSGF('(;GM[1]FF[4]SZ[9]TY[story]GN[x]DI[30k]PL[B]C[x];B[gc];W[gg])', 'x'), E).join().includes('last move'));
  });

  await t('lessons folder: the checker names what is wrong with a bad lesson', () => {
    const bad = PR.fromSGF('(;GM[1]FF[4]SZ[9]PL[B]AB[ee](;B[ee]C[RIGHT])(;W[aa]C[x]))', 'bad');
    const p = PR.problemsWith(bad, E).join('\n');
    for (const bit of ['GN', 'DI', 'C (the introduction)', 'illegal move (occupied)', 'expected Black to move']) assert(p.includes(bit), 'missing: ' + bit + '\n' + p);
  });
};
