import {normalizeBeatResult} from './beat-result.js?rev=43';
import {creativeProfileAmount} from './audio-performance.js?rev=43';
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const mod=(x,n)=>((x%n)+n)%n;
const sample=(a,t)=>{const i=Math.floor(t),f=t-i;return a[mod(i,a.length)]*(1-f)+a[mod(i+1,a.length)]*f;};
const severity=q=>clamp((100-q)/100);
// Grain centres follow the original timeline. Only each grain's read pitch changes.
function detune(a,rate,cents,phase){
 const out=new Float32Array(a.length),weight=new Float32Array(a.length),size=Math.round(rate*.08),hop=Math.max(1,Math.round(size/4)),half=Math.floor(size/2);
 for(let centre=-half;centre<a.length+half;centre+=hop){
  const ratio=2**((cents+Math.abs(cents)*.2*Math.sin(centre/rate*5.4+phase))/1200);
  for(let j=0;j<size;j++){
   const i=centre+j-half;if(i<0||i>=a.length)continue;
   const w=.5-.5*Math.cos(2*Math.PI*j/(size-1));out[i]+=sample(a,centre+(j-half)*ratio)*w;weight[i]+=w;
  }
 }
 for(let i=0;i<a.length;i++)out[i]/=weight[i]||1;return out;
}
const random=(seed,cell,salt=0)=>{let x=(seed^Math.imul(cell+1,374761393)^Math.imul(salt+1,668265263))>>>0;x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;};
// Monotonic time warp: a novice hit moves once, never becomes repeated slices.
// The endpoints stay fixed to four bars, even at fractional frame rates.
export function transformBeatSamples(input,rate,value){
 const r=normalizeBeatResult(value);if(!r||!input.length||!Number.isFinite(rate)||rate<1000)return input;
 const creative=creativeProfileAmount(r.genreProfile,r.skills.beatmaking,value.postGain);
 // Archived layers predate genre snapshots and always bypassed slicing at 100+.
 if(r.quality>=100&&(!r.genreProfile||!creative))return input;
 const amount=severity(r.quality),rough=clamp((30-r.quality)/25),medium=clamp((100-r.quality)/70),kind=r.stage,skill=r.skills.beatmaking;
 const pitch=(kind===1?85:-120)*medium+(kind===1?100:-140)*rough;
 const a=kind?detune(input,rate,pitch*(.85+.15*(1-skill/100)),r.seed%17):input;
 const out=new Float32Array(a.length),step=rate/6,count=Math.ceil(a.length/step),edge=Math.max(1,rate*.003);
 const jitter=Math.min(step*.42,rate*(.009+.085*(1-skill/100))*amount**1.5);
 const boundaries=Array.from({length:count+1},(_,s)=>s===0?0:s===count?a.length:s*step+(random(r.seed,s,kind)-.5)*2*jitter);
 let cell=0;
 for(let i=0;i<out.length;i++){
  while(cell<count-1&&i>=boundaries[cell+1])cell++;
  const f=(i-boundaries[cell])/(boundaries[cell+1]-boundaries[cell]);
  const sourceStart=cell*step,sourceEnd=Math.min(a.length,(cell+1)*step);
  const cursor=sourceStart+f*(sourceEnd-sourceStart);
  const strength=amount*.45,level=1-strength*(random(r.seed,cell,8)*(1-f)+random(r.seed,cell+1,8)*f);
  let v=sample(a,cursor)*level;
  if(creative>0){
   const s=Math.floor(i/step),local=i-s*step;
   if(s%16===15||s%32===22){
    const grain=step/2,offset=local%grain,envelope=clamp(Math.min(offset/edge,(grain-offset)/edge));
    const wet=creative*[.22,.14,.10][kind];
    v=v*(1-wet)+sample(a,s*step+offset)*envelope*wet;
   }
  }
  const seam=amount?Math.min(1,i/(rate*.002*amount),(out.length-1-i)/(rate*.002*amount)):1;
  out[i]=seam===0?0:clamp(v,-1,1)*seam;
 }
 return out;
}

export function transformBeatBuffer(context,buffer,result,seconds){
 const r=normalizeBeatResult(result);
 if(!r||r.quality>=100&&(!r.genreProfile||!creativeProfileAmount(r.genreProfile,r.skills.beatmaking,result.postGain)))return buffer;
 const length=Math.round(seconds*buffer.sampleRate),out=context.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);
 for(let ch=0;ch<buffer.numberOfChannels;ch++){
  // MP3 encoders may pad; the saved musical loop is the only timeline transformed.
  const original=buffer.getChannelData(ch),data=new Float32Array(length);
  data.set(original.subarray(0,length));out.copyToChannel(transformBeatSamples(data,buffer.sampleRate,result),ch);
 }
 return out;
}

function disposable(nodes,input){return {input,dispose(){for(const n of nodes){try{n.disconnect();}catch{/* Already released. */}}}};}
// One graph per layer. All delay feedback is below unity, and all nodes are owned.
export function connectBeatResult(context,value,destination){
 const r=normalizeBeatResult(value),post=Number.isFinite(value?.postGain)?clamp(value.postGain,0,4):0;if(!r||r.quality===100&&!post)return disposable([],destination);
 const nodes=[],make=method=>{const n=context[method]();nodes.push(n);return n;};
 try{
  const amount=severity(r.quality),buff=clamp((r.quality-100)/10),kind=r.stage,rough=clamp((30-r.quality)/25),medium=clamp((100-r.quality)/70),creative=creativeProfileAmount(r.genreProfile,r.skills.beatmaking,post);
  const colour=amount*(.8+.2*(1-r.skills.sound/100)),input=make('createGain');
  const hp=make('createBiquadFilter');hp.type='highpass';hp.frequency.value=20+([200,280,15][kind]*medium+[400,550,0][kind]*rough)*(.8+.2*(1-r.skills.sound/100));hp.Q.value=-3.0103;
  const lp=make('createBiquadFilter');lp.type='lowpass';lp.frequency.value=Math.min(context.sampleRate*.45,20000/(1+[3,2,11][kind]*colour+[2,4,10][kind]*rough));lp.Q.value=-3.0103;
  const shape=make('createWaveShaper'),drive=1+[2,1,3][kind]*colour,crush=creative*.12;
  shape.curve=Float32Array.from({length:65537},(_,i)=>{const x=i/32768-1,y=clamp(x*drive,-.85,.85)/drive,quantized=Math.round(y*128)/128;return x*(1-colour)+(y*(1-crush)+quantized*crush)*colour;});
  shape.oversample='none';
  // Partial fixed EQ makeup, not per-track normalization. Removing the old
  // distortion gain must not leave the whole beat inaudible beneath the voice.
  const balance=make('createGain');balance.gain.value=medium*(1+[3,1.3,1.1][kind]*colour)/[1+.3*colour,1+.15*colour,1+.6*colour][kind];
  if(buff){
   // Small musical lift: no damaged pitch, lost hits, overdrive or feedback.
   const eq=make('createBiquadFilter');eq.type='highshelf';eq.frequency.value=2500;eq.gain.value=.8*buff;
   input.connect(eq);eq.connect(destination);
  }else{
   // Crossfade the entire coloured path: even a 20 Hz HP changes bass phase.
   // Its phase must disappear with the defect instead of jumping at exactly 100.
   const dry=make('createGain');dry.gain.value=1-medium;input.connect(dry);dry.connect(destination);
   input.connect(hp);hp.connect(shape);shape.connect(lp);lp.connect(balance);balance.connect(destination);
  }
  const echo=(buff?.025*buff:creative*[.075,.11,.045][kind])+post*[.006,.009,.004][kind];
  if(echo>0){
   const delay=make('createDelay'),feedback=make('createGain'),wet=make('createGain');
   delay.delayTime.value=post?1/3:[1/6,1/3,1/3][kind];feedback.gain.value=buff?0:.08+.08*creative;wet.gain.value=echo;
   (buff||r.quality===100?input:balance).connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(destination);
  }
  return disposable(nodes,input);
 }catch(error){disposable(nodes).dispose();throw error;}
}

export function connectBeatResultMaster(context,destination){
 const limiter=context.createWaveShaper();
 // Exactly linear across normal levels, asymptotic ceiling at .98 for hot sums.
 limiter.curve=Float32Array.from({length:65537},(_,i)=>{const x=i/32768-1,a=Math.abs(x);return a<=.85?x:Math.sign(x)*(.85+.13*Math.tanh((a-.85)/.13));});
 limiter.oversample='none';limiter.connect(destination);return disposable([limiter],limiter);
}
