/* =====================================================================
   card.js — shareable Result Card (1080×1350 PNG drawn on a canvas)
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {}, C = CK.cfg, U = CK.u, E = CK.eng;

  function cssv(n, d) { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || d; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, txt, max) { while (c.measureText(txt).width > max && txt.length > 4) txt = txt.slice(0, -2); return txt; }
  function loadImg(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }

  /* build the canvas; `logo` may be null when it could not be loaded safely */
  function draw(a, extra, logo) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), dark = document.documentElement.dataset.theme !== 'light';
    var A = cssv('--a', '#6366f1'), B = cssv('--b', '#f59e0b'), BG = dark ? '#080b1c' : '#f6f2e9', FG = dark ? '#eef0ff' : '#14152b', MU = dark ? '#9aa0c8' : '#6a6e8c', CARD = dark ? '#121734' : '#ffffff', BD = dark ? '#2a3059' : '#e4dfd2';
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    var g = c.createRadialGradient(W * .9, 0, 0, W * .9, 0, 900); g.addColorStop(0, A + '55'); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(0, H * .75, 0, 0, H * .75, 800); g.addColorStop(0, B + '33'); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    /* dotted grid */
    c.fillStyle = dark ? '#ffffff10' : '#14152b0e'; for (var gx = 30; gx < W; gx += 36) for (var gy = 30; gy < H; gy += 36) c.fillRect(gx, gy, 2, 2);

    /* header */
    if (logo) { c.save(); c.beginPath(); c.arc(100, 100, 54, 0, 7); c.clip(); c.drawImage(logo, 46, 46, 108, 108); c.restore(); }
    c.fillStyle = FG; c.font = '800 44px Georgia, serif'; c.textAlign = 'left'; c.fillText('Wise Choice', 176, 98);
    c.fillStyle = MU; c.font = '500 24px system-ui, sans-serif'; c.fillText('Your Shortcut through the Syllabus!', 178, 134);
    c.textAlign = 'right'; c.fillStyle = MU; c.font = '600 24px system-ui, sans-serif'; c.fillText(new Date(a.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), W - 56, 100);

    /* title */
    c.textAlign = 'left'; c.fillStyle = FG; c.font = '800 56px Georgia, serif'; c.fillText(fit(c, a.label || a.src, W - 112), 56, 250);
    c.fillStyle = MU; c.font = '600 28px system-ui, sans-serif'; c.fillText((a.kind === 'quiz' ? 'Instant quiz' : 'Exam test') + ' · ' + a.det.length + ' questions' + (a.total ? ' · ' + U.fmt(a.used) + ' of ' + U.fmt(a.total) : ''), 56, 296);

    /* score ring */
    var p = U.clamp(a.sc / (a.max || 1), 0, 1), cx = 330, cy = 620, r = 190;
    c.lineWidth = 34; c.strokeStyle = BD; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    var lg = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); lg.addColorStop(0, A); lg.addColorStop(1, B);
    c.strokeStyle = lg; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke();
    c.textAlign = 'center'; c.fillStyle = FG; c.font = '800 118px Georgia, serif'; c.fillText(U.n2(a.sc), cx, cy + 28);
    c.fillStyle = MU; c.font = '600 30px system-ui, sans-serif'; c.fillText('out of ' + U.n2(a.max) + ' · ' + Math.round(p * 100) + '%', cx, cy + 78);

    /* stat tiles */
    var cor = 0, wr = 0; Object.keys(a.secs).forEach(function (k) { cor += a.secs[k].c; wr += a.secs[k].w; });
    var tiles = [['Accuracy', U.pct(cor, cor + wr) + '%', U.tone(U.pct(cor, cor + wr))], ['Attempted', (cor + wr) + '/' + a.det.length, FG], ['Negative', '−' + U.n2(wr * (a.neg || 0)), '#ef4444'], ['Avg / Q', Math.round(a.used / a.det.length) + 's', FG]];
    tiles.forEach(function (t, i) {
      var x = 600 + (i % 2) * 220, y = 450 + Math.floor(i / 2) * 150;
      c.fillStyle = CARD; rr(c, x, y, 204, 130, 26); c.fill(); c.strokeStyle = BD; c.lineWidth = 2; c.stroke();
      c.textAlign = 'left'; c.fillStyle = MU; c.font = '600 22px system-ui, sans-serif'; c.fillText(t[0], x + 22, y + 40);
      c.fillStyle = t[2]; c.font = '800 44px system-ui, sans-serif'; c.fillText(t[1], x + 22, y + 98);
    });
    /* verdict strip */
    var vp = a.sc / (a.max || 1) * 100, verdict = extra.target != null ? (vp >= extra.target ? '✅ ' : '🎯 ') + U.sgn(vp - extra.target, 1) + '% vs ' + extra.target + '% target' : '';
    c.fillStyle = CARD; rr(c, 600, 750, 424, 90, 24); c.fill(); c.strokeStyle = BD; c.stroke();
    c.textAlign = 'left'; c.fillStyle = FG; c.font = '700 26px system-ui, sans-serif'; c.fillText(fit(c, verdict || '🔥 ' + extra.streak + '-day streak', 380), 624, 806);

    /* weak topics */
    var weak = Object.keys(a.secs).filter(function (k) { return a.secs[k].t >= 1; }).sort(function (x, y) { return U.pct(a.secs[x].c, a.secs[x].t) - U.pct(a.secs[y].c, a.secs[y].t); }).slice(0, 3);
    var best = Object.keys(a.secs).sort(function (x, y) { return U.pct(a.secs[y].c, a.secs[y].t) - U.pct(a.secs[x].c, a.secs[x].t); })[0];
    c.textAlign = 'left'; c.fillStyle = MU; c.font = '800 24px system-ui, sans-serif'; c.fillText('FOCUS NEXT ON', 56, 930);
    weak.forEach(function (k, i) {
      var y = 960 + i * 92, pp = U.pct(a.secs[k].c, a.secs[k].t);
      c.fillStyle = CARD; rr(c, 56, y, W - 112, 76, 22); c.fill(); c.strokeStyle = BD; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'hsl(' + C.HUE[k] + ' 78% 60%)'; c.beginPath(); c.arc(98, y + 38, 11, 0, 7); c.fill();
      c.fillStyle = FG; c.font = '700 28px system-ui, sans-serif'; c.textAlign = 'left'; c.fillText(fit(c, k, 440), 128, y + 49);
      c.fillStyle = BD; rr(c, 600, y + 28, 300, 20, 10); c.fill(); c.fillStyle = U.tone(pp); rr(c, 600, y + 28, Math.max(20, 3 * pp), 20, 10); c.fill();
      c.textAlign = 'right'; c.fillStyle = FG; c.font = '800 28px system-ui, sans-serif'; c.fillText(pp + '%', W - 80, y + 49);
    });
    c.textAlign = 'left'; c.fillStyle = MU; c.font = '600 24px system-ui, sans-serif'; if (best) c.fillText('💪 Strongest: ' + best + ' (' + U.pct(a.secs[best].c, a.secs[best].t) + '%)', 56, 1262);
    c.textAlign = 'right'; c.fillStyle = MU; c.font = '600 22px system-ui, sans-serif'; c.fillText('WBPSC Clerkship · Wise Choice', W - 56, 1262);
    c.fillStyle = lg; c.fillRect(0, H - 14, W, 14);
    return cv;
  }

  /* returns a canvas; retries without the logo if the browser taints it (file:// previews) */
  CK.card = {
    make: function (a, extra) {
      return loadImg('assets/emblem.png').then(function (logo) {
        var cv = draw(a, extra, logo);
        try { cv.toDataURL('image/png'); return cv; } catch (e) { return draw(a, extra, null); }
      });
    },
    share: function (cv, name) {
      return new Promise(function (res) {
        cv.toBlob(function (blob) {
          if (!blob) return res(false);
          var file; try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'My Clerkship mock result' }).then(function () { res(true); }, function () { res(false); });
          } else {
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); res(true);
          }
        }, 'image/png');
      });
    }
  };
})();
