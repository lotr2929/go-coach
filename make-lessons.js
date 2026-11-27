/* Go Coach: checks every lesson file in lessons/ and rebuilds lessons/index.json, the list the app shows.
   Run: node make-lessons.js   (test.js fails if the list is out of date or a lesson has a problem; lessons/README.md has the format)
   A lesson's id is its file name without .sgf, so file names must be unique across the folders. */
const fs = require('fs'), path = require('path');
const E = require('./engine.js'), PR = require('./problems.js');
const DIR = path.join(__dirname, 'lessons');

function build() {
  const list = [], errors = [], seen = new Set();
  for (const band of fs.readdirSync(DIR).filter(d => fs.statSync(path.join(DIR, d)).isDirectory()).sort()) {
    for (const f of fs.readdirSync(path.join(DIR, band)).filter(f => f.endsWith('.sgf')).sort()) {
      const id = f.replace(/\.sgf$/, ''), rel = `lessons/${band}/${f}`;
      if (!/^[a-z0-9-]+$/.test(id)) errors.push(`${rel}: use only lower-case letters, digits and hyphens in the file name`);
      if (seen.has(id)) errors.push(`${rel}: another lesson already has the file name ${f}`);
      seen.add(id);
      const L = PR.fromSGF(fs.readFileSync(path.join(DIR, band, f), 'utf8'), id);
      const bad = PR.problemsWith(L, E);
      for (const b of bad) errors.push(`${rel}: ${b}`);
      if (!bad.length) list.push({ id, file: rel, title: L.title, kyu: L.kyu, band });
    }
  }
  list.sort((a, b) => b.kyu - a.kyu || a.id.localeCompare(b.id)); /* easiest (most kyu) first */
  return { index: { lessons: list }, errors };
}

if (require.main === module) {
  const { index, errors } = build();
  if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} problem(s): lessons/index.json not written.`); process.exit(1); }
  fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index, null, 1) + '\n');
  console.log(`Wrote lessons/index.json: ${index.lessons.length} lessons.`);
}
module.exports = { build };
