/* Live Go Board: changes being tried for Go Coach (the mock-up, docs/decisions.md). Each change here is to be built into
   Go Coach properly once Boon is happy with it, and then removed from this file.
   1. (Boon, 28 Nov 2026) Three modes only: Play, Coach and Puzzles. Game mode (the board panel full screen with the board on
      it) is gone: the board's expand arrow shows only while a page such as "Why Play Go?" is open, and the full screen ends
      when the page closes. */
(() => {
  'use strict';
  const G = window.GC;
  const css = document.createElement('style');
  css.textContent = 'body:not(.paging) #btnBoardSize { display: none !important; }';
  document.head.append(css);
  new MutationObserver(() => {
    if (!document.body.classList.contains('paging') && G.boardBig && G.boardBig()) G.setBoardBig(false);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* 2. (Boon, 28 Nov 2026) The game buttons in this order: the mode switch, Pass, Resign, Analyse, Save, then New and Set up.
        New and Set up are kept together, so when the row wraps they go to the second row as a pair. */
  const bar = document.getElementById('controls');
  const id = x => document.getElementById(x);
  if (bar) {
    const pair = document.createElement('span');
    pair.className = 'btnPair';
    pair.append(id('btnNew'), id('btnSetup'), id('btnSCancel'));
    bar.append(id('btnMode'), id('btnPass'), id('btnUndo'), id('btnRedo'), id('btnResign'), id('btnAnalyse'), id('btnSave'), pair);
    css.textContent += ' .btnPair { display: inline-flex; gap: 10px; flex: 0 0 auto; }';
  }

  /* 3. (Boon, 28 Nov 2026) A Clear button in the middle of the row under the board (the Shapes and Territory row): it clears
        the board for a new game with the same settings (size, handicap, colour), without the New game box. A slip would lose
        the game, so the first tap asks "Sure?" and a second tap within 3 seconds clears. Shown only in an ordinary game: not
        in a famous game or while exploring a move (lessons, puzzles and the teacher hide the whole row already). */
  /* 4. (Boon, 28 Nov 2026) The message row under the chat was larger than the rest (16px against the chat's 15.2px and the
        buttons' 13.6px). Its typing and placeholder now match the chat text (--text), and Clear and Send match the other
        buttons (.85rem). Note for Go Coach: on an iPhone, a typing box under 16px makes Safari zoom in when tapped. */
  css.textContent += ' .chatInput { font-size: var(--text); } .chatForm button { font-size: .85rem; }';

  const row = document.getElementById('boardBar');
  if (row) {
    const clear = document.createElement('button');
    clear.type = 'button'; clear.className = 'tab'; clear.id = 'btnClearBoard'; clear.textContent = 'Clear';
    clear.title = 'Clear the board for a new game with the same settings';
    row.lastElementChild.before(clear);
    row.style.position = 'relative';
    css.textContent += ' #btnClearBoard { position: absolute; left: 50%; transform: translateX(-50%); }';
    let armed = 0;
    const reset = () => { armed = 0; clear.textContent = 'Clear'; };
    clear.addEventListener('click', () => {
      if (Date.now() - armed > 3000) { armed = Date.now(); clear.textContent = 'Sure?'; setTimeout(() => { if (armed && Date.now() - armed >= 3000) reset(); }, 3100); return; }
      reset();
      G.startNewGame();
    });
    const show = () => { clear.hidden = !!((G.kifu && G.kifu.on) || (G.exploring && G.exploring.on) || (G.setupOn && G.setupOn())); };
    new MutationObserver(show).observe(row, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
    document.addEventListener('click', () => setTimeout(show, 0), true);
    show();
  }
  /* 5. (Boon, 28 Nov 2026) Play mode: the chat panel becomes the moves panel. In your own game in Play mode, the chat's
        messages are hidden and the panel lists every move in two columns, Black then White, numbered (a tap goes back or forward to that
        move, as on the Computer panel). The message row stays: sending a message, Analyse or "Show chat" brings the chat
        back until the next move is played. Coach mode, lessons, puzzles, famous games and Set up keep the chat. */
  const log = document.querySelector('#chat .chatLog');
  if (log) {
    const box = document.createElement('div');
    box.id = 'lgbMoves'; box.className = 'chatLog lgbMoves';
    const head = document.createElement('div'); head.className = 'lgbMovesHead';
    const title = document.createElement('span'); title.className = 'computerHead'; title.textContent = 'Moves:';
    const toChat = document.createElement('button'); toChat.type = 'button'; toChat.className = 'tab'; toChat.textContent = 'Show chat';
    const list = document.createElement('ol'); list.className = 'computerLog';
    head.append(title, toChat); box.append(head, list); log.before(box);
    css.textContent += ' body:not(.lgbMovesOn) #lgbMoves { display: none; } body.lgbMovesOn #chat .chatLog:not(#lgbMoves) { display: none; }' +
      ' #lgbMoves { display: flex; flex-direction: column; } #lgbMoves .computerLog { display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; align-content: start; }' +
      ' #lgbMoves .colHead { font-weight: 600; padding: 1px 4px; color: var(--mute); } #lgbMoves .wide { grid-column: 1 / -1; }' +
      ' .lgbMovesHead { display: flex; justify-content: space-between; align-items: center; padding-right: 30px; }';
    const E = G.E;
    let showChat = false, seen = -1;
    const ownGame = () => { const P = G.Play; return !!(P && P.s) && !(G.Lesson && G.Lesson.on) && !(G.teaching && G.teaching.on) &&
      !(G.exploring && G.exploring.on) && !(G.kifu && G.kifu.on) && !(G.setupOn && G.setupOn()); };
    const line = () => { const P = G.Play, out = P.s.moves.slice(); for (let r = P.redo.length - 1; r >= 0; r--) out.push(...P.redo[r]); return out; };
    function paint() {
      const P = G.Play;
      if (P && P.s && P.s.moves.length !== seen) { seen = P.s.moves.length; showChat = false; }
      const on = (G.settings.mode || 'play') !== 'coach' && ownGame() && !showChat;
      document.body.classList.toggle('lgbMovesOn', on);
      if (!on) return;
      const s = P.s, all = line(), now = s.moves.length, canJump = P.phase === 'play';
      list.textContent = '';
      let cur = null;
      /* Two columns, Black then White (Boon, 28 Nov 2026): a row for each Black move with White's reply beside it; a White
         move with no Black move before it in its row (a handicap game starts with White) gets an empty Black cell. */
      const who = c => (c === 1 ? 'Black' : 'White') + (c === P.human && !P.both ? ' (you)' : '');
      for (const c of [1, 2]) { const h = document.createElement('li'); h.className = 'colHead'; h.textContent = who(c); list.append(h); }
      let col = 0; /* the column the next cell goes in: 0 Black, 1 White */
      all.forEach((m, k) => {
        const want = m.c === 1 ? 0 : 1;
        if (want !== col) { list.append(document.createElement('li')); col = 1 - col; }
        const li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.disabled = !canJump;
        b.textContent = (k + 1) + '. ' + (m.i < 0 ? 'pass' : E.coord(s.n, m.i));
        b.title = 'Go to move ' + (k + 1);
        if (k >= now) li.className = 'later';
        b.addEventListener('click', () => G.jumpTo(all.slice(0, k + 1)));
        li.append(b); list.append(li);
        col = 1 - col;
        if (k < now) cur = li;
      });
      if (cur) cur.classList.add('now');
      if (!all.length) { const li = document.createElement('li'); li.className = 'note wide'; li.textContent = 'No moves yet.'; list.append(li); }
      if (P.thinking && P.phase === 'play' && s.turn !== P.human && !P.both) { const li = document.createElement('li'); li.className = 'note wide'; li.textContent = 'Computer thinking…'; list.append(li); cur = li; }
      if (cur) list.scrollTop = Math.max(0, cur.offsetTop + cur.offsetHeight - list.clientHeight + 4);
    }
    const chatBack = () => { showChat = true; paint(); };
    toChat.addEventListener('click', chatBack);
    document.querySelector('#chat .chatForm').addEventListener('submit', chatBack, true);
    document.getElementById('btnAnalyse').addEventListener('click', chatBack, true);
    document.addEventListener('gc:play-changed', () => setTimeout(paint, 0));
    document.addEventListener('gc:chat-changed', () => setTimeout(paint, 0));
    document.getElementById('btnMode').addEventListener('click', () => setTimeout(paint, 0));
    paint();
  }
})();
