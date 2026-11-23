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
  $('#btnLExit').onclick = exitLesson;

  $('#newForm').addEventListener('submit', e => {
    if (e.submitter && e.submitter.value === 'start') {
      settings.size = +chosen('size'); settings.colour = chosen('colour'); settings.level = chosen('level'); settings.coachLevel = chosen('coachlevel') || settings.coachLevel; settings.handicap = +chosen('handicap');
      saveSettings();
      if (G.clearChat) G.clearChat(); /* a new game starts with an empty chat */
      setTimeout(startNewGame, 0);
    }
  });
  $('#btnResultNew').onclick = () => setTimeout(openNewDialog, 0);

  $('#btnSettings').onclick = () => {
    $('#setCoords').checked = settings.coords; $('#setLibs').checked = settings.libs; $('#setCoach').checked = settings.coach;
    $('#setConfirm').checked = settings.confirm; $('#setSound').checked = settings.sound;
    $('#installHelp').textContent = 'To install: in Chrome or Edge use the install icon in the address bar; on Android use ⋮ › Add to Home screen.';
    $('#setDlg').showModal();
  };
  for (const [id, key] of [['#setCoords', 'coords'], ['#setLibs', 'libs'], ['#setCoach', 'coach'], ['#setConfirm', 'confirm'], ['#setSound', 'sound']]) {
    $(id).addEventListener('change', e => { settings[key] = e.target.checked; saveSettings(); renderPlay(); });
  }
  $('#btnSGF').onclick = async () => {
    if (!Play.s) return toast('No game yet');
    const sgf = E.toSGF(Play.s, `PB[${Play.human === 1 ? 'You' : 'Computer'}]PW[${Play.human === 2 ? 'You' : 'Computer'}]`);
    try { await navigator.clipboard.writeText(sgf); toast('Game record copied'); }
    catch (e) { prompt('Copy this SGF:', sgf); }
  };

  /* ---------- start ---------- */
  playView.resize();
  if (!restoreGame()) startNewGame();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
  }
})();
