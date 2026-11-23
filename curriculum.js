/* World of Go — teaching curriculum: scripted 9×9 positions and the words that go with them.
   Plain data, no DOM. Each step has scenes; a scene can carry a task the learner must solve.
   Design notes (from the British Go Association's teaching advice and others): 9×9 only, one idea at a time,
   rules shown in context, territory as the aim with capturing as a tool, ko late, finish with a first game. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoCurriculum = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STARS = ['C3', 'G3', 'C7', 'G7', 'E5'];
  const NEXT = 'Say "next" when you are ready, or ask me anything.';

  const steps = [
    {
      id: 'space', title: 'A game about space',
      scenes: [
        {
          text: [
            'Welcome to Go. Picture the board as a field and the stones as fence posts.',
            'Two players, Black and White, take turns placing one stone on a crossing of the lines. Stones never move once they are placed. The aim is to fence in more of the field than your opponent. The empty points you fence in are your territory.',
            'Capturing enemy stones can help you, but it is a tool, not the aim. Go is a game about space.'
          ],
          task: {
            type: 'any', goal: 'Place your first stone anywhere you like.', praise: STARS,
            praiseText: 'The dotted points are the classic places to start on a 9×9 board.',
            after: 'Notice what your stone does: it starts to claim the space around it. Tap more points to see what each would do, and say "undo" to take a stone back.',
            hint: 'There is no wrong answer. Tap any crossing.'
          },
          more: 'Why a 9×9 board? Everything works the same on bigger boards, but a small board lets you see the whole fight at once, and a game takes minutes instead of hours. Black always moves first. Because that is an advantage, White receives a few points of compensation at the end, called komi. We meet it when we count.'
        },
        {
          black: ['C3', 'G7'], white: ['G3', 'C7'], influence: true,
          text: [
            'Here is a position after four moves, one stone in each corner. The shading shows who is closer to each empty point: dark squares lean towards Black, light squares towards White. Bigger squares mean a stronger lean.',
            'Every move in Go is a small fight over who will end up owning the empty space. Place a stone where you think it would gain the most room, and watch the shading change.'
          ],
          task: {
            type: 'any', goal: 'Place a stone and watch how the shading changes.',
            after: 'See how the shading moved towards Black around your stone? Say "undo" and try a different point to compare.',
            hint: 'Try the middle of the board, then undo and try the edge.'
          },
          more: 'The shading is a simple picture, not a score: it only measures distance to the nearest stone. It does show the idea behind the game. A stone is most useful where it reaches a lot of empty space that the opponent cannot reach first.'
        }
      ]
    },
    {
      id: 'liberties', title: 'How stones breathe',
      scenes: [
        {
          black: ['E5', 'A3', 'J9'], libs: true,
          text: [
            'A stone breathes through the empty points directly beside it: above, below, left and right. Diagonal points do not count. These points are called liberties, and the green dots show them.',
            'A stone in the middle has 4 liberties, a stone on an edge has 3, and a stone in a corner has only 2. That is why corners and edges are easier to fence in. Tap any stone to count its liberties.',
            NEXT
          ],
          more: 'Liberties are simply room to breathe. A stone or group with no liberties is captured, which we see in a moment. Always count lines touching a stone: in the middle four touch it, on the edge three, in the corner two.'
        },
        {
          black: ['E5'], libs: true,
          text: ['Now make a pair. Place a second black stone directly beside the one in the middle.'],
          task: {
            type: 'move', goal: 'Add a stone directly beside the one in the middle.', solution: ['D5', 'F5', 'E4', 'E6'],
            ok: 'Connected! Stones that touch along a line form one group and share their liberties. This group now has {libs} liberties: count the green dots.',
            wrong: 'That stone only touches the first at a corner, so the two are not connected: each keeps its own liberties. Try a point directly beside it.',
            hint: 'Look at the blue ring.'
          },
          more: 'A group lives or dies together. The more liberties a group has, the safer it is, and connected stones are stronger than separate ones because they share their breathing space.'
        }
      ]
    },
    {
      id: 'capture', title: 'Fencing in a stone',
      scenes: [
        {
          black: ['D5', 'F5', 'E4'], white: ['E5'], libs: true,
          text: [
            'You can win space by taking stones away. A stone is captured when its last liberty is filled, and it comes off the board.',
            'The white stone has just one liberty left: the red dot at E6. A stone in this state is in atari, which means about to be captured.'
          ],
          task: {
            type: 'move', goal: 'Capture the white stone by filling its last liberty.', solution: ['E6'],
            ok: 'Captured {cap}. Look: the point is empty again, and it is now part of your space.',
            wrong: 'Not that one. The white stone can only be captured by filling its last liberty (the red dot).',
            hint: 'The red dot is the last liberty.'
          },
          more: 'Capturing helps in two ways: it removes an enemy stone, and it opens up empty space that you can claim. Beginners often chase captures and forget the space. Games are won by points of territory, so capture when it helps you fence in more.'
        },
        {
          black: ['D5', 'D6', 'F5', 'F6', 'E4'], white: ['E5', 'E6'], libs: true,
          text: [
            'Stones that touch form a group, and a group is captured all at once when its last liberty goes. These two white stones share just one liberty. Can you find it?'
          ],
          task: {
            type: 'move', goal: 'Capture both white stones.', solution: ['E7'],
            ok: 'Both stones came off together: {cap}. A bigger group is harder to capture because it usually has more liberties.',
            wrong: 'Not quite. Find the single empty point that touches the white stones.',
            hint: 'Check the dots: only one point is left.'
          },
          more: 'Edges and corners help the attacker. On the edge a stone has only 3 liberties and in the corner only 2, so fewer stones are needed to capture it.'
        }
      ]
    },
    {
      id: 'escape', title: 'Danger and safety',
      scenes: [
        {
          black: ['E5'], white: ['D5', 'F5', 'E4'], libs: true,
          text: [
            'Now it is your stone that is in trouble. It has one liberty left, at E6, and White threatens to capture it on the next move.',
            'You can save it by extending: add a stone on its last liberty so the group gets more room to breathe.'
          ],
          task: {
            type: 'move', goal: 'Save your stone by extending.', solution: ['E6'],
            ok: 'Saved! Your two stones now form a group with {libs} liberties, so they are no longer in atari. Extending only works when the new stone brings new liberties, so always count.',
            wrong: 'Not enough: your stone still has only one liberty, so White can capture it. Add a stone on its last liberty.',
            hint: 'The ring shows where.'
          },
          more: 'Running away works only when your group gains liberties faster than the opponent can take them away. If every route is closed the group is lost, and sometimes it is wiser to give up a small group and use your move elsewhere.'
        },
        {
          black: ['D5', 'E4'], marks: { D4: 'A', E5: 'B' },
          text: [
            'Stones that touch only at a corner are not connected. The two points between them, A and B, are cutting points: if White takes one, your stones are split into two weaker pieces.',
            'A good habit for beginners: keep your stones connected. Connect these two.'
          ],
          task: {
            type: 'move', goal: 'Connect the two black stones.', solution: ['D4', 'E5'],
            ok: 'Connected. Whoever plays on a cutting point first decides whether two stones are one group or two.',
            wrong: 'Those two stones still touch only at a corner. A white stone on A or B would split them. Play on one of those two points.',
            hint: 'Either A or B works.'
          },
          more: 'Connected stones share liberties and support each other, so they are hard to attack. Cut stones must each look after themselves, and weak stones cost you moves to defend.'
        }
      ]
    },
    {
      id: 'territory', title: 'Counting your space',
      scenes: [
        {
          black: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'], white: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'], terr: 'auto',
          text: [
            'Now the real aim. Black has fenced in the left side and White the right. The shaded squares are territory: empty points enclosed by one colour only.',
            'The column between the two walls touches both colours, so it belongs to nobody. Players fill such points in at the end.',
            NEXT
          ],
          more: 'Territory counts only if the empty region touches stones of one colour. On a real board the fences are rarely this tidy: the fight is about where the fences go.'
        },
        {
          black: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'], white: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'], terr: 'auto',
          text: ['In our scoring, your score is your stones plus your territory. Black has 9 stones on the wall and 27 shaded points.'],
          task: {
            type: 'answer', goal: 'What is Black\'s score?', answer: 36,
            ok: '36, correct. White also has 9 + 27 = 36. Moving first is an advantage, so White receives a bonus called komi (6.5 points here), giving White 42.5. White wins by 6.5. Every point of space matters.',
            wrong: 'Count again: 9 stones on the wall plus 27 shaded points. Say "show me" if you want the answer.',
            hint: 'Add the 9 stones to the 27 shaded points.'
          },
          more: 'Counting stones plus territory is called area scoring. It is simple: just count everything each player controls.'
        },
        {
          black: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'], white: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'], terr: 'auto',
          text: [
            'When neither player can gain anything more, you pass. If both players pass in a row, the game is over and you count.',
            'At the end, stones that could not survive are removed first. In this app I will mark the ones I think are dead, and you can correct me by tapping them.',
            NEXT
          ],
          more: 'Beginners often wonder when to stop. Stop when every boundary is settled: no move would add space to you or take space from your opponent.'
        }
      ]
    },
    {
      id: 'start', title: 'Where to start',
      scenes: [
        {
          black: ['C1', 'C2', 'B3', 'A3'], shade: { black: ['A1', 'B1', 'A2', 'B2'] },
          text: [
            'Where should the first stones go? Compare the cost of fencing in the same amount of land. Here four stones fence in four points in the corner (shaded).',
            'The corner is cheap because two edges of the board do part of the fencing for free.',
            NEXT
          ],
          more: 'A stone in the corner needs far fewer friends to wall off territory than a stone in the middle, because the edges are already doing some of the work.'
        },
        {
          black: ['E1', 'E2', 'F3', 'G3', 'H2', 'H1'], shade: { black: ['F1', 'G1', 'F2', 'G2'] },
          text: ['The same four points on the edge need six stones, because only one edge helps.', NEXT],
          more: 'On a side, only one edge works for you. So sides come after corners.'
        },
        {
          black: ['D5', 'D6', 'E4', 'F4', 'G5', 'G6', 'E7', 'F7'], shade: { black: ['E5', 'F5', 'E6', 'F6'] },
          text: [
            'In the middle, the same four points need eight stones. So at the start of a game, the usual order is corners first, then sides, then the centre.',
            'On a small 9×9 board the centre point is still a strong move, because one central stone can reach everywhere. But corners first is a good habit.',
            NEXT
          ],
          more: 'On bigger boards the centre matters even more later in the game, but at the start it is the most expensive place to build land.'
        },
        {
          text: ['Your turn. Place a first stone where you think it claims space most efficiently.'],
          task: {
            type: 'any', goal: 'Place a stone where you think it claims space most efficiently.', praise: STARS,
            praiseText: 'Exactly the kind of point strong players choose on a 9×9 board.',
            after: 'Tap other points to compare what each would do, and say "undo" to take a stone back.',
            hint: 'Try a point on the third line, near a corner: C3, G3, C7 or G7.'
          },
          more: 'On 9×9 the dotted points are the usual choices. The third line from an edge balances land and safety.'
        }
      ]
    },
    {
      id: 'eyes', title: 'Staying alive: two eyes',
      scenes: [
        {
          black: ['A2', 'B2', 'C2', 'D2', 'B1'], white: ['C3', 'D3', 'E2'], marks: { D1: 'A' },
          text: [
            'Territory is only yours if you can keep it: White may try to move in and capture your group. The defence is simple. A group is safe if it has two separate eyes, meaning two empty points inside it that White can never fill.',
            'Black already has one eye, at the corner. Make a second one.'
          ],
          task: {
            type: 'move', goal: 'Make a second eye.', solution: ['D1'],
            ok: 'Two eyes! The points A1 and C1 are both completely surrounded by Black stones. White cannot play on either, because the stone would have no liberties, so this group can never be captured: it is alive. It is now White\'s turn: tap A1 or C1 and see what the board says.',
            wrong: 'Not quite: that does not give a second separate eye. Look at the empty points along the edge; one move splits the space into two single-point eyes.',
            hint: 'Look at the point marked A.'
          },
          more: 'Why one eye is not enough: White fills all the outside liberties and then plays inside the eye, which is legal because it captures. With two separate eyes, each one is suicide for White, so the group lives. This is called life, and it is the main reason to keep your stones together.'
        }
      ]
    },
    {
      id: 'rules', title: 'Two forbidden moves',
      scenes: [
        {
          white: ['D5', 'F5', 'E4', 'E6'], marks: { E5: 'A' },
          text: [
            'Go has only two rules about forbidden moves. The first: you may not play a stone that would have no liberties, unless it captures something.',
            'White has surrounded point A completely. Try playing a black stone there.'
          ],
          task: {
            type: 'try', at: 'E5', reason: 'suicide', goal: 'Try to play a black stone at A.',
            ok: 'The board refused. A black stone at A would have no liberties, and it would capture nothing because every white stone still has liberties of its own. That is suicide, and it is not allowed. (If the stone captured something, the freed points would give it liberties and the move would be fine.)',
            wrong: 'That is a legal move, but not the one I meant. Tap A (the lettered point).',
            hint: 'Tap the point marked A.'
          },
          more: 'The suicide rule protects eyes: White cannot fill an eye that has only one point unless doing so captures.'
        },
        {
          black: ['D6', 'C5', 'D4'], white: ['E6', 'F5', 'E4', 'D5'],
          text: [
            'The second rule is ko. White\'s stone at D5 has one liberty, at E5. Capture it.'
          ],
          task: {
            type: 'move', goal: 'Capture the white stone at D5.', solution: ['E5'],
            ok: 'Captured. Now look at your stone at E5: its only liberty is D5. If White could retake there at once, the board would return to the earlier position and the game could repeat for ever. So White may not retake straight away. Try it: tap D5 as White.',
            wrong: 'Not that one. The white stone at D5 has one liberty at E5.',
            hint: 'The white stone D5 is in atari; fill its last liberty.'
          },
          koNote: 'White must play somewhere else first, ideally a move that threatens something bigger. If Black ignores the threat, White can then retake. A fight like this is called a ko.',
          more: 'The ko rule only stops the same position from repeating. Because each player can make a threat elsewhere, ko fights are a battle of who has more threats.'
        }
      ]
    },
    {
      id: 'play', title: 'Your first game',
      scenes: [
        {
          text: [
            'That is the whole foundation: aim at space, count liberties, capture to open space, stay connected, make two eyes, and avoid the two forbidden moves.',
            'The best way to learn the rest is to play. I suggest a game on this 9×9 board with a head start of five stones, against the easy computer, with Coach mode on so I can comment as we go. Say "play" to begin, or ask me anything first.'
          ],
          more: 'A head start is not a handicap: five extra stones for Black make the first games forgiving, and you can reduce them as you improve. You can ask me to teach again at any time.'
        }
      ]
    }
  ];

  return { steps, STARS };
});
