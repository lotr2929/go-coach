/* Builds the 50 simplest puzzles of 27 Nov 2026 (p0301 to p0350, 30 to 26 kyu) for Puzzle mode: taking the last liberty,
   counting liberties, escaping from atari, making two eyes and taking an eye away (Boon: "50 puzzles at the simplest level, to
   teach basic moves like Atari and eyes"). Every answer is read out by the computer: captures and escapes by tactics.js, eyes by
   eyes.js; a puzzle whose answer does not work stops the build. Run from the repository folder:
   node tools/lessons/build-puzzles-2026-11-27.js, then node make-lessons.js. */
const fs = require('fs'), path = require('path');
const E = require('../../engine.js'), TT = require('./tactics.js'), EY = require('./eyes.js');
const n = 9, COLS = 'ABCDEFGHJ';
const esc = t => t.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
/* A position is written for the bottom-left of the board; a variant flips it: R (left-right), TL (top-bottom), TR (both). */
const flip = (c, f) => { let x = COLS.indexOf(c[0]), y = +c.slice(1); if (f === 'R' || f === 'TR') x = 8 - x; if (f === 'TL' || f === 'TR') y = 10 - y; return COLS[x] + y; };
const P = c => (n - +c.slice(1)) * n + COLS.indexOf(c[0]);
const sgf = c => String.fromCharCode(97 + COLS.indexOf(c[0])) + String.fromCharCode(97 + n - +c.slice(1));
const name = i => E.coord(n, i);
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

/* ---------- the puzzles, easiest first (the number follows this order) ---------- */
const ONE = [['L', '']];
const DEFS = [
  /* 30 kyu: take the last liberty */
  { kind: 'capture', di: '30k', title: 'Take the last liberty', at: ONE, target: 'E5', white: ['E5'], black: ['D5', 'F5', 'E6'],
    intro: 'The white stone at {T} has only one liberty left: one empty point next to it. A stone with one liberty left is in atari.\n\nTask: Capture it.',
    right: '{M} was its last liberty, so the white stone is captured and taken off the board.' },
  { kind: 'capture', di: '30k', title: 'Take the last liberty again', at: ONE, target: 'D4', white: ['D4'], black: ['C4', 'E4', 'D5'],
    intro: 'The white stone at {T} is in atari: Black stones block three of its four liberties.\n\nTask: Find the last liberty and capture the stone.',
    right: '{M} fills the last liberty. A stone in the middle has four liberties; take all four and it is captured.' },
  { kind: 'capture', di: '30k', title: 'Atari on the edge', at: [['L', ''], ['TL', ' (top)']], target: 'E1', white: ['E1'], black: ['D1', 'F1'],
    intro: 'A stone on the edge of the board has only three liberties. The white stone at {T} has already lost two of them.\n\nTask: Capture it.',
    right: '{M} takes the last liberty. Stones on the edge have fewer liberties, so they are easier to capture.' },
  { kind: 'capture', di: '30k', title: 'Atari in the corner', at: [['L', ''], ['TR', ' (top right)']], target: 'A1', white: ['A1'], black: ['B1'],
    intro: 'A stone in the corner has only two liberties. The white stone at {T} has one left.\n\nTask: Capture it.',
    right: '{M} takes the last liberty. In the corner a stone runs out of liberties very quickly.' },
  { kind: 'capture', di: '30k', title: 'Two stones, one liberty', at: ONE, target: 'D5', white: ['D5', 'D6'], black: ['C5', 'C6', 'E5', 'E6', 'D7'],
    intro: 'Stones that touch along a line are one group and share their liberties. The two white stones at {T} and above it have only one liberty between them.\n\nTask: Capture both.',
    right: '{M} was the group\'s last liberty, so both stones are captured together.' },
  { kind: 'capture', di: '30k', title: 'Two stones on the edge', at: [['L', ''], ['TR', ' (top right)']], target: 'C1', white: ['C1', 'D1'], black: ['B1', 'E1', 'C2'],
    intro: 'The two white stones on the edge are joined, so they share their liberties. Only one is left.\n\nTask: Capture both stones.',
    right: '{M} fills their last liberty and both stones are captured.' },
  { kind: 'capture', di: '30k', title: 'Two stones in the corner', at: [['L', ''], ['TR', ' (top right)']], target: 'A1', white: ['A1', 'A2'], black: ['B1', 'B2'],
    intro: 'Two white stones sit in the corner. Count the empty points next to them: there is only one.\n\nTask: Capture both stones.',
    right: '{M} takes the last liberty: two stones captured with one move.' },
  { kind: 'capture', di: '30k', title: 'Three stones, one liberty', at: ONE, target: 'D4', white: ['D4', 'D5', 'E5'], black: ['C4', 'C5', 'D3', 'E4', 'F5', 'D6'],
    intro: 'Three white stones are joined into one group. However big a group is, it is captured when its last liberty is taken.\n\nTask: Capture the whole group.',
    right: '{M} was the last liberty of all three stones, so the whole group is captured.' },
  /* 29 kyu: count the liberties */
  { kind: 'capture', di: '29k', title: 'Which one is in atari?', at: [['L', ''], ['TR', ' (top right)']], target: 'C7', white: ['C7', 'G3'], black: ['B7', 'C8', 'D7', 'F3'],
    intro: 'There are two white stones. Count their liberties: one has a single liberty left, the other has three.\n\nTask: Capture a white stone now.',
    right: '{M} captures the stone that was in atari. The other one still has three liberties and could simply run away.' },
  { kind: 'capture', di: '29k', title: 'Count the liberties', at: ONE, target: 'B2', white: ['B2', 'F6'], black: ['A2', 'B1', 'C2', 'F5', 'G6'],
    intro: 'Two white stones again. Before you play, count the empty points next to each one.\n\nTask: Capture the white stone that is in atari.',
    right: '{M} was the only liberty left. Counting liberties tells you which stone you can capture.' },
  { kind: 'capture', di: '29k', title: 'Three in a row', at: ONE, target: 'D5', white: ['D5', 'E5', 'F5'], black: ['C5', 'D4', 'E4', 'F4', 'G5', 'D6', 'F6'],
    intro: 'Three white stones in a row share their liberties. Black has taken all but one.\n\nTask: Capture all three.',
    right: '{M} closes the last gap: all three stones are captured.' },
  { kind: 'capture', di: '29k', title: 'Four on the edge', at: [['L', ''], ['TL', ' (top)']], target: 'C1', white: ['C1', 'D1', 'E1', 'F1'], black: ['B1', 'G1', 'C2', 'D2', 'E2'],
    intro: 'Four white stones lie along the edge. A long group can still have only one liberty.\n\nTask: Capture the four stones.',
    right: '{M} takes the last liberty and all four stones are captured.' },
  { kind: 'capture', di: '29k', title: 'Three in the corner', at: [['L', ''], ['TR', ' (top right)']], target: 'A1', white: ['A1', 'B1', 'B2'], black: ['C1', 'C2', 'B3'],
    intro: 'Three white stones are joined in the corner. Look for the one empty point they still have.\n\nTask: Capture them.',
    right: '{M} fills their last liberty. You may play there even though it looks surrounded, because your move captures.' },
  { kind: 'capture', di: '29k', title: 'Two at once', at: ONE, target: 'D5', white: ['D5', 'F5'], black: ['D4', 'D6', 'C5', 'F4', 'F6', 'G5'],
    intro: 'Two separate white stones are both in atari, and they share the same last liberty.\n\nTask: Capture both with one move.',
    right: '{M} was the last liberty of both stones, so one move captures two.' },
  /* 28 kyu: escape from atari */
  { kind: 'escape', di: '28k', title: 'Run away', at: ONE, target: 'E5', black: ['E5'], white: ['D5', 'F5', 'E6'],
    intro: 'Now your own stone is in danger. Your stone at {T} is in atari: it has one liberty left.\n\nTask: Save it.',
    right: '{M} runs out of atari. Your two stones now have {L} liberties, too many for White to capture.' },
  { kind: 'escape', di: '28k', title: 'Run along the edge', at: [['L', ''], ['TR', ' (top right)']], target: 'C1', black: ['C1'], white: ['B1', 'D1'],
    intro: 'Your stone at {T} on the edge is in atari.\n\nTask: Save it. Run away from the edge.',
    right: '{M} moves away from the edge. Your stones now have {L} liberties and are safe.' },
  { kind: 'escape', di: '28k', title: 'Join your friend', at: ONE, target: 'E5', black: ['E5', 'E7'], white: ['D5', 'F5', 'E4'],
    intro: 'Your stone at {T} is in atari, but another of your stones is close by.\n\nTask: Save the stone by joining it to its friend.',
    right: '{M} joins your stones into one group with {L} liberties. Stones that stick together are hard to capture.' },
  { kind: 'escape', di: '28k', title: 'Capture to escape', at: ONE, target: 'E5', black: ['E5', 'F4', 'F6'], white: ['D5', 'E4', 'F5'],
    intro: 'Your stone at {T} is in atari. But one of the white stones around it has only one liberty too.\n\nTask: Save your stone.',
    right: '{M} captures a white stone, and its empty point becomes a new liberty for you. Capturing is often the best way out of atari.',
    join: '{M} joins your stone to your other stones, with {L} liberties: that saves it too. The other way was to capture the white stone that was short of liberties.' },
  { kind: 'escape', di: '28k', title: 'Connect along the edge', at: [['L', ''], ['TR', ' (top right)']], target: 'C1', black: ['C1', 'E1', 'E2'], white: ['B1', 'C2'],
    intro: 'Your stone at {T} is in atari, and two of your stones are close by.\n\nTask: Save the stone at {T}.',
    right: '{M} joins your two stones. Together they have {L} liberties and are safe for now.' },
  /* 27 kyu: make two eyes */
  { kind: 'live', di: '27k', title: 'Make two eyes', at: [['L', ''], ['TR', ' (top right)']], region: ['B1', 'C1', 'D1'],
    intro: 'Your group is surrounded. Inside it are three empty points in a row. A group lives only if it has two eyes: two separate empty points that the opponent can never fill.\n\nTask: Make two eyes.',
    right: '{M} splits the space into two eyes. White can never play in either of them, so your group lives.',
    wrong: 'White plays {X} in the middle, and your space is left with only one eye. Your group will die. Look for the point that splits the space in two.' },
  { kind: 'live', di: '27k', title: 'Two eyes in the corner', at: [['L', ''], ['TR', ' (top right)']], region: ['A1', 'B1', 'C1'],
    intro: 'Your group in the corner surrounds three empty points in a row.\n\nTask: Make two eyes, so the group lives.',
    right: '{M}, in the middle, makes two separate eyes. The group lives.',
    wrong: 'White plays {X}, the middle point, and you have only one eye. The middle point was the key.' },
  { kind: 'live', di: '27k', title: 'The bent three', at: [['L', ''], ['TR', ' (top right)']], region: ['A1', 'B1', 'A2'],
    intro: 'Here the three empty points make a bend in the corner.\n\nTask: Make two eyes.',
    right: '{M}, at the bend, leaves two separate eyes. The group lives.',
    wrong: 'White plays {X}, at the bend, and only one eye is left. The point at the bend was the key.' },
  { kind: 'live', di: '27k', title: 'Two eyes on the side', at: [['L', ''], ['R', ' (right side)']], region: ['A4', 'A5', 'A6'],
    intro: 'Your group on the side of the board surrounds three empty points.\n\nTask: Make two eyes.',
    right: '{M} makes two eyes, one above and one below. The group lives.',
    wrong: 'White takes {X}, the middle point, and you are left with one eye. Your group dies.' },
  /* 26 kyu: take away an eye, and a little more */
  { kind: 'kill', di: '26k', title: 'Take away an eye', at: [['TL', ''], ['R', ' (bottom right)']], region: ['B1', 'C1', 'D1'],
    intro: 'Now it is White\'s group that is surrounded, with three empty points in a row. If White plays first in the middle, it makes two eyes and lives.\n\nTask: Stop White making two eyes.',
    right: '{M} takes the vital point. White can make only one eye now, so the group will die.',
    wrong: 'White plays {X} and makes two eyes: the group lives. Look for the point that White needs most.' },
  { kind: 'kill', di: '26k', title: 'Kill in the corner', at: [['TR', ''], ['L', ' (bottom left)']], region: ['A1', 'B1', 'C1'],
    intro: 'White\'s group in the corner has three empty points in a row.\n\nTask: Stop White making two eyes.',
    right: '{M} takes the middle point. White has only one eye, so the group is dead.',
    wrong: 'White plays {X} and has two eyes. Take the middle point first.' },
  { kind: 'kill', di: '26k', title: 'Kill the bent three', at: [['TR', ''], ['L', ' (bottom left)']], region: ['A1', 'B1', 'A2'],
    intro: 'White\'s eye space is bent around the corner.\n\nTask: Stop White making two eyes.',
    right: '{M}, at the bend, is the vital point. White cannot make two eyes now.',
    wrong: 'White plays {X}, at the bend, and makes two eyes. The bend was the vital point.' },
  { kind: 'kill', di: '26k', title: 'Kill on the side', at: [['R', ''], ['L', ' (left side)']], region: ['A4', 'A5', 'A6'],
    intro: 'White\'s group on the side has three empty points in a row.\n\nTask: Stop White making two eyes.',
    right: '{M} takes the middle point, and White is left with one eye.',
    wrong: 'White plays {X} in the middle and lives with two eyes.' },
  { kind: 'live', di: '26k', title: 'Four in a T', at: ONE, region: ['B1', 'C1', 'D1', 'C2'],
    intro: 'Your eye space has four points in the shape of a T.\n\nTask: Make two eyes. Find the one point that does it.',
    right: '{M}, in the centre of the T, leaves three separate eyes. The group lives.',
    wrong: 'White plays {X}, the centre of the T, and you cannot make two eyes any more.' },
  { kind: 'kill', di: '26k', title: 'Kill the T', at: [['TR', '']], region: ['B1', 'C1', 'D1', 'C2'],
    intro: 'White\'s eye space has four points in the shape of a T.\n\nTask: Stop White making two eyes.',
    right: '{M}, the centre of the T, is the vital point. White cannot make two eyes.',
    wrong: 'White plays {X}, the centre, and lives.' },
  { kind: 'live', di: '26k', title: 'Bent three on the edge', at: ONE, region: ['C1', 'D1', 'D2'],
    intro: 'Your three empty points bend away from the edge.\n\nTask: Make two eyes.',
    right: '{M}, at the bend, makes two eyes.',
    wrong: 'White plays {X}, at the bend, and you have only one eye.' },
  { kind: 'kill', di: '26k', title: 'Kill the bent three on the edge', at: [['TR', '']], region: ['C1', 'D1', 'D2'],
    intro: 'White\'s three empty points bend away from the edge.\n\nTask: Stop White making two eyes.',
    right: '{M}, at the bend, takes away White\'s second eye.',
    wrong: 'White plays {X}, at the bend, and makes two eyes.' },
  { kind: 'capture', di: '26k', title: 'Atari towards the edge', at: [['L', ''], ['TR', ' (top right)']], target: 'D2', white: ['D2'], black: ['C2', 'E2'], proof: true, wide: true,
    intro: 'The white stone at {T} has two liberties: one towards the edge, one towards the centre. Give atari from the right side and it has nowhere to run.\n\nTask: Capture the white stone, however it runs.',
    right: 'Captured.',
    proven: '{M} gives atari from the centre side, so White can only run towards the edge, where it runs out of liberties.',
    net: '{M} does not even touch the stone, but it closes the way out: wherever White runs, you can capture it against the edge. This is called a net.' }
];

/* ---------- building ---------- */
/* Escapes: a move is right when White cannot capture the stones afterwards, reading up to six White moves ahead (tactics.js
   reads without a limit, which takes too long on an open board). The stones count as safe once they have three liberties. */
const g9 = E.geom(n), grp = (b, i) => E.flood(g9, b, i);
function catches(b, t, att, d) {
  if (!b[t]) return true;
  if (d === 0) return false;
  for (const m of grp(b, t).libs) {
    const r = E.tryPlay(g9, b, m, att, -1);
    if (r.ok && (!r.board[t] || !gets(r.board, t, 3 - att, d - 1))) return true;
  }
  return false;
}
function gets(b, t, def, d) {
  const libs = grp(b, t).libs;
  if (libs.length >= 3) return true;
  const moves = new Set(libs);
  for (const s of grp(b, t).stones) for (const j of g9.nb[s]) if (b[j] && b[j] !== def) { const a = grp(b, j); if (a.libs.length === 1) moves.add(a.libs[0]); }
  for (const m of moves) { const r = E.tryPlay(g9, b, m, def, -1); if (r.ok && r.board[t] && !catches(r.board, t, 3 - def, d)) return true; }
  return false;
}
function escapes(b, t, right, join) {
  const moves = new Set(grp(b, t).libs);
  for (const s of grp(b, t).stones) for (const j of g9.nb[s]) if (b[j] === 2) { const a = grp(b, j); if (a.libs.length === 1) moves.add(a.libs[0]); }
  const out = [];
  for (const m of moves) {
    const r = E.tryPlay(g9, b, m, 1, -1);
    if (r.ok && r.board[t] && !catches(r.board, t, 2, 6)) out.push(`(;B[${sgf(name(m))}]C[${esc('RIGHT ' + fill(r.captured.length || !join ? right : join, { M: name(m), L: grp(r.board, t).libs.length }))}])`);
  }
  if (!out.length) throw new Error('no saving move');
  return out;
}

function eyeShape(region, owner) {
  /* The owner's wall: every point next to the eye space, corners included, so the wall is one group; the other side surrounds it. */
  const g = E.geom(n), reg = new Set(region), wall = new Set(), ring = new Set();
  for (const p of region) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = p % n + dx, y = ((p / n) | 0) + dy;
    if (x >= 0 && x < n && y >= 0 && y < n && !reg.has(y * n + x)) wall.add(y * n + x);
  }
  for (const w of wall) for (const j of g.nb[w]) if (!wall.has(j) && !reg.has(j)) ring.add(j);
  const b = new Array(n * n).fill(0);
  wall.forEach(p => { b[p] = owner; }); ring.forEach(p => { b[p] = 3 - owner; });
  return b;
}

function build(D, f, num) {
  const at = c => flip(c, f), title = D.title + (D.suffix || '');
  let b, tries, v = {};
  if (D.kind === 'capture' || D.kind === 'escape') {
    b = new Array(n * n).fill(0);
    D.black.map(at).forEach(c => { b[P(c)] = 1; });
    D.white.map(at).forEach(c => { b[P(c)] = 2; });
    const target = P(at(D.target));
    v.T = at(D.target);
    const libs0 = new Set(grp(b, target).libs.map(name));
    if (D.kind === 'capture') {
      tries = TT.captureTree(n, b, target, 1, {
        captured: (k, m) => fill(D.right, { M: m }), trapped: () => 'White has no way out: the stone is captured next move.',
        runs: p => `White runs to ${p}.`, escapes: () => '',
        proven: m => fill(libs0.has(m) || !D.net ? D.proven : D.net, { M: m })
      }, { proof: D.proof, wide: D.wide });
    } else {
      tries = escapes(b, target, D.right, D.join);
    }
  } else {
    const owner = D.kind === 'live' ? 1 : 2, region = D.region.map(at).map(P);
    b = eyeShape(region, owner);
    const { right, wrong } = EY.make(n).solve(b, owner, region, 1);
    if (!right.length) throw new Error(title + ': no move reaches the goal');
    if (D.kind === 'live' && right.length > 1 && D.region.length === 3) throw new Error(title + ': more than one right move in a three-point space');
    tries = right.map(m => `(;B[${sgf(name(m))}]C[${esc('RIGHT ' + fill(D.right, { M: name(m) }))}])`);
    for (const w of wrong) if (w.reply >= 0) tries.push(`(;B[${sgf(name(w.m))}];W[${sgf(name(w.reply))}]C[${esc(fill(D.wrong, { X: name(w.reply) }))}])`);
  }
  const stones = c => b.map((x, i) => (x === c ? `[${sgf(name(i))}]` : '')).join('');
  const file = `p${String(num).padStart(4, '0')}-${(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.sgf`;
  const text = `(;GM[1]FF[4]CA[UTF-8]SZ[9]GN[${esc(title)}]DI[${D.di}]PL[B]\nAB${stones(1)}\nAW${stones(2)}\nC[${esc(fill(D.intro, v))}]\n${tries.join('\n')}\n)\n`;
  return { file, text, rights: (text.match(/RIGHT/g) || []).length };
}

const out = path.join(__dirname, '../../puzzles/30-25k');
let num = 301;
for (const D of DEFS) for (const [f, suffix] of D.at) {
  const r = build(Object.assign({}, D, { suffix }), f, num++);
  fs.writeFileSync(path.join(out, r.file), r.text);
  console.log(`${r.file}: ${r.rights} right line(s)`);
}
console.log(`${num - 301} puzzles written.`);
