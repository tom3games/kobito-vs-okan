// 2面の舞台: 昭和の台所を横から見る。小人は調理台の上、おかんは台の向こう（床が9下）。全部コードで作る
import * as THREE from 'three'
import { CFG2 } from '../shared/sim.js?v=2'
import { tex } from './stage.js?v=2'
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o })
export const KITCHEN_FLOOR = -9   // おかんの立つ床（台の天板が 0）
function box(g, w, h, d, x, y, z, mat, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m
}
const LABEL_FONT = '700 96px "Klee One",system-ui,-apple-system,"Hiragino Sans",sans-serif'
export function buildKitchen(scene) {
  const g = new THREE.Group(); g.visible = false; scene.add(g)
  const C = CFG2, L = -40, R = C.arenaR + 40, F = KITCHEN_FLOOR
  // 天板（ステンレスのヘアライン）
  const steel = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#b9bec2'; x.fillRect(0, 0, w, h)
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${i % 2 ? '255,255,255' : '60,66,72'},${0.04 + Math.random() * 0.06})`; x.fillRect(0, Math.random() * h, w, 1) }
    for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(120,110,90,.08)'; x.lineWidth = 6; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 0, 7); x.stroke() }   // 水あと
  }, [6, 2])
  const topM = std({ map: steel, roughness: 0.42, metalness: 0.3 })
  const Z0 = -9, Z1 = 6
  const solid = [[L, C.pits[0][0]], [C.pits[0][1], C.pits[1][0]], [C.pits[1][1], C.arenaR + 1.4]]
  for (const [a, b] of solid) { const m = box(g, b - a, 0.7, Z1 - Z0, (a + b) / 2, -0.7, (Z0 + Z1) / 2, topM, false); m.castShadow = false }
  // 穴の前と後ろの縁（落ちると縁の陰に隠れる）
  for (const [a, b] of C.pits) { box(g, b - a, 0.7, 2.2, (a + b) / 2, -0.7, Z1 - 1.1, topM, false); box(g, b - a, 0.7, 3, (a + b) / 2, -0.7, Z0 + 1.5, topM, false) }
  // 1つ目の穴は流し（底に排水口）、2つ目はコンロとのすき間（パンくず）
  {
    const [a, b] = C.pits[0], inner = std({ color: 0x9aa1a6, roughness: 0.4, metalness: 0.25 })
    box(g, b - a, 0.3, 10, (a + b) / 2, -7, -1.5, inner, false)
    for (const x of [a, b]) box(g, 0.2, 6.6, 10, x, -7, -1.5, inner, false)
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 24), std({ color: 0x2a2d30, roughness: 0.4, metalness: 0.5 })); drain.position.set((a + b) / 2, -6.62, -1); g.add(drain)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 8, 24), std({ color: 0xd5d8da, roughness: 0.2, metalness: 0.8 })); rim.rotation.x = Math.PI / 2; rim.position.set((a + b) / 2, -6.55, -1); g.add(rim)
    // 蛇口（奥）
    faucet(g, (a + b) / 2, -6.6)
  }
  {
    const [a, b] = C.pits[1]
    box(g, b - a, 0.2, 14, (a + b) / 2, F, -1, std({ color: 0x1d1a16 }), false)
    for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.2), std({ color: i % 3 ? 0xc89b5a : 0x7a5530 })); c.position.set(a + 0.5 + Math.random() * (b - a - 1), F + 0.3, -4 + Math.random() * 8); g.add(c) }
  }
  // 部屋の右端は2つ目の流し（ここの蛇口から水が来る）
  const sinkX = C.arenaR + 6
  box(g, 9, 0.3, 10, sinkX, -7, -1.5, std({ color: 0x9aa1a6, roughness: 0.4, metalness: 0.25 }), false)
  box(g, 9, 0.7, 2.2, sinkX, -0.7, Z1 - 1.1, topM, false); box(g, 9, 0.7, 3, sinkX, -0.7, Z0 + 1.5, topM, false)
  box(g, 20, 0.7, Z1 - Z0, sinkX + 14.5, -0.7, (Z0 + Z1) / 2, topM, false)
  const tap = faucet(g, C.arenaR - 1, -0.1)   // 部屋の右端の天板の上に立つ蛇口（水はここから床を走る）
  // 天板の前の戸棚（クリーム色の扉と取っ手）
  const doors = tex(1024, 512, (x, w, h) => {
    x.fillStyle = '#efe3c4'; x.fillRect(0, 0, w, h)
    for (let i = 0; i < 4; i++) { const x0 = i * w / 4; x.strokeStyle = '#8c7a55'; x.lineWidth = 6; x.strokeRect(x0 + 10, 14, w / 4 - 20, h - 28); x.fillStyle = '#a4adb3'; x.fillRect(x0 + (i % 2 ? 26 : w / 4 - 66), 40, 40, 12) }
    for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(120,100,60,.05)'; x.fillRect(Math.random() * w, Math.random() * h, 3, 3) }
  }, [(R - L) / 24, 1])
  const front = new THREE.Mesh(new THREE.PlaneGeometry(R - L, 23), std({ map: doors })); front.position.set((L + R) / 2, -12.2, Z1 + 0.02); g.add(front)   // 上端は天板の下端（-0.7）にそろえる。すき間があるとおかんの足が見える
  // おかんの側: 板の床・タイルの壁・窓・コンロ・冷蔵庫
  const boards = tex(512, 256, (x, w, h) => { for (let r = 0; r < 4; r++) { const tn = 130 + Math.random() * 20; x.fillStyle = `rgb(${tn + 36},${tn},${tn - 40})`; x.fillRect(0, r * h / 4, w, h / 4); x.fillStyle = 'rgba(30,14,4,.8)'; x.fillRect(0, r * h / 4, w, 2) } }, [10, 6])
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(R - L, 30), std({ map: boards })); floor.rotation.x = -Math.PI / 2; floor.position.set((L + R) / 2, F, -24); floor.receiveShadow = true; g.add(floor)
  const tiles = tex(512, 512, (x, w, h) => {
    x.fillStyle = '#9fb7ad'; x.fillRect(0, 0, w, h)
    const n = 8, s = w / n
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 228 + Math.random() * 14; x.fillStyle = `rgb(${v - 14},${v},${v - 6})`; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6) }
  }, [24, 7])
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(R - L, 70), std({ map: tiles, roughness: 0.5 })); wall.position.set((L + R) / 2, F + 35, -34); g.add(wall)
  // 窓（夕方）
  const win = tex(512, 384, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6b56b'); gr.addColorStop(1, '#fde2b0'); x.fillStyle = gr; x.fillRect(0, 0, w, h)
    x.fillStyle = '#5a6b52'; x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= 8; i++) x.lineTo(i * w / 8, h * 0.72 - Math.sin(i * 1.7) * 26); x.lineTo(w, h); x.fill()
    x.strokeStyle = '#efe7d6'; x.lineWidth = 18; x.strokeRect(0, 0, w, h); x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke()
  })
  const wm = new THREE.Mesh(new THREE.PlaneGeometry(22, 16), new THREE.MeshBasicMaterial({ map: win, fog: false })); wm.position.set(38, 20, -33.8); g.add(wm)
  // 換気扇
  const fan = new THREE.Group(); fan.position.set(18, 22, -33.6); g.add(fan)
  box(fan, 9, 9, 0.6, 0, -4.5, 0, std({ color: 0xd9d4c6 }), false)
  const grill = tex(256, 256, (x, w, h) => { x.fillStyle = '#d9d4c6'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a4a44'; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.fill(); x.strokeStyle = '#cfc9b8'; x.lineWidth = 5; for (let r = 24; r < 112; r += 18) { x.beginPath(); x.arc(128, 128, r, 0, 7); x.stroke() } x.fillStyle = '#e8e2d2'; x.beginPath(); x.arc(128, 128, 20, 0, 7); x.fill() })
  const blades = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), std({ map: grill })); blades.position.z = 0.35; fan.add(blades)
  // コンロと鍋（おかんの後ろ）
  const wood = std({ color: 0x8b6a45 })
  box(g, 18, 11, 7, 64, F, -29, std({ color: 0xe9e3d3 }))
  box(g, 18, 0.6, 7, 64, F + 11, -29, std({ color: 0x2a2a2a, roughness: 0.5 }))
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(3, 2.7, 4.2, 22), std({ color: 0xb8c0c6, roughness: 0.25, metalness: 0.7 })); pot.position.set(59.5, F + 13.7, -29); g.add(pot)
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.3, 22), std({ color: 0xc9d0d4, roughness: 0.2, metalness: 0.7 })); lid.position.set(59.5, F + 15.9, -29); g.add(lid)
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.8, 0.8, 22), std({ color: 0x232323, roughness: 0.4 })); pan.position.set(68.5, F + 12, -29); g.add(pan)
  // 食器棚（左）
  box(g, 14, 26, 6, 32, F, -30, wood); box(g, 12.4, 10, 0.3, 32, F + 13, -26.9, std({ color: 0xbfd2d6, roughness: 0.1, metalness: 0.3 }), false)
  for (const [px, c] of [[28.5, 0xf2efe6], [31.5, 0xe0c37a], [35, 0x8fb0c8]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, 2, 14), std({ color: c })); m.position.set(px, F + 15, -28.5); g.add(m) }
  // 冷蔵庫（右奥。新品のヨーグルトはここ）
  const fr = std({ color: 0xf1ede3, roughness: 0.4 })
  box(g, 14, 36, 9, C.arenaR + 9, F, -27, fr)
  box(g, 0.8, 8, 0.8, C.arenaR + 3.4, F + 20, -22.3, std({ color: 0xa8aeb3, metalness: 0.6, roughness: 0.3 }))
  const memo = tex(256, 256, (x, w, h) => { x.fillStyle = '#fff8d8'; x.fillRect(0, 0, w, h); x.fillStyle = '#c0281b'; x.beginPath(); x.arc(w / 2, 24, 16, 0, 7); x.fill(); x.fillStyle = '#2a2118'; x.font = '700 50px "Klee One",system-ui,sans-serif'; x.textAlign = 'center'; x.fillText('ヨーグルト', w / 2, 120); x.fillText('さわるな', w / 2, 190) })
  const mm = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), std({ map: memo })); mm.position.set(C.arenaR + 8, F + 25, -22.4); mm.rotation.z = 0.06; g.add(mm)
  // 天板の上: まな板・塩の瓶・醤油差し（足場）
  const board = tex(512, 128, (x, w, h) => { x.fillStyle = '#e7d6b4'; x.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(150,110,60,${0.08 + Math.random() * 0.1})`; x.beginPath(); x.moveTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); x.stroke() } })
  const cb = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), std({ map: board })); cb.rotation.x = -Math.PI / 2; cb.position.set(60, 0.02, -2); cb.receiveShadow = true; g.add(cb)
  const label = (txt, bg, fg) => tex(768, 256, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.fillRect(0, 22, w, 10); x.fillRect(0, h - 32, w, 10); x.font = LABEL_FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 6) })
  const [salt, soy, spg, cup] = C.plats
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, salt.y, 24), [std({ map: label('塩', '#f4f1e8', '#1f4f8a') }), std({ color: 0x2f6fb1 }), std({ color: 0xf4f1e8 })]); m.position.set((salt.x0 + salt.x1) / 2, salt.y / 2, 0); m.rotation.y = Math.PI; m.castShadow = true; g.add(m) }
  {
    const glass = std({ color: 0x4a170c, roughness: 0.15, metalness: 0.1 })
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, soy.y, 24), [std({ map: label('しょうゆ', '#3a1208', '#f4ead2'), roughness: 0.2 }), glass, glass]); m.position.set((soy.x0 + soy.x1) / 2, soy.y / 2, 0); m.rotation.y = Math.PI; m.castShadow = true; g.add(m)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.75, 1.2, 24), std({ color: 0xc23a2a, roughness: 0.4 })); cap.position.set(m.position.x, soy.y + 0.6, 0); g.add(cap)
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.6, 10), std({ color: 0xc23a2a })); sp.position.set(m.position.x - 1, soy.y + 1, 0); sp.rotation.z = 0.9; g.add(sp)
  }
  // 走る区間: スポンジと湯のみ（足場）
  { const m = new THREE.Mesh(new THREE.BoxGeometry(spg.x1 - spg.x0, spg.y, 3.4), [std({ color: 0xf2cf3a }), std({ color: 0xf2cf3a }), std({ color: 0x3d8a4a }), std({ color: 0xf2cf3a }), std({ color: 0xf2cf3a }), std({ color: 0xf2cf3a })]); m.position.set((spg.x0 + spg.x1) / 2, spg.y / 2, 0); m.castShadow = true; g.add(m) }
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.2, cup.y, 22), std({ color: 0x5d7f6a, roughness: 0.3 })); m.position.set((cup.x0 + cup.x1) / 2, cup.y / 2, 0); m.castShadow = true; g.add(m) }
  // 手前のぼけた物（奥行き）: たまご
  const egg = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 14), std({ color: 0xf4ead6, roughness: 0.6 })); egg.scale.y = 1.25; egg.position.set(45, 2.6, -7.5); egg.castShadow = true; g.add(egg)
  return { g, tap }
}
// 蛇口。水を出す時は tap.userData.on を立てると先から水が落ちる
function faucet(g, x, bottom) {
  const f = new THREE.Group(); f.position.set(x, 0, -7.4); g.add(f)
  const chrome = std({ color: 0xdfe4e7, roughness: 0.3, metalness: 0.25 })
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 9, 14), chrome); post.position.y = 4.5; f.add(post)
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 12), chrome); arm.rotation.x = Math.PI / 2; arm.position.set(0, 8.6, 2.4); f.add(arm)
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.9, 12), chrome); head.position.set(0, 8.2, 4.8); f.add(head)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 8.2 - bottom, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.65, roughness: 0.1 }))
  water.position.set(0, (8.2 + bottom) / 2, 4.8); water.visible = false; f.add(water)
  f.userData.water = water
  return f
}
