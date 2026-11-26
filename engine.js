/* Go Coach — rules, scoring and computer opponent. No dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoEngine = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) { /* TX: the wording, docs/text/en/engine.md */
  'use strict';

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const tick = () => new Promise(r => setTimeout(r, 0));

  /* ---------- geometry ---------- */
  const geoms = {};
  function geom(n) {
    if (geoms[n]) return geoms[n];
    const nb = [], diag = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const a = [], d = [];
      if (x > 0) a.push(y * n + x - 1);
      if (x < n - 1) a.push(y * n + x + 1);
      if (y > 0) a.push((y - 1) * n + x);
      if (y < n - 1) a.push((y + 1) * n + x);
      if (x > 0 && y > 0) d.push((y - 1) * n + x - 1);
      if (x < n - 1 && y > 0) d.push((y - 1) * n + x + 1);
      if (x > 0 && y < n - 1) d.push((y + 1) * n + x - 1);
      if (x < n - 1 && y < n - 1) d.push((y + 1) * n + x + 1);
      nb.push(a); diag.push(d);
    }
    return (geoms[n] = { n, nb, diag });
  }

  const scratch = {};
  function flood(g, board, i) {
    const sc = scratch[g.n] || (scratch[g.n] = { m: new Int32Array(g.n * g.n), l: new Int32Array(g.n * g.n), s: 0 });
    const stamp = ++sc.s, c = board[i];
    const stones = [i], libs = [];
    sc.m[i] = stamp;
    for (let k = 0; k < stones.length; k++) {
      const nbs = g.nb[stones[k]];
      for (let q = 0; q < nbs.length; q++) {
        const j = nbs[q], v = board[j];
        if (v === 0) { if (sc.l[j] !== stamp) { sc.l[j] = stamp; libs.push(j); } }
        else if (v === c && sc.m[j] !== stamp) { sc.m[j] = stamp; stones.push(j); }
      }
    }
    return { color: c, stones, libs };
  }

  function allGroups(n, board) {
    const g = geom(n), seen = new Uint8Array(n * n), out = [];
    for (let i = 0; i < n * n; i++) {
      if (board[i] && !seen[i]) {
        const gr = flood(g, board, i);
        for (const s of gr.stones) seen[s] = 1;
        out.push(gr);
      }
    }
    return out;
  }

  /* ---------- rules ---------- */
  function tryPlay(g, board, i, color, ko) {
    if (i < 0 || i >= g.n * g.n) return { ok: false, reason: 'off' };
    if (board[i] !== 0) return { ok: false, reason: 'occupied' };
    if (i === ko) return { ok: false, reason: 'ko' };
    const b = board.slice();
    b[i] = color;
    const o = 3 - color, captured = [];
    for (const j of g.nb[i]) {
      if (b[j] === o) {
        const gr = flood(g, b, j);
        if (gr.libs.length === 0) for (const s of gr.stones) { b[s] = 0; captured.push(s); }
      }
    }
    const mine = flood(g, b, i);
    if (mine.libs.length === 0) return { ok: false, reason: 'suicide' };
    let newKo = -1;
    if (captured.length === 1 && mine.stones.length === 1 && mine.libs.length === 1) newKo = captured[0];
    return { ok: true, board: b, captured, ko: newKo };
  }

  function isOwnEye(g, b, i, c) {
    for (const j of g.nb[i]) if (b[j] !== c) return false;
    const d = g.diag[i];
    let bad = 0;
    for (const j of d) if (b[j] !== c) bad++;
    return d.length === 4 ? bad <= 1 : bad === 0;
  }

  /* ---------- game state ---------- */
  function stars(n) {
    if (n < 9) return [];
    const lo = n >= 13 ? 3 : 2, hi = n - 1 - lo, mid = (n - 1) / 2;
    if (n === 9) return [[lo, lo], [hi, lo], [lo, hi], [hi, hi], [mid, mid]];
    return [lo, mid, hi].flatMap(x => [lo, mid, hi].map(y => [x, y]));
  }
  function handicapPoints(n, h) {
    const lo = n >= 13 ? 3 : 2, hi = n - 1 - lo, mid = (n - 1) / 2;
    const P = (x, y) => y * n + x;
    return [P(hi, lo), P(lo, hi), P(hi, hi), P(lo, lo), P(mid, mid)].slice(0, Math.min(h, 5));
  }
  function newState(n, handicap) {
    const s = {
      n, board: new Int8Array(n * n), turn: 1, ko: -1, caps: [0, 0, 0], last: -1, passes: 0,
      moves: [], hist: [], komi: handicap ? 0.5 : (n >= 19 ? 7.5 : 6.5), handicap: handicap || 0
    };
    if (handicap) { for (const p of handicapPoints(n, handicap)) s.board[p] = 1; s.turn = 2; }
    return s;
  }
  function snap(s) {
    return { board: s.board.slice(), turn: s.turn, ko: s.ko, caps: s.caps.slice(), last: s.last, passes: s.passes, nmoves: s.moves.length };
  }
  function play(s, i) {
    const r = tryPlay(geom(s.n), s.board, i, s.turn, s.ko);
    if (!r.ok) return r;
    s.hist.push(snap(s));
    const c = s.turn;
    s.board = r.board; s.caps[c] += r.captured.length; s.ko = r.ko; s.last = i; s.passes = 0; s.turn = 3 - c;
    s.moves.push({ c, i, cap: r.captured.length });
    return { ok: true, captured: r.captured };
  }
  function pass(s) {
    s.hist.push(snap(s));
    const c = s.turn;
    s.moves.push({ c, i: -1, cap: 0 });
    s.passes++; s.ko = -1; s.last = -1; s.turn = 3 - c;
    return { ok: true, ended: s.passes >= 2 };
  }
  function undo(s) {
    const h = s.hist.pop();
    if (!h) return false;
    s.board = h.board; s.turn = h.turn; s.ko = h.ko; s.caps = h.caps; s.last = h.last; s.passes = h.passes; s.moves.length = h.nmoves;
    return true;
  }
  function coord(n, i) { return LETTERS[i % n] + (n - ((i / n) | 0)); }

  function serialize(s) {
    const enc = h => ({ board: h.board.join(''), turn: h.turn, ko: h.ko, caps: h.caps, last: h.last, passes: h.passes, nmoves: h.nmoves });
    return JSON.stringify({
      n: s.n, board: s.board.join(''), turn: s.turn, ko: s.ko, caps: s.caps, last: s.last, passes: s.passes,
      moves: s.moves, komi: s.komi, handicap: s.handicap, hist: s.hist.map(enc)
    });
  }
  function deserialize(str) {
    const o = JSON.parse(str);
    const dec = t => Int8Array.from(t, ch => +ch);
    return {
      n: o.n, board: dec(o.board), turn: o.turn, ko: o.ko, caps: o.caps, last: o.last, passes: o.passes,
      moves: o.moves, komi: o.komi, handicap: o.handicap,
      hist: o.hist.map(h => ({ board: dec(h.board), turn: h.turn, ko: h.ko, caps: h.caps, last: h.last, passes: h.passes, nmoves: h.nmoves }))
    };
  }
  function toSGF(s, extra) {
    const L = 'abcdefghijklmnopqrs';
    const pt = i => (i < 0 ? '' : L[i % s.n] + L[(i / s.n) | 0]);
    let out = `(;GM[1]FF[4]CA[UTF-8]AP[GoCoach]SZ[${s.n}]KM[${s.komi}]RU[Chinese]` + (extra || '');
    if (s.handicap) out += `HA[${s.handicap}]AB` + handicapPoints(s.n, s.handicap).map(p => `[${pt(p)}]`).join('');
    for (const m of s.moves) out += `;${m.c === 1 ? 'B' : 'W'}[${pt(m.i)}]`;
    return out + ')';
  }

  /* ---------- scoring (area) ---------- */
  function scoreArea(n, board, dead) {
    const g = geom(n), N = n * n, b = board.slice();
    if (dead) for (const i of dead) b[i] = 0;
    let bs = 0, ws = 0;
    const terr = new Int8Array(N), seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (b[i] === 1) bs++;
      else if (b[i] === 2) ws++;
      else if (!seen[i]) {
        const region = [i]; seen[i] = 1;
        let tb = false, tw = false;
        for (let k = 0; k < region.length; k++) {
          for (const j of g.nb[region[k]]) {
            const v = b[j];
            if (v === 0) { if (!seen[j]) { seen[j] = 1; region.push(j); } }
            else if (v === 1) tb = true; else tw = true;
          }
        }
        if (tb && !tw) { bs += region.length; for (const r of region) terr[r] = 1; }
        else if (tw && !tb) { ws += region.length; for (const r of region) terr[r] = 2; }
      }
    }
    return { black: bs, white: ws, terr, board: b };
  }

  /* ---------- playouts ---------- */
  function pickPlayoutMove(g, b, c, ko, last, empt) {
    const o = 3 - c;
    if (last >= 0) {
      const nbs = g.nb[last];
      for (let q = 0; q < nbs.length; q++) {
        const j = nbs[q], v = b[j];
        if (v === 0) continue;
        const gr = flood(g, b, j);
        if (gr.libs.length === 1) {
          const p = gr.libs[0];
          const r = tryPlay(g, b, p, c, ko);
          if (r.ok) {
            if (v === o) { r.move = p; return r; }
            if (flood(g, r.board, p).libs.length >= 2) { r.move = p; return r; }
          }
        }
      }
    }
    empt.length = 0;
    for (let i = 0; i < b.length; i++) if (b[i] === 0) empt.push(i);
    let len = empt.length;
    while (len > 0) {
      const t = (Math.random() * len) | 0, p = empt[t];
      empt[t] = empt[len - 1]; len--;
      if (isOwnEye(g, b, p, c)) continue;
      const r = tryPlay(g, b, p, c, ko);
      if (r.ok) { r.move = p; return r; }
    }
    return null;
  }
  function runPlayout(g, board, color, ko, last, maxMoves) {
    let b = board, c = color, k = ko, l = last, passes = 0;
    const empt = [];
    for (let m = 0; m < maxMoves && passes < 2; m++) {
      const r = pickPlayoutMove(g, b, c, k, l, empt);
      if (!r) { passes++; k = -1; l = -1; }
      else { passes = 0; b = r.board; k = r.ko; l = r.move; }
      c = 3 - c;
    }
    return b;
  }

  /* ---------- heuristics ---------- */
  function heuristic(g, board, i, color, ko, stones) {
    const n = g.n, o = 3 - color;
    if (isOwnEye(g, board, i, color)) return null;
    const r = tryPlay(g, board, i, color, ko);
    if (!r.ok) return null;
    let s = 0;
    const why = [];
    const x = i % n, y = (i / n) | 0;
    const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
    if (r.captured.length) {
      s += 12 + 3 * r.captured.length;
      why.push(r.captured.length === 1 ? TX.T('engine.captures-one') : TX.T('engine.captures-many', { count: r.captured.length }));
    }
    const mine = flood(g, r.board, i);
    if (mine.libs.length === 1 && !r.captured.length) s -= 16;
    const seen = new Set();
    let atari = 0;
    for (const j of g.nb[i]) {
      const v = board[j];
      if (v === 0 || seen.has(j)) continue;
      const gr = flood(g, board, j);
      for (const st of gr.stones) seen.add(st);
      if (v === o) {
        if (r.board[j] === o) {
          const a = flood(g, r.board, j);
          if (a.libs.length === 1) { atari++; s += 4 + Math.min(a.stones.length, 4); }
          else if (a.libs.length === 2) s += 0.5;
        }
      } else {
        if (gr.libs.length === 1 && mine.libs.length >= 2) {
          s += 10 + gr.stones.length * 2;
          why.push(TX.T('engine.rescues'));
        } else if (gr.libs.length === 2 && mine.libs.length >= 3) s += 1.5;
        s += 0.6;
      }
    }
    if (atari && !r.captured.length) why.push(TX.T('engine.ataris'));
    const opening = stones.length < Math.max(5, n * n * 0.1);
    if (edge === 0) s -= 3;
    else if (edge === 1) s -= 0.3;
    else if (edge === 2 || edge === 3) s += opening ? 3 : 1;
    if (opening) {
      let near = 99;
      for (const st of stones) near = Math.min(near, Math.abs(st % n - x) + Math.abs(((st / n) | 0) - y));
      if (near <= 1) s -= 2; else if (near >= 3) s += 1;
      if (Math.min(x, n - 1 - x) <= 3 && Math.min(y, n - 1 - y) <= 3) s += 1.5;
    } else {
      let cnt = 0;
      for (const st of stones) if (Math.abs(st % n - x) + Math.abs(((st / n) | 0) - y) <= 2) cnt++;
      s += Math.min(cnt, 4) * 0.4;
    }
    return { score: s, why, edge };
  }

  function candidates(s, color, jitter) {
    const g = geom(s.n), N = s.n * s.n, b = s.board, stones = [];
    for (let i = 0; i < N; i++) if (b[i]) stones.push(i);
    const out = [];
    for (let i = 0; i < N; i++) {
      if (b[i]) continue;
      const h = heuristic(g, b, i, color, s.ko, stones);
      if (h && h.score > -8) out.push({ move: i, score: h.score + Math.random() * jitter, why: h.why, edge: h.edge });
    }
    out.sort((a, c) => c.score - a.score);
    return out;
  }

  function describe(c) {
    if (c.why.length) return c.why.join(` ${TX.T('engine.and')} `);
    if (c.edge === 2) return TX.T('engine.third-line');
    if (c.edge === 3) return TX.T('engine.fourth-line');
    return TX.T('engine.sensible');
  }

  /* ---------- levels ---------- */
  /* Weakest first. The computer plays easy, medium or hard. The coach always plays expert, the strongest level, whatever the
     computer's level (Boon, 27 Nov 2026: the coach must be much stronger than the computer; there is no coach setting). */
  const LEVELS = ['easy', 'medium', 'hard', 'expert'];
  const LEVEL_MS = { medium: 1200, hard: 3500, expert: 8000 }; /* thinking time per move for the levels that search */
  const coachLevel = () => 'expert';
  /* How long the coach looks at one position at a given level (larger boards need longer). */
  function analysisMs(level, n) {
    return Math.round((n <= 9 ? 1500 : 2500) * ({ hard: 2, expert: 4 }[level] || 1));
  }

  /* ---------- move choice ---------- */
  async function chooseMove(s, color, opts) {
    opts = opts || {};
    const level = opts.level || 'medium';
    const n = s.n, N = n * n, g = geom(n);
    const last = s.moves[s.moves.length - 1];
    const oppPassed = !!last && last.i === -1;
    if (s.moves.length > N * 3) return { move: -1, note: TX.T('engine.nothing-left') };
    const cands = candidates(s, color, level === 'easy' ? 6 : 0.6);
    if (!cands.length) return { move: -1, note: TX.T('engine.no-moves') };

    if (level === 'easy') {
      if (oppPassed && cands[0].score < 1.5) return { move: -1, note: TX.T('engine.nothing-left') };
      const top = cands.slice(0, 3);
      const pick = top[(Math.random() * top.length) | 0];
      return { move: pick.move, note: describe(pick) };
    }

    const ms = opts.ms || LEVEL_MS[level] || 1200;
    if (level === 'hard' || level === 'expert') { /* tree search in search.js */
      /* The coach (expert) searches on every core of the device (parallel.js); the computer (hard) on one. */
      const S = level === 'expert' && typeof GoParallel !== 'undefined' ? GoParallel : typeof GoSearch !== 'undefined' ? GoSearch : require('./search.js');
      const r = await S.search(s, color, { ms, oppPassed, cancelled: opts.cancelled });
      const c = r && cands.find(q => q.move === r.move);
      return r && (r.move < 0 ? { move: -1, note: TX.T('engine.nothing-left'), winrate: r.winrate } : { move: r.move, note: c ? describe(c) : TX.T('engine.reading-ahead'), winrate: r.winrate });
    }
    const K = n <= 9 ? 12 : n <= 13 ? 10 : 8;
    const arms = cands.slice(0, K).map(c => {
      const r = tryPlay(g, s.board, c.move, color, s.ko);
      return { move: c.move, c, h: c.score, board: r.board, ko: r.ko, w: 0, v: 0 };
    });
    if (oppPassed || s.moves.length > N * 0.45) arms.push({ move: -1, c: null, h: -5, board: s.board, ko: -1, w: 0, v: 0 });
    let total = 0;
    const t0 = now();
    let lastYield = t0;
    const maxMoves = N * 2;
    while (now() - t0 < ms) {
      let best = null, bv = -1;
      for (const a of arms) {
        const u = a.v === 0 ? 10 : a.w / a.v + 0.45 * Math.sqrt(Math.log(total + 1) / a.v) + 0.15 * Math.tanh(a.h / 10) / Math.sqrt(1 + a.v);
        if (u > bv) { bv = u; best = a; }
      }
      const fb = runPlayout(g, best.board, 3 - color, best.ko, best.move, maxMoves);
      const sc = scoreArea(n, fb);
      const blackWins = sc.black - sc.white - s.komi > 0;
      best.v++; if ((color === 1) === blackWins) best.w++;
      total++;
      if (now() - lastYield > 25) {
        await tick(); lastYield = now();
        if (opts.cancelled && opts.cancelled()) return null;
      }
    }
    const rate = a => (a.v ? a.w / a.v : 0);
    const moves = arms.filter(a => a.move >= 0);
    const bestMove = moves.slice().sort((a, c) => c.v - a.v)[0];
    const passArm = arms.find(a => a.move < 0);
    if (passArm && passArm.v > 5 && (!bestMove || rate(passArm) >= rate(bestMove) - 0.03) && oppPassed) {
      return { move: -1, note: TX.T('engine.nothing-left'), winrate: rate(passArm) };
    }
    if (!bestMove) return { move: -1, note: TX.T('engine.no-moves') };
    return { move: bestMove.move, note: describe(bestMove.c), winrate: rate(bestMove) };
  }

  const suggest = (s, color, opts) => chooseMove(s, color, Object.assign({}, opts, { level: (opts && opts.level) || 'medium' }));

  /* ---------- dead-stone estimate for scoring ---------- */
  async function estimateDead(s, sims, cancelled) {
    const n = s.n, N = n * n, g = geom(n);
    const cnt = [null, new Int32Array(N), new Int32Array(N)];
    let t = now();
    for (let k = 0; k < sims; k++) {
      const fb = runPlayout(g, s.board, s.turn, -1, -1, N * 2);
      const sc = scoreArea(n, fb);
      for (let i = 0; i < N; i++) {
        const owner = fb[i] || sc.terr[i];
        if (owner) cnt[owner][i]++;
      }
      if (now() - t > 25) { await tick(); t = now(); if (cancelled && cancelled()) return new Set(); }
    }
    const dead = new Set();
    for (const gr of allGroups(n, s.board)) {
      let opp = 0;
      for (const st of gr.stones) opp += cnt[3 - gr.color][st];
      if (opp / (gr.stones.length * sims) > 0.6) for (const st of gr.stones) dead.add(st);
    }
    return dead;
  }

  /* ---------- analysis ---------- */
  function clone(s) {
    return Object.assign({}, s, { board: s.board.slice(), caps: s.caps.slice(), moves: s.moves.slice(), hist: s.hist.slice() });
  }
  function stateAt(s, k) {
    const ns = newState(s.n, s.handicap);
    ns.komi = s.komi;
    for (let q = 0; q < k && q < s.moves.length; q++) {
      const m = s.moves[q];
      if (m.i < 0) pass(ns); else play(ns, m.i);
    }
    return ns;
  }
  /* Estimates who owns each point by playing random games to the end: either sims games, or (with opts.ms) as many as fit in that many
     milliseconds, at least 10. opts.progress(own, games) is called now and then while it runs, so a map can firm up on screen. */
  async function territory(s, sims, cancelled, opts) {
    opts = opts || {};
    const n = s.n, N = n * n, g = geom(n), ms = opts.ms || 0;
    const raw = new Float32Array(N);
    let diff = 0, k = 0, t = now(), t0 = t, tp = t;
    const average = () => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = raw[i] / (k || 1); return o; };
    while (ms ? (now() - t0 < ms || k < 10) : k < sims) {
      const fb = runPlayout(g, s.board, s.turn, s.ko, s.last, N * 2);
      const sc = scoreArea(n, fb);
      diff += sc.black - sc.white;
      for (let i = 0; i < N; i++) {
        const o = fb[i] || sc.terr[i];
        if (o === 1) raw[i]++; else if (o === 2) raw[i]--;
      }
      k++;
      if (now() - t > 25) {
        await tick(); t = now();
        if (cancelled && cancelled()) return null;
        if (opts.progress && now() - tp > 400) { tp = now(); opts.progress(average(), k); }
      }
    }
    return { own: average(), diff: diff / (k || 1) - s.komi, sims: k };
  }
  // Rank candidate moves for `color` by Monte Carlo win rate. `include` lists extra moves to evaluate (e.g. the move actually played).
  async function analyse(s, color, opts) {
    opts = opts || {};
    const n = s.n, N = n * n, g = geom(n);
    const ms = opts.ms || (n <= 9 ? 1500 : 2500);
    const K = opts.k || 6;
    const stones = [];
    for (let i = 0; i < N; i++) if (s.board[i]) stones.push(i);
    const list = candidates(s, color, 0).slice(0, K);
    for (const m of opts.include || []) {
      if (m < 0 || list.some(c => c.move === m)) continue;
      const h = heuristic(g, s.board, m, color, s.ko, stones);
      const edge = Math.min(m % n, (m / n) | 0, n - 1 - (m % n), n - 1 - ((m / n) | 0));
      list.push({ move: m, score: h ? h.score : -10, why: h ? h.why : [], edge: h ? h.edge : edge, forced: true });
    }
    const arms = [];
    for (const c of list) {
      const r = tryPlay(g, s.board, c.move, color, s.ko);
      if (r.ok) arms.push({ move: c.move, note: describe(c), h: c.score, board: r.board, ko: r.ko, w: 0, v: 0, forced: !!c.forced });
    }
    let own = null;
    if (!arms.length) {
      own = await territory(s, 60, opts.cancelled);
      return { moves: [], own: own && own.own, diff: own ? own.diff : 0, sims: own ? own.sims : 0 };
    }
    const sim = a => {
      const fb = runPlayout(g, a.board, 3 - color, a.ko, a.move, N * 2);
      const sc = scoreArea(n, fb);
      a.v++; if ((color === 1) === (sc.black - sc.white - s.komi > 0)) a.w++;
    };
    let total = 0, t0 = now(), ty = t0;
    while (now() - t0 < ms) {
      let best = null, bv = -1;
      for (const a of arms) {
        const u = a.v === 0 ? 10 : a.w / a.v + 0.45 * Math.sqrt(Math.log(total + 1) / a.v) + 0.15 * Math.tanh(a.h / 10) / Math.sqrt(1 + a.v);
        if (u > bv) { bv = u; best = a; }
      }
      sim(best); total++;
      if (now() - ty > 25) { await tick(); ty = now(); if (opts.cancelled && opts.cancelled()) return null; }
    }
    for (const a of arms) while (a.v < 40) sim(a);
    const moves = arms.map(a => ({ move: a.move, wr: a.w / a.v, v: a.v, note: a.note, forced: a.forced }));
    moves.sort((a, b) => b.wr - a.wr || b.v - a.v);
    own = await territory(s, n <= 9 ? 200 : n <= 13 ? 100 : 40, opts.cancelled);
    if (!own) return null;
    return { moves, own: own.own, diff: own.diff, sims: own.sims };
  }

  return {
    clone, stateAt, territory, analyse, coachLevel, analysisMs, LEVELS,
    geom, flood, allGroups, tryPlay, isOwnEye, stars, handicapPoints, newState, play, pass, undo, coord,
    serialize, deserialize, toSGF, scoreArea, chooseMove, suggest, estimateDead, runPlayout, candidates
  };
});
