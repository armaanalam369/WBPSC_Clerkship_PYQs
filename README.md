# Wise Choice · WBPSC Clerkship Prelims PYQ Series

Static web app (no build step). Open through any web server, e.g. `python3 -m http.server` then visit http://localhost:8000.
(Opening index.html directly works too, but offline/PWA install needs http(s).)

## Adding a paper (year → day → shift)
1. Copy `data/2024-d1-s1.js` to `data/<year>-d<day>-s<shift>.js`, replace the questions, keep the registration id the same as the file name.
2. Add one line to `SESSIONS` in `data/manifest.js` (optional: `date`, `avg`, `rules:{minutes,negative}` overrides).
3. Run `node tools/validate.js` to catch wrong topics, bad answer indexes, duplicates.

The year dropdown, day dropdown and shift slider update automatically.
The three bundled papers are SAMPLE data (2 questions per topic) — replace them with real papers.
Exam rules (100 Q / 90 min / −0.25) live at the top of `data/manifest.js` — confirm them against the latest WBPSC notification.

## Layout
data/ manifest + papers · js/ store(IndexedDB) util engine charts tools card analysis app · assets/ logo & icons · sw.js + manifest.webmanifest = PWA
Storage keys use the `ck_` prefix and the IndexedDB database `wise-clerkship`, so it never collides with the WBCS app.
