/* World of Go — the "teach me" introduction: a short welcome, a short history, and the choices that follow.
   No DOM here: introui.js shows it in the chat, and test.js runs it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoIntro = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const T = (k, v) => TX.T('intro.' + k, v), A = (k, v) => TX.T('app.' + k, v); /* wording: docs/text/en/intro.md and app.md */

  const WELCOME = T('welcome');

  /* The choices, in the order they are shown. `words` lets a typed answer pick one. */
  const OPTIONS = [
    { key: 'rules', words: /\b(rules?|basics?)\b/ },
    { key: 'history', words: /\b(history|origins?)\b/ },
    { key: 'play', words: /\b(play|games?)\b/ },
    { key: 'lessons', words: /\b(lessons?|puzzles?)\b/ },
    { key: 'kifu', words: /\b(kifu|famous|records?|masters?)\b/, first: true }
  ];
  OPTIONS.forEach((o, i) => { o.label = `${i + 1}  ${T(o.key)}`; }); /* the labels are in intro.md */

  /* Which choice does a typed answer mean? Returns its key, or null when it is something else. */
  function match(raw) {
    const t = String(raw).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || t.split(' ').length > 8 || /\b[a-hj-t]\d{1,2}\b/.test(t)) return null;
    const num = t.match(/^(?:option |number |choice )?(\d)$/);
    if (num) { const o = OPTIONS[+num[1] - 1]; return o ? o.key : null; }
    const order = OPTIONS.slice().sort((a, b) => (b.first ? 1 : 0) - (a.first ? 1 : 0)); /* choices flagged "first" are tried before the others */
    const o = order.find(x => x.words.test(t));
    return o ? o.key : null;
  }

  return { WELCOME, OPTIONS, match };
});
