/* Go Coach: checks every lesson file in lessons/ and every puzzle in puzzles/ and rebuilds their index.json, the lists the app uses.
   Run: node make-lessons.js   (test.js fails if the list is out of date or a lesson has a problem; lessons/README.md has the format)
   A lesson's id is its file name without .sgf, so file names must be unique across the folders. */
const fs = require('fs'), path = require('path');
const E = require('./engine.js'), PR = require('./problems.js');

function build(name = 'lessons') {
  const DIR = path.join(__dirname, name);
  const list = [], errors = [], seen = new Set();
  for (const band of fs.readdirSync(DIR).filter(d => fs.statSync(path.join(DIR, d)).isDirectory()).sort()) {
    for (const f of fs.readdirSync(path.join(DIR, band)).filter(f => f.endsWith('.sgf')).sort()) {
      const id = f.replace(/\.sgf$/, ''), rel = `${name}/${band}/${f}`;
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
  for (const name of ['lessons', 'puzzles']) {
    if (!fs.existsSync(path.join(__dirname, name))) continue;
    const { index, errors } = build(name);
    if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} problem(s): ${name}/index.json not written.`); process.exit(1); }
    fs.writeFileSync(path.join(__dirname, name, 'index.json'), JSON.stringify(index, null, 1) + '\n');
    console.log(`Wrote ${name}/index.json: ${index.lessons.length} ${name}.`);
  }
}
module.exports = { build };
