/* Go Coach — Set up: change the stones on the board by hand, then play on from that position. It starts from the board as it
   is; a new, empty board comes from New (Boon, 25 Nov 2026).
   While setting up, the Set up button reads Done and a Cancel button appears beside it; the other buttons wait. Tap an empty
   point to place a stone of the colour shown at the top of the board (tap it there to switch). Tap a stone to select it (a ring
   shows it), tap it again to remove it; a tap anywhere else only deselects it. The stones are placed on a copy of the board:
   Done plays on from that position with the same side to move, Cancel goes back to the game as it was. Wording: setup.md. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, Play, playView, settings, colourName } = G;
  const T = (k, v) => window.GoText.T('setup.' + k, v);

  const S = { on: false, n: 9, board: null, colour: 1, turn: 1, sel: -1, phase: 'play' };
  const on = () => S.on;

  function start() {
    if (!Play.s) return;
    if (S.on) return G.say(T('already'));
    if ((G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on)) return G.say(T('finish-first'));
    Play.token++; Play.thinking = false; Play.pending = -1; Play.hint = []; /* stops the computer if it was thinking */
    Object.assign(S, { on: true, n: Play.s.n, board: Play.s.board.slice(), colour: 1, turn: Play.s.turn, sel: -1, phase: Play.phase });
    Play.phase = 'setup'; /* the game's own help, analysis and moves wait while you set up */
    if (G.pageOpen && G.pageOpen()) G.closePage();
    G.say(T('started'));
    G.renderPlay();
  }

  function render() {
    for (const id of ['#lessonBar', '#quizOptions', '#scorePanel', '#kifuBar', '#posInfo']) $(id).hidden = true;
    $('#controls').hidden = false; $('#chat').hidden = false;
    for (const b of $('#controls').querySelectorAll('button')) b.disabled = b.id !== 'btnSetup' && b.id !== 'btnSCancel';
    $('#btnSetup').textContent = T('done-button'); $('#btnSetup').classList.add('primary'); $('#btnSCancel').hidden = false;
    playView.set({
      n: S.n, board: S.board, last: -1, ko: -1, coords: settings.coords, libs: false, marks: {}, markColor: 0, hint: S.sel >= 0 ? [S.sel] : [],
      ghost: -1, ghostColor: S.colour, hoverColor: S.sel >= 0 ? 0 : S.colour, terr: null, dead: null, own: null, shapes: null
    });
    let nb = 0, nw = 0;
    for (const v of S.board) { if (v === 1) nb++; else if (v === 2) nw++; }
    G.stoneCounts($('#whoTurn'), nb, nw, S.colour); /* the colour being placed is underlined; tap the counts to switch */
    $('#whoTurn').classList.add('pick');
    $('#capsInfo').textContent = '';
  }

  function tap(i) {
    if (S.sel >= 0) { if (i === S.sel) S.board[i] = 0; S.sel = -1; } /* second tap on the selected stone removes it; elsewhere deselects */
    else if (S.board[i]) S.sel = i;
    else S.board[i] = S.colour;
    G.click(); render();
  }

  function close() {
    S.on = false; S.sel = -1;
    for (const b of $('#controls').querySelectorAll('button')) b.disabled = false; /* renderPlay then disables what the game needs */
    $('#btnSetup').textContent = window.GoText.T('screen.setup'); $('#btnSetup').classList.remove('primary'); $('#btnSCancel').hidden = true;
    $('#whoTurn').classList.remove('pick');
  }
  /* Cancel: back to the game exactly as it was. */
  function cancel() {
    if (!S.on) return;
    close();
    Play.phase = S.phase;
    G.say(T('cancelled'));
    G.renderPlay();
    if (Play.phase === 'play') G.resumeTurn();
  }
  /* Done: play on from the position on the board, with the same side to move (the move list starts again from here). Stones left with no liberties are taken off first, as they could not stand. */
  function done() {
    if (!S.on) return;
    const board = Int8Array.from(S.board);
    let gone = 0;
    for (const gr of E.allGroups(S.n, board)) if (!gr.libs.length) for (const p of gr.stones) { board[p] = 0; gone++; }
    close();
    const s = E.newState(S.n, 0);
    s.board = board; s.turn = S.turn;
    Object.assign(Play, { s, phase: 'play', over: false, dead: null, terr: null, redo: [], tree: null, savedId: null, lastAI: null, guided: false, seen: {} });
    G.explained = null; G.lastExplain = null;
    G.say(T('done', { colour: colourName(S.turn) }) + (gone ? ' ' + T('removed', { count: gone }) : ''));
    G.renderPlay(); G.saveGame();
    G.resumeTurn();
  }

  $('#btnSetup').onclick = () => (S.on ? done() : start());
  $('#btnSCancel').onclick = cancel;
  $('#whoTurn').addEventListener('click', () => { if (S.on) { S.colour = 3 - S.colour; S.sel = -1; render(); } });

  Object.assign(G, { setupOn: on, startSetup: start, renderSetup: render, setupTap: tap, leaveSetup: cancel });
})();
