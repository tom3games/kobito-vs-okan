// bot で難しさを測る。node tools/sim.mjs 24（2面は node tools/sim.mjs 24 2）
import { newRun, step, leftPct, grade, CFG } from '../shared/sim.js'
import { makeBot } from '../shared/bot.js'
const N = +process.argv[2] || 24, STAGE = +process.argv[3] || 1
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0 }
for (const kind of ['skilled', 'human', 'normal', 'first', 'masher', 'walker', 'idle']) {
  if (kind === 'human' && STAGE === 1 && !process.argv[4]) continue   // 1面の表は前と同じ並び
  let wins = 0; const T = [], sn = [], lefts = [], par = [], hp = [], grades = {}, by = {}
  for (let i = 0; i < N; i++) {
    const r = newRun(1000 + i * 37, { retry: i % 2 === 1, stage: STAGE }), bot = makeBot(kind, i + 1)
    let f = 0
    while (!r.over && f < 60 * 400) { const b = kind; void b; const inp = bot(r); step(r, inp); r.ev.length = 0; f++; if (r.mode === 'run' && kind === 'idle' && f > 300) { r.me.x = CFG.runEnd + 2.1 } if (r.mode === 'run' && kind === 'walker' && f > 3000) r.me.x = CFG.runEnd + 2.1 }
    T.push(r.fightT); if (r.won) { wins++; par.push(r.stats.parries); hp.push(r.hp); const g = grade(r).key; grades[g] = (grades[g] || 0) + 1; sn.push(r.stats.sneezes || 0) } else { lefts.push(leftPct(r)); by[r.lastBy] = (by[r.lastBy] || 0) + 1 }
  }
  console.log(`${kind.padEnd(8)} 勝ち ${wins}/${N} 戦闘の中央 ${med(T).toFixed(0)}秒 最短${Math.min(...T).toFixed(0)} 最長${Math.max(...T).toFixed(0)} | 負けの残り中央 ${med(lefts)}% | 弾き中央 ${med(par)} 残機中央 ${med(hp)} 判定${JSON.stringify(grades)} くしゃみ中央 ${med(sn)} やられ${JSON.stringify(by)}`)
}
