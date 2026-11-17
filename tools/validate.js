#!/usr/bin/env node
/* Checks data/manifest.js and every paper it lists.  Usage:  node tools/validate.js */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
global.window = {};
require(path.join(root, 'data/manifest.js'));
const R = window.RULES, S = window.SESSIONS; let errs = 0, warns = 0;
const bad = m => { console.log('  ✗ ' + m); errs++; }, warn = m => { console.log('  ! ' + m); warns++; };
const topics = new Set(R.topics.map(t => t.n));
if (topics.size !== R.topics.length) bad('duplicate topic names in manifest');
R.topics.forEach(t => { if (!R.groups.some(g => g.id === t.g)) bad(`topic "${t.n}" has unknown group "${t.g}"`); });
const ids = new Set();
S.forEach(s => {
  console.log(`${s.id}  (${s.file})`);
  if (ids.has(s.id)) bad('duplicate session id'); ids.add(s.id);
  if (s.id !== `${s.year}-d${s.day}-s${s.shift}`) warn(`id does not match year/day/shift ("${s.year}-d${s.day}-s${s.shift}")`);
  const f = path.join(root, s.file); if (!fs.existsSync(f)) return bad('file missing');
  delete window.PAPERS; try { require(f); } catch (e) { return bad('syntax error: ' + e.message); }
  const p = window.PAPERS && window.PAPERS[s.id]; if (!p) return bad(`file does not register PAPERS['${s.id}']`);
  const seen = new Map(), cnt = {};
  p.questions.forEach((q, i) => {
    const n = `Q${i + 1}`;
    if (!topics.has(q.s)) bad(`${n}: topic "${q.s}" is not in the manifest`); else cnt[q.s] = (cnt[q.s] || 0) + 1;
    if (!q.q || !String(q.q).trim()) bad(`${n}: empty question`);
    if (!Array.isArray(q.o) || q.o.length < 2 || q.o.length > 5) bad(`${n}: needs 2–5 options`);
    else { if (new Set(q.o.map(x => String(x).trim())).size !== q.o.length) bad(`${n}: duplicate options`); if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.o.length) bad(`${n}: "a" must be a valid option index`); }
    if (!q.e) warn(`${n}: no explanation`);
    const key = String(q.q).trim().toLowerCase(); if (seen.has(key)) bad(`${n}: duplicate of Q${seen.get(key) + 1}`); else seen.set(key, i);
  });
  const need = R.questions, n = p.questions.length;
  console.log(`  ${n} questions${n === need ? ' ✓ full paper' : ` (sample — real paper has ${need})`}`);
  const g = {}; R.topics.forEach(t => { g[t.g] = (g[t.g] || 0) + (cnt[t.n] || 0); }); console.log('  sections: ' + R.groups.map(x => `${x.n} ${g[x.id] || 0}/${x.w}`).join(' · '));
});
console.log(`\n${errs} error(s), ${warns} warning(s)`); process.exit(errs ? 1 : 0);
