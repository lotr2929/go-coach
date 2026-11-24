/* Go Coach — Go principles and proverbs, quoted after the evidence in "Why X beats Y" (explain.js).
   One saying per explanation, chosen by what the play-outs showed, with a sentence tying it back to the position.
   The coach states costs and gains; a saying only sums them up. Quotes are attributed: Sun Tzu in Lionel Giles's
   1910 translation of The Art of War, the Ten Golden Rules of Go (traditionally from Tang-dynasty China),
   and well-known Go proverbs, which have no single author. Exposed as GoProverbs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoProverbs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUN = '(Sun Tzu, The Art of War)', RULES = '(Ten Golden Rules of Go)';
  /* Each situation: the saying, where it comes from, and how it applies (A = the better move, B = the weaker one). */
  const SAYINGS = {
    sacrifice: { label: 'Go principle', text: 'Sacrifice stones to gain the initiative.', src: RULES,
      link: 'A gives up a stone, but what it gains elsewhere is worth more.' },
    rescue: { label: 'Go proverb', text: 'Don’t go fishing while your house is on fire.', src: '',
      link: 'Saving your own group comes before taking points elsewhere: B leaves it to die.' },
    kill: { label: 'Go proverb', text: 'In war, the way is to avoid what is strong and to strike at what is weak.', src: SUN,
      link: 'The weak group is the target: A catches it, B lets it get away.' },
    lost: { label: 'Go principle', text: 'Enter the opponent’s sphere gently.', src: RULES,
      link: 'A stone played too deep into the opponent’s area has no room to live, so B only feeds the opponent.' },
    punished: { label: 'Go principle', text: 'Be careful; do not move rashly.', src: RULES,
      link: 'B leaves a cutting point the opponent can use straight away.' },
    whole: { label: 'Go proverb', text: 'The best thing of all is to take the enemy’s country whole and intact; to shatter and destroy it is not so good.', src: SUN,
      link: 'A gains more by building than B gains by attacking.' },
    big: { label: 'Go principle', text: 'Give up the small to take the large.', src: RULES,
      link: 'Both moves have a point, but the area A claims is worth more.' }
  };

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
    return `${s.label}: "${s.text}"${s.src ? ' ' + s.src + '.' : ''} ${link}`;
  }

  return { pick, line, SAYINGS };
});
