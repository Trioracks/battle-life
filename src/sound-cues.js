const cues = Object.freeze({
  footstep: { id: 'footstep', type: 'tick', frequency: 130, duration: .045 },
  computer: { id: 'computer', type: 'rise', frequency: 380, duration: .12 },
  fridge: { id: 'fridge', type: 'tick', frequency: 190, duration: .08 },
  cook: { id: 'cook', type: 'noise', frequency: 240, duration: .12 },
  dishes: { id: 'dishes', type: 'tick', frequency: 620, duration: .07 },
  sleep: { id: 'sleep', type: 'rise', frequency: 160, duration: .2 },
  mic: { id: 'mic', type: 'tick', frequency: 260, duration: .06 },
  door: { id: 'door', type: 'tick', frequency: 90, duration: .15 },
  notification: { id: 'notification', type: 'rise', frequency: 660, duration: .11 },
  install: { id: 'install', type: 'tick', frequency: 310, duration: .1 },
});

export function getSoundCue(id) {
  return cues[id] ? { ...cues[id] } : null;
}

export function playSoundCue(id, context = null) {
  const cue = getSoundCue(id);
  if (!cue || !context) return cue;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = cue.type === 'noise' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(cue.frequency, context.currentTime);
  if (cue.type === 'rise') oscillator.frequency.exponentialRampToValueAtTime(cue.frequency * 1.35, context.currentTime + cue.duration);
  gain.gain.setValueAtTime(.035, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + cue.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + cue.duration);
  return cue;
}
