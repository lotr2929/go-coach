/* World of Go — teaching curriculum: scripted 9×9 positions, with their words in docs/text/en/curriculum.md.
   Plain data, no DOM. Each step has scenes; a scene can carry a task the learner must solve.
   Design notes (from the British Go Association's teaching advice and others): 9×9 only, one idea at a time,
   rules shown in context, territory as the aim with capturing as a tool, ko late, finish with a first game. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoCurriculum = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const { T } = TX;

  const STARS = ['C3', 'G3', 'C7', 'G7', 'E5'];
  const NEXT = T('curriculum.next');
  const WALLS = { black: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'], white: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'] };

  /* next: the scene ends by inviting the learner to go on (curriculum.next). The words of each scene are added below. */
  const steps = [
    {
      id: 'space',
      scenes: [
        { task: { type: 'any', praise: STARS } },
        { black: ['C3', 'G7'], white: ['G3', 'C7'], influence: true, task: { type: 'any' } }
      ]
    },
    {
      id: 'liberties',
      scenes: [
        { black: ['E5', 'A3', 'J9'], libs: true, next: true },
        { black: ['E5'], libs: true, task: { type: 'move', solution: ['D5', 'F5', 'E4', 'E6'] } }
      ]
    },
    {
      id: 'capture',
      scenes: [
        { black: ['D5', 'F5', 'E4'], white: ['E5'], libs: true, task: { type: 'move', solution: ['E6'] } },
        { black: ['D5', 'D6', 'F5', 'F6', 'E4'], white: ['E5', 'E6'], libs: true, task: { type: 'move', solution: ['E7'] } }
      ]
    },
    {
      id: 'escape',
      scenes: [
        { black: ['E5'], white: ['D5', 'F5', 'E4'], libs: true, task: { type: 'move', solution: ['E6'] } },
        { black: ['D5', 'E4'], marks: { D4: 'A', E5: 'B' }, task: { type: 'move', solution: ['D4', 'E5'] } }
      ]
    },
    {
      id: 'territory',
      scenes: [
        { black: WALLS.black.slice(), white: WALLS.white.slice(), terr: 'auto', next: true },
        { black: WALLS.black.slice(), white: WALLS.white.slice(), terr: 'auto', task: { type: 'answer', answer: 36 } },
        { black: WALLS.black.slice(), white: WALLS.white.slice(), terr: 'auto', next: true }
      ]
    },
    {
      id: 'start',
      scenes: [
        { black: ['C1', 'C2', 'B3', 'A3'], shade: { black: ['A1', 'B1', 'A2', 'B2'] }, next: true },
        { black: ['E1', 'E2', 'F3', 'G3', 'H2', 'H1'], shade: { black: ['F1', 'G1', 'F2', 'G2'] }, next: true },
        { black: ['D5', 'D6', 'E4', 'F4', 'G5', 'G6', 'E7', 'F7'], shade: { black: ['E5', 'F5', 'E6', 'F6'] }, next: true },
        { task: { type: 'any', praise: STARS } }
      ]
    },
    {
      id: 'eyes',
      scenes: [
        { black: ['A2', 'B2', 'C2', 'D2', 'B1'], white: ['C3', 'D3', 'E2'], marks: { D1: 'A' }, task: { type: 'move', solution: ['D1'] } }
      ]
    },
    {
      id: 'rules',
      scenes: [
        { white: ['D5', 'F5', 'E4', 'E6'], marks: { E5: 'A' }, task: { type: 'try', at: 'E5', reason: 'suicide' } },
        { black: ['D6', 'C5', 'D4'], white: ['E6', 'F5', 'E4', 'D5'], task: { type: 'move', solution: ['E5'] }, koNote: true }
      ]
    },
    {
      id: 'play',
      scenes: [{}]
    }
  ];

  /* The words, from curriculum.md: step.title, and for scene k (from 1) step.k.text, .goal, .praise, .after, .ok, .wrong, .hint, .ko-note, .more. */
  for (const st of steps) {
    st.title = T(`curriculum.${st.id}.title`);
    st.scenes.forEach((sc, k) => {
      const name = part => `curriculum.${st.id}.${k + 1}.${part}`;
      const opt = part => (TX.has(name(part)) ? T(name(part)) : undefined);
      sc.text = T(name('text')).split(/\n\n+/).concat(sc.next ? [NEXT] : []);
      delete sc.next;
      if (sc.task) {
        const fields = { goal: 'goal', praiseText: 'praise', after: 'after', ok: 'ok', wrong: 'wrong', hint: 'hint' };
        for (const [field, part] of Object.entries(fields)) { const v = opt(part); if (v !== undefined) sc.task[field] = v; }
      }
      if (sc.koNote) sc.koNote = T(name('ko-note'));
      sc.more = T(name('more'));
    });
  }

  return { steps, STARS };
});
