// Tiny Web Audio synthesiser: procedural background music + UI/game sound effects.
// No audio files are needed, which keeps the package self-contained.

import { Settings } from '../state/Settings.js';

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let musicTimer = null;
let nextBarTime = 0;
let barIndex = 0;

const MUSIC_VOL = 0.11;
const SFX_VOL = 0.35;

function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = Settings.get('music') ? MUSIC_VOL : 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  musicBus.connect(lp);
  lp.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = Settings.get('sfx') ? SFX_VOL : 0;
  sfxBus.connect(master);
  return ctx;
}

function tone({ freq, type = 'sine', start = 0, dur = 0.15, vol = 0.5, attack = 0.005, freqEnd = null, bus = sfxBus }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// ---- music -----------------------------------------------------------------
// Calm, slightly industrial loop: Am - F - C - G pads with a soft arpeggio.
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const BEAT = 60 / 76;

function scheduleBar(time, chord) {
  const barLen = BEAT * 4;
  // pad
  for (const n of chord) {
    for (const detune of [-4, 4]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = midi(n);
      osc.detune.value = detune;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.12, time + 0.8);
      g.gain.setValueAtTime(0.12, time + barLen - 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, time + barLen + 0.4);
      osc.connect(g);
      g.connect(musicBus);
      osc.start(time);
      osc.stop(time + barLen + 0.5);
    }
  }
  // bass
  const bass = ctx.createOscillator();
  const bg = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.value = midi(chord[0] - 12);
  bg.gain.setValueAtTime(0.0001, time);
  bg.gain.exponentialRampToValueAtTime(0.25, time + 0.05);
  bg.gain.exponentialRampToValueAtTime(0.0001, time + barLen);
  bass.connect(bg);
  bg.connect(musicBus);
  bass.start(time);
  bass.stop(time + barLen + 0.1);
  // arpeggio (8th notes, sparse)
  const pattern = [0, 1, 2, 1, 2, 0, 1, 2];
  pattern.forEach((idx, i) => {
    if (i % 3 === 2 && (barIndex % 2 === 1)) return;
    const t = time + i * (BEAT / 2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midi(chord[idx] + 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(g);
    g.connect(musicBus);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

function musicTick() {
  if (!ctx) return;
  while (nextBarTime < ctx.currentTime + 0.5) {
    scheduleBar(nextBarTime, CHORDS[barIndex % CHORDS.length]);
    nextBarTime += BEAT * 4;
    barIndex++;
  }
}

export const Sound = {
  /** Must be called from a user gesture (browsers block audio before interaction). */
  unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!musicTimer) {
      nextBarTime = ctx.currentTime + 0.1;
      musicTimer = setInterval(musicTick, 200);
      musicTick();
    }
  },

  applySettings() {
    if (!ctx) return;
    const now = ctx.currentTime;
    musicBus.gain.setTargetAtTime(Settings.get('music') ? MUSIC_VOL : 0, now, 0.2);
    sfxBus.gain.setTargetAtTime(Settings.get('sfx') ? SFX_VOL : 0, now, 0.05);
  },

  play(name) {
    if (!ctx || !Settings.get('sfx')) return;
    switch (name) {
      case 'click':
        tone({ freq: 880, type: 'square', dur: 0.05, vol: 0.12 });
        break;
      case 'hover':
        tone({ freq: 1200, type: 'sine', dur: 0.03, vol: 0.05 });
        break;
      case 'open':
        tone({ freq: 520, freqEnd: 780, type: 'sine', dur: 0.12, vol: 0.2 });
        break;
      case 'close':
        tone({ freq: 700, freqEnd: 460, type: 'sine', dur: 0.12, vol: 0.18 });
        break;
      case 'correct':
        tone({ freq: 660, type: 'triangle', dur: 0.14, vol: 0.35 });
        tone({ freq: 990, type: 'triangle', start: 0.1, dur: 0.22, vol: 0.35 });
        break;
      case 'wrong':
        tone({ freq: 190, freqEnd: 120, type: 'sawtooth', dur: 0.32, vol: 0.22 });
        tone({ freq: 196, freqEnd: 125, type: 'square', dur: 0.32, vol: 0.08 });
        break;
      case 'points':
        tone({ freq: 988, type: 'square', dur: 0.08, vol: 0.1 });
        tone({ freq: 1319, type: 'square', start: 0.07, dur: 0.2, vol: 0.1 });
        break;
      case 'unlock':
        [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.09, dur: 0.25, vol: 0.28 }));
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) tone({ freq: 620, freqEnd: 1040, type: 'sawtooth', start: i * 0.42, dur: 0.38, vol: 0.12 });
        break;
      case 'siren':
        tone({ freq: 700, freqEnd: 950, type: 'sawtooth', dur: 1.2, vol: 0.12 });
        break;
      case 'phone':
        for (let i = 0; i < 4; i++) tone({ freq: i % 2 ? 1320 : 1760, type: 'square', start: i * 0.09, dur: 0.08, vol: 0.08 });
        break;
      case 'step':
        tone({ freq: 120, freqEnd: 80, type: 'sine', dur: 0.06, vol: 0.08 });
        break;
      case 'type':
        tone({ freq: 1500 + Math.random() * 300, type: 'sine', dur: 0.015, vol: 0.025 });
        break;
      case 'horn':
        tone({ freq: 330, type: 'sawtooth', dur: 0.35, vol: 0.12 });
        tone({ freq: 415, type: 'sawtooth', dur: 0.35, vol: 0.1 });
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.12, dur: 0.4, vol: 0.3 }));
        break;
      default:
        break;
    }
  },
};

Settings.onChange(() => Sound.applySettings());
