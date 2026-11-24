/* Go Coach — recognising shapes on the board.
   Finds the classic shapes a beginner should know (good, bad, neutral and weak points), both those already on the board and
   those the side to move could make with one move. Pure rules: no random games, no network. The wording is in docs/text/en/shapes.md.
   Exposed as GoShapes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoShapes = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const { T } = TX;

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const name = (n, i) => LETTERS[i % n] + (n - ((i / n) | 0));

  /* Whether each shape is good, and the words a question may use for it (words; they stay here). From shapes.md: its name,
     the name with "a" or "an" (a), the idea in a sentence or two (text) and the fuller explanation given when you tap it or ask (more). */
  const KINDS = {
    ponnuki: { tone: 'good', words: ['ponnuki'] },
    tiger: { tone: 'good', words: ['tiger', "tiger's mouth", 'tigers mouth', 'tiger mouth', 'hanging connection'] },
    bamboo: { tone: 'good', words: ['bamboo', 'bamboo joint'] },
    diagonal: { tone: 'good', words: ['diagonal', 'kosumi'] },
    jump: { tone: 'neutral', words: ['one point jump', 'ikken tobi', 'jump'] },
    knight: { tone: 'neutral', words: ['knight', "knight's move", 'knights move', 'knight move', 'keima'] },
    triangle: { tone: 'bad', words: ['empty triangle', 'triangle'] },
    dumpling: { tone: 'bad', words: ['dumpling'] },
    cut: { tone: 'weak', words: ['cutting point', 'cutting points'] },
    crosscut: { tone: 'weak', words: ['crosscut', 'cross cut'] },
    eye: { tone: 'neutral' },
    falseeye: { tone: 'weak', words: ['false eye', 'false eyes'] }
  };
  for (const [k, K] of Object.entries(KINDS)) for (const part of ['name', 'a', 'text', 'more']) K[part] = T(`shapes.${k}.${part}`);
  /* Answers for "what is a ponnuki?" and the like, used by the coach (coach.js). */
  const TERMS = [
    ...Object.values(KINDS).filter(k => k.words).map(k => ({ w: k.words, t: T('shapes.term', { more: k.more }) })),
    { w: ['shape', 'shapes', 'good shape', 'bad shape'], t: T('shapes.shape-term') }
  ];
  /* Kinds worth pointing out as moves the side to move could make: good shapes to aim for and bad shapes to avoid. */
  const POTENTIAL = ['tiger', 'bamboo', 'triangle', 'dumpling'];

  /* Patterns as [dx, dy, what]: X own stone, O opponent stone, . empty point. Each is tried in all 8 rotations and reflections. */
  const PATTERNS = {
    ponnuki: [[1, 0, 'X'], [0, 1, 'X'], [2, 1, 'X'], [1, 2, 'X'], [1, 1, '.']],
    tiger: [[0, 0, 'X'], [2, 0, 'X'], [1, 1, 'X'], [1, 0, '.']],
    bamboo: [[0, 0, 'X'], [1, 0, 'X'], [0, 2, 'X'], [1, 2, 'X'], [0, 1, '.'], [1, 1, '.']],
    diagonal: [[0, 0, 'X'], [1, 1, 'X'], [1, 0, '.'], [0, 1, '.']],
    jump: [[0, 0, 'X'], [0, 2, 'X'], [0, 1, '.']],
    knight: [[0, 0, 'X'], [1, 2, 'X'], [0, 1, '.'], [1, 1, '.']],
    triangle: [[0, 0, 'X'], [1, 0, 'X'], [0, 1, 'X'], [1, 1, '.']],
    dumpling: [[0, 0, 'X'], [1, 0, 'X'], [0, 1, 'X'], [1, 1, 'X']],
    cut: [[0, 0, 'X'], [1, 1, 'X'], [1, 0, 'O'], [0, 1, '.']],
    crosscut: [[0, 0, 'X'], [1, 1, 'X'], [1, 0, 'O'], [0, 1, 'O']]
  };
  const SYM = [[1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1], [0, -1, 1, 0], [-1, 0, 0, 1], [1, 0, 0, -1], [0, 1, 1, 0], [0, -1, -1, 0]];
  const VARIANTS = {};
  for (const k of Object.keys(PATTERNS)) {
    const seen = new Set();
    VARIANTS[k] = [];
    for (const [a, b, c, d] of SYM) {
      const v = PATTERNS[k].map(([x, y, w]) => [a * x + b * y, c * x + d * y, w]);
      const key = v.map(p => p.join(',')).sort().join(';');
      if (!seen.has(key)) { seen.add(key); VARIANTS[k].push(v); }
    }
  }

  /* Which stones belong to the same group, so two stones already solidly joined are not reported as a "connection". */
  function groupIds(n, board) {
    const id = new Int32Array(n * n).fill(-1);
    let g = 0;
    for (let i = 0; i < n * n; i++) {
      if (!board[i] || id[i] >= 0) continue;
      const st = [i]; id[i] = g;
      while (st.length) {
        const p = st.pop(), x = p % n, y = (p / n) | 0;
        for (const q of [x > 0 ? p - 1 : -1, x < n - 1 ? p + 1 : -1, y > 0 ? p - n : -1, y < n - 1 ? p + n : -1]) {
          if (q >= 0 && id[q] < 0 && board[q] === board[i]) { id[q] = g; st.push(q); }
        }
      }
      g++;
    }
    return id;
  }

  /* Shapes on `board`. opts.near: only look at shapes within 3 points of this point (used for possible moves). */
  function scan(n, board, opts) {
    opts = opts || {};
    const out = [], keys = new Set(), gid = groupIds(n, board);
    const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? -1 : board[y * n + x]);
    const nx = opts.near >= 0 ? opts.near % n : -1, ny = opts.near >= 0 ? (opts.near / n) | 0 : -1;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (nx >= 0 && (Math.abs(x - nx) > 3 || Math.abs(y - ny) > 3)) continue;
      for (const kind of opts.kinds || Object.keys(VARIANTS)) for (const v of VARIANTS[kind]) for (const color of opts.color ? [opts.color] : [1, 2]) {
        let ok = true;
        for (const [dx, dy, w] of v) {
          const c = at(x + dx, y + dy);
          if (w === 'X' ? c !== color : w === 'O' ? c !== 3 - color : c !== 0) { ok = false; break; }
        }
        if (!ok) continue;
        const pts = v.map(([dx, dy]) => (y + dy) * n + x + dx), stones = pts.filter((p, k) => v[k][2] === 'X');
        /* A link between stones that are already one group is nothing to point out; a cut needs two separate groups. */
        if (['diagonal', 'jump', 'knight', 'cut', 'crosscut'].includes(kind) && gid[stones[0]] === gid[stones[1]]) continue;
        const key = kind + color + pts.slice().sort((a, b) => a - b).join(',');
        if (keys.has(key)) continue;
        keys.add(key);
        const s = { kind, color, pts: pts.slice().sort((a, b) => a - b), stones, key };
        if (kind === 'cut') s.spot = pts[v.findIndex(p => p[2] === '.')];
        out.push(s);
      }
    }
    /* Eyes: an empty point whose neighbours are all one colour. False if the opponent holds too many of its diagonal corners. */
    for (let i = 0; i < n * n && !opts.kinds; i++) {
      if (board[i]) continue;
      const x = i % n, y = (i / n) | 0;
      if (nx >= 0 && (Math.abs(x - nx) > 3 || Math.abs(y - ny) > 3)) continue;
      const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => at(a, b) >= 0);
      const c = at(nb[0][0], nb[0][1]);
      if (!c || nb.some(([a, b]) => at(a, b) !== c)) continue;
      const diag = [[x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]].filter(([a, b]) => at(a, b) >= 0);
      const opp = diag.filter(([a, b]) => at(a, b) === 3 - c).length;
      const kind = opp >= (diag.length === 4 ? 2 : 1) ? 'falseeye' : 'eye';
      out.push({ kind, color: c, pts: [i, ...nb.map(([a, b]) => b * n + a)].sort((a, b) => a - b), stones: nb.map(([a, b]) => b * n + a), key: kind + c + i });
    }
    /* A shape whose points all sit inside a larger shape of the same colour adds nothing (e.g. the diagonals inside a tiger's mouth). */
    /* Leave out what adds nothing: a link (diagonal, jump, knight's move) whose stones are part of a bigger shape, such as the
       diagonals inside a tiger's mouth; an eye that is the centre of a ponnuki; and an "empty triangle" whose empty point is an eye. */
    const LINKS = ['diagonal', 'jump', 'knight', 'tiger'];
    return out.filter(s => {
      if (s.kind === 'cut') return !out.some(t => t.kind.endsWith('eye') && t.pts.find(p => !board[p]) === s.spot); /* the opponent cannot play inside an eye */
      if (LINKS.includes(s.kind)) return !out.some(t => t !== s && t.color === s.color && t.stones.length > s.stones.length && s.stones.every(p => t.stones.includes(p)));
      if (s.kind === 'eye') return !out.some(t => t.kind === 'ponnuki' && t.color === s.color && t.pts.includes(s.pts[0]) && s.pts.every(p => t.pts.includes(p)));
      if (s.kind === 'triangle') return !out.some(t => t.kind.endsWith('eye') && t.color === s.color && s.pts.includes(t.pts.find(p => !board[p])));
      return true;
    });
  }

  /* Shapes the side to move (`color`) could make with one legal move, of the kinds in POTENTIAL: good shapes first, then the
     nearest to the last move. At most one per move point, so the board stays readable. */
  function possible(E, s, color, max) {
    const n = s.n, g = E.geom(n), now = new Set(scan(n, s.board).map(x => x.key)), out = [], seen = new Set();
    for (let i = 0; i < n * n; i++) {
      if (s.board[i] || E.isOwnEye(g, s.board, i, color)) continue;
      const r = E.tryPlay(g, s.board, i, color, s.ko);
      if (!r.ok || r.captured.length) continue;
      for (const sh of scan(n, r.board, { near: i, kinds: POTENTIAL, color })) {
        if (!sh.pts.includes(i) || now.has(sh.key) || seen.has(sh.key)) continue;
        seen.add(sh.key);
        out.push(Object.assign(sh, { move: i, potential: true }));
        break;
      }
    }
    const f = s.last >= 0 ? s.last : (n * n - 1) / 2, d = i => Math.abs(i % n - f % n) + Math.abs(((i / n) | 0) - ((f / n) | 0));
    out.sort((a, b) => (KINDS[a.kind].tone === 'good' ? 0 : 1) - (KINDS[b.kind].tone === 'good' ? 0 : 1) || d(a.move) - d(b.move));
    return out.slice(0, max == null ? 6 : max);
  }

  /* One line for the chat. viewer decides "you"/"your". short leaves out the explanation of the kind of shape. */
  function describe(n, sh, viewer, short) {
    const K = KINDS[sh.kind], who = T(sh.color === viewer ? 'shapes.you' : sh.color === 1 ? 'shapes.black' : 'shapes.white');
    const whose = T(sh.color === viewer ? 'shapes.yours' : sh.color === 1 ? 'shapes.blacks' : 'shapes.whites');
    const tone = T('shapes.tone.' + K.tone);
    const where = sh.potential ? T('shapes.where-possible', { who, point: name(n, sh.move) }) : sh.kind === 'cut' ? T('shapes.where-cut', { whose, point: name(n, sh.spot) })
      : T('shapes.where-made', { whose, stones: sh.stones.map(p => name(n, p)).join(' ') });
    return T(short ? 'shapes.line-short' : 'shapes.line', { name: K.name, where, tone, text: K.text });
  }

  return { scan, possible, describe, KINDS, TERMS, name };
});
