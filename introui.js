/* World of Go — shows the "teach me" introduction in the chat: a welcome, then tappable choices.
   The words and the typed-answer matcher live in intro.js. */
(() => {
  'use strict';
  const G = window.GC;
  const I = window.GoIntro;
  let open = false; /* true while the choices are the thing being answered */

  /* Whatever is on the board (a lesson, the teacher, an exploration) is closed before the next thing starts. */
  function leaveOthers() {
    if (G.teaching && G.teaching.on) G.exitTeaching();
    if (G.exploring && G.exploring.on) G.exitExploring();
    if (G.Lesson && G.Lesson.on) G.exitLesson();
    if (G.kifu && G.kifu.on) G.exitKifu(true);
  }

  /* The history is an article kept in history.md (so it can be edited without touching the code). It opens in the board window and the chat only says so. */
  async function openHistory() {
    let page;
    try {
      const res = await fetch('history.md', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      page = window.GoHistory.parse(await res.text());
    } catch (e) {
      page = { title: 'A history of Go', blocks: [{ t: 'p', text: 'The history page could not be loaded just now. It needs a connection the first time; after that it is kept for offline use. Please try again.' }] };
    }
    G.showPage(page);
    G.say('The history of Go is open in the board window. Tap a small number such as [2] to jump to its source, and press "Back to the board" when you have finished reading.');
  }

  const ACTIONS = {
    rules: () => { if (G.exploring && G.exploring.on) G.exitExploring(); G.startTeaching(); },
    history: () => { openHistory(); show(); },
    play: () => { leaveOthers(); G.startGuidedGame(); },
    lessons: () => G.showMenu(),
    kifu: () => G.openKifuList()
  };

  function choose(key) {
    open = false;
    if (key !== 'history' && G.pageOpen()) G.closePage();
    const f = ACTIONS[key];
    if (f) f();
  }
  function show() {
    open = true;
    G.chatMenu(I.OPTIONS.map(o => ({ label: o.label, run: () => choose(o.key) })));
  }
  function intro() {
    G.say(I.WELCOME);
    show();
  }
  /* A typed reply while the choices are showing. Anything that is not a choice closes them and goes on to the coach. */
  function ask(q) {
    if (!open) return false;
    const key = I.match(q);
    if (!key) { open = false; return false; }
    choose(key);
    return true;
  }

  Object.assign(G, { teachIntro: intro, introAsk: ask, openHistory });
})();
