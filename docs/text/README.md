# The app's wording

All the words Go Coach shows are kept here, so they can be edited or translated without touching the code.
(This is being done in stages: some wording is still inside the code for now.)

## The folders

- `en/` holds the English wording. A translation is a copy of this folder under the language's code, such as `zh/` for Chinese or `ja/` for Japanese.
- `en/*.md`: one file for each part of the app: `welcome.md`, `tour.md`, `pages.md`, `coach.md` (the coach's answers), `terms.md` (Go terms), `point.md` (notes on a point on the board), `lesson-help.md` (help inside a lesson), `lessons.md` (the 16 lessons), `curriculum.md` (the guided "Teach me" steps), `commentary.md` (what the coach says about a move), `shapes.md` (the Shapes tab), `proverbs.md` (Go sayings) and `guide.md` (the guided first game).
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
