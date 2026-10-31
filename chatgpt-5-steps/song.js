// THE SONG: every sound comes from an event in score.js.   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
// A voiceover over a soft bed, a pluck on every style cut, one bar of each genre pack, and an EDM drop
// for the end card. The music ducks under the voice.
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const Voice = require('./engine/audio/voice');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, chordAt } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const buses = { drums: bus(), bass: bus(), pad: bus(), keys: bus() };
const lead = bus(), fx = bus(), verb = bus();

// bed: lofi all the way, a pluck on each step, a crash on the end card
Genre.play('lofi', { clock, from: 0, to: 15, chordAt, buses, gain: 0.8 });
[['E5', 0], ['G5', 0.5], ['C6', 1]].forEach(([n, b]) => { const x = I.musicBox(m(n)); lead.addMono(x, T(0, b + 1), 0.2, 0.2); verb.addMono(x, T(0, b + 1), 0.2); });
['s1', 's2', 's3', 's4', 's5'].forEach((k, i) => { const x = I.pluck(m(['C5', 'E5', 'G5', 'C6', 'E6'][i])); lead.addMono(x, ev[k], 0.35, i % 2 ? 0.3 : -0.3); verb.addMono(x, ev[k], 0.15); fx.addMono(I.paperFwip(1.2 + i * 0.1, i + 3), ev[k] - 0.04, 0.15); });
fx.addMono(I.pop(2200), ev.formula, 0.3);
const { kicks } = Genre.play('edm', { clock, from: 15, to: 17, chordAt, buses, gain: 0.8 });
fx.addMono(I.crash(4), ev.end, 0.4);
fx.addMono(I.subBoom(1.2, 80, 34), ev.end, 0.4);
MIX.sidechain([buses.pad, buses.keys], kicks, { depth: 0.45 });

// the voiceover, and the music ducks under it
const vo = Voice.speak(sc.vo, { out: path.join(__dirname, 'out'), length: DURATION, voice: 'hi', rate: 165 });
const music = [buses.drums, buses.bass, buses.pad, buses.keys, lead];
MIX.duck(music, vo.bus, { depth: 0.55 });

const room = reverb(verb, { room: 0.7, damp: 0.4 });
const stems = { ...buses, lead, fx, voice: vo.bus, verb: room };
const GAIN = { drums: 0.9, bass: 0.8, pad: 1, keys: 1, lead: 1, fx: 1, voice: 1.7, verb: 0.4 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
MIX.highpass(mix, 28);
MIX.fadeOut(mix, DURATION - 1, DURATION);
const res = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? +process.env.LUFS : -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`out/music.wav  ${DURATION.toFixed(1)}s  ${res.lufs.toFixed(1)} LUFS  voice: ${vo.engine}`);
