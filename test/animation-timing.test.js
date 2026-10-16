import test from 'node:test';
import assert from 'node:assert/strict';
import { easeInOut, keyboardArmPose, seatPose, sideWalkPose, turnAngle } from '../src/animation-timing.js';

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

test('side walk swings arms and legs along the profile axis in opposite phases', () => {
  const right = sideWalkPose(Math.PI / 2, 1);
  const left = sideWalkPose(Math.PI / 2, -1);

  assert.equal(right.axis, 'x');
  assert.ok(right.frontLeg < 0);
  assert.ok(right.backLeg > 0);
  assert.ok(right.frontArm > 0);
  assert.ok(right.backArm < 0);
  assert.ok(left.frontLeg > 0);
  assert.ok(left.backLeg < 0);
  assert.ok(left.frontArm < 0);
  assert.ok(left.backArm > 0);
  assert.ok(right.frontKnee > 0);
  assert.equal(right.backKnee, 0);
});

test('side walk has a neutral frame between strides', () => {
  const pose = sideWalkPose(0, 1);

  for (const value of [pose.frontLeg, pose.backLeg, pose.frontKnee, pose.backKnee, pose.frontArm, pose.backArm]) {
    assert.equal(value, 0);
  }
});

test('side walk alternates the leading limb across a complete four-keyframe stride', () => {
  const frames = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2, Math.PI * 2]
    .map((phase) => sideWalkPose(phase, 1));

  assert.deepEqual(frames.map((frame) => Math.sign(frame.frontLeg)), [0, -1, 0, 1, 0]);
  assert.deepEqual(frames.map((frame) => Math.sign(frame.backLeg)), [0, 1, 0, -1, 0]);
  assert.deepEqual(frames.map((frame) => Math.sign(frame.frontArm)), [0, 1, 0, -1, 0]);
  assert.deepEqual(frames.map((frame) => Math.sign(frame.backArm)), [0, -1, 0, 1, 0]);
});
