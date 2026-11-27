/* Makes Go Coach's busy-board puzzles ("one group is in atari: save it", "find the stone in atari and capture it") from
   KataGo's ranking (rank-puzzles.js), for the bands Boon approved on 27 Nov 2026: 30-25k and 25-20k. Each is a puzzle file:
   the position from a famous game, the task, every answer that KataGo confirmed as a good move (RIGHT), and any other move
   is wrong. The text comes from the kifu file's details and the board itself; nothing is invented.
   Difficulty within a band comes from how often the human-style model's 20-kyu player finds the answer (rec.found['20k']).
   Building only; never part of the app. Needs results/atari-candidates.json (node tools/katago/find-atari.js) and
   results/atari-ranked.json. Usage: node tools/katago/make-atari-puzzles.js [firstNumber=401]   Then: node make-lessons.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), E = require(path.join(ROOT, 'engine.js'));
let num = +process.argv[2] || 401;
const RES = path.join(__dirname, 'results');
const cands = JSON.parse(fs.readFileSync(path.join(RES, 'atari-candidates.json'), 'utf8'));
const ranked = JSON.parse(fs.readFileSync(path.join(RES, 'atari-ranked.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'kifu', 'index.json'), 'utf8'));
const info = {}; for (const c of index.categories) for (const g of c.games) info[g.id] = g;
const COLS = 'ABCDEFGHJKLMNOPQRST';
const idx = (n, gtp) => (n - +gtp.slice(1)) * n + COLS.indexOf(gtp[0]);
const sgfPt = (n, i) => String.fromCharCode(97 + i % n) + String.fromCharCode(97 + ((i / n) | 0));
const esc = s => String(s).replace(/[\]\\]/g, '\\$&');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const KYU = { '30-25k': p => (p >= 0.9 ? 27 : 26), '25-20k': p => (p >= 0.7 ? 24 : p >= 0.6 ? 23 : 22) };
const stonesWord = k => (k === 1 ? 'stone' : k + ' stones');

let made = 0;
for (const r of ranked) {
  if (!KYU[r.level]) continue;
  const c = cands.find(x => x.game === r.game && x.turn === r.turn), g = info[r.game];
  if (!c || !g) { console.log('skipped (not found):', r.id); continue; }
  const n = c.n, geo = E.geom(n), b = [...c.board].map(Number), me = c.colour;
  const colour = me === 1 ? 'Black' : 'White', key = me === 1 ? 'B' : 'W';
  const kyu = KYU[r.level](r.found['20k']), band = r.level;
  const total = (g.moves || 0) || null, frac = total ? c.turn / total : 0.5;
  const phase = frac < 0.25 ? 'Early in the game' : frac < 0.7 ? 'In the middle of the game' : 'Near the end of the game';
  const when = [g.event, g.date].filter(Boolean).join(', ');
  const intro = `${phase}: ${g.black} (Black) against ${g.white} (White)${when ? ', ' + when : ''}. ${colour} to play.\n\n` +
    (c.kind === 'save' ? `Task: One of ${colour}'s groups is in atari. Find it and save it.` : `Task: One of the opponent's groups is in atari. Find it and capture it.`);
  const tries = r.good.map(gtp => {
    const m = idx(n, gtp), res = E.tryPlay(geo, b, m, me, -1);
    const took = b.filter((v, i) => v === 3 - me && !res.board[i]).length;
    let why;
    if (c.kind === 'capture') why = `${gtp} takes the last liberty and captures ${took === 1 ? 'the stone' : 'all ' + took + ' stones'}.`;
    else if (took) why = `${gtp} captures ${stonesWord(took)} next to your group, so it is out of atari.`;
    else why = `${gtp} gives your group ${E.flood(geo, res.board, c.target).libs.length} liberties, and it can no longer be caught.`;
    return `(;${key}[${sgfPt(n, m)}]C[RIGHT ${esc(why)}])`;
  });
  /* Other ways out that KataGo reads as clearly worse: wrong, with a reason, so the player is not left guessing. */
  for (const gtp of r.answer.filter(a => !r.good.includes(a)))
    tries.push(`(;${key}[${sgfPt(n, idx(n, gtp))}]C[${esc(`${gtp} gets the stones out of atari for now, but KataGo reads it as clearly worse than ${r.good[0]}. Look for a better way.`)}])`);
  const ab = [], aw = [];
  b.forEach((v, i) => { if (v === 1) ab.push('[' + sgfPt(n, i) + ']'); if (v === 2) aw.push('[' + sgfPt(n, i) + ']'); });
  const title = (c.kind === 'save' ? 'Save the group' : 'Find the atari') + `: ${g.title}, move ${c.turn + 1}`;
  const id = `p0${num}-${slug(c.kind === 'save' ? 'save the group ' + g.title : 'find the atari ' + g.title)}`.slice(0, 60).replace(/-$/, '');
  const out = `(;GM[1]FF[4]CA[UTF-8]SZ[${n}]GN[${esc(title)}]DI[${kyu}k]PL[${key}]PB[${esc(g.black)}]PW[${esc(g.white)}]\n` +
    `AB${ab.join('')}\nAW${aw.join('')}\nC[${esc(intro)}]\n${tries.join('\n')}\n)\n`;
  fs.mkdirSync(path.join(ROOT, 'puzzles', band), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'puzzles', band, id + '.sgf'), out);
  num++; made++;
}
console.log(`${made} busy-board puzzles written into puzzles/. Now run: node make-lessons.js`);
