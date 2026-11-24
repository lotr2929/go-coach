/* Go Coach — "How to use the app": a moving tour that highlights each part of the screen in turn with a short explanation,
   and afterwards the same explanation as a small tip when a mouse rests on that button, or a finger presses and holds it.
   The tour moves on by itself every few seconds; Back, Pause and Next steer it, and Esc or ✕ ends it.
   Parts that are hidden at the moment (such as the win-chance bar before it has a reading) are skipped. */
(() => {
  'use strict';
  const G = window.GC;
  const { $ } = G;

  /* sel: one selector, or several to highlight together. hover: false where a tip would get in the way. */
  const STEPS = [
    { sel: '.titleBox', title: 'Go Coach', text: 'The date under the title is the version you are using. If it looks old, open Settings (⚙) and tap Check for updates.' },
    { sel: '#btnFlag', title: 'Flag', text: 'If something looks wrong, tap here and type a few words. The position and the last messages are sent to the developer, as long as usage logging is on in Settings.' },
    { sel: '#btnSettings', title: 'Settings', text: 'Coordinates, liberties, tap twice to place, stone sound, how long the territory map may think, copying the game record, usage logging, and Check for updates.' },
    { sel: '#whoTurn', title: 'Whose move', text: 'Whose turn it is, and how many stones each side has on the board.' },
    { sel: '#posInfo', title: 'Who is ahead', text: 'Each side’s chance of winning, from the computer reading the position. About 50 : 50 means the game is even.' },
    { sel: '#capsInfo', title: 'Prisoners', text: 'How many stones each side has captured.' },
    { sel: '.boardWrap', hover: false, title: 'The board', text: 'Tap a point to place your stone. With "Tap twice to place" on in Settings, the first tap shows where it will go and the second places it. With Shapes on, tap one of your stones inside a box to hear about its shape.' },
    { sel: ['#btnUndoArrow', '#btnRedoArrow'], title: 'Undo and Redo', text: 'Take back your last move, or play it again. In a famous game they step back and forward through the record.' },
    { sel: '#btnShapes', title: 'Shapes', text: 'Marks good shapes in green, bad shapes in red, neutral ones in blue and weak points in orange. Dashed boxes are shapes you could make next. Tap a stone in a box for an explanation. In your own game it works in Coach mode only.' },
    { sel: '#btnTerr', title: 'Territory', text: 'Shades each empty point by who is likely to own it, worked out from many quick games played to the end. Bigger, stronger squares mean more certain. In your own game it works in Coach mode only.' },
    { sel: '#btnMode', title: 'Play mode or Coach mode', text: 'In Play mode the coach stays quiet until you ask. In Coach mode it suggests moves every turn and tells you how each of your moves went, with the evidence.' },
    { sel: '#btnPass', title: 'Pass', text: 'Skip your turn. When both players pass one after the other, the game ends and is counted.' },
    { sel: ['#btnUndo', '#btnRedo'], title: 'Undo and Redo', text: 'The same as the arrows under the board: take back your last move, or play it again.' },
    { sel: '#btnAnalyse', title: 'Analyse', text: 'The coach marks its best ideas A to E on the board, with each one’s chance of winning. Then ask "why A?" or "compare A and B".' },
    { sel: '#btnResign', title: 'Resign', text: 'Give up this game.' },
    { sel: '#btnNew', title: 'New game', text: 'Choose the board size (9 × 9 is quick, 13 × 13 is medium, 19 × 19 is the full game), your colour, the computer’s level (Easy, Medium or Hard), the coach’s level and any handicap stones. Starting a new game also clears the chat.' },
    { sel: '.chatLog', hover: false, title: 'The chat', text: 'The coach’s messages appear here. Bold headings mark analyses, reviews and explanations.' },
    { sel: '#btnChatSize', title: 'Enlarge the chat', text: 'Makes the chat fill the screen for easier reading. Tap it again to go back to the board.' },
    { sel: '.chatInput', hover: false, title: 'Ask the coach', text: 'Type anything here: "hint", "why?", "what is a ponnuki?", a point such as "D4", or a number from the welcome. Type Help to see the welcome again.' },
    { sel: '#btnClear', title: 'Clear', text: 'Empties the chat. Type Help at any time to see the welcome again.' },
    { sel: '.chatForm button[type="submit"]', title: 'Send', text: 'Sends your message. Pressing Enter does the same.' }
  ];
  const MS = 7000; /* how long each step stays when the tour moves on by itself */

  const list = s => (Array.isArray(s.sel) ? s.sel : [s.sel]);
  const elems = s => list(s).map(q => document.querySelector(q)).filter(e => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0);
  /* The rectangle around all of a step's parts. */
  function rectOf(es) {
    const rs = es.map(e => e.getBoundingClientRect());
    const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top));
    return { left: l, top: t, right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom)) };
  }
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };
  /* Puts a tip next to rectangle r: below it if there is room, otherwise above, and always inside the screen. */
  function placeTip(tip, r) {
    const vw = window.innerWidth, vh = window.innerHeight, w = Math.min(340, vw - 24);
    tip.style.width = w + 'px';
    const h = tip.offsetHeight;
    let top = r.bottom + 12;
    if (top + h > vh - 12) top = r.top - h - 12;
    if (top < 12) top = Math.max(12, Math.min(vh - h - 12, (r.top + r.bottom) / 2 - h / 2));
    tip.style.top = top + 'px';
    tip.style.left = Math.max(12, Math.min(vw - w - 12, (r.left + r.right) / 2 - w / 2)) + 'px';
  }

  /* ---------- the tour ---------- */
  let shade = null, ring = null, tip = null, steps = [], idx = 0, timer = 0, paused = false;
  function build() {
    shade = mk('div', 'tourShade'); ring = mk('div', 'tourRing'); tip = mk('div', 'tourTip');
    tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-live', 'polite');
    shade.addEventListener('click', () => go(idx + 1));
    document.body.append(shade, ring, tip);
  }
  function show() {
    clearTimeout(timer);
    const s = steps[idx], es = elems(s);
    if (!es.length) return go(idx + 1);
    es[0].scrollIntoView({ block: 'nearest' });
    const r = rectOf(es), pad = 6;
    Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.right - r.left + 2 * pad + 'px', height: r.bottom - r.top + 2 * pad + 'px' });
    tip.innerHTML = '';
    const h = mk('strong', 'tourTitle'); h.textContent = s.title;
    const p = mk('p', 'tourText'); p.textContent = s.text;
    const bar = mk('div', 'tourBar');
    const count = mk('span', 'tourCount'); count.textContent = `${idx + 1} / ${steps.length}`;
    const btn = (label, aria, f) => { const b = mk('button', ''); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', aria); b.onclick = e => { e.stopPropagation(); f(); }; return b; };
    bar.append(count,
      btn('‹', 'Back', () => { paused = true; go(idx - 1); }),
      btn(paused ? '▶' : '❚❚', paused ? 'Play' : 'Pause', () => { paused = !paused; show(); }),
      btn('›', 'Next', () => go(idx + 1)),
      btn('✕', 'End the tour', end));
    tip.append(h, p, bar);
    placeTip(tip, r);
    if (!paused) timer = setTimeout(() => go(idx + 1), MS);
  }
  function go(i) {
    if (i >= steps.length) return end();
    idx = Math.max(0, i);
    show();
  }
  function start() {
    if (G.pageOpen && G.pageOpen()) G.closePage();
    if (document.body.classList.contains('chatBig')) $('#btnChatSize').click();
    if (!shade) build();
    steps = STEPS.slice(); idx = 0; paused = false;
    document.body.classList.add('touring');
    show();
  }
  function end() {
    clearTimeout(timer);
    document.body.classList.remove('touring');
    const mouse = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    G.say('That was the tour. ' + (mouse ? 'Rest the mouse on any button to see its explanation again' : 'Press and hold any button to see its explanation again') + ', or type 5 to replay the tour.');
  }
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('touring')) return;
    if (e.key === 'Escape') end();
    else if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') { paused = true; go(idx - 1); }
  });
  window.addEventListener('resize', () => { if (document.body.classList.contains('touring')) show(); });

  /* ---------- tips: a mouse resting on a button, or a finger pressing and holding it ---------- */
  let hint = null, hintFor = null, hintTimer = 0, savedTitle = null;
  const stepFor = target => {
    for (const s of STEPS) {
      if (s.hover === false) continue;
      for (const q of list(s)) { const e = target.closest && target.closest(q); if (e) return { s, e }; }
    }
    return null;
  };
  function hideHint() {
    clearTimeout(hintTimer);
    if (hint) hint.hidden = true;
    if (hintFor && savedTitle !== null) hintFor.setAttribute('title', savedTitle);
    hintFor = null; savedTitle = null;
  }
  function showHint(f) {
    if (!hint) { hint = mk('div', 'tourHint'); hint.setAttribute('role', 'tooltip'); document.body.append(hint); }
    hint.innerHTML = '';
    const h = mk('strong', 'tourTitle'); h.textContent = f.s.title;
    const p = mk('p', 'tourText'); p.textContent = f.s.text;
    hint.append(h, p); hint.hidden = false;
    placeTip(hint, f.e.getBoundingClientRect());
  }
  const touring = () => document.body.classList.contains('touring');

  /* Mouse: the tip appears after a short rest and goes when the mouse leaves. */
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || touring()) return;
    const f = stepFor(e.target);
    if (!f || f.e === hintFor) return;
    hideHint();
    hintFor = f.e;
    /* The button's own browser tooltip would repeat this, so it is set aside while the tip shows. */
    if (f.e.hasAttribute('title')) { savedTitle = f.e.getAttribute('title'); f.e.removeAttribute('title'); }
    hintTimer = setTimeout(() => showHint(f), 450);
  });
  document.addEventListener('pointerout', e => {
    if (e.pointerType === 'mouse' && hintFor && !(e.relatedTarget && hintFor.contains(e.relatedTarget))) hideHint();
  });

  /* Touch: press and hold a button for half a second to see its tip. Letting go then does not press the button.
     The tip stays for a few seconds, or until the next touch. */
  let hold = 0, held = false, startX = 0, startY = 0;
  const cancelHold = () => { clearTimeout(hold); hold = 0; };
  document.addEventListener('pointerdown', e => {
    hideHint();
    held = false;
    if (e.pointerType === 'mouse' || touring()) return;
    const f = stepFor(e.target);
    if (!f) return;
    startX = e.clientX; startY = e.clientY;
    hold = setTimeout(() => {
      hold = 0; held = true;
      hintFor = f.e; showHint(f);
      hintTimer = setTimeout(hideHint, 4000);
    }, 500);
  }, true);
  document.addEventListener('pointermove', e => { if (hold && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) cancelHold(); }, true);
  document.addEventListener('pointerup', cancelHold, true);
  document.addEventListener('pointercancel', cancelHold, true);
  document.addEventListener('click', e => { if (held) { held = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('contextmenu', e => { if (held || hold) e.preventDefault(); }, true);

  Object.assign(G, { startTour: start, TOUR_STEPS: STEPS });
})();
