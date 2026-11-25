# Go Coach: direction and decisions

A summary of Boon's decisions and the reasoning behind them, so any session (phone, cloud or laptop) can pick up where the last one stopped. The code changes themselves are in `docs/phone-notes/`. Update this file when a decision changes.

Last updated: 24 November 2026.

## Product
- **Go Coach first.** Develop it until Boon is satisfied before approaching anyone. World of Go (neural network, subscription) comes later, funded by traction.
- **Go Coach stays local:** rules and random play-outs, no neural network, no network calls except the optional usage logging.
- **Audience and message:** attract competitive people and show them, with evidence, that restraint wins. Go as a war game you win by building, not destroying.

## Look
- **Redesigned 25 Nov 2026:** light and calm (white cards on warm off-white, soft shadows, one deep-green accent, clean sans-serif title with a two-stone mark), with a matching dark version when the phone or computer is set to dark mode. Boon admires SmartGo's clean design but asked for our own, not a copy. All colours are tokens at the top of style.css. Boon's follow-up the same day: square corners everywhere (only stones and small number badges stay round), no borders on boxes (the chat, move tree and notes stand out by colour and shadow), and small buttons with little space between the word and the edge. Then: boxes share the app's background (no white), with a light outline on the chat, move tree, notes and dialogs; buttons have no border and look like clickable text (italics, dotted underline); Final round (same day): no panel borders at all, so the chat and move tree blend into the screen; the chat box is just an italic "Ask your coach…"; buttons are plain words (not italics, no underline) and a highlighted one is bold in the same colour; only the clickable words inside the coach's messages are in italics with a thin dotted underline, and their numbers are not underlined.

## The chat (25 Nov 2026)
- **Exchanges, not a stream:** each question heads its exchange; the newest is open, earlier ones fold to just the question; tap a question to open or close it. The welcome and the coach's notes before any question get their own heading ("Welcome", "Coach's notes").
- **Sessions:** each starts with a date and time. Only pressing New starts a new session: the board and the chat are cleared and the old session moves into the history. Leaving the app or reopening it always returns you to where you were (Boon, 25 Nov 2026; an earlier one-hour rule was dropped).
- **History:** pull the chat down from the top (or scroll up past the top, or tap "Pull down to see earlier sessions") to see earlier sessions, all folded. The free tier keeps the last 100 sessions on the device; a paid tier (not built yet) would keep them all. If the device's storage runs out, the oldest go first. Questions are marked with a plain • (no triangles). Sessions from earlier days (by the device's own date and time zone) fold into their day: tap the day for its sessions (listed by time), a session for its questions, a question for its answer. Earlier sessions from today show only their date and time (tap to see their questions); folded questions show directly only for the current session. Every heading that opens and closes (day, session, question) is clickable text, in italics with a thin dotted underline, like the coach's choices.

- **Only the newest coach's message shows in full:** every earlier message folds to its first line, shown as clickable text (italics, thin dotted underline); tap it to read it all, tap the text again to fold it (Boon chose this over hiding earlier messages behind a count).
- **Lists are tight:** items in any list (the welcome's choices, the lessons menu, the chat's days, sessions and questions) sit close together, with no extra space between lines. Keep this for future lists.

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

## Engine (search.js)
- Tree search with RAVE over fast play-outs; used by Hard, the coach's hints, the win-chance bar and the explanations.
- Measured: beat the old engine 20–0 (9×9) and 4–0 (13×13); against GNU Go 3.8 on 9×9 at Hard, 9 wins and 7 losses (about 5–10 kyu). Wins are close; losses are large, from misjudging whether a big group lives.
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
