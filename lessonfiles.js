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

  /* A lesson file as a lesson for learn.js: its stones, its words, and check(), which follows the moves through the file. */
  function asLesson(P, entry) {
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
    const done = G.Lesson.done, items = [{ head: true, label: T('files-head'), note: T('files-note') }];
    let band = null;
    for (const e of index) {
      if (e.band !== band) { band = e.band; items.push({ head: true, label: T('band-head', { band }) }); }
      const id = 'file:' + e.id;
      items.push({ label: T('file-label', { mark: done.has(id) ? '✓' : '•', grade: gradeText(e.kyu), title: e.title }), done: done.has(id), run: () => openFile(e) });
    }
    return items;
  }

  loadIndex(); loadIndex('puzzles'); /* so both are kept for offline use */
  Object.assign(G, { lessonFiles: { loadIndex, openFile, openNext, menuItems, gradeText } });
})();
