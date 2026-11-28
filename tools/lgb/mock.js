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
})();
