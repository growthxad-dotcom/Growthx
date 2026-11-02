"""KRISHNA SPICES - Coming Soon reel renderer.
Layered 3D-style compositing (shaded spice sprites, parallax camera, depth of field,
soft shadows, volumetric light, particle swirl) -> 1080x1920 @ 30fps raw frames -> ffmpeg.
Usage: python3 src/render.py [--stills t1 t2 ...] | [--video out.mp4]"""
import sys, math, os, subprocess, functools
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H, FPS, DUR = 1080, 1920, 30, 15.0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
MAROON = (112, 14, 26); GOLD = (201, 152, 58); IVORY = (253, 250, 243)

def clamp(v, a=0.0, b=1.0): return max(a, min(b, v))
def prog(t, a, b): return clamp((t - a) / (b - a))
def e_out(p): return 1 - (1 - p) ** 3
def e_io(p): return p * p * (3 - 2 * p)
def e_back(p, s=1.6): p -= 1; return p * p * ((s + 1) * p + s) + 1
def lerp(a, b, p): return a + (b - a) * p

# ------------------------------------------------------------------ assets
RAW = {}
def raw(name):
    if name not in RAW: RAW[name] = Image.open(f'sprites/{name}.png').convert('RGBA')
    return RAW[name]

LOGO = Image.open('assets/logo_original.png').convert('RGB')
def _feather(n, f):
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    d = np.minimum(np.minimum(x, n - 1 - x), np.minimum(y, n - 1 - y))
    return Image.fromarray((np.clip((d - 4) / f, 0, 1) ** 1.2 * 255).astype(np.uint8))
LOGO_MASK = _feather(1254, 90)
# "ink" mask for shimmer (non-background pixels of the logo)
_a = np.asarray(LOGO).astype(np.float32)
INK = Image.fromarray((np.clip(np.abs(_a - np.array(IVORY, np.float32)).max(2) / 40, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))

def sprite_img(name, size, rot=0.0, sx=1.0, blur=0.0):
    im = raw(name)
    w = max(2, int(size * sx)); h = max(2, int(size * im.height / im.width))
    im = im.resize((w, h), Image.BILINEAR if size < im.width else Image.BICUBIC)
    if rot: im = im.rotate(rot, Image.BICUBIC, expand=True)
    if blur > 0.4:
        p = int(blur * 2.6) + 2
        c = Image.new('RGBA', (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0)); c.paste(im, (p, p))
        im = c.filter(ImageFilter.GaussianBlur(blur))
    return im

def place(cv, im, cx, cy, alpha=1.0, shadow=0.0, sh_off=(26, 46)):
    x = int(cx - im.width / 2); y = int(cy - im.height / 2)
    if x > W or y > H or x + im.width < 0 or y + im.height < 0: return
    if shadow > 0:
        a = im.getchannel('A').filter(ImageFilter.GaussianBlur(max(6, im.width * 0.035)))
        a = a.point(lambda v: int(v * shadow * alpha * 0.55))
        sh = Image.new('RGBA', im.size, (96, 58, 24, 0)); sh.putalpha(a)
        cv.paste(sh, (x + sh_off[0], y + sh_off[1]), sh)
    if alpha < 0.999:
        a = im.getchannel('A').point(lambda v: int(v * alpha)); im = im.copy(); im.putalpha(a)
    cv.paste(im, (x, y), im)

# ------------------------------------------------------------------ background
def make_bg():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot(x - W / 2, (y - H * 0.5) * 0.82)
    v = np.clip((r - 640) / 700, 0, 1); v = v * v * (3 - 2 * v)
    c0 = np.array(IVORY, np.float32); c1 = np.array((233, 214, 178), np.float32)
    bg = c0[None, None, :] * (1 - v[..., None]) + c1[None, None, :] * v[..., None]
    return bg
BG = make_bg()
rng = np.random.default_rng(7)
GRAIN = (rng.standard_normal((H // 2, W // 2)).astype(np.float32) * 1.4)
GRAIN = np.asarray(Image.fromarray(GRAIN, 'F').resize((W, H), Image.BILINEAR))

def beams():
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
    for (x0, w0, k) in [(-100, 160, 1.0), (260, 110, 0.7), (640, 180, 0.8)]:
        d.polygon([(x0, -50), (x0 + w0, -50), (x0 + w0 + 900, H + 50), (x0 + 560, H + 50)], fill=int(255 * k))
    return im.filter(ImageFilter.GaussianBlur(70))
BEAMS = beams()
BEAM_COL = Image.new('RGB', (W, H), (255, 232, 176))

def disc(r, a):
    s = int(r * 2 + 6); y, x = np.mgrid[0:s, 0:s].astype(np.float32) - s / 2
    d = np.hypot(x, y) / r
    al = np.clip((1 - d) * 3, 0, 1) * (0.55 + 0.45 * np.clip(d * 1.2, 0, 1)) * a
    arr = np.zeros((s, s, 4), np.uint8); arr[..., 0] = 232; arr[..., 1] = 184; arr[..., 2] = 84; arr[..., 3] = (al * 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')
BOKEH = [(disc(r, a)) for r in (6, 10, 16, 26) for a in (0.28,)]
_rb = np.random.default_rng(3)
BK = [(_rb.random() * W, _rb.random() * H, int(_rb.integers(0, 4)), _rb.random() * 6.28, 12 + _rb.random() * 30, 0.02 + _rb.random() * 0.05) for _ in range(70)]

def base_canvas(t, beam=0.13, bokeh=1.0):
    cv = Image.fromarray(BG.astype(np.uint8), 'RGB')
    if beam > 0:
        m = BEAMS.point(lambda v: int(v * beam * (0.85 + 0.15 * math.sin(t * 0.9))))
        cv = Image.composite(BEAM_COL, cv, m)
    cv = cv.convert('RGBA')
    for (x, y, k, ph, sp, fr) in BK:
        yy = (y - t * sp) % (H + 60) - 30; xx = x + 14 * math.sin(t * fr * 6 + ph)
        tw = 0.55 + 0.45 * math.sin(t * 1.7 + ph)
        if tw * bokeh < 0.25: continue
        im = BOKEH[k]; cv.paste(im, (int(xx - im.width / 2), int(yy - im.height / 2)), im)
    return cv.convert('RGB')

# ------------------------------------------------------------------ typography
@functools.lru_cache(None)
def font(name, size, wght):
    f = ImageFont.truetype(f'assets/fonts/{name}.ttf', size)
    try: f.set_variation_by_axes([wght])
    except Exception: pass
    return f

def gradient_fill(w, h, top, bot):
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    arr = np.array(top, np.float32) * (1 - t) + np.array(bot, np.float32) * t
    return Image.fromarray(np.repeat(arr, w, 1).astype(np.uint8), 'RGB')

@functools.lru_cache(None)
def letter(ch, size, wght, kind):
    f = font('Cinzel', size, wght); pad = 26
    bb = f.getbbox(ch); w = int(f.getlength(ch)) + 2 * pad; h = int(size * 1.5) + 2 * pad
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).text((pad, pad), ch, font=f, fill=255)
    if kind == 'maroon': top, bot, edge = (150, 24, 36), (84, 8, 20), GOLD
    else: top, bot, edge = (255, 232, 150), (190, 134, 44), (110, 20, 28)   # gold
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sh = m.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.35))
    shim = Image.new('RGBA', (w, h), (80, 40, 10, 0)); shim.putalpha(sh); out.paste(shim, (0, 8), shim)
    stroke = Image.new('L', (w, h), 0); ImageDraw.Draw(stroke).text((pad, pad), ch, font=f, fill=255, stroke_width=3, stroke_fill=255)
    out.paste(Image.new('RGBA', (w, h), edge + (255,)), (0, 0), stroke)
    fill = gradient_fill(w, h, top, bot); out.paste(fill, (0, 0), m)
    return out

def text_layout(text, size, wght, track):
    f = font('Cinzel', size, wght); xs = []; x = 0
    for ch in text:
        xs.append(x); x += f.getlength(ch) + track
    return xs, x - track

def draw_text(cv, text, cx, cy, size, t, t0, wght=700, track=10, kind='maroon', stagger=0.035, rise=26, out_t=None, scale=1.0, alpha=1.0):
    xs, tw = text_layout(text, size, wght, track)
    for i, ch in enumerate(text):
        if ch == ' ': continue
        p = e_out(prog(t, t0 + i * stagger, t0 + i * stagger + 0.55))
        a = p * alpha
        if out_t is not None: a *= 1 - e_io(prog(t, out_t, out_t + 0.35))
        if a <= 0.01: continue
        im = letter(ch, size, wght, kind)
        if scale != 1.0: im = im.resize((int(im.width * scale), int(im.height * scale)), Image.BICUBIC)
        lx = cx - tw * scale / 2 + xs[i] * scale - 26 * scale
        ly = cy - im.height / 2 + (1 - p) * rise
        if a < 0.99:
            al = im.getchannel('A').point(lambda v: int(v * a)); im = im.copy(); im.putalpha(al)
        cv.paste(im, (int(lx), int(ly)), im)
    return tw

def ornament(cv, cx, cy, width, p):
    """gold rule with centre diamond that grows outward"""
    d = ImageDraw.Draw(cv); wd = width * p / 2
    if wd < 2: return
    for sgn in (-1, 1):
        d.line([(cx + sgn * 16, cy), (cx + sgn * wd, cy)], fill=GOLD, width=3)
        d.ellipse([cx + sgn * wd - 5, cy - 5, cx + sgn * wd + 5, cy + 5], fill=GOLD)
    d.polygon([(cx, cy - 11), (cx + 11, cy), (cx, cy + 11), (cx - 11, cy)], fill=GOLD)
    d.polygon([(cx, cy - 5), (cx + 5, cy), (cx, cy + 5), (cx - 5, cy)], fill=(255, 236, 170))

def title(cv, lines, t, t0, out_t, y0, size=96, track=12):
    y = y0
    for ln in lines:
        draw_text(cv, ln, W / 2, y, size, t, t0, track=track, out_t=out_t); y += size * 1.18
    p = e_out(prog(t, t0 + 0.5, t0 + 1.3))
    if out_t is not None: p *= 1 - e_io(prog(t, out_t, out_t + 0.35))
    ornament(cv, W / 2, y - size * 0.35 + 18, 520, p)

# ------------------------------------------------------------------ star glints / additive layer
def star(sz):
    y, x = np.mgrid[0:sz, 0:sz].astype(np.float32); x = (x - sz / 2) / (sz / 2); y = (y - sz / 2) / (sz / 2)
    ax, ay = np.abs(x), np.abs(y)
    I = np.exp(-ax * 9) * np.exp(-ay * 70) + np.exp(-ay * 9) * np.exp(-ax * 70) + 0.8 * np.exp(-(np.hypot(x, y) * 7) ** 2)
    I = np.clip(I, 0, 1)
    arr = np.zeros((sz, sz, 4), np.uint8); arr[..., 0] = 255; arr[..., 1] = 232; arr[..., 2] = 160; arr[..., 3] = (I * 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')
STAR = star(192)

def add_star(layer, x, y, s, a):
    if a <= 0.02 or s < 4: return
    im = STAR.resize((int(s), int(s)), Image.BILINEAR)
    if a < 0.99: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    layer.paste(im, (int(x - s / 2), int(y - s / 2)), im)

def screen_add(cv, layer): return ImageChops.add(cv, layer)

# ------------------------------------------------------------------ spice item helper
def cam_xf(x, y, size, d, zoom, pan):
    z = 1 + (zoom - 1) * (1 + 0.55 * d)
    return W / 2 + (x - W / 2) * z + pan[0] * (1 + 0.6 * d), H / 2 + (y - H / 2) * z + pan[1] * (1 + 0.6 * d), size * z

def blur_of(d, focus=0.0): return min(28, abs(d - focus) ** 1.4 * 15)

def draw_item(cv, it, t, zoom=1.0, pan=(0, 0), global_alpha=1.0):
    name, ex, ey, size, d, rot0, spin = it['n'], it['x'], it['y'], it['s'], it.get('d', 0.0), it.get('r', 0.0), it.get('spin', 6.0)
    t0, dur = it.get('t0', 0.0), it.get('dur', 1.8)
    sx_, sy_ = it.get('from', (ex, ey - 900))
    p = e_out(prog(t, t0, t0 + dur))
    if p <= 0: return
    x = lerp(sx_, ex, p); y = lerp(sy_, ey, p)
    ph = it.get('ph', 0.0)
    x += it.get('bx', 10) * math.sin(t * 0.9 + ph); y += it.get('by', 14) * math.sin(t * 1.15 + ph * 1.7)
    rot = rot0 + spin * (t - t0) * (1 - 0.6 * p) + 5 * math.sin(t * 0.8 + ph)
    tumble = it.get('tumble', 0.0); sq = 1 - tumble * (0.5 - 0.5 * math.cos(t * 1.6 + ph))
    X, Y, S_ = cam_xf(x, y, size, d, zoom, pan)
    im = sprite_img(name, S_, rot, sq, blur_of(d, it.get('focus', 0.0)))
    place(cv, im, X, Y, alpha=min(1, p * 1.6) * it.get('a', 1.0) * global_alpha, shadow=it.get('sh', 0.0 if d > 0.5 or d < -0.5 else 0.55), sh_off=(int(18 * S_ / 300 + 10), int(34 * S_ / 300 + 14)))

# ------------------------------------------------------------------ scene definitions
def mk(n, x, y, s, **k): return dict(n=n, x=x, y=y, s=s, **k)

S1 = [
    mk('cardamom1', 230, 700, 330, r=-20, t0=0.35, dur=1.9, **{'from': (-250, 300)}, ph=0.3, tumble=0.25),
    mk('cardamom2', 840, 1370, 300, r=140, t0=0.7, dur=1.9, **{'from': (1300, 1500)}, ph=1.1, tumble=0.25),
    mk('clove1', 880, 720, 340, r=25, t0=0.5, dur=1.8, **{'from': (1300, 200)}, ph=2.1),
    mk('clove1', 170, 1250, 300, r=-30, t0=0.9, dur=1.8, **{'from': (-300, 1400)}, ph=0.9),
    mk('cinnamon1', 330, 1510, 640, r=-14, t0=0.2, dur=2.0, **{'from': (-500, 2100)}, ph=0.5),
    mk('cinnamon1', 830, 1010, 560, r=38, t0=0.6, dur=2.0, **{'from': (1500, 1000)}, ph=1.6, d=0.2),
    mk('staranise1', 180, 960, 340, r=10, t0=0.3, dur=1.9, **{'from': (-300, 700)}, ph=0.7, spin=10),
    mk('chilli1', 640, 1150, 620, r=18, t0=0.8, dur=2.0, **{'from': (700, 2200)}, ph=2.5),
    mk('pepper1', 490, 830, 150, r=0, t0=0.45, dur=1.6, **{'from': (500, -200)}, ph=0.2),
    mk('pepper2', 640, 690, 130, r=0, t0=0.9, dur=1.6, **{'from': (700, -200)}, ph=1.2),
    mk('pepper3', 560, 1300, 160, r=0, t0=1.0, dur=1.7, **{'from': (560, 2200)}, ph=2.2),
    mk('coriander1', 110, 640, 140, r=0, t0=0.6, dur=1.7, **{'from': (-200, 640)}, ph=3.2),
    mk('coriander2', 960, 1230, 150, r=0, t0=1.1, dur=1.7, **{'from': (1300, 1250)}, ph=0.4),
    mk('cumin1', 460, 1480, 250, r=30, t0=1.2, dur=1.7, **{'from': (460, 2200)}, ph=1.9),
    mk('cumin2', 740, 800, 230, r=-30, t0=1.0, dur=1.7, **{'from': (1300, 800)}, ph=2.7),
    mk('fennel1', 350, 1170, 260, r=-60, t0=1.3, dur=1.7, **{'from': (-300, 1170)}, ph=1.4),
    mk('fenugreek1', 620, 1000, 130, r=0, t0=1.2, dur=1.6, **{'from': (620, -200)}, ph=0.6),
    mk('fenugreek2', 90, 1500, 120, r=40, t0=1.5, dur=1.6, **{'from': (-200, 1500)}, ph=2.0),
    mk('leaf1', 1000, 1010, 420, r=-10, d=-0.9, t0=0.2, dur=2.2, **{'from': (1300, 100)}, ph=0.1, spin=2),
    mk('leaf2', 60, 800, 400, r=170, d=-0.9, t0=0.3, dur=2.2, **{'from': (-300, 100)}, ph=1.0, spin=2),
    mk('pepper2', -30, 1790, 620, r=0, d=1.1, t0=0.4, dur=2.2, **{'from': (-500, 2300)}, ph=0.9),
    mk('cardamom1', 1120, 1800, 560, r=200, d=1.1, t0=0.5, dur=2.2, **{'from': (1700, 2300)}, ph=0.9),
]

def scene1(t):
    cv = base_canvas(t)
    zoom = 1 + 0.085 * e_io(prog(t, 0, 3.4)); pan = (-18 * prog(t, 0, 3.4), 0)
    for it in sorted(S1, key=lambda i: i.get('d', 0)): draw_item(cv, it, t, zoom, pan)
    title(cv, ['THE MAGIC', 'OF SPICES'], t, 0.55, 2.7, 330, size=100)
    return cv

def shot(items, t, t_start, dur, zoom0=1.0, zoom1=1.12, pan0=(0, 0), pan1=(0, 0)):
    p = prog(t, t_start, t_start + dur)
    zoom = lerp(zoom0, zoom1, e_io(p)); pan = (lerp(pan0[0], pan1[0], p), lerp(pan0[1], pan1[1], p))
    return zoom, pan

SH_A = [  # cardamom + cloves close-up
    mk('cardamom1', 380, 1020, 760, r=-15, spin=7, tumble=0.3, ph=0.0, by=18),
    mk('cardamom2', 770, 1330, 640, r=160, spin=-6, tumble=0.3, ph=1.5),
    mk('clove1', 790, 790, 700, r=30, spin=8, ph=0.8, d=0.1),
    mk('clove1', 170, 1480, 560, r=-35, spin=-8, ph=2.1, d=0.25),
    mk('cardamom1', 160, 640, 300, r=60, d=-0.9, ph=2.2),
    mk('pepper1', 960, 600, 150, d=-0.9, ph=1.1), mk('pepper3', 620, 1590, 360, d=1.0, ph=0.4),
    mk('leaf1', 930, 1620, 520, r=30, d=0.9, ph=1.0, spin=2),
]
SH_B = [  # pepper heap + cinnamon
    mk('cinnamon1', 500, 1060, 1100, r=-24, spin=2, ph=0.2, by=10),
    mk('cinnamon1', 640, 1420, 940, r=14, spin=-2, ph=1.1, d=0.15),
    mk('staranise1', 830, 800, 520, r=14, spin=9, ph=0.3, d=0.1),
] + [mk(f'pepper{1 + i % 3}', 140 + (i * 173) % 800, 600 + (i * 211) % 700, 190 + (i * 37) % 90, r=i * 40, spin=5 + i, ph=i, d=(-0.8 if i % 4 == 0 else 0.0)) for i in range(11)] + [
    mk('pepper2', 90, 1700, 520, d=1.1, ph=2.0), mk('leaf2', 960, 1690, 480, r=-20, d=0.9, ph=1.5, spin=2)]
SH_C = [  # cumin, fenugreek, fennel, coriander
    mk('cumin1', 330, 900, 640, r=-35, spin=6, ph=0.1, tumble=0.3),
    mk('cumin2', 760, 1210, 600, r=30, spin=-5, ph=1.7, tumble=0.3),
    mk('fennel1', 260, 1380, 640, r=-20, spin=4, ph=0.9, d=0.1),
    mk('fenugreek1', 810, 780, 330, r=10, spin=8, ph=0.4, tumble=0.3),
    mk('fenugreek2', 500, 1160, 280, r=40, spin=-9, ph=1.3, tumble=0.3),
    mk('coriander1', 600, 700, 230, ph=2.1), mk('coriander2', 190, 640, 200, ph=0.5, d=-0.6),
    mk('coriander1', 930, 1480, 330, ph=1.8, d=0.5),
    mk('fenugreek1', 90, 1700, 520, r=20, d=1.1, ph=0.6),
]

def scene2(t):
    base = base_canvas(t, beam=0.14)
    shots = [(SH_A, 3.0, 4.08), (SH_B, 4.0, 5.08), (SH_C, 5.0, 6.2)]
    for k, (items, s0, s1) in enumerate(shots):
        if not (s0 - 0.01 <= t <= s1 + 0.01): continue
        cv = base_canvas(t, beam=0.14) if k else base.copy()
        z, pan = shot(items, t, s0, s1 - s0, 1.0, 1.1, (30 * (-1) ** k, 10), (-30 * (-1) ** k, -20))
        for it in sorted(items, key=lambda i: i.get('d', 0)):
            it2 = dict(it); it2['t0'] = s0 - 0.5; it2['dur'] = 0.01; it2['from'] = (it['x'], it['y'])
            draw_item(cv, it2, t, z, pan)
        wa = e_io(prog(t, s0, s0 + 0.25)) if k else 1.0
        wb = 1 - e_io(prog(t, s1 - 0.25, s1)) if k < 2 else 1.0
        if k == 0: wa = 1.0
        a = min(wa, wb)
        base = Image.blend(base, cv, a) if (k and a < 1) else (cv if a >= 1 else base)
        if k == 0 and t > 3.84: base = cv
    title(base, ['WHOLE SPICES'], t, 3.15, None, 345, size=100, track=10)
    return base

BOWLS = [('bowl_turmeric', 290, 740, 500, (236, 160, 14)), ('bowl_chilli', 790, 890, 500, (196, 28, 12)),
         ('bowl_coriander', 280, 1190, 500, (158, 138, 62)), ('bowl_cumin', 790, 1340, 500, (146, 112, 64))]
_pr = np.random.default_rng(11)
PUFF = [(i % 4, _pr.random(), _pr.random() * 6.28, 0.6 + _pr.random() * 1.2, 1 + _pr.random() * 3.6, _pr.random()) for i in range(160)]

def puffs(cv, t, t0, bowls_xf, fade=1.0):
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for (b, ph, ang, spd, rad, rr) in PUFF:
        life = 3.2 / spd; tt = ((t - t0) * 0.5 + ph * life) % life; u = tt / life   # slow motion
        cx, cy, sz, col = bowls_xf[b]
        x = cx + (rr - 0.5) * sz * 0.5 + math.sin(ang + u * 5) * 26 * u * 3 + (u * 70) * math.cos(ang)
        y = cy - sz * 0.28 - u * 250 * spd + math.sin(u * 6 + ang) * 12
        a = int(200 * math.sin(math.pi * u) ** 1.2 * fade)
        r = rad * (0.8 + 0.5 * u) * sz / 500 * 1.3
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (a,))
    ov = ov.filter(ImageFilter.GaussianBlur(1.3)); cv.paste(ov, (0, 0), ov)

def bowl_xf(t, zoom, pan, k=0, extra=None):
    out = []
    for i, (n, x, y, s, col) in enumerate(BOWLS):
        d = (0.1 if i < 2 else 0.2) * 0.0
        X, Y, S_ = cam_xf(x, y + 8 * math.sin(t * 0.8 + i), s, d, zoom, pan)
        out.append((X, Y, S_, col))
    return out

def draw_bowls(cv, t, zoom, pan, alpha=1.0, blur=0.0, fly=0.0, edge=None):
    xf = bowl_xf(t, zoom, pan)
    order = [0, 1, 2, 3]
    for i in order:
        n = BOWLS[i][0]; X, Y, S_, col = xf[i]
        pin = e_out(prog(t, 6.3 + i * 0.12, 7.2 + i * 0.12))
        if pin <= 0: continue
        Y2 = Y + (1 - pin) * 90; a = pin * alpha
        if edge is not None:
            ex, ey, es = edge[i]; Xf, Yf = lerp(X, ex, fly), lerp(Y2, ey, fly); S_ = lerp(S_, es, fly)
        else: Xf, Yf = X, Y2
        rot = 1.5 * math.sin(t * 0.7 + i * 1.3) * (1 - fly)
        im = sprite_img(n, S_, rot, 1.0, blur if blur else 0)
        # contact shadow
        pd = int(S_ * 0.2); sw, shh = int(S_ * 1.0), int(S_ * 0.28)
        sh = Image.new('RGBA', (sw + 2 * pd, shh + 2 * pd), (88, 52, 22, 0)); ImageDraw.Draw(sh).ellipse([pd, pd, pd + sw, pd + shh], fill=(88, 52, 22, int(120 * a)))
        sh = sh.filter(ImageFilter.GaussianBlur(S_ * 0.035 + blur)); cv.paste(sh, (int(Xf - sh.width / 2 + 16), int(Yf + S_ * 0.30 - sh.height / 2)), sh)
        place(cv, im, Xf, Yf, alpha=a)
    return xf

def swirl_layer(t, ts, te):
    """powder swirl: spiral arms of coloured particles sweeping out from the centre"""
    p = prog(t, ts, te)
    if p <= 0 or p >= 1: return None, None
    R = e_io(p) * 1700
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    cols = [(236, 160, 14), (196, 28, 12), (158, 138, 62), (146, 112, 64), (236, 190, 80)]
    rs = np.random.default_rng(5)
    N = 2600
    u = rs.random(N); arm = rs.integers(0, 5, N); sz = 2 + rs.random(N) * 6; jit = rs.standard_normal(N)
    for i in range(N):
        r = R * (0.25 + 0.95 * u[i] ** 0.8) + jit[i] * 30
        th = arm[i] * 2 * math.pi / 5 + (r / 380.0) * 2.1 - p * 5.0 + jit[i] * 0.06
        x = W / 2 + math.cos(th) * r; y = H / 2 + math.sin(th) * r * 0.95
        if x < -20 or x > W + 20 or y < -20 or y > H + 20: continue
        a = int(235 * math.sin(math.pi * p) ** 0.6 * (0.5 + 0.5 * (1 - u[i])))
        d.ellipse([x - sz[i], y - sz[i], x + sz[i], y + sz[i]], fill=cols[arm[i]] + (a,))
    ov = ov.filter(ImageFilter.GaussianBlur(1.6))
    # wipe mask
    yy, xx = np.mgrid[0:H // 4, 0:W // 4].astype(np.float32) * 4
    ang = np.arctan2(yy - H / 2, xx - W / 2); rr = np.hypot(xx - W / 2, yy - H / 2)
    edge = R * 0.95 + 70 * np.sin(ang * 5 + p * 8) + 40 * np.sin(ang * 9 - p * 5)
    m = np.clip((edge - rr) / 80, 0, 1)
    mask = Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    return ov, mask

def scene3_bg(t):
    cv = base_canvas(t, beam=0.14)
    zoom = 1 + 0.12 * e_io(prog(t, 6.2, 9.4)); pan = (-26 * prog(t, 6.2, 9.4), -14 * prog(t, 6.2, 9.4))
    xf = draw_bowls(cv, t, zoom, pan)
    puffs(cv, t, 6.6, xf, fade=e_out(prog(t, 6.9, 7.6)))
    dp = e_out(prog(t, 6.5, 7.8))
    for (n, x, y, sz, r, d, ph) in [('leaf1', 40, 1650, 600, 20, 1.0, 0.3), ('cinnamon1', 1010, 1760, 700, -24, 0.9, 1.1), ('cardamom1', 520, 1840, 360, 30, 0.7, 2.0), ('leaf2', 1060, 560, 420, 160, -0.9, 0.7)]:
        X, Y, S_ = cam_xf(x, y + (1 - dp) * 200, sz, d, zoom, pan)
        place(cv, sprite_img(n, S_, r + 3 * math.sin(t + ph), 1.0, blur_of(d)), X, Y, alpha=dp)
    return cv

EDGE_ITEMS = [
    mk('cardamom1', 140, 130, 380, r=-30, d=0.0, ph=0.2, tumble=0.2), mk('clove1', 960, 150, 360, r=40, ph=1.0),
    mk('staranise1', 960, 400, 330, r=10, ph=0.5, spin=10), mk('cinnamon1', 120, 420, 520, r=-60, ph=1.4, d=0.1),
    mk('pepper1', 480, 90, 150, ph=0.3), mk('pepper2', 720, 280, 130, ph=1.3), mk('coriander1', 330, 300, 140, ph=2.0),
    mk('leaf1', 560, 60, 420, r=-15, d=-0.7, ph=1.9, spin=2),
    mk('chilli1', 980, 1760, 560, r=10, ph=0.9), mk('cinnamon1', 110, 1770, 560, r=-14, ph=0.1),
    mk('cardamom2', 590, 1790, 330, r=100, ph=1.4, tumble=0.2), mk('cumin1', 380, 1640, 240, r=20, ph=0.8),
    mk('fenugreek1', 760, 1680, 120, r=20, ph=2.2), mk('fenugreek2', 70, 1600, 110, r=20, ph=1.2),
    mk('pepper3', 440, 1830, 170, ph=0.4), mk('leaf2', 1000, 1800, 420, r=-20, d=-0.8, ph=2.2, spin=2),
    mk('staranise1', 360, 1800, 260, r=-20, ph=0.8, d=0.3), mk('coriander2', 1020, 1480, 150, ph=0.5),
]

def logo_img(size, reveal=1.0, alpha=1.0):
    im = LOGO.resize((size, size), Image.LANCZOS)
    m = LOGO_MASK.resize((size, size), Image.BILINEAR)
    if reveal < 1.0:
        y, x = np.mgrid[0:size, 0:size].astype(np.float32); r = np.hypot(x - size / 2, y - size / 2)
        R = reveal * size * 0.82
        cm = np.clip((R - r) / 70, 0, 1)
        m = Image.fromarray((np.asarray(m).astype(np.float32) * cm).astype(np.uint8))
    if alpha < 1: m = m.point(lambda v: int(v * alpha))
    return im, m

def shimmer(cv, cx, cy, size, p, strength=0.55):
    """diagonal gold sheen sweeping over the logo's ink only"""
    if not (0 < p < 1): return cv
    ink = INK.resize((size, size), Image.BILINEAR)
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    pos = lerp(-0.35, 1.35, p) * size * 1.5
    dd = (x + y * 0.6) - pos
    band = np.exp(-(dd / (size * 0.075)) ** 2) * strength + np.exp(-(dd / (size * 0.02)) ** 2) * 0.35
    band = (band * np.asarray(ink) / 255.0)
    arr = np.zeros((size, size, 3), np.float32); arr[..., 0] = 255; arr[..., 1] = 222; arr[..., 2] = 140
    lay = Image.fromarray((arr * band[..., None]).clip(0, 255).astype(np.uint8), 'RGB')
    full = Image.new('RGB', (W, H), (0, 0, 0)); full.paste(lay, (int(cx - size / 2), int(cy - size / 2)))
    return ImageChops.add(cv, full)

def ring_glow(t, t0, t1, cx=W / 2, cy=H / 2):
    p = prog(t, t0, t1)
    if p <= 0 or p >= 1: return None
    R = e_out(p) * 1250
    y, x = np.mgrid[0:H // 3, 0:W // 3].astype(np.float32) * 3
    r = np.hypot(x - cx, y - cy)
    I = np.exp(-((r - R) / (24 + 50 * p)) ** 2) * (1 - p) ** 0.8 * 0.95
    I += np.exp(-((r - R * 0.9) / 150) ** 2) * (1 - p) * 0.2
    arr = np.stack([I * 255, I * 214, I * 120], -1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGB').resize((W, H), Image.BILINEAR)

def coming_soon_pill(t, t0, cy):
    pw, ph_ = 960, 190
    p = e_back(prog(t, t0, t0 + 0.7))
    a = e_out(prog(t, t0, t0 + 0.4))
    pad = 40; im = Image.new('RGBA', (pw + 2 * pad, ph_ + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).rounded_rectangle([pad, pad + 14, pad + pw, pad + ph_ + 14], 95, fill=140)
    sh = sh.filter(ImageFilter.GaussianBlur(18)); s2 = Image.new('RGBA', im.size, (70, 20, 10, 0)); s2.putalpha(sh); im.alpha_composite(s2)
    # gold border
    gb = Image.new('RGBA', im.size, (0, 0, 0, 0)); gm = Image.new('L', im.size, 0)
    ImageDraw.Draw(gm).rounded_rectangle([pad, pad, pad + pw, pad + ph_], 95, fill=255)
    gold = gradient_fill(im.width, im.height, (250, 222, 140), (176, 124, 40)); gb.paste(gold, (0, 0), gm); im.alpha_composite(gb)
    # maroon body
    bm = Image.new('L', im.size, 0); ImageDraw.Draw(bm).rounded_rectangle([pad + 9, pad + 9, pad + pw - 9, pad + ph_ - 9], 86, fill=255)
    body = gradient_fill(im.width, im.height, (150, 24, 38), (82, 8, 20)); bb = Image.new('RGBA', im.size, (0, 0, 0, 0)); bb.paste(body, (0, 0), bm); im.alpha_composite(bb)
    # inner fine gold line + gloss
    ImageDraw.Draw(im).rounded_rectangle([pad + 18, pad + 18, pad + pw - 18, pad + ph_ - 18], 77, outline=(214, 168, 78, 200), width=2)
    gl = Image.new('L', im.size, 0); ImageDraw.Draw(gl).rounded_rectangle([pad + 22, pad + 14, pad + pw - 22, pad + ph_ // 2 - 2], 70, fill=34)
    glo = Image.new('RGBA', im.size, (255, 230, 200, 0)); glo.putalpha(ImageChops.multiply(gl, bm)); im.alpha_composite(glo)
    return im, p, a

def scene_end(t, cvb):
    """9.0 -> 15.0 : spices to edges, golden circular reveal, logo, tagline, COMING SOON"""
    cv = base_canvas(t, beam=0.16)
    zoom = 1.12 + 0.02 * prog(t, 9, 12)
    # bowls fly outward to the corners and soften
    fly = e_io(prog(t, 9.0, 10.0))
    if fly < 1:
        edge = [(110, 160, 300), (980, 190, 300), (100, 1720, 300), (990, 1700, 300)]
        draw_bowls(cv, t, zoom, (-26, -14), alpha=1 - e_io(prog(t, 9.4, 10.1)), blur=fly * 10, fly=fly, edge=edge)
    lp = e_io(prog(t, 11.7, 12.5))
    # edge spices drift in
    p_e = e_out(prog(t, 9.2, 10.6))
    if p_e > 0:
        for it in sorted(EDGE_ITEMS, key=lambda i: i.get('d', 0)):
            it2 = dict(it); it2['t0'] = 9.2 + (hash(it['n'] + str(it['x'])) % 7) * 0.07; it2['dur'] = 1.3
            cx, cy = it['x'], it['y']; vx, vy = cx - W / 2, cy - H / 2; k = math.hypot(vx, vy) + 1
            it2['from'] = (cx + vx / k * 700, cy + vy / k * 700)
            it2['s'] = it['s'] * (0.9 + 0.1 * p_e) * lerp(1, 0.8, lp)
            it2['x'] = W / 2 + vx * lerp(1, 1.1, lp); it2['y'] = H / 2 + vy * lerp(1, 1.08, lp)
            it2['a'] = lerp(1, 0.9, lp)
            draw_item(cv, it2, t, 1.0, (0, 0), global_alpha=1.0)
    # logo placement
    size = int(lerp(940, 820, lp)); cy = lerp(930, 690, lp)
    rev = e_out(prog(t, 9.55, 10.65))
    sc = lerp(0.93, 1.0, e_out(prog(t, 9.55, 10.9)))
    if rev > 0:
        s_ = int(size * sc); im, m = logo_img(s_, rev if rev < 1 else 1.0)
        cv.paste(im, (int(W / 2 - s_ / 2), int(cy - s_ / 2)), m)
        for (a0, a1) in ((10.8, 11.8), (13.3, 14.1)):
            cv = shimmer(cv, W / 2, cy, s_, prog(t, a0, a1))
    # circular golden light ring
    g = ring_glow(t, 9.45, 10.8)
    if g is not None: cv = ImageChops.add(cv, g)
    g2 = ring_glow(t, 12.9, 13.7, W / 2, 1350)
    if g2 is not None: cv = ImageChops.add(cv, g2)
    # tagline
    if t > 12.3:
        draw_text(cv, 'PURE TASTE • PURE TRADITION', W / 2, 1170, 44, t, 12.35, wght=600, track=7, stagger=0.03, rise=14)
        ornament(cv, W / 2, 1222, 640, e_out(prog(t, 12.9, 13.7)))
    # COMING SOON
    if t > 12.95:
        pill, p, a = coming_soon_pill(t, 12.95, 1355)
        sc2 = lerp(0.75, 1.0, p); pw_ = int(pill.width * sc2); ph2 = int(pill.height * sc2)
        pl = pill.resize((pw_, ph2), Image.BICUBIC)
        pl.putalpha(pl.getchannel('A').point(lambda v: int(v * a)))
        cv.paste(pl, (int(W / 2 - pw_ / 2), int(1355 - ph2 / 2)), pl)
        draw_text(cv, 'COMING SOON', W / 2, 1355, 90, t, 13.15, wght=900, track=7, kind='gold', stagger=0.045, rise=22, scale=1.0)
    # sparkles
    layer = Image.new('RGB', (W, H), (0, 0, 0))
    if t > 10.5:
        for i in range(14):
            ang = i * 2.4; rr = 330 + (i * 97) % 260
            x = W / 2 + math.cos(ang) * rr * 1.15; y = 930 + math.sin(ang) * rr * 1.05
            ph = (t * 0.9 + i * 0.37) % 1.0; a = math.sin(math.pi * ph) ** 2 * e_out(prog(t, 10.6 + i * 0.05, 11.3 + i * 0.05)) * (0.7 if t < 12.3 else 0.5)
            if t > 12.3: y = lerp(y, y - 240, lp)
            add_star(layer, x, y, 70 + (i % 3) * 34, a)
    if t > 13.75:  # final sparkle burst on COMING SOON + logo
        for i, (sx, sy, s0, dl) in enumerate([(130, 1305, 150, 0.0), (950, 1400, 120, 0.12), (540, 1262, 110, 0.22), (790, 470, 130, 0.3), (270, 520, 100, 0.4), (860, 1250, 90, 0.5)]):
            a = math.sin(math.pi * clamp((t - 13.75 - dl) / 0.9)) ** 1.5
            add_star(layer, sx, sy, s0 * (0.6 + 0.6 * a), a)
    cv = ImageChops.add(cv, layer)
    return cv

# ------------------------------------------------------------------ master timeline
def frame(i):
    t = i / FPS
    if t < 3.0 + 0.3:
        cv = scene1(min(t, 3.0 + 0.3))
        if t > 2.7:
            s2 = scene2(max(t, 3.0))
            w = e_io(prog(t, 2.75, 3.15))
            z = 1 + 0.15 * w
            a = cv.resize((int(W * z), int(H * z)), Image.BILINEAR).crop(((int(W * z) - W) // 2, (int(H * z) - H) // 2, (int(W * z) - W) // 2 + W, (int(H * z) - H) // 2 + H))
            cv = Image.blend(a, s2, w)
    elif t < 6.0:
        cv = scene2(t)
    elif t < 7.0:
        s2 = scene2(min(t, 6.2)); s3 = scene3_bg(t)
        ov, mask = swirl_layer(t, 5.85, 7.0)
        if ov is None: cv = s3 if t >= 7.0 else s2
        else:
            cv = Image.composite(s3, s2, mask)
            cv.paste(ov, (0, 0), ov)
        # title for scene 3
        title(cv, ['GROUND SPICES'], t, 6.5, None, 345, size=100, track=10)
    elif t < 9.0:
        cv = scene3_bg(t)
        title(cv, ['GROUND SPICES'], t, 6.5, 8.7, 345, size=100, track=10)
    else:
        cv = scene_end(t, None)
    # intro fade from ivory and film-grain/dither
    if t < 0.35:
        cv = Image.blend(Image.new('RGB', (W, H), IVORY), cv, e_out(t / 0.35))
    a = np.asarray(cv).astype(np.float32) + np.roll(GRAIN, (i * 37) % H, 0)[..., None]
    return np.clip(a, 0, 255).astype(np.uint8)

def _worker(i): return i, frame(i).tobytes()

def main():
    args = sys.argv[1:]
    if args and args[0] == '--stills':
        os.makedirs('stills', exist_ok=True)
        for tt in args[1:]:
            i = int(float(tt) * FPS); Image.fromarray(frame(i)).save(f'stills/t{float(tt):05.2f}.png')
        return
    out = args[1] if args and args[0] == '--video' else 'out/video_silent.mp4'
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    n = int(DUR * FPS)
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    import multiprocessing as mp
    with mp.Pool(4) as pool:
        for k, (i, b) in enumerate(pool.imap(_worker, range(n), chunksize=1)):
            ff.stdin.write(b)
            if k % 30 == 0: print('frame', k, '/', n, flush=True)
    ff.stdin.close(); ff.wait()

if __name__ == '__main__':
    main()
