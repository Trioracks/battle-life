const cues = Object.freeze({
  speech: { id: 'speech', type: 'tick', frequency: 470, duration: .025, volume: .012 },
  footstep: { id: 'footstep', type: 'tick', frequency: 130, duration: .045 },
  computer: { id: 'computer', type: 'rise', frequency: 380, duration: .12 },
  'chair-scrape': { id: 'chair-scrape', type: 'noise', frequency: 96, duration: .17 },
  fridge: { id: 'fridge', type: 'tick', frequency: 190, duration: .08 },
  crunch: { id: 'crunch', type: 'filtered-noise', frequency: 1500, duration: .14, volume: .045 },
  cook: { id: 'cook', type: 'noise', frequency: 240, duration: .12 },
  dishes: { id: 'dishes', type: 'tick', frequency: 620, duration: .07 },
  sleep: { id: 'sleep', type: 'rise', frequency: 160, duration: .2 },
  mic: { id: 'mic', type: 'tick', frequency: 260, duration: .06 },
  door: { id: 'door', type: 'tick', frequency: 90, duration: .15 },
  notification: { id: 'notification', type: 'rise', frequency: 660, duration: .11 },
  'phone-vibrate': {id:'phone-vibrate',type:'vibration',frequency:88,duration:.4,volume:.012},
  install: { id: 'install', type: 'tick', frequency: 310, duration: .1 },
});

export function getSoundCue(id) {
  return cues[id] ? { ...cues[id] } : null;
}

export function playSoundCue(id, context = null) {
  const cue = getSoundCue(id);
  if (!cue || !context) return cue;
  if(cue.type==='filtered-noise'){
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*cue.duration),context.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(.7+.3*Math.sin(i/context.sampleRate*310));
    source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(cue.frequency,context.currentTime);filter.Q.setValueAtTime(.8,context.currentTime);
    gain.gain.setValueAtTime(cue.volume,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+cue.duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();source.stop(context.currentTime+cue.duration);
    return cue;
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = cue.type === 'noise' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(cue.frequency, context.currentTime);
  if (cue.type === 'rise') oscillator.frequency.exponentialRampToValueAtTime(cue.frequency * 1.35, context.currentTime + cue.duration);
  gain.gain.setValueAtTime(cue.volume??.035, context.currentTime);
  if(cue.type==='vibration'){
    gain.gain.setValueAtTime(.001,context.currentTime+.06);
    gain.gain.setValueAtTime(cue.volume,context.currentTime+.13);
    gain.gain.setValueAtTime(.001,context.currentTime+.19);
    gain.gain.setValueAtTime(cue.volume,context.currentTime+.26);
    gain.gain.setValueAtTime(.001,context.currentTime+.32);
  }
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + cue.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + cue.duration);
  return cue;
}
