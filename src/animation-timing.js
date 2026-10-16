export function easeInOut(progress) {
  const clamped = Math.min(1, Math.max(0, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

export function turnAngle(startAngle, endAngle, progress) {
  return startAngle + (endAngle - startAngle) * easeInOut(progress);
}

export function seatPose(progress) {
  const eased = easeInOut(progress);
  return {
    bodyY: eased === 0 ? 0 : -.38 * eased,
    thighAngle: (Math.PI / 2) * eased,
    shinAngle: -(Math.PI / 2) * eased,
    torsoLean: -.16 * eased,
  };
}

export function keyboardArmPose(progress, rhythm) {
  const reach = easeInOut(progress);
  const tap = Math.sin(rhythm) * .07 * reach;
  return {
    frontShoulder: .08 + 1.12 * reach + tap,
    backShoulder: .02 + 1.03 * reach - tap,
    frontElbow: 2.18 * reach - tap * .45,
    backElbow: 2.06 * reach + tap * .45,
  };
}

// In the apartment the actor turns the complete mesh 90° around Y to walk left
// or right. A limb therefore needs to swing about its local X axis: that maps
// to the horizontal screen plane after the actor turns. Rotating about Z would
// instead move the limb into scene depth and read as an unwanted vertical lift.
export function sideWalkPose(phase, facing) {
  const rawStride = Math.sin(phase) * .58;
  const stride = Math.abs(rawStride) < 1e-9 ? 0 : rawStride;
  const direction = facing >= 0 ? 1 : -1;
  const frontLeg = stride === 0 ? 0 : -stride * direction;
  const backLeg = stride === 0 ? 0 : stride * direction;

  return {
    axis: 'x',
    frontLeg,
    backLeg,
    frontKnee: Math.max(0, -frontLeg) * .55,
    backKnee: Math.max(0, -backLeg) * .55,
    frontArm: frontLeg === 0 ? 0 : -frontLeg * .58,
    backArm: backLeg === 0 ? 0 : -backLeg * .58,
  };
}
