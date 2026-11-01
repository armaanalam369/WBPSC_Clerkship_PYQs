/* ============================================================
   WBPSC CLERKSHIP PYQs — QUIZ ENGINE v2
   Adding a paper never needs edits here:
     1. create data/<name>.js calling registerPYQ(year, questions, meta)
     2. list "<name>" in data/manifest.js:  const PYQ_YEARS = ["2019", "2019-shift2"];
   meta (all optional): { shift:"Shift 2", name:"...", durationMin:60, marks:{correct:1, wrong:0.25} }
   question (optional extras): difficulty, tags[], source, verified:false, originalNumber
   ============================================================ */
"use strict";

const CONFIG = {
  sectionOrder: [
  "English", "Ancient History", "Medieval History", "Modern History",
  "West Bengal Specific", "Indian Geography", "Physical & World Geography",
  "Arts & Culture", "Indian Polity", "Indian Economy", "Physics", "Chemistry",
  "Biology", "Static GK", "Current Affairs", "Aptitude & Mental Ability"],    
   // optional preferred section order; others follow as found in data
   
  defaultMarks: { correct: 1, wrong: 0.25 },
  defaultDurationMin: 60,
  dailyGoal: 25,                    // questions per day
  strongFrom: 75, weakBelow: 50, minAttemptsForLabel: 5,
  srsDays: [1, 3, 7, 14, 30]        // spaced-repetition gaps for questions you got wrong
};
const K = { hist: "pyq_history_v2", oldHist: "pyq_history_v1", oldTheme: "pyq_theme_v1", prefs: "pyq_prefs_v2",
  bm: "pyq_bookmarks_v2", notes: "pyq_notes_v2", srs: "pyq_srs_v2", days: "pyq_days_v2", prog: "pyq_progress_v2", ver: "pyq_schema" };

/* ---------- utilities ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rich = s => esc(s).replace(/\n/g, "<br>");
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("Storage is full or blocked, so progress may not be saved."); } };
const fmt = s => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
const clock = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const today = () => new Date().toLocaleDateString("en-CA");
const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const normalize = t => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const KEYL = "ABCD";

function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; $("toasts").appendChild(t);
  setTimeout(() => t.classList.add("out"), 2600); setTimeout(() => t.remove(), 3000);
}
function confirmModal(title, html, ok = "Confirm", cancel = "Cancel") {
  return new Promise(res => {
    const m = $("modal");
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><div>${html}</div>
      <div class="modal-actions">${cancel ? `<button class="btn" data-m="0">${esc(cancel)}</button>` : ""}<button class="btn primary" data-m="1">${esc(ok)}</button></div></div>`;
    m.classList.remove("hidden");
    m.onclick = e => { const b = e.target.closest("[data-m]"); if (!b && e.target !== m) return; m.classList.add("hidden"); m.onclick = null; res(!!b && b.dataset.m === "1"); };
  });
}

/* ---------- 1. DATA REGISTRATION ---------- */
const PAPERS = [], ALL_QUESTIONS = [], LOAD_ERRORS = [], QMAP = new Map();
function registerPYQ(year, questions, meta = {}) {
  const shift = meta.shift || "";
  const paperId = shift ? `${year}-${slug(shift)}` : String(year);
  const paper = { id: paperId, year: parseInt(year, 10) || year, shift,
    name: meta.name || `${year}${shift ? " " + shift : ""} PYQ`,
    durationMin: meta.durationMin || CONFIG.defaultDurationMin,
    marks: { ...CONFIG.defaultMarks, ...(meta.marks || {}) }, count: questions.length };
  PAPERS.push(paper);
  questions.forEach((q, i) => {
    const n = q.originalNumber || (i + 1);
    ALL_QUESTIONS.push({ id: `${paperId}-Q${String(n).padStart(3, "0")}`, paperId, paperName: paper.name, year: paper.year, originalNumber: n,
      section: q.section, question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation || "",
      difficulty: q.difficulty || "Medium", tags: q.tags || [], source: q.source || "", verified: q.verified !== false, repeats: [] });
  });
}
function loadDataFiles(files, done) {
  let i = 0;
  (function next() {
    if (i >= files.length) return done();
    const s = document.createElement("script"); s.src = `data/${files[i]}.js`;
    s.onload = () => { i++; next(); };
    s.onerror = () => { LOAD_ERRORS.push(files[i]); i++; next(); };
    document.head.appendChild(s);
  })();
}
function getSections() {
  const seen = []; ALL_QUESTIONS.forEach(q => { if (!seen.includes(q.section)) seen.push(q.section); });
  const pref = CONFIG.sectionOrder.filter(s => seen.includes(s));
  return [...pref, ...seen.filter(s => !pref.includes(s))];
}
const paperById = id => PAPERS.find(p => p.id === id);
const sortPool = pool => { const ix = id => PAPERS.findIndex(p => p.id === id); return [...pool].sort((a, b) => ix(a.paperId) - ix(b.paperId) || a.originalNumber - b.originalNumber); };

/* ---------- 2. REPEATS + VALIDATION ---------- */
function detectRepeats() {
  const by = new Map();
  ALL_QUESTIONS.forEach(q => { const k = normalize(q.question); if (!by.has(k)) by.set(k, []); by.get(k).push(q); });
  by.forEach(g => { if (g.length > 1) g.forEach(q => { q.repeats = g.filter(o => o.id !== q.id).map(o => ({ paperName: o.paperName, originalNumber: o.originalNumber })); }); });
  return by;
}
function repeatedPool() {
  const seen = new Set(), out = [];
  ALL_QUESTIONS.forEach(q => { if (!q.repeats.length) return; const k = normalize(q.question); if (!seen.has(k)) { seen.add(k); out.push(q); } });
  return out;
}
let VALIDATION = { errors: [], warns: [] };
function validateDataset() {
  const errors = [], warns = [], ids = new Set();
  ALL_QUESTIONS.forEach(q => {
    if (ids.has(q.id)) errors.push(`Duplicate id ${q.id}`); ids.add(q.id);
    if (!q.section) errors.push(`${q.id}: missing section`);
    if (!q.question) errors.push(`${q.id}: missing question text`);
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${q.id}: needs exactly 4 options`);
    if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) errors.push(`${q.id}: correctAnswer must be 0–3`);
    if (!q.explanation) warns.push(`${q.id}: no explanation`);
    if (!q.verified) warns.push(`${q.id}: answer key marked unverified`);
  });
  PAPERS.forEach(p => {
    const seen = new Map();
    ALL_QUESTIONS.filter(q => q.paperId === p.id).forEach(q => { const k = normalize(q.question); if (seen.has(k)) warns.push(`${q.id}: same text as ${seen.get(k)} in the same paper`); else seen.set(k, q.id); });
  });
  LOAD_ERRORS.forEach(f => errors.push(`Could not load data/${f}.js (check the file name in manifest.js)`));
  return { errors, warns };
}

/* ---------- 3. STORAGE, PREFS, MIGRATION ---------- */
const getHistory = () => load(K.hist, []);
function migrate() {
  if (!localStorage.getItem(K.hist) && localStorage.getItem(K.oldHist)) save(K.hist, load(K.oldHist, []));
  const t = localStorage.getItem(K.oldTheme);
  if (t && !localStorage.getItem(K.prefs)) save(K.prefs, { theme: t, font: 1 });
  localStorage.setItem(K.ver, "2");
}
let prefs = { theme: null, font: 1 };
function applyPrefs() {
  prefs = { ...prefs, ...load(K.prefs, {}) };
  const dark = (prefs.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
  document.body.classList.toggle("dark", dark);
  $("theme-toggle").textContent = dark ? "Light" : "Dark";
  document.documentElement.style.fontSize = (16 * prefs.font) + "px";
}
const setPref = (k, v) => { prefs[k] = v; save(K.prefs, prefs); applyPrefs(); };

/* ---------- 4. DERIVED STATS ---------- */
const pid = h => h.paperId || (h.year !== undefined && h.year !== null ? String(h.year) : null);
function latestStatuses() {
  const m = new Map();
  getHistory().forEach(r => {
    const om = new Map((r.optionOrder || []).map(o => [o.id, o]));
    (r.questionIds || []).forEach(id => {
      if (m.has(id)) return;
      const a = r.answers?.[id], o = om.get(id);
      m.set(id, a === undefined ? "unanswered" : (o && a === o.correctAnswer ? "correct" : "incorrect"));
    });
  });
  return m;
}
function sectionStats() {
  const s = {};
  getHistory().forEach(r => Object.entries(r.sectionBreakdown || {}).forEach(([k, b]) => {
    s[k] = s[k] || { total: 0, attempted: 0, correct: 0, timeSec: 0 };
    s[k].total += b.total; s[k].attempted += b.attempted; s[k].correct += b.correct; s[k].timeSec += b.timeSec || 0;
  }));
  return s;
}
function streaks(days) {
  const ds = Object.keys(days).filter(d => days[d] > 0).sort(); let best = 0, run = 0, prev = null;
  ds.forEach(d => { run = prev && Math.round((new Date(d) - new Date(prev)) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  const y = new Date(Date.now() - 864e5).toLocaleDateString("en-CA");
  return { current: prev === today() || prev === y ? run : 0, best };
}
function addDay(n) { const d = load(K.days, {}); d[today()] = (d[today()] || 0) + n; save(K.days, d); }
function badgeDefs() {
  const h = getHistory(), st = streaks(load(K.days, {})), answered = h.reduce((s, r) => s + (r.attempted || 0), 0);
  return [
    { id: "first", name: "First steps", desc: "Finish a test", ok: h.length >= 1 },
    { id: "c100", name: "Centurion", desc: "Answer 100 questions", ok: answered >= 100 },
    { id: "sharp", name: "Sharp shooter", desc: "Score 80%+ on a test of 20+ questions", ok: h.some(r => r.scorePercent >= 80 && r.totalQuestions >= 20) },
    { id: "full", name: "Full paper", desc: "Finish a whole paper in exam mode", ok: h.some(r => ["paper", "pyq"].includes(r.type) && (r.mode || "exam") === "exam" && r.totalQuestions >= (paperById(pid(r))?.count ?? 1e9)) },
    { id: "s3", name: "On a roll", desc: "3-day streak", ok: st.best >= 3 },
    { id: "s7", name: "Week warrior", desc: "7-day streak", ok: st.best >= 7 }
  ];
}
function updateSRS(qs, answers) {
  const srs = load(K.srs, {}), now = Date.now();
  qs.forEach(q => {
    const a = answers[q.id]; if (a === undefined) return;
    if (a !== q.correctAnswer) srs[q.id] = { box: 0, due: now + CONFIG.srsDays[0] * 864e5 };
    else if (srs[q.id]) { const b = srs[q.id].box + 1; if (b >= CONFIG.srsDays.length) delete srs[q.id]; else srs[q.id] = { box: b, due: now + CONFIG.srsDays[b] * 864e5 }; }
  });
  save(K.srs, srs);
}
const dueQuestions = () => { const srs = load(K.srs, {}), now = Date.now(); return Object.entries(srs).filter(([id, v]) => v.due <= now && QMAP.has(id)).map(([id]) => QMAP.get(id)); };
const mistakeQuestions = () => [...latestStatuses()].filter(([id, s]) => s === "incorrect" && QMAP.has(id)).map(([id]) => QMAP.get(id));
const savedQuestions = () => Object.keys(load(K.bm, {})).filter(id => QMAP.has(id)).map(id => QMAP.get(id));

/* ---------- 5. VIEWS ---------- */
let activeQuiz = null, pendingTest = null, currentRecord = null, timerId = null, reviewF = "all";
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  const v = $("view-" + name); v.classList.remove("hidden", "fade"); void v.offsetWidth; v.classList.add("fade");
  document.body.dataset.view = name; if (name !== "quiz") document.body.classList.remove("focus");
  window.scrollTo(0, 0);
}
const RENDER = { dashboard: () => renderDashboard(), custom: () => renderCustomBuilder(), stats: () => renderStats(), saved: () => renderSaved(), history: () => renderHistory(), datacheck: () => renderDataCheck() };
function goView(name) { RENDER[name](); showView(name); }
function leaveQuiz(then) {
  if (!activeQuiz) return then();
  confirmModal("Leave this test?", "<p>Your progress is saved. You can resume from the dashboard.</p>", "Leave").then(ok => {
    if (!ok) return; saveProgress(); clearInterval(timerId); activeQuiz = null; then();
  });
}
const repeatChip = q => q.repeats.length ? `<span class="chip warn" title="${esc("Also in: " + q.repeats.map(r => r.paperName + " Q" + r.originalNumber).join("; "))}">Repeated in ${q.repeats.length + 1} papers</span>` : "";

/* ---------- 6. DASHBOARD ---------- */
function renderDashboard() {
  const hist = getHistory(), sections = getSections(), days = load(K.days, {}), st = streaks(days);
  const todayN = days[today()] || 0, goal = CONFIG.dailyGoal, prog = load(K.prog, null), ss = sectionStats();
  const counts = { due: dueQuestions().length, mis: mistakeQuestions().length, sav: savedQuestions().length, rep: repeatedPool().length };
  const quick = (act, attrs, icon, label, sub, off) => `<button class="quick" data-act="${act}" ${attrs} ${off ? "disabled" : ""}><span class="q-ico">${icon}</span><span><b>${label}</b><small>${sub}</small></span></button>`;
  const byYear = {}; PAPERS.forEach(p => (byYear[p.year] = byYear[p.year] || []).push(p));
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const paperCards = years.map(y => `
    <div class="year-head"><h3>${esc(y)}</h3><span class="meta">${byYear[y].length} paper${byYear[y].length > 1 ? "s" : ""}</span></div>
    <div class="card-grid">${byYear[y].map(p => {
      const at = hist.filter(h => pid(h) === p.id && ["paper", "pyq"].includes(h.type)), best = at.length ? Math.max(...at.map(a => a.scorePercent)) : null;
      return `<div class="card"><div class="card-row"><div class="ring" style="--p:${best || 0}"><span>${best === null ? "–" : best + "%"}</span></div>
        <div><h3>${esc(p.name)}</h3><p class="meta">${p.count} questions, ${p.durationMin} min</p><p class="meta">+${p.marks.correct} / −${p.marks.wrong} · ${at.length ? at.length + " attempt(s)" : "Not attempted"}</p></div></div>
        <div class="card-actions"><button class="btn primary" data-act="startPaper" data-id="${esc(p.id)}" data-mode="exam">Exam mode</button>
        <button class="btn" data-act="startPaper" data-id="${esc(p.id)}" data-mode="practice">Practice</button></div></div>`;
    }).join("")}</div>`).join("");

  const sectionCards = sections.map((s, i) => {
    const total = ALL_QUESTIONS.filter(q => q.section === s).length, b = ss[s], acc = b ? pct(b.correct, b.attempted) : null;
    return `<div class="card"><h3>${esc(s)}</h3><p class="meta">${total} question${total === 1 ? "" : "s"} across all papers</p>
      <div class="bar"><i style="width:${acc || 0}%"></i></div><p class="meta">${acc !== null ? `Accuracy ${acc}%` : "No attempts yet"}</p>
      <div class="card-actions"><button class="btn" data-act="startSection" data-i="${i}" data-mode="practice">Practice</button><button class="btn" data-act="startSection" data-i="${i}" data-mode="exam">Timed test</button></div></div>`;
  }).join("");

  $("dashboard-body").innerHTML = `
    <div class="hero"><div><h1>Clerkship PYQs, paper by paper</h1><p>Sit a full paper under exam conditions, drill one section, or work through the questions you keep missing.</p>
      <div class="badges">${badgeDefs().map(b => `<span class="badge ${b.ok ? "on" : ""}" title="${esc(b.desc)}">${esc(b.name)}</span>`).join("")}</div></div>
      <div class="goal"><p>Today's goal</p><b>${todayN} / ${goal}</b> <span>questions</span><div class="bar"><i style="width:${Math.min(100, pct(todayN, goal))}%"></i></div>
      <p>${st.current ? `${st.current}-day streak` : "Answer a question to start a streak"}</p></div></div>
    <div class="quick-row">
      ${prog ? quick("resume", "", "▶", "Resume test", esc(prog.meta?.name || "In progress"), false).replace('class="quick"', 'class="quick resume"') : ""}
      ${quick("startSpecial", 'data-kind="due"', "🔁", "Review due", `${counts.due} question(s)`, !counts.due)}
      ${quick("startSpecial", 'data-kind="mistakes"', "🎯", "My mistakes", `${counts.mis} question(s)`, !counts.mis)}
      ${quick("startSpecial", 'data-kind="saved"', "★", "Saved", `${counts.sav} question(s)`, !counts.sav)}
      ${quick("startSpecial", 'data-kind="repeated"', "📌", "Often repeated", `${counts.rep} question(s)`, !counts.rep)}
    </div>
    <h2>Full papers</h2><p class="meta">Each paper keeps its own year, shift, timing and marking scheme.</p>
    ${paperCards || `<div class="card"><h3>No papers yet</h3><p class="meta">Add a data file such as data/2019.js, then list "2019" in data/manifest.js.</p></div>`}
    <h2>Section-wise practice</h2><p class="meta">Questions on one subject, pooled from every paper.</p>
    <div class="card-grid">${sectionCards || "<p class='meta'>Sections appear once papers are loaded.</p>"}</div>`;
  const w = $("data-warning");
  if (VALIDATION.errors.length) { w.textContent = `${VALIDATION.errors.length} data problem(s) found. Open "Check question data" at the bottom of the page.`; w.classList.remove("hidden"); } else w.classList.add("hidden");
}

/* ---------- 7. STARTING TESTS ---------- */
function startPaper(id, mode) {
  const p = paperById(id), pool = sortPool(ALL_QUESTIONS.filter(q => q.paperId === id));
  openConfig({ kind: "paper", name: p.name, paperId: id, year: p.year, paper: p, pool, mode, order: "original", shuffle: false, marks: p.marks, sections: [...new Set(pool.map(q => q.section))] });
}
function startSection(i, mode) {
  const s = getSections()[i], pool = ALL_QUESTIONS.filter(q => q.section === s);
  openConfig({ kind: "section", name: `Topic: ${s}`, pool: sortPool(pool), mode, order: "random", shuffle: false, marks: CONFIG.defaultMarks, sections: [s] });
}
function startSpecial(kind, recordPool) {
  const map = { due: ["Spaced review", dueQuestions], mistakes: ["My mistakes", mistakeQuestions], saved: ["Saved questions", savedQuestions], repeated: ["Often-repeated questions", repeatedPool] };
  const pool = recordPool || map[kind][1]();
  if (!pool.length) return toast("Nothing here yet.");
  openConfig({ kind: "special", name: recordPool ? "Retry: my mistakes" : map[kind][0], pool, mode: "practice", order: "random", shuffle: false, marks: CONFIG.defaultMarks, sections: [...new Set(pool.map(q => q.section))] });
}
function startCustom() {
  const ps = [...document.querySelectorAll(".c-paper:checked")].map(e => e.value), ss = [...document.querySelectorAll(".c-section:checked")].map(e => e.value), ds = [...document.querySelectorAll(".c-diff:checked")].map(e => e.value);
  if (!ps.length || !ss.length || !ds.length) return toast("Pick at least one paper, section and difficulty.");
  const pool = sortPool(ALL_QUESTIONS.filter(q => ps.includes(q.paperId) && ss.includes(q.section) && ds.includes(q.difficulty)));
  if (!pool.length) return toast("No questions match that combination.");
  const c = $("custom-count").value;
  openConfig({ kind: "custom", name: "Custom test", pool, mode: "exam", order: "random", shuffle: true, marks: CONFIG.defaultMarks, sections: ss, count: c === "all" ? pool.length : Math.min(+c, pool.length) });
}
function renderCustomBuilder() {
  const chip = (cls, v, label) => `<label class="chip"><input type="checkbox" class="${cls}" value="${esc(v)}" checked> ${esc(label)}</label>`;
  $("custom-papers").innerHTML = PAPERS.map(p => chip("c-paper", p.id, p.name)).join("") || "<span class='meta'>No papers loaded</span>";
  $("custom-sections").innerHTML = getSections().map(s => chip("c-section", s, s)).join("");
  $("custom-difficulty").innerHTML = [...new Set(ALL_QUESTIONS.map(q => q.difficulty))].map(d => chip("c-diff", d, d)).join("");
}

/* ---------- 8. TEST CONFIG ---------- */
function openConfig(t) {
  pendingTest = t; const n = t.count || t.pool.length;
  $("config-title").textContent = t.name; $("config-meta").textContent = `${t.pool.length} question(s) available`;
  $("config-mode").value = t.mode; $("config-order").value = t.order; $("config-shuffle").checked = t.shuffle;
  $("config-count").value = n; $("config-count").max = t.pool.length;
  $("mark-correct").value = t.marks.correct; $("mark-wrong").value = t.marks.wrong;
  $("timer-mode").value = t.mode === "exam" ? "perTest" : "none"; syncTimer(true); showView("testconfig");
}
function syncTimer(reset) {
  const t = pendingTest, tm = $("timer-mode").value;
  $("timer-row").classList.toggle("hidden", tm === "none");
  $("timer-label").textContent = tm === "perQuestion" ? "Seconds per question" : "Total minutes";
  if (reset) {
    const c = Math.min(Math.max(1, num($("config-count").value, t.pool.length)), t.pool.length);
    $("timer-value").value = tm === "perQuestion" ? 30 : (t.kind === "paper" ? Math.max(1, Math.round(t.paper.durationMin * c / t.pool.length)) : Math.max(1, Math.ceil(c * 0.75)));
  }
}
function launchTest() {
  const t = pendingTest, mode = $("config-mode").value, order = $("config-order").value, shuf = $("config-shuffle").checked;
  const count = Math.min(Math.max(1, Math.floor(num($("config-count").value, t.pool.length))), t.pool.length);
  const tm = $("timer-mode").value, tv = Math.max(1, num($("timer-value").value, 30));
  const marks = { correct: Math.max(0, num($("mark-correct").value, 1)), wrong: Math.max(0, num($("mark-wrong").value, 0)) };
  const pool = (order === "random" ? shuffle(t.pool) : [...t.pool]).slice(0, count);
  const questions = pool.map(q => {
    const c = { ...q };
    if (shuf) { const idx = shuffle(q.options.map((_, i) => i)); c.options = idx.map(i => q.options[i]); c.correctAnswer = idx.indexOf(q.correctAnswer); } else c.options = [...q.options];
    return c;
  });
  const perTest = tm === "perTest" ? Math.round(tv * 60) : null, perQ = tm === "perQuestion" ? Math.round(tv) : null;
  activeQuiz = { meta: { kind: t.kind, name: t.name, paperId: t.paperId || null, year: t.year ?? null, sections: t.sections }, mode, questions, index: 0,
    answers: {}, marked: {}, visited: {}, times: {}, timerMode: tm, perQ, timeLeft: perTest ?? perQ ?? 0, elapsed: 0, marks, startedAt: Date.now() };
  startTimerLoop(); renderQuiz(); showView("quiz"); saveProgress();
}

/* ---------- 9. QUIZ ENGINE ---------- */
const saveProgress = () => { if (activeQuiz) save(K.prog, activeQuiz); };
function startTimerLoop() { clearInterval(timerId); timerId = setInterval(tick, 1000); updateTimerDisplay(); }
function tick() {
  const a = activeQuiz; if (!a || document.body.dataset.view !== "quiz") return;
  const q = a.questions[a.index]; a.times[q.id] = (a.times[q.id] || 0) + 1; a.elapsed++;
  if (a.timerMode !== "none") {
    a.timeLeft--;
    if (a.timeLeft <= 0) {
      if (a.timerMode === "perQuestion" && a.index < a.questions.length - 1) { toast("Time's up for this question."); goToQuestion(a.index + 1); }
      else { toast("Time's up. Submitting your test."); finishTest(); return; }
    }
  }
  updateTimerDisplay(); if (a.elapsed % 5 === 0) saveProgress();
}
function updateTimerDisplay() {
  const a = activeQuiz, el = $("quiz-timer"); if (!a) return;
  el.textContent = `⏱ ${clock(a.timerMode === "none" ? a.elapsed : Math.max(0, a.timeLeft))}`;
  el.classList.toggle("timer-low", a.timerMode !== "none" && a.timeLeft <= 10);
}
function renderQuiz() {
  const a = activeQuiz, q = a.questions[a.index], n = a.questions.length; a.visited[q.id] = true;
  $("quiz-progress-label").textContent = `Question ${a.index + 1} of ${n}`;
  $("quiz-progress-fill").style.width = `${(a.index + 1) / n * 100}%`;
  $("quiz-meta").innerHTML = `<span>${esc(q.section)}</span><span>${esc(q.paperName)} Q${q.originalNumber}</span><span>${esc(q.difficulty)}</span>${repeatChip(q)}${q.verified ? "" : '<span class="chip bad">Answer key unverified</span>'}`;
  $("quiz-question").innerHTML = rich(q.question);
  const chosen = a.answers[q.id], locked = a.mode === "practice" && chosen !== undefined;
  $("quiz-options").innerHTML = q.options.map((o, i) => {
    let cls = "option"; if (locked) { cls += " locked"; if (i === q.correctAnswer) cls += " right"; else if (i === chosen) cls += " wrong"; } else if (chosen === i) cls += " selected";
    return `<button class="${cls}" data-act="pick" data-i="${i}"><span class="opt-key">${KEYL[i]}</span><span>${rich(o)}</span></button>`;
  }).join("");
  $("quiz-feedback").innerHTML = locked ? `<div class="feedback ${chosen === q.correctAnswer ? "" : "bad"}"><strong>${chosen === q.correctAnswer ? "Correct" : `Incorrect. The answer is ${KEYL[q.correctAnswer]}.`}</strong>${q.explanation ? `<p>${rich(q.explanation)}</p>` : ""}</div>` : "";
  const note = load(K.notes, {})[q.id] || ""; $("note-box").value = note; $("note-wrap").open = !!note;
  $("mark-btn").textContent = a.marked[q.id] ? "Unmark" : "Mark";
  $("bm-btn").textContent = load(K.bm, {})[q.id] ? "★ Saved" : "☆ Save";
  $("clear-btn").classList.toggle("hidden", a.mode === "practice");
  $("prev-btn").disabled = a.index === 0;
  $("next-btn").textContent = a.index === n - 1 ? "Finish" : "Next";
  $("quiz-nav").innerHTML = a.questions.map((x, i) => {
    const ans = a.answers[x.id] !== undefined, mk = a.marked[x.id];
    let c = ans && mk ? "both" : mk ? "marked" : ans ? "answered" : a.visited[x.id] ? "notans" : "unvisited";
    if (i === a.index) c += " current"; return `<button class="nav-cell ${c}" data-act="goto" data-i="${i}">${i + 1}</button>`;
  }).join("");
  updateTimerDisplay();
}
function pick(i) {
  const a = activeQuiz, q = a.questions[a.index]; if (a.mode === "practice" && a.answers[q.id] !== undefined) return;
  a.answers[q.id] = i; renderQuiz(); saveProgress();
}
function goToQuestion(i) {
  const a = activeQuiz; if (i < 0) return; if (i >= a.questions.length) return requestSubmit();
  a.index = i; if (a.timerMode === "perQuestion") a.timeLeft = a.perQ; renderQuiz(); saveProgress(); window.scrollTo(0, 0);
}
function requestSubmit() {
  const a = activeQuiz, n = a.questions.length, ans = Object.keys(a.answers).length, mk = Object.values(a.marked).filter(Boolean).length;
  confirmModal("Submit this test?", `<p>Answered: <b>${ans}</b> of ${n}<br>Not answered: <b>${n - ans}</b><br>Marked for review: <b>${mk}</b></p>`, "Submit").then(ok => { if (ok) finishTest(); });
}

/* ---------- 10. RESULTS ---------- */
function finishTest() {
  const a = activeQuiz; if (!a) return; clearInterval(timerId);
  const before = new Set(badgeDefs().filter(b => b.ok).map(b => b.id));
  const qs = a.questions, m = a.marks; let correct = 0, attempted = 0; const sectionBreakdown = {}, paperBreakdown = {};
  qs.forEach(q => {
    const ans = a.answers[q.id], isA = ans !== undefined, isC = isA && ans === q.correctAnswer, t = a.times[q.id] || 0;
    if (isA) attempted++; if (isC) correct++;
    [[sectionBreakdown, q.section], [paperBreakdown, q.paperName]].forEach(([o, k]) => {
      o[k] = o[k] || { total: 0, attempted: 0, correct: 0, timeSec: 0 }; o[k].total++; o[k].timeSec += t; if (isA) o[k].attempted++; if (isC) o[k].correct++;
    });
  });
  const incorrect = attempted - correct, score = +(correct * m.correct - incorrect * m.wrong).toFixed(2), maxScore = +(qs.length * m.correct).toFixed(2);
  const rec = { id: Date.now(), date: new Date().toISOString(), testName: a.meta.name, type: a.meta.kind, mode: a.mode, paperId: a.meta.paperId, year: a.meta.year, sections: a.meta.sections,
    questionIds: qs.map(q => q.id), answers: a.answers, marked: a.marked, times: a.times, optionOrder: qs.map(q => ({ id: q.id, options: q.options, correctAnswer: q.correctAnswer })),
    totalQuestions: qs.length, attempted, correct, incorrect, unanswered: qs.length - attempted, marks: m, score, maxScore,
    scorePercent: maxScore ? Math.max(0, Math.round(score / maxScore * 100)) : 0, timeTakenSec: a.elapsed, avgTimeSec: Math.round(a.elapsed / qs.length), sectionBreakdown, paperBreakdown };
  const h = getHistory(); h.unshift(rec); save(K.hist, h);
  addDay(attempted); updateSRS(qs, a.answers); localStorage.removeItem(K.prog); activeQuiz = null;
  currentRecord = rec; renderResults(rec); showView("results");
  badgeDefs().filter(b => b.ok && !before.has(b.id)).forEach(b => toast(`New badge: ${b.name}`));
}
const rowLabel = (acc, att) => att < CONFIG.minAttemptsForLabel ? '<span class="tag">Need more data</span>' : acc >= CONFIG.strongFrom ? '<span class="tag good">Strong</span>' : acc < CONFIG.weakBelow ? '<span class="tag bad">Weak</span>' : '<span class="tag">Average</span>';
function breakdownTable(obj, first) {
  return `<tr><th>${first}</th><th>Total</th><th>Attempted</th><th>Correct</th><th>Accuracy</th><th>Avg time</th></tr>` + Object.entries(obj).map(([k, b]) =>
    `<tr><td>${esc(k)}</td><td>${b.total}</td><td>${b.attempted}</td><td>${b.correct}</td><td>${pct(b.correct, b.attempted)}%</td><td>${b.timeSec !== undefined ? Math.round(b.timeSec / b.total) + "s" : "–"}</td></tr>`).join("");
}
function statusOf(r, id) { const o = r.optionOrder.find(x => x.id === id), a = r.answers[id]; return a === undefined ? "unanswered" : a === o.correctAnswer ? "correct" : "incorrect"; }
function renderResults(r) {
  currentRecord = r;
  $("results-title").textContent = r.testName;
  $("results-sub").textContent = `${new Date(r.date).toLocaleString()} · ${(r.mode || "exam") === "exam" ? "Exam mode" : "Practice mode"}`;
  const mk = r.marks || CONFIG.defaultMarks, sc = r.score ?? r.correct, mx = r.maxScore ?? r.totalQuestions;
  const st = (n, l) => `<div class="stat"><span class="stat-num">${n}</span><span class="stat-label">${l}</span></div>`;
  $("results-overall").innerHTML = st(`${sc} / ${mx}`, `Marks (+${mk.correct} / −${mk.wrong})`) + st(r.scorePercent + "%", "Score") + st(`${r.correct}/${r.totalQuestions}`, "Correct") + st(r.incorrect, "Incorrect") + st(r.unanswered, "Unanswered") + st(fmt(r.timeTakenSec), "Time taken") + st(r.avgTimeSec + "s", "Avg per question");
  const secs = Object.entries(r.sectionBreakdown || {}).filter(([, b]) => b.attempted > 0);
  const slow = Object.entries(r.sectionBreakdown || {}).filter(([, b]) => b.timeSec).sort((x, y) => y[1].timeSec / y[1].total - x[1].timeSec / x[1].total)[0];
  const weak = secs.filter(([, b]) => b.attempted >= 3).sort((x, y) => x[1].correct / x[1].attempted - y[1].correct / y[1].attempted)[0];
  $("results-insight").textContent = [weak ? `Weakest section: ${weak[0]} (${pct(weak[1].correct, weak[1].attempted)}% accuracy).` : "", slow ? `Slowest section: ${slow[0]} (${Math.round(slow[1].timeSec / slow[1].total)}s per question).` : ""].filter(Boolean).join(" ");
  const sk = Object.keys(r.sectionBreakdown || {}); $("results-section-wrap").classList.toggle("hidden", sk.length <= 1);
  if (sk.length > 1) $("results-section-table").innerHTML = breakdownTable(r.sectionBreakdown, "Section");
  const pb = r.paperBreakdown || r.yearBreakdown || {}; $("results-paper-wrap").classList.toggle("hidden", Object.keys(pb).length <= 1);
  if (Object.keys(pb).length > 1) $("results-paper-table").innerHTML = breakdownTable(pb, "Paper");
  const ts = r.questionIds.map(id => r.times?.[id] || 0), mxT = Math.max(1, ...ts);
  $("results-heat").innerHTML = r.questionIds.map((id, i) => `<div class="heat s-${statusOf(r, id)}" style="--t:${(ts[i] / mxT).toFixed(2)}" title="Q${i + 1}: ${ts[i]}s, ${statusOf(r, id)}">${i + 1}</div>`).join("");
}

/* ---------- 11. REVIEW + SAVED ---------- */
function reviewItem(q, opts, correct, userAns, status) {
  const note = load(K.notes, {})[q.id], bm = !!load(K.bm, {})[q.id];
  return `<article class="review-item ${status}"><div class="chips-meta"><span>${esc(q.section)}</span><span>${esc(q.paperName)} Q${q.originalNumber}</span>${repeatChip(q)}${q.verified ? "" : '<span class="chip bad">Answer key unverified</span>'}</div>
    <p class="review-q">${rich(q.question)}</p>
    ${opts.map((o, i) => `<div class="review-opt ${i === correct ? "correct" : i === userAns ? "incorrect" : ""}"><b>${KEYL[i]}</b> ${rich(o)}${i === userAns ? " <em>(your answer)</em>" : ""}</div>`).join("")}
    ${status === "neutral" ? "" : `<p class="review-status">${status === "unanswered" ? "Not answered" : status === "correct" ? "Correct" : "Incorrect"}</p>`}
    ${q.explanation ? `<p class="review-explain"><strong>Explanation:</strong> ${rich(q.explanation)}</p>` : ""}
    ${note ? `<p class="review-note">Note: ${rich(note)}</p>` : ""}
    <button class="btn small no-print" data-act="bmToggle" data-id="${esc(q.id)}">${bm ? "★ Saved" : "☆ Save"}</button></article>`;
}
function openReview(r) {
  r = r || currentRecord; currentRecord = r;
  const items = r.questionIds.map(id => ({ id, q: QMAP.get(id), o: r.optionOrder.find(x => x.id === id) })).filter(x => x.q && x.o).map(x => ({ ...x, st: statusOf(r, x.id), mk: !!r.marked?.[x.id] }));
  const F = { all: ["All", () => true], incorrect: ["Wrong", x => x.st === "incorrect"], unanswered: ["Unanswered", x => x.st === "unanswered"], correct: ["Correct", x => x.st === "correct"], marked: ["Marked", x => x.mk] };
  $("review-title").textContent = `Review: ${r.testName}`;
  $("review-filters").innerHTML = Object.entries(F).map(([k, [l, f]]) => `<button class="chip ${reviewF === k ? "on" : ""}" data-act="reviewFilter" data-f="${k}">${l} (${items.filter(f).length})</button>`).join("");
  $("review-list").innerHTML = items.filter(F[reviewF][1]).map(x => reviewItem(x.q, x.o.options, x.o.correctAnswer, r.answers[x.id], x.st)).join("") || "<p class='meta'>No questions in this filter.</p>";
  showView("review");
}
function renderSaved() {
  const qs = savedQuestions();
  $("saved-body").innerHTML = `<h2>Saved questions</h2><p class="meta">Bookmarked questions with answers and your notes, ready for revision.</p>
    ${qs.length ? `<div class="quiz-actions"><button class="btn primary" data-act="startSpecial" data-kind="saved">Practice saved questions</button></div>` : ""}
    ${qs.map(q => reviewItem(q, q.options, q.correctAnswer, undefined, "neutral")).join("") || "<div class='card'><h3>Nothing saved yet</h3><p class='meta'>Tap Save on any question while practising or reviewing.</p></div>"}`;
}

/* ---------- 12. HISTORY, STATS, DATA CHECK ---------- */
function renderHistory() {
  const h = getHistory();
  $("history-list").innerHTML = h.length ? h.map(r => `<div class="card"><h3>${esc(r.testName)}</h3><p class="meta">${new Date(r.date).toLocaleString()}</p>
    <p class="meta">${r.scorePercent}% · ${r.correct}/${r.totalQuestions} correct · ${fmt(r.timeTakenSec)}</p>
    <div class="card-actions"><button class="btn" data-act="openHistory" data-id="${r.id}">Details</button><button class="btn" data-act="reviewHistory" data-id="${r.id}">Review</button></div></div>`).join("") : "<div class='card'><h3>No attempts yet</h3><p class='meta'>Finish a test and it will appear here.</p></div>";
}
function trendSvg(v) {
  if (v.length < 2) return "<p class='meta'>Finish at least two tests to see your trend.</p>";
  const W = 600, H = 180, p = 28, pts = v.map((x, i) => [p + i * (W - 2 * p) / (v.length - 1), H - p - x / 100 * (H - 2 * p)]);
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score trend">${[0, 50, 100].map(g => { const y = H - p - g / 100 * (H - 2 * p); return `<line x1="${p}" x2="${W - p}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="2" y="${y + 4}" font-size="11" fill="var(--ink-soft)">${g}%</text>`; }).join("")}
    <polyline fill="none" stroke="var(--brand)" stroke-width="2.5" points="${pts.map(q => q.join(",")).join(" ")}"/>${pts.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="var(--accent)"><title>${v[i]}%</title></circle>`).join("")}</svg>`;
}
function renderStats() {
  const h = getHistory(), ss = sectionStats(), tot = Object.values(ss).reduce((s, b) => ({ a: s.a + b.attempted, c: s.c + b.correct, t: s.t + b.timeSec }), { a: 0, c: 0, t: 0 });
  const trend = [...h].reverse().slice(-20).map(r => r.scorePercent), st = streaks(load(K.days, {}));
  const freq = [...detectRepeatsMap().values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length).slice(0, 8);
  const k = (n, l) => `<div class="stat"><span class="stat-num">${n}</span><span class="stat-label">${l}</span></div>`;
  $("stats-body").innerHTML = `<h2>Your progress</h2>
    <div class="stat-grid">${k(h.length, "Tests finished")}${k(tot.a, "Questions answered")}${k(pct(tot.c, tot.a) + "%", "Overall accuracy")}${k(tot.a && tot.t ? Math.round(tot.t / tot.a) + "s" : "–", "Avg time per answer")}${k(st.current, "Day streak")}${k(st.best, "Best streak")}</div>
    <h3>Score trend (last 20 tests)</h3>${trendSvg(trend)}
    <h3>Section strengths</h3><div class="table-scroll"><table class="data-table"><tr><th>Section</th><th>Attempted</th><th>Accuracy</th><th>Avg time</th><th>Level</th></tr>
    ${getSections().map(s => { const b = ss[s]; if (!b) return `<tr><td>${esc(s)}</td><td>0</td><td>–</td><td>–</td><td><span class="tag">Need more data</span></td></tr>`; const acc = pct(b.correct, b.attempted); return `<tr><td>${esc(s)}</td><td>${b.attempted}</td><td>${acc}%</td><td>${b.timeSec ? Math.round(b.timeSec / Math.max(1, b.attempted)) + "s" : "–"}</td><td>${rowLabel(acc, b.attempted)}</td></tr>`; }).join("")}</table></div>
    <h3>Most repeated questions</h3>${freq.length ? freq.map(g => `<div class="freq"><b>${rich(g[0].question)}</b><br><span class="meta">Seen in ${g.length} papers: ${esc(g.map(q => q.paperName + " Q" + q.originalNumber).join(", "))}</span></div>`).join("") + `<div class="quiz-actions"><button class="btn" data-act="startSpecial" data-kind="repeated">Practice repeated questions</button></div>` : "<p class='meta'>No repeats found across the loaded papers yet.</p>"}`;
}
const detectRepeatsMap = () => { const by = new Map(); ALL_QUESTIONS.forEach(q => { const k = normalize(q.question); if (!by.has(k)) by.set(k, []); by.get(k).push(q); }); return by; };
function renderDataCheck() {
  const secs = getSections(), v = VALIDATION;
  $("datacheck-body").innerHTML = `<h2>Question data check</h2>
    <p class="meta">${ALL_QUESTIONS.length} questions in ${PAPERS.length} paper(s), ${secs.length} section(s).</p>
    <div class="stat-grid"><div class="stat"><span class="stat-num">${v.errors.length}</span><span class="stat-label">Errors</span></div><div class="stat"><span class="stat-num">${v.warns.length}</span><span class="stat-label">Warnings</span></div></div>
    ${v.errors.length ? `<h3>Errors</h3>${v.errors.map(e => `<p class="meta">• ${esc(e)}</p>`).join("")}` : "<p class='insight'>No errors found.</p>"}
    ${v.warns.length ? `<h3>Warnings</h3>${v.warns.slice(0, 80).map(e => `<p class="meta">• ${esc(e)}</p>`).join("")}${v.warns.length > 80 ? `<p class="meta">…and ${v.warns.length - 80} more</p>` : ""}` : ""}
    <h3>Questions per section and paper</h3><div class="table-scroll"><table class="data-table"><tr><th>Section</th>${PAPERS.map(p => `<th>${esc(p.name)}</th>`).join("")}<th>Total</th></tr>
    ${secs.map(s => `<tr><td>${esc(s)}</td>${PAPERS.map(p => `<td>${ALL_QUESTIONS.filter(q => q.section === s && q.paperId === p.id).length}</td>`).join("")}<td>${ALL_QUESTIONS.filter(q => q.section === s).length}</td></tr>`).join("")}
    <tr><th>Total</th>${PAPERS.map(p => `<th>${p.count}</th>`).join("")}<th>${ALL_QUESTIONS.length}</th></tr></table></div>`;
}

/* ---------- 13. BACKUP ---------- */
function exportData() {
  const data = {}; [K.hist, K.prefs, K.bm, K.notes, K.srs, K.days].forEach(k => data[k] = load(k, null));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: "wbpsc-clerkship-pyq", version: 2, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" }));
  a.download = `clerkship-pyq-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData(file) {
  const rd = new FileReader();
  rd.onload = async () => {
    try {
      const j = JSON.parse(rd.result); if (j.app !== "wbpsc-clerkship-pyq" || !j.data) throw new Error("bad");
      if (!(await confirmModal("Replace your progress?", "<p>This replaces the history, notes, saved questions and settings on this device with the backup.</p>", "Import"))) return;
      Object.entries(j.data).forEach(([k, v]) => { if (Object.values(K).includes(k) && v !== null) save(k, v); });
      applyPrefs(); toast("Backup imported."); goView("history");
    } catch (e) { toast("That file is not a valid backup."); }
  };
  rd.readAsText(file);
}

/* ---------- 14. EVENTS ---------- */
function refreshCurrent() {
  const v = document.body.dataset.view;
  if (v === "review") openReview(currentRecord); else if (v === "saved") renderSaved(); else if (v === "quiz" && activeQuiz) renderQuiz();
}
const ACTIONS = {
  home: () => leaveQuiz(() => goView("dashboard")),
  nav: d => leaveQuiz(() => goView(d.view)),
  theme: () => setPref("theme", document.body.classList.contains("dark") ? "light" : "dark"),
  fontUp: () => setPref("font", Math.min(1.3, +(prefs.font + 0.1).toFixed(1))),
  fontDown: () => setPref("font", Math.max(0.9, +(prefs.font - 0.1).toFixed(1))),
  focus: () => document.body.classList.toggle("focus"),
  startPaper: d => startPaper(d.id, d.mode),
  startSection: d => startSection(+d.i, d.mode),
  startSpecial: d => startSpecial(d.kind),
  startCustom, launch: launchTest,
  chipsAll: d => document.querySelectorAll(`#${d.target} input`).forEach(i => i.checked = d.v === "1"),
  resume: () => { const p = load(K.prog, null); if (!p) return; activeQuiz = p; startTimerLoop(); renderQuiz(); showView("quiz"); },
  pick: d => pick(+d.i), goto: d => goToQuestion(+d.i),
  prev: () => goToQuestion(activeQuiz.index - 1), next: () => goToQuestion(activeQuiz.index + 1),
  clear: () => { delete activeQuiz.answers[activeQuiz.questions[activeQuiz.index].id]; renderQuiz(); saveProgress(); },
  mark: () => { const id = activeQuiz.questions[activeQuiz.index].id; activeQuiz.marked[id] = !activeQuiz.marked[id]; renderQuiz(); saveProgress(); },
  bm: () => ACTIONS.bmToggle({ id: activeQuiz.questions[activeQuiz.index].id }),
  bmToggle: d => { const b = load(K.bm, {}); if (b[d.id]) delete b[d.id]; else b[d.id] = true; save(K.bm, b); refreshCurrent(); },
  submit: requestSubmit,
  review: () => { reviewF = "all"; openReview(); },
  reviewFilter: d => { reviewF = d.f; openReview(); },
  retryWrong: () => { const r = currentRecord; const pool = r.questionIds.filter(id => statusOf(r, id) !== "correct").map(id => QMAP.get(id)).filter(Boolean); startSpecial("mistakes", pool); },
  print: () => window.print(),
  share: () => { const r = currentRecord, text = `${r.testName}: ${r.score ?? r.correct}/${r.maxScore ?? r.totalQuestions} (${r.scorePercent}%), ${r.correct} correct, ${r.incorrect} wrong, ${fmt(r.timeTakenSec)}. WBPSC Clerkship PYQs`;
    if (navigator.share) navigator.share({ text }).catch(() => {}); else navigator.clipboard?.writeText(text).then(() => toast("Result copied to clipboard")); },
  openHistory: d => { const r = getHistory().find(x => String(x.id) === d.id); if (r) { renderResults(r); showView("results"); } },
  reviewHistory: d => { const r = getHistory().find(x => String(x.id) === d.id); if (r) { reviewF = "all"; openReview(r); } },
  exportData, importData: () => $("import-file").click(),
  clearHistory: async () => { if (await confirmModal("Clear all progress?", "<p>This deletes attempts, notes, saved questions, streaks and review schedules on this device. Export a backup first if unsure.</p>", "Delete everything")) { [K.hist, K.notes, K.bm, K.srs, K.days, K.prog].forEach(k => localStorage.removeItem(k)); toast("Progress cleared."); goView("history"); } }
};
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && ACTIONS[b.dataset.act]) ACTIONS[b.dataset.act](b.dataset, b); });
document.addEventListener("change", e => {
  if (e.target.id === "import-file" && e.target.files[0]) { importData(e.target.files[0]); e.target.value = ""; }
  else if (e.target.id === "config-mode") { $("timer-mode").value = e.target.value === "exam" ? "perTest" : "none"; syncTimer(true); }
  else if (e.target.id === "timer-mode") syncTimer(true);
  else if (e.target.id === "config-count" && $("timer-mode").value === "perTest") syncTimer(true);
});
let noteT; $("note-box").addEventListener("input", e => { clearTimeout(noteT); noteT = setTimeout(() => { if (!activeQuiz) return; const n = load(K.notes, {}), id = activeQuiz.questions[activeQuiz.index].id; if (e.target.value.trim()) n[id] = e.target.value; else delete n[id]; save(K.notes, n); }, 400); });
document.addEventListener("keydown", e => {
  if (!activeQuiz || document.body.dataset.view !== "quiz" || /TEXTAREA|INPUT|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey || !$("modal").classList.contains("hidden")) return;
  const k = e.key.toLowerCase();
  if (/^[1-4]$/.test(k)) pick(+k - 1); else if (k === "n" || k === "arrowright") goToQuestion(activeQuiz.index + 1);
  else if (k === "p" || k === "arrowleft") goToQuestion(activeQuiz.index - 1); else if (k === "m") ACTIONS.mark(); else if (k === "b") ACTIONS.bm(); else if (k === "escape") document.body.classList.remove("focus");
});
let sx = 0, sy = 0;
$("view-quiz").addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
$("view-quiz").addEventListener("touchend", e => {
  if (!activeQuiz || /TEXTAREA/.test(e.target.tagName)) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 40) { if (dx < 0 && activeQuiz.index < activeQuiz.questions.length - 1) goToQuestion(activeQuiz.index + 1); else if (dx > 0) goToQuestion(activeQuiz.index - 1); }
}, { passive: true });
window.addEventListener("pagehide", saveProgress);

/* ---------- 15. INIT ---------- */
function initApp() {
  migrate(); applyPrefs(); showView("loading");
  loadDataFiles(typeof PYQ_YEARS !== "undefined" ? PYQ_YEARS : [], () => {
    PAPERS.sort((a, b) => String(a.year).localeCompare(String(b.year), undefined, { numeric: true }) || a.shift.localeCompare(b.shift));
    ALL_QUESTIONS.forEach(q => QMAP.set(q.id, q)); detectRepeats(); VALIDATION = validateDataset();
    renderDashboard(); renderCustomBuilder(); showView("dashboard");
  });
}
document.addEventListener("DOMContentLoaded", initApp);
