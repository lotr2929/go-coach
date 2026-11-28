/* Live Go Board: changes being tried for Go Coach (the mock-up, docs/decisions.md). Each change here is to be built into
   Go Coach properly once Boon is happy with it, and then removed from this file.
   1. (Boon, 28 Nov 2026) Three modes only: Play, Coach and Puzzles. Game mode (the board panel full screen with the board on
      it) is gone: the board's expand arrow shows only while a page such as "Why Play Go?" is open, and the full screen ends
      when the page closes. */
(() => {
  'use strict';
  const G = window.GC;
  const css = document.createElement('style');
  css.textContent = 'body:not(.paging) #btnBoardSize { display: none !important; }';
  document.head.append(css);
  new MutationObserver(() => {
    if (!document.body.classList.contains('paging') && G.boardBig && G.boardBig()) G.setBoardBig(false);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* 2. (Boon, 28 Nov 2026) The game buttons in this order: the mode switch, Pass, Resign, Analyse, Save, then New and Set up.
        New and Set up are kept together, so when the row wraps they go to the second row as a pair. */
  const bar = document.getElementById('controls');
  const id = x => document.getElementById(x);
  if (bar) {
    const pair = document.createElement('span');
    pair.className = 'btnPair';
    pair.append(id('btnNew'), id('btnSetup'), id('btnSCancel'));
    bar.append(id('btnMode'), id('btnPass'), id('btnUndo'), id('btnRedo'), id('btnResign'), id('btnAnalyse'), id('btnSave'), pair);
    css.textContent += ' .btnPair { display: inline-flex; gap: 10px; flex: 0 0 auto; }';
  }

  /* 3. (Boon, 28 Nov 2026) A Clear button in the middle of the row under the board (the Shapes and Territory row): it clears
        the board for a new game with the same settings (size, handicap, colour), without the New game box. A slip would lose
        the game, so the first tap asks "Sure?" and a second tap within 3 seconds clears. Shown only in an ordinary game: not
        in a famous game or while exploring a move (lessons, puzzles and the teacher hide the whole row already). */
  /* 4. (Boon, 28 Nov 2026) The message row under the chat was larger than the rest (16px against the chat's 15.2px and the
        buttons' 13.6px). Its typing and placeholder now match the chat text (--text), and Clear and Send match the other
        buttons (.85rem). Note for Go Coach: on an iPhone, a typing box under 16px makes Safari zoom in when tapped. */
  css.textContent += ' .chatInput { font-size: var(--text); } .chatForm button { font-size: .85rem; }';

  const row = document.getElementById('boardBar');
  if (row) {
    const clear = document.createElement('button');
    clear.type = 'button'; clear.className = 'tab'; clear.id = 'btnClearBoard'; clear.textContent = 'Clear';
    clear.title = 'Clear the board for a new game with the same settings';
    row.lastElementChild.before(clear);
    row.style.position = 'relative';
    css.textContent += ' #btnClearBoard { position: absolute; left: 50%; transform: translateX(-50%); }';
    let armed = 0;
    const reset = () => { armed = 0; clear.textContent = 'Clear'; };
    clear.addEventListener('click', () => {
      if (Date.now() - armed > 3000) { armed = Date.now(); clear.textContent = 'Sure?'; setTimeout(() => { if (armed && Date.now() - armed >= 3000) reset(); }, 3100); return; }
      reset();
      G.startNewGame();
    });
    const show = () => { clear.hidden = !!((G.kifu && G.kifu.on) || (G.exploring && G.exploring.on) || (G.setupOn && G.setupOn())); };
    new MutationObserver(show).observe(row, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
    document.addEventListener('click', () => setTimeout(show, 0), true);
    show();
  }
})();
