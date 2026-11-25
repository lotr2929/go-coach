/* Go Coach service worker: loads the newest files when online and falls back to its saved copy when offline. Bump VERSION when files change. */
const VERSION = 'gocoach-1795569460112';
const FILES = ['./', 'index.html', 'style.css', 'text-data.js', 'text.js', 'pagetext.js', 'engine.js', 'search.js', 'proverbs.js', 'explain.js', 'shapes.js', 'lessons.js', 'util.js', 'board.js', 'play.js', 'movetree.js', 'coaching.js', 'learn.js', 'main.js', 'update.js', 'coach.js', 'commentary.js', 'curriculum.js', 'teach.js', 'teachui.js', 'explore.js', 'exploreui.js', 'intro.js', 'welcome.js', 'welcomeui.js', 'tour.js', 'docs/text/en/pages/whatisgo.md', 'introui.js', 'history.js', 'docs/text/en/pages/history.md', 'guide.js', 'page.js', 'sgf.js', 'kifu.js', 'kifuui.js', 'terr.js', 'shapesui.js', 'boardbar.js', 'chatlog.js', 'chat.js', 'telemetry.js', 'fontsize.js', 'manifest.webmanifest'];
const ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES).then(() => Promise.allSettled(ICONS.map(i => c.add(i))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
