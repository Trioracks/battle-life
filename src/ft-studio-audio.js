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
    this.position = 0;
    this.playbackId = 0;
  }

  async unlock() {
    if (!this.AudioContext) return { ok: false, reason: 'audio-unavailable' };
    try {
      this.context ??= new this.AudioContext();
      if (typeof this.context.resume === 'function') await this.context.resume();
      return { ok: true };
    } catch { return { ok: false, reason: 'audio-unavailable' }; }
  }

  async playBoot() {
    this.stop();
    const playbackId = this.playbackId;
    const unlocked = await this.unlock();
    if (!unlocked.ok) return unlocked;
    if (playbackId !== this.playbackId) return { ok: false, reason: 'stopped' };
    try {
      for (const [index, frequency] of [880, 1320].entries()) {
        const oscillator = this.context.createOscillator(), gain = this.context.createGain();
        const time = this.context.currentTime + index * .18;
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(.035, time);
        gain.gain.exponentialRampToValueAtTime(.001, time + .07);
        oscillator.connect(gain).connect(this.context.destination);
        oscillator.start(time); oscillator.stop(time + .08);
        this.nodes.push(oscillator);
        oscillator.onended = () => {
          this.nodes = this.nodes.filter(node => node !== oscillator);
          oscillator.disconnect?.(); gain.disconnect?.();
        };
      }
      return { ok: true };
    } catch { this.stop(); return { ok: false, reason: 'audio-unavailable' }; }
  }

  trigger(project, position) {
    const step = position % STUDIO_STEP_COUNT;
    const bar = Math.floor(position / STUDIO_STEP_COUNT) % 8;
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
      const release = () => { this.nodes = this.nodes.filter(node => node !== oscillator); };
      if (typeof oscillator.addEventListener === 'function') oscillator.addEventListener('ended', release, { once: true });
      else oscillator.onended = release;
    }
  }

  async play(project) {
    const normalized = normalizeStudioProject(project);
    if (!normalized) return { ok: false, reason: 'invalid-project' };
    if (!this.AudioContext) return { ok: false, reason: 'audio-unavailable' };
    this.stop();
    const playbackId = this.playbackId;
    try {
      this.context ??= new this.AudioContext();
      if (typeof this.context.resume === 'function') await this.context.resume();
      if (playbackId !== this.playbackId) return { ok: false, reason: 'stopped' };
      this.position = 0;
      this.trigger(normalized, this.position);
      const interval = 60000 / normalized.bpm / 4;
      this.timer = this.setIntervalFn(() => {
        this.position = (this.position + 1) % (STUDIO_STEP_COUNT * 8);
        this.trigger(normalized, this.position);
      }, interval);
      return { ok: true, reason: '' };
    } catch {
      this.stop();
      return { ok: false, reason: 'audio-unavailable' };
    }
  }

  stop() {
    this.playbackId++;
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
