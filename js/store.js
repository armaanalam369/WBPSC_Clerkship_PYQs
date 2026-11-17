/* =====================================================================
   store.js — persistent storage
   IndexedDB key-value store (no 5 MB localStorage ceiling), wrapped so the
   rest of the app can stay synchronous:
     await CK.store.init();   // loads everything into memory once at start-up
     CK.store.get(key, default) / set(key, value) / del(key)   // sync reads, async write-through
   Falls back to localStorage if IndexedDB is unavailable (private mode etc.).
   Theme + palette are kept in localStorage too so there is no flash on load.
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {};
  var DB = 'wise-clerkship', ST = 'kv', PRE = 'ck_';
  var KEYS = ['set', 'att', 'sav', 'days', 'seen', 'run', 'runq', 'tour', 'meta'];
  var cache = {}, db = null, queue = Promise.resolve(), mode = 'idb';

  function lsGet(k) { try { var v = localStorage.getItem(PRE + k); return v === null ? undefined : JSON.parse(v); } catch (e) { return undefined; } }
  function lsSet(k, v) { try { localStorage.setItem(PRE + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(PRE + k); } catch (e) { } }

  function fallback(res) {
    mode = 'ls'; db = null;
    KEYS.forEach(function (k) { var v = lsGet(k); if (v !== undefined) cache[k] = v; });
    res();
  }

  function init() {
    return new Promise(function (res) {
      var done = false, finish = function () { if (!done) { done = true; res(); } };
      if (!window.indexedDB) return fallback(finish);
      var req;
      try { req = indexedDB.open(DB, 1); } catch (e) { return fallback(finish); }
      req.onupgradeneeded = function () { try { req.result.createObjectStore(ST); } catch (e) { } };
      req.onerror = req.onblocked = function () { fallback(finish); };
      req.onsuccess = function () {
        db = req.result;
        try {
          var cur = db.transaction(ST, 'readonly').objectStore(ST).openCursor();
          cur.onsuccess = function () { var c = cur.result; if (c) { cache[c.key] = c.value; c.continue(); } else { migrate(); finish(); } };
          cur.onerror = function () { fallback(finish); };
        } catch (e) { fallback(finish); }
      };
      setTimeout(function () { if (!done) fallback(finish); }, 4000);   /* never hang the app on a stuck DB */
    });
  }
  /* If an earlier localStorage fallback session stored data, adopt it once. */
  function migrate() {
    KEYS.forEach(function (k) {
      var v = lsGet(k);
      if (v !== undefined && cache[k] === undefined) { cache[k] = v; write(k, v); }
      if (v !== undefined) lsDel(k);
    });
  }
  function write(k, v, del) {
    if (mode === 'ls' || !db) { del ? lsDel(k) : lsSet(k, v); return; }
    queue = queue.then(function () {
      return new Promise(function (res) {
        try {
          var tx = db.transaction(ST, 'readwrite'), os = tx.objectStore(ST);
          del ? os.delete(k) : os.put(v, k);
          tx.oncomplete = res;
          tx.onerror = tx.onabort = function () { if (!del) lsSet(k, v); res(); };   /* quota or other failure: keep a copy */
        } catch (e) { if (!del) lsSet(k, v); res(); }
      });
    });
  }

  CK.store = {
    init: init,
    mode: function () { return mode; },
    get: function (k, d) { return cache[k] === undefined ? d : cache[k]; },
    set: function (k, v) { cache[k] = v; write(k, v); },
    del: function (k) { delete cache[k]; write(k, null, true); },
    /* snapshot used by Backup */
    dump: function (keys) { var o = {}; keys.forEach(function (k) { if (cache[k] !== undefined) o[k] = cache[k]; }); return o; },
    bytes: function (keys) { try { return keys.reduce(function (n, k) { return n + JSON.stringify(cache[k] === undefined ? '' : cache[k]).length; }, 0); } catch (e) { return 0; } },
    persist: function () { try { if (navigator.storage && navigator.storage.persist) return navigator.storage.persist(); } catch (e) { } return Promise.resolve(false); },
    /* tiny synchronous prefs (theme, palette) — must be readable before first paint */
    pref: {
      get: function (k, d) { var v = lsGet('p_' + k); return v === undefined ? d : v; },
      set: function (k, v) { lsSet('p_' + k, v); }
    }
  };
})();
