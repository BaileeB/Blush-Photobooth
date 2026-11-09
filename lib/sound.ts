let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => {
  muted = m;
};

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  const a = ac();
  if (!a || muted) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

export const sfx = {
  /** Menu cursor move. */
  move: () => tone(660, 0, 0.06, "square", 0.05),
  /** Menu select. */
  select: () => {
    tone(880, 0, 0.08);
    tone(1320, 0.08, 0.12);
  },
  /** Game start jingle. */
  start: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.14, "square", 0.07));
  },
  /** Countdown tick. */
  tick: () => tone(740, 0, 0.12, "triangle", 0.12),
  /** Last tick before the photo. */
  ready: () => tone(1180, 0, 0.2, "triangle", 0.14),
  /** Camera shutter, made from a short noise burst. */
  shutter: () => {
    const a = ac();
    if (!a || muted) return;
    const len = Math.floor(a.sampleRate * 0.12);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = a.createBufferSource();
    const g = a.createGain();
    g.gain.value = 0.35;
    src.buffer = buf;
    src.connect(g).connect(a.destination);
    src.start();
  },
  /** Strip finished. */
  done: () => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.18, "triangle", 0.09));
  },
};
