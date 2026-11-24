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

  /* An article kept whole in a Markdown file in docs/text/<language>/pages (so it can be edited without touching the code),
     such as 'history' or 'whatisgo'. It opens in the board window and the chat only says so (docs/text/en/pages.md). */
  async function openDoc(name) {
    const { T, page: where } = window.GoText;
    let page;
    try {
      const res = await fetch(where(name), { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      page = window.GoHistory.parse(await res.text());
    } catch (e) {
      page = { title: T(`pages.${name}-title`), blocks: [{ t: 'p', text: T('pages.failed') }] };
    }
    G.showPage(page);
    G.say(T(`pages.${name}-opened`));
  }
  const openHistory = () => openDoc('history');

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

  Object.assign(G, { teachIntro: intro, introAsk: ask, openHistory, openDoc });
})();
