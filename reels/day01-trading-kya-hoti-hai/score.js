// TradeWithAI – Day 1: "Trading kya hoti hai?"  Single source of truth for sound + picture.
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
  const clock = makeClock({ bpm: 120, offset: 0 });
  const { T, BEAT } = clock;
  const DURATION = 32;
  const END = 30; // 2-second brand end screen

  // Voiceover lines (Hinglish, as in the script book). `hi` = words highlighted orange in captions.
  const VO = [
    { id: 'hook', t0: 0.3, t1: 4.9, text: 'Kya aap jaante hain Trading hoti kya hai? Aaj sirf 30 seconds mein samajhiye!', hi: ['Trading', '30', 'seconds'] },
    { id: 'l1', t0: 5.1, t1: 10.5, text: 'Trading ka simple matlab hota hai kisi financial asset ko buy aur sell karna, price movements ke basis par.', hi: ['buy', 'sell', 'price', 'movements'] },
    { id: 'l2', t0: 10.8, t1: 13.8, text: 'Market mein prices kabhi upar jaati hain aur kabhi neeche.', hi: ['upar', 'neeche'] },
    { id: 'l3', t0: 14.1, t1: 17.3, text: 'Traders in movements ko analyse karte hain aur decisions lete hain.', hi: ['analyse', 'decisions'] },
    { id: 'l4', t0: 17.6, t1: 22.0, text: 'Lekin yaad rakhiye, trading mein profit ke saath loss ka risk bhi hota hai.', hi: ['profit', 'loss', 'risk'] },
    { id: 'l5', t0: 22.3, t1: 25.2, text: 'Isliye bina knowledge ke kabhi trading start mat kariye.', hi: ['knowledge', 'mat'] },
    { id: 'cta', t0: 25.5, t1: 29.7, text: 'Follow @_tradewithai, Reel Like karein aur Comment mein BASICS likhein. Free PDF!', hi: ['@_tradewithai', 'BASICS', 'PDF!', 'Follow'] },
  ];

  // Split each line into caption chunks of <=5 words, each with per-word timing.
  const captions = [];
  for (const L of VO) {
    const words = L.text.split(' ');
    const per = (L.t1 - L.t0) / words.length;
    for (let i = 0; i < words.length; i += 5) {
      const rest = words.length - i;
      const n = rest <= 7 ? rest : 5; // avoid a tiny orphan chunk
      const ws = words.slice(i, i + n).map((w, k) => ({
        w, t: L.t0 + (i + k) * per,
        hi: L.hi.some((h) => w.replace(/[.,!?]/g, '').toLowerCase() === h.replace(/[.,!?]/g, '').toLowerCase()),
      }));
      captions.push({ line: L.id, t0: ws[0].t, t1: L.t0 + (i + n) * per, words: ws });
      if (n === rest) break;
      i += n - 5;
    }
  }

  // Scenes (seconds)
  const scene = {
    title: [0, 5.0], line: [5.0, 10.7], candles: [10.7, 17.4], buysell: [17.4, 22.1],
    warning: [22.1, 25.4], cta: [25.4, END], end: [END, DURATION],
  };

  const markers = { hook: 0.3, line: scene.line[0], candles: scene.candles[0], buysell: scene.buysell[0], warning: scene.warning[0], cta: scene.cta[0], end: END };

  // Chords: A minor feel, dark & futuristic. 1 bar = 2s.
  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
  }, [
    [0, 0, 4, 'Am'], [1, 0, 4, 'F'], [2, 0, 4, 'C'], [3, 0, 4, 'G'],
    [4, 0, 4, 'Am'], [5, 0, 4, 'F'], [6, 0, 4, 'C'], [7, 0, 4, 'G'],
    [8, 0, 4, 'Am'], [9, 0, 4, 'F'], [10, 0, 4, 'C'], [11, 0, 4, 'G'],
    [12, 0, 4, 'Am'], [13, 0, 4, 'F'], [14, 0, 4, 'C'], [15, 0, 4, 'Am'],
  ]);

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, DURATION, END, clock, T, BEAT, m, chords, chordAt, VO, captions, scene, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
