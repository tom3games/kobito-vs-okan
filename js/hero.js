// 主人公: KayKit Adventurers の Ranger（CC0）をティッシュの白に塗り替え、横向きに走らせる。体の高さ 2.1
import * as THREE from 'three'
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js?v=1'
import { clone as skClone } from '../vendor/jsm/utils/SkeletonUtils.js?v=1'
const BASE = 'assets/chars/'
const A = { ranger: null, clips: {}, tex: null }
function recolor(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const x = c.getContext('2d'); x.drawImage(img, 0, 0)
  const cw = img.width / 8, ch = img.height / 4
  const grad = (col, row, top, bot, cols = 1) => { const g = x.createLinearGradient(0, row * ch, 0, (row + 1) * ch); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(col * cw, row * ch, cols * cw, ch) }
  grad(5, 0, '#ffffff', '#d9dad6', 2); grad(2, 2, '#ffffff', '#d4d5d1')
  grad(0, 1, '#f4f4ee', '#c8c9c4'); grad(1, 2, '#f4f4ee', '#c8c9c4')
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false
  return t
}
export function loadHero(manager) {
  const L = new GLTFLoader()
  const get = f => new Promise((ok, ng) => L.load(BASE + f, ok, undefined, ng))
  return Promise.all([get('Ranger.glb'), get('Rig_Medium_General.glb'), get('Rig_Medium_MovementBasic.glb')]).then(([r, g1, g2]) => {
    r.scene.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.frustumCulled = false
        if (/Quiver|Cape|Bow|Arrow/i.test(o.name)) o.visible = false
        if (o.material && o.material.map && !A.tex) A.tex = recolor(o.material.map.image)
        if (o.material && A.tex) { o.material = o.material.clone(); o.material.map = A.tex; o.material.roughness = 0.8; o.material.metalness = 0 }
      }
    })
    A.ranger = r.scene
    for (const cl of [...g1.animations, ...g2.animations]) A.clips[cl.name] = cl
  })
}
export class Hero {
  constructor(scene) {
    this.g = new THREE.Group(); scene.add(this.g)
    const ch = this.char = skClone(A.ranger)
    const box = new THREE.Box3().setFromObject(ch), h = box.max.y - box.min.y
    this.k = 2.8 / h; ch.scale.setScalar(this.k); ch.position.y = -box.min.y * this.k
    this.g.add(ch)
    this.mixer = new THREE.AnimationMixer(ch); this.acts = {}
    for (const n of ['Idle_A', 'Running_A', 'Jump_Idle', 'Jump_Land', 'Hit_A', 'Death_A', 'Throw']) {
      if (!A.clips[n]) continue
      const a = this.mixer.clipAction(A.clips[n]); this.acts[n] = a
      if (/Death|Jump_Land|Throw|Hit/.test(n)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true }
    }
    this.cur = null; this.play('Idle_A'); this.yaw = Math.PI / 2; this.lastState = ''
    // 手に持っている爪楊枝
    this.mats = []; ch.traverse(o => { if (o.isMesh) this.mats.push(o.material) })
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0xd9b57a, roughness: 0.8 }))
    let hand = null; ch.traverse(o => { if (o.isBone && /hand.?r|handslot.?r|wrist.?r/i.test(o.name) && !hand) hand = o })
    if (hand) { pick.scale.setScalar(1 / this.k); pick.position.set(0, 0, 0); hand.add(pick) } else { pick.position.set(0.5, 1.2, 0); this.g.add(pick) }
  }
  play(n, fade = 0.12) {
    const a = this.acts[n]; if (!a || this.cur === a) return
    a.reset().setEffectiveWeight(1).fadeIn(fade).play(); if (this.cur) this.cur.fadeOut(fade); this.cur = a
  }
  update(r, dt) {
    const m = r.me, g = this.g
    g.position.set(m.x, m.y, 0)
    const want = (m.face > 0 ? 1 : -1) * (Math.PI / 2 - 0.34)
    this.yaw += (want - this.yaw) * Math.min(1, dt * 16); g.rotation.y = this.yaw
    g.rotation.z = m.dashT > 0 ? -m.dashDir * 0.42 : 0
    const moving = Math.abs(m.vx) > 1
    const st = r.over && !r.won ? 'dead' : !m.ground ? 'air' : moving ? 'run' : 'idle'
    if (st !== this.lastState) {
      if (st === 'dead') this.play('Death_A', 0.08)
      else if (st === 'air') this.play('Jump_Idle', 0.08)
      else if (st === 'run') this.play('Running_A', 0.1)
      else this.play('Idle_A', 0.14)
      this.lastState = st
    }
    if (st === 'run' && this.acts.Running_A) this.acts.Running_A.timeScale = 1.35
    this.char.visible = !(m.iT > 0 && !r.over && Math.floor(r.t * 18) % 2 === 0)
    this.mixer.update(dt)
  }
}
