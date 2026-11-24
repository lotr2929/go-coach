/* World of Go — "explore this move". Follows a move through a few replies, one step at a time, on a copy of the game.
   No DOM here: exploreui.js connects it to the board and the chat, and test.js runs it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoExplore = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const w = (k, v) => TX.T('explore.' + k, v), A = (k, v) => TX.T('app.' + k, v); /* wording: docs/text/en/explore.md and app.md */

  const MAXPLY = 12;

  /* d: { E, CM, C, say, render, click, leave, ms } */
  function create(d) {
    const { E, CM, C } = d;
    const nop = () => {};
    const say = d.say || nop, render = d.render || nop, click = d.click || nop, leave = d.leave || nop;
    const ms = d.ms || 300;
    const T = { on: false, base: null, human: 1, plies: [], pos: 0, s: null, tried: {} };
    /* Everything that changes the line runs one after another, so quick taps cannot tangle it. */
    let work = Promise.resolve();
    const run = fn => { work = work.then(fn).catch(() => {}); return work; };
    const col = c => (c === 1 ? 'Black' : 'White');
    const co = i => E.coord(T.base.n, i);

    /* The board after the first `pos` moves of the line. */
    function at(pos) {
      const s = E.clone(T.base);
      for (let k = 0; k < pos; k++) {
        const p = T.plies[k];
        if (p.move < 0) E.pass(s); else E.play(s, p.move);
      }
      return s;
    }
    function mk(s, move, color) {
      const note = move < 0 ? w('passes', { player: col(color) }) : CM.render(CM.describeMove(E, s, move, color, T.human), { head: w('plays', { player: col(color), point: co(move) }), bullets: 2 });
      return { move, color, note };
    }
    function narrate(k, lead) {
      const last = T.pos === T.plies.length;
      const tail = w(k === 0 ? 'tail-first' : last ? 'tail-last' : 'tail');
      say([`**${lead || w('move', { count: k + 1 })}**`, T.plies[k].note, tail].join('\n'));
    }

    function start(s, first) {
      const color = s.turn, r = E.tryPlay(E.geom(s.n), s.board, first, color, s.ko);
      if (!r.ok) { say(C.describePoint(E, s, first, color)); return false; }
      T.on = true; T.base = E.clone(s); T.human = color; T.plies = []; T.pos = 0; T.tried = {}; T.s = E.clone(s);
      say(w('start', { point: co(first) }));
      run(async () => { T.plies.push(mk(T.base, first, color)); T.pos = 1; T.s = at(1); narrate(0); render(); });
      return true;
    }

    function forward() {
      return run(async () => {
        if (T.pos < T.plies.length) { T.pos++; T.s = at(T.pos); narrate(T.pos - 1); render(); return; }
        if (T.plies.length >= MAXPLY) { say(w('far-enough')); return; }
        const s = at(T.pos), color = s.turn;
        const res = await E.chooseMove(s, color, { level: 'medium', ms });
        T.plies.push(mk(s, res.move, color)); T.pos = T.plies.length; T.s = at(T.pos);
        narrate(T.pos - 1); render();
      });
    }
    function another() {
      return run(async () => {
        if (T.pos < 2) { say(w('no-reply-yet')); return; }
        const k = T.pos - 1, sb = at(k), color = sb.turn;
        const tried = T.tried[k] || (T.tried[k] = new Set([T.plies[k].move]));
        const options = E.candidates(sb, color, 0).map(c => c.move).filter(m => !tried.has(m));
        if (!options.length) { say(w('no-other')); return; }
        tried.add(options[0]);
        T.plies.length = k; T.plies.push(mk(sb, options[0], color)); T.pos = k + 1; T.s = at(T.pos);
        narrate(k, w('different-reply')); render();
      });
    }
    function back() {
      return run(async () => {
        if (T.pos <= 1) { say(w('first-move')); return; }
        T.pos--; T.s = at(T.pos);
        say(w('back-to-move', { count: T.pos }) + '\n' + T.plies[T.pos - 1].note); render();
      });
    }
    function again() { return run(async () => { T.pos = 1; T.s = at(1); narrate(0); render(); }); }

    /* Tapping a point plays your own idea at this step; the rest of the old line is dropped. */
    function tap(i) {
      return run(async () => {
        const s = at(T.pos), color = s.turn;
        if (s.board[i]) {
          const g = E.flood(E.geom(s.n), s.board, i);
          say(A('that-has', { colour: A(g.color === 1 ? 'black-word' : 'white-word'), what: A(g.stones.length > 1 ? 'group-word' : 'stone-word'), libs: g.libs.length === 1 ? A('libs-one') : A('libs-many', { count: g.libs.length }) }));
          return;
        }
        const r = E.tryPlay(E.geom(s.n), s.board, i, color, s.ko);
        if (!r.ok) { say(C.describePoint(E, s, i, color)); return; }
        T.plies.length = T.pos; T.plies.push(mk(s, i, color)); T.pos = T.plies.length; T.s = at(T.pos);
        click(); narrate(T.pos - 1, w('your-idea')); render();
      });
    }

    function ask(raw) {
      if (!T.on) return false;
      const t = String(raw).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const has = re => re.test(t);
      if (has(/^(exit|leave|quit|stop|end|done|finish|finished)( the)?( exploring| exploration)?$|\bback to (the |my )?game\b|\b(leave|exit|quit|stop) (the )?(exploring|exploration)\b/)) { leave(); return true; }
      if (has(/^(next|next move|next step|continue|carry on|ok|okay|yes|yep|sure|go on|go ahead|proceed|and then|then what|what next|what happens next|show me)$/)) { forward(); return true; }
      if (has(/\b(another|alternative|different|other (reply|move|idea|option)|what else|else could)\b/)) { another(); return true; }
      if (has(/^(back|previous|go back|step back|undo|back a step|one back)$/)) { back(); return true; }
      if (has(/\b(again|from the start|restart|replay|start over)\b/)) { again(); return true; }
      const idx = C.parseCoord(String(raw), T.base.n);
      if (idx >= 0 && has(/\b(play|put|place|try|tap)\b/)) { tap(idx); return true; }
      if (idx >= 0 && has(/\b(what|if|would|how)\b/)) { say(C.describePoint(E, T.s, idx, T.s.turn)); return true; }
      /* Questions about the position on the exploring board (not the real game). */
      if (T.pos && has(/^(why|why that|why there|why this move|explain|explain (that|it|this) move|tell me more|more|in more detail)$/)) {
        const p = T.plies[T.pos - 1];
        if (p.move >= 0) { say(CM.deepDive(E, at(T.pos - 1), p.move, p.color, T.human)); return true; }
      }
      if (has(/\b(danger|in trouble|weak|at risk|in atari|short of liberties)\b/)) { say(C.weakReport(E, T.s, T.human)); return true; }
      if (has(/\b(explain|describe|summari[sz]e)\b.*\b(position|board)\b|\bwhat('s| is) (happening|going on)\b|\bwho('s| is) (winning|ahead)\b/)) { say(CM.positionSummary(E, T.s, T.human)); return true; }
      return false;
    }

    const status = () => (T.plies.length ? w('status', { point: co(T.plies[0].move), count: T.pos, total: T.plies.length }) : w('status-empty'));
    const view = () => ({ board: T.s.board, last: T.s.last, ko: T.s.ko, turn: T.s.turn, n: T.s.n });
    function exit() { T.on = false; }

    return { T, start, ask, tap, forward, back, another, view, status, exit, done: () => work, state: () => T.s, get on() { return T.on; } };
  }

  return { create };
});
