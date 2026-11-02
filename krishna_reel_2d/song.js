// THE SONG - synthesised from score.js (no samples, no third-party music).
// Tanpura-style drone, tabla groove, marimba notes that the medallions/bowls "play",
// shehnai melody on the logo reveal, bells + sparkle on COMING SOON.   node song.js
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { m } = require('./engine/music');
const { T, BEAT, DURATION, ev, clock, E8 } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const pad = bus(), tan = bus(), tab = bus(), perc = bus(), keys = bus(), lead = bus(), bells = bus(), fx = bus();
const verb = bus(), dly = bus();

// ---------- drone: pad swells + tanpura plucks (Pa Sa Sa low-Sa) ----------
for (const c of sc.chords) for (const n of c.notes) {
  const { L, R } = I.padNote(n, c.t1 - c.t0 + 0.4, { cutoff: c.t0 >= ev.logo ? 2400 : 1100, attack: 0.9, release: 1.4 });
  pad.addStereo(L, R, c.t0, c.t0 >= ev.logo ? 0.085 : 0.07);
}
const tanPat = ['A2', 'D3', 'D3', 'D2'];
let k = 0;
for (let t = 0.1; t < DURATION - 0.8; t += BEAT) {
  const g = I.guitar(m(tanPat[k % 4]), 2.2, { bright: 0.3, sustain: 0.9985, seed: 40 + (k % 4) });
  tan.addMono(g, t, 0.3 * Math.min(1, t / 1.5), k % 2 ? -0.35 : 0.35); verb.addMono(g, t, 0.12); k++;
}

// ---------- scene 1: music-box arpeggio + glints ----------
for (const n of sc.musicbox) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t + 0.45, 0.2); verb.addMono(mb, n.t + 0.45, 0.2); dly.addMono(mb, n.t + 0.45, 0.1); }
for (let i = 0; i < 6; i++) bells.addMono(I.bell(2349 * (i % 2 ? 1.26 : 1), 0.22), 0.3 + i * 0.42, 0.035, i % 2 ? 0.4 : -0.4);

// ---------- tabla groove (8-step keherwa-style bar) ----------
const PAT = ['dha', null, 'na', 'tin', 'dha', 'ge', 'na', 'tin'];
function groove(b0, b1, level, midi = 62) {
  clock.eachStep(b0, b1, 8, (t, b, s) => {
    const st = PAT[s]; if (!st) return;
    if (level < 2 && !(s === 0 || s === 4)) return;
    tab.addMono(I.tabla(st, { midi, seed: 3 + s }), t, st === 'dha' ? 0.55 : 0.34, s % 2 ? 0.25 : -0.15);
  });
}
groove(1, 2, 1);              // whole spices: light
groove(2, 3, 2);              // ground spices: full
groove(4, 5, 2);              // final frame
clock.eachStep(2, 5, 8, (t, b, s) => { if (b === 3 && t < ev.logo + 1.3) return; perc.addMono(I.shaker(s % 2 ? 0.5 : 1, 15 + s), t, 0.1, s % 2 ? 0.4 : -0.4); });
for (let i = 0; i < 8; i++) perc.addMono(I.ghungroo(1 + i, { size: 0.8 }), T(2) + i * BEAT / 2 + 0.01, 0.07, i % 2 ? 0.5 : -0.5);

// ---------- the medallions and bowls are the notes ----------
for (const n of sc.notes2) { const x = I.marimba(n.midi, { thock: 0.1 }); keys.addMono(x, n.t, 0.5, ((n.t - T(1)) / 3 - 0.5) * 0.6); verb.addMono(x, n.t, 0.22); fx.addMono(I.pop(1500 + (n.midi - 74) * 40, Math.round(n.t * 9)), n.t - 0.01, 0.12); }
for (const n of sc.notes3) { const x = I.marimba(n.midi, { thock: 0.1 }); keys.addMono(x, n.t, 0.5, ((n.t - T(2)) / 3 - 0.5) * 0.6); verb.addMono(x, n.t, 0.22); dly.addMono(x, n.t, 0.07); fx.addMono(I.pop(1200, Math.round(n.t * 9)), n.t - 0.01, 0.1); }

// ---------- transitions ----------
fx.addMono(I.noiseSweep(0.5, 400, 3500, { q: 1, pink: true }), ev.wipe2, 0.3);                    // iris into scene 2
tab.addMono(I.tabla('dha', { midi: 62 }), T(1), 0.6);
fx.addMono(I.noiseSweep(ev.swirl - ev.swirlStart, 300, 6000, { q: 1.1, shape: (x) => x * x, pink: true }), ev.swirlStart, 0.5); // swirl whoosh
fx.addMono(I.thud(70, 0.1), ev.swirl, 0.55); fx.addMono(I.crash(7), ev.swirl, 0.16);
tab.addMono(I.tabla('dha', { midi: 62 }), ev.swirl, 0.7);
for (const w of [ev.title1, ev.title2, ev.title3]) fx.addMono(I.paperFwip(0.9, Math.round(w * 10)), w - 0.03, 0.16);
// riser into the reveal
fx.addMono(I.noiseSweep(ev.logo - ev.exit3, 200, 9000, { q: 0.9, shape: (x) => x * x * x, pink: true }), ev.exit3, 0.5);
for (let i = 0; i < 6; i++) tab.addMono(I.tabla('na', { midi: 62, seed: 20 + i }), ev.logo - 0.5 + i * 0.083, 0.2 + i * 0.05);

// ---------- hero reveal: boom, crash, shehnai melody, glints ----------
fx.addMono(I.subBoom(2.4), ev.logo, 0.75); fx.addMono(I.crash(18), ev.logo, 0.35); fx.addMono(I.thud(60, 0.1), ev.logo, 0.5);
tab.addMono(I.tabla('dha', { midi: 62 }), ev.logo, 0.7);
{ const sh = I.shehnaiLine(sc.shehnai1, { vib: 0.3 }); lead.addMono(sh, ev.logo + 0.06, 0.34, 0); verb.addMono(sh, ev.logo + 0.06, 0.16); dly.addMono(sh, ev.logo + 0.06, 0.06); }
for (let i = 0; i < 4; i++) bells.addMono(I.bell([1175, 1480, 1760, 2349][i], 0.5), ev.shimmer1 + i * 0.12, 0.07, (i % 2 ? 1 : -1) * 0.3);
fx.addMono(I.noiseSweep(1.0, 3000, 9000, { q: 2, pink: false }), ev.shimmer1, 0.09);

// ---------- final frame ----------
{ const sh = I.shehnaiLine(sc.shehnai2, { vib: 0.28, seed: 2 }); lead.addMono(sh, ev.tag + 0.06, 0.32, 0.05); verb.addMono(sh, ev.tag + 0.06, 0.18); dly.addMono(sh, ev.tag + 0.06, 0.06); }
fx.addMono(I.subBoom(1.8, 55, 30), ev.soon, 0.7); fx.addMono(I.thud(75, 0.09), ev.soon, 0.6); fx.addMono(I.crash(5), ev.soon, 0.3);
tab.addMono(I.tabla('dha', { midi: 62 }), ev.soon, 0.75);
bells.addMono(I.bell(587, 1.6, 2.4), ev.soon, 0.12);
[1175, 1480, 1760, 2349, 1760, 2960, 3520].forEach((f, i) => { const t = ev.sparkle + i * 0.085; bells.addMono(I.bell(f, 0.7 + i * 0.05, 2.0), t, 0.06, (i % 2 ? 1 : -1) * 0.45); verb.addMono(I.bell(f, 0.7, 2.0), t, 0.05); });
fx.addMono(I.noiseSweep(0.9, 4000, 11000, { q: 2.5 }), ev.shimmer2, 0.08);
{ const x = I.padNote(m('D4'), 2.4, { cutoff: 3200, attack: 0.05, release: 1.6 }); pad.addStereo(x.L, x.R, ev.soon, 0.05); }

// ---------- mix ----------
const stems = {
  pad, tan, tab, perc, keys, lead, bells, fx,
  verb: reverb(verb, { room: 0.86, damp: 0.3 }),
  dly: pingpong(dly, BEAT * 0.75, 0.36, 3500),
};
const GAIN = { pad: 2.6, tan: 1.35, tab: 0.85, perc: 0.9, keys: 0.85, lead: 2.4, bells: 1.8, fx: 0.55, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 24);
MIX.fadeOut(mix, DURATION - 0.9, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS` : ''})`);
