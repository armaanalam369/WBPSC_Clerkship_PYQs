/* =====================================================================
   engine.js — exam logic with no DOM: loading papers, grading, spaced
   repetition (1-3-7-14), strategy score, pace blocks, speed/accuracy quadrant,
   mistake taxonomy, streaks and the cut-off maths.
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {}, C = CK.cfg, U = CK.u, R = C.R;
  var E = CK.eng = {};
  window.PAPERS = window.PAPERS || {};

  /* ---------- sessions & rules ---------- */
  E.rulesFor = function (sess) {
    var o = (sess && sess.rules) || {};
    return { minutes: o.minutes || R.minutes, negative: o.negative != null ? o.negative : R.negative, perQ: o.perQ || R.perQ || 1, questions: o.questions || R.questions };
  };
  /* Real paper = 100 Q / 90 min. Smaller (sample) papers get a proportional time so practice feels right. */
  E.paperMinutes = function (sess, n) {
    var r = E.rulesFor(sess);
    if (sess && sess.rules && sess.rules.minutes) return sess.rules.minutes;
    return Math.max(1, Math.ceil(r.minutes * Math.min(1, n / r.questions)));
  };
  E.years = function () { var m = {}; C.SESS.forEach(function (s) { m[s.year] = 1; }); return Object.keys(m).sort(function (a, b) { return b - a; }); };
  E.days = function (year) { var m = {}; C.SESS.forEach(function (s) { if (year === 'all' || String(s.year) === String(year)) m[s.day] = s.date || m[s.day] || 1; }); return Object.keys(m).map(Number).sort(function (a, b) { return a - b; }).map(function (d) { return { day: d, date: typeof m[d] === 'string' ? m[d] : '' }; }); };
  E.shifts = function (year, day) {
    var m = {}; C.SESS.forEach(function (s) { if ((year === 'all' || String(s.year) === String(year)) && (day === 'all' || +day === s.day)) m[s.shift] = 1; });
    return Object.keys(m).map(Number).sort(function (a, b) { return a - b; });
  };
  E.find = function (year, day, shift) {
    for (var i = 0; i < C.SESS.length; i++) { var s = C.SESS[i]; if (String(s.year) === String(year) && s.day === +day && s.shift === +shift) return s; }
    return null;
  };
  E.filter = function (year, day, shift) {
    return C.SESS.filter(function (s) { return (year === 'all' || String(s.year) === String(year)) && (day === 'all' || s.day === +day) && (shift === 'all' || s.shift === +shift); });
  };
  E.load = function (s) {
    return new Promise(function (res, rej) {
      if (window.PAPERS[s.id]) return res(window.PAPERS[s.id]);
      if (!s.file) return rej(new Error('no file'));
      var el = document.createElement('script'); el.src = s.file;
      el.onload = function () { window.PAPERS[s.id] ? res(window.PAPERS[s.id]) : rej(new Error('paper did not register as ' + s.id)); };
      el.onerror = function () { rej(new Error('cannot load ' + s.file)); };
      document.body.appendChild(el);
    });
  };
  /* count questions per topic over a list of sessions that are already loaded */
  E.counts = function (sessions, seen) {
    var c = {}; C.TOPICS.forEach(function (t) { c[t] = 0; });
    sessions.forEach(function (s) {
      var p = window.PAPERS[s.id]; if (!p) return;
      p.questions.forEach(function (q, i) { if (seen && seen[s.id + '#' + i]) return; if (c[q.s] !== undefined) c[q.s]++; });
    });
    return c;
  };
  E.sum = function (c, only) { return Object.keys(c).reduce(function (n, k) { return n + (!only || only[k] ? c[k] : 0); }, 0); };
  E.loadedCount = function (s) { var p = window.PAPERS[s.id]; return p ? p.questions.length : null; };

  /* ---------- grading ---------- */
  E.grade = function (qs, ans, fl, qt, neg, perQ) {
    var st = {}, det = [], conf = {}, sc = 0, att = 0, c = 0, w = 0, n = 0;
    qs.forEach(function (q, i) {
      var r = ans[i] === null || ans[i] === undefined ? 'n' : ans[i] === q.a ? 'c' : 'w', f = fl[i] || 'u', t = qt[i] || 0;
      var x = st[q.s] = st[q.s] || { c: 0, w: 0, n: 0, t: 0, tt: 0 }, cf = conf[f] = conf[f] || { c: 0, w: 0, n: 0 };
      x.t++; x[r]++; x.tt += t; cf[r]++;
      if (r === 'c') { sc += perQ; c++; } else if (r === 'w') { sc -= neg; w++; } else n++;
      if (r !== 'n') att++;
      det.push({ s: q.s, r: r, t: t, f: f });
    });
    return { sc: sc, att: att, c: c, w: w, n: n, st: st, det: det, conf: conf };
  };
  E.marksOf = function (d, neg, perQ) { return d.r === 'c' ? perQ : d.r === 'w' ? -neg : 0; };
  E.perQ = function (a) { return a.perQ || R.perQ || 1; };
  /* ideal seconds per question for an attempt (quizzes have no clock → use the exam pace) */
  E.idealPace = function (a) {
    var n = a.det ? a.det.length : (a.max || 1);
    if (a.total) return a.total / n;
    return R.minutes * 60 / R.questions;
  };
  E.avgTime = function (a) { var n = a.det.length || 1; return a.det.reduce(function (s, d) { return s + d.t; }, 0) / n || 1; };

  /* ---------- spaced repetition: wrong answers return after 1 → 3 → 7 → 14 days ---------- */
  E.INT = [1, 3, 7, 14];
  E.srsWrong = function (e) { e.w = true; e.box = 1; e.due = U.today0() + E.INT[0] * U.DAY; };
  /* returns true when the question is mastered (leaves the wrong-notebook) */
  E.srsRight = function (e) {
    if (!e || !e.w) return false;
    e.box = (e.box || 1) + 1;
    if (e.box > E.INT.length) { e.w = false; e.box = 0; delete e.due; return true; }
    e.due = U.today0() + E.INT[e.box - 1] * U.DAY; return false;
  };
  E.isDue = function (e) { return !!e.w && (e.due || 0) <= U.today0(); };

  /* ---------- streaks ---------- */
  E.streak = function (days) {
    var n = 0, x = new Date(); if (!days[U.dkey(x)]) x.setDate(x.getDate() - 1);
    while (days[U.dkey(x)]) { n++; x.setDate(x.getDate() - 1); } return n;
  };
  E.bestStreak = function (days) {
    var b = 0, c = 0, prev = null;
    Object.keys(days).sort().forEach(function (k) { var d = new Date(k + 'T00:00'); c = (prev && Math.round((d - prev) / U.DAY) === 1) ? c + 1 : 1; if (c > b) b = c; prev = d; });
    return b;
  };
  E.lastDays = function (days, n) {
    var out = [], d = new Date(); d.setHours(0, 0, 0, 0);
    for (var i = n - 1; i >= 0; i--) { var x = new Date(d); x.setDate(d.getDate() - i); var r = days[U.dkey(x)]; out.push({ d: x, q: r ? r.q : 0 }); }
    return out;
  };

  /* ---------- aggregates ---------- */
  E.aggTopics = function (atts) {
    var s = {};
    atts.forEach(function (a) { Object.keys(a.secs).forEach(function (k) { var v = a.secs[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0, t: 0, tt: 0, ip: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; x.t += v.t; x.tt += (v.tt || 0); x.ip += v.t * E.idealPace(a); }); });
    return s;
  };
  E.aggConf = function (atts) {
    var s = {};
    atts.forEach(function (a) { Object.keys(a.conf || {}).forEach(function (k) { var v = a.conf[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; }); });
    return s;
  };
  E.weakFirst = function (g) {
    return Object.keys(g).sort(function (a, b) { return U.pct(g[a].c, g[a].t) - U.pct(g[b].c, g[b].t) || C.TOPICS.indexOf(a) - C.TOPICS.indexOf(b); });
  };

  /* ---------- 🧭 attempt-strategy score ---------- */
  E.strategy = function (a) {
    var neg = a.neg || 0, pq = E.perQ(a), det = a.det, avg = E.avgTime(a);
    var tot = function (fn) { return det.reduce(function (s, d) { return s + (fn(d) ? E.marksOf(d, neg, pq) : 0); }, 0); };
    var actual = tot(function () { return true; });
    var g = { c: 0, w: 0, v: 0 }, cf = { c: 0, w: 0, v: 0 }, sl = { n: 0, v: 0 }, flagged = 0;
    det.forEach(function (d) {
      var m = E.marksOf(d, neg, pq);
      if (d.f !== 'u' && d.r !== 'n') flagged++;
      if (d.f === 'g' && d.r !== 'n') { g.v += m; if (d.r === 'c') g.c++; else g.w++; }
      if (d.f === 'c' && d.r !== 'n') { cf.v += m; if (d.r === 'c') cf.c++; else cf.w++; }
      if (d.r === 'w' && d.t >= 1.5 * avg) { sl.v += m; sl.n++; }
    });
    var rows = [
      { id: 'actual', n: 'What you did', d: 'Your real score', v: actual, c: 'var(--a)' },
      { id: 'noguess', n: 'Skip every 🟡 Guess', d: g.c + g.w + ' guess answer(s) removed', v: actual - g.v, c: '#f59e0b' },
      { id: 'noconf', n: 'Skip 🟡 Guess + 🔴 Confused', d: (g.c + g.w + cf.c + cf.w) + ' doubtful answer(s) removed', v: actual - g.v - cf.v, c: '#ef4444' },
      { id: 'noslow', n: 'Skip slow-and-wrong', d: sl.n + ' question(s) that ate 1.5× the average time and still missed', v: actual - sl.v, c: '#8b5cf6' },
      { id: 'perfect', n: 'Perfect selection', d: 'Only the questions you got right (ceiling)', v: det.filter(function (d) { return d.r === 'c'; }).length * pq, c: '#10b981', ceil: true }
    ];
    var best = rows.filter(function (r) { return !r.ceil && r.id !== 'actual'; }).sort(function (x, y) { return y.v - x.v; })[0];
    return { rows: rows, actual: actual, guess: g, conf: cf, slow: sl, best: best, flagged: flagged, n: det.length };
  };

  /* ---------- ⏱ pace blocks ---------- */
  E.blocks = function (a) {
    var det = a.det, n = det.length, bs = n >= 100 ? 10 : Math.max(2, Math.round(n / 10)), ip = E.idealPace(a), out = [], cum = 0;
    for (var i = 0; i < n; i += bs) {
      var part = det.slice(i, i + bs), t = part.reduce(function (s, d) { return s + d.t; }, 0), c = part.filter(function (d) { return d.r === 'c'; }).length, w = part.filter(function (d) { return d.r === 'w'; }).length;
      cum += t;
      out.push({ from: i + 1, to: i + part.length, t: t, ideal: ip * part.length, c: c, w: w, acc: (c + w) ? Math.round(c / (c + w) * 100) : null, cum: cum, icum: ip * (i + part.length) });
    }
    return { blocks: out, bs: bs, ip: ip };
  };

  /* ---------- 🎯 accuracy vs speed quadrant ---------- */
  E.quadrant = function (atts) {
    var g = E.aggTopics(atts), pts = [];
    Object.keys(g).forEach(function (k) {
      var v = g[k], att = v.c + v.w; if (!att || !v.ip) return;
      var speed = v.tt / v.ip;                       /* 1.0 = exactly on exam pace */
      var acc = Math.round(v.c / att * 100);
      pts.push({ k: k, x: speed, y: acc, n: v.t, att: att, tt: v.tt / v.t, quad: speed <= 1 ? (acc >= 70 ? 'ace' : 'careless') : (acc >= 70 ? 'costly' : 'gap') });
    });
    return pts;
  };
  E.QUAD = {
    ace: { n: 'Fast & accurate', d: 'Exam-ready — protect it', i: '🏆', c: '#10b981' },
    costly: { n: 'Slow but accurate', d: 'Right answers, costly time — drill for speed', i: '🐢', c: '#3b82f6' },
    careless: { n: 'Fast but inaccurate', d: 'Rushing — slow down, read the options', i: '⚡', c: '#f59e0b' },
    gap: { n: 'Slow & inaccurate', d: 'Concept gap — revise the basics first', i: '🧱', c: '#ef4444' }
  };

  /* ---------- 🧩 mistake taxonomy ---------- */
  E.autoTag = function (a, i) {
    var d = a.det[i], avg = E.avgTime(a), n = a.det.length;
    if (d.f === 'g') return 'guess';
    if (i >= n * 0.85 && d.t <= 0.6 * avg) return 'time';
    if (d.t <= 0.5 * avg) return 'silly';
    if (d.t >= 1.5 * avg || d.f === 'c') return 'concept';
    return 'recall';
  };
  E.mistakes = function (a) {
    var out = [];
    a.det.forEach(function (d, i) {
      if (d.r !== 'w') return;
      var t = a.tags && a.tags[i];
      out.push({ i: i, s: d.s, tag: t || E.autoTag(a, i), auto: !t });
    });
    return out;
  };
  E.mistakeSummary = function (atts) {
    var by = {}, topics = {}, total = 0, tagged = 0;
    C.TAGS.forEach(function (t) { by[t.id] = { n: 0, auto: 0 }; topics[t.id] = {}; });
    atts.forEach(function (a) {
      E.mistakes(a).forEach(function (m) {
        total++; by[m.tag].n++; if (m.auto) by[m.tag].auto++; else tagged++;
        topics[m.tag][m.s] = (topics[m.tag][m.s] || 0) + 1;
      });
    });
    return { by: by, topics: topics, total: total, tagged: tagged };
  };

  /* ---------- 🎯 cut-off simulator ---------- */
  /* Per section-group stats of one attempt */
  E.groupStats = function (a) {
    var gs = {};
    R.groups.forEach(function (g) { gs[g.id] = { id: g.id, n: g.n, w: g.w, q: 0, c: 0, wr: 0, s: 0 }; });
    Object.keys(a.secs).forEach(function (k) {
      var id = U.groupOf(k), v = a.secs[k], g = gs[id] || (gs[id] = { id: id, n: id, w: 0, q: 0, c: 0, wr: 0, s: 0 });
      g.q += v.t; g.c += v.c; g.wr += v.w; g.s += v.n;
    });
    return Object.keys(gs).map(function (k) { return gs[k]; }).filter(function (g) { return g.q > 0; });
  };
  /* marks if you attempt `att` of `N` questions at accuracy `acc` (0-1) */
  E.marksFor = function (N, attRate, acc, neg, pq) { var att = N * attRate; return att * acc * pq - att * (1 - acc) * neg; };
  /* accuracy needed to reach `target` marks out of N questions when attempting `attRate` of them */
  E.needAcc = function (N, target, attRate, neg, pq) {
    var att = N * attRate; if (att <= 0) return Infinity;
    return (target + att * neg) / (att * (pq + neg));
  };
})();
