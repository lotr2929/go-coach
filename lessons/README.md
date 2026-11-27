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
