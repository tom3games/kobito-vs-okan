// 難しさを測る bot。node tools/sim.mjs と、検証の通しで使う
import { CFG } from './sim.js'
const PRO = {
  skilled: { react: 7, parry: 0.8, miss: 0, toe: true, face: true },
  normal: { react: 13, parry: 0.3, miss: 0.08, toe: false, face: false },
  first: { react: 24, parry: 0.05, miss: 0.24, toe: false, face: false }
}
export function makeBot(kind, seed = 1) {
  let s = (seed * 9301 + 49297) >>> 0
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const held = { left: false, right: false, jumpHeld: false }
  let holdT = 0, wander = 0, wdir = 1, tick = 0, plan = { dir: 0, jump: false, dash: false, parry: false }
  return function (r) {
    const inp = { left: false, right: false, jump: false, jumpHeld: false, dash: false }
    if (kind === 'idle') return inp
    if (kind === 'walker') { inp.right = r.mode === 'run' || r.me.x < CFG.arenaR - 1 && Math.sin(r.t * 0.7) > 0; inp.left = r.mode === 'fight' && !inp.right; return inp }
    if (kind === 'masher') {
      inp.right = r.mode === 'run' || Math.sin(r.t * 1.3) > 0; inp.left = r.mode === 'fight' && !inp.right
      if (r.frame % 22 === 0) inp.jump = true
      inp.jumpHeld = true
      if (r.frame % 67 === 0) inp.dash = true
      return inp
    }
    const P = PRO[kind]
    const m = r.me
    if (r.mode === 'run') {
      inp.right = true
      const near = (a, b) => m.x > a - 3 && m.x < b
      for (const [a, b] of CFG.tacks) if (near(a, b) && m.ground) { inp.jump = true; inp.jumpHeld = true }
      const R = r.roomba; if (R.alive && R.x - m.x < 3.2 && R.x > m.x && m.ground) { inp.jump = true }
      inp.jumpHeld = inp.jumpHeld || !m.ground
      return inp
    }
    tick++
    holdT = Math.max(0, holdT - 1)
    if (tick % P.react === 0) plan = think(r, P, rnd)
    if (plan.dir > 0) inp.right = true; else if (plan.dir < 0) inp.left = true
    if (plan.jump) { if (m.ground && rnd() > P.miss) { inp.jump = true; holdT = 34 } plan.jump = false }
    if (plan.dash) { inp.dash = rnd() > P.miss; plan.dash = false }
    inp.jumpHeld = holdT > 0
    // 弾く: 空中でピンクが手の届く所まで来たら（反応の間隔とは別に毎フレーム見る。人は目で追っている）
    if (!m.ground && !m.parryUsed && P.parry > 0) {
      for (const o of r.objs) if (o.pink && (o.live || o.k === 'dust') && Math.hypot(o.x - m.x, o.y - m.y - 1) < 2.4 && (o.seen ?? (o.seen = rnd() < P.parry))) { inp.jump = true; break }
    }
    return inp
  }
}
function think(r, P, rnd) {
  const m = r.me, b = r.boss, plan = { dir: 0, jump: false, dash: false }
  const mid = (CFG.arenaL + CFG.arenaR) / 2
  // 既定の居場所
  let want = m.x
  if (P.toe) want = b.x + (m.x < b.x ? -3.5 : 3.5)
  else want = b.x + (m.x < b.x ? -6 : 6)
  const away = x => (m.x >= x ? 1 : -1)
  const ac = b.act
  if (ac && ac.k === 'toss' && Math.abs(ac.tx - m.x) < 2.6) want = ac.tx + away(ac.tx) * 4.5
  if (ac && ac.k === 'stomp' && ac.t > ac.warn - 0.14 && Math.abs(m.x - b.x) < 7 && m.ground) plan.jump = true
  // 床を来る物
  for (const o of r.objs) {
    if (o.k === 'wave' || (o.k === 'sandal' && o.go)) {
      const d = (o.x - m.x) * Math.sign(o.v)
      if (d < 0 && -d < Math.abs(o.v) * 0.3 + 1.4 && m.ground && m.y < 1) plan.jump = true
    }
    if (o.k === 'dust') { const d = (m.x - o.x) * Math.sign(o.v); if (d > 0 && d < 5.4 && m.ground && Math.abs(o.y - (m.y + 1.05)) < 2) plan.jump = true }
    if (o.k === 'slip' && o.st === 'fly') {
      if (P.parry > 0.2 && o.pink && Math.abs(o.tx - m.x) < 2 && o.t > o.T - 0.55 && m.ground && (o.tryP ?? (o.tryP = rnd() < P.parry))) plan.jump = true
      else if (Math.abs(o.tx - m.x) < 2.4) { want = o.tx + away(o.tx) * 4.5 }
    }
  }
  const n = r.nozzle
  if (n && n.k === 'sweep') { const d = (m.x - n.x) * Math.sign(n.v); if (n.on && d > 0 && d < 4.8 && m.ground) plan.jump = true }
  if (n && n.k === 'suck') { want = n.x - n.side * 12; if (Math.abs(m.x - n.x) < 4.6) plan.dash = true }
  const c = r.cat
  if (c) {
    if (c.st === 'crouch' || c.st === 'leap') { if (Math.abs(c.tx - m.x) < 3.6) want = c.tx + (m.x >= c.tx ? 5 : -5) }
    if (c.st === 'swatWarn' || c.st === 'swat') { if (Math.abs(c.x - m.x) < 4) want = c.x + (m.x >= c.x ? 5 : -5) }
  }
  want = Math.max(CFG.arenaL + 1, Math.min(CFG.arenaR - 1, want))
  if (want < CFG.arenaL + 2.2) want = mid
  if (Math.abs(want - m.x) > 0.5) plan.dir = Math.sign(want - m.x)
  return plan
}
