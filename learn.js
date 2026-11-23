/* Go Coach — lessons. The coach lists them in the chat and the chosen lesson runs on the main board. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, LS, $, KEY, load, store, click, Play, playView } = G;
  const say = text => { if (G.say && text) G.say(text); };
  const CHIPS = ['Explain more', 'Hint', 'Why is that?', 'Next lesson', 'Lessons', 'Back to game'];

  const Lesson = { on: false, idx: -1, s: null, status: null, answered: false, hintPts: [], done: new Set(load(KEY.done, [])) };

  function showMenu() {
    G.chatMenu(LS.list.map((L, i) => ({ label: `${Lesson.done.has(L.id) ? '✓' : i + 1}  ${L.title}`, done: Lesson.done.has(L.id), run: () => openLesson(i) })));
  }
  function openLesson(i) {
    if (Play.thinking) return say('Give me a moment: I am still thinking about my move.');
    if (G.kifu && G.kifu.on) G.exitKifu(true);
    const L = LS.list[i];
    Lesson.on = true; Lesson.idx = i; Lesson.s = LS.setup(L); Lesson.status = null; Lesson.answered = false; Lesson.hintPts = [];
    const q = $('#quizOptions'); q.innerHTML = '';
    if (L.type === 'quiz') {
      L.options.forEach((o, k) => {
        const b = document.createElement('button'); b.textContent = o;
        b.addEventListener('click', () => answerQuiz(k, b));
        q.append(b);
      });
    }
    G.setChips(CHIPS);
    say(`Lesson ${i + 1} of ${LS.list.length}: ${L.title}\n\n${L.text.join('\n\n')}`);
    say((L.task ? 'Your task: ' + L.task + '\n' : '') + 'Ask me if anything is unclear, or say "back to game" to return to your game.');
    renderLesson();
  }
  function exitLesson() {
    if (!Lesson.on) return;
    Lesson.on = false; Lesson.hintPts = [];
    G.setChips(G.PLAY_CHIPS);
    G.renderPlay();
    say('Back to your game.');
  }
  function renderLesson() {
    const L = LS.list[Lesson.idx], s = Lesson.s;
    let terr = null;
    if (L.type === 'quiz' && Lesson.answered) terr = E.scoreArea(s.n, s.board).terr;
    $('#scorePanel').hidden = true; $('#controls').hidden = true; $('#chat').hidden = false;
    $('#lessonBar').hidden = false; $('#quizOptions').hidden = L.type !== 'quiz';
    playView.set({
      n: s.n, board: s.board, last: s.last, ko: s.ko, coords: false, libs: !!L.libs,
      marks: LS.marksFor(L, s), hint: Lesson.hintPts, ghost: -1, hoverColor: 0, terr, dead: null, own: null, shapes: null
    });
    $('#whoTurn').textContent = `Lesson ${Lesson.idx + 1} of ${LS.list.length}: ${L.title}`;
    $('#capsInfo').textContent = '';
    $('#posInfo').hidden = true;
    const isTask = !L.type;
    $('#btnLHint').hidden = !isTask; $('#btnLReset').hidden = !isTask;
    const next = $('#btnLNext');
    const last = Lesson.idx === LS.list.length - 1;
    next.textContent = last ? 'Play a game' : 'Next';
    next.disabled = !(L.type === 'info' || Lesson.status === 'win');
    next.classList.toggle('primary', !next.disabled);
  }
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
    renderLesson();
  }
  function answerQuiz(k, btn) {
    const L = LS.list[Lesson.idx];
    if (Lesson.status === 'win') return;
    if (k === L.answer) {
      Lesson.answered = true; Lesson.status = 'win'; markDone(L);
      say(`Correct. ${L.explain}`);
      btn.className = 'primary';
    } else {
      say(L.wrong || 'Not quite. Have another look.');
    }
    renderLesson();
  }
  function lessonHint() {
    const L = LS.list[Lesson.idx];
    Lesson.hintPts = LS.hintPoints(L, Lesson.s);
    renderLesson();
  }
  function lessonReset() {
    const L = LS.list[Lesson.idx];
    Lesson.s = LS.setup(L); Lesson.status = null; Lesson.hintPts = [];
    say('Lesson reset. Have another go.');
    renderLesson();
  }
  function lessonNext() {
    const L = LS.list[Lesson.idx];
    if (L.type === 'info') markDone(L);
    if (Lesson.idx === LS.list.length - 1) {
      exitLesson();
      say('Ready for your first game? I will set it up for you and explain every move.');
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
