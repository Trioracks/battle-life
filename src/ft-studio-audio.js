import { STUDIO_STEP_COUNT, normalizeStudioProject } from './ft-studio-project.js';

const voices = Object.freeze({ kick: 88, snare: 220, hat: 6800, bass: 55 });

export class FtStudioAudio {
  constructor(options = {}) {
    this.AudioContext = options.AudioContext === undefined ? globalThis.AudioContext : options.AudioContext;
    this.setIntervalFn = options.setIntervalFn ?? globalThis.setInterval;
    this.clearIntervalFn = options.clearIntervalFn ?? globalThis.clearInterval;
    this.context = null;
    this.timer = null;
    this.nodes = [];
    this.step = 0;
  }

  trigger(project, step) {
    const bar = Math.floor(step / STUDIO_STEP_COUNT) % 8;
    for (const track of project.tracks) {
      if (!track.steps[step] || !track.bars[bar]) continue;
      const gain = this.context.createGain();
      const oscillator = this.context.createOscillator();
      const time = this.context.currentTime;
      gain.gain.setValueAtTime(track.gain, time);
      gain.gain.exponentialRampToValueAtTime(.001, time + .12);
      oscillator.frequency.setValueAtTime(voices[track.id], time);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(time);
      oscillator.stop(time + .13);
      this.nodes.push(oscillator);
    }
  }

  async play(project) {
    const normalized = normalizeStudioProject(project);
    if (!normalized) return { ok: false, reason: 'invalid-project' };
    if (!this.AudioContext) return { ok: false, reason: 'audio-unavailable' };
    this.stop();
    try {
      this.context ??= new this.AudioContext();
      if (typeof this.context.resume === 'function') await this.context.resume();
      this.step = 0;
      this.trigger(normalized, this.step);
      const interval = 60000 / normalized.bpm / 4;
      this.timer = this.setIntervalFn(() => {
        this.step = (this.step + 1) % STUDIO_STEP_COUNT;
        this.trigger(normalized, this.step);
      }, interval);
      return { ok: true, reason: '' };
    } catch {
      this.stop();
      return { ok: false, reason: 'audio-unavailable' };
    }
  }

  stop() {
    if (this.timer !== null) this.clearIntervalFn(this.timer);
    this.timer = null;
    for (const node of this.nodes) {
      try { node.stop(); } catch { /* Already stopped. */ }
    }
    this.nodes = [];
  }

  async dispose() {
    this.stop();
    if (this.context?.close) await this.context.close();
    this.context = null;
  }
}
