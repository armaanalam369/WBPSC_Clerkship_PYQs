/* =====================================================================
   app.js — screens, test engine UI, events.
   Needs: data/manifest.js, js/store.js, util.js, engine.js, charts.js, tools.js, card.js, analysis.js
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK, C = CK.cfg, U = CK.u, E = CK.eng, K = CK.charts, AN = CK.an, R = C.R, esc = U.esc, $ = U.$;
  var root = document.documentElement, app = $('#app');
  var D = CK.D = { set: {}, att: [], sav: {}, days: {}, seen: {} };
  var S = CK.S = {
    view: 'home', kind: 'test', mode: 'full', year: 'all', day: 'all', shift: 'all', pool: 'all', secs: {}, neg: true, mins: 30, cnt: 20,
    qs: [], ans: [], qt: [], fl: [], mk: {}, vis: {}, cur: 0, left: 0, total: 0, el: 0, t: null, run: 'test', runMode: 'full', neg2: 0.25, pq: 1, label: '', sid: '', src: '',
    grid: false, paused: false, fs: false, fsx: 0, tabx: 0, tabNote: false, wl: null, ttab: 'pad',
    tab: 'result', aid: null, sf: 'all', qscope: 'one', mscope: 'one', sim: { target: 60, full: true, g: null, aid: null }, tourN: 0, loading: false
  };
  C.TOPICS.forEach(function (t) { S.secs[t] = false; });
  var SETKEYS = ['set', 'att', 'sav', 'days', 'seen'];

  /* ---------- state persistence helpers ---------- */
  function defaults() {
    var ex = R.nextExam || {};
    return { font: 1, motion: true, showTimer: true, autoNext: false, shuffleQ: false, shuffleO: false, confirmSubmit: true, autoWrong: true, haptic: true, wake: false,
      defMins: 30, defNeg: true, tools: true, fullscreen: true, dailyGoal: R.dailyGoal || 50, cutoff: 60, exam: { name: ex.name || '', date: ex.date || '' } };
  }
  function save(k) { CK.store.set(k, D[k]); }
  function prefs() { root.style.setProperty('--fs', ['14.5px', '16px', '18px'][D.set.font]); root.dataset.motion = D.set.motion ? 'on' : 'off'; }
  function saveSet() { save('set'); prefs(); }
  function setKind() { root.dataset.kind = S.view === 'test' && S.runMode === 'saved' ? 'rev' : (S.kind === 'quiz' ? 'quiz' : 'test'); root.dataset.scope = S.mode === 'sec' ? 'sec' : 'full'; }

  /* ---------- rendering helpers ---------- */
  function render(h, keep) {
    var y = window.scrollY; app.innerHTML = h;
    if (keep) { window.scrollTo(0, y); return; }
    app.classList.remove('in'); void app.offsetWidth; app.classList.add('in'); window.scrollTo(0, 0);
  }
  function buzz() { if (D.set.haptic && navigator.vibrate) try { navigator.vibrate(10); } catch (e) { } }
  function ask(m) { return D.set.confirmSubmit ? confirm(m) : true; }
  function stat(l, v) { return '<div class="stat"><span class="mu">' + l + '</span><b>' + v + '</b></div>'; }
  function label(q) { return (C.ICON[q.s] || '') + ' ' + esc(q.s) + (q.c ? ' · ' + esc(q.c) : ''); }
  function getWake() { if (D.set.wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { S.wl = l; }).catch(function () { }); }
  function relWake() { try { if (S.wl) S.wl.release(); } catch (e) { } S.wl = null; }
  function dueCount() { return Object.keys(D.sav).filter(function (k) { return E.isDue(D.sav[k]); }).length; }

  /* ---------- floating dock ---------- */
  function dock() {
    var items, due = dueCount();
    if (S.view === 'test') {
      items = [{ i: '▦', l: 'Palette', a: 'grid' }];
      if (D.set.tools) items.push({ i: '✏️', l: 'Pad', a: 'tools', v: 'pad' }, { i: '🧮', l: 'Calc', a: 'tools', v: 'calc' });
      if (S.run === 'test') items.push({ i: '⏸', l: 'Pause', a: 'pause' });
      items.push({ i: '✕', l: 'Exit', a: 'exit', danger: 1 });
    } else if (S.view === 'result') {
      items = [{ i: '🏠', l: 'Home', a: 'home' }, { i: '📊', l: 'Analysis', a: 'sheet', v: 'result' }, { i: '🪪', l: 'Card', a: 'rcard', v: S.aid }, { i: '🔁', l: 'Revise', a: 'sheet', v: 'rev', b: due }];
    } else {
      items = [{ i: '🏠', l: 'Home', a: 'home', on: 1 }, { i: '📊', l: 'Stats', a: 'sheet', v: 'all' }, { i: '🔁', l: 'Revise', a: 'sheet', v: 'rev', b: due }, { i: '⚙️', l: 'Settings', a: 'sheet', v: 'set' }];
    }
    $('#dock').innerHTML = items.map(function (x) {
      return '<button class="dk' + (x.on ? ' on' : '') + (x.danger ? ' danger' : '') + '" data-act="' + x.a + '"' + (x.v != null ? ' data-v="' + esc(x.v) + '"' : '') + ' aria-label="' + x.l + '"><i>' + x.i + '</i><span>' + x.l + '</span>' + (x.b ? '<b class="bdg">' + x.b + '</b>' : '') + '</button>';
    }).join('');
  }

  /* ---------- selection of year / day / shift ---------- */
  function fixSel() {
    var full = S.mode === 'full', ys = E.years();
    if (full) { if (ys.indexOf(String(S.year)) < 0) S.year = ys[0]; } else if (S.year !== 'all' && ys.indexOf(String(S.year)) < 0) S.year = 'all';
    var ds = E.days(S.year).map(function (x) { return x.day; });
    if (full) { if (ds.indexOf(+S.day) < 0) S.day = ds[0]; } else if (S.day !== 'all' && ds.indexOf(+S.day) < 0) S.day = 'all';
    var ss = E.shifts(S.year, S.day);
    if (full) { if (ss.indexOf(+S.shift) < 0) S.shift = ss[0]; } else if (S.shift !== 'all' && ss.indexOf(+S.shift) < 0) S.shift = 'all';
  }
  function selection() { return S.mode === 'full' ? [E.find(S.year, S.day, S.shift)].filter(Boolean) : E.filter(S.year, S.day, S.shift); }
  /* make sure the needed papers are loaded; re-render the home screen once they arrive */
  function ensure(list) {
    var need = list.filter(function (s) { return !window.PAPERS[s.id]; });
    if (!need.length) return;
    S.loading = true;
    Promise.all(need.map(function (s) { return E.load(s).then(function () { return s; }, function () { return null; }); })).then(function (r) {
      var bad = r.filter(function (x, i) { return !x; }).length;
      if (bad) { need.forEach(function (s) { if (!window.PAPERS[s.id]) C.SESS = C.SESS.filter(function (x) { return x.id !== s.id; }); }); toastBad(bad); }
      S.loading = false; if (S.view === 'home') home(true);
    });
  }
  function toastBad(n) { U.toast('⚠️ ' + n + ' paper file(s) could not be loaded — check data/manifest.js'); }
  function loaded(list) { return list.every(function (s) { return window.PAPERS[s.id]; }); }
  function poolCount(list, only, unseen) { var c = E.counts(list.filter(function (s) { return window.PAPERS[s.id]; }), unseen ? D.seen : null); return { c: c, n: E.sum(c, only) }; }

  /* ---------- HOME ---------- */
  function sel(id, opts, val) { return '<select class="sel" id="' + id + '" aria-label="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function seg(items, val) {
    var idx = Math.max(0, items.map(function (x) { return String(x[0]); }).indexOf(String(val)));
    return '<div class="seg" style="--n:' + items.length + ';--i:' + idx + '" role="tablist" aria-label="Shift"><i class="thumb"></i>' + items.map(function (x, i) {
      return '<button role="tab" aria-selected="' + (i === idx) + '" class="' + (i === idx ? 'on' : '') + '" data-act="shift" data-v="' + x[0] + '" data-i="' + i + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  function dashboard() {
    var today = (D.days[U.dkey()] || { q: 0 }).q, goal = D.set.dailyGoal, st = E.streak(D.days), bs = E.bestStreak(D.days), due = dueCount(), ex = D.set.exam || {}, left = null;
    if (ex.date) { left = Math.round((new Date(ex.date + 'T00:00') - new Date(U.today0())) / U.DAY); }
    var examTile = ex.date && left >= 0 ? '<b>' + left + '</b><span>' + (left === 0 ? 'exam day!' : left === 1 ? 'day to go' : 'days to go') + '</span><small>' + esc(ex.name || 'Your exam') + '</small>' : '<b>📅</b><span>Set exam date</span><small>' + (ex.date ? 'last date passed' : 'start the countdown') + '</small>';
    var c = coachInfo();
    return '<div class="dash">' +
      '<div class="tile t-goal"><div class="ringbox">' + K.ring(goal ? today / goal : 0, { size: 96, stroke: 10, big: today, sub: '/ ' + goal, bs: 26, c1: '#2fcf94', c2: '#c8e04a', label: 'Daily goal' }) + '</div><div><span class="tl">Daily goal</span><span>' + (today >= goal ? '🎉 Goal hit!' : (goal - today) + ' to go') + '</span></div></div>' +
      '<div class="tile t-streak"><span class="tl">Study streak</span><b>🔥 ' + st + '</b><span>' + (st === 1 ? 'day' : 'days') + ' in a row</span><small>best ' + bs + '</small></div>' +
      '<button class="tile t-exam" data-act="sheet" data-v="set"><span class="tl">Countdown</span>' + examTile + '</button>' +
      '<button class="tile t-due" data-act="revdue"><span class="tl">Revision</span><b>' + due + '</b><span>' + (due === 1 ? 'question due' : 'questions due') + '</span><small>1 · 3 · 7 · 14 day ladder</small></button>' +
      '</div>' +
      '<div class="card"><div class="line" style="padding:0 0 8px"><b>This week</b><span class="mu">' + E.lastDays(D.days, 7).reduce(function (n, x) { return n + x.q; }, 0) + ' questions</span></div>' + K.week(E.lastDays(D.days, 7), goal) + '</div>' +
      (c ? '<div class="card hint coach"><span><b>🎯 Weak-area coach</b><br><span class="mu">Weakest topic: <b style="color:' + U.tone(c.p) + '">' + esc(c.k) + ' (' + c.p + '%)</b>. Try 10 questions?</span></span><button class="btn s" data-act="coach" data-v="' + esc(c.k) + '">Practise</button></div>'
        : '<div class="card coach"><b>🎯 Weak-area coach</b><p class="mu" style="margin-top:4px">Take a few tests and I will pick the topic that needs you most.</p></div>');
  }
  function coachInfo() {
    var g = E.aggTopics(D.att), ks = E.weakFirst(g).filter(function (k) { return g[k].t >= 3; });
    return ks.length ? { k: ks[0], p: U.pct(g[ks[0]].c, g[ks[0]].t) } : null;
  }
  function resumeCard() {
    var run = CK.store.get('run', null); if (!run || !CK.store.get('runq', null)) return '';
    var done = run.ans.filter(function (x) { return x !== null; }).length;
    return '<div class="card resume"><b>⏯ Unfinished ' + (run.run === 'quiz' ? 'quiz' : 'test') + '</b><p class="mu" style="margin:4px 0 10px">' + esc(run.label) + ' · Q' + (run.cur + 1) + ' · ' + done + ' answered' + (run.run === 'test' ? ' · ' + U.fmt(run.left) + ' left' : '') + '</p><div class="row"><button class="btn s" data-act="resume">▶ Resume</button><button class="btn g s" data-act="discard">Discard</button></div></div>';
  }

  function home(keepScroll) {
    if (S.mode === 'saved') S.mode = 'full';
    fixSel(); S.view = 'home'; setKind(); clearInterval(S.t); relWake(); fabsOff(); closeGrid(); CK.tools.close();
    var q = S.kind === 'quiz', full = S.mode === 'full', un = !full && S.pool === 'unseen', sess = selection();
    ensure(sess);
    var ready = loaded(sess);
    /* ----- paper picker: year / day dropdowns + shift slider ----- */
    var ys = E.years().map(function (y) { return [y, y + ' · ' + C.SESS.filter(function (s) { return String(s.year) === y; }).length + ' papers']; });
    if (!full) ys.unshift(['all', '📚 All years']);
    var ds = E.days(S.year).map(function (d) { return [d.day, 'Day ' + d.day + (d.date ? ' · ' + U.dateLabel(d.date) : '')]; });
    if (!full) ds.unshift(['all', 'All days']);
    var shs = E.shifts(S.year, S.day).map(function (s) { return [s, 'Shift ' + s]; });
    if (!full) shs.unshift(['all', 'All shifts']);
    var picker = '<div class="pick"><label><span class="mu">Year</span>' + sel('ysel', ys, S.year) + '</label><label><span class="mu">Day</span>' + sel('dsel', ds, S.day) + '</label></div>' +
      '<span class="mu" style="display:block;margin:12px 0 6px">Shift</span>' + seg(shs, S.shift);
    var card = '';
    if (full) {
      var s0 = sess[0], n = s0 && ready ? window.PAPERS[s0.id].questions.length : null, rl = s0 ? E.rulesFor(s0) : E.rulesFor(null), mins = n ? E.paperMinutes(s0, n) : rl.minutes;
      var by = n ? E.counts([s0]) : null, prev = D.att.filter(function (a) { return s0 && a.sid === s0.id && a.kind === 'test'; }), last = prev[prev.length - 1];
      card = '<div class="sesscard"><div class="sl"><span class="tl">Selected paper</span><b class="sbig">' + (s0 ? U.sessLabel(s0) : '—') + '</b><span class="mu">' + (s0 && s0.date ? U.dateLabel(s0.date) + ' · ' : '') + (n ? n + ' questions' : 'loading…') + ' · ' + (q ? 'no timer' : mins + ' min') + ' · −' + rl.negative + ' per wrong</span></div>' +
        (last ? '<div class="lastbox"><span class="mu">Last attempt</span><b>' + U.n2(last.sc) + '/' + U.n2(last.max) + '</b><small>' + prev.length + '× taken</small></div>' : '<div class="lastbox"><span class="mu">Not attempted</span><b>—</b><small>yet</small></div>') + '</div>' +
        (by ? '<div class="tgrid" style="margin-top:12px">' + C.TOPICS.map(function (t) { return '<span class="tag tt" style="--tc:' + U.col(t) + ';' + (by[t] ? '' : 'opacity:.35') + '">' + C.ICON[t] + ' ' + esc(C.CODE[t]) + ' <b>' + by[t] + '</b></span>'; }).join('') + '</div>' : '') +
        (n && n < rl.questions ? '<p class="note">Sample paper: ' + n + ' of the real ' + rl.questions + ' questions — time scaled to ' + mins + ' min. Replace <b>' + esc(s0.file) + '</b> with the full paper.</p>' : '');
    } else {
      var only = {}; C.TOPICS.forEach(function (t) { if (S.secs[t]) only[t] = 1; });
      var pc = poolCount(sess, only, un), cc = pc.c, nSel = Object.keys(only).length, g = E.aggTopics(D.att);
      card = '<div class="line" style="padding-top:0"><b>Choose chapters</b><span class="row"><button class="btn g s" data-act="topall">All</button><button class="btn g s" data-act="topweak">🎯 Weakest 3</button><button class="btn g s" data-act="topnone">None</button></span></div>' +
        '<p class="mu"><b style="color:var(--tx)">' + nSel + '</b> of ' + C.TOPICS.length + ' chapters · <b style="color:var(--tx)">' + (ready ? pc.n : '…') + '</b> questions available</p><div class="tgrid">' +
        C.TOPICS.map(function (t) {
          var n = cc[t], gp = g[t] && g[t].t ? U.pct(g[t].c, g[t].t) : null;
          return '<button class="tchip ' + (S.secs[t] ? 'on' : '') + '" style="--tc:' + U.col(t) + '" ' + (ready && !n && !S.secs[t] ? 'disabled' : '') + ' data-act="sec" data-v="' + esc(t) + '"><i>' + C.ICON[t] + '</i><span>' + esc(t) + '</span><em>' + (ready ? n : '…') + '</em>' + (gp === null ? '' : '<u style="background:' + U.tone(gp) + '" title="Your accuracy ' + gp + '%"></u>') + '</button>';
        }).join('') + '</div><p class="mu" style="margin-top:8px"><i class="mdot" style="background:#10b981"></i> strong <i class="mdot" style="background:#f59e0b"></i> average <i class="mdot" style="background:#ef4444"></i> weak — from your past tests</p>' +
        '<div class="line"><span>Question pool</span><span class="row"><button class="chip ' + (!un ? 'on' : '') + '" data-act="pool" data-v="all">All</button><button class="chip ' + (un ? 'on' : '') + '" data-act="pool" data-v="unseen">🆕 Unseen only</button></span></div>' +
        '<div class="line"><span>Number of questions</span><span class="row">' + [10, 20, 30, 50, 0].map(function (c) { return '<button class="chip ' + (S.cnt === c ? 'on' : '') + '" data-act="cnt" data-v="' + c + '">' + (c || 'All') + '</button>'; }).join('') + '</span></div>';
    }
    if (!full) card += '<div class="line"><span>Negative marking</span>' + AN.sw(S.neg, 'neg') + '</div>';
    if (!full && !q) card += '<div class="line"><span>Time (minutes)</span><input type="number" id="mins" min="1" max="180" value="' + S.mins + '"></div>';
    card += '<div class="line"><span>Rough pad &amp; calculator<small>✏️ and 🧮 in the test dock</small></span>' + AN.sw(D.set.tools, 'tg', 'tools') + '</div>';
    if (!q && full) card += '<div class="line"><span>Full-screen exam mode<small>Warns if you leave full-screen or switch tabs</small></span>' + AN.sw(D.set.fullscreen, 'tg', 'fullscreen') + '</div>';
    var nStart = full ? (sess[0] && ready ? window.PAPERS[sess[0].id].questions.length : 0) : Math.min(S.cnt || 1e9, (function () { var o = {}; C.TOPICS.forEach(function (t) { if (S.secs[t]) o[t] = 1; }); return poolCount(sess, o, un).n; })());
    var minsTxt = full ? (sess[0] && ready && !q ? ' · ' + E.paperMinutes(sess[0], nStart) + ' min' : '') : '';
    render('<section class="hero"><span class="hello">' + U.greet() + ' 👋</span><h1>WBPSC Clerkship <em>Prelims</em> PYQs</h1><p class="mu">Practise real papers shift by shift — timed exams, instant quizzes and analytics that show exactly where your marks go.</p></section>' +
      '<div class="card quote"><span class="mu">💬 Today’s motivation</span><p>' + esc(C.QUOTES[Math.floor(U.today0() / U.DAY) % C.QUOTES.length]) + '</p></div>' +
      resumeCard() + dashboard() +
      '<h2>1 · Style</h2><div class="modes"><button class="mode m-test ' + (!q ? 'on' : '') + '" data-act="kind" data-v="test"><i>📝</i><b>Exam test</b><span>Timed · negative marking · full-screen</span></button><button class="mode m-quiz ' + (q ? 'on' : '') + '" data-act="kind" data-v="quiz"><i>💡</i><b>Instant quiz</b><span>Answer + explanation after every question</span></button></div>' +
      '<h2>2 · Scope</h2><div class="modes"><button class="mode m-full ' + (full ? 'on' : '') + '" data-act="mode" data-v="full"><i>📄</i><b>Full paper</b><span>One year · day · shift</span></button><button class="mode m-sec ' + (!full ? 'on' : '') + '" data-act="mode" data-v="sec"><i>📚</i><b>Chapter-wise</b><span>Mix topics across papers</span></button></div>' +
      '<h2>3 · Paper</h2><div class="card paper">' + picker + '<div class="divider"></div>' + card + '</div>' +
      '<button class="btn go" data-act="start" ' + (S.loading ? 'disabled' : '') + '>' + (q ? 'Start quiz' : 'Start exam') + (ready && nStart ? ' · ' + nStart + ' questions' + minsTxt : '') + ' →</button>' +
      (C.demo ? '<p class="note">Demo mode: <b>data/manifest.js</b> was not found, so a built-in sample is shown.</p>' : ''), keepScroll);
    dock();
  }
  function fabsOff() { $('#dock').classList.remove('intest'); }

  /* ---------- starting a test ---------- */
  async function start(opt) {
    if (S.view === 'test') return;
    opt = opt || {};
    var full = S.mode === 'full', secs = C.TOPICS.filter(function (t) { return S.secs[t]; });
    if (!full && !secs.length) return alert('Select at least one chapter.');
    var list = selection(); if (!list.length) return alert('No paper found for this selection.');
    if (CK.store.get('run', null) && !confirm('You have an unfinished test. Discard it and start a new one?')) return;
    reqFS(S.kind, full ? 'full' : 'sec');   /* must run inside the click gesture, before any await */
    var papers; try { papers = await Promise.all(list.map(E.load)); } catch (e) { exitFS(); return alert('Could not load a paper file. Check data/manifest.js.'); }
    var qs = [], cnt = opt.cnt != null ? opt.cnt : S.cnt;
    papers.forEach(function (p, pi) {
      p.questions.forEach(function (q, i) {
        if (full || secs.indexOf(q.s) > -1) qs.push(Object.assign({}, q, { _k: list[pi].id + '#' + i, _src: R.examName + ' ' + U.sessLabel(list[pi]) }));
      });
    });
    if (!full && S.pool === 'unseen') qs = qs.filter(function (q) { return !D.seen[q._k]; });
    if (!qs.length) { exitFS(); return alert(!full && S.pool === 'unseen' ? 'You have already seen every question in this selection. Switch the pool to "All".' : 'No questions found for this selection.'); }
    var meta = { kind: S.kind, mode: full ? 'full' : 'sec' };
    if (full) {
      var s0 = list[0], rl = E.rulesFor(s0);
      Object.assign(meta, { label: U.sessLabel(s0), sid: s0.id, neg: rl.negative, pq: rl.perQ, total: S.kind === 'quiz' ? 0 : E.paperMinutes(s0, qs.length) * 60 });
    } else {
      if (cnt > 0 && qs.length > cnt) qs = U.shuf(qs).slice(0, cnt);
      qs.sort(function (a, b) { return C.TOPICS.indexOf(a.s) - C.TOPICS.indexOf(b.s); });
      Object.assign(meta, { label: 'Chapter practice' + (S.year === 'all' ? '' : ' · ' + S.year + (S.day === 'all' ? '' : ' D' + S.day + (S.shift === 'all' ? '' : 'S' + S.shift))), sid: '', neg: (S.neg ? R.negative : 0), pq: R.perQ || 1, total: S.kind === 'quiz' ? 0 : Math.max(1, S.mins) * 60 });
    }
    begin(qs, meta);
  }
  function begin(qs, meta) {
    S.run = meta.kind; S.runMode = meta.mode; S.label = meta.label; S.sid = meta.sid || ''; S.neg2 = meta.neg; S.pq = meta.pq || 1; S.paused = false; S.fsx = 0; S.tabx = 0; S.tabNote = false;
    if (D.set.shuffleQ) { var g = {}, o = []; qs.forEach(function (q) { if (!g[q.s]) { g[q.s] = []; o.push(q.s); } g[q.s].push(q); }); qs = []; o.forEach(function (s) { qs = qs.concat(U.shuf(g[s])); }); }
    if (D.set.shuffleO) qs = qs.map(function (q) { var ord = U.shuf(q.o.map(function (_, i) { return i; })); return Object.assign({}, q, { o: ord.map(function (i) { return q.o[i]; }), a: ord.indexOf(q.a) }); });
    S.qs = qs; S.ans = qs.map(function () { return null; }); S.qt = qs.map(function () { return 0; }); S.fl = qs.map(function () { return null; }); S.mk = {}; S.vis = {};
    S.cur = 0; S.total = meta.total; S.left = meta.total; S.el = 0;
    CK.tools.reset(); CK.store.set('runq', qs);
    clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); S.view = 'test'; setKind(); test();
  }
  function saveRun() {
    if (S.view !== 'test') return;
    CK.store.set('run', { run: S.run, mode: S.runMode, label: S.label, sid: S.sid, neg: S.neg2, pq: S.pq, ans: S.ans, qt: S.qt, mk: S.mk, vis: S.vis, fl: S.fl, cur: S.cur, left: S.left, total: S.total, el: S.el, fsx: S.fsx, tabx: S.tabx });
  }
  function clearRun() { CK.store.del('run'); CK.store.del('runq'); }
  function resume() {
    var r = CK.store.get('run', null), q = CK.store.get('runq', null); if (!r || !q) return;
    Object.assign(S, { run: r.run, runMode: r.mode, label: r.label, sid: r.sid || '', neg2: r.neg, pq: r.pq || 1, qs: q, ans: r.ans, qt: r.qt, mk: r.mk || {}, vis: r.vis || {}, fl: r.fl || q.map(function () { return null; }), cur: r.cur, left: r.left, total: r.total, el: r.el, fsx: r.fsx || 0, tabx: r.tabx || 0, paused: false });
    if (S.runMode !== 'saved') { S.kind = S.run; S.mode = S.runMode; }
    clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); reqFS(S.run, S.runMode); S.view = 'test'; setKind(); test();
  }
  function tick() {
    if (S.paused) return;
    S.el++; if (S.view === 'test') S.qt[S.cur]++;
    if (S.el % 5 === 0) saveRun();
    if (S.run === 'quiz') return;
    S.left--;
    var el = $('#tm'); if (el) { el.textContent = D.set.showTimer ? U.fmt(S.left) : '⏱ ••'; el.classList.toggle('low', S.left < 300); }
    if (S.left <= 0) { U.toast('⏰ Time is up!'); submit(); }
  }

  /* ---------- full-screen exam mode + focus tracking ---------- */
  function reqFS(kind, mode) {
    var el = root;
    if (kind === 'test' && mode === 'full' && D.set.fullscreen && el.requestFullscreen) { S.fs = true; el.requestFullscreen().catch(function () { S.fs = false; }); } else S.fs = false;
  }
  function exitFS() { S.fs = false; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { }); }
  document.addEventListener('fullscreenchange', function () {
    if (document.fullscreenElement) { $('#warn').classList.remove('show'); return; }
    if (S.fs && S.view === 'test' && !S.paused) { S.fsx++; saveRun(); $('#warn').classList.add('show'); }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (S.view === 'test' && S.run === 'test' && S.runMode === 'full' && !S.paused) { S.tabx++; S.tabNote = true; saveRun(); } }
    else if (S.tabNote) { S.tabNote = false; U.toast('⚠️ Tab switch recorded (' + S.tabx + ')'); }
  });
  function pause() {
    if (S.view !== 'test' || S.run !== 'test' || S.paused) return;
    S.paused = true; closeGrid(); CK.tools.close(); saveRun(); $('#pLeft').textContent = U.fmt(S.left); $('#pause').classList.add('show');
  }
  function unpause() { S.paused = false; $('#pause').classList.remove('show'); if (S.fs && !document.fullscreenElement) reqFS(S.run, S.runMode); }

  /* ---------- question screens ---------- */
  function tchips(q) {
    var secs = []; S.qs.forEach(function (x) { if (secs.indexOf(x.s) < 0) secs.push(x.s); });
    return '<div class="chips tscroll">' + secs.map(function (s) { return '<button class="chip ' + (s === q.s ? 'on' : '') + '" style="--tc:' + U.col(s) + '" data-act="secjump" data-v="' + esc(s) + '"><i class="dotc"></i>' + (C.ICON[s] || '') + ' ' + esc(s) + '</button>'; }).join('') + '</div>';
  }
  function centerChip() { var c = $('.tscroll .on'); if (c) { var p = c.parentNode; p.scrollLeft = c.offsetLeft - p.clientWidth / 2 + c.clientWidth / 2; } }
  function flagsRow(locked) {
    var f = S.fl[S.cur];
    return '<div class="flags"><span class="mu">Confidence</span>' + [['s', '🟢 Sure'], ['g', '🟡 Guess'], ['c', '🔴 Confused']].map(function (x) { return '<button class="chip ' + (f === x[0] ? 'on' : '') + '" ' + (locked ? 'disabled' : '') + ' data-act="flag" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function opts(q, mode) {
    return q.o.map(function (o, i) {
      var cls = '';
      if (mode === 'exam') cls = S.ans[S.cur] === i ? 'sel' : '';
      else if (mode === 'quiz' && S.ans[S.cur] !== null) cls = i === q.a ? 'ok' : i === S.ans[S.cur] ? 'bad' : '';
      return '<button class="opt ' + cls + '" data-act="opt" data-v="' + i + '"><i class="bub">' + 'ABCDE'.charAt(i) + '</i><span>' + o + '</span></button>';
    }).join('');
  }
  function qcls(i) {
    if (S.run === 'quiz') return S.ans[i] === null ? (S.vis[i] ? 'na' : 'nv') : (S.ans[i] === S.qs[i].a ? 'ok' : 'bad');
    var a = S.ans[i] !== null, m = !!S.mk[i];
    return a && m ? 'am' : a ? 'ans' : m ? 'mk' : S.vis[i] ? 'na' : 'nv';
  }
  function test(keep) {
    S.view = 'test'; S.vis[S.cur] = true; setKind();
    var q = S.qs[S.cur], a = S.ans[S.cur], done = a !== null, sv = D.sav[q._k] && D.sav[q._k].b, n = S.qs.length, ansN = S.ans.filter(function (x) { return x !== null; }).length, pct = (S.cur + 1) / n * 100;
    var body;
    if (S.run === 'quiz') {
      var c = 0, w = 0; S.ans.forEach(function (x, i) { if (x !== null) { x === S.qs[i].a ? c++ : w++; } });
      body = '<div class="tbar"><span class="tcount">Q ' + (S.cur + 1) + ' <small>/ ' + n + '</small></span><span class="timer">✅ ' + c + ' · ❌ ' + w + '</span></div><div class="bar"><i style="width:' + pct + '%"></i></div>' + tchips(q) +
        '<div class="qcard" style="--tc:' + U.col(q.s) + '"><div class="qmeta"><span class="tag tt">' + label(q) + '</span></div><b class="qt">' + q.q + '</b>' + opts(q, 'quiz') + flagsRow(done) +
        (done ? '<div class="expl ' + (a === q.a ? 'good' : 'badx') + '"><b>' + (a === q.a ? '✅ Correct!' : '❌ Incorrect') + '</b> · Answer: ' + 'ABCDE'.charAt(q.a) + '<br>💡 ' + (q.e || 'No explanation added for this question yet.') + '</div>' : '') + '</div>' +
        '<div class="acts"><button class="btn g" data-act="prev" aria-label="Previous">←</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn" data-act="next" style="margin-left:auto">' + (S.cur === n - 1 ? 'Finish ✓' : 'Next →') + '</button></div>';
    } else {
      body = '<div class="tbar"><span class="tcount">Q ' + (S.cur + 1) + ' <small>/ ' + n + ' · ' + ansN + ' answered</small></span><span class="timer ' + (S.left < 300 ? 'low' : '') + '" id="tm">' + (D.set.showTimer ? U.fmt(S.left) : '⏱ ••') + '</span></div><div class="bar"><i style="width:' + pct + '%"></i></div>' + tchips(q) +
        '<div class="qcard" style="--tc:' + U.col(q.s) + '"><div class="qmeta"><span class="tag tt">' + label(q) + '</span>' + (S.mk[S.cur] ? '<span class="tag" style="color:#a78bfa">★ marked</span>' : '') + '</div><b class="qt">' + q.q + '</b>' + opts(q, 'exam') + flagsRow(false) + '</div>' +
        '<div class="acts"><button class="btn g" data-act="prev" aria-label="Previous">←</button><button class="btn g" data-act="mark">' + (S.mk[S.cur] ? '★ Marked' : '☆ Mark') + '</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn g" data-act="clear">Clear</button><button class="btn" data-act="next" style="margin-left:auto">' + (S.cur === n - 1 ? 'Submit ✓' : 'Save &amp; Next →') + '</button></div>';
    }
    render(body, keep); centerChip(); if (S.grid) fillGrid(); dock(); saveRun();
  }
  function fillGrid() {
    var a = S.ans.filter(function (x) { return x !== null; }).length, m = Object.keys(S.mk).length, nv = S.qs.filter(function (_, i) { return !S.vis[i]; }).length, order = [], idx = {};
    S.qs.forEach(function (q, i) { if (!idx[q.s]) { idx[q.s] = []; order.push(q.s); } idx[q.s].push(i); });
    var legend = S.run === 'quiz' ? '<span><i class="qn ok"></i>Right</span><span><i class="qn bad"></i>Wrong</span><span><i class="qn na"></i>Skipped</span><span><i class="qn nv"></i>Not visited</span>' :
      '<span><i class="qn ans"></i>Answered</span><span><i class="qn na"></i>Not answered</span><span><i class="qn mk"></i>Marked</span><span><i class="qn am"></i>Answered + marked</span><span><i class="qn nv"></i>Not visited</span>';
    $('#drawer').innerHTML = '<div class="line" style="padding-top:0"><b>Question palette</b><button class="btn g s" data-act="closegrid" aria-label="Close">✕</button></div><p class="mu">🟩 ' + a + ' answered · 🟪 ' + m + ' marked · ⬜ ' + nv + ' not visited</p><div class="plegend">' + legend + '</div>' +
      order.map(function (s) { return '<div class="pgrp" style="--tc:' + U.col(s) + '"><span><i class="dotc"></i>' + (C.ICON[s] || '') + ' ' + esc(s) + '</span><div class="grid">' + idx[s].map(function (i) { return '<button class="qn ' + qcls(i) + ' ' + (i === S.cur ? 'cur' : '') + '" data-act="jump" data-v="' + i + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>'; }).join('') +
      '<button class="btn go" data-act="submit" style="width:100%">' + (S.run === 'quiz' ? 'Finish quiz' : 'Submit test') + '</button>';
  }
  function openGrid() { S.grid = true; fillGrid(); $('#drawer').classList.add('show'); $('#shade').classList.add('show'); }
  function closeGrid() { S.grid = false; $('#drawer').classList.remove('show'); $('#shade').classList.remove('show'); }

  /* ---------- submit ---------- */
  function submit() {
    clearInterval(S.t); relWake(); closeGrid(); CK.tools.close(); exitFS(); clearRun();
    S.paused = false; $('#pause').classList.remove('show'); $('#warn').classList.remove('show');
    var g = E.grade(S.qs, S.ans, S.fl, S.qt, S.neg2, S.pq), tomorrow = U.today0() + U.DAY, mastered = 0;
    S.qs.forEach(function (q, i) {
      var r = g.det[i].r; if (r !== 'n' && q._k) D.seen[q._k] = 1;
      var e = D.sav[q._k];
      if (r === 'w' && (D.set.autoWrong || S.runMode === 'saved')) { if (!e) { e = D.sav[q._k] = { k: q._k, s: q.s, c: q.c || '', q: q.q, o: q.o, a: q.a, e: q.e || '', src: q._src || '' }; } E.srsWrong(e); }
      else if (r === 'c' && S.runMode === 'saved' && e && e.w) { if (E.srsRight(e)) mastered++; }
    });
    Object.keys(D.sav).forEach(function (k) { if (!D.sav[k].b && !D.sav[k].w) delete D.sav[k]; });
    var dk = U.dkey(), dd = D.days[dk] || (D.days[dk] = { q: 0, t: 0 }); dd.q += g.att; dd.t++;
    var a = {
      id: U.uid(), ts: Date.now(), sid: S.sid, label: S.runMode === 'saved' ? 'Revision practice' : S.label + (S.run === 'quiz' ? ' · Quiz' : ''), src: S.label, kind: S.run, mode: S.runMode,
      sc: g.sc, max: S.qs.length * S.pq, neg: S.neg2, perQ: S.pq, used: S.el, total: S.total, secs: g.st, det: g.det, conf: g.conf, fsx: S.fsx, tabx: S.tabx, tags: {}, mastered: mastered,
      full: S.qs.map(function (q, i) { return { s: q.s, c: q.c || '', q: q.q, o: q.o, a: q.a, y: S.ans[i], t: S.qt[i] || 0, f: S.fl[i] || 'u', e: q.e || '', k: q._k, src: q._src || '' }; })
    };
    D.att.push(a); if (D.att.length > 120) D.att.shift();
    D.att.forEach(function (x, i) { if (i < D.att.length - 25) delete x.full; });   /* full question text only for the last 25 attempts */
    SETKEYS.forEach(save); S.aid = a.id; S.sim.g = null;
    S.view = 'result'; setKind(); resultView(a);
  }
  function ring(a) {
    var p = U.clamp(a.sc / (a.max || 1), 0, 1), c = 0, w = 0, n = 0; a.det.forEach(function (d) { d.r === 'c' ? c++ : d.r === 'w' ? w++ : n++; });
    var msg = p >= .75 ? 'Outstanding result!' : p >= .5 ? 'Good going — keep climbing' : p >= .25 ? 'Solid start — review and retry' : 'Every mistake here is a mark saved later';
    return '<div class="ringw"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a)"/><stop offset="1" style="stop-color:var(--b)"/></linearGradient></defs><circle class="t" cx="60" cy="60" r="52"/><circle class="f" cx="60" cy="60" r="52" style="--o:' + (326.7 * (1 - p)).toFixed(1) + '"/></svg>' +
      '<div class="ringc"><b id="rnum">' + U.n2(a.sc) + '</b><small>out of ' + U.n2(a.max) + ' · ' + Math.round(p * 100) + '%</small></div></div><h3>' + msg + '</h3><div class="rp"><span style="color:#10b981">✅ ' + c + '</span><span style="color:#ef4444">❌ ' + w + '</span><span>⏭ ' + n + '</span></div>';
  }
  function resultView(a, keep) {
    var wrongs = a.det.map(function (d, i) { return d.r === 'w' ? i : -1; }).filter(function (i) { return i >= 0; }), tagged = wrongs.filter(function (i) { return a.tags && a.tags[i]; }).length, secs = Object.keys(a.secs).sort(function (x, y) { return C.TOPICS.indexOf(x) - C.TOPICS.indexOf(y); });
    render('<div class="card res">' + ring(a) + '<p class="mu">Time taken: ' + U.fmt(a.used) + (a.fsx + a.tabx ? ' · ⚠️ ' + (a.fsx + a.tabx) + ' focus lapse(s)' : '') + '</p></div>' +
      '<div class="row" style="margin:0 0 12px"><button class="btn" data-act="rcard" data-v="' + a.id + '">🪪 Result card</button><button class="btn g" data-act="sheet" data-v="result">📊 Full analysis</button><button class="btn g" data-act="exportq" data-v="' + a.id + '">⬇ CSV</button></div>' +
      (wrongs.length ? '<div class="card tagq"><div class="line" style="padding:0"><b>🧩 Why did you miss ' + wrongs.length + ' question' + (wrongs.length > 1 ? 's' : '') + '?</b><span class="mu">' + tagged + '/' + wrongs.length + ' tagged</span></div>' + bar2(tagged, wrongs.length) + '<p class="mu">Tag each mistake in the review below — Concept gap, Silly mistake, Time pressure… The Mistakes tab turns this into your personal fix-list.</p></div>' : '') +
      secs.map(function (k) { var v = a.secs[k]; return '<div class="card sc" style="--tc:' + U.col(k) + '"><b>' + (C.ICON[k] || '') + ' ' + esc(k) + '</b> <span class="mu">✅ ' + v.c + ' · ❌ ' + v.w + ' · ⏭ ' + v.n + '</span><div class="bar" style="margin-bottom:0"><i style="width:' + U.pct(v.c, v.t) + '%;background:' + U.col(k) + '"></i></div></div>'; }).join('') +
      (a.mastered ? '<p class="mu">🎉 ' + a.mastered + ' question(s) mastered and removed from your wrong notebook.</p>' : '') +
      (a.mode !== 'saved' && D.set.autoWrong && wrongs.length ? '<p class="mu">Wrong answers were added to your 🔖 notebook and scheduled for 1 · 3 · 7 · 14-day revision.</p>' : '') +
      '<h2>Review</h2>' + (a.full || []).map(function (f, i) {
        var wrong = a.det[i].r === 'w', sv = D.sav[f.k] && D.sav[f.k].b;
        return '<div class="card rv"><div class="line" style="padding-top:0"><span class="mu">' + (C.ICON[f.s] || '') + ' ' + esc(f.s) + ' · Q' + (i + 1) + ' · ⏱ ' + f.t + 's' + (f.f !== 'u' ? ' · ' + C.FLAGS[f.f] : '') + '</span><button class="btn g s" data-act="rsave" data-v="' + i + '">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button></div><b class="qt">' + f.q + '</b>' +
          f.o.map(function (o, j) { return '<div class="opt ' + (j === f.a ? 'ok' : f.y === j ? 'bad' : '') + '"><i class="bub">' + 'ABCDE'.charAt(j) + '</i><span>' + o + '</span></div>'; }).join('') + (f.e ? '<div class="expl">💡 ' + f.e + '</div>' : '') +
          (wrong ? '<div class="mu" style="margin-top:10px">Why did you miss it?</div>' + AN.tagRow(a.id, i, a.tags && a.tags[i], E.autoTag(a, i)) : '') + '</div>';
      }).join(''), keep);
    dock(); if (!keep) celebrate(a.sc / (a.max || 1), a.sc);
  }
  function bar2(a, b) { return '<div class="bar"><i style="width:' + U.pct(a, b) + '%"></i></div>'; }
  function celebrate(p, sc) {
    var el = $('#rnum'), t0 = performance.now();
    if (el && D.set.motion) (function f(t) { var k = Math.min(1, (t - t0) / 1500); el.textContent = U.n2(sc * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
    if (p < .25 || !D.set.motion || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
    var cv = $('#cf'), c = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, ps = [], i, cols = [cssA(), cssB(), '#22b8cf', '#f0567a', '#2fbf8f', '#ff8a3d'], N = Math.round(70 + p * 150), st = performance.now();
    for (i = 0; i < N; i++) ps.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .3, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] });
    (function loop(t) {
      c.clearRect(0, 0, W, H);
      ps.forEach(function (q) { q.vy += .3; q.vx *= .992; q.x += q.vx; q.y += q.vy; q.r += q.vr; c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillStyle = q.c; c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); c.restore(); });
      if (t - st < 4200) requestAnimationFrame(loop); else c.clearRect(0, 0, W, H);
    })(st);
  }
  function cssA() { return getComputedStyle(root).getPropertyValue('--a').trim() || '#6d7bff'; }
  function cssB() { return getComputedStyle(root).getPropertyValue('--b').trim() || '#ffb547'; }

  /* ---------- CSV export + result card ---------- */
  function attById(id) { for (var i = 0; i < D.att.length; i++) if (D.att[i].id === id) return D.att[i]; return null; }
  function exportQ(id) {
    var a = attById(id) || D.att[D.att.length - 1]; if (!a || !a.full) return alert('Nothing to export for this test.');
    var rows = [['#', 'Topic', 'Sub-topic', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Your answer', 'Correct answer', 'Result', 'Time (s)', 'Confidence', 'Mistake type', 'Explanation']];
    a.full.forEach(function (x, i) {
      if (x.y === null || x.y === undefined) return;
      var tg = a.tags && a.tags[i] ? C.tagById(a.tags[i]) : null;
      rows.push([i + 1, x.s, x.c, x.q, x.o[0] || '', x.o[1] || '', x.o[2] || '', x.o[3] || '', 'ABCDE'.charAt(x.y) + '. ' + x.o[x.y], 'ABCDE'.charAt(x.a) + '. ' + x.o[x.a], x.y === x.a ? 'Correct' : 'Wrong', x.t, C.FLAGS[x.f] ? C.FLAGS[x.f].replace(/^\S+\s/, '') : '', tg ? tg.n : '', x.e]);
    });
    if (rows.length === 1) return alert('You did not attempt any question in this test.');
    var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + U.strip(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    U.download('clerkship-attempted-' + U.dkey(new Date(a.ts)) + '.csv', csv, 'text/csv;charset=utf-8');
  }
  var cardCv = null, cardName = 'clerkship-result.png';
  function openCard(id) {
    var a = attById(id) || D.att[D.att.length - 1]; if (!a) return U.toast('Finish a test first.');
    $('#cardm').classList.add('show'); $('#cardImg').innerHTML = '<div class="mu" style="padding:60px 0">Drawing your card…</div>';
    CK.card.make(a, { target: D.set.cutoff, streak: E.streak(D.days) }).then(function (cv) {
      cardCv = cv; cardName = 'clerkship-result-' + U.dkey(new Date(a.ts)) + '.png';
      $('#cardImg').innerHTML = '<img alt="Your result card" src="' + cv.toDataURL('image/png') + '">';
    }).catch(function () { $('#cardImg').innerHTML = '<div class="mu" style="padding:40px 0">Could not draw the card in this browser.</div>'; });
  }

  /* ---------- analytics sheet ---------- */
  var TABS = [['result', '📊 Result', AN.result], ['all', '📈 Overall', AN.overall], ['strat', '🧭 Strategy', AN.strategy], ['pace', '⏱ Pace', AN.pace], ['cut', '🎯 Cut-off', AN.cutoff], ['mis', '🧩 Mistakes', AN.mistakes], ['top', '📚 Topics', AN.topics], ['rev', '🔁 Revise', AN.revise], ['set', '⚙️ Settings', AN.settings]];
  function sheet() {
    $('#stabs').innerHTML = TABS.map(function (t) { return '<button class="chip ' + (S.tab === t[0] ? 'on' : '') + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    var b = $('#sbody'), y = b.scrollTop, f = TABS.filter(function (t) { return t[0] === S.tab; })[0][2];
    b.innerHTML = f(); b.scrollTop = y;
    var on = $('#stabs .on'); if (on) { var p = on.parentNode; p.scrollLeft = on.offsetLeft - p.clientWidth / 2 + on.clientWidth / 2; }
  }
  function openSheet(tab) { if (tab) S.tab = tab; sheet(); $('#sheet').classList.add('show'); $('#shade2').classList.add('show'); if (tab) $('#sbody').scrollTop = 0; }
  function closeSheet() { $('#sheet').classList.remove('show'); $('#shade2').classList.remove('show'); if (S.view === 'home') home(true); else if (S.view === 'result') dock(); }
  var sheetOpen = function () { return $('#sheet').classList.contains('show'); };

  /* ---------- tour ---------- */
  var TOUR = [
    { i: '👋', t: 'Welcome to Wise Choice', d: 'Practise WBPSC Clerkship Prelims previous-year papers <b>shift by shift</b> — pick the year, the day, then slide to the shift.' },
    { i: '📝', t: 'Exam test or instant quiz', d: '<b>Exam test</b> is timed with negative marking and a real-exam palette. <b>Quiz</b> shows the answer and explanation after every question. Use <b>Chapter-wise</b> to mix any of the 12 subjects across papers.' },
    { i: '🧰', t: 'Tools during a test', d: 'The floating dock gives you the ▦ <b>palette</b>, ✏️ <b>rough pad</b>, 🧮 <b>calculator</b> and ⏸ <b>pause</b>. Tag each answer 🟢 Sure / 🟡 Guess / 🔴 Confused — it powers your strategy score.' },
    { i: '📊', t: 'Analytics that explain your marks', d: 'Strategy score, time-split timeline, accuracy-vs-speed quadrant, cut-off simulator and a mistake taxonomy — plus a shareable <b>result card</b>.' },
    { i: '🔁', t: 'Revise on the 1-3-7-14 ladder', d: 'Wrong answers return after 1, 3, 7 and 14 days. Set your daily goal and exam date in ⚙️ Settings and watch the dashboard keep you honest.' }
  ];
  function tourShow(n) {
    var s = TOUR[n], last = n === TOUR.length - 1; S.tourN = n;
    $('#tour').innerHTML = '<div class="ovc"><div class="big">' + s.i + '</div><h2>' + s.t + '</h2><p class="mu" style="color:var(--tx)">' + s.d + '</p><div class="dots">' + TOUR.map(function (_, i) { return '<i class="' + (i === n ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="row" style="justify-content:center">' + (n ? '<button class="btn g" data-act="tourback">←</button>' : '<button class="btn g" data-act="tourend">Skip</button>') + '<button class="btn" data-act="' + (last ? 'tourend' : 'tournext') + '">' + (last ? 'Let’s go 🚀' : 'Next →') + '</button></div></div>';
    $('#tour').classList.add('show');
  }
  function tourEnd() { $('#tour').classList.remove('show'); CK.store.set('tour', 1); }

  /* ---------- actions ---------- */
  function setTopicOnly(v) { C.TOPICS.forEach(function (t) { S.secs[t] = (t === v); }); S.mode = 'sec'; S.kind = 'quiz'; S.year = 'all'; S.day = 'all'; S.shift = 'all'; S.pool = 'all'; }
  function toggleSave(q) {
    var e = D.sav[q._k]; if (e && e.b) e.b = false; else { if (!e) e = D.sav[q._k] = { k: q._k, s: q.s, c: q.c || '', q: q.q, o: q.o, a: q.a, e: q.e || '', src: q._src || '' }; e.b = true; }
    Object.keys(D.sav).forEach(function (k) { if (!D.sav[k].b && !D.sav[k].w) delete D.sav[k]; }); save('sav');
  }
  var A = {
    theme: function () { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; CK.store.pref.set('theme', root.dataset.theme); metaTheme(); if (sheetOpen()) sheet(); if (CK.tools.isOpen() && CK.tools.tab === 'pad') CK.tools.redraw(); },
    pick: function (v) { root.dataset.pal = v; CK.store.pref.set('pal', v); metaTheme(); if (sheetOpen()) sheet(); },
    mode: function (v) { S.mode = v; home(true); },
    kind: function (v) { S.kind = v; home(true); },
    shift: function (v, el) {
      var sg = el && el.closest('.seg'); S.shift = v === 'all' ? 'all' : +v;
      if (sg) { sg.style.setProperty('--i', el.dataset.i); U.$$('button', sg).forEach(function (b) { b.classList.toggle('on', b === el); }); setTimeout(function () { if (S.view === 'home') home(true); }, 240); } else home(true);
    },
    sec: function (v) { S.secs[v] = !S.secs[v]; home(true); },
    cnt: function (v) { S.cnt = +v; home(true); },
    topall: function () { var c = poolCount(selection(), null, S.pool === 'unseen').c, ready = loaded(selection()); C.TOPICS.forEach(function (t) { S.secs[t] = !ready || c[t] > 0; }); home(true); },
    topweak: function () {
      var g = E.aggTopics(D.att), c = poolCount(selection(), null, S.pool === 'unseen').c, ks = E.weakFirst(g).filter(function (k) { return c[k] > 0; }).slice(0, 3);
      if (!ks.length) return U.toast('Take a test first — then I can find your weakest chapters.');
      C.TOPICS.forEach(function (t) { S.secs[t] = ks.indexOf(t) > -1; }); home(true);
    },
    topnone: function () { C.TOPICS.forEach(function (t) { S.secs[t] = false; }); home(true); },
    pool: function (v) { S.pool = v; home(true); },
    neg: function () { S.neg = !S.neg; home(true); },
    start: function () { start(); }, home: function () { if (S.view === 'test') return; if (sheetOpen()) closeSheet(); home(); },
    resume: resume,
    discard: function () { if (confirm('Discard your unfinished test?')) { clearRun(); home(true); } },
    revdue: function () { S.sf = 'd'; A.practice(); },
    coach: function (v) { if (S.view === 'test') return; setTopicOnly(v); start({ cnt: 10 }); },
    opt: function (v) {
      if (S.run === 'quiz') { if (S.ans[S.cur] !== null) return; buzz(); S.ans[S.cur] = +v; test(true); return; }
      buzz(); S.ans[S.cur] = +v; var c = S.cur; test(true);
      if (D.set.autoNext && c < S.qs.length - 1) setTimeout(function () { if (S.view === 'test' && S.cur === c && !S.paused) { S.cur++; test(); } }, 280);
    },
    flag: function (v) { if (S.run === 'quiz' && S.ans[S.cur] !== null) return; S.fl[S.cur] = S.fl[S.cur] === v ? null : v; test(true); },
    prev: function () { if (S.cur > 0) { S.cur--; test(); } },
    next: function () {
      if (S.cur < S.qs.length - 1) { S.cur++; test(); return; }
      if (S.run === 'quiz') { var u = S.ans.filter(function (x) { return x === null; }).length; if (u && !confirm(u + ' question(s) unanswered. Finish the quiz?')) return; submit(); }
      else if (ask('Submit the test?')) submit();
    },
    mark: function () { if (S.mk[S.cur]) delete S.mk[S.cur]; else S.mk[S.cur] = 1; test(true); },
    clear: function () { S.ans[S.cur] = null; test(true); },
    save: function () { toggleSave(S.qs[S.cur]); test(true); },
    rsave: function (v, el) {
      var a = attById(S.aid), f = a && a.full && a.full[+v]; if (!f) return;
      toggleSave({ _k: f.k, s: f.s, c: f.c, q: f.q, o: f.o, a: f.a, e: f.e, _src: f.src }); el.textContent = D.sav[f.k] && D.sav[f.k].b ? '🔖 Saved' : '🔖 Save';
    },
    jump: function (v) { S.cur = +v; closeGrid(); test(); },
    secjump: function (v) { for (var i = 0; i < S.qs.length; i++) if (S.qs[i].s === v) { S.cur = i; break; } test(); },
    grid: function () { S.grid ? closeGrid() : openGrid(); }, closegrid: closeGrid,
    submit: function () { if (ask('Submit the test?')) submit(); },
    exit: function () { if (confirm('Exit this test? Your progress will be lost.')) { clearInterval(S.t); relWake(); clearRun(); exitFS(); S.paused = false; closeGrid(); CK.tools.close(); $('#warn').classList.remove('show'); home(); } },
    pause: pause, unpause: unpause,
    pauseexit: function () { $('#pause').classList.remove('show'); clearInterval(S.t); relWake(); exitFS(); S.paused = false; saveRun(); S.view = 'home'; home(); },
    fsback: function () { $('#warn').classList.remove('show'); reqFS(S.run, S.runMode); },
    fsskip: function () { $('#warn').classList.remove('show'); S.fs = false; },
    tools: function (v) { if (S.view === 'test' && !S.paused) CK.tools.open(v); }, toolsclose: function () { CK.tools.close(); }, ttab: function (v) { CK.tools.show(v); },
    padcol: function (v) { CK.tools.color(v); }, paderase: function () { CK.tools.eraser(); }, padundo: function () { CK.tools.undo(); }, padclear: function () { CK.tools.clear(); },
    ck: function (v) { CK.tools.press(v); },
    sheet: function (v) { openSheet(v); }, closesheet: closeSheet,
    tab: function (v) { S.tab = v; sheet(); $('#sbody').scrollTop = 0; },
    sfil: function (v) { S.sf = v; sheet(); },
    qscope: function (v) { S.qscope = v; sheet(); }, mscope: function (v) { S.mscope = v; sheet(); },
    simfull: function () { S.sim.full = !S.sim.full; sheet(); },
    simreset: function () { S.sim.g = null; sheet(); },
    tag: function (v) {
      var p = v.split('|'), a = attById(p[0]); if (!a) return; a.tags = a.tags || {};
      if (a.tags[p[1]] === p[2]) delete a.tags[p[1]]; else a.tags[p[1]] = p[2];
      save('att'); if (sheetOpen()) sheet(); else if (S.view === 'result' && a.id === S.aid) resultView(a, true);
    },
    delsav: function (v) { delete D.sav[v]; save('sav'); sheet(); },
    practice: function () {
      if (S.view === 'test') return alert('Finish or exit the current test first.');
      var l = AN.savedList(); if (!l.length) { openSheet('rev'); return; }
      if (CK.store.get('run', null) && !confirm('You have an unfinished test. Discard it and start this revision?')) return;
      if (sheetOpen()) { $('#sheet').classList.remove('show'); $('#shade2').classList.remove('show'); }
      S.kind = 'quiz';
      begin(l.map(function (e) { return { s: e.s, c: e.c, q: e.q, o: e.o.slice(), a: e.a, e: e.e, _k: e.k, _src: e.src }; }), { kind: 'quiz', mode: 'saved', label: 'Revision practice', sid: '', neg: 0, pq: R.perQ || 1, total: 0 });
    },
    ptopic: function (v) { if (S.view === 'test') return alert('Finish or exit the current test first.'); $('#sheet').classList.remove('show'); $('#shade2').classList.remove('show'); setTopicOnly(v); home(); },
    exportq: exportQ,
    rcard: function (v) { openCard(v || S.aid); },
    cardshare: function () { if (cardCv) CK.card.share(cardCv, cardName).then(function (ok) { if (ok) U.toast('Result card ready ✅'); }); },
    cardclose: function () { $('#cardm').classList.remove('show'); },
    tour: function () { closeSheet(); tourShow(0); }, tournext: function () { tourShow(S.tourN + 1); }, tourback: function () { tourShow(S.tourN - 1); }, tourend: tourEnd,
    tg: function (v) { D.set[v] = !D.set[v]; if (v === 'defNeg') S.neg = D.set.defNeg; saveSet(); if (sheetOpen()) sheet(); if (S.view === 'home') home(true); },
    font: function (v) { D.set.font = +v; saveSet(); sheet(); },
    'export': function () { U.download('clerkship-backup.json', JSON.stringify({ app: 'wise-clerkship', v: 1, data: CK.store.dump(SETKEYS) })); },
    'import': function () { $('#imp').click(); },
    wipe: function () { if (confirm('Delete all analytics, streaks and saved questions from this device?')) { D.att = []; D.sav = {}; D.days = {}; D.seen = {}; ['att', 'sav', 'days', 'seen'].forEach(save); sheet(); } }
  };
  function metaTheme() { var m = $('meta[name=theme-color]'); if (m) m.content = root.dataset.theme === 'light' ? '#f6f2e9' : '#080b1c'; }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
    var f = A[t.dataset.act]; if (f) { if (t.dataset.act !== 'opt') buzz(); f(t.dataset.v, t, e); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'ysel') { S.year = t.value; S.day = 'all'; S.shift = 'all'; if (S.mode === 'full') { S.day = 0; S.shift = 0; } home(true); }
    else if (t.id === 'dsel') { S.day = t.value === 'all' ? 'all' : +t.value; if (S.mode === 'full') S.shift = 0; else S.shift = 'all'; home(true); }
    else if (t.dataset && t.dataset.sel === 'aid') { S.aid = t.value; S.sim.g = null; sheet(); }
    else if (t.dataset && t.dataset.set) {
      var k = t.dataset.set, v = t.value;
      if (k === 'dailyGoal') D.set.dailyGoal = U.clamp(+v || 50, 5, 500);
      else if (k === 'cutoff') { D.set.cutoff = U.clamp(+v || 60, 30, 95); S.sim.target = D.set.cutoff; }
      else if (k === 'defMins') { D.set.defMins = U.clamp(+v || 30, 1, 180); S.mins = D.set.defMins; }
      else if (k === 'examName') { D.set.exam = D.set.exam || {}; D.set.exam.name = v.trim(); }
      else if (k === 'examDate') { D.set.exam = D.set.exam || {}; D.set.exam.date = v; }
      saveSet(); U.toast('Saved ✓');
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'mins') S.mins = +t.value || 1;
    if (t.dataset && t.dataset.sim) {
      var p = t.dataset.sim.split(':'), v = +t.value;
      if (p[0] === 'target') { S.sim.target = v; D.set.cutoff = v; var el = $('#sv-target'); if (el) el.textContent = v + '%'; }
      else { S.sim.g = S.sim.g || {}; (S.sim.g[p[0]] = S.sim.g[p[0]] || { att: 0, acc: 0 })[p[1]] = v; var el2 = $('#sv-' + p[0] + '-' + p[1]); if (el2) el2.textContent = v + '%'; }
      AN.simOut();
    }
  });
  document.addEventListener('change', function (e) { if (e.target.dataset && e.target.dataset.sim === 'target') saveSet(); });
  $('#imp').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () {
      try {
        var o = JSON.parse(r.result), d = o.data || o;
        if (!d || (!d.att && !d.sav && !d.days)) throw new Error('bad');
        SETKEYS.forEach(function (k) { if (d[k] !== undefined) D[k] = d[k]; }); D.set = Object.assign(defaults(), D.set);
        SETKEYS.forEach(save); prefs(); sheet(); alert('Backup restored.');
      } catch (x) { alert('That file is not a valid backup.'); }
    };
    r.readAsText(f); e.target.value = '';
  });
  /* keyboard: 1-4 choose · N / → next · P / ← previous · M mark · S save · G palette */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (CK.tools.isOpen()) {
      if (CK.tools.tab === 'calc') {
        var k = e.key, m = { Enter: '=', '=': '=', Backspace: 'B', Delete: 'C', c: 'C', C: 'C', '%': '%' };
        if (/^[0-9.]$/.test(k) || '+-*/'.indexOf(k) > -1) { e.preventDefault(); CK.tools.press(k); } else if (m[k]) { e.preventDefault(); CK.tools.press(m[k]); }
      }
      if (e.key === 'Escape') CK.tools.close();
      return;
    }
    if (e.key === 'Escape') { if (sheetOpen()) closeSheet(); else if (S.grid) closeGrid(); else if ($('#cardm').classList.contains('show')) A.cardclose(); return; }
    if (S.view !== 'test' || S.paused || sheetOpen() || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    var k2 = e.key.toLowerCase();
    if (k2 >= '1' && k2 <= '4') { if (S.qs[S.cur].o[+k2 - 1] !== undefined) A.opt(+k2 - 1); }
    else if (k2 === 'n' || k2 === 'arrowright') { if (S.cur < S.qs.length - 1) A.next(); }
    else if (k2 === 'p' || k2 === 'arrowleft') A.prev();
    else if (k2 === 'm' && S.run !== 'quiz') A.mark();
    else if (k2 === 's') A.save();
    else if (k2 === 'g') A.grid();
  });

  /* ---------- boot ---------- */
  function seedDays() {
    if (Object.keys(D.days).length || !D.att.length) return;
    D.att.forEach(function (a) { var k = U.dkey(new Date(a.ts)), n = 0; Object.keys(a.secs).forEach(function (t) { n += a.secs[t].c + a.secs[t].w; }); var x = D.days[k] || (D.days[k] = { q: 0, t: 0 }); x.q += n; x.t++; });
    save('days');
  }
  async function boot() {
    await CK.store.init();
    D.set = Object.assign(defaults(), CK.store.get('set', {})); D.att = CK.store.get('att', []); D.sav = CK.store.get('sav', {}); D.days = CK.store.get('days', {}); D.seen = CK.store.get('seen', {});
    root.dataset.theme = CK.store.pref.get('theme', 'dark'); root.dataset.pal = CK.store.pref.get('pal', 'midnight'); metaTheme();
    S.neg = D.set.defNeg; S.mins = D.set.defMins; S.sim.target = D.set.cutoff; prefs(); seedDays();
    var ys = E.years(); S.year = ys[0]; S.day = 0; S.shift = 0;
    CK.tools.init(); home();
    if (!CK.store.get('tour', 0)) tourShow(0);
    CK.store.persist();
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js?v=2', { updateViaCache: 'none' }).catch(function () { });
  }
  CK.boot = boot;
  boot();
})();
