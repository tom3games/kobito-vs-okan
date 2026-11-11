// 難しさを測る bot。node tools/sim.mjs と、検証の通しで使う
import { CFG } from './sim.js'
const PRO = {
  skilled: { react: 7, parry: 0.8, miss: 0, toe: true, face: true },
  normal: { react: 13, parry: 0.3, miss: 0.08, toe: false, face: false },
  first: { react: 24, parry: 0.05, miss: 0.24, toe: false, face: false },
  // 人の速さ: 見てから0.5秒で動く・狙いがずれる・弾くのは半々。コショウは2本に1本しか狙わない
  human: { react: 30, parry: 0.45, miss: 0.12, toe: true, face: false, pepper: 0.5, slop: 0.9 }
}
for (const k of ['skilled', 'normal', 'first']) PRO[k].pepper = k === 'skilled' ? 1 : k === 'normal' ? 0.5 : 0.1
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
      for (const [a] of r.C.pits) if (m.x > a - 2.3 && m.x < a && m.ground) { inp.jump = true; inp.jumpHeld = true }
      inp.jumpHeld = inp.jumpHeld || !m.ground
      return inp
    }
    tick++
    holdT = Math.max(0, holdT - 1)
    if (tick % P.react === 0) { const ja = plan.jumpAt; plan = r.stage === 2 ? think2(r, P, rnd, tick) : think(r, P, rnd); if (ja > tick && !plan.jumpAt && !plan.noJump) plan.jumpAt = ja }
    if (plan.jumpAt && tick >= plan.jumpAt) { plan.jumpAt = 0; plan.jump = true }
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

// 2面: 台所のおかん
function think2(r, P, rnd, tick) {
  const m = r.me, b = r.boss, C = r.C, plan = { dir: 0, jump: false, dash: false, jumpAt: 0, noJump: false }
  const L = C.arenaL + 1, R = C.arenaR - 1, away = x => (m.x >= x ? 1 : -1)
  let want = b.x + (m.x < b.x ? -1 : 1) * (P.toe ? 3.5 : 6) + (P.slop ? (rnd() - 0.5) * 2 * P.slop : 0)
  let noJump = false
  // コショウの瓶: 近づいて体当たり（瓶ごとに狙うか決める）
  const p = r.pepper, ac = b.act, calm = !(b.sneeze > 0) && !(ac && ac.k === 'dinner')
  if (p.st === 'stand' && calm) {
    if (p.goI !== p.i || !p.go) { p.goI = p.i; p.go = p.go && p.goI === p.i || rnd() < P.pepper * 0.35 }   // 見るたびに、思い出したら狙う
    if (p.go) {
      const side = m.x < p.x ? -1 : 1
      if (Math.abs(m.x - p.x) < 3.2 && m.ground) { plan.dash = true; want = p.x - side * 3 } else want = p.x + side * 3
    }
  } else if (p.st === 'fall') want = p.x + away(p.x) * 4.6
  // 休戦中のご飯粒
  if (r.rice) want = r.rice.x
  // フライ返し
  if (ac && ac.k === 'flip' && (Math.abs(ac.tx - m.x) < 2.9 || Math.abs(ac.tx - want) < 2.9)) want = ac.tx + away(ac.tx) * 4.6
  for (const o of r.objs) if (o.k === 'spat' && Math.abs(o.x - want) < 2.4) want = o.x + away(o.x) * 3
  // 油とウインナー: 落ちる所を避けた一番近い場所
  const drops = r.objs.filter(o => (o.k === 'oil' || (o.k === 'slip' && o.st === 'fly')))
  if (drops.length) {
    const bad = x => drops.some(o => Math.abs(x - o.tx) < (o.k === 'oil' ? 1.55 : 2.3))
    if (bad(m.x) || bad(want)) {
      let best = m.x, bd = 1e9
      for (let x = L; x <= R; x += 0.35) if (!bad(x)) { const d = Math.abs(x - m.x); if (d < bd) { bd = d; best = x } }
      want = best
    }
    for (const o of drops) if (o.k === 'slip' && o.pink && P.parry > 0.2 && Math.abs(o.tx - m.x) < 2 && o.t > o.T - 0.55 && m.ground && (o.tryP ?? (o.tryP = rnd() < P.parry))) plan.jump = true
  }
  for (const o of r.objs) {
    // 水: 見えた時に跳ぶ時刻を決めておく（人は近づく物に合わせて跳ぶ。ずれは下手なほど大きい）
    if (o.k === 'ladle') {
      noJump = true
      if (m.y > 0.5) { const pl = C.plats.find(q => m.x >= q.x0 - 0.3 && m.x <= q.x1 + 0.3); if (pl) want = (m.x - pl.x0 < pl.x1 - m.x) ? pl.x0 - 1.5 : pl.x1 + 1.5 }
    }
  }
  want = Math.max(L, Math.min(R, want))
  if (Math.abs(want - m.x) > 0.5) plan.dir = Math.sign(want - m.x)
  for (const o of r.objs) if (o.k === 'water' && m.y < 1) {
    const d = (o.x - m.x) * -Math.sign(o.v), toward = plan.dir === Math.sign(o.x - m.x) ? CFG.speed : 0, ta = (d - 1.5) / (Math.abs(o.v) + toward)
    if (d > 0 && ta < 1.6) plan.jumpAt = tick + Math.max(1, Math.round((ta - 0.25 + (rnd() - 0.5) * (0.1 + P.miss * 1.2)) * 60))
  }
  if (noJump) { plan.jump = false; plan.jumpAt = 0; plan.noJump = true }
  return plan
}
