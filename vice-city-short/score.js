// THE SCORE — Vice City day-to-night short. Single source of truth for music AND picture.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const clock = makeClock({ bpm: 120, offset: 0 }); // 1 beat = 0.5s, 1 bar = 2s
  const { T, BEAT } = clock;
  const DURATION = T(15); // 30s

  // ---------- scenes (cuts on bar lines) ----------
  const SC = {
    hook: [T(0), T(1)],
    swamp: [T(1), T(3)],
    beach: [T(3), T(5)],
    chase: [T(5), T(9)],
    escape: [T(9), T(12)],
    card: [T(12), DURATION],
  };

  // ---------- harmony: Am F C G, one chord per bar ----------
  const spec = {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
  };
  const prog = ['Am', 'F', 'C', 'G'];
  const seq = [];
  for (let b = 0; b < 15; b++) seq.push([b, 0, 4, prog[b % 4]]);
  const { chords, chordAt } = makeChords(clock, spec, seq);

  // ---------- events ----------
  const ev = {
    gator: T(2, 2), // jaws snap
    drop: T(5), // chase starts, full drums
    stars: [T(5, 2), T(6, 0), T(7, 0), T(7, 2), T(8, 1)], // wanted stars light up
    heli: T(9), // escape starts
    clear: T(10, 2), // wanted level cleared
    card: T(12), // hype card
    sign: T(12, 2),
  };

  // lead melody (A minor), [note, startBeat(in 8ths), dur8ths] per bar
  const LEAD = {
    5: [['E5', 0, 3], ['D5', 3, 1], ['C5', 4, 2], ['D5', 6, 2]],
    6: [['C5', 0, 3], ['A4', 3, 1], ['C5', 4, 2], ['F5', 6, 2]],
    7: [['E5', 0, 3], ['G5', 3, 1], ['E5', 4, 2], ['D5', 6, 2]],
    8: [['D5', 0, 2], ['B4', 2, 2], ['D5', 4, 4]],
    12: [['A5', 0, 3], ['E5', 3, 1], ['C5', 4, 2], ['E5', 6, 2]],
    13: [['F5', 0, 3], ['C5', 3, 1], ['A4', 4, 2], ['C5', 6, 2]],
    14: [['G5', 0, 3], ['E5', 3, 1], ['D5', 4, 4]],
  };
  const lead = [];
  for (const b of Object.keys(LEAD)) for (const [n, s, d] of LEAD[b]) lead.push({ t: T(+b) + s * BEAT / 2, dur: d * BEAT / 2, midi: m(n) });

  // ---------- markers ----------
  const markers = {
    swamp: { t: SC.swamp[0], sync: 'av' },
    gator: { t: ev.gator, sync: 'av' },
    beach: { t: SC.beach[0], sync: 'av' },
    drop: { t: ev.drop, sync: 'av' },
    heli: { t: ev.heli, sync: 'av' },
    clear: ev.clear,
    card: { t: ev.card, sync: 'av' },
  };

  // ---------- Hinglish captions ----------
  const cx = W / 2, cy = SAFE.y + 150;
  const captions = [
    { t: 0.35, end: T(1) - 0.05, text: 'Ek din. Ek city.', x: cx, y: SAFE.y + 360, size: 84, rot: -0.03 },
    { t: T(0, 3), end: T(1) - 0.05, text: 'Total chaos!', x: cx, y: SAFE.y + 460, size: 96, rot: 0.03 },
    { t: T(1, 1), end: T(3) - 0.1, text: 'Swamp me gator bhi hai!', x: cx, y: cy, size: 76, rot: -0.02 },
    { t: T(3, 1), end: T(5) - 0.1, text: 'Beach pe sunset cruise', x: cx, y: cy, size: 80, rot: 0.02 },
    { t: T(5, 1), end: T(7) - 0.1, text: 'Police peeche padi hai!', x: cx, y: cy + 90, size: 76, rot: -0.02 },
    { t: T(7, 0), end: T(9) - 0.1, text: '5 star wanted level!', x: cx, y: cy + 90, size: 86, rot: 0.02 },
    { t: T(9, 1), end: T(10, 2) - 0.05, text: 'Heli utha, seedha samundar!', x: cx, y: cy, size: 70, rot: -0.02 },
    { t: T(10, 3), end: T(12) - 0.05, text: 'Wanted level: 0. Bach gaye!', x: cx, y: cy, size: 70, rot: 0.02 },
  ];

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, DURATION, clock, T, BEAT, SC, m, chords, chordAt, ev, lead, markers, captions };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
