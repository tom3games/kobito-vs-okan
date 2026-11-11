// 舞台: 昭和の居間を横から見る。全部コードで作る（畳・ふすま・茶だんす・テレビ・ちゃぶ台・マッチ箱）
import * as THREE from 'three'
import { CFG } from '../shared/sim.js?v=2'
export function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]) }
  return t
}
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o })
function box(scene, w, h, d, x, y, z, mat, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m
}
export function buildStage(scene0) {
  const scene = new THREE.Group(); scene0.add(scene)   // 1面の物は全部この中（2面では隠す）。光と霧は全体に
  const L = -40, R = CFG.arenaR + 40, cx = (L + R) / 2, W = R - L
  // 畳
  const tatami = tex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#b5ad6c'; x.fillRect(0, 0, w, h)
    for (let i = 0; i < 9000; i++) { x.fillStyle = i % 2 ? 'rgba(90,90,30,.13)' : 'rgba(235,230,160,.11)'; x.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 90, 1.5) }
    x.fillStyle = '#3e5a3a'; x.fillRect(0, 0, w, 44); x.fillRect(0, 512, w, 44)
    x.fillStyle = 'rgba(220,210,150,.5)'; for (let i = 0; i < w; i += 32) { x.fillRect(i, 18, 14, 6); x.fillRect(i, 530, 14, 6) }
  }, [W / 28, 3.2])
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, 90), std({ map: tatami })); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, 10); floor.receiveShadow = true; scene.add(floor)
  // 廊下（走る区間）: 板の間
  const boards = tex(1024, 512, (x, w, h) => { for (let r = 0; r < 4; r++) { const tn = 120 + Math.random() * 28; x.fillStyle = `rgb(${tn + 40},${tn},${tn - 44})`; x.fillRect(0, r * h / 4, w, h / 4); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(60,30,10,${0.05 + Math.random() * 0.12})`; x.beginPath(); const y = r * h / 4 + Math.random() * h / 4; x.moveTo(0, y); x.bezierCurveTo(300, y + 8, 700, y - 8, w, y); x.stroke() } x.fillStyle = 'rgba(30,14,4,.85)'; x.fillRect(0, r * h / 4, w, 3) } }, [5, 4])
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(CFG.arenaL + 40, 90), std({ map: boards })); hall.rotation.x = -Math.PI / 2; hall.position.set((CFG.arenaL - 40) / 2, 0.02, 10); hall.receiveShadow = true; scene.add(hall)
  // 廊下の小物: 電話台と下駄箱（奥）
  const hw = std({ color: 0x5f3b1d })
  box(scene, 10, 10, 6, 14, 0, -28, hw); box(scene, 16, 15, 6, 34, 0, -29, hw)
  const ph = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12), std({ color: 0x20201f, roughness: 0.3 })); ph.scale.set(1.3, 0.75, 1); ph.position.set(14, 11.4, -28); scene.add(ph)
  // 走る区間の足場（文庫本）と画びょう
  const bookT = tex(512, 128, (x, w, h) => { x.fillStyle = '#e4dcc4'; x.fillRect(0, 0, w, h); x.fillStyle = '#b8ae90'; for (let i = 8; i < h; i += 7) x.fillRect(0, i, w, 2); x.fillStyle = '#2f5a7c'; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14) })
  for (const p of CFG.plats) if (p.x0 < CFG.arenaL) { const m = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, p.y, 4.4), std({ map: bookT })); m.position.set((p.x0 + p.x1) / 2, p.y / 2, 0); m.castShadow = m.receiveShadow = true; scene.add(m) }
  const tackM = std({ color: 0xd6d6d0, metalness: 0.75, roughness: 0.3 }), tackH = std({ color: 0xc23a2a, roughness: 0.4 })
  for (const [a, b] of CFG.tacks) for (let tx = a; tx <= b; tx += 0.62) for (const tz of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12), tackH); head.rotation.z = 2.9 + (tx % 1) * 0.3; head.position.set(tx + tz * 0.15, 0.2, tz); head.castShadow = true; scene.add(head)
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.55, 6), tackM); pin.position.set(tx + tz * 0.15, 0.48, tz); scene.add(pin)
  }
  // 壁（砂壁）とふすま
  const wall = tex(512, 512, (x, w, h) => { x.fillStyle = '#c9b48a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 12000; i++) { x.fillStyle = i % 2 ? 'rgba(90,70,40,.1)' : 'rgba(255,245,215,.1)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2) } }, [8, 3])
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, 70), std({ map: wall })); back.position.set(cx, 35, -34); scene.add(back)
  const fusuma = tex(512, 900, (x, w, h) => {
    x.fillStyle = '#e6dcc0'; x.fillRect(0, 0, w, h)
    x.strokeStyle = 'rgba(120,130,90,.75)'; x.lineWidth = 7
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-10, 640 + i * 44); x.bezierCurveTo(140, 520 + i * 44, 300, 760 + i * 30, 530, 610 + i * 40); x.stroke() }
    x.fillStyle = '#5a3a1e'; x.fillRect(0, 0, w, 20); x.fillRect(0, h - 20, w, 20); x.fillRect(0, 0, 20, h); x.fillRect(w - 20, 0, 20, h)
    x.fillStyle = '#2b2118'; x.beginPath(); x.ellipse(w - 70, h / 2, 22, 34, 0, 0, 7); x.fill()
  })
  const fm = std({ map: fusuma }); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 29), fm); m.position.set(38 + i * 16.8 - 16, 14.5, -33.5); scene.add(m) }
  box(scene, W, 1.6, 0.8, cx, 29, -33.2, std({ color: 0x4a2f18 }), false)
  // 茶だんす
  const wood = tex(256, 256, (x, w, h) => { x.fillStyle = '#7a4c26'; x.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(40,20,5,${0.1 + Math.random() * 0.2})`; x.beginPath(); const y = Math.random() * h; x.moveTo(0, y); x.bezierCurveTo(80, y + 8, 170, y - 8, w, y + 3); x.stroke() } })
  const wm = std({ map: wood })
  box(scene, 15, 21, 5, 42, 0, -30, wm); box(scene, 13, 7, 0.4, 42, 12, -27.4, std({ color: 0x9fb3b5, roughness: 0.15, metalness: 0.4 }), false)
  for (const [px, c] of [[38.5, 0xc95b4a], [41.5, 0xe6e0c8], [45, 0x4a6d8c]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 2.6, 14), std({ color: c })); m.position.set(px, 13.6, -28.5); scene.add(m) }
  // ブラウン管テレビ
  box(scene, 14, 11, 7, 84, 0, -29, wm)
  box(scene, 9.5, 8, 0.4, 82.6, 1.6, -25.4, std({ color: 0x28302c, roughness: 0.15 }), false)
  for (let i = 0; i < 2; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 14), std({ color: 0xcfc7ae })); k.rotation.x = Math.PI / 2; k.position.set(88.8, 7 - i * 2.4, -25.3); scene.add(k) }
  // ちゃぶ台（奥。おかんの後ろ）
  const top = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.7, 36), wm); top.position.set(52, 5.2, -27); top.castShadow = true; scene.add(top)
  for (const [dx, dz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 4.9, 8), wm); l.position.set(52 + dx, 2.45, -27 + dz); scene.add(l) }
  const yu = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1, 2.4, 16), std({ color: 0x51707a })); yu.position.set(50, 6.7, -26); scene.add(yu)
  // 足場: マッチ箱
  const match = tex(512, 256, (x, w, h) => {
    x.fillStyle = '#d8392a'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4e4b0'; x.fillRect(16, 16, w - 32, h - 32); x.fillStyle = '#d8392a'; x.fillRect(28, 28, w - 56, h - 56)
    x.fillStyle = '#f4e4b0'; x.font = '700 92px system-ui,-apple-system,"Hiragino Sans",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('安全マッチ', w / 2, h / 2 + 4)
  })
  const mm = [std({ color: 0x6d4525 }), std({ color: 0x6d4525 }), std({ color: 0xe9dcc0 }), std({ color: 0xe9dcc0 }), std({ map: match }), std({ color: 0xe9dcc0 })]
  for (const p of CFG.plats) { if (p.x0 < CFG.arenaL) continue; const m = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, p.y, 3.6), mm); m.position.set((p.x0 + p.x1) / 2, p.y / 2, 0); m.castShadow = m.receiveShadow = true; scene.add(m) }
  // 部屋の両端: 柱
  for (const px of [CFG.arenaL - 0.6, CFG.arenaR + 0.6]) box(scene, 1.6, 60, 12, px, 0, -28, std({ color: 0x4a2f18, map: wood }))
  // 手前のミカン（ぼけて手前を通る。奥行きのため）
  const ora = new THREE.Mesh(new THREE.SphereGeometry(3.2, 22, 16), std({ color: 0xe88a1d, roughness: 0.5 })); ora.position.set(47, 2.8, -7); ora.scale.y = 0.88; ora.castShadow = true; scene.add(ora)
  const ora2 = ora.clone(); ora2.position.set(75, 2.8, -9); scene.add(ora2)
  // 光
  scene0.background = new THREE.Color(0x2a2118); scene0.fog = new THREE.Fog(0x3a2c18, 40, 110)
  scene0.add(new THREE.HemisphereLight(0xfff0d6, 0x6e5a32, 1.5))
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.1); sun.position.set(60, 40, 26); sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024); const c = sun.shadow.camera; c.left = -24; c.right = 24; c.top = 24; c.bottom = -24; c.far = 110; sun.shadow.bias = -0.0006
  scene0.add(sun, sun.target); return { sun, g: scene }
}
