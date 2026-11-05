# 生成したシート（緑背景）を切り抜いて img/*.webp と js/art.js を作る。~/tools/pyimg/bin/python key.py
# 切り方は kobito-escape/art/key.py と同じ。切り絵に見せるため、輪郭の外に紙の白い縁を足す
import numpy as np, os, json
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/../img/'
RIM = 7
def alpha(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = g - np.maximum(r, b)
    al = 1 - np.clip((k - 22) / (90 - 22), 0, 1)
    lim = np.maximum(r, b); g2 = np.where(g > lim, lim, g)
    return np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8)
def load(src):
    im = Image.fromarray(alpha(np.asarray(Image.open(D + '/raw/' + src + '.png').convert('RGB')).astype(np.float32)), 'RGBA')
    a = im.split()[3].filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7)); im.putalpha(a)
    rim = a.point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(RIM * 2 + 1)).filter(ImageFilter.GaussianBlur(0.8))
    paper = Image.new('RGBA', im.size, (255, 253, 246, 0)); paper.putalpha(rim)
    return Image.alpha_composite(paper, im)
P = {
  'mom_throw': ('mom_c', (5, 150, 510, 920)), 'mom_suck': ('mom_c', (455, 240, 1045, 920)), 'mom_hurt': ('mom_c', (1050, 100, 1536, 920)),
  'mom_rage': ('mom_d', (0, 120, 510, 920)), 'mom_stomp': ('mom_d', (510, 240, 1000, 920)), 'mom_down': ('mom_d', (1010, 380, 1536, 930)),
  'cat_crouch': ('cat_a', (5, 250, 420, 770)), 'cat_leap': ('cat_a', (420, 350, 1060, 710)), 'cat_swat': ('cat_a', (1050, 270, 1530, 770)),
  'p_slipper': ('props_a', (5, 175, 490, 440)), 'p_sandal': ('props_a', (525, 175, 1050, 435)), 'p_dust': ('props_a', (1110, 105, 1525, 455)), 'p_nozzle': ('props_a', (140, 540, 695, 915)), 'p_yogurt': ('props_a', (875, 530, 1315, 915))
}
sheets = {}; out = {}
for name, (src, box) in P.items():
    im = sheets.setdefault(src, load(src))
    c = im.crop(box); bb = c.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    c = c.crop(bb); w, h = c.size
    m = 640
    if max(w, h) > m:
        k = m / max(w, h); c = c.resize((round(w * k), round(h * k)), Image.LANCZOS)
    c.save(OUT + name + '.webp', quality=84, method=6, alpha_quality=85)
    out[name] = {'a': round(w / h, 4), 'h': round(h * 30 / 653, 2)}
# 大写し（結果の前とカットイン）
big = {'big_rage': ('mom_d', (0, 130, 500, 630))}
for name, (src, box) in big.items():
    sheets[src].crop(box).resize((512, 512), Image.LANCZOS).save(OUT + name + '.webp', quality=82, method=6)
    sheets[src].crop(box).resize((256, 256), Image.LANCZOS).save(OUT + 'face_rage.webp', quality=82, method=6)
# 既存のおかん（kobito-escape から持ってきた）の縦横比
for n, H in {'normal': 130.74, 'search': 122.32, 'spot': 147.01, 'angry': 144.27, 'win': 131.72, 'phone': 131.14}.items():
    w, h = Image.open(OUT + 'mom_' + n + '.webp').size; out['mom_' + n] = {'a': round(w / h, 4), 'h': round(H * 30 / 128, 2)}
w, h = Image.open(OUT + 'dad_walk.webp').size; out['dad_walk'] = {'a': round(w / h, 4), 'h': 26}
open(D + '/../js/art.js', 'w').write('// art/key.py が作る。絵の 幅/高さ\nexport const ASPECT = ' + json.dumps(out) + '\n')
print(out)
