/* Go Coach - when the computer resigns or passes first (Boon, 27 Nov 2026). Before, it never resigned and passed only after
   the player had passed, so lost games dragged on. The position is judged by many quick random playouts from it, as the
   dead-stone count does (engine.js runPlayout), so this works the same at every level.
   - Resign: after half the board's worth of moves, when the computer wins almost none of the playouts and is clearly behind
     on points, three of its turns in a row.
   - Pass first: when nothing on the board is in atari and every empty area touches stones of one colour only: no neutral
     points are left to fill and no border is open, so under area counting no move can change the score. Passing never
     improves a position: it only says there is nothing left worth playing, whoever is ahead. (Random playouts were too
     noisy to judge this, so it is an exact rule; with dead stones still on the board the computer waits for the player.)
   Local only: no network. No DOM here; play.js calls decide(). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoEndgame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SIMS = n => (n <= 9 ? 300 : n <= 13 ? 160 : 80);

  /* Playouts from `board` with `toMove` to play: how often `color` wins, and its average lead in points (komi counted). */
  function sample(E, s, color, board, toMove, ko, last) {
    const n = s.n, g = E.geom(n), sims = SIMS(n);
    let wins = 0, lead = 0;
    for (let k = 0; k < sims; k++) {
      const sc = E.scoreArea(n, E.runPlayout(g, board, toMove, ko, last, n * n * 2));
      const black = sc.black - sc.white - s.komi;
      const mine = color === 1 ? black : -black;
      lead += mine; if (mine > 0) wins++;
    }
    return { win: wins / sims, lead: lead / sims };
  }
  /* Is any group of either colour in atari? Then fights are not over, and passing would be a blunder. */
  function anyAtari(E, s) {
    const g = E.geom(s.n), seen = new Set();
    for (let i = 0; i < s.n * s.n; i++) if (s.board[i] && !seen.has(i)) {
      const gr = E.flood(g, s.board, i); gr.stones.forEach(x => seen.add(x));
      if (gr.libs.length === 1) return true;
    }
    return false;
  }

  /* Every empty area touches one colour only: nothing is left to fill. */
  function settled(E, s) {
    const g = E.geom(s.n), seen = new Set();
    for (let i = 0; i < s.n * s.n; i++) if (!s.board[i] && !seen.has(i)) {
      const area = [i], touch = new Set();
      seen.add(i);
      for (let k = 0; k < area.length; k++) for (const j of g.nb[area[k]]) {
        if (s.board[j]) touch.add(s.board[j]); else if (!seen.has(j)) { seen.add(j); area.push(j); }
      }
      if (touch.size !== 1) return false;
    }
    return true;
  }
  /* After the computer has chosen `move` (-1 is a pass): 'resign', 'pass', or null to play it. `mem` keeps a count between turns. */
  function decide(E, s, color, move, mem) {
    const N = s.n * s.n;
    if (s.moves.length < N * 0.5) { mem.low = 0; return null; }
    const now = sample(E, s, color, s.board, color, s.ko, s.last);
    const clear = s.n <= 9 ? 8 : s.n <= 13 ? 12 : 20; /* points behind that count as clearly lost */
    mem.low = now.win < 0.03 && now.lead < -clear ? (mem.low || 0) + 1 : 0;
    if (mem.low >= 3) return 'resign';
    return move >= 0 && !anyAtari(E, s) && settled(E, s) ? 'pass' : null;
  }

  return { decide, sample, settled };
});
