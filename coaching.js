/* World of Go — the coach as a conversation.
   Analysis, game review and move feedback all arrive as chat messages with bold headings.
   Play mode stays quiet until asked; Coach mode analyses after every turn and comments on each move.
   Same random-playout analysis as before: no AI service. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, saveSettings, colourName, Play, renderPlay, load, store } = G;
  const CM = window.GoCommentary;
  const LETS = 'ABCDE';
  const pct = x => Math.round(x * 100);
  const say = text => { if (G.say && text) G.say(text); };
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const section = (h, t) => `**${h}:**\n${cap(t)}`;
  const sigOf = s => Array.from(s.board).join('') + s.turn;
  /* How hard the coach thinks: the level chosen for it, but always at least one above the computer's level. */
  const coachLevel = () => E.coachLevel(Play.level, settings.coachLevel);
  const kindOf = loss => (loss < .02 ? 'good move' : loss < .06 ? 'slight inaccuracy' : loss < .12 ? 'mistake' : 'blunder');

  /* The latest analysis. It counts only while the board is exactly as it was when the analysis was made. */
  let last = null, tried = false;
  const SAVED = 'gocoach.analysis';
  /* After a reload the latest analysis is read back, so "why A?" still works for the position on the board. */
  function restoreLast() {
    tried = true;
    const d = load(SAVED, null);
    if (!d || !Play.s || d.sig !== sigOf(Play.s)) return;
    last = { s: E.clone(Play.s), sig: d.sig, res: { moves: d.moves, own: d.own ? Float32Array.from(d.own) : null, diff: d.diff, sims: d.sims } };
  }
  function current() {
    if (!last && !tried && Play.s) restoreLast();
    return last && Play.s && last.sig === sigOf(Play.s) ? last : null;
  }
  function marks() {
    const c = current(), m = {};
    if (c) c.res.moves.slice(0, 5).forEach((x, i) => { m[x.move] = LETS[i]; });
    return m;
  }
  const own = () => { const c = current(); return c && c.res.own ? c.res.own : null; };

  /* ---------- the analysis message ---------- */
  function stonesText(s) {
    const me = Play.human, op = 3 - me, cnt = [0, 0, 0];
    for (const v of s.board) cnt[v]++;
    return `You (${colourName(me)}) ${cnt[me]}, ${colourName(op)} ${cnt[op]}. Prisoners: you ${s.caps[me]}, ${colourName(op)} ${s.caps[op]}.`;
  }
  /* The commentary engine writes "Heading: text" lines; split them so each can sit under its own bold heading. */
  function summaryParts(s) {
    const out = {};
    for (const ln of CM.positionSummary(E, s, Play.human).split('\n')) {
      const m = ln.match(/^([^:]+):\s*(.*)$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  }
  function standing(s, res) {
    let t = `${res.diff > 0 ? 'Black' : 'White'} ahead by about ${Math.abs(res.diff).toFixed(1)} points (komi included).`;
    const best = res.moves[0];
    if (best) t += ` ${colourName(s.turn)} to play; the best move wins about ${pct(best.wr)}% of the random games I play out.`;
    return t;
  }
  function suggestions(s, res) {
    return res.moves.slice(0, 5).map((m, i) => `${LETS[i]}. ${E.coord(s.n, m.move)} · ${pct(m.wr)}%: ${CM.headline(E, s, m.move, s.turn, Play.human)}`).join('\n');
  }
  function positionLine(s) {
    const m = s.moves[s.moves.length - 1];
    const after = m ? `After move ${s.moves.length} (${colourName(m.c)} ${m.i >= 0 ? E.coord(s.n, m.i) : 'pass'})` : 'Start of the game';
    return `${after}: ${colourName(s.turn)} to play.`;
  }
  function analysisText(s, res, brief) {
    const parts = [section('Position', positionLine(s)), section('Territory estimate', standing(s, res))];
    if (!brief) {
      const p = summaryParts(s);
      parts.push(section('Stones', stonesText(s)));
      if (p['Where things stand']) parts.push(section('Where things stand', p['Where things stand']));
      if (p.Safety) parts.push(section('Safety', p.Safety));
      if (p['Biggest open area']) parts.push(section('Biggest open area', p['Biggest open area']));
    }
    if (res.moves.length) parts.push(section('Suggestions', suggestions(s, res)));
    parts.push(brief
      ? 'Tap a lettered point to play it, or ask "why A?".'
      : 'Tap a lettered point on the board to play it, or ask "why A?" or "compare A and B". Win rates come from random playouts, so gaps under 5% are equal.');
    return parts.join('\n\n');
  }

  async function analyse(auto) {
    const s0 = Play.s;
    if (!s0 || Play.thinking || Play.phase !== 'play' || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on)) return;
    const s = E.clone(s0), tok = ++Play.token;
    Play.thinking = true; Play.note = { tok, text: 'Coach is analysing…' }; renderPlay();
    const res = await E.analyse(s, s.turn, { ms: E.analysisMs(coachLevel(), s.n), cancelled: () => tok !== Play.token });
    if (tok !== Play.token || !res) return;
    Play.thinking = false;
    last = { s, res, sig: sigOf(s) };
    store(SAVED, { sig: last.sig, moves: res.moves.map(m => ({ move: m.move, wr: m.wr })), own: res.own ? Array.from(res.own, x => +x.toFixed(2)) : null, diff: res.diff, sims: res.sims });
    say(analysisText(s, res, !!auto));
    renderPlay();
  }

  /* Plays both moves out and then says, with evidence, why `better` beat `worse`. Arrives as a follow-up message;
     dropped if a different game has started by then. */
  async function whyBetter(s, better, worse) {
    const game = Play.s;
    const t = await window.GoExplain.contrast(E, s, better, worse, s.turn, Play.human);
    if (t && Play.s === game) say(section(`Why ${E.coord(s.n, better)} beats ${E.coord(s.n, worse)}`, t));
  }

  /* ---------- feedback on the learner's own move (Coach mode) ---------- */
  /* Returns the verdict text at once; for a weaker move, the evidence for the better one follows a moment later. */
  function verdictFor(prev, idx) {
    if (!prev || idx < 0) return '';
    const res = prev.res, best = res.moves[0], pl = res.moves.find(x => x.move === idx), n = prev.s.n;
    if (!best) return '';
    if (idx !== best.move && (!pl || best.wr - pl.wr >= .02)) whyBetter(prev.s, best.move, idx);
    if (!pl) return section('Your move', `${E.coord(n, idx)} was not among my top ideas. My favourite was ${E.coord(n, best.move)} (${pct(best.wr)}%).`);
    const loss = best.wr - pl.wr;
    if (idx === best.move || loss < .02) return section('Your move', `${E.coord(n, idx)}: good move (${pct(pl.wr)}%).`);
    return section('Your move', `${E.coord(n, idx)}: ${kindOf(loss)} (${pct(pl.wr)}% against ${pct(best.wr)}% for ${E.coord(n, best.move)}). ${CM.compare(E, prev.s, idx, best.move, prev.s.turn, Play.human)}`);
  }

  /* ---------- game review ---------- */
  function reviewText(full, results, fin) {
    const n = full.n, rows = [];
    let carry = 50;
    full.moves.forEach((m, k) => {
      const res = results[k], best = res.moves[0];
      const pl = m.i >= 0 ? res.moves.find(x => x.move === m.i) : null;
      let kind = m.i < 0 ? 'pass' : 'not rated', loss = 0;
      if (best && pl) { loss = Math.max(0, best.wr - pl.wr); kind = m.i === best.move ? 'good move' : kindOf(loss); }
      if (pl) carry = pct(m.c === 1 ? pl.wr : 1 - pl.wr);
      rows.push({ k, m, best, loss, kind, black: carry });
    });
    const who = c => colourName(c) + (c === Play.human ? ' (you)' : '');
    const tally = [];
    for (const c of [1, 2]) {
      const mine = rows.filter(r => r.m.c === c && r.m.i >= 0), t = k => mine.filter(r => r.kind === k).length;
      if (mine.length) tally.push(`${who(c)}: ${t('good move')} good, ${t('slight inaccuracy')} slight inaccuracies, ${t('mistake')} mistakes, ${t('blunder')} blunders.`);
    }
    const worst = rows.filter(r => r.loss >= .06 && r.best).sort((a, b) => b.loss - a.loss).slice(0, 3);
    const swings = worst.length
      ? worst.map(r => `Move ${r.k + 1}, ${colourName(r.m.c)} ${E.coord(n, r.m.i)}: ${r.kind}, about ${pct(r.loss)}% win chance lost. ${E.coord(n, r.best.move)} was better.`).join('\n')
      : 'No big mistakes by either side.';
    return [
      section('Game review', `${rows.length} moves. The percentages are Black's chance of winning after each move; they come from quick random games, so small differences are noise.`),
      section('Where we stand', `${fin.diff > 0 ? 'Black' : 'White'} ahead by about ${Math.abs(fin.diff).toFixed(1)} points (komi included)` + (fin.blackPct != null ? `; Black has roughly a ${fin.blackPct}% chance of winning` : '') + '.'),
      section('How each side played', tally.join('\n')),
      section('Biggest swings', swings),
      section('Move by move', rows.map(r => `${r.k + 1}. ${r.m.c === 1 ? '●' : '○'} ${r.m.i >= 0 ? E.coord(n, r.m.i) : 'pass'}: ${r.kind} (Black ${r.black}%)`).join('\n'))
    ].join('\n\n');
  }

  async function review() {
    const full = Play.s;
    if (!full || Play.thinking || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on)) return;
    const tot = full.moves.length, n = full.n;
    if (!tot) return say('There are no moves to review yet.');
    const tok = ++Play.token, cancelled = () => tok !== Play.token, ms = Math.round(E.analysisMs(coachLevel(), n) / 3);
    Play.thinking = true;
    const results = [];
    for (let k = 0; k < tot; k++) {
      Play.note = { tok, text: `Reviewing move ${k + 1} of ${tot}…` }; renderPlay();
      const st = E.stateAt(full, k), mv = full.moves[k];
      const res = await E.analyse(st, st.turn, { include: mv.i >= 0 ? [mv.i] : [], ms, cancelled });
      if (!res || cancelled()) return;
      results.push(res);
    }
    Play.note = { tok, text: 'Working out where the game stands…' }; renderPlay();
    const fs = E.stateAt(full, tot);
    let fin;
    if (fs.passes >= 2) {
      const t = await E.territory(fs, n <= 9 ? 200 : 100, cancelled);
      if (!t || cancelled()) return;
      fin = { diff: t.diff, blackPct: null };
    } else {
      const r = await E.analyse(fs, fs.turn, { ms, cancelled });
      if (!r || cancelled()) return;
      const b = r.moves[0];
      fin = { diff: r.diff, blackPct: b ? pct(fs.turn === 1 ? b.wr : 1 - b.wr) : null };
    }
    Play.thinking = false;
    say(reviewText(full, results, fin));
    renderPlay();
  }

  /* ---------- questions about the lettered suggestions ---------- */
  /* Returns true when the question was about the current suggestions, so the normal coach does not also answer. */
  function ask(q) {
    const c = current();
    if (!c) {
      if (/\b[A-E]\b/.test(q) && /\b(why|explain|compare|play|better|worse|advantage|safe)\b/i.test(q)) {
        say('The board has changed since my last suggestions, so I will analyse the new position first.');
        analyse(true).then(() => {
          if (current()) ask(q);
          else say('I could not analyse just now. Press Analyse when it is your turn, then ask again.');
        });
        return true;
      }
      return false;
    }
    const s = c.s, n = s.n, list = c.res.moves.slice(0, 5), low = q.toLowerCase();
    const found = new Set(q.match(/\b[A-E]\b/g) || []);
    for (const m of q.matchAll(/\b(?:move|point|option|candidate|letter)\s+([a-e])\b/gi)) found.add(m[1].toUpperCase());
    const picks = [...found].map(L => ({ L, m: list[LETS.indexOf(L)] })).filter(x => x.m);
    const ring = pts => { Play.hint = pts; renderPlay(); };
    if (picks.length >= 2 && /\b(vs|versus|compare|comparison|better|worse|than|or|and|difference|between|instead)\b/.test(low)) {
      const [x, y] = picks.slice(0, 2).sort((p, r) => list.indexOf(p.m) - list.indexOf(r.m));
      ring([x.m.move, y.m.move]);
      say(section(`Comparing ${x.L} and ${y.L}`,
        `${x.L}: ${E.coord(n, x.m.move)}, ${pct(x.m.wr)}%. ${y.L}: ${E.coord(n, y.m.move)}, ${pct(y.m.wr)}%.` +
        (Math.abs(x.m.wr - y.m.wr) < .05 ? ' The win rates are within 5%, so treat them as about equal.' : '') +
        '\n' + CM.compare(E, s, y.m.move, x.m.move, s.turn, Play.human)));
      whyBetter(s, x.m.move, y.m.move);
      return true;
    }
    if (picks.length === 1 && /\b(explore|walk me through|what happens|follow)\b/.test(low)) {
      G.startExploring(picks[0].m.move);
      return true;
    }
    if (picks.length === 1 && /\b(play|try|put|place)\b/.test(low)) {
      if (Play.phase === 'play' && !Play.thinking && Play.s.turn === Play.human) { Play.pending = picks[0].m.move; G.onPlayTap(picks[0].m.move); }
      else say('It is not your turn.');
      return true;
    }
    if (picks.length === 1) {
      const m = picks[0].m;
      ring([m.move]);
      say(section(`${picks[0].L}: ${E.coord(n, m.move)}`, CM.deepDive(E, s, m.move, s.turn, Play.human)));
      const other = m === list[0] ? list[1] : list[0];
      if (other) whyBetter(s, m === list[0] ? m.move : other.move, m === list[0] ? other.move : m.move);
      return true;
    }
    if (/\b(best|strongest|safest|top|biggest)\b/.test(low)) {
      say(section('Suggestions', suggestions(s, c.res)) + '\n\nAsk "why A?" or "compare A and B" for more.');
      return true;
    }
    return false;
  }

  /* ---------- Play mode and Coach mode ---------- */
  /* A small bar above the board: Black's share of the position. It comes from the latest analysis when there is one
     for this exact position, otherwise from a quick estimate (random games to the end). Dimmed while one move out of date. */
  let est = null, estTok = 0;
  function blackPct() {
    const c = current();
    if (c && c.res.moves[0]) return { p: Math.round((c.s.turn === 1 ? c.res.moves[0].wr : 1 - c.res.moves[0].wr) * 100), fresh: true };
    if (est) return { p: Math.max(2, Math.min(98, Math.round(50 + est.diff * 3))), fresh: !!Play.s && est.sig === sigOf(Play.s) };
    return null;
  }
  function paintPos() {
    const el = $('#posInfo'), busy = !Play.s || Play.phase !== 'play' || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on);
    const v = busy ? null : blackPct();
    if (!v) { el.hidden = true; return; }
    el.hidden = false; el.style.opacity = v.fresh ? '1' : '.55';
    $('#posB').style.width = v.p + '%'; $('#posL').textContent = '● ' + v.p; $('#posR').textContent = (100 - v.p) + ' ○';
    el.title = `Black ${v.p}%, White ${100 - v.p}%. A rough estimate of who is ahead.`;
  }
  async function refreshEstimate() {
    const s = Play.s;
    if (!s || Play.thinking || Play.phase !== 'play') return;
    const sig = sigOf(s), tok = ++estTok;
    const r = await E.territory(E.clone(s), s.n <= 9 ? 60 : s.n <= 13 ? 40 : 24, () => tok !== estTok);
    if (!r || tok !== estTok) return;
    est = { sig, diff: r.diff };
    paintPos();
  }

  function coachAuto() {
    refreshEstimate();
    if (G.mapTerritory) G.mapTerritory();
    if (settings.mode === 'coach' && Play.s && Play.s.turn === Play.human && !current()) analyse(true);
  }
  function setMode(mode) {
    settings.mode = mode; saveSettings(); renderPlay();
    if (mode === 'coach') {
      say('Coach mode: after every turn I will suggest moves, and I will tell you how each of your moves went. Switch back to Play mode if you would rather play without help.');
      coachAuto();
    } else say('Play mode: I stay quiet unless you ask. Ask me for a hint, an analysis or a review at any time.');
  }
  $('#btnAnalyse').onclick = () => analyse(false);
  $('#btnMode').onclick = () => setMode(settings.mode === 'coach' ? 'play' : 'coach');

  Object.assign(G, { analyse, review, coachLevel, askCoach: ask, anaMarks: marks, anaOwn: own, paintPos, refreshEstimate, coachVerdict: verdictFor, coachPrev: current, coachAuto });
})();
