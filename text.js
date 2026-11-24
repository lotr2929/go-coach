/* Go Coach — the app's wording. The words live in docs/text/<language>/*.md, where they can be edited and translated;
   make-text.js copies them into text-data.js, and this file looks them up.
   T('welcome.top') gives one piece of text. T('tour.end', { n: 5 }) also fills in {n}.
   A missing name shows as [its name] in the app, so it is easy to spot, and test-text.js reports it. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text-data.js'));
  else root.GoText = factory(root.GoTextData);
})(typeof self !== 'undefined' ? self : this, function (DATA) {
  'use strict';
  const lang = 'en'; /* the only language so far; a translation falls back on English for anything it lacks */

  function T(key, vars) {
    const v = (DATA[lang] && DATA[lang][key]) || DATA.en[key];
    if (v === undefined) {
      if (typeof console !== 'undefined') console.warn('Missing text: ' + key);
      return '[' + key + ']';
    }
    return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : v;
  }
  /* Where a whole page (read by page.js) is kept, such as 'whatisgo' or 'history'. */
  const page = name => `docs/text/${lang}/pages/${name}.md`;

  return { T, page, has: key => key in DATA.en };
});
