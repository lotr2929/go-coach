/* Go Coach — keeps the installed app up to date.
   1. Whenever the app is opened or brought back to the front, it asks for a new version. If one has arrived, the page
      reloads itself (the game in progress is saved after every move and carries on). During a lesson, guided teaching,
      exploring, a famous game or while a reading page (such as Why Play Go?) is open it only shows a notice, so nothing is
      interrupted (Boon, 28 Nov 2026: a reload had closed a page he had just opened).
   2. Settings has a "Check for updates" button that always reloads the newest files.
   3. The version date shows under the title and in Settings. */
(() => {
  'use strict';
  const G = window.GC, { $, toast } = G;
  const btn = $('#btnUpdate'), ver = $('#verText'), stamp = $('#verStamp');
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') { if (btn) btn.hidden = true; return; }

  const busy = () => (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on) || (G.setupOn && G.setupOn()) || (G.pageOpen && G.pageOpen());
  let hadController = !!navigator.serviceWorker.controller, reloading = false;
  const reload = () => { if (!reloading) { reloading = true; location.reload(); } };

  /* A new service worker takes over only when sw.js has changed, i.e. a new version was published. */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } /* first install, not an update */
    const ready = () => toast(window.GoText.T('app.update-ready'), 6000);
    if (busy()) ready();
    else { toast(window.GoText.T('app.updating')); setTimeout(() => (busy() ? ready() : reload()), 600); } /* a page opened in that moment stays open */
  });

  const check = () => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => { /* offline: try later */ });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  check();

  /* The version date comes from the saved copy's name, which bump-version.js sets when a version is published.
     It shows under the title and in Settings. */
  function showVersion() {
    if (!window.caches) return;
    caches.keys().then(keys => {
      const stamps = keys.map(k => /^gocoach-(\d{10,})$/.exec(k)).filter(Boolean).map(m => +m[1]);
      const when = stamps.length ? new Date(Math.max(...stamps)).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '';
      if (ver) ver.textContent = when ? window.GoText.T('app.this-version', { when }) : '';
      if (stamp) stamp.textContent = when ? 'Updated ' + when : '';
    }).catch(() => { /* no version to show */ });
  }
  $('#btnSettings').addEventListener('click', showVersion);
  navigator.serviceWorker.ready.then(showVersion);

  if (btn) btn.onclick = () => {
    if (!navigator.onLine) { toast(window.GoText.T('app.offline'), 4000); return; }
    toast(window.GoText.T('app.checking'));
    /* The app always loads its files from the internet when it can, so a reload gives the newest version either way. */
    Promise.race([check(), new Promise(r => setTimeout(r, 4000))]).then(reload);
  };
})();
