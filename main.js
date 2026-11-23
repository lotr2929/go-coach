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
    /* Right-click (or long-press) the title to see when this version was published (taken from the saved copy's name). */
    let versionText = '';
    navigator.serviceWorker.ready.then(() => caches.keys()).then(keys => {
      const stamps = keys.map(k => /^gocoach-(\d{10,})$/.exec(k)).filter(Boolean).map(m => +m[1]);
      if (stamps.length) versionText = 'Version: ' + new Date(Math.max(...stamps)).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
    }).catch(() => { /* no version to show */ });
    $('h1').addEventListener('contextmenu', e => {
      e.preventDefault();
      toast(versionText || 'Version not available yet. Reopen the app and try again.', 4500);
    });
  }
})();
