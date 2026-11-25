# Go Coach: direction and decisions

A summary of Boon's decisions and the reasoning behind them, so any session (phone, cloud or laptop) can pick up where the last one stopped. The code changes themselves are in `docs/phone-notes/`. Update this file when a decision changes.

Last updated: 25 November 2026.

## Product
- **Go Coach first.** Develop it until Boon is satisfied before approaching anyone. World of Go (neural network, subscription) comes later, funded by traction.
- **Go Coach stays local:** rules and random play-outs, no neural network, no network calls except the optional usage logging.
- **Audience and message:** attract competitive people and show them, with evidence, that restraint wins. Go as a war game you win by building, not destroying.

## Look
- **Redesigned 25 Nov 2026:** light and calm (white cards on warm off-white, soft shadows, one deep-green accent, clean sans-serif title with a two-stone mark), with a matching dark version when the phone or computer is set to dark mode. Boon admires SmartGo's clean design but asked for our own, not a copy. All colours are tokens at the top of style.css. Boon's follow-up the same day: square corners everywhere (only stones and small number badges stay round), no borders on boxes (the chat, move tree and notes stand out by colour and shadow), and small buttons with little space between the word and the edge. Then: boxes share the app's background (no white), with a light outline on the chat, move tree, notes and dialogs; buttons have no border and look like clickable text (italics, dotted underline); Final round (same day): no panel borders at all, so the chat and move tree blend into the screen; the chat box is just an italic "Ask your coach…"; buttons are plain words (not italics, no underline) and a highlighted one is bold in the same colour; only the clickable words inside the coach's messages are in italics with a thin dotted underline, and their numbers are not underlined.

## The chat (25 Nov 2026)
- **One list, not exchanges (changed 25 Nov 2026, later the same day):** the chat is a single list under the session's date and time, oldest first. Only the newest coach's message shows in full; every earlier item is one line starting with a dash (what you typed, or the first line of a coach's message). There is no "Coach's notes" heading (it opened nothing new); the welcome keeps its "Welcome" heading. A folded coach's "Position" or "Your move" message is not listed at all; tap a folded coach's line to read it all.
- **Sessions:** each starts with a date and time. Only pressing New starts a new session: the board and the chat are cleared and the old session moves into the history. Leaving the app or reopening it always returns you to where you were (Boon, 25 Nov 2026; an earlier one-hour rule was dropped).
- **History:** pull the chat down from the top (or scroll up past the top, or tap "Pull down to see earlier sessions") to see earlier sessions, all folded. The free tier keeps the last 100 sessions on the device; a paid tier (not built yet) would keep them all. If the device's storage runs out, the oldest go first. Sessions from earlier days (by the device's own date and time zone) fold into their day: tap the day for its sessions (listed by time), a session for its lines. Earlier sessions from today show only their date and time. Every heading that opens and closes (day, session) is clickable text, in italics with a thin dotted underline, like the coach's choices.

- **Only the newest coach's message shows in full:** every earlier message folds to its first line, shown as clickable text (italics, thin dotted underline) with a dash in front; tap it to read it all, tap the text again to fold it (Boon chose this over hiding earlier messages behind a count).
- **Requests in your own words (Boon, 25 Nov 2026):** if someone asks for anything the app has, in a way that plainly means it, the coach should take them there without Boon having to ask for each phrase. When adding a feature or a page, add the obvious ways of asking for it (coach.js, welcome.js) and a test. Examples: "show me the welcome message" (same as Help), "basic rules" (the step-by-step teacher), "guided game" (the guided first game).
- **Teach me opens the lessons list (Boon, 25 Nov 2026).** The second welcome ("Welcome to Go", after Teach me) was removed; the welcome comes back with Help or by asking for it.
- **Stone counts instead of "Your move" (Boon, 25 Nov 2026):** the top of the board shows "● 4  ○ 3" (Black first, both in the counts and the Prisoners on the right) with drawn stones as tall as the letters; the colour you play is underlined (in Play both sides, the side to move; in Set up, the colour being placed, tapped to switch). Words appear there only for scoring, the result and analysis in progress. The counts now show in silent Play mode too. Prisoners use the same drawn stones. Prisoners show as stones lost, no label: "●−2 ○0" (plain 0, never −0); tapping or hovering shows "Prisoners" (Boon, 25 Nov 2026).
- **Lists are tight:** items in any list (the welcome's choices, the lessons menu, the chat's days, sessions and questions) sit close together, with no extra space between lines. Keep this for future lists.

## Saving games (25 Nov 2026)
- **Save button** (between Resign and New): keeps the game in the cloud (Supabase, the shared `dlbs` project, Boon's choice). Pressing it again overwrites the same saved game. **New game box has two tabs:** "New game" (the options) and "Saved games" (every saved game, named by its date and time until Boon renames it; tap to open, Rename, Delete).
- **No sign-in yet (Boon: "don't worry about that for now").** Until accounts exist each device holds a private random key (`gocoach.owner` in localStorage) and the table `gocoach_saves` is reachable only through five functions (`gocoach_save/list/load/rename/delete`) that check the key; row level security with no policies blocks direct access. So saves are private to the device and do not follow Boon to another device or survive clearing the browser's data. When accounts are built (email code, password or Google: undecided), link saves through the table's `user_id` column. Anonymous sign-in is switched off in the project and email sign-in needs confirmation.
- The code is in `cloudsave.js` only; wording in `docs/text/en/save.md`. Open question for Boon: Go Coach's public users would share the `dlbs` project with his private Mobius data; a separate project was recommended before the public release.

## First install
- **The tour starts by itself** the first time the app is opened (nothing saved yet), after the welcome appears. It runs once; later it starts from "How to use the app" or by typing Tour.

## The coach's voice
- **Realistic, not idealistic or moralistic.** Never "you should be nice"; always "here is what each move costs or gains". Ethics are justified by better outcomes, as in Sun Tzu.
- **Evidence first, saying last.** The "Why X beats Y" message plays both moves out and reports points, which groups live or die and where. One fitting principle or proverb comes at the end, tied back to the position (`proverbs.js`).
- **Quotes must be real and attributed:** Sun Tzu (Giles translation), the Ten Golden Rules of Go, traditional proverbs, and words from Go masters. A master's quote not yet checked against a book or interview is shown as "attributed to" (Boon's choice, 24 Nov 2026): Go Seigen "Go is harmony", Cho Chikun "Match strength with strength, lightness with lightness". Verified: Lee Sedol's 2019 retirement remark about AI (not used yet); Edward Lasker, Go and Go-Moku (Dover 1960), quotes checked against the book (p. 100 in the coach, p. 102 in the tiger's mouth lesson). Checked against books Boon supplied: the Nihon Ki-in (Go: The World's Most Fascinating Game, 1973, "art of harmony"), Kaoru Iwamoto (Go for Beginners, 1972, pp. 104-107), Sakata Eio (in Go on Go, p. 133), Ma Xiaochun's Thirty-Six Stratagems Applied to Go. Go on Go and Yuan Zhou's Master Play do not contain "Go is harmony", so it stays "attributed". To check: Kageyama's "One cannot expect to turn thickness directly into territory" (Lessons in the Fundamentals of Go).
- **War vocabulary is welcome** (terrain, formation, engagement, campaign), with the Go term in brackets for Go players.

## How Go is described (`whatisgo.md`)
- Few rules; everything else emerges from play.
- Four skills: reading the terrain (territory), judging formations (shape), calculating the engagement (reading), commanding the campaign (strategy).
- Winning without destroying: restraint wins in a contest where almost anything goes.

## Lessons
- The lessons are organised in chapters that follow the skills in "What is Go?", from simple to complex: Basic training, Tactics, Formations, Reading the terrain, Calculating the engagement, Developing strategies. New lessons go into the chapter of the skill they teach. Chapters 4 and 5 now have four and three lessons. New lesson diagrams are checked by test-lessons.js, which reads ladders and nets out move by move.

## Partnerships (not started; Boon chose to finish Go Coach first)
- **Order:** an informal, friendly email to the International Go Federation (IGF) and a formal pilot with the Australian Go Association, in parallel; a formal IGF proposal later, with the pilot's results.
- **Role:** the IGF's technology partner, not a co-founder of a new authority. Ask first for "recommended" or "endorsed", not "the official app".
- **Money:** about 10% of net revenue (after GST, store and payment fees) to the IGF; about 20% of net revenue from users an association brings; any exclusivity limited in time and scope, with milestones and a way out. Lawyer and accountant before signing; an ABN and a business payment account before charging.
- **No own multiplayer server:** partner with an existing server (for example OGS) for live play.
- **Make Go Coach free for the pilot:** traction first.
- Research notes: the IGF has no app that we could find, publishes no budget, and is closely tied to the Nihon Ki-in. Comparable learning apps charge about US$5–7 a month or US$40–50 a year (BadukPop). No app we found marks shapes on the player's own board. Competitors (SmartGo first) are summarised in `docs/competitor-apps.md`.

## Go Coach grade (Boon, 25 Nov 2026; planned, not built)
- **Goal:** a subscriber builds a grade in Go Coach from the problems they solve, the lessons they do and the games they play, and it becomes fairly accurate over time.
- **Go Coach's own scale, not an official rank.** Shown as "Go Coach grade", in kyu, with a short note that it is Go Coach's own scale (do not suggest it is official or endorsed; Australian consumer law forbids misleading claims).
- **Display only the grade, with two decimals** (e.g. 10.63 kyu), so it moves after every game, problem session or lesson, up or down. Boon prefers the excitement of it moving to a steadier one-decimal figure. Kyu counts down as the player improves; after 1.00 kyu comes 1 dan.
- **Display (Boon, 25 Nov 2026):** the whole grade with the precise estimate in brackets, e.g. "10 kyu (9.56)". The estimate moves after every game, problem session or lesson; the whole number is the stable, reliable grade. Promotion: the whole number goes up once the estimate has passed the next grade (e.g. 9.00) and stayed there for about 3 games or problem sessions. Demotion: only once the estimate is a clear margin below (e.g. 11.30 for a 10 kyu) and stays there.
- **New game box (Boon, 25 Nov 2026):** replaces Easy, Medium and Hard with "Computer plays at your grade: 10 kyu". The grade is underlined (clickable) and the player may change it. If the player has set their own grade, it is shown as "10 (7.25)": the whole number is the player's own setting, the figure in brackets is Go Coach's estimate (here stronger than the setting; "10 (13.64)" would mean Go Coach's estimate is weaker, as kyu numbers fall as players improve). If the player has not set one, the whole number is Go Coach's stable grade, as above. The computer plays at the grade shown as the whole number.
- **Publish the method** (Boon's hope): so other Go apps can use the same way of grading and, over time, help build a common, widely accepted ranking. Ways to make it more accurate later: games against real people (e.g. through a partner Go server), checking against association ranks (e.g. the Australian Go Association pilot) and publishing how well they match, and results on larger boards.
- **All three board sizes (Boon's wish, 25 Nov 2026):** one grade fed by 9×9, 13×13 and 19×19 games, each computer level measured against KataGo separately on each size (a level is not the same strength on every board). Go Coach's engine is weaker on larger boards, so 19×19 games may only grade players up to a lower level than 9×9.
- **How it works:** a rating like the European Go Federation's (100 points per grade). Every problem, every lesson exercise and every computer level has a fixed place on the scale; results against them move the rating. New players move faster at first. Games with undo, hints or Coach mode, the guided first game and problems solved after seeing the answer count less or not at all.
- **Problems:** built with KataGo outside the app (answers checked, difficulty set by KataGo's human-style model: the rank that finds the answer about half the time), sorted by topic and linked to the lessons. Start with about 100 from 30 to 15 kyu, then grow to 300 to 500 up to about 5 kyu. Simple ones are also checked exhaustively by our own code.
- **The computer plays at the player's grade, not Easy, Medium or Hard (Boon, 25 Nov 2026; replaces the ladder idea).** The player's grade is built up over time, or the player sets it themselves at the start (e.g. "I'm about 15 kyu"). A self-set grade is only a starting point: it is treated as uncertain and corrected quickly by results. The computer's strength is a setting on the kyu scale, tuned (thinking time and the kind of mistakes made) and checked against KataGo on each board size; games at the player's own grade are the most informative for the rating. Go Coach's engine tops out around 5 to 10 kyu on 9×9 (lower on larger boards); above that the player gives the computer handicap stones. Dan grades belong to World of Go.
- **KataGo is a measuring and building tool only.** It never goes into Go Coach's code (no neural network in the app); only its results (problems, difficulty levels, level settings) do. Its tools should live outside this repository (suggested: World of Go's repository; not decided).
- **World of Go** would later give a more accurate, KataGo-based grade on the same scale, carrying over the Go Coach grade.
- **Privacy:** grading on the device needs no permission. Sending players' games away for analysis needs a privacy note, anonymised data and a switch to turn it off; anything personal (e.g. problems from your own games) is opt-in. Lawyer check before charging.
- **Accounts** are needed for the grade to follow a subscriber across devices; until then it stays on one device.

## Engine (search.js)
- Tree search with RAVE over fast play-outs; used by Hard, the coach's hints, the win-chance bar and the explanations.
- Measured: beat the old engine 20–0 (9×9) and 4–0 (13×13); against GNU Go 3.8 on 9×9 at Hard, 9 wins and 7 losses (about 5–10 kyu). Wins are close; losses are large, from misjudging whether a big group lives.
- **Measured against KataGo (25 Nov 2026),** imitating human ranks with its human-style model, 9×9, 8 games each: Easy lost 0/8 to 20 kyu even and won 3/8 taking 5 stones; Medium won 3/8 against 20 kyu and 4/8 against 15 kyu; Hard won 7/8 against 15 kyu and 10 kyu, 2/8 against 5 kyu. Rough reading: Easy well below 20 kyu (about 25 to 30 kyu or weaker), Medium about 15 to 20 kyu, Hard about 6 to 8 kyu. Few games, so each could be off by a few grades; KataGo's rank imitation is less reliable on 9×9. More games are being played.
- Next engine work, if wanted: life and death in the play-outs, ladders, not collapsing when behind.

## Open items (Boon to choose)
- Analyse and hints still use the older, weaker method.
- Show sequences on the board, move by move.
- Japanese/Korean scoring option; a privacy note; a language file for native versions.
- More sayings (Thirty-Six Stratagems, Clausewitz's culminating point).

## How we work
- **Cloud sessions** (phone, or the Desktop app set to cloud) clone GitHub fresh and work through pull requests; Boon says "merge it" to put a change live.
- **Laptop (local) sessions** start with `git pull` on `main` in `C:\_Personal\_myApps\myGoCoach`, then read this file and the newest `docs/phone-notes/`.
- GitHub is the meeting point; avoid changing the same thing on two devices at once.
- **Logo and app icon (Boon, 25 Nov 2026):** two realistic stones, black behind and white in front, overlapping, with shine and a soft shadow, resting on one grid point (a cross) on the app's light grey. It replaces the board picture as the app icon (make-icons.js draws it; docs/logo.svg is the same design). Beside the title (and page titles) the same two stones appear with their shadow on the grid cross, no background or border (logo-mark.svg).
