/* Offline shell. NETWORK-FIRST for everything (so a fresh upload always wins), cache only as an offline fallback.
   Only good (HTTP 200, same-origin) responses are ever cached — a 404 or half-uploaded file can no longer get stuck. */
const V = 'ck-v2';
const SHELL = ['./', 'index.html', 'style.css', 'data/manifest.js', 'js/store.js', 'js/util.js', 'js/engine.js', 'js/charts.js', 'js/tools.js', 'js/card.js', 'js/analysis.js', 'js/app.js', 'assets/emblem.png'];
self.addEventListener('install', e => {
  /* best-effort precache: one missing file must not break installation */
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'no-cache' }).then(r => r.ok && c.put(u, r)).catch(() => 0)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r, { cache: 'no-cache' }).then(res => {
      if (res && res.status === 200 && res.type === 'basic') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(hit => hit || new Response('Offline', { status: 503 })))
  );
});
