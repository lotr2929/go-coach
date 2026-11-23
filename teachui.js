/* World of Go — connects the teaching engine (teach.js) to the board and the chat.
   While the lessons are on, the board shows the lesson position and the chat talks to the teacher. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, store, load, settings, saveSettings, click, Play, playView } = G;
  const KEY = 'gocoach.teach';
  const CHIPS = ['Next', 'Explain more', 'Show me', 'Back to game'];

  const session = window.GoTeach.create({
    E, CM: window.GoCommentary, C: window.GoCoach, CUR: window.GoCurriculum,
    say: t => G.say(t),
    click,
    render: () => G.renderPlay(),
    save: p => store(KEY, p),
    load: () => load(KEY, null),
    leave: () => exitTeaching(),
    startGame: () => {
      endTeaching();
      settings.size = 9; settings.colour = 'black'; settings.level = 'easy'; settings.handicap = 5; settings.mode = 'coach';
      saveSettings();
      G.startNewGame();
    }
  });

  function renderTeach() {
    const v = session.view(), s = session.state();
    $('#controls').hidden = true; $('#chat').hidden = false; $('#scorePanel').hidden = true;
    $('#lessonBar').hidden = true; $('#quizOptions').hidden = true;
    playView.set({
      n: 9, board: v.board, last: v.last, ko: v.ko, coords: settings.coords, libs: v.libs, marks: v.marks, hint: v.hint,
      ghost: -1, ghostColor: v.turn, hoverColor: v.turn, terr: v.terr, dead: null, own: v.own, shapes: null
    });
    $('#whoTurn').textContent = session.status();
    $('#posInfo').hidden = true;
    $('#capsInfo').textContent = `Prisoners: ● ${s.caps[1]}  ○ ${s.caps[2]}`;
  }
  function startTeaching() {
    if (Play.thinking) { G.say('Give me a moment: I am still thinking about my move.'); return; }
    if (G.Lesson && G.Lesson.on) G.exitLesson();
    if (G.kifu && G.kifu.on) G.exitKifu(true);
    G.setChips(CHIPS);
    session.start();
  }
  function endTeaching() {
    if (!session.on) return;
    session.exit();
    G.setChips(G.PLAY_CHIPS);
    G.renderPlay();
  }
  function exitTeaching() {
    if (!session.on) return;
    endTeaching();
    G.say('Back to your game. Say "teach me" whenever you want to carry on with the lessons.');
  }

  Object.assign(G, { teaching: session, startTeaching, exitTeaching, renderTeach, teachTap: i => session.tap(i) });
})();
