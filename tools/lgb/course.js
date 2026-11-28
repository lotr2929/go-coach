/* Live Go Board trial (Boon, 28 Nov 2026): "Learn by playing", Level 1 (30 kyu), Discovering Go. Tried here first, as
   docs/decisions.md says; to be built into Go Coach properly (wording in docs/text, its own file, tests) once Boon is happy.
   A fresh 9×9 game against the computer each time (you play Black). The computer plays an easy game, but at the right
   moments it sets up the level's lessons on purpose: it touches your stone (liberties), puts one of your stones in atari
   that you can save (escape), and leaves one of its own stones with one liberty (capture). The coach guides you at each
   moment; if you miss, the computer really does capture or escape, and Undo lets you try again. The game ends with the
   count (territory). Everything is read by Go Coach's own engine: no AI service. */
(() => {
  'use strict';
  const G = window.GC, E = window.GoEngine;
  const say = t => G.say && G.say(t);
  const C = { on: false, s: null, n: 0, done: {}, task: null, moves: 0, said: {} };
  const H = 1, W = 2; /* the learner plays Black */
  const pt = i => E.coord(C.s.n, i);
  const libs = (b, i) => E.flood(E.geom(C.s.n), b, i).libs;
  const LESSONS = ['Board and stones', 'Liberties', 'Atari: escape', 'Capture', 'Territory and the count'];
  const tick = k => { C.done[k] = true; };
  const progress = () => LESSONS.map((t, k) => (C.done[k] ? '✓ ' : '• ') + (k + 1) + '. ' + t).join('\n');

  /* ---------- the computer's lesson moves ---------- */
  const legal = (s, i, c) => { const r = E.tryPlay(E.geom(s.n), s.board, i, c, s.ko); return r.ok ? r : null; };
  const empties = s => [...s.board.keys()].filter(i => !s.board[i]);
  const nb = (s, i) => E.geom(s.n).nb[i];
  /* Lesson 2: touch the learner's last stone, on the side with the most room. */
  function touchMove(s) {
    const last = [...s.moves].reverse().find(m => m.c === H && m.i >= 0);
    if (!last) return null;
    let best = null;
    for (const p of nb(s, last.i)) {
      if (s.board[p]) continue;
      const r = legal(s, p, W); if (!r) continue;
      const room = libs(r.board, p).length;
      if (!best || room > best.room) best = { move: p, room };
    }
    return best && best.room >= 3 ? best.move : null;
  }
  /* Lesson 3: put a small Black group in atari, where Black can escape to three or more liberties. */
  function atariMove(s) {
    const out = [];
    for (const p of empties(s)) {
      const r = legal(s, p, W); if (!r || r.captured.length) continue;
      if (libs(r.board, p).length < 2) continue; /* White's stone must not be capturable at once */
      for (const a of E.allGroups(s.n, r.board)) {
        if (a.color !== H || a.libs.length !== 1 || a.stones.length > 3 || !a.stones.some(x => nb(s, p).includes(x))) continue;
        const esc = legal({ n: s.n, board: r.board, ko: -1 }, a.libs[0], H);
        if (esc && !esc.captured.length && libs(esc.board, a.libs[0]).length >= 3) out.push({ move: p, target: a.stones[0], lib: a.libs[0] });
      }
    }
    return out.length ? out[Math.floor(Math.random() * out.length)] : null;
  }
  /* Lesson 4: a White stone with one liberty left, beside Black stones, that Black can capture. */
  function selfAtariMove(s) {
    const out = [];
    for (const p of empties(s)) {
      if (nb(s, p).some(x => s.board[x] === W)) continue; /* a lone stone, easy to see */
      if (nb(s, p).filter(x => s.board[x] === H).length < 2) continue;
      const r = legal(s, p, W); if (!r || r.captured.length) continue;
      const l = libs(r.board, p);
      if (l.length !== 1) continue;
      if (E.allGroups(s.n, r.board).some(a => a.color === H && a.libs.length === 1)) continue; /* no counter-atari */
      const cap = legal({ n: s.n, board: r.board, ko: -1 }, l[0], H);
      if (cap && cap.captured.includes(p)) out.push({ move: p, lib: l[0] });
    }
    return out.length ? out[Math.floor(Math.random() * out.length)] : null;
  }

  /* The computer's move in a Level 1 game: a lesson move when one is due, otherwise its usual easy move. */
  const choose = E.chooseMove;
  E.chooseMove = async (s, color, opts) => {
    if (!C.on || s !== C.s || color !== W) return choose(s, color, opts);
    const t = C.task, k = s.moves.length;
    if (t && t.type === 'escape' && libs(s.board, t.target).length === 1 && s.board[t.target] === H) { /* not saved: capture it */
      t.punish = k + 1; return { move: t.lib, note: '' }; /* the move number of the punishment */
    }
    if (t && t.type === 'capture' && s.board[t.stone] === W) { /* not captured: White escapes if it can */
      const r = legal(s, t.lib, W);
      if (r && libs(r.board, t.lib).length >= 2) { t.punish = k + 1; return { move: t.lib, note: '' }; }
    }
    if (!C.done[1] && k <= 4) { const m = touchMove(s); if (m !== null) { C.staged = 'touch'; return { move: m, note: '' }; } }
    if (C.done[1] && !C.done[2] && !C.task && k >= 6) { const m = atariMove(s); if (m) { C.staged = 'atari'; C.next = m; return { move: m.move, note: '' }; } }
    if (C.done[2] && !C.done[3] && !C.task) { const m = selfAtariMove(s); if (m) { C.staged = 'selfatari'; C.next = m; return { move: m.move, note: '' }; } }
    return choose(s, color, Object.assign({}, opts, { level: 'easy' }));
  };
  /* No resigning in a lesson game: it is played to the count. */
  const decide = window.GoEndgame.decide;
  window.GoEndgame.decide = (e, s, color, move, mem) => { const d = decide(e, s, color, move, mem); return C.on && s === C.s && d === 'resign' ? null : d; };

  /* ---------- the coach ---------- */
  function afterComputer(m) {
    const s = C.b, at = pt(m.i);
    const staged = C.staged; C.staged = null;
    if (m.i < 0) { say('White passes: it thinks there is nothing more worth playing. If you agree, pass too, and the game is counted.'); return; }
    if (C.task && C.task.punish === C.moves + 1) {
      const t = C.task; t.shown = true; /* kept, so that Undo brings the lesson back */
      if (t.type === 'escape') say(`White plays ${at} and captures your stone${m.cap > 1 ? 's' : ''}: ${m.cap} prisoner${m.cap > 1 ? 's' : ''} for White. That is what happens to stones left in atari.\n\nTap Undo (↶ under the board) to take back your move and save them this time.`);
      else say(`White plays ${at} and its stone escapes: now it has ${libs(s.board, t.lib).length} liberties, and the chance has gone.\n\nTap Undo (↶ under the board) to take back your move and capture it this time.`);
      return;
    }
    /* The same lessons when they come up in the game by themselves. */
    if (!staged && !C.done[1] && nb(s, m.i).some(x => s.board[x] === H)) C.staged = 'touch';
    if (!staged && C.done[1] && !C.done[2] && !C.task) {
      const a = E.allGroups(s.n, s.board).find(x => x.color === H && x.libs.length === 1 && nb(s, m.i).some(y => x.stones.includes(y)));
      const esc = a && legal(s, a.libs[0], H);
      if (esc && libs(esc.board, a.libs[0]).length >= 2) { C.staged = 'atari'; C.next = { target: a.stones[0], lib: a.libs[0] }; }
    }
    if (!staged && C.done[2] && !C.done[3] && !C.task && s.board[m.i] === W && libs(s.board, m.i).length === 1) {
      const l = libs(s.board, m.i)[0], cap = legal(s, l, H);
      if (cap && cap.captured.includes(m.i)) { C.staged = 'selfatari'; C.next = { lib: l }; }
    }
    if (!staged && C.staged) return afterComputer(m);
    if (staged === 'touch') {
      const mine = nb(s, m.i).filter(x => s.board[x] === H).map(x => E.flood(E.geom(s.n), s.board, x));
      const a = mine[0];
      tick(1);
      say(`**Lesson 2: Liberties.** White plays ${at}, right next to your stone.\n\nThe empty points directly beside a stone (up, down, left and right, not diagonally) are its **liberties**: its breathing space. Your stone at ${pt(a.stones[0])} now has ${a.libs.length} liberties left (${a.libs.map(pt).join(', ')}), because White has taken one. White's stone has ${libs(s.board, m.i).length}.\n\nStones of the same colour that touch along a line join into one group and share their liberties. Keep your stones' liberties in mind as you play.`);
      return;
    }
    if (staged === 'atari') {
      const t = C.next; C.task = { type: 'escape', target: t.target, lib: t.lib, at: s.moves.length };
      const a = E.flood(E.geom(s.n), s.board, t.target);
      say(`**Lesson 3: Atari.** White plays ${at}. Your ${a.stones.length > 1 ? 'group at ' + a.stones.map(pt).join(', ') : 'stone at ' + pt(t.target)} has only **one liberty left**, at ${pt(t.lib)}. A stone with one liberty is in **atari**: if White plays there next, ${a.stones.length > 1 ? 'they are' : 'it is'} captured.\n\n**Your turn:** save ${a.stones.length > 1 ? 'them' : 'it'}. Extend into the last liberty so that the stones join up and gain more liberties.`);
      return;
    }
    if (staged === 'selfatari') {
      const t = C.next; C.task = { type: 'capture', stone: m.i, lib: t.lib, at: s.moves.length };
      say(`**Lesson 4: Capture.** White plays ${at}, but look: that stone has **only one liberty**, at ${pt(t.lib)}. White has put its own stone in atari, a beginner's mistake.\n\n**Your turn:** capture it. Fill its last liberty and it comes off the board.`);
      return;
    }
    if (!C.done[4] && s.moves.length >= 30 && !C.said.territory) {
      C.said.territory = true;
      say(`**Lesson 5: Territory.** The game is now about borders. The empty points you surround are your **territory**; at the end each side scores its stones on the board plus the empty points it surrounds. White also gets 6.5 points (komi) for moving second.\n\nClose the gaps in your borders, and block White where its border meets yours. When there is nothing useful left, pass; when both pass, the game is counted.`);
    }
  }
  function afterHuman(m) {
    const s = C.b;
    if (m.i < 0) return;
    if (!C.said.first) {
      C.said.first = true; tick(0);
      const l = libs(s.board, m.i).length;
      say(`Black plays ${pt(m.i)}. Your stone stands where two lines cross, and it will never move again (unless it is captured). Right now it has ${l} empty points next to it: remember that number.`);
    }
    const t = C.task;
    if (t && t.shown) { C.task = null; return; } /* played on instead of Undo: the lesson comes round again later */
    if (!t) return;
    if (t.type === 'escape') {
      if (s.board[t.target] !== H) return;
      const l = libs(s.board, t.target).length, many = E.flood(E.geom(s.n), s.board, t.target).stones.length > 1;
      if (l >= 2) {
        C.task = null; tick(2);
        say(`Well done: your ${many ? 'stones' : 'stone'} ${m.i === t.lib && many ? 'joined up' : 'got away'} and now ${many ? 'have' : 'has'} ${l} liberties. You escaped from atari.${l === 2 ? ' Two liberties is still tight: keep an eye on them.' : ''}\n\n${progress()}`);
      } else say(`Your ${many ? 'stones are' : 'stone is'} still in atari, with one liberty at ${pt(t.lib)}. White will capture ${many ? 'them' : 'it'} next unless you save ${many ? 'them' : 'it'} now.`);
    } else if (t.type === 'capture') {
      if (s.board[t.stone] === W) { say(`White's stone at ${pt(t.stone)} still has one liberty, at ${pt(t.lib)}. White will try to save it now.`); return; }
      C.task = null; tick(3);
      say(`Captured! White's stone comes off the board and becomes your prisoner. Capturing is how you remove stones: take away every liberty.\n\n${progress()}`);
    }
  }
  function atCount() {
    if (C.said.count) return;
    C.said.count = true; tick(4);
    const sc = E.scoreArea(C.s.n, C.s.board, G.Play.dead);
    say(`**The count.** Both players passed, so the game is over. Each side scores its stones plus the empty points it surrounds: Black ${sc.black}, White ${sc.white} + 6.5 komi = ${sc.white + 6.5}. ${sc.black > sc.white + 6.5 ? 'Black wins' : 'White wins'} by ${Math.abs(sc.black - sc.white - 6.5)}.\n\nIf some stones are clearly dead (they could never escape), tap them to take them off before you confirm.\n\n**Level 1 complete.**\n${progress()}\n\nPlay Level 1 again for a new game, or try Level 2 when it is ready.`);
  }

  /* Follows the game: each new move, an undo, the count. */
  document.addEventListener('gc:play-changed', () => setTimeout(() => {
    const P = G.Play;
    if (!C.on) return;
    if (P.s !== C.s) { C.on = false; return; } /* a new game ends the lesson game */
    const k = P.s.moves.length;
    if (k < C.moves) { /* undo */
      if (C.task && C.task.at > k) C.task = null;
      if (C.task) { C.task.punish = 0; C.task.shown = false; }
      C.moves = k; return;
    }
    for (; C.moves < k; C.moves++) {
      const m = P.s.moves[C.moves];
      C.b = E.stateAt(P.s, C.moves + 1); /* the board just after this move (the computer may already have answered) */
      if (m.c === H) afterHuman(m); else afterComputer(m);
    }
    if (P.phase === 'scoring' && !P.thinking) atCount();
  }, 0));

  function start() {
    const st = G.settings;
    Object.assign(st, { size: 9, colour: 'black', level: 'easy', handicap: 0, mode: 'play' });
    if (G.saveSettings) G.saveSettings();
    C.on = false;
    G.startNewGame();
    Object.assign(C, { on: true, s: G.Play.s, done: {}, task: null, moves: 0, said: {} });
    say(`**Learn by playing — Level 1 (30 kyu): Discovering Go.** A real game against the computer, with five lessons on the way:\n${progress()}\n\n**Lesson 1: The board and stones.** Go is played on a 19×19 board (361 points), a 13×13 (169) or a 9×9 (81). The rules are the same on all three; the 9×9 board is quick, so it is the best place to learn. Stones are played on the points where the lines cross, not in the squares. Black plays first, then you take turns. The aim is to surround more of the board than your opponent.\n\nYou are Black. **Your turn:** place your first stone anywhere. A point near the middle, or on the third line in from a corner, is a good start.`);
  }

  /* Ways in: the Lessons menu, and asking in the chat ("level 1", "learn by playing"). */
  if (G.lessonFiles) {
    const items = G.lessonFiles.menuItems;
    G.lessonFiles.menuItems = () => [{ head: true, label: 'Learn by playing', note: 'A real game against the computer, with five lessons on the way.' },
      { label: '• Level 1 (30 kyu): Discovering Go', run: () => { if (G.exitLesson) G.exitLesson(); start(); } }].concat(items());
  }
  const ask = G.askCoach;
  G.askCoach = q => (/\b(level\s*(1|one)|learn(ing)? by playing|discovering go)\b/i.test(q) ? (start(), true) : ask ? ask(q) : false);
  G.courseLevel1 = start;
})();
