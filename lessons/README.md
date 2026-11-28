# Go Coach lessons

Every file in this folder's subfolders is one lesson: a short Go problem that a player solves on the board. Solved first time,
without a hint, it builds the player's Go Coach grade at the lesson's own difficulty. A lesson a day, like a daily crossword, is
Go Coach's main selling point (Boon, 27 Nov 2026), so we need many of these, from 30 kyu upwards.

## Where a lesson goes

- One lesson per file, in the folder for its grade band: `30-25k`, `25-20k`, and so on (make a new band folder when needed).
- File name: `p` + a four-digit number + a short title, lower case with hyphens, e.g. `p0103-cut-the-diagonal.sgf`.
  Numbers must be unique across all folders. To avoid two people picking the same numbers, give each writer a range:
  Boon's personal account 0001–4999, another account 5000–9999.

## The format: SGF

SGF is the standard file format for Go problems; any Go editor (Sabaki, for example) can make and open these files.
Keep to this shape:

```
(;GM[1]FF[4]CA[UTF-8]SZ[9]GN[Take the last liberty]DI[30k]PL[B]
AB[dd][ef][fe]
AW[ee]
C[The white stone at E5 has only one liberty left.

Task: Capture it.]
(;B[ed]C[RIGHT E6 takes White's last liberty, so the stone is captured.])
(;B[ce];W[ed]C[White escapes upwards. Try again.])
)
```

- `SZ` board size: 9, 13 or 19. `GN` the title. `DI` the difficulty: `30k` to `1k`, or `1d` and up.
- `PL` who plays: `B` or `W` (the player always plays this colour). `AB` / `AW` the black and white stones.
  Points are two letters: column then row, both from `a` at the top left (on 9×9, `ee` is the centre, E5).
- `C` on the first node: the introduction. Separate paragraphs with a blank line. A paragraph starting `Task:` becomes the task line.
- Each branch `( … )` is one try. Inside it, moves alternate: the player's move, then the opponent's answer, and so on.
  - A try is right when the comment on its last move starts with `RIGHT`, followed by the explanation the player sees.
  - A try without `RIGHT` is wrong: its last comment explains why (for example, how the opponent escapes).
  - A comment on an opponent's move in the middle of a try is shown to the player before their next move.
  - Any move that is not in a branch is simply wrong, with a general message; only add wrong tries worth explaining.
- Write for a real beginner: plain words, British English, short sentences. Say why the right move works.

## How a puzzle should read (Boon, 28 Nov 2026)

Boon liked this style when Claude set him a puzzle on a shared board, and wants every puzzle written this way. When he asks
to redo the puzzles, rewrite each one to it.

1. **Background first** (the introduction, before `Task:`). Where the position comes from (the game, the players, the year,
   the move number) and, in a sentence or two, what is going on: which areas belong to whom, which group is weak, what is
   still open. Help the player see the board before they look for a move. Never give the answer away.
2. **Hints for wrong moves, step by step.** Each wrong try worth explaining says briefly why that move falls short, then
   points the player closer without naming the point: first the area ("look at the lower right, near the edge"), then
   narrower ("the second line from the bottom, on the right"). A puzzle should have two or three such hints, from broad to
   narrow, so a player who keeps missing is led to the answer rather than told it.
3. **A short explanation at the end** (the `RIGHT` comment): two or three sentences on what the move does and why it is
   the best, in plain words ("It stops White's G2 stone from pushing into Black's corner").
4. **A longer explanation, if the player asks for it.** It walks through the position: what each side's areas are, what
   the opponent threatens, what the right move stops or makes, and why the tempting moves (the second-best, the obvious
   attack) are smaller. It ends with the lesson in one line ("close the gap into your territory before you attack").
   A small text diagram of the position may help in chat, but the board shows it in the app.

Be truthful: a KataGo figure (such as "13 points worse") is KataGo's, and the words are the writer's own reading; check every
claim in the explanation against the position (liberties, who escapes, what is captured). A wrong explanation is worse than none.

**Not built yet (needs a change to the app first):** the app shows one hint (it marks the first move of a right try) and one
explanation, so there is nowhere yet for step-by-step hints or the longer explanation. The planned format, once the app reads it:
- `Hint:` paragraphs in the first `C`, after `Task:`, broad to narrow, shown one at a time when the player asks for a hint
  or misses (instead of marking the answer straight away).
- A `More:` paragraph at the end of the `RIGHT` comment, shown only when the player presses a new "Explain more" button.
Until that change is made, do not add `Hint:` or `More:` paragraphs: today's app would show them in the introduction and the
explanation. Steps 1 to 3 can be written now in the existing format (introduction, wrong-try comments, `RIGHT` comment).

## Lesson games (Boon, 28 Nov 2026)

A lesson game teaches by playing one whole game: the rules and ideas come up as they happen on the board, so the player gets a
sense of how a game goes from the first stone to the count. Each chapter of the lessons can become one such game. They go in
`lessons/games/` and are listed first in the Lessons menu, under "Lesson games". They do not count towards the grade.

- Mark the file with `TY[story]` on the first node, and `PL[B]`: the player plays Black from an empty board.
- The main line is the game. The player taps each Black move (a blue circle shows where); White's answers follow by themselves.
  Each move's `C` is its note, shown as the move is played. A move that is not the game's is taken back with a gentle message.
- A note paragraph starting `Your turn:` hides the circle for the next move: the player finds it alone. Use it for the moments
  the lesson is about (a capture, an escape).
- `LB[..:A][..:B]...` on the node where Black is to move: the top moves there, A first, shown when the player taps Hint. A note
  paragraph starting `Best:` holds the words for them; it is shown with the marks, never with the note.
- A side branch (one move with a comment) explains a tempting wrong move at a `Your turn:` point.
- The game ends where the main line ends; the board then shows each side's area. Fill every border first, so the count is right.

**Black's moves must be good, and checked.** Every Black move is checked by KataGo (`tools/katago/top-moves.js`, the human
model at its strongest with search): the game's move must be KataGo's first choice at a `Your turn:` point, and within 1.5
points of it elsewhere. The top moves (LB) are KataGo's. White may play badly on purpose, to show a mistake, and the note
should say so. Every claim in a note (liberties, captures, who is in atari, the count) is checked by the builder, which plays
the game with engine.js. `tools/lessons/build-game-2026-11-28.js` is the first; copy it for the next.

## Checking and publishing

1. Put the file in its band folder.
2. Run `node make-lessons.js`. It checks every lesson (legal moves, a RIGHT try, title, difficulty, introduction) and
   rebuilds `index.json`, the list the app shows (easiest first). It names any file with a problem and what to fix.
3. Run `node test.js`, then put the change live in the usual way (see CLAUDE.md, rule 7).

## Capture and escape lessons, read out by the computer

`tools/lessons/tactics.js` reads out capture and escape problems (every defence, every right move) and writes the answer
tree; `tools/lessons/build-2026-11-27.js` is the first batch made with it and a model for the next: describe the position, the
target stone and the words, run it (`node tools/lessons/build-2026-11-27.js`), then `node make-lessons.js`. It refuses a lesson
whose claimed answer does not work, or whose "tempting wrong move" actually works. It reads only captures and escapes, so keep
those positions small and clear; other ideas (shape, territory, life and death) are written by hand.

## Simple puzzles, and eyes

`tools/lessons/build-puzzles-2026-11-27.js` made the 50 simplest puzzles (puzzles/30-25k, p0301 to p0350, 30 to 26 kyu): last
liberty, counting liberties, escaping from atari, making two eyes and taking an eye away. Captures are read by tactics.js;
escapes by a check that reads six White moves ahead; eyes by `tools/lessons/eyes.js`, which reads every reply inside a small
eye space (up to 5 points). Each position is written once for the bottom left and can be flipped to another corner or side.

Later, lessons will also be checked with KataGo (that the right answer is really the best move, and how hard it is).

## Busy-board puzzles from famous games, ranked by KataGo

`tools/katago/find-atari.js` finds moments in the famous games where one group is in atari, `tools/katago/rank-puzzles.js`
checks each with KataGo (the answer must be within 1.5 points of its best move) and ranks it with KataGo's human-style model
(how often a player of each rank plays the answer), and `tools/katago/make-atari-puzzles.js` writes the 30-25k and 25-20k
ones as puzzles (p0401 to p0426, 27 Nov 2026). Below 20 kyu the model has no weaker player, so those two bands are split by
how often its 20-kyu player finds the answer: a first estimate, to be checked against beta players' results.
