/* =====================================================================
   util.js — config derived from data/manifest.js + small helpers
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {};
  var U = CK.u = {};

  /* ---------- config ---------- */
  var R = window.RULES, SESS = window.SESSIONS;
  var demo = !(R && SESS && SESS.length);
  if (demo) {   /* tiny built-in demo so the page is never blank if manifest.js is missing */
    R = { examName: 'WBPSC Clerkship Prelims', questions: 100, minutes: 90, negative: 0.25, perQ: 1, dailyGoal: 50, nextExam: null,
      topics: [{ n: 'English', i: '🔤', k: 'ENG', h: 262, g: 'Language' }, { n: 'Mathematics', i: '🧮', k: 'MATH', h: 199, g: 'Quant' }, { n: 'Indian Polity', i: '🏛️', k: 'POL', h: 222, g: 'GS' }],
      groups: [{ id: 'Language', n: 'English', w: 30 }, { id: 'Quant', n: 'Mathematics', w: 30 }, { id: 'GS', n: 'General Studies', w: 40 }] };
    SESS = [{ id: 'demo', year: 'Demo', day: 1, shift: 1, file: '' }];
    window.PAPERS = window.PAPERS || {};
    window.PAPERS.demo = { questions: [
      { s: 'English', c: 'Synonyms', q: 'Synonym of "RAPID"?', o: ['Slow', 'Quick', 'Late', 'Weak'], a: 1, e: 'Rapid means quick.' },
      { s: 'Mathematics', c: 'Percentage', q: '10% of 250 is —', o: ['20', '25', '30', '35'], a: 1, e: '250 × 10/100 = 25.' },
      { s: 'Indian Polity', c: 'Constitution', q: 'Who chaired the Drafting Committee?', o: ['Nehru', 'Gandhi', 'B. R. Ambedkar', 'Patel'], a: 2, e: 'Dr B. R. Ambedkar.' }] };
  }
  var C = CK.cfg = {
    demo: demo, R: R, SESS: SESS.slice(),
    TOPICS: R.topics.map(function (t) { return t.n; }),
    ICON: {}, CODE: {}, HUE: {}, GRP: {},
    QUOTES: (window.QUOTES && window.QUOTES.length) ? window.QUOTES : ['Small steps every day beat big plans someday.'],
    TAGS: [   /* mistake taxonomy */
      { id: 'concept', i: '🧠', n: 'Concept gap', d: 'I did not know / understand it', c: '#ef4444' },
      { id: 'recall', i: '🌀', n: 'Forgot', d: 'I had studied it but could not recall', c: '#f97316' },
      { id: 'silly', i: '🙈', n: 'Silly mistake', d: 'I knew it — careless slip', c: '#eab308' },
      { id: 'misread', i: '👓', n: 'Misread', d: 'Misread the question or options', c: '#22b8cf' },
      { id: 'time', i: '⏱', n: 'Time pressure', d: 'Rushed because of the clock', c: '#8b5cf6' },
      { id: 'guess', i: '🎲', n: 'Bad guess', d: 'Pure guess that did not land', c: '#ec4899' }
    ],
    FLAGS: { s: '🟢 Sure', g: '🟡 Guess', c: '🔴 Confused', u: '⚪ Not flagged' }
  };
  R.topics.forEach(function (t) { C.ICON[t.n] = t.i; C.CODE[t.n] = t.k || t.n.slice(0, 3).toUpperCase(); C.HUE[t.n] = t.h == null ? 220 : t.h; C.GRP[t.n] = t.g || 'GS'; });
  C.sessions = function () { return C.SESS.slice().sort(function (a, b) { return (b.year - a.year) || (a.day - b.day) || (a.shift - b.shift); }); };
  C.sessionById = function (id) { for (var i = 0; i < C.SESS.length; i++) if (C.SESS[i].id === id) return C.SESS[i]; return null; };
  C.tagById = function (id) { for (var i = 0; i < C.TAGS.length; i++) if (C.TAGS[i].id === id) return C.TAGS[i]; return null; };

  /* ---------- helpers ---------- */
  U.$ = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  U.strip = function (s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); };
  U.pad = function (n) { return String(n).padStart(2, '0'); };
  U.fmt = function (s) { s = Math.max(0, Math.round(s)); return U.pad(Math.floor(s / 60)) + ':' + U.pad(s % 60); };
  U.dur = function (s) { s = Math.round(s); return s < 90 ? s + 's' : Math.round(s / 60) + ' min'; };
  U.pct = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  U.n2 = function (v) { return (Math.round(v * 100) / 100).toString(); };
  U.sgn = function (v, d) { var s = Math.abs(v).toFixed(d == null ? 2 : d); return (v > 0 ? '+' : v < 0 ? '−' : '') + s; };
  U.tone = function (p) { return p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'; };
  U.lab = function (p) { return p >= 75 ? 'Strong' : p >= 50 ? 'Average' : 'Weak'; };
  U.DAY = 86400000;
  U.dkey = function (d) { d = d || new Date(); return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); };
  U.today0 = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  U.shuf = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  U.col = function (topic) { return 'hsl(' + (C.HUE[topic] == null ? 220 : C.HUE[topic]) + ' 78% var(--tl))'; };
  U.colA = function (topic, a) { return 'hsl(' + (C.HUE[topic] == null ? 220 : C.HUE[topic]) + ' 78% 58% / ' + a + ')'; };
  U.dateLabel = function (iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00'); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  U.sessLabel = function (s) { return s.year + ' · Day ' + s.day + ' · Shift ' + s.shift; };
  U.greet = function () { var h = new Date().getHours(); return h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Late-night revision'; };
  U.toast = function (m) {
    var t = U.$('#toast'); if (!t) return; t.textContent = m; t.classList.add('show');
    clearTimeout(U.toast.h); U.toast.h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };
  U.download = function (name, txt, mime) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: mime || 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };
  U.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  U.groupOf = function (topic) { return C.GRP[topic] || 'GS'; };
})();
