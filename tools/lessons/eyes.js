/* Go Coach puzzle tools: a small life-and-death reader for "make two eyes" and "take away an eye" puzzles (developer tool,
   never loaded by the app; run with node). The owner's group surrounds a small eye space (a few points); both sides play only
   inside it, or pass. The group lives when it has two separate eyes: two groups of empty points, each touched only by the
   owner's stones. Every reply is read out, so a puzzle's answer is proved, not guessed. Keep eye spaces small (up to 5 points). */
const E = require('../../engine.js');

function make(n) {
  const g = E.geom(n);
  /* Eyes: separate groups of empty points in the eye space whose every neighbour is the owner's stone. */
  function eyes(b, owner, region) {
    const seen = new Set();
    let count = 0;
    for (const p of region) {
      if (b[p] || seen.has(p)) continue;
      const comp = [p], touch = new Set();
      seen.add(p);
      for (let k = 0; k < comp.length; k++) for (const j of g.nb[comp[k]]) {
        if (!b[j]) { if (!seen.has(j)) { seen.add(j); comp.push(j); } } else touch.add(b[j]);
      }
      if (touch.size === 1 && touch.has(owner)) count++;
    }
    return count;
  }
  /* With best play by both, does the owner's group live? toMove: 1 Black, 2 White. */
  function lives(b, owner, region, toMove, ko, passes, depth, memo) {
    memo = memo || new Map();
    if (eyes(b, owner, region) >= 2) return true;
    if (passes >= 2 || depth > 16) return false;
    const key = toMove + ':' + ko + ':' + passes + ':' + region.map(p => b[p]).join('');
    if (memo.has(key)) return memo.get(key);
    memo.set(key, toMove !== owner); /* a position met again on the way counts against the side to move */
    const results = [];
    for (const m of region) {
      const r = E.tryPlay(g, b, m, toMove, ko);
      if (r.ok) results.push(lives(r.board, owner, region, 3 - toMove, r.ko, 0, depth + 1, memo));
    }
    results.push(lives(b, owner, region, 3 - toMove, -1, passes + 1, depth + 1, memo));
    const v = toMove === owner ? results.some(x => x) : results.every(x => x);
    memo.set(key, v);
    return v;
  }
  /* The first moves for `player` that reach the goal ('live' for the owner, 'kill' for the other side), and, for every other
     point, the opponent's reply that refutes it. */
  function solve(b, owner, region, player) {
    const goal = player === owner ? true : false;
    const right = [], wrong = [];
    for (const m of region) {
      const r = E.tryPlay(g, b, m, player, -1);
      if (!r.ok) continue;
      if (lives(r.board, owner, region, 3 - player, r.ko, 0, 1) === goal) { right.push(m); continue; }
      let reply = -1;
      for (const x of region) {
        const rr = E.tryPlay(g, r.board, x, 3 - player, r.ko);
        if (rr.ok && lives(rr.board, owner, region, player, rr.ko, 0, 2) !== goal) { reply = x; break; }
      }
      wrong.push({ m, reply });
    }
    return { right, wrong };
  }
  return { g, eyes, lives, solve };
}

module.exports = { make };
