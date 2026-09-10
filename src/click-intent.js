export function clickIntent({ hitComputer, worldX, worldY, actorX }) {
  if (hitComputer) return { type: 'computer' };
  if (Math.abs(worldX - actorX) < .8 && worldY < .65) return { type: 'face-camera' };
  return { type: 'walk', targetX: worldX };
}
