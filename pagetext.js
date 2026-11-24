/* Go Coach — puts the wording from docs/text/en/screen.md into the page: buttons, Settings, the New game box.
   In index.html, data-t="screen.name" sets an element's text, data-t-title its tip, data-t-aria its spoken label and
   data-t-placeholder the grey hint inside a text box. The English left in index.html only shows until this runs.
   An element with data-t must hold text only (no other elements inside), or that content would be replaced. */
(() => {
  'use strict';
  const T = window.GoText.T;
  const SETTERS = [
    ['data-t', (el, v) => { el.textContent = v; }],
    ['data-t-title', (el, v) => el.setAttribute('title', v)],
    ['data-t-aria', (el, v) => el.setAttribute('aria-label', v)],
    ['data-t-placeholder', (el, v) => el.setAttribute('placeholder', v)]
  ];
  for (const [attr, set] of SETTERS) for (const el of document.querySelectorAll(`[${attr}]`)) set(el, T(el.getAttribute(attr)));
})();
