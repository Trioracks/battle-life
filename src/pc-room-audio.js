const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vector=(v,fallback)=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v:fallback;

export function roomAudioParameters(frame){
 const {source,listener,right,desktop,occluded}=frame??{};
 if(desktop)return {gain:1,cutoffHz:18000,pan:0};
 const a=vector(source,[0,0,0]),b=vector(listener,a),r=vector(right,[1,0,0]);
 const direction=a.map((v,i)=>v-b[i]),distance=Math.hypot(...direction),rightLength=Math.hypot(...r);
 return {
  gain:Math.max(.02,1/(1+(distance/2)**2))*(occluded?.35:1),
  cutoffHz:Math.max(700,Math.max(1000,16000/(1+distance*.3))*(occluded?.25:1)),
  pan:distance&&rightLength?clamp(direction.reduce((sum,v,i)=>sum+v*r[i],0)/distance/rightLength,-1,1):0,
 };
}

// Slab intersection on the finite source→listener segment, not an infinite ray.
export function segmentIntersectsBox(source,listener,{min,max}){
 let enter=0,leave=1;
 for(let i=0;i<3;i++){
  const delta=listener[i]-source[i];
  if(Math.abs(delta)<1e-9){if(source[i]<min[i]||source[i]>max[i])return false;continue;}
  const a=(min[i]-source[i])/delta,b=(max[i]-source[i])/delta;
  enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));if(enter>leave)return false;
 }
 return true;
}

export function createPcRoomOutput(context){
 const lowpass=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner();let disposed=false;
 lowpass.type='lowpass';lowpass.Q.value=-3.0103;lowpass.frequency.value=Math.min(18000,context.sampleRate*.45);gain.gain.value=1;pan.pan.value=0;
 lowpass.connect(gain);gain.connect(pan);pan.connect(context.destination);
 return {input:lowpass,update(frame){
  if(disposed)return;const p=roomAudioParameters(frame),now=context.currentTime;
  lowpass.frequency.setTargetAtTime(Math.min(p.cutoffHz,context.sampleRate*.45),now,.1);
  gain.gain.setTargetAtTime(p.gain,now,.1);pan.pan.setTargetAtTime(p.pan,now,.1);
 },dispose(){if(disposed)return;disposed=true;for(const node of [lowpass,gain,pan])node.disconnect();}};
}
