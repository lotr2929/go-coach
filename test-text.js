/* Go Coach tests for the app's wording in docs/text: the welcome, the tour, the whole pages and the famous-games list.
   Run by test.js (node test.js runs everything). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const TEXT_DIR = path.join(__dirname, 'docs', 'text', 'en');
const read = (...p) => fs.readFileSync(path.join(TEXT_DIR, ...p), 'utf8');

module.exports = async function (t) {
  const MT = require('./make-text.js'), TX = require('./text.js'), C = require('./coach.js'), HISTORY = require('./history.js');

  await t('docs/text is well formed and text-data.js is up to date', () => {
    const { data, problems } = MT.collect();
    assert.deepStrictEqual(problems, []);
    const built = fs.readFileSync(MT.OUT, 'utf8').replace(/\r\n/g, '\n');
    assert.strictEqual(built, MT.render(data), 'text-data.js is out of date: run node make-text.js');
  });
  await t('the wording reader finds names and text, and reports mistakes', () => {
    const into = {}, problems = [];
    MT.parseArea('demo', 'A note.\n\n## one\nFirst line\nsecond line\n\n## two\n\nPara one.\n\nPara two.\n\n## one\nagain\n## Bad Name\nx\n## empty\n', into, problems);
    assert.deepStrictEqual(into, { 'demo.one': 'First line\nsecond line', 'demo.two': 'Para one.\n\nPara two.' });
    assert.strictEqual(problems.length, 3, problems.join(' | '));
  });
  await t('T fills in {names} and marks a missing name', () => {
    assert.strictEqual(TX.T('welcome.whatisgo'), 'What is Go?');
    const warn = console.warn; console.warn = () => {}; /* the app warns about a missing name; not needed here */
    try { assert.strictEqual(TX.T('no.such-name'), '[no.such-name]'); } finally { console.warn = warn; }
    assert.strictEqual(TX.page('history'), 'docs/text/en/pages/history.md');
  });
  await t('every name the code asks for is in docs/text', () => {
    const missing = [];
    /* every whole name in quotes, such as 'coach.hint', whose first part is one of the files in docs/text/en; text.js itself only explains T */
    const areas = fs.readdirSync(TEXT_DIR).filter(f => /\.md$/.test(f)).map(f => f.replace(/\.md$/, ''));
    const nameRe = new RegExp(`'((?:${areas.join('|')})\\.[a-z0-9.-]*[a-z0-9])'`, 'g');
    for (const f of fs.readdirSync(__dirname).filter(f => /\.js$/.test(f) && !/^test/.test(f) && f !== 'text.js' && f !== 'text-data.js')) {
      const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
      for (const m of src.matchAll(nameRe)) if (!/\.(js|md|json)$/.test(m[1]) && !TX.has(m[1])) missing.push(f + ': ' + m[1]); /* file names are not text names */
      /* A file with a short form, such as const T = (k, v) => TX.T('commentary.' + k, v): every quoted name inside its T(…) calls. */
      const short = src.match(/\.T\('([a-z-]+)\.' \+ k, v\)/);
      if (short) for (const call of src.matchAll(/\bT\(([^(){]*)/g)) for (const q of call[1].matchAll(/'([a-z0-9][a-z0-9.-]*[a-z0-9])'/g)) {
        if (!TX.has(short[1] + '.' + q[1])) missing.push(`${f}: ${short[1]}.${q[1]}`);
      }
    }
    for (const id of require('./coach.js').TERM_IDS) if (!TX.has('terms.' + id)) missing.push('terms.' + id);
    /* names the code builds from parts */
    for (const k of C.WELCOME_KEYS) if (!TX.has('welcome.' + k)) missing.push('welcome.' + k);
    for (const id of C.LESSON_IDS) if (id !== 'firstmove' && !TX.has('lesson-help.' + id)) missing.push('lesson-help.' + id);
    for (const m of fs.readFileSync(path.join(__dirname, 'tour.js'), 'utf8').matchAll(/\{ key: '([a-z]+)'/g))
      for (const part of ['title', 'text']) if (!TX.has(`tour.${m[1]}.${part}`)) missing.push(`tour.${m[1]}.${part}`);
    for (const L of require('./lessons.js').list) {
      for (const part of ['title', 'text'].concat(L.type === 'quiz' ? ['options', 'wrong', 'explain'] : [])) if (!TX.has(`lessons.${L.id}.${part}`)) missing.push(`lessons.${L.id}.${part}`);
      if (L.type === 'quiz' && !(L.options.length > L.answer)) missing.push(`lessons.${L.id}.options (the right answer is option ${L.answer + 1})`);
    }
    for (const st of require('./curriculum.js').steps) {
      if (!TX.has(`curriculum.${st.id}.title`)) missing.push(`curriculum.${st.id}.title`);
      st.scenes.forEach((sc, k) => { for (const part of ['text', 'more']) if (!TX.has(`curriculum.${st.id}.${k + 1}.${part}`)) missing.push(`curriculum.${st.id}.${k + 1}.${part}`); });
    }
    for (const p of ['whatisgo', 'history']) for (const part of ['title', 'opened']) if (!TX.has(`pages.${p}-${part}`)) missing.push(`pages.${p}-${part}`);
    assert.deepStrictEqual(missing, []);
  });
  await t('the welcome: numbers, words and help pick the right request', () => {
    const W = require('./welcome.js');
    assert.deepStrictEqual(W.OPTIONS.map(o => o.key), C.WELCOME_KEYS);
    assert.deepStrictEqual(['1', '2', '3', '4', '5'].map(W.match), ['whatisgo', 'history', 'teach', 'coach', 'tour']);
    assert.strictEqual(W.match('What is Go?'), 'whatisgo');
    assert.strictEqual(W.match('How do I use the app?'), 'tour');
    assert.strictEqual(W.match('Help'), 'help');
    assert.strictEqual(W.match('coach me'), 'coach');
    assert.strictEqual(W.match('what is ko?'), null);
    assert.strictEqual(W.match('D4'), null);
    assert.strictEqual(W.OPTIONS[0].label, '1  What is Go?');
    /* The saved welcome must stay word for word as before, or chats saved on phones would lose their buttons. */
    assert.strictEqual(C.INTRO, C.INTRO_TOP + '\n\n1. What is Go?\n2. A Short History of Go.\n3. Teach me.\n4. Coach me.\n5. How to use the app.\n\n' + C.INTRO_END);
    assert(/^Hello, I am your Go coach\./.test(C.INTRO_TOP));
  });
  await t('whatisgo.md reads as a page with no mistakes', () => {
    const page = HISTORY.parse(read('pages', 'whatisgo.md'));
    assert.strictEqual(page.title, 'What is Go?');
    assert(page.blocks.length > 10 && page.blocks[0].t === 'lead');
    assert.deepStrictEqual(HISTORY.problems(page), []);
  });
  await t('history.md is read into a page whose sources all check out', () => {
    const page = HISTORY.parse(read('pages', 'history.md'));
    assert.strictEqual(page.title, 'A history of Go');
    assert(page.blocks.some(b => b.t === 'lead') && page.blocks.filter(b => b.t === 'h').length >= 6 && page.blocks.some(b => b.t === 'refs'));
    assert(page.refs.length >= 11);
    assert.deepStrictEqual(HISTORY.problems(page), [], 'fix history.md: ' + HISTORY.problems(page).join(' '));
  });
  await t('the Kifu shortlist is well formed', () => {
    const MK = require('./make-kifu.js');
    const cats = MK.parsePicks(read('lists', 'kifu-picks.md')), seen = new Set();
    const games = cats.flatMap(c => c.games);
    assert(cats.length >= 5 && games.length >= 90, 'expected about 100 games, found ' + games.length);
    for (const c of cats) {
      assert(c.title && c.blurb, 'every category needs a title and a description: ' + c.title);
      for (const g of c.games) {
        assert(/\.sgf$/.test(g.src) && g.title && g.note, 'incomplete line in kifu-picks.md: ' + g.src);
        assert(!seen.has(g.src), 'listed twice: ' + g.src); seen.add(g.src);
        assert(!/21x21/.test(g.src), 'boards bigger than 19x19 cannot be labelled: ' + g.src);
      }
    }
  });
};
