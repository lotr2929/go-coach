/* Go Coach — the welcome menu: the five things the coach offers first, and which one a typed request means.
   The welcome text itself is coach.js's INTRO; the choices' wording is in docs/text/en/welcome.md.
   No DOM here: welcomeui.js shows it, and the tests run it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoWelcome = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';

  /* In the order of the numbers in the welcome (coach.js WELCOME_KEYS). `words` lets a request in your own words pick one. */
  const OPTIONS = [
    { key: 'whatisgo', words: /^(what('s| is) go|about go|tell me about go)\b/ },
    { key: 'history', words: /^(a )?(short )?history( of go)?$/ },
    { key: 'teach', words: /^teach me$/ },
    { key: 'coach', words: /^(coach me|coach mode)$/ },
    { key: 'tour', words: /^(how (do i|to|can i) use (the |this )?app|(app )?tour|show me (around|the app)|how does (the |this )?app work)\b/ }
  ];
  OPTIONS.forEach((o, i) => { o.label = `${i + 1}  ${TX.T('welcome.' + o.key)}`; });

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
