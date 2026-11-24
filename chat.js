/* Go Coach — the chat panel: shows the coach's messages and runs what you ask for */
(() => {
  'use strict';
  const G = window.GC;
  const { E, LS, $, KEY, load, store, settings, saveSettings, Play } = G;
  const C = window.GoCoach;
  const CM = window.GoCommentary;
  const MAX = 80;
  const PLAY_CHIPS = []; /* no suggestion buttons while playing: you just ask */

  const root = $('#chat'), box = root.querySelector('.chatLog'), form = root.querySelector('.chatForm');
  const input = root.querySelector('.chatInput'), quick = root.querySelector('.quick');
  let log = load(KEY.chat, null);
  const firstVisit = !Array.isArray(log); /* nothing saved yet: the welcome is shown once */
  if (firstVisit) log = [];
  let topic = null;

  /* Lines written as **Heading:** appear in bold. Everything else is plain text. */
  function fill(el, text) {
    const lines = String(text).split('\n');
    lines.forEach((ln, i) => {
      const m = ln.match(/^\*\*(.+?)\*\*$/);
      if (m) { const b = document.createElement('strong'); b.textContent = m[1]; el.append(b); }
      else el.append(document.createTextNode(ln));
      if (i < lines.length - 1) el.append(document.createTextNode('\n'));
    });
  }
  function append(who, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    fill(d, text);
    box.append(d);
    box.scrollTop = box.scrollHeight;
  }
  function add(who, text) {
    if (!text) return;
    const last = log[log.length - 1];
    if (who === 'coach' && last && last.who === 'coach' && last.text === text) return;
    log.push({ who, text });
    if (log.length > MAX) log.shift();
    store(KEY.chat, log);
    append(who, text);
  }
  const say = text => add('coach', text);
  /* A list of tappable choices inside the chat (used for the lessons). */
  function menu(items) {
    const d = document.createElement('div');
    d.className = 'msg coach menu';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lcard' + (it.done ? ' done' : '');
      b.textContent = it.label;
      b.addEventListener('click', it.run);
      d.append(b);
    }
    box.append(d);
    box.scrollTop = box.scrollHeight;
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
  const myTurn = () => Play.s && Play.phase === 'play' && !Play.thinking && Play.s.turn === Play.human;
  const press = id => { const b = $(id); if (b.disabled) { say('I cannot do that right now.'); return false; } b.click(); return true; };
  const MORE_RE = /^(why|why is that( good| better)?|why there|how come|explain( that| it| more)?|tell me more|more( detail| please)?|go on|in more detail|elaborate)\W*$/i;
  const deepDive = x => CM.deepDive(E, x.s, x.idx, x.color, Play.human);
  const lessonIndex = arg => (arg && arg.id ? LS.list.findIndex(l => l.id === arg.id) : -1);

  /* What each request does while you are playing a game. */
  const PLAY_ACTIONS = {
    undo: () => press('#btnUndo'),
    pass: () => { if (!myTurn()) return say('It is not your turn.'); press('#btnPass'); },
    resign: () => press('#btnResign'),
    hint: () => { if (!myTurn()) return say('Hints are available on your turn.'); G.giveHint(); },
    analyse: () => press('#btnAnalyse'),
    review: () => G.review(),
    why: () => {
      const x = (G.explained && G.explained.coach) || G.lastExplain;
      say(x ? deepDive(x) : 'There is nothing to explain yet. Ask for a hint, or wait for the computer’s move.');
    },
    summary: () => { if (Play.s) say(CM.positionSummary(E, Play.s, Play.human)); },
    think: () => say(CM.CHECKLIST),
    weak: () => say(Play.s ? C.weakReport(E, Play.s, Play.human) : 'There is no game yet.'),
    point: idx => say(Play.s ? C.describePoint(E, Play.s, idx, Play.s.turn) : 'There is no game yet.'),
    play: idx => {
      if (!myTurn()) return say('It is not your turn.');
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
    teach: () => G.teachIntro(),
    history: () => G.openHistory(),
    kifu: () => G.openKifuList(),
    explore: idx => G.startExploring(idx),
    exit: () => say('You are already in your game.')
  };

  /* What each request does while a lesson is open. */
  const LESSON_ACTIONS = {
    hint: () => { const info = G.lessonInfo(); if (info && info.hasHint) G.lessonHint(); else say('There is no move to play in this lesson, so there is no blue ring.'); },
    why: () => { const r = C.lessonReply(E, 'explain more', G.lessonInfo()); if (r) say(r.text); },
    reset: () => G.lessonReset(),
    next: () => { if ($('#btnLNext').disabled) say('Finish the task first, then press Next.'); else G.lessonNext(); },
    point: idx => say(C.describePoint(E, G.Lesson.s, idx, G.Lesson.s.turn)),
    play: idx => G.onLessonTap(idx),
    set: arg => { Object.assign(settings, arg); saveSettings(); },
    menu: () => G.showMenu(),
    lesson: arg => { const i = lessonIndex(arg); if (i >= 0) G.openLesson(i); else G.showMenu(); },
    exit: () => G.exitLesson(),
    history: () => G.openHistory()
  };

  /* What each request does while the teaching mode is on: only the ones that make sense inside a lesson. */
  const TEACH_ACTIONS = {
    exit: () => (G.kifu && G.kifu.on ? G.exitKifu() : G.exploring && G.exploring.on ? G.exitExploring() : G.exitTeaching()),
    teach: () => say('We are already in the middle of something. Say "back to game" to leave it first.'),
    history: () => G.openHistory(),
    kifu: () => G.openKifuList(),
    set: arg => { Object.assign(settings, arg); saveSettings(); }
  };

  function ask(text) {
    const q = text.trim();
    if (!q) return;
    add('user', q);
    const info = G.lessonInfo();
    const teaching = !!(G.teaching && G.teaching.on), exploring = !!(G.exploring && G.exploring.on), kifu = !!(G.kifu && G.kifu.on);
    if (teaching && G.teaching.ask(q)) return;
    if (exploring && G.exploring.ask(q)) return;
    if (kifu && G.kifu.ask(q)) return;
    const held = teaching || exploring || kifu;
    if (!info && !held && G.introAsk && G.introAsk(q)) return;
    if (!info && !held && G.welcomeAsk && G.welcomeAsk(q)) return; /* 1 to 5, help, and the welcome's requests in words */
    if (!info && !held && G.askCoach && G.askCoach(q)) return;
    if (!info && !held && G.focus === 'move' && G.lastExplain && MORE_RE.test(q)) return say(deepDive(G.lastExplain));
    const r = (info && C.lessonReply(E, q, info)) || C.reply(q, info ? { n: info.n, topic } : teaching ? { n: 9, topic } : context());
    if (r.topic) { topic = r.topic; G.focus = 'term'; }
    const f = r.action ? (info ? LESSON_ACTIONS : held ? TEACH_ACTIONS : PLAY_ACTIONS)[r.action] : null;
    if (r.action && !f) return say('That works in the game. Say "back to game" first.');
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
  /* New and Clear empty the chat and leave it empty; typing Help brings back the welcome. */
  function clearChat() { log = []; store(KEY.chat, log); box.textContent = ''; }
  $('#btnClear').addEventListener('click', () => { clearChat(); input.focus(); });

  /* Enlarge / shrink: the chat can cover the screen for easier reading, then go back to its usual place. */
  const sizeBtn = $('#btnChatSize');
  const ICON_BIG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const ICON_SMALL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';
  function setBig(big) {
    document.body.classList.toggle('chatBig', big);
    sizeBtn.innerHTML = big ? ICON_SMALL : ICON_BIG;
    sizeBtn.setAttribute('aria-pressed', String(big));
    sizeBtn.title = sizeBtn.ariaLabel = big ? 'Shrink the chat' : 'Enlarge the chat';
    box.scrollTop = box.scrollHeight;
  }
  sizeBtn.onclick = () => setBig(!document.body.classList.contains('chatBig'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('chatBig')) setBig(false); });
  setBig(false);
  setChips(PLAY_CHIPS);
  /* A chat saved by an older version (it starts with the old welcome) is replaced by the new welcome. */
  if (firstVisit || (log.length && /^Hello, I am your Go coach\. I am not an AI model: /.test(log[0].text))) { log = [{ who: 'coach', text: C.INTRO }]; store(KEY.chat, log); }
  for (const m of log) append(m.who, m.text);

  Object.assign(G, { say, setChips, chatMenu: menu, PLAY_CHIPS, clearChat });
  /* The welcome's buttons are not saved with the chat, so they are added again when it was the last message. */
  if (log.length && log[log.length - 1].text === C.INTRO && G.welcomeMenu) G.welcomeMenu();
})();
