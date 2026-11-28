/* Go Coach — the Computer panel (Boon, 28 Nov 2026). The board full screen is Game mode: there is no coach (shrink the board to
   reach it). In a game against the computer this panel shows what the computer does, under the header "Computer:": its moves, passes,
   "Thinking…" while it chooses, and its resignation. The player cannot type into it; the list scrolls, and tapping a move takes
   the game back (or forward) to it. It is built from the game itself (Play.s.moves and Play.redo), so undo, redo, a restored game
   and a new game are always shown correctly.
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

  /* The whole line of play: the moves on the board, then any taken back (Undo or a tap here), which Redo can bring back.
     Play.redo is a stack: the last entry pushed holds the next moves. */
  function line() {
    const P = G.Play, out = P.s.moves.slice();
    for (let r = P.redo.length - 1; r >= 0; r--) out.push(...P.redo[r]);
    return out;
  }

  /* One row per computer move. A tap takes the game to just after that move (Boon, 28 Nov 2026), as a tap on the move tree
     does (play.js jumpTo); moves after it stay in the list, greyed, and a tap on one goes forward again. */
  function paint() {
    const own = ownGame();
    document.body.classList.toggle('ownGame', own);
    if (!own) return;
    const P = G.Play, s = P.s, all = line(), on = s.moves.length, canJump = P.phase === 'play';
    list.textContent = '';
    let cur = null;
    all.forEach((m, k) => {
      if (P.both || m.c === P.human) return; /* only the computer's own moves */
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button';
      b.textContent = m.i < 0 ? T('pass', { n: k + 1 }) : T('move', { n: k + 1, point: E.coord(s.n, m.i) });
      b.title = T('go-to');
      b.disabled = !canJump;
      if (k >= on) li.className = 'later';
      b.addEventListener('click', () => G.jumpTo(all.slice(0, k + 1)));
      li.append(b); list.append(li);
      if (k < on) cur = li;
    });
    if (cur) cur.classList.add('now');
    const extra = P.compResigned ? T('resigned') : P.thinking && P.phase === 'play' && s.turn !== P.human && !P.both ? T('thinking') : '';
    if (extra) { const li = document.createElement('li'); li.className = 'note'; li.textContent = extra; list.append(li); cur = li; }
    /* the latest move (or "Thinking…") in view; the list scrolls by itself, never the page */
    if (cur) list.scrollTop = Math.max(0, cur.offsetTop + cur.offsetHeight - list.clientHeight + 4);
  }

  document.addEventListener('gc:play-changed', () => setTimeout(paint, 0)); /* after renderPlay has finished */
  document.addEventListener('gc:chat-changed', paint); /* a mode starting or ending says something in the chat */
  paint();
})();
