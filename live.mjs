import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 公開URLの確認。node live.mjs（ログインしていないブラウザで見る）
import { chromium, webkit } from 'playwright'
const URL0 = 'https://tom3games.github.io/kobito-vs-okan/'
for (const [name, bt] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await bt.launch(bt === chromium ? MUTE_LAUNCH : {}), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, hasTouch: true })
  await muteContext(ctx); const p = await ctx.newPage(), errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await p.goto(URL0 + '?t=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__okanReady, null, { timeout: 40000 })
  await p.tap('#btnStart'); await p.waitForTimeout(300)
  const res = await p.evaluate(() => { okan.dbg.pause(true); okan.dbg.auto('idle'); okan.run.me.x = 46; for (let i = 0; i < 60 * 200 && !okan.run.over; i++) okan.dbg.stepN(1); okan.dbg.pause(false); return { over: okan.run.over, left: okan.leftPct(), mute: window.__muteOk() } })
  await p.waitForFunction(() => window.__stamped, null, { timeout: 8000 }); await p.screenshot({ path: `shots/live-${name}.png` })
  const og = await p.evaluate(async () => (await fetch(document.querySelector('meta[property="og:image"]').content)).status)
  console.log(name, JSON.stringify(res), 'og', og, 'errors', errs.length ? errs.join(' | ') : 'none'); await b.close()
}
