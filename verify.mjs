// 初版の確認（スマホ縦 390x844、Chromium と WebKit）。node verify.mjs
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const PORT = 5792, server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
let pass = 0, fail = 0
const t = async (name, fn) => { try { const v = await fn(); if (v === false) throw new Error('false'); pass++; console.log('ok  ', name, v === true || v === undefined ? '' : JSON.stringify(v)) } catch (e) { fail++; console.log('FAIL', name, e.message.split('\n')[0]) } }
const must = (c, m) => { if (!c) throw new Error(m) }
for (const [nm, bt, opt] of [['chromium', chromium, {}], ['webkit', webkit, {}]]) {
  const b = await bt.launch(bt === chromium ? { ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : {})
  const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: bt === chromium, deviceScaleFactor: 2, ...opt })
  await muteContext(ctx)
  const p = await ctx.newPage(), errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('requestfailed', r => { if (!/fonts\./.test(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) errs.push('fail ' + r.url()) })
  await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__okanReady, null, { timeout: 40000 })
  await p.waitForTimeout(300); await p.screenshot({ path: `shots/${nm}-title.png` })
  await t(nm + ' 英語の表示', async () => {
    await p.tap('#btnLang'); await p.waitForTimeout(100); const v = await p.evaluate(() => ({ h: document.querySelector('.sign h1').textContent, s: document.getElementById('btnStart').textContent, l: document.documentElement.lang, scroll: document.documentElement.scrollHeight <= innerHeight }))
    await p.screenshot({ path: `shots/${nm}-en.png` }); await p.tap('#btnLang'); must(v.l === 'en' && /TINY/.test(v.h) && v.s === 'FIGHT' && v.scroll, JSON.stringify(v)); return v.h
  })
  await p.waitForFunction(() => window.__imgAllDone && window.__heroDone, null, { timeout: 30000 })
  await p.tap('#btnStart'); await p.waitForTimeout(200)
  await t(nm + ' 走り区間から始まる', () => p.evaluate(() => okan.run.mode === 'run' && okan.run.me.x < 5))
  await p.screenshot({ path: `shots/${nm}-run0.png` })
  await p.evaluate(() => { okan.dbg.pause(true); okan.dbg.auto('skilled'); while (okan.run.me.x < 24 && okan.run.frame < 1200) okan.dbg.stepN(1); okan.dbg.render(); okan.dbg.render() })
  await p.waitForTimeout(80); await p.screenshot({ path: `shots/${nm}-run1.png` })
  await t(nm + ' 走り抜けると おかん戦へ', () => p.evaluate(() => { while (okan.run.mode === 'run' && okan.run.frame < 3000) okan.dbg.stepN(1); okan.dbg.auto(null); okan.dbg.pause(false); return okan.run.mode === 'intro' }))
  await p.waitForTimeout(250); await p.screenshot({ path: `shots/${nm}-intro.png` })
  await p.waitForFunction(() => okan.run.mode === 'fight', null, { timeout: 6000 })
  await t(nm + ' 主人公は切り絵で、動きで絵が替わる', () => p.evaluate(() => {
    okan.dbg.pause(true); const r = okan.run, m = r.me, H = okan.hero, s = { ...m }, keys = {}
    const k = () => { okan.dbg.render(0.05); return H.key }
    m.ground = true; m.vx = 0; m.dashT = 0; m.knock = 0; m.iT = 0; keys.stand = k()
    m.vx = 6; keys.run = k(); m.vx = 0; m.ground = false; keys.air = k(); m.ground = true; m.dashT = 0.1; keys.dash = k(); m.dashT = 0; m.knock = 0.1; keys.hit = k(); m.knock = 0
    m.face = -1; k(); for (let i = 0; i < 8; i++) okan.dbg.render(0.05); const left = H.paper.scale.x < 0; m.face = 1; for (let i = 0; i < 8; i++) okan.dbg.render(0.05); const right = H.paper.scale.x > 0
    Object.assign(m, s); okan.dbg.pause(false)
    return /side_(stand|throw)/.test(keys.stand) && /side_run/.test(keys.run) && keys.air === 'side_jump' && keys.dash === 'side_dash' && keys.hit === 'front_hit' && left && right && !!H.mat.map
  }))
  await t(nm + ' 無音', () => p.evaluate(() => window.__muteOk()))
  await t(nm + ' 一画面', () => p.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth))
  await t(nm + ' ボタンが画面内で44px以上', () => p.evaluate(() => ['bL', 'bR', 'bJ', 'bD'].every(i => { const r = document.getElementById(i).getBoundingClientRect(); return r.width >= 44 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth })))
  await t(nm + ' タッチで右へ動く・跳ぶ', async () => {
    const x0 = await p.evaluate(() => okan.run.me.x)
    await p.evaluate(() => { const e = id => document.getElementById(id); e('bR').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true, cancelable: true })) })
    await p.waitForTimeout(350)
    const x1 = await p.evaluate(() => okan.run.me.x)
    await p.evaluate(() => { dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 })); document.getElementById('bJ').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, bubbles: true, cancelable: true })) })
    await p.waitForTimeout(120)
    const y = await p.evaluate(() => okan.run.me.y); await p.evaluate(() => dispatchEvent(new PointerEvent('pointerup', { pointerId: 8 })))
    must(x1 > x0 + 0.5, 'not moved ' + x0 + ' ' + x1); must(y > 0.3, 'no jump ' + y); return { dx: +(x1 - x0).toFixed(2), y: +y.toFixed(2) }
  })
  // 各攻撃の場面を止めて撮る
  await p.evaluate(() => okan.dbg.pause(true))
  const shot = async (n, fn) => { await p.evaluate(fn); await p.evaluate(() => { for (let i = 0; i < 3; i++) okan.dbg.render() }); await p.waitForTimeout(80); await p.screenshot({ path: `shots/${nm}-${n}.png` }) }
  await shot('p1', () => { const r = okan.run; okan.dbg.auto('skilled'); for (let i = 0; i < 300 && !r.objs.some(o => o.k === 'slip' && o.t > 0.5); i++) okan.dbg.stepN(1); okan.dbg.auto(null) })
  await shot('p2', () => { const r = okan.run; r.hp = 99; r.boss.hp = 340; okan.dbg.auto('skilled'); for (let i = 0; i < 1500 && !(r.nozzle && r.nozzle.on && r.objs.some(o => o.k === 'dust')); i++) { okan.dbg.stepN(1); r.hp = 99 } okan.dbg.auto(null) })
  await shot('p3', () => { const r = okan.run; r.boss.hp = 170; okan.dbg.auto('skilled'); for (let i = 0; i < 1800 && !(r.cat && r.cat.st === 'crouch' && r.cat.t > 0.4); i++) { okan.dbg.stepN(1); r.hp = 99 } okan.dbg.auto(null) })
  await shot('cat', () => { const r = okan.run; okan.dbg.auto('skilled'); for (let i = 0; i < 1800 && !(r.cat && r.cat.st === 'leap' && r.cat.t > 0.25); i++) { okan.dbg.stepN(1); r.hp = 99; r.boss.hp = Math.max(r.boss.hp, 150) } okan.dbg.auto(null) })
  await t(nm + ' 3段階に変わる', () => p.evaluate(() => okan.run.boss.phase === 3))
  // 何もしないと負ける → あと何%
  await p.evaluate(() => okan.dbg.pause(false))
  await p.evaluate(() => { okan.start(true) })
  await t(nm + ' やり直しは1秒以内に動ける', async () => { await p.waitForFunction(() => window.__retryMs > 0, null, { timeout: 4000 }); const ms = await p.evaluate(() => window.__retryMs); must(ms <= 1000, 'ms ' + ms); return ms })
  await t(nm + ' 何もしないと負けて「あと何%」', async () => {
    await p.evaluate(() => { okan.dbg.pause(true); okan.dbg.stepN(60 * 200); okan.dbg.pause(false) })
    await p.waitForFunction(() => window.__stamped, null, { timeout: 8000 })
    const r = await p.evaluate(() => window.__lastResult); must(!r.won && r.left >= 50, JSON.stringify(r)); return r
  })
  await p.screenshot({ path: `shots/${nm}-lose.png` })
  await t(nm + ' もう一回で戻る', async () => { await p.tap('#btnAgain'); await p.waitForFunction(() => okan.mode === 'play' && okan.run.mode === 'fight', null, { timeout: 3000 }) })
  await t(nm + ' bot で勝つと紙とハンコ', async () => {
    await p.evaluate(() => { okan.dbg.pause(true); okan.dbg.auto('skilled'); for (let i = 0; i < 60 * 300 && !okan.run.over; i++) { okan.dbg.stepN(1); okan.run.hp = Math.max(okan.run.hp, 2) } okan.dbg.auto(null); okan.dbg.pause(false) })
    await p.waitForFunction(() => window.__stamped, null, { timeout: 9000 })
    const r = await p.evaluate(() => window.__lastResult); must(r.won, JSON.stringify(r)); return r
  })
  await p.screenshot({ path: `shots/${nm}-win.png` })
  await t(nm + ' レア: 長電話・おとん・ルンバ猫', async () => { const v = await p.evaluate(() => { okan.start(true, { rare: { dad: 0.5, longCall: true, roombaCat: true } }); okan.dbg.pause(true); const r = okan.run; let dad = false, long = false, rc = false; for (let i = 0; i < 60 * 60 && !(long && rc); i++) { okan.dbg.stepN(1); r.hp = 4; if (i > 200) r.boss.hp = 150; if (r.rare.dadDone) dad = true; if (r.boss.act && r.boss.act.long) long = true; if (r.cat && r.cat.roomba) rc = true } okan.dbg.render(); okan.dbg.pause(false); return { dad, long, rc } }); must(v.dad && v.long && v.rc, JSON.stringify(v)); return v })
  await t(nm + ' エラー0', () => { must(!errs.length, errs.slice(0, 3).join(' | ')) })
  await b.close()
}
server.kill(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
