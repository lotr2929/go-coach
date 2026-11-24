/* Go Coach — new game dialog and playing against the computer */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, KEY, load, store, settings, saveSettings, toast, click, colourName, REASONS, BoardView } = G;
  const say = text => { if (G.say) G.say(text); };

  /* Say what a move does, in plain language, and remember it so that "why?" can go deeper. */
  function explain(idx, color, who) {
    const CM = window.GoCommentary, s = Play.s;
    const d = CM.describeMove(E, s, idx, color, Play.human);
    G.explained = G.explained || {};
    G.lastExplain = G.explained[who] = { s: E.clone(s), idx, color };
    G.focus = 'move';
    const head = who === 'hint' ? `Try ${d.title}.` : `Computer plays ${d.title}.`;
    if (who === 'hint' || settings.mode === 'coach') say(CM.render(d, { head, bullets: 2 }) + '\nSay "why" if you would like the idea behind it.');
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
    chips($('#optSize'), 'size', 'Board size', [[9, '9×9'], [13, '13×13'], [19, '19×19']], settings.size);
    chips($('#optColour'), 'colour', 'You play', [['black', 'Black'], ['white', 'White'], ['random', 'Random']], settings.colour);
    chips($('#optLevel'), 'level', 'Computer level', [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']], settings.level);
    chips($('#optCoach'), 'coachlevel', 'Coach level', [['medium', 'Medium'], ['hard', 'Hard'], ['expert', 'Expert (slowest)']], settings.coachLevel);
    chips($('#optHandicap'), 'handicap', 'Handicap stones', [[0, 'None'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], settings.handicap);
    const help = () => {
      $('#newHelp').textContent = '9×9 is best for learning; the computer plays most strongly there. Handicap stones go to Black. ' +
        `The coach is always at least one level above the computer: with these choices it plays at ${E.coachLevel(chosen('level'), chosen('coachlevel'))} level.`;
    };
    $('#newForm').onchange = help; help();
    $('#newDlg').showModal();
  }

  /* ---------- PLAY ---------- */
  const Play = { s: null, human: 1, level: 'medium', phase: 'play', token: 0, thinking: false, dead: null, pending: -1, hint: [], over: false, redo: [], guided: false, seen: {} };
  const playView = new BoardView($('#playBoard'), i => onPlayTap(i));

  /* Play mode is silent: in your own game no help appears on the board (move notes, Territory, Shapes) unless Coach mode is on.
     The guided first game and a famous game (Kifu) are for learning, so they keep it. */
  const playSilent = () => !(G.kifu && G.kifu.on) && settings.mode !== 'coach' && !Play.guided;

  /* A short note about the move under the pointer, in the same words as the suggestions. */
  const tipEl = $('#boardTip');
  function moveTip(i) {
    const s = (G.teaching && G.teaching.on) ? G.teaching.state() : (G.exploring && G.exploring.on) ? G.exploring.state() : (G.kifu && G.kifu.on) ? G.kifu.state() : Play.s, CM = window.GoCommentary;
    if (!s || i < 0 || s.board[i]) return '';
    const square = G.squareInfo && !(G.teaching && G.teaching.on) && !(G.exploring && G.exploring.on) ? G.squareInfo(i) : '';
    /* In your own game the move note appears only when Play mode is not silent, and only on your turn. */
    if (s === Play.s && (playSilent() || !(Play.phase === 'play' && !Play.thinking && s.turn === Play.human))) return square;
    const who = (G.kifu && G.kifu.on) ? 3 : Play.human; /* in a game record nobody is "you" */
    const d = CM.describeMove(E, s, i, s.turn, who);
    const note = d.ok ? `${E.coord(s.n, i)}: ${CM.headline(E, s, i, s.turn, who)}` : d.points[0];
    return square ? note + '\n' + square : note;
  }
  function showTip(i, x, y) {
    const text = i >= 0 ? moveTip(i) : '';
    if (!text) { tipEl.hidden = true; return; }
    tipEl.textContent = text; tipEl.hidden = false;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = Math.max(4, Math.min(x + 14, innerWidth - w - 4)) + 'px';
    tipEl.style.top = (y + 22 + h > innerHeight ? y - h - 12 : y + 22) + 'px';
  }
  playView.onHover = showTip;

  function saveGame() {
    if (!Play.s) return;
    store(KEY.game, { human: Play.human, level: Play.level, over: Play.over, guided: !!Play.guided, s: E.serialize(Play.s) });
  }
  function startNewGame(opts) {
    if (G.kifu && G.kifu.on) G.exitKifu(true);
    Play.token++;
    Play.guided = !!(opts && opts.guided); Play.seen = {};
    Play.s = E.newState(settings.size, settings.handicap);
    Play.human = settings.colour === 'random' ? (Math.random() < .5 ? 1 : 2) : (settings.colour === 'white' ? 2 : 1);
    Play.level = settings.level;
    Play.phase = 'play'; Play.dead = null; Play.pending = -1; Play.hint = []; Play.over = false; Play.thinking = false; Play.lastAI = null; Play.redo = []; G.explained = null; G.lastExplain = null;
    renderPlay(); saveGame();
    /* An ordinary new game says nothing in the chat (New brings back the welcome); the guided first game explains itself. */
    if (Play.guided) say(window.GoGuide.opening({ handicap: settings.handicap, human: Play.human, computerFirst: Play.s.turn !== Play.human }));
    maybeAI();
    G.coachAuto();
  }
  /* Option 3 of the introduction: a gentle first game (9×9, Black with 5 handicap stones, easy computer) with the guide explaining every move. */
  function startGuidedGame() {
    if (Play.s && Play.phase === 'play' && Play.s.moves.length > 0 && !confirm('Start the guided game? Your current game will be replaced.')) return;
    settings.size = 9; settings.colour = 'black'; settings.level = 'easy'; settings.handicap = 5; settings.mode = 'play';
    saveSettings();
    startNewGame({ guided: true });
  }
  function restoreGame() {
    const g = load(KEY.game, null);
    if (!g) return false;
    try {
      Play.s = E.deserialize(g.s); Play.human = g.human; Play.level = g.level; Play.over = !!g.over; Play.guided = !!g.guided; Play.seen = {};
    } catch (e) { return false; }
    Play.phase = 'play'; Play.dead = null; Play.hint = []; Play.pending = -1; Play.thinking = false;
    renderPlay();
    if (Play.over) { Play.phase = 'done'; renderPlay(); }
    else if (Play.s.passes >= 2) startScoring();
    else { maybeAI(); G.coachAuto(); }
    return true;
  }

  function coachText() {
    if (settings.mode !== 'coach' || !settings.coach || !Play.s) return '';
    const s = Play.s, parts = [];
    const ataris = E.allGroups(s.n, s.board).filter(g => g.libs.length === 1);
    const mine = ataris.filter(g => g.color === Play.human).sort((a, b) => b.stones.length - a.stones.length)[0];
    const theirs = ataris.filter(g => g.color !== Play.human).sort((a, b) => b.stones.length - a.stones.length)[0];
    if (mine) parts.push(`⚠ Your ${mine.stones.length > 1 ? mine.stones.length + '-stone group' : 'stone'} at ${E.coord(s.n, mine.stones[0])} is in atari. Extend at ${E.coord(s.n, mine.libs[0])} or capture a neighbouring stone to save it.`);
    else if (theirs) parts.push(`You can capture ${theirs.stones.length > 1 ? 'the ' + theirs.stones.length + '-stone group' : 'the stone'} at ${E.coord(s.n, theirs.stones[0])} by playing ${E.coord(s.n, theirs.libs[0])}.`);
    else if (s.moves.length < 2) parts.push('Opening tip: corners first, then the sides, then the centre.');
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
    $('#controls').hidden = false; $('#chat').hidden = false;
    $('#lessonBar').hidden = true; $('#quizOptions').hidden = true;
    playView.set({
      n: s.n, board: s.board, last: s.last, ko: s.ko, coords: settings.coords, libs: settings.libs,
      hint: Play.hint, ghost: Play.pending, ghostColor: Play.human, hoverColor: (Play.phase === 'play' && !Play.thinking && s.turn === Play.human) ? Play.human : 0,
      terr: Play.phase === 'scoring' || Play.phase === 'done' ? Play.terr || null : null,
      dead: Play.phase === 'scoring' || Play.phase === 'done' ? Play.dead : null, marks: G.anaMarks(), own: G.terrOwn(), shapes: G.shapeMarks()
    });
    let who;
    if (Play.phase === 'scoring') who = 'Scoring: tap groups to mark them dead or alive';
    else if (Play.phase === 'done') who = Play.resultText || 'Game over';
    else if (Play.thinking) who = Play.note && Play.note.tok === Play.token ? Play.note.text : 'Computer is thinking…';
    else who = s.turn === Play.human ? `Your move (${colourName(Play.human)})` : `${colourName(s.turn)} to play`;
    let nb = 0, nw = 0;
    for (let k = 0; k < s.board.length; k++) { if (s.board[k] === 1) nb++; else if (s.board[k] === 2) nw++; }
    $('#whoTurn').textContent = who + (Play.phase === 'play' ? `  ● ${nb}  ○ ${nw}` : '');
    $('#capsInfo').textContent = `Prisoners ● ${s.caps[1]}  ○ ${s.caps[2]}`;
    const playing = Play.phase === 'play';
    const mine = playing && !Play.thinking && s.turn === Play.human;
    $('#btnPass').disabled = !mine;
    $('#btnUndo').disabled = !playing || s.hist.length === 0;
    $('#btnRedo').disabled = !playing || Play.thinking || !Play.redo.length;
    $('#btnResign').disabled = !playing;
    $('#btnAnalyse').disabled = !playing || Play.thinking;
    $('#btnMode').textContent = settings.mode === 'coach' ? 'Coach mode' : 'Play mode';
    $('#btnMode').classList.toggle('primary', settings.mode === 'coach');
    if (G.syncTerrTab) G.syncTerrTab();
    if (G.syncShapesTab) G.syncShapesTab();
    G.paintPos();
    $('#scorePanel').hidden = Play.phase !== 'scoring';
    $('#btnConfirm').disabled = Play.thinking;
  }

  function onPlayTap(i) {
    const s = Play.s;
    if (!s) return;
    if (G.Lesson.on) return G.onLessonTap(i);
    if (G.teaching && G.teaching.on) return G.teachTap(i);
    if (G.exploring && G.exploring.on) return G.exploreTap(i);
    if (G.shapeTap && G.shapeTap(i)) return; /* a tap on a marked shape's stone explains it */
    if (G.kifu && G.kifu.on) return G.kifuTap(i);
    if (Play.phase === 'scoring') return toggleDead(i);
    if (Play.phase !== 'play' || Play.thinking || s.turn !== Play.human) return;
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
    if (!r.ok) { toast(REASONS[r.reason] || 'Illegal move.'); renderPlay(); return; }
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
    const tok = ++Play.token;
    Play.thinking = true; renderPlay();
    const res = await E.chooseMove(s, s.turn, { level: Play.level, cancelled: () => tok !== Play.token });
    if (tok !== Play.token || !res) return;
    Play.thinking = false;
    Play.redo = [];
    if (res.move < 0) {
      E.pass(s);
      say(`Computer passes (${res.note}).`);
      if (Play.guided) say(window.GoGuide.computerPass(Play.seen));
      toast('Computer passes');
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
    if (!s || Play.phase !== 'play' || Play.thinking || s.turn !== Play.human) return;
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
    do { E.undo(s); } while (s.turn !== Play.human && s.hist.length);
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

  async function giveHint() {
    const s = Play.s;
    if (!s || Play.thinking || s.turn !== Play.human) return;
    const tok = ++Play.token;
    Play.thinking = true; renderPlay();
    const res = await E.suggest(s, Play.human, { level: G.coachLevel(), cancelled: () => tok !== Play.token });
    if (tok !== Play.token || !res) return;
    Play.thinking = false;
    if (res.move < 0) { Play.hint = []; say('Nothing urgent. Passing is reasonable if you think the game is settled.'); }
    else { Play.hint = [res.move]; explain(res.move, Play.human, 'hint'); }
    renderPlay();
  }

  function resign() {
    if (!Play.s || Play.phase !== 'play') return;
    if (!confirm('Resign this game?')) return;
    Play.token++; Play.thinking = false;
    finish(`You resigned. ${colourName(3 - Play.human)} wins.`, 'Resigned');
  }

  /* scoring */
  async function startScoring() {
    const s = Play.s;
    Play.phase = 'scoring'; Play.dead = new Set(); Play.thinking = true; Play.terr = null;
    const tok = ++Play.token;
    renderPlay(); $('#scoreText').textContent = 'Working out which stones are dead…';
    const dead = await E.estimateDead(s, s.n <= 9 ? 250 : s.n <= 13 ? 120 : 50, () => tok !== Play.token);
    if (tok !== Play.token) return;
    Play.dead = dead; Play.thinking = false;
    renderScore();
    say(Play.guided ? window.GoGuide.scoring(s.komi) : 'Both players have passed. I have marked the stones I think are dead. Tap a group to change that, then press Confirm result.');
  }
  function scoreSummary() {
    const s = Play.s, sc = E.scoreArea(s.n, s.board, Play.dead);
    const w = sc.white + s.komi, diff = sc.black - w;
    const winner = diff > 0 ? 1 : 2;
    return { sc, w, diff, winner, text: `Black ${sc.black}  ·  White ${sc.white} + komi ${s.komi} = ${w}\n${colourName(winner)} wins by ${Math.abs(diff)}.` };
  }
  function renderScore() {
    const r = scoreSummary();
    Play.terr = r.sc.terr;
    $('#scoreText').textContent = r.text + '\nTap a group to mark it dead or alive. Squares show territory.';
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
    finish(`${r.text.replace('\n', '. ')}`, human ? 'You win' : 'Computer wins');
  }
  function resumePlay() {
    const s = Play.s;
    Play.token++; Play.phase = 'play'; Play.dead = null; Play.terr = null; Play.thinking = false; s.passes = 0;
    renderPlay(); maybeAI();
  }


  Object.assign(G, { Play, playView, playSilent, onPlayTap, renderPlay, chips, chosen, openNewDialog, startNewGame, restoreGame, humanPass, undoMove, redoMove, giveHint, resign, confirmResult, resumePlay, startGuidedGame });
})();
