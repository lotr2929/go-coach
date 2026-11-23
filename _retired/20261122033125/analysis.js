/* Go Coach — local analysis: alternative moves, territory, game review */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, toast, click, colourName, REASONS, Play, playView, renderPlay } = G;
  const CM = window.GoCommentary;

  /* ---------- ANALYSIS (local simulation, no AI service) ---------- */
  const Ana = { on: false, mode: 'pos', s: null, base: 0, k: 0, token: 0, res: null, busy: false, showOwn: true, cache: {}, played: -1, variation: false, open: -1, overview: false, final: null };
  const LET = 'ABCDEF';
  const pct = x => Math.round(x * 100);

  function openAna() {
    if (!Play.s || Play.thinking) return;
    Ana.on = true; Ana.mode = 'pos'; Ana.cache = {}; Ana.overview = false; Ana.final = null; Ana.showOwn = $('#aOwn').checked; G.setChips(G.ANA_CHIPS);
    loadAna();
  }
  function loadAna() {
    const full = Play.s;
    Ana.variation = false; Ana.res = null; Ana.played = -1; Ana.open = -1;
    if (Ana.mode === 'review' && full.moves.length) {
      Ana.k = Math.max(0, Math.min(Ana.k, full.moves.length - 1));
      Ana.s = E.stateAt(full, Ana.k); Ana.played = full.moves[Ana.k].i;
      if (Ana.cache[Ana.k]) { Ana.token++; Ana.busy = false; Ana.res = Ana.cache[Ana.k]; Ana.base = Ana.s.hist.length; return renderAna(); }
    } else Ana.s = E.clone(full);
    Ana.base = Ana.s.hist.length;
    runAna();
  }
  async function runAna() {
    const s = Ana.s, tok = ++Ana.token;
    Ana.res = null;
    if (s.passes >= 2) { Ana.busy = false; return renderAna(); }
    Ana.busy = true; renderAna();
    const include = Ana.mode === 'review' && !Ana.variation && Ana.played >= 0 ? [Ana.played] : [];
    const res = await E.analyse(s, s.turn, { include, cancelled: () => tok !== Ana.token });
    if (tok !== Ana.token || !res) return;
    Ana.res = res; Ana.busy = false;
    if (Ana.mode === 'review' && !Ana.variation) Ana.cache[Ana.k] = res;
    renderAna();
  }
  function verdictText() {
    const res = Ana.res;
    if (!res || Ana.variation || Ana.mode !== 'review' || !Play.s.moves.length) return '';
    const m = Play.s.moves[Ana.k], who = colourName(m.c);
    if (m.i < 0) return `${who} passed.`;
    const pl = res.moves.find(x => x.move === m.i), best = res.moves[0], n = Play.s.n;
    if (!pl || !best) return `${who} played ${E.coord(n, m.i)}.`;
    const loss = best.wr - pl.wr;
    if (m.i === best.move || loss < .02) return `${who} played ${E.coord(n, m.i)}: good move (${pct(pl.wr)}%).`;
    const label = loss < .06 ? 'slight inaccuracy' : loss < .12 ? 'mistake' : 'blunder';
    return `${who} played ${E.coord(n, m.i)}: ${label} (${pct(pl.wr)}% chance of winning). ${CM.compare(E, Ana.s, m.i, best.move, m.c, Play.human)}`;
  }
  function renderAna() {
    const s = Ana.s, res = Ana.res, n = s.n;
    if (Ana.mode === 'review' && Ana.overview) return G.renderOverview();
    $('#anaChart').hidden = true;
    $('#controls').hidden = true; $('#chat').hidden = false; $('#scorePanel').hidden = true; $('#anaPanel').hidden = false;
    $('#aModePos').classList.toggle('on', Ana.mode === 'pos'); $('#aModeRev').classList.toggle('on', Ana.mode === 'review');
    $('#reviewRow').hidden = Ana.mode !== 'review';
    const total = Play.s.moves.length;
    $('#aReviewLbl').textContent = total ? `Move ${Ana.k + 1} of ${total}` : 'No moves yet';
    $('#aPrev').disabled = Ana.k <= 0; $('#aNext').disabled = Ana.k >= total - 1;
    const top = res ? res.moves.slice(0, 5) : [], marks = {};
    top.forEach((m, i) => { marks[m.move] = LET[i]; });
    const showPlayed = Ana.mode === 'review' && !Ana.variation && Ana.played >= 0;
    playView.set({
      n, board: s.board, last: s.last, ko: s.ko, coords: settings.coords, libs: settings.libs, marks,
      hint: (showPlayed ? [Ana.played] : []).concat(Ana.open >= 0 ? [Ana.open] : []), ghost: -1, ghostColor: s.turn, hoverColor: Ana.busy ? 0 : s.turn,
      terr: null, dead: null, own: Ana.showOwn && res ? res.own : null
    });
    $('#whoTurn').textContent = Ana.busy ? 'Analysing…' : `Analysis · ${colourName(s.turn)} to play`;
    $('#capsInfo').textContent = `Prisoners: ● ${s.caps[1]}  ○ ${s.caps[2]}`;
    // win bar (Black share)
    let b = 50;
    if (res && res.moves.length) b = pct(s.turn === 1 ? res.moves[0].wr : 1 - res.moves[0].wr);
    else if (res) b = Math.max(2, Math.min(98, Math.round(50 + res.diff * 3)));
    $('#barB').style.width = b + '%'; $('#barL').textContent = `● ${b}%`; $('#barR').textContent = `${100 - b}% ○`;
    // summary
    const lines = [];
    const v = verdictText(); if (v) lines.push(v);
    if (res) lines.push(`Territory estimate: ${res.diff > 0 ? 'Black' : 'White'} ahead by about ${Math.abs(res.diff).toFixed(1)} points (komi included).`);
    lines.push(CM.positionSummary(E, s, Play.human));
    if (!res && !Ana.busy) lines.push(s.passes >= 2 ? 'Both players passed here.' : 'No moves to analyse.');
    $('#anaSummary').textContent = Ana.busy ? 'Working out the best moves…' : lines.join('\n');
    // candidate rows
    const box = $('#anaList'); box.innerHTML = '';
    if (res) {
      const rows = res.moves.slice(0, 5);
      if (showPlayed && !rows.some(r => r.move === Ana.played)) { const pl = res.moves.find(r => r.move === Ana.played); if (pl) rows.push(pl); }
      rows.forEach(m => {
        const idx = res.moves.indexOf(m);
        const btn = document.createElement('button');
        btn.className = 'cand' + (showPlayed && m.move === Ana.played ? ' played' : '') + (Ana.open === m.move ? ' open' : '');
        btn.innerHTML = '<span class="ltr"></span><span class="pc"></span><span class="tx"></span>';
        btn.children[0].textContent = idx < 5 ? LET[idx] : '·';
        btn.children[1].textContent = pct(m.wr) + '%';
        btn.children[2].textContent = `${E.coord(n, m.move)}: ${CM.headline(E, s, m.move, s.turn, Play.human)}${showPlayed && m.move === Ana.played ? ' (played)' : ''}`;
        btn.addEventListener('click', () => { Ana.open = Ana.open === m.move ? -1 : m.move; renderAna(); });
        box.append(btn);
        if (Ana.open === m.move) {
          const more = document.createElement('div');
          more.className = 'candDetail';
          more.textContent = CM.deepDive(E, s, m.move, s.turn, Play.human);
          box.append(more);
        }
      });
    }
    $('#aBack').disabled = s.hist.length <= Ana.base;
    $('#aReset').disabled = Ana.mode === 'pos' ? !Ana.variation : false;
  }
  function anaPlay(i) {
    const s = Ana.s;
    if (!s || s.passes >= 2) return;
    const r = E.play(s, i);
    if (!r.ok) { toast(REASONS[r.reason] || 'Illegal move.'); return; }
    click(); Ana.variation = true; Ana.open = -1; runAna();
  }
  function anaTap(i) { anaPlay(i); }
  function anaBack() {
    const s = Ana.s;
    if (s.hist.length <= Ana.base) return;
    E.undo(s);
    Ana.open = -1;
    Ana.variation = s.hist.length > Ana.base;
    if (!Ana.variation && Ana.mode === 'review' && Ana.cache[Ana.k]) { Ana.token++; Ana.busy = false; Ana.res = Ana.cache[Ana.k]; renderAna(); }
    else runAna();
  }
  function exitAna() {
    Ana.on = false; Ana.token++; Ana.busy = false; Ana.overview = false; G.setChips(G.PLAY_CHIPS);
    renderPlay();
  }
  $('#btnAnalyse').onclick = openAna;
  $('#aExit').onclick = exitAna;
  $('#aBack').onclick = anaBack;
  $('#aReset').onclick = loadAna;
  $('#aModePos').onclick = () => { Ana.mode = 'pos'; Ana.overview = false; loadAna(); };
  $('#aModeRev').onclick = () => G.startReview();
  $('#aPrev').onclick = () => { Ana.k--; loadAna(); };
  $('#aNext').onclick = () => { Ana.k++; loadAna(); };
  $('#aOwn').onchange = e => { Ana.showOwn = e.target.checked; renderAna(); };

  Object.assign(G, { Ana, renderAna, anaTap, loadAna });
})();
