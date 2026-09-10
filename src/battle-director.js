export const PERFORMANCE_SECONDS = 20;
export const GESTURE_STYLES = ['open-hands', 'shoulder-rock', 'crowd-turn', 'point'];

export function performanceStyleAt(elapsedSeconds, order) {
  const slotLength = PERFORMANCE_SECONDS / order.length;
  const slot = Math.min(order.length - 1, Math.floor(elapsedSeconds / slotLength));
  return order[slot];
}

export function shuffledStyles(random = Math.random) {
  const result = [...GESTURE_STYLES];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
