/* Go Coach — the coach's search on every core of the device.
   The same tree search as the Hard computer (search.js) runs in several Web Workers at once, plus the page itself, each from the
   same position with its own random games; their results for each first move are added together ("root parallel" search).
   With four cores the coach reads about four times as many games in the same time as a single search, on top of its longer
   thinking time, so it is much stronger than the computer, which uses one core (Boon, 27 Nov 2026).
   This one file is both the page's helper (GoParallel.search) and the worker's script. Local only: no network. */
(function () {
  'use strict';
  /* ---------- inside a worker ---------- */
  if (typeof document === 'undefined' && typeof importScripts === 'function') {
    importScripts('search.js');
    self.onmessage = async e => {
      const { id, s, color, opts } = e.data;
      const r = await self.GoSearch.search(s, color, opts);
      self.postMessage({ id, r });
    };
    return;
  }

  /* ---------- on the page ---------- */
  const cores = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1)); /* leave one core for the page */
  let pool = null, seq = 0;
  const waiting = new Map();
  function workers() {
    if (pool) return pool;
    pool = [];
    try {
      for (let k = 0; k < cores; k++) {
        const w = new Worker('parallel.js');
        w.onmessage = e => { const f = waiting.get(e.data.id); if (f) f(e.data.r); };
        w.onerror = () => { pool = []; }; /* workers not allowed here: the page searches alone */
        pool.push(w);
      }
    } catch (err) { pool = []; }
    return pool;
  }
  /* One search in one worker; resolves to its result, or null if the worker failed. */
  function inWorker(w, s, color, opts) {
    const id = ++seq;
    return new Promise(res => {
      const timer = setTimeout(() => { waiting.delete(id); res(null); }, opts.ms + 15000);
      waiting.set(id, r => { clearTimeout(timer); waiting.delete(id); res(r); });
      w.postMessage({ id, s, color, opts });
    });
  }

  /* Same answer shape as GoSearch.search: { move, winrate, moves: [{ move, winrate, visits }], sims }, or null if cancelled. */
  async function search(s, color, opts) {
    opts = opts || {};
    const plain = { n: s.n, board: Array.from(s.board), ko: s.ko, last: s.last, komi: s.komi };
    const wOpts = { ms: opts.ms || 1500, oppPassed: !!opts.oppPassed };
    const jobs = workers().map(w => inWorker(w, plain, color, wOpts));
    jobs.push(window.GoSearch.search(s, color, opts)); /* the page searches too, and can be cancelled */
    const results = (await Promise.all(jobs)).filter(Boolean);
    if (opts.cancelled && opts.cancelled()) return null;
    if (!results.length) return null;
    const by = new Map();
    let sims = 0;
    for (const r of results) {
      sims += r.sims;
      for (const m of r.moves) {
        const t = by.get(m.move) || { move: m.move, visits: 0, wins: 0 };
        t.visits += m.visits; t.wins += m.winrate * m.visits;
        by.set(m.move, t);
      }
    }
    const moves = [...by.values()].map(t => ({ move: t.move, winrate: t.wins / t.visits, visits: t.visits })).sort((a, b) => b.visits - a.visits);
    const best = moves[0] || { move: -1, winrate: 0.5 };
    return { move: best.move, winrate: best.winrate, moves, sims, cores: results.length };
  }

  window.GoParallel = { search, cores };
})();
