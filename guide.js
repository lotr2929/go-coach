/* World of Go — the guide for the first game (option 3 of the teach-me choices).
   It explains, in plain words for a complete beginner, what each move did and what to look at next.
   No DOM and no AI: it reads the board with the engine E. `seen` remembers which ideas have already been explained,
   so each term is defined in full once and then only mentioned. test.js runs this file in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoGuide = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const name = c => (c === 1 ? 'black' : 'white');
  const Name = c => (c === 1 ? 'Black' : 'White');
  const count = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  const DEF = {
    coord: 'Every point has a name, like a map reference: the letter is the column and the number is the row.',
    liberty: 'A liberty is an empty point right next to a stone: above, below, left or right (never diagonal). Liberties are what keep a stone alive.',
    capture: 'A stone or group with no liberties left is captured: it is taken off the board and kept as a prisoner.',
    atari: 'Atari means a group has only one liberty left, so it will be captured on the next move unless it escapes.',
    territory: 'Territory means the empty points that only your stones surround. At the end of the game your score is your stones plus your territory.',
    edge: 'Stones on the very edge of the board (the first line) have few liberties and surround almost nothing, so they are usually weak early in the game.',
    line: 'This point is on the third or fourth line from the edge, which is a good balance: close enough to the edge to be safe, far enough to claim space.'
  };
  const TIPS = [
    'Tip: stones are stronger when they are connected, touching along a line. A connected group shares its liberties, so it is harder to capture.',
    'Tip: corners and sides need fewer stones to surround an area than the middle does. That is why most games start near the corners.',
    'Tip: before every move, look at each of your groups and count its liberties. If a group has only one, save it first.',
    'Tip: you do not have to capture anything to win. Surrounding more empty points than White is enough.',
    'Tip: if you are not sure where to play, type "hint". You can also ask "what is a liberty?", or type "undo" to take a move back.'
  ];

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
  const who = (E, s, a) => (a.stones.length > 1 ? `the ${a.stones.length}-stone group at ${E.coord(s.n, a.stones[0])}` : `the stone at ${E.coord(s.n, a.stones[0])}`);
  const lineOf = (n, i) => Math.min(i % n, (i / n) | 0, n - 1 - (i % n), n - 1 - ((i / n) | 0));

  function opening(o) {
    const stones = o.handicap ? `Black starts with ${o.handicap} stones already on the board (the handicap stones, on the star points). In Go, a stronger player gives the weaker player a head start so that the game is fair. ` : '';
    return [
      '**Your first game**',
      `This is a real game of Go, played gently. You are ${Name(o.human)} and the computer plays ${Name(3 - o.human)} at its easiest level. ${stones}${o.computerFirst ? 'White moves first.' : 'You move first.'}`,
      '**How to play**',
      '1. Tap an empty point, a place where two lines cross, to put a stone there. On a phone, tap once to preview the stone and again to confirm. Stones never move once placed.',
      '2. Your aim is to surround more empty points than your opponent (this is called territory), and to capture enemy stones that run out of liberties.',
      '3. After every move I will explain in plain words what happened and what to look for next.',
      '4. You can ask me anything at any time, for example "what is a liberty?", or type "hint" for a suggested move, or "undo" to take a move back.',
      '5. When you cannot find a useful move, press Pass. When both players pass, the game ends and we count the points.'
    ].join('\n');
  }

  /* After the learner's move. s is the board after the move, r the result of E.play, seen the explained ideas. */
  function afterHuman(E, s, idx, r, seen) {
    const me = 3 - s.turn, g = E.geom(s.n), at = E.coord(s.n, idx), own = E.flood(g, s.board, idx), L = own.libs.length, parts = [];
    parts.push(`**Your move: ${at}**`);
    parts.push(`You placed a ${name(me)} stone at ${at}.` + define(seen, 'coord'));
    if (r.captured.length) {
      parts.push(`You captured ${count(r.captured.length, 'stone', 'stones')}!${first(seen, 'capture') ? ' ' + DEF.capture : ' They are now your prisoners.'}`);
    }
    parts.push(`${own.stones.length > 1 ? 'Your group now has' : 'Your stone has'} ${count(L, 'liberty', 'liberties')}.${define(seen, 'liberty')}`);
    if (L === 1 && !r.captured.length) {
      parts.push(`Careful: that leaves ${own.stones.length > 1 ? 'the group' : 'the stone'} with a single liberty, at ${E.coord(s.n, own.libs[0])}. That is atari, and White could capture it by playing there.${define(seen, 'atari')}`);
    }
    for (const a of groupsNear(E, s, idx, 3 - me)) {
      if (a.libs.length !== 1) continue;
      const lib = E.coord(s.n, a.libs[0]);
      parts.push(`${Name(3 - me)}'s ${who(E, s, a).replace(/^the /, '')} is now in atari: it has only one liberty left, at ${lib}. If White does not rescue it, you can capture it by playing at ${lib}.${define(seen, 'atari')}`);
    }
    const line = lineOf(s.n, idx);
    if (line === 0 && s.moves.length <= 24) parts.push(DEF.edge);
    else if ((line === 2 || line === 3) && first(seen, 'line')) parts.push(DEF.line);
    return parts.join('\n');
  }

  /* After the computer's move. human is the learner's colour. */
  function afterComputer(E, s, idx, r, human, seen) {
    const cpu = 3 - human, at = E.coord(s.n, idx), parts = [];
    parts.push(`**${Name(cpu)}'s move: ${at}**`);
    parts.push(`The computer (${Name(cpu)}) placed a stone at ${at}.` + define(seen, 'coord'));
    if (r.captured.length) {
      parts.push(`It captured ${count(r.captured.length, 'stone', 'stones')} of yours.${first(seen, 'capture') ? ' ' + DEF.capture : ''} Do not worry: losing a stone is part of learning. Look at how it happened, so you can avoid it next time.`);
    }
    const near = groupsNear(E, s, idx, human);
    if (near.length) parts.push(`It touches ${near.map(a => who(E, s, a)).join(' and ')}, which takes away one of ${near.length > 1 ? 'their' : 'its'} liberties.${define(seen, 'liberty')}`);
    const mine = E.allGroups(s.n, s.board).filter(a => a.color === human && a.libs.length === 1);
    const theirs = E.allGroups(s.n, s.board).filter(a => a.color === cpu && a.libs.length === 1);
    parts.push('**Your turn**');
    if (mine.length) {
      const a = mine[0], lib = E.coord(s.n, a.libs[0]);
      parts.push(`Warning: ${who(E, s, a)} is in atari. It has only one liberty, at ${lib}, so White will capture it next move unless you rescue it.${define(seen, 'atari')} To rescue it, play at ${lib} yourself: that adds a stone to the group and gives it new liberties. The other way is to capture one of the white stones that are attacking it.`);
    } else if (theirs.length) {
      const a = theirs[0], lib = E.coord(s.n, a.libs[0]);
      parts.push(`Chance: ${who(E, s, a)} (White) is in atari. If you play at ${lib}, you capture it.${define(seen, 'atari')}`);
    } else if (first(seen, 'how')) {
      parts.push('Tap an empty point to place your stone. Not sure where? Type "hint".');
    } else {
      parts.push('Look for a good empty point, or type "hint".');
    }
    if (seen.tip === undefined) seen.tip = 0;
    if (!mine.length && seen.tip < TIPS.length) parts.push(TIPS[seen.tip++]);
    return parts.join('\n');
  }

  function humanPass() {
    return '**You passed**\nPassing means skipping your turn because you think there is nothing useful left to play. If White passes straight after, the game ends and we count.';
  }
  function computerPass(seen) {
    return '**White passes**\nThe computer thinks nothing useful is left to play. If you also pass now, the game ends. If you can still gain something, keep playing.' + (first(seen, 'territory') ? ' ' + DEF.territory : '');
  }
  function scoring(komi) {
    return [
      '**The game is over**',
      'Both players passed in a row, so we count. I have marked the stones I think are dead (stones that could not survive); they are taken off the board before counting. Tap a group to change my mind.',
      `Each side scores its stones plus its territory. White also adds komi (${komi} points), a bonus for moving second, so a tie is impossible. Press Confirm result when you agree with the marks.`
    ].join('\n');
  }

  return { opening, afterHuman, afterComputer, humanPass, computerPass, scoring, TIPS, DEF };
});
