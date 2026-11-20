// THE FILM — Vice City day-to-night. Every frame is a pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { ev, SC, T, BEAT, clock } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H;
  const TAU = Math.PI * 2;
  const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const mod = (a, n) => ((a % n) + n) % n;
  const inR = (t, r) => t >= r[0] && t < r[1];
  const glow = (ctx, c, b) => { ctx.shadowColor = c; ctx.shadowBlur = b; };
  const noGlow = (ctx) => { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; };
  const vgrad = (ctx, y0, y1, stops) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; };
  const beat = (t) => clock.phase(t);
  const kick = (t) => Math.exp(-beat(t) * 6); // 1 on the beat, decays
  const FONT = { fam: 'Bungee', weight: 400, boil: 0 };
  const txt = (ctx, s, x, y, o) => G.text(ctx, s, x, y, { ...FONT, align: 'center', ...o });

  // ---------------- shared pieces ----------------
  function sun(ctx, cx, cy, r, sky, hy) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip();
    const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ff9e5e'); g.addColorStop(1, '#ff2f8e');
    glow(ctx, '#ff5fa2', 80);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    noGlow(ctx);
    ctx.fillStyle = sky; // slits cut with the sky itself
    for (let k = 0; k < 7; k++) { const y = cy + r * 0.05 + k * r * 0.14; ctx.fillRect(cx - r, y, r * 2, 3 + k * 2.2); }
    ctx.restore();
  }

  function palm(ctx, x, y, h, sway, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = h * 0.045;
    const tx = x + h * 0.1 + sway * 0.4, ty = y - h;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + h * 0.01, y - h * 0.55, tx, ty); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.98 + i * (Math.PI * 0.96 / 8) + sway * 0.004 * (i % 2 ? 1 : -1);
      const L = h * 0.5, dx = Math.cos(a), dy = Math.sin(a);
      const ex = tx + dx * L, ey = ty + dy * L * 0.55 + L * 0.42;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + dx * L * 0.55, ty + dy * L * 0.75 - L * 0.12, ex, ey);
      ctx.quadraticCurveTo(tx + dx * L * 0.5, ty + dy * L * 0.55 + L * 0.06, tx, ty); ctx.fill();
    }
  }

  function wheel(ctx, x, y, r, rot, rim) {
    ctx.fillStyle = '#0c0714'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3;
    for (let k = 0; k < 5; k++) { const a = rot + k * TAU / 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); ctx.stroke(); }
  }

  // side-view sports car facing right; (x, y) = ground contact, s = scale
  function car(ctx, x, y, s, o) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s); ctx.rotate(o.tilt || 0);
    glow(ctx, o.glow, 45); ctx.fillStyle = o.glow; ctx.globalAlpha = 0.9; ctx.fillRect(-140, -9, 290, 8); ctx.globalAlpha = 1; noGlow(ctx);
    const body = () => { ctx.beginPath(); ctx.moveTo(-178, -34); ctx.lineTo(-172, -66); ctx.lineTo(-96, -74); ctx.lineTo(-50, -112); ctx.lineTo(52, -112); ctx.lineTo(112, -72); ctx.lineTo(172, -60); ctx.lineTo(180, -34); ctx.closePath(); };
    body(); ctx.fillStyle = o.color; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-170, -62, 340, 5); // beltline highlight
    if (!o.convertible) { ctx.fillStyle = '#150b2e'; ctx.beginPath(); ctx.moveTo(-84, -76); ctx.lineTo(-46, -106); ctx.lineTo(48, -106); ctx.lineTo(96, -74); ctx.closePath(); ctx.fill(); }
    if (o.roofText) { ctx.fillStyle = '#fff'; ctx.fillRect(-60, -118, 120, 8); }
    if (o.bar) { // police light bar
      const ph = Math.floor(o.bar * 10) % 2;
      glow(ctx, ph ? '#3aa0ff' : '#ff2a3a', 40);
      ctx.fillStyle = ph ? '#ff2a3a' : '#3a6dff'; ctx.fillRect(-40, -126, 36, 14);
      ctx.fillStyle = ph ? '#3a6dff' : '#ff2a3a'; ctx.fillRect(4, -126, 36, 14); noGlow(ctx);
    }
    if (o.driver) { // silhouette head with shades
      ctx.fillStyle = '#1b0f33'; ctx.beginPath(); ctx.arc(-8, -118, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd2e8'; ctx.fillRect(-2, -122, 24, 6);
    }
    wheel(ctx, -108, -30, 31, o.wheel || 0, o.rim || '#32f0ff'); wheel(ctx, 112, -30, 31, o.wheel || 0, o.rim || '#32f0ff');
    glow(ctx, '#fff6c8', 30); ctx.fillStyle = '#fff6c8'; ctx.fillRect(168, -58, 12, 9); noGlow(ctx);
    glow(ctx, '#ff2a4a', 30); ctx.fillStyle = '#ff2a4a'; ctx.fillRect(-182, -58, 8, 12); noGlow(ctx);
    if (o.beam) { const g = ctx.createLinearGradient(180, 0, 560, 0); g.addColorStop(0, 'rgba(255,246,200,0.45)'); g.addColorStop(1, 'rgba(255,246,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(180, -56); ctx.lineTo(560, -110); ctx.lineTo(560, 10); ctx.lineTo(180, -44); ctx.fill(); }
    ctx.restore();
  }

  function gridFloor(ctx, hy, t, c1, c2) {
    ctx.fillStyle = vgrad(ctx, hy, H, [[0, '#2a0a52'], [1, '#07030f']]); ctx.fillRect(0, hy, W, H - hy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, hy, W, H - hy); ctx.clip();
    glow(ctx, c1, 12); ctx.strokeStyle = c1; ctx.lineWidth = 3;
    for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 26, hy); ctx.lineTo(W / 2 + i * 260, H); ctx.stroke(); }
    ctx.strokeStyle = c2;
    const sp = mod(t * 0.9, 1);
    for (let k = 0; k < 14; k++) { const z = (k + sp) / 14; const y = hy + (H - hy) * z * z; ctx.lineWidth = 1 + z * 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    noGlow(ctx); ctx.restore();
  }

  function stars5(ctx, n, t, x, y, size) { // GTA-style wanted stars HUD
    for (let i = 0; i < 5; i++) {
      const sx = x + (i - 2) * size * 1.25;
      const on = i < n;
      const born = on && S.ev.stars[i] !== undefined ? clamp((t - S.ev.stars[i]) / 0.25) : 1;
      const k = on ? (born < 1 ? ease.outBack(born, 3) : 1) : 1;
      ctx.save(); ctx.translate(sx, y); ctx.scale(k, k);
      ctx.beginPath();
      for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5; const rr = j % 2 ? size * 0.22 : size * 0.52; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath();
      if (on) { glow(ctx, '#ffd23a', 30); ctx.fillStyle = '#ffd23a'; ctx.fill(); noGlow(ctx); }
      else { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.restore();
    }
  }

  function skyline(ctx, hy, off, o) { // buildings in cells of `cell` px, scrolling by `off`
    const cell = o.cell;
    const i0 = Math.floor(off / cell) - 1, i1 = Math.floor((off + W) / cell) + 1;
    for (let i = i0; i <= i1; i++) {
      if (o.maxCell !== undefined && i > o.maxCell) continue;
      if (i < 0 && o.maxCell !== undefined) continue;
      const bw = cell * (0.62 + rnd(i, o.seed) * 0.36), bh = o.hMin + rnd(i, o.seed + 5) * (o.hMax - o.hMin);
      const x = i * cell - off + (cell - bw) / 2, y = hy - bh;
      ctx.fillStyle = o.fill; ctx.fillRect(x, y, bw, bh);
      if (o.trim) { glow(ctx, o.trim[Math.floor(rnd(i, 9) * o.trim.length)], 14); ctx.fillStyle = o.trim[Math.floor(rnd(i, 9) * o.trim.length)]; ctx.fillRect(x, y, bw, 5); noGlow(ctx); }
      if (o.windows) {
        for (let wy = y + 24; wy < hy - 18; wy += 30) for (let wx = x + 12; wx < x + bw - 14; wx += 22) {
          if (rnd(i * 31 + wx * 0.1, wy * 0.05) > 0.62) { ctx.fillStyle = rnd(wx, wy) > 0.5 ? 'rgba(255,225,140,0.9)' : 'rgba(110,235,255,0.85)'; ctx.fillRect(wx, wy, 10, 14); }
        }
      }
      if (o.neon && rnd(i, 21) > 0.55) { // vertical neon sign
        const nc = ['#ff2fa0', '#2ff0ff', '#ffe63a'][Math.floor(rnd(i, 22) * 3)];
        const flick = rnd(Math.floor(o.t * 8), i) > 0.15 ? 1 : 0.3;
        glow(ctx, nc, 26); ctx.fillStyle = nc; ctx.globalAlpha = flick;
        ctx.fillRect(x + bw - 16, y + 40, 8, 110); ctx.fillRect(x + 8, y + 70, 36, 7); ctx.globalAlpha = 1; noGlow(ctx);
      }
    }
  }

  function heli(ctx, x, y, s, t, o = {}) { // side view facing right
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(o.tilt || 0);
    ctx.fillStyle = o.color || '#ff3f9e';
    ctx.beginPath(); ctx.ellipse(0, 0, 105, 52, 0, 0, TAU); ctx.fill();
    ctx.fillRect(-250, -14, 170, 20); // tail boom
    ctx.beginPath(); ctx.moveTo(-250, -14); ctx.lineTo(-282, -64); ctx.lineTo(-262, -64); ctx.lineTo(-226, -14); ctx.fill();
    ctx.fillStyle = '#9ff4ff'; ctx.beginPath(); ctx.ellipse(48, -8, 52, 32, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(34, -20, 22, 9, 0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1a0d33'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-70, 70); ctx.lineTo(80, 70); ctx.moveTo(-40, 50); ctx.lineTo(-44, 70); ctx.moveTo(50, 50); ctx.lineTo(54, 70); ctx.stroke();
    ctx.fillStyle = '#1a0d33'; ctx.fillRect(-6, -66, 12, 18);
    // rotor: spinning blades + blur disc
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.ellipse(0, -68, 250, 12, 0, 0, TAU); ctx.fill();
    const a = Math.cos(t * 55) * 245;
    ctx.fillStyle = '#1a0d33'; ctx.beginPath(); ctx.ellipse(0, -68, Math.abs(a), 5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-272, -40, 26, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
    glow(ctx, '#ff2a4a', 24); ctx.fillStyle = '#ff2a4a'; ctx.beginPath(); ctx.arc(-282, -64, 6, 0, TAU); ctx.fill(); noGlow(ctx);
    ctx.restore();
  }

  function beam(ctx, x0, y0, x1, y1, w, a) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(255,250,215,${a})`); g.addColorStop(1, 'rgba(255,250,215,0)');
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + (nx / nl) * w, y1 + (ny / nl) * w); ctx.lineTo(x1 - (nx / nl) * w, y1 - (ny / nl) * w); ctx.closePath(); ctx.fill();
  }

  // ---------------- scenes ----------------
  function hook(ctx, t) {
    const u = clamp(t / 1.9), hy = H * 0.62;
    const sky = vgrad(ctx, 0, hy, [[0, '#14063a'], [0.45, '#5b1a7a'], [0.8, '#ff4f8b'], [1, '#ffb25a']]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * rnd(i, 3) * (0.6 + 0.4 * Math.sin(t * 4 + i))})`; ctx.fillRect(rnd(i, 1) * W, rnd(i, 2) * hy * 0.5, 3, 3); }
    sun(ctx, W / 2, hy + 80 - ease.outQuad(u) * 440, 300, sky, hy);
    gridFloor(ctx, hy, t * 1.2, '#ff2fa0', '#2ff0ff');
    palm(ctx, 120, hy + 40, 760, Math.sin(t * 2) * 8, '#0b0420'); palm(ctx, W - 90, hy + 60, 880, Math.sin(t * 2 + 1) * 8, '#0b0420');
    palm(ctx, 330, hy + 20, 420, Math.sin(t * 2 + 2) * 8, '#12062c');
    // tiny car crossing the horizon
    car(ctx, lerp(-200, W + 200, ease.inOutQuad(u)), hy + 30, 0.55, { color: '#ff2fa0', glow: '#2ff0ff', wheel: t * 20 });
  }

  function swamp(ctx, t) {
    const lt = t - SC.swamp[0], hy = 1010;
    const boost = lt > ev.gator - SC.swamp[0] ? 2.4 : 1;
    const sc = lt * 160 * (lt > 3 ? 1.5 : 1);
    const sky = vgrad(ctx, 0, hy, [[0, '#0e2a30'], [0.5, '#2f6f60'], [0.85, '#d9a45a'], [1, '#ffcf80']]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy);
    glow(ctx, '#ffcf80', 90); ctx.fillStyle = 'rgba(255,215,140,0.9)'; ctx.beginPath(); ctx.arc(780, 780, 90, 0, TAU); ctx.fill(); noGlow(ctx);
    // far mangroves
    for (let L = 0; L < 2; L++) {
      const off = sc * (0.2 + L * 0.25), col = L ? '#0f2a24' : '#2a5c4a';
      ctx.fillStyle = col;
      for (let i = Math.floor(off / 150) - 1; i < Math.floor((off + W) / 150) + 2; i++) {
        const x = i * 150 - off, h = 150 + rnd(i, L) * 170;
        ctx.beginPath(); ctx.ellipse(x + 75, hy - h * 0.55, 100, h * 0.5, 0, 0, TAU); ctx.fill();
        ctx.fillRect(x + 70, hy - h * 0.6, 8, h * 0.6);
      }
    }
    for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(255,230,190,0.07)'; ctx.fillRect(0, hy - 140 + k * 60 + Math.sin(t + k) * 12, W, 50); }
    // water
    ctx.fillStyle = vgrad(ctx, hy, H, [[0, '#2e6a60'], [0.4, '#143a3a'], [1, '#07181b']]); ctx.fillRect(0, hy, W, H - hy);
    ctx.fillStyle = 'rgba(255,200,120,0.25)'; for (let k = 0; k < 9; k++) ctx.fillRect(720 + Math.sin(t * 2 + k) * 40 - k * 10, hy + 18 + k * 26, 120 + k * 16, 4);
    ctx.strokeStyle = 'rgba(190,240,230,0.18)'; ctx.lineWidth = 3;
    for (let k = 0; k < 16; k++) { const y = hy + 40 + k * 55, off = mod(sc * (0.6 + k * 0.06) + k * 90, 360); for (let x = -360; x < W + 360; x += 360) { ctx.beginPath(); ctx.moveTo(x - off, y); ctx.quadraticCurveTo(x - off + 90, y - 10, x - off + 180, y); ctx.stroke(); } }

    // gator (head up from the right), then splash
    const tg = ev.gator;
    const appear = T(1, 1);
    if (t > appear && t < tg + 1.0) {
      const wl = 1330;
      const gx = t < tg ? lerp(W + 260, 790, ease.inOutQuad(clamp((t - appear) / (tg - appear)))) : 790 + (t - tg) * 90;
      const rise = ease.outQuad(clamp((t - (tg - 0.7)) / 0.6)) * (1 - ease.inQuad(clamp((t - (tg + 0.45)) / 0.5)));
      const open = t < tg ? 0.95 * ease.inOutQuad(clamp((t - (tg - 0.55)) / 0.5)) : (t < tg + 0.1 ? 0.95 * (1 - (t - tg) / 0.1) : 0.18 * clamp((t - tg - 0.1) / 0.3));
      const bob = Math.sin(t * 7) * 3;
      ctx.save(); ctx.translate(gx, wl - rise * 130 + bob); ctx.rotate(-0.25 * rise);
      // body ridges
      ctx.fillStyle = '#243d1c'; ctx.beginPath(); ctx.ellipse(250, 20, 300, 44, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 8; k++) { ctx.fillStyle = '#16260f'; ctx.beginPath(); ctx.moveTo(100 + k * 55, -14); ctx.lineTo(120 + k * 55, -36); ctx.lineTo(140 + k * 55, -14); ctx.fill(); }
      // lower jaw
      ctx.save(); ctx.rotate(-open * -1); ctx.fillStyle = '#3d6a2a'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-290, 4); ctx.lineTo(-286, 28); ctx.lineTo(10, 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff6a8a'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(-280, 6); ctx.lineTo(-270, 12); ctx.lineTo(0, 20); ctx.fill();
      ctx.fillStyle = '#fff'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-30 - k * 33, 5); ctx.lineTo(-18 - k * 33, -22); ctx.lineTo(-8 - k * 33, 5); ctx.fill(); }
      ctx.restore();
      // upper jaw + head
      ctx.fillStyle = '#4f8a35'; ctx.beginPath(); ctx.moveTo(40, -48); ctx.lineTo(-300, -20); ctx.lineTo(-300, 0); ctx.lineTo(10, 4); ctx.lineTo(70, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-24 - k * 34, 2); ctx.lineTo(-12 - k * 34, 28); ctx.lineTo(-2 - k * 34, 2); ctx.fill(); }
      ctx.fillStyle = '#ffe23a'; ctx.beginPath(); ctx.arc(-30, -46, 15, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(-32, -58, 5, 24);
      ctx.restore();
      // waterline tint hides the submerged part
      ctx.fillStyle = 'rgba(20,70,70,0.55)'; ctx.fillRect(gx - 400, wl + 6, 1000, 70);
      ctx.strokeStyle = 'rgba(220,255,245,0.5)'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { const rr = ((t * 1.4 + k / 3) % 1); ctx.globalAlpha = 1 - rr; ctx.beginPath(); ctx.ellipse(gx - 120, wl + 20, 60 + rr * 220, 12 + rr * 40, 0, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (t >= tg && t < tg + 0.7) { // splash burst
      const a = t - tg; ctx.fillStyle = 'rgba(235,255,250,0.85)';
      for (let k = 0; k < 26; k++) { const ang = -Math.PI * (0.1 + 0.8 * rnd(k, 4)), sp = 300 + 500 * rnd(k, 5); const px = 700 + Math.cos(ang) * sp * a, py = 1320 + Math.sin(ang) * sp * a + 900 * a * a; ctx.beginPath(); ctx.arc(px, py, 10 * (1 - a / 0.7) + 2, 0, TAU); ctx.fill(); }
    }
    // airboat
    const lurch = t >= tg ? 90 * ease.outBack(clamp((t - tg) / 0.3), 2) * (1 - ease.inOutQuad(clamp((t - tg - 0.5) / 0.8))) : 0;
    const bx = 330 + lurch, by = 1335 + Math.sin(t * 5) * 6, tilt = Math.sin(t * 5 + 1) * 0.02 - (t >= tg ? 0.1 * Math.exp(-(t - tg) * 4) : 0);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
    ctx.fillStyle = '#e8ece3'; ctx.beginPath(); ctx.moveTo(-210, -40); ctx.lineTo(260, -20); ctx.lineTo(300, 10); ctx.lineTo(-180, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2fa0'; ctx.fillRect(-190, -4, 440, 8);
    ctx.fillStyle = '#1a0d33'; ctx.fillRect(-30, -120, 90, 80);
    ctx.beginPath(); ctx.arc(15, -140, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff2fa0'; ctx.fillRect(-12, -172, 54, 14); // cap
    ctx.fillStyle = '#ffd2e8'; ctx.fillRect(15, -146, 26, 8);
    // fan cage on a pylon at the back
    ctx.fillStyle = '#1a0d33'; ctx.fillRect(-170, -170, 14, 130);
    ctx.strokeStyle = '#1a0d33'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(-175, -210, 38, 130, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-175, -210, 12 + 24 * Math.abs(Math.cos(t * 40)), 125, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // foreground reeds + wake
    for (let i = 0; i < 18; i++) {
      const x = mod(i * 120 - sc * 2.2, W + 240) - 120, h = 220 + rnd(i, 7) * 200, sw = Math.sin(t * 2 + i) * 14;
      ctx.strokeStyle = i % 2 ? '#07120d' : '#0b1d14'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, H - 280); ctx.quadraticCurveTo(x + sw, H - 280 - h * 0.6, x + sw * 2.2, H - 280 - h); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(235,255,250,0.5)'; ctx.beginPath(); ctx.moveTo(bx - 200, by + 20); ctx.lineTo(bx - 520 - boost * 60, by + 46); ctx.lineTo(bx - 480, by + 8); ctx.fill();
    // "!" over the driver
    if (t >= tg && t < tg + 0.9) { const k = ease.outBack(clamp((t - tg) / 0.2), 3); ctx.save(); ctx.translate(bx + 20, by - 240); ctx.scale(k, k); txt(ctx, '!', 0, 0, { size: 140, color: '#ffe63a', stroke: '#1a0d33', strokeW: 10 }); ctx.restore(); }
  }

  function beach(ctx, t) {
    const lt = t - SC.beach[0], hy = 1010;
    const sky = vgrad(ctx, 0, hy, [[0, '#3a1b6e'], [0.45, '#d9447f'], [0.8, '#ff9a5a'], [1, '#ffd27a']]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy);
    sun(ctx, W * 0.64, hy - 80, 240, sky, hy);
    // pastel deco hotels
    skyline(ctx, hy, lt * 60 + 400, { cell: 150, seed: 11, hMin: 120, hMax: 300, fill: '#ffb6d6', trim: ['#2ff0ff', '#ff2fa0'] });
    // sea
    ctx.fillStyle = vgrad(ctx, hy, 1130, [[0, '#ff7fa6'], [0.4, '#7a3fa8'], [1, '#2a1a6a']]); ctx.fillRect(0, hy, W, 130);
    ctx.fillStyle = 'rgba(255,230,160,0.7)';
    for (let k = 0; k < 8; k++) { const w = 300 - k * 24 + Math.sin(t * 3 + k) * 30; ctx.fillRect(W * 0.64 - w / 2, hy + 8 + k * 14, w, 4); }
    // jet ski cutting across
    const jx = lerp(1250, -300, clamp(lt / 3.4)), jy = 1085 + Math.sin(t * 9) * 4;
    ctx.save(); ctx.translate(jx, jy);
    ctx.fillStyle = '#2ff0ff'; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(80, -6); ctx.lineTo(110, -28); ctx.lineTo(-90, -20); ctx.fill();
    ctx.fillStyle = '#1a0d33'; ctx.beginPath(); ctx.arc(-8, -52, 14, 0, TAU); ctx.fill(); ctx.fillRect(-18, -40, 22, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.quadraticCurveTo(-190, 20, -330, 6); ctx.lineTo(-330, 16); ctx.quadraticCurveTo(-190, 34, -80, 12); ctx.fill();
    ctx.restore();
    // flamingo
    const fx = lerp(-160, W + 160, ease.inOutQuad(clamp(lt / 4))), fy = 520 + Math.sin(t * 2) * 30 + lt * 40, fl = Math.sin(t * 10);
    ctx.save(); ctx.translate(fx, fy); ctx.fillStyle = '#ff7fc0'; ctx.strokeStyle = '#ff7fc0'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, 60, 24, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(52, -8); ctx.bezierCurveTo(110, -20, 80, -90, 120, -70); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(116, -78); ctx.lineTo(146, -64); ctx.lineTo(120, -58); ctx.fill();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-56, 6); ctx.lineTo(-170, 30); ctx.stroke();
    ctx.fillStyle = '#ff9ad0'; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.quadraticCurveTo(-20, -90 * fl - 20, 40, -6 + 60 * fl); ctx.quadraticCurveTo(10, 10, -10, -6); ctx.fill();
    ctx.restore();
    // beach + palms + road
    ctx.fillStyle = '#f3c58b'; ctx.fillRect(0, 1130, W, 120);
    ctx.fillStyle = vgrad(ctx, 1250, H, [[0, '#2a2338'], [1, '#120c1c']]); ctx.fillRect(0, 1250, W, H - 1250);
    ctx.fillStyle = '#ffe63a'; const rd = mod(lt * 700, 340); for (let x = -340; x < W + 340; x += 340) ctx.fillRect(x - rd, 1600, 190, 12);
    ctx.fillStyle = '#ff2fa0'; glow(ctx, '#ff2fa0', 14); ctx.fillRect(0, 1255, W, 5); noGlow(ctx);
    for (let i = 0; i < 5; i++) { const px = mod(i * 330 - lt * 420, W + 660) - 330; palm(ctx, px, 1240, 520 + rnd(i, 2) * 160, Math.sin(t * 2 + i) * 12, '#12062c'); }
    // convertible
    const bounce = Math.sin(t * 9) * 3 + kick(t) * 5;
    car(ctx, W / 2 - 40, 1510 - bounce, 1.45, { color: '#2ff0ff', glow: '#ff2fa0', convertible: true, driver: true, wheel: t * 24, rim: '#ffe63a' });
    // scarf blowing back
    ctx.strokeStyle = '#ff2fa0'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); const sx = W / 2 - 40 - 14, sy = 1510 - bounce - 160;
    ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - 70, sy + Math.sin(t * 18) * 14, sx - 150, sy + 10 + Math.sin(t * 18 + 1) * 20); ctx.stroke();
    // speed streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3;
    for (let k = 0; k < 8; k++) { const x = mod(k * 190 - lt * 1800, W + 400); ctx.beginPath(); ctx.moveTo(x, 1330 + k * 28); ctx.lineTo(x + 240, 1330 + k * 28); ctx.stroke(); }
  }

  function wantedAt(t) {
    if (t < ev.stars[0]) return 0;
    if (t < ev.heli) return ev.stars.filter((x) => t >= x).length;
    if (t < T(10)) return 5;
    return Math.max(0, 5 - Math.floor((t - T(10)) / 0.2));
  }

  function radar(ctx, t, x, y, n) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(8,4,24,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 100, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2ff0ff'; ctx.lineWidth = 4; glow(ctx, '#2ff0ff', 14); ctx.stroke(); noGlow(ctx);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 96, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 36 - mod(t * 20, 36), -100); ctx.lineTo(k * 36 - mod(t * 20, 36) + 20, 100); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#ffe63a'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, 9); ctx.lineTo(-9, 9); ctx.fill();
    for (let k = 0; k < n; k++) { const a = Math.PI + 0.5 + k * 0.7 + Math.sin(t * 3 + k) * 0.1, d = 52 - k * 4; ctx.fillStyle = Math.floor(t * 8 + k) % 2 ? '#ff2a3a' : '#3a6dff'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function chase(ctx, t) {
    const lt = t - SC.chase[0], hy = 1230;
    ctx.fillStyle = vgrad(ctx, 0, hy, [[0, '#07031a'], [0.6, '#2a0a52'], [1, '#7a1a78']]); ctx.fillRect(0, 0, W, hy);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(rnd(i, 1) * W, rnd(i, 2) * 500, 3, 3); }
    glow(ctx, '#ffe9c8', 40); ctx.fillStyle = '#fff3dc'; ctx.beginPath(); ctx.arc(860, 420, 70, 0, TAU); ctx.fill(); noGlow(ctx);
    const sp = 1 + 0.12 * kick(t);
    skyline(ctx, hy, lt * 70, { cell: 140, seed: 3, hMin: 380, hMax: 800, fill: '#140a34', trim: ['#ff2fa0', '#2ff0ff'], t });
    skyline(ctx, hy, lt * 170, { cell: 190, seed: 8, hMin: 320, hMax: 1000, fill: '#0d0626', windows: true, neon: true, t });
    // road
    ctx.fillStyle = vgrad(ctx, hy, H, [[0, '#241a3a'], [1, '#0a0614']]); ctx.fillRect(0, hy, W, H - hy);
    ctx.fillStyle = '#2ff0ff'; glow(ctx, '#2ff0ff', 14); ctx.fillRect(0, hy, W, 6); noGlow(ctx);
    const rd = mod(lt * 1500, 380); ctx.fillStyle = 'rgba(255,230,120,0.9)'; for (let x = -380; x < W + 380; x += 380) ctx.fillRect(x - rd, 1560, 210, 12);
    for (let k = 0; k < 14; k++) { const x = mod(k * 150 - lt * 2200, W + 300) - 150; ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x, 1400 + (k % 5) * 40, 260, 3); } // speed lines
    // police tint
    const ph = Math.floor(t * 10) % 2, n = wantedAt(t);
    const pg = ctx.createRadialGradient(ph ? 100 : W - 100, 300, 50, W / 2, 800, 1400);
    pg.addColorStop(0, ph ? 'rgba(255,40,60,0.28)' : 'rgba(60,110,255,0.28)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
    if (n > 0) { ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H); }
    // police heli with searchlight
    if (n >= 4) {
      const hx = lerp(-300, 330, ease.outQuad(clamp((t - ev.stars[3]) / 0.8))) + Math.sin(t * 2) * 25, hyy = 330 + Math.sin(t * 3) * 14;
      beam(ctx, hx + 20, hyy + 40, 700 + Math.sin(t * 3) * 40, 1480, 120, 0.4);
      heli(ctx, hx, hyy, 0.5, t, { color: '#1c3cff', tilt: 0.06 });
    }
    // cops (behind the player, facing right)
    const cops = [{ x: 330, from: ev.stars[0] - 0.3 }, { x: 110, from: ev.stars[2] }, { x: 520, from: ev.stars[4] }];
    cops.forEach((c, i) => {
      if (t < c.from) return;
      const k = ease.outBack(clamp((t - c.from) / 0.5), 1.4);
      car(ctx, lerp(-420, c.x + Math.sin(t * 2.3 + i * 2) * 26, k), 1470 + i * 14, 1.05, { color: '#f4f4ff', glow: '#3a6dff', bar: t, wheel: t * 26, rim: '#ddd', tilt: Math.sin(t * 9 + i) * 0.015 });
    });
    // player car
    const px = 760 + Math.sin(t * 1.7) * 18, bounce = kick(t) * 7 + Math.sin(t * 12) * 2;
    car(ctx, px, 1470 - bounce, 1.2, { color: '#ff2fa0', glow: '#2ff0ff', wheel: t * 30, beam: true, tilt: -0.02 + Math.sin(t * 3) * 0.01 });
    ctx.fillStyle = '#ffd23a'; // sparks off the rear wheel
    for (let k = 0; k < 10; k++) { const a = mod(t * 6 + k * 0.1, 0.6); ctx.fillRect(px - 190 - a * 300 - k * 4, 1466 - a * 120 + a * a * 500 - rnd(k, 3) * 20, 5, 5); }
    // HUD
    radar(ctx, t, 150, 700, n);
    stars5(ctx, n, t, W / 2, S.SAFE.y + 60, 64);
  }

  function escape(ctx, t) {
    const lt = t - SC.escape[0], hy = 1250;
    const dawn = clamp((t - ev.clear) / (SC.escape[1] - ev.clear));
    const sky = vgrad(ctx, 0, hy, [[0, '#050218'], [0.55, `rgb(${Math.round(lerp(34, 120, dawn))},${Math.round(lerp(10, 40, dawn))},${Math.round(lerp(72, 120, dawn))})`], [1, `rgb(${Math.round(lerp(110, 255, dawn))},${Math.round(lerp(30, 130, dawn))},${Math.round(lerp(120, 100, dawn))})`]]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy);
    for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - dawn)})`; ctx.fillRect(rnd(i, 1) * W, rnd(i, 2) * 800, 3, 3); }
    glow(ctx, '#fff3dc', 70); ctx.fillStyle = '#fff3dc'; ctx.beginPath(); ctx.arc(820, 520, 90, 0, TAU); ctx.fill(); noGlow(ctx);
    // sea
    ctx.fillStyle = vgrad(ctx, hy, H, [[0, `rgb(${Math.round(lerp(40, 160, dawn))},30,${Math.round(lerp(100, 120, dawn))})`], [1, '#050218']]); ctx.fillRect(0, hy, W, H - hy);
    ctx.fillStyle = 'rgba(255,243,220,0.5)'; for (let k = 0; k < 10; k++) { const w = 90 + k * 14 + Math.sin(t * 3 + k) * 20; ctx.fillRect(820 - w / 2, hy + 20 + k * 36, w, 5); }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 3; for (let k = 0; k < 10; k++) { const off = mod(t * 120 + k * 70, 400); for (let x = -400; x < W + 400; x += 400) { ctx.beginPath(); ctx.moveTo(x - off, hy + 80 + k * 60); ctx.lineTo(x - off + 150, hy + 80 + k * 60); ctx.stroke(); } }
    // the city falling behind (world scroll, ends at cell 11)
    const off = lt * 330;
    skyline(ctx, hy, off, { cell: 160, seed: 3, hMin: 260, hMax: 700, fill: '#140a34', trim: ['#ff2fa0', '#2ff0ff'], t, maxCell: 10 });
    skyline(ctx, hy, off * 1.4, { cell: 170, seed: 8, hMin: 220, hMax: 760, fill: '#0d0626', windows: true, neon: true, t, maxCell: 9 });
    // police cars on the shore, blinking, then stuck
    for (let i = 0; i < 3; i++) { const x = 140 + i * 170 - off * 1.4; if (x > -260) car(ctx, x, hy + 30, 0.5, { color: '#f4f4ff', glow: '#3a6dff', bar: t + i * 0.05, wheel: 0, flip: false }); }
    // chasing heli (police) loses us
    if (t < ev.clear + 0.5) { const hx = lerp(-120, -420, ease.inQuad(clamp((t - T(10)) / 1.2))) + 0 , hyy = 700; if (hx > -460) { beam(ctx, hx + 40, hyy + 30, 560, 800, 130, 0.35 * (1 - clamp((t - T(10)) / 1.2))); heli(ctx, hx, hyy, 0.55, t, { color: '#1c3cff', tilt: 0.05 }); } }
    // our heli
    const hxo = lerp(-300, 520, ease.outQuad(clamp(lt / 0.8))), hyo = 760 + Math.sin(t * 2.2) * 26 - dawn * 80;
    heli(ctx, hxo, hyo, 1.25, t, { tilt: 0.07 + Math.sin(t * 2) * 0.02 });
    // wind streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3; for (let k = 0; k < 10; k++) { const x = mod(k * 160 - lt * 1300, W + 400) - 200; ctx.beginPath(); ctx.moveTo(x, 300 + k * 90); ctx.lineTo(x + 220, 300 + k * 90); ctx.stroke(); }
    stars5(ctx, wantedAt(t), t, W / 2, S.SAFE.y + 60, 64);
    if (t >= ev.clear && t < ev.clear + 1.0) { const a = t - ev.clear; ctx.save(); ctx.globalAlpha = 1 - clamp(a - 0.6) / 0.4; const k = ease.outBack(clamp(a / 0.25), 3); ctx.translate(W / 2, S.SAFE.y + 150); ctx.scale(k, k); txt(ctx, 'ESCAPED', 0, 0, { size: 60, color: '#32f0ff', stroke: '#1a0d33', strokeW: 8 }); ctx.restore(); }
  }

  function card(ctx, t) {
    const lt = t - SC.card[0], hy = H * 0.6;
    const sky = vgrad(ctx, 0, hy, [[0, '#14063a'], [0.5, '#7a1a8a'], [0.85, '#ff4f8b'], [1, '#ffb25a']]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy);
    sun(ctx, W / 2, hy - 120 + Math.sin(t * 1.5) * 6, 330, sky, hy);
    gridFloor(ctx, hy, t * 1.3, '#ff2fa0', '#2ff0ff');
    palm(ctx, 90, hy + 70, 900, Math.sin(t * 2) * 8, '#0b0420'); palm(ctx, W - 70, hy + 90, 1000, Math.sin(t * 2 + 1) * 8, '#0b0420');
    palm(ctx, 280, hy + 40, 560, Math.sin(t * 2 + 2) * 8, '#12062c'); palm(ctx, W - 270, hy + 50, 620, Math.sin(t * 2 + 3) * 8, '#12062c');
    // neon sign: VICE / CITY
    const on = t >= ev.sign - 0.04;
    const fl = on ? (lt < 1.4 ? (rnd(Math.floor(t * 18), 3) > 0.35 ? 1 : 0.25) : 1) : 0;
    const pulse = 0.88 + 0.12 * kick(t);
    if (fl > 0) {
      const y1 = H * 0.36, y2 = H * 0.36 + 180;
      ctx.save(); ctx.globalAlpha = fl; ctx.translate(W / 2, 0); ctx.scale(pulse, pulse); ctx.translate(-W / 2, 0);
      glow(ctx, '#2ff0ff', 60); txt(ctx, 'VICE', W / 2, y1, { size: 190, color: '#bffaff', stroke: '#2ff0ff', strokeW: 10 });
      glow(ctx, '#ff2fa0', 60); txt(ctx, 'CITY', W / 2, y2, { size: 190, color: '#ffc4e6', stroke: '#ff2fa0', strokeW: 10 });
      noGlow(ctx); ctx.restore();
    }
    const a1 = clamp((t - T(13, 0)) / 0.4), a2 = clamp((t - T(13, 2)) / 0.4), a3 = clamp((t - T(14, 1)) / 0.4);
    if (a1 > 0) txt(ctx, 'Welcome to', W / 2, H * 0.36 - 150, { size: 54, color: '#fff', alpha: a1, stroke: '#1a0d33', strokeW: 8 });
    if (a2 > 0) txt(ctx, 'Aapka favourite scene kaunsa tha?', W / 2, 1290, { size: 40, color: '#ffe63a', alpha: a2, stroke: '#1a0d33', strokeW: 8 });
    if (a2 > 0) txt(ctx, 'Comment me batao!', W / 2, 1350, { size: 54, color: '#fff', alpha: a2, stroke: '#1a0d33', strokeW: 8 });
    if (a3 > 0) txt(ctx, 'Unofficial fan-made animation', W / 2, 1425, { size: 28, color: '#d9c8ff', alpha: a3 * 0.9, stroke: '#1a0d33', strokeW: 6 });
    if (a3 > 0) txt(ctx, 'GTA 6 se inspired · Rockstar se koi connection nahi', W / 2, 1465, { size: 22, color: '#d9c8ff', alpha: a3 * 0.8, stroke: '#1a0d33', strokeW: 5 });
  }

  function captions(ctx, t) {
    for (const c of S.captions) {
      if (t < c.t || t > c.end) continue;
      const a = t - c.t, k = ease.outBack(clamp(a / 0.22), 2.2), out = clamp((c.end - t) / 0.15);
      const fit = Math.min(1, (W * 0.86) / G.measure(ctx, c.text, c.size, 'Bungee', 400));
      ctx.save(); ctx.globalAlpha = out; ctx.translate(c.x, c.y); ctx.rotate(c.rot || 0); ctx.scale(k * fit, k * fit);
      txt(ctx, c.text, 0, 0, { size: c.size, color: '#fff', stroke: '#1a0d33', strokeW: 14 });
      txt(ctx, c.text, 0, 0, { size: c.size, color: '#fff' });
      ctx.restore();
    }
  }

  Studio.film({
    draw(ctx, t) {
      const cuts = [SC.swamp[0], SC.beach[0], SC.chase[0], SC.escape[0], SC.card[0]];
      let shake = 0;
      for (const c of cuts) if (t >= c) shake = Math.max(shake, 22 * Math.exp(-(t - c) * 9) * (c === ev.drop || c === ev.card ? 1.4 : 0.8));
      ctx.save(); ctx.translate(U.noise1(t * 40, 1) * shake, U.noise1(t * 40, 2) * shake);
      if (inR(t, SC.hook)) hook(ctx, t);
      else if (inR(t, SC.swamp)) swamp(ctx, t);
      else if (inR(t, SC.beach)) beach(ctx, t);
      else if (inR(t, SC.chase)) chase(ctx, t);
      else if (inR(t, SC.escape)) escape(ctx, t);
      else card(ctx, t);
      ctx.restore();
      captions(ctx, t);
      // white flash on every cut (the hit)
      let fl = 0; for (const c of cuts) if (t >= c) fl = Math.max(fl, 0.75 * Math.exp(-(t - c) * 14));
      if (t >= ev.gator) fl = Math.max(fl, 0.45 * Math.exp(-(t - ev.gator) * 16));
      if (fl > 0.01) { ctx.fillStyle = `rgba(255,248,235,${fl})`; ctx.fillRect(0, 0, W, H); }
    },
    post: { paper: 0, vignette: 0.4, grain: 0.05 },
  });
})();
