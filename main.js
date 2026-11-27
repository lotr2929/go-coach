/* Go Coach — buttons, settings, start-up */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, saveSettings, toast, Play, playView, renderPlay, chosen, openNewDialog, startNewGame, restoreGame, humanPass, undoMove, redoMove, resign, confirmResult, resumePlay, lessonHint, lessonReset, lessonNext, showMenu, exitLesson } = G;

  $('#btnPass').onclick = humanPass;
  $('#btnUndo').onclick = undoMove;
  $('#btnRedo').onclick = redoMove;
  $('#btnResign').onclick = resign;
  $('#btnNew').onclick = openNewDialog;
  $('#btnConfirm').onclick = confirmResult;
  $('#btnResume').onclick = resumePlay;
  $('#btnLHint').onclick = lessonHint;
  $('#btnLReset').onclick = lessonReset;
  $('#btnLNext').onclick = lessonNext;
  $('#btnLMenu').onclick = showMenu;

  $('#newForm').addEventListener('submit', e => {
    if (e.submitter && e.submitter.value === 'start') {
      settings.size = +chosen('size'); settings.colour = chosen('colour'); settings.level = chosen('level'); settings.handicap = +chosen('handicap');
      saveSettings();
      G.newChatSession(); /* a new game is a new session: the chat so far moves into the history (chatlog.js) */
      setTimeout(startNewGame, 0);
    }
  });
  $('#btnResultNew').onclick = () => setTimeout(openNewDialog, 0);

  $('#btnSettings').onclick = () => {
    $('#setCoords').checked = settings.coords; $('#setLibs').checked = settings.libs; $('#setCoach').checked = settings.coach;
    $('#setConfirm').checked = settings.confirm; $('#setSound').checked = settings.sound;
    $('#installHelp').textContent = window.GoText.T('app.install-help');
    $('#setDlg').showModal();
  };
  for (const [id, key] of [['#setCoords', 'coords'], ['#setLibs', 'libs'], ['#setCoach', 'coach'], ['#setConfirm', 'confirm'], ['#setSound', 'sound']]) {
    $(id).addEventListener('change', e => { settings[key] = e.target.checked; saveSettings(); renderPlay(); });
  }
  $('#btnSGF').onclick = async () => {
    if (!Play.s) return toast(window.GoText.T('app.no-game'));
    const sgf = E.toSGF(Play.s, `PB[${Play.human === 1 ? 'You' : 'Computer'}]PW[${Play.human === 2 ? 'You' : 'Computer'}]`);
    try { await navigator.clipboard.writeText(sgf); toast(window.GoText.T('app.record-copied')); }
    catch (e) { prompt(window.GoText.T('app.copy-sgf'), sgf); }
  };

  /* ---------- start ---------- */
  playView.resize();
  /* Every time the app opens it starts new: a fresh board and the welcome. The game you left is kept aside and comes back after you sign in. */
  try { G.prevGame = localStorage.getItem('gocoach.game'); } catch (e) { G.prevGame = null; }
  startNewGame();
  G.resumeAfterSignIn = () => {
    if (!G.prevGame || (G.Lesson && G.Lesson.on) || (G.kifu && G.kifu.on) || (Play.s && Play.s.moves.length)) return;
    try { localStorage.setItem('gocoach.game', G.prevGame); } catch (e) { return; }
    G.prevGame = null; restoreGame();
  };
  /* A new install starts the tour of the app once, after the screen has settled (Boon, 25 Nov 2026). */
  if (G.firstVisit && G.startTour) setTimeout(() => G.startTour(), 800);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
  }
})();
