/* =====================================================================
   charts.js — dependency-free SVG charts. Every function returns a string.
   Colours come from CSS variables so charts follow dark/light + palette.
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {}, C = CK.cfg, U = CK.u, E = CK.eng;
  var K = CK.charts = {};
  var f1 = function (n) { return (Math.round(n * 10) / 10).toString(); };
  var T = function (x, y, txt, o) {
    o = o || {};
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" font-size="' + (o.s || 9) + '" text-anchor="' + (o.a || 'middle') + '"' + (o.w ? ' font-weight="' + o.w + '"' : '') +
      ' style="fill:' + (o.f || 'var(--mu)') + ';' + (o.halo ? 'paint-order:stroke;stroke:var(--card);stroke-width:3px;stroke-linejoin:round;' : '') + '"' + (o.op ? ' opacity="' + o.op + '"' : '') + '>' + U.esc(txt) + '</text>';
  };
  var svgOpen = function (w, h, label, extra) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;display:block;' + (extra || '') + '" role="img" aria-label="' + U.esc(label) + '">'; };

  /* ---------- progress ring (daily goal etc.) ---------- */
  K.ring = function (p, o) {
    o = o || {}; var s = o.size || 120, sw = o.stroke || 11, r = (s - sw) / 2, cir = 2 * Math.PI * r, v = U.clamp(p, 0, 1), id = 'rg' + Math.floor(Math.random() * 1e6);
    return '<svg viewBox="0 0 ' + s + ' ' + s + '" style="width:' + (o.w || s) + 'px;height:' + (o.w || s) + 'px" role="img" aria-label="' + U.esc(o.label || 'progress') + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:' + (o.c1 || 'var(--a)') + '"/><stop offset="1" style="stop-color:' + (o.c2 || 'var(--b)') + '"/></linearGradient></defs>' +
      '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" style="stroke:var(--bd)" stroke-width="' + sw + '"/>' +
      '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="url(#' + id + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + f1(cir) + '" stroke-dashoffset="' + f1(cir * (1 - v)) + '" transform="rotate(-90 ' + s / 2 + ' ' + s / 2 + ')" style="transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)"/>' +
      (o.big != null ? T(s / 2, s / 2 + (o.sub ? 2 : 6), o.big, { s: o.bs || 24, w: 800, f: 'var(--tx)' }) : '') + (o.sub ? T(s / 2, s / 2 + 17, o.sub, { s: 9.5 }) : '') + '</svg>';
  };

  /* ---------- radar of all topics ---------- */
  K.radar = function (map) {
    var TP = C.TOPICS, N = TP.length, cx = 170, cy = 158, r = 92;
    var pt = function (i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / N; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
    var s = svgOpen(340, 316, 'Radar chart of topic strengths');
    [.25, .5, .75, 1].forEach(function (l) { s += '<polygon points="' + TP.map(function (_, i) { return pt(i, l).map(f1).join(','); }).join(' ') + '" fill="none" style="stroke:var(--bd)" stroke-width="1"' + (l === 1 ? '' : ' stroke-dasharray="2 3"') + '/>'; });
    TP.forEach(function (t, i) {
      var e = pt(i, 1), l = pt(i, 1.2), co = Math.cos(-Math.PI / 2 + 2 * Math.PI * i / N), has = !!(map[t] && map[t].t);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '" style="stroke:var(--bd)"/>' +
        T(l[0], l[1] + 3, C.CODE[t], { s: 9, w: 800, a: co > .3 ? 'start' : co < -.3 ? 'end' : 'middle', f: U.col(t), op: has ? 1 : .35 });
    });
    var vals = TP.map(function (t, i) { var m = map[t]; return pt(i, m && m.t ? U.pct(m.c, m.t) / 100 : 0); });
    s += '<polygon points="' + vals.map(function (p) { return p.map(f1).join(','); }).join(' ') + '" style="fill:var(--a);stroke:var(--a)" fill-opacity=".26" stroke-width="2.2" stroke-linejoin="round"/>';
    vals.forEach(function (p, i) { var m = map[TP[i]]; if (m && m.t) s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="3.6" style="fill:' + U.col(TP[i]) + ';stroke:var(--card)" stroke-width="1.5"><title>' + U.esc(TP[i]) + ': ' + U.pct(m.c, m.t) + '%</title></circle>'; });
    return s + '</svg>';
  };

  /* ---------- horizontal bars by topic ---------- */
  K.bars = function (map, valueFn, fmtFn) {
    var TP = C.TOPICS, rh = 21, s = svgOpen(340, TP.length * rh + 6, 'Accuracy by topic');
    valueFn = valueFn || function (v) { return U.pct(v.c, v.t); }; fmtFn = fmtFn || function (p) { return p + '%'; };
    TP.forEach(function (t, i) {
      var y = i * rh + 3, v = map[t], has = v && v.t, p = has ? valueFn(v) : 0;
      s += '<circle cx="5" cy="' + (y + 8) + '" r="3.5" style="fill:' + U.col(t) + '" opacity="' + (has ? 1 : .35) + '"/>' + T(14, y + 11.5, t, { s: 9.5, a: 'start', f: 'var(--tx)', op: has ? 1 : .45 }) +
        '<rect x="138" y="' + (y + 3) + '" width="160" height="10" rx="5" style="fill:var(--bd)"/>' +
        (has ? '<rect x="138" y="' + (y + 3) + '" width="' + Math.max(5, p * 1.6) + '" height="10" rx="5" style="fill:' + U.tone(p) + '"/>' : '') +
        T(338, y + 11.5, has ? fmtFn(p) : '–', { s: 9.5, a: 'end', w: 700 });
    });
    return s + '</svg>';
  };

  /* ---------- streak heat-map ---------- */
  K.heat = function (days, W) {
    W = W || 20; var cell = 12.5, gap = 2.6, step = cell + gap, today = new Date(); today.setHours(0, 0, 0, 0);
    var start = new Date(today); start.setDate(today.getDate() - ((W - 1) * 7 + today.getDay()));
    var op = [0, .3, .55, .8, 1], mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], lastM = -1, act = 0, tot = 0;
    var s = svgOpen(W * step, 7 * step + 16, 'Daily practice heat-map');
    for (var w = 0; w < W; w++) for (var d = 0; d < 7; d++) {
      var dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d); if (dt > today) continue;
      var rec = days[U.dkey(dt)], q = rec ? rec.q : 0, lv = !q ? 0 : q < 10 ? 1 : q < 30 ? 2 : q < 60 ? 3 : 4, isT = dt.getTime() === today.getTime();
      if (q) { act++; tot += q; }
      if (d === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); s += T(w * step, 9, mn[lastM], { s: 8.5, a: 'start' }); }
      s += '<rect x="' + f1(w * step) + '" y="' + f1(16 + d * step) + '" width="' + cell + '" height="' + cell + '" rx="3.6" style="fill:' + (lv ? 'var(--a)' : 'var(--bd)') + (isT ? ';stroke:var(--tx);stroke-width:1.4' : '') + '" fill-opacity="' + (lv ? op[lv] : .9) + '"><title>' + U.dkey(dt) + ' — ' + q + ' question(s)</title></rect>';
    }
    return s + '</svg><div class="legend"><span style="margin-right:auto">' + act + ' active day' + (act === 1 ? '' : 's') + ' · ' + tot + ' questions in ' + W + ' weeks</span>Less ' +
      op.map(function (o, i) { return '<i style="' + (i ? 'opacity:' + o : 'background:var(--bd)') + '"></i>'; }).join('') + ' More</div>';
  };

  /* ---------- last-7-days bars with the daily goal line ---------- */
  K.week = function (list, goal) {
    var W = 300, H = 92, bw = 26, mx = Math.max(goal * 1.15, Math.max.apply(null, list.map(function (x) { return x.q; })) * 1.1, 1);
    var s = svgOpen(W, H + 18, 'Questions practised in the last 7 days'), dn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], gy = H - goal / mx * (H - 6);
    list.forEach(function (x, i) {
      var cx = 14 + i * ((W - 28) / 6), h = x.q ? Math.max(5, x.q / mx * (H - 6)) : 3, hit = x.q >= goal, isT = i === list.length - 1;
      s += '<rect x="' + f1(cx - bw / 2) + '" y="' + f1(H - h) + '" width="' + bw + '" height="' + f1(h) + '" rx="7" style="fill:' + (x.q ? (hit ? '#10b981' : 'var(--a)') : 'var(--bd)') + '" opacity="' + (x.q ? 1 : .8) + '"><title>' + U.dkey(x.d) + ': ' + x.q + '</title></rect>' +
        T(cx, H + 13, dn[x.d.getDay()], { s: 9.5, w: isT ? 800 : 500, f: isT ? 'var(--tx)' : 'var(--mu)' });
      if (x.q) s += T(cx, H - h - 4, x.q, { s: 8.5, f: 'var(--tx)', w: 700 });
    });
    return s + '<line x1="0" x2="' + W + '" y1="' + f1(gy) + '" y2="' + f1(gy) + '" stroke-dasharray="4 4" style="stroke:var(--b)" stroke-width="1.4"/>' + T(W, gy - 3, 'goal ' + goal, { s: 8, a: 'end', f: 'var(--b)', w: 700 }) + '</svg>';
  };

  /* ---------- trend sparkline ---------- */
  K.spark = function (vals) {
    if (vals.length < 2) return '<p class="mu">Take 2+ tests to see your trend.</p>';
    var W = 300, H = 84, pts = vals.map(function (v, i) { return [8 + i * (W - 16) / (vals.length - 1), H - 8 - U.clamp(v, 0, 100) / 100 * (H - 18)]; });
    var line = pts.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join(' ');
    return svgOpen(W, H, 'Score trend') + '<defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--a);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--a);stop-opacity:0"/></linearGradient></defs>' +
      '<polygon points="8,' + (H - 4) + ' ' + line + ' ' + f1(pts[pts.length - 1][0]) + ',' + (H - 4) + '" fill="url(#spg)"/><polyline points="' + line + '" fill="none" style="stroke:var(--a)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      pts.map(function (p, i) { return '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + (i === pts.length - 1 ? 4.2 : 2.6) + '" style="fill:var(--a);stroke:var(--card)" stroke-width="1.5"><title>' + Math.round(vals[i]) + '%</title></circle>'; }).join('') + '</svg>';
  };

  /* ---------- donut ---------- */
  K.donut = function (slices, centerBig, centerSub) {
    var tot = slices.reduce(function (n, x) { return n + x.v; }, 0), s = svgOpen(150, 150, 'Donut chart', 'max-width:170px;margin:0 auto'), r = 54, cir = 2 * Math.PI * r, off = 0;
    s += '<circle cx="75" cy="75" r="' + r + '" fill="none" style="stroke:var(--bd)" stroke-width="20"/>';
    if (tot) slices.forEach(function (x) {
      if (!x.v) return; var len = x.v / tot * cir;
      s += '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="' + x.c + '" stroke-width="20" stroke-dasharray="' + f1(Math.max(0, len - 1.5)) + ' ' + f1(cir) + '" stroke-dashoffset="' + f1(-off) + '" transform="rotate(-90 75 75)"><title>' + U.esc(x.l) + ': ' + x.v + '</title></circle>'; off += len;
    });
    return s + T(75, 77, centerBig, { s: 24, w: 800, f: 'var(--tx)' }) + T(75, 92, centerSub || '', { s: 8.5 }) + '</svg>';
  };

  /* ---------- ⏱ time-split timeline ---------- */
  K.timeline = function (B) {
    var bl = B.blocks, W = 340, H = 190, ml = 30, mr = 8, mt = 16, mb = 38, pw = W - ml - mr, ph = H - mt - mb;
    var mx = Math.max.apply(null, bl.map(function (b) { return Math.max(b.t, b.ideal); })) * 1.15 || 1, bw = pw / bl.length * .64;
    var X = function (i) { return ml + (i + .5) * pw / bl.length; }, Y = function (v) { return mt + ph - v / mx * ph; };
    var s = svgOpen(W, H, 'Time spent per block of questions versus ideal pace');
    [0, .5, 1].forEach(function (g) { var y = Y(mx * g); s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + f1(y) + '" y2="' + f1(y) + '" style="stroke:var(--bd)" stroke-dasharray="2 4"/>' + T(ml - 4, y + 3, U.dur(mx * g), { s: 8, a: 'end' }); });
    bl.forEach(function (b, i) {
      var col = b.t > b.ideal * 1.15 ? '#ef4444' : b.t < b.ideal * .85 ? '#3b82f6' : '#10b981', y = Y(b.t);
      s += '<rect x="' + f1(X(i) - bw / 2) + '" y="' + f1(y) + '" width="' + f1(bw) + '" height="' + f1(Math.max(2, mt + ph - y)) + '" rx="5" fill="' + col + '" fill-opacity=".85"><title>Q' + b.from + '–' + b.to + ': ' + U.dur(b.t) + ' (ideal ' + U.dur(b.ideal) + ')</title></rect>' +
        T(X(i), H - 24, b.from + '', { s: 8.5, f: 'var(--tx)', w: 700 }) + T(X(i), H - 12, b.acc == null ? '–' : b.acc + '%', { s: 8.5, w: 700, f: b.acc == null ? 'var(--mu)' : U.tone(b.acc) });
    });
    s += '<polyline points="' + bl.map(function (b, i) { return f1(X(i)) + ',' + f1(Y(b.ideal)); }).join(' ') + '" fill="none" style="stroke:var(--tx)" stroke-width="1.6" stroke-dasharray="5 4"/>';
    s += T(ml, H - 2, 'Question # ↑ · accuracy ↑', { s: 7.5, a: 'start' }) + '</svg>';
    return s + '<div class="legend" style="justify-content:flex-start;gap:10px"><span><i style="background:#ef4444"></i> slower than pace</span><span><i style="background:#10b981"></i> on pace</span><span><i style="background:#3b82f6"></i> faster</span><span>┄ ideal</span></div>';
  };
  K.cumulative = function (B) {
    var bl = B.blocks, W = 340, H = 150, ml = 30, mr = 10, mt = 12, mb = 22, pw = W - ml - mr, ph = H - mt - mb, last = bl[bl.length - 1];
    var mx = Math.max(last.cum, last.icum) * 1.08 || 1, X = function (i) { return ml + (i + 1) / bl.length * pw; }, Y = function (v) { return mt + ph - v / mx * ph; };
    var a = bl.map(function (b, i) { return f1(X(i)) + ',' + f1(Y(b.cum)); }), id = bl.map(function (b, i) { return f1(X(i)) + ',' + f1(Y(b.icum)); });
    var s = svgOpen(W, H, 'Cumulative time versus ideal pace');
    [0, .5, 1].forEach(function (g) { var y = Y(mx * g); s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + f1(y) + '" y2="' + f1(y) + '" style="stroke:var(--bd)" stroke-dasharray="2 4"/>' + T(ml - 4, y + 3, U.dur(mx * g), { s: 8, a: 'end' }); });
    s += '<polygon points="' + ml + ',' + f1(Y(0)) + ' ' + a.join(' ') + ' ' + id.slice().reverse().join(' ') + ' ' + ml + ',' + f1(Y(0)) + '" fill="' + (last.cum > last.icum ? '#ef4444' : '#10b981') + '" fill-opacity=".14"/>' +
      '<polyline points="' + ml + ',' + f1(Y(0)) + ' ' + id.join(' ') + '" fill="none" style="stroke:var(--tx)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
      '<polyline points="' + ml + ',' + f1(Y(0)) + ' ' + a.join(' ') + '" fill="none" style="stroke:var(--a)" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>';
    bl.forEach(function (b, i) { if (i % Math.ceil(bl.length / 6) === 0 || i === bl.length - 1) s += T(X(i), H - 8, 'Q' + b.to, { s: 8 }); });
    return s + '</svg>';
  };

  /* ---------- 🎯 accuracy vs speed quadrant ---------- */
  K.quadrant = function (pts) {
    var W = 340, H = 300, ml = 36, mr = 12, mt = 14, mb = 36, pw = W - ml - mr, ph = H - mt - mb, x0 = .2, x1 = 2.2;
    var X = function (v) { return ml + (U.clamp(v, x0, x1) - x0) / (x1 - x0) * pw; }, Y = function (v) { return mt + ph - v / 100 * ph; };
    var qx = X(1), qy = Y(70), s = svgOpen(W, H, 'Accuracy versus speed quadrant by topic');
    s += '<rect x="' + ml + '" y="' + mt + '" width="' + f1(qx - ml) + '" height="' + f1(qy - mt) + '" fill="#10b981" fill-opacity=".10"/>' +
      '<rect x="' + f1(qx) + '" y="' + mt + '" width="' + f1(W - mr - qx) + '" height="' + f1(qy - mt) + '" fill="#3b82f6" fill-opacity=".10"/>' +
      '<rect x="' + ml + '" y="' + f1(qy) + '" width="' + f1(qx - ml) + '" height="' + f1(mt + ph - qy) + '" fill="#f59e0b" fill-opacity=".10"/>' +
      '<rect x="' + f1(qx) + '" y="' + f1(qy) + '" width="' + f1(W - mr - qx) + '" height="' + f1(mt + ph - qy) + '" fill="#ef4444" fill-opacity=".10"/>' +
      '<line x1="' + f1(qx) + '" x2="' + f1(qx) + '" y1="' + mt + '" y2="' + (mt + ph) + '" style="stroke:var(--mu)" stroke-dasharray="4 4"/><line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + f1(qy) + '" y2="' + f1(qy) + '" style="stroke:var(--mu)" stroke-dasharray="4 4"/>' +
      T(ml + 6, mt + 12, '🏆 FAST · ACCURATE', { s: 7.5, a: 'start', w: 800, f: '#10b981' }) + T(W - mr - 6, mt + 12, '🐢 SLOW · ACCURATE', { s: 7.5, a: 'end', w: 800, f: '#3b82f6' }) +
      T(ml + 6, mt + ph - 6, '⚡ FAST · INACCURATE', { s: 7.5, a: 'start', w: 800, f: '#f59e0b' }) + T(W - mr - 6, mt + ph - 6, '🧱 SLOW · INACCURATE', { s: 7.5, a: 'end', w: 800, f: '#ef4444' });
    [0, 35, 70, 100].forEach(function (g) { s += T(ml - 5, Y(g) + 3, g + '%', { s: 8, a: 'end' }); });
    [.5, 1, 1.5, 2].forEach(function (g) { s += T(X(g), H - 20, g + '×', { s: 8 }); });
    s += T(ml + pw / 2, H - 6, 'time per question vs ideal pace  →  slower', { s: 8 });
    pts.forEach(function (p) {
      var r = 6 + Math.min(6, Math.sqrt(p.n) * .9);
      s += '<circle cx="' + f1(X(p.x)) + '" cy="' + f1(Y(p.y)) + '" r="' + f1(r) + '" style="fill:' + U.col(p.k) + ';stroke:var(--card)" stroke-width="2" fill-opacity=".92"><title>' + U.esc(p.k) + ' — ' + p.y + '% accuracy, ' + p.x.toFixed(2) + '× pace</title></circle>' + T(X(p.x), Y(p.y) - r - 3, C.CODE[p.k], { s: 8.5, w: 800, f: 'var(--tx)', halo: 1 });
    });
    return s + '</svg>';
  };

  /* ---------- 🎯 cut-off gauge ---------- */
  K.gauge = function (score, target, max) {
    var W = 300, H = 170, cx = 150, cy = 140, r = 108, P = function (v) { return Math.PI * (1 - U.clamp(v / max, 0, 1)); };
    var xy = function (v, rr) { var a = P(v); return [cx + Math.cos(a) * rr, cy - Math.sin(a) * rr]; };
    var arc = function (a, b, col, sw) { var p0 = xy(a, r), p1 = xy(b, r); return '<path d="M' + f1(p0[0]) + ' ' + f1(p0[1]) + ' A' + r + ' ' + r + ' 0 0 1 ' + f1(p1[0]) + ' ' + f1(p1[1]) + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="butt"/>'; };
    var lo = Math.max(0, target - max * .05), hi = Math.min(max, target + max * .05), s = svgOpen(W, H, 'Score against target cut-off');
    s += arc(0, lo, 'rgba(239,68,68,.55)', 16) + arc(lo, hi, 'rgba(245,158,11,.65)', 16) + arc(hi, max, 'rgba(16,185,129,.6)', 16);
    var t0 = xy(target, r - 14), t1 = xy(target, r + 14), n = xy(Math.max(0, score), r - 6), n0 = [cx, cy];
    s += '<line x1="' + f1(t0[0]) + '" y1="' + f1(t0[1]) + '" x2="' + f1(t1[0]) + '" y2="' + f1(t1[1]) + '" style="stroke:var(--tx)" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(n[0]) + '" y2="' + f1(n[1]) + '" style="stroke:var(--a)" stroke-width="4" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="8" style="fill:var(--a);stroke:var(--card)" stroke-width="3"/>' +
      T(cx - r, cy + 14, '0', { s: 9 }) + T(cx + r, cy + 14, U.n2(max), { s: 9 }) + T(t1[0] + (t1[0] > cx ? 4 : -4), t1[1] - 6, 'cut-off ' + U.n2(target), { s: 8.5, w: 800, f: 'var(--tx)', a: t1[0] > cx ? 'start' : 'end' });
    return s + '</svg>';
  };
})();
