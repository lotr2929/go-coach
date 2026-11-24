/* Go Coach — plain-language commentary. Explains what a move does on the actual board, why it matters and what may happen next. No AI service.
   The sentences are put together from the pieces in docs/text/en/commentary.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoCommentary = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const T = (k, v) => TX.T('commentary.' + k, v);

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const name = (n, i) => LETTERS[i % n] + (n - ((i / n) | 0));
  const col = c => T(c === 1 ? 'black' : 'white');
  const colS = c => T(c === 1 ? 'blacks' : 'whites');
  const cap = w => w[0].toUpperCase() + w.slice(1);
  const stones = k => (k === 1 ? T('stone-one') : T('stones', { count: k }));
  const and = list => list.join(` ${T('and')} `);
  const firstSentence = p => p.split(/(?<=\.)\s/)[0];

  /* The idea behind each kind of move, in a sentence a beginner can keep. */
  const IDEAS = {};
  for (const k of ['capture', 'rescue', 'atari', 'connect', 'cut', 'territory', 'approach', 'build', 'boundary', 'line']) IDEAS[k] = T('idea.' + k);

  /* zone: corner, side or centre; key: the name of the area in commentary.md (region.…). */
  function region(n, i) {
    const x = i % n, y = (i / n) | 0, mid = (n - 1) / 2;
    const dx = Math.min(x, n - 1 - x), dy = Math.min(y, n - 1 - y);
    const horiz = x < mid ? 'left' : x > mid ? 'right' : 'middle';
    const vert = y < mid ? 'upper' : y > mid ? 'lower' : 'middle';
    const reach = n >= 13 ? 5 : 3;
    let zone, key;
    if (dx <= reach && dy <= reach && horiz !== 'middle' && vert !== 'middle') { zone = 'corner'; key = `${vert}-${horiz}-corner`; }
    else if (dy <= 2 && dy <= dx) { zone = 'side'; key = (vert === 'upper' ? 'top' : 'bottom') + '-side'; }
    else if (dx <= 2) { zone = 'side'; key = horiz + '-side'; }
    else { zone = 'centre'; key = 'centre'; }
    return { zone, label: T('region.' + key) };
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
  const groupName = (n, grp) => (grp.stones.length > 1 ? T('group-at', { count: grp.stones.length, point: name(n, grp.stones[0]) }) : T('stone-at', { point: name(n, grp.stones[0]) }));

  /* What does a move at idx do for `color`? Returns { ok, idx, title, points, warning, concept }. */
  function describeMove(E, s, idx, color, viewer) {
    viewer = viewer || color;
    const n = s.n, g = E.geom(n), nm = name(n, idx), o = 3 - color;
    /* mine/theirs: "your" or "Black’s"; who/them: "you" or "Black". */
    const mine = color === viewer ? T('your') : colS(color), who = color === viewer ? T('you') : col(color);
    const theirs = o === viewer ? T('your') : colS(o), them = o === viewer ? T('you') : col(o);
    const r = E.tryPlay(g, s.board, idx, color, s.ko);
    if (!r.ok) return { ok: false, idx, title: nm, points: [T('not-legal', { point: nm })], warning: null, concept: null };
    const after = r.board, own = E.flood(g, after, idx), bullets = [];
    let warning = null;
    const reg = region(n, idx), edge = edgeOf(n, idx);

    if (r.captured.length) bullets.push({ w: 100, c: 'capture', t: T('capture', { stones: stones(r.captured.length), them, who }) });

    const seen = new Set();
    for (const j of g.nb[idx]) {
      if (s.board[j] !== color || seen.has(j)) continue;
      const grp = E.flood(g, s.board, j);
      grp.stones.forEach(x => seen.add(x));
      if (grp.libs.length === 1 && own.libs.length >= 2) bullets.push({ w: 95, c: 'rescue', t: T('rescue', { Mine: cap(mine), group: groupName(n, grp), them, libs: own.libs.length }) });
    }

    const seenE = new Set();
    for (const j of g.nb[idx]) {
      if (after[j] !== o || seenE.has(j)) continue;
      const a = E.flood(g, after, j);
      a.stones.forEach(x => seenE.add(x));
      if (a.libs.length === 1) {
        const lib = a.libs[0], esc = E.tryPlay(g, after, lib, o, r.ko);
        const libsAfter = esc.ok ? E.flood(g, esc.board, lib).libs.length : 0;
        const how = libsAfter >= 3 ? T('atari-run', { them, point: name(n, lib) }) : libsAfter === 2 ? T('atari-try', { them, point: name(n, lib) }) : T('atari-trapped', { them, who });
        bullets.push({ w: 85, c: 'atari', t: T('atari', { theirs, group: groupName(n, a), point: name(n, lib), how }) });
      } else if (a.libs.length === 2) bullets.push({ w: 40, c: 'atari', t: T('two-libs', { Theirs: cap(theirs), group: groupName(n, a) }) });
    }

    let urgent = false;
    if (own.libs.length === 1 && !r.captured.length) { warning = T('warn-self-atari', { mine, them, point: name(n, own.libs[0]) }); urgent = true; }

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
    if (ownNames.length >= 2) bullets.push({ w: 70, c: 'connect', t: T('connect', { mine, list: and(ownNames) }) });
    if (oppNames.length >= 2) bullets.push({ w: 70, c: 'cut', t: T('cut', { theirs, list: and(oppNames) }) });

    const tactical = bullets.some(b => b.w >= 70);
    const near = stonesNear(s, idx, 4);
    const ownNear = near.filter(x => x.color === color), oppNear = near.filter(x => x.color === o);
    if (!tactical) {
      if (!near.length) {
        if (edge <= 1) bullets.push({ w: 20, c: 'territory', t: T('territory-edge', { where: reg.zone === 'centre' ? T('area') : reg.label }) });
        else if (reg.zone === 'corner') bullets.push({ w: 60, c: 'territory', t: T('territory-corner', { where: reg.label }) });
        else if (reg.zone === 'side') bullets.push({ w: 55, c: 'territory', t: T('territory-side', { where: reg.label }) });
        else bullets.push({ w: 55, c: 'territory', t: T('territory-centre') });
      } else if (oppNear.length && !ownNear.length) bullets.push({ w: 55, c: 'approach', t: T('approach', { theirs, point: name(n, oppNear[0].idx), them }) });
      else if (ownNear.length && !oppNear.length) bullets.push({ w: 45, c: 'build', t: T('build', { mine, point: name(n, ownNear[0].idx) }) });
      else bullets.push({ w: 50, c: 'boundary', t: T('boundary', { mine, point: name(n, ownNear[0].idx), theirs, other: name(n, oppNear[0].idx) }) });

      const early = s.board.reduce((k, v) => k + (v ? 1 : 0), 0) < n * n * 0.25;
      if (edge === 0) { if (early) warning = warning || T('warn-first-line'); else bullets.push({ w: 30, c: 'line', t: T('first-line') }); }
      else if (edge === 1) bullets.push({ w: 28, c: 'line', t: T('second-line') });
      else if (edge === 2) bullets.push({ w: 32, c: 'line', t: T('third-line') });
      else if (edge === 3) bullets.push({ w: 30, c: 'line', t: T('fourth-line') });
    }

    if (!warning && own.libs.length === 2 && stonesNear(s, idx, 2).some(x => x.color === o)) warning = T('warn-two-libs', { mine, group: groupName(n, own), them });

    bullets.sort((a, b) => b.w - a.w);
    const top = bullets[0];
    const title = reg.zone === 'centre' ? nm : T('title', { point: nm, where: reg.label });
    return { ok: true, idx, color, title, points: bullets.map(b => b.t), warning, urgent, concept: top ? IDEAS[top.c] : null };
  }

  /* Text for the chat. opts: { head, bullets, concept } */
  function render(d, opts) {
    opts = opts || {};
    const lines = [opts.head || d.title + '.'];
    const warn = d.warning ? T('careful', { warning: d.warning }) : '';
    if (warn && d.urgent) lines.push(warn);
    d.points.slice(0, opts.bullets || 2).forEach(p => lines.push(T('bullet', { text: p })));
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
    const parts = [T('more-about', { title: d.title })];
    d.points.slice(0, 4).forEach((p, i) => parts.push(`${i + 1}. ${p}`));
    if (d.warning) parts.push(T('watch-out', { warning: d.warning }));
    if (d.concept) parts.push(d.concept);
    const afterState = { n, board: r.board, ko: r.ko, moves: s.moves, turn: o, caps: s.caps, komi: s.komi };
    const reply = E.candidates(afterState, o, 0)[0];
    if (reply) parts.push(T('next-reply', { player: colS(o), point: name(n, reply.move), what: firstSentence(describeMove(E, afterState, reply.move, o, viewer).points[0]) }));
    const alts = E.candidates(s, color, 0).filter(c => c.move !== idx).slice(0, 2);
    if (alts.length) parts.push(T('other-ideas', { list: alts.map(c => T('other-idea', { point: name(n, c.move), what: headline(E, s, c.move, color, viewer).replace(/^It /, 'it ').replace(/\.$/, '') })).join(`, ${T('or')} `) }));
    return parts.join('\n');
  }

  /* Why the move you chose was weaker than the best one. */
  function compare(E, s, playedIdx, bestIdx, color, viewer) {
    const n = s.n, dp = describeMove(E, s, playedIdx, color, viewer), db = describeMove(E, s, bestIdx, color, viewer);
    const parts = [T('compare-played', { point: name(n, playedIdx), what: firstSentence(dp.points[0] || '') })];
    if (dp.warning) parts.push(T('compare-problem', { warning: dp.warning }));
    parts.push(T('compare-best', { point: name(n, bestIdx), what: firstSentence(db.points[0] || '') }));
    return parts.join(' ');
  }

  /* A plain-language description of the whole board. Quarters are named upper-left and so on (quarter.… in commentary.md). */
  function positionSummary(E, s, human) {
    const n = s.n, b = s.board, me = human, op = 3 - human, mid = (n - 1) / 2;
    const cnt = [0, 0, 0];
    const quad = {};
    for (const v of ['upper', 'lower']) for (const h of ['left', 'right']) quad[`${v}-${h}`] = { 1: 0, 2: 0, open: 0 };
    const quarters = list => and(list.map(q => T('quarter.' + q)));
    const stonesAt = [];
    for (let i = 0; i < n * n; i++) if (b[i]) { cnt[b[i]]++; stonesAt.push(i); }
    const qOf = i => { const x = i % n, y = (i / n) | 0; if (x === mid || y === mid) return null; return `${y < mid ? 'upper' : 'lower'}-${x < mid ? 'left' : 'right'}`; };
    for (const i of stonesAt) { const q = qOf(i); if (q) quad[q][b[i]]++; }
    let bPts = cnt[1], wPts = cnt[2];
    for (let i = 0; i < n * n; i++) {
      if (b[i]) continue;
      let db = 99, dw = 99;
      for (const j of stonesAt) { const d = Math.abs(j % n - i % n) + Math.abs(((j / n) | 0) - ((i / n) | 0)); if (b[j] === 1) db = Math.min(db, d); else dw = Math.min(dw, d); }
      if (db < dw) bPts++; else if (dw < db) wPts++;
      if (Math.min(db, dw) >= 3) { const q = qOf(i); if (q) quad[q].open++; }
    }
    const lines = [], other = col(op);
    lines.push(T('summary-stones', { colour: col(me), mine: cnt[me], other, theirs: cnt[op], mycaps: s.caps[me], theircaps: s.caps[op] }));
    const yours = [], theirs = [], both = [], empty = [];
    for (const q of Object.keys(quad)) {
      const m = quad[q][me], t = quad[q][op];
      (m && t ? both : m ? yours : t ? theirs : empty).push(q);
    }
    const bits = [];
    if (yours.length) bits.push(T('summary-yours', { list: quarters(yours) }));
    if (theirs.length) bits.push(T('summary-theirs', { other, list: quarters(theirs) }));
    if (both.length) bits.push(T('summary-both', { list: quarters(both) }));
    if (empty.length) bits.push(T(empty.length > 1 ? 'summary-empty-many' : 'summary-empty-one', { list: quarters(empty) }));
    if (bits.length) lines.push(T('summary-where', { list: bits.join('; ') }));
    const weak = E.allGroups(n, b).filter(x => x.libs.length <= 2).sort((x, y) => x.libs.length - y.libs.length).slice(0, 3);
    if (!weak.length) lines.push(T('summary-safe'));
    else lines.push(T('summary-safety', { list: weak.map(x => T('summary-weak', { whose: x.color === me ? T('your') : colS(op), group: groupName(n, x), libs: T(x.libs.length === 1 ? 'summary-one-lib' : 'summary-two-libs') })).join('; ') }));
    const mine = (me === 1 ? bPts : wPts), theirsPts = (op === 1 ? bPts : wPts) + (op === 2 ? s.komi : 0);
    const myTotal = mine + (me === 2 ? s.komi : 0), diff = myTotal - ((op === 1 ? bPts : wPts) + (op === 2 ? s.komi : 0));
    const count = [T(s.komi ? 'summary-count-komi' : 'summary-count', { mine: Math.round(myTotal), other, theirs: Math.round(theirsPts), komi: s.komi })];
    count.push(Math.abs(diff) < 3 ? T('summary-close') : T(diff > 0 ? 'summary-you-ahead' : 'summary-they-ahead', { other, diff: Math.round(Math.abs(diff)) }));
    if (stonesAt.length < n) count.push(T('summary-early'));
    lines.push(count.join(' '));
    let best = null;
    for (const q of Object.keys(quad)) if (quad[q].open >= 5 && (!best || quad[q].open > quad[best].open)) best = q;
    if (best) {
      const pick = E.candidates(s, s.turn, 0).find(c => qOf(c.move) === best);
      lines.push(pick ? T('summary-open-move', { where: T('quarter.' + best), point: name(n, pick.move) }) : T('summary-open', { where: T('quarter.' + best) }));
    }
    return lines.join('\n');
  }

  const CHECKLIST = T('checklist');

  return { describeMove, render, headline, deepDive, compare, positionSummary, CHECKLIST, IDEAS };
});
