/* Go Coach — the coach's brain. Understands typed questions with keyword rules and reads the board with the local engine. No AI service. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoCoach = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  /* In the order of the lessons menu (the chapters in lessons.js), so "lesson 12" means the twelfth one listed. */
  const LESSON_IDS = ['board', 'liberties', 'capture', 'groups', 'atari', 'suicide', 'exception', 'ko', 'eyes', 'connect', 'cut', 'tiger', 'triangle', 'scoring', 'ending', 'race', 'strategy', 'firstmove', 'handicap'];
  const LESSON_WORDS = [['tiger', ['tiger']], ['triangle', ['empty triangle', 'bad shape']], ['race', ['capturing race', 'semeai']], ['liberties', ['liberty', 'liberties']], ['capture', ['capturing', 'capture']], ['groups', ['group', 'groups']], ['atari', ['atari', 'escape']],
    ['suicide', ['suicide']], ['ko', ['ko']], ['eyes', ['eye', 'eyes', 'alive']], ['scoring', ['counting', 'scoring', 'score']], ['strategy', ['strategy', 'first ideas']],
    ['connect', ['connect', 'connecting']], ['cut', ['cut', 'cutting']], ['ending', ['ending', 'passing', 'finish']], ['handicap', ['handicap', 'komi']], ['firstmove', ['first move', 'opening']]];

  /* The welcome: the first message in the chat, shown again by New, Clear and "help". welcome.js knows its five choices. */
  const INTRO = 'Hello, I am your Go coach. I am not an AI model. I answer from the rules of Go and by analysing the board on your device. You can ask me to do the following:\n\n1. What is Go?\n2. A Short History of Go.\n3. Teach me.\n4. Coach me.\n5. How to use the app.\n\nType your request by typing one of the numbers above or in your own words in the box below. I will try to answer your question if I can. However, since I am not an AI model, I may not understand your query as fully as an AI model can. Typing Help brings you back to this prompt.';
  const HELP = INTRO;
  const FIRST_MOVE_SHORT = 'Start in a corner, then the sides, then the centre: corners make territory with the fewest stones. Ask me to "explain the first move in more detail" for the full reasoning, or say "hint" for a suggestion in this position.';
  const FIRST_MOVE_DETAIL = 'Why the first move usually goes in a corner:\n1. A corner stone has two edges to help it, so it takes fewer stones to claim territory there than anywhere else.\n2. The sides come next. The centre is the hardest area to hold, so it is usually left until later.\n3. Which point? On a 9×9 board the favourite points are the 3-3 points (C3, G3, C7, G7): they are safe and claim a corner quickly. The centre point (E5) is also played, but it is harder to use. On 13×13 and 19×19 the star points (the dots) near the corners do the same job.\n4. Avoid the first line (the edge) and usually the second line: a stone there has few liberties and little room for territory.\n5. After your move your opponent replies. You can then take another corner, or press the stone that came near yours.';
  const RULES = 'The rules in brief:\n1. Black plays first; players alternate placing one stone on an intersection.\n2. A stone or group with no liberties (empty neighbouring points) is captured.\n3. You may not play a stone with no liberties unless it captures.\n4. Ko: you may not recreate the previous position.\n5. When both players pass, the game ends. Score = stones plus surrounded empty points; White adds komi.\nSay "teach me" and I will open the lessons.';
  const FIRST_MOVE_RE = /\b(first move|opening move|first stone|where to start|where do i start|how (do|should) i (start|open|begin)|why (the )?corners?|start(ing)? in (a |the )?corner)\b/;
  const SQUARES = 'The squares on the board are an estimate of who will own each empty point. Switch them on with the Territory tab under the board.\n1. I play many quick random games from the current position to the end and score each one. The Accuracy slider in Settings sets how long I may spend on this (1 to 60 seconds), so a longer time means more games and a steadier map.\n2. For every empty point I note how often it ended up Black\'s or White\'s. A dark square means Black usually got it, a light square means White did, and a bigger, stronger square means the result was more consistent. Hover over a point to see its score, from 0 (an even split) to 1 (the same side owned it in every game); the colour shows which side. Squares appear once a score reaches 0.15.\n3. In a real score, an empty region counts for a side only if it touches only that side\'s stones.\n4. Early in the game the squares are mostly noise, and more so on 13×13 and 19×19. Trust them more in the middle of a game, and most of all on 9×9.';
  const TOPIC_MORE = {
    territory: SQUARES,
    liberty: 'Liberties are the lifeblood of a group. Count them by looking at the empty points next to every stone of the group: a group on the edge has fewer, so it is easier to capture. Fighting in Go is mostly a race to take away the opponent\'s liberties while keeping your own.',
    atari: 'Atari is a warning, not yet a capture. The player in atari can extend (add a stone that brings new liberties), capture a neighbouring stone, or give the group up. Think before you put an enemy group in atari: if it can simply escape, you may only have made it stronger.',
    ko: 'A ko fight is a contest over who can force the other to answer elsewhere. A move that threatens something bigger elsewhere is a ko threat: if the opponent answers it, you may retake the ko. The player with more useful threats usually wins the ko.',
    eye: 'One eye is not enough. The opponent fills the outside liberties until your group is in atari, then plays into the eye, which is legal because it captures. With two separate eyes the opponent can never play in either, so the group lives. Making two eyes is the central idea of life and death.',
    komi: 'Black moves first, which is worth roughly 6 to 7 points on a normal board, so White receives komi as compensation. The half point (6.5 or 7.5) means a draw is impossible.',
    firstmove: FIRST_MOVE_DETAIL
  };
  const FALLBACK = 'I am a rule-based coach, not a general AI, so I may have missed how you phrased that. Try one of the buttons below, or ask about a Go term, the rules or the position.';

  const TERMS = [
    { w: ['liberty', 'liberties'], t: 'A liberty is an empty point directly beside a stone: up, down, left or right. A stone or group with no liberties is captured. Say "show liberties" and I will mark them on the board.' },
    { w: ['atari'], t: 'Atari means a stone or group has one liberty left and will be captured next move unless it escapes or you capture something nearby. Say "show liberties" and the last liberty turns red.' },
    { w: ['capture', 'captured', 'prisoner', 'prisoners'], t: 'You capture stones by filling their last liberty. They are removed and counted as prisoners. Prisoners do not count in area scoring, but removing stones changes who controls the points.' },
    { w: ['group', 'chain'], t: 'Stones of one colour that touch along a line form a group. They share liberties and live or die together.' },
    { w: ['eye', 'eyes'], t: 'An eye is an empty point surrounded by your own stones. A group with two separate eyes can never be captured, because the opponent cannot play in either eye: each would be suicide.' },
    { w: ['alive', 'dead', 'life and death'], t: 'A group is alive if it cannot be captured, usually because it has two eyes. A dead group will be captured eventually, even if it is still on the board at the end. At scoring you tap dead groups to remove them.' },
    { w: ['ko'], t: 'Ko is a shape where two players could capture one stone back and forth for ever. You may not recreate the previous position, so play elsewhere first, ideally a move the opponent must answer (a "ko threat"), then retake.' },
    { w: ['suicide'], t: 'A move that leaves your own stone or group with no liberties is illegal, unless it captures. The captured stones give it new liberties.' },
    { w: ['territory'], t: 'Territory is empty space that only one player surrounds. In area scoring, your score is your stones plus your territory, and White adds komi. An empty region counts for a side only if it touches only that side\'s stones. The dark and light squares on the board are an estimate, not a count: ask me "what are the squares?" to see how they are made.' },
    { w: ['scoring', 'area scoring', 'area'], t: 'We use area scoring: stones plus surrounded empty points, with White adding komi. When both players pass, dead stones are removed and the totals are compared.' },
    { w: ['komi'], t: 'Komi is compensation for White moving second. Here it is 6.5 on 9×9 and 13×13, 7.5 on 19×19, and 0.5 with handicap stones. The half point means no draws.' },
    { w: ['handicap'], t: 'Handicap stones let a weaker player take Black with extra stones already placed. White then moves first and komi drops to 0.5.' },
    { w: ['pass', 'passing'], t: 'Passing means skipping your turn. When both players pass in a row the game ends and is scored. Pass when nothing useful is left.' },
    { w: ['ladder'], t: 'A ladder is a running chase: a group in atari extends, is put in atari again, and so on in a zig-zag. It works for the attacker unless the runner meets a friendly stone (a ladder breaker).' },
    { w: ['snapback'], t: 'A snapback is a sacrifice: you let the opponent capture one stone, then recapture a larger group because their capturing stone is itself in atari.' },
    { w: ['seki'], t: 'Seki is a standoff where neither side can capture the other without being captured first. Both groups stay on the board and the shared space scores for nobody.' },
    { w: ['sente', 'gote'], t: 'A move in sente forces a reply, so you keep the initiative. A move in gote does not: the opponent can ignore it and play the biggest move elsewhere.' },
    { w: ['tenuki'], t: 'Tenuki means ignoring the opponent\'s last move and playing elsewhere.' },
    { w: ['hoshi', 'star point', 'star points'], t: 'Star points are the dots on the board. They mark good opening points and where handicap stones go.' },
    { w: ['third line', 'fourth line', '3rd line', '4th line', 'first line'], t: 'The first line is the edge. The third and fourth lines balance territory and influence, which is why most openings use them.' },
    { w: ['opening', 'fuseki', 'strategy'], t: 'In the opening, take the corners first, then the sides, then the centre: corners make territory with the fewest stones. Keep stones connected and check for atari every move.' },
    { w: ['connect', 'connection', 'cut'], t: 'Connecting joins your stones into one group that shares liberties; cutting separates the opponent\'s stones so each part is weaker. Most fights are about one or the other.' }
  ];

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
    if (!raw) return out('Type a question, or tap one of the suggestions below.');
    const t = raw.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const has = re => re.test(t);
    const pt = parseCoord(raw, n);
    const question = /^(can|could|should|shall|is|would|will|what|how|does|do|why)\b/.test(t) || /\?\s*$/.test(raw);
    const isWhat = has(/\b(what('s| is| are| does)?|explain|define|meaning|mean|tell me about|describe)\b/);

    if (has(/^(hi|hello|hey|hiya|g'?day|good (morning|afternoon|evening))\b/)) return out('Hello! Ask for a hint, an analysis, a review of your moves, or what a Go term means.');
    if (has(/\b(thanks|thank you|cheers)\b/)) return out('You are welcome. Ask me anything else about the position or the rules.');
    if (has(/\b(history|origins?|who (invented|created) (go|the game)|where (did|does) (go|the game) come from|how old is (go|the game))\b/)) return out('Opening the history of Go in the board window.', { action: 'history' });
    if (has(/\b(kifu|famous games?|game records?|master games?|pro games?|professional games?|study (a |some )?(famous |pro )?games?|replay (a |some )?games?)\b/)) return out('Opening the famous games in the board window.', { action: 'kifu' });
    if (FIRST_MOVE_RE.test(t)) return has(/\b(detail|explain|elaborate|more|why|reasoning|reason)\b/) ? out(FIRST_MOVE_DETAIL, { topic: 'firstmove' }) : out(FIRST_MOVE_SHORT, { topic: 'firstmove' });
    if (has(/\b(squares?|ownership)\b/)) return out(SQUARES, { topic: 'territory' });
    if (has(/\b(more detail|in detail|tell me more|elaborate|expand|go on|in more depth|explain (that|it|more))\b/)) {
      if (ctx.topic && TOPIC_MORE[ctx.topic]) return out(TOPIC_MORE[ctx.topic], { topic: ctx.topic });
      return out('More detail about what? Ask about a Go term (for example "what is ko?"), the first move, or a point on the board.');
    }
    if (has(/\b(undo|take back|takeback|go back)\b/)) return out('Taking that back.', { action: 'undo' });
    if (has(/\b(hint|hints|suggest|suggestion|best move|good move|where (should|can|do|would) i (play|put|go|move)|what (should|shall|can) i (do|play)|next move|recommend)\b/)) return out('Let me look for a good move…', { action: 'hint' });
    if (has(/\b(explain|describe|summari[sz]e|talk me through|walk me through)\b.*\b(position|board)\b|\bwhat('s| is) (happening|going on)\b|\bhow is (the|this) game\b/)) return out('', { action: 'summary' });
    if (has(/\b(what should i (be )?(think|look|consider|check)\w*|what do i (look|check)|checklist|how do i (choose|decide|pick)( a move)?|what to think about)\b/)) return out('', { action: 'think' });
    if (has(/\b(analy[sz]e|analysis|evaluate|evaluation|alternatives?|other (moves|options|plays)|what else|who('s| is| are)? (winning|ahead|leading)|am i (winning|ahead|losing|behind|doing)|how (am i|are we|is the game) (doing|going)|current score|score now|show (me )?(the )?(territory|influence|ownership))\b/)) return out('Analysing the position: the lettered points on the board are the best alternatives.', { action: 'analyse' });
    if (has(/\b(review|mistakes?|blunders?|how did i (do|play)|was (that|my (last |previous )?move) (good|bad|ok|okay|a mistake)|rate my|check my (move|moves|game)|my last move)\b/)) return out('Reviewing the game. This takes a few seconds, and the result will appear here.', { action: 'review' });
    if (has(/\bwhy\b.*\b(play|played|move|moved|there|that|you)\b/) || has(/\bexplain\b.*\b(your|that|the)\b.*\bmove\b/)) return out('', { action: 'why' });
    if (isWhat) { const term = findTerm(t); if (term) return out(term.t, { topic: term.w[0] }); }
    if (has(/\b(danger|in trouble|weak|at risk|threatened|am i safe|in atari|any ataris?|short of liberties)\b/)) return out('', { action: 'weak' });
    if (has(/^(pass|i pass|skip|skip (my )?(turn|move))$/) || has(/\b(i want to pass|let me pass|i('ll| will) pass)\b/)) return out('Passing.', { action: 'pass' });
    if (has(/\b(resign|give up|i quit)\b/)) return out('Are you sure? Confirm in the box that appears.', { action: 'resign' });
    if (has(/\b(new game|start (a |another )?(new )?(game|match)|restart|play again|another game|rematch)\b/) || (has(/\b(game|match)\b/) && has(/\b(9|13|19)(?=x|\s|$)/) && has(/\b(start|new|play)\b/))) {
      const arg = {};
      const sz = t.match(/\b(9|13|19)(?=x|\s|$)/); if (sz) arg.size = +sz[1];
      const lv = t.match(/\b(easy|medium|hard)\b/); if (lv) arg.level = lv[1];
      const side = t.match(/\bas (black|white)\b/); if (side) arg.colour = side[1];
      return out('Setting up a new game. Check the options and press Start.', { action: 'new', arg });
    }
    if (has(/\b(back to (the )?game|exit (the )?lesson|leave (the )?lesson|stop (the )?lesson|end (the )?lesson|return to (the )?game|resume (the )?game)\b/)) return out('', { action: 'exit' });
    if (has(/^((can|could|would) you |please )*(teach me|teach me (the )?(basics|rules|game|go|how to play( go)?)( of go)?|teach me something( about go)?|teaching mode|start (the )?(teaching|tutorial|lessons?)( mode)?|learn go|learn (the )?(basics|game|rules)( of go)?|(the )?basics( of go)?|(i am|i'?m) (a )?beginner|new to go|(i want|i would like|i'?d like) to learn( go| how to play( go)?)?)( please)?$/)) return out('', { action: 'teach' });
    if (has(/\b(teach|lessons?|tutorial|beginner|learn( go)?|how (do|to) (i )?play|how does go work|rules( of go)?|basics)\b/)) {
      let id = null;
      const num = t.match(/lesson\s*(\d+)/);
      if (num && LESSON_IDS[+num[1] - 1]) id = LESSON_IDS[+num[1] - 1];
      else for (const [lid, words] of LESSON_WORDS) if (words.some(w => t.includes(w))) { id = lid; break; }
      if (!id && has(/\b(rules|how (do|to) (i )?play|how does go work|basics)\b/)) return out(RULES, { action: null });
      return id ? out('Opening that lesson.', { action: 'lesson', arg: { id } }) : out('Here are the lessons. Tap one to start.', { action: 'menu' });
    }
    const on = has(/\b(show|display|turn on|enable|switch on|use)\b/), off = has(/\b(hide|turn off|disable|switch off|remove|stop)\b/);
    if (on || off) {
      const val = on && !off;
      if (has(/\b(liberties|liberty|libs)\b/)) return out(val ? 'Showing liberties: green dots, red when a group is in atari.' : 'Hiding liberties.', { action: 'set', arg: { libs: val } });
      if (has(/\b(coordinates|coords|labels)\b/)) return out(val ? 'Showing coordinates.' : 'Hiding coordinates.', { action: 'set', arg: { coords: val } });
      if (has(/\b(tips|coach tips|warnings)\b/)) return out(val ? 'Coach tips are on.' : 'Coach tips are off.', { action: 'set', arg: { coach: val } });
      if (has(/\b(sound|click)\b/)) return out(val ? 'Sound on.' : 'Sound off.', { action: 'set', arg: { sound: val } });
    }
    if (pt >= 0 && has(/\b(explore|walk me through|what happens (if|after|when)|show me what happens|follow (it|that|this) through|where does (it|that|this) lead)\b/)) return out(`Let us explore ${coordName(n, pt)} on the board.`, { action: 'explore', arg: pt });
    if (pt >= 0) {
      if (has(/\b(play|put|place|move)\b/) && !question) return out(`Playing ${coordName(n, pt)}.`, { action: 'play', arg: pt });
      return out('', { action: 'point', arg: pt });
    }
    if (has(/^(help|\?)$|\bwhat can (you|i)\b|\bcommands\b|\bhow do i use (you|this|the coach)\b/)) return out(HELP);
    const term = findTerm(t);
    if (term) return out(term.t, { topic: term.w[0] });
    return out(FALLBACK);
  }

  /* What would a move at idx do? Uses the engine E and the game state s. */
  function describePoint(E, s, idx, color) {
    const g = E.geom(s.n), name = coordName(s.n, idx), mineName = color === 1 ? 'black' : 'white';
    if (s.board[idx]) return `${name} is already occupied by a ${s.board[idx] === 1 ? 'black' : 'white'} stone.`;
    const r = E.tryPlay(g, s.board, idx, color, s.ko);
    if (!r.ok) {
      if (r.reason === 'ko') return `${name} is illegal right now: it would retake a ko immediately. Play elsewhere first.`;
      if (r.reason === 'suicide') {
        const b = s.board.slice(); b[idx] = color;
        const seen = new Set(), notes = [];
        for (const j of g.nb[idx]) {
          if (!b[j] || b[j] === color || seen.has(j)) continue;
          const a = E.flood(g, b, j);
          a.stones.forEach(x => seen.add(x));
          notes.push(`the ${a.color === 1 ? 'black' : 'white'} ${a.stones.length > 1 ? 'group' : 'stone'} next to it still has ${a.libs.length} ${a.libs.length === 1 ? 'liberty' : 'liberties'} left (${a.libs.map(l => coordName(s.n, l)).join(', ')})`);
        }
        const because = notes.length > 2 ? 'each neighbouring stone or group still has a liberty elsewhere' : notes.join(' and ');
        return `${name} is illegal for ${mineName}: the stone would have no liberties, because every point beside it is already occupied. It captures nothing${because ? ', because ' + because : ''}. A move with no liberties that captures nothing is suicide, so the game refuses it.`;
      }
      return `${name} is not a legal move.`;
    }
    const parts = [];
    if (r.captured.length) parts.push(`it captures ${r.captured.length} stone${r.captured.length > 1 ? 's' : ''}`);
    const mine = E.flood(g, r.board, idx);
    if (mine.libs.length === 1 && !r.captured.length) parts.push('it leaves your stone with one liberty (self-atari), so it can be captured at once');
    else parts.push(`the group there would have ${mine.libs.length} liberties`);
    const seen = new Set();
    for (const j of g.nb[idx]) {
      if (!r.board[j] || r.board[j] === color || seen.has(j)) continue;
      const a = E.flood(g, r.board, j);
      a.stones.forEach(x => seen.add(x));
      if (a.libs.length === 1) parts.push(`it puts the ${a.stones.length}-stone enemy group at ${coordName(s.n, a.stones[0])} in atari`);
    }
    for (const j of g.nb[idx]) {
      if (s.board[j] !== color || seen.has(j)) continue;
      const a = E.flood(g, s.board, j);
      a.stones.forEach(x => seen.add(x));
      if (a.libs.length === 1 && mine.libs.length >= 2) parts.push(`it rescues your group at ${coordName(s.n, a.stones[0])} from atari`);
    }
    const edge = Math.min(idx % s.n, (idx / s.n) | 0, s.n - 1 - (idx % s.n), s.n - 1 - ((idx / s.n) | 0));
    if (edge === 0) parts.push('it is on the first line, which is usually too low early on');
    else if (edge === 2 || edge === 3) parts.push('it is on the ' + (edge + 1) + (edge === 2 ? 'rd' : 'th') + ' line, a good balance of territory and safety');
    return `${name} is legal. ${parts[0][0].toUpperCase() + parts[0].slice(1)}${parts.length > 1 ? '; ' + parts.slice(1).join('; ') : ''}.`;
  }

  /* Which groups are short of liberties? */
  function weakReport(E, s, human) {
    const weak = E.allGroups(s.n, s.board).filter(g => g.libs.length <= 2).sort((a, b) => a.libs.length - b.libs.length || b.stones.length - a.stones.length).slice(0, 4);
    if (!weak.length) return 'No group is short of liberties right now, so nothing is in immediate danger.';
    const lines = weak.map(g => {
      const who = g.color === human ? 'Your' : 'The computer\'s';
      const size = g.stones.length > 1 ? `${g.stones.length}-stone group` : 'stone';
      return g.libs.length === 1 ? `• ${who} ${size} at ${coordName(s.n, g.stones[0])} is in atari: its last liberty is ${coordName(s.n, g.libs[0])}.` : `• ${who} ${size} at ${coordName(s.n, g.stones[0])} has 2 liberties.`;
    });
    const mineAtari = weak.some(g => g.color === human && g.libs.length === 1), theirsAtari = weak.some(g => g.color !== human && g.libs.length === 1);
    if (mineAtari) lines.push('Save your group by extending it, or by capturing a neighbouring enemy stone.');
    else if (theirsAtari) lines.push('You can capture the group in atari by playing its last liberty.');
    return lines.join('\n');
  }

  /* Longer explanations for each lesson, used when the learner asks for more detail. */
  const LESSON_MORE = {
    board: 'Each stone sits on a crossing of two lines, so a 9×9 board has 81 points. Black always moves first. Stones stay where they are put unless they are captured, and a player may pass instead of playing.',
    liberties: 'Count liberties by looking up, down, left and right of a stone. A stone in the middle has 4, on an edge 3, in a corner 2. Connected stones share their liberties, and the number matters because a group with none is captured.',
    capture: 'To capture, fill the last empty point beside the enemy stone. The white stone already has black stones on three sides, so the one green dot is the capture point.',
    groups: 'Two stones that touch along a line are one group. The white pair shares its liberties, and only one is left, at the bottom. Fill it and the whole group comes off the board at once.',
    atari: 'The black stone has white stones on three sides and one liberty left. If you do nothing, White plays there and captures it. Extending to that point joins your new stone to the old one and gives the group more liberties, so it is no longer in atari.',
    suicide: 'At A all four neighbours are white stones, so a black stone there would have no liberties. It would also capture nothing, because each white stone still has liberties of its own. A move like that is suicide and is not allowed.',
    exception: 'This time the white stone at the top has black stones on three sides, so A is its last liberty. Playing at A fills that liberty and captures the stone first. Once it is removed, your new stone has a liberty, so the move is legal.',
    ko: 'In the starting position Black can capture the white stone by playing A. That leaves one black stone with a single liberty, and White could capture it straight back at B, then Black could capture again, for ever. The ko rule stops that: White must play somewhere else first.',
    eyes: 'A and B are two separate empty points, each completely surrounded by black stones. If White plays at A, the stone has no liberties, and Black still has the other eye at B, so Black is not captured and the white move is suicide. The same is true at B. White could only fill an eye if the other one were already gone, which is why two eyes make a group safe.',
    scoring: 'Each side scores its stones plus the empty points that only it surrounds. Black has 9 stones and the 27 empty points on its left; White has 9 stones and the 36 points on its right, so White is ahead by 9 before komi.',
    strategy: 'Corners are efficient because two edges help your stones, sides come next, and the centre is hardest to hold. Early on, play on the third and fourth lines.',
    connect: 'Stones are connected only if they touch along a line, up, down, left or right. Two stones that meet at a corner (diagonally) can be cut: White plays at A or B and splits them into two weaker groups. Playing at A or B joins your stones into one group that shares its liberties.',
    cut: 'The two black stones touch only at a corner, so the points A and B are both cutting points. A white stone on either one stands between them. Black can still connect with the other point, but the cut forces Black to spend a move on it, and that is how cuts win tempo and make groups weak.',
    ending: 'A player may pass instead of playing. Two passes in a row end the game. Before counting, dead stones (stones that could not survive) are removed, then each side adds its stones to the empty points only it surrounds. White also adds komi.',
    handicap: 'Handicap stones go on the star points, so a weaker player can take Black with an advantage. White then moves first and komi is reduced to half a point. On a 9×9 board two stones go on opposite corners, three add a third corner, and so on up to five.',
    firstmove: FIRST_MOVE_DETAIL
  };

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
    if (has(/\b(explain|more detail|in detail|don'?t understand|do not understand|confus|not sure|elaborate|clarify|don'?t get|what does this mean|what is going on)\b/)) return out(LESSON_MORE[info.id] || 'Ask me about a particular point, or press Hint.');
    if ((info.id === 'strategy' || info.id === 'firstmove') && FIRST_MOVE_RE.test(t) && has(/\b(detail|explain|elaborate|more|why|reasoning|reason)\b/)) return out(FIRST_MOVE_DETAIL);
    if (info.id === 'strategy' && has(/\b(where|first move|start|begin|open)\b/)) return out('Try one of the starred points: C3, G3, C7 or G7. They are on the third line near a corner, which balances territory and safety.');
    if (has(/\b(hint|stuck|what should i do|what do i do)\b/)) {
      if (info.hasHint === false) return out((LESSON_MORE[info.id] || '') + '\nThere is no move to play in this lesson, so there is no blue ring. Read the text, then press Next.');
      return out('Look for the blue ring on the board.', { action: 'hint' });
    }
    if (has(/\b(reset|start over|try again|start again|retry)\b/)) return out('Resetting the lesson.', { action: 'reset' });
    if (has(/\b(next lesson|next one|move on|go on|continue)\b/) || has(/^next$/)) return out('Going to the next lesson.', { action: 'next' });
    if (has(/\b(task|goal|objective|what am i (supposed|meant) to do)\b/) && info.task) return out('Your task: ' + info.task);
    if (asked.length) {
      const known = asked.filter(L => info.marks[L] !== undefined);
      if (known.length) return out(known.map(point).join('\n'));
      return out(`There is no point ${asked[0]} on the board right now.${labels.length ? ' The marked points are ' + labels.join(' and ') + '.' : ''}`);
    }
    if (labels.length && has(/\b(illegal|not allowed|can'?t|cannot|why|refuse|forbidden|what happens|what if)\b/)) return out(labels.map(point).join('\n'));
    return null;
  }

  return { reply, lessonReply, describePoint, weakReport, parseCoord, INTRO, HELP, RULES };
});
