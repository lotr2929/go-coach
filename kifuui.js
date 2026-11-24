/* World of Go — connects the Kifu viewer (kifu.js) to the board, the chat and the panel.
   The list of famous games opens in the board window; a chosen game is shown on the board with a bar of buttons in the side panel.
   Game files are the app's own (kifu/index.json and kifu/*.sgf, made by make-kifu.js); the only network use is fetching them. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, click, Play, playView } = G;
  const CHIPS = ['Next', 'Back', 'Explain', 'Analyse', 'Games', 'Exit'];
  let index = null, autoTimer = null, terrTimer = null;

  const session = window.GoKifu.create({
    E, SGF: window.GoSGF, CM: window.GoCommentary, C: window.GoCoach, EXPLORE: window.GoExplore,
    say: t => G.say(t),
    render: () => renderKifu(),
    click,
    ms: 400,
    analysisMs: n => E.analysisMs(G.coachLevel(), n),
    leave: () => exitKifu(),
    openList: () => openKifuList()
  });

  /* ---------- the list ---------- */
  async function loadIndex() {
    if (index) return index;
    const res = await fetch('kifu/index.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    index = await res.json();
    return index;
  }
  async function openKifuList() {
    if (Play.thinking && !session.on) { G.say('Give me a moment: I am still thinking about my move.'); return; }
    let page;
    try {
      page = window.GoKifu.listPage(await loadIndex());
      for (const b of page.blocks) if (b.t === 'cards') b.onPick = openKifuGame;
    } catch (e) {
      page = { title: 'Famous games (Kifu)', blocks: [{ t: 'p', text: 'The famous games could not be loaded just now. They need a connection the first time; after that the games you have opened are kept for offline use. (If you are the developer: check that kifu/index.json exists, and run make-kifu.js if it does not.)' }] };
    }
    G.showPage(page);
    G.say('The famous games are listed in the board window. Tap a game to open it.');
  }

  /* ---------- a game ---------- */
  function leaveOthers() {
    if (G.Lesson && G.Lesson.on) G.exitLesson();
    if (G.teaching && G.teaching.on) G.exitTeaching();
    if (G.exploring && G.exploring.on) G.exitExploring();
  }
  async function openKifuGame(entry) {
    if (Play.thinking && !session.on) { G.say('Give me a moment: I am still thinking about my move.'); return; }
    try {
      const res = await fetch(entry.file, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const game = window.GoSGF.parse(await res.text());
      if (!game || !game.moves.length) throw new Error('no moves');
      stopAuto();
      leaveOthers();
      session.load(entry, game);
      G.setChips(CHIPS);
      if (G.pageOpen()) G.closePage();
    } catch (e) {
      G.say('I could not open that game just now. It needs a connection the first time you open it. Please try again.');
    }
  }
  function exitKifu(silent) {
    if (!session.on) return;
    stopAuto(); clearTimeout(terrTimer);
    session.exit();
    $('#kifuBar').hidden = true; $('#controls').hidden = false;
    G.setChips(G.PLAY_CHIPS);
    G.renderPlay();
    if (G.syncBar) G.syncBar();
    if (!silent) G.say('Back to your game.');
  }

  /* ---------- drawing ---------- */
  function renderKifu() {
    if (!session.on) return;
    const v = session.view(), s = session.state(), vary = session.inVariation;
    $('#controls').hidden = true; $('#lessonBar').hidden = true; $('#quizOptions').hidden = true; $('#scorePanel').hidden = true;
    $('#kifuBar').hidden = false; $('#chat').hidden = false;
    playView.set({
      n: v.n, board: v.board, last: v.last, ko: v.ko, coords: settings.coords, libs: settings.libs, marks: v.marks, hint: [],
      ghost: -1, ghostColor: v.turn, hoverColor: v.turn, terr: null, dead: null, own: G.terrOwn(), shapes: G.shapeMarks()
    });
    $('#whoTurn').textContent = session.status();
    $('#capsInfo').textContent = `Prisoners ● ${s.caps[1]}  ○ ${s.caps[2]}`;
    $('#posInfo').hidden = true;
    const slider = $('#kifuSlider');
    slider.max = String(session.limit); slider.value = String(session.pos); slider.disabled = vary;
    $('#btnKFirst').disabled = vary || session.pos === 0;
    $('#btnKLast').disabled = vary || session.pos >= session.limit;
    $('#btnKBack').disabled = !session.canBack();
    $('#btnKNext').disabled = !session.canNext();
    $('#btnKAuto').disabled = vary;
    if (G.syncBar) G.syncBar();
    G.syncTerrTab(); G.syncShapesTab(); /* both tabs work on a famous game, whichever mode your own game is in */
    if (settings.terr) { clearTimeout(terrTimer); terrTimer = setTimeout(() => { if (session.on && G.mapTerritory) G.mapTerritory(); }, 250); }
  }

  /* ---------- playing the game through ---------- */
  const syncAuto = () => { $('#btnKAuto').textContent = autoTimer ? 'Pause' : 'Auto'; };
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    syncAuto();
  }
  function toggleAuto() {
    if (autoTimer) { stopAuto(); return; }
    if (!session.on || session.inVariation) return;
    if (session.pos >= session.limit) session.goto(0);
    autoTimer = setInterval(() => {
      if (!session.on || session.inVariation || session.pos >= session.limit) { stopAuto(); return; }
      session.next();
    }, 1200);
    syncAuto();
  }

  /* ---------- buttons and keys ---------- */
  const back = () => { stopAuto(); session.back(); };
  const next = () => { stopAuto(); session.next(); };
  $('#btnKFirst').onclick = () => { stopAuto(); session.goto(0); };
  $('#btnKBack').onclick = back;
  $('#btnKNext').onclick = next;
  $('#btnKLast').onclick = () => { stopAuto(); session.goto(session.limit); };
  $('#btnKAuto').onclick = toggleAuto;
  $('#btnKAnalyse').onclick = () => { stopAuto(); session.analyse(); };
  $('#btnKList').onclick = openKifuList;
  $('#btnKExit').onclick = () => exitKifu();
  $('#kifuSlider').addEventListener('input', e => { stopAuto(); session.goto(+e.target.value); });
  document.addEventListener('keydown', e => {
    if (!session.on || G.pageOpen() || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { back(); e.preventDefault(); }
    else if (e.key === 'Home') { stopAuto(); session.goto(0); e.preventDefault(); }
    else if (e.key === 'End') { stopAuto(); session.goto(session.limit); e.preventDefault(); }
  });

  Object.assign(G, { kifu: session, openKifuList, openKifuGame, exitKifu, renderKifu, kifuTap: i => session.tap(i), kifuBack: back, kifuNext: next });
})();
