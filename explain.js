/* Go Coach — why one move beats another, with evidence. Both moves are played out to the end many times and the
   results compared: how many points each is worth, which groups live or die, where on the board the difference is,
   and the opponent's sharpest answer to the weaker move. Local only: random games, no AI service. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoExplain = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  /* The wording is in docs/text/en/explain.md; words such as "you", "Black’s" and the board areas come from commentary.md. */
  const T = (k, v) => TX.T('explain.' + k, v), W = k => TX.T('commentary.' + k);

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const name = (n, i) => LETTERS[i % n] + (n - ((i / n) | 0));
  const col = c => W(c === 1 ? 'black' : 'white'), colS = c => W(c === 1 ? 'blacks' : 'whites');
  const pct = x => Math.round(x * 100);
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const lib = (g, file) => (typeof self !== 'undefined' && self[g]) || require(file);
  const ZONES = ['upper-left-corner', 'top-side', 'upper-right-corner', 'left-side', 'centre', 'right-side', 'lower-left-corner', 'bottom-side', 'lower-right-corner'].map(k => W('region.' + k));

  function zoneOf(n, i) {
    const x = i % n, y = (i / n) | 0, t = n / 3;
    const h = x < t ? 0 : x >= n - t ? 2 : 1, v = y < t ? 0 : y >= n - t ? 2 : 1;
    return v * 3 + h;
  }
  /* The share of the play-outs in which stones of colour c are still c's at the end (0 to 1). */
  const alive = (own, stones, c) => 0.5 + 0.5 * stones.reduce((a, i) => a + (c === 1 ? own[i] : -own[i]), 0) / stones.length;
  const groupName = (n, g) => (g.stones.length > 1 ? TX.T('commentary.group-at', { count: g.stones.length, point: name(n, g.stones[0]) }) : TX.T('commentary.stone-at', { point: name(n, g.stones[0]) }));

  /* Why `better` is a stronger move than `worse` for `color`. Written for `viewer` ("you" / "your").
     Returns the explanation as lines of text, or null if cancelled or either move is illegal. opts: { ms, cancelled }. */
  async function contrast(E, s, better, worse, color, viewer, opts) {
    opts = opts || {};
    viewer = viewer || color;
    const S = lib('GoSearch', './search.js'), CM = lib('GoCommentary', './commentary.js');
    const n = s.n, o = 3 - color, sg = color === 1 ? 1 : -1;
    const after = m => { const t = E.clone(s); return E.play(t, m).ok ? t : null; };
    const sA = after(better), sB = after(worse);
    if (!sA || !sB) return null;
    const ms = opts.ms || (n <= 9 ? 700 : n <= 13 ? 1000 : 1400);
    const rA = await S.ownership(sA, { ms, cancelled: opts.cancelled });
    if (!rA) return null;
    const rB = await S.ownership(sB, { ms, cancelled: opts.cancelled });
    if (!rB) return null;
    const A = name(n, better), B = name(n, worse);
    const who = c => (c === viewer ? W('you') : col(c)), whose = c => (c === viewer ? W('your') : colS(c));
    const lines = [], facts = {};

    /* 1. Points. */
    const gain = sg * (rA.diff - rB.diff), games = rA.sims + rB.sims;
    if (gain >= 1.5) lines.push(T('points-better', { games, a: A, b: B, points: Math.round(gain), who: who(color) }));
    else if (gain > -1.5) lines.push(T('points-close', { games }));
    else lines.push(T('points-worse', { games, b: B, points: Math.round(-gain) }));

    /* 2. Which groups live or die. */
    const fates = [];
    for (const g of E.allGroups(n, s.board)) {
      const a = alive(rA.own, g.stones, g.color), b = alive(rB.own, g.stones, g.color);
      if (Math.abs(a - b) >= 0.25) fates.push({ g, a, b, w: Math.abs(a - b) * Math.sqrt(g.stones.length) });
    }
    fates.sort((x, y) => y.w - x.w);
    for (const { g, a, b } of fates.slice(0, 2)) {
      let t = T('survives', { Whose: cap(whose(g.color)), group: groupName(n, g), pa: pct(a), pb: pct(b), a: A, b: B });
      if (g.color === color && a >= 0.6 && b <= 0.4) t += ' ' + T('keeps-alive', { a: A, b: B });
      else if (g.color === o && a <= 0.4 && b >= 0.6) t += ' ' + T('kills', { a: A, b: B });
      if (g.color === color && a >= 0.5 && a - b >= 0.25) facts.rescue = true; /* for the saying (section 5) */
      if (g.color === o && a <= 0.4 && b - a >= 0.25) facts.kill = true;
      lines.push(t);
    }
    const newB = alive(rB.own, [worse], color);
    facts.sacrifice = alive(rA.own, [better], color) <= 0.35;
    if (newB <= 0.35 && alive(rA.own, [better], color) > newB + 0.2) facts.lost = true;
    if (facts.lost) lines.push(T('lost', { b: B, pct: pct(1 - newB) }));

    /* 3. Where on the board the points change hands. */
    const z = new Float32Array(9);
    for (let i = 0; i < n * n; i++) z[zoneOf(n, i)] += sg * (rA.own[i] - rB.own[i]);
    let k = 0;
    for (let q = 1; q < 9; q++) if (z[q] > z[k]) k = q;
    if (z[k] >= 2) lines.push(T('where', { zone: ZONES[k], points: Math.round(z[k]), whose: color === viewer ? T('yours') : colS(color), a: A }));

    /* 4. The opponent's sharpest answer to the weaker move. */
    const reply = E.candidates(sB, o, 0)[0];
    if (reply) {
      const d = CM.describeMove(E, sB, reply.move, o, viewer);
      if (d.ok && d.concept === CM.IDEAS.rescue) { lines.push(T('reply-rescue', { b: B, player: col(o), point: name(n, reply.move) })); facts.kill = true; }
      else if (d.ok && [CM.IDEAS.capture, CM.IDEAS.atari, CM.IDEAS.cut].includes(d.concept)) {
        lines.push(T('reply', { b: B, player: col(o), point: name(n, reply.move), what: d.points[0].split(/(?<=\.)\s/)[0].replace(/^It /, 'it ') }));
        if (d.concept === CM.IDEAS.cut) facts.punished = true; else facts.rescue = true; /* a capture or atari against our stones */
      }
    }

    /* 5. One Go principle or proverb that sums up the evidence above, tied back to these two moves. */
    facts.gain = gain;
    facts.attackB = E.geom(n).nb[worse].some(j => s.board[j] === o);
    const saying = lib('GoProverbs', './proverbs.js').line(lib('GoProverbs', './proverbs.js').pick(facts), A, B);
    if (saying) lines.push(saying);
    return lines.join('\n');
  }

  return { contrast };
});
