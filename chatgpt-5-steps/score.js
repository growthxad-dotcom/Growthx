// CHATGPT IN 5 STEPS (9:16, ~45s): a Hinglish voiceover, one scene per step, a prompt-formula scene and an end card.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = '9:16';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const clock = makeClock({ bpm: 80, offset: 0.2 });
  const { T, BEAT } = clock;
  const DURATION = T(17) + 1.2;

  const S = { intro: [0, T(2)], s1: [T(2), T(4)], s2: [T(4), T(6)], s3: [T(6), T(8)], s4: [T(8), T(10)], s5: [T(10), T(12)], formula: [T(12), T(15)], end: [T(15), DURATION] };
  const loop = ['C', 'G', 'Am', 'F'];
  const { chords, chordAt } = makeChords(clock, {
    C: { notes: ['E3', 'G3', 'C4'], bass: 'C2' }, G: { notes: ['D3', 'G3', 'B3'], bass: 'G1' }, Am: { notes: ['E3', 'A3', 'C4'], bass: 'A1' }, F: { notes: ['F3', 'A3', 'C4'], bass: 'F1' },
  }, [...Array.from({ length: 17 }, (_, b) => [b, 0, 4, loop[b % 4]]), [17, 0, 4, 'C']]);

  // voice lines are Devanagari so the Hindi voice reads them well; `display` is the Hinglish caption
  const vo = [
    { at: T(0, 0.5), text: 'नमस्ते दोस्तो! चैट जी पी टी चलाना सीखो, पाँच स्टेप में।', display: 'Namaste dosto! ChatGPT chalana seekho, 5 steps mein.', who: 'narrator' },
    { at: T(2, 0.2), text: 'स्टेप एक। चैट जी पी टी डॉट कॉम खोलो और साइन इन करो। फ्री अकाउंट काफी है।', display: 'Step 1. chatgpt.com kholo aur sign in karo. Free account kaafi hai.', who: 'narrator' },
    { at: T(4, 0.2), text: 'स्टेप दो। साफ़ लिखो कि क्या चाहिए, किसके लिए चाहिए, और कितना लंबा।', display: 'Step 2. Saaf likho: kya chahiye, kiske liye, aur kitna lamba.', who: 'narrator' },
    { at: T(6, 0.2), text: 'स्टेप तीन। जवाब पसंद नहीं आया? फॉलो अप भेजो, जैसे छोटा करो।', display: 'Step 3. Jawab pasand nahi aaya? Follow-up bhejo, jaise "chhota karo".', who: 'narrator' },
    { at: T(8, 0.2), text: 'स्टेप चार। प्लस दबाकर फाइल या फोटो डालो, या माइक दबाकर बोलो।', display: 'Step 4. Plus dabakar file ya photo daalo, ya mic dabakar bolo.', who: 'narrator' },
    { at: T(10, 0.2), text: 'स्टेप पाँच। जवाब हमेशा जाँचो। नंबर और तारीख गलत हो सकती हैं।', display: 'Step 5. Jawab hamesha jaancho. Number aur date galat ho sakte hain.', who: 'narrator' },
    { at: T(12, 0.2), text: 'बेस्ट फॉर्मूला: रोल, टास्क, कॉन्टेक्स्ट, और फॉर्मेट। चारों लिखो, जवाब कमाल आएगा।', display: 'Best formula: Role, Task, Context, Format. Chaaron likho, jawab kamaal aayega.', who: 'narrator' },
    { at: T(15, 0.2), text: 'बस! अब खुद ट्राई करो।', display: 'Bas! Ab khud try karo.', who: 'narrator' },
  ];
  const steps = [
    { key: 's1', n: 1, title: 'Open & sign in', color: '#0D8F6B' },
    { key: 's2', n: 2, title: 'Ask clearly', color: '#E0703E' },
    { key: 's3', n: 3, title: 'Refine', color: '#3D6FD8' },
    { key: 's4', n: 4, title: 'Files, photos, voice', color: '#B05AD0' },
    { key: 's5', n: 5, title: 'Verify facts', color: '#C23B5A' },
  ];
  const ev = { title: T(0, 1), s1: T(2), s2: T(4), s3: T(6), s4: T(8), s5: T(10), formula: T(12), end: T(15) };
  const markers = {
    s1: { t: ev.s1, sync: 'av' }, s2: { t: ev.s2, sync: 'av' }, s3: { t: ev.s3, sync: 'av' },
    s4: { t: ev.s4, sync: 'av' }, s5: { t: ev.s5, sync: 'av' }, formula: { t: ev.formula, sync: 'av' }, end: { t: ev.end, sync: 'av' },
  };
  const SCORE = { FPS, FORMAT, W, H, SAFE, DURATION, clock, T, BEAT, S, m, chords, chordAt, vo, steps, ev, markers };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
