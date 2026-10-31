// THE FILM (9:16): intro, five step scenes, the 4-part formula, an end card. The Claude mascot lip-syncs the voiceover.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, UI = globalThis.UI, Subs = globalThis.Subs, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clamp, ease } = U;
  const { T, BEAT, ev, clock } = S;
  const W = G.W, H = G.H, CX = W / 2;
  let VO = null, SUBS = [];
  const sectionOf = (t) => Object.entries(S.S).find(([, [a, b]]) => t >= a && t < b)?.[0] || 'end';
  const talk = (t) => { const m = Subs.mouth(VO, t, 'narrator'); return m.talking ? m : 'smile'; };
  const beatHop = (t, amp) => amp * Math.sin(Math.PI * clock.phase(t));
  const stamp = (t, t0) => (t < t0 ? 0 : 1 + 0.35 * (1 - ease.outCubic(clamp((t - t0) / 0.2))));
  const BG = '#F4EDE0', INK = '#2A2320';
  const mascot = (ctx, t, x = 860, y = 1480, s = 0.75) => Ch.claude(ctx, { x, y: y - beatHop(t, 10), s, eyes: 'happy', armL: 0.5 + beatHop(t, 0.3), armR: 0.6, mouth: talk(t), blush: 0.4 });

  function header(ctx, t, st, t0) {
    const k = stamp(t, t0);
    if (k <= 0) return;
    ctx.save(); ctx.translate(CX, 330); ctx.scale(k, k);
    G.ellipse(ctx, -330, 0, 70, 70, { fill: st.color, lw: 6, seed: st.n });
    G.text(ctx, String(st.n), -330, 28, { size: 88, align: 'center', color: '#fff', stroke: INK, strokeW: 6 });
    G.text(ctx, st.title, 60, 24, { size: 76, align: 'center', color: INK, maxW: 640 });
    ctx.restore();
  }
  const reveal = (t, t0, d = 0.3) => clamp((t - t0) / d);

  function intro(ctx, t) {
    G.bg(ctx, BG);
    const k = stamp(t, ev.title);
    if (k > 0) {
      ctx.save(); ctx.translate(CX, 560); ctx.scale(k, k); ctx.rotate(-0.03);
      G.text(ctx, 'ChatGPT', 0, 0, { size: 190, align: 'center', color: '#0D8F6B', stroke: INK, strokeW: 10 });
      G.text(ctx, 'kaise use karein?', 0, 120, { size: 84, align: 'center', color: INK });
      G.text(ctx, '5 simple steps', 0, 250, { size: 70, align: 'center', color: '#E0703E', fam: 'Patrick Hand', weight: 400 });
      ctx.restore();
    }
    mascot(ctx, t, CX, 1400, 1.2);
  }
  function s1(ctx, t) {
    G.bg(ctx, BG); header(ctx, t, S.steps[0], ev.s1);
    UI.card(ctx, 90, 500, 900, 520, 28, { fill: '#fff', stroke: INK });
    UI.pill(ctx, 130, 540, 'https://chatgpt.com', { bg: '#E7F4EE', fg: INK, size: 44, h: 80 });
    const a = reveal(t, ev.s1 + 0.6);
    ctx.save(); ctx.globalAlpha = a; G.text(ctx, 'Welcome back', CX, 760, { size: 70, align: 'center', color: INK }); ctx.restore();
    UI.button(ctx, CX, 900, 560, 110, 'Sign in', t, { tTap: ev.s1 + 2.6, done: t > ev.s1 + 3, bg: '#0D8F6B', doneBg: '#0D8F6B' });
    UI.tap(ctx, CX + 100, 920, t, ev.s1 + 2.6, { color: '#E0703E', size: 90 });
    G.text(ctx, 'Free account is enough', CX, 1130, { size: 56, align: 'center', color: '#51635b', alpha: reveal(t, ev.s1 + 3.2) });
    mascot(ctx, t);
  }
  function s2(ctx, t) {
    G.bg(ctx, BG); header(ctx, t, S.steps[1], ev.s2);
    ctx.save(); ctx.translate(90, 480);
    UI.chat(ctx, 900, [
      { t: ev.s2 + 0.8, who: 'me', text: 'Write 5 Instagram captions for a new cafe in Jaipur. Friendly tone, under 20 words.' },
      { t: ev.s2 + 3.6, who: 'them', text: '1. Chai, cake & good vibes. Our doors are open, Jaipur!' },
    ], t, { y0: 0, size: 54 });
    ctx.restore();
    mascot(ctx, t);
  }
  function s3(ctx, t) {
    G.bg(ctx, BG); header(ctx, t, S.steps[2], ev.s3);
    ctx.save(); ctx.translate(90, 480);
    UI.chat(ctx, 900, [{ t: ev.s3 + 0.4, who: 'them', text: 'Here is a long caption about our cafe opening in Jaipur...' }], t, { y0: 0, size: 54 });
    ctx.restore();
    ['shorter', 'more formal', 'add examples'].forEach((w, i) => {
      const k = stamp(t, ev.s3 + 1.6 + i * 1.2);
      if (k > 0) { ctx.save(); ctx.translate(CX, 880 + i * 130); ctx.scale(k, k); UI.pill(ctx, -220, -50, w, { bg: ['#DCE7FB', '#FBE6DD', '#DCF2E9'][i], fg: INK, size: 56, h: 100 }); ctx.restore(); }
    });
    mascot(ctx, t);
  }
  function s4(ctx, t) {
    G.bg(ctx, BG); header(ctx, t, S.steps[3], ev.s4);
    [['+', 'File', '#DCE7FB'], ['IMG', 'Photo', '#FBE6DD'], ['MIC', 'Voice', '#DCF2E9']].forEach(([ic, lb, c], i) => {
      const k = stamp(t, ev.s4 + 0.8 + i * 1.3);
      if (k <= 0) return;
      ctx.save(); ctx.translate(CX, 640 + i * 250); ctx.scale(k, k);
      UI.card(ctx, -420, -100, 840, 200, 28, { fill: c, stroke: INK });
      G.text(ctx, ic, -300, 25, { size: 78, align: 'center', color: INK });
      G.text(ctx, lb, 40, 25, { size: 74, align: 'center', color: INK });
      ctx.restore();
    });
    mascot(ctx, t);
  }
  function s5(ctx, t) {
    G.bg(ctx, BG); header(ctx, t, S.steps[4], ev.s5);
    UI.card(ctx, 90, 500, 900, 520, 28, { fill: '#fff', stroke: INK });
    G.text(ctx, 'ChatGPT says:', 140, 590, { size: 48, color: '#51635b' });
    G.text(ctx, '"Founded in 1995, 4 crore users"', 140, 700, { size: 54, color: INK, maxW: 800 });
    const k = reveal(t, ev.s5 + 2);
    ctx.save(); ctx.globalAlpha = k;
    UI.pill(ctx, 140, 790, 'Check the source!', { bg: '#FBE6DD', fg: '#C23B5A', size: 56, h: 100 });
    ctx.restore();
    UI.check(ctx, 880, 880, 70, reveal(t, ev.s5 + 3, 0.6));
    G.text(ctx, 'Numbers · dates · names', CX, 1130, { size: 56, align: 'center', color: '#51635b', alpha: reveal(t, ev.s5 + 3.4) });
    mascot(ctx, t);
  }
  function formula(ctx, t) {
    G.bg(ctx, BG);
    G.text(ctx, 'Best prompt formula', CX, 330, { size: 84, align: 'center', color: INK, alpha: 1 });
    [['ROLE', 'Kaun ban kar jawab de', '#0D8F6B'], ['TASK', 'Kya karna hai', '#E0703E'], ['CONTEXT', 'Kiske liye, details', '#3D6FD8'], ['FORMAT', 'Length, style', '#B05AD0']].forEach(([a, b, c], i) => {
      const k = stamp(t, ev.formula + 1.2 + i * 1.5);
      if (k <= 0) return;
      ctx.save(); ctx.translate(CX, 470 + i * 185); ctx.scale(k, k);
      UI.card(ctx, -440, -78, 880, 156, 26, { fill: '#fff', stroke: c });
      G.text(ctx, a, -230, 22, { size: 62, align: 'center', color: c });
      G.text(ctx, b, 150, 18, { size: 42, align: 'center', color: INK, maxW: 400 });
      ctx.restore();
    });
    mascot(ctx, t, 880, 1470, 0.7);
  }
  function end(ctx, t) {
    G.bg(ctx, BG);
    G.rays(ctx, CX, 800, { n: 36, r0: 150, r1: 1500, color: 'rgba(242,184,75,0.35)', lw: 18, seed: 9, spin: (t - ev.end) * 0.2 });
    const k = stamp(t, ev.end);
    ctx.save(); ctx.translate(CX, 420); ctx.scale(k, k);
    G.text(ctx, 'Ab try karo!', 0, 0, { size: 150, align: 'center', color: '#0D8F6B', stroke: INK, strokeW: 9 });
    ctx.restore();
    G.text(ctx, 'chatgpt.com', CX, 560, { size: 76, align: 'center', color: INK, alpha: clamp((t - ev.end - 0.4) * 3) });
    mascot(ctx, t, CX, 1450, 1.2);
    if (t >= ev.end) G.confetti(ctx, t, ev.end, { n: 160, seed: 6 });
  }

  const SECTIONS = { intro, s1, s2, s3, s4, s5, formula, end };
  Studio.film({
    fadeOut: 1,
    async init() { VO = await Studio.loadJSON('out/voice.json'); SUBS = Subs.fromVoice(VO, { maxWords: 4 }); },
    draw(ctx, t) {
      G.setStyle('paper');
      const cut = [ev.s1, ev.s2, ev.s3, ev.s4, ev.s5, ev.formula, ev.end].filter((c) => t >= c).pop();
      const shake = cut !== undefined ? 10 * Math.exp(-(t - cut) * 8) : 0;
      ctx.save(); ctx.translate(U.noise1(t * 30, 1) * shake, U.noise1(t * 30, 2) * shake);
      SECTIONS[sectionOf(t)](ctx, t);
      ctx.restore();
      if (cut !== undefined && t - cut < 0.2) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - (t - cut) / 0.2)})`; ctx.fillRect(0, 0, W, H); }
      Subs.draw(ctx, t, SUBS, { style: 'pop', size: 54, y: sectionOf(t) === 'end' ? 760 : sectionOf(t) === 'formula' ? 1330 : 1270 });
    },
  });
})();
