/* Go Coach — lessons. The coach lists them in the chat and the chosen lesson runs on the main board. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, LS, $, KEY, load, store, click, Play, playView } = G;
  const say = text => { if (G.say && text) G.say(text); };
  const T = (k, v) => window.GoText.T('learn.' + k, v); /* wording: docs/text/en/learn.md */
  const CHIPS = ['Explain more', 'Hint', 'Why is that?', 'Next lesson', 'Lessons', 'Back to game'];

  const Lesson = { on: false, idx: -1, s: null, status: null, answered: false, hintPts: [], done: new Set(load(KEY.done, [])) };

  /* The lessons by chapter: each chapter is a skill from "What is Go?", in order from the simplest. */
  function showMenu() {
    const items = [];
    LS.CHAPTERS.forEach((c, k) => {
      items.push({ head: true, label: T('chapter-head', { count: k + 1, title: c.title }), note: c.intro });
      for (const id of c.ids) {
        const i = LS.list.findIndex(L => L.id === id), L = LS.list[i];
        items.push({ label: `${Lesson.done.has(id) ? '✓' : i + 1}  ${L.title}`, done: Lesson.done.has(id), run: () => openLesson(i) });
      }
    });
    if (G.lessonFiles) items.push(...G.lessonFiles.menuItems()); /* the lessons by grade, from the lessons/ folder */
    G.chatMenu(items, T('menu-title'));
  }
  function openLesson(i) {
    if (Play.thinking) return say(window.GoText.T('app.busy-thinking'));
    if (G.kifu && G.kifu.on) G.exitKifu(true);
    if (G.setupOn && G.setupOn()) G.leaveSetup();
    const L = LS.list[i];
    Lesson.on = true; Lesson.idx = i; Lesson.s = LS.setup(L); Lesson.status = null; Lesson.answered = false; Lesson.hintPts = []; Lesson.hinted = false;
    const q = $('#quizOptions'); q.innerHTML = '';
    if (L.type === 'quiz') {
      L.options.forEach((o, k) => {
        const b = document.createElement('button'); b.textContent = o;
        b.addEventListener('click', () => answerQuiz(k, b));
        q.append(b);
      });
    }
    G.setChips(CHIPS);
    const ch = LS.chapterOf(L.id);
    if (L.file) say(T('heading-file', { title: L.title, grade: G.lessonFiles.gradeText(L.kyu) }) + '\n\n' + L.text.join('\n\n'));
    else say(T(ch ? 'heading-chapter' : 'heading', { count: i + 1, total: LS.CORE, title: L.title, chapter: ch ? ch.title : '' }) + '\n\n' + L.text.join('\n\n'));
    say((L.task ? T('task', { task: L.task }) + '\n' : '') + T('ask-me'));
    renderLesson();
  }
  function exitLesson() {
    if (!Lesson.on) return;
    Lesson.on = false; Lesson.hintPts = [];
    G.setChips(G.PLAY_CHIPS);
    G.renderPlay();
    say(window.GoText.T('app.back-to-game'));
  }
  function renderLesson() {
    const L = LS.list[Lesson.idx], s = Lesson.s;
    let terr = null;
    if (L.type === 'quiz' && Lesson.answered) terr = E.scoreArea(s.n, s.board).terr;
    $('#scorePanel').hidden = true; $('#controls').hidden = true; $('#chat').hidden = false;
    $('#lessonBar').hidden = false; $('#quizOptions').hidden = L.type !== 'quiz';
    playView.set({
      n: s.n, board: s.board, last: s.last, ko: s.ko, coords: false, libs: !!L.libs,
      marks: LS.marksFor(L, s), markColor: s.turn, hint: Lesson.hintPts, ghost: -1, hoverColor: 0, terr, dead: null, own: null, shapes: null
    });
    $('#whoTurn').textContent = L.file ? T('who-file', { title: L.title, grade: G.lessonFiles.gradeText(L.kyu) }) : T('heading', { count: Lesson.idx + 1, total: LS.CORE, title: L.title });
    $('#capsInfo').textContent = '';
    $('#posInfo').hidden = true;
    const isTask = !L.type;
    $('#btnLHint').hidden = !isTask; $('#btnLReset').hidden = !isTask;
    const next = $('#btnLNext');
    const last = !L.file && Lesson.idx === LS.CORE - 1;
    next.textContent = T(last ? 'play-a-game' : 'next');
    next.disabled = !(L.type === 'info' || Lesson.status === 'win');
    next.classList.toggle('primary', !next.disabled);
  }
  /* A lesson's difficulty for the grade: a lesson file's own (DI), or the built-in lessons' place from 30 to 18 kyu. */
  const kyuOf = L => (L.file ? L.kyu : window.GoGrade.lessonKyu(LS.list.indexOf(L), LS.CORE));
  function markDone(L) {
    Lesson.done.add(L.id); store(KEY.done, [...Lesson.done]);
  }
  function onLessonTap(i) {
    const L = LS.list[Lesson.idx];
    if (!L || L.type || Lesson.status === 'win' || Lesson.status === 'fail') return;
    Lesson.hintPts = [];
    const r = LS.handle(L, Lesson.s, i);
    if (r.ev.type === 'move') click();
    if (r.status) Lesson.status = r.status;
    if (r.status === 'win') markDone(L);
    say(r.msg);
    /* The first try at each exercise counts towards the Go Coach grade (grade.js), unless a hint was used; said after the lesson's own words. */
    if (r.status && !Lesson.hinted && G.grade) G.grade.lesson(L.id, kyuOf(L), r.status === 'win');
    renderLesson();
  }
  function answerQuiz(k, btn) {
    const L = LS.list[Lesson.idx];
    if (Lesson.status === 'win') return;
    if (k === L.answer) {
      Lesson.answered = true; Lesson.status = 'win'; markDone(L);
      say(T('correct', { explain: L.explain }));
      btn.className = 'primary';
    } else {
      say(L.wrong || T('not-quite'));
    }
    if (G.grade) G.grade.lesson(L.id, kyuOf(L), k === L.answer); /* first answer only (grade.js) */
    renderLesson();
  }
  function lessonHint() {
    const L = LS.list[Lesson.idx];
    Lesson.hintPts = LS.hintPoints(L, Lesson.s); Lesson.hinted = true;
    if (G.grade) G.grade.lesson(L.id, kyuOf(L), null); /* a hint first: this exercise does not count */
    renderLesson();
  }
  function lessonReset() {
    const L = LS.list[Lesson.idx];
    Lesson.s = LS.setup(L); Lesson.status = null; Lesson.hintPts = [];
    say(T('reset'));
    renderLesson();
  }
  function lessonNext() {
    const L = LS.list[Lesson.idx];
    if (L.type === 'info') markDone(L);
    if (L.file) { G.lessonFiles.openNext(L.id); return; }
    if (Lesson.idx === LS.CORE - 1) {
      exitLesson();
      say(T('ready'));
      G.startGuidedGame();
    } else openLesson(Lesson.idx + 1);
  }
  function lessonInfo() {
    if (!Lesson.on) return null;
    const L = LS.list[Lesson.idx], s = Lesson.s, shown = LS.marksFor(L, s), marks = {};
    for (const k of Object.keys(shown)) if (/^[A-F]$/.test(shown[k])) marks[shown[k]] = +k;
    return { id: L.id, n: s.n, s, marks, task: L.task, hasHint: !L.type && LS.hintPoints(L, s).length > 0 };
  }

  Object.assign(G, { Lesson, renderLesson, showMenu, openLesson, exitLesson, onLessonTap, lessonInfo, lessonHint, lessonReset, lessonNext });
})();
