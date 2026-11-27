/* Go Coach — Go Coach mode, the daily game (Boon, 27 Nov 2026). Clicking the title "Go Coach" (or its logo) turns it on or off.
   On: today's lesson, picked at the player's Go Coach grade from the lessons by grade (lessons/), the same one all day; solving a
   lesson in the mode keeps up a streak of days ("🔥 3" beside the grade at the top); after today's lesson, "Next" keeps going
   with more lessons at the player's grade. The grade itself (two decimals) shows the journey. The lessons run in the usual
   lesson view (learn.js, lessonfiles.js), so no new board mode is needed. Kept on this device until sign-in is built. */
(() => {
  'use strict';
  const G = window.GC;
  const T = (k, v) => window.GoText.T('gcmode.' + k, v); /* wording: docs/text/en/gcmode.md */
  const KEY = { today: 'gocoach.today', streak: 'gocoach.streak', level: 'gocoach.gclevel', plays: 'gocoach.gcplays' };
  const FREE = 3; /* free games a day; subscribers have no limit (Boon, 27 Nov 2026). Subscriptions are not built yet: G.subscriber will say. */
  /* Signed in, the records are kept on the device; a guest's only in memory for this visit, so nothing is recorded (Boon, 27 Nov 2026). */
  const mem = {}, keep = () => window.GoAccount.signedIn();
  const read = (k, d) => { if (!keep()) return k in mem ? JSON.parse(mem[k]) : d; try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const write = (k, v) => { if (!keep()) { mem[k] = JSON.stringify(v); return; } try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const dayOf = d => d.toLocaleDateString('en-CA'); /* YYYY-MM-DD in the player's own time zone */
  const today = () => dayOf(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayOf(d); };
  const M = { on: false };

  /* The streak: days in a row with a lesson solved in Go Coach mode. It lapses after a day missed. */
  function streak() {
    const st = read(KEY.streak, { last: '', days: 0 });
    return st.last === today() || st.last === yesterday() ? st.days : 0;
  }
  const h1 = document.querySelector('header h1');
  const tag = document.createElement('span');
  tag.className = 'userStreak';
  function paint() {
    const n = streak();
    tag.textContent = n ? T('streak-badge', { n }) : '';
    tag.title = T('streak-about', { days: T(n === 1 ? 'day' : 'days', { n }) });
    if (h1) h1.classList.toggle('gcOn', M.on);
  }
  const after = document.querySelector('header .userGrade') || document.querySelector('header .userName');
  if (after) after.after(tag);

  /* The level the player asked for in Settings: kyu steps from their own grade (easier is a positive number), kept on this device. */
  const level = () => { const v = +read(KEY.level, 0); return Number.isFinite(v) ? v : 0; };
  /* Games opened today (a game opened twice counts once). Free players have FREE a day. */
  const plays = () => { const p = read(KEY.plays, null); return p && p.date === today() ? p : { date: today(), ids: [] }; };
  const BETA = true; /* no daily limit during the free beta (Boon, 27 Nov 2026); set to false when subscriptions start */
  const canPlay = id => BETA || !!G.subscriber || plays().ids.includes(id) || plays().ids.length < FREE;
  function open(e) {
    if (!canPlay(e.id)) { G.say(T('limit', { n: FREE })); return null; }
    const p = plays(); if (!p.ids.includes(e.id)) { p.ids.push(e.id); write(KEY.plays, p); }
    return G.lessonFiles.openFile(e);
  }

  /* The player's estimate in kyu (25 for a new player, as in grade.js). */
  function myKyu() {
    const GR = window.GoGrade, st = G.grade ? G.grade.read() : null;
    return st && st.whole !== null ? GR.toKyu(st.r) : GR.START;
  }
  /* The best lesson at the player's grade that is not solved yet: the nearest in difficulty, the harder one first on a tie. */
  function pick(index, skip) {
    const k = myKyu() + level(), done = G.Lesson.done;
    const open = index.filter(e => !done.has('file:' + e.id) && e.id !== skip);
    open.sort((a, b) => Math.abs(a.kyu - k) - Math.abs(b.kyu - k) || a.kyu - b.kyu);
    return open[0] || null;
  }

  async function start() {
    const index = await G.lessonFiles.loadIndex();
    if (!index) { G.say(T('no-lessons')); return; }
    M.on = true; paint();
    let t = read(KEY.today, null);
    if (!t || t.date !== today() || !index.some(e => e.id === t.id)) {
      const e = pick(index);
      t = e ? { date: today(), id: e.id, solved: false } : null;
      if (t) write(KEY.today, t);
    }
    const n = streak(), days = T(n === 1 ? 'day' : 'days', { n });
    if (t && !t.solved) {
      G.say(T(n ? 'welcome-streak' : 'welcome', { days }));
      return open(index.find(e => e.id === t.id));
    }
    G.say(T('done-today', { days }));
    return next();
  }
  function stop() {
    M.on = false; paint();
    if (G.Lesson && G.Lesson.on) G.exitLesson();
  }
  /* "Next" in Go Coach mode: another lesson at the player's grade. */
  async function next(currentId) {
    const index = await G.lessonFiles.loadIndex();
    const e = index && pick(index, currentId && currentId.replace(/^file:/, ''));
    if (!e) { G.say(T('all-done')); return; }
    return open(e);
  }
  /* A lesson solved in Go Coach mode (learn.js): today's lesson is ticked and the streak moves on, once a day. */
  function solved(L) {
    if (!M.on || !L.file) return;
    const t = read(KEY.today, null), id = L.id.replace(/^file:/, '');
    if (t && t.date === today() && t.id === id) { t.solved = true; write(KEY.today, t); }
    if (!keep()) return; /* no streak for a guest */
    const st = read(KEY.streak, { last: '', days: 0 });
    if (st.last === today()) return;
    const days = st.last === yesterday() ? st.days + 1 : 1;
    write(KEY.streak, { last: today(), days });
    paint();
    G.say(T(days === 1 ? 'streak-started' : 'streak-up', { days: T('days', { n: days }) }));
  }
  /* Leaving the lesson view (Back to game, or New) also leaves Go Coach mode. */
  function left() { if (M.on) { M.on = false; paint(); } }

  if (h1) {
    h1.style.cursor = 'pointer';
    h1.title = T('toggle');
    h1.setAttribute('role', 'button'); h1.tabIndex = 0;
    const toggle = () => { if (G.Play && G.Play.thinking) return G.say(window.GoText.T('app.busy-thinking')); return M.on ? stop() : start(); };
    h1.addEventListener('click', toggle);
    h1.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }
  /* Settings: the level of the games (a drop-down in index.html). */
  const sel = document.getElementById('setGcLevel');
  if (sel) { sel.value = String(level()); sel.addEventListener('change', () => write(KEY.level, +sel.value)); }
  paint();
  Object.assign(M, { start, stop, next, solved, left, streak });
  G.gcMode = M;
})();
