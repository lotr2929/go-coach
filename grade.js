/* Go Coach — the Go Coach grade, version 1 (Boon, 27 Nov 2026): a kyu grade that moves after every game against the computer
   and every lesson exercise, shown at the top beside the player's name, e.g. "18 kyu (17.62)".
   How it works (see docs/decisions.md, "Go Coach grade"): a rating like the European Go Federation's, 100 points a grade
   (r = 2100 − 100 × kyu, so 1 dan is 2100). Each computer level and each lesson exercise has a place on the scale; a result
   moves the rating by K × weight × (result − expected). New players move faster. Only games played without help count (Boon,
   27 Nov 2026): not games with Coach mode, Analyse, hints or undo, nor the guided first game, playing both sides, games changed
   with Set up or very short games. Lessons count in full, first try only, never after a hint (Boon: lessons are the heart of it).
   Kept on this device for now; it will follow the player once sign-in is built. Local only: no network.
   The rules below are plain functions (tested in test-grade.js); the part that touches the page runs only in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoGrade = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const START = 25;           /* a new player's estimate, in kyu: uncertain, so it moves fast at first */
  const SCALE = 120;          /* about 70% wins against a player one grade weaker, as in European ratings at kyu level */
  /* The computer's strength in kyu. 9×9 measured against KataGo (25 Nov 2026): Easy about 30 kyu, Medium about 20 kyu,
     Hard about 7 to 8 kyu. 13×13 and 19×19 are estimates until measured: the engine is weaker on larger boards. */
  const LEVEL_KYU = { 9: { easy: 30, medium: 20, hard: 8 }, 13: { easy: 30, medium: 22, hard: 12 }, 19: { easy: 30, medium: 24, hard: 15 } };
  /* What one handicap stone is worth, in grades, by board size (a stone matters more on a small board). */
  const STONE = { 9: 3, 13: 2, 19: 1 };

  const toR = kyu => 2100 - 100 * kyu;
  const toKyu = r => (2100 - r) / 100;
  const expected = (r, opp) => 1 / (1 + Math.exp(-(r - opp) / SCALE));
  const fresh = () => ({ r: toR(START), events: 0, whole: null, streak: 0, games: 0, lessons: [] });
  const kFor = st => (st.events < 10 ? 120 : st.events < 30 ? 80 : 50);

  /* The computer's effective strength in a game: its level, made weaker when the player (Black) has handicap stones, or
     stronger when the computer is Black and has them. */
  function opponentKyu(g) {
    const size = g.size <= 9 ? 9 : g.size <= 13 ? 13 : 19;
    const base = (LEVEL_KYU[size] || LEVEL_KYU[9])[g.level] || 20;
    const stones = g.handicap >= 2 ? g.handicap : 0;
    return base + (g.human === 1 ? 1 : -1) * stones * STONE[size];
  }
  function gameWeight(g) {
    return g.guided || g.both || g.edited || g.helped || g.moves < 10 ? 0 : 1;
  }
  /* A lesson exercise's difficulty: the lessons run from about 30 kyu (the first) to about 18 kyu (the last). */
  const lessonKyu = (idx, total) => 30 - 12 * (total > 1 ? idx / (total - 1) : 0);

  /* Applies one result (1 win or solved, 0 loss or wrong) against opponent strength oppKyu with the given weight.
     Returns the new state and what changed, for the message. */
  function apply(st, oppKyu, result, weight) {
    st = Object.assign(fresh(), st);
    const before = toKyu(st.r);
    const exp = expected(st.r, toR(oppKyu));
    st.r += kFor(st) * weight * (result - exp);
    st.events++;
    /* The whole grade is steady: it goes up once the estimate has passed the next grade for 3 results in a row, and down once
       the estimate is 0.3 or more below it for 3 results in a row. The first result sets it. */
    const est = toKyu(st.r), target = Math.ceil(est - 1e-9);
    let change = 0;
    if (st.whole === null) st.whole = target;
    else {
      const dir = target < st.whole ? -1 : est > st.whole + 0.3 ? 1 : 0; /* −1 towards a stronger grade, +1 towards a weaker one */
      st.streak = !dir ? 0 : Math.sign(st.streak) === dir ? st.streak + dir : dir;
      if (Math.abs(st.streak) >= 3) { change = st.whole - target; st.whole = target; st.streak = 0; }
    }
    return { st, before, after: est, change };
  }

  /* "18 kyu (17.62)", or "2 dan (1.40)" above 1 kyu (on this scale 1.00 dan is kyu 0). */
  function display(st) {
    if (!st || st.whole === null) return null;
    const est = toKyu(st.r);
    if (st.whole >= 1) return { whole: st.whole, unit: 'kyu', est: est.toFixed(2) };
    return { whole: 1 - st.whole, unit: 'dan', est: (1 - est).toFixed(2) };
  }

  const api = { START, LEVEL_KYU, STONE, toR, toKyu, expected, fresh, opponentKyu, gameWeight, lessonKyu, apply, display };
  if (typeof document === 'undefined' || !self.GC) return api;

  /* ---------- in the page ---------- */
  const G = self.GC, KEY = 'gocoach.grade', SHOW = 'gocoach.grade.show';
  const T = (k, v) => self.GoText.T('grade.' + k, v);
  const read = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { return fresh(); } };
  const save = st => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage unavailable */ } };
  const shown = () => { try { return localStorage.getItem(SHOW) !== '0'; } catch (e) { return true; } };
  const text = st => { const d = display(st); return d ? T(d.unit, { whole: d.whole, est: d.est }) : ''; };

  /* The grade in the header, after the name; hidden by the Settings switch. */
  const tag = document.createElement('span');
  tag.className = 'userGrade'; tag.title = T('about');
  const name = document.querySelector('header .userName');
  if (name) name.after(tag); else { const h = document.querySelector('header'); if (h) h.append(tag); }
  const paint = () => { tag.textContent = shown() ? text(read()) : ''; };

  /* The switch in Settings, under the name box. */
  const nameBox = document.getElementById('setName');
  if (nameBox) {
    const wrap = document.createElement('label');
    wrap.className = 'opt check';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.id = 'setShowGrade'; box.checked = shown();
    box.addEventListener('change', () => { try { localStorage.setItem(SHOW, box.checked ? '1' : '0'); } catch (e) { /* storage unavailable */ } paint(); });
    wrap.append(box, document.createTextNode(' ' + T('show')));
    nameBox.parentElement.after(wrap);
  }

  /* One message after each result that counts: the new grade and how far it moved. */
  function report(res, why) {
    save(res.st); paint();
    if (!shown()) return;
    const d = res.after - res.before, moved = Math.abs(d).toFixed(2);
    const line = T(why, { grade: text(res.st), move: d < 0 ? T('up', { n: moved }) : d > 0 ? T('down', { n: moved }) : T('same') });
    const extra = res.change > 0 ? '\n' + T('promoted', { grade: text(res.st) }) : res.change < 0 ? '\n' + T('demoted', { grade: text(res.st) }) : '';
    G.say(line + extra);
  }
  /* A guest's games and exercises are not recorded and do not move a grade: sign in first (Boon, 27 Nov 2026). */
  const keep = () => !window.GoAccount || window.GoAccount.signedIn();
  function game(g) {
    if (!keep()) return;
    if (!gameWeight(g)) { if (g.helped && !g.guided && !g.both && shown()) G.say(T('not-counted-help')); return; }
    const res = apply(read(), opponentKyu(g), g.won ? 1 : 0, 1);
    res.st.games++;
    report(res, 'after-game');
  }
  /* kyu: the exercise's difficulty (a lesson file's DI, or lessonKyu() for the built-in lessons). */
  function lesson(id, kyu, solved) {
    if (!keep()) return;
    const st = read();
    if (st.lessons.includes(id)) return; /* first try only */
    st.lessons.push(id);
    if (solved === null) { save(st); return; } /* a hint was used first: this exercise never counts */
    report(apply(st, kyu, solved ? 1 : 0, 1), solved ? 'after-lesson' : 'after-lesson-wrong');
  }
  paint();
  Object.assign(api, { game, lesson, read, text: () => text(read()) });
  G.grade = api;
  return api;
});
