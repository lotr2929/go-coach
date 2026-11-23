/* Go Coach — the stronger search used by the Hard computer and the coach's hints.
   Tree search (Monte Carlo tree search with RAVE) over fast random games that follow simple Go rules of thumb:
   capture what is in atari, rescue your own stones, avoid filling your own eyes or putting yourself in atari.
   Local only: no network, no neural network. Exposed as GoSearch.search(state, colour, opts). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoSearch = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EDGE = 3, PASS = -1;
  const EXPAND_AT = 2;        /* visits a tree node needs before its replies are added */
  const RAVE_EQUIV = 3500;    /* how long "all moves as first" statistics keep their weight */
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const tick = () => new Promise(r => setTimeout(r, 0));

  /* ---------- padded board geometry: one ring of EDGE cells around the board ---------- */
  const geos = {};
  function geo(n) {
    if (geos[n]) return geos[n];
    const W = n + 2, size = W * W, pts = [], line = new Int8Array(size);
    const board0 = new Int8Array(size).fill(EDGE);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const p = (y + 1) * W + x + 1;
      pts.push(p); board0[p] = 0; line[p] = Math.min(x, y, n - 1 - x, n - 1 - y);
    }
    return (geos[n] = {
      n, W, size, pts, line, board0,
      dirs: [1, -1, W, -W], diag: [W + 1, W - 1, 1 - W, -1 - W],
      mark: new Int32Array(size), lmark: new Int32Array(size), stamp: 0,
      stack: new Int32Array(size), lb: new Int32Array(size)
    });
  }
  const toPad = (G, i) => (i < 0 ? -1 : (((i / G.n) | 0) + 1) * G.W + (i % G.n) + 1);
  const toIdx = (G, p) => (p < 0 ? -1 : ((p / G.W) | 0) - 1) * G.n + (p % G.W) - 1;

  /* Counts the liberties of the group at p, stopping once `max` are found. The ones found are left in G.lb. */
  function libs(G, b, p, max) {
    const c = b[p], st = ++G.stamp, stack = G.stack, mark = G.mark, lmark = G.lmark, d = G.dirs;
    let top = 0, nl = 0;
    stack[top++] = p; mark[p] = st;
    while (top) {
      const q = stack[--top];
      for (let k = 0; k < 4; k++) {
        const r = q + d[k], v = b[r];
        if (v === 0) {
          if (lmark[r] !== st) { lmark[r] = st; G.lb[nl++] = r; if (nl >= max) return nl; }
        } else if (v === c && mark[r] !== st) { mark[r] = st; stack[top++] = r; }
      }
    }
    return nl;
  }
  function removeGroup(G, b, p) {
    const c = b[p], stack = G.stack, d = G.dirs;
    let top = 0, cnt = 0;
    stack[top++] = p; b[p] = 0;
    while (top) {
      const q = stack[--top]; cnt++;
      for (let k = 0; k < 4; k++) { const r = q + d[k]; if (b[r] === c) { b[r] = 0; stack[top++] = r; } }
    }
    return cnt;
  }

  /* ---------- a position the search can play on ---------- */
  function makePos(G, b, turn, ko, last) { return { b, turn, ko, last, passes: 0 }; }
  function copyPos(pos) { return { b: pos.b.slice(), turn: pos.turn, ko: pos.ko, last: pos.last, passes: pos.passes }; }

  /* Plays p for the side to move. Returns false (and leaves the board unchanged) if the move is illegal. */
  function playMove(G, pos, p) {
    const c = pos.turn, o = 3 - c, b = pos.b, d = G.dirs;
    if (p === PASS) { pos.ko = -1; pos.passes++; pos.last = PASS; pos.turn = o; return true; }
    if (b[p] !== 0 || p === pos.ko) return false;
    b[p] = c;
    let caps = 0, capAt = -1;
    for (let k = 0; k < 4; k++) {
      const q = p + d[k];
      if (b[q] === o && libs(G, b, q, 1) === 0) { caps += removeGroup(G, b, q); capAt = q; }
    }
    if (!caps && libs(G, b, p, 1) === 0) { b[p] = 0; return false; }
    pos.ko = -1;
    if (caps === 1) {
      let lone = true;
      for (let k = 0; k < 4; k++) { const v = b[p + d[k]]; if (v === c || (v === 0 && p + d[k] !== capAt)) { lone = false; break; } }
      if (lone) pos.ko = capAt;
    }
    pos.last = p; pos.passes = 0; pos.turn = o;
    return true;
  }

  /* A point surrounded by one colour that the other side cannot easily break: filling it would be wasteful. */
  function isEyeish(G, b, p, c) {
    const d = G.dirs;
    for (let k = 0; k < 4; k++) { const v = b[p + d[k]]; if (v !== c && v !== EDGE) return false; }
    let bad = 0, edge = 0;
    for (let k = 0; k < 4; k++) { const v = b[p + G.diag[k]]; if (v === EDGE) edge = 1; else if (v === 3 - c) bad++; }
    return bad + edge < 2;
  }

  /* Would playing p for c leave the new group with a single liberty (and capture nothing)? */
  function selfAtari(G, b, p, c) {
    const d = G.dirs, o = 3 - c;
    let first = -1;
    const add = q => { if (q === p || q === first) return false; if (first < 0) { first = q; return false; } return true; };
    for (let k = 0; k < 4; k++) {
      const q = p + d[k], v = b[q];
      if (v === 0) { if (add(q)) return false; }
      else if (v === o) { if (libs(G, b, q, 2) === 1) return false; }
    }
    for (let k = 0; k < 4; k++) {
      const q = p + d[k];
      if (b[q] !== c) continue;
      const nl = libs(G, b, q, 3);
      for (let t = 0; t < nl; t++) if (add(G.lb[t])) return false;
    }
    return true;
  }

  /* ---------- random games ---------- */
  const tactical = [];
  /* Urgent replies near the last move: capture a group in atari, or rescue our own. */
  function urgentMoves(G, pos, out) {
    out.length = 0;
    const b = pos.b, c = pos.turn, o = 3 - c, l = pos.last;
    if (l < 0) return out;
    const near = [l, l + 1, l - 1, l + G.W, l - G.W, l + G.W + 1, l + G.W - 1, l - G.W + 1, l - G.W - 1];
    for (const q of near) {
      const v = b[q];
      if (v === o) { if (libs(G, b, q, 2) === 1) out.push(G.lb[0]); }
      else if (v === c && libs(G, b, q, 2) === 1) {
        const esc = G.lb[0];
        if (!selfAtari(G, b, esc, c)) out.push(esc);
      }
    }
    return out;
  }
  function playoutMove(G, pos) {
    const b = pos.b, c = pos.turn;
    if (Math.random() < 0.9) {
      const u = urgentMoves(G, pos, tactical);
      while (u.length) {
        const t = (Math.random() * u.length) | 0, p = u[t];
        u[t] = u[u.length - 1]; u.pop();
        if (playMove(G, pos, p)) return p;
      }
    }
    const pts = G.pts, N = pts.length, start = (Math.random() * N) | 0;
    for (let k = 0; k < N; k++) {
      const p = pts[(start + k) % N];
      if (b[p] !== 0 || p === pos.ko || isEyeish(G, b, p, c)) continue;
      if (Math.random() < 0.9 && selfAtari(G, b, p, c)) continue;
      if (playMove(G, pos, p)) return p;
    }
    playMove(G, pos, PASS);
    return PASS;
  }
  /* Plays to the end, noting in amaf who played first at each point. Returns Black's score minus White's (before komi). */
  function playout(G, pos, amaf) {
    const limit = G.pts.length * 2;
    for (let m = 0; m < limit && pos.passes < 2; m++) {
      const c = pos.turn, p = playoutMove(G, pos);
      if (p >= 0 && !amaf[p]) amaf[p] = c;
    }
    return areaScore(G, pos.b);
  }
  /* Who owns point p at the end of a random game: +1 Black, -1 White, 0 neither. */
  function ownerOf(G, b, p) {
    const v = b[p];
    if (v === 1) return 1;
    if (v === 2) return -1;
    let bl = false, wh = false;
    for (let k = 0; k < 4; k++) { const w = b[p + G.dirs[k]]; if (w === 1) bl = true; else if (w === 2) wh = true; }
    return bl && !wh ? 1 : wh && !bl ? -1 : 0;
  }
  function areaScore(G, b) {
    let s = 0;
    for (const p of G.pts) s += ownerOf(G, b, p);
    return s;
  }

  /* ---------- the search tree ---------- */
  function node(p, c) { return { p, c, n: 0, w: 0, an: 0, aw: 0, pn: 0, pw: 0, kids: null }; }

  /* Adds every sensible reply, with starting statistics ("priors") from simple Go knowledge. */
  function expand(G, nd, pos, allowPass) {
    const b = pos.b, c = pos.turn, o = 3 - c, d = G.dirs, kids = [];
    const stones = [];
    for (const p of G.pts) if (b[p]) stones.push(p);
    const urgent = urgentMoves(G, pos, []);
    const W = G.W, lx = pos.last >= 0 ? pos.last % W : -9, ly = pos.last >= 0 ? (pos.last / W) | 0 : -9;
    for (const p of G.pts) {
      if (b[p] !== 0 || p === pos.ko || isEyeish(G, b, p, c)) continue;
      const k = node(p, c);
      k.pn = 10; k.pw = 5;                                      /* even prior */
      let cap = 0;
      for (let q = 0; q < 4; q++) {
        const r = p + d[q];
        if (b[r] === o && libs(G, b, r, 2) === 1) { cap = 1; k.pn += 15; k.pw += 15; break; }
      }
      if (urgent.includes(p) && !cap) { k.pn += 15; k.pw += 15; }
      if (selfAtari(G, b, p, c)) { k.pn += 10; if (!cap) k.pw = Math.max(0, k.pw - 5); }
      const x = p % W, y = (p / W) | 0, dl = Math.max(Math.abs(x - lx), Math.abs(y - ly));
      if (dl <= 3) { const bonus = [0, 24, 22, 8][dl]; k.pn += bonus; k.pw += bonus; }
      let lonely = true;
      for (const s of stones) if (Math.abs(s % W - x) + Math.abs(((s / W) | 0) - y) <= 3) { lonely = false; break; }
      if (lonely) {
        const ln = G.line[p];
        if (ln <= 1) k.pn += 10;                                /* 1st or 2nd line far from everything: usually slow */
        else if (ln <= 3) { k.pn += 10; k.pw += 10; }           /* 3rd or 4th line in open space: good */
      }
      kids.push(k);
    }
    if (allowPass || !kids.length) { const k = node(PASS, c); k.pn = 10; k.pw = 5; kids.push(k); }
    nd.kids = kids;
  }

  function pick(nd) {
    let best = null, bv = -1;
    for (const k of nd.kids) {
      const n = k.n + k.pn, wr = n ? (k.w + k.pw) / n : 0.5;
      let v = wr;
      if (k.an) {
        const beta = k.an / (k.an + n + n * k.an / RAVE_EQUIV);
        v = (1 - beta) * wr + beta * (k.aw / k.an);
      }
      v += Math.random() * 1e-6;
      if (v > bv) { bv = v; best = k; }
    }
    return best;
  }

  /* One simulation: walk down the tree, add a level, finish with a random game, and record the result. */
  function simulate(G, root, rootPos, komi, oppPassed) {
    const pos = copyPos(rootPos), path = [root], amaf = new Int8Array(G.size);
    let nd = root;
    while (nd.kids && nd.kids.length && pos.passes < 2) {
      const k = pick(nd);
      if (!playMove(G, pos, k.p)) { nd.kids.splice(nd.kids.indexOf(k), 1); continue; }
      if (k.p >= 0 && !amaf[k.p]) amaf[k.p] = k.c;
      path.push(k); nd = k;
    }
    if (!nd.kids && nd.n + 1 >= EXPAND_AT && pos.passes < 2) {
      expand(G, nd, pos, false);
      const k = pick(nd);
      if (k && playMove(G, pos, k.p)) { if (k.p >= 0 && !amaf[k.p]) amaf[k.p] = k.c; path.push(k); }
    }
    const margin = playout(G, pos, amaf) - komi;
    /* Mostly win or loss, plus a little for the size of the win, so a clearly won or lost game is still played sensibly. */
    const blackVal = (margin > 0 ? 0.9 : 0) + 0.1 / (1 + Math.exp(-margin / 4));
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      p.n++;
      if (p.c === 1) p.w += blackVal; else if (p.c === 2) p.w += 1 - blackVal;
      if (!p.kids) continue;
      for (const k of p.kids) {
        if (k.p >= 0 && amaf[k.p] === k.c) { k.an++; k.aw += k.c === 1 ? blackVal : 1 - blackVal; }
      }
    }
  }

  /* Searches for `ms` milliseconds (yielding now and then so the page stays responsive).
     Returns { move, winrate, moves: [{ move, winrate, visits }] } with moves as engine indices, or null if cancelled. */
  async function search(s, color, opts) {
    opts = opts || {};
    const G = geo(s.n), b = G.board0.slice();
    for (let i = 0; i < s.n * s.n; i++) if (s.board[i]) b[toPad(G, i)] = s.board[i];
    const rootPos = makePos(G, b, color, toPad(G, s.ko), toPad(G, s.last));
    const root = node(PASS, 3 - color);
    expand(G, root, rootPos, !!opts.oppPassed);
    const ms = opts.ms || 1500, t0 = now();
    let ty = t0, sims = 0;
    while (now() - t0 < ms || sims < 50) {
      simulate(G, root, rootPos, s.komi, opts.oppPassed);
      sims++;
      if (now() - ty > 25) { await tick(); ty = now(); if (opts.cancelled && opts.cancelled()) return null; }
    }
    const kids = root.kids.slice().sort((a, c) => c.n - a.n);
    const moves = kids.filter(k => k.n > 0).map(k => ({ move: toIdx(G, k.p), winrate: k.w / k.n, visits: k.n }));
    const best = moves[0] || { move: -1, winrate: 0.5 };
    return { move: best.move, winrate: best.winrate, moves, sims };
  }

  /* Plays the position out to the end many times (for `ms` milliseconds, at least 20 games).
     Returns { own, diff, sims }: own[i] runs from +1 (always Black's) to -1 (always White's); diff is Black's average lead after komi. */
  async function ownership(s, opts) {
    opts = opts || {};
    const G = geo(s.n), N = s.n * s.n, b = G.board0.slice(), amaf = new Int8Array(G.size), own = new Float32Array(N);
    for (let i = 0; i < N; i++) if (s.board[i]) b[toPad(G, i)] = s.board[i];
    const ms = opts.ms || 500, t0 = now();
    let ty = t0, k = 0, sum = 0;
    while (now() - t0 < ms || k < 20) {
      const pos = makePos(G, b.slice(), s.turn, toPad(G, s.ko), toPad(G, s.last));
      sum += playout(G, pos, amaf) - s.komi;
      for (let i = 0; i < N; i++) own[i] += ownerOf(G, pos.b, toPad(G, i));
      k++;
      if (now() - ty > 25) { await tick(); ty = now(); if (opts.cancelled && opts.cancelled()) return null; }
    }
    for (let i = 0; i < N; i++) own[i] /= k;
    return { own, diff: sum / k, sims: k };
  }

  return { search, ownership };
});
