/* Go Coach — lessons. Every lesson is played on the full 9×9 board. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.GoLessons = factory(root.GoEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const N = 9;
  const P = (n, x, y) => y * n + x;
  const H = {
    libsAt(s, x, y) { return E.flood(E.geom(s.n), s.board, P(s.n, x, y)).libs.length; },
    libsOf(s, i) { return E.flood(E.geom(s.n), s.board, i).libs.length; },
    at(s, x, y) { return s.board[P(s.n, x, y)]; }
  };
  /* A lesson picture is drawn on a small patch of the board (about 5 points across). at(ox, oy) moves the patch to where it sits on the 9×9 board:
     xy and pts move points, i gives a board index, key moves the "x,y" keys of marks. */
  const at = (ox, oy) => ({
    xy: (x, y) => [x + ox, y + oy],
    pts: a => a.map(([x, y]) => [x + ox, y + oy]),
    i: (x, y) => P(N, x + ox, y + oy),
    key: m => { const o = {}; for (const k of Object.keys(m)) { const [x, y] = k.split(',').map(Number); o[(x + ox) + ',' + (y + oy)] = m[k]; } return o; }
  });
  const M = at(2, 2), K = at(0, 0); /* M: the middle of the board. K: the top-left corner, for the lesson that needs a corner. */
  const win = msg => ({ status: 'win', msg });
  const fail = msg => ({ status: 'fail', msg });
  const say = msg => ({ status: null, msg });
  const wall = (x, y0, y1) => { const a = []; for (let y = y0; y <= y1; y++) a.push([x, y]); return a; };

  const REASONS = {
    occupied: 'That point is already taken. Stones can only go on empty points.',
    ko: 'Ko: you may not retake straight away. Play somewhere else first, then you may retake.',
    suicide: 'Illegal: that stone would have no liberties and would capture nothing. This is called suicide.'
  };

  const list = [
    {
      id: 'board', title: 'Stones and the board', n: N, turn: 1,
      text: [
        'Welcome to Go. You play with black and white stones on a grid of lines. This board has 9 lines across and 9 lines down.',
        'Stones are not placed inside the squares. They go on the points where two lines cross. These crossing points are called intersections, or simply points. A 9×9 board has 81 points.',
        'Black always plays first. After that, the players take turns, one stone each. Once a stone is on the board it never moves. The only way it leaves the board is by being captured, which you will learn soon.'
      ],
      task: 'Tap any four empty points to place four stones. The colours take turns by themselves: black, white, black, white.',
      hint: [[4, 4]],
      solution: [[4, 4], [2, 2], [6, 6], [2, 6]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.moves.length >= 4 ? win('Well done. You placed four stones and the colours took turns. That is how every game of Go starts. Next you will learn what keeps a stone safe: its liberties.') : say(`${s.moves.length} of 4 stones placed. Tap another empty point.`);
      }
    },
    {
      id: 'liberties', title: 'Liberties', n: N, turn: 1, solo: true, libs: true,
      text: [
        'Every stone needs room to breathe. The empty points directly next to a stone are called its liberties. A liberty is the point straight above, straight below, to the left or to the right of the stone. Points touching only at a corner (diagonals) do not count.',
        'The small green dots on the board show each stone’s liberties. Count the dots to count the liberties.',
        'A stone in the middle of the board has 4 liberties. A stone on an edge has 3, because one side is the edge of the board. A stone in a corner has only 2.',
        'Liberties matter because a stone with no liberties left is captured. You will see that in the next lesson.'
      ],
      task: 'Place a Black stone that has exactly two liberties. Hint: where does the board run out on two sides at once?',
      hint: [[0, 0]],
      solution: [[2, 2], [0, 0]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const l = H.libsOf(s, ev.point);
        if (l === 2) return win('Yes. Count the green dots: this stone has exactly two liberties, because it sits in a corner. A corner stone has 2, an edge stone has 3 and a stone in the middle has 4.');
        return say(`That stone has ${l} liberties (count its green dots).${l >= 4 ? ' A stone in the middle of the board has four. Try a corner, where the board ends on two sides.' : ' A stone on an edge has three. Try a corner.'}`);
      }
    },
    {
      id: 'capture', title: 'Capturing a stone', n: N, turn: 1, solo: true, libs: true,
      black: M.pts([[1, 2], [2, 1], [3, 2]]), white: M.pts([[2, 2]]),
      text: [
        'You capture an enemy stone by taking away its last liberty. When a stone has no liberties left, it is captured: it is removed from the board, and you keep it as a prisoner.',
        'Look at the white stone in the middle of the board. Black stones are on three of its sides, so it has only one liberty left. The green dot shows where.',
        'If you place a black stone on that last liberty, the white stone has nowhere left to breathe, and you capture it.'
      ],
      task: 'Capture the white stone by placing a Black stone on its last liberty (the green dot).',
      hint: M.pts([[2, 3]]),
      solution: M.pts([[2, 3]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.caps[1] >= 1 ? win('Captured. The white stone was removed and you now hold one prisoner. Capturing stones is how you win fights.') : say('Not yet. Place your stone on the green dot: that is the white stone’s last liberty.');
      }
    },
    {
      id: 'groups', title: 'Groups', n: N, turn: 1, solo: true, libs: true,
      black: M.pts([[2, 1], [1, 2], [3, 2], [1, 3], [3, 3]]), white: M.pts([[2, 2], [2, 3]]),
      text: [
        'Stones of the same colour that touch each other along a line (up, down, left or right) are connected. Connected stones form a group.',
        'A group acts as one unit. Its stones share all their liberties, and if the group loses its last liberty, every stone in it is captured at the same moment.',
        'The two white stones here touch, so they are one group. Black surrounds them on every side except one, so the group has a single liberty. Find the green dot.'
      ],
      task: 'Capture both white stones with one move.',
      hint: M.pts([[2, 4]]),
      solution: M.pts([[2, 4]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.caps[1] >= 2 ? win('Both stones were captured at once, because they were one group. You now hold two prisoners.') : say('The white group has one liberty left. Place your stone on the green dot.');
      }
    },
    {
      id: 'atari', title: 'Atari and escape', n: N, turn: 1, solo: true, libs: true,
      black: M.pts([[2, 2]]), white: M.pts([[2, 1], [1, 2], [3, 2]]),
      text: [
        'When a stone or group has only one liberty left, it is in atari. This is the Go word for “you are about to be captured”. If it is the opponent’s turn, they can capture it with their next move.',
        'Here the black stone is in atari. White has stones on three sides. The red dot shows its last liberty (a green dot is a normal liberty, a red dot means only one is left).',
        'You can save a stone in atari by extending: place another stone of your colour on the last liberty. The two stones join into one group, and the group gets new liberties of its own.'
      ],
      task: 'Save the black stone by extending it onto its last liberty (the red dot).',
      hint: M.pts([[2, 3]]),
      solution: M.pts([[2, 3]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const [x, y] = M.xy(2, 2);
        if (H.at(s, x, y) === 1 && H.libsAt(s, x, y) >= 2) return win('Saved. The two black stones are now one group with several liberties, so White cannot capture it next move.');
        return fail('That did not help: White captures the stone next move. Press Reset and try the red dot.');
      }
    },
    {
      id: 'suicide', title: 'No suicide', n: N, turn: 1,
      white: M.pts([[2, 1], [1, 2], [3, 2], [2, 3]]),
      marks: M.key({ '2,2': 'A' }),
      text: [
        'There is one more rule about liberties. You may not place a stone where it would have no liberties at all. This is called suicide, and the game does not allow it.',
        'Here, the empty point marked A is surrounded by four white stones. A black stone at A would have no liberties. It would capture nothing either, because each white stone still has a liberty of its own somewhere else.'
      ],
      task: 'Try to play Black at A, and see what the game says.',
      hint: M.pts([[2, 2]]),
      solution: M.pts([[2, 2]]),
      check(s, ev) {
        if (ev.type === 'illegal' && ev.point === M.i(2, 2) && ev.reason === 'suicide') {
          return win('Correct: the game refuses it. A stone that would have no liberties, and captures nothing, is suicide, and suicide is not allowed.');
        }
        if (ev.type === 'move') return say('That move is legal, but try the middle point A.');
        return null;
      }
    },
    {
      id: 'exception', title: 'Capture beats suicide', n: N, turn: 1, solo: true,
      black: M.pts([[2, 0], [1, 1], [3, 1]]), white: M.pts([[2, 1], [1, 2], [3, 2], [2, 3]]),
      marks: M.key({ '2,2': 'A' }),
      text: [
        'There is an exception to the suicide rule: a move that captures is always allowed.',
        'This is the same shape as the last lesson, but now the white stone at the top has black stones on three sides, so point A is its last liberty.',
        'If Black plays at A, the white stone loses its last liberty and is captured first. Once it is removed, your new stone has a liberty again, so the move is legal.'
      ],
      task: 'Play Black at A and capture the white stone.',
      hint: M.pts([[2, 2]]),
      solution: M.pts([[2, 2]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        return s.caps[1] >= 1 ? win('Legal, because it captures. The captured stone is removed first, so your stone is left with a liberty. Capture comes before suicide.') : say('Play at A.');
      }
    },
    {
      id: 'ko', title: 'Ko', n: N, turn: 1,
      black: M.pts([[2, 1], [2, 3], [1, 2]]), white: M.pts([[2, 2], [3, 1], [3, 3], [4, 2]]),
      marks(s) { return s.moves.length === 0 ? M.key({ '3,2': 'A' }) : M.key({ '2,2': 'B' }); },
      hint(s) { return M.pts(s.moves.length === 0 ? [[3, 2]] : [[2, 2]]); },
      text: [
        'Sometimes two players could capture the same stone back and forth for ever. The ko rule stops this: you may not make a move that brings the board back to exactly how it was after your opponent’s last move. (“Ko” is Japanese for “eternity”.)',
        'Here Black can capture the white stone by playing at A. But then White could capture Black’s new stone straight back by playing at B, and Black could take it again, and so on for ever.',
        'So after a ko capture, the other player must play somewhere else first. Only after a move elsewhere may they retake.'
      ],
      task: 'First play Black at A to capture. Then it is White’s turn: try to retake at B and see what happens.',
      solution: M.pts([[3, 2], [2, 2]]),
      check(s, ev) {
        if (ev.type === 'illegal' && ev.reason === 'ko') return win('That is ko. White is not allowed to retake at once and must play somewhere else first, ideally a move that Black has to answer.');
        if (ev.type === 'move' && s.moves.length === 1 && ev.point === M.i(3, 2)) return say('Captured. Now it is White’s turn: try to retake at B straight away.');
        if (ev.type === 'move') return say('Try the marked point.');
        return null;
      }
    },
    {
      id: 'eyes', title: 'Two eyes', n: N, turn: 2, solo: true, libs: true,
      black: K.pts([[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 0]]),
      white: K.pts([[4, 0], [4, 1], [4, 2], [3, 2], [2, 2], [1, 2], [0, 2]]),
      marks: K.key({ '0,0': 'A', '2,0': 'B' }),
      text: [
        'An eye is an empty point that is completely surrounded by your own stones. Eyes are what make a group safe.',
        'Here is why. To capture a group, the opponent has to fill all of its liberties. But a stone placed in an eye has no liberties of its own, so it is suicide, unless it captures. A group with two separate eyes can therefore never be captured: the opponent cannot fill either eye while the other one is still there.',
        'This black group in the corner has two eyes, the empty points A and B. We say a group with two eyes is alive. A group that cannot make two eyes is in danger, and a group that will be captured is called dead.'
      ],
      task: 'You play White. Try to place a stone at A, and then at B.',
      hint: K.pts([[0, 0], [2, 0]]),
      solution: K.pts([[0, 0], [2, 0]]),
      check(s, ev) {
        if (ev.type === 'illegal' && ev.reason === 'suicide' && (ev.point === K.i(0, 0) || ev.point === K.i(2, 0))) {
          s.data = s.data || { tried: [] };
          if (!s.data.tried.includes(ev.point)) s.data.tried.push(ev.point);
          if (s.data.tried.length >= 2) return win('Neither eye can be filled. This group has two eyes, so it is alive and can never be captured.');
          return say('Refused: that stone would have no liberties. Now try the other eye.');
        }
        if (ev.type === 'move') return say('That is legal, but try the eyes at A and B.');
        return null;
      }
    },
    {
      id: 'connect', title: 'Connecting stones', n: N, turn: 1, solo: true,
      black: M.pts([[1, 1], [2, 2]]), white: M.pts([[3, 1], [1, 3]]),
      marks: M.key({ '2,1': 'A', '1,2': 'B' }),
      text: [
        'Your stones are connected when they touch along a line: up, down, left or right. Stones that touch only at a corner (diagonally) are not connected.',
        'Connection matters because connected stones form one strong group that shares its liberties. Stones that are not connected can be separated by your opponent.',
        'The two black stones here touch only at a corner. White has stones waiting nearby to push in between them, at A or at B.'
      ],
      task: 'Connect the two black stones by playing at A or at B.',
      hint: M.pts([[2, 1]]),
      solution: M.pts([[2, 1]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const g = E.flood(E.geom(s.n), s.board, M.i(1, 1));
        return g.stones.includes(M.i(2, 2)) ? win('Connected. The two stones now touch along a line, so they are one group and share their liberties.') : say('Not connected yet: the stones still meet only at a corner. Play at A or B.');
      }
    },
    {
      id: 'cut', title: 'Cutting', n: N, turn: 2, solo: true,
      black: M.pts([[1, 1], [2, 2]]), white: M.pts([[3, 1], [1, 3]]),
      marks: M.key({ '2,1': 'A', '1,2': 'B' }),
      text: [
        'The opposite of connecting is cutting. When two enemy stones touch only at a corner, you can place a stone on one of the two points between them. That separates them.',
        'It is White’s turn in the same position. The black stones touch only at a corner, so A and B are cutting points.',
        'After a cut, Black has to spend a move to reconnect at the other point, and separated stones are easier to attack than one strong group.'
      ],
      task: 'You play White. Cut the two black stones apart by playing at A or at B.',
      hint: M.pts([[2, 1]]),
      solution: M.pts([[2, 1]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const g = E.flood(E.geom(s.n), s.board, M.i(1, 1));
        return g.stones.includes(M.i(2, 2)) ? say('Those stones are still joined. Play at A or B.') : win('Cut. Black must now spend a move to reconnect at the other point, and a divided group is weaker.');
      }
    },
    {
      id: 'tiger', title: 'The tiger’s mouth', n: N, turn: 1, solo: true,
      black: M.pts([[1, 2], [3, 2]]), white: M.pts([[2, 4]]),
      marks: M.key({ '2,1': 'A', '2,2': 'B' }),
      text: [
        'Formations matter as much as single stones. Here two black stones stand one point apart, and White is approaching from below. White would like to push in at B and split them.',
        'You could fill B yourself: a solid connection. It is safe, but it uses a stone on a point that claims nothing new.',
        'The stronger formation is the tiger’s mouth: play at A. Now three black stones surround B like an open mouth. If White pushes in at B, that stone has only one liberty, and you capture it with your next move. The two stones are as good as connected, and A also reaches out to claim more ground.'
      ],
      task: 'Make a tiger’s mouth by playing at A.',
      hint: M.pts([[2, 1]]),
      solution: M.pts([[2, 1]]),
      check(s, ev) {
        if (ev.type !== 'move') return null;
        if (ev.point === M.i(2, 1) || ev.point === M.i(2, 3)) return win('A tiger’s mouth. A white stone pushed in at B would be captured at once, so your stones are safe, and your formation covers more ground than a solid connection. Turn on Shapes in your own games and I will point these out.');
        if (ev.point === M.i(2, 2)) return say('That connects solidly: safe, but slower, because the stone at B claims nothing new. Press Reset and try A.');
        return say('That leaves B open for White to split your stones. Press Reset and try A.');
      }
    },
    {
      id: 'triangle', title: 'Bad shape: the empty triangle', n: N, type: 'quiz',
      black: M.pts([[1, 1], [2, 1]]),
      marks: M.key({ '1,2': 'A', '3,2': 'B', '1,3': 'C' }),
      text: [
        'Some formations waste stones. The best-known is the empty triangle: three stones in an L, with the fourth corner of the little square left empty.',
        'Three stones in an empty triangle have fewer liberties than three stones spread out, and they claim less ground. You have spent three stones doing the work of two. Strong players avoid it unless nothing better exists.'
      ],
      task: 'Black has two stones side by side. Which of the marked moves would make an empty triangle?',
      options: ['A', 'B', 'C'],
      answer: 0,
      wrong: 'Not quite. Look for the move that makes an L of three stones with the fourth corner of the square empty.',
      explain: 'A makes an empty triangle: three stones in an L, bunched together. B reaches out diagonally and C jumps one point: both claim more ground with the same stone. Turn on Shapes in your own games and empty triangles are marked in red.'
    },
    {
      id: 'scoring', title: 'Counting the score', n: N, type: 'quiz',
      black: wall(3, 0, 8), white: wall(4, 0, 8),
      text: [
        'When the game ends, we count to see who has more. We use area scoring: your score is the number of your stones on the board, plus the number of empty points that only your stones surround. Those empty points are called your territory.',
        'White also receives a bonus called komi (usually 6.5 or 7.5 points). Black moves first, which is an advantage, and komi makes up for it. The half point means there are no ties.',
        'In this picture a black wall encloses the empty points on its left, and a white wall encloses the empty points on its right. Ignore komi for this question.'
      ],
      task: 'Count stones plus territory for each side. Who is ahead, ignoring komi?',
      options: ['Black by 9', 'White by 9', 'White by 18', 'A tie'],
      answer: 1,
      wrong: 'Not quite. Count each side’s stones, then the empty points that only that side surrounds, and add the two numbers.',
      explain: 'Black: 9 stones + 27 empty points = 36. White: 9 stones + 36 empty points = 45. White is ahead by 9 before komi.'
    },
    {
      id: 'ending', title: 'Ending the game', n: N, type: 'quiz',
      black: wall(3, 0, 8), white: wall(5, 0, 8),
      text: [
        'A player may pass instead of placing a stone. Passing means “I have nothing useful left to play.” When both players pass one after the other, the game is over.',
        'Before counting, stones that could not possibly survive (dead stones) are taken off the board. Then each side scores its stones plus the empty points that only it surrounds.'
      ],
      task: 'What happens after two passes in a row?',
      options: ['The game ends and is scored', 'Black must play again', 'The game starts again', 'White wins automatically'],
      answer: 0,
      wrong: 'Not quite. Think about what passing means: there is nothing useful left to play.',
      explain: 'Two passes in a row end the game. Dead stones come off the board, then both sides count their stones plus their territory.'
    },
    {
      id: 'race', title: 'Counting before you fight: the capturing race', n: N, type: 'quiz',
      black: K.pts([[1, 0], [1, 1], [2, 2], [3, 2], [4, 2], [4, 1], [4, 0]]),
      white: K.pts([[2, 0], [2, 1], [0, 2], [1, 2], [1, 3], [0, 3]]),
      marks: K.key({ '0,0': 'B', '0,1': 'B', '3,0': 'W', '3,1': 'W' }),
      text: [
        'Reading means working out a fight before you start it. The simplest case is the capturing race: two groups are trapped next to each other, and neither can escape or make two eyes. Each side fills the other’s liberties, one per move, and the first to fill them all captures.',
        'In the top-left corner, two black stones and two white stones are locked together. Each pair is walled in by the other side’s strong stones. The points marked B are the black pair’s liberties, and the points marked W are the white pair’s: two each.',
        'It is Black’s turn.'
      ],
      task: 'Count the liberties. Who wins the race?',
      options: ['Black, because Black moves first', 'White', 'Neither: both groups live'],
      answer: 0,
      wrong: 'Not quite. Play it out in your head: each move fills one liberty. Who runs out first?',
      explain: 'Black fills one of White’s two liberties, White fills one of Black’s, and Black fills White’s last liberty and captures. With equal liberties, the side that moves first wins the race. So count before you fight: one liberty, or one move, decides it.'
    },
    {
      id: 'handicap', title: 'Handicap and komi', n: N, type: 'info',
      black: [[6, 2], [2, 6]],
      text: [
        'When two players are not equally strong, the weaker player takes Black and receives a head start: extra black stones are placed on the board before the game begins. This is called a handicap. Two handicap stones are shown here, on two opposite star points (the small dots printed on the board).',
        'With a handicap, White plays first. Komi, White’s bonus for moving second, drops to half a point, because Black already has a head start.',
        'You can choose 2 to 5 handicap stones when you start a new game.'
      ],
      task: ''
    },
    {
      id: 'strategy', title: 'First ideas', n: N, type: 'info',
      marks: { '2,2': '★', '6,2': '★', '2,6': '★', '6,6': '★' },
      text: [
        'Here are a few first ideas. Corners come first: a corner stone is protected by two edges of the board, so it takes the fewest stones to claim an area there. Sides come next, and the centre last.',
        'Keep your stones connected, and look for chances to cut your opponent’s stones apart.',
        'Before every move, check for atari: is one of your groups down to a single liberty? Can you put one of your opponent’s groups into atari? And aim for two eyes in any group that is in danger.',
        'The four stars mark good first points on a 9×9 board. Next, you will choose a first move.'
      ],
      task: ''
    },
    {
      id: 'firstmove', title: 'Your first move', n: N, turn: 1,
      text: [
        'On an empty 9×9 board, Black plays first. Where would you start? Ask me to explain the first move in more detail if you would like the reasons.'
      ],
      task: 'Place your first stone on a good point.',
      hint: [[2, 2]],
      solution: [[2, 2]],
      check(s, ev) {
        if (ev.type !== 'move') return null;
        const n = s.n, x = ev.point % n, y = (ev.point / n) | 0;
        const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
        const corner = Math.min(x, n - 1 - x) <= 3 && Math.min(y, n - 1 - y) <= 3;
        if (edge >= 2 && edge <= 3 && corner) return win('A good first move: a corner point on the third or fourth line balances territory and safety. Now you are ready to play a game.');
        if (edge <= 1) return fail('That is on the first or second line: the stone has little room and few liberties. Press Reset and try a point nearer the third line, close to a corner.');
        if (!corner) return fail('That is a point away from the corners. It can work, but corners make territory with the fewest stones. Press Reset and try a corner.');
        return fail('Close, but a point on the third or fourth line works better. Press Reset and try again.');
      }
    }
  ];

  /* The lessons in chapters that follow the skills in "What is Go?" (whatisgo.md), from the simplest to the most complex. */
  const CHAPTERS = [
    { title: 'Basic training', intro: 'Know your troops: how stones stand on the board, breathe and are captured.', ids: ['board', 'liberties', 'capture', 'groups'] },
    { title: 'Tactics', intro: 'The skirmish: threats, forbidden moves, and the two eyes that keep a group alive.', ids: ['atari', 'suicide', 'exception', 'ko', 'eyes'] },
    { title: 'Formations', intro: 'Judging formations (shape): how stones stand together, where they can be cut, and which shapes waste stones.', ids: ['connect', 'cut', 'tiger', 'triangle'] },
    { title: 'Reading the terrain', intro: 'Mapping: who owns which ground, and when the battle is over.', ids: ['scoring', 'ending'] },
    { title: 'Calculating the engagement', intro: 'Reading: count the moves before you fight.', ids: ['race'] },
    { title: 'Commanding the campaign', intro: 'Strategy: where to begin, and how to give or take a head start.', ids: ['strategy', 'firstmove', 'handicap'] }
  ];
  const order = CHAPTERS.flatMap(c => c.ids);
  list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const chapterOf = id => CHAPTERS.find(c => c.ids.includes(id));

  function setup(L) {
    const s = E.newState(L.n, 0);
    for (const [x, y] of L.black || []) s.board[P(L.n, x, y)] = 1;
    for (const [x, y] of L.white || []) s.board[P(L.n, x, y)] = 2;
    s.turn = L.turn || 1;
    s.data = { tried: [] };
    return s;
  }
  function handle(L, s, i) {
    const r = E.play(s, i);
    let ev;
    if (!r.ok) ev = { type: 'illegal', reason: r.reason, point: i };
    else {
      ev = { type: 'move', point: i, captured: r.captured.length };
      if (L.solo) s.turn = L.turn || 1;
    }
    const out = (L.check && L.check(s, ev)) || {};
    if (!out.msg && ev.type === 'illegal') out.msg = REASONS[ev.reason] || 'Illegal move.';
    return { ev, status: out.status || null, msg: out.msg || '' };
  }
  function toIdx(L, pts) { return (pts || []).map(([x, y]) => P(L.n, x, y)); }
  function hintPoints(L, s) { return toIdx(L, typeof L.hint === 'function' ? L.hint(s) : L.hint); }
  function marksFor(L, s) {
    const m = typeof L.marks === 'function' ? L.marks(s) : (L.marks || {});
    const out = {};
    for (const k of Object.keys(m)) { const [x, y] = k.split(',').map(Number); out[P(L.n, x, y)] = m[k]; }
    return out;
  }

  return { list, CHAPTERS, chapterOf, setup, handle, hintPoints, marksFor, P };
});
