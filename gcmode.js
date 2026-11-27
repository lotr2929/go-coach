/* Go Coach - Puzzle mode, the daily puzzles (Boon, 27 Nov 2026). Clicking the title "Go Coach" (or its logo) turns it on or off.
   On: today's puzzle, picked at the player's Go Coach grade (moved up or down by the level chosen in Settings) from the puzzles in
   puzzles/, the same one all day; solving a puzzle keeps up a streak of days ("?? 3" beside the grade at the top); "Next puzzle" keeps
   going. "Previous puzzle" goes back to the one before, unsolved, to play again. "Puzzles list" shows the puzzles already solved, never
   the full list. Free players have FREE new puzzles a day; subscribers (G.subscriber, not built yet) have no limit.
   The puzzles run in the usual lesson view (learn.js, lessonfiles.js), so no new board mode is needed. */
(() => {
  'use strict';
  const G = window.GC;
  const T = (k, v) => window.GoText.T('gcmode.' + k, v); /* wording: docs/text/en/gcmode.md */
  const KEY = { today: 'gocoach.today', streak: 'gocoach.streak', level: 'gocoach.gclevel', plays: 'gocoach.gcplays' };
  const FREE = 3; /* free puzzles a day once the beta ends; subscribers have no limit (Boon, 27 Nov 2026) */
  /* Signed in, the records are kept on the device; a guest's only in memory for this visit, so nothing is recorded (Boon, 27 Nov 2026). */
  const mem = {}, keep = () => window.GoAccount.signedIn();
  const read = (k, d) => { if (!keep()) return k in mem ? JSON.parse(mem[k]) : d; try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const write = (k, v) => { if (!keep()) { mem[k] = JSON.stringify(v); return; } try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const dayOf = d => d.toLocaleDateString('en-CA'); /* YYYY-MM-DD in the player's own time zone */
  const today = () => dayOf(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayOf(d); };
  const M = { on: false };
  const trail = []; let at = -1; /* the puzzles opened this visit, for "Previous puzzle" */
  const load = () => G.lessonFiles.loadIndex('puzzles');

  /* The streak: days in a row with a puzzle solved in Puzzle mode. It lapses after a day missed. */
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

  /* The level the player asked for in Settings: kyu steps from their own grade (easier is a positive number); a setting of the device. */
  const level = () => { const v = +read(KEY.level, 0); return Number.isFinite(v) ? v : 0; };
  /* New puzzles opened today (one opened again counts once); a guest's count lasts only for the visit. */
  const plays = () => { const p = read(KEY.plays, null); return p && p.date === today() ? p : { date: today(), ids: [] }; };
  const solvedId = e => G.Lesson.done.has('file:' + e.id);
  const BETA = true; /* no daily limit during the free beta (Boon, 27 Nov 2026); set to false when subscriptions start */
  const canPlay = e => BETA || !!G.subscriber || solvedId(e) || plays().ids.includes(e.id) || plays().ids.length < FREE;
  function openEntry(e) {
    if (!canPlay(e)) { G.say(T('limit', { n: FREE })); return null; }
    const p = plays();
    if (!solvedId(e) && !p.ids.includes(e.id)) { p.ids.push(e.id); write(KEY.plays, p); }
    return G.lessonFiles.openFile(e);
  }
  /* A new puzzle: put on the trail, then opened. */
  function openNew(e) {
    if (!canPlay(e)) { G.say(T('limit', { n: FREE })); return null; }
    trail.splice(at + 1); trail.push(e.id); at = trail.length - 1;
    return openEntry(e);
  }

  /* The player's estimate in kyu (25 for a new player, as in grade.js). */
  function myKyu() {
    const GR = window.GoGrade, st = G.grade ? G.grade.read() : null;
    return st && st.whole !== null ? GR.toKyu(st.r) : GR.START;
  }
  /* The best puzzle at the chosen level that is not solved yet: the nearest in difficulty, the harder one first on a tie. */
  function pick(index, skip) {
    const k = myKyu() + level();
    const open = index.filter(e => !solvedId(e) && e.id !== skip && !trail.includes(e.id));
    open.sort((a, b) => Math.abs(a.kyu - k) - Math.abs(b.kyu - k) || a.kyu - b.kyu);
    return open[0] || null;
  }

  async function start() {
    const index = await load();
    if (!index) { G.say(T('no-puzzles')); return; }
    M.on = true; paint();
    /* Back in Puzzle mode during the same visit: carry on with the puzzle the player was on (Boon, 27 Nov 2026). A new visit
       starts afresh: a guest at puzzle 1, a signed-in player at today's puzzle. */
    const was = at >= 0 && index.find(e => e.id === trail[at]);
    if (was) { G.say(T('welcome-again')); return openEntry(was); }
    let t = read(KEY.today, null);
    if (!t || t.date !== today() || !index.some(e => e.id === t.id)) {
      const e = pick(index);
      t = e ? { date: today(), id: e.id, solved: false } : null;
      if (t) write(KEY.today, t);
    }
    const n = streak(), days = T(n === 1 ? 'day' : 'days', { n });
    if (t && !t.solved) {
      G.say(T(n ? 'welcome-streak' : 'welcome', { days }));
      return openNew(index.find(e => e.id === t.id));
    }
    G.say(T('done-today', { days }));
    return next();
  }
  function stop() {
    M.on = false; paint();
    if (G.Lesson && G.Lesson.on) G.exitLesson();
  }
  /* "Next puzzle": forward along the trail if the player went back, otherwise a new puzzle at their level. */
  async function next(currentId) {
    const index = await load();
    if (!index) { G.say(T('no-puzzles')); return; }
    if (at < trail.length - 1) { const e = index.find(x => x.id === trail[at + 1]); if (e) { at++; return openEntry(e); } }
    const e = pick(index, currentId && currentId.replace(/^file:/, ''));
    if (!e) { G.say(T('all-done')); return; }
    return openNew(e);
  }
  /* "Previous puzzle": the one before, as it was before solving, to play again. */
  async function prev() {
    const index = await load();
    if (!index || at <= 0) { G.say(T('no-previous')); return; }
    const e = index.find(x => x.id === trail[at - 1]);
    if (!e) { G.say(T('no-previous')); return; }
    at--; return openEntry(e);
  }
  /* "Puzzles list": the puzzles the player has solved, easiest first; the full list stays hidden. */
  async function list() {
    const index = await load();
    const mine = (index || []).filter(solvedId);
    if (!mine.length) { G.say(T('list-empty')); return; }
    const items = [{ head: true, label: T('list-head', { n: mine.length }), note: T('list-note') }];
    for (const e of mine) items.push({ label: T('list-label', { grade: G.lessonFiles.gradeText(e.kyu), title: e.title }), done: true, run: () => { trail.splice(at + 1); trail.push(e.id); at = trail.length - 1; openEntry(e); } });
    G.chatMenu(items, T('list-title'));
  }
  /* A puzzle solved in Puzzle mode (learn.js): today's puzzle is ticked and the streak moves on, once a day. */
  function solved(L) {
    if (!M.on || !L.file || !L.puzzle) return;
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
  /* Leaving the lesson view (Back to game, or New) also leaves Puzzle mode. */
  function left() { if (M.on) { M.on = false; paint(); } }

  if (h1) {
    h1.style.cursor = 'pointer';
    h1.title = T('toggle');
    h1.setAttribute('role', 'button'); h1.tabIndex = 0;
    const toggle = () => { if (G.Play && G.Play.thinking) return G.say(window.GoText.T('app.busy-thinking')); return M.on ? stop() : start(); };
    h1.addEventListener('click', toggle);
    h1.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }
  /* Settings: the level of the puzzles (a drop-down in index.html). */
  const sel = document.getElementById('setGcLevel');
  if (sel) { sel.value = String(level()); sel.addEventListener('change', () => write(KEY.level, +sel.value)); }
  paint();
  Object.assign(M, { start, stop, next, prev, list, solved, left, streak });
  G.gcMode = M;
})();
