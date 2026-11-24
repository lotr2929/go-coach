/* Go Coach — the coach's brain. Understands typed questions with keyword rules and reads the board with the local engine. No AI service. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./text.js'));
  else root.GoCoach = factory(root.GoText);
})(typeof self !== 'undefined' ? self : this, function (TX) {
  'use strict';
  const { T } = TX; /* the wording, from docs/text (text.js) */

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const LESSON_IDS = ['board', 'liberties', 'capture', 'groups', 'atari', 'suicide', 'exception', 'ko', 'eyes', 'connect', 'cut', 'scoring', 'ending', 'handicap', 'strategy', 'firstmove'];
  const LESSON_WORDS = [['liberties', ['liberty', 'liberties']], ['capture', ['capturing', 'capture']], ['groups', ['group', 'groups']], ['atari', ['atari', 'escape']],
    ['suicide', ['suicide']], ['ko', ['ko']], ['eyes', ['eye', 'eyes', 'alive']], ['scoring', ['counting', 'scoring', 'score']], ['strategy', ['strategy', 'first ideas']],
    ['connect', ['connect', 'connecting']], ['cut', ['cut', 'cutting']], ['ending', ['ending', 'passing', 'finish']], ['handicap', ['handicap', 'komi']], ['firstmove', ['first move', 'opening']]];

  /* The welcome (docs/text/en/welcome.md): the first message in the chat, shown again by "help". welcome.js knows its five choices,
     in the same order as WELCOME_KEYS. In the chat, welcomeui.js shows INTRO_TOP, the choices as buttons, then INTRO_END.
     INTRO is the whole text as saved in the chat, with the choices as a numbered list. */
  const WELCOME_KEYS = ['whatisgo', 'history', 'teach', 'coach', 'tour'];
  const INTRO_TOP = T('welcome.top');
  const INTRO_END = T('welcome.end');
  const INTRO = INTRO_TOP + '\n\n' + WELCOME_KEYS.map((k, i) => { const w = T('welcome.' + k); return `${i + 1}. ${w}${/[.?!]$/.test(w) ? '' : '.'}`; }).join('\n') + '\n\n' + INTRO_END;
  const HELP = INTRO;
  /* The coach's answers are in docs/text/en/coach.md, Go terms in terms.md, points in point.md, lesson help in lesson-help.md. */
  const FIRST_MOVE_SHORT = T('coach.first-move');
  const FIRST_MOVE_DETAIL = T('coach.first-move-detail');
  const RULES = T('coach.rules');
  const FIRST_MOVE_RE = /\b(first move|opening move|first stone|where to start|where do i start|how (do|should) i (start|open|begin)|why (the )?corners?|start(ing)? in (a |the )?corner)\b/;
  const SQUARES = T('coach.squares');
  const TOPIC_MORE = {
    territory: SQUARES,
    liberty: T('coach.more.liberty'),
    atari: T('coach.more.atari'),
    ko: T('coach.more.ko'),
    eye: T('coach.more.eye'),
    komi: T('coach.more.komi'),
    firstmove: FIRST_MOVE_DETAIL
  };
  const FALLBACK = T('coach.fallback');

  /* w: the words the coach listens for (they stay here); id: the answer's name in terms.md. */
  const TERMS = [
    { id: 'liberty', w: ['liberty', 'liberties'] },
    { id: 'atari', w: ['atari'] },
    { id: 'capture', w: ['capture', 'captured', 'prisoner', 'prisoners'] },
    { id: 'group', w: ['group', 'chain'] },
    { id: 'eye', w: ['eye', 'eyes'] },
    { id: 'alive', w: ['alive', 'dead', 'life and death'] },
    { id: 'ko', w: ['ko'] },
    { id: 'suicide', w: ['suicide'] },
    { id: 'territory', w: ['territory'] },
    { id: 'scoring', w: ['scoring', 'area scoring', 'area'] },
    { id: 'komi', w: ['komi'] },
    { id: 'handicap', w: ['handicap'] },
    { id: 'pass', w: ['pass', 'passing'] },
    { id: 'ladder', w: ['ladder'] },
    { id: 'snapback', w: ['snapback'] },
    { id: 'seki', w: ['seki'] },
    { id: 'sente', w: ['sente', 'gote'] },
    { id: 'tenuki', w: ['tenuki'] },
    { id: 'star-points', w: ['hoshi', 'star point', 'star points'] },
    { id: 'lines', w: ['third line', 'fourth line', '3rd line', '4th line', 'first line'] },
    { id: 'opening', w: ['opening', 'fuseki', 'strategy'] },
    { id: 'connect', w: ['connect', 'connection', 'cut'] }
  ];
  for (const term of TERMS) term.t = T('terms.' + term.id);

  function lev(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  /* Shape names (ponnuki, tiger's mouth, keima…) come from shapes.js, which also marks them on the board. They are checked
     first, so "false eye" and "cutting point" win over "eye" and "cut". */
  const shapeTerms = () => (typeof GoShapes !== 'undefined' ? GoShapes : typeof require === 'function' ? require('./shapes.js') : { TERMS: [] }).TERMS;
  function findTerm(t) {
    const tokens = t.split(' ');
    for (const term of shapeTerms().concat(TERMS)) {
      for (const w of term.w) {
        if (w.includes(' ') ? t.includes(w) : tokens.some(k => k === w || (w.length >= 5 && k.length >= 5 && lev(k, w) <= 1))) return term;
      }
    }
    return null;
  }
  function parseCoord(raw, n) {
    const m = String(raw).match(/\b([a-hj-t])(\d{1,2})\b/i);
    if (!m) return -1;
    const col = LETTERS.indexOf(m[1].toUpperCase()), row = +m[2];
    if (col < 0 || col >= n || row < 1 || row > n) return -1;
    return (n - row) * n + col;
  }
  const coordName = (n, i) => LETTERS[i % n] + (n - ((i / n) | 0));
  const out = (text, extra) => Object.assign({ text }, extra || {});

  function reply(text, ctx) {
    ctx = ctx || {};
    const n = ctx.n || 9;
    const raw = String(text || '').trim();
    if (!raw) return out(T('coach.empty'));
    const t = raw.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const has = re => re.test(t);
    const pt = parseCoord(raw, n);
    const question = /^(can|could|should|shall|is|would|will|what|how|does|do|why)\b/.test(t) || /\?\s*$/.test(raw);
    const isWhat = has(/\b(what('s| is| are| does)?|explain|define|meaning|mean|tell me about|describe)\b/);

    /* "commands": how the chat works and what to type (commands.md). */
    if (has(/^((please )?(show|list|give) me )?(the |a |all )?(list of )?(text |chat )?(commands?|command list|prompts)( please)?$|\bwhat (can|should) i (type|say|ask)\b|\b(text|chat) (commands|prompts|hints)\b|\blist of commands\b/)) return out(TX.T('commands.list'));
    /* Play both sides: on the other side's turn the coach marks its best moves and you choose (play.js). */
    if (has(/\b(play (both|two) sides|both sides|let me (choose|pick|play) (the )?(computer'?s|white'?s|black'?s|opponent'?s|other side'?s|its|both) moves?)\b/)) return out('', { action: 'both', arg: true });
    if (has(/^(the )?computer plays?( again)?$|\blet the computer play\b|\bstop (playing )?both sides\b/)) return out('', { action: 'both', arg: false });
    /* Show me: the coach plays the best move and the likely replies by itself on a copy of the board (exploreui.js). */
    if (has(/^(please )?(show me|show me what happens|show me how it goes|play it out|play it out for me)( please)?$/)) return out('', { action: 'showme' });
    if (has(/^(hi|hello|hey|hiya|g'?day|good (morning|afternoon|evening))\b/)) return out(T('coach.hello'));
    if (has(/\b(thanks|thank you|cheers)\b/)) return out(T('coach.thanks'));
    if (has(/\b(history|origins?|who (invented|created) (go|the game)|where (did|does) (go|the game) come from|how old is (go|the game))\b/)) return out(T('coach.history'), { action: 'history' });
    if (has(/\b(kifu|famous games?|game records?|master games?|pro games?|professional games?|study (a |some )?(famous |pro )?games?|replay (a |some )?games?)\b/)) return out(T('coach.kifu'), { action: 'kifu' });
    if (FIRST_MOVE_RE.test(t)) return has(/\b(detail|explain|elaborate|more|why|reasoning|reason)\b/) ? out(FIRST_MOVE_DETAIL, { topic: 'firstmove' }) : out(FIRST_MOVE_SHORT, { topic: 'firstmove' });
    if (has(/\b(squares?|ownership)\b/)) return out(SQUARES, { topic: 'territory' });
    if (has(/\b(more detail|in detail|tell me more|elaborate|expand|go on|in more depth|explain (that|it|more))\b/)) {
      if (ctx.topic && TOPIC_MORE[ctx.topic]) return out(TOPIC_MORE[ctx.topic], { topic: ctx.topic });
      return out(T('coach.more-what'));
    }
    if (has(/\b(undo|take back|takeback|go back)\b/)) return out(T('coach.undo'), { action: 'undo' });
    if (has(/\b(hint|hints|suggest|suggestion|best move|good move|where (should|can|do|would) i (play|put|go|move)|what (should|shall|can) i (do|play)|next move|recommend)\b/)) return out(T('coach.hint'), { action: 'hint' });
    if (has(/\b(explain|describe|summari[sz]e|talk me through|walk me through)\b.*\b(position|board)\b|\bwhat('s| is) (happening|going on)\b|\bhow is (the|this) game\b/)) return out('', { action: 'summary' });
    if (has(/\b(what should i (be )?(think|look|consider|check)\w*|what do i (look|check)|checklist|how do i (choose|decide|pick)( a move)?|what to think about)\b/)) return out('', { action: 'think' });
    if (has(/\b(analy[sz]e|analysis|evaluate|evaluation|alternatives?|other (moves|options|plays)|what else|who('s| is| are)? (winning|ahead|leading)|am i (winning|ahead|losing|behind|doing)|how (am i|are we|is the game) (doing|going)|current score|score now|show (me )?(the )?(territory|influence|ownership))\b/)) return out(T('coach.analyse'), { action: 'analyse' });
    if (has(/\b(review|mistakes?|blunders?|how did i (do|play)|was (that|my (last |previous )?move) (good|bad|ok|okay|a mistake)|rate my|check my (move|moves|game)|my last move)\b/)) return out(T('coach.review'), { action: 'review' });
    if (has(/\bwhy\b.*\b(play|played|move|moved|there|that|you)\b/) || has(/\bexplain\b.*\b(your|that|the)\b.*\bmove\b/)) return out('', { action: 'why' });
    if (isWhat) { const term = findTerm(t); if (term) return out(term.t, { topic: term.w[0] }); }
    if (has(/\b(danger|in trouble|weak|at risk|threatened|am i safe|in atari|any ataris?|short of liberties)\b/)) return out('', { action: 'weak' });
    if (has(/^(pass|i pass|skip|skip (my )?(turn|move))$/) || has(/\b(i want to pass|let me pass|i('ll| will) pass)\b/)) return out(T('coach.pass'), { action: 'pass' });
    if (has(/\b(resign|give up|i quit)\b/)) return out(T('coach.resign'), { action: 'resign' });
    if (has(/\b(new game|start (a |another )?(new )?(game|match)|restart|play again|another game|rematch)\b/) || (has(/\b(game|match)\b/) && has(/\b(9|13|19)(?=x|\s|$)/) && has(/\b(start|new|play)\b/))) {
      const arg = {};
      const sz = t.match(/\b(9|13|19)(?=x|\s|$)/); if (sz) arg.size = +sz[1];
      const lv = t.match(/\b(easy|medium|hard)\b/); if (lv) arg.level = lv[1];
      const side = t.match(/\bas (black|white)\b/); if (side) arg.colour = side[1];
      return out(T('coach.new-game'), { action: 'new', arg });
    }
    if (has(/\b(back to (the )?game|exit (the )?lesson|leave (the )?lesson|stop (the )?lesson|end (the )?lesson|return to (the )?game|resume (the )?game)\b/)) return out('', { action: 'exit' });
    if (has(/^((can|could|would) you |please )*(teach me|teach me (the )?(basics|rules|game|go|how to play( go)?)( of go)?|teach me something( about go)?|teaching mode|start (the )?(teaching|tutorial|lessons?)( mode)?|learn go|learn (the )?(basics|game|rules)( of go)?|(the )?basics( of go)?|(i am|i'?m) (a )?beginner|new to go|(i want|i would like|i'?d like) to learn( go| how to play( go)?)?)( please)?$/)) return out('', { action: 'teach' });
    if (has(/\b(teach|lessons?|tutorial|beginner|learn( go)?|how (do|to) (i )?play|how does go work|rules( of go)?|basics)\b/)) {
      let id = null;
      const num = t.match(/lesson\s*(\d+)/);
      if (num && LESSON_IDS[+num[1] - 1]) id = LESSON_IDS[+num[1] - 1];
      else for (const [lid, words] of LESSON_WORDS) if (words.some(w => t.includes(w))) { id = lid; break; }
      if (!id && has(/\b(rules|how (do|to) (i )?play|how does go work|basics)\b/)) return out(RULES, { action: null });
      return id ? out(T('coach.lesson'), { action: 'lesson', arg: { id } }) : out(T('coach.lessons'), { action: 'menu' });
    }
    const on = has(/\b(show|display|turn on|enable|switch on|use)\b/), off = has(/\b(hide|turn off|disable|switch off|remove|stop)\b/);
    if (on || off) {
      const val = on && !off;
      if (has(/\b(liberties|liberty|libs)\b/)) return out(T(val ? 'coach.libs-on' : 'coach.libs-off'), { action: 'set', arg: { libs: val } });
      if (has(/\b(coordinates|coords|labels)\b/)) return out(T(val ? 'coach.coords-on' : 'coach.coords-off'), { action: 'set', arg: { coords: val } });
      if (has(/\b(tips|coach tips|warnings)\b/)) return out(T(val ? 'coach.tips-on' : 'coach.tips-off'), { action: 'set', arg: { coach: val } });
      if (has(/\b(sound|click)\b/)) return out(T(val ? 'coach.sound-on' : 'coach.sound-off'), { action: 'set', arg: { sound: val } });
    }
    if (pt >= 0 && has(/\b(explore|walk me through|what happens (if|after|when)|show me what happens|follow (it|that|this) through|where does (it|that|this) lead)\b/)) return out(T('coach.explore', { point: coordName(n, pt) }), { action: 'explore', arg: pt });
    if (pt >= 0) {
      if (has(/\b(play|put|place|move)\b/) && !question) return out(T('coach.play', { point: coordName(n, pt) }), { action: 'play', arg: pt });
      return out('', { action: 'point', arg: pt });
    }
    if (has(/^(help|\?)$|\bwhat can (you|i)\b|\bhow do i use (you|this|the coach)\b/)) return out(HELP);
    const term = findTerm(t);
    if (term) return out(term.t, { topic: term.w[0] });
    return out(FALLBACK);
  }

  /* What would a move at idx do? Uses the engine E and the game state s. */
  /* The sentences are put together from the pieces in docs/text/en/point.md. */
  function describePoint(E, s, idx, color) {
    const g = E.geom(s.n), point = coordName(s.n, idx), colour = c => T(c === 1 ? 'point.black' : 'point.white');
    if (s.board[idx]) return T('point.occupied', { point, colour: colour(s.board[idx]) });
    const r = E.tryPlay(g, s.board, idx, color, s.ko);
    if (!r.ok) {
      if (r.reason === 'ko') return T('point.ko', { point });
      if (r.reason === 'suicide') {
        const b = s.board.slice(); b[idx] = color;
        const seen = new Set(), notes = [];
        for (const j of g.nb[idx]) {
          if (!b[j] || b[j] === color || seen.has(j)) continue;
          const a = E.flood(g, b, j);
          a.stones.forEach(x => seen.add(x));
          notes.push(T('point.suicide-why', {
            colour: colour(a.color), what: T(a.stones.length > 1 ? 'point.group' : 'point.stone'), count: a.libs.length,
            liberties: T(a.libs.length === 1 ? 'point.liberty' : 'point.liberties'), list: a.libs.map(l => coordName(s.n, l)).join(', ')
          }));
        }
        const reason = notes.length > 2 ? T('point.suicide-why-many') : notes.join(` ${T('point.and')} `);
        return reason ? T('point.suicide', { point, colour: colour(color), reason }) : T('point.suicide-plain', { point, colour: colour(color) });
      }
      return T('point.not-legal', { point });
    }
    const parts = [];
    if (r.captured.length) parts.push(r.captured.length > 1 ? T('point.captures-many', { count: r.captured.length }) : T('point.captures-one'));
    const mine = E.flood(g, r.board, idx);
    if (mine.libs.length === 1 && !r.captured.length) parts.push(T('point.self-atari'));
    else parts.push(T('point.group-libs', { count: mine.libs.length }));
    const seen = new Set();
    for (const j of g.nb[idx]) {
      if (!r.board[j] || r.board[j] === color || seen.has(j)) continue;
      const a = E.flood(g, r.board, j);
      a.stones.forEach(x => seen.add(x));
      if (a.libs.length === 1) parts.push(T('point.puts-atari', { count: a.stones.length, point: coordName(s.n, a.stones[0]) }));
    }
    for (const j of g.nb[idx]) {
      if (s.board[j] !== color || seen.has(j)) continue;
      const a = E.flood(g, s.board, j);
      a.stones.forEach(x => seen.add(x));
      if (a.libs.length === 1 && mine.libs.length >= 2) parts.push(T('point.rescues', { point: coordName(s.n, a.stones[0]) }));
    }
    const edge = Math.min(idx % s.n, (idx / s.n) | 0, s.n - 1 - (idx % s.n), s.n - 1 - ((idx / s.n) | 0));
    if (edge === 0) parts.push(T('point.first-line'));
    else if (edge === 2) parts.push(T('point.third-line'));
    else if (edge === 3) parts.push(T('point.fourth-line'));
    return T('point.legal', { point, details: parts[0][0].toUpperCase() + parts[0].slice(1) + (parts.length > 1 ? '; ' + parts.slice(1).join('; ') : '') });
  }

  /* Which groups are short of liberties? */
  function weakReport(E, s, human) {
    const weak = E.allGroups(s.n, s.board).filter(g => g.libs.length <= 2).sort((a, b) => a.libs.length - b.libs.length || b.stones.length - a.stones.length).slice(0, 4);
    if (!weak.length) return T('point.weak-none');
    const lines = weak.map(g => {
      const v = {
        who: T(g.color === human ? 'point.weak-yours' : 'point.weak-computers'),
        size: g.stones.length > 1 ? T('point.weak-size-group', { count: g.stones.length }) : T('point.weak-size-stone'),
        point: coordName(s.n, g.stones[0]), last: coordName(s.n, g.libs[0])
      };
      return T(g.libs.length === 1 ? 'point.weak-atari' : 'point.weak-two', v);
    });
    const mineAtari = weak.some(g => g.color === human && g.libs.length === 1), theirsAtari = weak.some(g => g.color !== human && g.libs.length === 1);
    if (mineAtari) lines.push(T('point.weak-save'));
    else if (theirsAtari) lines.push(T('point.weak-capture'));
    return lines.join('\n');
  }

  /* Longer explanations for each lesson, used when the learner asks for more detail (docs/text/en/lesson-help.md). */
  const LESSON_MORE = { firstmove: FIRST_MOVE_DETAIL };
  for (const id of LESSON_IDS) if (id !== 'firstmove') LESSON_MORE[id] = T('lesson-help.' + id);

  /* Answers questions about the lesson on screen. info = { id, n, s, marks: {A: index}, task }. Returns null when it has nothing lesson-specific to say. */
  function lessonReply(E, text, info) {
    if (!info) return null;
    const t = String(text).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const has = re => re.test(t);
    const labels = Object.keys(info.marks);
    const relabel = str => labels.reduce((acc, L) => acc.replace(new RegExp('\\b' + coordName(info.n, info.marks[L]) + '\\b', 'g'), L), str);
    const point = L => relabel(describePoint(E, info.s, info.marks[L], info.s.turn));
    const m = String(text).match(/\b(?:[Aa]t|[Aa]bout|[Pp]oint|[Oo]n|[Pp]lays?|[Pp]laying|[Tt]ry|[Mm]ove)\s+([A-F])\b(?:\s*(?:,|or|and|&)\s*([A-F])\b)?/);
    const asked = m ? [m[1], m[2]].filter(Boolean) : [];
    if (has(/\b(explain|more detail|in detail|don'?t understand|do not understand|confus|not sure|elaborate|clarify|don'?t get|what does this mean|what is going on)\b/)) return out(LESSON_MORE[info.id] || T('lesson-help.ask-point'));
    if ((info.id === 'strategy' || info.id === 'firstmove') && FIRST_MOVE_RE.test(t) && has(/\b(detail|explain|elaborate|more|why|reasoning|reason)\b/)) return out(FIRST_MOVE_DETAIL);
    if (info.id === 'strategy' && has(/\b(where|first move|start|begin|open)\b/)) return out(T('lesson-help.strategy-where'));
    if (has(/\b(hint|stuck|what should i do|what do i do)\b/)) {
      if (info.hasHint === false) return out((LESSON_MORE[info.id] || '') + '\n' + T('lesson-help.no-ring'));
      return out(T('lesson-help.ring'), { action: 'hint' });
    }
    if (has(/\b(reset|start over|try again|start again|retry)\b/)) return out(T('lesson-help.reset'), { action: 'reset' });
    if (has(/\b(next lesson|next one|move on|go on|continue)\b/) || has(/^next$/)) return out(T('lesson-help.next'), { action: 'next' });
    if (has(/\b(task|goal|objective|what am i (supposed|meant) to do)\b/) && info.task) return out(T('lesson-help.task', { task: info.task }));
    if (asked.length) {
      const known = asked.filter(L => info.marks[L] !== undefined);
      if (known.length) return out(known.map(point).join('\n'));
      return out(labels.length ? T('lesson-help.no-point-marked', { label: asked[0], list: labels.join(` ${T('point.and')} `) }) : T('lesson-help.no-point', { label: asked[0] }));
    }
    if (labels.length && has(/\b(illegal|not allowed|can'?t|cannot|why|refuse|forbidden|what happens|what if)\b/)) return out(labels.map(point).join('\n'));
    return null;
  }

  return { reply, lessonReply, describePoint, weakReport, parseCoord, INTRO, INTRO_TOP, INTRO_END, WELCOME_KEYS, TERM_IDS: TERMS.map(x => x.id), LESSON_IDS, HELP, RULES };
});
