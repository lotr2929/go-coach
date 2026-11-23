/* Go Coach — the Shapes tab under the board.
   When it is on, the shapes found by shapes.js are boxed on the board in a light colour (green good, red bad, blue neutral,
   orange weak point) and numbered. Shapes already made have a solid border; shapes the side to move could make next have a
   dashed border and a dashed ring on the move that makes them. Turning it on lists them all in the chat, and after each move
   the coach names any shape that move made. Works on the learner's game and on a famous game (Kifu). */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, saveSettings, toast, Play } = G;
  const SH = window.GoShapes;
  const RGB = { good: '46,160,80', bad: '215,60,45', neutral: '40,110,205', weak: '230,140,20' };
  const sigOf = s => Array.from(s.board).join('') + s.turn;
  let cache = null; /* { sig, list, keys, moves } for one position */

  /* Same rules as the Territory tab: the board belongs to a lesson, the teacher or an exploration while they run. */
  const kifuOn = () => !!(G.kifu && G.kifu.on);
  const live = () => (kifuOn() ? G.kifu.state() : Play.s);
  const idle = () => !kifuOn() && (!Play.s || Play.phase !== 'play' || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on));
  const viewer = () => (kifuOn() ? 0 : Play.human);
  /* Possible shapes are shown for the side to move when that is the learner (or anyone, in a famous game). */
  const showPossible = s => kifuOn() || (s.turn === Play.human && !Play.thinking);

  function compute() {
    const s = live();
    if (!s) return null;
    const sig = sigOf(s) + (showPossible(s) ? '+' : '');
    if (cache && cache.sig === sig) return cache;
    const made = SH.scan(s.n, s.board), could = showPossible(s) ? SH.possible(E, s, s.turn, 3) : [];
    const list = made.concat(could).map((sh, k) => Object.assign(sh, { label: k + 1 }));
    const prev = cache;
    cache = { sig, list, keys: new Set(made.map(x => x.key)), moves: s.moves.length, n: s.n };
    /* One move later: name the shapes that move made. */
    if (prev && prev.n === s.n && s.moves.length === prev.moves + 1 && s.last >= 0) {
      const fresh = made.filter(x => !prev.keys.has(x.key) && x.pts.includes(s.last)).slice(0, 2);
      if (fresh.length) setTimeout(() => G.say(`**Shapes:**\n` + fresh.map(x => `${x.label}. ${SH.describe(s.n, x, viewer())}`).join('\n')), 0);
    }
    return cache;
  }

  /* What renderPlay and the Kifu view hand to the board, or null when the tab is off or the board is busy elsewhere. */
  function marks() {
    if (!settings.shapes || idle()) return null;
    const c = compute();
    return c ? c.list.map(sh => ({ pts: sh.pts, rgb: RGB[SH.KINDS[sh.kind].tone], dashed: !!sh.potential, label: sh.label, move: sh.potential ? sh.move : -1 })) : null;
  }

  function listAll() {
    const c = compute(), s = live();
    if (!c || !s) return;
    const made = c.list.filter(x => !x.potential), could = c.list.filter(x => x.potential);
    const line = x => `${x.label}. ${SH.describe(s.n, x, viewer(), true)}`;
    const parts = ['**Shapes on the board:**', made.length ? made.map(line).join('\n') : 'None yet.'];
    if (could.length) parts.push('', `**Shapes ${viewer() === s.turn ? 'you' : s.turn === 1 ? 'Black' : 'White'} could make next (dashed borders):**`, could.map(line).join('\n'));
    /* Each kind of shape is explained once. */
    const kinds = [...new Set(c.list.map(x => x.kind))];
    if (kinds.length) parts.push('', '**What they mean:**', kinds.map(k => `${SH.KINDS[k].name}: ${SH.KINDS[k].text}`).join('\n'));
    parts.push('', 'Colours: green good shape, red bad shape, blue neutral, orange weak point.');
    G.say(parts.join('\n'));
  }

  function syncButton() {
    const b = $('#btnShapes'), on = !!settings.shapes;
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? 'Shapes are marked on the board. Tap to hide them.' : 'Mark good and bad shapes on the board';
  }
  $('#btnShapes').addEventListener('click', () => {
    settings.shapes = !settings.shapes; saveSettings(); syncButton();
    if (settings.shapes && idle()) { toast('Shapes are shown on your game or a famous game.'); return; }
    cache = null;
    if (kifuOn()) G.renderKifu(); else G.renderPlay();
    if (settings.shapes) listAll(); else toast('Shapes hidden');
  });
  syncButton();

  Object.assign(G, { shapeMarks: marks });
})();
