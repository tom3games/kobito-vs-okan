// SNS 用の画像（1200x630）。スリッパを弾き返す場面。node og.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const PORT = 5794, ROOT = import.meta.dirname, server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 1200, height: 630 } }); await muteContext(ctx)
const p = await ctx.newPage(); await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__imgAllDone && window.__heroDone, null, { timeout: 40000 })
await p.evaluate(() => {
  okan.start(true); okan.dbg.pause(true); window.__freeze = true
  const r = okan.run; for (let i = 0; i < 50; i++) okan.dbg.stepN(1)
  r.boss.x = 64; r.boss.pose = 'throw'; r.boss.stuck = Array.from({ length: 24 }, (_, i) => ({ x: Math.sin(i * 2.1) * 3, y: 2 + i * 0.4, a: i }))
  r.me.x = 58.5; r.me.y = 3.6; r.me.ground = false; r.me.face = 1
  r.objs = [{ id: 1, k: 'back', x: 60.2, y: 6.2, z: -1, rot: 0.7 }, { id: 2, k: 'slip', st: 'fly', tx: 70, x0: 64, x: 69, y: 3, z: -1, rot: -0.5, ring: true }]
  r.shots = [0.2, 0.5, 0.8].map(t => ({ k: 'in', t, T: 1, x0: 58.5, y0: 4.7, lx: 1 + t, ly: 8 + t * 3 }))
  okan.view.x = 66; okan.view.camY = 11; for (let i = 0; i < 6; i++) okan.dbg.render(0.016)
  document.getElementById('hud').classList.add('hidden'); document.getElementById('title').classList.add('hidden')
  const o = document.createElement('div'); o.innerHTML = '<div class="sign" style="position:fixed;left:30px;top:26px"><i></i><i></i><i></i><i></i><h1 style="font-size:52px">小人になって<br>おかんと戦え</h1></div><p style="position:fixed;left:40px;bottom:22px;margin:0;color:#fff;font:600 30px Klee One,serif;text-shadow:0 2px 4px #000,0 0 10px #000">体2cm。爪楊枝でおかんに挑む横スクロールのバカゲー</p>'; document.body.appendChild(o)
})
await p.waitForTimeout(700); await p.screenshot({ path: ROOT + '/og.png' }); await b.close(); server.kill(); process.exit(0)
