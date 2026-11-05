// 遊びの中身（描画なし。node の bot でも同じものが回る）。固定 60Hz
// 横から見た 2D の当たり判定。おかんは奥（z<0）に立つので、体に触れても当たらない。当たるのは手前に飛んで来た物だけ
export const DT = 1 / 60
export const CFG = {
  runEnd: 44, arenaL: 44, arenaR: 78, retryX: 52, viewW: 17,
  plats: [{ x0: 49, x1: 55, y: 3.4 }, { x0: 67, x1: 73, y: 3.4 }, { x0: 16, x1: 21, y: 3.4 }, { x0: 33, x1: 38, y: 3.4 }],
  tacks: [[9, 11.4], [26.6, 28.4]],
  roomba: { x0: 28.5, x1: 37, R: 1.7, hp: 10, v: 3.2 },
  maxHP: 4, speed: 8.6, grav: 46, jumpV: 21.4, jumpCut: 0.45, coyote: 0.09, buffer: 0.12,
  dashV: 21, dashT: 0.2, dashCd: 0.6, parryT: 0.22, parryR: 2.9, parryBounce: 16.5, hurtI: 1.4,
  meR: 0.78, meH: 1.05,
  shotEvery: 0.2, shotT: 0.3,
  bossHP: 560, phase2: 0.66, phase3: 0.33, parryDmg: 16, toeK: 1.5, faceK: 2,
  toeNear: 6, faceY: 6.3, bossWalk: 2.2, bossL: 54, bossR: 68,
  suckF: 6.4
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const lerp = (a, b, k) => a + (b - a) * k

function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

export function newRun(seed, opt = {}) {
  const retry = !!opt.retry
  const r = {
    seed, rnd: rng(seed), frame: 0, t: 0, fightT: 0, mode: retry ? 'intro' : 'run', modeT: 0, retry, over: false, won: false,
    hp: CFG.maxHP, ev: [], objs: [], shots: [], id: 1, hitstop: 0,
    me: { x: retry ? CFG.retryX : 2, y: 0, vx: 0, vy: 0, ground: true, face: 1, dashT: 0, dashCd: 0, dashDir: 1, airDash: true, iT: 0, parryT: 0, parryUsed: false, coy: 0, buf: 0, knock: 0, jumping: false, onPlat: null },
    boss: { hp: CFG.bossHP, x: 62, phase: 1, pose: 'normal', act: null, cool: 1.1, last: null, walkPhase: 0, inv: 0, hurtT: 0, say: null, stuck: [], stepT: 0, n: 0, scale: 1 },
    roomba: { x: CFG.roomba.x1, dir: -1, hp: CFG.roomba.hp, alive: true, hitT: 0 },
    cat: null, nozzle: null,
    rare: { dad: 0, roombaCat: false, longCall: false },
    stats: { shots: 0, toe: 0, face: 0, parries: 0, hits: 0, dashes: 0, jumps: 0 },
    fireT: 0
  }
  const R = rng(seed * 7 + 3)
  r.rare.dad = R() < 0.2 ? 20 + R() * 40 : 0     // おとんが奥を横切る（助けない）
  r.rare.roombaCat = R() < 0.14                  // 猫がルンバに乗って来る
  r.rare.longCall = R() < 0.18                   // 電話が長引いて止まる
  if (opt.rare) Object.assign(r.rare, opt.rare)
  if (retry) r.me.x = CFG.retryX
  return r
}

const emit = (r, k, o) => r.ev.push({ k, ...o })
export const fraction = r => Math.max(0, r.boss.hp) / CFG.bossHP
export const leftPct = r => Math.max(1, Math.ceil(fraction(r) * 100))

function setMode(r, m) { r.mode = m; r.modeT = 0; emit(r, 'mode', { m }) }

function hurtMe(r, by) {
  const m = r.me
  if (m.iT > 0 || m.dashT > 0 || r.over || r.mode === 'win') return false
  if (r.mode === 'run') { if (r.hp > 1) r.hp--; } else r.hp--
  r.stats.hits++
  m.iT = CFG.hurtI; m.knock = 0.16; m.vy = 9; m.ground = false; m.vx = 0
  r.hitstop = 0.08
  emit(r, 'hurt', { by })
  if (r.hp <= 0) { r.over = true; r.won = false; r.lastBy = by; setMode(r, 'dead'); r.boss.pose = 'win'; r.boss.act = null; r.objs = r.objs.filter(o => o.k === 'back'); r.nozzle = null; r.cat = null; emit(r, 'lose', { by }) }
  return true
}

// ------------------------------------------------------------ 自分
function moveMe(r, inp, dt) {
  const m = r.me, C = CFG
  const L = r.mode === 'run' ? 0.4 : (r.mode === 'intro' || r.mode === 'fight' ? C.arenaL + 0.6 : 0)
  const Rr = r.mode === 'run' ? 200 : C.arenaR - 0.6
  const canCtl = !r.over && (r.mode === 'run' || r.mode === 'fight')
  m.iT = Math.max(0, m.iT - dt); m.dashCd = Math.max(0, m.dashCd - dt); m.parryT = Math.max(0, m.parryT - dt); m.knock = Math.max(0, m.knock - dt)
  m.buf = Math.max(0, m.buf - dt); m.coy = m.ground ? C.coyote : Math.max(0, m.coy - dt)
  const dir = canCtl && m.knock <= 0 ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0
  if (dir) m.face = dir

  if (canCtl && inp.dash && m.dashCd <= 0 && m.dashT <= 0 && (m.ground || m.airDash)) {
    m.dashT = C.dashT; m.dashCd = C.dashCd; m.dashDir = dir || m.face; if (!m.ground) m.airDash = false
    m.vy = 0; r.stats.dashes++; emit(r, 'dash', {})
  }
  if (canCtl && inp.jump) {
    if (m.ground || m.coy > 0) m.buf = C.buffer
    else if (!m.parryUsed) { m.parryUsed = true; m.parryT = C.parryT; emit(r, 'parryTry', {}) }
    else m.buf = C.buffer
  }
  if (m.dashT > 0) {
    m.dashT -= dt; m.vx = m.dashDir * C.dashV
  } else {
    m.vx = dir * C.speed
    if (m.knock > 0) m.vx = -m.face * 5
  }
  // 吸い込み
  const n = r.nozzle
  if (n && n.k === 'suck' && n.on) {
    const d = n.x - m.x, f = C.suckF * clamp(1.15 - Math.abs(d) / 22, 0.45, 1)
    if (m.dashT <= 0) m.vx += Math.sign(d) * f
  }
  if (m.buf > 0 && (m.ground || m.coy > 0) && m.dashT <= 0) {
    m.vy = C.jumpV; m.ground = false; m.coy = 0; m.buf = 0; m.jumping = true; m.onPlat = null; r.stats.jumps++; emit(r, 'jump', {})
  }
  if (m.jumping && !inp.jumpHeld && m.vy > 4) { m.vy *= C.jumpCut; m.jumping = false }
  if (m.vy <= 0) m.jumping = false
  m.x = clamp(m.x + m.vx * dt, L, Rr)
  if (m.dashT <= 0) m.vy -= C.grav * dt
  const py = m.y; m.y += m.vy * dt
  let landed = null
  if (m.vy <= 0) {
    if (m.y <= 0) landed = 0
    for (const p of C.plats) if (m.x >= p.x0 - 0.3 && m.x <= p.x1 + 0.3 && py >= p.y - 0.02 && m.y <= p.y) landed = p.y
  }
  if (landed != null) {
    if (!m.ground && m.vy < -6) emit(r, 'land', {})
    m.y = landed; m.vy = 0; m.ground = true; m.airDash = true; m.parryUsed = false; m.parryT = 0
  } else m.ground = false
}

// ------------------------------------------------------------ 爪楊枝（自動）
function fire(r, dt) {
  if (r.over) return
  if (!(r.mode === 'run' || r.mode === 'fight')) return
  r.fireT -= dt
  if (r.fireT > 0) return
  r.fireT = CFG.shotEvery
  const m = r.me, b = r.boss
  if (r.mode === 'fight') {
    const y = m.y + 1.1, side = Math.sign(b.x - m.x) || 1
    let zone = 'body', k = 1
    if (m.y >= CFG.faceY) { zone = 'face'; k = CFG.faceK }
    else if (m.y < 1 && Math.abs(m.x - b.x) <= CFG.toeNear) { zone = 'toe'; k = CFG.toeK }
    const lx = zone === 'toe' ? (side > 0 ? -1 : 1) * (2.2 + r.rnd() * 1.6) : zone === 'face' ? (r.rnd() - 0.5) * 4 : (r.rnd() - 0.5) * 6.4
    const ly = zone === 'toe' ? 0.7 : zone === 'face' ? 11.4 + r.rnd() * 3.5 : 3.6 + r.rnd() * 6.4
    r.shots.push({ id: r.id++, k: 'in', t: 0, T: CFG.shotT, x0: m.x + m.face * 0.4, y0: y, lx, ly, zone, dmg: k, side })
    m.face = side
  } else {
    r.shots.push({ id: r.id++, k: 'flat', t: 0, T: 0.42, x0: m.x + m.face * 0.6, x: m.x + m.face * 0.6, y0: m.y + 1.1, y: m.y + 1.1, dir: m.face })
  }
  r.stats.shots++
  emit(r, 'shot', {})
}

function stepShots(r, dt) {
  const b = r.boss
  for (const s of r.shots) {
    s.t += dt
    if (s.k === 'flat') {
      s.x += s.dir * 28 * dt
      const R = r.roomba
      if (R.alive && Math.abs(s.x - R.x) < CFG.roomba.R && s.y0 < 3.2) {
        s.dead = true; R.hp--; R.hitT = 0.1; emit(r, 'roombaHit', {})
        if (R.hp <= 0) { R.alive = false; emit(r, 'roombaDown', {}) }
      }
      if (s.t > s.T) s.dead = true
    } else if (s.t >= s.T) {
      s.dead = true
      if (b.inv <= 0 && r.mode === 'fight') hitBoss(r, s.dmg, s.zone, s.lx, s.ly)
    }
  }
  r.shots = r.shots.filter(s => !s.dead)
}

function hitBoss(r, dmg, zone, lx, ly) {
  const b = r.boss
  if (r.over) return
  b.hp -= dmg
  if (zone === 'toe') { r.stats.toe++; if (r.stats.toe % 12 === 1) { b.hurtT = Math.max(b.hurtT, 0.5); emit(r, 'toe', {}) } }
  if (zone === 'face') r.stats.face++
  if (b.stuck.length < 120 && r.rnd() < 0.55) b.stuck.push({ x: lx, y: ly, a: r.rnd() * 6.28 })
  emit(r, 'hit', { zone })
  const f = fraction(r)
  if (b.hp <= 0) {
    r.over = true; r.won = true; r.hitstop = 0.3; setMode(r, 'win'); r.objs = []; r.nozzle = null; r.cat = null; b.act = null; b.pose = 'down'; emit(r, 'win', {})
    return
  }
  const ph = f > CFG.phase2 ? 1 : f > CFG.phase3 ? 2 : 3
  if (ph > b.phase) {
    b.phase = ph; b.act = null; b.inv = 1.7; b.cool = 1.8; r.objs = r.objs.filter(o => o.k === 'back'); r.nozzle = null; r.cat = null
    b.pose = ph === 3 ? 'rage' : 'angry'; b.poseT = 1.7
    if (ph === 3) b.scale = 1.32
    emit(r, 'phase', { ph })
  }
}

// ------------------------------------------------------------ 飛んで来る物
function addSlip(r, tx, T, pink = true) {
  const b = r.boss
  T = T || (b.phase === 1 ? 1.08 : 0.95)
  const side = b.x < tx ? 1 : -1
  r.objs.push({ id: r.id++, k: 'slip', pink, st: 'fly', t: 0, T, x0: b.x + side * 3.4, y0: 15, tx, x: b.x, y: 15, z: -14, rot: 0, ring: true })
  emit(r, 'throw', {})
}

function stepObjs(r, dt) {
  const m = r.me
  for (const o of r.objs) {
    o.t += dt
    if (o.k === 'slip') {
      if (o.st === 'fly') {
        const p = Math.min(1, o.t / o.T)
        o.x = lerp(o.x0, o.tx, p); o.y = lerp(o.y0, 0, p) + 7 * 4 * p * (1 - p) * (1 - p * 0.25); o.z = lerp(-14, 0, p); o.rot += dt * 11
        o.live = p > 0.62
        if (p >= 1) { o.st = 'bounce'; o.t = 0; o.vx = Math.sign(o.tx - o.x0) * 3.5; o.vy = 7.5; o.y = 0; o.z = 0; o.ring = false; emit(r, 'slipLand', {}) }
      } else if (o.st === 'bounce') {
        o.x += o.vx * dt; o.vy -= CFG.grav * 0.7 * dt; o.y = Math.max(0.4, o.y + o.vy * dt); o.rot += dt * 7; o.live = true
        if (o.t > 0.62) o.dead = true
      }
      if (o.live && o.pink && m.parryT > 0 && dist(m.x, m.y + CFG.meH, o.x, o.y) < CFG.parryR) { parried(r, o); continue }
      if (o.live && o.st === 'fly' && dist(m.x, m.y + CFG.meH, o.x, o.y) < CFG.meR + 0.85) hurtMe(r, 'slip')
    } else if (o.k === 'back') {
      const p = Math.min(1, o.t / o.T)
      o.x = lerp(o.x0, r.boss.x + (o.lx || 0), p); o.y = lerp(o.y0, 9, p) + 2 * 4 * p * (1 - p); o.z = lerp(0, -13.4, p); o.rot -= dt * 18
      if (p >= 1) {
        o.dead = true
        if (!r.over && r.mode === 'fight') { r.boss.hurtT = 0.7; emit(r, 'backHit', {}); hitBoss(r, r.boss.inv > 0 ? 0 : CFG.parryDmg, 'body', o.lx || 0, 8) }
      }
    } else if (o.k === 'sandal') {
      if (o.t >= o.warn) { o.go = true; o.x += o.v * dt; o.rot = (o.rot || 0) + 0; if (dist(m.x, m.y + CFG.meH, o.x, 0.7) < CFG.meR + 0.95) hurtMe(r, 'sandal'); if (o.x < CFG.arenaL - 2 || o.x > CFG.arenaR + 2) o.dead = true }
    } else if (o.k === 'dust') {
      o.x += o.v * dt; o.y += Math.sin(o.t * 6) * dt * 1.2
      if (o.pink && m.parryT > 0 && dist(m.x, m.y + CFG.meH, o.x, o.y) < CFG.parryR) { parried(r, o); continue }
      if (dist(m.x, m.y + CFG.meH, o.x, o.y) < CFG.meR + 0.75) { if (hurtMe(r, o.pink ? 'slip' : 'dust')) o.dead = true }
      const nz = r.nozzle
      if (!nz || Math.abs(o.x - nz.x) < 1.4 || o.t > 5) { o.dead = true; emit(r, 'gulp', {}) }
    } else if (o.k === 'wave') {
      o.x += o.v * dt; o.h = 1.7
      if (o.t > 2.8 || o.x < CFG.arenaL - 2 || o.x > CFG.arenaR + 2) o.dead = true
      if (Math.abs(m.x - o.x) < 1.0 && m.y < o.h - 0.25) hurtMe(r, 'stomp')
    }
  }
  r.objs = r.objs.filter(o => !o.dead)
}
const dist = (a, b, c, d) => Math.hypot(a - c, b - d)

function parried(r, o) {
  const m = r.me
  o.k = 'back'; o.st = 'back'; o.t = 0; o.T = 0.42; o.x0 = o.x; o.y0 = o.y; o.ring = false; o.lx = (r.rnd() - 0.5) * 5
  m.vy = CFG.parryBounce; m.parryT = 0; m.parryUsed = false; m.iT = Math.max(m.iT, 0.25); m.ground = false; m.airDash = true
  r.stats.parries++; r.hitstop = 0.09
  emit(r, 'parry', { x: o.x, y: o.y })
}

// ------------------------------------------------------------ おかん
const ACT = {
  toss: { P: 'throw', warn: 0.78 }, skate: { P: 'throw', warn: 0.6 }, suck: { P: 'suck', warn: 0.95 }, sweep: { P: 'suck', warn: 0.95 },
  call: { P: 'phone', warn: 0.9 }, stomp: { P: 'stomp', warn: 0.82 }
}
const CYCLE = {
  1: ['toss', 'skate', 'toss'],
  2: ['suck', 'toss', 'sweep', 'suck', 'skate', 'sweep'],
  3: ['call', 'stomp', 'toss', 'sweep', 'call', 'stomp', 'suck', 'stomp']
}
function pickAct(r) {
  const b = r.boss, list = CYCLE[b.phase]
  const k = list[b.n % list.length]; b.n++
  return k
}
function startAct(r, k) {
  const b = r.boss, a = { k, t: 0, warn: ACT[k].warn * (b.phase === 3 ? 0.88 : 1), n: 0 }
  b.act = a; b.pose = ACT[k].P; b.poseT = 0
  const m = r.me
  if (k === 'toss') {
    a.count = b.phase === 1 ? (b.n % 4 === 3 ? 3 : b.n % 2 ? 2 : 1) : b.phase === 2 ? 1 : 3
    a.tx = aimX(r); a.ring = a.tx
    emit(r, 'windup', {})
  } else if (k === 'skate') {
    const fromL = m.x > (CFG.arenaL + CFG.arenaR) / 2
    const x = fromL ? CFG.arenaL - 1 : CFG.arenaR + 1
    r.objs.push({ id: r.id++, k: 'sandal', t: 0, warn: 0.82, x, y: 0.7, v: fromL ? 14 : -14, go: false })
    a.done = true; emit(r, 'windup', {})
  } else if (k === 'suck') {
    const left = m.x > (CFG.arenaL + CFG.arenaR) / 2
    r.nozzle = { k: 'suck', x: clamp(m.x + (left ? -9.5 : 9.5), CFG.arenaL + 0.5, CFG.arenaR - 0.5), y: 0, on: false, t: 0, side: left ? -1 : 1, spawn: 0.3, n: 0 }
    emit(r, 'vacOn', {})
  } else if (k === 'sweep') {
    const fromL = m.x > (CFG.arenaL + CFG.arenaR) / 2
    r.nozzle = { k: 'sweep', x: fromL ? CFG.arenaL - 2 : CFG.arenaR + 2, y: 0, on: false, t: 0, v: fromL ? 9.6 : -9.6, side: fromL ? -1 : 1 }
    emit(r, 'vacOn', {})
  } else if (k === 'call') {
    a.long = r.rare.longCall && !b.calledLong
    if (a.long) { b.calledLong = true; emit(r, 'say', { key: 'longCall' }) } else emit(r, 'say', { key: 'callCat' })
    emit(r, 'phone', {})
  } else if (k === 'stomp') {
    a.count = b.phase === 3 && fraction(r) < 0.16 ? 2 : 1
    emit(r, 'windup', {})
  }
}
function aimX(r) { return clamp(r.me.x + r.me.vx * 0.22, CFG.arenaL + 1, CFG.arenaR - 1) }

function endAct(r) {
  const b = r.boss
  b.act = null; b.pose = b.phase === 3 ? 'angry' : 'normal'
  b.cool = b.phase === 3 ? 0.62 : b.phase === 2 ? 0.9 : 1.15
}

function stepBoss(r, dt) {
  const b = r.boss, m = r.me
  b.inv = Math.max(0, b.inv - dt); b.hurtT = Math.max(0, b.hurtT - dt)
  if (r.mode !== 'fight') return
  r.fightT += dt
  if (r.rare.dad && r.fightT > r.rare.dad && !r.rare.dadDone) { r.rare.dadDone = true; emit(r, 'dad', {}) }
  if (!b.act) {
    const tgt = clamp(m.x, CFG.bossL, CFG.bossR), d = tgt - b.x
    if (Math.abs(d) > 0.3) { b.x += Math.sign(d) * CFG.bossWalk * (b.phase === 3 ? 1.5 : 1) * dt; b.walkPhase += dt * 5; b.stepT -= dt; if (b.stepT <= 0) { b.stepT = 0.55; emit(r, 'momStep', {}) } }
    if (b.poseT > 0) { b.poseT -= dt } else b.pose = b.phase === 3 ? 'angry' : (Math.abs(d) > 0.3 ? 'normal' : 'search')
    b.cool -= dt
    if (b.cool <= 0 && b.inv <= 0) startAct(r, pickAct(r))
    return
  }
  const a = b.act; a.t += dt
  switch (a.k) {
    case 'toss':
      if (a.t >= a.warn) {
        addSlip(r, a.tx); a.n++
        if (a.n >= a.count) { endAct(r) } else { a.t = a.warn - 0.46; a.tx = aimX(r); a.ring = a.tx }
      }
      break
    case 'skate':
      if (a.t >= a.warn) endAct(r)
      break
    case 'suck': {
      const n = r.nozzle; if (!n) { endAct(r); break }
      n.t += dt
      if (!n.on && n.t >= a.warn) { n.on = true; n.t = 0; emit(r, 'suckOn', {}) }
      if (n.on) {
        n.spawn -= dt
        if (n.spawn <= 0) {
          n.spawn = b.phase === 3 ? 0.95 : 1.15; n.n++
          const pink = n.n % 3 === 0, x = clamp(n.x - n.side * 19, CFG.arenaL - 1, CFG.arenaR + 1)
          r.objs.push({ id: r.id++, k: 'dust', pink, t: 0, x: n.x - n.side * 20, y: pink ? 4.8 : 1, v: n.side * (10 + r.rnd() * 1.5) })
          void x
        }
        if (Math.abs(m.x - n.x) < 1.7 && m.y < 3) hurtMe(r, 'vac')
        if (n.t >= (b.phase === 3 ? 2.6 : 3.3)) { r.nozzle = null; r.objs = r.objs.filter(o => o.k !== 'dust'); emit(r, 'vacOff', {}); endAct(r) }
      }
      break
    }
    case 'sweep': {
      const n = r.nozzle; if (!n) { endAct(r); break }
      n.t += dt
      if (!n.on && n.t >= a.warn) { n.on = true; emit(r, 'suckOn', {}) }
      if (n.on) {
        n.x += n.v * dt
        if (Math.abs(m.x - n.x) < 1.5 && m.y < 1.75) hurtMe(r, 'vac')
        if (n.x < CFG.arenaL - 3 || n.x > CFG.arenaR + 3) { r.nozzle = null; emit(r, 'vacOff', {}); endAct(r) }
      }
      break
    }
    case 'call':
      if (a.long) { if (a.t >= 3.4) endAct(r); break }
      if (a.t >= a.warn && !r.cat) {
        const fromL = m.x > (CFG.arenaL + CFG.arenaR) / 2
        r.cat = { st: 'crouch', t: 0, x: fromL ? clamp(m.x - 9, CFG.arenaL - 1, CFG.arenaR) : clamp(m.x + 9, CFG.arenaL, CFG.arenaR + 1), y: 0, dir: fromL ? 1 : -1, tx: aimX(r), roomba: r.rare.roombaCat }
        emit(r, 'catIn', {})
      }
      if (r.cat === null && a.t > a.warn + 0.2) endAct(r)
      if (r.cat && r.cat.st === 'gone') { r.cat = null; endAct(r) }
      break
    case 'stomp':
      if (a.t >= a.warn) {
        for (const s of [-1, 1]) r.objs.push({ id: r.id++, k: 'wave', t: 0, x: b.x + s * 2.4, v: s * 13.5, h: 1.7 })
        emit(r, 'stomp', {}); a.n++
        if (a.n >= a.count) { endAct(r); b.cool = Math.max(b.cool, 0.9); b.pose = 'angry' } else { a.t = a.warn - 0.62 }
      }
      break
  }
}

function stepCat(r, dt) {
  const c = r.cat; if (!c) return
  const m = r.me
  c.t += dt
  if (c.st === 'crouch') {
    if (c.t < 0.5) c.tx = aimX(r)
    if (c.t >= 0.82) { c.st = 'leap'; c.t = 0; c.x0 = c.x; emit(r, 'catLeap', {}) }
  } else if (c.st === 'leap') {
    const p = Math.min(1, c.t / 0.62)
    c.x = lerp(c.x0, c.tx, p); c.y = 6.2 * 4 * p * (1 - p)
    if (dist(m.x, m.y + CFG.meH, c.x, c.y + 1.3) < CFG.meR + 1.25) hurtMe(r, 'cat')
    if (p >= 1) { c.st = 'swatWarn'; c.t = 0; c.y = 0; emit(r, 'catLand', {}) }
  } else if (c.st === 'swatWarn') {
    if (c.t >= 0.34) { c.st = 'swat'; c.t = 0; emit(r, 'catSwat', {}) }
  } else if (c.st === 'swat') {
    if (c.t < 0.2 && Math.abs(m.x - c.x) < 3.1 && m.y < 3) hurtMe(r, 'cat')
    if (c.t >= 0.32) { c.st = 'leave'; c.t = 0 }
  } else if (c.st === 'leave') {
    c.x += -c.dir * 15 * dt
    if (c.t > 0.9) c.st = 'gone'
  }
}

// ------------------------------------------------------------ 走る区間
function stepCourse(r, dt) {
  const m = r.me, C = CFG
  for (const [a, b] of C.tacks) if (m.x > a - 0.2 && m.x < b + 0.2 && m.y < 0.5) hurtMe(r, 'tack')
  const R = r.roomba
  if (R.alive) {
    R.x += R.dir * C.roomba.v * dt
    if (R.x < C.roomba.x0) R.dir = 1
    if (R.x > C.roomba.x1) R.dir = -1
    if (Math.abs(m.x - R.x) < C.roomba.R + 0.4 && m.y < 1.5) hurtMe(r, 'roomba')
  }
  R.hitT = Math.max(0, R.hitT - dt)
  if (m.x >= C.runEnd + 2) { r.hp = C.maxHP; r.me.iT = 0; setMode(r, 'intro'); r.objs = [] }
}

// inp: { left, right, jump(押した瞬間), jumpHeld, dash(押した瞬間) }
export function step(r, inp) {
  const dt = DT
  r.frame++; r.t += dt
  if (r.hitstop > 0) { r.hitstop -= dt; return }
  r.modeT += dt
  moveMe(r, inp, dt)
  if (r.mode === 'run') stepCourse(r, dt)
  if (r.mode === 'intro' && r.modeT >= (r.retry ? 0.75 : 2.5)) setMode(r, 'fight')
  fire(r, dt); stepShots(r, dt)
  if (r.mode === 'fight' || r.objs.length) stepObjs(r, dt)
  stepBoss(r, dt); stepCat(r, dt)
}

// 通知表の判定（hanko は発表まで見せない）
export function grade(r) {
  const s = r.stats, tt = r.fightT
  if (!r.won) {
    const left = leftPct(r)
    return { key: left <= 10 ? 'close' : left <= 40 ? 'try' : 'more', left }
  }
  let p = 0
  p += r.hp >= 3 ? 3 : r.hp === 2 ? 2 : 1
  p += s.parries >= 5 ? 3 : s.parries >= 2 ? 2 : s.parries >= 1 ? 1 : 0
  p += tt < 80 ? 3 : tt < 105 ? 2 : tt < 140 ? 1 : 0
  return { key: p >= 8 ? 'S' : p >= 6 ? 'A' : p >= 4 ? 'B' : 'C', p, left: 0 }
}
