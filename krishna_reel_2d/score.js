// THE SCORE - KRISHNA SPICES "Coming Soon" reel. One timeline for music AND picture.
// 80 BPM, 4/4: one bar = 3.0 s, so the five scenes are exactly five bars (15 s).
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const STYLE = 'flat';
  const clock = makeClock({ bpm: 80, offset: 0 });
  const { T, BEAT } = clock;
  const DURATION = T(5); // 15.0 s

  const S = { magic: [0, T(1)], whole: [T(1), T(2)], ground: [T(2), T(3)], hero: [T(3), T(4)], final: [T(4), T(5)] };

  const { chords, chordAt } = makeChords(clock, {
    Dsus: { notes: ['D3', 'G3', 'A3', 'D4'], bass: 'D2' },
    Gm: { notes: ['G3', 'Bb3', 'D4'], bass: 'G1' },
    D: { notes: ['D3', 'F#3', 'A3', 'D4'], bass: 'D2' },
    Dadd9: { notes: ['D3', 'A3', 'E4', 'F#4'], bass: 'D2' },
  }, [[0, 0, 4, 'Dsus'], [1, 0, 4, 'Dsus'], [2, 0, 4, 'Gm'], [3, 0, 4, 'D'], [4, 0, 4, 'Dadd9']]);

  const E8 = BEAT / 2; // an eighth note = 0.375 s
  const ev = {
    title1: 0.45,                    // THE MAGIC OF SPICES
    wipe2: T(1) - 0.2,               // golden iris into scene 2 (maroon)
    title2: T(1) + 0.15,             // WHOLE SPICES
    pops2: [1, 2, 3, 4, 5, 6].map((i) => T(1) + E8 * i),   // six medallions = six notes
    swirlStart: T(2) - 0.65,         // powder swirl begins ...
    swirl: T(2),                     // ... and fills the frame exactly on the bar line
    title3: T(2) + 0.3,              // GROUND SPICES
    pops3: [0, 1, 2, 3].map((i) => T(2) + 0.15 + E8 * i),   // four bowls
    exit3: T(3) - 0.55,              // bowls fly to the corners
    logo: T(3),                      // circular golden reveal: the drop
    shimmer1: T(3, 2),               // shimmer over the logo
    moveUp: T(3, 3.2),               // logo glides to the top
    tag: T(4),                       // PURE TASTE . PURE TRADITION
    soon: T(4, 1),                   // COMING SOON stamps in
    sparkle: T(4, 2.2),              // final sparkle
    shimmer2: T(4, 2.6),
  };

  // melodies: every medallion / bowl pops on a marimba note (D major pentatonic climbing, then a turn)
  const notes2 = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'].map((n, i) => ({ t: ev.pops2[i], midi: m(n) }));
  const notes3 = ['A5', 'F#5', 'E5', 'D5'].map((n, i) => ({ t: ev.pops3[i], midi: m(n) }));
  const musicbox = [...placeBar(clock, { 0: [['D5', 0, 2], ['F#5', 2, 2], ['A5', 4, 2], ['F#5', 6, 2]] }[0], 0, 12)].map((n) => n);
  const shehnai1 = [{ t: 0, dur: 1.3, midi: m('A4') }, { t: 1.5, dur: 0.33, midi: m('B4') }, { t: 1.875, dur: 0.33, midi: m('A4') }, { t: 2.25, dur: 0.65, midi: m('F#4') }];
  const shehnai2 = [{ t: 0, dur: 0.7, midi: m('D5') }, { t: 0.75, dur: 0.35, midi: m('E5') }, { t: 1.125, dur: 0.35, midi: m('F#5') }, { t: 1.5, dur: 1.3, midi: m('A5') }];

  const markers = {
    magic: 0.45,
    whole: T(1),
    swirl: { t: ev.swirl, sync: 'av' },
    logo: { t: ev.logo, sync: 'av' },
    soon: { t: ev.soon, sync: 'av' },
    sparkle: ev.sparkle,
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, STYLE, DURATION, clock, T, BEAT, E8, S, chords, chordAt, ev, markers, notes2, notes3, musicbox, shehnai1, shehnai2 };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
