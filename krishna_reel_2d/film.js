// THE FILM - KRISHNA SPICES 2D "Coming Soon" reel. Every frame is a pure function of t.
// All spices, bowls, ornaments and effects are vector art drawn in code; only the logo is the user's file (never altered).
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { ev, T } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, CX = W / 2;
  const TAU = Math.PI * 2;
  const C = {
    ivory: '#FDFAF3', cream: '#F7EBD0', maroon: '#7A1020', maroonM: '#5E0B18', maroonD: '#3E0710',
    gold: '#C9983A', goldL: '#F4DC93', goldD: '#8C6420', green: '#2F6B3B',
  };
  const P = (t, a, b) => clamp((t - a) / (b - a));
  const hs = (...a) => U.hash(...a);
  const mix = (a, b, p) => a + (b - a) * p;

  let LOGO = null, INK = null;      // cached canvases (made in init)
  const LOGO_BG = [253, 250, 243];

  // ---------------------------------------------------------------- helpers
  function lg(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function rg(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function goldGrad(ctx, y0, y1) { return lg(ctx, 0, y0, 0, y1, [[0, '#FFF0B8'], [0.45, '#E2B654'], [1, '#A87A28']]); }

  function text(ctx, str, x, y, o = {}) {
    const { size = 80, weight = 700, track = 8, color = C.maroon, align = 'center', alpha = 1, stroke, strokeW = 3, shadow, grad } = o;
    ctx.save();
    ctx.font = `${weight} ${size}px Cinzel, serif`; ctx.letterSpacing = `${track}px`; ctx.textBaseline = 'alphabetic';
    const w = ctx.measureText(str).width - track;
    const x0 = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
    ctx.textAlign = 'left'; ctx.globalAlpha *= alpha;
    if (shadow) { ctx.shadowColor = shadow.c; ctx.shadowBlur = shadow.b; ctx.shadowOffsetY = shadow.y || 0; }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW; ctx.lineJoin = 'round'; ctx.strokeText(str, x0, y); ctx.shadowColor = 'transparent'; }
    ctx.fillStyle = grad || color; ctx.fillText(str, x0, y);
    ctx.restore();
    return w;
  }
  // letters that rise & fade in one by one
  function reveal(ctx, str, cx, y, t, t0, o = {}) {
    const { size = 80, weight = 700, track = 8, stagger = 0.045, rise = 34, alpha = 1, out } = o;
    ctx.save(); ctx.font = `${weight} ${size}px Cinzel, serif`; ctx.letterSpacing = `${track}px`;
    const total = ctx.measureText(str).width - track;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i]; if (ch === ' ') continue;
      const p = ease.outCubic(P(t, t0 + i * stagger, t0 + i * stagger + 0.5));
      let a = p * alpha; if (out !== undefined) a *= 1 - ease.inOutQuad(P(t, out, out + 0.35));
      if (a <= 0.01) continue;
      const xi = cx - total / 2 + ctx.measureText(str.slice(0, i)).width;
      ctx.save(); ctx.letterSpacing = '0px';
      ctx.globalAlpha = a; ctx.translate(0, (1 - p) * rise);
      if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || 3; ctx.lineJoin = 'round'; ctx.strokeText(ch, xi, y); }
      if (o.shadow) { ctx.shadowColor = o.shadow.c; ctx.shadowBlur = o.shadow.b; ctx.shadowOffsetY = o.shadow.y || 0; }
      ctx.fillStyle = o.grad || o.color || C.maroon; ctx.fillText(ch, xi, y); ctx.restore();
    }
    ctx.restore(); return total;
  }
  function ornament(ctx, cx, y, w, p, col = C.gold) {
    if (p <= 0) return; const h = w * p / 2;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + s * 22, y); ctx.lineTo(cx + s * h, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * h, y, 5, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(cx, y - 13); ctx.lineTo(cx + 13, y); ctx.lineTo(cx, y + 13); ctx.lineTo(cx - 13, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.ivory; ctx.beginPath(); ctx.arc(cx, y, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function star4(ctx, x, y, r, a, rot = 0, col = '#FFE9A8') {
    if (a <= 0.01 || r < 1) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg(ctx, 0, 0, 0, r * 1.4, [[0, 'rgba(255,240,190,0.9)'], [1, 'rgba(255,220,130,0)']]);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
    ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- vector spices (local coords, s ~ half length)
  const SP = {
    cardamom(ctx, s) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(-s, 0);
      ctx.bezierCurveTo(-s * 0.6, -s * 0.62, s * 0.6, -s * 0.62, s, 0); ctx.bezierCurveTo(s * 0.6, s * 0.62, -s * 0.6, s * 0.62, -s, 0); ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, -s * 0.5, 0, s * 0.5, [[0, '#B5D56E'], [0.5, '#86AE45'], [1, '#476F28']]); ctx.fill(); ctx.clip();
      ctx.strokeStyle = 'rgba(40,70,20,0.35)'; ctx.lineWidth = s * 0.03;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-s, 0); ctx.bezierCurveTo(-s * 0.5, i * s * 0.17, s * 0.5, i * s * 0.17, s, 0); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.28, s * 0.5, s * 0.07, -0.08, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#5E7F34'; ctx.beginPath(); ctx.ellipse(s * 1.0, 0, s * 0.07, s * 0.045, 0, 0, TAU); ctx.fill();
    },
    clove(ctx, s) {
      ctx.save(); ctx.translate(0, -s * 0.1);
      ctx.fillStyle = lg(ctx, -s * 0.1, 0, s * 0.1, 0, [[0, '#7A4424'], [1, '#3F200F']]);
      ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(s * 0.1, 0); ctx.lineTo(s * 0.045, s * 1.05); ctx.quadraticCurveTo(0, s * 1.12, -s * 0.045, s * 1.05); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5C3118';
      for (const a of [-0.9, -0.3, 0.3, 0.9]) { ctx.save(); ctx.translate(0, -s * 0.12); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-s * 0.07, 0); ctx.quadraticCurveTo(0, -s * 0.5, s * 0.07, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = rg(ctx, -s * 0.1, -s * 0.38, s * 0.02, s * 0.3, [[0, '#B77A45'], [0.6, '#7C4824'], [1, '#43210E']]);
      ctx.beginPath(); ctx.arc(0, -s * 0.34, s * 0.27, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,190,0.35)'; ctx.beginPath(); ctx.ellipse(-s * 0.09, -s * 0.44, s * 0.07, s * 0.04, -0.6, 0, TAU); ctx.fill();
      ctx.restore();
    },
    pepper(ctx, s) {
      ctx.fillStyle = rg(ctx, -s * 0.2, -s * 0.25, s * 0.05, s * 0.6, [[0, '#6B5A4E'], [0.45, '#2B221D'], [1, '#0F0B09']]);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = s * 0.025;
      for (let i = 0; i < 5; i++) { const a = hs(7, i) * TAU, r = s * (0.12 + 0.25 * hs(8, i)); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, s * 0.1, a, a + 1.8); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-s * 0.19, -s * 0.24, s * 0.08, s * 0.05, -0.6, 0, TAU); ctx.fill();
    },
    cinnamon(ctx, s) {
      const h = s * 0.3;
      ctx.save(); ctx.beginPath(); ctx.roundRect(-s, -h, s * 2, h * 2, h * 0.9); ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, -h, 0, h, [[0, '#D79456'], [0.5, '#B06A30'], [1, '#6E3715']]); ctx.fill(); ctx.clip();
      ctx.strokeStyle = 'rgba(70,30,10,0.35)'; ctx.lineWidth = s * 0.02;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-s, i * h * 0.38 + hs(3, i) * 4); ctx.lineTo(s, i * h * 0.38 - hs(4, i) * 4); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,230,190,0.28)'; ctx.fillRect(-s, -h * 0.75, s * 2, h * 0.22);
      ctx.restore();
      ctx.save(); ctx.translate(-s + h * 0.15, 0); ctx.fillStyle = '#E8B07A'; ctx.beginPath(); ctx.ellipse(0, 0, h * 0.55, h * 0.98, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8A4A1F'; ctx.lineWidth = s * 0.035; ctx.beginPath();
      for (let a = 0; a < 11; a += 0.2) { const r = 0.05 + a * 0.085; const x = Math.cos(a) * r * h * 0.55, y = Math.sin(a) * r * h * 0.98; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
    },
    cumin(ctx, s, col = ['#B79A5A', '#6B5226']) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(-s, s * 0.12);
      ctx.bezierCurveTo(-s * 0.5, -s * 0.38, s * 0.5, -s * 0.38, s, -s * 0.1); ctx.bezierCurveTo(s * 0.5, s * 0.02, -s * 0.5, s * 0.34, -s, s * 0.12); ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, -s * 0.3, 0, s * 0.3, [[0, col[0]], [1, col[1]]]); ctx.fill(); ctx.clip();
      ctx.strokeStyle = 'rgba(60,40,10,0.45)'; ctx.lineWidth = s * 0.035;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-s, s * 0.12 + i * s * 0.07); ctx.bezierCurveTo(-s * 0.5, -s * 0.2 + i * s * 0.1, s * 0.5, -s * 0.2 + i * s * 0.1, s, -s * 0.1 + i * s * 0.05); ctx.stroke(); }
      ctx.restore();
    },
    fennel(ctx, s) { ctx.save(); ctx.scale(1, 1.25); SP.cumin(ctx, s, ['#C9C98A', '#7C8048']); ctx.restore(); },
    fenugreek(ctx, s) {
      const a = s * 0.4; ctx.save(); ctx.rotate(0.35);
      ctx.fillStyle = lg(ctx, -a, -a, a, a, [[0, '#F2BE45'], [1, '#B27A1C']]); ctx.beginPath(); ctx.roundRect(-a * 1.1, -a * 0.8, a * 2.2, a * 1.6, a * 0.5); ctx.fill();
      ctx.strokeStyle = 'rgba(110,70,10,0.7)'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-a * 0.7, a * 0.6); ctx.lineTo(a * 0.7, -a * 0.6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-a * 0.5, -a * 0.45, a * 0.4, a * 0.12, -0.3, 0, TAU); ctx.fill(); ctx.restore();
    },
    coriander(ctx, s) {
      ctx.fillStyle = rg(ctx, -s * 0.15, -s * 0.2, s * 0.05, s * 0.55, [[0, '#EBC882'], [0.6, '#C99447'], [1, '#8F5F25']]);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.48, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(110,70,20,0.45)'; ctx.lineWidth = s * 0.03;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.48 * Math.abs(i) / 2.4 + 1, s * 0.48, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
      ctx.fillStyle = '#7A4F1E'; ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.06, 0, TAU); ctx.fill();
    },
    staranise(ctx, s) {
      for (let k = 0; k < 8; k++) {
        ctx.save(); ctx.rotate(k * Math.PI / 4);
        ctx.fillStyle = lg(ctx, 0, -s * 0.18, 0, s * 0.18, [[0, '#A4522A'], [1, '#5A2210']]);
        ctx.beginPath(); ctx.moveTo(0, -s * 0.12); ctx.quadraticCurveTo(s * 0.5, -s * 0.3, s * 1.0, 0); ctx.quadraticCurveTo(s * 0.5, s * 0.3, 0, s * 0.12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2A130A'; ctx.beginPath(); ctx.ellipse(s * 0.58, 0, s * 0.13, s * 0.07, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,200,150,0.35)'; ctx.beginPath(); ctx.ellipse(s * 0.5, -s * 0.12, s * 0.2, s * 0.03, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#7B3719'; ctx.beginPath(); ctx.arc(0, 0, s * 0.2, 0, TAU); ctx.fill();
    },
    chilli(ctx, s) {
      ctx.save(); ctx.rotate(-0.15);
      ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.5);
      ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.3, s * 0.35, -s * 1.0, s * 0.55);
      ctx.bezierCurveTo(-s * 0.3, s * 0.2, s * 0.15, -s * 0.2, s * 0.35, -s * 0.5); ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, -s * 0.5, 0, s * 0.55, [[0, '#E83C2A'], [0.5, '#C11E17'], [1, '#7C0C0A']]); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,180,0.5)'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s * 0.62, -s * 0.38); ctx.bezierCurveTo(s * 0.7, -s * 0.12, s * 0.2, s * 0.25, -s * 0.6, s * 0.43); ctx.stroke();
      ctx.fillStyle = '#4F7A2E'; ctx.beginPath(); ctx.moveTo(s * 0.34, -s * 0.5); ctx.quadraticCurveTo(s * 0.52, -s * 0.62, s * 0.72, -s * 0.5); ctx.lineTo(s * 0.64, -s * 0.74); ctx.quadraticCurveTo(s * 0.55, -s * 0.9, s * 0.62, -s * 1.0); ctx.lineTo(s * 0.5, -s * 0.76); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    leaf(ctx, s) {
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.bezierCurveTo(-s * 0.4, -s * 0.62, s * 0.5, -s * 0.5, s, 0); ctx.bezierCurveTo(s * 0.5, s * 0.5, -s * 0.4, s * 0.62, -s, 0);
      ctx.fillStyle = lg(ctx, 0, -s * 0.5, 0, s * 0.5, [[0, '#4E9A4B'], [1, '#1F5A2E']]); ctx.fill();
      ctx.strokeStyle = 'rgba(210,240,170,0.7)'; ctx.lineWidth = s * 0.035; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s * 0.95, 0); ctx.stroke();
      ctx.lineWidth = s * 0.02; for (let i = -3; i <= 3; i++) { if (!i) continue; ctx.beginPath(); ctx.moveTo(i * s * 0.2 - s * 0.1, 0); ctx.lineTo(i * s * 0.2 + s * 0.25, -s * 0.32 * Math.sign(i) * (1 - Math.abs(i) * 0.12)); ctx.stroke(); }
    },
  };
  function spice(ctx, name, x, y, s, rot = 0, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (o.sx) ctx.scale(o.sx, 1);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.blur) ctx.filter = `blur(${o.blur}px)`;
    if (o.shadow !== false && !o.blur) { ctx.save(); ctx.translate(s * 0.12, s * 0.2); ctx.filter = 'blur(' + Math.max(3, s * 0.07) + 'px)'; ctx.globalAlpha *= (o.shA ?? 0.22); ctx.fillStyle = '#5A3412'; ctx.beginPath(); ctx.ellipse(0, 0, s * (name === 'pepper' || name === 'coriander' ? 0.5 : 0.8), s * 0.28, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    SP[name](ctx, s);
    ctx.restore();
  }

  // ---------------------------------------------------------------- bowls with powder
  const POW = { turmeric: ['#F7C12D', '#C87F0C'], chilli: ['#E2341F', '#8E1308'], coriander: ['#B9A354', '#6F6128'], cumin: ['#A98457', '#5E4528'] };
  function bowl(ctx, x, y, w, kind, t = 0, puff = 1) {
    const s = w, pc = POW[kind];
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(90,50,20,0.20)'; ctx.filter = `blur(${s * 0.03}px)`; ctx.beginPath(); ctx.ellipse(s * 0.04, s * 0.5, s * 0.46, s * 0.1, 0, 0, TAU); ctx.fill(); ctx.filter = 'none';
    // body
    ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.bezierCurveTo(-s * 0.48, s * 0.3, -s * 0.3, s * 0.5, -s * 0.2, s * 0.5); ctx.lineTo(s * 0.2, s * 0.5); ctx.bezierCurveTo(s * 0.3, s * 0.5, s * 0.48, s * 0.3, s * 0.5, 0); ctx.closePath();
    ctx.fillStyle = lg(ctx, -s * 0.5, 0, s * 0.5, 0, [[0, '#8A4B1D'], [0.28, '#C98642'], [0.55, '#B06B2C'], [1, '#6E3513']]); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(70,30,8,0.22)'; ctx.lineWidth = s * 0.012;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.5, s * (0.08 + i * 0.07)); ctx.bezierCurveTo(-s * 0.2, s * (0.14 + i * 0.07), s * 0.2, s * (0.02 + i * 0.07), s * 0.5, s * (0.1 + i * 0.07)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,235,200,0.22)'; ctx.beginPath(); ctx.ellipse(-s * 0.27, s * 0.16, s * 0.05, s * 0.17, 0.35, 0, TAU); ctx.fill(); ctx.restore();
    // back rim + dark interior
    ctx.fillStyle = '#C88A47'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.125, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4B2410'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.455, s * 0.095, 0, 0, TAU); ctx.fill();
    // powder mound
    ctx.beginPath(); ctx.moveTo(-s * 0.44, s * 0.0);
    ctx.bezierCurveTo(-s * 0.3, -s * 0.06, -s * 0.12, -s * 0.2, 0, -s * 0.34); ctx.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.3, -s * 0.06, s * 0.44, 0);
    ctx.bezierCurveTo(s * 0.3, s * 0.1, -s * 0.3, s * 0.1, -s * 0.44, 0); ctx.closePath();
    ctx.fillStyle = lg(ctx, -s * 0.3, -s * 0.3, s * 0.3, s * 0.1, [[0, pc[0]], [1, pc[1]]]); ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 90; i++) { const a = hs(11 + i, 1), b = hs(12 + i, 2); const px = (a - 0.5) * s * 0.9, py = -s * 0.32 + b * s * 0.4; ctx.fillStyle = hs(i, 3) > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.13)'; ctx.fillRect(px, py, s * 0.012, s * 0.012); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(0, -s * 0.34); ctx.lineTo(-s * 0.2, -s * 0.05); ctx.lineTo(-s * 0.06, -s * 0.12); ctx.closePath(); ctx.fill();
    ctx.restore();
    // front rim lip
    ctx.strokeStyle = '#DBA05B'; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.125, 0, 0.04, Math.PI - 0.04); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- backgrounds
  function mandala(ctx, cx, cy, R, t, col, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    for (let ring = 0; ring < 3; ring++) {
      const n = 12 + ring * 4, r = R * (0.45 + ring * 0.27); ctx.save(); ctx.rotate(t * (ring % 2 ? -0.05 : 0.05)); ctx.globalAlpha = a * (1 - ring * 0.2);
      for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate(i * TAU / n); ctx.beginPath(); ctx.moveTo(r, 0); ctx.quadraticCurveTo(r + R * 0.12, R * 0.07, r + R * 0.26, 0); ctx.quadraticCurveTo(r + R * 0.12, -R * 0.07, r, 0); ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function dust(ctx, t, n, col, seed, up = 1) {
    for (let i = 0; i < n; i++) {
      const sp = 24 + hs(seed, i, 1) * 50; const y = ((hs(seed, i, 2) * (H + 80)) - t * sp * up) % (H + 80); const yy = y < 0 ? y + H + 80 : y;
      const x = hs(seed, i, 3) * W + Math.sin(t * 0.8 + i) * 16; const r = 2 + hs(seed, i, 4) * 5; const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
      ctx.fillStyle = `rgba(${col},${0.55 * tw})`; ctx.beginPath(); ctx.arc(x, yy - 40, r, 0, TAU); ctx.fill();
    }
  }
  function bgIvory(ctx, t) {
    ctx.fillStyle = C.ivory; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rg(ctx, CX, H * 0.5, 300, 1250, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(226,196,140,0.38)']]); ctx.fillRect(0, 0, W, H);
  }
  function bgMaroon(ctx, t) {
    ctx.fillStyle = rg(ctx, CX, H * 0.5, 100, 1300, [[0, C.maroon], [1, C.maroonD]]); ctx.fillRect(0, 0, W, H);
  }
  function bgGold(ctx, t) {
    ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#FBEBC0'], [1, '#F4D58C']]); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rg(ctx, CX, H * 0.5, 200, 1200, [[0, 'rgba(255,255,255,0.45)'], [1, 'rgba(200,140,40,0.22)']]); ctx.fillRect(0, 0, W, H);
  }

  // ---------------------------------------------------------------- scene 1: THE MAGIC OF SPICES
  const S1 = [
    ['cardamom', 200, 760, 110, -0.35, 0.35, [-250, 300]], ['cardamom', 870, 1340, 105, 2.4, 0.7, [1300, 1500]],
    ['clove', 890, 760, 100, 0.5, 0.5, [1300, 200]], ['clove', 170, 1260, 95, -0.5, 0.9, [-300, 1400]],
    ['cinnamon', 330, 1500, 150, -0.25, 0.2, [-500, 2100]], ['cinnamon', 830, 1000, 140, 0.65, 0.6, [1500, 1000]],
    ['staranise', 190, 980, 100, 0.2, 0.3, [-300, 700]], ['chilli', 650, 1170, 140, 0.35, 0.8, [700, 2200]],
    ['pepper', 470, 840, 80, 0, 0.45, [-200, 840]], ['pepper', 650, 690, 64, 0, 0.9, [1300, 690]], ['pepper', 560, 1330, 82, 0, 1.0, [560, 2200]],
    ['coriander', 105, 640, 74, 0, 0.6, [-200, 640]], ['coriander', 960, 1230, 80, 0, 1.1, [1300, 1250]],
    ['cumin', 450, 1480, 100, 0.5, 1.2, [460, 2200]], ['cumin', 760, 830, 90, -0.5, 1.0, [1300, 800]],
    ['fennel', 330, 1180, 96, -1.0, 1.3, [-300, 1170]], ['fenugreek', 610, 1010, 62, 0, 1.2, [1300, 1010]], ['fenugreek', 100, 1520, 58, 0.7, 1.5, [-200, 1500]],
  ];
  function floatItems(ctx, items, t, t0off = 0, dim = 1) {
    items.forEach((it, i) => {
      const [nm, ex, ey, s, rot, t0, from] = it;
      const p = ease.outCubic(P(t, t0 + t0off, t0 + t0off + 1.9)); if (p <= 0) return;
      const x = mix(from[0], ex, p) + 10 * Math.sin(t * 0.9 + i), y = mix(from[1], ey, p) + 14 * Math.sin(t * 1.15 + i * 1.7);
      spice(ctx, nm, x, y, s * 1.38, rot + (1 - p) * 3.5 + 0.1 * Math.sin(t * 0.8 + i), { alpha: Math.min(1, p * 2) * dim });
    });
  }
  function scene1(ctx, t) {
    bgIvory(ctx, t);
    mandala(ctx, CX, 980, 520, t, C.gold, 0.55);
    ctx.fillStyle = rg(ctx, CX, 980, 0, 460, [[0, 'rgba(255,236,170,0.6)'], [1, 'rgba(255,236,170,0)']]); ctx.fillRect(0, 0, W, H);
    dust(ctx, t, 46, '215,165,70', 5);
    // soft background leaves (depth of field)
    spice(ctx, 'leaf', 1010, 1100, 190, -0.4 + 0.05 * Math.sin(t), { blur: 9, alpha: 0.7 * P(t, 0.3, 1.5) }); spice(ctx, 'leaf', 40, 820, 180, 2.7, { blur: 9, alpha: 0.7 * P(t, 0.3, 1.5) });
    floatItems(ctx, S1, t);
    // out-of-focus foreground hero seeds
    const fp = ease.outCubic(P(t, 0.4, 2.6));
    spice(ctx, 'pepper', mix(-300, -20, fp), mix(2300, 1790, fp), 300, 0, { blur: 18, alpha: 0.95 }); spice(ctx, 'cardamom', mix(1700, 1120, fp), mix(2300, 1800, fp), 260, 0.9, { blur: 18, alpha: 0.95 });
    const tp = t;
    reveal(ctx, 'THE MAGIC', CX, 340, tp, ev.title1, { size: 104, track: 10, color: C.maroon, stroke: C.gold, strokeW: 3, out: ev.wipe2 + 0.3 });
    reveal(ctx, 'OF SPICES', CX, 460, tp, ev.title1 + 0.45, { size: 104, track: 10, color: C.maroon, stroke: C.gold, strokeW: 3, out: ev.wipe2 + 0.3 });
    ornament(ctx, CX, 505, 520, ease.outCubic(P(t, ev.title1 + 1.3, ev.title1 + 2.0)) * (1 - ease.inOutQuad(P(t, ev.wipe2 + 0.3, ev.wipe2 + 0.65))));
  }

  // ---------------------------------------------------------------- scene 2: WHOLE SPICES (6 medallions)
  const MED = [['cardamom', 290, 650], ['clove', 790, 650], ['pepper', 290, 990], ['cinnamon', 790, 990], ['cumin', 290, 1330], ['fenugreek', 790, 1330]];
  function medallionContent(ctx, nm, t, k) {
    const bob = Math.sin(t * 1.4 + k) * 0.08;
    ctx.save();
    if (nm === 'cardamom') { spice(ctx, 'cardamom', -20, 10, 120, -0.5 + bob); spice(ctx, 'cardamom', 28, -34, 74, 0.6 - bob, { shadow: false }); }
    if (nm === 'clove') { spice(ctx, 'clove', -36, 4, 112, -0.6 + bob); spice(ctx, 'clove', 44, 6, 100, 0.55 - bob); }
    if (nm === 'pepper') { [[-44, 30, 52], [30, 36, 50], [-8, -30, 54], [60, -22, 40], [-62, -26, 38]].forEach(([x, y, s], i) => spice(ctx, 'pepper', x, y + 4 * Math.sin(t * 2 + i), s * 1.3, 0)); }
    if (nm === 'cinnamon') { spice(ctx, 'cinnamon', 0, -18, 118, -0.35 + bob); spice(ctx, 'cinnamon', 6, 32, 112, 0.28 - bob, { shadow: false }); }
    if (nm === 'cumin') { [[-50, -22, 66, -0.5], [38, -30, 62, 0.5], [-6, 12, 70, 0.05], [-40, 48, 58, 0.45], [50, 40, 58, -0.4]].forEach(([x, y, s, r], i) => spice(ctx, 'cumin', x, y, s, r + bob * (i % 2 ? 1 : -1))); }
    if (nm === 'fenugreek') { [[-44, -30, 66, 0], [34, -34, 62, 1], [-6, 12, 70, 2], [-48, 46, 58, 3], [50, 38, 58, 4]].forEach(([x, y, s], i) => spice(ctx, 'fenugreek', x, y + 4 * Math.sin(t * 2 + i), s * 1.2, bob * 2)); }
    ctx.restore();
  }
  function medallion(ctx, x, y, t, i, p) {
    const r = 176;
    ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = rg(ctx, 0, -30, 20, r, [[0, '#FBE8B8'], [1, '#EBC57A']]); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = goldGrad(ctx, -r, r); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.maroon; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 14, 0, TAU); ctx.stroke();
    ctx.save(); ctx.rotate(t * 0.3 * (i % 2 ? -1 : 1)); ctx.fillStyle = C.gold; for (let k = 0; k < 36; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * TAU / 36) * (r + 22), Math.sin(k * TAU / 36) * (r + 22), 3, 0, TAU); ctx.fill(); } ctx.restore();
    ctx.scale(1.12, 1.12); medallionContent(ctx, MED[i][0], t, i);
    ctx.restore();
  }
  function scene2(ctx, t) {
    bgMaroon(ctx, t);
    mandala(ctx, CX, 980, 560, t, C.goldL, 0.22);
    dust(ctx, t, 40, '240,200,110', 9);
    const out2 = T(2) - 0.3;
    MED.forEach(([nm, x, y], i) => {
      const p = ease.outBack(P(t, ev.pops2[i] - 0.1, ev.pops2[i] + 0.35), 2.2); if (p <= 0.001) return;
      const pa = i < 0 ? 1 : 1; ctx.save(); medallion(ctx, x, y + 6 * Math.sin(t * 1.2 + i), t, i, p * (1 + 0.04 * Math.sin(t * 2 + i))); ctx.restore();
      // pop ring
      const rp = P(t, ev.pops2[i], ev.pops2[i] + 0.6); if (rp > 0 && rp < 1) { ctx.strokeStyle = `rgba(244,220,147,${1 - rp})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 180 + rp * 120, 0, TAU); ctx.stroke(); }
    });
    const g = lg(ctx, 0, 270, 0, 380, [[0, '#FFF3C4'], [0.5, '#E9C464'], [1, '#B98A2E']]);
    reveal(ctx, 'WHOLE SPICES', CX, 350, t, ev.title2, { size: 96, track: 8, grad: g, stroke: C.maroonD, strokeW: 2, shadow: { c: 'rgba(0,0,0,0.4)', b: 14, y: 4 } });
    ornament(ctx, CX, 392, 560, ease.outCubic(P(t, ev.title2 + 0.6, ev.title2 + 1.3)), C.goldL);
  }

  // ---------------------------------------------------------------- scene 3: GROUND SPICES
  const BW = [['turmeric', 275, 790], ['chilli', 805, 920], ['coriander', 275, 1185], ['cumin', 805, 1300]];
  const BOWL_W = 490;
  function puffs(ctx, t, bx) {
    for (let b = 0; b < 4; b++) {
      const [kind] = BW[b]; const [x, y] = bx[b]; const col = POW[kind][0];
      for (let i = 0; i < 26; i++) {
        const life = 2.6 + hs(b, i, 1) * 1.4; const u = (((t - ev.pops3[b]) * 0.5 + hs(b, i, 2) * life) % life) / life; if (t < ev.pops3[b] + 0.2) continue;
        const px = x + (hs(b, i, 3) - 0.5) * BOWL_W * 0.6 + Math.sin(u * 5 + i) * 26 * u + (hs(b, i, 4) - 0.5) * 120 * u;
        const py = y - BOWL_W * 0.34 - u * (170 + hs(b, i, 5) * 200);
        ctx.fillStyle = col; ctx.globalAlpha = Math.sin(Math.PI * u) * 0.8; ctx.beginPath(); ctx.arc(px, py, 2 + hs(b, i, 6) * 5 * (0.8 + u), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function bowlPositions(t) {
    return BW.map(([k, x, y], i) => {
      const p = ease.outBack(P(t, ev.pops3[i] - 0.15, ev.pops3[i] + 0.4), 1.8);
      const q = ease.inOutCubic(P(t, ev.exit3, ev.logo)); const ex = [[120, 170], [960, 190], [110, 1750], [975, 1730]][i];
      return { x: mix(x, ex[0], q), y: mix(y + (1 - p) * 120, ex[1], q) + 6 * Math.sin(t * 1.2 + i), s: BOWL_W * mix(1, 0.42, q), p, q };
    });
  }
  function converge(ctx, t) {
    const p = P(t, ev.exit3 + 0.1, ev.logo); if (p <= 0 || p >= 1) return;
    for (let i = 0; i < 90; i++) { const a = hs(31, i) * TAU, r0 = 700 + hs(32, i) * 700; const u = Math.min(1, p * (0.8 + hs(33, i) * 0.4)); const r = r0 * (1 - ease.inCubic(u)) + 12;
      ctx.fillStyle = `rgba(214,160,50,${0.9 * Math.sin(Math.PI * Math.min(1, u))})`; ctx.beginPath(); ctx.arc(CX + Math.cos(a + u * 1.6) * r, 930 + Math.sin(a + u * 1.6) * r, 3 + hs(34, i) * 4, 0, TAU); ctx.fill(); }
    const g = ease.inCubic(p); ctx.fillStyle = rg(ctx, CX, 930, 0, 260, [[0, `rgba(255,236,170,${0.8 * g})`], [1, 'rgba(255,236,170,0)']]); ctx.fillRect(0, 0, W, H);
  }
  function scene3(ctx, t, withTitle = true) {
    bgGold(ctx, t);
    mandala(ctx, CX, 1000, 560, t, C.goldD, 0.16);
    dust(ctx, t, 36, '255,255,255', 4, 1);
    const bp = bowlPositions(t);
    const pb = bp.map((b) => [b.x, b.y]);
    if (t < ev.exit3) puffs(ctx, t, pb); else converge(ctx, t);
    bp.forEach((b, i) => { if (b.p <= 0.01) return; ctx.save(); ctx.globalAlpha = Math.min(1, b.p * 2); bowl(ctx, b.x, b.y, b.s * Math.max(0.2, b.p), BW[i][0], t); ctx.restore(); });
    if (withTitle) {
      reveal(ctx, 'GROUND SPICES', CX, 350, t, ev.title3, { size: 96, track: 8, color: C.maroon, stroke: C.gold, strokeW: 3, out: ev.exit3 });
      ornament(ctx, CX, 392, 560, ease.outCubic(P(t, ev.title3 + 0.6, ev.title3 + 1.3)) * (1 - ease.inOutQuad(P(t, ev.exit3, ev.exit3 + 0.35))));
    }
  }

  // ---------------------------------------------------------------- swirl transition (scene 2 -> 3)
  function swirlEdge(ctx, t) {
    const p = P(t, ev.swirlStart, ev.swirl + 0.1); if (p <= 0 || p >= 1) return;
    const R = ease.inOutCubic(p) * 1550; const cols = ['#F7C12D', '#E2341F', '#B9A354', '#A98457', '#F6DFA0'];
    for (let i = 0; i < 700; i++) {
      const arm = i % 5, u = hs(3, i, 1), j = hs(3, i, 2) - 0.5;
      const r = R * (0.55 + 0.5 * u) + j * 60; const th = arm * TAU / 5 + r / 360 * 1.9 - p * 5.2 + j * 0.1;
      const x = CX + Math.cos(th) * r, y = H / 2 + Math.sin(th) * r * 0.95;
      ctx.globalAlpha = Math.sin(Math.PI * p) ** 0.7 * (0.35 + 0.65 * (1 - u)); ctx.fillStyle = cols[arm];
      ctx.beginPath(); ctx.arc(x, y, 3 + hs(3, i, 3) * 7, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function blobPath(ctx, R, t, k) {
    ctx.beginPath(); const n = 90;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU; const r = R + (R > 0 ? 38 * Math.sin(a * 5 + t * k) + 22 * Math.sin(a * 9 - t * k * 0.7) : 0); const x = CX + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r * 1.0; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
  }

  // ---------------------------------------------------------------- scenes 4/5: logo, tagline, COMING SOON
  const EDGE = [
    ['cardamom', 150, 130, 110, -0.5, 0.2], ['clove', 960, 150, 100, 0.7, 0.3], ['staranise', 940, 420, 96, 0.1, 0.1], ['cinnamon', 130, 400, 140, -1.0, 0.4],
    ['pepper', 470, 90, 56, 0, 0.5], ['pepper', 740, 270, 48, 0, 0.6], ['coriander', 340, 300, 54, 0, 0.7], ['leaf', 560, 50, 150, -0.3, 0.2],
    ['chilli', 960, 1770, 150, 0.2, 0.3], ['cinnamon', 110, 1780, 140, -0.3, 0.1], ['cardamom', 600, 1830, 100, 1.6, 0.5], ['cumin', 380, 1650, 90, 0.4, 0.4],
    ['fenugreek', 760, 1690, 50, 0.3, 0.6], ['fenugreek', 70, 1610, 46, 0.4, 0.5], ['pepper', 450, 1850, 58, 0, 0.7], ['leaf', 1000, 1820, 140, 0.5, 0.3], ['staranise', 350, 1830, 80, 0.2, 0.2], ['coriander', 1020, 1560, 52, 0, 0.8],
  ];
  function edgeDeco(ctx, t) {
    const lp = ease.inOutCubic(P(t, ev.moveUp, ev.moveUp + 0.8));
    EDGE.forEach(([nm, x, y, s, rot, d], i) => {
      const p = ease.outCubic(P(t, ev.logo + 0.05 + d * 0.4, ev.logo + 1.3 + d * 0.4)); if (p <= 0) return;
      const vx = x - CX, vy = y - H / 2, k = Math.hypot(vx, vy) + 1;
      const px = mix(x + vx / k * 600, x, p) + 8 * Math.sin(t * 0.9 + i), py = mix(y + vy / k * 600, y, p) + 10 * Math.sin(t * 1.1 + i * 1.3);
      spice(ctx, nm, CX + (px - CX) * mix(1, 1.08, lp), H / 2 + (py - H / 2) * mix(1, 1.05, lp), s * mix(1, 0.85, lp), rot + 0.12 * Math.sin(t * 0.8 + i), { alpha: p });
    });
  }
  function logoLayout(t) {
    const lp = ease.inOutCubic(P(t, ev.moveUp, ev.moveUp + 0.8));
    return { size: mix(940, 820, lp), cy: mix(930, 690, lp) };
  }
  function drawLogo(ctx, t) {
    if (!LOGO || t < ev.logo) return;
    const { size, cy } = logoLayout(t);
    const rev = ease.outCubic(P(t, ev.logo, ev.logo + 1.15)); const sc = mix(0.92, 1, ease.outCubic(P(t, ev.logo, ev.logo + 1.3)));
    const s = size * sc;
    ctx.save(); ctx.beginPath(); ctx.arc(CX, cy, rev * size * 0.8, 0, TAU); ctx.clip();
    ctx.drawImage(LOGO, CX - s / 2, cy - s / 2, s, s);
    // shimmer: a diagonal gold sheen over the logo ink only
    for (const [a0, a1] of [[ev.shimmer1, ev.shimmer1 + 1.0], [ev.shimmer2, ev.shimmer2 + 0.9]]) {
      const p = P(t, a0, a1); if (p <= 0 || p >= 1 || !INK) continue;
      const tmp = shimmerTmp(s);
      const tc = tmp.getContext('2d'); tc.clearRect(0, 0, s, s);
      const pos = mix(-0.4, 1.4, p) * s * 1.5;
      tc.save(); tc.translate(0, 0); tc.fillStyle = lg(tc, pos - s * 0.18, pos * 0.4 - s * 0.18 * 0.6, pos + s * 0.18, pos * 0.4 + s * 0.18 * 0.6, [[0, 'rgba(255,225,140,0)'], [0.45, 'rgba(255,236,170,0.95)'], [0.55, 'rgba(255,255,230,1)'], [1, 'rgba(255,225,140,0)']]);
      tc.fillRect(0, 0, s, s); tc.restore();
      tc.globalCompositeOperation = 'destination-in'; tc.drawImage(INK, 0, 0, s, s); tc.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.drawImage(tmp, CX - s / 2, cy - s / 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  let _tmp = null; function shimmerTmp(s) { const z = Math.ceil(s); if (!_tmp || _tmp.width !== z) { _tmp = document.createElement('canvas'); _tmp.width = z; _tmp.height = z; } return _tmp; }

  function lightReveal(ctx, t) {
    const p = P(t, ev.logo, ev.logo + 1.25); if (p <= 0) return;
    // soft golden glow + slowly turning rays around the logo
    const a = ease.outCubic(P(t, ev.logo, ev.logo + 1.0));
    ctx.save(); ctx.translate(CX, 930); ctx.rotate(t * 0.12); ctx.globalAlpha = 0.16 * a;
    for (let i = 0; i < 20; i++) { ctx.fillStyle = i % 2 ? '#F1CE6E' : 'rgba(255,255,255,0)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2400, i * TAU / 20, (i + 1) * TAU / 20); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // expanding ring of light
    if (p < 1) {
      const R = ease.outCubic(p) * 1250; ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,214,110,${(1 - p) * 0.95})`; ctx.lineWidth = 34 * (1 - p) + 6; ctx.shadowColor = 'rgba(255,200,80,0.9)'; ctx.shadowBlur = 50;
      ctx.beginPath(); ctx.arc(CX, 930, R, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }

  function pillPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function comingSoon(ctx, t) {
    if (t < ev.soon - 0.02) return;
    const dt = t - ev.soon; const cy = 1355, w = 960, h = 188;
    const sc = dt < 0.4 ? mix(1.7, 1, ease.outBack(clamp(dt / 0.34), 2.4)) : 1; const a = clamp(dt / 0.12);
    ctx.save(); ctx.translate(CX + (dt < 0.5 ? U.noise1(t * 60, 1) * 10 * Math.exp(-dt * 9) : 0), cy + (dt < 0.5 ? U.noise1(t * 60, 2) * 10 * Math.exp(-dt * 9) : 0)); ctx.scale(sc, sc); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(70,20,10,0.5)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 18;
    pillPath(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = lg(ctx, 0, -h / 2, 0, h / 2, [[0, '#FBE7A6'], [1, '#B07C26']]); ctx.fill(); ctx.shadowColor = 'transparent';
    pillPath(ctx, -w / 2 + 10, -h / 2 + 10, w - 20, h - 20, h / 2 - 10); ctx.fillStyle = lg(ctx, 0, -h / 2, 0, h / 2, [[0, '#9A1A2E'], [1, '#5A0A18']]); ctx.fill();
    pillPath(ctx, -w / 2 + 22, -h / 2 + 22, w - 44, h - 44, h / 2 - 22); ctx.strokeStyle = 'rgba(244,220,147,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); pillPath(ctx, -w / 2 + 10, -h / 2 + 10, w - 20, h - 20, h / 2 - 10); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.46);
    // shimmer across the plate
    const sp = P(t, ev.shimmer2 + 0.1, ev.shimmer2 + 1.0); if (sp > 0 && sp < 1) { const x = mix(-w * 0.7, w * 0.7, sp); ctx.fillStyle = lg(ctx, x - 90, 0, x + 90, 0, [[0, 'rgba(255,240,190,0)'], [0.5, 'rgba(255,240,190,0.5)'], [1, 'rgba(255,240,190,0)']]); ctx.fillRect(-w / 2, -h / 2, w, h); }
    ctx.restore();
    text(ctx, 'COMING SOON', 0, 34, { size: 92, weight: 900, track: 8, grad: lg(ctx, 0, -50, 0, 50, [[0, '#FFF3BE'], [0.5, '#EFC967'], [1, '#C4902F']]), shadow: { c: 'rgba(0,0,0,0.45)', b: 8, y: 4 } });
    ctx.restore();
    // shockwave + sparks on the stamp
    if (dt < 0.7) { const r = ease.outCubic(dt / 0.7); ctx.strokeStyle = `rgba(244,200,100,${(1 - r) * 0.8})`; ctx.lineWidth = 8 * (1 - r) + 1; ctx.beginPath(); ctx.ellipse(CX, cy, 480 + r * 420, 94 + r * 220, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 28; i++) { const a = hs(5, i) * TAU, d = r * (160 + hs(6, i) * 420); ctx.fillStyle = `rgba(250,215,120,${(1 - r)})`; ctx.beginPath(); ctx.arc(CX + Math.cos(a) * (440 + d) * (Math.cos(a) > 0 ? 1 : 1), cy + Math.sin(a) * d * 0.7, 3 + hs(7, i) * 4 * (1 - r), 0, TAU); ctx.fill(); } }
  }
  function finalSparkles(ctx, t) {
    if (t < ev.sparkle - 0.2) return;
    const pts = [[120, 1330, 74, 0], [960, 1390, 62, 0.12], [540, 1262, 54, 0.22], [840, 470, 66, 0.3], [250, 520, 54, 0.4], [880, 1250, 44, 0.5], [190, 1450, 40, 0.6], [700, 1445, 42, 0.7]];
    pts.forEach(([x, y, r, d], i) => { const u = clamp((t - ev.sparkle - d) / 0.95); const a = Math.sin(Math.PI * u) ** 1.4; star4(ctx, x, y, r * (0.5 + 0.8 * a), a, 0.4 * u); });
    // ambient twinkles that continue while the frame holds
    if (t > ev.sparkle + 1.0) for (let i = 0; i < 7; i++) { const u = ((t * 0.55 + hs(9, i)) % 1); const a = Math.sin(Math.PI * u) ** 2 * 0.7; star4(ctx, 90 + hs(10, i) * 900, 300 + hs(11, i) * 1250, 22 + hs(12, i) * 22, a, u); }
  }
  function sceneEnd(ctx, t, circle) {
    // t >= exit of scene 3: warm ivory bg expands inside a golden circle over the scene-3 backdrop
    bgIvory(ctx, t);
    const g = ease.outCubic(P(t, ev.logo, ev.logo + 1.2));
    ctx.fillStyle = rg(ctx, CX, 930, 450, 1300, [[0, 'rgba(255,236,170,0)'], [1, `rgba(236,196,100,${0.5 * g})`]]); ctx.fillRect(0, 0, W, H);
    mandala(ctx, CX, 930, 620, t, C.gold, 0.3 * g);
    dust(ctx, t, 44, '215,165,70', 21);
    lightReveal(ctx, t);
    edgeDeco(ctx, t);
    drawLogo(ctx, t);
    if (t > ev.tag - 0.1) {
      const col = lg(ctx, 0, 1140, 0, 1200, [[0, '#8E1428'], [1, '#5E0B18']]);
      reveal(ctx, 'PURE TASTE • PURE TRADITION', CX, 1180, t, ev.tag, { size: 44, weight: 600, track: 6, grad: col, stagger: 0.03, rise: 16, stroke: 'rgba(201,152,58,0.9)', strokeW: 2 });
      ornament(ctx, CX, 1232, 640, ease.outCubic(P(t, ev.tag + 0.7, ev.tag + 1.5)));
    }
    comingSoon(ctx, t);
    finalSparkles(ctx, t);
  }

  // ---------------------------------------------------------------- master
  Studio.film({
    async init() {
      const img = await Studio.loadImage('assets/logo.png');
      await Studio.loadFont('Cinzel', 'assets/Cinzel.ttf', '400 900');
      const n = img.naturalWidth;
      // the logo, untouched, with only its outer square edge feathered into the matching ivory page
      LOGO = document.createElement('canvas'); LOGO.width = LOGO.height = n; const lc = LOGO.getContext('2d'); lc.drawImage(img, 0, 0);
      lc.globalCompositeOperation = 'destination-in'; lc.filter = 'blur(26px)'; lc.fillStyle = '#fff'; lc.fillRect(60, 60, n - 120, n - 120); lc.filter = 'none';
      // ink mask (non-background pixels) used only for the shimmer
      const tc = document.createElement('canvas'); tc.width = tc.height = n; const c2 = tc.getContext('2d'); c2.drawImage(img, 0, 0); const d = c2.getImageData(0, 0, n, n);
      for (let i = 0; i < d.data.length; i += 4) { const df = Math.max(Math.abs(d.data[i] - LOGO_BG[0]), Math.abs(d.data[i + 1] - LOGO_BG[1]), Math.abs(d.data[i + 2] - LOGO_BG[2])); d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = Math.min(255, df * 6); }
      c2.putImageData(d, 0, 0); INK = tc;
    },
    draw(ctx, t) {
      const wipe2 = ease.inOutCubic(P(t, ev.wipe2, ev.wipe2 + 0.6));
      if (t < ev.wipe2) { scene1(ctx, t); }
      else if (t < ev.wipe2 + 0.62) { scene1(ctx, t); ctx.save(); blobPath(ctx, wipe2 * 1500, t, 3); ctx.clip(); scene2(ctx, t); ctx.restore();
        ctx.save(); ctx.strokeStyle = `rgba(244,210,120,${1 - wipe2})`; ctx.lineWidth = 14; blobPath(ctx, wipe2 * 1500, t, 3); ctx.stroke(); ctx.restore(); }
      else if (t < ev.swirlStart) { scene2(ctx, t); }
      else if (t < ev.swirl + 0.1) { scene2(ctx, t); const p = ease.inOutCubic(P(t, ev.swirlStart, ev.swirl + 0.1)); ctx.save(); blobPath(ctx, p * 1550 * 0.95, t, 4); ctx.clip(); scene3(ctx, t); ctx.restore(); swirlEdge(ctx, t); }
      else if (t < ev.logo) { scene3(ctx, t); }
      else {
        scene3(ctx, t, false);
        const p = ease.inOutCubic(P(t, ev.logo, ev.logo + 0.9));
        ctx.save(); ctx.beginPath(); ctx.arc(CX, 930, p * 1450, 0, TAU); ctx.clip(); sceneEnd(ctx, t); ctx.restore();
        if (p < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,214,110,${1 - p})`; ctx.lineWidth = 40 * (1 - p) + 8; ctx.shadowColor = 'rgba(255,190,70,1)'; ctx.shadowBlur = 60; ctx.beginPath(); ctx.arc(CX, 930, p * 1450, 0, TAU); ctx.stroke(); ctx.restore(); }
        if (t < ev.logo + 0.4) { ctx.fillStyle = `rgba(255,248,220,${0.95 * Math.exp(-(t - ev.logo) * 9)})`; ctx.fillRect(0, 0, W, H); }
      }
      if (t >= ev.swirl && t < ev.swirl + 0.4) { ctx.fillStyle = `rgba(255,244,210,${0.9 * Math.exp(-(t - ev.swirl) * 9)})`; ctx.fillRect(0, 0, W, H); }
      // keep the bowls travelling to the corners visible through the iris: draw them again above scene 3 during the reveal
    },
    post: { paper: 0, vignette: 0.12, grain: 0.03 },
    fadeOut: 0,
  });
})();
