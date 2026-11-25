/* World of Go — the bar under the board: undo and redo triangles on the left (the Territory tab, terr.js, is on the right).
   The arrows follow the side panel: they are enabled when its Undo and Redo are, and the whole bar hides when the panel's game buttons do
   (during lessons and the teacher). In a famous game and while exploring they step back and forward instead. */
(() => {
  'use strict';
  const G = window.GC;
  const { $ } = G;
  const bar = $('#boardBar');
  const links = [['#btnUndoArrow', '#btnUndo'], ['#btnRedoArrow', '#btnRedo']];

  const T = window.GoText.T;
  const kifuOn = () => !!(G.kifu && G.kifu.on), exploringOn = () => !!(G.exploring && G.exploring.on);
  /* In a Kifu game, and while exploring a move, the arrows step back and forward instead of undoing and redoing. */
  function sync() {
    const kifu = kifuOn(), ex = exploringOn(), stepping = kifu || ex, undo = $('#btnUndoArrow'), redo = $('#btnRedoArrow');
    bar.hidden = $('#controls').hidden && !stepping;
    bar.querySelector('.barSide:last-child').hidden = ex; /* Shapes and Territory have nothing to show on the exploring copy */
    /* The arrows are triangles drawn in CSS (.tri); their words are the spoken labels. */
    undo.setAttribute('aria-label', T(stepping ? 'screen.back-arrow' : 'screen.undo-arrow.aria')); redo.setAttribute('aria-label', T(stepping ? 'screen.next-arrow' : 'screen.redo-arrow.aria'));
    undo.title = T(ex ? 'app.explore-back-tip' : kifu ? 'app.back-tip' : 'app.undo-tip'); redo.title = T(ex ? 'app.explore-next-tip' : kifu ? 'app.forward-tip' : 'app.redo-tip');
    if (kifu) { undo.disabled = !G.kifu.canBack(); redo.disabled = !G.kifu.canNext(); }
    else if (ex) { undo.disabled = G.exploring.T.pos <= 1; redo.disabled = false; }
    else for (const [arrow, button] of links) $(arrow).disabled = $(button).disabled;
  }
  const watch = new MutationObserver(sync);
  for (const id of ['#controls', '#btnUndo', '#btnRedo']) watch.observe($(id), { attributes: true, attributeFilter: ['hidden', 'disabled'] });

  $('#btnUndoArrow').addEventListener('click', () => (kifuOn() ? G.kifuBack() : exploringOn() ? (G.stopShowMe(), G.exploring.back()) : G.undoMove()));
  $('#btnRedoArrow').addEventListener('click', () => (kifuOn() ? G.kifuNext() : exploringOn() ? (G.stopShowMe(), G.exploring.forward()) : G.redoMove()));
  /* Everything on the bar is about the board, so an open reading page (such as the history) gives way to it. */
  bar.addEventListener('click', () => { if (G.pageOpen && G.pageOpen()) G.closePage(); }, true);
  G.syncBar = sync;
  sync();
})();
