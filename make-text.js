/* Go Coach — copies the app's wording from docs/text/<language>/*.md into text-data.js, which the app loads (text.js looks it up).
   Run: node make-text.js   (deploy.bat runs it before every deploy, and test-text.js checks text-data.js is up to date.)
   One .md file per area of the app: welcome.md gives the names welcome.top, welcome.end and so on.
   In a file, each "## name" heading labels one piece of text: everything under it up to the next heading.
   Anything before the first heading is a note for editors and translators, and is left out.
   Subfolders (such as pages/, read whole by the app) are not part of this. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'docs', 'text');
const OUT = path.join(__dirname, 'text-data.js');

/* One area file into { 'area.name': text }. Problems are collected rather than thrown, so all of them can be reported at once. */
function parseArea(area, md, into, problems) {
  let name = null, lines = [];
  const flush = () => {
    if (name === null) return;
    const key = area + '.' + name;
    const text = lines.join('\n').replace(/^\n+|\n+$/g, '');
    if (!text) problems.push(`${area}.md: "## ${name}" has no text under it`);
    else if (key in into) problems.push(`${area}.md: "## ${name}" appears twice`);
    else into[key] = text;
  };
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const h = raw.match(/^##\s+(.*?)\s*$/);
    if (h) {
      flush();
      name = h[1];
      lines = [];
      if (!/^[a-z0-9][a-z0-9.-]*$/.test(name)) { problems.push(`${area}.md: the heading "## ${name}" may only use small letters, numbers, dots and dashes`); name = null; }
    } else if (name !== null) lines.push(raw.replace(/\s+$/, ''));
  }
  flush();
}

/* Every language folder under docs/text: { en: { 'welcome.top': '…', … }, … }. */
function collect(root = ROOT) {
  const data = {}, problems = [];
  for (const lang of fs.readdirSync(root).sort()) {
    const dir = path.join(root, lang);
    if (!fs.statSync(dir).isDirectory()) continue;
    data[lang] = {};
    for (const f of fs.readdirSync(dir).sort()) {
      if (!/\.md$/.test(f) || !fs.statSync(path.join(dir, f)).isFile()) continue;
      parseArea(f.replace(/\.md$/, ''), fs.readFileSync(path.join(dir, f), 'utf8'), data[lang], problems);
    }
  }
  if (!data.en) problems.push('docs/text/en is missing: English is the language every other one falls back on');
  return { data, problems };
}

function render(data) {
  return '/* Made by make-text.js from the files in docs/text. Do not edit here: change the .md files and run node make-text.js. */\n' +
    '(function (root, data) {\n' +
    "  if (typeof module === 'object' && module.exports) module.exports = data;\n" +
    '  else root.GoTextData = data;\n' +
    "})(typeof self !== 'undefined' ? self : this, " + JSON.stringify(data, null, 1) + ');\n';
}

if (require.main === module) {
  const { data, problems } = collect();
  if (problems.length) { console.log('Nothing was written. Please fix:\n' + problems.join('\n')); process.exit(1); }
  fs.writeFileSync(OUT, render(data));
  console.log(`Wrote text-data.js: ${Object.keys(data.en).length} pieces of English text` +
    (Object.keys(data).length > 1 ? ', and ' + Object.keys(data).filter(l => l !== 'en').join(', ') : '') + '.');
}

module.exports = { parseArea, collect, render, OUT };
