/* Go Coach — why one move beats another, with evidence. Both moves are played out to the end many times and the
   results compared: how many points each is worth, which groups live or die, where on the board the difference is,
   and the opponent's sharpest answer to the weaker move. Local only: random games, no AI service. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoExplain = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const name = (n, i) => LETTERS[i % n] + (n - ((i / n) | 0));
  const col = c => (c === 1 ? 'Black' : 'White');
  const pct = x => Math.round(x * 100);
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const lib = (g, file) => (typeof self !== 'undefined' && self[g]) || require(file);
  const ZONES = ['upper left corner', 'top side', 'upper right corner', 'left side', 'centre', 'right side', 'lower left corner', 'bottom side', 'lower right corner'];

  function zoneOf(n, i) {
    const x = i % n, y = (i / n) | 0, t = n / 3;
    const h = x < t ? 0 : x >= n - t ? 2 : 1, v = y < t ? 0 : y >= n - t ? 2 : 1;
    return v * 3 + h;
  }
  /* The share of the play-outs in which stones of colour c are still c's at the end (0 to 1). */
  const alive = (own, stones, c) => 0.5 + 0.5 * stones.reduce((a, i) => a + (c === 1 ? own[i] : -own[i]), 0) / stones.length;
  const groupName = (n, g) => (g.stones.length > 1 ? `${g.stones.length}-stone group` : 'stone') + ' at ' + name(n, g.stones[0]);

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
    const who = c => (c === viewer ? 'you' : col(c)), whose = c => (c === viewer ? 'your' : col(c) + '’s');
    const lines = [];

    /* 1. Points. */
    const gain = sg * (rA.diff - rB.diff), games = rA.sims + rB.sims;
    if (gain >= 1.5) lines.push(`I played each move out to the end (${games} quick games in all). On average ${A} finishes about ${Math.round(gain)} points better for ${who(color)} than ${B}.`);
    else if (gain > -1.5) lines.push(`I played each move out to the end (${games} quick games in all). In points the two finish within one or two of each other, so the gap is small.`);
    else lines.push(`I played each move out to the end (${games} quick games in all). Here ${B} actually scores about ${Math.round(-gain)} points more on average, so the two are close and the ranking may be chance.`);

    /* 2. Which groups live or die. */
    const fates = [];
    for (const g of E.allGroups(n, s.board)) {
      const a = alive(rA.own, g.stones, g.color), b = alive(rB.own, g.stones, g.color);
      if (Math.abs(a - b) >= 0.25) fates.push({ g, a, b, w: Math.abs(a - b) * Math.sqrt(g.stones.length) });
    }
    fates.sort((x, y) => y.w - x.w);
    for (const { g, a, b } of fates.slice(0, 2)) {
      let t = `${cap(whose(g.color))} ${groupName(n, g)} survives in ${pct(a)}% of the games after ${A}, but in ${pct(b)}% after ${B}.`;
      if (g.color === color && a >= 0.6 && b <= 0.4) t += ` ${A} keeps it alive; ${B} lets it die.`;
      else if (g.color === o && a <= 0.4 && b >= 0.6) t += ` ${A} kills it; after ${B} it gets away.`;
      lines.push(t);
    }
    const newB = alive(rB.own, [worse], color);
    if (newB <= 0.35 && alive(rA.own, [better], color) > newB + 0.2) lines.push(`The stone at ${B} itself is lost in ${pct(1 - newB)}% of the games: it does not have enough room or support to survive.`);

    /* 3. Where on the board the points change hands. */
    const z = new Float32Array(9);
    for (let i = 0; i < n * n; i++) z[zoneOf(n, i)] += sg * (rA.own[i] - rB.own[i]);
    let k = 0;
    for (let q = 1; q < 9; q++) if (z[q] > z[k]) k = q;
    if (z[k] >= 2) lines.push(`Most of the difference is in the ${ZONES[k]}: about ${Math.round(z[k])} points more end up ${who(color) === 'you' ? 'yours' : col(color) + '’s'} after ${A}.`);

    /* 4. The opponent's sharpest answer to the weaker move. */
    const reply = E.candidates(sB, o, 0)[0];
    if (reply) {
      const d = CM.describeMove(E, sB, reply.move, o, viewer);
      if (d.ok && d.concept === CM.IDEAS.rescue) lines.push(`After ${B}, ${col(o)} can answer at ${name(n, reply.move)} and rescue the stones that were in atari.`);
      else if (d.ok && [CM.IDEAS.capture, CM.IDEAS.atari, CM.IDEAS.cut].includes(d.concept)) {
        lines.push(`After ${B}, ${col(o)} can answer at ${name(n, reply.move)}: ${d.points[0].split(/(?<=\.)\s/)[0].replace(/^It /, 'it ')}`);
      }
    }
    return lines.join('\n');
  }

  return { contrast };
});
