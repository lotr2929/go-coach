/* Go Coach — the lessons in the lessons/ folder (Boon, 27 Nov 2026): the list (lessons/index.json, built by make-lessons.js)
   and each lesson's SGF file are fetched from Go Coach's own site when needed, and kept for offline use by the app's cache.
   This is the one file that fetches lessons (the third exception to rule 2): it sends nothing about the player.
   A lesson runs in the usual lesson view (learn.js): it is added to the list of lessons when opened, and counts towards the
   Go Coach grade at its own difficulty (its DI). problems.js reads the file and follows the player's moves. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, LS } = G;
  const PR = window.GoProblems;
  const T = (k, v) => window.GoText.T('learn.' + k, v); /* wording: docs/text/en/learn.md */
  const XY = (n, i) => [i % n, (i / n) | 0];
  const cache = {}; /* kind ('lessons' or 'puzzles') -> { index, loading } */

  function loadIndex(kind = 'lessons') {
    const c = cache[kind] || (cache[kind] = { index: null, loading: null });
    if (c.index) return Promise.resolve(c.index);
    if (!c.loading) {
      c.loading = fetch(kind + '/index.json', { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(j => { c.index = j.lessons || []; return c.index; })
        .catch(() => { c.loading = null; return null; });
    }
    return c.loading;
  }
  const gradeText = k => (k >= 1 ? T('file-kyu', { n: k }) : T('file-dan', { n: 1 - k }));

  /* A lesson game (TY[story]) for learn.js: the player taps their moves, marked by a circle unless the note says "Your turn:";
     the opponent's answers follow from the file. A move that is not the game's is taken back, or, if the file shows what follows it,
     played out until the player takes it back. Hint shows the top moves (A to E). Next plays on to the next "Your turn". */
  function asStory(P, entry) {
    const at = s => (s.data && s.data.at) || P.root;
    const line = (nd, num) => { const t = PR.note(nd.comment), w = { num, colour: G.colourName(nd.color), point: E.coord(P.n, nd.point) }; return t ? T('story-move', Object.assign(w, { note: t })) : T('story-move-plain', w); };
    return {
      id: 'file:' + entry.id, file: true, story: true, n: P.n, turn: P.turn, kyu: P.kyu,
      black: [], white: [], title: P.title, text: P.intro, task: P.task, problem: P,
      /* The circle on the game's next move, unless the player is to find it alone (or has finished). */
      follow: s => { const nd = at(s); return nd.kids[0] && !PR.yourTurn(nd) && !s.data.wrong ? [nd.kids[0].point] : []; },
      /* The top moves at this point, as marks A to E, while the player has asked for them. */
      marks: s => { const o = {}; if (s.data && s.data.best) for (const m of PR.bestMoves(at(s), P.n)) { const [x, y] = XY(P.n, m.point); o[x + ',' + y] = m.label; } return o; },
      bestHint(s) {
        const nd = at(s), moves = PR.bestMoves(nd, P.n);
        if (!moves.length || !nd.kids.length) return T('no-hint');
        s.data.best = true;
        const words = PR.bestWords(nd);
        return T('story-best', { moves: moves.map(m => m.label + ' ' + E.coord(P.n, m.point)).join(', ') }) + (words ? '\n\n' + words : '');
      },
      check(s, ev) {
        if (ev.type !== 'move') return null;
        if (s.data.wrong) { E.undo(s); return { msg: T('story-take-back-first') }; }
        const from = at(s), r = PR.storyStep(from, ev.point);
        if (!r.ok && !r.side) { E.undo(s); return { msg: T(PR.yourTurn(from) ? 'story-try' : 'story-follow') }; }
        if (!r.ok) { /* a mistake the file shows: play it out, then the player takes it back */
          const out = [line(r.side, s.moves.length)];
          let k = 1;
          for (let nd = r.side.kids[0]; nd; nd = nd.kids[0], k++) { E.play(s, nd.point); out.push(line(nd, s.moves.length)); }
          s.data.wrong = k; s.data.best = false;
          return { msg: out.join('\n\n') + '\n\n' + T('story-mistake') };
        }
        return advance(s, r);
      },
      /* The Next button before the end: Take back after a mistake; otherwise Play on to the next "Your turn" (or the end). */
      nextKey: s => (s.data.wrong ? 'story-take-back' : 'story-play-on'),
      canNext: s => !!s.data.wrong || (at(s).kids.length > 0 && !PR.yourTurn(at(s))),
      next(s) {
        if (s.data.wrong) { for (let k = 0; k < s.data.wrong; k++) E.undo(s); s.data.wrong = 0; return { msg: T('story-back') }; }
        const out = [];
        let res = null;
        while (at(s).kids.length && !PR.yourTurn(at(s))) {
          const nd = at(s).kids[0];
          E.play(s, nd.point);
          res = advance(s, PR.storyStep(at(s), nd.point));
          out.push(res.msg);
          if (res.status) break;
        }
        return { status: res && res.status, msg: out.join('\n\n') };
      }
    };
    /* The player's move was the game's: the opponent's answer follows. */
    function advance(s, r) {
      s.data.at = r.at; s.data.best = false;
      const out = [line(r.mine, s.moves.length)];
      if (r.reply) { E.play(s, r.reply.point); out.push(line(r.reply, s.moves.length)); }
      if (r.end) return { status: 'win', msg: out.join('\n\n') + '\n\n' + T('story-end') };
      return { msg: out.join('\n\n') };
    }
  }

  /* A lesson file as a lesson for learn.js: its stones, its words, and check(), which follows the moves through the file. */
  function asLesson(P, entry) {
    if (P.story) return asStory(P, entry);
    const pz = entry.file.startsWith('puzzles/'); /* a puzzle (Puzzle mode), not a lesson */
    const pairs = pts => pts.map(i => XY(P.n, i));
    return {
      id: 'file:' + entry.id, file: true, puzzle: pz, n: P.n, turn: P.turn, kyu: P.kyu,
      black: pairs(P.black), white: pairs(P.white), title: P.title, text: P.intro, task: P.task, problem: P,
      hint: s => { const h = PR.hint((s.data && s.data.at) || P.root); return h >= 0 ? [XY(P.n, h)] : []; },
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const r = PR.step(s.data.at || P.root, ev.point);
        s.data.at = r.at;
        if (r.reply >= 0) E.play(s, r.reply); /* the opponent's answer from the file */
        const where = r.reply >= 0 ? E.coord(P.n, r.reply) : '';
        if (r.result === 'right') return { status: 'win', msg: r.comment || T('problem-right') };
        if (r.result === 'wrong') return { status: 'fail', msg: (r.comment ? r.comment + '\n' + T(pz ? 'puzzle-again' : 'problem-again') : T(pz ? 'puzzle-wrong' : 'problem-wrong')) };
        return { msg: r.comment ? r.comment + '\n' + T('problem-your-move') : T('problem-reply', { point: where }) };
      }
    };
  }

  async function openFile(entry) {
    let P = null;
    try {
      const res = await fetch(entry.file, { cache: 'no-cache' });
      if (res.ok) P = PR.fromSGF(await res.text(), entry.id);
    } catch (e) { /* offline and not kept yet */ }
    if (!P) { G.say(T('files-failed')); return; }
    const L = asLesson(P, entry);
    let i = LS.list.findIndex(x => x.id === L.id);
    if (i < 0) { LS.list.push(L); i = LS.list.length - 1; } else LS.list[i] = L;
    G.openLesson(i);
  }
  /* "Next lesson" after a lesson file: the next one in the list (easiest first). */
  async function openNext(id) {
    if (G.gcMode && G.gcMode.on) return G.gcMode.next(id); /* Go Coach mode: the next lesson at the player's grade */
    const idx = await loadIndex();
    const k = idx ? idx.findIndex(e => 'file:' + e.id === id) : -1;
    if (k >= 0 && k + 1 < idx.length) return openFile(idx[k + 1]);
    G.exitLesson();
    G.say(T('files-end'));
  }
  /* The menu lines for the lessons by grade (learn.js showMenu): a heading per grade band, then the lessons. */
  function menuItems() {
    const index = cache.lessons && cache.lessons.index;
    if (!index || !index.length) return [];
    const done = G.Lesson.done, items = [];
    const item = e => { const id = 'file:' + e.id; return { label: T('file-label', { mark: done.has(id) ? '✓' : '•', grade: gradeText(e.kyu), title: e.title }), done: done.has(id), run: () => openFile(e) }; };
    const games = index.filter(e => e.story); /* the lesson games first, under their own heading */
    if (games.length) items.push({ head: true, label: T('games-head'), note: T('games-note') }, ...games.map(item));
    items.push({ head: true, label: T('files-head'), note: T('files-note') });
    let band = null;
    for (const e of index.filter(x => !x.story)) {
      if (e.band !== band) { band = e.band; items.push({ head: true, label: T('band-head', { band }) }); }
      items.push(item(e));
    }
    return items;
  }

  loadIndex(); loadIndex('puzzles'); /* so both are kept for offline use */
  Object.assign(G, { lessonFiles: { loadIndex, openFile, openNext, menuItems, gradeText } });
})();
