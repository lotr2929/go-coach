/* World of Go — whole-game review.
   Analyses every move one after another, then shows where the game stands, how each side played,
   the biggest mistakes and a tappable list of moves. Uses the same random-playout analysis as the
   rest of the app: no AI service. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, colourName, Play, playView } = G;
  const Ana = G.Ana;
  const pct = x => Math.round(x * 100);
  const who = c => colourName(c) + (c === Play.human ? ' (you)' : '');
  const kindOf = loss => (loss < .02 ? 'good move' : loss < .06 ? 'slight inaccuracy' : loss < .12 ? 'mistake' : 'blunder');
  const complete = () => !!Ana.final && Play.s.moves.every((m, k) => Ana.cache[k]);

  /* One row of facts per move: what was played, what was best, how much it cost, Black's chance afterwards. */
  function facts() {
    const rows = [];
    let carry = 50;
    Play.s.moves.forEach((m, k) => {
      const res = Ana.cache[k];
      const best = res && res.moves[0];
      const pl = res && m.i >= 0 ? res.moves.find(x => x.move === m.i) : null;
      let kind = m.i < 0 ? 'pass' : 'not reviewed', loss = 0;
      if (best && pl) { loss = Math.max(0, best.wr - pl.wr); kind = m.i === best.move ? 'good move' : kindOf(loss); }
      if (pl) carry = pct(m.c === 1 ? pl.wr : 1 - pl.wr);
      rows.push({ k, m, best, loss, kind, blackPct: carry });
    });
    return rows;
  }

  /* Black's chance of winning after each move, as a small line chart. */
  function chartHTML(points) {
    const w = 300, h = 70, n = points.length;
    const x = i => (i / (n - 1)) * w, y = p => h - (p / 100) * h;
    const d = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p).toFixed(1)).join(' ');
    return '<div class="small">Black’s chance of winning, move by move</div>' +
      `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Black’s chance of winning after each move">` +
      `<line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="4 4"/>` +
      `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  async function runReview() {
    const full = Play.s, n = full.n, tot = full.moves.length, tok = ++Ana.token;
    const ms = n <= 9 ? 500 : 900, cancelled = () => tok !== Ana.token;
    Ana.busy = true; Ana.overview = true; Ana.progress = 0; Ana.final = null;
    G.renderAna();
    for (let k = 0; k < tot; k++) {
      if (Ana.cache[k]) continue;
      Ana.progress = k + 1; G.renderAna();
      const mv = full.moves[k];
      const res = await E.analyse(E.stateAt(full, k), E.stateAt(full, k).turn, { include: mv.i >= 0 ? [mv.i] : [], ms, cancelled });
      if (!res || cancelled()) return;
      Ana.cache[k] = res;
    }
    const fs = E.stateAt(full, tot);
    let fin;
    if (fs.passes >= 2) {
      const t = await E.territory(fs, n <= 9 ? 200 : 100, cancelled);
      if (!t || cancelled()) return;
      fin = { diff: t.diff, own: t.own, blackPct: null };
    } else {
      const r = await E.analyse(fs, fs.turn, { ms, cancelled });
      if (!r || cancelled()) return;
      const b = r.moves[0];
      fin = { diff: r.diff, own: r.own, blackPct: b ? pct(fs.turn === 1 ? b.wr : 1 - b.wr) : null };
    }
    Ana.final = fin; Ana.busy = false;
    G.renderAna();
  }

  function renderOverview() {
    const full = Play.s, n = full.n, tot = full.moves.length, f = Ana.final;
    $('#controls').hidden = true; $('#chat').hidden = false; $('#scorePanel').hidden = true; $('#anaPanel').hidden = false;
    $('#aModePos').classList.remove('on'); $('#aModeRev').classList.add('on');
    $('#reviewRow').hidden = true; $('#aBack').disabled = true; $('#aReset').disabled = true;
    playView.set({
      n, board: full.board, last: full.last, ko: full.ko, coords: settings.coords, libs: settings.libs,
      marks: {}, hint: [], ghost: -1, ghostColor: full.turn, hoverColor: 0, terr: null, dead: null,
      own: Ana.showOwn && f ? f.own : null
    });
    $('#whoTurn').textContent = Ana.busy ? 'Reviewing…' : 'Game review';
    $('#capsInfo').textContent = `Prisoners: ● ${full.caps[1]}  ○ ${full.caps[2]}`;
    const box = $('#anaList'), chart = $('#anaChart');
    box.innerHTML = ''; chart.hidden = true;
    let b = 50;
    if (f) b = f.blackPct != null ? f.blackPct : Math.max(2, Math.min(98, Math.round(50 + f.diff * 3)));
    $('#barB').style.width = b + '%'; $('#barL').textContent = `● ${b}%`; $('#barR').textContent = `${100 - b}% ○`;
    if (!tot) { $('#anaSummary').textContent = 'There are no moves to review yet.'; return; }
    if (Ana.busy || !f) {
      $('#anaSummary').textContent = `Reviewing move ${Ana.progress} of ${tot}… This takes a little while. Press “This position” to stop.`;
      return;
    }

    const rows = facts(), lines = [`Game review: ${tot} moves.`];
    lines.push(`Where we stand: ${f.diff > 0 ? 'Black' : 'White'} is ahead by about ${Math.abs(f.diff).toFixed(1)} points (komi included)` +
      (f.blackPct != null ? `; Black has roughly a ${f.blackPct}% chance of winning` : '') + '.');
    for (const c of [1, 2]) {
      const mine = rows.filter(r => r.m.c === c && r.m.i >= 0), t = k => mine.filter(r => r.kind === k).length;
      if (mine.length) lines.push(`${who(c)}: ${t('good move')} good, ${t('slight inaccuracy')} slight inaccuracies, ${t('mistake')} mistakes, ${t('blunder')} blunders.`);
    }
    const worst = rows.filter(r => r.loss >= .06).sort((a, c) => c.loss - a.loss).slice(0, 3);
    if (worst.length) {
      lines.push('Biggest swings:');
      for (const r of worst) lines.push(`• Move ${r.k + 1}, ${colourName(r.m.c)} ${E.coord(n, r.m.i)}: ${r.kind}, about ${pct(r.loss)}% win chance lost. ${E.coord(n, r.best.move)} was better.`);
    } else lines.push('No big mistakes by either side.');
    lines.push('Tap a move below to see it on the board with the coach’s explanation. The percentage is Black’s chance of winning after that move.');
    $('#anaSummary').textContent = lines.join('\n');

    if (rows.length >= 2) { chart.hidden = false; chart.innerHTML = chartHTML(rows.map(r => r.blackPct)); }
    rows.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'cand';
      btn.innerHTML = '<span class="ltr"></span><span class="pc"></span><span class="tx"></span>';
      btn.children[0].textContent = String(r.k + 1);
      btn.children[1].textContent = r.blackPct + '%';
      const where = r.m.i >= 0 ? E.coord(n, r.m.i) : 'pass';
      btn.children[2].textContent = `${r.m.c === 1 ? '●' : '○'} ${where}: ${r.kind}` + (r.loss >= .06 && r.best ? ` (better: ${E.coord(n, r.best.move)})` : '');
      btn.addEventListener('click', () => { Ana.overview = false; Ana.mode = 'review'; Ana.k = r.k; G.loadAna(); });
      box.append(btn);
    });
  }

  function startReview() {
    Ana.mode = 'review'; Ana.overview = true;
    if (complete() || !Play.s.moves.length) { Ana.token++; Ana.busy = false; return G.renderAna(); }
    runReview();
  }
  $('#aList').onclick = startReview;

  Object.assign(G, { startReview, renderOverview });
})();
