/* Go Coach — the Shapes tab under the board.
   When it is on, the shapes found by shapes.js are boxed on the board in a light colour (green good, red bad, blue neutral,
   orange weak point) and numbered. Shapes already made have a solid border; shapes the side to move could make next have a
   dashed border and a dashed ring on the move that makes them. Turning it on lists them all in the chat, and after each move
   the coach names any shape that move made. Works on the learner's game and on a famous game (Kifu). */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, saveSettings, toast, Play } = G;
  const SH = window.GoShapes, T = (k, v) => window.GoText.T('shapes.' + k, v); /* wording: docs/text/en/shapes.md */
  const RGB = { good: '46,160,80', bad: '215,60,45', neutral: '40,110,205', weak: '230,140,20' };
  /* The order of the numbers (Boon, 27 Nov 2026): Black's shapes, then White's, each good first and bad last; then the shapes
     that could be made next. */
  const TONE_ORDER = { good: 0, neutral: 1, weak: 2, bad: 3 };
  const rank = sh => sh.color * 10 + TONE_ORDER[SH.KINDS[sh.kind].tone];
  const sigOf = s => Array.from(s.board).join('') + s.turn;
  let cache = null; /* { sig, list, keys, moves } for one position */
  let focus = null;  /* after a tap: { sig, keys } of the shapes being explained; only they are drawn until the board changes */

  /* Same rules as the Territory tab: the board belongs to a lesson, the teacher or an exploration while they run,
     and silent Play mode (play.js playSilent) shows no shapes: the tab is greyed out until Coach mode is on. */
  const kifuOn = () => !!(G.kifu && G.kifu.on);
  const live = () => (kifuOn() ? G.kifu.state() : Play.s);
  const idle = () => !kifuOn() && (!Play.s || Play.phase !== 'play' || G.playSilent() || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on));
  const viewer = () => (kifuOn() ? 0 : Play.human);
  /* Possible shapes are shown for the side to move when that is the learner (or anyone, in a famous game). */
  const showPossible = s => kifuOn() || (s.turn === Play.human && !Play.thinking);

  function compute() {
    const s = live();
    if (!s) return null;
    const sig = sigOf(s) + (showPossible(s) ? '+' : '');
    if (cache && cache.sig === sig) return cache;
    const made = SH.scan(s.n, s.board), could = showPossible(s) ? SH.possible(E, s, s.turn, 3) : [];
    const list = made.slice().sort((a, b) => rank(a) - rank(b)).concat(could).map((sh, k) => Object.assign(sh, { label: k + 1 }));
    const prev = cache;
    cache = { sig, list, keys: new Set(made.map(x => x.key)), moves: s.moves.length, n: s.n };
    /* One move later: name the shapes that move made. */
    if (prev && prev.n === s.n && s.moves.length === prev.moves + 1 && s.last >= 0) {
      const fresh = made.filter(x => !prev.keys.has(x.key) && x.pts.includes(s.last)).slice(0, 2);
      if (fresh.length) setTimeout(() => G.say(T('made') + '\n' + fresh.map(x => `${x.label}. ${SH.describe(s.n, x, viewer())}`).join('\n')), 0);
    }
    return cache;
  }

  /* What renderPlay and the Kifu view hand to the board, or null when the tab is off or the board is busy elsewhere. */
  function marks() {
    if (!settings.shapes || idle()) return null;
    const c = compute();
    if (!c) return null;
    const shown = focus && focus.sig === c.sig ? c.list.filter(sh => focus.keys.includes(sh.key)) : c.list;
    return shown.map(sh => ({ pts: sh.pts, rgb: RGB[SH.KINDS[sh.kind].tone], dashed: !!sh.potential, label: sh.label, move: sh.potential ? sh.move : -1 }));
  }

  function listAll() {
    const c = compute(), s = live();
    if (!c || !s) return;
    const made = c.list.filter(x => !x.potential), could = c.list.filter(x => x.potential);
    const line = x => `${x.label}. ${SH.describe(s.n, x, viewer(), true)}`;
    const parts = made.length ? [] : [T('list'), T('none')];
    for (const c2 of [1, 2]) {
      const mine = made.filter(x => x.color === c2);
      if (mine.length) parts.push((parts.length ? '\n' : '') + T(c2 === 1 ? 'list-black' : 'list-white'), mine.map(line).join('\n'));
    }
    if (could.length) parts.push('', T('could', { who: T(viewer() === s.turn ? 'you' : s.turn === 1 ? 'black' : 'white') }), could.map(line).join('\n'));
    /* Each kind of shape is explained once. */
    const kinds = [...new Set(c.list.map(x => x.kind))];
    if (kinds.length) parts.push('', T('mean'), kinds.map(k => T('mean-line', { name: SH.KINDS[k].name, text: SH.KINDS[k].text })).join('\n'));
    parts.push('', T('colours'));
    G.say(parts.join('\n'));
  }

  /* A tap on a stone that is part of a marked shape explains that shape (an empty point still plays a move).
     Returns true when the tap was used for this. */
  function tap(i) {
    if (!settings.shapes || idle()) return false;
    const s = live(), c = compute();
    if (!s || !c || !s.board[i]) return false;
    const hit = c.list.filter(sh => !sh.potential && sh.stones.includes(i)).slice(0, 2);
    const rerender = () => (kifuOn() ? G.renderKifu() : G.renderPlay());
    if (!hit.length) {
      if (focus) { focus = null; rerender(); return true; }
      return false;
    }
    const keys = hit.map(sh => sh.key);
    if (focus && focus.sig === c.sig && keys.every(k => focus.keys.includes(k))) { focus = null; rerender(); return true; } /* second tap: all shapes again */
    focus = { sig: c.sig, keys };
    rerender();
    G.say(hit.map(sh => {
      const K = SH.KINDS[sh.kind], line = SH.describe(s.n, sh, viewer(), true), m = line.match(/^[^(]*\(([^)]*)\).*$/);
      return T('tap', { label: sh.label, name: K.name, a: K.a, tone: T('tap-tone.' + K.tone), here: m ? T('here', { where: m[1] }) : line, more: K.more });
    }).join('\n\n') + '\n\n' + T('tap-again'));
    return true;
  }

  function syncButton() {
    const b = $('#btnShapes'), on = !!settings.shapes, silent = G.playSilent();
    b.disabled = silent;
    b.setAttribute('aria-pressed', String(on && !silent));
    b.title = T(silent ? 'tab-silent' : on ? 'tab-on' : 'tab-off');
  }
  $('#btnShapes').addEventListener('click', () => {
    settings.shapes = !settings.shapes; saveSettings(); syncButton();
    if (settings.shapes && idle()) { toast(T('toast-idle')); return; }
    cache = null; focus = null;
    if (kifuOn()) G.renderKifu(); else G.renderPlay();
    if (settings.shapes) listAll(); else toast(T('toast-hidden'));
  });
  syncButton();

  /* Hovering over a shape's number on the board (board.js) pops up what that shape is and what it means. */
  G.playView.onShapeHover = (label, x, y) => {
    const c = cache, s = live(), sh = label && c && c.list.find(z => z.label === label);
    G.placeTip(sh && s ? `${sh.label}. ${SH.describe(s.n, sh, viewer(), true)}\n${SH.KINDS[sh.kind].text}` : '', x, y);
  };

  Object.assign(G, { shapeMarks: marks, shapeTap: tap, syncShapesTab: syncButton });
})();
