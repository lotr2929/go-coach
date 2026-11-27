/* Go Coach — lessons from files (Boon, 27 Nov 2026): each lesson in the lessons/ folder is an SGF file, the standard format for
   Go problems, so anyone (or any Claude account) can write one without touching the program. lessons/README.md explains the
   format: GN title, DI difficulty (e.g. 18k), PL the player to move, AB/AW the stones, C the introduction; each branch is a try,
   and a try is right when its last comment starts with RIGHT. The opponent's answers are the moves inside a branch.
   This file reads a lesson and follows a player's moves through it; make-lessons.js and the tests use it to check every file,
   and lessonfiles.js uses it in the app. No network here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./sgf.js'));
  else root.GoProblems = factory(root.GoSGF);
})(typeof self !== 'undefined' ? self : this, function (SGF) {
  'use strict';

  /* "18k" -> 18, "2d" -> −1 (1 dan is 0 on the kyu scale, as in grade.js), "30 kyu" -> 30. null if unreadable. */
  function kyuOf(v) {
    const m = /^\s*(\d+)\s*([kd])/i.exec(v || '');
    if (!m) return null;
    return m[2].toLowerCase() === 'k' ? +m[1] : 1 - +m[1];
  }
  const isRight = c => /^\s*RIGHT\b/i.test(c || '');
  const clean = c => (c || '').replace(/^\s*RIGHT\b[\s:.!-]*/i, '').trim();

  /* The SGF tree as linked nodes: { B or W point, comment, kids }. */
  function link(tree, n) {
    const make = props => ({ props, kids: [] });
    function walk(t) {
      const nodes = t.nodes.map(make);
      for (let k = 0; k + 1 < nodes.length; k++) nodes[k].kids.push(nodes[k + 1]);
      const last = nodes[nodes.length - 1];
      for (const kid of t.kids) { const sub = walk(kid); if (sub && last) last.kids.push(sub); }
      return nodes[0];
    }
    const root = walk(tree);
    (function fill(nd) {
      const c = nd.props.B ? 1 : nd.props.W ? 2 : 0;
      nd.color = c; nd.point = c ? SGF.point((nd.props[c === 1 ? 'B' : 'W'] || [''])[0], n) : -1;
      nd.comment = (nd.props.C || [''])[0];
      nd.kids.forEach(fill);
    })(root);
    return root;
  }

  /* SGF text -> a lesson { id, title, kyu, n, turn, black, white, intro (paragraphs), task, root }, or null. */
  function fromSGF(text, id) {
    const tree = SGF.tree(text);
    if (!tree || !tree.nodes.length) return null;
    const r = tree.nodes[0], first = k => (r[k] && r[k][0] !== undefined ? r[k][0] : '');
    const n = parseInt(first('SZ'), 10) || 19;
    const root = link(tree, n);
    const paras = (first('C') || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const taskAt = paras.findIndex(p => /^task:/i.test(p));
    const task = taskAt >= 0 ? paras.splice(taskAt, 1)[0].replace(/^task:\s*/i, '') : '';
    const pl = first('PL').toUpperCase();
    return {
      id, n, root, title: first('GN').trim(), kyu: kyuOf(first('DI')),
      turn: pl === 'W' ? 2 : pl === 'B' ? 1 : (root.kids[0] && root.kids[0].color) || 1,
      black: SGF.points(r.AB, n), white: SGF.points(r.AW, n), intro: paras, task
    };
  }

  /* Follows the player's move from `at` (a node; the lesson's root at the start).
     Returns { result: 'right' | 'wrong' | 'go', at, reply, comment }: 'go' means the opponent answers with reply (a point) and
     the player moves again; comment is what the lesson says (empty: the app's own words). */
  function step(at, point) {
    const mine = at.kids.find(k => k.point === point);
    if (!mine) return { result: 'wrong', at, comment: '' };
    if (isRight(mine.comment)) return { result: 'right', at: mine, comment: clean(mine.comment) };
    const answer = mine.kids[0];
    if (!answer) return { result: 'wrong', at: mine, comment: clean(mine.comment) };
    if (isRight(answer.comment)) return { result: 'right', at: answer, reply: answer.point, comment: clean(answer.comment) };
    if (!answer.kids.length) return { result: 'wrong', at: answer, reply: answer.point, comment: clean(answer.comment || mine.comment) };
    return { result: 'go', at: answer, reply: answer.point, comment: clean(answer.comment || mine.comment) };
  }
  /* The first move of a right line, for the hint. */
  function hint(at) {
    const good = nd => isRight(nd.comment) || nd.kids.some(good);
    const k = at.kids.find(good);
    return k ? k.point : -1;
  }

  /* Everything wrong with a lesson, as sentences for the person who wrote it (empty when it is fine). E is engine.js. */
  function problemsWith(L, E) {
    const out = [];
    if (!L) return ['not an SGF lesson'];
    if (![9, 13, 19].includes(L.n)) out.push('SZ must be 9, 13 or 19');
    if (!L.title) out.push('GN (the title) is missing');
    if (L.kyu === null) out.push('DI (the difficulty, e.g. DI[18k]) is missing or unreadable');
    else if (L.kyu > 30 || L.kyu < -8) out.push('DI must be between 30k and 9d');
    if (!L.intro.length) out.push('C (the introduction) is missing on the first node');
    if (!L.root.kids.length) out.push('there are no tries (branches)');
    let rights = 0;
    const g = E.geom(L.n);
    (function walk(nd, board, turn, ko, path) {
      for (const k of nd.kids) {
        const where = path + (k.point >= 0 ? E.coord(L.n, k.point) : '?');
        if (k.color !== turn) { out.push(`${where}: expected ${turn === 1 ? 'Black' : 'White'} to move`); continue; }
        if (k.point < 0) { out.push(`${where}: a move must be on the board (no passes)`); continue; }
        const r = E.tryPlay(g, board, k.point, turn, ko);
        if (!r.ok) { out.push(`${where}: illegal move (${r.reason})`); continue; }
        if (isRight(k.comment)) rights++;
        if (!k.kids.length && !k.comment) out.push(`${where}: a try that ends needs a comment (RIGHT …, or why it is wrong)`);
        walk(k, r.board, 3 - turn, r.ko, where + ' ');
      }
    })(L.root, (() => { const b = new Array(L.n * L.n).fill(0); L.black.forEach(i => { b[i] = 1; }); L.white.forEach(i => { b[i] = 2; }); return b; })(), L.turn, -1, '');
    if (!rights) out.push('no try is marked RIGHT');
    return out;
  }

  return { kyuOf, fromSGF, step, hint, problemsWith, isRight };
});
