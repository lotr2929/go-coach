/* Go Coach — the welcome in the chat: the coach's opening message (coach.js INTRO) with its five choices as buttons,
   and what each choice does. Typing a number, the words, or "help" works too (welcome.js decides which). */
(() => {
  'use strict';
  const G = window.GC;
  const { $, settings } = G;
  const C = window.GoCoach, W = window.GoWelcome;
  const busy = () => (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on);

  const ACTIONS = {
    whatisgo: () => G.openDoc('whatisgo.md', 'What is Go?', '"What is Go?" is open in the board window. Press "Back to the board" when you have finished reading.'),
    history: () => G.openHistory(),
    teach: () => G.teachIntro(),
    coach: () => {
      if (busy()) return G.say('Coach mode is for your own game. Say "back to game" first, then "coach me".');
      if (settings.mode === 'coach') return G.say('Coach mode is already on: I suggest moves after every turn and tell you how each of your moves went. Tap "Coach mode" to switch it off.');
      $('#btnMode').click(); /* coaching.js switches the mode and explains it in the chat */
    },
    tour: () => G.startTour(),
    help: () => show()
  };

  function choose(key) {
    if (key !== 'whatisgo' && key !== 'history' && key !== 'tour' && G.pageOpen()) G.closePage();
    ACTIONS[key]();
  }
  /* The five choices as buttons under the welcome. */
  function menu() {
    G.chatMenu(W.OPTIONS.map(o => ({ label: o.label, run: () => choose(o.key) })));
  }
  function show() {
    G.say(C.INTRO);
    menu();
  }
  /* A typed message: true when it was one of the welcome's requests. */
  function ask(q) {
    const key = W.match(q);
    if (!key) return false;
    choose(key);
    return true;
  }

  Object.assign(G, { welcomeAsk: ask, showWelcome: show, welcomeMenu: menu });
})();
