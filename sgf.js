/* World of Go — reads and writes SGF game records, the usual file format for Go games.
   Only the main line of a game is kept: variations, comments and anything else the app does not need are dropped.
   No DOM here: test.js and make-kifu.js run it in Node, and kifuui.js uses it in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoSGF = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- reading ---------- */
  /* One node: ";" followed by properties such as B[qd] or PB[Name]. Returns { node, pos }. */
  function readNode(s, pos) {
    const node = {};
    for (;;) {
      while (pos < s.length && /\s/.test(s[pos])) pos++;
      const m = /^[A-Za-z]+/.exec(s.slice(pos, pos + 12));
      if (!m) return { node, pos };
      const key = m[0].replace(/[a-z]/g, '');
      pos += m[0].length;
      for (;;) {
        let q = pos;
        while (q < s.length && /\s/.test(s[q])) q++;
        if (s[q] !== '[') break;
        let v = '';
        q++;
        while (q < s.length && s[q] !== ']') { if (s[q] === '\\' && q + 1 < s.length) q++; v += s[q]; q++; }
        pos = q + 1;
        (node[key] || (node[key] = [])).push(v);
      }
    }
  }
  /* A game tree: "(" nodes and branches ")". */
  function readTree(s, pos) {
    pos++;
    const tree = { nodes: [], kids: [] };
    while (pos < s.length) {
      const c = s[pos];
      if (c === ';') { const r = readNode(s, pos + 1); tree.nodes.push(r.node); pos = r.pos; }
      else if (c === '(') { const r = readTree(s, pos); tree.kids.push(r.tree); pos = r.pos; }
      else if (c === ')') return { tree, pos: pos + 1 };
      else pos++;
    }
    return { tree, pos };
  }
  /* The main line: this tree's nodes, then the first branch, and so on. */
  function mainLine(tree) {
    const out = [];
    for (let t = tree; t; t = t.kids[0]) for (const nd of t.nodes) out.push(nd);
    return out;
  }
  function point(v, n) {
    if (!v || v.length < 2) return -1;
    const x = v.charCodeAt(0) - 97, y = v.charCodeAt(1) - 97;
    return x >= 0 && y >= 0 && x < n && y < n ? y * n + x : -1;
  }
  /* AB[aa][bb] or a compressed rectangle such as AB[aa:cc]. */
  function points(values, n) {
    const out = [];
    for (const v of values || []) {
      if (v.length === 5 && v[2] === ':') {
        const a = v.charCodeAt(0) - 97, b = v.charCodeAt(1) - 97, c = v.charCodeAt(3) - 97, d = v.charCodeAt(4) - 97;
        for (let y = Math.min(b, d); y <= Math.max(b, d); y++) for (let x = Math.min(a, c); x <= Math.max(a, c); x++) if (x >= 0 && y >= 0 && x < n && y < n) out.push(y * n + x);
      } else { const i = point(v, n); if (i >= 0) out.push(i); }
    }
    return out;
  }

  const INFO_KEYS = ['PB', 'PW', 'BR', 'WR', 'DT', 'RE', 'EV', 'RO', 'PC', 'GC'];

  /* SGF text -> { n, komi, handicap, setupB, setupW, moves: [{ c, i }], info }, or null when there is no game in it.
     c is 1 (Black) or 2 (White); i is the point index (row * n + column), or -1 for a pass. */
  function parse(text) {
    const s = String(text).replace(/^\uFEFF/, '');
    const at = s.indexOf('(');
    if (at < 0) return null;
    const nodes = mainLine(readTree(s, at).tree);
    if (!nodes.length) return null;
    const root = nodes[0], first = k => (root[k] && root[k][0] !== undefined ? root[k][0] : '');
    const sz = /^\d+/.exec(first('SZ'));
    const n = sz ? +sz[0] : 19;
    if (n < 2 || n > 26) return null;
    const g = { n, komi: parseFloat(first('KM')) || 0, handicap: parseInt(first('HA'), 10) || 0, setupB: [], setupW: [], moves: [], info: {} };
    for (const k of INFO_KEYS) if (first(k)) g.info[k] = first(k);
    for (const node of nodes) {
      if (!g.moves.length) { g.setupB.push(...points(node.AB, n)); g.setupW.push(...points(node.AW, n)); }
      const c = node.B ? 1 : node.W ? 2 : 0;
      if (c) g.moves.push({ c, i: point(node[c === 1 ? 'B' : 'W'][0], n) });
    }
    return g;
  }

  /* ---------- writing ---------- */
  const esc = v => String(v).replace(/[\]\\]/g, '\\$&');
  /* A clean, minimal SGF for a parsed game. */
  function toSGF(g) {
    const n = g.n, ch = i => String.fromCharCode(97 + (i % n)) + String.fromCharCode(97 + ((i / n) | 0));
    let out = `(;GM[1]FF[4]CA[UTF-8]SZ[${n}]KM[${g.komi}]`;
    for (const k of INFO_KEYS) if (g.info[k] && k !== 'GC') out += `${k}[${esc(g.info[k])}]`;
    if (g.handicap) out += `HA[${g.handicap}]`;
    if (g.setupB.length) out += 'AB' + g.setupB.map(i => `[${ch(i)}]`).join('');
    if (g.setupW.length) out += 'AW' + g.setupW.map(i => `[${ch(i)}]`).join('');
    const lines = [];
    let row = '';
    for (const m of g.moves) {
      row += `;${m.c === 1 ? 'B' : 'W'}[${m.i < 0 ? '' : ch(m.i)}]`;
      if (row.length >= 70) { lines.push(row); row = ''; }
    }
    if (row) lines.push(row);
    return out + '\n' + lines.join('\n') + ')\n';
  }

  /* ---------- replaying on the engine E ---------- */
  /* The board before the first move: setup stones placed, the first mover to play. */
  function startState(E, g) {
    const s = E.newState(g.n, 0);
    s.komi = g.komi; s.handicap = g.handicap;
    for (const i of g.setupB) s.board[i] = 1;
    for (const i of g.setupW) s.board[i] = 2;
    s.turn = g.moves.length ? g.moves[0].c : (g.setupB.length > g.setupW.length ? 2 : 1);
    return s;
  }
  /* Plays one recorded move (it may not be the colour whose turn it is). False if the engine refuses it. */
  function playMove(E, s, m) {
    s.turn = m.c;
    if (m.i < 0) { E.pass(s); return true; }
    return E.play(s, m.i).ok;
  }
  /* Plays the first upTo moves (all by default). applied is how many the engine accepted; ok says all of them were. */
  function replay(E, g, upTo) {
    const s = startState(E, g), lim = upTo === undefined ? g.moves.length : Math.max(0, Math.min(upTo, g.moves.length));
    let k = 0;
    while (k < lim && playMove(E, s, g.moves[k])) k++;
    return { s, applied: k, ok: k === lim };
  }

  return { parse, toSGF, startState, playMove, replay };
});
