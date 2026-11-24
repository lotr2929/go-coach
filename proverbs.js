/* Go Coach — Go principles and proverbs, quoted after the evidence in "Why X beats Y" (explain.js).
   One saying per explanation, chosen by what the play-outs showed, with a sentence tying it back to the position.
   The coach states costs and gains; a saying only sums them up. Quotes are attributed: Sun Tzu in Lionel Giles's
   1910 translation of The Art of War, the Ten Golden Rules of Go (traditionally from Tang-dynasty China),
   well-known Go proverbs, which have no single author, and words from Go masters (marked "attributed to" until checked). The wording is in docs/text/en/proverbs.md. Exposed as GoProverbs. */
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
  /* Words from Go masters and teachers for some situations, used instead of the saying half the time. In proverbs.md each
     situation may have "<key>.master", "<key>.master2" and so on. A quote checked against its book carries ".source";
     one not yet checked shows "attributed to" with ".name". ".label" (optional) replaces "Go master", e.g. for a stratagem. */
  const MASTERS = {};
  for (const key of Object.keys(KIND)) {
    for (let n = 1; n <= 5; n++) {
      const m = `proverbs.${key}.master${n === 1 ? '' : n}`;
      if (!TX.has(m + '.text')) continue;
      (MASTERS[key] = MASTERS[key] || []).push({
        label: TX.has(m + '.label') ? T(m + '.label') : T('proverbs.master'), text: T(m + '.text'), link: T(m + '.link'),
        src: TX.has(m + '.source') ? T(m + '.source') : T('proverbs.attributed', { name: T(m + '.name') })
      });
    }
  }

  /* The first situation that applies, in order of how specific it is. facts: { sacrifice, rescue, kill, lost, punished, attackB, gain }. */
  /* rnd: a number from 0 to 1 (Math.random by default) choosing between the saying and a master's words. */
  function pick(f, rnd) {
    if (!f || f.gain <= -1.5) return null; /* the evidence does not favour A: no saying */
    const key = f.sacrifice && f.gain >= 1.5 ? 'sacrifice' : f.rescue ? 'rescue' : f.kill ? 'kill' : f.lost ? 'lost'
      : f.punished ? 'punished' : f.attackB && f.gain >= 1.5 ? 'whole' : f.gain >= 3 ? 'big' : null;
    if (!key) return null;
    const r = rnd === undefined ? Math.random() : rnd, list = MASTERS[key];
    if (!list || r >= 0.5) return Object.assign({ key, master: false }, SAYINGS[key]);
    return Object.assign({ key, master: true }, list[Math.min(list.length - 1, Math.floor(r * 2 * list.length))]);
  }
  /* The line for the chat, with A and B replaced by the actual points. */
  function line(s, A, B) {
    if (!s) return '';
    const link = s.link.replace(/\bA\b/g, A).replace(/\bB\b/g, B);
    return T(s.src ? 'proverbs.line' : 'proverbs.line-plain', { label: s.label, text: s.text, source: s.src, link });
  }

  return { pick, line, SAYINGS, MASTERS };
});
