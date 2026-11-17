/* Offline shell: cache-first for app files, network-first for data/ so new papers show up. */
const V = 'ck-v1';
const SHELL = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'data/manifest.js',
  'js/store.js', 'js/util.js', 'js/engine.js', 'js/charts.js', 'js/tools.js', 'js/card.js', 'js/analysis.js', 'js/app.js',
  'assets/emblem.png', 'assets/logo.png', 'assets/favicon.png', 'assets/apple-touch-icon.png', 'assets/icon-192.png', 'assets/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const isData = new URL(r.url).pathname.includes('/data/');
  e.respondWith(isData
    ? fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r))
    : caches.match(r).then(hit => hit || fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; })));
});
