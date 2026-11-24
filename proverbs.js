/* Go Coach — Go principles and proverbs, quoted after the evidence in "Why X beats Y" (explain.js).
   One saying per explanation, chosen by what the play-outs showed, with a sentence tying it back to the position.
   The coach states costs and gains; a saying only sums them up. Quotes are attributed: Sun Tzu in Lionel Giles's
   1910 translation of The Art of War, the Ten Golden Rules of Go (traditionally from Tang-dynasty China),
   and well-known Go proverbs, which have no single author. The wording is in docs/text/en/proverbs.md. Exposed as GoProverbs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoProverbs = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const { T } = TX;

  /* Each situation: the kind of saying, where it comes from (sun, rules or none) and, from proverbs.md, its text and
     how it applies (link: A = the better move, B = the weaker one). */
  const KIND = {
    sacrifice: ['principle', 'rules'], rescue: ['proverb', ''], kill: ['proverb', 'sun'], lost: ['principle', 'rules'],
    punished: ['principle', 'rules'], whole: ['proverb', 'sun'], big: ['principle', 'rules']
  };
  const SAYINGS = {};
  for (const [key, [label, src]] of Object.entries(KIND)) {
    SAYINGS[key] = { label: T('proverbs.' + label), text: T(`proverbs.${key}.text`), src: src ? T('proverbs.' + src) : '', link: T(`proverbs.${key}.link`) };
  }

  /* The first situation that applies, in order of how specific it is. facts: { sacrifice, rescue, kill, lost, punished, attackB, gain }. */
  function pick(f) {
    if (!f || f.gain <= -1.5) return null; /* the evidence does not favour A: no saying */
    const key = f.sacrifice && f.gain >= 1.5 ? 'sacrifice' : f.rescue ? 'rescue' : f.kill ? 'kill' : f.lost ? 'lost'
      : f.punished ? 'punished' : f.attackB && f.gain >= 1.5 ? 'whole' : f.gain >= 3 ? 'big' : null;
    return key ? Object.assign({ key }, SAYINGS[key]) : null;
  }
  /* The line for the chat, with A and B replaced by the actual points. */
  function line(s, A, B) {
    if (!s) return '';
    const link = s.link.replace(/\bA\b/g, A).replace(/\bB\b/g, B);
    return T(s.src ? 'proverbs.line' : 'proverbs.line-plain', { label: s.label, text: s.text, source: s.src, link });
  }

  return { pick, line, SAYINGS };
});
