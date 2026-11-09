// TradeWithAI Day 1 – dark futuristic technology beat (sits low; a voiceover is mixed in later).
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, END, m, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), arp = bus(), fx = bus(), verb = bus();

const K = I.kick(), SN = I.snare(), CL = I.clap(), HC = I.hat(false, 11), HO = I.hat(true, 14), CR = I.crash(18);
const kicks = [];
clock.eachStep(0, 15, 16, (t, b, s) => {
  if (t < 0.25 || t >= END) return;
  const full = b >= 1;
  if (full && s % 4 === 0) { drums.addMono(K, t, 0.85); kicks.push(t); }
  if (full && s % 8 === 4) { drums.addMono(CL, t, 0.5); verb.addMono(CL, t, 0.25); }
  if (full) { drums.addMono(HC, t, s % 2 ? 0.14 : 0.08, s % 2 ? 0.3 : -0.3); if (s % 8 === 6) drums.addMono(HO, t, 0.1); }
});
drums.addMono(CR, 0.3, 0.45);      // opening impact
drums.addMono(CR, END, 0.35);      // logo hit
fx.addMono(I.subBoom(1.6), 0.3, 0.7);
fx.addMono(I.subBoom(2.2), END, 0.7);

// bass: driving 8ths
clock.eachStep(1, 15, 8, (t, b, s) => {
  if (t >= END) return;
  const c = sc.chordAt(t); if (!c) return;
  bass.addMono(I.bass(s % 4 === 3 ? c.bass + 19 : c.bass + 12, BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.5);
});

// pads
for (const c of sc.chords) {
  const t1 = Math.min(c.t1, DURATION);
  for (const n of c.notes) { const { L, R } = I.padNote(n, t1 - c.t0, { cutoff: 1100, attack: 0.5, release: 1.2 }); pad.addStereo(L, R, c.t0, 0.08); }
}

// futuristic 16th arp on chord tones
clock.eachStep(2, 15, 16, (t, b, s) => {
  if (t >= END) return;
  const c = sc.chordAt(t); if (!c) return;
  const ns = c.notes; const midi = (typeof ns[s % 3] === 'number' ? ns[s % 3] : m(ns[s % 3])) + 12;
  const p = I.musicBox(midi); arp.addMono(p, t, 0.1, (s % 4 - 1.5) * 0.3); verb.addMono(p, t, 0.1);
});

// transition SFX at scene changes + a riser into the CTA and the logo
for (const k of ['line', 'candles', 'buysell', 'warning', 'cta']) fx.addMono(I.noiseSweep(0.5, 600, 5000, { q: 1, pink: true }), sc.markers[k] - 0.45, 0.22);
fx.addMono(I.noiseSweep(1.6, 200, 8000, { q: 0.9, shape: (x) => x * x, pink: true }), END - 1.6, 0.35);
fx.addMono(I.thud(70, 0.1), sc.markers.warning, 0.6);

MIX.sidechain([pad, bass], kicks);
const stems = { drums, bass, pad, arp, fx, verb: reverb(verb, { room: 0.8, damp: 0.35 }) };
const GAIN = { drums: 0.4, bass: 0.7, pad: 2.4, arp: 0.7, fx: 0.7, verb: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.fadeOut(mix, DURATION - 0.9, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION}s, ${M.lufs !== undefined ? M.lufs.toFixed(1) + ' LUFS' : ''})`);
