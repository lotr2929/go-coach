/* World of Go — the bar under the board: undo and redo arrows on the left (the Territory tab, terr.js, is on the right).
   The arrows follow the side panel: they are enabled when its Undo and Redo are, and the whole bar hides when the panel's game buttons do
   (during lessons, the teacher and explore). */
(() => {
  'use strict';
  const G = window.GC;
  const { $ } = G;
  const bar = $('#boardBar');
  const links = [['#btnUndoArrow', '#btnUndo'], ['#btnRedoArrow', '#btnRedo']];

  const kifuOn = () => !!(G.kifu && G.kifu.on);
  /* In a Kifu game the arrows step back and forward through the record instead of undoing and redoing. */
  function sync() {
    const kifu = kifuOn(), undo = $('#btnUndoArrow'), redo = $('#btnRedoArrow');
    bar.hidden = $('#controls').hidden && !kifu;
    undo.textContent = kifu ? '← Back' : '← Undo'; redo.textContent = kifu ? 'Next →' : 'Redo →';
    undo.title = window.GoText.T(kifu ? 'app.back-tip' : 'app.undo-tip'); redo.title = window.GoText.T(kifu ? 'app.forward-tip' : 'app.redo-tip');
    if (kifu) { undo.disabled = !G.kifu.canBack(); redo.disabled = !G.kifu.canNext(); }
    else for (const [arrow, button] of links) $(arrow).disabled = $(button).disabled;
  }
  const watch = new MutationObserver(sync);
  for (const id of ['#controls', '#btnUndo', '#btnRedo']) watch.observe($(id), { attributes: true, attributeFilter: ['hidden', 'disabled'] });

  $('#btnUndoArrow').addEventListener('click', () => (kifuOn() ? G.kifuBack() : G.undoMove()));
  $('#btnRedoArrow').addEventListener('click', () => (kifuOn() ? G.kifuNext() : G.redoMove()));
  /* Everything on the bar is about the board, so an open reading page (such as the history) gives way to it. */
  bar.addEventListener('click', () => { if (G.pageOpen && G.pageOpen()) G.closePage(); }, true);
  G.syncBar = sync;
  sync();
})();
