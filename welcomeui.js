/* Go Coach — the welcome in the chat: the coach's opening message (coach.js INTRO) with its five choices as buttons inside it,
   and what each choice does. Typing a number, the words, or "help" works too (welcome.js decides which). */
(() => {
  'use strict';
  const G = window.GC;
  const { $, settings } = G;
  const C = window.GoCoach, W = window.GoWelcome, { T } = window.GoText;
  const busy = () => (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on) || (G.setupOn && G.setupOn());

  const ACTIONS = {
    whatisgo: () => G.openDoc('whatisgo'),
    history: () => G.openHistory(),
    teach: () => G.showMenu(), /* "Teach me" goes straight to the lessons (Boon, 25 Nov 2026) */
    coach: () => {
      if (busy()) return G.say(T('welcome.coach-busy'));
      if (settings.mode === 'coach') return G.say(T('welcome.coach-already'));
      $('#btnMode').click(); /* coaching.js switches the mode and explains it in the chat */
    },
    tour: () => G.startTour(),
    help: () => show()
  };

  function choose(key) {
    if (key !== 'whatisgo' && key !== 'history' && key !== 'tour' && G.pageOpen()) G.closePage();
    ACTIONS[key]();
  }
  /* Fills one chat message with the welcome: its opening text, the five choices as buttons, then its closing text.
     chat.js calls this whenever it shows the welcome, so the buttons work wherever the welcome is in the chat. */
  function fillWelcome(el, fill) {
    const beta = document.createElement('span');
    const word = T('welcome.beta-word'), at = C.INTRO_BETA.indexOf(word);
    if (at < 0) beta.textContent = C.INTRO_BETA;
    else {
      const a = Object.assign(document.createElement('button'), { type: 'button', className: 'inlineLink link', textContent: word });
      a.addEventListener('click', () => { G.chatRecord('user', word); G.openDoc('beta'); });
      beta.append(C.INTRO_BETA.slice(0, at), a, C.INTRO_BETA.slice(at + word.length));
    }
    el.append(beta, document.createTextNode('\n\n'));
    fill(el, C.INTRO_TOP);
    const list = document.createElement('div');
    list.className = 'welcomeChoices';
    for (const o of W.OPTIONS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lcard';
      G.choiceLabel(b, o.label);
      b.addEventListener('click', () => { G.chatRecord('user', G.choiceWords(o.label)); choose(o.key); }); /* the choice heads the exchange it starts */
      list.append(b);
    }
    el.append(list);
    fill(el, C.INTRO_PUZZLES + '\n\n' + C.INTRO_END);
  }
  const show = () => G.say(C.INTRO);
  /* A typed message: true when it was one of the welcome's requests. */
  function ask(q) {
    const key = W.match(q);
    if (!key) return false;
    choose(key);
    return true;
  }

  Object.assign(G, { welcomeAsk: ask, showWelcome: show, fillWelcome });
})();
