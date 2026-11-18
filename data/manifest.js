/* =====================================================================
   Wise Choice · WBPSC Clerkship Prelims PYQ Series — data/manifest.js
   Exam rules, the 12 topics, section groups, motivational quotes, and the
   list of exam SESSIONS (year → day → shift).

   HOW TO ADD A SESSION (one paper = one year + day + shift)
   1. Copy data/2024-d1-s1.js to data/<year>-d<day>-s<shift>.js and replace the
      questions. The first line must register under the SAME id:
        (window.PAPERS = window.PAPERS || {})['2024-d1-s1'] = { questions:[ ... ] };
   2. Add one line to SESSIONS below.   That's all — the dropdowns and the
      shift slider update by themselves.

   Optional per-session fields
     date  : 'YYYY-MM-DD'  exam date (shown on the card)
     avg   : cohort average score in marks out of `max` (enables "vs average" in Compare shifts)
     rules : { minutes, negative, max } override for a session whose pattern was different
   ===================================================================== */

window.RULES = {
  examName: 'WBPSC Clerkship Prelims',
  questions: 100,          // standard paper size
  minutes: 90,             // standard duration  (verify against the latest notification)
  negative: 0.25,          // marks deducted per wrong answer (1 mark per correct answer)
  perQ: 1,
  dailyGoal: 50,           // default daily practice goal (questions) — editable in Settings
  nextExam: null,          // e.g. { name: 'WBPSC Clerkship Prelims 2027', date: '2027-02-14' } — also editable in Settings

  /* 12 topics. `n` must equal the "s" field of every question EXACTLY.
     i = icon · k = short code (charts) · h = hue (each subject keeps its own colour everywhere) · g = section group */
  topics: [
    { n: 'English',             i: '🔤', k: 'ENG',  h: 262, g: 'Language' },
    { n: 'Mathematics',         i: '🧮', k: 'MATH', h: 199, g: 'Quant'    },
    { n: 'West Bengal Specific',i: '🐅', k: 'WB',   h: 28,  g: 'GS'       },
    { n: 'Indian Polity',       i: '🏛️', k: 'POL',  h: 222, g: 'GS'       },
    { n: 'Indian Economy',      i: '💹', k: 'ECO',  h: 150, g: 'GS'       },
    { n: 'General Science',     i: '🔬', k: 'SCI',  h: 172, g: 'GS'       },
    { n: 'Indian Geography',    i: '🗺️', k: 'IGEO', h: 95,  g: 'GS'       },
    { n: 'Physical Geography',  i: '🌋', k: 'PGEO', h: 12,  g: 'GS'       },
    { n: 'Ancient History',     i: '🏺', k: 'ANC',  h: 48,  g: 'GS'       },
    { n: 'Medieval History',    i: '🏰', k: 'MED',  h: 330, g: 'GS'       },
    { n: 'Modern History',      i: '📜', k: 'MOD',  h: 285, g: 'GS'       },
    { n: 'GK & Current Affairs',i: '📰', k: 'GK',   h: 350, g: 'GS'       }
  ],

  /* Section groups used by the cut-off simulator. `w` = default questions in the real paper. */
  groups: [
    { id: 'Language', n: 'English',         w: 30 },
    { id: 'Quant',    n: 'Mathematics',     w: 30 },
    { id: 'GS',       n: 'General Studies', w: 40 }
  ]
};

/* ---- Sessions: year → day → shift ---- */
window.SESSIONS = [
  //{ id: '2024-d1-s1', year: 2024, day: 1, shift: 1, date: '2024-02-10', file: 'data/2024-d1-s1.js' },
  //{ id: '2024-d1-s2', year: 2024, day: 1, shift: 2, date: '2024-02-10', file: 'data/2024-d1-s2.js' },
  { id: '2023-d1-s1', year: 2023, day: 1, shift: 1, date: '2023-11-16', file: 'data/2023-d1-s1.js' },
  { id: '2023-d1-s2', year: 2023, day: 1, shift: 2, date: '2023-11-16', file: 'data/2023-d1-s2.js' },
  { id: '2023-d2-s1', year: 2023, day: 1, shift: 1, date: '2023-11-17', file: 'data/2023-d2-s1.js' },
  { id: '2023-d2-s2', year: 2023, day: 1, shift: 2, date: '2023-11-17', file: 'data/2023-d2-s2.js' },
  { id: '2019-d1-s1', year: 2019, day: 1, shift: 1, date: '2020-01-25', file: 'data/2019-d1-s1.js' },
  { id: '2019-d1-s2', year: 2019, day: 1, shift: 2, date: '2020-01-25', file: 'data/2019-d1-s2.js' }
];

/* ---- Motivational quotes (one per day) ---- */
window.QUOTES = [
  'A clerk’s desk is built one correct answer at a time.',
  'Review today’s mistakes — they are tomorrow’s marks.',
  'Speed comes from accuracy, accuracy comes from revision.',
  'Skipping a doubtful question is also a skill. Practise it.',
  'Mock tests are rehearsals. Make the mistakes here, not in the exam hall.',
  'Consistency beats intensity — 50 questions a day wins the cut-off.',
  'Every shift has a different paper. Your habits should not.',
  'Small daily progress adds up to a job letter.',
  'Be patient with the syllabus, strict with the schedule.',
  'Focus on the process; the rank follows.',
  'One more topic. One more test. One step closer.',
  'Don’t count the days; make the days count.',
  'Hard work compounds. Start the next question.',
  'Revision is where marks are made.',
  'Your future self in the Writers’ Building is watching. Keep going.'
];
