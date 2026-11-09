"use client";

import { ac } from "./sound";

/**
 * Background music made live with the Web Audio API. Every song is an original
 * chiptune loop, so there are no audio files to download.
 */

type Track = {
  id: string;
  name: string;
  mood: string;
  bpm: number;
  /** 0 = straight, 0.2 = lazy swing. */
  swing: number;
  /** One chord per bar. */
  prog: string[];
  /** Lead melody in 8th notes, "-" is a rest. */
  lead: string;
  leadWave: OscillatorType | "bell";
  /** Play the lead every Nth time through the progression. */
  leadEvery: number;
  /** Bass per 16th: x root, o octave up, 5 fifth, . rest. */
  bass: string;
  bassWave: OscillatorType;
  /** Arpeggio per 16th: chord tone index 0-3, . rest. */
  arp: string;
  arpWave: OscillatorType;
  pad: boolean;
  kick: string;
  snare: string;
  hat: string;
  /** Overall low-pass cutoff, lower is warmer. */
  tone: number;
};

export const TRACKS: Track[] = [
  {
    id: "bubblegum",
    name: "Bubblegum Pop",
    mood: "bright and bouncy",
    bpm: 116,
    swing: 0,
    prog: ["C", "G", "Am", "F"],
    lead: "E5 G5 C6 G5 A5 G5 E5 - D5 G5 B5 G5 A5 G5 D5 - C5 E5 A5 E5 G5 E5 C5 - A4 C5 F5 A5 G5 F5 E5 D5",
    leadWave: "square",
    leadEvery: 1,
    bass: "x...x.o.x...x.o.",
    bassWave: "triangle",
    arp: "0.1.2.1.0.1.2.1.",
    arpWave: "triangle",
    pad: false,
    kick: "x...x...x...x...",
    snare: "....x.......x...",
    hat: "..x...x...x...x.",
    tone: 5200,
  },
  {
    id: "lofi",
    name: "Lo-fi Blush",
    mood: "chill study vibes",
    bpm: 78,
    swing: 0.18,
    prog: ["Dm", "G", "C", "Am"],
    lead: "A5 - F5 - - - D5 - B4 - D5 G5 - - F5 - E5 - G5 - C6 - B5 - A5 - - E5 - - C5 -",
    leadWave: "bell",
    leadEvery: 2,
    bass: "x.......x.....5.",
    bassWave: "sine",
    arp: "................",
    arpWave: "sine",
    pad: true,
    kick: "x.....x...x.....",
    snare: "....x.......x...",
    hat: "x.x.x.x.x.x.x.x.",
    tone: 1800,
  },
  {
    id: "arcade",
    name: "Arcade Crush",
    mood: "fast and sparkly",
    bpm: 140,
    swing: 0,
    prog: ["Am", "F", "C", "G"],
    lead: "A5 - C6 - B5 A5 G5 E5 F5 - A5 - C6 - A5 G5 E5 - G5 - C6 - G5 E5 D5 - G5 - B5 - D6 -",
    leadWave: "square",
    leadEvery: 1,
    bass: "x.o.x.o.x.o.x.o.",
    bassWave: "square",
    arp: "0123012301230123",
    arpWave: "square",
    pad: false,
    kick: "x...x...x...x...",
    snare: "....x.......x..x",
    hat: "xxxxxxxxxxxxxxxx",
    tone: 6500,
  },
  {
    id: "sakura",
    name: "Sakura Dream",
    mood: "soft and floaty",
    bpm: 92,
    swing: 0.08,
    prog: ["F", "C", "G", "Am"],
    lead: "C6 - A5 - G5 - - - E5 - G5 - A5 - - - D5 - E5 - G5 - C6 - A5 - G5 - E5 - - -",
    leadWave: "bell",
    leadEvery: 1,
    bass: "x.......x.......",
    bassWave: "sine",
    arp: "0..2..1..3..2...",
    arpWave: "triangle",
    pad: true,
    kick: "x.......x.......",
    snare: "................",
    hat: "....x.......x...",
    tone: 3000,
  },
];

// ---------- note helpers ----------

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(n: string) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  if (!m) return null;
  let v = NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  v += (Number(m[3]) + 1) * 12;
  return v;
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Chord tones (as MIDI notes around octave 4) for names like "C", "Am", "F#m". */
function chordTones(name: string) {
  const m = /^([A-G])(#|b)?(m)?$/.exec(name)!;
  const root = 48 + NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const third = m[3] ? 3 : 4;
  return [root, root + third, root + 7, root + 12];
}

// ---------- engine ----------

type Listener = () => void;

export type MusicState = { playing: boolean; trackIndex: number; volume: number };

class MusicEngine {
  state: MusicState = { playing: false, trackIndex: 0, volume: 0.5 };
  private listeners = new Set<Listener>();
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("blush-music") ?? "{}");
      if (typeof saved.trackIndex === "number") this.state.trackIndex = saved.trackIndex % TRACKS.length;
      if (typeof saved.volume === "number") this.state.volume = saved.volume;
      if (saved.off) this.wantsOff = true;
    } catch {}
  }

  /** The player turned music off before, so don't start it on our own. */
  wantsOff = false;

  get track() {
    return TRACKS[this.state.trackIndex];
  }

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.state;

  private set(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    localStorage.setItem(
      "blush-music",
      JSON.stringify({ trackIndex: this.state.trackIndex, volume: this.state.volume, off: this.wantsOff }),
    );
    this.listeners.forEach((l) => l());
  }

  private setup() {
    const a = ac();
    if (!a) return null;
    if (!this.master) {
      this.filter = a.createBiquadFilter();
      this.filter.type = "lowpass";
      this.master = a.createGain();
      this.master.gain.value = this.state.volume * 0.5;
      this.filter.connect(this.master).connect(a.destination);
      const len = a.sampleRate;
      this.noise = a.createBuffer(1, len, a.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    this.filter!.frequency.value = this.track.tone;
    return a;
  }

  /** Start music after a click or key press, unless the player turned it off before. */
  autoStart() {
    if (!this.wantsOff && !this.state.playing) this.play();
  }

  play() {
    const a = this.setup();
    if (!a) return;
    this.wantsOff = false;
    if (this.timer) clearInterval(this.timer);
    this.step = 0;
    this.nextTime = a.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 25);
    this.set({ playing: true });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.wantsOff = true;
    this.set({ playing: false });
  }

  toggle() {
    if (this.state.playing) this.stop();
    else this.play();
  }

  setTrack(i: number) {
    const n = (i + TRACKS.length) % TRACKS.length;
    this.set({ trackIndex: n });
    if (this.filter) this.filter.frequency.value = this.track.tone;
    this.play();
  }

  next() {
    this.setTrack(this.state.trackIndex + 1);
  }

  prev() {
    this.setTrack(this.state.trackIndex - 1);
  }

  setVolume(v: number) {
    if (this.master) this.master.gain.value = v * 0.5;
    this.set({ volume: v });
  }

  private tick() {
    const a = ac();
    if (!a) return;
    const t = this.track;
    const sixteenth = 60 / t.bpm / 4;
    while (this.nextTime < a.currentTime + 0.12) {
      this.schedule(this.step, this.nextTime, sixteenth);
      // swing pushes every second 16th a little later
      const swingOffset = this.step % 2 === 0 ? t.swing * sixteenth : -t.swing * sixteenth;
      this.nextTime += sixteenth + swingOffset;
      this.step++;
    }
  }

  private schedule(step: number, time: number, sixteenth: number) {
    const t = this.track;
    const s = step % 16;
    const barCount = t.prog.length;
    const bar = Math.floor(step / 16) % barCount;
    const loop = Math.floor(step / (16 * barCount));
    const chord = chordTones(t.prog[bar]);

    if (t.kick[s] === "x") this.kick(time);
    if (t.snare[s] === "x") this.snare(time);
    if (t.hat[s] === "x") this.hat(time, s % 4 === 2 ? 0.05 : 0.03);

    const b = t.bass[s];
    if (b !== ".") {
      const midi = chord[0] - 12 + (b === "o" ? 12 : b === "5" ? 7 : 0);
      this.voice(freq(midi), time, sixteenth * 1.8, t.bassWave, 0.22);
    }

    const ap = t.arp[s];
    if (ap !== ".") {
      const midi = chord[Number(ap)] + 12;
      this.voice(freq(midi), time, sixteenth * 0.9, t.arpWave, 0.06);
    }

    if (t.pad && s === 0) {
      chord.slice(0, 3).forEach((m) => this.pad(freq(m + 12), time, sixteenth * 16));
    }

    // lead plays on 8th notes
    if (s % 2 === 0 && loop % t.leadEvery === 0) {
      const tokens = t.lead.split(/\s+/);
      const tok = tokens[(Math.floor(step / 2) % tokens.length)];
      const midi = tok && tok !== "-" ? noteToMidi(tok) : null;
      if (midi !== null) {
        if (t.leadWave === "bell") this.bell(freq(midi), time);
        else this.voice(freq(midi), time, sixteenth * 1.7, t.leadWave, 0.07);
      }
    }
  }

  // ---------- instruments ----------

  private out() {
    return this.filter!;
  }

  private voice(f: number, time: number, dur: number, type: OscillatorType, vol: number) {
    const a = ac()!;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(this.out());
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  private bell(f: number, time: number) {
    const a = ac()!;
    [1, 2.01].forEach((mult, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.frequency.value = f * mult;
      const vol = i === 0 ? 0.12 : 0.04;
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
      o.connect(g).connect(this.out());
      o.start(time);
      o.stop(time + 1);
    });
  }

  private pad(f: number, time: number, dur: number) {
    const a = ac()!;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    o.detune.value = Math.random() * 10 - 5;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.035, time + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(this.out());
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  private kick(time: number) {
    const a = ac()!;
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.setValueAtTime(140, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    o.connect(g).connect(this.out());
    o.start(time);
    o.stop(time + 0.2);
  }

  private noiseHit(time: number, dur: number, vol: number, hp: number) {
    const a = ac()!;
    const src = a.createBufferSource();
    src.buffer = this.noise;
    const f = a.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f).connect(g).connect(this.out());
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.02);
  }

  private snare(time: number) {
    this.noiseHit(time, 0.14, 0.18, 1200);
  }

  private hat(time: number, vol: number) {
    this.noiseHit(time, 0.04, vol, 7000);
  }
}

export const music = new MusicEngine();
