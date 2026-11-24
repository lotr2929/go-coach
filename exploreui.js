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
      n: v.n, board: v.board, last: v.last, ko: v.ko, coords: settings.coords, libs: settings.libs, marks: {}, hint: [],
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
  /* "Show me": the coach finds its best move, then plays the likely continuation by itself on a copy of the board, one move every
     two seconds, and stops at the last one so the moves can be replayed with Back and Next. Typing, tapping or the arrows stop it early. */
  const TT = (k, v) => window.GoText.T('explore.' + k, v);
  const SHOW_PLIES = 8, SHOW_MS = 2000;
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
    if (!session.on) return;
    await session.done();
    for (let k = 1; k < SHOW_PLIES; k++) {
      await new Promise(r => setTimeout(r, SHOW_MS));
      if (mine !== showTok || !session.on) return;
      session.forward();
      await session.done();
    }
    if (mine === showTok && session.on) G.say(TT('show-me-done'));
  }
  function exitExploring() {
    if (!session.on) return;
    stopShowMe();
    endExploring();
    G.say(window.GoText.T('explore.back'));
  }

  Object.assign(G, { exploring: session, startExploring, exitExploring, renderExplore, showMe, stopShowMe, exploreTap: i => { stopShowMe(); session.tap(i); } });
})();
