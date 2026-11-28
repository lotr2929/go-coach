/* Go Coach — the board full screen (Boon, 28 Nov 2026): a simple board to play on.
   The button beside the prisoners (index.html #btnBoardSize) puts the class boardBig on the body. style.css then hides the
   title bar, the chat and the move tree, keeps only Pass, Resign and New of the game buttons (lessons, famous games and puzzles
   keep their own bars), and makes the board as large as the screen allows. Nothing is moved or rebuilt: shrinking back only
   takes the class away, and the board redraws itself at its usual size (board.js watches its own size).
   Full screen is Game mode (Boon, 28 Nov 2026): no coach, with no exceptions; shrink the board to reach it. In a game against
   the computer the Computer panel (computer.js) shows the computer's moves. The board sits in the middle of the screen.
   With a reading page open (body.paging, page.js) the board panel's full screen is the page over the whole screen, under the
   turn line that holds this button. Something only the chat can show (a menu, such as the lessons) brings the usual view back,
   so it is never missed. */
(() => {
  'use strict';
  const G = window.GC;
  const { $ } = G;
  const T = k => window.GoText.T('app.' + k);
  const btn = $('#btnBoardSize');
  const ICON_BIG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h10v10M13 21H3V11M21 3l-8 8M3 21l8-8"/></svg>';
  const ICON_SMALL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 13h10v10M23 11H13V1M13 11l8-8M3 21l8-8"/></svg>';
  let big = false;

  function setBig(on) {
    big = !!on;
    if (big && document.body.classList.contains('chatBig')) $('#btnChatSize').click(); /* a full-screen chat would cover the board */
    document.body.classList.toggle('boardBig', big);
    btn.innerHTML = big ? ICON_SMALL : ICON_BIG;
    btn.setAttribute('aria-pressed', String(big));
    btn.title = T(big ? 'board-shrink' : 'board-enlarge');
    btn.setAttribute('aria-label', btn.title);
    syncFull();
  }

  /* The device's own full screen (Boon, 28 Nov 2026: "it's not really full screen"): while the board panel or the chat is full
     screen, the browser's address bar and the phone's bars are hidden too. Where a browser cannot (an iPhone), the app's own
     full screen still works. Leaving the device's full screen (the phone's back gesture, Esc) also ends the app's. */
  const wantFull = () => big || document.body.classList.contains('chatBig');
  function syncFull() {
    const want = wantFull(), on = !!document.fullscreenElement, el = document.documentElement;
    try {
      if (want && !on && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => { /* not allowed here */ });
      else if (!want && on && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) { /* no full screen in this browser */ }
  }
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) return;
    if (big) setBig(false);
    if (document.body.classList.contains('chatBig')) $('#btnChatSize').click();
  });

  btn.addEventListener('click', () => setBig(!big));
  document.addEventListener('gc:chat-show', () => { if (big) setBig(false); });
  /* Escape leaves full screen, unless an open page used it first (page.js). */
  document.addEventListener('keydown', e => { if (big && e.key === 'Escape' && !e.defaultPrevented) setBig(false); });

  setBig(false);
  Object.assign(G, { boardBig: () => big, setBoardBig: setBig, syncFullscreen: syncFull });
})();
