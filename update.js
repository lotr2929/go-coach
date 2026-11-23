/* Go Coach — keeps the installed app up to date.
   1. Whenever the app is opened or brought back to the front, it asks for a new version. If one has arrived, the page
      reloads itself (the game in progress is saved after every move and carries on). During a lesson, guided teaching,
      exploring or a famous game it only shows a notice, so nothing is interrupted.
   2. Settings has a "Check for updates" button that always reloads the newest files, and shows the version date. */
(() => {
  'use strict';
  const G = window.GC, { $, toast } = G;
  const btn = $('#btnUpdate'), ver = $('#verText');
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') { if (btn) btn.hidden = true; return; }

  const busy = () => (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on);
  let hadController = !!navigator.serviceWorker.controller, reloading = false;
  const reload = () => { if (!reloading) { reloading = true; location.reload(); } };

  /* A new service worker takes over only when sw.js has changed, i.e. a new version was published. */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } /* first install, not an update */
    if (busy()) toast('A new version of Go Coach is ready. It will load next time you open the app, or tap Settings → Check for updates.', 6000);
    else { toast('Updating Go Coach…'); setTimeout(reload, 600); }
  });

  const check = () => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => { /* offline: try later */ });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  check();

  /* The version date comes from the saved copy's name, which bump-version.js sets when a version is published. */
  function showVersion() {
    if (!ver || !window.caches) return;
    caches.keys().then(keys => {
      const stamps = keys.map(k => /^gocoach-(\d{10,})$/.exec(k)).filter(Boolean).map(m => +m[1]);
      ver.textContent = stamps.length ? 'This version: ' + new Date(Math.max(...stamps)).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    }).catch(() => { /* no version to show */ });
  }
  $('#btnSettings').addEventListener('click', showVersion);

  if (btn) btn.onclick = () => {
    if (!navigator.onLine) { toast('You are offline. Connect to the internet and try again.', 4000); return; }
    toast('Checking for updates…');
    /* The app always loads its files from the internet when it can, so a reload gives the newest version either way. */
    Promise.race([check(), new Promise(r => setTimeout(r, 4000))]).then(reload);
  };
})();
