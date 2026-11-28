/* Go Coach — how the chat is kept and laid out (Boon's design, 25 Nov 2026).
   The chat is one list, oldest first: what you typed and what the coach said. Only the newest coach's message shows in full; every
   earlier item is one line starting with a dash (tap a coach's line to read it all). The coach's "Position" and "Your move"
   messages are left out of that list once they are no longer the newest.
   A session starts with a date and time. Only pressing New starts a new session (Boon's choice: leaving or reopening the app
   always returns you to where you were); the old one moves into the history, which you see by pulling the chat down from the top.
   chat.js decides what the coach says; this file only stores and shows it. */
(() => {
  'use strict';
  const G = window.GC;
  const { $, KEY, load, store } = G;
  const T = k => window.GoText.T('chat.' + k); /* wording: docs/text/en/chat.md */
  const C = window.GoCoach;
  /* Sessions kept in the history: 100 on the free tier (Boon, 25 Nov 2026). A paid tier would keep them all; there is no
     paid tier yet. */
  const KEEP = 100, MAX = 120, PULL = 70;
  const box = $('#chat .chatLog');
  const isIntro = text => text === C.INTRO;
  /* A welcome saved by an older version (its wording has changed since) becomes today's, so it shows its buttons.
     Since the beta line was added the welcome no longer starts with "Hello", so the greeting may follow a first paragraph. */
  const freshen = m => (m.who === 'coach' && !isIntro(m.text) && /(^|\n)Hello, I am your Go coach\. I am not an AI model[.:] /.test(m.text) ? { who: 'coach', text: C.INTRO } : m);
  const stamp = ms => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  /* ---------- what is kept ---------- */
  let cur = load(KEY.chat, null);
  if (Array.isArray(cur)) cur = { start: Date.now(), last: Date.now(), log: cur }; /* older versions kept only the messages */
  if (!cur || !Array.isArray(cur.log)) cur = { start: Date.now(), last: Date.now(), log: [] };
  cur.log = cur.log.map(freshen);
  let past = load(KEY.past, []);
  if (!Array.isArray(past)) past = [];
  let revealed = false;

  const save = () => { if (!window.GoAccount.paused()) store(KEY.chat, cur); }; /* storage full: nothing more is kept (storagewarn.js) */
  /* A session worth keeping has something besides the welcome. */
  function archive() {
    if (window.GoAccount.paused()) return;
    if (!cur.log.some(m => !isIntro(m.text))) return;
    past.push({ start: cur.start, log: cur.log });
    if (past.length > KEEP) past = past.slice(-KEEP);
    /* The phone's storage for the app is limited (a few megabytes): if the history does not fit, the oldest sessions go first. */
    for (;;) {
      try { localStorage.setItem(KEY.past, JSON.stringify(past)); return; }
      catch (e) { if (past.length <= 1) return; past.shift(); }
    }
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
  /* A coach's message. Only the newest one shows in full; the others fold to their first line (Boon's choice), shown as clickable
     text: tap to read it all, tap the text again to fold it. Buttons inside a message (the welcome's choices) still work. */
  const HEADS = ['coaching.h.position', 'coaching.h.your-move'].map(k => '**' + window.GoText.T(k) + ':**');
  function message(text) {
    const d = document.createElement('div');
    d.className = 'msg coach';
    d.dataset.head = HEADS.some(h => String(text).startsWith(h)) ? '1' : '';
    if (isIntro(text) && G.fillWelcome) { /* the welcome, headed "Welcome", with its choices as buttons */
      d.append(Object.assign(document.createElement('strong'), { textContent: T('welcome-head') }), document.createTextNode('\n'));
      G.fillWelcome(d, fill);
    } else fill(d, text);
    d.addEventListener('click', e => { if (!e.target.closest('button')) { d.classList.toggle('clip'); tidy(d); } });
    return d;
  }
  /* A folded "Position" or "Your move" message is not listed at all (Boon, 25 Nov 2026). */
  const tidy = m => m.classList.toggle('skip', m.classList.contains('clip') && m.dataset.head === '1');
  /* Fold every coach's message in the chat except the newest. */
  const clipOlder = () => { const all = box.querySelectorAll('.msg.coach'); all.forEach((m, i) => { m.classList.toggle('clip', i < all.length - 1); tidy(m); }); };
  /* What you typed: one line, starting with a dash (the dash is drawn by style.css). */
  const userLine = text => Object.assign(document.createElement('div'), { className: 'msg user line', textContent: text });
  const stampEl = ms => Object.assign(document.createElement('div'), { className: 'stamp', textContent: stamp(ms) });
  const dayKey = ms => new Date(ms).toDateString(); /* the day on the device's own clock and time zone */
  const dayName = ms => new Date(ms).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeName = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  /* A heading that opens and closes what is under it (a day, or a session within a day). */
  function fold(cls, label) {
    const box = document.createElement('div');
    box.className = cls + ' shut';
    const h = document.createElement('button');
    h.type = 'button'; h.className = 'fh';
    h.append(Object.assign(document.createElement('span'), { className: 'link', textContent: label }));
    h.addEventListener('click', () => box.classList.toggle('shut'));
    const inner = document.createElement('div');
    inner.className = 'fb';
    box.append(h, inner);
    return box;
  }
  /* The history. Earlier sessions from today show only their date and time; sessions from earlier days fold into their day
     (tap the day for its sessions by time). Tap a session to see its lines, a coach's line to read it all. */
  function drawPast() {
    const today = dayKey(Date.now());
    let day = null, key = null;
    for (const s of past) {
      if (dayKey(s.start) === today) { const sess = fold('sess', stamp(s.start)); drawSession(sess.lastChild, s, true); pastEl.append(sess); continue; }
      if (dayKey(s.start) !== key) { key = dayKey(s.start); day = fold('day', dayName(s.start)); pastEl.append(day); }
      const sess = fold('sess', timeName(s.start));
      drawSession(sess.lastChild, s, true);
      day.lastChild.append(sess);
    }
  }
  /* A whole session's messages in order. In the history the welcome is left out. */
  function drawSession(into, s, history) {
    if (!history) into.append(stampEl(s.start));
    for (const m of s.log) {
      if (m.who === 'user') into.append(userLine(m.text));
      else if (!(history && isIntro(m.text))) into.append(message(m.text));
    }
  }

  let pastEl, hintEl, nowEl;
  function render() {
    changed();
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
    if (revealed) drawPast();
    drawSession(nowEl, cur, false);
    clipOlder();
    box.scrollTop = box.scrollHeight;
  }
  /* Show the earlier sessions above this one, keeping today's chat where it was on the screen. */
  function reveal() {
    if (revealed || !past.length) return;
    revealed = true;
    const before = box.scrollHeight - box.scrollTop;
    drawPast();
    pastEl.hidden = false; hintEl.hidden = true;
    clipOlder();
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
    nowEl.append(who === 'user' ? userLine(text) : message(text));
    if (who === 'coach') clipOlder();
    box.scrollTop = box.scrollHeight;
    changed();
  }
  /* Something that is not kept, such as the lessons menu, shown under the current question. */
  function show(el) {
    document.dispatchEvent(new Event('gc:chat-show')); /* something only the chat can show (a menu): boardbig.js makes room */
    nowEl.append(el);
    clipOlder();
    box.scrollTop = box.scrollHeight;
  }
  /* A passing notice, such as "Coach is analysing…": shown at the end of the chat while the work goes on and taken away when it
     is done (Boon, 25 Nov 2026). It is not kept in the session. An empty text takes it away. */
  let busyEl = null;
  function busy(text) {
    if (!text) { if (busyEl) busyEl.remove(); busyEl = null; return; }
    busyEl = busyEl || Object.assign(document.createElement('div'), { className: 'msg busy' });
    if (busyEl.textContent !== text) busyEl.textContent = text;
    if (busyEl.parentNode !== nowEl || busyEl !== nowEl.lastChild) { nowEl.append(busyEl); box.scrollTop = box.scrollHeight; }
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
  /* Every time the app opens the chat starts new, with the welcome; the last session goes into the history (Boon, 27 Nov 2026).
     Straight after signing in (account.js) the chat carries on where it was. */
  if (!(window.GoAccount.justSignedIn() && cur.log.length)) {
    archive();
    cur = { start: Date.now(), last: Date.now(), log: [{ who: 'coach', text: C.INTRO }] };
  }
  save(); render();

  /* The coach's messages in this session, oldest first, without the welcome (for the full-screen board's strip, boardbig.js). */
  const coachTexts = () => cur.log.filter(m => m.who === 'coach' && !isIntro(m.text)).map(m => m.text);
  function changed() { document.dispatchEvent(new Event('gc:chat-changed')); }
  Object.assign(G, { chatCoachTexts: coachTexts, chatFill: fill, chatRecord: record, chatShow: show, chatBusy: busy, newChatSession: newSession, clearChat: clearNow });
})();
