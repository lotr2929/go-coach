/* Plays one game: Go Coach's computer (level) against KataGo imitating a human rank.
   Usage: node tools/katago/match.js <level> <rank e.g. 15k> <gocoachColour b|w> <handicap> <size>
   Prints one JSON line with the result. Measurement only; not part of the app. */
const { spawn } = require('child_process');
const path = require('path');
const E = require('../../engine.js');
const KG = process.env.KATAGO_DIR || '/opt/katago', LOGS = process.env.KATAGO_LOGS || '/tmp/katago-logs';
const [level, rank, gcCol, hcap, size] = [process.argv[2], process.argv[3], process.argv[4], +process.argv[5] || 0, +process.argv[6] || 9];

function gtp() {
  const p = spawn(path.join(KG, 'katago'), ['gtp', '-model', 'human.bin.gz', '-human-model', 'human.bin.gz', '-config', 'gtp_human5k_example.cfg',
    '-override-config', `humanSLProfile=rank_${rank},delayMoveScale=0,delayMoveMax=0,lagBuffer=0,logDir=${LOGS},numSearchThreads=1,logAllGTPCommunication=false,maxVisits=8,rootNumSymmetriesToSample=1,numEigenThreadsPerModel=1`],
    { cwd: KG, env: Object.assign({}, process.env, { LD_LIBRARY_PATH: KG + '/lib' }) });
  let buf = '', waiting = [];
  p.stdout.on('data', d => {
    buf += d;
    let k;
    while ((k = buf.indexOf('\n\n')) >= 0) { const r = buf.slice(0, k).trim(); buf = buf.slice(k + 2); const w = waiting.shift(); if (w) w(r); }
  });
  p.stderr.on('data', () => {});
  const send = cmd => new Promise(res => { waiting.push(res); p.stdin.write(cmd + '\n'); });
  return { send, kill: () => p.kill() };
}
const fromGtp = (n, v) => {
  v = v.toUpperCase(); if (v === 'PASS') return -1;
  const L = 'ABCDEFGHJKLMNOPQRST', x = L.indexOf(v[0]), y = n - parseInt(v.slice(1), 10);
  return y * n + x;
};

(async () => {
  const n = size, s = E.newState(n, hcap), kg = gtp();
  const gc = gcCol === 'b' ? 1 : 2;
  const rules = JSON.stringify({ ko: 'SIMPLE', scoring: 'AREA', tax: 'NONE', suicide: false, hasButton: false, whiteHandicapBonus: '0', friendlyPassOk: true });
  for (const c of [`boardsize ${n}`, 'clear_board', `komi ${s.komi}`, `kata-set-rules ${rules}`]) {
    const r = await kg.send(c); if (!r.startsWith('=')) throw new Error(c + ' -> ' + r);
  }
  for (const p of E.handicapPoints(n, hcap)) await kg.send(`play B ${E.coord(n, p)}`);
  let result = null, moves = 0;
  while (!result) {
    const col = s.turn;
    if (moves >= n * n * 2) break;
    if (col === gc) {
      const r = await E.chooseMove(s, col, { level });
      const m = r ? r.move : -1;
      if (m < 0) E.pass(s); else if (!E.play(s, m).ok) { result = { error: 'gocoach illegal' }; break; }
      const a = await kg.send(`play ${col === 1 ? 'B' : 'W'} ${m < 0 ? 'pass' : E.coord(n, m)}`);
      if (!a.startsWith('=')) { result = { error: 'katago refused ' + a }; break; }
    } else {
      const a = (await kg.send(`genmove ${col === 1 ? 'B' : 'W'}`)).replace(/^=\s*/, '').trim();
      if (a.toLowerCase() === 'resign') { result = { winner: gc, how: 'resign' }; break; }
      const m = fromGtp(n, a);
      if (m < 0) E.pass(s); else if (!E.play(s, m).ok) { result = { error: 'katago move illegal here ' + a }; break; }
    }
    moves++;
    if (s.passes >= 2) break;
  }
  if (!result) {
    const fs = (await kg.send('final_score')).replace(/^=\s*/, '').trim();
    const w = fs[0] === 'B' ? 1 : fs[0] === 'W' ? 2 : 0;
    result = { winner: w, how: fs };
  }
  kg.kill();
  console.log(JSON.stringify(Object.assign({ level, rank, gc: gcCol, hcap, n, moves, gcWon: result.winner === gc }, result)));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ level, rank, error: String(e) })); process.exit(1); });
