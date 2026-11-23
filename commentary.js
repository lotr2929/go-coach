/* Go Coach — plain-language commentary. Explains what a move does on the actual board, why it matters and what may happen next. No AI service. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoCommentary = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const name = (n, i) => LETTERS[i % n] + (n - ((i / n) | 0));
  const col = c => (c === 1 ? 'Black' : 'White');
  const plural = (k, w) => k + ' ' + w + (k === 1 ? '' : 's');
  const firstSentence = p => p.split(/(?<=\.)\s/)[0];

  /* The idea behind each kind of move, in a sentence a beginner can keep. */
  const IDEAS = {
    capture: 'Idea: a captured stone is gone for good. Before each move, ask: can I capture something safely?',
    rescue: 'Idea: check for atari before every move. A group with one liberty can vanish in a single move.',
    atari: 'Idea: atari is a threat, not a capture. It works best when the group cannot escape, or when the reply it forces helps you.',
    connect: 'Idea: connected stones share their liberties. Stones left apart can be attacked one at a time.',
    cut: 'Idea: cutting turns one strong group into two weak ones, and weak groups have to spend moves defending.',
    territory: 'Idea: your score is your stones plus the empty points you surround, so claiming big empty areas early is efficient.',
    approach: 'Idea: a stone placed near the opponent’s stone limits how much space that stone can claim.',
    build: 'Idea: stones that support each other make a position strong, and a strong position makes territory easier to hold.',
    boundary: 'Idea: where two sides meet, each move decides how far each side’s area reaches. Moves on the boundary are often the biggest on the board.',
    line: 'Idea: the third line is the "line of territory" (safe and good for points) and the fourth is the "line of influence" (more power towards the centre).'
  };

  function region(n, i) {
    const x = i % n, y = (i / n) | 0, mid = (n - 1) / 2;
    const dx = Math.min(x, n - 1 - x), dy = Math.min(y, n - 1 - y);
    const horiz = x < mid ? 'left' : x > mid ? 'right' : 'middle';
    const vert = y < mid ? 'upper' : y > mid ? 'lower' : 'middle';
    const reach = n >= 13 ? 5 : 3;
    if (dx <= reach && dy <= reach && horiz !== 'middle' && vert !== 'middle') return { zone: 'corner', label: `${vert} ${horiz} corner` };
    if (dy <= 2 && dy <= dx) return { zone: 'side', label: (vert === 'upper' ? 'top' : 'bottom') + ' side' };
    if (dx <= 2) return { zone: 'side', label: horiz + ' side' };
    return { zone: 'centre', label: 'centre' };
  }
  const edgeOf = (n, i) => Math.min(i % n, (i / n) | 0, n - 1 - (i % n), n - 1 - ((i / n) | 0));
  function stonesNear(s, i, radius) {
    const n = s.n, x = i % n, y = (i / n) | 0, out = [];
    for (let j = 0; j < n * n; j++) {
      if (!s.board[j]) continue;
      const d = Math.abs(j % n - x) + Math.abs(((j / n) | 0) - y);
      if (d <= radius) out.push({ idx: j, color: s.board[j], d });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  const groupName = (n, grp) => (grp.stones.length > 1 ? `${grp.stones.length}-stone group` : 'stone') + ' at ' + name(n, grp.stones[0]);

  /* What does a move at idx do for `color`? Returns { ok, idx, title, points, warning, concept }. */
  function describeMove(E, s, idx, color, viewer) {
    viewer = viewer || color;
    const n = s.n, g = E.geom(n), nm = name(n, idx), o = 3 - color;
    const mineW = color === viewer ? 'your' : col(color) + '’s', who = color === viewer ? 'you' : col(color);
    const oppW = o === viewer ? 'your' : col(o) + '’s', oppWho = o === viewer ? 'you' : col(o);
    const Mine = mineW[0].toUpperCase() + mineW.slice(1);
    const r = E.tryPlay(g, s.board, idx, color, s.ko);
    if (!r.ok) return { ok: false, idx, title: nm, points: [`${nm} is not a legal move.`], warning: null, concept: null };
    const after = r.board, mine = E.flood(g, after, idx), bullets = [];
    let warning = null;
    const reg = region(n, idx), edge = edgeOf(n, idx);

    if (r.captured.length) bullets.push({ w: 100, c: 'capture', t: `It captures ${plural(r.captured.length, 'stone')}. Captured stones leave the board, which weakens ${oppWho} and opens up space for ${who}.` });

    const seen = new Set();
    for (const j of g.nb[idx]) {
      if (s.board[j] !== color || seen.has(j)) continue;
      const grp = E.flood(g, s.board, j);
      grp.stones.forEach(x => seen.add(x));
      if (grp.libs.length === 1 && mine.libs.length >= 2) bullets.push({ w: 95, c: 'rescue', t: `${Mine} ${groupName(n, grp)} was in atari (one liberty left), so ${oppWho} could have captured it next turn. This move gives the group ${mine.libs.length} liberties, so it is safe for now.` });
    }

    const seenE = new Set();
    for (const j of g.nb[idx]) {
      if (after[j] !== o || seenE.has(j)) continue;
      const a = E.flood(g, after, j);
      a.stones.forEach(x => seenE.add(x));
      if (a.libs.length === 1) {
        const lib = a.libs[0], esc = E.tryPlay(g, after, lib, o, r.ko);
        const libsAfter = esc.ok ? E.flood(g, esc.board, lib).libs.length : 0;
        const how = libsAfter >= 3 ? `${oppWho} can run by extending at ${name(n, lib)}, so this mostly forces a reply`
          : libsAfter === 2 ? `${oppWho} can try to run at ${name(n, lib)} but would still be short of room`
          : `${oppWho} cannot escape, so ${who} can capture it next move`;
        bullets.push({ w: 85, c: 'atari', t: `It puts ${oppW} ${groupName(n, a)} in atari: only one liberty is left, at ${name(n, lib)}. ${how}.` });
      } else if (a.libs.length === 2) bullets.push({ w: 40, c: 'atari', t: `${oppW[0].toUpperCase() + oppW.slice(1)} ${groupName(n, a)} is down to 2 liberties, so it is running short of room.` });
    }

    let urgent = false;
    if (mine.libs.length === 1 && !r.captured.length) { warning = `after this move ${mineW} stone has only one liberty, so ${oppWho} could capture it by playing at ${name(n, mine.libs[0])}.`; urgent = true; }

    const ownGroups = new Set(), oppGroups = new Set(), ownNames = [], oppNames = [];
    for (const j of g.nb[idx]) {
      if (s.board[j] === color) {
        const grp = E.flood(g, s.board, j);
        if (!grp.stones.some(x => ownGroups.has(x))) { grp.stones.forEach(x => ownGroups.add(x)); ownNames.push(name(n, grp.stones[0])); }
      } else if (s.board[j] === o) {
        const grp = E.flood(g, s.board, j);
        if (!grp.stones.some(x => oppGroups.has(x))) { grp.stones.forEach(x => oppGroups.add(x)); oppNames.push(name(n, grp.stones[0])); }
      }
    }
    if (ownNames.length >= 2) bullets.push({ w: 70, c: 'connect', t: `It joins ${mineW} groups at ${ownNames.join(' and ')} into one. Connected stones share their liberties, so the new group is stronger and harder to capture.` });
    if (oppNames.length >= 2) bullets.push({ w: 70, c: 'cut', t: `It sits between ${oppW} groups at ${oppNames.join(' and ')}, cutting them apart so each is weaker.` });

    const tactical = bullets.some(b => b.w >= 70);
    const near = stonesNear(s, idx, 4);
    const ownNear = near.filter(x => x.color === color), oppNear = near.filter(x => x.color === o);
    if (!tactical) {
      if (!near.length) {
        if (edge <= 1) bullets.push({ w: 20, c: 'territory', t: `It starts in the empty ${reg.zone === 'centre' ? 'area' : reg.label}, but right on the edge, which is too low to claim much.` });
        else if (reg.zone === 'corner') bullets.push({ w: 60, c: 'territory', t: `It claims the empty ${reg.label}. No stones are near it, so one stone can start to claim a lot of space. Corners come first because two edges help you.` });
        else if (reg.zone === 'side') bullets.push({ w: 55, c: 'territory', t: `It takes the empty ${reg.label}. Sides come after corners, because only one edge helps you.` });
        else bullets.push({ w: 55, c: 'territory', t: 'It takes the open centre. A centre stone looks over the whole board but, with no edge to help it, it claims territory slowly.' });
      } else if (oppNear.length && !ownNear.length) bullets.push({ w: 55, c: 'approach', t: `It approaches ${oppW} stone at ${name(n, oppNear[0].idx)}. That limits how much of this area ${oppWho} can claim and starts a contest for it.` });
      else if (ownNear.length && !oppNear.length) bullets.push({ w: 45, c: 'build', t: `It builds on ${mineW} stone at ${name(n, ownNear[0].idx)}, making the position in this area stronger.` });
      else bullets.push({ w: 50, c: 'boundary', t: `It fights for the space between ${mineW} stone at ${name(n, ownNear[0].idx)} and ${oppW} stone at ${name(n, oppNear[0].idx)}. Whoever gets more of that space gains points.` });

      const early = s.board.reduce((k, v) => k + (v ? 1 : 0), 0) < n * n * 0.25;
      if (edge === 0) { const tx = 'it is on the first line (the very edge): a stone there has few liberties and little room to make territory.'; if (early) warning = warning || tx; else bullets.push({ w: 30, c: 'line', t: 'It is on the first line (the very edge): few liberties and little room to make territory.' }); }
      else if (edge === 1) bullets.push({ w: 28, c: 'line', t: 'It is on the second line: safe, but low, so it usually makes only a small amount of territory.' });
      else if (edge === 2) bullets.push({ w: 32, c: 'line', t: 'It is on the third line, which is safe and good for making territory along the edge.' });
      else if (edge === 3) bullets.push({ w: 30, c: 'line', t: 'It is on the fourth line, which gives more influence towards the centre while staying fairly safe.' });
    }

    if (!warning && mine.libs.length === 2 && stonesNear(s, idx, 2).some(x => x.color === o)) warning = `after this move ${mineW} ${groupName(n, mine)} has only 2 liberties, so ${oppWho} can put it in atari.`;

    bullets.sort((a, b) => b.w - a.w);
    const top = bullets[0];
    const title = reg.zone === 'centre' ? nm : `${nm} (${reg.label})`;
    return { ok: true, idx, color, title, points: bullets.map(b => b.t), warning, urgent, concept: top ? IDEAS[top.c] : null };
  }

  /* Text for the chat. opts: { head, bullets, concept } */
  function render(d, opts) {
    opts = opts || {};
    const lines = [opts.head || d.title + '.'];
    const warn = d.warning ? '⚠ Careful: ' + d.warning : '';
    if (warn && d.urgent) lines.push(warn);
    d.points.slice(0, opts.bullets || 2).forEach(p => lines.push('• ' + p));
    if (warn && !d.urgent) lines.push(warn);
    if (opts.concept && d.concept) lines.push(d.concept);
    return lines.join('\n');
  }
  const headline = (E, s, idx, color, viewer) => { const d = describeMove(E, s, idx, color, viewer); return firstSentence(d.points[0] || d.title); };

  /* The longer answer to "why?": every reason, the idea, what may happen next, and other options. */
  function deepDive(E, s, idx, color, viewer) {
    viewer = viewer || color;
    const d = describeMove(E, s, idx, color, viewer);
    if (!d.ok) return d.points[0];
    const n = s.n, o = 3 - color, r = E.tryPlay(E.geom(n), s.board, idx, color, s.ko);
    const parts = [`More about ${d.title}:`];
    d.points.slice(0, 4).forEach((p, i) => parts.push(`${i + 1}. ${p}`));
    if (d.warning) parts.push('Watch out: ' + d.warning);
    if (d.concept) parts.push(d.concept);
    const afterState = { n, board: r.board, ko: r.ko, moves: s.moves, turn: o, caps: s.caps, komi: s.komi };
    const reply = E.candidates(afterState, o, 0)[0];
    if (reply) parts.push(`What may happen next: ${col(o)}’s most natural reply is ${name(n, reply.move)}. ${firstSentence(describeMove(E, afterState, reply.move, o, viewer).points[0])}`);
    const alts = E.candidates(s, color, 0).filter(c => c.move !== idx).slice(0, 2);
    if (alts.length) parts.push('Other ideas: ' + alts.map(c => `${name(n, c.move)} (${headline(E, s, c.move, color, viewer).replace(/^It /, 'it ').replace(/\.$/, '')})`).join(', or '));
    return parts.join('\n');
  }

  /* Why the move you chose was weaker than the best one. */
  function compare(E, s, playedIdx, bestIdx, color, viewer) {
    const n = s.n, dp = describeMove(E, s, playedIdx, color, viewer), db = describeMove(E, s, bestIdx, color, viewer);
    const parts = [`${name(n, playedIdx)}: ${firstSentence(dp.points[0] || '')}`];
    if (dp.warning) parts.push(`The problem: ${dp.warning}`);
    parts.push(`${name(n, bestIdx)} was the stronger idea: ${firstSentence(db.points[0] || '')}`);
    return parts.join(' ');
  }

  /* A plain-language description of the whole board. */
  function positionSummary(E, s, human) {
    const n = s.n, b = s.board, me = human, op = 3 - human, mid = (n - 1) / 2;
    const cnt = [0, 0, 0];
    const quad = {};
    for (const v of ['upper', 'lower']) for (const h of ['left', 'right']) quad[`${v} ${h}`] = { 1: 0, 2: 0, open: 0 };
    const stones = [];
    for (let i = 0; i < n * n; i++) if (b[i]) { cnt[b[i]]++; stones.push(i); }
    const qOf = i => { const x = i % n, y = (i / n) | 0; if (x === mid || y === mid) return null; return `${y < mid ? 'upper' : 'lower'} ${x < mid ? 'left' : 'right'}`; };
    for (const i of stones) { const q = qOf(i); if (q) quad[q][b[i]]++; }
    let bPts = cnt[1], wPts = cnt[2];
    for (let i = 0; i < n * n; i++) {
      if (b[i]) continue;
      let db = 99, dw = 99;
      for (const j of stones) { const d = Math.abs(j % n - i % n) + Math.abs(((j / n) | 0) - ((i / n) | 0)); if (b[j] === 1) db = Math.min(db, d); else dw = Math.min(dw, d); }
      if (db < dw) bPts++; else if (dw < db) wPts++;
      if (Math.min(db, dw) >= 3) { const q = qOf(i); if (q) quad[q].open++; }
    }
    const lines = [];
    lines.push(`Stones: you (${col(me)}) ${cnt[me]}, ${col(op)} ${cnt[op]}. Prisoners: you ${s.caps[me]}, ${col(op)} ${s.caps[op]}.`);
    const yours = [], theirs = [], both = [], empty = [];
    for (const q of Object.keys(quad)) {
      const m = quad[q][me], t = quad[q][op];
      (m && t ? both : m ? yours : t ? theirs : empty).push(q);
    }
    const bits = [];
    if (yours.length) bits.push(`you have the ${yours.join(' and ')}`);
    if (theirs.length) bits.push(`${col(op)} has the ${theirs.join(' and ')}`);
    if (both.length) bits.push(`both of you have stones in the ${both.join(' and ')}, so it is contested`);
    if (empty.length) bits.push(`the ${empty.join(' and ')} ${empty.length > 1 ? 'are' : 'is'} still empty`);
    if (bits.length) lines.push('Where things stand: ' + bits.join('; ') + '.');
    const weak = E.allGroups(n, b).filter(x => x.libs.length <= 2).sort((x, y) => x.libs.length - y.libs.length).slice(0, 3);
    if (!weak.length) lines.push('Safety: no group is short of liberties, so nothing is in immediate danger.');
    else lines.push('Safety: ' + weak.map(x => `${x.color === me ? 'your' : col(op) + '’s'} ${groupName(n, x)} has ${x.libs.length === 1 ? 'one liberty (atari!)' : '2 liberties'}`).join('; ') + '.');
    const mine = (me === 1 ? bPts : wPts), theirsPts = (op === 1 ? bPts : wPts) + (op === 2 ? s.komi : 0);
    const myTotal = mine + (me === 2 ? s.komi : 0), diff = myTotal - ((op === 1 ? bPts : wPts) + (op === 2 ? s.komi : 0));
    lines.push(`Rough count (stones plus the empty points each side is closer to): you about ${Math.round(myTotal)}, ${col(op)} about ${Math.round(theirsPts)}${s.komi ? ` (White’s figure includes ${s.komi} komi)` : ''}. ${Math.abs(diff) < 3 ? 'It looks close.' : (diff > 0 ? 'You look ahead' : col(op) + ' looks ahead') + ' by roughly ' + Math.round(Math.abs(diff)) + ' points.'}${stones.length < n ? ' It is early, so treat this as a very rough guide.' : ''}`);
    let best = null;
    for (const q of Object.keys(quad)) if (quad[q].open >= 5 && (!best || quad[q].open > quad[best].open)) best = q;
    if (best) {
      const pick = E.candidates(s, s.turn, 0).find(c => qOf(c.move) === best);
      lines.push(`Biggest open area: the ${best} part of the board. Claiming it is usually the most valuable thing to do${pick ? `, for example with a move at ${name(n, pick.move)}` : ''}.`);
    }
    return lines.join('\n');
  }

  const CHECKLIST = 'Five questions to ask before every move:\n1. Is any group in atari, mine or my opponent’s?\n2. Can I capture something, or must I rescue something?\n3. Are my groups connected, or can the opponent cut between them?\n4. Where is the biggest empty area, and can I claim it?\n5. Will my new stone have enough liberties to be safe?\nAnswer them in that order: danger first, then opportunity, then territory.';

  return { describeMove, render, headline, deepDive, compare, positionSummary, CHECKLIST, IDEAS };
});
