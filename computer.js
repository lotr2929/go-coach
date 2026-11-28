/* Go Coach — the Computer panel (Boon, 28 Nov 2026). The board full screen is Game mode: there is no coach (shrink the board to
   reach it). In a game against the computer this panel shows what the computer does, under the header "Computer:": its moves, passes,
   "Thinking…" while it chooses, and its resignation. The player cannot type into it. It is built from the game itself
   (Play.s.moves), so undo, redo, a restored game and a new game are always shown correctly.
   Lessons, famous games, puzzles, Set up and the other board modes have no computer opponent, so no panel: just the board.
   style.css shows the panel only with body.boardBig.ownGame: under the score on its side, under undo and redo upright. */
(() => {
  'use strict';
  const G = window.GC;
  const { $, E } = G;
  const T = (k, v) => window.GoText.T('computer.' + k, v); /* wording: docs/text/en/computer.md */
  const list = $('#computerLog');

  /* A game against the computer, the guided first game too: no other mode has the board (the modes renderPlay hands it to). */
  function ownGame() {
    const P = G.Play;
    return !!(P && P.s) && !(G.Lesson && G.Lesson.on) && !(G.teaching && G.teaching.on) &&
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
