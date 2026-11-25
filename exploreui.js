/* World of Go — connects the exploration engine (explore.js) to the board and the chat.
   While exploring, the board shows a copy of your game that you step through; your real game is not touched. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, click, Play, playView, settings } = G;
  const CHIPS = ['Next', 'Back', 'Another reply', 'Back to game'];

  const session = window.GoExplore.create({
    E, CM: window.GoCommentary, C: window.GoCoach,
    say: t => G.say(t),
    render: () => G.renderPlay(),
    click,
    leave: () => exitExploring()
  });

  function renderExplore() {
    const v = session.view(), s = session.state();
    $('#controls').hidden = true; $('#chat').hidden = false; $('#scorePanel').hidden = true;
    $('#lessonBar').hidden = true; $('#quizOptions').hidden = true;
    playView.set({
      n: v.n, board: v.board, last: v.last, ko: v.ko, coords: settings.coords, libs: settings.libs, marks: {}, markColor: v.turn, hint: [],
      ghost: -1, ghostColor: v.turn, hoverColor: v.turn, terr: null, dead: null, own: null, shapes: null
    });
    $('#whoTurn').textContent = session.status();
    $('#capsInfo').textContent = window.GoText.T('play.prisoners', { black: s.caps[1], white: s.caps[2] });
    $('#posInfo').hidden = true;
    if (G.syncBar) G.syncBar(); /* the arrows under the board become Back and Next */
  }
  function startExploring(idx) {
    if (Play.thinking) { G.say(window.GoText.T('app.busy-thinking')); return; }
    if (!Play.s || Play.phase !== 'play') { G.say(window.GoText.T('explore.in-progress')); return; }
    if ((G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.kifu && G.kifu.on) || session.on) { G.say(window.GoText.T('explore.finish-first')); return; }
    if (session.start(Play.s, idx)) G.setChips(CHIPS);
  }
  function endExploring() {
    if (!session.on) return;
    session.exit();
    G.setChips(G.PLAY_CHIPS);
    G.renderPlay();
  }
  /* "Show me": the coach finds the move it would play and starts exploring it, exactly as "explore D4" does. Nothing moves by itself:
     the learner steps with Next and Back (or the arrows under the board) and can ask questions along the way. */
  const TT = (k, v) => window.GoText.T('explore.' + k, v);
  let showTok = 0;
  const stopShowMe = () => { showTok++; };
  async function showMe() {
    if (Play.thinking) { G.say(window.GoText.T('app.busy-thinking')); return; }
    if (!Play.s || Play.phase !== 'play') { G.say(TT('in-progress')); return; }
    if ((G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.kifu && G.kifu.on) || session.on) { G.say(TT('finish-first')); return; }
    const mine = ++showTok, s = Play.s;
    G.say(TT('show-me-start'));
    const res = await E.chooseMove(E.clone(s), s.turn, { level: G.coachLevel(), cancelled: () => mine !== showTok });
    if (mine !== showTok || !res) return;
    if (res.move < 0) { G.say(TT('show-me-nothing')); return; }
    startExploring(res.move);
  }
  function exitExploring() {
    if (!session.on) return;
    stopShowMe();
    endExploring();
    G.say(window.GoText.T('explore.back'));
  }

  Object.assign(G, { exploring: session, startExploring, exitExploring, renderExplore, showMe, stopShowMe, exploreTap: i => { stopShowMe(); session.tap(i); } });
})();
