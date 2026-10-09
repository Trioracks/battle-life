const VARIANTS=[{tail:.115,cut:740,pitch:76,gain:.13},{tail:.132,cut:620,pitch:69,gain:.115},{tail:.122,cut:810,pitch:81,gain:.12},{tail:.143,cut:680,pitch:72,gain:.105}];
export function playIndoorFootstep(context,variantIndex=0){
 const c=context,v=VARIANTS[((Math.floor(variantIndex)%4)+4)%4],t=c.currentTime;
 const noise=c.createBufferSource(),filter=c.createBiquadFilter(),sole=c.createGain(),thump=c.createOscillator(),low=c.createGain();
 noise.buffer=c.createBuffer(1,Math.ceil(c.sampleRate*v.tail),c.sampleRate);const data=noise.buffer.getChannelData(0);let seed=1729+variantIndex*71;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 filter.type='lowpass';filter.frequency.setValueAtTime(v.cut,t);filter.Q.setValueAtTime(.55,t);
 sole.gain.setValueAtTime(.0001,t);sole.gain.linearRampToValueAtTime(v.gain,t+.008);sole.gain.exponentialRampToValueAtTime(.0001,t+v.tail);
 thump.type='sine';thump.frequency.setValueAtTime(v.pitch,t);thump.frequency.exponentialRampToValueAtTime(40,t+.1);low.gain.setValueAtTime(.0001,t);low.gain.linearRampToValueAtTime(.045,t+.009);low.gain.exponentialRampToValueAtTime(.0001,t+.115);
 noise.connect(filter).connect(sole).connect(c.destination);thump.connect(low).connect(c.destination);
 noise.onended=()=>{noise.disconnect();filter.disconnect();sole.disconnect();};thump.onended=()=>{thump.disconnect();low.disconnect();};
 noise.start(t);noise.stop(t+v.tail);thump.start(t);thump.stop(t+.12);
 return {stop(){try{noise.stop();thump.stop();}catch{}noise.onended();thump.onended();}};
}
