/* Checks and ranks the busy-board puzzle candidates (find-atari.js) with KataGo's human-style model. For each position:
   1. Is the answer really good? A search (KataGo's own judgement) must find the answer within `maxLoss` points of its best
      move, so a puzzle never teaches a capture or an escape that is actually a mistake.
   2. How hard is it? The human-style model says how likely a player of each rank (20k, 15k, 10k, 5k, 1d) is to play the
      answer. The puzzle's level is the weakest rank that finds it at least half the time; below 20 kyu the model cannot
      tell levels apart, so those are split by how sure a 20k player is (Boon, 27 Nov 2026).
   Building only; never part of the app. Usage: node tools/katago/rank-puzzles.js [sizes=9,13] [visits=100] [maxLoss=1.5]
   Needs KataGo and the human model in /opt/katago (cloud) or KATAGO_DIR. Writes tools/katago/results/atari-ranked.json */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const KG = process.env.KATAGO_DIR || '/opt/katago';
const [sizesArg = '9,13', visits = '100', maxLoss = '1.5'] = process.argv.slice(2);
const sizes = sizesArg.split(',').map(Number);
const RES = path.join(__dirname, 'results');
const cands = JSON.parse(fs.readFileSync(path.join(RES, 'atari-candidates.json'), 'utf8')).filter(c => sizes.includes(c.n));
const PROFILES = ['rank_20k', 'rank_15k', 'rank_10k', 'rank_5k', 'rank_1d'];
const COLS = 'ABCDEFGHJKLMNOPQRST';
const gtp = (n, i) => COLS[i % n] + (n - ((i / n) | 0));

const p = spawn(path.join(KG, 'katago'), ['analysis', '-config', 'analysis_example.cfg', '-model', 'human.bin.gz', '-human-model', 'human.bin.gz',
  '-override-config', 'logDir=/tmp/katago-logs,numAnalysisThreads=2,numSearchThreadsPerAnalysisThread=2'],
  { cwd: KG, env: Object.assign({}, process.env, { LD_LIBRARY_PATH: KG + '/lib' }) });
let err = '';
p.stderr.on('data', d => { err = (err + d).slice(-2000); });
p.on('exit', code => { if (pending.size) { console.error('\nKataGo stopped (code ' + code + '):\n' + err); process.exit(1); } });
const pending = new Map();
let buf = '';
p.stdout.on('data', d => {
  buf += d; let k;
  while ((k = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1);
    if (!line.startsWith('{')) continue;
    const r = JSON.parse(line);
    if (r.isDuringSearch) continue;
    const cb = pending.get(r.id); if (cb) { pending.delete(r.id); cb(r); }
  }
});
let qid = 0;
const ask = (c, extra) => new Promise(res => {
  const id = 'q' + (qid++), stones = [];
  [...c.board].forEach((v, i) => { if (v !== '0') stones.push([v === '1' ? 'B' : 'W', gtp(c.n, i)]); });
  pending.set(id, res);
  p.stdin.write(JSON.stringify(Object.assign({ id, moves: [], initialStones: stones, initialPlayer: c.colour === 1 ? 'B' : 'W', rules: 'japanese', komi: 6.5, boardXSize: c.n, boardYSize: c.n }, extra)) + '\n');
});

(async () => {
  const out = [];
  for (const [i, c] of cands.entries()) {
    const names = c.answer.map(a => gtp(c.n, a));
    const s = await ask(c, { maxVisits: +visits, overrideSettings: { humanSLProfile: 'rank_9d' } }); /* the human model needs a level even for its own search: the strongest */
    const infos = s.moveInfos || [], best = infos[0];
    const good = names.filter(nm => { const m = infos.find(x => x.move === nm); return m && best && best.scoreLead - m.scoreLead <= +maxLoss; });
    const rec = { id: `${c.game}-${c.turn}`, game: c.game, turn: c.turn, n: c.n, kind: c.kind, size: c.size, stones: c.stones, answer: names, good, best: best && best.move };
    if (good.length) {
      rec.found = {};
      for (const prof of PROFILES) {
        const h = await ask(c, { maxVisits: 1, includePolicy: true, overrideSettings: { humanSLProfile: prof } });
        rec.found[prof.slice(5)] = +c.answer.filter(a => good.includes(gtp(c.n, a))).reduce((t, a) => t + Math.max(0, h.humanPolicy[a]), 0).toFixed(3);
      }
      const lvl = Object.entries(rec.found).find(([, v]) => v >= 0.5);
      rec.level = !lvl ? 'harder than 1d' : lvl[0] !== '20k' ? lvl[0] : rec.found['20k'] >= 0.8 ? '30-25k' : '25-20k';
    }
    out.push(rec);
    process.stdout.write(`\r${i + 1}/${cands.length}`);
  }
  p.kill();
  fs.writeFileSync(path.join(RES, 'atari-ranked.json'), JSON.stringify(out, null, 1));
  const ok = out.filter(r => r.level);
  console.log(`\n${ok.length} of ${out.length} passed KataGo's check (answer within ${maxLoss} points of the best move).`);
  const by = ok.reduce((m, r) => (m[r.kind + ' ' + r.level] = (m[r.kind + ' ' + r.level] || 0) + 1, m), {});
  console.log(JSON.stringify(by));
})();
