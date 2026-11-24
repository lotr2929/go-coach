/* World of Go — the Kifu (game record) viewer. This file holds the list page and the viewing session for one recorded game.
   You step through the record, ask for an explanation or an analysis of a position, and tap an empty point to try your own move:
   that hands the position to the same exploration session used for "explore this move" (explore.js), so replies, "another reply" and
   "back to game" work the same way. No DOM here: kifuui.js connects it to the board and the chat, and test.js runs it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoKifu = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const T = (k, v) => TX.T('kifu.' + k, v), A = (k, v) => TX.T('app.' + k, v); /* wording: docs/text/en/kifu.md and app.md */

  const col = c => A(c === 1 ? 'black' : 'white');

  /* The SGF result field in plain words. */
  function resultText(re) {
    const r = String(re || '').trim();
    if (!r) return T('no-result-recorded');
    if (/^(jigo|draw|0)$/i.test(r)) return T('draw');
    if (/^(void|no result)/i.test(r)) return T('no-result');
    if (/unfinished/i.test(r)) return T('unfinished');
    if (/both lost/i.test(r)) return T('both-lost');
    const m = /^([BW])\+(.*)$/i.exec(r);
    if (!m) return r;
    const player = col(m[1].toUpperCase() === 'B' ? 1 : 2), how = m[2].trim();
    if (!how) return T('wins', { player });
    if (/^r(esign)?$/i.test(how)) return T('wins-resign', { player });
    if (/^t(ime)?$/i.test(how)) return T('wins-time', { player });
    if (/^f(orfeit)?$/i.test(how)) return T('wins-forfeit', { player });
    if (how[0] === '(') return T('wins-note', { player, how });
    return T(/^[\d.\/ ]+$/.test(how) ? 'wins-by' : 'wins-other', { player, how });
  }

  /* One line under a game's title in the list: who played, when, the result and the length. */
  function meta(e) {
    const bits = [];
    if (e.black || e.white) bits.push(T('players', { black: e.black || '?', white: e.white || '?' }));
    if (e.date) bits.push(e.date);
    bits.push(resultText(e.result));
    bits.push(T('moves', { count: e.moves }));
    if (e.handicap) bits.push(T('handicap', { count: e.handicap }));
    if (e.size && e.size !== 19) bits.push(T('board', { size: e.size }));
    return bits.join(' · ');
  }

  /* The list as a page for page.js. index: { categories: [{ title, blurb, games: [entry] }] }. */
  function listPage(index) {
    const cats = (index && index.categories) || [], count = cats.reduce((k, c) => k + c.games.length, 0);
    const blocks = [{ t: 'lead', text: T('list-lead', { count }) }];
    const toc = { t: 'toc', items: [] };
    blocks.push(toc);
    cats.forEach((c, k) => {
      const id = 'cat' + (k + 1);
      toc.items.push({ text: T('category', { title: c.title, count: c.games.length }), id });
      blocks.push({ t: 'h', text: c.title, id });
      if (c.blurb) blocks.push({ t: 'p', text: c.blurb });
      blocks.push({ t: 'cards', items: c.games.map(e => ({ id: e.id, title: e.title, meta: meta(e), note: e.note })) });
    });
    blocks.push({ t: 'h', text: T('source') });
    blocks.push({ t: 'p', text: T('source-text') });
    blocks.push({ t: 'refs', items: [{ n: 1, title: 'Database of Go Games', by: 'Andries Brouwer', url: 'https://homepages.cwi.nl/~aeb/go/games' }] });
    return { title: T('list-title'), blocks };
  }

  /* d: { E, SGF, CM, C, EXPLORE, say, render, click, ms, analysisMs, leave, openList } */
  function create(d) {
    const { E, SGF, CM, C, EXPLORE } = d;
    const nop = () => {};
    const say = d.say || nop, render = d.render || nop, click = d.click || nop;
    const K = { on: false, entry: null, game: null, s: null, pos: 0, limit: 0, partial: false, marks: {}, tok: 0 };
    const ex = EXPLORE.create({ E, CM, C, say, render, click, ms: d.ms || 400, leave: () => leaveVariation() });
    const co = i => E.coord(K.game.n, i);
    const total = () => (K.game ? K.game.moves.length : 0);
    const state = () => (ex.on ? ex.state() : K.s);
    const clear = () => { K.tok++; K.marks = {}; };

    function infoText() {
      const g = K.game, i = g.info, e = K.entry;
      const lines = [`**${e.title || T('game-record')}**`];
      lines.push(T(i.DT ? 'info-players-date' : 'info-players', { black: i.PB || '?', white: i.PW || '?', date: i.DT }));
      const extra = (g.n !== 19 ? ' ' + T('on-board', { size: g.n }) : '') + (g.handicap ? ', ' + T('with-handicap', { count: g.handicap }) : '');
      lines.push(T('info-result', { result: resultText(i.RE), count: total(), extra }));
      if (i.EV) lines.push(i.EV + (i.RO ? ', ' + i.RO : '') + '.');
      if (e.note) lines.push(e.note);
      return lines.join('\n');
    }

    function load(entry, game) {
      K.entry = entry || {}; K.game = game; clear();
      ex.exit();
      const full = SGF.replay(E, game);
      K.limit = full.applied; K.partial = !full.ok;
      K.pos = 0; K.s = SGF.startState(E, game); K.on = true;
      say(infoText() + '\n\n' + T('how-to') + (K.partial ? '\n' + T('partial', { count: K.limit }) : ''));
      render();
      return true;
    }

    /* Moves along the record. goto() is also used by the slider. */
    function goto(p) {
      if (ex.on) ex.exit();
      clear();
      const target = Math.max(0, Math.min(Math.round(p) || 0, K.limit));
      if (target === K.pos + 1) SGF.playMove(E, K.s, K.game.moves[K.pos]);
      else if (target === K.pos - 1 && K.s.hist.length) E.undo(K.s);
      else if (target !== K.pos) K.s = SGF.replay(E, K.game, target).s;
      K.pos = target;
      render();
      return target;
    }
    function next() {
      if (ex.on) return ex.forward();
      if (K.pos >= K.limit) say(K.partial ? T('as-far') : T('last-move', { result: resultText(K.game.info.RE) }));
      else goto(K.pos + 1);
      return Promise.resolve();
    }
    function back() {
      if (ex.on) return ex.back();
      if (K.pos <= 0) say(T('at-start')); else goto(K.pos - 1);
      return Promise.resolve();
    }

    /* Trying another move: the position goes to the exploration session. */
    function tap(i) {
      if (!K.on) return false;
      if (ex.on) { ex.tap(i); return true; }
      const s = K.s;
      if (s.board[i]) {
        const g = E.flood(E.geom(s.n), s.board, i);
        say(A('that-has', { colour: A(g.color === 1 ? 'black-word' : 'white-word'), what: A(g.stones.length > 1 ? 'group-word' : 'stone-word'), libs: g.libs.length === 1 ? A('libs-one') : A('libs-many', { count: g.libs.length }) }));
        return true;
      }
      clear();
      if (ex.start(E.clone(s), i)) render();
      return true;
    }
    function leaveVariation() {
      if (!ex.on) return;
      ex.exit(); clear();
      say(T('back-to-record', { count: K.pos, total: total() }));
      render();
    }

    /* Plain-language help with the position. */
    function explain(deep) {
      if (ex.on) { say(T('explain-first')); return; }
      if (!K.pos) { say(T('not-started')); return; }
      const m = K.game.moves[K.pos - 1], prev = SGF.replay(E, K.game, K.pos - 1).s;
      if (m.i < 0) { say(T('move-passes', { count: K.pos, player: col(m.c) })); return; }
      prev.turn = m.c;
      const head = T('move-plays', { count: K.pos, player: col(m.c), point: co(m.i) });
      say(deep ? head + '\n' + CM.deepDive(E, prev, m.i, m.c, 3)
        : CM.render(CM.describeMove(E, prev, m.i, m.c, 3), { head, bullets: 3, concept: true }) + '\n' + T('why-longer'));
    }
    async function analyse() {
      if (!K.game) return;
      if (ex.on) { say(T('analyse-first')); return; }
      const s = E.clone(K.s), mine = ++K.tok, color = s.turn, played = K.pos < K.limit ? K.game.moves[K.pos] : null;
      K.marks = {};
      say(T('analysing', { count: K.pos }));
      const res = await E.analyse(s, color, { ms: d.analysisMs ? d.analysisMs(s.n) : 1500, include: played && played.i >= 0 && played.c === color ? [played.i] : [], cancelled: () => mine !== K.tok });
      if (!res || mine !== K.tok) return;
      const top = res.moves.slice(0, 5), L = 'ABCDE', pct = x => Math.round(x * 100);
      if (!top.length) { say(T('nothing-useful')); return; }
      top.forEach((m, k) => { K.marks[m.move] = L[k]; });
      const lines = [T('analysis-heading', { count: K.pos }), T('to-play', { player: col(color) })];
      if (played) {
        const pm = played.i >= 0 ? res.moves.find(x => x.move === played.i) : null;
        lines.push(played.i < 0 ? T('game-passed', { player: col(played.c) }) : pm ? T('game-played-pct', { point: co(played.i), pct: pct(pm.wr) }) : T('game-played', { point: co(played.i) }));
      }
      lines.push(T('top-ideas', { player: col(color) }));
      top.forEach((m, k) => lines.push(T('idea', { letter: L[k], point: co(m.move), pct: pct(m.wr), what: CM.headline(E, s, m.move, color, 3) })));
      lines.push(T('tap-letter'));
      say(lines.join('\n'));
      render();
    }

    /* Typed commands. Returns true when it handled the text. */
    function ask(raw) {
      if (!K.on) return false;
      const t = String(raw).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const has = re => re.test(t);
      if (has(/^(exit|quit|close|leave|stop|done|finish|finished)( the)?( kifu| game| game record| viewer| famous games?)?$/) || has(/\b(exit|leave|close|quit) (the )?(kifu|viewer|game record|famous games?)\b/) || (!ex.on && has(/\bback to (the |my )?(game|board)\b/))) { if (d.leave) d.leave(); return true; }
      if (has(/\b(list|more games|other games|another game|different game|choose (a )?game|pick (a )?game|famous games|kifu)\b/) || has(/^games$/)) { if (d.openList) d.openList(); return true; }
      if (ex.on) return ex.ask(raw);
      if (has(/^(next|n|forward|continue|go on|carry on|next move|ok|okay|yes|go)$/)) { next(); return true; }
      if (has(/^(back|previous|prev|undo|go back|step back|previous move)$/)) { back(); return true; }
      if (has(/^(first|start|beginning|restart|go to (the )?(start|beginning)|from the start|again|rewind)$/)) { goto(0); return true; }
      if (has(/^(last|end|final|go to (the )?end|last position|final position|skip to (the )?end)$/)) { goto(K.limit); return true; }
      let m = /\b(?:go to|jump to|show|move|goto)\s+(?:move\s+)?(\d{1,3})\b/.exec(t) || /^(\d{1,3})$/.exec(t);
      if (m) { goto(+m[1]); return true; }
      m = /\b(?:next|forward|ahead|skip)\s+(\d{1,3})\b/.exec(t);
      if (m) { goto(K.pos + +m[1]); return true; }
      m = /\b(?:back|backward|rewind)\s+(\d{1,3})\b/.exec(t);
      if (m) { goto(K.pos - +m[1]); return true; }
      if (has(/\b(analy[sz]e|analysis|best move|what should|alternatives?|better move|suggest|hint|what would you play)\b/)) { analyse(); return true; }
      if (has(/\b(info|information|who played|who are the players|about (this|the) game|tell me about (this|the) game|who won)\b/)) { say(infoText()); return true; }
      if (has(/\b(territory|who is winning|who is ahead|who owns)\b/)) { say(T('territory')); return true; }
      if (has(/^(why|why that move|why there|more|tell me more|explain more|in detail)$/) || has(/\b(explain|why)\b.*\b(more|detail)\b/)) { explain(true); return true; }
      if (has(/\b(explain|why|what happened|what does that do|what is (this|that) move|describe)\b/)) { explain(false); return true; }
      const idx = C.parseCoord(String(raw), K.game.n);
      if (idx >= 0) {
        if (has(/\b(play|try|put|place|tap|explore|what if|what happens)\b/)) tap(idx);
        else say(C.describePoint(E, K.s, idx, K.s.turn));
        return true;
      }
      return false;
    }

    function status() {
      if (!K.game) return T('status-none');
      const title = K.entry.title || T('game-record');
      if (ex.on) return T('status-trying', { title });
      const m = K.pos ? K.game.moves[K.pos - 1] : null;
      return T('status', { title, count: K.pos, total: K.partial ? K.limit + '+' : total(), where: m ? (m.i < 0 ? T('status-passes', { player: col(m.c) }) : T('status-plays', { player: col(m.c), point: co(m.i) })) : T('status-start') });
    }
    function view() {
      const s = state();
      return { board: s.board, last: s.last, ko: s.ko, turn: s.turn, n: s.n, marks: ex.on ? {} : K.marks };
    }
    function exit() { K.on = false; K.tok++; ex.exit(); }

    return {
      K, load, goto, next, back, tap, ask, explain, analyse, view, state, status, exit, leaveVariation, info: () => infoText(),
      canBack: () => (ex.on ? ex.T.pos > 1 : K.pos > 0), canNext: () => (ex.on ? true : K.pos < K.limit),
      done: () => ex.done(), get on() { return K.on; }, get pos() { return K.pos; }, get limit() { return K.limit; }, get inVariation() { return ex.on; }
    };
  }

  return { create, resultText, listPage, meta };
});
