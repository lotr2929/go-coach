/* World of Go — the guide for the first game (option 3 of the teach-me choices).
   It explains, in plain words for a complete beginner, what each move did and what to look at next.
   No DOM and no AI: it reads the board with the engine E. `seen` remembers which ideas have already been explained,
   so each term is defined in full once and then only mentioned. The wording is in docs/text/en/guide.md. test.js runs this file in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoGuide = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const T = (k, v) => TX.T('guide.' + k, v);

  const name = c => T(c === 1 ? 'black' : 'white');
  const Name = c => T(c === 1 ? 'black-cap' : 'white-cap');
  const stones = k => (k === 1 ? T('stone-one') : T('stones', { count: k }));
  const liberties = k => (k === 1 ? T('liberty-one') : T('liberties', { count: k }));

  const DEF = {};
  for (const k of ['coord', 'liberty', 'capture', 'atari', 'territory', 'edge', 'line']) DEF[k] = T('def.' + k);
  const TIPS = [];
  for (let i = 1; TX.has(`guide.tip-${i}`); i++) TIPS.push(T(`tip-${i}`));

  const first = (seen, key) => { if (seen[key]) return false; seen[key] = 1; return true; };
  const define = (seen, key) => (first(seen, key) ? ' ' + DEF[key] : '');

  /* The groups of one colour that touch point idx. */
  function groupsNear(E, s, idx, colour) {
    const g = E.geom(s.n), done = new Set(), out = [];
    for (const j of g.nb[idx]) {
      if (s.board[j] !== colour || done.has(j)) continue;
      const a = E.flood(g, s.board, j);
      a.stones.forEach(x => done.add(x));
      out.push(a);
    }
    return out;
  }
  /* "the 3-stone group at D4" (or, with bare, "3-stone group at D4") */
  const who = (E, s, a, bare) => (a.stones.length > 1 ? T(bare ? 'group-at' : 'the-group', { count: a.stones.length, point: E.coord(s.n, a.stones[0]) }) : T(bare ? 'stone-at' : 'the-stone', { point: E.coord(s.n, a.stones[0]) }));
  const lineOf = (n, i) => Math.min(i % n, (i / n) | 0, n - 1 - (i % n), n - 1 - ((i / n) | 0));

  function opening(o) {
    const firstMove = T(o.computerFirst ? 'white-first' : 'you-first');
    const intro = o.handicap ? T('intro-handicap', { you: Name(o.human), cpu: Name(3 - o.human), count: o.handicap, first: firstMove }) : T('intro', { you: Name(o.human), cpu: Name(3 - o.human), first: firstMove });
    return [T('title'), intro, T('how')].join('\n');
  }

  /* After the learner's move. s is the board after the move, r the result of E.play, seen the explained ideas. */
  function afterHuman(E, s, idx, r, seen) {
    const me = 3 - s.turn, g = E.geom(s.n), at = E.coord(s.n, idx), own = E.flood(g, s.board, idx), L = own.libs.length, parts = [];
    parts.push(T('your-move', { point: at }));
    parts.push(T('placed', { colour: name(me), point: at }) + define(seen, 'coord'));
    if (r.captured.length) {
      parts.push(T('captured', { stones: stones(r.captured.length) }) + (first(seen, 'capture') ? ' ' + DEF.capture : ' ' + T('prisoners')));
    }
    parts.push(T(own.stones.length > 1 ? 'group-libs' : 'stone-libs', { libs: liberties(L) }) + define(seen, 'liberty'));
    if (L === 1 && !r.captured.length) {
      parts.push(T(own.stones.length > 1 ? 'self-atari-group' : 'self-atari-stone', { point: E.coord(s.n, own.libs[0]) }) + define(seen, 'atari'));
    }
    for (const a of groupsNear(E, s, idx, 3 - me)) {
      if (a.libs.length !== 1) continue;
      parts.push(T('enemy-atari', { player: Name(3 - me), what: who(E, s, a, true), point: E.coord(s.n, a.libs[0]) }) + define(seen, 'atari'));
    }
    const line = lineOf(s.n, idx);
    if (line === 0 && s.moves.length <= 24) parts.push(DEF.edge);
    else if ((line === 2 || line === 3) && first(seen, 'line')) parts.push(DEF.line);
    return parts.join('\n');
  }

  /* After the computer's move. human is the learner's colour. */
  function afterComputer(E, s, idx, r, human, seen) {
    const cpu = 3 - human, at = E.coord(s.n, idx), parts = [];
    parts.push(T('cpu-move', { player: Name(cpu), point: at }));
    parts.push(T('cpu-placed', { player: Name(cpu), point: at }) + define(seen, 'coord'));
    if (r.captured.length) {
      parts.push(T('cpu-captured', { stones: stones(r.captured.length) }) + (first(seen, 'capture') ? ' ' + DEF.capture : '') + ' ' + T('dont-worry'));
    }
    const near = groupsNear(E, s, idx, human);
    if (near.length) parts.push(T('touches', { list: near.map(a => who(E, s, a)).join(` ${T('and')} `), their: T(near.length > 1 ? 'their' : 'its') }) + define(seen, 'liberty'));
    const mine = E.allGroups(s.n, s.board).filter(a => a.color === human && a.libs.length === 1);
    const theirs = E.allGroups(s.n, s.board).filter(a => a.color === cpu && a.libs.length === 1);
    parts.push(T('your-turn'));
    if (mine.length) {
      const a = mine[0], lib = E.coord(s.n, a.libs[0]);
      parts.push(T('warning', { what: who(E, s, a), point: lib }) + define(seen, 'atari') + ' ' + T('rescue-how', { point: lib }));
    } else if (theirs.length) {
      const a = theirs[0], lib = E.coord(s.n, a.libs[0]);
      parts.push(T('chance', { what: who(E, s, a), point: lib }) + define(seen, 'atari'));
    } else if (first(seen, 'how')) {
      parts.push(T('how-first'));
    } else {
      parts.push(T('how-again'));
    }
    if (seen.tip === undefined) seen.tip = 0;
    if (!mine.length && seen.tip < TIPS.length) parts.push(TIPS[seen.tip++]);
    return parts.join('\n');
  }

  function humanPass() {
    return T('you-passed');
  }
  function computerPass(seen) {
    return T('white-passes') + (first(seen, 'territory') ? ' ' + DEF.territory : '');
  }
  function scoring(komi) {
    return T('over', { komi });
  }

  return { opening, afterHuman, afterComputer, humanPass, computerPass, scoring, TIPS, DEF };
});
