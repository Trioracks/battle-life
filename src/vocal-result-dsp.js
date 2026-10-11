// Deterministic recording damage, followed by the non-bypassable budget hardware.
// Grain boundaries follow the 90 BPM clock; the source duration never changes.
import {clampV,VOCAL_CEILING} from './vocal-result.js?rev=28';
const mod=(x,n)=>((x%n)+n)%n;
const sample=(a,x)=>{const i=Math.floor(x),f=x-i;return (a[mod(i,a.length)]||0)*(1-f)+(a[mod(i+1,a.length)]||0)*f;};
function filter(a,rate,type,frequency,q=.707,gain=0){
 const w=2*Math.PI*Math.min(rate*.44,frequency)/rate,c=Math.cos(w),s=Math.sin(w),alpha=s/(2*q),A=10**(gain/40);
 let b0,b1,b2,a0,a1,a2;
 if(type==='highpass'){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;}
 else if(type==='lowpass'){b0=(1-c)/2;b1=1-c;b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;}
 else{b0=1+alpha*A;b1=-2*c;b2=1-alpha*A;a0=1+alpha/A;a1=-2*c;a2=1-alpha/A;}
 let x1=0,x2=0,y1=0,y2=0;
 for(let i=0;i<a.length;i++){const x=a[i],y=(b0*x+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x;y2=y1;y1=y;a[i]=y;}
 return a;
}
export function transformVocalSamples(input,rate,profile){
 if(!profile||!input.length||!Number.isFinite(rate)||rate<1000)return new Float32Array(input.length);
 // Quality already includes the clean-take and post-production bonuses. Do not
 // subtract them a second time: starter gear must never recover the dry vocal.
 const quality=clampV(profile.quality,0,VOCAL_CEILING),severity=clampV((48-quality)/40,0,1);
 const out=new Float32Array(input.length),gates=new Float32Array(input.length),step=rate/3,edge=Math.max(1,rate*.005),seed=(profile.seed>>>0)||1;
 const hash=(cell,salt)=>{
  let x=(seed^Math.imul(cell+1,374761393)^Math.imul(salt,668265263))>>>0;
  x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;
 };
 const cells=Array.from({length:Math.ceil(out.length/step)},(_,cell)=>{
  // Stratified misses: every two bars contain real lost syllables, including
  // unlucky/fortunate seeds. No random seed can accidentally yield a clean take.
  const rank=(mod(cell*5+(seed%16)+Math.floor(cell/16)*3,16)+.5)/16;
  const phrase=Math.floor(cell/2);
  return {missing:rank<.04+.4*severity,
   shift:(hash(phrase,1)-.5)*rate*(.08+.85*severity)+(hash(cell,2)-.5)*rate*.2*severity,
   pitch:2**(((hash(phrase,3)-.5)*(100+1200*severity))/1200),
   stutter:hash(cell,4)<.38*severity,grain:rate*(.018+.03*hash(cell,5)),
   level:1-severity*(.25+.5*hash(phrase,6))};
 });
 let random=seed;const noise=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/2147483648-1;};
 const hold=2+Math.round(severity*7),levels=9+Math.round(quality*.6),drive=7+14*severity;
 let held=0;
 for(let i=0;i<out.length;i++){
  const cell=Math.floor(i/step),local=i-cell*step,c=cells[cell];
  const fade=clampV(Math.min(local/edge,(step-local)/edge),0,1);
  gates[i]=c.missing?0:fade;
  if(c.missing){held=0;continue;}
  const offset=c.stutter?local%c.grain:local;
  const grainFade=c.stutter?clampV(Math.min(offset/edge,(c.grain-offset)/edge),0,1):1;
  const flutter=Math.sin(i/rate*2*Math.PI*13+seed%19);
  const cursor=cell*step+c.shift+step/2+(offset-step/2)*c.pitch;
  // Fully wet: no undamaged source in parallel with the misplaced syllables.
  const wet=sample(input,cursor)*c.level*grainFade*(1-severity*.35*(.5+.5*flutter));
  if(i%hold===0)held=Math.tanh(wet*drive);
  const quantized=Math.round(held*levels)/levels;
  out[i]=(held*.2+quantized*.8+noise()*(.012+.026*severity)*Math.min(1,Math.abs(wet)*12))*fade;
 }
 // Thin, overloaded desk-mic capture: no chest/body, recessed intelligibility,
 // gritty upper band. This hardware colouring remains even at the skill ceiling.
 filter(out,rate,'highpass',1300+800*severity);
 filter(out,rate,'peaking',1800,.7,-22);
 filter(out,rate,'peaking',4200,1,8);
 filter(out,rate,'lowpass',6500);
 let power=0,peak=0;
 for(let i=0;i<out.length;i++){out[i]*=gates[i];power+=out[i]*out[i];peak=Math.max(peak,Math.abs(out[i]));}
 // Downward-only levelling. The previous upward makeup gain exposed the vocal
 // over weak beats; quiet takes and gaps now stay quiet, rather than being rescued.
 const target=.018+.025*quality/VOCAL_CEILING,gain=Math.min(1,target/Math.max(1e-9,Math.sqrt(power/out.length)),.22/Math.max(1e-9,peak));
 for(let i=0;i<out.length;i++){
  const seam=Math.max(0,Math.min(1,i/(rate*.003),(out.length-1-i)/(rate*.012)));
  out[i]=seam===0?0:out[i]*gain*seam;
 }
 return out;
}
export function transformVocalBuffer(context,buffer,profile,seconds=32/3){
 const length=Math.round(seconds*buffer.sampleRate),out=context.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);
 for(let ch=0;ch<buffer.numberOfChannels;ch++){
  const samples=new Float32Array(length);samples.set(buffer.getChannelData(ch).subarray(0,length));out.copyToChannel(transformVocalSamples(samples,buffer.sampleRate,profile),ch);
 }
 return out;
}
