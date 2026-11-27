/* Finds "decisive move" positions in a game record: where the move actually played is also KataGo's best, and the next
   best move is clearly worse. These become the Go Coach daily games (a single move, like a chess puzzle).
   Measurement and building only; never part of the app (tools/katago/README.md).
   Usage: node tools/katago/find-decisive.js <kifu id or file> [visits=150] [minGap=3] [model=small|big]
   Needs the laptop install in tools/katago/bin (see README). Writes tools/katago/results/decisive-<id>.json */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), BIN = path.join(__dirname, 'bin');
const [arg, visits = '150', minGap = '3', which = 'small'] = process.argv.slice(2);
if (!arg) { console.log('Usage: node tools/katago/find-decisive.js <kifu id or file> [visits] [minGap] [small|big]'); process.exit(1); }
const MODEL = path.join(BIN, which === 'big' ? 'b11c768h12nbt3tflrs-fson-silu.bin.gz' : 'b10c384h6nbttflrs.bin.gz');
const file = fs.existsSync(arg) ? arg : path.join(ROOT, 'kifu', arg.replace(/\.sgf$/, '') + '.sgf');
const sgf = fs.readFileSync(file, 'utf8');
const prop = k => { const m = sgf.match(new RegExp('(?:^|[^A-Z])' + k + '\\[([^\\]]*)\\]')); return m ? m[1] : ''; };
const size = +prop('SZ') || 19, komi = parseFloat(prop('KM')) || 6.5;
const COLS = 'ABCDEFGHJKLMNOPQRST';
const gtp = (c, r) => c + r < 0 ? 'pass' : COLS[c] + (size - r);
const pt = s => (s && s.length === 2 ? gtp(s.charCodeAt(0) - 97, s.charCodeAt(1) - 97) : 'pass');
const moves = [...sgf.matchAll(/;([BW])\[([a-z]{0,2})\]/g)].map(m => [m[1], pt(m[2])]);
const stones = col => { const m = sgf.match(new RegExp(col + '((?:\\[[a-z]{2}\\])+)')); return m ? [...m[1].matchAll(/\[([a-z]{2})\]/g)].map(x => [col[1], pt(x[1])]) : []; };
const initialStones = [...stones('AB'), ...stones('AW')];
const rules = /chinese/i.test(prop('RU')) ? 'chinese' : 'japanese';

const cfg = path.join(BIN, 'opencl', 'analysis_example.cfg');
const p = spawn(path.join(BIN, 'opencl', 'katago.exe'), ['analysis', '-config', cfg, '-model', MODEL, '-override-config', `homeDataDir=${path.join(BIN, 'data')},numAnalysisThreads=1,numSearchThreadsPerAnalysisThread=4`], { cwd: path.join(BIN, 'opencl') });
const turns = moves.map((_, i) => i), got = new Map();
let buf = '';
p.stderr.on('data', () => {});
p.stdout.on('data', d => {
  buf += d; let k;
  while ((k = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1);
    if (!line.startsWith('{')) continue;
    const r = JSON.parse(line);
    if (r.error) { console.error(r.error); p.kill(); process.exit(1); }
    if (r.isDuringSearch === false || r.isDuringSearch === undefined) got.set(r.turnNumber, r);
    if (got.size === turns.length) { p.kill(); finish(); }
  }
});
p.stdin.write(JSON.stringify({ id: 'g', moves, initialStones, rules, komi, boardXSize: size, boardYSize: size, analyzeTurns: turns, maxVisits: +visits, initialPlayer: moves[0] ? moves[0][0] : 'B' }) + '\n');
console.log(`${path.basename(file)}: ${moves.length} moves, ${which} net, ${visits} visits each`);

function finish() {
  const out = [];
  for (const t of turns) {
    const r = got.get(t), mi = (r.moveInfos || []).filter(m => m.visits > 0);
    if (mi.length < 2) continue;
    const best = mi[0], second = mi[1], actual = moves[t][1];
    const near = mi.filter(m => best.scoreLead - m.scoreLead <= 1).length; /* moves almost as good */
    out.push({ turn: t + 1, of: moves.length, colour: moves[t][0], played: actual, best: best.move, isBest: actual === best.move,
      gap: +(best.scoreLead - second.scoreLead).toFixed(1), second: second.move, prior: +best.prior.toFixed(3), near,
      lead: +best.scoreLead.toFixed(1), pv: best.pv.slice(0, 6) });
  }
  const picks = out.filter(o => o.isBest && o.gap >= +minGap).sort((a, b) => b.gap - a.gap);
  const dir = path.join(__dirname, 'results'); fs.mkdirSync(dir, { recursive: true });
  const id = path.basename(file, '.sgf');
  fs.writeFileSync(path.join(dir, `decisive-${id}.json`), JSON.stringify({ id, size, komi, visits: +visits, net: which, positions: out.length, picks }, null, 1));
  console.log(`${out.length} positions read; ${picks.length} decisive (played = best, gap >= ${minGap} points).`);
  for (const o of picks.slice(0, 6)) console.log(`  move ${o.turn}/${o.of} ${o.colour} ${o.best}: next best ${o.second} is ${o.gap} points worse (prior ${o.prior}, ${o.near} near-equal moves)`);
}
