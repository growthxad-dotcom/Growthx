// TradeWithAI Day 1 – "Trading kya hoti hai?"  Flat 2D motion graphics, pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, sc = S.scene;
  const OR = '#F59E0B', WH = '#FFFFFF', BK = '#101010', CH = '#1C1C1C';
  const GR = '#16C47F', RD = '#EF4444';
  const FAM = 'Inter', WT = 800;
  const txt = (ctx, s, x, y, o = {}) => G.text(ctx, s, x, y, Object.assign({ fam: FAM, weight: WT, boil: 0, color: WH, align: 'center' }, o));
  const prog = (t, a, d) => clamp((t - a) / d);
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // deterministic price series
  const N = 60;
  const series = [];
  { let v = 0.5; for (let i = 0; i < N; i++) { v += (U.noise1(i * 0.7, 5) * 0.16) + (U.noise1(i * 0.21, 9) * 0.06); v = clamp(v, 0.08, 0.92); series.push(v); } }

  function background(ctx, t) {
    ctx.fillStyle = BK; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H * 0.7);
    g.addColorStop(0, 'rgba(245,158,11,0.13)'); g.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 2;
    const off = (t * 20) % 90;
    for (let x = -90 + off; x < W + 90; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = -90 + off; y < H + 90; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function brandTag(ctx) { txt(ctx, 'TRADEWITHAI', W / 2, S.SAFE.y + 40, { size: 34, color: OR }); }

  function linePath(ctx, x0, y0, w, h, upTo, from = 0) {
    ctx.beginPath();
    const n = Math.floor(upTo * (N - 1));
    for (let i = from; i <= n; i++) { const x = x0 + (i / (N - 1)) * w, y = y0 + h - series[i] * h; i === from ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    const f = upTo * (N - 1) - n;
    if (n < N - 1) { const x = x0 + ((n + f) / (N - 1)) * w, y = y0 + h - lerp(series[n], series[n + 1], f) * h; ctx.lineTo(x, y); return [x, y]; }
    return [x0 + w, y0 + h - series[N - 1] * h];
  }

  // ---- scene: title with monitors ----
  function title(ctx, t) {
    const a = t - sc.title[0];
    const mons = [[W * 0.07, H * 0.14, W * 0.4, H * 0.13, 1], [W * 0.53, H * 0.14, W * 0.4, H * 0.13, 2], [W * 0.18, H * 0.29, W * 0.64, H * 0.15, 3]];
    mons.forEach(([x, y, w, h, k], i) => {
      const p = ease.outBack(prog(a, 0.2 + i * 0.25, 0.5));
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(p, p); ctx.translate(-w / 2, -h / 2);
      ctx.fillStyle = CH; rr(ctx, 0, 0, w, h, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = OR; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.save(); rr(ctx, 6, 6, w - 12, h - 12, 14); ctx.clip();
      const sh = k * 11; ctx.beginPath();
      for (let j = 0; j < 40; j++) { const xx = 14 + (j / 39) * (w - 28); const yy = h * 0.5 - (U.noise1(j * 0.35 + sh, 3) * 0.32 + Math.sin(j * 0.2 + a * 2 + k) * 0.05) * h; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke(); ctx.restore();
      ctx.restore();
    });
    const tp = ease.outCubic(prog(a, 0.9, 0.6));
    ctx.save(); ctx.globalAlpha = tp; ctx.translate(0, (1 - tp) * 60);
    txt(ctx, 'TRADING', W / 2, H * 0.53, { size: 150 });
    txt(ctx, 'KYA HOTI HAI?', W / 2, H * 0.53 + 120, { size: 100, color: OR });
    ctx.restore();
    const ul = prog(a, 1.6, 0.6);
    ctx.fillStyle = OR; ctx.fillRect(W / 2 - 300 * ul, H * 0.53 + 150, 600 * ul, 8);
  }

  // ---- scene: market line with BUY / SELL ----
  function line(ctx, t) {
    const a = t - sc.line[0];
    const x0 = W * 0.08, w = W * 0.84, y0 = H * 0.17, h = H * 0.3;
    ctx.fillStyle = CH; rr(ctx, x0 - 24, y0 - 40, w + 48, h + 80, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { const y = y0 + (h * i) / 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); }
    const up = ease.inOutQuad(prog(a, 0.3, 4.6));
    ctx.save();
    ctx.strokeStyle = OR; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = OR; ctx.shadowBlur = 24;
    const [hx, hy] = linePath(ctx, x0, y0, w, h, up); ctx.stroke(); ctx.restore();
    ctx.fillStyle = WH; ctx.beginPath(); ctx.arc(hx, hy, 14 + 4 * Math.sin(a * 8), 0, 7); ctx.fill();
    // BUY at the lowest point, SELL at the highest point so far
    const n = Math.floor(up * (N - 1));
    let lo = 0, hi = 0; for (let i = 0; i <= n; i++) { if (series[i] < series[lo]) lo = i; if (series[i] > series[hi]) hi = i; }
    const tag = (i, label, solid, delay) => {
      const x = x0 + (i / (N - 1)) * w, y = y0 + h - series[i] * h; const p = ease.outBack(prog(a, delay, 0.4)); if (p <= 0) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(p, p);
      ctx.fillStyle = solid ? GR : RD; rr(ctx, -80, label === 'BUY' ? 24 : -88, 160, 64, 16); ctx.fill();
      txt(ctx, label, 0, label === 'BUY' ? 70 : -42, { size: 40, color: WH });
      ctx.restore();
    };
    if (n > 12) tag(lo, 'BUY', true, 1.6); if (n > 30) tag(hi, 'SELL', false, 3.2);
    txt(ctx, 'PRICE KABHI UPAR… KABHI NEECHE', W / 2, y0 + h + 110, { size: 40, color: OR });
  }

  // ---- scene: candles ----
  function candles(ctx, t) {
    const a = t - sc.candles[0];
    const n = 14, x0 = W * 0.1, cw = (W * 0.8) / n, base = H * 0.4, hh = H * 0.2;
    ctx.fillStyle = CH; rr(ctx, x0 - 40, base - hh - 120, cw * n + 80, hh + 220, 28); ctx.fill();
    let prev = 0.4;
    for (let i = 0; i < n; i++) {
      const o = prev, c = clamp(prev + U.noise1(i * 1.3, 11) * 0.28 + (i < 7 ? 0.05 : -0.05), 0.1, 0.95); prev = c;
      const p = ease.outBack(prog(a, 0.3 + i * 0.28, 0.35)); if (p <= 0) continue;
      const upc = c >= o, col = upc ? GR : RD;
      const hiV = Math.max(o, c) + 0.06, loV = Math.min(o, c) - 0.06;
      const cx = x0 + cw * (i + 0.5);
      const Y = (v) => base - v * hh;
      ctx.save(); ctx.translate(cx, Y((o + c) / 2)); ctx.scale(1, p); ctx.translate(-cx, -Y((o + c) / 2));
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, Y(hiV)); ctx.lineTo(cx, Y(loV)); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(cx - cw * 0.3, Y(Math.max(o, c)), cw * 0.6, Math.max(8, Math.abs(Y(o) - Y(c))));
      ctx.restore();
    }
    const swap = a > 2.8;
    const ay = base + 150, bob = Math.sin(a * 5) * 8;
    const arrow = (x, up, col, label) => {
      ctx.save(); ctx.translate(x, ay + bob * (up ? -1 : 1)); ctx.fillStyle = col; ctx.beginPath();
      const d = up ? -1 : 1; ctx.moveTo(0, d * 40); ctx.lineTo(-44, -d * 10); ctx.lineTo(-16, -d * 10); ctx.lineTo(-16, -d * 40); ctx.lineTo(16, -d * 40); ctx.lineTo(16, -d * 10); ctx.lineTo(44, -d * 10); ctx.closePath(); ctx.fill(); ctx.restore();
      txt(ctx, label, x, ay + 100, { size: 44, color: col });
    };
    arrow(W * 0.3, true, GR, 'UPAR'); arrow(W * 0.7, false, RD, 'NEECHE');
    txt(ctx, 'TRADERS ANALYSE KARTE HAIN', W / 2, H * 0.11, { size: 46, color: WH, alpha: prog(a, 2.8, 0.4) });
  }

  // ---- scene: BUY / SELL / analyse ----
  function buysell(ctx, t) {
    const a = t - sc.buysell[0];
    const card = (y, label, sub, solid, delay, upc) => {
      const p = ease.outBack(prog(a, delay, 0.5)); if (p <= 0) return;
      ctx.save(); ctx.translate(W / 2, y); ctx.scale(p, p);
      const w = W * 0.78, h = 250;
      ctx.fillStyle = solid ? GR : RD; rr(ctx, -w / 2, -h / 2, w, h, 36); ctx.fill();
      const c = WH; ctx.fillStyle = c; ctx.beginPath();
      const d = upc ? -1 : 1, ax = -w / 2 + 120;
      ctx.moveTo(ax, d * 60); ctx.lineTo(ax - 60, -d * 10); ctx.lineTo(ax - 22, -d * 10); ctx.lineTo(ax - 22, -d * 60); ctx.lineTo(ax + 22, -d * 60); ctx.lineTo(ax + 22, -d * 10); ctx.lineTo(ax + 60, -d * 10); ctx.closePath(); ctx.fill();
      txt(ctx, label, 60, 10, { size: 120, color: c }); txt(ctx, sub, 60, 80, { size: 38, color: c });
      ctx.restore();
    };
    card(H * 0.2, 'BUY', 'asset kharidna', true, 0.2, true);
    card(H * 0.2 + 290, 'SELL', 'asset bechna', false, 0.9, false);
    // magnifier + decisions
    const mp = ease.outBack(prog(a, 2.2, 0.5));
    if (mp > 0) {
      ctx.save(); ctx.translate(W / 2, H * 0.2 + 560); ctx.scale(mp, mp);
      ctx.strokeStyle = OR; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(-120, 0, 44, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-88, 32); ctx.lineTo(-56, 64); ctx.stroke();
      txt(ctx, 'ANALYSE → DECISION', 70, 18, { size: 44 });
      ctx.restore();
    }
  }

  // ---- scene: warning ----
  function warning(ctx, t) {
    const a = t - sc.warning[0];
    const p = ease.outBack(prog(a, 0.1, 0.5)), pulse = 1 + 0.05 * Math.sin(a * 9);
    ctx.save(); ctx.translate(W / 2, H * 0.2); ctx.scale(p * pulse, p * pulse);
    ctx.fillStyle = OR; ctx.shadowColor = OR; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(160, 120); ctx.lineTo(-160, 120); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; txt(ctx, '!', 0, 95, { size: 190, color: BK });
    ctx.restore();
    const q = prog(a, 0.9, 0.5);
    ctx.save(); ctx.globalAlpha = q; ctx.translate(0, (1 - q) * 40);
    txt(ctx, 'PROFIT + LOSS', W / 2, H * 0.2 + 280, { size: 90 });
    txt(ctx, 'DONO KA RISK', W / 2, H * 0.2 + 390, { size: 100, color: OR });
    ctx.restore();
    const k = ease.outCubic(prog(a, 2.0, 0.6));
    if (k > 0) {
      ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = CH; rr(ctx, W * 0.1, H * 0.2 + 470, W * 0.8, 120, 30); ctx.fill();
      txt(ctx, 'KNOWLEDGE FIRST', W / 2, H * 0.2 + 548, { size: 62, color: WH }); ctx.restore();
    }
  }

  // ---- scene: CTA ----
  function cta(ctx, t) {
    const a = t - sc.cta[0];
    const cp = ease.outBack(prog(a, 0.1, 0.5));
    ctx.save(); ctx.translate(W / 2, H * 0.17); ctx.scale(cp, cp);
    ctx.fillStyle = WH; rr(ctx, -330, -90, 660, 180, 50); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-80, 88); ctx.lineTo(-130, 150); ctx.lineTo(-20, 88); ctx.fill();
    txt(ctx, 'COMMENT: BASICS', 0, 25, { size: 62, color: BK });
    ctx.restore();
    const pp = ease.outBack(prog(a, 1.3, 0.5));
    if (pp > 0) {
      ctx.save(); ctx.translate(W / 2, H * 0.17 + 300); ctx.scale(pp, pp);
      // classic PDF document icon: white page, folded corner, red PDF banner
      ctx.fillStyle = WH; ctx.beginPath(); ctx.moveTo(-120, -150); ctx.lineTo(60, -150); ctx.lineTo(120, -90); ctx.lineTo(120, 150); ctx.lineTo(-120, 150); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#D1D5DB'; ctx.beginPath(); ctx.moveTo(60, -150); ctx.lineTo(60, -90); ctx.lineTo(120, -90); ctx.closePath(); ctx.fill();
      ctx.fillStyle = RD; rr(ctx, -150, -20, 190, 84, 10); ctx.fill();
      txt(ctx, 'PDF', -55, 46, { size: 58, color: WH });
      ctx.fillStyle = '#9CA3AF'; ctx.fillRect(-90, 90, 180, 10); ctx.fillRect(-90, 114, 120, 10); ctx.fillRect(-90, -110, 90, 10);
      txt(ctx, 'FREE BASICS PDF', 0, 220, { size: 40, color: OR });
      ctx.restore();
    }
    const fp = ease.outBack(prog(a, 2.4, 0.5));
    if (fp > 0) {
      const press = a > 3.2 && a < 3.45 ? 0.94 : 1, done = a > 3.3;
      ctx.save(); ctx.translate(W / 2, H * 0.17 + 640); ctx.scale(fp * press, fp * press);
      ctx.fillStyle = done ? CH : OR; rr(ctx, -260, -55, 520, 110, 55); ctx.fill();
      if (done) { ctx.strokeStyle = OR; ctx.lineWidth = 5; ctx.stroke(); }
      txt(ctx, done ? 'FOLLOWING ✓' : '+ FOLLOW', 0, 20, { size: 54, color: done ? OR : BK });
      ctx.restore();
    }
  }

  // ---- end screen (2s, brand standard) ----
  function end(ctx, t) {
    const a = t - S.END;
    ctx.fillStyle = BK; ctx.fillRect(0, 0, W, H);
    const p = ease.outCubic(prog(a, 0, 0.5));
    ctx.save(); ctx.globalAlpha = p; ctx.translate(0, (1 - p) * 30);
    txt(ctx, 'TRADEWITHAI', W / 2, H * 0.44, { size: 128 });
    ctx.restore();
    const ul = ease.inOutQuad(prog(a, 0.25, 0.7));
    ctx.fillStyle = OR; ctx.fillRect(W / 2 - 360 * ul, H * 0.44 + 28, 720 * ul, 10);
    const q = prog(a, 0.6, 0.4);
    txt(ctx, '@_tradewithai', W / 2, H * 0.44 + 120, { size: 58, alpha: q });
    txt(ctx, 'FOLLOW FOR TRADING EDUCATION', W / 2, H * 0.44 + 210, { size: 34, color: OR, alpha: q });
    txt(ctx, 'LIKE  |  COMMENT  |  SHARE', W / 2, H * 0.44 + 270, { size: 32, alpha: q });
  }

  // ---- animated subtitles: word pop-in, key words in orange, max 2 lines ----
  function subtitles(ctx, t) {
    const c = S.captions.find((k) => t >= k.t0 - 0.05 && t < k.t1 + 0.1);
    if (!c) return;
    const size = 62, maxW = W - 2 * 90;
    const lines = [[]]; let lw = 0;
    for (const w of c.words) {
      const ww = G.measure(ctx, w.w + ' ', size, FAM, WT);
      if (lw + ww > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push({ ...w, ww }); lw += ww;
    }
    const y0 = H * 0.69 - (lines.length - 1) * 30;
    lines.forEach((ln, li) => {
      const total = ln.reduce((s, w) => s + w.ww, 0); let x = W / 2 - total / 2;
      for (const w of ln) {
        const p = ease.outBack(prog(t, w.t, 0.18));
        if (p > 0) {
          ctx.save(); ctx.translate(x + w.ww / 2, y0 + li * 90); ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p);
          G.text(ctx, w.w, 0, 0, { size, fam: FAM, weight: WT, boil: 0, color: w.hi ? OR : WH, align: 'center', stroke: BK, strokeW: 14, alpha: clamp(p) });
          ctx.restore();
        }
        x += w.ww;
      }
    });
  }

  Studio.film({
    draw(ctx, t) {
      if (t >= S.END) { end(ctx, t); return; }
      background(ctx, t);

      if (t < sc.title[1]) title(ctx, t);
      else if (t < sc.line[1]) line(ctx, t);
      else if (t < sc.candles[1]) candles(ctx, t);
      else if (t < sc.buysell[1]) buysell(ctx, t);
      else if (t < sc.warning[1]) warning(ctx, t);
      else cta(ctx, t);
      // scene-change light sweep
      for (const k of ['line', 'candles', 'buysell', 'warning', 'cta']) {
        const d = t - S.markers[k]; if (d >= 0 && d < 0.35) { ctx.fillStyle = `rgba(245,158,11,${0.35 * (1 - d / 0.35)})`; ctx.fillRect(0, 0, W, H); }
      }
      subtitles(ctx, t);
    },
    post: { vignette: 0.3 },
    fadeOut: 0.5,
  });
})();
