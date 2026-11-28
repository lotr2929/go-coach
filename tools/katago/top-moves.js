/* KataGo's top moves at every turn of a game, for the lesson games (tools/lessons/build-game-*.js).
   Building only; never part of the app. Needs KataGo and the human model in /opt/katago (cloud) or KATAGO_DIR.
   Usage: node tools/katago/top-moves.js <out.json> <visits> <size> <moves, e.g. "C7 G3 G7 ...">
   Writes { size, komi, visits, moves, turns: [{ turn, side, top: [{ move, lead }], played, loss }] }, where lead is the score lead
   for the side to move after that move and loss is how many points the game's move is worse than KataGo's first choice
   (null if the game's move is not among the moves KataGo searched). Settings: area scoring (Chinese rules), komi 6.5,
   the human model at its strongest (rank_9d) with search, as rank-puzzles.js. */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const KG = process.env.KATAGO_DIR || '/opt/katago';
const [out, visits = '400', size = '9', movesArg = ''] = process.argv.slice(2);
if (!out || !movesArg) { console.error('Usage: node tools/katago/top-moves.js <out.json> <visits> <size> "<moves>"'); process.exit(1); }
const n = +size, moves = movesArg.split(/\s+/).filter(Boolean);

const p = spawn(path.join(KG, 'katago'), ['analysis', '-config', 'analysis_example.cfg', '-model', 'human.bin.gz', '-human-model', 'human.bin.gz',
  '-override-config', 'logDir=/tmp/katago-logs,numAnalysisThreads=4,numSearchThreadsPerAnalysisThread=1'],
  { cwd: KG, env: Object.assign({}, process.env, { LD_LIBRARY_PATH: KG + '/lib' }) });
let err = '', buf = '';
const got = new Map();
p.stderr.on('data', d => { err = (err + d).slice(-2000); });
p.on('exit', code => { if (got.size < moves.length + 1) { console.error('KataGo stopped (code ' + code + '):\n' + err); process.exit(1); } });
p.stdout.on('data', d => {
  buf += d; let k;
  while ((k = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1);
    if (!line.startsWith('{')) continue;
    const r = JSON.parse(line);
    if (r.error) { console.error(line); process.exit(1); }
    if (r.isDuringSearch) continue;
    const t = r.turnNumber, side = t % 2 ? 'W' : 'B', best = r.moveInfos[0], mine = r.moveInfos.find(m => m.move === moves[t]);
    const rec = { turn: t, side, top: r.moveInfos.slice(0, 5).map(m => ({ move: m.move, lead: +m.scoreLead.toFixed(1) })), played: moves[t] || null,
      loss: mine ? +(best.scoreLead - mine.scoreLead).toFixed(1) : null };
    got.set(t, rec);
    console.log(`${t + 1} ${side} ${rec.played || '(end)'}  loss ${rec.loss}  top ${rec.top.map(m => m.move + '(' + m.lead + ')').join(' ')}`);
    if (got.size === moves.length + 1) {
      const turns = [...got.values()].sort((a, b) => a.turn - b.turn);
      fs.writeFileSync(out, JSON.stringify({ size: n, komi: 6.5, visits: +visits, moves, turns }, null, 1) + '\n');
      console.log('Wrote ' + out);
      p.kill();
    }
  }
});
p.stdin.write(JSON.stringify({ id: 'game', moves: moves.map((m, k) => [k % 2 ? 'W' : 'B', m]), rules: 'chinese', komi: 6.5, boardXSize: n, boardYSize: n,
  analyzeTurns: moves.map((_, k) => k).concat([moves.length]), maxVisits: +visits, overrideSettings: { humanSLProfile: 'rank_9d' } }) + '\n');
