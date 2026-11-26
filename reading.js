/* Go Coach — reading the fight. Explains a position the way a teacher would: which stones are weak (by their liberties), whether
   your own stones are safe, and what each lettered suggestion threatens, reading the opponent's sensible answers (connect, extend,
   counter-atari, capture or play elsewhere) and your best follow-up. Local rules only: no AI service.
   The wording is in docs/text/en/reading.md. read() returns null when nothing on the board is short of liberties, so the
   usual analysis is shown instead. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoReading = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const T = (k, v) => TX.T('reading.' + k, v);
  const LETS = 'ABCDE';

  function read(E, s, cands, name) {
    const n = s.n, g = E.geom(n), me = s.turn, op = 3 - me;
    const pt = i => E.coord(n, i);
    const list = items => (items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' ' + T('and') + ' ' + items[items.length - 1]);
    const names = stones => list(stones.slice().sort((a, b) => (a % n) - (b % n) || b - a).map(pt));
    const libNames = libs => list(libs.slice().sort((a, b) => (a % n) - (b % n) || b - a).map(pt));
    const num = k => { const w = T('numbers').split(',').map(x => x.trim()); return w[k - 1] || String(k); };
    const stonesWord = k => (k === 1 ? T('stones.1') : T('stones.n', { count: num(k) }));
    const pl = (key, stones, v) => T(key + (stones.length === 1 ? '.1' : '.n'), Object.assign({ stones: names(stones) }, v));
    const groups = (b, c) => E.allGroups(n, b).filter(x => x.color === c);
    const groupAt = (b, i) => E.flood(g, b, i);
    const inAtari = (b, c) => groups(b, c).filter(x => x.libs.length === 1);

    const before = { mine: groups(s.board, me), theirs: groups(s.board, op) };
    const weakTheirs = before.theirs.filter(x => x.libs.length <= 2), weakMine = before.mine.filter(x => x.libs.length <= 2);
    if (!weakTheirs.length && !weakMine.length) return null;

    /* My best follow-up after the opponent's answer: capture a group in atari, or save one of mine, or nothing.
       Value: stones captured, less the biggest group of mine still left in atari (the opponent takes it next). */
    function followUp(b, ko) {
      const tries = new Set([-1]);
      for (const x of inAtari(b, op)) tries.add(x.libs[0]);
      for (const x of inAtari(b, me)) tries.add(x.libs[0]);
      let best = null;
      for (const f of tries) {
        const r = f < 0 ? { ok: true, board: b, captured: [] } : E.tryPlay(g, b, f, me, ko);
        if (!r.ok) continue;
        const left = inAtari(r.board, me).filter(x => !(f >= 0 && E.tryPlay(g, r.board, x.libs[0], op, r.ko).ok === false));
        const threat = Math.max(0, ...left.map(x => x.stones.length));
        const savedFrom = inAtari(b, me).filter(x => x.stones.every(st => r.board[st] === me) && groupAt(r.board, x.stones[0]).libs.length > 1);
        const v = { f, captured: r.captured, saved: savedFrom.flatMap(x => x.stones), value: r.captured.length - threat };
        if (!best || v.value > best.value) best = v;
      }
      return best;
    }

    /* What the opponent's answer r does, for the sentence "If White …". */
    function replyKind(b1, r, res) {
      if (r < 0) return { key: 'r.ignore' };
      if (res.captured.length) return { key: 'r.capture', stones: res.captured };
      const hit = groups(b1, me).filter(x => x.libs.length >= 2 && x.libs.includes(r) && groupAt(res.board, x.stones[0]).libs.length === 1);
      if (hit.length) return { key: 'r.atari', stones: hit[0].stones };
      const joined = new Set(g.nb[r].filter(j => b1[j] === op).map(j => groupAt(b1, j).stones[0])).size;
      if (joined >= 2) return { key: 'r.connect' };
      if (g.nb[r].some(j => b1[j] === op)) return { key: 'r.extend' };
      return { key: 'r.other' };
    }

    function readMove(m) {
      const r0 = E.tryPlay(g, s.board, m, me, s.ko);
      if (!r0.ok) return null;
      const b1 = r0.board, eff = [];
      const capGroups = before.theirs.filter(x => x.stones.some(st => r0.captured.includes(st)));
      for (const x of capGroups) eff.push({ key: 'eff.capture', stones: x.stones });
      const nowAtari = before.theirs.filter(x => x.libs.length > 1 && x.libs.includes(m) && b1[x.stones[0]] === op && groupAt(b1, x.stones[0]).libs.length === 1);
      for (const x of nowAtari) eff.push({ key: 'eff.atari', stones: x.stones });
      const touching = before.theirs.filter(x => x.libs.includes(m) && b1[x.stones[0]] === op);
      if (touching.length >= 2) {
        const sorted = touching.slice().sort((a, b) => groupAt(b1, a.stones[0]).libs.length - groupAt(b1, b.stones[0]).libs.length);
        eff.push({ key: 'eff.cut', stones: sorted[0].stones, other: sorted[1].stones });
      }
      const attack = eff.length > 0;
      const helped = before.mine.filter(x => x.libs.length <= 2 && x.libs.includes(m) && groupAt(b1, m).libs.length > x.libs.length);
      for (const x of helped) eff.push({ key: 'eff.save', stones: x.stones });
      /* Two groups in atari with the same last liberty: "D6 and E7 now both depend on E6". */
      const share = {};
      for (const x of inAtari(b1, op)) (share[x.libs[0]] = share[x.libs[0]] || []).push(x);
      const shared = Object.entries(share).find(([, xs]) => xs.length >= 2);

      const tries = new Set([-1]);
      for (const x of groups(b1, op)) if (x.libs.length <= 2) x.libs.forEach(l => tries.add(l));
      for (const x of groups(b1, me)) if (x.libs.length <= 2) x.libs.forEach(l => tries.add(l));
      const replies = [];
      for (const r of tries) {
        const res = r < 0 ? { ok: true, board: b1, captured: [], ko: -1 } : E.tryPlay(g, b1, r, op, r0.ko);
        if (!res.ok) continue;
        const fu = followUp(res.board, res.ko);
        replies.push({ r, kind: replyKind(b1, r, res), fu, net: r0.captured.length + fu.value - res.captured.length });
      }
      const worst = Math.min(...replies.map(x => x.net)), bestCase = Math.max(...replies.map(x => x.net));
      return { m, eff, attack, helped, shared: shared ? { at: +shared[0], stones: shared[1].flatMap(x => x.stones), groups: shared[1] } : null, replies, worst, bestCase };
    }

    const reads = cands.slice(0, 5).map((m, i) => { const x = readMove(m); return x && Object.assign(x, { letter: LETS[i] }); }).filter(Boolean);
    /* The opponent's best answer; among equally good ones, the one that answers this move directly, and a real move before "elsewhere". */
    const direct = x => new Set(x.eff.flatMap(e => groupAt(s.board, e.stones[0]).libs.concat(e.stones.flatMap(st => g.nb[st]))));
    const worstReply = x => { const d = direct(x); return x.replies.slice().sort((a, b) => a.net - b.net || d.has(b.r) - d.has(a.r) || (a.r < 0) - (b.r < 0))[0]; };
    /* A move counts as an attack only if what it wins comes from its own threat: stones it captures, or stones it attacked.
       (D6 in atari can be taken after almost any move, so that alone does not make a move good.) */
    const ownWin = x => {
      const mine = new Set(x.eff.filter(e => e.key !== 'eff.save').flatMap(e => e.stones).concat(g.nb[x.m]));
      return x.eff.some(e => e.key === 'eff.capture') || worstReply(x).fu.captured.some(st => mine.has(st));
    };
    const attacks = reads.filter(x => x.attack && x.worst > 0 && ownWin(x)).sort((a, b) => b.worst - a.worst || b.bestCase - a.bestCase);
    if (!attacks.length) return null;
    const best = attacks[0];
    const safeAfterBest = st => best.replies.every(x => x.fu.value >= 0 && !(x.kind.stones && x.kind.key === 'r.capture' && x.kind.stones.some(q => st.includes(q))));

    const opName = name(op), meName = name(me);
    /* "puts E7 in atari and cuts it off from C8 and D8": the same stones are not named twice. */
    const effText = x => list(x.eff.map((e, i) => {
      const again = e.key === 'eff.cut' && i > 0 && names(x.eff[i - 1].stones) === names(e.stones);
      return T(again ? 'eff.cut-it' : e.key, { stones: names(e.stones), other: e.other ? names(e.other) : '' });
    }));
    const replyText = x => T(x.kind.key, { point: pt(x.r), stones: x.kind.stones ? names(x.kind.stones) : '' });
    function outcome(x) {
      const f = x.fu;
      if (!f.captured.length) return T(x.net > 0 ? 'o.nothing-more' : 'o.escape', { colour: x.net > 0 ? meName : opName });
      const v = { colour: meName, point: pt(f.f), stones: names(f.captured), mine: names(f.saved) };
      return T(f.saved.length ? 'o.saves' : x.kind.key === 'r.atari' ? 'o.capture-still' : 'o.capture', v);
    }

    /* 1. The opponent's stones, weakest first. */
    const weak = [];
    const cutOther = (best.eff.find(e => e.key === 'eff.cut') || {}).other;
    const theirs = before.theirs.slice().sort((a, b) => a.libs.length - b.libs.length);
    let rest = 0;
    for (const x of theirs) {
      if (x.libs.length === 1) weak.push(pl('atari', x.stones, { libs: libNames(x.libs) }));
      else if (x.libs.length === 2) weak.push(pl('two', x.stones, { libs: libNames(x.libs) }));
      else if (cutOther && x.stones.includes(cutOther[0])) weak.push(pl('safe', x.stones, { count: num(x.libs.length) }));
      else rest++;
    }
    if (rest) weak.push(T('safe-rest', { colour: opName }));

    /* 2. My stones: safe, a little thin, or in atari. */
    const mine = [];
    const sortedMine = before.mine.slice().sort((a, b) => b.stones.length - a.stones.length);
    if (!sortedMine.some(x => x.libs.length === 1)) mine.push(T('solid', { colour: meName }));
    let shown = 0;
    for (const x of sortedMine) {
      if (x.libs.length >= 3 && shown < 2) {
        shown++;
        mine.push(x.stones.length >= 5 ? T('big', { stones: names(x.stones), count: num(x.libs.length) }) : pl('group', x.stones, { count: num(x.libs.length) }));
      }
    }
    for (const x of sortedMine) if (x.libs.length === 1) mine.push(pl('mine-atari', x.stones, { libs: libNames(x.libs) }));
    const thin = sortedMine.filter(x => x.libs.length === 2), only = weakMine.length === 1 ? 'thin-only' : 'thin';
    for (const x of thin) mine.push(pl(only, x.stones, { libs: libNames(x.libs) }) + (safeAfterBest(x.stones) ? ' ' + T('in-time', { colour: opName }) : ''));

    /* 3. The best move, with the answers that matter: the opponent's best, playing elsewhere, and a counter-atari. */
    const bestLines = [T('best', { letter: best.letter, point: pt(best.m), effects: effText(best) })];
    if (best.shared) bestLines[0] += ' ' + T('share', { stones: list(best.shared.groups.map(x => names(x.stones))), point: pt(best.shared.at) });
    const pick = [];
    const add = x => { if (x && !pick.includes(x)) pick.push(x); };
    const sortedReplies = best.replies.slice().sort((a, b) => a.net - b.net);
    add(best.replies.find(x => ['r.connect', 'r.extend'].includes(x.kind.key) && x.fu.captured.length));
    add(best.replies.find(x => x.kind.key === 'r.ignore'));
    add(best.replies.find(x => x.kind.key === 'r.atari' && !x.kind.stones.includes(best.m)) || best.replies.find(x => x.kind.key === 'r.atari'));
    add(sortedReplies[0]);
    for (const x of pick.slice(0, 3)) bestLines.push(T('bullet', { text: T('if', { colour: opName, reply: replyText(x), outcome: outcome(x) }) }));

    /* 4. Other attacking moves that also win something, and 5. the weaker options. */
    const bestReply = x => x.replies.filter(y => y.r >= 0).sort((a, b) => b.net - a.net)[0] || worstReply(x);
    const won = x => { const w = worstReply(x); return names(x.eff.filter(e => e.key === 'eff.capture').flatMap(e => e.stones).concat(w.fu.captured)); };
    const also = attacks.slice(1).map(x => T('also', { letter: x.letter, point: pt(x.m), effects: effText(x), colour: opName, reply: pt(worstReply(x).r), me: meName, gain: stonesWord(x.worst), won: won(x), best: num(best.worst) }));
    const weaker = reads.filter(x => !attacks.includes(x)).sort((a, b) => b.worst - a.worst || b.bestCase - a.bestCase).map(x => {
      const v = { letter: x.letter, point: pt(x.m), effects: effText(x), colour: opName, me: meName };
      const w = worstReply(x);
      /* "Works only if": the best case must come from this move's own threat (a capture next to it), not from a weakness elsewhere. */
      const bc = bestReply(x), own = bc.fu.captured.some(st => g.nb[x.m].includes(st));
      if (x.bestCase > Math.max(0, x.worst) && own) {
        return T(x.worst > 0 ? 'works-only' : 'works-only-0', Object.assign(v, { reply: replyText(bc), point2: w.r >= 0 ? pt(w.r) : T('elsewhere'), gain: stonesWord(x.worst) }));
      }
      if (x.attack) return T('escapes', Object.assign(v, { point2: w.r >= 0 ? pt(w.r) : T('elsewhere') }));
      if (x.helped.length && x.helped.every(h => safeAfterBest(h.stones))) return T('protects', Object.assign(v, { stones: names(x.helped.flatMap(h => h.stones)) }));
      return T(x.eff.length ? 'quiet' : 'nothing', v);
    });

    const sections = [
      { head: T('h.weak', { colour: opName }), text: weak.join('\n') },
      { head: T('h.mine', { colour: meName }), text: mine.join('\n') },
      { head: T('h.best'), text: bestLines.join('\n') }
    ];
    if (also.length) sections.push({ head: T('h.also'), text: also.map(t => T('bullet', { text: t })).join('\n') });
    if (weaker.length) sections.push({ head: T('h.weaker'), text: weaker.map(t => T('bullet', { text: t })).join('\n') });
    return { sections, best: best.m, letter: best.letter, answer: T('answer', { letter: best.letter, point: pt(best.m) }), gains: Object.fromEntries(reads.map(x => [x.letter, x.worst])) };
  }

  return { read };
});
