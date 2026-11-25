/* Go Coach — the chat panel: shows the coach's messages and runs what you ask for */
(() => {
  'use strict';
  const G = window.GC;
  const { E, LS, $, settings, saveSettings, Play } = G;
  const C = window.GoCoach;
  const CM = window.GoCommentary;
  const T = k => window.GoText.T('chat.' + k); /* wording: docs/text/en/chat.md */
  const PLAY_CHIPS = []; /* no suggestion buttons while playing: you just ask */

  const root = $('#chat'), box = root.querySelector('.chatLog'), form = root.querySelector('.chatForm');
  const input = root.querySelector('.chatInput'), quick = root.querySelector('.quick');
  let topic = null;

  const say = text => G.chatRecord('coach', text); /* chatlog.js keeps and shows the chat */
  /* A list of tappable choices inside the chat (used for the lessons), headed by its title. Like a coach's message, it folds to
     its title once a newer message comes (chatlog.js); tap the title to open or fold it again. */
  function menu(items, title) {
    const d = document.createElement('div');
    d.className = 'msg coach menu';
    d.append(Object.assign(document.createElement('strong'), { className: 'menuTitle', textContent: title }));
    d.addEventListener('click', e => { if (!e.target.closest('button')) d.classList.toggle('clip'); });
    for (const it of items) {
      if (it.head) { /* a heading between groups of choices, such as a chapter of the lessons */
        const h = document.createElement('div');
        h.className = 'menuHead';
        h.append(Object.assign(document.createElement('strong'), { textContent: it.label }));
        if (it.note) h.append(Object.assign(document.createElement('span'), { textContent: it.note }));
        d.append(h);
        continue;
      }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lcard' + (it.done ? ' done' : '');
      G.choiceLabel(b, it.label);
      b.addEventListener('click', () => { G.chatRecord('user', G.choiceWords(it.label)); it.run(); }); /* the choice heads the exchange it starts */
      d.append(b);
    }
    G.chatShow(d);
  }
  function setChips(labels) {
    quick.textContent = '';
    for (const label of labels) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', () => ask(label));
      quick.append(b);
    }
  }

  const context = () => ({ n: Play.s ? Play.s.n : 9, phase: Play.phase, human: Play.human, topic });
  const myTurn = () => Play.s && G.myTurn(Play.s); /* play.js: your turn, or either side's in Play both sides */
  const press = id => { const b = $(id); if (b.disabled) { say(T('cannot')); return false; } b.click(); return true; };
  const MORE_RE = /^(why|why is that( good| better)?|why there|how come|explain( that| it| more)?|tell me more|more( detail| please)?|go on|in more detail|elaborate)\W*$/i;
  const deepDive = x => CM.deepDive(E, x.s, x.idx, x.color, Play.human);
  const lessonIndex = arg => (arg && arg.id ? LS.list.findIndex(l => l.id === arg.id) : -1);

  /* What each request does while you are playing a game. */
  const PLAY_ACTIONS = {
    undo: () => press('#btnUndo'),
    pass: () => { if (!myTurn()) return say(T('not-your-turn')); press('#btnPass'); },
    resign: () => press('#btnResign'),
    hint: () => { if (!myTurn()) return say(T('hints-on-turn')); G.giveHint(); },
    analyse: () => press('#btnAnalyse'),
    review: () => G.review(),
    why: () => {
      const x = (G.explained && G.explained.coach) || G.lastExplain;
      say(x ? deepDive(x) : T('nothing-to-explain'));
    },
    summary: () => { if (Play.s) say(CM.positionSummary(E, Play.s, Play.human)); },
    think: () => say(CM.CHECKLIST),
    weak: () => say(Play.s ? C.weakReport(E, Play.s, Play.human) : T('no-game')),
    point: idx => say(Play.s ? C.describePoint(E, Play.s, idx, Play.s.turn) : T('no-game')),
    play: idx => {
      if (!myTurn()) return say(T('not-your-turn'));
      Play.pending = idx; G.onPlayTap(idx);
    },
    set: arg => { Object.assign(settings, arg); saveSettings(); G.renderPlay(); },
    new: arg => {
      if (arg.size) settings.size = arg.size;
      if (arg.level) settings.level = arg.level;
      if (arg.colour) settings.colour = arg.colour;
      G.openNewDialog();
    },
    menu: () => G.showMenu(),
    lesson: arg => { const i = lessonIndex(arg); if (i >= 0) G.openLesson(i); else G.showMenu(); },
    teach: () => G.showMenu(), /* "Teach me" goes straight to the lessons (Boon, 25 Nov 2026) */
    rules: () => G.startTeaching(),
    guided: () => G.startGuidedGame(),
    history: () => G.openHistory(),
    kifu: () => G.openKifuList(),
    explore: idx => G.startExploring(idx),
    exit: () => say(T('in-game')),
    both: on => G.setBoth(on),
    showme: () => G.showMe()
  };

  /* What each request does while a lesson is open. */
  const LESSON_ACTIONS = {
    hint: () => { const info = G.lessonInfo(); if (info && info.hasHint) G.lessonHint(); else say(T('no-ring')); },
    why: () => { const r = C.lessonReply(E, 'explain more', G.lessonInfo()); if (r) say(r.text); },
    reset: () => G.lessonReset(),
    next: () => { if ($('#btnLNext').disabled) say(T('finish-first')); else G.lessonNext(); },
    point: idx => say(C.describePoint(E, G.Lesson.s, idx, G.Lesson.s.turn)),
    play: idx => G.onLessonTap(idx),
    set: arg => { Object.assign(settings, arg); saveSettings(); },
    menu: () => G.showMenu(),
    lesson: arg => { const i = lessonIndex(arg); if (i >= 0) G.openLesson(i); else G.showMenu(); },
    exit: () => G.exitLesson(),
    teach: () => G.showMenu(),
    rules: () => G.startTeaching(),
    guided: () => { G.exitLesson(); G.startGuidedGame(); },
    history: () => G.openHistory()
  };

  /* What each request does while the teaching mode is on: only the ones that make sense inside a lesson. */
  const TEACH_ACTIONS = {
    exit: () => (G.kifu && G.kifu.on ? G.exitKifu() : G.exploring && G.exploring.on ? G.exitExploring() : G.exitTeaching()),
    teach: () => say(T('busy')),
    rules: () => say(T('busy')),
    guided: () => say(T('busy')),
    history: () => G.openHistory(),
    kifu: () => G.openKifuList(),
    set: arg => { Object.assign(settings, arg); saveSettings(); }
  };

  function ask(text) {
    const q = text.trim();
    if (!q) return;
    G.chatRecord('user', q); /* your question heads the exchange; the coach's answers go under it */
    const info = G.lessonInfo();
    const teaching = !!(G.teaching && G.teaching.on), exploring = !!(G.exploring && G.exploring.on), kifu = !!(G.kifu && G.kifu.on);
    if (teaching && G.teaching.ask(q)) return;
    if (exploring && G.stopShowMe) G.stopShowMe(); /* typing while "show me" plays stops it */
    if (exploring && G.exploring.ask(q)) return;
    if (kifu && G.kifu.ask(q)) return;
    const held = teaching || exploring || kifu;
    if (!info && !held && G.welcomeAsk && G.welcomeAsk(q)) return; /* 1 to 5, help, and the welcome's requests in words */
    if (!info && !held && G.askCoach && G.askCoach(q)) return;
    if (!info && !held && G.focus === 'move' && G.lastExplain && MORE_RE.test(q)) return say(deepDive(G.lastExplain));
    const r = (info && C.lessonReply(E, q, info)) || C.reply(q, info ? { n: info.n, topic } : teaching ? { n: 9, topic } : context());
    if (r.topic) { topic = r.topic; G.focus = 'term'; }
    const f = r.action ? (info ? LESSON_ACTIONS : held ? TEACH_ACTIONS : PLAY_ACTIONS)[r.action] : null;
    if (r.action && !f) return say(T('game-only'));
    if (r.text) say(r.text);
    if (f && !['history', 'kifu'].includes(r.action) && G.pageOpen()) G.closePage();
    if (f) f(r.arg);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    ask(v);
  });
  /* Clear empties this session's chat (chatlog.js); typing Help brings back the welcome. */
  $('#btnClear').addEventListener('click', () => { G.clearChat(); input.focus(); });

  /* Enlarge / shrink: the chat can cover the screen for easier reading, then go back to its usual place. */
  const sizeBtn = $('#btnChatSize');
  const ICON_BIG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const ICON_SMALL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';
  function setBig(big) {
    document.body.classList.toggle('chatBig', big);
    sizeBtn.innerHTML = big ? ICON_SMALL : ICON_BIG;
    sizeBtn.setAttribute('aria-pressed', String(big));
    sizeBtn.title = sizeBtn.ariaLabel = T(big ? 'shrink' : 'enlarge');
    box.scrollTop = box.scrollHeight;
  }
  sizeBtn.onclick = () => setBig(!document.body.classList.contains('chatBig'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('chatBig')) setBig(false); });
  setBig(false);
  setChips(PLAY_CHIPS);

  Object.assign(G, { say, setChips, chatMenu: menu, PLAY_CHIPS });
})();
