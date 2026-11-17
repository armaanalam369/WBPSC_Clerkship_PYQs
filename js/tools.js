/* =====================================================================
   tools.js — rough-work pad (pen / eraser / undo) and a pocket calculator
   ===================================================================== */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {}, U = CK.u, $ = U.$;
  var root = document.documentElement;

  /* ---------- rough pad ---------- */
  var PAD = { strokes: [], col: 'auto', erase: false, cur: null, cv: null, cx: null };
  function ink(c) { return c === 'auto' ? (getComputedStyle(root).getPropertyValue('--tx').trim() || '#fff') : c; }
  function seg(s, pts) {
    var c = PAD.cx; c.save(); c.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
    c.strokeStyle = ink(s.c); c.lineWidth = s.e ? 18 : 2.6; c.lineCap = c.lineJoin = 'round'; c.beginPath();
    pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    if (pts.length === 1) c.lineTo(pts[0][0] + .1, pts[0][1]);
    c.stroke(); c.restore();
  }
  function redraw() { PAD.cx.clearRect(0, 0, PAD.cv.width, PAD.cv.height); PAD.strokes.forEach(function (s) { seg(s, s.p); }); }
  function resize() {
    var r = PAD.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (!r.width) return;
    PAD.cv.width = Math.round(r.width * d); PAD.cv.height = Math.round(r.height * d); PAD.cx.setTransform(d, 0, 0, d, 0, 0); redraw();
  }
  function paintUI() {
    U.$$('[data-pc]').forEach(function (b) { b.classList.toggle('on', !PAD.erase && b.dataset.pc === PAD.col); });
    $('#bErase').classList.toggle('on', PAD.erase);
  }
  function padInit() {
    PAD.cv = $('#pad'); PAD.cx = PAD.cv.getContext('2d');
    var pt = function (e) { var r = PAD.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    PAD.cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); try { PAD.cv.setPointerCapture(e.pointerId); } catch (x) { }
      PAD.cur = { c: PAD.col, e: PAD.erase, p: [pt(e)] }; PAD.strokes.push(PAD.cur); seg(PAD.cur, PAD.cur.p);
    });
    PAD.cv.addEventListener('pointermove', function (e) {
      if (!PAD.cur) return; var p = pt(e), l = PAD.cur.p[PAD.cur.p.length - 1]; PAD.cur.p.push(p); seg(PAD.cur, [l, p]);
    });
    var up = function () { PAD.cur = null; };
    PAD.cv.addEventListener('pointerup', up); PAD.cv.addEventListener('pointercancel', up);
    window.addEventListener('resize', function () { if (T.isOpen()) resize(); });
  }

  /* ---------- calculator ---------- */
  var SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' }, CALC;
  function fresh() { return { cur: '0', acc: null, op: null, fresh: true }; }
  CALC = fresh();
  function fmtn(n) { if (!isFinite(n)) return 'Error'; var s = String(parseFloat(n.toPrecision(12))); return s.length > 14 ? n.toExponential(6) : s; }
  function evalC() {
    var a = CALC.acc, b = parseFloat(CALC.cur), r = 0;
    if (CALC.op === '+') r = a + b; else if (CALC.op === '-') r = a - b; else if (CALC.op === '*') r = a * b; else r = b === 0 ? NaN : a / b;
    CALC.cur = fmtn(r); CALC.acc = isFinite(r) ? r : null;
  }
  function calcUI() { $('#cval').textContent = CALC.cur; $('#cexp').textContent = (CALC.op && CALC.acc !== null) ? fmtn(CALC.acc) + ' ' + SYM[CALC.op] : ''; }
  function press(k) {
    var C = CALC;
    if (C.cur === 'Error' && k !== 'C') return;
    if (/^[0-9]$/.test(k)) { if (C.fresh) { C.cur = k; C.fresh = false; } else if (C.cur.replace(/[-.]/g, '').length < 14) C.cur = C.cur === '0' ? k : C.cur + k; }
    else if (k === '.') { if (C.fresh) { C.cur = '0.'; C.fresh = false; } else if (C.cur.indexOf('.') < 0) C.cur += '.'; }
    else if ('+-*/'.indexOf(k) > -1) { if (C.op && !C.fresh) evalC(); else C.acc = parseFloat(C.cur); if (CALC.cur !== 'Error') { CALC.op = k; CALC.fresh = true; } }
    else if (k === '=') { if (C.op) { evalC(); C.op = null; C.fresh = true; } }
    else if (k === 'C') CALC = fresh();
    else if (k === 'B') { if (!C.fresh && C.cur.length > 1) C.cur = C.cur.slice(0, -1); else { C.cur = '0'; C.fresh = true; } }
    else if (k === '%') { C.cur = fmtn(parseFloat(C.cur) / 100); C.fresh = true; }
    else if (k === 'R') { var n = parseFloat(C.cur); C.cur = n < 0 ? 'Error' : fmtn(Math.sqrt(n)); C.fresh = true; }
    calcUI();
  }
  function calcInit() {
    var keys = [['C', 'C', 'op'], ['B', '⌫', 'op'], ['%', '%', 'op'], ['/', '÷', 'op'], ['7'], ['8'], ['9'], ['*', '×', 'op'], ['4'], ['5'], ['6'], ['-', '−', 'op'], ['1'], ['2'], ['3'], ['+', '+', 'op'], ['0'], ['.'], ['R', '√', 'op'], ['=', '=', 'eq']];
    $('#ckeys').innerHTML = keys.map(function (k) { return '<button class="' + (k[2] || '') + '" data-act="ck" data-v="' + k[0] + '">' + (k[1] || k[0]) + '</button>'; }).join(''); calcUI();
  }

  /* ---------- panel ---------- */
  var T = CK.tools = {
    tab: 'pad',
    isOpen: function () { return $('#tools').classList.contains('show'); },
    open: function (t) { $('#tools').classList.add('show'); T.show(t || 'pad'); },
    close: function () { $('#tools').classList.remove('show'); },
    show: function (t) {
      T.tab = t; $('#padWrap').style.display = t === 'pad' ? 'flex' : 'none'; $('#calcWrap').style.display = t === 'calc' ? 'flex' : 'none';
      $('#tabPad').classList.toggle('on', t === 'pad'); $('#tabCalc').classList.toggle('on', t === 'calc');
      if (t === 'pad') { resize(); paintUI(); }
    },
    reset: function () { PAD.strokes = []; CALC = fresh(); if (PAD.cx) redraw(); calcUI(); },
    color: function (v) { PAD.col = v; PAD.erase = false; paintUI(); },
    eraser: function () { PAD.erase = !PAD.erase; paintUI(); },
    undo: function () { PAD.strokes.pop(); redraw(); },
    clear: function () { PAD.strokes = []; redraw(); },
    redraw: function () { if (PAD.cx) redraw(); },
    press: press,
    init: function () { padInit(); calcInit(); }
  };
})();
