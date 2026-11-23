/* World of Go — "explore this move". Follows a move through a few replies, one step at a time, on a copy of the game.
   No DOM here: exploreui.js connects it to the board and the chat, and test.js runs it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoExplore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

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
      const note = move < 0 ? `${col(color)} passes.` : CM.render(CM.describeMove(E, s, move, color, T.human), { head: `${col(color)} plays ${co(move)}.`, bullets: 2 });
      return { move, color, note };
    }
    function narrate(k, lead) {
      const last = T.pos === T.plies.length;
      const tail = k === 0 ? 'Say "next" to see how the game might continue.'
        : last ? 'Say "next" for a reply, "another" for a different idea, tap a point to try your own, or "back to game".'
          : 'Say "next" to carry on, or "back" to step back.';
      say([`**${lead || 'Move ' + (k + 1)}**`, T.plies[k].note, tail].join('\n'));
    }

    function start(s, first) {
      const color = s.turn, r = E.tryPlay(E.geom(s.n), s.board, first, color, s.ko);
      if (!r.ok) { say(C.describePoint(E, s, first, color)); return false; }
      T.on = true; T.base = E.clone(s); T.human = color; T.plies = []; T.pos = 0; T.tried = {}; T.s = E.clone(s);
      say(`**Exploring ${co(first)}**\nI will follow this move on a copy of the board, one step at a time. Your game is not touched. Say "next" for each step, "back" to step back, "another" to see a different reply, or tap a point to try your own idea. Say "back to game" when you are done.`);
      run(async () => { T.plies.push(mk(T.base, first, color)); T.pos = 1; T.s = at(1); narrate(0); render(); });
      return true;
    }

    function forward() {
      return run(async () => {
        if (T.pos < T.plies.length) { T.pos++; T.s = at(T.pos); narrate(T.pos - 1); render(); return; }
        if (T.plies.length >= MAXPLY) { say('That is far enough for one line. Say "back" to step back, "another" to change a reply, or "back to game".'); return; }
        const s = at(T.pos), color = s.turn;
        const res = await E.chooseMove(s, color, { level: 'medium', ms });
        T.plies.push(mk(s, res.move, color)); T.pos = T.plies.length; T.s = at(T.pos);
        narrate(T.pos - 1); render();
      });
    }
    function another() {
      return run(async () => {
        if (T.pos < 2) { say('There is no reply to change yet. Say "next" first.'); return; }
        const k = T.pos - 1, sb = at(k), color = sb.turn;
        const tried = T.tried[k] || (T.tried[k] = new Set([T.plies[k].move]));
        const options = E.candidates(sb, color, 0).map(c => c.move).filter(m => !tried.has(m));
        if (!options.length) { say('I have no other sensible idea here. Say "back" to step back, or "back to game".'); return; }
        tried.add(options[0]);
        T.plies.length = k; T.plies.push(mk(sb, options[0], color)); T.pos = k + 1; T.s = at(T.pos);
        narrate(k, 'A different reply'); render();
      });
    }
    function back() {
      return run(async () => {
        if (T.pos <= 1) { say('This is the first move. Say "next" to go on.'); return; }
        T.pos--; T.s = at(T.pos);
        say(`**Back to move ${T.pos}**\n${T.plies[T.pos - 1].note}`); render();
      });
    }
    function again() { return run(async () => { T.pos = 1; T.s = at(1); narrate(0); render(); }); }

    /* Tapping a point plays your own idea at this step; the rest of the old line is dropped. */
    function tap(i) {
      return run(async () => {
        const s = at(T.pos), color = s.turn;
        if (s.board[i]) {
          const g = E.flood(E.geom(s.n), s.board, i);
          say(`That ${col(g.color).toLowerCase()} ${g.stones.length > 1 ? 'group' : 'stone'} has ${g.libs.length} ${g.libs.length === 1 ? 'liberty (in atari!)' : 'liberties'}.`);
          return;
        }
        const r = E.tryPlay(E.geom(s.n), s.board, i, color, s.ko);
        if (!r.ok) { say(C.describePoint(E, s, i, color)); return; }
        T.plies.length = T.pos; T.plies.push(mk(s, i, color)); T.pos = T.plies.length; T.s = at(T.pos);
        click(); narrate(T.pos - 1, 'Your idea'); render();
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
      return false;
    }

    const status = () => (T.plies.length ? `Exploring ${co(T.plies[0].move)}: step ${T.pos} of ${T.plies.length}` : 'Exploring');
    const view = () => ({ board: T.s.board, last: T.s.last, ko: T.s.ko, turn: T.s.turn, n: T.s.n });
    function exit() { T.on = false; }

    return { T, start, ask, tap, forward, back, another, view, status, exit, done: () => work, state: () => T.s, get on() { return T.on; } };
  }

  return { create };
});
