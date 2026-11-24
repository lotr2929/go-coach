/* World of Go — the Territory tab (the right-hand tab under the board).
   When it is on, the coach plays many quick random games from the position on the board, works out how often each empty point ended up
   Black's or White's, and draws that as squares. Hovering over a point shows its score, from 0 (an even split) to 1 (always the same side);
   the colour of the square says which side. The map is redone after every move, and the last map stays on screen until the next one is ready.
   The Accuracy slider in Settings decides how long one map may take. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, saveSettings, toast, Play } = G;
  const STEPS = [1, 2, 3, 5, 8, 12, 20, 30, 45, 60]; /* seconds the slider can pick */
  const sigOf = s => Array.from(s.board).join('') + s.turn;
  let map = null; /* { n, moves, sig, own, sims, done, secs } for one position */
  let tok = 0, working = false;

  const secs = () => (STEPS.includes(+settings.terrSecs) ? +settings.terrSecs : 2);
  /* The map belongs to the game board, so it waits while a lesson, the teacher or an exploration has the board, and during scoring.
     It is also off in silent Play mode (play.js playSilent): the tab is greyed out until Coach mode is on. */
  const kifuOn = () => !!(G.kifu && G.kifu.on);
  /* The position the map is about: the game record being studied (Kifu), or the learner's own game. */
  const live = () => (kifuOn() ? G.kifu.state() : Play.s);
  const idle = () => !kifuOn() && (!Play.s || Play.phase !== 'play' || G.playSilent() || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on));

  /* The scores to draw, or null when the map is off or does not apply. */
  function own() {
    const s = live();
    return settings.terr && map && s && !idle() && map.n === s.n ? map.own : null;
  }
  /* The hover note for one point: its score from 0 to 1. */
  function info(i) {
    const o = own(), s = live();
    if (!o || !s || s.board[i]) return '';
    const fresh = map.done && map.sig === sigOf(s);
    return 'Territory ' + Math.abs(o[i]).toFixed(2) + (fresh ? '' : ' (updating)');
  }
  function syncButton() {
    const b = $('#btnTerr'), on = !!settings.terr, silent = G.playSilent();
    b.disabled = silent;
    b.setAttribute('aria-pressed', String(on && !silent));
    b.classList.toggle('busy', on && working && !silent);
    b.title = silent ? 'The territory map is available in Coach mode' : on && map ?`Territory map from ${map.sims} random games${map.done ? '' : ' so far'}. Tap to switch it off.` : 'Show who is likely to own each empty point';
  }

  async function update() {
    const mine = ++tok;
    working = false;
    if (!settings.terr || idle() || (!kifuOn() && Play.thinking)) { syncButton(); return; }
    const s = E.clone(live()), sig = sigOf(s);
    if (map && (map.n !== s.n || Math.abs(s.moves.length - map.moves) > 2)) map = null; /* a new game: start clean */
    if (map && map.sig === sig && map.done && map.secs === secs()) { syncButton(); return; }
    working = true; syncButton();
    const r = await E.territory(s, 0, () => mine !== tok, {
      ms: secs() * 1000,
      progress: (o, sims) => {
        map = { n: s.n, moves: s.moves.length, sig, own: o, sims, done: false, secs: secs() };
        G.playView.set({ own: own() });
        syncButton();
      }
    });
    if (!r || mine !== tok) return;
    map = { n: s.n, moves: s.moves.length, sig, own: r.own, sims: r.sims, done: true, secs: secs() };
    working = false; syncButton();
    G.renderPlay();
  }

  $('#btnTerr').addEventListener('click', () => {
    settings.terr = !settings.terr; saveSettings();
    if (settings.terr) { toast('Territory map on. Hover over a square to see its score.'); update(); }
    else { tok++; working = false; map = null; G.renderPlay(); toast('Territory map off'); }
    syncButton();
  });

  /* The Accuracy slider in Settings: it picks a time, and the map is redone when the slider is let go. */
  const slider = $('#setTerrSecs'), out = $('#terrSecsOut');
  const label = () => { out.textContent = secs() + (secs() === 1 ? ' second' : ' seconds'); };
  slider.max = String(STEPS.length - 1); slider.value = String(STEPS.indexOf(secs()));
  slider.addEventListener('input', () => { settings.terrSecs = STEPS[+slider.value]; label(); });
  slider.addEventListener('change', () => { saveSettings(); if (settings.terr) update(); });
  label(); syncButton();

  Object.assign(G, { mapTerritory: update, terrOwn: own, squareInfo: info, syncTerrTab: syncButton });
})();
