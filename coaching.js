/* World of Go — the coach as a conversation.
   Analysis, game review and move feedback all arrive as chat messages with bold headings.
   Play mode stays quiet until asked; Coach mode analyses after every turn and comments on each move.
   Same random-playout analysis as before: no AI service. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, settings, saveSettings, colourName, Play, renderPlay, load, store } = G;
  const CM = window.GoCommentary;
  /* The wording is in docs/text/en/coaching.md. head(k): the heading a commentary.md line starts with, before its colon. */
  const T = (k, v) => window.GoText.T('coaching.' + k, v), head = k => window.GoText.T('commentary.' + k).split(':')[0];
  const LETS = 'ABCDE';
  const pct = x => Math.round(x * 100);
  const say = text => { if (G.say && text) G.say(text); };
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const section = (h, t) => `**${h}:**\n${cap(t)}`;
  const sigOf = s => Array.from(s.board).join('') + s.turn;
  /* How hard the coach thinks: the level chosen for it, but always at least one above the computer's level. */
  const coachLevel = () => E.coachLevel(Play.level, settings.coachLevel);
  const kindOf = loss => (loss < .02 ? 'good' : loss < .06 ? 'slight' : loss < .12 ? 'mistake' : 'blunder'); /* coaching.kind.… */
  const kindName = k => T('kind.' + k);

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
    return T('stones', { colour: colourName(me), mine: cnt[me], other: colourName(op), theirs: cnt[op], mycaps: s.caps[me], theircaps: s.caps[op] });
  }
  /* The commentary engine writes "Heading: text" lines; split them so each can sit under its own bold heading (keys are the headings). */
  function summaryParts(s) {
    const out = {};
    for (const ln of CM.positionSummary(E, s, Play.human).split('\n')) {
      const m = ln.match(/^([^:]+):\s*(.*)$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  }
  function standing(s, res) {
    let t = T('ahead', { side: colourName(res.diff > 0 ? 1 : 2), points: Math.abs(res.diff).toFixed(1) });
    const best = res.moves[0];
    if (best) t += ' ' + T('best', { player: colourName(s.turn), pct: pct(best.wr) });
    return t;
  }
  function suggestions(s, res) {
    const top = res.moves.slice(0, 5);
    const intro = top.length ? T(s.moves.length ? 'options' : 'options-first', { count: top.length, player: colourName(s.turn), letters: top.length > 1 ? 'A to ' + LETS[top.length - 1] : 'A' }) + '\n' : '';
    return intro + top.map((m, i) => T('suggestion', { letter: LETS[i], point: E.coord(s.n, m.move), pct: pct(m.wr), what: CM.headline(E, s, m.move, s.turn, Play.human) })).join('\n');
  }
  function positionLine(s) {
    const m = s.moves[s.moves.length - 1];
    const after = m ? T('after-move', { count: s.moves.length, player: colourName(m.c), point: m.i >= 0 ? E.coord(s.n, m.i) : T('pass') }) : T('start');
    return T('to-play', { after, player: colourName(s.turn) });
  }
  function analysisText(s, res, brief) {
    const parts = [section(T('h.position'), positionLine(s)), section(T('h.territory'), standing(s, res))];
    /* When stones are short of liberties, the coach reads the fight (reading.js): weak stones, your safety, why the best move
       works and what is wrong with the others. Otherwise the usual summary and suggestions follow. */
    const rd = window.GoReading.read(E, s, res.moves.slice(0, 5).map(m => m.move), colourName);
    if (rd) return parts.concat(rd.sections.map(x => section(x.head, x.text)), [rd.answer, T(brief ? 'end-brief' : 'end-full')]).join('\n\n');
    if (!brief) {
      const p = summaryParts(s);
      parts.push(section(T('h.stones'), stonesText(s)));
      for (const k of ['summary-where', 'summary-safety', 'summary-open']) if (p[head(k)]) parts.push(section(head(k), p[head(k)]));
    }
    if (res.moves.length) parts.push(section(T('h.suggestions'), suggestions(s, res)));
    parts.push(T(brief ? 'end-brief' : 'end-full'));
    return parts.join('\n\n');
  }

  async function analyse(auto) {
    const s0 = Play.s;
    if (!s0 || Play.thinking || Play.phase !== 'play' || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on)) return;
    const s = E.clone(s0), tok = ++Play.token;
    Play.thinking = true; Play.note = { tok, text: T('analysing') }; renderPlay();
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
    if (t && Play.s === game) say(section(T('h.why-beats', { better: E.coord(s.n, better), worse: E.coord(s.n, worse) }), t));
  }

  /* ---------- feedback on the learner's own move (Coach mode) ---------- */
  /* Returns the verdict text at once; for a weaker move, the evidence for the better one follows a moment later. */
  function verdictFor(prev, idx) {
    if (!prev || idx < 0) return '';
    const res = prev.res, best = res.moves[0], pl = res.moves.find(x => x.move === idx), n = prev.s.n;
    if (!best) return '';
    if (idx !== best.move && (!pl || best.wr - pl.wr >= .02)) whyBetter(prev.s, best.move, idx);
    if (!pl) return section(T('h.your-move'), T('not-top', { point: E.coord(n, idx), best: E.coord(n, best.move), pct: pct(best.wr) }));
    const loss = best.wr - pl.wr;
    if (idx === best.move || loss < .02) return section(T('h.your-move'), T('good', { point: E.coord(n, idx), pct: pct(pl.wr) }));
    return section(T('h.your-move'), T('weaker', { point: E.coord(n, idx), kind: kindName(kindOf(loss)), pct: pct(pl.wr), bestpct: pct(best.wr), best: E.coord(n, best.move), compare: CM.compare(E, prev.s, idx, best.move, prev.s.turn, Play.human) }));
  }

  /* ---------- game review ---------- */
  function reviewText(full, results, fin) {
    const n = full.n, rows = [];
    let carry = 50;
    full.moves.forEach((m, k) => {
      const res = results[k], best = res.moves[0];
      const pl = m.i >= 0 ? res.moves.find(x => x.move === m.i) : null;
      let kind = m.i < 0 ? 'pass' : 'unrated', loss = 0;
      if (best && pl) { loss = Math.max(0, best.wr - pl.wr); kind = m.i === best.move ? 'good' : kindOf(loss); }
      if (pl) carry = pct(m.c === 1 ? pl.wr : 1 - pl.wr);
      rows.push({ k, m, best, loss, kind, black: carry });
    });
    const who = c => (c === Play.human ? T('you', { player: colourName(c) }) : colourName(c));
    const tally = [];
    for (const c of [1, 2]) {
      const mine = rows.filter(r => r.m.c === c && r.m.i >= 0), t = k => mine.filter(r => r.kind === k).length;
      if (mine.length) tally.push(T('tally', { who: who(c), good: t('good'), slight: t('slight'), mistake: t('mistake'), blunder: t('blunder') }));
    }
    const worst = rows.filter(r => r.loss >= .06 && r.best).sort((a, b) => b.loss - a.loss).slice(0, 3);
    const swings = worst.length
      ? worst.map(r => T('swing', { count: r.k + 1, player: colourName(r.m.c), point: E.coord(n, r.m.i), kind: kindName(r.kind), pct: pct(r.loss), best: E.coord(n, r.best.move) })).join('\n')
      : T('no-swings');
    return [
      section(T('h.review'), T('review-intro', { count: rows.length })),
      section(T('h.where-we-stand'), T(fin.blackPct != null ? 'final-chance' : 'final', { side: colourName(fin.diff > 0 ? 1 : 2), points: Math.abs(fin.diff).toFixed(1), pct: fin.blackPct })),
      section(T('h.how-played'), tally.join('\n')),
      section(T('h.swings'), swings),
      section(T('h.move-by-move'), rows.map(r => T('row', { count: r.k + 1, stone: r.m.c === 1 ? '●' : '○', point: r.m.i >= 0 ? E.coord(n, r.m.i) : T('pass'), kind: kindName(r.kind), pct: r.black })).join('\n'))
    ].join('\n\n');
  }

  async function review() {
    const full = Play.s;
    if (!full || Play.thinking || Play.phase === 'setup' || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on)) return;
    const tot = full.moves.length, n = full.n;
    if (!tot) return say(T('nothing-to-review'));
    const tok = ++Play.token, cancelled = () => tok !== Play.token, ms = Math.round(E.analysisMs(coachLevel(), n) / 3);
    Play.thinking = true;
    const results = [];
    for (let k = 0; k < tot; k++) {
      Play.note = { tok, text: T('reviewing', { count: k + 1, total: tot }) }; renderPlay();
      const st = E.stateAt(full, k), mv = full.moves[k];
      const res = await E.analyse(st, st.turn, { include: mv.i >= 0 ? [mv.i] : [], ms, cancelled });
      if (!res || cancelled()) return;
      results.push(res);
    }
    Play.note = { tok, text: T('working-out') }; renderPlay();
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
        say(T('changed'));
        analyse(true).then(() => {
          if (current()) ask(q);
          else say(T('could-not'));
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
      say(section(T('h.comparing', { x: x.L, y: y.L }),
        T(Math.abs(x.m.wr - y.m.wr) < .05 ? 'compare-equal' : 'compare', { x: x.L, xpoint: E.coord(n, x.m.move), xpct: pct(x.m.wr), y: y.L, ypoint: E.coord(n, y.m.move), ypct: pct(y.m.wr) }) +
        '\n' + CM.compare(E, s, y.m.move, x.m.move, s.turn, Play.human)));
      whyBetter(s, x.m.move, y.m.move);
      return true;
    }
    if (picks.length === 1 && /\b(explore|walk me through|what happens|follow)\b/.test(low)) {
      G.startExploring(picks[0].m.move);
      return true;
    }
    if (picks.length === 1 && /\b(play|try|put|place)\b/.test(low)) {
      if (G.myTurn(Play.s)) { Play.pending = picks[0].m.move; G.onPlayTap(picks[0].m.move); }
      else say(T('not-your-turn'));
      return true;
    }
    if (picks.length === 1) {
      const m = picks[0].m;
      ring([m.move]);
      say(section(T('h.letter', { letter: picks[0].L, point: E.coord(n, m.move) }), CM.deepDive(E, s, m.move, s.turn, Play.human)));
      const other = m === list[0] ? list[1] : list[0];
      if (other) whyBetter(s, m === list[0] ? m.move : other.move, m === list[0] ? other.move : m.move);
      return true;
    }
    if (/\b(best|strongest|safest|top|biggest)\b/.test(low)) {
      say(section(T('h.suggestions'), suggestions(s, c.res)) + '\n\n' + T('ask-more'));
      return true;
    }
    return false;
  }

  /* ---------- Play mode and Coach mode ---------- */
  /* A small bar above the board: who is ahead and by about how many points (komi included), e.g. "● +8.5".
     It comes from random games played out from the position (search.js ownership), averaged with the estimate for the position
     one move earlier. Checked on Boon's game of 27 Nov 2026: the old bar (a short win-chance search) jumped by up to 35 points
     depending on whose turn it was and showed 50/50 at the end; this one moves smoothly and ended at the real result.
     The bar's fill is Black's share, from the lead (about 4 points on 9×9 counts as a clear edge). Dimmed while out of date. */
  let est = null, estTok = 0, prevLead = null;
  function blackPct() {
    if (!est) return null;
    const scale = est.n <= 9 ? 4 : est.n <= 13 ? 7 : 10;
    const p = Math.round(100 / (1 + Math.exp(-est.lead / scale)));
    return { p: Math.max(3, Math.min(97, p)), lead: est.lead, fresh: !!Play.s && est.sig === sigOf(Play.s) };
  }
  function paintPos() {
    /* Silent Play mode (play.js playSilent) shows no estimate, as in a normal game of Go. */
    const el = $('#posInfo'), busy = !Play.s || Play.phase !== 'play' || G.playSilent() || (G.Lesson && G.Lesson.on) || (G.teaching && G.teaching.on) || (G.exploring && G.exploring.on) || (G.kifu && G.kifu.on);
    const v = busy ? null : blackPct();
    if (!v) { el.hidden = true; return; }
    el.hidden = false; el.style.opacity = v.fresh ? '1' : '.55';
    const pts = Math.abs(v.lead).toFixed(1), black = v.lead >= 0;
    $('#posB').style.width = v.p + '%'; $('#posL').textContent = black ? '● +' + pts : '●'; $('#posR').textContent = black ? '○' : '+' + pts + ' ○';
    el.title = T('estimate', { side: colourName(black ? 1 : 2), points: pts });
  }
  async function refreshEstimate() {
    const s = Play.s;
    if (!s || Play.thinking || Play.phase !== 'play') return;
    const sig = sigOf(s), tok = ++estTok;
    const o = await window.GoSearch.ownership(E.clone(s), { ms: s.n <= 9 ? 700 : s.n <= 13 ? 1000 : 1400, cancelled: () => tok !== estTok });
    if (!o || tok !== estTok) return;
    const before = prevLead && prevLead.n === s.n && prevLead.moves === s.moves.length - 1 ? prevLead.lead : null;
    prevLead = { n: s.n, moves: s.moves.length, lead: o.diff };
    est = { sig, n: s.n, lead: before === null ? o.diff : (o.diff + before) / 2 };
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
      say(T('coach-mode'));
      coachAuto();
    } else say(T('play-mode'));
  }
  $('#btnAnalyse').onclick = () => analyse(false);
  $('#btnMode').onclick = () => setMode(settings.mode === 'coach' ? 'play' : 'coach');

  Object.assign(G, { analyse, review, coachLevel, askCoach: ask, anaMarks: marks, anaOwn: own, paintPos, refreshEstimate, coachVerdict: verdictFor, coachPrev: current, coachAuto });
})();
