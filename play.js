/* Go Coach — new game dialog and playing against the computer */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, KEY, load, store, settings, saveSettings, toast, click, colourName, REASONS, BoardView } = G;
  const say = text => { if (G.say) G.say(text); };
  const T = (k, v) => window.GoText.T('play.' + k, v); /* wording: docs/text/en/play.md */

  /* Say what a move does, in plain language, and remember it so that "why?" can go deeper. */
  function explain(idx, color, who) {
    const CM = window.GoCommentary, s = Play.s;
    const d = CM.describeMove(E, s, idx, color, Play.human);
    G.explained = G.explained || {};
    G.lastExplain = G.explained[who] = { s: E.clone(s), idx, color };
    G.focus = 'move';
    const head = T(who === 'hint' ? 'try' : 'computer-plays', { point: d.title });
    if (who === 'hint' || settings.mode === 'coach') say(CM.render(d, { head, bullets: 2 }) + '\n' + T('why-more'));
  }

  /* ---------- option chips & dialogs ---------- */
  function chips(el, name, label, options, current) {
    el.innerHTML = '<span class="lbl"></span><div class="chips"></div>';
    el.firstChild.textContent = label;
    const box = el.lastChild;
    for (const [val, text] of options) {
      const lab = document.createElement('label');
      const inp = document.createElement('input');
      inp.type = 'radio'; inp.name = name; inp.value = String(val); inp.checked = String(val) === String(current);
      const sp = document.createElement('span'); sp.textContent = text;
      lab.append(inp, sp); box.append(lab);
    }
  }
  const chosen = name => { const c = document.querySelector(`input[name="${name}"]:checked`); return c ? c.value : null; };

  function openNewDialog() {
    chips($('#optSize'), 'size', T('opt.size'), [[9, '9×9'], [13, '13×13'], [19, '19×19']], settings.size);
    chips($('#optColour'), 'colour', T('opt.colour'), [['black', T('opt.black')], ['white', T('opt.white')], ['random', T('opt.random')], ['both', T('opt.both')]], settings.colour);
    chips($('#optLevel'), 'level', T('opt.level'), [['easy', T('opt.easy')], ['medium', T('opt.medium')], ['hard', T('opt.hard')]], settings.level);
    chips($('#optHandicap'), 'handicap', T('opt.handicap'), [[0, T('opt.none')], [2, '2'], [3, '3'], [4, '4'], [5, '5']], settings.handicap);
    const help = () => {
      $('#newHelp').textContent = T('new-help');
    };
    $('#newForm').onchange = help; help();
    if (G.newTabs) G.newTabs.show('new'); /* the box always opens on its first tab (cloudsave.js adds the second, Saved games) */
    $('#newDlg').showModal();
  }

  /* ---------- PLAY ---------- */
  const Play = { s: null, human: 1, level: 'medium', phase: 'play', token: 0, thinking: false, dead: null, pending: -1, hint: [], over: false, redo: [], guided: false, seen: {}, both: false };
  const playView = new BoardView($('#playBoard'), i => onPlayTap(i));

  /* Play mode is silent: in your own game no help appears on the board (move notes, Territory, Shapes) unless Coach mode is on.
     The guided first game and a famous game (Kifu) are for learning, so they keep it. */
  const playSilent = () => !(G.kifu && G.kifu.on) && settings.mode !== 'coach' && !Play.guided && !Play.both;
  /* Whether a tap on the board plays a move: your turn, or either side's turn in Play both sides (Play.both), where the coach
     marks the other side's best moves A to E and you choose one, or any other point. */
  const myTurn = s => Play.phase === 'play' && !Play.thinking && (Play.both || s.turn === Play.human);

  /* A short note about the move under the pointer, in the same words as the suggestions. */
  const tipEl = $('#boardTip');
  function moveTip(i) {
    const s = (G.teaching && G.teaching.on) ? G.teaching.state() : (G.exploring && G.exploring.on) ? G.exploring.state() : (G.kifu && G.kifu.on) ? G.kifu.state() : Play.s, CM = window.GoCommentary;
    if (!s || i < 0 || s.board[i]) return '';
    const square = G.squareInfo && !(G.teaching && G.teaching.on) && !(G.exploring && G.exploring.on) ? G.squareInfo(i) : '';
    /* In your own game the move note appears only when Play mode is not silent, and only on your turn. */
    if (s === Play.s && (playSilent() || !myTurn(s))) return square;
    const who = (G.kifu && G.kifu.on) ? 3 : Play.human; /* in a game record nobody is "you" */
    const d = CM.describeMove(E, s, i, s.turn, who);
    const note = d.ok ? `${E.coord(s.n, i)}: ${CM.headline(E, s, i, s.turn, who)}` : d.points[0];
    return square ? note + '\n' + square : note;
  }
  function showTip(i, x, y) { placeTip(i >= 0 ? moveTip(i) : '', x, y); }
  /* The small note beside the mouse; also used for the explanation of a shape's number (shapesui.js). */
  function placeTip(text, x, y) {
    if (!text) { tipEl.hidden = true; return; }
    tipEl.textContent = text; tipEl.hidden = false;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = Math.max(4, Math.min(x + 14, innerWidth - w - 4)) + 'px';
    tipEl.style.top = (y + 22 + h > innerHeight ? y - h - 12 : y + 22) + 'px';
  }
  playView.onHover = showTip;

  /* The game as it is kept on this device (and, with the Save button, in the cloud: cloudsave.js). */
  const gameRecord = () => ({ human: Play.human, level: Play.level, over: Play.over, guided: !!Play.guided, both: !!Play.both, s: E.serialize(Play.s), tree: Play.tree, cloudId: Play.cloudId || null });
  function saveGame() {
    if (!Play.s) return;
    if (G.Tree) Play.tree = G.Tree.add(Play.tree || G.Tree.fresh(), Play.s.moves); /* the move tree (movetree.js) keeps every line tried */
    store(KEY.game, gameRecord());
    if (G.renderTree) G.renderTree();
  }
  function startNewGame(opts) {
    if (G.kifu && G.kifu.on) G.exitKifu(true);
    Play.token++;
    Play.guided = !!(opts && opts.guided); Play.seen = {};
    Play.s = E.newState(settings.size, settings.handicap);
    Play.human = settings.colour === 'random' ? (Math.random() < .5 ? 1 : 2) : (settings.colour === 'white' ? 2 : 1);
    Play.level = settings.level;
    Play.both = settings.colour === 'both' && !Play.guided; /* you play Black; the coach suggests White's moves and you choose */
    Play.phase = 'play'; Play.dead = null; Play.pending = -1; Play.hint = []; Play.over = false; Play.thinking = false; Play.lastAI = null; Play.redo = []; Play.tree = null; Play.cloudId = null; G.explained = null; G.lastExplain = null;
    renderPlay(); saveGame();
    /* An ordinary new game says nothing in the chat (New brings back the welcome); the guided first game explains itself. */
    if (Play.guided) say(window.GoGuide.opening({ handicap: settings.handicap, human: Play.human, computerFirst: Play.s.turn !== Play.human }));
    maybeAI();
    G.coachAuto();
  }
  /* Option 3 of the introduction: a gentle first game (9×9, Black with 5 handicap stones, easy computer) with the guide explaining every move. */
  function startGuidedGame() {
    if (Play.s && Play.phase === 'play' && Play.s.moves.length > 0 && !confirm(T('guided-confirm'))) return;
    settings.size = 9; settings.colour = 'black'; settings.level = 'easy'; settings.handicap = 5; settings.mode = 'play';
    saveSettings();
    startNewGame({ guided: true });
  }
  function restoreGame() {
    const g = load(KEY.game, null);
    if (!g) return false;
    try {
      Play.s = E.deserialize(g.s); Play.human = g.human; Play.level = g.level; Play.over = !!g.over; Play.guided = !!g.guided; Play.both = !!g.both; Play.seen = {}; Play.cloudId = g.cloudId || null;
      Play.tree = g.tree && g.tree.k ? g.tree : null;
    } catch (e) { return false; }
    Play.token++; Play.redo = []; Play.lastAI = null; G.explained = null; G.lastExplain = null; /* a game opened over another one (from the saved games) drops the old game's leftovers */
    Play.phase = 'play'; Play.dead = null; Play.hint = []; Play.pending = -1; Play.thinking = false;
    renderPlay();
    if (Play.over) { Play.phase = 'done'; renderPlay(); }
    else if (Play.s.passes >= 2) startScoring();
    else { maybeAI(); G.coachAuto(); }
    return true;
  }

  /* "play both sides" and "computer plays" in the chat: switch Play both sides on or off for this game. */
  function setBoth(on) {
    if (!Play.s || Play.phase !== 'play') return say(T('both-no-game'));
    Play.both = !!on; saveGame();
    say(T(on ? 'both-on' : 'both-off', { colour: colourName(3 - Play.human) }));
    if (Play.s.turn !== Play.human) { Play.token++; Play.thinking = false; maybeAI(); } else renderPlay();
  }

  function coachText() {
    if (settings.mode !== 'coach' || !settings.coach || !Play.s) return '';
    const s = Play.s, parts = [];
    const ataris = E.allGroups(s.n, s.board).filter(g => g.libs.length === 1);
    const mine = ataris.filter(g => g.color === Play.human).sort((a, b) => b.stones.length - a.stones.length)[0];
    const theirs = ataris.filter(g => g.color !== Play.human).sort((a, b) => b.stones.length - a.stones.length)[0];
    const at = g => ({ count: g.stones.length, point: E.coord(s.n, g.stones[0]), liberty: E.coord(s.n, g.libs[0]) });
    if (mine) parts.push(T(mine.stones.length > 1 ? 'tip-atari-group' : 'tip-atari-stone', at(mine)));
    else if (theirs) parts.push(T(theirs.stones.length > 1 ? 'tip-capture-group' : 'tip-capture-stone', at(theirs)));
    else if (s.moves.length < 2) parts.push(T('tip-opening'));
    return parts.join('\n');
  }

  function renderPlay() {
    const s = Play.s;
    if (!s) return;
    tipEl.hidden = true;
    if (G.Lesson.on) return G.renderLesson();
    if (G.teaching && G.teaching.on) return G.renderTeach();
    if (G.exploring && G.exploring.on) return G.renderExplore();
    if (G.kifu && G.kifu.on) return G.renderKifu();
    if (G.setupOn && G.setupOn()) return G.renderSetup();
    $('#controls').hidden = false; $('#chat').hidden = false;
    $('#lessonBar').hidden = true; $('#quizOptions').hidden = true;
    playView.set({
      n: s.n, board: s.board, last: s.last, ko: s.ko, coords: settings.coords, libs: settings.libs,
      hint: Play.hint, ghost: Play.pending, ghostColor: Play.both ? s.turn : Play.human, hoverColor: myTurn(s) ? s.turn : 0,
      terr: Play.phase === 'scoring' || Play.phase === 'done' ? Play.terr || null : null,
      dead: Play.phase === 'scoring' || Play.phase === 'done' ? Play.dead : null, marks: G.anaMarks(), markColor: s.turn, own: G.terrOwn(), shapes: G.shapeMarks()
    });
    /* During a game the top of the board shows the stone counts, with your colour underlined (Boon, 25 Nov 2026); words appear
       only for scoring and the result. */
    let who = '';
    if (Play.phase === 'scoring') who = T('scoring');
    else if (Play.phase === 'done') who = Play.resultText || T('game-over');
    let nb = 0, nw = 0;
    for (let k = 0; k < s.board.length; k++) { if (s.board[k] === 1) nb++; else if (s.board[k] === 2) nw++; }
    if (who) $('#whoTurn').textContent = who;
    else G.stoneCounts($('#whoTurn'), nb, nw, Play.both ? s.turn : Play.human); /* in Play both sides, the side to move */
    G.chatBusy(Play.thinking && Play.note && Play.note.tok === Play.token ? Play.note.text : ''); /* "Coach is analysing…" sits in the chat */
    G.stoneText($('#capsInfo'), G.lostText('play.prisoners', s));
    const playing = Play.phase === 'play';
    const mine = playing && myTurn(s);
    $('#btnPass').disabled = !mine;
    $('#btnUndo').disabled = !playing || s.hist.length === 0;
    $('#btnRedo').disabled = !playing || Play.thinking || !Play.redo.length;
    $('#btnResign').disabled = !playing;
    $('#btnAnalyse').disabled = !playing || Play.thinking;
    $('#btnMode').textContent = T(settings.mode === 'coach' ? 'coach-mode' : 'play-mode');
    $('#btnMode').classList.toggle('primary', settings.mode === 'coach');
    if (G.syncTerrTab) G.syncTerrTab();
    if (G.syncShapesTab) G.syncShapesTab();
    G.paintPos();
    $('#scorePanel').hidden = Play.phase !== 'scoring';
    $('#btnConfirm').disabled = Play.thinking;
    if (G.renderTree) G.renderTree();
  }

  function onPlayTap(i) {
    const s = Play.s;
    if (!s) return;
    if (G.Lesson.on) return G.onLessonTap(i);
    if (G.setupOn && G.setupOn()) return G.setupTap(i);
    if (G.teaching && G.teaching.on) return G.teachTap(i);
    if (G.exploring && G.exploring.on) return G.exploreTap(i);
    if (G.shapeTap && G.shapeTap(i)) return; /* a tap on a marked shape's stone explains it */
    if (G.kifu && G.kifu.on) return G.kifuTap(i);
    if (Play.phase === 'scoring') return toggleDead(i);
    if (!myTurn(s)) return;
    if (settings.confirm && Play.pending !== i) {
      if (s.board[i]) return;
      Play.pending = i; Play.hint = []; renderPlay();
      const p = playView.clientPos(i);
      showTip(i, p.x, p.y);
      return;
    }
    Play.pending = -1; Play.hint = [];
    const prev = settings.mode === 'coach' ? G.coachPrev() : null;
    const r = E.play(s, i);
    if (!r.ok) { toast(REASONS[r.reason] || T('illegal')); renderPlay(); return; }
    click();
    Play.redo = [];
    renderPlay(); saveGame();
    const verdict = prev ? G.coachVerdict(prev, i) : '';
    if (verdict) say(verdict);
    if (Play.guided) say(window.GoGuide.afterHuman(E, s, i, r, Play.seen));
    maybeAI();
  }

  async function maybeAI() {
    const s = Play.s;
    if (!s || Play.phase !== 'play' || s.turn === Play.human || s.passes >= 2) return;
    if (Play.both) { renderPlay(); G.analyse(true); return; } /* Play both sides: mark the best moves A to E and let the learner choose */
    const tok = ++Play.token;
    Play.thinking = true; renderPlay();
    const res = await E.chooseMove(s, s.turn, { level: Play.level, cancelled: () => tok !== Play.token });
    if (tok !== Play.token || !res) return;
    Play.thinking = false;
    Play.redo = [];
    if (res.move < 0) {
      E.pass(s);
      say(T('computer-passes', { reason: res.note }));
      if (Play.guided) say(window.GoGuide.computerPass(Play.seen));
      toast(T('computer-passes-toast'));
    } else {
      explain(res.move, s.turn, 'coach');
      const r = E.play(s, res.move);
      click();
      if (Play.guided) say(window.GoGuide.afterComputer(E, s, res.move, r, Play.human, Play.seen));
      Play.lastAI = { move: res.move, note: res.note };
    }
    saveGame();
    if (s.passes >= 2) { renderPlay(); startScoring(); return; }
    renderPlay();
    const tip = coachText();
    if (tip) say(tip);
    G.coachAuto();
  }

  function humanPass() {
    const s = Play.s;
    if (!s || !myTurn(s)) return;
    Play.pending = -1; Play.hint = []; Play.redo = [];
    E.pass(s); saveGame();
    if (Play.guided) say(window.GoGuide.humanPass());
    if (s.passes >= 2) { renderPlay(); startScoring(); return; }
    renderPlay(); maybeAI();
  }

  function undoMove() {
    const s = Play.s;
    if (!s || Play.phase !== 'play' || !s.hist.length) return;
    Play.token++; Play.thinking = false; Play.pending = -1; Play.hint = [];
    const before = s.moves.slice();
    do { E.undo(s); } while (!Play.both && s.turn !== Play.human && s.hist.length); /* in Play both sides, one move at a time */
    const gone = before.slice(s.moves.length);
    if (gone.length) Play.redo.push(gone);
    G.explained = null; G.lastExplain = null;
    renderPlay(); saveGame();
    if (s.turn !== Play.human) maybeAI(); else G.coachAuto();
  }

  function redoMove() {
    const s = Play.s;
    if (!s || Play.phase !== 'play' || Play.thinking || !Play.redo.length) return;
    Play.pending = -1; Play.hint = [];
    for (const m of Play.redo.pop()) { if (m.i < 0) E.pass(s); else E.play(s, m.i); }
    click();
    G.explained = null; G.lastExplain = null;
    renderPlay(); saveGame();
    if (s.passes >= 2) startScoring();
    else if (s.turn !== Play.human) maybeAI();
    else G.coachAuto();
  }

  /* A tap on the move tree (movetree.js): go to the position after those moves, as Undo and Redo do. Moves the two lines
     share are kept; the rest are taken back and the chosen line played. Going back along the line leaves Redo able to return. */
  function jumpTo(path) {
    const s = Play.s;
    if (!s || Play.phase !== 'play') return;
    Play.token++; Play.thinking = false; Play.pending = -1; Play.hint = [];
    const before = s.moves.slice();
    let k = 0;
    while (k < before.length && k < path.length && before[k].i === path[k].i) k++;
    if (k === before.length && k === path.length) return renderPlay();
    while (s.moves.length > k) E.undo(s);
    for (const m of path.slice(k)) { if (!(m.i < 0 ? E.pass(s) : E.play(s, m.i)).ok) break; }
    Play.redo = k === path.length && k < before.length ? [before.slice(k)] : [];
    click();
    G.explained = null; G.lastExplain = null;
    renderPlay(); saveGame();
    if (s.passes >= 2) startScoring();
    else if (s.turn !== Play.human) maybeAI();
    else G.coachAuto();
  }

  async function giveHint() {
    const s = Play.s;
    if (!s || !myTurn(s)) return;
    const tok = ++Play.token;
    Play.thinking = true; renderPlay();
    const res = await E.suggest(s, s.turn, { level: G.coachLevel(), cancelled: () => tok !== Play.token });
    if (tok !== Play.token || !res) return;
    Play.thinking = false;
    if (res.move < 0) { Play.hint = []; say(T('nothing-urgent')); }
    else { Play.hint = [res.move]; explain(res.move, s.turn, 'hint'); }
    renderPlay();
  }

  function resign() {
    if (!Play.s || Play.phase !== 'play') return;
    if (!confirm(T('resign-confirm'))) return;
    Play.token++; Play.thinking = false;
    finish(T('resigned', { winner: colourName(3 - Play.human) }), T('resigned-title'));
  }

  /* scoring */
  async function startScoring() {
    const s = Play.s;
    Play.phase = 'scoring'; Play.dead = new Set(); Play.thinking = true; Play.terr = null;
    const tok = ++Play.token;
    renderPlay(); $('#scoreText').textContent = T('working-out-dead');
    const dead = await E.estimateDead(s, s.n <= 9 ? 250 : s.n <= 13 ? 120 : 50, () => tok !== Play.token);
    if (tok !== Play.token) return;
    Play.dead = dead; Play.thinking = false;
    renderScore();
    say(Play.guided ? window.GoGuide.scoring(s.komi) : T('both-passed'));
  }
  function scoreSummary() {
    const s = Play.s, sc = E.scoreArea(s.n, s.board, Play.dead);
    const w = sc.white + s.komi, diff = sc.black - w;
    const winner = diff > 0 ? 1 : 2;
    return { sc, w, diff, winner, text: T('score', { black: sc.black, white: sc.white, komi: s.komi, total: w }) + '\n' + T('wins-by', { winner: colourName(winner), points: Math.abs(diff) }) };
  }
  function renderScore() {
    const r = scoreSummary();
    Play.terr = r.sc.terr;
    $('#scoreText').textContent = r.text + '\n' + T('tap-dead');
    renderPlay();
  }
  function toggleDead(i) {
    const s = Play.s;
    if (Play.thinking || !s.board[i]) return;
    const gr = E.flood(E.geom(s.n), s.board, i);
    const isDead = Play.dead.has(i);
    for (const st of gr.stones) { if (isDead) Play.dead.delete(st); else Play.dead.add(st); }
    renderScore();
  }
  function finish(text, title) {
    Play.phase = 'done'; Play.over = true; Play.resultText = text;
    say(title + '. ' + text);
    renderPlay(); saveGame();
    $('#resultTitle').textContent = title;
    $('#resultText').textContent = text;
    $('#resultDlg').showModal();
  }
  function confirmResult() {
    const r = scoreSummary();
    const human = r.winner === Play.human;
    finish(`${r.text.replace('\n', '. ')}`, T(human ? 'you-win' : 'computer-wins'));
  }
  function resumePlay() {
    const s = Play.s;
    Play.token++; Play.phase = 'play'; Play.dead = null; Play.terr = null; Play.thinking = false; s.passes = 0;
    renderPlay(); maybeAI();
  }


  Object.assign(G, { Play, placeTip, gameRecord, saveGame, playView, playSilent, myTurn, setBoth, onPlayTap, renderPlay, chips, chosen, openNewDialog, startNewGame, restoreGame, humanPass, undoMove, redoMove, jumpTo, giveHint, resign, confirmResult, resumePlay, startGuidedGame, resumeTurn: () => { maybeAI(); G.coachAuto(); } });
})();
