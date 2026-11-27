/* Builds the capture and escape lessons of 27 Nov 2026 (p0004 to p0008, and p0102 to p0104; p0102 replaces an earlier hand-written version that wrongly marked two right moves as wrong) with their answer trees
   read out by tactics.js. Run from the repository folder: node tools/lessons/build-2026-11-27.js, then node make-lessons.js.
   A model for later batches: describe the position and the words, and let the reader write every right line. */
const fs = require('fs'), path = require('path');
const E = require('../../engine.js'), TT = require('./tactics.js');
const n = 9, P = c => (n - +c.slice(1)) * n + 'ABCDEFGHJ'.indexOf(c[0]);
const sgfPt = c => String.fromCharCode(97 + 'ABCDEFGHJ'.indexOf(c[0])) + String.fromCharCode(97 + n - +c.slice(1));
const esc = t => t.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
const board = (bl, wh) => { const b = new Array(n * n).fill(0); bl.forEach(c => { b[P(c)] = 1; }); wh.forEach(c => { b[P(c)] = 2; }); return b; };

const LESSONS = [
  { file: '30-25k/p0004-capture-in-the-corner.sgf', title: 'Capture in the corner', di: '30k', goal: 'capture', target: 'A1',
    black: ['B1'], white: ['A1'],
    intro: 'A stone in the corner has only two liberties. The white stone at A1 has already lost one of them.\n\nTask: Capture it.',
    captured: () => 'In the corner a stone runs out of liberties quickly. One more move and it is yours.' },
  { file: '30-25k/p0005-two-stones-in-atari.sgf', title: 'Two stones in atari', di: '29k', goal: 'capture', target: 'D5',
    black: ['C5', 'D4', 'E4', 'F5', 'D6'], white: ['D5', 'E5'],
    intro: 'Stones that touch along a line form one group and share their liberties. White\'s two stones at D5 and E5 have only one liberty left between them.\n\nTask: Capture both.',
    captured: () => 'E6 was the group\'s last liberty, so both stones are captured together.' },
  { file: '30-25k/p0006-which-one.sgf', title: 'Which one can you capture?', di: '27k', goal: 'capture', target: 'C7',
    black: ['B7', 'C8', 'D7', 'F3', 'G2'], white: ['C7', 'G3'],
    intro: 'There are two white stones. Count their liberties: one has only a single liberty left, the other has two.\n\nTask: Capture a white stone now.',
    captured: () => 'C7 had only one liberty, at C6. G3 still has two, so it could have run away.' },
  { file: '30-25k/p0007-run-to-a-friend.sgf', title: 'Run to a friend', di: '27k', goal: 'escape', target: 'A5',
    black: ['A5', 'B6', 'C6'], white: ['A4', 'B5'],
    intro: 'Your stone at A5, on the edge, is in atari: its only liberty is A6. Your stones at B6 and C6 are close by.\n\nTask: Save your stone.',
    safe: () => 'A6 saves the stone and joins it to B6 and C6. Together they have plenty of liberties, so White cannot capture them.' },
  { file: '25-20k/p0008-capture-to-escape.sgf', title: 'Capture to escape', di: '24k', goal: 'escape', target: 'E5',
    black: ['E5', 'F4', 'F6'], white: ['D5', 'E4', 'F5'],
    intro: 'Your stone at E5 is in atari. But look at the white stone at F5: it is short of liberties too.\n\nTask: Save your stone at E5. There are two ways.',
    safe: (libs, p, caught) => caught ? 'Your stones are safe. Capturing a stone that surrounds you gives you its point as a new liberty: often the best way out of atari.'
      : `${p} joins your stones together, with plenty of liberties. The other way was to capture the white stone at F5 first.` },
  { file: '25-20k/p0102-trapped-in-the-corner.sgf', title: 'Trapped in the corner', di: '22k', goal: 'capture', target: 'B2',
    black: ['B3', 'C2'], white: ['B2'], proof: true, wide: true,
    intro: 'The white stone at B2 is close to the corner, with only two liberties, A2 and B1. Near the corner a stone has very little room to run.\n\nTask: Capture the white stone, however it runs.',
    captured: () => 'Captured.',
    proven: p => `${p} works: whichever way White runs, it meets the edge of the board and runs out of liberties. Near the corner there are several ways to catch a stone.` },
  { file: '25-20k/p0103-the-ladder.sgf', title: 'The ladder', di: '21k', goal: 'capture', target: 'D4',
    black: ['C4', 'D3', 'E2'], white: ['D4'], wrong: ['E4'],
    intro: 'White\'s stone at D4 has two liberties, D5 and E4. Give atari from the right side and White can only run in a zigzag, always left with one liberty, until the edge of the board stops it. This chase is called a ladder.\n\nTask: Capture the white stone. Keep giving atari from the same side.',
    captured: () => 'The ladder reached the edge and White ran out of liberties. A ladder works when nothing stands in its way: a white stone on its path would break it.',
    escapes: (w, d) => `After ${w}, White runs to ${d} and has three liberties: the chase is over. Give atari from the other side, so that White runs towards your stone at E2.` },
  { file: '25-20k/p0104-the-net.sgf', title: 'The net', di: '19k', goal: 'capture', target: 'E5',
    black: ['D5', 'E4'], white: ['E5', 'G7'], proof: true, wide: true, wrong: ['E6', 'F5'],
    intro: 'White\'s stone at E5 has two liberties. An atari will not work here: White would run towards G7 and join it, breaking the ladder.\n\nTask: Capture the white stone anyway. Think of a net, not a chase.',
    captured: () => 'The net held.',
    proven: () => 'F6 does not touch the stone, but it closes every way out. Wherever White runs, you can give atari and the stone stays trapped. This is called a net (geta).',
    escapes: (w, d) => `After the atari at ${w}, White runs to ${d}, towards the stone at G7, and gets away. A plain atari only chases White into help.` }
];

function build(L) {
  const b = board(L.black, L.white), target = P(L.target);
  const att = 1, colour = 'White';
  const comments = {
    captured: () => L.captured(), trapped: () => L.trapped ? L.trapped() : `${colour} has no way out: the stones are captured next move.`,
    runs: p => `${colour} runs to ${p}.`, chases: p => `${colour} chases you at ${p}.`, safe: (libs, p, caught) => L.safe(libs, p, caught),
    proven: p => L.proven(p), escapes: (w, d) => L.escapes(w, d)
  };
  const tries = L.goal === 'capture' ? TT.captureTree(n, b, target, att, comments, { wide: L.wide, proof: L.proof, wrong: (L.wrong || []).map(P) }) : TT.escapeTree(n, b, target, 1, comments);
  return `(;GM[1]FF[4]CA[UTF-8]SZ[9]GN[${esc(L.title)}]DI[${L.di}]PL[B]\nAB${L.black.map(c => `[${sgfPt(c)}]`).join('')}\nAW${L.white.map(c => `[${sgfPt(c)}]`).join('')}\nC[${esc(L.intro)}]\n${tries.join('\n')}\n)\n`;
}

for (const L of LESSONS) {
  const t0 = Date.now(), text = build(L);
  fs.writeFileSync(path.join(__dirname, '../../lessons', L.file), text);
  console.log(`${L.file}: ${(text.match(/RIGHT/g) || []).length} right line(s), ${text.length} bytes, ${Date.now() - t0} ms`);
}
