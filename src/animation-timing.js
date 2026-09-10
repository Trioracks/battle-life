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
