import test from 'node:test';
import assert from 'node:assert/strict';
import { ApartmentMotion } from '../src/apartment-v3-motion.js';
import { ApartmentTime } from '../src/apartment-v3-time.js?rev=28';
import { advanceComputerHomeFrame } from '../src/apartment-v3-runtime.js?rev=28';
import { createVirtualPcState, setPcPower, startFtDownload } from '../src/virtual-pc-state.js?rev=28';

const config = {
  bounds: [-2, 2], spawn: [0, 0, .8], speed: 1, doorX: 0,
  actions: {
    computer: { approach: [0, 0, .8], pose: [0, 0, .2], yaw: 0, clip: 'seated', fade: false, duration: .05 },
    bed: { approach: [1, 0, .8], pose: [1, .4, 0], yaw: 0, clip: 'sleep', fade: true, duration: 5 },
  },
};

function downloadingPc(snapshot = {}) {
  return createVirtualPcState({...snapshot,power:'on',download:{status:'downloading',receivedBytes:0}});
}

test('computer overlay becomes eligible only at the seated started event and holds the seated action', () => {
  const motion = new ApartmentMotion(config);
  const clock = new ApartmentTime({ day: 1, minutes: 720 });
  let pc = downloadingPc();
  motion.actionId = 'computer';
  motion.startPerform();

  const seated = advanceComputerHomeFrame(motion, clock, pc, .01, false);
  pc = seated.pcState;
  assert.equal(seated.computerStarted, true);
  assert.equal(seated.computerSeated, true);
  assert.equal(motion.phase, 'perform');

  for (let frame = 0; frame < 240; frame++) pc = advanceComputerHomeFrame(motion, clock, pc, 1 / 60, true).pcState;
  assert.equal(motion.phase, 'perform');
  assert.equal(motion.actionId, 'computer');
  assert.ok(pc.download.receivedBytes > 0);
});

test('leaving a held computer resumes the existing apartment return transition', () => {
  const motion = new ApartmentMotion(config);
  const clock = new ApartmentTime({ day: 1, minutes: 720 });
  let pc = downloadingPc();
  motion.actionId = 'computer';
  motion.startPerform();
  advanceComputerHomeFrame(motion, clock, pc, .01, false);
  motion.leaveAction();

  for (let frame = 0; frame < 90; frame++) pc = advanceComputerHomeFrame(motion, clock, pc, 1 / 60, false).pcState;
  assert.equal(motion.actionId, null);
  assert.equal(motion.phase, 'idle');
});

test('the same apartment clock advances a powered download during sleep without a second timer', () => {
  const motion = new ApartmentMotion(config);
  const clock = new ApartmentTime({ day: 1, minutes: 600 });
  let pc = downloadingPc({ lastGameMinute: 600 });
  motion.startSleeping();
  clock.beginSleep({ minutes: 480, seconds: 4 });

  for (let frame = 0; frame < 240; frame++) pc = advanceComputerHomeFrame(motion, clock, pc, 1 / 60, false).pcState;

  assert.equal(clock.label, '18:00');
  assert.equal(pc.download.status, 'ready-to-install');
  assert.equal(pc.lastGameMinute, (clock.day - 1) * 1440 + clock.minutes);
});
