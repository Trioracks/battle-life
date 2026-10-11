import {normalizeBeatResult} from './beat-result.js?rev=28';
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
const brokenDrums=[0,0,-1,2,4,12,6,6,8,-1,9,1,12,12,15,-1];
// Slice boundaries use the fractional 90 BPM grid, never cumulative rounded steps.
export function transformBeatSamples(input,rate,value){
 const r=normalizeBeatResult(value);if(!r||r.quality>=100||!input.length||!Number.isFinite(rate)||rate<1000)return input;
 const amount=severity(r.quality),rough=clamp((30-r.quality)/25),medium=clamp((100-r.quality)/70),kind=r.stage;
 const pitch=(kind===1?85:-120)*medium+(kind===1?100:-140)*rough;
 const a=kind?detune(input,rate,pitch*(.85+.15*(1-r.skills.beatmaking/100)),r.seed%17):input;
 const out=new Float32Array(a.length),step=rate/6,edge=Math.max(1,Math.round(rate*.0015));
 for(let i=0;i<out.length;i++){
  const s=Math.floor(i/step),start=Math.round(s*step),end=Math.round((s+1)*step),local=i-start,cell=s%16,bar=Math.floor(s/16),cellSize=end-start;
  let from=s,offset=local,envelope=1;
  if(kind===0){
   // At 30, most groove survives; at 5, repeated/missing/reordered hits dominate.
   if(rough>.001){
    const mapped=brokenDrums[(cell+bar*3+r.seed%4)%16];
    if(mapped<0)envelope=0;else from=bar*16+mapped;
    if([1,6,12,13].includes(cell)){const size=Math.max(1,Math.round(step/(cell===6?8:4)));offset=local%size;envelope*=clamp(Math.min(offset/edge,(size-1-offset)/edge));}
   }else if(cell===15&&bar%2===0)envelope=0;
   else if(cell===6&&bar%2===1){const size=Math.max(1,Math.round(step/2));offset=local%size;envelope=clamp(Math.min(offset/edge,(size-1-offset)/edge));}
   else if(cell===12&&bar%2===0)from=s+1;
  }else if(kind===1){
   if(cell===9||rough>.2&&[2,3,14].includes(cell))from=s+(rough>.2?3:1);
   if(rough>.2&&[5,11].includes(cell))offset=cellSize-1-local;
   if((cell===7&&bar===1)||rough>.2&&cell===12)envelope=0;
  }else{
   if(cell===10&&bar%2===0)from=s-1;
   if(rough>.2&&cell%5===0)from=s-2;
   if(rough>.2&&cell===10)envelope=0;
   // Grid-locked late bass attacks, without changing the underlying loop clock.
   offset-=step/2*medium;
  }
  const altered=from!==s||offset!==local||envelope!==1;
  if(altered)envelope*=clamp(Math.min(local/edge,(cellSize-1-local)/edge));
  const wet=kind===0?clamp(.7*medium+.3*rough):medium;
  let v=a[i]*(1-wet)+sample(a,from*step+offset)*envelope*wet;
  if(kind===0){const levels=Math.round(24+(1-amount)*160);v=v*(1-amount)+Math.round(v*levels)/levels*amount;}
  const seam=Math.min(1,i/(rate*.002*amount),(out.length-1-i)/(rate*.002*amount));
  out[i]=seam===0?0:clamp(v,-1,1)*seam;
 }
 return out;
}

export function transformBeatBuffer(context,buffer,result,seconds){
 if(!normalizeBeatResult(result)||result.quality>=100)return buffer;
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
 const r=normalizeBeatResult(value);if(!r||r.quality===100)return disposable([],destination);
 const nodes=[],make=method=>{const n=context[method]();nodes.push(n);return n;};
 try{
  const amount=severity(r.quality),buff=clamp((r.quality-100)/10),kind=r.stage,rough=clamp((30-r.quality)/25),medium=clamp((100-r.quality)/70);
  const colour=amount*(.8+.2*(1-r.skills.sound/100)),input=make('createGain');
  const hp=make('createBiquadFilter');hp.type='highpass';hp.frequency.value=20+([200,280,15][kind]*medium+[400,550,0][kind]*rough)*(.8+.2*(1-r.skills.sound/100));hp.Q.value=-3.0103;
  const lp=make('createBiquadFilter');lp.type='lowpass';lp.frequency.value=Math.min(context.sampleRate*.45,20000/(1+[3,2,11][kind]*colour+[2,4,10][kind]*rough));lp.Q.value=-3.0103;
  const shape=make('createWaveShaper'),drive=1+[5,2.7,4][kind]*colour+[10,2.3,8][kind]*rough,levels=Math.round(1024/(1+50*colour+50*rough));
  shape.curve=Float32Array.from({length:65537},(_,i)=>{const x=i/32768-1,y=Math.tanh(x*drive)/Math.sqrt(drive),quantized=Math.round(y*levels)/levels;return x*(1-colour)+quantized*colour;});
  shape.oversample='none';
  const balance=make('createGain');balance.gain.value=medium/[1+.3*colour,1+.15*colour,1+.6*colour][kind];
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
  const delay=make('createDelay'),feedback=make('createGain'),wet=make('createGain');
  delay.delayTime.value=[1/6,1/3,1/12][kind];feedback.gain.value=buff?0:Math.min(.65,[.4,.35,.26][kind]*medium+.22*rough);
  wet.gain.value=buff?.045*buff:([.28,.35,.2][kind]*medium+[.55,.6,.3][kind]*rough);
  (buff?input:balance).connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(destination);
  return disposable(nodes,input);
 }catch(error){disposable(nodes).dispose();throw error;}
}

export function connectBeatResultMaster(context,destination){
 const limiter=context.createWaveShaper();
 // Exactly linear across normal levels, asymptotic ceiling at .98 for hot sums.
 limiter.curve=Float32Array.from({length:65537},(_,i)=>{const x=i/32768-1,a=Math.abs(x);return a<=.85?x:Math.sign(x)*(.85+.13*Math.tanh((a-.85)/.13));});
 limiter.oversample='none';limiter.connect(destination);return disposable([limiter],limiter);
}
