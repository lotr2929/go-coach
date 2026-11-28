/* Go Coach — the Computer panel (Boon, 28 Nov 2026). With the board full screen in your own game there is no coach: the coach
   strip steps aside and this panel shows what the computer does, under the header "Computer:": each of its moves, its passes,
   "Thinking…" while it chooses, and its resignation. The player cannot type into it. It is built from the game itself
   (Play.s.moves), so undo, redo, a restored game and a new game are always shown correctly.
   Lessons, famous games, puzzles, the guided first game, Set up and the other board modes keep the coach strip (boardbig.js).
   style.css shows the panel only with body.boardBig.ownGame: under the score on its side, under undo and redo upright. */
(() => {
  'use strict';
  const G = window.GC;
  const { $, E } = G;
  const T = (k, v) => window.GoText.T('computer.' + k, v); /* wording: docs/text/en/computer.md */
  const list = $('#computerLog');

  /* Your own game against the computer: no other mode has the board (the same modes renderPlay hands the board to). */
  function ownGame() {
    const P = G.Play;
    return !!(P && P.s) && !P.guided && !(G.Lesson && G.Lesson.on) && !(G.teaching && G.teaching.on) &&
      !(G.exploring && G.exploring.on) && !(G.kifu && G.kifu.on) && !(G.setupOn && G.setupOn());
  }

  function lines() {
    const P = G.Play, s = P.s, out = [];
    s.moves.forEach((m, k) => {
      if (P.both || m.c === P.human) return; /* only the computer's own moves */
      out.push(m.i < 0 ? T('pass', { n: k + 1 }) : T('move', { n: k + 1, point: E.coord(s.n, m.i) }));
    });
    if (P.compResigned) out.push(T('resigned'));
    else if (P.thinking && P.phase === 'play' && s.turn !== P.human && !P.both) out.push(T('thinking'));
    return out;
  }

  function paint() {
    const own = ownGame();
    document.body.classList.toggle('ownGame', own);
    if (!own) return;
    const text = lines();
    list.textContent = '';
    for (const t of text) { const li = document.createElement('li'); li.textContent = t; list.append(li); }
    list.scrollTop = list.scrollHeight; /* the newest at the bottom, in view */
  }

  document.addEventListener('gc:play-changed', () => setTimeout(paint, 0)); /* after renderPlay has finished */
  document.addEventListener('gc:chat-changed', paint); /* a mode starting or ending says something in the chat */
  paint();
})();
