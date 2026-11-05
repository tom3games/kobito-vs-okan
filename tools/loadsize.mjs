// ロードの実測（10Mbps と 3Mbps。キャッシュなし）。node tools/loadsize.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
const PORT = 5793, server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname + '/..', env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
for (const mbps of [10, 3]) {
  const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' }); await muteContext(ctx)
  const p = await ctx.newPage(), c = await ctx.newCDPSession(p); await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true })
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: mbps * 125000, uploadThroughput: 125000 })
  const size = new Map(); let n = 0, bytes = 0, phase = 'boot', bootN = 0, bootB = 0
  c.on('Network.loadingFinished', e => { n++; bytes += e.encodedDataLength; if (phase === 'boot') { bootN = n; bootB = bytes } size.set(e.requestId, e.encodedDataLength) })
  const t0 = Date.now(); await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'commit' }); await p.waitForFunction(() => window.__okanReady, null, { timeout: 60000, polling: 50 }); const ready = Date.now() - t0; phase = 'after'
  await p.tap('#btnStart').catch(() => p.click('#btnStart')); const t1 = Date.now()
  await p.waitForFunction(() => window.__imgAllDone && window.__sndAllDone, null, { timeout: 90000, polling: 100 }); const all = Date.now() - t1
  await p.waitForTimeout(800)
  console.log(`${mbps}Mbps: 最初の画面まで ${bootN}ファイル ${(bootB / 1e6).toFixed(2)}MB ${(ready / 1000).toFixed(2)}秒 ／ 全部で ${n}ファイル ${(bytes / 1e6).toFixed(2)}MB、開始後 ${(all / 1000).toFixed(1)}秒で読み終わり`)
  await b.close()
}
server.kill(); process.exit(0)
