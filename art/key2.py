# 2面（台所）の絵を切り抜いて img/*.webp を作り、js/art.js に足す。~/tools/pyimg/bin/python key2.py
# 切り方は key.py と同じ（緑を抜いて紙の白い縁）。key.py の後に回す（art.js の既存の値は残す）
import os, json, re
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/../img/'
src = open(D + '/key.py').read().split('\nP = {')[0]   # 関数だけ使う（key.py の本体は回さない）
ns = {'__file__': D + '/key.py'}; exec(compile(src, 'key.py', 'exec'), ns)
load = ns['load']
# 名前: (シート, 切る箱, 消す箱[シートの座標])
P = {
  'mom_flip': ('mom_e', (20, 95, 470, 915), [(436, 360, 470, 640), (432, 170, 470, 360)]),
  'mom_pan': ('mom_e', (440, 170, 990, 915), [(440, 760, 478, 915)]),
  'mom_sneeze': ('mom_e', (985, 225, 1536, 915), []),
  'mom_phoneladle': ('mom_f', (0, 200, 495, 905), []),
  'mom_dinner': ('mom_f', (500, 185, 960, 905), []),
  'mom_spray': ('mom_f', (975, 200, 1536, 905), []),
  'p_spatula': ('kitchen_a', (20, 180, 535, 440), []),
  'p_ladle': ('kitchen_a', (565, 215, 1115, 405), []),
  'p_wiener': ('kitchen_a', (1125, 105, 1495, 485), []),
  'p_oil': ('kitchen_a', (110, 555, 410, 945), []),
  'p_pepper': ('kitchen_a', (620, 535, 905, 955), []),
  'p_rice': ('kitchen_a', (1095, 555, 1440, 935), []),
  'p_wave': ('kitchen_b', (125, 65, 705, 475), []),
  'p_tomato': ('kitchen_b', (895, 50, 1335, 485), []),
  'p_cloud': ('kitchen_b', (65, 555, 705, 965), []),
  'p_yogurt2': ('kitchen_b', (865, 515, 1405, 975), []),
}
sheets = {}
art = open(D + '/../js/art.js').read()
out = json.loads(re.search(r'ASPECT = (\{.*\})', art).group(1))
for name, (sh, box, erase) in P.items():
    im = sheets.setdefault(sh, load(sh))
    c = im.crop(box)
    for e in erase:
        c.paste((0, 0, 0, 0), (e[0] - box[0], e[1] - box[1], e[2] - box[0], e[3] - box[1]))
    bb = c.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    c = c.crop(bb); w, h = c.size
    m = 640
    if max(w, h) > m:
        k = m / max(w, h); c = c.resize((round(w * k), round(h * k)), Image.LANCZOS)
    c.save(OUT + name + '.webp', quality=84, method=6, alpha_quality=85)
    out[name] = {'a': round(w / h, 4), 'h': round(h * 30 / 653, 2)}
# 大写し（カットイン）。白い紙の上に置く
for name, (sh, box) in {'big_sneeze': ('mom_e', (1000, 235, 1500, 735)), 'big_dinner': ('mom_f', (478, 175, 973, 670))}.items():
    c = sheets[sh].crop(box); bg = Image.new('RGBA', c.size, (255, 255, 255, 255)); bg.alpha_composite(c)
    bg.convert('RGB').resize((512, 512), Image.LANCZOS).save(OUT + name + '.webp', quality=82, method=6)
open(D + '/../js/art.js', 'w').write('// art/key.py と key2.py が作る。絵の 幅/高さ\nexport const ASPECT = ' + json.dumps(out) + '\n')
print({k: out[k] for k in P})
