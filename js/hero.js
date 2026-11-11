// 主人公: 切り絵（img/hero_atlas.webp）。横向きの紙で、動きで絵を替える。紙は判定より少し大きく 3.3（小さいと顔が読めない）。当たり判定は shared/sim.js のまま
import * as THREE from 'three'
import { HERO_ART as ART } from './heroart.js?v=2'
const V = new URL(import.meta.url).search, H = 3.3, PS = ART.poses
let tex = null
export function loadHero() {
  return new Promise((ok, ng) => new THREE.TextureLoader().load(`img/hero_atlas.webp${V}`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; tex = t; ok() }, undefined, ng))
}
export class Hero {
  constructor(scene) {
    this.g = new THREE.Group(); scene.add(this.g)
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0)
    this.mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, toneMapped: false, color: 0xfff6e8 })
    this.paper = new THREE.Mesh(geo, this.mat); this.paper.castShadow = true; this.paper.frustumCulled = false; this.g.add(this.paper)
    this.key = null; this.phase = 0; this.sx = 1; this.pop = 0; this.was = 'idle'; this.setPose('side_stand')
  }
  setPose(k) {
    if (k === this.key) return
    this.key = k
    const p = PS[k], uv = this.paper.geometry.attributes.uv, u0 = p.x / ART.W, u1 = (p.x + p.w) / ART.W, v1 = 1 - p.y / ART.H, v0 = 1 - (p.y + p.h) / ART.H
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true
  }
  update(r, dt) {
    const m = r.me, g = this.g
    g.position.set(m.x, m.y, 0)
    const lost = r.over && !r.won, moving = Math.abs(m.vx) > 1
    let key, bob = 0, rot = 0
    if (lost) key = m.ground ? 'flat_down' : 'front_hit'
    else if (m.knock > 0 || m.sneezeT > 0) key = 'front_hit'
    else if (m.dashT > 0) key = 'side_dash'
    else if (r.mode === 'win') { this.phase += dt * 7; key = 'side_jump'; bob = Math.abs(Math.sin(this.phase)) * 0.5 }
    else if (!m.ground) key = 'side_jump'
    else if (moving) { this.phase += dt * 15; key = Math.sin(this.phase) > 0 ? 'side_run_a' : 'side_run_b'; bob = Math.abs(Math.sin(this.phase)) * 0.12; rot = -m.face * 0.06 }
    else if (r.mode === 'fight') key = Math.floor(r.t / 0.2) % 2 ? 'side_throw' : 'side_stand'   // 爪楊枝は自動で飛ぶ
    else key = 'side_stand'
    const st = !m.ground ? 'air' : 'floor'
    if (this.was === 'air' && st === 'floor' && !lost) this.pop = 1
    this.was = st; this.pop = Math.max(0, this.pop - dt * 6)
    this.setPose(key)
    const flip = key === 'front_hit' ? 1 : m.face > 0 ? 1 : -1
    this.sx += (flip - this.sx) * Math.min(1, dt * 22)
    const p = PS[key], sq = 1 - this.pop * 0.14, sx = Math.abs(this.sx) < 0.05 ? 0.05 * flip : this.sx, P = this.paper
    P.scale.set(p.uw * H * sx * (2 - sq), p.uh * H * sq, 1); P.position.y = bob; P.rotation.z = rot
    P.visible = !(m.iT > 0 && !r.over && Math.floor(r.t * 18) % 2 === 0)
  }
}
