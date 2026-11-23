/* Go Coach — recognising shapes on the board.
   Finds the classic shapes a beginner should know (good, bad, neutral and weak points), both those already on the board and
   those the side to move could make with one move. Pure rules: no random games, no network. Exposed as GoShapes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoShapes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const name = (n, i) => LETTERS[i % n] + (n - ((i / n) | 0));

  /* What each shape is called, whether it is good, and the idea behind it in a sentence or two. */
  const KINDS = {
    ponnuki: { name: 'Ponnuki', tone: 'good', text: 'The diamond left after capturing one stone. Very strong and influential: a proverb says a ponnuki is worth 30 points.' },
    tiger: { name: 'Tiger’s mouth', tone: 'good', text: 'Three stones around an empty point. A stone played inside can be captured at once, so the shape is safely connected and flexible.' },
    bamboo: { name: 'Bamboo joint', tone: 'good', text: 'Two pairs of stones with a gap between them. If the opponent pushes into one gap, you fill the other, so it can never be cut.' },
    diagonal: { name: 'Diagonal', tone: 'good', text: 'Two stones touching at a corner. If the opponent plays one connecting point you play the other, so they stay connected.' },
    jump: { name: 'One-point jump', tone: 'neutral', text: 'Stones one space apart. Quick, and hard to cut directly: "the one-point jump is never bad".' },
    knight: { name: 'Knight’s move', tone: 'neutral', text: 'Light and fast, but the opponent can push through the middle and try to cut it.' },
    triangle: { name: 'Empty triangle', tone: 'bad', text: 'Three stones in an L with the fourth point empty. Three stones doing the work of two, with fewer liberties: usually bad shape.' },
    dumpling: { name: 'Dumpling', tone: 'bad', text: 'Four stones in a solid block. Very slow: the stones are bunched up instead of claiming space.' },
    cut: { name: 'Cutting point', tone: 'weak', text: 'A weak spot: the opponent already touches this diagonal, so a stone on the marked point would cut the two stones apart.' },
    crosscut: { name: 'Crosscut', tone: 'weak', text: 'Both sides cut each other. A fighting shape: the side with stronger stones nearby usually comes out ahead.' },
    eye: { name: 'Eye', tone: 'neutral', text: 'An empty point surrounded by one colour. A group with two real eyes can never be captured.' },
    falseeye: { name: 'False eye', tone: 'weak', text: 'It looks like an eye, but the opponent holds the corners, so it can be filled. It does not count towards the two eyes a group needs.' }
  };
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
    const K = KINDS[sh.kind], who = sh.color === viewer ? 'you' : sh.color === 1 ? 'Black' : 'White';
    const whose = sh.color === viewer ? 'yours' : sh.color === 1 ? 'Black’s' : 'White’s';
    const tone = { good: 'good shape', bad: 'bad shape', neutral: 'shape', weak: 'weak point' }[K.tone];
    const where = sh.potential ? `${who} could make it by playing ${name(n, sh.move)}` : sh.kind === 'cut' ? `${whose}; the cut is at ${name(n, sh.spot)}` : `${whose}, ${sh.stones.map(p => name(n, p)).join(' ')}`;
    return short ? `${K.name} (${where}): ${tone}.` : `${K.name} (${where}): ${tone}. ${K.text}`;
  }

  return { scan, possible, describe, KINDS, name };
});
