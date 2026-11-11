// 小人になっておかんと戦え: 描画と入力。遊びの中身は shared/sim.js
import * as THREE from 'three'
import { newRun, step, CFG, CFG2, DT, leftPct, grade } from '../shared/sim.js?v=2'
import { makeBot } from '../shared/bot.js?v=2'
import { buildStage, tex } from './stage.js?v=2'
import { buildKitchen, KITCHEN_FLOOR } from './kitchen.js?v=1'
import { ASPECT } from './art.js?v=2'
import { drawPaper, drawHanko } from './paper.js?v=1'
import { TXT } from './i18n.js?v=2'

let T = TXT.ja, lang = 'ja'
const $ = id => document.getElementById(id)
const BOSS_Z = -18, BODY = 1.6   // 爪楊枝の刺さる位置（sim の値）を絵の上へ広げる倍率
// 音は最初に要る数本だけ先に読む。残りは遊び始めてから順に。読めていない音は鳴らさず止まらない
Snd.def({ click: 'snd/click.mp3', pick: ['snd/pluck1.mp3'], swish: ['snd/swish1.mp3'], thwack: ['snd/thwack1.mp3'] })
const SND_LATER = [
  { slam: 'snd/slam.mp3', wood: ['snd/woodhit1.mp3', 'snd/woodhit2.mp3'], step: ['snd/step1.mp3', 'snd/step2.mp3'], slap: 'snd/slap.mp3', pop: ['snd/pop1.mp3', 'snd/pop2.mp3'], door: 'snd/door.mp3' },
  { grunt: ['snd/grunt1.mp3', 'snd/grunt2.mp3', 'snd/grunt3.mp3'], lose: 'snd/lose.mp3', paper: ['snd/paper1.mp3', 'snd/paper2.mp3'], squeak: ['snd/squeak1.mp3', 'snd/squeak2.mp3'], pick: ['snd/pluck1.mp3', 'snd/pluck2.mp3'], swish: ['snd/swish1.mp3', 'snd/swish2.mp3', 'snd/swish3.mp3'], thwack: ['snd/thwack1.mp3', 'snd/thwack2.mp3'] },
  { suck: 'snd/suck.mp3', mew: ['snd/cat_mew1.mp3', 'snd/cat_mew2.mp3', 'snd/cat_mew3.mp3'], ding: 'snd/ding.mp3', win: 'snd/win.mp3', meh: 'snd/meh.mp3' },
  { clang: ['snd/clang1.mp3', 'snd/clang2.mp3'], pot: ['snd/pot1.mp3', 'snd/pot2.mp3'], splash: ['snd/splash1.mp3', 'snd/splash2.mp3'], plop: ['snd/plop1.mp3', 'snd/plop2.mp3'], dishes: 'snd/dishes.mp3', sneeze: 'snd/sneeze.mp3', ring: 'snd/ring.mp3' }
]
let sndLater = false
async function loadSoundsLater() {
  if (sndLater) return; sndLater = true
  for (const b of SND_LATER) { Snd.def(b); try { await Snd.load() } catch (e) {} }
  if (mode === 'play') Snd.loop('bgm', BGM, 0.3)
  window.__sndAllDone = true
}
const BGM = 'snd/funky-hip-hop-lofi-jam_CVP701Jam_0.mp3', AMB = 'snd/fridge_loop.wav', VAC = 'snd/vacuum_loop.wav', TITLE = 'snd/bgm_title.mp3', WATER = 'snd/water_loop.wav'

// ---------------------------------------------------------------- three
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02
$('view').appendChild(renderer.domElement)
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.5, 220), D = 22
const stage = buildStage(scene), kitchen = buildKitchen(scene)
const view = { w: 17, h: 36, camY: 4, x: 61, shake: 0 }
function resize() {
  const w = innerWidth, h = innerHeight, asp = w / h
  renderer.setSize(w, h, false)
  view.w = Math.max(17, 24 * asp); view.h = view.w / asp; view.camY = 0.12 * view.h
  cam.aspect = asp; cam.fov = 2 * Math.atan(view.h / 2 / D) * 180 / Math.PI; cam.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

// 画像: 最初の画面に要るのは mom_search だけ。残りは裏で順に読む（読めるまでその物は出さない）
const texs = {}, imgQueue = [], cuts = []
function cutTex(n) {
  if (texs[n]) return texs[n]
  const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texs[n] = t; imgQueue.push(n); return t
}
const ready = t => !!(t && t.image)
const loading = {}
function loadImg(n) { return loading[n] || (loading[n] = new Promise(ok => { const i = new Image(); i.onload = () => { texs[n].image = i; texs[n].needsUpdate = true; ok() }; i.onerror = () => ok(); i.src = `img/${n}.webp` })) }
// 2面の絵（2面から始めた時は先に読む）
const S2 = ['mom_flip', 'mom_pan', 'mom_phoneladle', 'mom_spray', 'p_oil', 'p_wiener', 'p_spatula', 'p_wave', 'p_ladle', 'p_pepper', 'p_tomato', 'mom_sneeze', 'mom_dinner', 'p_cloud', 'p_rice', 'mom_phone', 'mom_angry', 'mom_hurt', 'mom_rage', 'mom_win', 'mom_down', 'mom_normal']
function loadFirst(list) { const l = list.filter(n => texs[n] && !ready(texs[n])); return (async () => { for (let i = 0; i < l.length; i += 4) await Promise.all(l.slice(i, i + 4).map(loadImg)) })() }
async function loadImagesLater() {
  loadFaces()
  // 先に使う順（投げる→歩く→…）。3本ずつ
  const first = ['p_roomba', 'p_slipper', 'mom_throw', 'mom_normal', 'p_sandal', 'mom_hurt', 'mom_angry', 'mom_win', 'face_win']
  const list = [...new Set([...first.filter(n => imgQueue.includes(n)), ...imgQueue])].filter(n => !ready(texs[n]))
  for (let i = 0; i < list.length; i += 3) await Promise.all(list.slice(i, i + 3).map(loadImg))
  window.__imgAllDone = true
}
const MOM = ['normal', 'search', 'spot', 'angry', 'win', 'phone', 'throw', 'suck', 'hurt', 'rage', 'stomp', 'down']
MOM.forEach(n => cutTex('mom_' + n)); ['cat_crouch', 'cat_leap', 'cat_swat', 'p_slipper', 'p_sandal', 'p_dust', 'p_nozzle', 'dad_walk', 'p_roomba'].forEach(cutTex)
S2.forEach(cutTex)
function cut(name, h, anchorY = 0) {
  const a = ASPECT[name].a, g = new THREE.PlaneGeometry(a * h, h); g.translate(0, h * (0.5 - anchorY), 0)
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: cutTex(name), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, fog: false })); m.visible = false; scene.add(m); cuts.push(m); return m
}

// おかん
const momG = new THREE.Group(); momG.position.z = BOSS_Z; scene.add(momG)
const momMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, fog: false, map: cutTex('mom_search') })
const momMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), momMat); momG.add(momMesh)
const momShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x1a1206, transparent: true, opacity: 0.32, fog: false })); momShadow.rotation.x = -Math.PI / 2; momShadow.scale.set(11, 3, 1); momShadow.position.y = 0.03; momG.add(momShadow)
const pickGeo = new THREE.CylinderGeometry(0.03, 0.08, 1.9, 6)
const pickMat = new THREE.MeshBasicMaterial({ color: 0xd8b27a, fog: false })
const stuck = new THREE.InstancedMesh(pickGeo, pickMat, 120); stuck.count = 0; stuck.frustumCulled = false; momG.add(stuck)
let momPose = '', stuckN = 0
function setPose(p) {
  if (p === momPose) return
  const n = 'mom_' + p; if (!ready(texs[n])) return   // まだ読めていないポーズは今の絵のまま
  momPose = p
  const A = ASPECT[n]; momMat.map = cutTex(n); momMat.needsUpdate = true; momMesh.userData.h = A.h; momMesh.userData.w = A.a * A.h
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1)
function stickPick(b) {
  while (stuckN < b.stuck.length) {
    const s = b.stuck[stuckN]; _e.set(1.3 + Math.sin(s.a) * 0.3, 0, Math.cos(s.a) * 0.5); _q.setFromEuler(_e)
    _m.compose(_v.set(s.x * BODY, s.y * BODY, 0.7), _q, _s); stuck.setMatrixAt(stuckN, _m); stuckN++
  }
  stuck.count = stuckN; stuck.instanceMatrix.needsUpdate = true
}

// 飛ぶ爪楊枝
const shotMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.09, 1.7, 6), new THREE.MeshBasicMaterial({ color: 0xe6c48b, fog: false }), 40); shotMesh.frustumCulled = false; scene.add(shotMesh)
// 物
const pool = { slip: [], sandal: [], dust: [], oil: [], wiener: [], spat: [], water: [], ladle: [] }
const SIZE = { slip: ['p_slipper', 2.1], sandal: ['p_sandal', 1.9], dust: ['p_dust', 1.9], oil: ['p_oil', 1.15], wiener: ['p_wiener', 1.8], spat: ['p_spatula', 3.2], water: ['p_wave', 3.1], ladle: ['p_ladle', 1.7] }
function getObj(k, i) { const p = pool[k]; if (!p[i]) { const m = cut(SIZE[k][0], SIZE[k][1], 0.5); p[i] = m } return p[i] }
const ringMat = new THREE.MeshBasicMaterial({ color: 0xe8341f, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: false, depthWrite: false })
const RN = 9, rings = Array.from({ length: RN }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.95, 34), ringMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; m.visible = false; scene.add(m); return m })
const waves = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.9, 5), new THREE.MeshStandardMaterial({ color: 0xa79f60, roughness: 0.9 })); m.castShadow = true; m.visible = false; scene.add(m); return m })
const nozzle = cut('p_nozzle', 3.2)
const hoseMat = new THREE.MeshStandardMaterial({ color: 0x777b7e, roughness: 0.5, metalness: 0.2 })
const hose = new THREE.Mesh(new THREE.BufferGeometry(), hoseMat); hose.visible = false; scene.add(hose)
const streaks = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, fog: false })); m.visible = false; scene.add(m); return { m, k: Math.random(), y: 0.4 + Math.random() * 5 } })
// ルンバ（目玉シール）
const roombaG = new THREE.Group(); scene.add(roombaG)
// 目玉シールつきの切り絵（小人ゲームと同じ絵）。絵が届くまでは黒い円盤
const roombaStub = new THREE.Mesh(new THREE.CylinderGeometry(CFG.roomba.R * 0.97, CFG.roomba.R, 1.1, 24), new THREE.MeshStandardMaterial({ color: 0x24262b })); roombaStub.position.y = 0.65; roombaG.add(roombaStub)
const roombaM = cut('p_roomba', CFG.roomba.R * 2.3 / ASPECT.p_roomba.a); roombaG.add(roombaM)
const dadM = cut('dad_walk', 21)
let dadT = -1
const catM = { crouch: cut('cat_crouch', 4.8), leap: cut('cat_leap', 3.7), swat: cut('cat_swat', 5.4) }
// 2面の物
const pepperM = cut('p_pepper', 2.7, 0), riceM = cut('p_rice', 1.25), tomatoM = cut('p_tomato', CFG2.roomba.R * 2.2), spatWarn = cut('p_spatula', 3.2)
const cloudM = cut('p_cloud', 3); cloudM.material.alphaTest = 0.02; cloudM.material.depthWrite = false; cloudM.renderOrder = 2
let cloud = null, stageN = 1, tapOn = false
function setStage(n) {
  stageN = n; stage.g.visible = n !== 2; kitchen.g.visible = n === 2
  momG.position.y = n === 2 ? KITCHEN_FLOOR : 0; momShadow.visible = n !== 2
}
// 粒
const sparkT = tex(64, 64, (x, w, h) => { x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * 0.785, r = i % 2 ? 9 : 31; x.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r) } x.fill() })
const puffT = tex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(235,225,190,.9)'); g.addColorStop(1, 'rgba(235,225,190,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h) })
const parts = Array.from({ length: 36 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkT, transparent: true, depthWrite: false, fog: false })); s.visible = false; scene.add(s); return { s, t: 0, T: 0, vx: 0, vy: 0, k: 1 } })
let partI = 0
function burst(x, y, z, n, map, color, size, sp = 8, life = 0.35) {
  for (let i = 0; i < n; i++) { const p = parts[partI++ % parts.length], a = Math.random() * 6.28; p.t = 0; p.T = life * (0.7 + Math.random() * 0.6); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.k = size; p.s.material.map = map; p.s.material.color.set(color); p.s.material.needsUpdate = true; p.s.position.set(x, y, z); p.s.visible = true }
}
function stepParts(dt) { for (const p of parts) if (p.s.visible) { p.t += dt; if (p.t >= p.T) { p.s.visible = false; continue } p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; const k = 1 - p.t / p.T; p.s.scale.setScalar(p.k * (0.5 + k * 0.7)); p.s.material.opacity = k } }

// 主人公の絵が届くまでの仮の体（ティッシュ色）
const temp = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1, 4, 12), new THREE.MeshStandardMaterial({ color: 0xf4f4ee })); temp.visible = false; temp.castShadow = true; scene.add(temp)

// ---------------------------------------------------------------- 状態
let run = null, hero = null, mode = 'boot', paused = false, last = 0, acc = 0, autoBot = null, sayT = 0, cutT = 0, flashK = 0
const held = { left: false, right: false, jumpHeld: false }, edge = { jump: false, dash: false }
const seen = (() => { try { return JSON.parse(localStorage.getItem('okan_seen') || '{}') } catch (e) { return {} } })()
const remember = k => { seen[k] = 1; try { localStorage.setItem('okan_seen', JSON.stringify(seen)) } catch (e) {} }
const one = a => a[Math.floor(Math.random() * a.length)]

function say(key, force) {
  if (!force && sayT > 0.4) return
  const bank = run && run.stage === 2 && T.say2[key] ? T.say2 : T.say
  const s = one(bank[key]); $('say').textContent = s; $('say').classList.remove('hidden'); sayT = 0.9 + s.length * 0.09
}
function cutIn(img, sec) { $('cut').querySelector('img').src = img; $('cut').classList.remove('hidden'); cutT = sec }
function plasters() { const el = $('plasters'); let h = ''; for (let i = 0; i < CFG.maxHP; i++) h += `<i class="${i < run.hp ? '' : 'off'}"></i>`; el.innerHTML = h; window.__plasterN = run.hp }

function start(retry, opt = {}) {
  Snd.init()
  run = newRun(Math.floor(Math.random() * 1e6) + 1, { retry, ...opt })
  setStage(run.stage); cloud = null; if (run.stage === 2) loadFirst(S2)
  dadT = -1
  stuckN = 0; stuck.count = 0; momPose = ''; acc = 0; last = performance.now()
  for (const k in pool) pool[k].forEach(m => { m.visible = false })
  mode = 'play'; window.__retryAt = retry ? performance.now() : 0
  $('title').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.remove('hidden'); $('cut').classList.add('hidden'); $('say').classList.add('hidden')
  $('guide').classList.add('hidden'); hintStep = 0
  plasters(); view.x = run.me.x
  if (retry) say('retry', true)
  Snd.loop('amb', AMB, 0.1); Snd.loop('vac', null); Snd.loop('tap', null); tapOn = false
  if (window.__sndAllDone) Snd.loop('bgm', BGM, 0.3); else loadSoundsLater()
  window.__stamped = false; window.__lastResult = null
}

function handle(e) {
  const b = run.boss
  switch (e.k) {
    case 'mode': if (e.m === 'intro') { plasters(); say('intro', true); cutIn('img/big_spot.webp', 1.4); Snd.play('slam', { vol: 0.7 }); Snd.duck(0.5, 1.2); $('guide').classList.add('hidden') } break
    case 'roombaHit': Snd.play('pick', { vol: 0.35, rate: 1.3 }); break
    case 'roombaDown': Snd.play('thwack', { vol: 0.8 }); burst(run.roomba.x, 1, 0.5, 6, sparkT, run.stage === 2 ? '#ff5a3c' : '#fff', 1.4, 8); break
    case 'dad': dadT = 0; { const s = e.dinner ? T.say2.dadDinner[0] : T.say.dad[0]; $('say').textContent = `${T.sDad}「${s}」`; $('say').classList.remove('hidden'); sayT = 2 } break
    case 'hit': if (e.zone === 'toe') Snd.play('pick', { vol: 0.42, rate: 0.8 }); else Snd.play('pick', { vol: 0.28 }); break
    case 'shot': break
    case 'jump': Snd.play('swish', { vol: 0.35, rate: 1.4 }); break
    case 'land': Snd.play('step', { vol: 0.45 }); burst(run.me.x, run.me.y + 0.2, 0.2, 3, puffT, '#fff', 1.4, 3); break
    case 'dash': Snd.play('swish', { vol: 0.55 }); burst(run.me.x, run.me.y + 1, 0.2, 4, puffT, '#fff', 1.5, 4); seen.dashed || remember('dashed'); break
    case 'parryTry': Snd.play('swish', { vol: 0.25, rate: 1.8 }); break
    case 'parry': Snd.play('slap', { vol: 0.9 }); Snd.play('pop', { vol: 0.6 }); burst(e.x, e.y, 0.5, 9, sparkT, '#ff6fa5', 1.7, 12); flashK = 0.32; say('parry'); remember('parried'); break
    case 'backHit': Snd.play('thwack', { vol: 0.9 }); burst(b.x, 10, BOSS_Z + 1, 7, sparkT, '#fff', 2.4, 10); break
    case 'hurt': Snd.play('thwack', { vol: 1 }); Snd.play('grunt', { vol: 0.7 }); view.shake = 0.5; flashK = 0.26; plasters(); burst(run.me.x, run.me.y + 1, 0.5, 6, sparkT, '#ffd27a', 1.6, 9); say('hurt'); break
    case 'windup': Snd.play('swish', { vol: 0.35, rate: 0.7 }); if (b.act) say(run.stage === 2 ? b.act.k : b.act.k === 'skate' ? 'skate' : b.act.k === 'stomp' ? 'stomp' : 'toss'); break
    // 2面
    case 'slam': Snd.play('clang', { vol: 0.9 }); view.shake = 0.6; burst(e.x, 0.4, 0.5, 6, puffT, '#fff', 1.6, 6); break
    case 'oil': Snd.play('plop', { vol: 0.7 }); Snd.play('swish', { vol: 0.5, rate: 1.2 }); break
    case 'splat': Snd.play('plop', { vol: 0.3, rate: 1.3 }); burst(e.x, 0.3, 0.4, 3, sparkT, '#f2b52a', 0.9, 4, 0.25); break
    case 'faucet': say('water'); break
    case 'water': Snd.play('splash', { vol: 0.8 }); break
    case 'fell': Snd.play('splash', { vol: 0.9 }); say('fell', true); break
    case 'pepperKnock': Snd.play('dishes', { vol: 0.75 }); remember('knocked'); break
    case 'pepperCloud': Snd.play('swish', { vol: 0.45, rate: 0.6 }); cloud = { t: 0, x: e.x }; break
    case 'sneeze': Snd.play('sneeze', { vol: 1 }); Snd.duck(0.5, 1.2); cutIn('img/big_sneeze.webp', 1.1); say('sneeze', true); view.shake = 0.9; flashK = 0.18; burst(b.x, 15 + KITCHEN_FLOOR, BOSS_Z + 2, 10, sparkT, '#fff', 2.6, 14); break
    case 'sneezeEnd': say('sneezeEnd', true); cutT = 0; $('cut').classList.add('hidden'); break
    case 'meSneeze': Snd.play('sneeze', { vol: 0.45, rate: 1.7 }); say('meSneeze', true); burst(run.me.x, run.me.y + 2, 0.5, 5, puffT, '#b49a7a', 1.4, 4); break
    case 'pepperBack': say('pepperBack'); break
    case 'dinner': Snd.loop('tap', null); Snd.play('pot', { vol: 1 }); setTimeout(() => Snd.play('pot', { vol: 0.9 }), 260); setTimeout(() => Snd.play('pot', { vol: 0.9 }), 520); Snd.duck(0.4, 3.5); cutIn('img/big_dinner.webp', 1.6); say('dinner', true); view.shake = 0.5; break
    case 'rice': Snd.play('ding', { vol: 0.8 }); plasters(); say('rice', true); burst(run.me.x, run.me.y + 1, 0.5, 8, sparkT, '#fff', 1.4, 7); break
    case 'dinnerEnd': Snd.play('slam', { vol: 0.8 }); view.shake = 0.7; cutIn('img/big_rage.webp', 1); break
    case 'throw': Snd.play('swish', { vol: 0.75 }); break
    case 'slipLand': Snd.play('wood', { vol: 0.65 }); burst(run.objs.at(-1)?.x ?? run.me.x, 0.5, 0.2, 3, puffT, '#fff', 1.5, 3); break
    case 'vacOn': Snd.loop('vac', VAC, 0.3, 0.4); say(b.act && b.act.k === 'sweep' ? 'sweep' : 'suck'); break
    case 'suckOn': Snd.play('suck', { vol: 0.8 }); Snd.loop('vac', VAC, 0.6, 0.2); break
    case 'vacOff': Snd.loop('vac', null); break
    case 'gulp': Snd.play('pop', { vol: 0.3, rate: 0.7 }); break
    case 'say': say(e.key, true); break
    case 'phone': Snd.play('ding', { vol: 0.6 }); cutIn('img/big_phone.webp', 0.9); break
    case 'catIn': Snd.play('mew', { vol: 0.8 }); break
    case 'catLeap': Snd.play('mew', { vol: 0.9, rate: 1.2 }); break
    case 'catLand': Snd.play('wood', { vol: 0.5 }); break
    case 'catSwat': Snd.play('swish', { vol: 0.8, rate: 1.3 }); break
    case 'stomp': Snd.play('slam', { vol: 1 }); view.shake = 0.8; burst(b.x, 0.5, BOSS_Z + 2, 8, puffT, '#fff', 3.4, 7); break
    case 'momStep': Snd.play('step', { vol: 0.3, rate: 0.55 }); break
    case 'toe': Snd.play('squeak', { vol: 0.8 }); say('toe'); break
    case 'phase': if (run.stage === 2) { if (e.ph === 2) { Snd.play('ring', { vol: 0.7 }); cutIn('img/big_phone.webp', 1.3); say('phone', true) } break }
      Snd.play('slam', { vol: 0.8 }); Snd.loop('vac', null); Snd.duck(0.45, 1.2); view.shake = 0.7; say(e.ph === 3 ? 'ph3' : 'ph2', true); cutIn(e.ph === 3 ? 'img/big_rage.webp' : 'img/big_angry.webp', 1.3); break
    case 'win': Snd.loop('vac', null); Snd.loop('tap', null); if (run.stage === 2) remember('s2won'); Snd.loop('bgm', null); Snd.play('thwack', {}); say('win', true); cutIn('img/big_rage.webp', 0.01); finishAt = performance.now() + 1700; flashK = 0.6; window.__over = 'win'; break
    case 'lose': Snd.loop('vac', null); Snd.loop('tap', null); Snd.duck(0.3, 1); Snd.play('lose', { vol: 0.8 }); say('lose', true); finishAt = performance.now() + 560; window.__over = 'lose'; break
  }
}
let finishAt = 0

function showResult() {
  mode = 'result'; const r = run, g = grade(r), s2 = r.stage === 2, P = s2 ? { ...T.paper, ...T.paper2 } : T.paper, cv = $('paper')
  const [hanko, note] = P[g.key]
  const tech = s2 ? [P.sneeze, r.stats.sneezes + P.unitS] : [P.parry, r.stats.parries + P.unitP]
  const rows = r.won ? [[P.shots, r.stats.shots + P.unit], [P.toe, r.stats.toe + P.unit], [P.face, r.stats.face + P.unit], tech, [P.hp, r.hp + P.unitH], [P.time, Math.round(r.fightT) + P.sec]]
    : [[P.byLabel, P.by[r.lastBy] || T.paper.by[r.lastBy] || ''], [P.shots, r.stats.shots + P.unit], tech, [P.time, Math.round(r.fightT) + P.sec]]
  const face = faces[r.won ? 'face_rage' : 'face_win']
  drawPaper(cv, { lang, won: r.won, P, rows, note, left: g.left, face, yogurt: r.won ? faces[s2 ? 'p_yogurt2' : 'p_yogurt'] : null })
  $('btnNext').classList.toggle('hidden', !(r.won && !s2)); $('btnAgain').classList.toggle('sub', r.won && !s2)
  $('result').classList.remove('hidden'); $('hud').classList.add('hidden')
  Snd.play('paper', { vol: 0.7 })
  const text = r.won ? (s2 ? T.postWin2 : T.postWin)(hanko, Math.round(r.fightT)) : (s2 ? T.postLose2 : T.postLose)(g.left)
  $('btnPost').href = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://tom3games.github.io/kobito-vs-okan/')}`
  window.__lastResult = { won: r.won, key: g.key, left: g.left, hanko, t: r.fightT, stage: r.stage, by: r.lastBy }
  setTimeout(() => { if (mode !== 'result' || run !== r) return; drawHanko(cv, hanko, r.won); Snd.play('slam', { vol: 0.8 }); if (r.won) Snd.play('win', { vol: 0.8 }); window.__stamped = true }, r.won ? 900 : 480)
}
const faces = {}
function loadFaces() { for (const n of ['face_win', 'face_rage', 'p_yogurt', 'p_yogurt2']) { if (faces[n]) continue; const i = new Image(); i.src = `img/${n}.webp`; i.onload = () => { faces[n] = i } } }

// ---------------------------------------------------------------- 入力
const padMap = { bL: 'left', bR: 'right' }, active = new Map()
function setBtn(id, on) { const k = padMap[id]; if (k) held[k] = on; $(id).classList.toggle('on', on) }
function refresh() { const on = new Set(active.values()); for (const id of ['bL', 'bR', 'bJ', 'bD']) { if (!['bJ', 'bD'].includes(id)) setBtn(id, on.has(id)); else $(id).classList.toggle('on', on.has(id)) } held.jumpHeld = on.has('bJ') }
const hitBtn = (x, y) => { const e = document.elementFromPoint(x, y), b = e && e.closest && e.closest('.sew'); return b ? b.id : null }
function down(e) {
  e.preventDefault(); Snd.init(); const id = e.currentTarget.id; active.set(e.pointerId, id)
  if (id === 'bJ') edge.jump = true; if (id === 'bD') edge.dash = true
  refresh()
}
for (const id of ['bL', 'bR', 'bJ', 'bD']) $(id).addEventListener('pointerdown', down)
addEventListener('pointermove', e => { if (!active.has(e.pointerId)) return; const cur = active.get(e.pointerId); if (cur !== 'bL' && cur !== 'bR') return; const id = hitBtn(e.clientX, e.clientY); if (id === 'bL' || id === 'bR') { active.set(e.pointerId, id); refresh() } })
const up = e => { if (active.delete(e.pointerId)) refresh() }
addEventListener('pointerup', up); addEventListener('pointercancel', up)
const KEY = { ArrowLeft: 'left', ArrowRight: 'right' }
addEventListener('keydown', e => { if (e.repeat) return; if (KEY[e.key]) held[KEY[e.key]] = true; if (e.key === 'ArrowUp' || e.key === ' ') { edge.jump = true; held.jumpHeld = true } if (e.key === 'Shift') edge.dash = true })
addEventListener('keyup', e => { if (KEY[e.key]) held[KEY[e.key]] = false; if (e.key === 'ArrowUp' || e.key === ' ') held.jumpHeld = false })
$('btnStart').addEventListener('click', () => { Snd.init(); Snd.play('click', { vol: 0.7 }); start(false) })
$('btnAgain').addEventListener('click', () => { Snd.play('click', { vol: 0.7 }); start(true, { stage: run ? run.stage : 1 }) })
$('btnStage2').addEventListener('click', () => { Snd.init(); Snd.play('click', { vol: 0.7 }); start(false, { stage: 2 }) })
$('btnNext').addEventListener('click', () => { Snd.play('click', { vol: 0.7 }); toStage2() })
// 1面クリア → ふすまが閉じて「2面 台所」→ 開くと台所の走る区間
let wipeT = 0
function toStage2() {
  if (mode === 'wipe') return
  mode = 'wipe'; loadFirst(S2); Snd.play('door', { vol: 0.6 }); Snd.loop('bgm', null)
  const w = $('wipe'); w.classList.remove('hidden', 'open'); void w.offsetWidth; w.classList.add('shut')
  clearTimeout(wipeT)
  wipeT = setTimeout(() => {
    start(false, { stage: 2 }); w.classList.add('open')
    wipeT = setTimeout(() => { w.classList.add('hidden'); w.classList.remove('shut', 'open') }, 450)
  }, 2100)
}
const muteDraw = () => { $('btnMute').textContent = lang === 'en' ? (Snd.muted ? 'Muted' : 'Sound') : (Snd.muted ? '音なし' : '音あり') }
$('btnMute').addEventListener('click', () => { Snd.setMute(!Snd.muted); try { localStorage.setItem('okan_mute', Snd.muted ? '1' : '') } catch (e) {} muteDraw() })
try { if (localStorage.getItem('okan_mute')) Snd.setMute(true) } catch (e) {}
muteDraw()
function applyLang() {
  T = TXT[lang]; document.documentElement.lang = lang; document.title = lang === 'en' ? 'Tiny vs Mom | A 2 cm side-scrolling boss fight' : '小人になっておかんと戦え | 体2cmの横スクロール バカゲー'
  document.querySelector('.sign h1').innerHTML = `${T.logo1}<br>${T.logo2}`; $('story').textContent = T.story; $('btnStart').textContent = T.start; $('btnStage2').textContent = T.stage2; $('btnNext').textContent = T.next; $('wipeHead').textContent = T.wipeHead; $('wipeStory').textContent = T.wipeStory; $('btnLang').textContent = T.lang; $('btnAgain').textContent = T.again; $('btnPost').textContent = T.post; $('credit').textContent = T.credit; muteDraw()
}
$('btnLang').addEventListener('click', () => { lang = lang === 'ja' ? 'en' : 'ja'; try { localStorage.setItem('okan_lang', lang) } catch (e) {} applyLang() })
try { lang = localStorage.getItem('okan_lang') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en') } catch (e) {}
applyLang()

// ---------------------------------------------------------------- 描画
function drawWorld(dt) {
  const r = run || idleRun, m = r.me, b = r.boss
  if (hero) { hero.update(r, dt); hero.g.visible = true; temp.visible = false }
  else { temp.visible = mode === 'play'; temp.position.set(m.x, m.y + 1.15, 0) }
  // おかん
  setPose(b.sneeze > 0 && !r.over ? 'sneeze' : b.hurtT > 0 && !r.over ? 'hurt' : b.pose)
  const t = r.t, mh = momMesh.userData.h || 30, mw = momMesh.userData.w || 20
  const breath = 1 + Math.sin(t * 2.6) * 0.012 + (b.act && b.act.t < b.act.warn ? Math.min(1, b.act.t / b.act.warn) * 0.05 : 0)
  const big = b.scale > 1 ? 1.14 : 1
  const flip = (m.x < b.x) ? -1 : 1
  momMesh.scale.set(mw * big * flip, mh * big * breath, 1); momG.position.x = b.x + (b.phase === 3 && !r.over ? Math.sin(t * 40) * 0.1 : 0)
  momG.rotation.z = !b.act && !r.over ? Math.sin(b.walkPhase) * 0.02 : 0
  stuck.scale.set(big, big, 1); stickPick(b)
  // 爪楊枝
  let n = 0
  for (const s of r.shots) {
    if (s.k !== 'in') continue
    const p = Math.min(1, s.t / s.T), ix = b.x + s.lx * BODY * big, iy = s.ly * BODY * big + momG.position.y
    _v.set(s.x0 + (ix - s.x0) * p, s.y0 + (iy - s.y0) * p + Math.sin(p * 3.14) * 0.7, BOSS_Z * p + 0.3)
    _e.set(-1.2, 0, -Math.atan2(ix - s.x0, 4)); _q.setFromEuler(_e); _m.compose(_v, _q, _s); shotMesh.setMatrixAt(n++, _m)
    if (n >= 40) break
  }
  shotMesh.count = n; shotMesh.instanceMatrix.needsUpdate = true
  // 物
  const used = { slip: 0, sandal: 0, dust: 0, oil: 0, wiener: 0, spat: 0, water: 0, ladle: 0 }; let ringN = 0, waveN = 0
  const ring = (x, k = 1) => { if (ringN >= RN) return; const g = rings[ringN++]; g.position.x = x; g.position.z = 0; g.scale.setScalar(k); g.visible = true }
  const place = (mesh, o, flipX) => { mesh.visible = true; mesh.position.set(o.x, o.y, o.z || 0.2); mesh.scale.set(flipX ? -1 : 1, 1, 1) }
  for (const o of r.objs) {
    if (o.k === 'slip' || o.k === 'back') { const sk = o.skin === 'wiener' ? 'wiener' : 'slip', me = getObj(sk, used[sk]++); place(me, o, o.tx != null && o.tx > (o.x0 ?? o.x)); const dz = o.z ?? 0; const kk = 1 + (-dz / 14) * 1.3; me.scale.multiplyScalar(kk); me.rotation.z = (o.rot || 0) * (sk === 'wiener' ? 0.4 : 1); if (o.ring) ring(o.tx) }
    else if (o.k === 'oil') { const me = getObj('oil', used.oil++); place(me, o, false); me.scale.multiplyScalar(1 + (-(o.z || 0) / 12) * 1.2); me.rotation.z = Math.sin(o.rot) * 0.3; ring(o.tx, 0.5) }
    else if (o.k === 'spat') { const me = getObj('spat', used.spat++), len = 3.2 * ASPECT.p_spatula.a, k = Math.min(1, o.t / 0.06); place(me, { x: o.x, y: len / 2 + (1 - k) * 5, z: 0.4 }, false); me.rotation.z = Math.PI / 2; if (o.t > o.T - 0.15) me.position.y += (o.t - (o.T - 0.15)) * 40 }
    else if (o.k === 'water') { const me = getObj('water', used.water++); place(me, { x: o.x, y: 1.5 + Math.sin(r.t * 18) * 0.06, z: 0.3 }, o.v > 0) }
    else if (o.k === 'ladle') { const me = getObj('ladle', used.ladle++), x = o.go ? o.x : Math.max(view.x - view.w / 2 + 2.7, Math.min(view.x + view.w / 2 - 2.7, o.x)); place(me, { x, y: o.y, z: 0.4 }, o.v > 0); me.rotation.z = o.go ? Math.sin(r.t * 20) * 0.12 : Math.sin(r.t * 30) * 0.05 }
    else if (o.k === 'sandal') { const me = getObj('sandal', used.sandal++); place(me, { x: o.go ? o.x : o.x + Math.sign(o.v) * 2.2, y: 0.95 }, o.v > 0); me.rotation.z = o.go ? Math.sin(r.t * 30) * 0.08 : 0 }
    else if (o.k === 'dust') { const me = o.pink ? getObj('slip', used.slip++) : getObj('dust', used.dust++); place(me, o, o.v > 0); me.rotation.z = r.t * 6 }
    else if (o.k === 'wave' && waveN < 4) { const w = waves[waveN++]; w.visible = true; w.position.set(o.x, 0.9, 0); w.rotation.z = o.v > 0 ? -0.35 : 0.35 }
  }
  if (b.act && b.act.k === 'toss' && b.act.t < b.act.warn) ring(b.act.tx)
  if (r.cat && (r.cat.st === 'crouch' || r.cat.st === 'leap')) ring(r.cat.tx)
  // フライ返し: 赤い輪の上へ、最後の0.25秒で振り下ろす
  spatWarn.visible = false
  if (b.act && b.act.k === 'flip' && b.act.t < b.act.warn) {
    ring(b.act.tx, 1.15); const left = b.act.warn - b.act.t, len = 3.2 * ASPECT.p_spatula.a
    if (left < 0.6) { spatWarn.visible = true; spatWarn.position.set(b.act.tx, len / 2 + 3 + Math.max(0, left - 0.1) * 22, 0.4); spatWarn.rotation.z = Math.PI / 2; spatWarn.scale.set(1, 1, 1) }
  }
  for (let i = ringN; i < RN; i++) rings[i].visible = false
  ringMat.opacity = 0.6 + Math.sin(performance.now() * 0.018) * 0.3
  for (let i = waveN; i < 4; i++) waves[i].visible = false
  // コショウの瓶と粉の雲、ご飯つぶ、蛇口の水
  const pep = r.pepper
  pepperM.visible = !!pep && pep.st !== 'gone' && r.mode !== 'run'
  if (pepperM.visible) { pepperM.position.set(pep.x, 0, 0.6); pepperM.rotation.z = pep.st === 'fall' ? -(pep.dir || 1) * Math.min(1, pep.t / 0.28) * 1.45 : Math.sin(r.t * 3) * 0.02; pepperM.position.x = pep.x + (pep.st === 'fall' ? (pep.dir || 1) * Math.min(1, pep.t / 0.28) * 0.9 : 0) }
  cloudM.visible = false
  if (cloud) {
    cloud.t += dt; const k = Math.min(1, cloud.t / 0.55), fy = 11 + momG.position.y
    cloudM.visible = true; cloudM.position.set(cloud.x + (b.x - cloud.x) * k * k, 1.6 + (fy - 1.6) * k, 0.6 + (BOSS_Z + 3 - 0.6) * k)
    cloudM.scale.setScalar(0.8 + k * 1.2 + Math.max(0, cloud.t - 0.55) * 1.2); cloudM.material.opacity = cloud.t < 0.6 ? 0.95 : Math.max(0, 0.95 - (cloud.t - 0.6) * 1.8)
    if (cloud.t > 1.2) cloud = null
  }
  riceM.visible = !!r.rice
  if (r.rice) { riceM.position.set(r.rice.x, 0.75 + Math.abs(Math.sin(r.t * 4)) * 0.35, 0.5); riceM.rotation.z = Math.sin(r.t * 3) * 0.2 }
  const tapRun = r.stage === 2 && !r.over && ((b.act && b.act.k === 'water') || r.objs.some(o => o.k === 'water' && o.t < 0.6))
  kitchen.tap.userData.water.visible = tapRun
  if (mode === 'play' && tapRun !== tapOn) { tapOn = tapRun; Snd.loop('tap', tapRun ? WATER : null, 0.5, 0.15) }
  for (const k in pool) pool[k].forEach((me, i) => { if (i >= used[k]) me.visible = false })
  // 掃除機
  const nz = r.nozzle
  nozzle.visible = !!nz; hose.visible = !!nz
  if (nz) {
    const side = nz.k === 'suck' ? nz.side : Math.sign(nz.v)
    const faceLeft = nz.k === 'suck' ? nz.side > 0 : nz.v < 0   // 絵は口が左向き
    nozzle.position.set(nz.x, 0.05, 0.3); nozzle.scale.x = faceLeft ? 1 : -1
    nozzle.position.y = nz.on ? Math.abs(Math.sin(r.t * 40)) * 0.06 : 0.05
    const h0 = new THREE.Vector3(nz.x + (faceLeft ? 0.9 : -0.9), 3, 0.3), h1 = new THREE.Vector3(b.x + 6 * flip, 7, BOSS_Z + 0.4)
    const curve = new THREE.CatmullRomCurve3([h0, new THREE.Vector3((h0.x + h1.x) / 2, 9, -3), new THREE.Vector3((h0.x * 0.2 + h1.x * 0.8), 8, BOSS_Z * 0.7), h1])
    hose.geometry.dispose(); hose.geometry = new THREE.TubeGeometry(curve, 16, 0.42, 7, false)
    void side
  }
  streaks.forEach(s => {
    const on = nz && nz.k === 'suck' && nz.on; s.m.visible = !!on; if (!on) return
    s.k = (s.k + dt * 1.4) % 1; const fromX = nz.x - nz.side * 15, x = fromX + (nz.x - fromX) * s.k
    s.m.position.set(x, s.y * (1 - s.k) + 1.2 * s.k, 0.1); s.m.material.opacity = 0.45 * Math.sin(s.k * 3.14)
  })
  // 猫
  for (const k in catM) catM[k].visible = false
  const c = r.cat
  if (c) {
    const me = c.st === 'crouch' ? catM.crouch : c.st === 'leap' ? catM.leap : catM.swat
    me.visible = true; me.position.set(c.x, c.y, 0.25); me.scale.x = c.dir > 0 ? -1 : 1
    me.rotation.z = c.st === 'crouch' ? Math.sin(r.t * 24) * 0.03 : 0
  }
  stepParts(dt)
  // ルンバとおとん
  const rb = r.roomba, inRun = r.mode === 'run'
  roombaG.visible = (inRun && rb.alive && r.stage !== 2) || !!(c && c.roomba)
  tomatoM.visible = inRun && rb.alive && r.stage === 2
  if (tomatoM.visible) { const R2 = CFG2.roomba.R; tomatoM.position.set(rb.x, R2 + Math.abs(Math.sin(r.t * 9)) * 0.08, 0.2); tomatoM.rotation.z = -rb.x / R2; const k = rb.hitT > 0 ? 1.1 : 1; tomatoM.scale.set(k, k, 1) }
  if (c && c.roomba) { roombaG.position.set(c.x, c.y, 0.2); roombaG.scale.set(c.dir > 0 ? 1 : -1, 1, 1) } else { const k = rb.hitT > 0 ? 1.08 : 1; roombaG.position.set(rb.x, Math.abs(Math.sin(r.t * 30)) * 0.04, 0); roombaG.scale.set((rb.dir > 0 ? 1 : -1) * k, k, k) }
  { const t = ready(texs.p_roomba); roombaM.visible = t; roombaStub.visible = !t }
  if (dadT >= 0) { dadT += dt; const k = dadT / 7; dadM.visible = k < 1; dadM.position.set(view.x + 16 - k * 32, 0, -22); dadM.position.y = momG.position.y + Math.abs(Math.sin(dadT * 5)) * 0.3; if (k >= 1) dadT = -1 } else dadM.visible = false
  // カメラ
  const half = view.w / 2, tgt = inRun ? Math.max(half, m.x + 3) : r === idleRun ? 60 : Math.max(CFG.arenaL + half, Math.min(CFG.arenaR - half, m.x * 0.55 + b.x * 0.45))
  view.x += (tgt - view.x) * Math.min(1, dt * 5.5)
  view.shake = Math.max(0, view.shake - dt * 1.8)
  cam.position.set(view.x + (Math.random() - 0.5) * view.shake, view.camY + (Math.random() - 0.5) * view.shake, D); cam.lookAt(view.x, view.camY, 0); cam.position.x += 0
  stage.sun.position.set(view.x - 8, 42, 26); stage.sun.target.position.set(view.x, 0, -4)
  // 画面の外から来る物の矢印
  let L = false, R = false
  const mark = x => { if (x < view.x - half + 0.6) L = true; if (x > view.x + half - 0.6) R = true }
  for (const o of r.objs) if (o.k === 'sandal' || o.k === 'dust' || o.k === 'water' || (o.k === 'ladle' && o.go)) mark(o.x)
  if (nz) mark(nz.x); if (c && c.st !== 'leave') mark(c.x)
  $('edgeL').classList.toggle('hidden', !L); $('edgeR').classList.toggle('hidden', !R)
  // ピンクが届く時だけジャンプボタンを光らせる
  const glow = mode === 'play' && r.objs.some(o => o.pink && (o.live || o.k === 'dust') && Math.hypot(o.x - m.x, o.y - m.y - 1) < 4.5) && !seen.parried
  $('bJ').classList.toggle('glow', glow)
  if (glow && !m.ground) { $('guide').textContent = T.hintParry; $('guide').classList.remove('hidden'); guideT = 1 }
  // 走る区間の案内（動きで見せる。文字は1つ）
  if (r.stage === 2 && mode === 'play') {
    const p = r.pepper, q = r.C.pits[0]
    const h = inRun ? (m.x > q[0] - 7 && m.x < q[0] ? ['bJ', T.hintPit] : null)
      : r.rice ? [null, T.hintRice]
      : !seen.s2won && r.objs.some(o => o.k === 'ladle') ? [null, T.hintLadle]
      : !seen.s2won && r.objs.some(o => o.k === 'water' && (o.x - m.x) * -Math.sign(o.v) > 0) ? ['bJ', T.hintWater]
      : p && p.st === 'stand' && !seen.knocked && r.mode === 'fight' && !(b.sneeze > 0) && Math.abs(m.x - p.x) < 7 ? ['bD', T.hintPepper] : null
    for (const id of ['bR', 'bD']) $(id).classList.toggle('glow', !!h && h[0] === id); if (h && h[0] === 'bJ' && !glow) $('bJ').classList.add('glow')
    if (h) { $('guide').textContent = h[1]; $('guide').classList.remove('hidden'); guideT = 0.2 } else if (guideT < 0 && !glow) $('guide').classList.add('hidden')
  } else if (inRun && mode === 'play') {
    const h = m.x < 6 ? ['bR', T.hintMove] : m.x < 12 ? ['bJ', T.hintJump] : m.x > 22 && m.x < 30 && !seen.dashed ? ['bD', T.hintDash] : null
    for (const id of ['bR', 'bD']) $(id).classList.toggle('glow', !!h && h[0] === id); if (h && h[0] === 'bJ') $('bJ').classList.add('glow')
    if (h) { $('guide').textContent = h[1]; $('guide').classList.remove('hidden'); guideT = 0.2 } else if (guideT < 0) $('guide').classList.add('hidden')
  } else if (mode === 'play') { $('bR').classList.remove('glow'); $('bD').classList.remove('glow') }
}
let guideT = 0, hintStep = 0
const idleRun = newRun(5, { retry: true }); idleRun.me.x = 56; idleRun.boss.pose = 'search'

function frame(now) {
  requestAnimationFrame(frame)
  if (window.__freeze) return
  let dt = Math.min(0.05, (now - last) / 1000); if (!last) dt = 0; last = now
  if (mode === 'play' && !paused) {
    acc += dt; let n = 0
    while (acc >= DT && n < 5) {
      tick(); acc -= DT; n++
    }
    if (n >= 5) acc = 0
    if (run.over && mode === 'play' && finishAt && performance.now() >= finishAt) { finishAt = 0; showResult() }
  } else if (mode === 'title') idleRun.t += dt
  sayT -= dt; if (sayT <= 0) $('say').classList.add('hidden')
  if (cutT > 0) { cutT -= dt; if (cutT <= 0) $('cut').classList.add('hidden') }
  guideT -= dt; if (guideT < 0 && run && run.mode !== 'run' && !$('guide').classList.contains('hidden')) $('guide').classList.add('hidden')
  if (flashK > 0) { flashK = Math.max(0, flashK - dt * 2.2) } $('flash').style.opacity = flashK.toFixed(3)
  drawWorld(dt); hideUnloaded(); renderer.render(scene, cam)
}
function hideUnloaded() { for (const m of cuts) if (m.visible && !ready(m.material.map)) m.visible = false }
function tick() {
  const inp = autoBot ? autoBot(run) : { left: held.left, right: held.right, jumpHeld: held.jumpHeld, jump: edge.jump, dash: edge.dash }
  edge.jump = false; edge.dash = false
  step(run, inp)
  if (window.__retryAt && run.mode === 'fight') { window.__retryMs = performance.now() - window.__retryAt; window.__retryAt = 0 }
  for (const e of run.ev) handle(e); run.ev.length = 0
}

// ---------------------------------------------------------------- 起動
loadImg('mom_search').then(async () => {
  setPose('search')
  window.__bootDone = true; window.__bootStep && window.__bootStep(); $('boot').classList.add('gone'); $('title').classList.remove('hidden'); mode = 'title'; last = performance.now()
  window.__okanReady = true
  // 確認用: #bot2 で2面を人の速さの bot が遊ぶ（iOS シミュレーターはタップできないため）
  if (location.hash === '#bot2') setTimeout(() => { start(false, { stage: 2 }); autoBot = makeBot('human', 5) }, 2500)
  // ここから裏で順に: 主人公 → 画像
  import('./hero.js?v=4').then(async H => { await H.loadHero(); hero = new H.Hero(scene); window.__heroDone = true; await loadImagesLater() }).catch(e => { console.error(e); loadImagesLater() })
}).catch(e => { console.error(e); throw e })
requestAnimationFrame(frame)

window.okan = {
  get hero() { return hero },
  get run() { return run }, get mode() { return mode }, get stage() { return stageN }, start, toStage2, view, cam, kitchen,
  dbg: {
    auto(k) { autoBot = k ? makeBot(k, 3) : null },
    stepN(n) { for (let i = 0; i < n && !run.over; i++) tick(); if (run.over) finishAt = 1 },
    render(dt = 0.016) { drawWorld(dt); renderer.render(scene, cam) },
    pause(v) { paused = v }
  },
  leftPct: () => leftPct(run),
  ready2: () => S2.every(n => ready(texs[n])),
  itemXY(x, y) { const v = new THREE.Vector3(x, y, 0).project(cam); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight } }
}
void TITLE; void hintStep
