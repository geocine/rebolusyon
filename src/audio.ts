/** Tiny synthesized sound kit — no audio assets needed. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBurst(dur: number, freq: number, q: number, gain: number, when = 0) {
  const a = ac();
  if (!a || !master) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(master);
  src.start(a.currentTime + when);
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; when?: number; slide?: number } = {}) {
  const a = ac();
  if (!a || !master) return;
  const t0 = a.currentTime + (opts.when ?? 0);
  const osc = a.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  select() {
    noiseBurst(0.04, 3200, 2, 0.35);
  },
  deal() {
    for (let i = 0; i < 8; i++) noiseBurst(0.05, 2400 + Math.random() * 900, 1.4, 0.3, i * 0.055);
  },
  play(size: number) {
    for (let i = 0; i < Math.min(size, 5); i++) noiseBurst(0.06, 1800 + i * 160, 1.2, 0.5, i * 0.035);
    tone(140, 0.12, { type: 'triangle', gain: 0.25, when: 0.02 });
  },
  power() {
    tone(660, 0.18, { type: 'triangle', gain: 0.18 });
    tone(990, 0.3, { type: 'sine', gain: 0.14, when: 0.06 });
  },
  pass() {
    tone(420, 0.09, { type: 'square', gain: 0.05, slide: 300 });
  },
  clear() {
    noiseBurst(0.25, 900, 0.6, 0.25);
    tone(520, 0.12, { gain: 0.1, when: 0.05 });
  },
  turn() {
    tone(880, 0.08, { gain: 0.08 });
    tone(1320, 0.12, { gain: 0.06, when: 0.07 });
  },
  revolution() {
    tone(55, 1.6, { type: 'sawtooth', gain: 0.22, slide: 38 });
    tone(110, 1.4, { type: 'sine', gain: 0.3, slide: 80 });
    [392, 466, 587, 784].forEach((f, i) => tone(f, 0.7, { type: 'triangle', gain: 0.12, when: 0.25 + i * 0.09 }));
    noiseBurst(0.6, 300, 0.4, 0.5);
  },
  lastCard() {
    [0, 0.14].forEach((w) => tone(1046, 0.1, { type: 'square', gain: 0.06, when: w }));
  },
  error() {
    tone(180, 0.18, { type: 'square', gain: 0.07, slide: 120 });
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.45, { type: 'triangle', gain: 0.16, when: i * 0.1 }));
  },
  lose() {
    [392, 349, 311, 262].forEach((f, i) => tone(f, 0.4, { type: 'triangle', gain: 0.12, when: i * 0.14 }));
  },
};
