const VARIANTS=[{tail:.095,cut:1050,pitch:110,gain:.030},{tail:.112,cut:930,pitch:103,gain:.027},{tail:.102,cut:1120,pitch:115,gain:.028},{tail:.123,cut:980,pitch:107,gain:.024}];
export function playIndoorFootstep(context,variantIndex=0){
 const c=context,v=VARIANTS[((Math.floor(variantIndex)%4)+4)%4],t=c.currentTime;
 const noise=c.createBufferSource(),filter=c.createBiquadFilter(),sole=c.createGain(),thump=c.createOscillator(),low=c.createGain();
 noise.buffer=c.createBuffer(1,Math.ceil(c.sampleRate*v.tail),c.sampleRate);const data=noise.buffer.getChannelData(0);let seed=1729+variantIndex*71;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 filter.type='lowpass';filter.frequency.setValueAtTime(v.cut,t);filter.Q.setValueAtTime(.55,t);
 sole.gain.setValueAtTime(.0001,t);sole.gain.linearRampToValueAtTime(v.gain,t+.014);sole.gain.exponentialRampToValueAtTime(.0001,t+v.tail);
 thump.type='sine';thump.frequency.setValueAtTime(v.pitch,t);thump.frequency.exponentialRampToValueAtTime(65,t+.08);low.gain.setValueAtTime(.0001,t);low.gain.linearRampToValueAtTime(.006,t+.016);low.gain.exponentialRampToValueAtTime(.0001,t+.095);
 noise.connect(filter).connect(sole).connect(c.destination);thump.connect(low).connect(c.destination);
 noise.onended=()=>{noise.disconnect();filter.disconnect();sole.disconnect();};thump.onended=()=>{thump.disconnect();low.disconnect();};
 noise.start(t);noise.stop(t+v.tail);thump.start(t);thump.stop(t+.12);
 return {stop(){try{noise.stop();thump.stop();}catch{}noise.onended();thump.onended();}};
}
