/* Builds the Live Go Board: a copy of Go Coach, published as Boon's private claude.ai page, with Claude as the coach
   (Boon, 28 Nov 2026; see docs/decisions.md). Never loaded by the app. Usage: node tools/lgb/build.js <output folder>
   It copies the app's scripts, style, logo, famous games, lessons, puzzles and pages, makes the page from index.html
   (without its <head>, which claude.ai provides) and adds tools/lgb/lgb.js, the bridge to Claude, tools/lgb/mock.js, the changes being tried, and tools/lgb/course.js, the Learn by playing trial. Claude then publishes
   the folder with the Artifact tool (SGF files as text/plain; at most 255 files per publish, so in two parts). */
'use strict';
const fs = require('fs'), path = require('path');
const out = process.argv[2];
if (!out) { console.error('Usage: node tools/lgb/build.js <output folder>'); process.exit(1); }
const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+\.js)"><\/script>/g)].map(m => m[1]);
const copy = rel => { const to = path.join(out, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(root, rel), to); };
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
fs.rmSync(out, { recursive: true, force: true });
[...scripts, 'style.css', 'logo-mark.svg'].forEach(copy);
['kifu', 'lessons', 'puzzles', 'docs/text/en/pages'].forEach(d => walk(d).filter(f => !f.endsWith('README.md')).forEach(copy));
['lgb.js', 'mock.js', 'course.js'].forEach(f => fs.copyFileSync(path.join(__dirname, f), path.join(out, f)));
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trimEnd();
fs.writeFileSync(path.join(out, 'index.html'),
  '<title>Live Go Board</title>\n<link rel="stylesheet" href="style.css">\n' + body + '\n<script src="lgb.js"></script>\n<script src="mock.js"></script>\n<script src="course.js"></script>\n');
console.log('Built', walk(path.relative(root, out) || '.').length, 'files in', out);
