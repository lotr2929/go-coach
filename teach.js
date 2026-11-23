/* World of Go — the teaching engine. Plays the scripted lessons from curriculum.js on a 9×9 board.
   No DOM here: teachui.js connects it to the board and the chat, and test.js runs it in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoTeach = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLS = 'ABCDEFGHJ';
  const pt = c => (9 - +c.slice(1)) * 9 + COLS.indexOf(c[0]);
  const name = i => COLS[i % 9] + (9 - ((i / 9) | 0));
  const word = c => (c === 1 ? 'black' : 'white');

  /* A simple picture of who is closer to each empty point (no scoring): from -1 (White) to +1 (Black). */
  function influence(s) {
    const own = new Float32Array(81), st = [];
    for (let i = 0; i < 81; i++) if (s.board[i]) st.push(i);
    for (let i = 0; i < 81; i++) {
      if (s.board[i]) continue;
      let db = 99, dw = 99;
      for (const j of st) {
        const dd = Math.abs(j % 9 - i % 9) + Math.abs(((j / 9) | 0) - ((i / 9) | 0));
        if (s.board[j] === 1) db = Math.min(db, dd); else dw = Math.min(dw, dd);
      }
      if (db === 99 && dw === 99) continue;
      own[i] = db === dw ? 0 : (dw - db) / (dw + db);
    }
    return own;
  }

  /* d: { E, CM, C, CUR, say, render, click, save, load, startGame, leave } */
  function create(d) {
    const { E, CM, C, CUR } = d;
    const steps = CUR.steps, geom = E.geom(9), nop = () => {};
    const say = d.say || nop, render = d.render || nop, click = d.click || nop, save = d.save || nop;
    const loadSaved = d.load || (() => null), startGame = d.startGame || nop, leave = d.leave || nop;
    const T = { on: false, step: 0, scene: 0, s: null, solved: false, solvedAt: 0, hint: [], pending: -1, wrong: false };
    const scene = () => steps[T.step].scenes[T.scene];

    function build(sc) {
      const s = E.newState(9, 0);
      for (const c of sc.black || []) s.board[pt(c)] = 1;
      for (const c of sc.white || []) s.board[pt(c)] = 2;
      s.turn = sc.turn || 1;
      return s;
    }
    const subst = (text, i, cap) => {
      const libs = T.s.board[i] ? E.flood(geom, T.s.board, i).libs.length : 0;
      return String(text).replace('{libs}', libs).replace('{cap}', cap + (cap === 1 ? ' stone' : ' stones'));
    };
    const solved = () => { T.solved = true; T.solvedAt = T.s.moves.length; };
    /* A wrong try stays on the board while you read about it; it is taken back when you try again. */
    function settle() { if (T.wrong) { E.undo(T.s); T.wrong = false; } }

    function prompt(sc) {
      const t = sc.task, last = sc.text[sc.text.length - 1];
      if (!t) return /Say "/.test(last) ? '' : 'Say "next" when you are ready, or ask me anything. You can also tap the board to try a move.';
      const how = t.type === 'answer' ? 'Type your answer.' : 'Tap the board.';
      return `**Your turn:**\n${t.goal} ${how} Say "hint" if you are stuck.`;
    }
    function introduce() {
      const parts = [];
      if (T.scene === 0) parts.push(`**Step ${T.step + 1} of ${steps.length}: ${steps[T.step].title}**`);
      for (const p of scene().text) parts.push(p);
      const pr = prompt(scene());
      if (pr) parts.push(pr);
      say(parts.join('\n\n'));
    }
    function load(st, sn, quiet) {
      T.step = st; T.scene = sn; T.s = build(scene());
      T.solved = false; T.solvedAt = 0; T.hint = []; T.pending = -1; T.wrong = false;
      save({ step: st, scene: sn });
      if (!quiet) introduce();
      render();
    }

    /* ---------- what the board shows ---------- */
    function view() {
      const s = T.s, sc = scene();
      let terr = null, own = null;
      if (sc.terr === 'auto') terr = E.scoreArea(9, s.board).terr;
      else if (sc.shade) {
        terr = new Int8Array(81);
        for (const c of sc.shade.black || []) terr[pt(c)] = 1;
        for (const c of sc.shade.white || []) terr[pt(c)] = 2;
      }
      if (sc.influence) own = influence(s);
      const marks = {};
      for (const c of Object.keys(sc.marks || {})) if (!s.board[pt(c)]) marks[pt(c)] = sc.marks[c];
      return { board: s.board, last: s.last, ko: s.ko, libs: !!sc.libs, marks, hint: T.hint, terr, own, turn: s.turn };
    }
    const status = () => `Step ${T.step + 1} of ${steps.length}: ${steps[T.step].title}`;

    /* ---------- tapping the board ---------- */
    function stoneNote(i) {
      const g = E.flood(geom, T.s.board, i), n = g.stones.length;
      say(`That is ${n > 1 ? `a ${word(g.color)} group of ${n} stones` : `a ${word(g.color)} stone`} at ${name(i)}. It has ${g.libs.length} ${g.libs.length === 1 ? 'liberty (in atari!)' : 'liberties'}: ${g.libs.map(name).join(', ')}.`);
    }
    function refuse(i, reason, color, sc) {
      const why = C.describePoint(E, T.s, i, color), t = sc.task;
      if (t && t.type === 'try' && !T.solved && pt(t.at) === i && reason === t.reason) { solved(); say(t.ok + '\n\n' + why); return; }
      if (reason === 'ko' && sc.koNote) { say(why + '\n\n' + sc.koNote); return; }
      say(why);
    }
    function tap(i) {
      settle();
      T.hint = []; T.pending = -1;
      const sc = scene(), t = sc.task, s = T.s;
      if (s.board[i]) { stoneNote(i); render(); return; }
      const color = s.turn;
      const r = E.tryPlay(geom, s.board, i, color, s.ko);
      if (!r.ok) { refuse(i, r.reason, color, sc); render(); return; }
      const d0 = CM.describeMove(E, s, i, color, 1);
      const note = CM.render(d0, { head: `${name(i)}:`, bullets: 2 });
      const res = E.play(s, i);
      click();
      const cap = res.captured.length, open = t && !T.solved;
      if (open && (t.type === 'move' || t.type === 'try')) {
        if (t.type === 'move' && t.solution.map(pt).includes(i)) { solved(); say(subst(t.ok, i, cap)); }
        else {
          T.wrong = true;
          say(subst(t.wrong, i, cap) + '\n\n' + note + '\n\nTry again: I will take that stone back first. Say "hint" if you are stuck.');
        }
      } else if (open && t.type === 'any') {
        solved();
        say([note, t.praise && t.praise.map(pt).includes(i) ? t.praiseText : '', t.after].filter(Boolean).join('\n\n'));
      } else say(note + '\n\nSay "undo" to take it back, or "next" to carry on.');
      render();
    }

    /* ---------- moving through the lessons ---------- */
    function advance() {
      const step = steps[T.step];
      if (T.scene + 1 < step.scenes.length) return load(T.step, T.scene + 1);
      if (T.step + 1 < steps.length) return load(T.step + 1, 0);
      startGame();
    }
    function next() {
      settle();
      const t = scene().task;
      if (t && !T.solved) { say(`Have a go first. ${t.goal} Say "hint" for help, "show me" to see it done, or "skip" to move on.`); return; }
      advance();
    }
    function prev() {
      settle();
      if (T.scene > 0) load(T.step, T.scene - 1);
      else if (T.step > 0) load(T.step - 1, steps[T.step - 1].scenes.length - 1);
      else say('This is the very first part.');
    }
    function jump(n) {
      if (n < 1 || n > steps.length) { say(`There are ${steps.length} steps. Say "outline" to see them.`); return; }
      load(n - 1, 0);
    }
    function outline() {
      say('**The steps**\n' + steps.map((s, k) => `${k + 1}. ${s.title}${k === T.step ? '   (you are here)' : ''}`).join('\n') + '\n\nSay "step 3", for example, to jump to one.');
    }
    function undo() {
      if (T.wrong) { settle(); say('Taken back.'); render(); return; }
      if (!T.s.hist.length) { say('There is nothing to take back here.'); return; }
      E.undo(T.s);
      if (T.s.moves.length < T.solvedAt) T.solved = false;
      T.hint = [];
      say('Taken back.'); render();
    }
    function hint() {
      settle();
      const t = scene().task;
      if (!t || T.solved) { say('There is no task right now. Tap any stone to count its liberties, or ask "what if I play E5?".'); render(); return; }
      if (t.type === 'move') T.hint = [pt(t.solution[0])];
      else if (t.type === 'try') T.hint = [pt(t.at)];
      say(t.hint || 'Just try something: you cannot break anything, and "undo" takes a stone back.');
      render();
    }
    function show() {
      settle();
      const t = scene().task;
      if (!t || T.solved) { say('Tap any point to try a move, or say "next".'); return; }
      if (t.type === 'move') tap(pt(t.solution[0]));
      else if (t.type === 'try') tap(pt(t.at));
      else if (t.type === 'answer') { solved(); say(`The answer is ${t.answer}. ${t.ok}`); }
      else {
        const b = T.s.board;
        let i = (t.praise || []).map(pt).find(x => !b[x]);
        if (i === undefined) i = b.findIndex(v => !v);
        tap(i);
      }
    }
    function checkAnswer(t, q) {
      const m = String(q).match(/-?\d+(?:\.\d+)?/);
      if (!m) return false;
      if (+m[0] === t.answer) { solved(); say(t.ok); } else say(t.wrong);
      return true;
    }

    /* ---------- talking to the teacher ---------- */
    function ask(raw) {
      if (!T.on) return false;
      const q = String(raw).trim();
      const t = q.toLowerCase().replace(/[^a-z0-9.'\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const has = re => re.test(t);
      const sc = scene(), task = sc.task, idx = C.parseCoord(q, 9);

      if (has(/^(exit|leave|quit|stop|end)( the)?( lessons?| teaching| tutorial)?$|\bback to (the |my )?game\b|\b(leave|exit|quit|stop) (the )?(lessons?|teaching|tutorial)\b/)) { leave(); return true; }
      if (task && task.type === 'answer' && !T.solved && idx < 0 && /\d/.test(t) && !has(/\b(step|lesson|part) \d/)) return checkAnswer(task, t);
      if (T.step === steps.length - 1 && has(/^(play|start|start (the )?game|let'?s play|lets play|play now|begin)$/)) { startGame(); return true; }
      if (has(/^(next|next step|next lesson|continue|carry on|ok|okay|yes|yep|yeah|sure|ready|i am ready|i'?m ready|got it|go on|go ahead|proceed|done|understood|i see|alright|fine|thanks|thank you)$/)) { next(); return true; }
      if (has(/\bskip\b/)) { if (task) solved(); next(); return true; }
      if (has(/\b(from the (very )?(beginning|start)|restart (the )?(lessons?|teaching|course))\b/)) { load(0, 0); return true; }
      if (has(/\b(outline|contents|list (of )?(the )?(steps|lessons)|what are the (steps|lessons)|what (will|are) (you|we)( going to)? (teach|cover|learn))\b/)) { outline(); return true; }
      const jm = t.match(/\b(?:step|lesson|part) (\d+)\b/);
      if (jm) { jump(+jm[1]); return true; }
      if (has(/\b(previous|go back|back a step|last step)\b/)) { prev(); return true; }
      if (has(/\b(repeat|say that again|read (it|that) again)\b/)) { settle(); introduce(); return true; }
      if (has(/\b(undo|take (that|it) back|takeback)\b/)) { undo(); return true; }
      if (has(/\b(reset|start (this )?(part |step )?(over|again)|try again|retry|again)\b/)) { settle(); load(T.step, T.scene, true); say('Back to the start of this part. Tap the board to try again.'); return true; }
      if (has(/\b(hint|clue|stuck|help me|i don'?t know|what should i do)\b/)) { hint(); return true; }
      if (has(/\b(show me|demonstrate|do it for me|solve it|tell me the answer|what is the answer)\b/)) { show(); return true; }
      if (T.pending >= 0 && has(/^(try it|do it|place it|play it|go ahead and try it|yes try it)$/)) { tap(T.pending); return true; }
      if (idx >= 0) {
        if (has(/\b(play|put|place|try|tap)\b/) && !has(/\b(what|if|would|can|could|should|how)\b/)) { tap(idx); return true; }
        settle();
        if (T.s.board[idx]) { stoneNote(idx); return true; }
        const dm = CM.describeMove(E, T.s, idx, T.s.turn, 1);
        T.pending = dm.ok ? idx : -1;
        say(dm.ok ? CM.render(dm, { head: `If ${word(T.s.turn)} plays ${name(idx)}:`, bullets: 3 }) + '\n\nSay "try it" and I will place the stone.' : C.describePoint(E, T.s, idx, T.s.turn));
        return true;
      }
      if (has(/\b(explain|more detail|tell me more|elaborate|why|how come|clarify|confused|don'?t (understand|get)|what does (that|this) mean|what do you mean)\b/)) {
        const r = C.reply(q, { n: 9 });
        if (!r.action && r.text && !/^I am a rule-based coach/.test(r.text) && t.split(' ').length > 3) return false;
        settle();
        say(sc.more || 'Ask me about anything on the board: tap a stone to see its liberties, or ask "what if I play E5?".');
        return true;
      }
      return false;
    }

    function start() {
      T.on = true;
      const saved = loadSaved();
      let st = 0, sn = 0, resumed = false;
      if (saved && steps[saved.step] && (saved.step > 0 || saved.scene > 0)) {
        st = saved.step; sn = Math.min(saved.scene | 0, steps[st].scenes.length - 1); resumed = true;
      }
      say('**Teaching mode**\nWe will learn the basics of Go on a 9×9 board, a little at a time. Tap the board to place stones, or just talk to me: say "next", "hint", "show me", "explain more", "undo" or "start again", ask any question, or try "what if I play E5?". Say "back to game" whenever you want to return to your game.' +
        (resumed ? `\n\nWelcome back: we are at step ${st + 1}. Say "from the beginning" to restart.` : ''));
      load(st, sn);
    }
    function exit() { T.on = false; }

    return { T, start, exit, tap, ask, view, status, next, state: () => T.s, get on() { return T.on; } };
  }

  return { create, pt, name };
});
