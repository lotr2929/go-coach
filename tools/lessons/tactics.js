/* Go Coach lesson tools: a small capture reader and an SGF lesson writer, for making capture and escape lessons whose answers
   are checked by reading out every defence (developer tool, never loaded by the app; run with node).
   capture(board, target, attacker): can the attacker, to move, capture the group at `target` whatever the defender does?
   The defender counts as escaped once the group has 3 liberties, or after 60 moves. Moves tried: the group's liberties (and,
   for the attacker's first move, the points next to them, for nets); the defender also tries capturing attacking stones in
   atari (playing elsewhere is not read). Kept small so it reads fast; lessons should be small, clear positions. */
const E = require('../../engine.js');

function make(n) {
  const g = E.geom(n);
  const group = (b, i) => E.flood(g, b, i);
  const ESCAPE = 3, DEPTH = 60;
  const play = (b, i, c, ko) => E.tryPlay(g, b, i, c, ko);

  function attackMoves(b, target, wide) {
    const gr = group(b, target), set = new Set(gr.libs);
    if (wide && gr.libs.length >= 2) for (const l of gr.libs) for (const j of g.nb[l]) if (!b[j]) set.add(j);
    return [...set];
  }
  function defendMoves(b, target) {
    const gr = group(b, target), c = b[target], set = new Set(gr.libs);
    for (const st of gr.stones) for (const j of g.nb[st]) if (b[j] && b[j] !== c) { const a = group(b, j); if (a.libs.length === 1) set.add(a.libs[0]); }
    return [...set];
  }
  /* Positions already read (the same position is reached in many orders). */
  const memo = new Map();
  const key = (who, b, target, ko, wide) => who + wide + target + ':' + ko + ':' + b.join('');
  /* Attacker to move: true if the target is captured whatever the defender does. */
  function capture(b, target, att, ko, depth) {
    depth = depth || 0;
    if (!b[target]) return true;
    if (depth > DEPTH) return false;
    const k = key('c' + att, b, target, ko, depth === 0 ? 'w' : '');
    if (memo.has(k)) return memo.get(k);
    memo.set(k, false); /* a position met again on the way is not a win for the attacker */
    const v = attackMoves(b, target, depth === 0).some(m => { const r = play(b, m, att, ko); return r.ok && (!r.board[target] || !escape(r.board, target, 3 - att, r.ko, depth + 1)); });
    memo.set(k, v);
    return v;
  }
  /* Defender to move: true if the target survives. */
  function escape(b, target, def, ko, depth) {
    if (!b[target]) return false;
    const gr = group(b, target);
    if (gr.libs.length >= ESCAPE || depth > DEPTH) return true;
    const k = key('e' + def, b, target, ko, '');
    if (memo.has(k)) return memo.get(k);
    memo.set(k, true);
    const v = escapeRead(b, target, def, ko, depth, gr);
    memo.set(k, v);
    return v;
  }
  function escapeRead(b, target, def, ko, depth, gr) {
    if (gr.libs.length === 1 && !defendMoves(b, target).length) return false;
    for (const m of defendMoves(b, target)) {
      const r = play(b, m, def, ko);
      if (r.ok && r.board[target] && !capture(r.board, target, 3 - def, r.ko, depth + 1)) return true;
    }
    return false; /* the defender always answers locally: playing elsewhere is not read */
  }
  return { g, group, play, attackMoves, defendMoves, capture, escape };
}

/* The answer tree of a capture lesson, as SGF branches. The player (att) plays every move that still captures; the opponent
   answers with the defence that holds out longest; a try ends RIGHT when the target is captured, or when the opponent has no
   move that helps at all. Options: wide (net moves allowed as the first move), proof (end RIGHT as soon as the first move is
   proven to capture, with comments.proven), wrong (tempting first moves that fail: each gets the opponent's escape, with
   comments.escapes). */
function captureTree(n, b, target, att, comments, opts) {
  opts = opts || {};
  const T = make(n), col = c => (c === 1 ? 'B' : 'W'), pt = i => String.fromCharCode(97 + (i % n)) + String.fromCharCode(97 + ((i / n) | 0));
  const esc = t => t.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
  const label = i => E.coord(n, i);
  function longest(b2, k2) { /* the defence that lasts longest (most liberties afterwards), or null if none is legal */
    let best = null;
    for (const m of T.defendMoves(b2, target)) {
      const r = T.play(b2, m, 3 - att, k2);
      if (!r.ok || !r.board[target]) continue;
      const libs = T.group(r.board, target).libs.length;
      if (!best || libs > best.libs) best = { m, r, libs };
    }
    return best;
  }
  function node(b2, k2, depth) {
    if (depth > 40) throw new Error('too deep');
    /* Net moves (not touching the group) are offered on the first move only, as the reader considers them only there. */
    const wins = T.attackMoves(b2, target, depth === 0 && !!opts.wide).filter(m => { const r = T.play(b2, m, att, k2); return r.ok && (!r.board[target] || !T.escape(r.board, target, 3 - att, r.ko, 1)); });
    if (!wins.length) throw new Error('no winning move at depth ' + depth);
    return wins.map(m => {
      const r = T.play(b2, m, att, k2);
      if (!r.board[target]) return `(;${col(att)}[${pt(m)}]C[${esc('RIGHT ' + comments.captured(r.captured.length, label(m)))}])`;
      if (opts.proof && depth === 0) return `(;${col(att)}[${pt(m)}]C[${esc('RIGHT ' + comments.proven(label(m)))}])`;
      const d = longest(r.board, r.ko);
      if (!d) return `(;${col(att)}[${pt(m)}]C[${esc('RIGHT ' + comments.trapped(label(m)))}])`;
      return `(;${col(att)}[${pt(m)}];${col(3 - att)}[${pt(d.m)}]C[${esc(comments.runs(label(d.m)))}]` + node(d.r.board, d.r.ko, depth + 1).join('') + ')';
    });
  }
  const tries = node(b, -1, 0);
  for (const w of opts.wrong || []) {
    const r = T.play(b, w, att, -1);
    if (!r.ok || !r.board[target]) throw new Error('a wrong try must be legal and not capture');
    if (!T.escape(r.board, target, 3 - att, r.ko, 1)) throw new Error('the wrong try ' + label(w) + ' actually works');
    const d = T.defendMoves(r.board, target).map(x => ({ x, rr: T.play(r.board, x, 3 - att, r.ko) }))
      .filter(o => o.rr.ok && o.rr.board[target] && !T.capture(o.rr.board, target, att, o.rr.ko, 1))[0];
    if (!d) throw new Error('no escape found after ' + label(w));
    tries.push(`(;${col(att)}[${pt(w)}];${col(3 - att)}[${pt(d.x)}]C[${esc(comments.escapes(label(w), label(d.x)))}])`);
  }
  return tries;
}

/* The answer tree of an escape lesson: the player (def) plays every move after which the group cannot be captured; the
   opponent answers with an attacking move; RIGHT once the group has 3 or more liberties and cannot be captured. */
function escapeTree(n, b, target, def, comments) {
  const T = make(n), col = c => (c === 1 ? 'B' : 'W'), pt = i => String.fromCharCode(97 + (i % n)) + String.fromCharCode(97 + ((i / n) | 0));
  const esc = t => t.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
  function node(b2, k2, depth, caught) {
    if (depth > 40) throw new Error('too deep');
    const goods = T.defendMoves(b2, target).filter(m => { const r = T.play(b2, m, def, k2); return r.ok && r.board[target] && !T.capture(r.board, target, 3 - def, r.ko, 0); });
    if (!goods.length) throw new Error('no saving move at depth ' + depth);
    return goods.map(m => {
      const r = T.play(b2, m, def, k2), libs = T.group(r.board, target).libs.length;
      if (libs >= 3) return `(;${col(def)}[${pt(m)}]C[${esc('RIGHT ' + comments.safe(libs, E.coord(n, m), caught + r.captured.length))}])`;
      const a = T.attackMoves(r.board, target).map(x => ({ x, rr: T.play(r.board, x, 3 - def, r.ko) })).filter(o => o.rr.ok && o.rr.board[target])
        .sort((p, q) => T.group(p.rr.board, target).libs.length - T.group(q.rr.board, target).libs.length)[0];
      if (!a) return `(;${col(def)}[${pt(m)}]C[${esc('RIGHT ' + comments.safe(libs, E.coord(n, m), caught + r.captured.length))}])`;
      return `(;${col(def)}[${pt(m)}];${col(3 - def)}[${pt(a.x)}]C[${esc(comments.chases(E.coord(n, a.x)))}]` + node(a.rr.board, a.rr.ko, depth + 1, caught + r.captured.length).join('') + ')';
    });
  }
  return node(b, -1, 0, 0);
}

module.exports = { make, captureTree, escapeTree };
