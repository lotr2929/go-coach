/* Go Coach — the welcome menu: the five things the coach offers first, and which one a typed request means.
   The welcome text itself is coach.js's INTRO. No DOM here: welcomeui.js shows it, and test.js runs it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoWelcome = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* In the order of the numbers in the welcome. `words` lets a request in your own words pick one. */
  const OPTIONS = [
    { key: 'whatisgo', label: '1  What is Go?', words: /^(what('s| is) go|about go|tell me about go)\b/ },
    { key: 'history', label: '2  A Short History of Go', words: /^(a )?(short )?history( of go)?$/ },
    { key: 'teach', label: '3  Teach me', words: /^teach me$/ },
    { key: 'coach', label: '4  Coach me', words: /^(coach me|coach mode)$/ },
    { key: 'tour', label: '5  How to use the app', words: /^(how (do i|to|can i) use (the |this )?app|(app )?tour|show me (around|the app)|how does (the |this )?app work)\b/ }
  ];

  /* Which request does a message mean? A key from OPTIONS, 'help', or null when it is something else. */
  function match(raw) {
    const t = String(raw).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^(help|menu|start|home)$/.test(t)) return 'help';
    const num = t.match(/^(?:option |number |choice )?([1-5])$/);
    if (num) return OPTIONS[+num[1] - 1].key;
    const o = OPTIONS.find(x => x.words.test(t));
    return o ? o.key : null;
  }

  return { OPTIONS, match };
});
