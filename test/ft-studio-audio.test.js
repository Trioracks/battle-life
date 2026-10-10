import test from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE_BRIEFS } from '../src/virtual-pc-catalog.js?rev=24';
import { createStudioProject, setArrangementCell, setStudioStep } from '../src/ft-studio-project.js?rev=24';
import { FtStudioAudio } from '../src/ft-studio-audio.js?rev=24';

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

test('native Window interval methods allow studio playback and Stop', async t => {
  let callback = null;
  t.mock.method(globalThis, 'setInterval', function (tick) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    callback = tick; return 1;
  });
  t.mock.method(globalThis, 'clearInterval', function () {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    callback = null;
  });
  const audio = new FtStudioAudio({ AudioContext: FakeAudioContext });
  const result = await audio.play(fourVoiceProject());
  assert.equal(result.ok, true);
  assert.equal(typeof callback, 'function');
  callback();
  assert.doesNotThrow(() => audio.stop());
  assert.equal(callback, null);
});

test('boot audio schedules short tones without starting the sequencer', async () => {
  const audio = new FtStudioAudio({ AudioContext: FakeAudioContext });
  assert.equal(typeof audio.playBoot, 'function');
  const result = await audio.playBoot();
  assert.equal(result.ok, true);
  assert.equal(audio.timer, null);
  assert.ok(audio.context.oscillators.length >= 2);
  assert.ok(audio.context.oscillators.every(node => node.started && node.stopped));
  await audio.dispose();
});

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

test('arrangement mask can make the eighth bar audible', async () => {
  const timers = [];
  const audio = new FtStudioAudio({
    AudioContext: FakeAudioContext,
    setIntervalFn(callback) { timers.push(callback); return callback; },
    clearIntervalFn() {},
  });
  let project = fourVoiceProject();
  for (const track of project.tracks) {
    for (let bar = 0; bar < 7; bar++) project = setArrangementCell(project, track.id, bar, false);
  }

  await audio.play(project);
  for (let tick = 0; tick < 112; tick++) timers[0]();

  assert.ok(audio.context.oscillators.length > 0, 'bar eight must schedule audible notes');
  audio.stop();
});

test('stopping while AudioContext resumes prevents delayed playback from starting', async () => {
  let resolveResume;
  class DeferredContext extends FakeAudioContext {
    resume() { return new Promise(resolve => { resolveResume = resolve; }); }
  }
  const timers = [];
  const audio = new FtStudioAudio({
    AudioContext: DeferredContext,
    setIntervalFn(callback) { timers.push(callback); return callback; },
    clearIntervalFn() {},
  });

  const pending = audio.play(fourVoiceProject());
  audio.stop();
  resolveResume();
  const result = await pending;

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stopped');
  assert.equal(timers.length, 0);
});
