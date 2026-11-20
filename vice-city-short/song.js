// THE SONG — synthwave, rendered from score.js events.
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), arp = bus(), leadB = bus(), fx = bus(), verb = bus(), dly = bus();

const K = I.kick(), SN = I.snare(), CL = I.clap(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14), CR = I.crash(18);
const kicks = [];
// drums: hats from bar 1, kick+clap from bar 3, full from the drop (bar 5), card bars full too
clock.eachStep(1, 15, 16, (t, b, s) => {
  const full = b >= 5 && !(b >= 9 && b < 10 && false);
  const kickOn = b >= 3;
  if (kickOn && s % 4 === 0) { drums.addMono(K, t, 0.95); kicks.push(t); }
  if (b >= 3 && s % 8 === 4) { drums.addMono(CL, t, 0.6); verb.addMono(CL, t, 0.3); if (full) drums.addMono(SN, t, 0.25); }
  if (s % 2 === 0 || full) drums.addMono(HC[s % 2], t, s % 4 === 2 ? 0.2 : 0.11, s % 2 ? 0.3 : -0.3);
  if (full && s % 4 === 2) drums.addMono(HO, t, 0.12, 0.3);
});
for (const t of [ev.drop, sc.SC.escape[0], ev.card]) drums.addMono(CR, t, 0.4, -0.2);
// snare roll into the drop and into the card
for (let i = 0; i < 8; i++) drums.addMono(SN, T(4, 2) + i * BEAT / 4, 0.18 + i * 0.03);
for (let i = 0; i < 8; i++) drums.addMono(SN, T(11, 2) + i * BEAT / 4, 0.18 + i * 0.03);

// bass: driving 8ths from bar 3
clock.eachStep(3, 15, 8, (t, b, s) => {
  const c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  bass.addMono(I.bass(s % 4 === 3 ? R + 12 : R, BEAT / 2 * 0.85, { sub: 0.8 }), t, b >= 5 ? 0.6 : 0.45);
});

// pads
for (const c of sc.chords) for (const n of c.notes) { const { L, R } = I.padNote(n, c.t1 - c.t0, { cutoff: c.t0 >= ev.drop ? 2200 : 1100, attack: 0.4, release: 1.0 }); pad.addStereo(L, R, c.t0, 0.08); }

// arpeggio (16ths, pulse waves): the synthwave shimmer, whole film
clock.eachStep(0, 15, 8, (t, b, s) => {
  const c = sc.chordAt(t) || sc.chords[0];
  const ns = [...c.notes.map((n) => n + 12), c.notes[0] + 24];
  const midi = ns[[0, 1, 2, 3, 2, 1, 2, 3][s]];
  const x = I.pulse(midi, BEAT * 0.45, { duty: 0.3, decay: 0.2 });
  const pan = (s % 2 ? 0.3 : -0.3);
  arp.addMono(x, t, b >= 5 ? 0.17 : 0.12, pan);
  dly.addMono(x, t, 0.06);
});

// lead (supersaw) in chase and card
for (const n of sc.lead) { const a = I.supersaw(n.midi, n.dur * 0.95, { cutoff: 3600, detune: 18 }); leadB.addStereo(a.L, a.R, n.t, 0.2); verb.addStereo(a.L, a.R, n.t, 0.1); dly.addStereo(a.L, a.R, n.t, 0.06); }

// fx tied to events
fx.addMono(I.noiseSweep(T(1) - 0.3, 300, 6000, { q: 1, pink: true }), 0.3, 0.3); // opening riser into the swamp
fx.addMono(I.noiseSweep(T(5) - T(4, 0), 200, 8000, { q: 0.9, pink: true, shape: (x) => x * x }), T(4), 0.4);
fx.addMono(I.noiseSweep(T(12) - T(11), 200, 9000, { q: 0.9, pink: true, shape: (x) => x * x }), T(11), 0.4);
fx.addMono(I.subBoom(2.0), ev.drop, 0.6);
fx.addMono(I.subBoom(2.2), ev.card, 0.7);
fx.addMono(I.thwack(), ev.gator, 0.7); // gator jaws snap
fx.addMono(I.pop(1.2), ev.gator + 0.02, 0.4);
for (const t of [sc.SC.beach[0], sc.SC.escape[0]]) fx.addMono(I.noiseSweep(0.35, 5000, 400, { q: 1, pink: true }), t - 0.2, 0.4); // whoosh into cuts
for (const t of ev.stars) fx.addMono(I.pop(1.6), t, 0.45); // wanted star ding
fx.addMono(I.noiseSweep(1.2, 600, 3000, { q: 1.5 }), ev.clear - 0.1, 0.25);
fx.addMono(I.glass(), ev.clear, 0.25);
// helicopter chop under the escape
for (let t = T(9); t < ev.clear + 0.5; t += 0.09) fx.addMono(I.thud(120, 0.04), t, 0.12);
for (const c of sc.captions) fx.addMono(I.paperFwip(1.0, Math.round(c.t * 10)), c.t - 0.03, 0.18, 0);

MIX.sidechain([pad, bass, arp], kicks.filter((t) => t >= ev.drop));
const stems = { drums, bass, pad, arp, lead: leadB, fx, verb: reverb(verb, { room: 0.82, damp: 0.3 }), dly: pingpong(dly, BEAT * 0.75, 0.38, 3500) };
const GAIN = { drums: 0.4, bass: 0.7, pad: 2.6, arp: 1.4, lead: 1.5, fx: 0.8, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS` : ''})`);
