import test from 'node:test';
import assert from 'node:assert/strict';
import { easeInOut, keyboardArmPose, seatPose, turnAngle } from '../src/animation-timing.js';

test('turning from either side passes through a camera-facing angle', () => {
  assert.ok(Math.abs(turnAngle(0, -Math.PI, .5) + Math.PI / 2) < .001);
  assert.ok(Math.abs(turnAngle(-Math.PI, 0, .5) + Math.PI / 2) < .001);
});

test('seat pose lowers the body and bends the legs gradually', () => {
  const standing = seatPose(0);
  const midway = seatPose(.5);
  const seated = seatPose(1);

  assert.equal(standing.bodyY, 0);
  assert.equal(standing.thighAngle, 0);
  assert.ok(midway.bodyY < 0 && midway.bodyY > seated.bodyY);
  assert.ok(midway.thighAngle > 0 && midway.thighAngle < seated.thighAngle);
  assert.equal(seated.bodyY, -.38);
  assert.ok(Math.abs(seated.thighAngle - Math.PI / 2) < .001);
});

test('easing begins and ends without a discontinuity', () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.ok(easeInOut(.5) > .49 && easeInOut(.5) < .51);
});

test('typing pose folds both elbows back so the wrists land on the keyboard plane', () => {
  const waiting = keyboardArmPose(0, 0);
  const typing = keyboardArmPose(1, .4);

  assert.ok(typing.frontShoulder > waiting.frontShoulder + 1);
  assert.ok(typing.backShoulder > waiting.backShoulder + 1);
  assert.ok(typing.frontElbow > 1.8);
  assert.ok(typing.backElbow > 1.8);
});
