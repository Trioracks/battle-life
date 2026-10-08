import test from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE_BRIEFS } from '../src/virtual-pc-catalog.js';
import { createStudioProject, setStudioStep } from '../src/ft-studio-project.js';
import { FtStudioAudio } from '../src/ft-studio-audio.js';

class FakeParam {
  constructor() { this.values = []; }
  setValueAtTime(value) { this.values.push(value); }
  exponentialRampToValueAtTime(value) { this.values.push(value); }
}

class FakeNode {
  constructor() { this.connected = []; this.started = false; this.stopped = false; }
  connect(node) { this.connected.push(node); return node; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = {}; this.oscillators = []; this.closed = false; }
  async resume() {}
  async close() { this.closed = true; }
  createGain() { const node = new FakeNode(); node.gain = new FakeParam(); return node; }
  createOscillator() { const node = new FakeNode(); node.frequency = new FakeParam(); this.oscillators.push(node); return node; }
}

function fourVoiceProject() {
  let project = createStudioProject({ id: 'audio-demo', name: 'Звук', battleId: BATTLE_BRIEFS[0].id }).project;
  for (const id of ['kick', 'snare', 'hat', 'bass']) project = setStudioStep(project, id, 0, true);
  return project;
}

test('play schedules distinct audible voices for all four studio tracks', async () => {
  const timers = [];
  const audio = new FtStudioAudio({
    AudioContext: FakeAudioContext,
    setIntervalFn(callback) { timers.push(callback); return callback; },
    clearIntervalFn() {},
  });

  const result = await audio.play(fourVoiceProject());
  const frequencies = audio.context.oscillators.map(node => node.frequency.values[0]);

  assert.equal(result.ok, true);
  assert.equal(timers.length, 1);
  assert.deepEqual(frequencies, [88, 220, 6800, 55]);
  audio.stop();
});

test('audio failure reports an error without mutating the studio project', async () => {
  const project = fourVoiceProject();
  const before = JSON.stringify(project);
  const audio = new FtStudioAudio({ AudioContext: null });

  const result = await audio.play(project);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'audio-unavailable');
  assert.equal(JSON.stringify(project), before);
});

test('dispose stops scheduled playback and closes the audio context', async () => {
  let cleared = 0;
  const audio = new FtStudioAudio({
    AudioContext: FakeAudioContext,
    setIntervalFn(callback) { return callback; },
    clearIntervalFn() { cleared++; },
  });

  await audio.play(fourVoiceProject());
  const context = audio.context;
  await audio.dispose();

  assert.equal(cleared, 1);
  assert.equal(context.closed, true);
});
