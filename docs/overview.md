# Go Coach: what it is and what it does

One page that sums up the whole app, for anyone (or any Claude) joining the work. Written 28 Nov 2026; keep it up to date when a
feature is added or changed. The details and the reasons live elsewhere:

- `CLAUDE.md`: the rules for working on the code (Boon's rules 1 to 9, how to check, how to put a change live).
- `docs/decisions.md`: Boon's direction and every decision, with the reasons.
- `docs/phone-notes/`: one note per working session (what was asked, changed, checked); the newest are at the end of the list.
- `lessons/README.md`: the puzzle and lesson file format, and how to check and publish them.
- `tools/katago/README.md`: KataGo, used only on a developer's computer to check and rank puzzles.

## What Go Coach is

The beginner's Go app by Boon Ong: a web app that installs on a phone (a PWA, plain JavaScript, no build step), live at
https://go-coach.pages.dev (Cloudflare Pages, published from `main` on GitHub, lotr2929/go-coach). Free beta now; subscriptions
planned for the new year. Its aim: show competitive people that restraint wins (Go as a war you win by building). It stays
local: rules and random play-outs, no neural network and no AI service in the app. A separate later app, World of Go, will have
the neural network.

## Modes and layouts (Boon, 28 Nov 2026)

Two layouts:

- **Board + Coach** (the usual view: the board, with the coach's chat beside or below it):
  - **Play mode**: a normal, silent game against the computer. No help unless asked (Analyse, or asking the coach for a hint).
  - **Coach mode**: the same game with the coach commenting on every move, hover notes, Territory and Shapes.
  - **Puzzle mode**: tap the title "Go Coach". Puzzles at the player's grade, one after another, with a streak of days.
- **Board only**: the full-screen button beside the prisoners.
  - **Game mode**: the board as large as the screen, with Pass, Resign and New. No coach at all (shrink the board to reach
    it). In a game against the computer, the **Computer panel** ("Computer:") lists the computer's moves, passes and
    resignation. Tap a move to go back or forward to it; the line stays until a different move is played.
  - A reading page (an essay) shown full screen fills the screen with just the page.

## Features

- **Games against the computer** on 9×9, 13×13 and 19×19; handicap; Easy, Medium, Hard (Hard is about 7 to 8 kyu on 9×9). The
  computer resigns when clearly lost and passes when nothing is left. Undo and redo, a move tree, scoring with dead stones,
  saving games (on the device and, with the Save button, in the cloud).
- **The coach**: a chat that recognises plain requests ("basic rules", "show me the welcome message"), hints, analysis
  (best moves A to E), a territory map, Shapes, game review, and explanations in plain words.
- **Learning**: the guided first game, a step-by-step teacher of the rules, 9×9 lessons (`lessons/`), puzzles (`puzzles/`),
  100 famous games to step through (Kifu, `kifu/`), the History of Go and other reading pages (`docs/text/en/pages/`).
- **Go Coach grade**: a kyu grade from puzzles solved first time and games played, shown beside the player's name.
- **Accounts**: the app opens fresh as a guest each time; signing in is typing a name (no password yet), which keeps grade,
  streak and puzzles on the device. A guest's progress is not recorded.
- **Messages**: the envelope sends a message to Go Coach; Claude answers them for Boon.
- **Usage log**: anonymous, insert-only, with a switch in Settings.
- **Wording**: every sentence the app shows is in `docs/text/en/*.md`, so Boon can edit it and it can be translated.

## Puzzles: where they stand and how to add more

**Now (28 Nov 2026): 98 puzzles**, all 9×9 or from famous games: 69 at 30-25k, 20 at 25-20k, 7 at 20-15k, 2 at 15-10k.

- p0301 to p0350: the 50 simplest (last liberty, counting liberties, escaping atari, two eyes, taking an eye away), built
  and checked by `tools/lessons/build-puzzles-2026-11-27.js` (the computer reads every answer out).
- p0401 to p0426: busy-board puzzles from famous games ("save the group in atari", "capture the stone in atari"), found by
  `tools/katago/find-atari.js`, checked and ranked by `tools/katago/rank-puzzles.js` (KataGo: the answer must be within 1.5
  points of its best move; the human-style model says which rank finds it), written by `tools/katago/make-atari-puzzles.js`.
- p02xx: "decisive move" puzzles from famous games (`tools/katago/find-decisive.js`, then `make-puzzles.js`).

**Target**: about 750 (about 30 per grade from 30 kyu to 5 kyu), growing to 2,000 to 3,000. Boon's next wishes in
`docs/decisions.md` (Puzzle mode): eye-point puzzles, more 13×13 and 19×19 (from the Brouwer database), and tagging puzzles by
the principle they teach.

**Rules for puzzles**

1. One SGF file per puzzle in its grade-band folder (`puzzles/30-25k/`, ...); the format is in `lessons/README.md`.
2. **Numbers**: a second account uses **5000 to 9999** (`lessons/README.md`), so files from two accounts never clash.
3. Every answer must be checked by a program (the computer's reader in `tools/lessons/`, or KataGo), never just written.
   Texts about a famous game come only from the game file's own details (players, event, date, result): nothing invented.
4. KataGo runs only on the developer's computer (on the laptop: `tools/katago/bin`, ignored by git). It is never put into
   the app; only the finished puzzle files are.
5. After adding files: `node make-lessons.js` (checks every puzzle and rebuilds `puzzles/index.json`, easiest first), then
   `node test.js`. Put them live as `CLAUDE.md` rule 7 says, only with Boon's yes.
6. **How a puzzle reads** (Boon, 28 Nov 2026): background first, hints step by step after wrong moves, a short explanation
   at the end, and a longer one if asked. See `lessons/README.md`, "How a puzzle should read".

## Handover, 28 Nov 2026: puzzles move to Boon's Claude Desktop (Curtin account)

**Done today** (phone and cloud sessions; notes in `docs/phone-notes/2026-11-28-*.md`):

- One text size for the chat and the reading pages.
- The full-screen board, now Game mode with no coach, laid out for a phone upright and on its side, using the device's own
  full screen.
- The Computer panel in Game mode: the computer's moves, passes and resignation. It scrolls, a tap on a move goes to it, and
  the line is kept until a different move is played.

**For the Curtin session, to start:**

1. Work in the same repository (GitHub lotr2929/go-coach, or the laptop folder `C:\_Personal\_myApps\myGoCoach` after
   `git pull` on `main`). Read `CLAUDE.md`, this page, `docs/decisions.md` and the newest `docs/phone-notes/`.
2. Number new puzzles from **p5000** upwards.
3. Build them with the tools above, on a branch. Check them with `node make-lessons.js` and `node test.js`, and add a note in
   `docs/phone-notes/` before asking Boon to put them live.
4. Only one session changes `main` at a time: GitHub is the meeting point.
