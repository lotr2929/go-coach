/* Go Coach tests: prints failures only. Run: node test.js */
const assert = require('assert');
const E = require('./engine.js');
const LS = require('./lessons.js');
const C = require('./coach.js');
const CM = require('./commentary.js');
const CUR = require('./curriculum.js');
const TEACH = require('./teach.js');
const EXPLORE = require('./explore.js');
const INTRO = require('./intro.js');
const HISTORY = require('./history.js');
const GUIDE = require('./guide.js');
const SGF = require('./sgf.js');
const KIFU = require('./kifu.js');
let failed = 0, passed = 0;
async function t(name, fn) {
  try { await fn(); passed++; } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); }
}
(async () => {
  for (const L of LS.list) {
    if (L.type) continue;
    await t('lesson ' + L.id, () => {
      const s = LS.setup(L); let last;
      for (const [x, y] of L.solution) last = LS.handle(L, s, LS.P(L.n, x, y));
      assert.strictEqual(last.status, 'win');
    });
  }
  await t('atari lesson fails when ignored', () => {
    const L = LS.list.find(l => l.id === 'atari'), s = LS.setup(L);
    assert.strictEqual(LS.handle(L, s, LS.P(9, 0, 0)).status, 'fail');
  });
  await t('occupied point refused', () => {
    const s = E.newState(9, 0); E.play(s, 40);
    assert.strictEqual(E.play(s, 40).ok, false);
  });
  await t('save and load a game', () => {
    const s = E.newState(9, 2); E.play(s, 10); E.play(s, 11);
    const u = E.deserialize(E.serialize(s));
    assert.strictEqual(u.moves.length, 2); assert.strictEqual(u.board[10], 2);
    E.undo(u); assert.strictEqual(u.board[11], 0);
  });
  await t('SGF has handicap stones', () => {
    assert(E.toSGF(E.newState(9, 2)).includes('HA[2]'));
  });
  await t('computer plays a legal game to the end', async () => {
    const s = E.newState(9, 0); let c = 0;
    while (s.passes < 2 && c < 250) {
      const r = await E.chooseMove(s, s.turn, { level: 'medium', ms: 40 });
      if (r.move < 0) E.pass(s); else assert(E.play(s, r.move).ok, 'illegal computer move');
      c++;
    }
    assert(s.passes >= 2, 'game did not end');
    const sc = E.scoreArea(9, s.board, await E.estimateDead(s, 60));
    assert(sc.black + sc.white <= 81);
  });
  await t('hard level captures a stone in atari', async () => {
    const s = E.newState(9, 0); /* White E5 surrounded on three sides by Black; Black to capture at E4 */
    for (const m of [31, 40, 39, 0, 41, 8]) E.play(s, m);
    const r = await E.chooseMove(s, 1, { level: 'hard', ms: 300 });
    assert.strictEqual(r.move, 49);
  });
  await t('hard level plays a legal game to the end', async () => {
    const s = E.newState(9, 0); let c = 0;
    while (s.passes < 2 && c < 250) {
      const r = await E.chooseMove(s, s.turn, { level: 'hard', ms: 30 });
      if (r.move < 0) E.pass(s); else assert(E.play(s, r.move).ok, 'illegal computer move');
      c++;
    }
    assert(s.passes >= 2, 'game did not end');
  });
  await t('analysis ranks moves and the played move is included', async () => {
    const s = E.newState(9, 0); E.play(s, 20); E.play(s, 60);
    const r = await E.analyse(s, 1, { ms: 300, include: [0] });
    assert(r.moves.length >= 2 && r.moves.some(m => m.move === 0) && r.own.length === 81);
    assert.strictEqual(E.stateAt(s, 1).moves.length, 1);
  });
  await t('territory can run for a set time, report progress, and still take a fixed number of games', async () => {
    const s = E.newState(9, 0); E.play(s, 20); E.play(s, 60);
    let ticks = 0;
    const t0 = Date.now();
    const r = await E.territory(s, 0, null, { ms: 700, progress: () => { ticks++; } });
    assert(Date.now() - t0 >= 650, 'it stopped early');
    assert(r.sims >= 10 && r.own.length === 81);
    for (const v of r.own) assert(v >= -1 && v <= 1, 'a score is out of range');
    assert(ticks >= 1, 'no progress was reported');
    const f = await E.territory(s, 30);
    assert.strictEqual(f.sims, 30);
  });
  await t('the coach is always at least one level above the computer', async () => {
    assert.strictEqual(E.coachLevel('easy', 'medium'), 'medium');
    assert.strictEqual(E.coachLevel('medium', 'medium'), 'hard');
    assert.strictEqual(E.coachLevel('hard', 'medium'), 'expert');
    assert.strictEqual(E.coachLevel('hard', 'hard'), 'expert');
    assert.strictEqual(E.coachLevel('easy', 'expert'), 'expert');
    assert.strictEqual(E.coachLevel('medium', 'easy'), 'hard');
    assert.strictEqual(E.coachLevel(undefined, undefined), 'medium');
    for (const c of ['easy', 'medium', 'hard']) for (const k of ['medium', 'hard', 'expert']) {
      assert(E.LEVELS.indexOf(E.coachLevel(c, k)) >= Math.min(E.LEVELS.indexOf(c) + 1, 3), `coach ${k} against computer ${c}`);
    }
    assert(E.analysisMs('hard', 9) > E.analysisMs('medium', 9) && E.analysisMs('expert', 9) > E.analysisMs('hard', 9));
    assert(E.analysisMs('medium', 19) > E.analysisMs('medium', 9));
    assert.strictEqual(E.analysisMs('medium', 9), 1500);
    const r = await E.suggest(E.newState(9, 0), 1, { level: 'expert', ms: 40 });
    assert(r.move >= 0, 'expert level gives a move');
  });
  await t('coach understands common questions', () => {
    const ask = (q, n) => C.reply(q, { n: n || 9 });
    assert.strictEqual(ask('give me a hint').action, 'hint');
    assert.strictEqual(ask('who is winning?').action, 'analyse');
    assert.strictEqual(ask('review my moves').action, 'review');
    assert.strictEqual(ask('can I play D4?').arg, 48);
    assert.strictEqual(ask('play e5').action, 'play');
    assert.deepStrictEqual(ask('start a 13x13 hard game').arg, { size: 13, level: 'hard' });
    assert.strictEqual(ask('lesson 4').arg.id, 'groups');
    assert(/one liberty/.test(ask('what is atari').text));
    assert(/rule-based/.test(ask('blah blah').text));
    assert.strictEqual(ask('Teach me').action, 'teach');
    assert.strictEqual(ask('teach me the basics of go').action, 'teach');
    assert.strictEqual(ask('I am a beginner').action, 'teach');
    assert.strictEqual(ask('what happens if I play D4?').action, 'explore');
    assert.strictEqual(ask('explore D4').arg, 48);
    assert.strictEqual(ask('teach me about ko').arg.id, 'ko');
    assert.strictEqual(ask('back to the game').action, 'exit');
    assert(!/hint/i.test(ask('help').text) && !/analyse/i.test(ask('help').text), 'help must not list everything');
    assert(/Why the first move usually goes in a corner/.test(ask('Explain the first move in more detail').text));
    assert(/corner/.test(ask("what's the first move?").text));
    assert(/Atari is a warning/.test(C.reply('tell me more', { n: 9, topic: 'atari' }).text));
    assert.strictEqual(C.reply('what is ko?', { n: 9 }).topic, 'ko');
    assert.strictEqual(ask('lesson 16').arg.id, 'firstmove');
  });
  await t('coach describes points and weak groups', () => {
    const s = LS.setup(LS.list.find(l => l.id === 'capture'));
    assert(/captures 1 stone/.test(C.describePoint(E, s, LS.P(9, 4, 5), 1)));
    const a = LS.setup(LS.list.find(l => l.id === 'atari'));
    assert(/atari/.test(C.weakReport(E, a, 1)));
  });
  await t('coach answers questions about a lesson', () => {
    const L = LS.list.find(l => l.id === 'eyes'), s = LS.setup(L), shown = LS.marksFor(L, s), marks = {};
    for (const k of Object.keys(shown)) marks[shown[k]] = +k;
    const info = { id: 'eyes', n: s.n, s, marks, task: L.task };
    const why = C.lessonReply(E, 'What happens when White plays at A? Why is it illegal?', info).text;
    assert(/A is illegal for white/.test(why) && /suicide/.test(why) && /liberty left \(B\)/.test(why));
    assert(/two separate empty points/.test(C.lessonReply(E, "I don't understand", info).text));
    assert.strictEqual(C.lessonReply(E, 'hint please', info).action, 'hint');
    assert.strictEqual(C.lessonReply(E, 'what is atari', info), null);
    const plain = { id: 'strategy', n: 9, s, marks: {}, task: '', hasHint: false };
    assert.strictEqual(C.lessonReply(E, 'hint', plain).action, undefined);
    assert(/C3, G3, C7 or G7/.test(C.lessonReply(E, 'Where should I move first?', plain).text));
    assert.strictEqual(C.reply('where should I move first?', { n: 9 }).action, 'hint');
  });
  await t('commentary explains moves in plain language', () => {
    const open = E.newState(9, 0);
    const corner = CM.render(CM.describeMove(E, open, 56, 1), { bullets: 3 });
    assert(/claims the empty lower left corner/.test(corner) && /third line/.test(corner));
    assert(/first line/.test(CM.render(CM.describeMove(E, open, 72, 1), { bullets: 3 })), 'edge warning');
    const cap = LS.setup(LS.list.find(l => l.id === 'capture'));
    assert(/captures 1 stone/.test(CM.describeMove(E, cap, LS.P(9, 4, 5), 1).points[0]));
    const conn = LS.setup(LS.list.find(l => l.id === 'connect'));
    assert(/joins your groups/.test(CM.describeMove(E, conn, LS.P(9, 4, 3), 1).points[0]));
    const cut = LS.setup(LS.list.find(l => l.id === 'cut'));
    assert(/cutting them apart/.test(CM.describeMove(E, cut, LS.P(9, 4, 3), 2).points[0]));
    const sa = E.newState(5, 0); sa.board[LS.P(5, 1, 0)] = 2; sa.board[LS.P(5, 0, 2)] = 2;
    const warn = CM.describeMove(E, sa, LS.P(5, 0, 0), 1);
    assert(warn.urgent && /only one liberty/.test(warn.warning));
    assert(/More about/.test(CM.deepDive(E, open, 56, 1)) && /What may happen next/.test(CM.deepDive(E, open, 56, 1)));
    assert(/Stones: you/.test(CM.positionSummary(E, open, 1)));
    assert(/stronger idea/.test(CM.compare(E, open, 72, 56, 1)));
  });
  await t('coach routes position and checklist questions', () => {
    assert.strictEqual(C.reply('explain the position', { n: 9 }).action, 'summary');
    assert.strictEqual(C.reply('what should I be thinking about?', { n: 9 }).action, 'think');
  });
  await t('the teach-me introduction offers its choices and reads typed answers', () => {
    assert(/weiqi/.test(INTRO.WELCOME) && /igo/.test(INTRO.WELCOME) && /baduk/.test(INTRO.WELCOME));
    assert.deepStrictEqual(INTRO.OPTIONS.map(o => o.key), ['rules', 'history', 'play', 'lessons', 'kifu']);
    const keys = ['rules', 'history', 'play', 'lessons', 'kifu'];
    keys.forEach((k, i) => assert.strictEqual(INTRO.match(String(i + 1)), k, 'number ' + (i + 1)));
    assert.strictEqual(INTRO.match('History of Go'), 'history');
    assert.strictEqual(INTRO.match('basic rules'), 'rules');
    assert.strictEqual(INTRO.match('Play a game'), 'play');
    assert.strictEqual(INTRO.match('lessons and puzzles'), 'lessons');
    assert.strictEqual(INTRO.match('famous games'), 'kifu'); assert.strictEqual(INTRO.match('game records'), 'kifu'); assert.strictEqual(INTRO.match('Kifu'), 'kifu');
    assert.strictEqual(INTRO.match('6'), null);
    assert.strictEqual(INTRO.match('play e5'), null);
    assert.strictEqual(INTRO.match('what is ko?'), null);
    assert.strictEqual(INTRO.match(''), null);
  });
  await t('teach me phrases open the introduction', () => {
    const ask = q => C.reply(q, { n: 9 });
    for (const q of ['teach me', 'Can you teach me?', 'please teach me', 'I want to learn Go', 'Could you teach me the basics of Go?']) assert.strictEqual(ask(q).action, 'teach', q);
    assert.strictEqual(ask('teach me').text, '');
    assert.strictEqual(ask('teach me about ko').arg.id, 'ko');
  });
  await t('history.md is read into a page whose sources all check out', () => {
    const md = require('fs').readFileSync(__dirname + '/history.md', 'utf8');
    const page = HISTORY.parse(md);
    assert.strictEqual(page.title, 'A history of Go');
    assert(page.blocks.some(b => b.t === 'lead') && page.blocks.filter(b => b.t === 'h').length >= 6 && page.blocks.some(b => b.t === 'refs'));
    assert(page.refs.length >= 11);
    assert.deepStrictEqual(HISTORY.problems(page), [], 'fix history.md: ' + HISTORY.problems(page).join(' '));
  });
  await t('the history reader understands headings, lists, comments and references', () => {
    const p = HISTORY.parse('<!-- note\n## not a heading -->\n# T\n\nIntro [1].\n\n## A\n\nOne\ntwo.\n\n### B\n\n- x [1]\n- y\n\nAfter.\n\n## References\n\n1. Name | Pub | https://example.org/a\n');
    assert.strictEqual(p.title, 'T');
    assert.deepStrictEqual(p.blocks.map(b => b.t), ['lead', 'h', 'p', 'h3', 'ul', 'p', 'h', 'refs']);
    assert.strictEqual(p.blocks[2].text, 'One two.');
    assert.deepStrictEqual(p.blocks[4].items, ['x [1]', 'y']);
    assert.deepStrictEqual(p.refs, [{ n: 1, title: 'Name', by: 'Pub', url: 'https://example.org/a' }]);
    assert.deepStrictEqual(HISTORY.problems(p), []);
    const bad = HISTORY.parse('# T\n\nText [2].\n\n## References\n\n1. A | B | http://insecure.example\n');
    assert(HISTORY.problems(bad).length >= 3, 'a missing source, an uncited source and a link that is not https must all be reported');
  });
  await t('the guide explains moves in plain words and defines each term once', () => {
    const open = GUIDE.opening({ handicap: 5, human: 1, computerFirst: true });
    assert(/handicap/.test(open) && /Pass/.test(open) && /White moves first/.test(open));
    const cl = LS.list.find(l => l.id === 'capture'), i = LS.P(9, 4, 5), seen = {};
    const s1 = LS.setup(cl), m1 = GUIDE.afterHuman(E, s1, i, E.play(s1, i), seen);
    assert(/captured 1 stone/.test(m1) && /A liberty is an empty point/.test(m1) && /taken off the board/.test(m1) && /column/.test(m1));
    const s2 = LS.setup(cl), m2 = GUIDE.afterHuman(E, s2, i, E.play(s2, i), seen);
    assert(/captured 1 stone/.test(m2) && !/A liberty is an empty point/.test(m2) && !/column/.test(m2), 'terms must be defined only once');
    const a = E.newState(9, 0);
    a.board[LS.P(9, 4, 4)] = 1; a.board[LS.P(9, 4, 3)] = 2; a.board[LS.P(9, 3, 4)] = 2; a.turn = 2;
    const ra = E.play(a, LS.P(9, 5, 4));
    assert(ra.ok);
    const warn = GUIDE.afterComputer(E, a, LS.P(9, 5, 4), ra, 1, {});
    assert(/Warning/.test(warn) && /in atari/.test(warn) && /E4/.test(warn), 'the learner is told how to rescue the stone');
    const b = E.newState(9, 0);
    assert(/very edge/.test(GUIDE.afterHuman(E, b, 4, E.play(b, 4), {})));
    const c = E.newState(9, 5), rc = E.play(c, LS.P(9, 4, 6));
    assert(/Your turn/.test(GUIDE.afterComputer(E, c, LS.P(9, 4, 6), rc, 1, {})) && /Tip:/.test(GUIDE.afterComputer(E, c, LS.P(9, 4, 6), rc, 1, {})));
    assert(/komi \(6\.5 points\)/.test(GUIDE.scoring(6.5)) && /passes/.test(GUIDE.computerPass({})) && /passed/.test(GUIDE.humanPass()));
  });
  await t('every script the page loads parses, and is saved for offline use', () => {
    const fs = require('fs'), vm = require('vm');
    const html = fs.readFileSync(__dirname + '/index.html', 'utf8'), sw = fs.readFileSync(__dirname + '/sw.js', 'utf8');
    const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
    assert(files.length > 20, 'the script list in index.html was not found');
    for (const f of files) {
      new vm.Script(fs.readFileSync(__dirname + '/' + f, 'utf8'), { filename: f });
      assert(sw.includes("'" + f + "'"), f + ' is missing from the offline list in sw.js');
    }
  });
  await t('SGF records are read, written and replayed', () => {
    const SAMPLE = '(;GM[1]FF[4]SZ[9]KM[5.5]HA[2]AB[cc][gg]PB[Black Name]PW[White\\]Name]DT[2001-02-03]RE[W+R]C[a comment]\n;W[ee];B[ed](;W[de];B[tt])(;W[fd];B[ff]))';
    const g = SGF.parse(SAMPLE);
    assert.strictEqual(g.n, 9); assert.strictEqual(g.komi, 5.5); assert.strictEqual(g.handicap, 2);
    assert.deepStrictEqual(g.setupB, [2 * 9 + 2, 6 * 9 + 6]);
    assert.strictEqual(g.info.PW, 'White]Name'); assert.strictEqual(g.info.RE, 'W+R'); assert(!('C' in g.info));
    assert.deepStrictEqual(g.moves, [{ c: 2, i: 40 }, { c: 1, i: 31 }, { c: 2, i: 39 }, { c: 1, i: -1 }], 'only the first branch is kept, and tt is a pass');
    const h = SGF.parse(SGF.toSGF(g));
    assert.deepStrictEqual(h.moves, g.moves); assert.deepStrictEqual(h.setupB, g.setupB); assert.strictEqual(h.info.PW, g.info.PW);
    assert.strictEqual(h.komi, 5.5); assert.strictEqual(h.handicap, 2);
    const r = SGF.replay(E, g);
    assert(r.ok && r.applied === 4 && r.s.board[40] === 2 && r.s.board[2 * 9 + 2] === 1 && r.s.passes === 1);
    assert.strictEqual(SGF.replay(E, g, 2).applied, 2);
    const cap = SGF.replay(E, SGF.parse('(;SZ[5];B[bc];W[cc];B[dc];W[aa];B[cb];W[ab];B[cd])'));
    assert(cap.ok && cap.s.caps[1] === 1 && cap.s.board[12] === 0, 'a capture is replayed');
    const bad = SGF.replay(E, SGF.parse('(;SZ[5];B[cc];W[cc];B[aa])'));
    assert(!bad.ok && bad.applied === 1, 'a move on an occupied point stops the replay');
    assert.strictEqual(SGF.parse('hello'), null); assert.strictEqual(SGF.parse('(;SZ[40])'), null);
    assert.strictEqual(SGF.parse('(;B[dd])').n, 19);
  });
  await t('Kifu results are put in plain words, and the list page is built from the index', () => {
    const R = KIFU.resultText;
    assert.strictEqual(R('B+R'), 'Black wins by resignation'); assert.strictEqual(R('W+0.5'), 'White wins by 0.5');
    assert.strictEqual(R('Jigo'), 'Draw (jigo)'); assert.strictEqual(R('Void'), 'No result'); assert.strictEqual(R('B+T'), 'Black wins on time');
    assert.strictEqual(R('W+ (but Black does not lose)'), 'White wins (but Black does not lose)'); assert.strictEqual(R('B+1 5/6'), 'Black wins by 1 5/6');
    assert.strictEqual(R(''), 'No result recorded'); assert.strictEqual(R('W+Resign'), 'White wins by resignation');
    const index = { categories: [{ title: 'Cat A', blurb: 'Blurb', games: [
      { id: 'k001', title: 'T1', note: 'N1', black: 'A', white: 'B', date: '1846', result: 'B+2', moves: 325, size: 19, handicap: 0 },
      { id: 'k002', title: 'T2', note: 'N2', black: 'C', white: 'D', date: '2000', result: 'W+R', moves: 54, size: 9, handicap: 2 }] }] };
    const page = KIFU.listPage(index);
    assert.deepStrictEqual(page.blocks.map(b => b.t), ['lead', 'toc', 'h', 'p', 'cards', 'h', 'p', 'refs']);
    assert(/2 famous games/.test(page.blocks[0].text) && page.blocks[1].items[0].id === 'cat1' && page.blocks[2].id === 'cat1');
    assert.strictEqual(page.blocks[4].items[1].meta, 'C (Black) against D (White) · 2000 · White wins by resignation · 54 moves · 2 handicap stones · 9×9 board');
    assert(page.blocks[4].items[0].meta.startsWith('A (Black) against B (White) · 1846 · Black wins by 2 · 325 moves'));
    assert(/^https:\/\//.test(page.blocks[7].items[0].url) && /\[1\]/.test(page.blocks[0].text));
  });
  await t('a Kifu game can be stepped through, explained, analysed and varied', async () => {
    const msgs = []; let left = 0, listed = 0;
    const k = KIFU.create({ E, SGF, CM, C, EXPLORE, say: m => msgs.push(m), render() {}, ms: 40, analysisMs: () => 120, leave: () => { left++; }, openList: () => { listed++; } });
    const last = () => msgs[msgs.length - 1];
    k.load({ title: 'A short game', note: 'A test.' }, SGF.parse('(;SZ[9]KM[6.5]PB[Ann]PW[Bo]DT[2020-01-02]RE[W+R];B[ee];W[ce];B[ec];W[cc];B[cg];W[gc])'));
    assert(k.on && k.pos === 0 && k.limit === 6 && /Ann \(Black\) against Bo \(White\)/.test(msgs[0]) && /A test\./.test(msgs[0]));
    await k.next(); assert.strictEqual(k.pos, 1); assert.strictEqual(k.state().board[40], 1);
    k.goto(4); assert.strictEqual(k.pos, 4); k.goto(2); assert.strictEqual(k.pos, 2); k.goto(99); assert.strictEqual(k.pos, 6);
    await k.next(); assert(/last move of the game/.test(last()) && /White wins by resignation/.test(last()));
    k.goto(3); assert(/move 3 of 6/.test(k.status()) && k.canBack() && k.canNext());
    k.explain(false); assert(/Move 3: Black plays/.test(last()));
    k.explain(true); assert(/More about/.test(last()));
    await k.analyse();
    assert(Object.keys(k.K.marks).length >= 1 && /Analysis after move 3/.test(last()) && /In the game: /.test(last()));
    k.goto(2); assert.deepStrictEqual(k.K.marks, {}, 'the lettered points go when the position changes');
    k.tap(30); await k.done();
    assert(k.inVariation && k.state().board[30] === 1 && /trying another move/.test(k.status()));
    await k.next(); await k.done(); assert.strictEqual(k.state().moves.length, 4);
    assert.strictEqual(k.ask('back to game'), true); await k.done(); assert(!k.inVariation && k.pos === 2);
    assert.strictEqual(k.ask('go to move 4'), true); assert.strictEqual(k.pos, 4);
    assert.strictEqual(k.ask('back 2'), true); assert.strictEqual(k.pos, 2);
    assert.strictEqual(k.ask('what if I play D4?'), true); await k.done(); assert(k.inVariation);
    assert.strictEqual(k.ask('exit'), true); assert.strictEqual(left, 1);
    assert.strictEqual(k.ask('famous games'), true); assert.strictEqual(listed, 1);
    assert.strictEqual(k.ask('blah blah'), false);
    k.load({ title: 'Partial' }, SGF.parse('(;SZ[5];B[cc];W[cc];B[aa])'));
    k.goto(5); assert.strictEqual(k.pos, 1); assert(/1\+/.test(k.status()) && /refuse/.test(msgs[msgs.length - 1]));
    k.exit(); assert(!k.on);
  });
  await t('the Kifu shortlist is well formed', () => {
    const MK = require('./make-kifu.js');
    const cats = MK.parsePicks(require('fs').readFileSync(__dirname + '/kifu-picks.md', 'utf8')), seen = new Set();
    const games = cats.flatMap(c => c.games);
    assert(cats.length >= 5 && games.length >= 90, 'expected about 100 games, found ' + games.length);
    for (const c of cats) {
      assert(c.title && c.blurb, 'every category needs a title and a description: ' + c.title);
      for (const g of c.games) {
        assert(/\.sgf$/.test(g.src) && g.title && g.note, 'incomplete line in kifu-picks.md: ' + g.src);
        assert(!seen.has(g.src), 'listed twice: ' + g.src); seen.add(g.src);
        assert(!/21x21/.test(g.src), 'boards bigger than 19x19 cannot be labelled: ' + g.src);
      }
    }
  });
  await t('make-kifu builds the collection from a shortlist', () => {
    const fs = require('fs'), os = require('os'), path = require('path'), MK = require('./make-kifu.js');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kifu-')), src = path.join(dir, 'src'), out = path.join(dir, 'out');
    fs.mkdirSync(src); fs.mkdirSync(out);
    fs.writeFileSync(path.join(src, 'a.sgf'), '(;SZ[9]KM[6.5]PB[Ann]PW[Bo]DT[2020]RE[B+R]C[x];B[ee];W[ce];B[ec])');
    fs.writeFileSync(path.join(src, 'b.sgf'), '(;SZ[5];B[cc];W[cc])');
    const picks = '## Cat\nBlurb here.\n- a.sgf | First game | Note one.\n- b.sgf | Second game | Note two.\n- missing.sgf | Gone | Note.\n';
    const r = MK.build({ cats: MK.parsePicks(picks), sourceDir: src, outDir: out, E, SGF });
    assert.strictEqual(r.index.categories[0].games.length, 2);
    const e = r.index.categories[0].games[0];
    assert(e.id.startsWith('k001-first-game') && e.black === 'Ann' && e.moves === 3 && e.legal === 3 && e.result === 'B+R' && e.size === 9);
    assert.strictEqual(r.index.categories[0].games[1].legal, 1);
    assert(r.errors.some(x => /missing\.sgf/.test(x)) && r.warnings.some(x => /b\.sgf/.test(x)));
    const text = fs.readFileSync(path.join(out, e.id + '.sgf'), 'utf8');
    assert(!/C\[x\]/.test(text) && SGF.parse(text).moves.length === 3, 'comments are dropped and the game is kept');
  });
  await t('the built Kifu index, when it exists, matches its game files', () => {
    const fs = require('fs'), p = __dirname + '/kifu/index.json';
    if (!fs.existsSync(p)) return;
    const index = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const c of index.categories) for (const e of c.games) {
      assert(fs.existsSync(__dirname + '/' + e.file), 'missing game file ' + e.file);
      const g = SGF.parse(fs.readFileSync(__dirname + '/' + e.file, 'utf8'));
      assert(g && g.n <= 19 && g.moves.length === e.moves, 'the file and the index disagree for ' + e.id + ': run make-kifu.js again');
      assert(e.legal >= 1 && e.legal <= e.moves && SGF.replay(E, g).applied === e.legal, 'replay differs for ' + e.id + ': run make-kifu.js again');
    }
  });
  await t('kifu phrases open the famous games', () => {
    for (const q of ['kifu', 'show me some famous games', 'I want to study pro games', 'game records']) assert.strictEqual(C.reply(q, { n: 9 }).action, 'kifu', q);
    assert.notStrictEqual(C.reply('start a new game', { n: 9 }).action, 'kifu');
    assert.notStrictEqual(C.reply('play a game', { n: 9 }).action, 'kifu');
  });
  const pt = TEACH.pt;
  const sceneOf = (id, n) => CUR.steps.find(x => x.id === id).scenes[n];
  const make = sc => {
    const s = E.newState(9, 0);
    for (const c of sc.black || []) s.board[pt(c)] = 1;
    for (const c of sc.white || []) s.board[pt(c)] = 2;
    s.turn = sc.turn || 1;
    return s;
  };
  await t('teaching positions are legal', () => {
    for (const step of CUR.steps) for (const sc of step.scenes) {
      const seen = new Set();
      for (const c of [...(sc.black || []), ...(sc.white || [])]) { assert(!seen.has(c), step.id + ': duplicate ' + c); seen.add(c); }
      const s = make(sc);
      for (const g of E.allGroups(9, s.board)) assert(g.libs.length > 0, step.id + ': a group starts with no liberties');
    }
  });
  await t('teaching positions behave as taught', () => {
    let s = make(sceneOf('capture', 0)); assert.strictEqual(E.play(s, pt('E6')).captured.length, 1);
    s = make(sceneOf('capture', 1)); assert.strictEqual(E.play(s, pt('E7')).captured.length, 2);
    s = make(sceneOf('escape', 0)); E.play(s, pt('E6'));
    assert.strictEqual(E.flood(E.geom(9), s.board, pt('E5')).libs.length, 3);
    s = make(sceneOf('territory', 0));
    const sc = E.scoreArea(9, s.board);
    assert.strictEqual(sc.black, 36); assert.strictEqual(sc.white, 36);
    s = make(sceneOf('eyes', 0)); assert(E.play(s, pt('D1')).ok);
    for (const c of ['A1', 'C1']) assert.strictEqual(E.tryPlay(E.geom(9), s.board, pt(c), 2, s.ko).reason, 'suicide');
    s = make(sceneOf('rules', 0)); assert.strictEqual(E.play(s, pt('E5')).reason, 'suicide');
    s = make(sceneOf('rules', 1)); assert.strictEqual(E.play(s, pt('E5')).captured.length, 1);
    assert.strictEqual(E.play(s, pt('D5')).reason, 'ko');
  });
  await t('the teacher walks through every step', () => {
    const msgs = []; let started = 0;
    const sess = TEACH.create({ E, CM, C, CUR, say: m => msgs.push(m), startGame: () => { started++; }, save: () => {}, load: () => null });
    sess.start();
    assert(sess.on);
    for (let k = 0; k < 60 && !started; k++) {
      const tk = CUR.steps[sess.T.step].scenes[sess.T.scene].task;
      if (tk) {
        assert.strictEqual(sess.ask('next'), true);
        assert(!sess.T.solved, 'next must wait for the task');
        if (tk.type === 'answer') sess.ask(String(tk.answer));
        else if (tk.type === 'move') sess.tap(pt(tk.solution[0]));
        else if (tk.type === 'try') sess.tap(pt(tk.at));
        else {
          const b = sess.state().board;
          let i = (tk.praise || []).map(pt).find(x => !b[x]);
          if (i === undefined) i = b.findIndex(v => !v);
          sess.tap(i);
        }
        assert(sess.T.solved, 'task not solved in ' + CUR.steps[sess.T.step].id);
      }
      sess.ask('next');
    }
    assert.strictEqual(started, 1);
    assert(msgs.some(m => /Step 9 of 9/.test(m)));
  });
  await t('the teacher answers questions and explores moves', () => {
    const msgs = [];
    const sess = TEACH.create({ E, CM, C, CUR, say: m => msgs.push(m), startGame() {}, save() {}, load: () => null });
    sess.start(); sess.ask('step 3');
    assert.strictEqual(sess.T.step, 2);
    assert.strictEqual(sess.ask('hint'), true); assert.deepStrictEqual(sess.T.hint, [pt('E6')]);
    assert.strictEqual(sess.ask('what if I play C3?'), true); assert(/C3/.test(msgs[msgs.length - 1]));
    sess.tap(pt('A1'));
    assert(sess.T.wrong && !sess.T.solved);
    sess.ask('show me'); assert(sess.T.solved && !sess.T.wrong);
    assert.strictEqual(sess.ask('explain more'), true); assert(/Capturing helps/.test(msgs[msgs.length - 1]));
    assert.strictEqual(sess.ask('what is a liberty?'), false);
    sess.ask('undo'); assert(!sess.T.solved);
    assert.strictEqual(sess.ask('step 99'), true);
  });
  await t('show me never picks an occupied point', () => {
    const sess = TEACH.create({ E, CM, C, CUR, say() {}, save() {}, load: () => null });
    sess.start(); sess.ask('skip');
    assert.strictEqual(sess.T.scene, 1);
    sess.ask('show me');
    assert(sess.T.solved && sess.state().moves.length === 1);
  });
  await t('exploring a move steps through replies and alternatives', async () => {
    const msgs = []; let left = 0;
    const base = E.newState(9, 0);
    const ex = EXPLORE.create({ E, CM, C, say: m => msgs.push(m), leave: () => { left++; }, ms: 40 });
    assert.strictEqual(ex.start(base, pt('C3')), true);
    await ex.done();
    assert(ex.on && ex.T.pos === 1 && ex.state().board[pt('C3')] === 1);
    ex.ask('next'); await ex.done();
    assert.strictEqual(ex.T.pos, 2); assert.strictEqual(ex.T.plies.length, 2);
    const reply = ex.T.plies[1].move;
    ex.ask('another'); await ex.done();
    assert.notStrictEqual(ex.T.plies[1].move, reply);
    ex.ask('back'); await ex.done();
    assert.strictEqual(ex.T.pos, 1);
    ex.tap(pt('E5')); await ex.done();
    assert.strictEqual(ex.T.pos, 2); assert.strictEqual(ex.state().board[pt('E5')], 2);
    assert.strictEqual(base.board[pt('C3')], 0, 'the real game must stay untouched');
    assert.strictEqual(ex.ask('back to game'), true); assert.strictEqual(left, 1);
    assert(msgs.some(m => /Exploring C3/.test(m)));
    assert.strictEqual(EXPLORE.create({ E, CM, C, say() {} }).start(E.newState(9, 0), -1), false);
  });
  console.log(failed ? failed + ' FAILED, ' + passed + ' passed' : 'all ' + passed + ' tests passed');
  process.exit(failed ? 1 : 0);
})();
