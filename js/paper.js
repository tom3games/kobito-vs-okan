// 結果の紙: おかんが書いた通知表。判定（ハンコ）は drawHanko で後から押す
const INK = '#2a2118', RED = '#c0281b', HAND = '"Klee One",serif', GOTH = 'system-ui,-apple-system,"Hiragino Sans",sans-serif'
function wrap(x, text, maxW, en) {
  const out = []; let cur = ''
  if (en) { for (const w of text.split(' ')) { const n = cur ? cur + ' ' + w : w; if (x.measureText(n).width > maxW && cur) { out.push(cur); cur = w } else cur = n } }
  else for (const ch of text) { if (x.measureText(cur + ch).width > maxW && cur) { if ('。、！？'.includes(ch)) { const l = cur.slice(-1); out.push(cur.slice(0, -1)); cur = l + ch } else { out.push(cur); cur = ch } } else cur += ch }
  if (cur) out.push(cur); return out
}
// d: { lang, won, P(文言), rows:[[label,value]], note, left, by, face, yogurt, photoMom }
export function drawPaper(cv, d) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, en = d.lang === 'en', P = d.P
  x.setTransform(1, 0, 0, 1, 0, 0); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.globalAlpha = 1
  // 畳の上に置いた紙
  x.fillStyle = '#a89a5f'; x.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) { x.fillStyle = i % 2 ? 'rgba(70,70,20,.1)' : 'rgba(240,235,170,.08)'; x.fillRect(Math.random() * W, Math.random() * H, 60 + Math.random() * 120, 1.4) }
  x.save(); x.translate(W / 2, H / 2); x.rotate(-0.014); x.translate(-W / 2, -H / 2)
  x.shadowColor = 'rgba(30,20,0,.4)'; x.shadowBlur = 18; x.shadowOffsetY = 7
  x.fillStyle = '#f7f0dc'; x.fillRect(36, 34, W - 72, H - 68); x.shadowColor = 'transparent'
  for (let i = 0; i < 1500; i++) { x.fillStyle = 'rgba(110,85,40,.035)'; x.fillRect(36 + Math.random() * (W - 72), 34 + Math.random() * (H - 68), 2, 2) }
  // 折り目
  x.fillStyle = 'rgba(90,70,30,.1)'; x.fillRect(36, H / 2, W - 72, 2)
  x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(62, 60, W - 124, H - 120); x.lineWidth = 1; x.strokeRect(70, 68, W - 140, H - 136)
  x.fillStyle = INK; x.textAlign = 'center'
  x.font = `700 ${en ? 50 : 62}px ${GOTH}`; x.fillText(P.head, W / 2, 142)
  x.font = `400 26px ${GOTH}`; x.fillText(P.sub, W / 2, 186)
  x.textAlign = 'left'
  let y = 244
  if (!d.won) {
    // 負け: 大きく「あと N%」を赤ペンで
    x.fillStyle = RED; x.font = `600 ${en ? 86 : 44}px ${HAND}`
    if (en) { x.textAlign = 'center'; x.fillText(`${d.left}% ${P.left}`, W / 2, y + 70) }
    else { x.fillText(P.left, 100, y + 80); x.font = `600 124px ${HAND}`; x.fillText(`${d.left}%`, 186, y + 92) }
    x.textAlign = 'left'
    x.strokeStyle = RED; x.lineWidth = 5; x.beginPath(); x.moveTo(96, y + 118); x.bezierCurveTo(240, y + 106, 390, y + 130, 520, y + 112); x.stroke()
    y += 156
  } else if (d.yogurt) {
    x.drawImage(d.yogurt, W - 256, 90, 150, 150 * d.yogurt.height / d.yogurt.width)
  }
  const rowH = 54
  for (const [a, b] of d.rows) {
    x.fillStyle = '#5b4d36'; x.font = `400 27px ${GOTH}`; x.fillText(a, 96, y + 36)
    x.fillStyle = INK; x.font = `600 34px ${HAND}`; x.textAlign = 'right'; x.fillText(b, W - 100, y + 36); x.textAlign = 'left'
    x.strokeStyle = 'rgba(40,30,20,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(90, y + rowH - 4); x.lineTo(W - 90, y + rowH - 4); x.stroke()
    y += rowH
  }
  y += 30
  x.fillStyle = '#5b4d36'; x.font = `400 26px ${GOTH}`; x.fillText(P.notes, 96, y); y += 46
  x.fillStyle = INK; x.font = `600 ${en ? 31 : 34}px ${HAND}`
  for (const l of wrap(x, d.note, W - 210, en)) { x.fillText(l, 96, y); y += 48 }
  // おかんの顔のシール
  if (d.face) {
    const cx = 170, cy = H - 158, r = 74
    x.save(); x.translate(cx, cy); x.rotate(-0.08); x.beginPath(); x.arc(0, 0, r, 0, 7); x.fillStyle = '#fff'; x.fill(); x.clip(); x.drawImage(d.face, -r, -r, r * 2, r * 2); x.restore()
    x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke()
  }
  x.fillStyle = '#5b4d36'; x.font = `400 24px ${GOTH}`; x.fillText(P.teacher, 262, H - 112)
  x.restore()
}
// ハンコ（先生のごほうびハンコの丸い形）。k は 0〜1 の押す途中
export function drawHanko(cv, text, won) {
  const x = cv.getContext('2d'), W = cv.width, H = cv.height
  x.save(); x.translate(W - 208, H - 216); x.rotate(-0.17)
  const R = 132
  x.strokeStyle = RED; x.fillStyle = RED; x.lineWidth = 8; x.globalAlpha = 0.86
  x.beginPath(); x.arc(0, 0, R, 0, 7); x.stroke()
  x.lineWidth = 3; x.beginPath(); x.arc(0, 0, R - 13, 0, 7); x.stroke()
  x.textAlign = 'center'; x.textBaseline = 'middle'
  const BR = { '大変よくできました': ['大変よく', 'できました'], 'もう少しがんばりましょう': ['もう少し', 'がんばり', 'ましょう'], 'ちゃんと聞きなさい': ['ちゃんと', '聞きなさい'], 'よくできました': ['よく', 'できました'], 'がんばりましょう': ['がんばり', 'ましょう'], 'がんばりました': ['がんばり', 'ました'] }
  const n = text.length, big = n > 12
  if (/^[\x00-\x7f]+$/.test(text)) {
    const words = text.split(' '); x.font = `700 ${words.length > 1 ? 38 : 44}px system-ui,-apple-system,"Hiragino Sans",sans-serif`
    words.forEach((w, i) => x.fillText(w, 0, (i - (words.length - 1) / 2) * 46))
  } else {
    // 2〜3行に分けて縦に積む
    const lines = BR[text] || [text], per = Math.max(...lines.map(l => l.length))
    void big
    const fs = Math.min(46, Math.floor(196 / per)); x.font = `700 ${fs}px system-ui,-apple-system,"Hiragino Sans",sans-serif`
    lines.forEach((l, i) => x.fillText(l, 0, (i - (lines.length - 1) / 2) * (fs + 6)))
  }
  // かすれ
  x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 0.12
  for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28, d = Math.random() * R; x.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2 + Math.random() * 8, 1.4) }
  x.restore(); void won
}
