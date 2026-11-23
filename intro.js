/* World of Go — the "teach me" introduction: a short welcome, a short history, and the choices that follow.
   No DOM here: introui.js shows it in the chat, and test.js runs it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoIntro = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WELCOME = '**Welcome to Go**\n' +
    'Go is an ancient two-player board game that began in China, where it is called weiqi. It is also played in Japan (igo) and Korea (baduk). ' +
    'Players take turns placing stones on a grid, and the aim is to control more territory than your opponent.\n\n' +
    'What would you like to do? Tap a choice, or type its number.';

  /* The choices, in the order they are shown. `words` lets a typed answer pick one. */
  const OPTIONS = [
    { key: 'rules', label: '1  Basic rules of Go', words: /\b(rules?|basics?)\b/ },
    { key: 'history', label: '2  History of Go', words: /\b(history|origins?)\b/ },
    { key: 'play', label: '3  Play a Game', words: /\b(play|games?)\b/ },
    { key: 'lessons', label: '4  Lessons and Puzzles', words: /\b(lessons?|puzzles?)\b/ },
    { key: 'kifu', label: '5  Famous games (Kifu)', words: /\b(kifu|famous|records?|masters?)\b/, first: true }
  ];

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
