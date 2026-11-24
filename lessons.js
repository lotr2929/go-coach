/* Go Coach — lessons. Every lesson is played on the full 9×9 board.
   The wording (titles, explanations, tasks, quiz options and the replies below) is in docs/text/en/lessons.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), require('./text.js'));
  else root.GoLessons = factory(root.GoEngine, root.GoText);
})(typeof self !== 'undefined' ? self : this, function (E, TX) {
  'use strict';
  const { T } = TX;

  const N = 9;
  const P = (n, x, y) => y * n + x;
  const H = {
    libsAt(s, x, y) { return E.flood(E.geom(s.n), s.board, P(s.n, x, y)).libs.length; },
    libsOf(s, i) { return E.flood(E.geom(s.n), s.board, i).libs.length; },
    at(s, x, y) { return s.board[P(s.n, x, y)]; }
  };
  /* A lesson picture is drawn on a small patch of the board (about 5 points across). at(ox, oy) moves the patch to where it sits on the 9×9 board:
     xy and pts move points, i gives a board index, key moves the "x,y" keys of marks. */
  const at = (ox, oy) => ({
    xy: (x, y) => [x + ox, y + oy],
    pts: a => a.map(([x, y]) => [x + ox, y + oy]),
    i: (x, y) => P(N, x + ox, y + oy),
    key: m => { const o = {}; for (const k of Object.keys(m)) { const [x, y] = k.split(',').map(Number); o[(x + ox) + ',' + (y + oy)] = m[k]; } return o; }
  });
  const M = at(2, 2), K = at(0, 0); /* M: the middle of the board. K: the top-left corner, for the lesson that needs a corner. */
  const win = msg => ({ status: 'win', msg });
  const fail = msg => ({ status: 'fail', msg });
  const say = msg => ({ status: null, msg });
  const wall = (x, y0, y1) => { const a = []; for (let y = y0; y <= y1; y++) a.push([x, y]); return a; };

  const REASONS = {
    occupied: T('lessons.reason.occupied'),
    ko: T('lessons.reason.ko'),
    suicide: T('lessons.reason.suicide')
  };

  const list = [
    {
      id: 'board', n: N, turn: 1,
      hint: [[4, 4]],
      solution: [[4, 4], [2, 2], [6, 6], [2, 6]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.moves.length >= 4 ? win(T('lessons.board.done')) : say(T('lessons.board.progress', { count: s.moves.length }));
      }
    },
    {
      id: 'liberties', n: N, turn: 1, solo: true, libs: true,
      hint: [[0, 0]],
      solution: [[2, 2], [0, 0]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const l = H.libsOf(s, ev.point);
        if (l === 2) return win(T('lessons.liberties.done'));
        return say(T(l >= 4 ? 'lessons.liberties.middle' : 'lessons.liberties.edge', { count: l }));
      }
    },
    {
      id: 'capture', n: N, turn: 1, solo: true, libs: true,
      black: M.pts([[1, 2], [2, 1], [3, 2]]), white: M.pts([[2, 2]]),
      hint: M.pts([[2, 3]]),
      solution: M.pts([[2, 3]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.caps[1] >= 1 ? win(T('lessons.capture.done')) : say(T('lessons.capture.not-yet'));
      }
    },
    {
      id: 'groups', n: N, turn: 1, solo: true, libs: true,
      black: M.pts([[2, 1], [1, 2], [3, 2], [1, 3], [3, 3]]), white: M.pts([[2, 2], [2, 3]]),
      hint: M.pts([[2, 4]]),
      solution: M.pts([[2, 4]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.caps[1] >= 2 ? win(T('lessons.groups.done')) : say(T('lessons.groups.not-yet'));
      }
    },
    {
      id: 'atari', n: N, turn: 1, solo: true, libs: true,
      black: M.pts([[2, 2]]), white: M.pts([[2, 1], [1, 2], [3, 2]]),
      hint: M.pts([[2, 3]]),
      solution: M.pts([[2, 3]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const [x, y] = M.xy(2, 2);
        if (H.at(s, x, y) === 1 && H.libsAt(s, x, y) >= 2) return win(T('lessons.atari.done'));
        return fail(T('lessons.atari.failed'));
      }
    },
    {
      id: 'suicide', n: N, turn: 1,
      white: M.pts([[2, 1], [1, 2], [3, 2], [2, 3]]),
      marks: M.key({ '2,2': 'A' }),
      hint: M.pts([[2, 2]]),
      solution: M.pts([[2, 2]]),
      check(s, ev) {
        if (ev.type === 'illegal' && ev.point === M.i(2, 2) && ev.reason === 'suicide') return win(T('lessons.suicide.done'));
        if (ev.type === 'move') return say(T('lessons.suicide.legal'));
        return null;
      }
    },
    {
      id: 'exception', n: N, turn: 1, solo: true,
      black: M.pts([[2, 0], [1, 1], [3, 1]]), white: M.pts([[2, 1], [1, 2], [3, 2], [2, 3]]),
      marks: M.key({ '2,2': 'A' }),
      hint: M.pts([[2, 2]]),
      solution: M.pts([[2, 2]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.caps[1] >= 1 ? win(T('lessons.exception.done')) : say(T('lessons.exception.not-yet'));
      }
    },
    {
      id: 'ko', n: N, turn: 1,
      black: M.pts([[2, 1], [2, 3], [1, 2]]), white: M.pts([[2, 2], [3, 1], [3, 3], [4, 2]]),
      marks(s) { return s.moves.length === 0 ? M.key({ '3,2': 'A' }) : M.key({ '2,2': 'B' }); },
      hint(s) { return M.pts(s.moves.length === 0 ? [[3, 2]] : [[2, 2]]); },
      solution: M.pts([[3, 2], [2, 2]]),
      check(s, ev) {
        if (ev.type === 'illegal' && ev.reason === 'ko') return win(T('lessons.ko.done'));
        if (ev.type === 'move' && s.moves.length === 1 && ev.point === M.i(3, 2)) return say(T('lessons.ko.captured'));
        if (ev.type === 'move') return say(T('lessons.ko.elsewhere'));
        return null;
      }
    },
    {
      id: 'eyes', n: N, turn: 2, solo: true, libs: true,
      black: K.pts([[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 0]]),
      white: K.pts([[4, 0], [4, 1], [4, 2], [3, 2], [2, 2], [1, 2], [0, 2]]),
      marks: K.key({ '0,0': 'A', '2,0': 'B' }),
      hint: K.pts([[0, 0], [2, 0]]),
      solution: K.pts([[0, 0], [2, 0]]),
      check(s, ev) {
        if (ev.type === 'illegal' && ev.reason === 'suicide' && (ev.point === K.i(0, 0) || ev.point === K.i(2, 0))) {
          s.data = s.data || { tried: [] };
          if (!s.data.tried.includes(ev.point)) s.data.tried.push(ev.point);
          if (s.data.tried.length >= 2) return win(T('lessons.eyes.done'));
          return say(T('lessons.eyes.refused'));
        }
        if (ev.type === 'move') return say(T('lessons.eyes.legal'));
        return null;
      }
    },
    {
      id: 'connect', n: N, turn: 1, solo: true,
      black: M.pts([[1, 1], [2, 2]]), white: M.pts([[3, 1], [1, 3]]),
      marks: M.key({ '2,1': 'A', '1,2': 'B' }),
      hint: M.pts([[2, 1]]),
      solution: M.pts([[2, 1]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const g = E.flood(E.geom(s.n), s.board, M.i(1, 1));
        return g.stones.includes(M.i(2, 2)) ? win(T('lessons.connect.done')) : say(T('lessons.connect.not-yet'));
      }
    },
    {
      id: 'cut', n: N, turn: 2, solo: true,
      black: M.pts([[1, 1], [2, 2]]), white: M.pts([[3, 1], [1, 3]]),
      marks: M.key({ '2,1': 'A', '1,2': 'B' }),
      hint: M.pts([[2, 1]]),
      solution: M.pts([[2, 1]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const g = E.flood(E.geom(s.n), s.board, M.i(1, 1));
        return g.stones.includes(M.i(2, 2)) ? say(T('lessons.cut.not-yet')) : win(T('lessons.cut.done'));
      }
    },
    {
      id: 'tiger', n: N, turn: 1, solo: true,
      black: M.pts([[1, 2], [3, 2]]), white: M.pts([[2, 4]]),
      marks: M.key({ '2,1': 'A', '2,2': 'B' }),
      hint: M.pts([[2, 1]]),
      solution: M.pts([[2, 1]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        if (ev.point === M.i(2, 1) || ev.point === M.i(2, 3)) return win(T('lessons.tiger.done')); /* a tiger's mouth either way round */
        if (ev.point === M.i(2, 2)) return say(T('lessons.tiger.solid'));
        return say(T('lessons.tiger.not-yet'));
      }
    },
    {
      id: 'triangle', n: N, type: 'quiz',
      black: M.pts([[1, 1], [2, 1]]),
      marks: M.key({ '1,2': 'A', '3,2': 'B', '1,3': 'C' }),
      answer: 0 /* the first option in lessons.md: A */
    },
    {
      id: 'scoring', n: N, type: 'quiz',
      black: wall(3, 0, 8), white: wall(4, 0, 8),
      answer: 1 /* the second option in lessons.md */
    },
    {
      /* A black wall with a gap at (3, 4), a white wall two columns away: Black's side counts only once the gap is closed. */
      id: 'border', n: N, turn: 1, solo: true,
      black: wall(3, 0, 3).concat(wall(3, 5, 8)), white: wall(5, 0, 8),
      hint: [[3, 4]],
      solution: [[3, 4]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return E.scoreArea(s.n, s.board).terr[P(s.n, 1, 4)] === 1 ? win(T('lessons.border.done')) : say(T('lessons.border.not-yet'));
      }
    },
    {
      id: 'dame', n: N, type: 'quiz',
      black: wall(3, 0, 8), white: wall(5, 0, 8),
      marks: { '4,4': 'A', '1,4': 'B' },
      answer: 2 /* the third option in lessons.md: nobody's */
    },
    {
      id: 'ending', n: N, type: 'quiz',
      black: wall(3, 0, 8), white: wall(5, 0, 8),
      answer: 0 /* the first option in lessons.md */
    },
    {
      /* Both pairs have exactly two liberties and the walls around them are strong, so the side to move wins (test.js plays it out). */
      id: 'race', n: N, type: 'quiz',
      black: K.pts([[1, 0], [1, 1], [2, 2], [3, 2], [4, 2], [4, 1], [4, 0]]),
      white: K.pts([[2, 0], [2, 1], [0, 2], [1, 2], [1, 3], [0, 3]]),
      marks: K.key({ '0,0': 'B', '0,1': 'B', '3,0': 'W', '3,1': 'W' }),
      answer: 0 /* the first option in lessons.md: Black */
    },
    {
      /* Black's atari at A starts a ladder towards the bottom right; the white stone at X (G3) breaks it (test.js reads it out both ways). */
      id: 'ladder', n: N, type: 'quiz',
      black: [[1, 2], [2, 1], [3, 1]], white: [[2, 2], [6, 6]],
      marks: { '2,3': 'A', '6,6': 'X' },
      answer: 1 /* the second option in lessons.md: no */
    },
    {
      /* White E5 has two liberties; atari on either lets it run, and only the net at D4 captures (test.js reads every reply). */
      id: 'net', n: N, turn: 1, solo: true,
      black: [[3, 3], [4, 3], [5, 4], [5, 5]], white: [[4, 4]],
      hint: [[3, 5]],
      solution: [[3, 5]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        if (ev.point === P(N, 3, 5)) return win(T('lessons.net.done'));
        if (ev.point === P(N, 3, 4) || ev.point === P(N, 4, 5)) return say(T('lessons.net.atari'));
        return say(T('lessons.net.not-yet'));
      }
    },
    {
      id: 'handicap', n: N, type: 'info',
      black: [[6, 2], [2, 6]]
    },
    {
      id: 'strategy', n: N, type: 'info',
      marks: { '2,2': '★', '6,2': '★', '2,6': '★', '6,6': '★' }
    },
    {
      id: 'firstmove', n: N, turn: 1,
      hint: [[2, 2]],
      solution: [[2, 2]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const n = s.n, x = ev.point % n, y = (ev.point / n) | 0;
        const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
        const corner = Math.min(x, n - 1 - x) <= 3 && Math.min(y, n - 1 - y) <= 3;
        if (edge >= 2 && edge <= 3 && corner) return win(T('lessons.firstmove.done'));
        if (edge <= 1) return fail(T('lessons.firstmove.low'));
        if (!corner) return fail(T('lessons.firstmove.away'));
        return fail(T('lessons.firstmove.close'));
      }
    }
  ];
  /* Each lesson's title, explanation (one paragraph per blank line), task and, for a quiz, its options, from lessons.md. */
  for (const L of list) {
    const w = part => T(`lessons.${L.id}.${part}`);
    L.title = w('title');
    L.text = w('text').split(/\n\n+/);
    L.task = TX.has(`lessons.${L.id}.task`) ? w('task') : '';
    if (L.type === 'quiz') { L.options = w('options').split('\n'); L.wrong = w('wrong'); L.explain = w('explain'); }
  }

  /* The lessons in chapters that follow the skills in "What is Go?", from the simplest to the most complex.
     The list is put in chapter order, which is also the order of the lessons menu and of "lesson 12" (coach.js LESSON_IDS). */
  const CHAPTERS = [
    { key: 'basics', ids: ['board', 'liberties', 'capture', 'groups'] },
    { key: 'tactics', ids: ['atari', 'suicide', 'exception', 'ko', 'eyes'] },
    { key: 'formations', ids: ['connect', 'cut', 'tiger', 'triangle'] },
    { key: 'terrain', ids: ['scoring', 'border', 'dame', 'ending'] },
    { key: 'reading', ids: ['race', 'ladder', 'net'] },
    { key: 'campaign', ids: ['strategy', 'firstmove', 'handicap'] }
  ];
  for (const c of CHAPTERS) { c.title = T(`lessons.chapter.${c.key}.title`); c.intro = T(`lessons.chapter.${c.key}.intro`); }
  const order = CHAPTERS.flatMap(c => c.ids);
  list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const chapterOf = id => CHAPTERS.find(c => c.ids.includes(id));

  function setup(L) {
    const s = E.newState(L.n, 0);
    for (const [x, y] of L.black || []) s.board[P(L.n, x, y)] = 1;
    for (const [x, y] of L.white || []) s.board[P(L.n, x, y)] = 2;
    s.turn = L.turn || 1;
    s.data = { tried: [] };
    return s;
  }
  function handle(L, s, i) {
    const r = E.play(s, i);
    let ev;
    if (!r.ok) ev = { type: 'illegal', reason: r.reason, point: i };
    else {
      ev = { type: 'move', point: i, captured: r.captured.length };
      if (L.solo) s.turn = L.turn || 1;
    }
    const out = (L.check && L.check(s, ev)) || {};
    if (!out.msg && ev.type === 'illegal') out.msg = REASONS[ev.reason] || T('lessons.reason.illegal');
    return { ev, status: out.status || null, msg: out.msg || '' };
  }
  function toIdx(L, pts) { return (pts || []).map(([x, y]) => P(L.n, x, y)); }
  function hintPoints(L, s) { return toIdx(L, typeof L.hint === 'function' ? L.hint(s) : L.hint); }
  function marksFor(L, s) {
    const m = typeof L.marks === 'function' ? L.marks(s) : (L.marks || {});
    const out = {};
    for (const k of Object.keys(m)) { const [x, y] = k.split(',').map(Number); out[P(L.n, x, y)] = m[k]; }
    return out;
  }

  return { list, CHAPTERS, chapterOf, setup, handle, hintPoints, marksFor, P };
});
