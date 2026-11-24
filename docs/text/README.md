# The app's wording

All the words Go Coach shows are kept here, so they can be edited or translated without touching the code.
Two things stay in the code for now: the words the coach recognises when you type (such as "hint" or "why"), and the
quick-reply buttons in the chat, which send those same words. Translating them is a separate job, because each language
needs its own patterns.

## The folders

- `en/` holds the English wording. A translation is a copy of this folder under the language's code, such as `zh/` for Chinese or `ja/` for Japanese.
- `en/*.md`: one file for each part of the app: `welcome.md`, `tour.md`, `pages.md`, `coach.md` (the coach's answers), `terms.md` (Go terms), `point.md` (notes on a point on the board), `lesson-help.md` (help inside a lesson), `lessons.md` (the 16 lessons), `curriculum.md` (the guided "Teach me" steps), `commentary.md` (what the coach says about a move), `shapes.md` (the Shapes tab), `proverbs.md` (Go sayings), `guide.md` (the guided first game), `play.md` (playing a game and the New game box), `coaching.md` (analysis, move feedback, game review), `explain.md` ("why A beats B"), `engine.md` (the computer's reasons), `chat.md` and `app.md` (small messages from around the app), `teach.md` and `intro.md` (Teach me), `learn.md` (running a lesson), `explore.md` (exploring a move), `kifu.md` (famous games) and `screen.md` (buttons, Settings and the boxes on screen).
- Some files hold short pieces that the app joins into sentences (for example `commentary.md`). A piece cannot begin or end with a space; the app adds those.
- `en/pages/`: the long pages the app shows whole, such as *What is Go?* and *A history of Go*.
- `en/lists/`: lists the app is built from, such as the famous games (`kifu-picks.md`).

## How to edit a wording file

Each piece of text sits under a heading such as `## top`. Change the words under the heading, never the heading itself:
the heading is how the app finds the text.

- A single line break starts a new line in the app; a blank line starts a new paragraph.
- Words in curly brackets, such as `{point}`, are filled in by the app. Keep them exactly as they are (they may move within the sentence).
- Anything above the first `##` heading is a note for editors and is not shown in the app.

## After editing

The change reaches the app at the next deploy: `deploy.bat` copies the wording into the app (`make-text.js`) and checks it.

## Formatting in the long pages

The pages in `pages/` understand **bold** (two stars each side), _italics_ (one underscore or one star each side), a quotation (a line starting with `> `), headings (`##` and `###`), lists (lines starting with `- `) and source numbers such as [2].
