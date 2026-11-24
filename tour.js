/* Go Coach — "How to use the app": a moving tour that highlights each part of the screen in turn with a short explanation,
   and afterwards the same explanation as a small tip when a mouse rests on that button, or a finger presses and holds it.
   The tour moves on by itself every few seconds; Back, Pause and Next steer it, and Esc or ✕ ends it.
   Parts that are hidden at the moment (such as the win-chance bar before it has a reading) are skipped. */
(() => {
  'use strict';
  const G = window.GC;
  const { $ } = G;
  const { T } = window.GoText;

  /* sel: one selector, or several to highlight together. hover: false where a tip would get in the way.
     key: the step's name in docs/text/en/tour.md, which holds its title (key.title) and explanation (key.text). */
  const STEPS = [
    { key: 'title', sel: '.titleBox' },
    { key: 'flag', sel: '#btnFlag' },
    { key: 'settings', sel: '#btnSettings' },
    { key: 'whoturn', sel: '#whoTurn' },
    { key: 'ahead', sel: '#posInfo' },
    { key: 'prisoners', sel: '#capsInfo' },
    { key: 'board', sel: '.boardWrap', hover: false },
    { key: 'arrows', sel: ['#btnUndoArrow', '#btnRedoArrow'] },
    { key: 'shapes', sel: '#btnShapes' },
    { key: 'territory', sel: '#btnTerr' },
    { key: 'mode', sel: '#btnMode' },
    { key: 'pass', sel: '#btnPass' },
    { key: 'undo', sel: ['#btnUndo', '#btnRedo'] },
    { key: 'analyse', sel: '#btnAnalyse' },
    { key: 'resign', sel: '#btnResign' },
    { key: 'new', sel: '#btnNew' },
    { key: 'chat', sel: '.chatLog', hover: false },
    { key: 'chatsize', sel: '#btnChatSize' },
    { key: 'ask', sel: '.chatInput', hover: false },
    { key: 'clear', sel: '#btnClear' },
    { key: 'send', sel: '.chatForm button[type="submit"]' }
  ];
  for (const s of STEPS) { s.title = T(`tour.${s.key}.title`); s.text = T(`tour.${s.key}.text`); }
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
      btn('‹', T('tour.back'), () => { paused = true; go(idx - 1); }),
      btn(paused ? '▶' : '❚❚', T(paused ? 'tour.play' : 'tour.pause'), () => { paused = !paused; show(); }),
      btn('›', T('tour.next'), () => go(idx + 1)),
      btn('✕', T('tour.close'), end));
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
    G.say(T(mouse ? 'tour.end-mouse' : 'tour.end-touch'));
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
