/* Go Coach — how the chat is kept and laid out (Boon's design, 25 Nov 2026).
   The chat is one list, oldest first: what you typed and what the coach said. Only the newest coach's message shows in full; every
   earlier item is one line starting with a dash (tap a coach's line to read it all). The coach's "Position" and "Your move"
   messages are left out of that list once they are no longer the newest.
   A session starts with a date and time. Only pressing New starts a new session (Boon's choice: leaving or reopening the app
   always returns you to where you were). The history sits above, in the same list (Boon, 26 Nov 2026): today's earlier sessions in
   full, earlier days folded under their date. When the app opens and after New, the newest message is scrolled to the top of the
   chat, so only it shows; each new coach's message then moves to the top in the same way, with the line just above it (usually
   your question) still in view. Scroll up for everything before it. There is no Clear.
   chat.js decides what the coach says; this file only stores and shows it. */
(() => {
  'use strict';
  const G = window.GC;
  const { $, KEY, load, store } = G;
  const T = k => window.GoText.T('chat.' + k); /* wording: docs/text/en/chat.md */
  const C = window.GoCoach;
  /* Sessions kept in the history: 100 on the free tier (Boon, 25 Nov 2026). A paid tier would keep them all; there is no
     paid tier yet. */
  const KEEP = 100, MAX = 120;
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

  const save = () => store(KEY.chat, cur);
  /* A session worth keeping has something besides the welcome. */
  function archive() {
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
  /* The history. Earlier sessions from today show in full under their date and time; sessions from earlier days fold into their
     day (tap the day for its sessions by time, a session for its lines). Tap a coach's line to read it all. */
  function drawPast() {
    const today = dayKey(Date.now());
    let day = null, key = null;
    for (const s of past) {
      if (dayKey(s.start) === today) { pastEl.append(stampEl(s.start)); drawSession(pastEl, s, true); continue; }
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

  let pastEl, nowEl, tail;
  function render() {
    box.textContent = '';
    pastEl = document.createElement('div');
    pastEl.className = 'past';
    nowEl = document.createElement('div');
    nowEl.className = 'now';
    tail = document.createElement('div'); /* empty room under the newest message, so it can be scrolled to the top */
    box.append(pastEl, nowEl, tail);
    drawPast();
    drawSession(nowEl, cur, false);
    clipOlder();
    toTop();
  }
  /* Scrolls a message to the top of the chat, with empty room below it, so it shows on its own (with the line above it if withPrev).
     With no message given: the newest one (after New, the newest of the last session). */
  let pinned = null;
  function toTop(target, withPrev) {
    const shown = [...box.querySelectorAll('.msg')].filter(m => m.offsetParent !== null);
    const last = target || shown[shown.length - 1];
    pinned = { target: last, withPrev };
    tail.style.height = '0px';
    if (!last) { box.scrollTop = 0; return; }
    const prev = withPrev ? shown[shown.indexOf(last) - 1] : null;
    const top = Math.max(0, (prev || last).offsetTop - 8), pad = parseFloat(getComputedStyle(box).paddingBottom) || 0;
    tail.style.height = Math.max(0, top + box.clientHeight - tail.offsetTop - pad) + 'px'; /* tail.offsetTop: where the messages end */
    box.scrollTop = top;
  }
  /* A line added under the pinned message (what you typed, "Coach is analysing…"): scrolled into view if it is below the chat's edge. */
  function inView(el) {
    const over = el.offsetTop + el.offsetHeight + 8 - (box.scrollTop + box.clientHeight);
    if (over > 0) box.scrollTop += over;
  }
  /* The chat is drawn before the page has its final size (and it changes when the screen turns or the chat is enlarged):
     keep the pinned message at the top. */
  if (window.ResizeObserver) new ResizeObserver(() => { if (pinned && pinned.target && pinned.target.isConnected) toTop(pinned.target, pinned.withPrev); }).observe(box);

  /* ---------- adding to the chat ---------- */
  function record(who, text) {
    if (!text) return;
    const last = cur.log[cur.log.length - 1];
    if (who === 'coach' && last && last.who === 'coach' && last.text === text) return;
    cur.log.push({ who, text });
    if (cur.log.length > MAX) cur.log.shift();
    cur.last = Date.now();
    save();
    const el = who === 'user' ? userLine(text) : message(text);
    nowEl.append(el);
    if (who === 'coach') { clipOlder(); toTop(el, true); } /* the new message moves to the top (Boon, 26 Nov 2026) */
    else inView(el);
  }
  /* Something that is not kept, such as the lessons menu, shown under the current question. */
  function show(el) {
    nowEl.append(el);
    clipOlder();
    toTop(el, true);
  }
  /* A passing notice, such as "Coach is analysing…": shown at the end of the chat while the work goes on and taken away when it
     is done (Boon, 25 Nov 2026). It is not kept in the session. An empty text takes it away. */
  let busyEl = null;
  function busy(text) {
    if (!text) { if (busyEl) busyEl.remove(); busyEl = null; return; }
    busyEl = busyEl || Object.assign(document.createElement('div'), { className: 'msg busy' });
    if (busyEl.textContent !== text) busyEl.textContent = text;
    if (busyEl.parentNode !== nowEl || busyEl !== nowEl.lastChild) { nowEl.append(busyEl); inView(busyEl); }
  }
  /* New session: the current one goes into the history (above) and a new one starts under it, with the welcome if asked for. */
  function newSession(welcome) {
    archive();
    cur = { start: Date.now(), last: Date.now(), log: welcome ? [{ who: 'coach', text: C.INTRO }] : [] };
    save(); render();
  }

  /* ---------- start ---------- */
  if (firstVisit) cur.log = [{ who: 'coach', text: C.INTRO }];
  save(); render();

  /* firstVisit: nothing was saved yet, so this is a new install; main.js then starts the tour once. */
  Object.assign(G, { chatRecord: record, firstVisit, chatShow: show, chatBusy: busy, newChatSession: newSession });
})();
