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

  /* What each shape is called, whether it is good, the idea in a sentence or two (text), the fuller explanation given when you
     tap the shape or ask about it (more), and the words a question may use for it (words). */
  const KINDS = {
    ponnuki: { name: 'Ponnuki', tone: 'good', words: ['ponnuki'],
      text: 'The diamond left after capturing one stone. Very strong and influential: a proverb says a ponnuki is worth 30 points.',
      more: 'A ponnuki is the diamond of four stones left after you capture a single stone: one stone above, below, left and right of the empty point. It has no cutting points, plenty of liberties and faces every direction, so its strength radiates across the board. The proverb says a ponnuki is worth 30 points: capturing a stone this way, especially early in the game, is usually a big gain even though only one stone was taken.' },
    tiger: { name: 'Tiger’s mouth', tone: 'good', words: ['tiger', "tiger's mouth", 'tigers mouth', 'tiger mouth', 'hanging connection'],
      text: 'Three stones around an empty point. A stone played inside can be captured at once, so the shape is safely connected and flexible.',
      more: 'A tiger’s mouth (also called a hanging connection) is three stones around one empty point, like an open mouth. If the opponent plays inside the mouth, that stone has only one liberty and you capture it at once. So the stones are as good as connected without spending a move to fill the point, and the shape stays light and flexible. Watch out for ko: if the opponent can play inside as a ko threat or sacrifice, the mouth can become a weakness.' },
    bamboo: { name: 'Bamboo joint', tone: 'good', words: ['bamboo', 'bamboo joint'],
      text: 'Two pairs of stones with a gap between them. If the opponent pushes into one gap, you fill the other, so it can never be cut.',
      more: 'A bamboo joint is two pairs of side-by-side stones with a gap between the pairs, like a joint in a bamboo stem. There are two ways through the gap: if the opponent pushes into one, you fill the other. So the shape can never be cut, and it uses no more stones than it needs. It is one of the strongest ways to connect.' },
    diagonal: { name: 'Diagonal', tone: 'good', words: ['diagonal', 'kosumi'],
      text: 'Two stones touching at a corner. If the opponent plays one connecting point you play the other, so they stay connected.',
      more: 'A diagonal (kosumi in Japanese) is two stones touching corner to corner. There are two empty points that would join them. If the opponent plays on one, you play the other, so the stones cannot be cut. It is slow but very solid. If the opponent already holds one of the two points, the other one becomes a cutting point.' },
    jump: { name: 'One-point jump', tone: 'neutral', words: ['one point jump', 'ikken tobi', 'jump'],
      text: 'Stones one space apart. Quick, and hard to cut directly: "the one-point jump is never bad".',
      more: 'A one-point jump (ikken tobi) is two stones on the same line with one empty point between them. It moves quickly into open space, and the opponent cannot cut it directly: a stone pushed into the gap can be blocked from either side. A proverb says "the one-point jump is never bad".' },
    knight: { name: 'Knight’s move', tone: 'neutral', words: ['knight', "knight's move", 'knights move', 'knight move', 'keima'],
      text: 'Light and fast, but the opponent can push through the middle and try to cut it.',
      more: 'A knight’s move (keima) is two stones placed like a knight in chess: one step one way and two steps the other. It is a fast, light way to approach or run, but it is thinner than a one-point jump: the opponent can push into one of the two middle points and try to cut through at the other.' },
    triangle: { name: 'Empty triangle', tone: 'bad', words: ['empty triangle', 'triangle'],
      text: 'Three stones in an L with the fourth point empty. Three stones doing the work of two, with fewer liberties: usually bad shape.',
      more: 'An empty triangle is three of your stones in an L, with the fourth corner of the little square empty. The three stones have fewer liberties than three stones spread out and cover less ground, so you have used three stones to do the work of two. It is the most famous bad shape. Sometimes it is the only way to escape or connect, so it is not always wrong, but look for a better move first.' },
    dumpling: { name: 'Dumpling', tone: 'bad', words: ['dumpling'],
      text: 'Four stones in a solid block. Very slow: the stones are bunched up instead of claiming space.',
      more: 'A dumpling is four of your stones in a solid 2×2 block. They are safe but very slow: four stones that claim almost no space and have only eight liberties between them. It usually happens when you keep answering the opponent’s pushes. Aim for shapes that cover more ground with the same stones.' },
    cut: { name: 'Cutting point', tone: 'weak', words: ['cutting point', 'cutting points'],
      text: 'A weak spot: the opponent already touches this diagonal, so a stone on the marked point would cut the two stones apart.',
      more: 'A cutting point is an empty point where the opponent could separate two of your groups. Here your two stones touch only at a corner, and the opponent already holds one of the two points between them, so a stone on the other point cuts them apart. Either connect there, or make sure each part can look after itself.' },
    crosscut: { name: 'Crosscut', tone: 'weak', words: ['crosscut', 'cross cut'],
      text: 'Both sides cut each other. A fighting shape: the side with stronger stones nearby usually comes out ahead.',
      more: 'A crosscut is two of your stones and two of the opponent’s crossing diagonally in a square, so each side cuts the other. It starts a fight. The proverb "when in doubt, extend from a crosscut" means: add a stone straight out from one of your cut stones to give it more liberties.' },
    eye: { name: 'Eye', tone: 'neutral',
      text: 'An empty point surrounded by one colour. A group with two real eyes can never be captured.',
      more: 'An eye is an empty point completely surrounded by one colour. The opponent may play there only if it captures. A group with two separate real eyes can never be captured, because the opponent would have to fill both at once. Making two eyes is the key to life and death.' },
    falseeye: { name: 'False eye', tone: 'weak', words: ['false eye', 'false eyes'],
      text: 'It looks like an eye, but the opponent holds the corners, so it can be filled. It does not count towards the two eyes a group needs.',
      more: 'A false eye looks like an eye, but the opponent holds enough of its diagonal corners (two in the middle of the board, one on the edge) that the stones around it can be put in atari and captured. When that happens the "eye" disappears. A group needs two real eyes; false eyes do not count.' }
  };
  /* Answers for "what is a ponnuki?" and the like, used by the coach (coach.js). */
  const TERMS = [
    ...Object.values(KINDS).filter(k => k.words).map(k => ({ w: k.words, t: k.more + ' Turn on the Shapes tab under the board and I will mark these for you.' })),
    { w: ['shape', 'shapes', 'good shape', 'bad shape'], t: 'Shape means how your stones are arranged. Good shape (tiger’s mouth, bamboo joint, ponnuki) uses few stones to be strong and connected; bad shape (empty triangle, dumpling) wastes stones. Turn on the Shapes tab under the board and I will mark the shapes on the board; tap a marked stone and I will explain its shape.' }
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
    const K = KINDS[sh.kind], who = sh.color === viewer ? 'you' : sh.color === 1 ? 'Black' : 'White';
    const whose = sh.color === viewer ? 'yours' : sh.color === 1 ? 'Black’s' : 'White’s';
    const tone = { good: 'good shape', bad: 'bad shape', neutral: 'shape', weak: 'weak point' }[K.tone];
    const where = sh.potential ? `${who} could make it by playing ${name(n, sh.move)}` : sh.kind === 'cut' ? `${whose}; the cut is at ${name(n, sh.spot)}` : `${whose}, ${sh.stones.map(p => name(n, p)).join(' ')}`;
    return short ? `${K.name} (${where}): ${tone}.` : `${K.name} (${where}): ${tone}. ${K.text}`;
  }

  return { scan, possible, describe, KINDS, TERMS, name };
});
