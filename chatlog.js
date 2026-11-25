/* Go Coach — how the chat is kept and laid out (Boon's design, 25 Nov 2026).
   The chat is a list of exchanges: your question, then the coach's answer. The newest exchange is open; when you ask the next
   question the earlier ones fold up to just the question, and tapping a question opens or closes its answer.
   A session starts with a date and time. Only pressing New starts a new session (Boon's choice: leaving or reopening the app
   always returns you to where you were); the old one moves into the history, which you see by pulling the chat down from the top.
   chat.js decides what the coach says; this file only stores and shows it. */
(() => {
  'use strict';
  const G = window.GC;
  const { $, KEY, load, store } = G;
  const T = k => window.GoText.T('chat.' + k); /* wording: docs/text/en/chat.md */
  const C = window.GoCoach;
  const KEEP = 30, MAX = 120, PULL = 70;
  const box = $('#chat .chatLog');
  const isIntro = text => text === C.INTRO;
  /* A welcome saved by an older version (its wording has changed since) becomes today's, so it shows its buttons. */
  const freshen = m => (m.who === 'coach' && !isIntro(m.text) && /^Hello, I am your Go coach\. I am not an AI model[.:] /.test(m.text) ? { who: 'coach', text: C.INTRO } : m);
  const stamp = ms => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  /* ---------- what is kept ---------- */
  let cur = load(KEY.chat, null);
  const firstVisit = cur === null;
  if (Array.isArray(cur)) cur = { start: Date.now(), last: Date.now(), log: cur }; /* older versions kept only the messages */
  if (!cur || !Array.isArray(cur.log)) cur = { start: Date.now(), last: Date.now(), log: [] };
  cur.log = cur.log.map(freshen);
  let past = load(KEY.past, []);
  if (!Array.isArray(past)) past = [];
  let revealed = false;

  const save = () => store(KEY.chat, cur);
  /* A session worth keeping has something besides the welcome. */
  function archive() {
    if (!cur.log.some(m => !isIntro(m.text))) return;
    past.push({ start: cur.start, log: cur.log });
    if (past.length > KEEP) past = past.slice(-KEEP);
    store(KEY.past, past);
  }

  /* ---------- drawing ---------- */
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
  function message(text) {
    const d = document.createElement('div');
    d.className = 'msg coach';
    if (isIntro(text) && G.fillWelcome) G.fillWelcome(d, fill); /* the welcome, with its choices as buttons */
    else fill(d, text);
    return d;
  }
  /* One exchange: the question (a button that opens and closes it) and the answers under it. The coach's words before any
     question get a heading of their own: "Welcome" for the welcome, otherwise "Coach's notes". */
  const heading = text => T(isIntro(text) ? 'welcome-head' : 'notes');
  function exchange(question, shut) {
    const ex = document.createElement('div');
    ex.className = 'ex' + (shut ? ' shut' : '');
    const q = document.createElement('button');
    q.type = 'button'; q.className = 'q'; q.textContent = question;
    q.addEventListener('click', () => ex.classList.toggle('shut'));
    ex.append(q);
    const ans = document.createElement('div');
    ans.className = 'ans';
    ex.append(ans);
    return ex;
  }
  const stampEl = ms => Object.assign(document.createElement('div'), { className: 'stamp', textContent: stamp(ms) });
  /* A whole session's messages as exchanges. In the history every exchange is folded and the welcome is left out. */
  function drawSession(into, s, folded) {
    into.append(stampEl(s.start));
    let ex = null;
    for (const m of s.log) {
      if (m.who === 'user') { ex = exchange(m.text, folded); into.append(ex); continue; }
      if (folded && isIntro(m.text)) continue;
      if (!ex) { ex = exchange(heading(m.text), folded); into.append(ex); }
      ex.lastChild.append(message(m.text));
    }
    if (!folded) [...into.querySelectorAll('.ex')].slice(0, -1).forEach(e => e.classList.add('shut'));
    return ex;
  }

  let pastEl, hintEl, nowEl, openEx;
  function render() {
    box.textContent = '';
    hintEl = Object.assign(document.createElement('button'), { type: 'button', className: 'pullHint', textContent: T('history-hint') });
    hintEl.addEventListener('click', reveal);
    pastEl = document.createElement('div');
    pastEl.className = 'past';
    nowEl = document.createElement('div');
    nowEl.className = 'now';
    box.append(hintEl, pastEl, nowEl);
    pastEl.hidden = !revealed;
    hintEl.hidden = revealed || !past.length;
    if (revealed) for (const s of past) drawSession(pastEl, s, true);
    openEx = drawSession(nowEl, cur, false);
    box.scrollTop = box.scrollHeight;
  }
  /* Show the earlier sessions above this one, keeping today's chat where it was on the screen. */
  function reveal() {
    if (revealed || !past.length) return;
    revealed = true;
    const before = box.scrollHeight - box.scrollTop;
    for (const s of past) drawSession(pastEl, s, true);
    pastEl.hidden = false; hintEl.hidden = true;
    box.scrollTop = Math.max(0, box.scrollHeight - before - box.clientHeight * .6);
  }

  /* ---------- pulling down from the top ---------- */
  let y0 = null;
  box.addEventListener('touchstart', e => { y0 = box.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  box.addEventListener('touchmove', e => { if (y0 !== null && e.touches[0].clientY - y0 > PULL) { y0 = null; reveal(); } }, { passive: true });
  box.addEventListener('wheel', e => { if (box.scrollTop <= 0 && e.deltaY < 0) reveal(); }, { passive: true });

  /* ---------- adding to the chat ---------- */
  function record(who, text) {
    if (!text) return;
    const last = cur.log[cur.log.length - 1];
    if (who === 'coach' && last && last.who === 'coach' && last.text === text) return;
    cur.log.push({ who, text });
    if (cur.log.length > MAX) cur.log.shift();
    cur.last = Date.now();
    save();
    if (who === 'user') {
      for (const e of nowEl.querySelectorAll('.ex')) e.classList.add('shut');
      openEx = exchange(text, false); nowEl.append(openEx);
    } else {
      if (!openEx) { openEx = exchange(heading(text), false); nowEl.append(openEx); }
      openEx.lastChild.append(message(text));
    }
    box.scrollTop = box.scrollHeight;
  }
  /* Something that is not kept, such as the lessons menu, shown under the current question. */
  function show(el) {
    if (!openEx) { openEx = exchange(T('notes'), false); nowEl.append(openEx); }
    openEx.lastChild.append(el);
    box.scrollTop = box.scrollHeight;
  }
  /* New session: the current one goes into the history and the chat starts empty (or with the welcome). */
  function newSession(welcome) {
    archive();
    cur = { start: Date.now(), last: Date.now(), log: welcome ? [{ who: 'coach', text: C.INTRO }] : [] };
    revealed = false;
    save(); render();
  }
  /* Clear: empties this session's chat without keeping it. */
  function clearNow() { cur.log = []; save(); render(); }

  /* ---------- start ---------- */
  if (firstVisit) cur.log = [{ who: 'coach', text: C.INTRO }];
  save(); render();

  Object.assign(G, { chatRecord: record, chatShow: show, newChatSession: newSession, clearChat: clearNow });
})();
