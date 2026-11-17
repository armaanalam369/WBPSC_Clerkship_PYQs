/* =====================================================================
   analysis.js — renders every tab of the Settings & Analytics sheet.
   Reads app state from CK.D (data) and CK.S (UI state); returns HTML strings.
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {}, C = CK.cfg, U = CK.u, E = CK.eng, K = CK.charts, R = C.R, esc = U.esc;
  var A = CK.an = {};

  /* ---------- tiny view helpers ---------- */
  function stat(l, v, sub, col) { return '<div class="stat"><span class="mu">' + l + '</span><b' + (col ? ' style="-webkit-text-fill-color:' + col + ';background:none;color:' + col + '"' : '') + '>' + v + '</b>' + (sub ? '<small class="mu">' + sub + '</small>' : '') + '</div>'; }
  function empty(i, t, d) { return '<div class="empty"><b>' + i + '</b><div style="color:var(--tx);font-weight:700">' + t + '</div><div>' + d + '</div></div>'; }
  function card(h, body, cls) { return '<div class="card ' + (cls || '') + '">' + (h ? '<div class="ch">' + h + '</div>' : '') + body + '</div>'; }
  function sec(t) { return '<div class="sec">' + t + '</div>'; }
  function bar(p, col) { return '<div class="bar"><i style="width:' + p + '%;background:' + (col || U.tone(p)) + '"></i></div>'; }
  function nums(list, col, max) {
    max = max || 16; if (!list.length) return '<span class="mu">None 🎉</span>';
    return '<div class="cnum">' + list.slice(0, max).map(function (n) { return '<span style="background:' + col + '">' + n + '</span>'; }).join('') + (list.length > max ? '<span class="more">+' + (list.length - max) + '</span>' : '') + '</div>';
  }
  function trow(k, v, btn) {
    var p = U.pct(v.c, v.t);
    return '<div class="card trow" style="--tc:' + U.col(k) + '"><div class="line" style="padding:0"><b>' + (C.ICON[k] || '') + ' ' + esc(k) + '</b><b style="color:' + U.tone(p) + '">' + p + '% · ' + U.lab(p) + '</b></div>' +
      '<div class="line" style="padding:4px 0 0"><span class="mu">' + v.c + '/' + v.t + ' correct · ' + v.w + ' wrong · ' + v.n + ' skipped</span>' + (btn ? '<button class="btn g s" data-act="ptopic" data-v="' + esc(k) + '">Practise</button>' : '') + '</div>' + bar(p) + '</div>';
  }
  function legendCodes() { return '<div class="codes">' + C.TOPICS.map(function (t) { return '<span><i style="background:' + U.col(t) + '"></i><b>' + esc(C.CODE[t]) + '</b> ' + esc(t) + '</span>'; }).join('') + '</div>'; }

  /* which attempt are the per-test tabs looking at? */
  A.cur = function () {
    var D = CK.D, S = CK.S; if (!D.att.length) return null;
    for (var i = 0; i < D.att.length; i++) if (D.att[i].id === S.aid) return D.att[i];
    return D.att[D.att.length - 1];
  };
  function picker() {
    var D = CK.D, cur = A.cur(); if (D.att.length < 2) return '';
    return '<div class="picker"><span class="mu">Analysing</span><select class="sel" data-sel="aid">' + D.att.slice().reverse().map(function (a) {
      return '<option value="' + a.id + '"' + (cur && cur.id === a.id ? ' selected' : '') + '>' + esc(a.label || a.src) + ' · ' + U.n2(a.sc) + '/' + U.n2(a.max) + ' · ' + new Date(a.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '</option>';
    }).join('') + '</select></div>';
  }
  function head(a) { return '<p class="mu" style="margin-bottom:10px">' + esc(a.label || a.src) + ' · ' + new Date(a.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</p>'; }

  /* ---------- confidence matrix ---------- */
  function confBlock(cf) {
    var keys = ['s', 'g', 'c', 'u'].filter(function (k) { return cf[k]; }); if (!keys.length) return '';
    var tot = function (k) { return cf[k] ? cf[k].c + cf[k].w + cf[k].n : 0; };
    if (keys.length === 1 && keys[0] === 'u') return sec('Confidence check') + card('', '<p class="mu">Tap 🟢 Sure / 🟡 Guess / 🔴 Confused while answering — this card then shows how well your confidence matches your results, and unlocks the Strategy score.</p>');
    var h = '<div class="mtx"><b></b><b>Right</b><b>Wrong</b><b>Skipped</b>' + keys.map(function (k) { var v = cf[k]; return '<span class="l">' + C.FLAGS[k] + '</span><span style="color:#10b981">' + v.c + '</span><span style="color:#ef4444">' + v.w + '</span><span>' + v.n + '</span>'; }).join('') + '</div>';
    if (cf.s && cf.s.w) h += '<p style="margin-top:10px">⚠️ <b>' + cf.s.w + '</b> “Sure” answer(s) were wrong — overconfidence. Revise those concepts first.</p>';
    if (cf.g && cf.g.c) h += '<p style="margin-top:8px">🍀 <b>' + cf.g.c + '</b> right guess(es) — lucky, not learned. Re-check them.</p>';
    if (cf.s && tot('s') && !cf.s.w) h += '<p style="margin-top:8px">✅ Every “Sure” answer was correct — great calibration.</p>';
    return sec('Confidence check') + card('', h);
  }

  /* ================= 📊 RESULT ================= */
  A.result = function () {
    var a = A.cur(); if (!a) return empty('📊', 'No test yet', 'Finish a test and its full analysis shows up here.');
    var c = 0, w = 0; Object.keys(a.secs).forEach(function (k) { c += a.secs[k].c; w += a.secs[k].w; });
    var pq = E.perQ(a);
    return picker() + head(a) +
      '<div class="stats">' + stat('Score', U.n2(a.sc) + ' / ' + U.n2(a.max)) + stat('Accuracy', U.pct(c, c + w) + '%', c + ' of ' + (c + w) + ' attempted') + stat('Attempted', (c + w) + ' / ' + a.det.length) +
      stat('Negative marks', '−' + U.n2(w * (a.neg || 0)), w + ' wrong × ' + (a.neg || 0)) + stat('Avg time / Q', Math.round(a.used / a.det.length) + 's', a.total ? 'pace target ' + Math.round(a.total / a.det.length) + 's' : '') + stat('Time taken', U.fmt(a.used)) +
      ((a.fsx || a.tabx) ? stat('Focus lapses', '⚠️ ' + ((a.fsx || 0) + (a.tabx || 0)), (a.fsx || 0) + ' full-screen exits · ' + (a.tabx || 0) + ' tab switches') : '') + '</div>' +
      '<div class="row" style="margin-bottom:12px"><button class="btn" data-act="rcard" data-v="' + a.id + '">🪪 Result card</button>' + (a.full ? '<button class="btn g" data-act="exportq" data-v="' + a.id + '">⬇ Export CSV</button>' : '') + '</div>' +
      sec('Strength radar') + card('', K.radar(a.secs) + legendCodes()) +
      sec('Question map') + '<div class="strip">' + a.det.map(function (d, i) { return '<span style="background:' + (d.r === 'c' ? '#10b981' : d.r === 'w' ? '#ef4444' : '#6b7280') + '" title="' + esc(d.s) + '">' + (i + 1) + '</span>'; }).join('') + '</div>' +
      confBlock(a.conf || {}) +
      sec('Topic-wise (this test)') + Object.keys(a.secs).sort(function (x, y) { return C.TOPICS.indexOf(x) - C.TOPICS.indexOf(y); }).map(function (k) { return trow(k, a.secs[k]); }).join('');
  };

  /* ================= 📈 OVERALL ================= */
  function shiftBlock() {
    var D = CK.D, full = D.att.filter(function (a) { return a.sid && a.mode === 'full' && a.kind === 'test'; });
    if (!full.length) return '';
    var byShift = {}, rows = '';
    full.forEach(function (a) { var s = C.sessionById(a.sid); if (!s) return; var x = byShift[s.shift] || (byShift[s.shift] = { n: 0, p: 0, acc: 0 }); var p = a.sc / a.max * 100, c = 0, w = 0; Object.keys(a.secs).forEach(function (k) { c += a.secs[k].c; w += a.secs[k].w; }); x.n++; x.p += p; x.acc += U.pct(c, c + w); });
    var latest = {}; full.forEach(function (a) { latest[a.sid] = a; });
    Object.keys(latest).sort().reverse().forEach(function (sid) {
      var a = latest[sid], s = C.sessionById(sid), p = a.sc / a.max * 100, c = 0, w = 0; Object.keys(a.secs).forEach(function (k) { c += a.secs[k].c; w += a.secs[k].w; });
      var vs = '';
      if (s && s.avg != null) { var d = p - s.avg / (s.rules && s.rules.max || R.questions) * 100; vs = '<span class="pill" style="color:' + (d >= 0 ? '#10b981' : '#ef4444') + '">' + U.sgn(d, 1) + '% vs avg</span>'; }
      rows += '<div class="line"><span>' + esc(s ? U.sessLabel(s) : sid) + '<small>' + Math.round(p) + '% score · ' + U.pct(c, c + w) + '% accuracy · ' + Math.round(a.used / a.det.length) + 's/Q</small></span>' + vs + '<b style="color:' + U.tone(p) + '">' + Math.round(p) + '%</b></div>';
    });
    var cols = Object.keys(byShift).sort().map(function (k) { var x = byShift[k], p = Math.round(x.p / x.n); return '<div class="shcol"><b style="color:' + U.tone(p) + '">' + p + '%</b>' + bar(p) + '<span class="mu">Shift ' + k + ' · ' + x.n + ' test' + (x.n > 1 ? 's' : '') + '</span></div>'; }).join('');
    return sec('Compare shifts') + card('', '<div class="shgrid">' + cols + '</div>' + rows +
      '<p class="mu" style="margin-top:8px">Difficulty differs between shifts. Add <code>avg</code> (cohort average marks) to a session in <code>manifest.js</code> to see “vs average”. Estimates only — official normalisation data is not used.</p>');
  }
  A.overall = function () {
    var D = CK.D, g = E.aggTopics(D.att), c = 0, w = 0, t = 0, best = 0, sum = 0, s = E.streak(D.days), bs = E.bestStreak(D.days);
    Object.keys(g).forEach(function (k) { c += g[k].c; w += g[k].w; });
    D.att.forEach(function (a) { var p = a.sc / a.max * 100; sum += p; if (p > best) best = p; t += a.used; });
    var h = '<div class="stats">' + stat('Tests taken', D.att.length) + stat('Avg score', D.att.length ? Math.round(sum / D.att.length) + '%' : '–') + stat('Best score', D.att.length ? Math.round(best) + '%' : '–') + stat('Accuracy', D.att.length ? U.pct(c, c + w) + '%' : '–') +
      stat('Study streak', '🔥 ' + s + 'd') + stat('Best streak', '🏆 ' + bs + 'd') + '</div>' + sec('Daily practice heat-map') + card('', K.heat(D.days));
    if (!D.att.length) return h + empty('📈', 'No test data yet', 'Radar, trends and shift comparisons appear after your first test.');
    var weak = E.weakFirst(g).slice(0, 3);
    return h + sec('Score trend · last 12 tests') + card('', K.spark(D.att.slice(-12).map(function (a) { return a.sc / a.max * 100; }))) +
      sec('Strength radar · all tests') + card('', K.radar(g) + legendCodes()) + sec('Accuracy by topic') + card('', K.bars(g)) +
      shiftBlock() + confBlock(E.aggConf(D.att)) +
      sec('Focus on these topics') + weak.map(function (k) { return trow(k, g[k], true); }).join('') +
      sec('Recent tests') + D.att.slice(-6).reverse().map(function (a) { return '<div class="line"><span>' + esc(a.label || a.src) + '<small>' + new Date(a.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '</small></span><b>' + U.n2(a.sc) + '/' + U.n2(a.max) + '</b></div>'; }).join('') +
      '<div class="mu" style="margin-top:6px">Total practice time: ' + Math.round(t / 60) + ' min</div>';
  };

  /* ================= 🧭 STRATEGY ================= */
  A.strategy = function () {
    var a = A.cur(); if (!a) return empty('🧭', 'No test yet', 'Finish a test to see how your attempt strategy affected your marks.');
    var st = E.strategy(a), mx = Math.max.apply(null, st.rows.map(function (r) { return Math.abs(r.v); })) || 1, neg = a.neg || 0, pq = E.perQ(a), be = Math.round(neg / (pq + neg) * 100);
    var rows = st.rows.map(function (r) {
      var d = r.v - st.actual, w = Math.max(3, Math.abs(r.v) / mx * 100);
      return '<div class="srow' + (st.best && r.id === st.best.id && st.best.v > st.actual ? ' best' : '') + '"><div class="line" style="padding:0"><b>' + r.n + '</b><b>' + U.n2(r.v) + '</b></div><div class="bar" style="margin:6px 0 4px"><i style="width:' + w + '%;background:' + r.c + '"></i></div>' +
        '<div class="line" style="padding:0"><span class="mu">' + r.d + '</span>' + (r.id === 'actual' ? '' : '<span style="font-weight:800;color:' + (d > 0 ? '#10b981' : d < 0 ? '#ef4444' : 'var(--mu)') + '">' + (d === 0 ? '±0' : U.sgn(d)) + '</span>') + '</div></div>';
    }).join('');
    var verdict;
    if (!st.flagged) verdict = '<p>🏷️ You did not use the confidence flags in this test, so the guess-based strategies are the same as your real score. Mark each answer 🟢 Sure / 🟡 Guess / 🔴 Confused next time to unlock them.</p>';
    else if (st.best && st.best.v > st.actual + 0.001) verdict = '<p>💡 Best hindsight strategy: <b>' + st.best.n + '</b> — it would have raised your score by <b>' + U.sgn(st.best.v - st.actual) + '</b> marks (' + U.n2(st.actual) + ' → ' + U.n2(st.best.v) + ').</p>';
    else verdict = '<p>✅ None of the “skip” strategies beat your real attempt — your risk-taking paid off in this paper.</p>';
    var g = st.guess, gtxt = (g.c + g.w) ? '<p style="margin-top:8px">🟡 Your guesses: <b>' + g.c + ' right</b> · <b>' + g.w + ' wrong</b> → net <b style="color:' + (g.v >= 0 ? '#10b981' : '#ef4444') + '">' + U.sgn(g.v) + '</b> marks.</p>' : '';
    return picker() + head(a) + sec('Attempt-strategy score') + card('', '<p class="mu" style="margin-bottom:10px">What your marks would have been under different attempt strategies (hindsight, same answers).</p>' + rows) +
      card('Reading it', verdict + gtxt + '<p class="mu" style="margin-top:8px">With ' + pq + ' mark per right answer and −' + neg + ' per wrong one, a pure guess breaks even only when you are at least <b style="color:var(--tx)">' + be + '%</b> sure it is right. Eliminate two options and it is clearly worth it.</p>') +
      sec('Overall guess ROI') + card('', overallGuess());
  };
  function overallGuess() {
    var D = CK.D, t = { c: 0, w: 0, v: 0 }, cf = { c: 0, w: 0, v: 0 }, sure = { c: 0, w: 0 };
    D.att.forEach(function (a) { var neg = a.neg || 0, pq = E.perQ(a); a.det.forEach(function (d) { var m = E.marksOf(d, neg, pq); if (d.r === 'n') return; if (d.f === 'g') { t.v += m; d.r === 'c' ? t.c++ : t.w++; } if (d.f === 'c') { cf.v += m; d.r === 'c' ? cf.c++ : cf.w++; } if (d.f === 's') { d.r === 'c' ? sure.c++ : sure.w++; } }); });
    if (!(t.c + t.w + cf.c + cf.w + sure.c + sure.w)) return '<p class="mu">Use the 🟢 / 🟡 / 🔴 flags during tests and your long-term guessing record appears here.</p>';
    return '<div class="mtx"><b></b><b>Right</b><b>Wrong</b><b>Net marks</b>' +
      '<span class="l">🟢 Sure</span><span style="color:#10b981">' + sure.c + '</span><span style="color:#ef4444">' + sure.w + '</span><span>' + U.pct(sure.c, sure.c + sure.w) + '%</span>' +
      '<span class="l">🟡 Guess</span><span style="color:#10b981">' + t.c + '</span><span style="color:#ef4444">' + t.w + '</span><span style="color:' + (t.v >= 0 ? '#10b981' : '#ef4444') + '">' + U.sgn(t.v) + '</span>' +
      '<span class="l">🔴 Confused</span><span style="color:#10b981">' + cf.c + '</span><span style="color:#ef4444">' + cf.w + '</span><span style="color:' + (cf.v >= 0 ? '#10b981' : '#ef4444') + '">' + U.sgn(cf.v) + '</span></div>';
  }

  /* ================= ⏱ PACE ================= */
  A.pace = function () {
    var a = A.cur(); if (!a) return empty('⏱', 'No test yet', 'Finish a test to see where your time went.');
    var S = CK.S, B = E.blocks(a), n = a.det.length, avg = E.avgTime(a), ids = function (fn) { return a.det.map(function (d, i) { return fn(d) ? i + 1 : 0; }).filter(Boolean); };
    var slowW = ids(function (d) { return d.r === 'w' && d.t >= 1.5 * avg; }), fastW = ids(function (d) { return d.r === 'w' && d.t <= .5 * avg; }), slowR = ids(function (d) { return d.r === 'c' && d.t >= 1.5 * avg; });
    var worst = B.blocks.slice().sort(function (x, y) { return (y.t - y.ideal) - (x.t - x.ideal); })[0], over = worst && worst.t > worst.ideal * 1.15;
    var last = B.blocks[B.blocks.length - 1], ahead = last.cum <= last.icum;
    var scopeAll = S.qscope === 'all', pts = E.quadrant(scopeAll ? CK.D.att : [a]);
    var quadList = Object.keys(E.QUAD).map(function (q) {
      var m = pts.filter(function (p) { return p.quad === q; }); if (!m.length) return '';
      return '<div class="qrow"><b style="color:' + E.QUAD[q].c + '">' + E.QUAD[q].i + ' ' + E.QUAD[q].n + '</b><span class="mu">' + E.QUAD[q].d + '</span><div class="tgrid" style="margin-top:6px">' + m.map(function (p) { return '<span class="tag" style="--tc:' + U.col(p.k) + '">' + esc(p.k) + ' · ' + p.y + '% · ' + Math.round(p.tt) + 's</span>'; }).join('') + '</div></div>';
    }).join('');
    var tm = {}; a.det.forEach(function (d) { var x = tm[d.s] || (tm[d.s] = { t: 0, n: 0 }); x.t += d.t; x.n++; });
    var ks = Object.keys(tm).sort(function (x, y) { return C.TOPICS.indexOf(x) - C.TOPICS.indexOf(y); }), mx = Math.max.apply(null, ks.map(function (k) { return tm[k].t / tm[k].n; })) || 1;
    return picker() + head(a) + sec('Time-split timeline') +
      card('Time per block of ' + B.bs + ' questions', K.timeline(B) + '<p class="mu" style="margin-top:8px">' + (over ? '🐌 Biggest overrun: Q' + worst.from + '–' + worst.to + ' took ' + U.dur(worst.t) + ' vs ' + U.dur(worst.ideal) + ' ideal' + (worst.acc != null ? ' (accuracy ' + worst.acc + '%)' : '') + '. ' : '✅ No block ran far over pace. ') + 'Questions are plotted in paper order, not in the order you visited them.</p>') +
      card('Cumulative clock vs ideal pace', K.cumulative(B) + '<p class="mu" style="margin-top:6px">' + (ahead ? '🟢 You finished ' + U.dur(last.icum - last.cum) + ' ahead of the ideal line.' : '🔴 You finished ' + U.dur(last.cum - last.icum) + ' behind the ideal line.') + '</p>') +
      sec('Accuracy vs speed') + '<div class="chips sm" style="margin-bottom:8px"><button class="chip ' + (!scopeAll ? 'on' : '') + '" data-act="qscope" data-v="one">This test</button><button class="chip ' + (scopeAll ? 'on' : '') + '" data-act="qscope" data-v="all">All tests</button></div>' +
      (pts.length ? card('', K.quadrant(pts) + '<p class="mu" style="margin-top:6px">Dot size = number of questions. Lines: ideal pace (1×) and 70% accuracy.</p>') + quadList : empty('🎯', 'Not enough data', 'Attempt a few questions per topic to place them on the quadrant.')) +
      sec('Time per question') + card('', '<p class="mu">Average <b style="color:var(--tx)">' + avg.toFixed(0) + 's</b> per question' + (a.total ? ' · exam pace ' + Math.round(a.total / n) + 's' : '') + '</p>' +
        '<div class="line" style="padding-bottom:0"><b>🐢 Slow &amp; wrong</b></div><span class="mu">Took 1.5× the average and still missed — likely concept gaps.</span>' + nums(slowW, '#ef4444') +
        '<div class="line" style="padding-bottom:0"><b>⚡ Fast &amp; wrong</b></div><span class="mu">Under half the average — rushed or guessed.</span>' + nums(fastW, '#f59e0b') +
        '<div class="line" style="padding-bottom:0"><b>🐌 Slow but right</b></div><span class="mu">Correct, but costly — practise for speed.</span>' + nums(slowR, '#3b82f6')) +
      card('Average time by topic', ks.map(function (k) { var v = tm[k].t / tm[k].n; return '<div class="line" style="padding:6px 0 0"><span><i class="dotc" style="background:' + U.col(k) + '"></i>' + esc(C.CODE[k]) + '</span><b>' + v.toFixed(0) + 's</b></div><div class="bar" style="margin:4px 0 2px"><i style="width:' + Math.round(v / mx * 100) + '%;background:' + U.col(k) + '"></i></div>'; }).join(''));
  };

  /* ================= 🎯 CUT-OFF SIMULATOR ================= */
  function simGroups(a) {
    var S = CK.S, gs = E.groupStats(a);
    if (!S.sim.g || S.sim.aid !== a.id) {
      S.sim.aid = a.id; S.sim.g = {};
      gs.forEach(function (g) { S.sim.g[g.id] = { att: g.q ? Math.round((g.c + g.wr) / g.q * 100) : 0, acc: (g.c + g.wr) ? Math.round(g.c / (g.c + g.wr) * 100) : 0 }; });
    }
    return gs;
  }
  function simCalc(a) {
    var S = CK.S, gs = simGroups(a), neg = a.neg || 0, pq = E.perQ(a), tot = 0, max = 0, rows = [], totN = 0, totAtt = 0;
    gs.forEach(function (g) {
      var N = S.sim.full ? (g.w || g.q) : g.q, sv = S.sim.g[g.id] || { att: 0, acc: 0 }, m = E.marksFor(N, sv.att / 100, sv.acc / 100, neg, pq);
      tot += m; max += N * pq; totN += N; totAtt += N * sv.att / 100;
      rows.push({ g: g, N: N, m: m, att: sv.att, acc: sv.acc, lever: N * sv.att / 100 * 0.10 * (pq + neg) });
    });
    return { rows: rows, tot: tot, max: max, N: totN, attRate: totN ? totAtt / totN : 0, neg: neg, pq: pq };
  }
  function simOut(a) {
    var S = CK.S, r = simCalc(a), target = S.sim.target / 100 * r.max, d = r.tot - target, band = r.max * .05;
    var zone = d >= band ? ['safe', '✅ Safe zone', '#10b981'] : d >= -band ? ['risky', '⚠️ Borderline', '#f59e0b'] : ['below', '🔴 Below cut-off', '#ef4444'];
    var lever = r.rows.slice().sort(function (x, y) { return y.lever - x.lever; })[0];
    var tbl = [1, .9, .8, .7].map(function (ar) { var need = E.needAcc(r.N, target, ar, r.neg, r.pq), ok = need <= 1; return '<div class="line" style="padding:6px 0"><span>Attempt <b>' + Math.round(ar * 100) + '%</b> of the paper (' + Math.round(r.N * ar) + ' Q)</span><b style="color:' + (ok ? (need < .8 ? '#10b981' : '#f59e0b') : '#ef4444') + '">' + (ok ? Math.round(need * 100) + '% accuracy' : 'not reachable') + '</b></div>'; }).join('');
    return '<div class="gauge">' + K.gauge(r.tot, target, r.max) + '<div class="gv"><b>' + U.n2(r.tot) + '</b><small>projected / ' + U.n2(r.max) + '</small></div></div>' +
      '<div class="zone" style="--zc:' + zone[2] + '">' + zone[1] + ' · ' + U.sgn(d) + ' marks vs cut-off ' + U.n2(target) + '</div>' +
      sec('Section-wise marks') + r.rows.map(function (x) { var p = Math.round(Math.max(0, x.m) / (x.N * r.pq) * 100); return '<div class="srow"><div class="line" style="padding:0"><b>' + esc(x.g.n) + '</b><b>' + U.n2(x.m) + ' / ' + U.n2(x.N * r.pq) + '</b></div>' + bar(p, 'var(--a)') + '<span class="mu">' + x.att + '% attempted · ' + x.acc + '% accurate</span></div>'; }).join('') +
      (lever ? '<p style="margin-top:10px">🚀 Biggest lever: +10% accuracy in <b>' + esc(lever.g.n) + '</b> adds about <b>' + U.sgn(lever.lever) + '</b> marks.</p>' : '') +
      sec('What you need to clear ' + U.n2(target)) + card('', tbl + '<p class="mu" style="margin-top:6px">Accuracy needed overall, with −' + r.neg + ' per wrong answer.</p>');
  }
  A.simOut = function () { var a = A.cur(), el = U.$('#simOut'); if (a && el) el.innerHTML = simOut(a); };
  A.cutoff = function () {
    var a = A.cur(); if (!a) return empty('🎯', 'No test yet', 'Finish a test, then play “what if” with the cut-off.');
    var S = CK.S, gs = simGroups(a), sv = S.sim;
    var sl = function (id, key, label, val) { return '<label class="slr"><span>' + label + '</span><input type="range" min="0" max="100" step="1" value="' + val + '" data-sim="' + id + ':' + key + '"><b id="sv-' + id + '-' + key + '">' + val + '%</b></label>'; };
    return picker() + head(a) + sec('Section-wise cut-off simulator') +
      card('', '<label class="slr" style="margin-bottom:6px"><span><b>Target cut-off</b></span><input type="range" min="30" max="95" step="1" value="' + sv.target + '" data-sim="target"><b id="sv-target">' + sv.target + '%</b></label>' +
        '<div class="line"><span>Project to the full 100-question paper<small>Uses the real 30 / 30 / 40 section split and your attempt rates</small></span><button class="sw ' + (sv.full ? 'on' : '') + '" role="switch" aria-checked="' + !!sv.full + '" data-act="simfull"><i></i></button></div>') +
      card('Play “what if” — drag to change a section', gs.map(function (g) {
        var v = sv.g[g.id] || { att: 0, acc: 0 };
        return '<div class="simg"><b>' + esc(g.n) + '</b><span class="mu"> · ' + g.q + ' Q in this test</span>' + sl(g.id, 'att', 'Attempt', v.att) + sl(g.id, 'acc', 'Accuracy', v.acc) + '</div>';
      }).join('') + '<button class="btn g s" data-act="simreset">↺ Reset to my real result</button>') +
      '<div id="simOut">' + simOut(a) + '</div>';
  };

  /* ================= 🧩 MISTAKES ================= */
  A.tagRow = function (aid, qi, cur, sug) {
    return '<div class="tags">' + C.TAGS.map(function (t) {
      var on = cur === t.id, hint = !cur && sug === t.id;
      return '<button class="tg' + (on ? ' on' : '') + (hint ? ' hint' : '') + '" style="--tc:' + t.c + '" data-act="tag" data-v="' + aid + '|' + qi + '|' + t.id + '" title="' + esc(t.d) + '">' + t.i + ' ' + t.n + (hint ? ' ✨' : '') + '</button>';
    }).join('') + '</div>';
  };
  A.mistakes = function () {
    var D = CK.D, S = CK.S, a = A.cur(); if (!a) return empty('🧩', 'No test yet', 'Finish a test, then tag why each mistake happened.');
    var all = S.mscope === 'all', list = all ? D.att : [a], sm = E.mistakeSummary(list);
    var rows = C.TAGS.map(function (t) {
      var v = sm.by[t.id]; if (!v.n) return '';
      var tp = Object.keys(sm.topics[t.id]).sort(function (x, y) { return sm.topics[t.id][y] - sm.topics[t.id][x]; }).slice(0, 3);
      return '<div class="mrow" style="--tc:' + t.c + '"><div class="line" style="padding:0"><b>' + t.i + ' ' + t.n + '</b><b>' + v.n + ' <span class="mu" style="font-weight:600">(' + U.pct(v.n, sm.total) + '%)</span></b></div><span class="mu">' + t.d + (v.auto ? ' · ' + v.auto + ' auto-detected' : '') + '</span>' +
        (tp.length ? '<div class="tgrid" style="margin-top:6px">' + tp.map(function (k) { return '<span class="tag" style="--tc:' + U.col(k) + '">' + esc(k) + ' ×' + sm.topics[t.id][k] + '</span>'; }).join('') + '</div>' : '') + '</div>';
    }).join('');
    var top = C.TAGS.slice().sort(function (x, y) { return sm.by[y.id].n - sm.by[x.id].n; })[0], lost = sm.total * (E.perQ(a) + (a.neg || 0));
    var tips = { concept: 'Go back to the notes for these topics before attempting more mocks.', recall: 'Add these questions to your revision notebook — spaced repetition is built for this.', silly: 'Slow down by 5 seconds and re-read the options before you tap.', misread: 'Underline negations (NOT, EXCEPT, INCORRECT) while you read.', time: 'Work on pace: use the Pace tab and skip-and-return more aggressively.', guess: 'Only guess after eliminating at least two options.' };
    var wrongs = a.det.map(function (d, i) { return d.r === 'w' ? i : -1; }).filter(function (i) { return i >= 0; });
    var tagger = wrongs.length ? card('Tag your mistakes · ' + esc(a.label || a.src), '<p class="mu" style="margin-bottom:8px">✨ = suggested from your timing and confidence flags. Tap to confirm or choose another.</p>' + wrongs.map(function (i) {
      var q = a.full && a.full[i], tg = a.tags && a.tags[i];
      return '<div class="mq"><div class="mu">Q' + (i + 1) + ' · <span style="color:' + U.col(a.det[i].s) + '">' + esc(a.det[i].s) + '</span> · ⏱ ' + a.det[i].t + 's</div>' + (q ? '<div class="mqt">' + esc(U.strip(q.q)).slice(0, 140) + '</div>' : '') + A.tagRow(a.id, i, tg, E.autoTag(a, i)) + '</div>';
    }).join('')) : '';
    return picker() + '<div class="chips sm" style="margin-bottom:10px"><button class="chip ' + (!all ? 'on' : '') + '" data-act="mscope" data-v="one">This test</button><button class="chip ' + (all ? 'on' : '') + '" data-act="mscope" data-v="all">All tests</button></div>' +
      (!sm.total ? empty('🎉', 'No mistakes to analyse', 'Every attempted answer was right — or you skipped the rest.') :
        sec('Mistake taxonomy') + card('', '<div class="donutrow">' + K.donut(C.TAGS.map(function (t) { return { v: sm.by[t.id].n, c: t.c, l: t.n }; }), sm.total, 'mistakes') + '<div class="dlg">' + C.TAGS.filter(function (t) { return sm.by[t.id].n; }).map(function (t) { return '<span><i style="background:' + t.c + '"></i>' + t.n + '</span>'; }).join('') + '</div></div>' +
          '<p style="margin-top:8px">These wrong answers cost you about <b>' + U.n2(lost) + '</b> marks (missed mark + negative). ' + sm.tagged + ' of ' + sm.total + ' tagged by you; the rest are auto-detected estimates.</p>') +
        card('', rows) + (top && sm.by[top.id].n ? card('Fix first: ' + top.i + ' ' + top.n, '<p>' + tips[top.id] + '</p>') : '')) + tagger;
  };

  /* ================= 📚 TOPICS ================= */
  A.topics = function () {
    var D = CK.D; if (!D.att.length) return empty('📚', 'No topic data', 'Take a test and all ' + C.TOPICS.length + ' topics will be ranked here, weakest first.');
    var g = E.aggTopics(D.att), done = E.weakFirst(g), un = C.TOPICS.filter(function (k) { return !g[k]; });
    return card('', K.bars(g)) + '<p class="mu" style="margin-bottom:10px">Weakest topics first — tap Practise to drill one.</p>' + done.map(function (k) { return trow(k, g[k], true); }).join('') +
      (un.length ? sec('Not attempted yet (' + un.length + ')') + '<div class="tgrid">' + un.map(function (k) { return '<button class="chip" style="--tc:' + U.col(k) + '" data-act="ptopic" data-v="' + esc(k) + '">' + C.ICON[k] + ' ' + esc(k) + '</button>'; }).join('') + '</div>' : '');
  };

  /* ================= 🔁 REVISION 1-3-7-14 ================= */
  A.savedList = function () {
    var D = CK.D, S = CK.S;
    return Object.keys(D.sav).map(function (k) { return D.sav[k]; }).filter(function (e) { return S.sf === 'all' || (S.sf === 'b' && e.b) || (S.sf === 'w' && e.w) || (S.sf === 'd' && E.isDue(e)); })
      .sort(function (x, y) { return (x.due || 0) - (y.due || 0); });
  };
  A.dueText = function (e) { var d = Math.round(((e.due || 0) - U.today0()) / U.DAY); return d <= 0 ? 'Due today' : 'Review in ' + d + 'd'; };
  A.revise = function () {
    var D = CK.D, S = CK.S, all = Object.keys(D.sav).length, l = A.savedList(), dueN = Object.keys(D.sav).filter(function (k) { return E.isDue(D.sav[k]); }).length;
    var boxes = E.INT.map(function (d, i) { var m = Object.keys(D.sav).map(function (k) { return D.sav[k]; }).filter(function (e) { return e.w && (e.box || 1) === i + 1; }); return { d: d, n: m.length, due: m.filter(E.isDue).length }; });
    var ladder = '<div class="ladder">' + boxes.map(function (b, i) { return '<div class="rung" style="--i:' + i + '"><b>' + b.n + '</b><span>' + b.d + (b.d === 1 ? ' day' : ' days') + '</span>' + (b.due ? '<em>' + b.due + ' due</em>' : '') + '</div>'; }).join('<span class="arr">→</span>') + '<span class="arr">→</span><div class="rung done"><b>🎓</b><span>mastered</span></div></div>';
    var h = card('Revision ladder · 1 → 3 → 7 → 14 days', ladder + '<p class="mu" style="margin-top:8px">A wrong answer comes back after 1 day. Get it right and it moves up the ladder; get it wrong and it drops back to day 1. Right at the 14-day step = mastered.</p>') +
      '<div class="chips sm">' + [['all', 'All (' + all + ')'], ['d', '🔁 Due today (' + dueN + ')'], ['w', '❌ Wrong notebook'], ['b', '🔖 Bookmarked']].map(function (x) { return '<button class="chip ' + (S.sf === x[0] ? 'on' : '') + '" data-act="sfil" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (!l.length) return h + empty('🔖', 'Nothing here', S.sf === 'd' ? 'No revision due today. Nice work! 🎉' : 'Tap 🔖 Save during a test. Wrong answers are saved automatically.');
    return h + '<button class="btn rev" data-act="practice" style="width:100%;margin-bottom:12px">▶ Practise these (' + l.length + ')</button>' + l.map(function (e) {
      return '<div class="card"><div class="line" style="padding:0 0 6px"><span><span class="tag" style="--tc:' + U.col(e.s) + '">' + esc(e.s) + (e.c ? ' · ' + esc(e.c) : '') + '</span> ' + (e.w ? '<span class="tag" style="color:#ef4444">box ' + (e.box || 1) + ' · ' + A.dueText(e) + '</span>' : '') + '</span><button class="btn g s" data-act="delsav" data-v="' + esc(e.k) + '" aria-label="Remove">🗑</button></div><b class="qt">' + e.q + '</b>' +
        '<div class="opt ok" style="margin-top:10px"><i class="bub">' + 'ABCD'.charAt(e.a) + '</i><span>' + e.o[e.a] + '</span></div>' + (e.e ? '<div class="expl">💡 ' + e.e + '</div>' : '') + '<span class="mu">' + esc(e.src) + '</span></div>';
    }).join('');
  };

  /* ================= ⚙ SETTINGS ================= */
  function sw(on, act, v) { return '<button class="sw ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + !!on + '" data-act="' + act + '" data-v="' + esc(v || '') + '"><i></i></button>'; }
  A.sw = sw;
  function row(l, d, c) { return '<div class="line"><span>' + l + (d ? '<small>' + d + '</small>' : '') + '</span>' + c + '</div>'; }
  A.settings = function () {
    var D = CK.D, SET = D.set, root = document.documentElement, kb = Math.round(CK.store.bytes(['att', 'sav', 'days', 'seen']) / 1024 * 10) / 10;
    var pals = [['midnight', 'Midnight', '#6d7bff', '#ffb547'], ['lagoon', 'Lagoon', '#19c3d4', '#5b8cff'], ['sunrise', 'Sunrise', '#ff8a4c', '#ff4f7b'], ['grove', 'Grove', '#2fcf94', '#c8e04a'], ['orchid', 'Orchid', '#ef5da8', '#9b7bff']];
    var ex = SET.exam || {};
    return sec('Appearance') + card('', row('Dark mode', '', sw(root.dataset.theme === 'dark', 'theme')) +
      '<div class="line"><span>Colour palette<small>Accent colours for the whole app</small></span></div><div class="pals">' + pals.map(function (p) { return '<button class="pal ' + (root.dataset.pal === p[0] ? 'on' : '') + '" data-act="pick" data-v="' + p[0] + '" style="background:linear-gradient(135deg,' + p[2] + ',' + p[3] + ')" aria-label="' + p[1] + '"><span>' + p[1] + '</span></button>'; }).join('') + '</div>' +
      '<div class="line"><span>Text size</span><span class="row">' + ['A−', 'A', 'A+'].map(function (l, i) { return '<button class="chip ' + (SET.font === i ? 'on' : '') + '" style="padding:6px 14px" data-act="font" data-v="' + i + '">' + l + '</button>'; }).join('') + '</span></div>' +
      row('Motion & effects', 'Turn off to save battery', sw(SET.motion, 'tg', 'motion'))) +
      sec('Goals & exam') + card('', row('Daily goal', 'Questions per day', '<input type="number" data-set="dailyGoal" min="5" max="500" value="' + SET.dailyGoal + '">') +
        row('Target cut-off', '% of maximum — used by the cut-off simulator & result card', '<input type="number" data-set="cutoff" min="30" max="95" value="' + SET.cutoff + '">') +
        row('Exam name', '', '<input type="text" data-set="examName" value="' + esc(ex.name || '') + '" placeholder="WBPSC Clerkship 2027" style="width:150px">') +
        row('Exam date', 'Shows a countdown on the dashboard', '<input type="date" data-set="examDate" value="' + esc(ex.date || '') + '">')) +
      sec('Test experience') + card('', row('Rough pad &amp; calculator', 'Buttons in the test dock', sw(SET.tools, 'tg', 'tools')) + row('Full-screen exam mode', 'Full-paper exam tests only', sw(SET.fullscreen, 'tg', 'fullscreen')) +
        row('Show timer', 'Hide it to reduce pressure', sw(SET.showTimer, 'tg', 'showTimer')) + row('Auto-next on answer', 'Jump ahead after choosing', sw(SET.autoNext, 'tg', 'autoNext')) +
        row('Shuffle questions', 'Within each topic', sw(SET.shuffleQ, 'tg', 'shuffleQ')) + row('Shuffle options', 'Stops memorising positions', sw(SET.shuffleO, 'tg', 'shuffleO')) +
        row('Confirm before submit', '', sw(SET.confirmSubmit, 'tg', 'confirmSubmit')) + row('Auto-save wrong answers', 'Feeds the 1-3-7-14 revision ladder', sw(SET.autoWrong, 'tg', 'autoWrong')) +
        row('Haptic feedback', 'Light vibration on taps', sw(SET.haptic, 'tg', 'haptic')) + row('Keep screen awake', 'During tests', sw(SET.wake, 'tg', 'wake')) +
        row('Default chapter-test time', 'Minutes', '<input type="number" data-set="defMins" min="1" max="180" value="' + SET.defMins + '">') + row('Negative marking by default', 'For chapter-wise tests', sw(SET.defNeg, 'tg', 'defNeg'))) +
      sec('Help') + card('', '<button class="btn g s" data-act="tour">▶ Replay the app tour</button><p class="mu" style="margin-top:10px">Keyboard: <b>1–4</b> choose · <b>N</b>/<b>→</b> next · <b>P</b>/<b>←</b> previous · <b>M</b> mark · <b>S</b> save · <b>G</b> palette</p>') +
      sec('Data') + card('', '<p class="mu" style="margin-bottom:10px">Stored on this device (' + (CK.store.mode() === 'idb' ? 'IndexedDB' : 'localStorage fallback') + '): ' + D.att.length + ' tests · ' + Object.keys(D.sav).length + ' saved questions · ' + kb + ' KB</p>' +
        '<div class="row"><button class="btn g s" data-act="export">⬇ Backup</button><button class="btn g s" data-act="import">⬆ Restore</button><button class="btn g s" data-act="wipe" style="color:#ef4444">🗑 Clear data</button></div>') +
      '<p class="mu" style="text-align:center;margin-top:14px">Wise Choice · WBPSC Clerkship PYQ Series</p>';
  };
})();
