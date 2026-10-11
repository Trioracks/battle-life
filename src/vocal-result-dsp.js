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
 const quality=clampV(profile.quality,0,VOCAL_CEILING),damage=(1-quality/100)**2,clean=profile.kind==='clean',post=clampV(profile.postGain,0,4),severity=Math.max(.1,damage-(clean?.08:0)-post*.012);
 const out=new Float32Array(input.length),step=rate/6,edge=Math.max(1,rate*.003),seed=(profile.seed>>>0)||1;
 let random=seed;const noise=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/2147483648-1;};
 for(let i=0;i<out.length;i++){
  const cell=Math.floor(i/step),local=i-cell*step,code=((Math.imul(cell+seed,1103515245)>>>0)%101)/100;
  const pitch=2**(((code-.5)*190*severity)/1200),late=(code-.5)*step*.7*severity;
  let offset=local*pitch-late,envelope=1;
  if(code<severity*.2){const grain=step/4;offset=local%grain;envelope=Math.min(1,(local%grain)/edge,(grain-local%grain)/edge);}
  if(code>1-severity*.12)envelope=.12;
  const wet=sample(input,cell*step+offset)*Math.max(0,envelope),v=sample(input,i)*(1-severity*.85)+wet*severity*.85;
  const levels=24+(1-damage)*190,quantized=Math.round(v*levels)/levels;
  // Noise is modest and source-gated: silence stays almost silent, not an endless blast.
  out[i]=v*(1-damage*.65)+quantized*damage*.65+noise()*(.002+.004*damage)*Math.min(1,Math.abs(v)*25);
 }
 filter(out,rate,'highpass',650+900*damage);
 filter(out,rate,'peaking',1250, .7,-12-6*damage);
 filter(out,rate,'peaking',4300,.8,4+3*damage);
 filter(out,rate,'lowpass',8500);
 // Limited auto-level after the severe EQ. Never normalise noise to full scale.
 let power=0;for(const x of out)power+=x*x;
 const gain=Math.min(5,.065/Math.max(.008,Math.sqrt(power/out.length))),drive=1.5+damage*2;
 for(let i=0;i<out.length;i++){
  const seam=Math.max(0,Math.min(1,i/(rate*.003),(out.length-1-i)/(rate*.012)));
  out[i]=seam===0?0:Math.max(-.9,Math.min(.9,Math.tanh(out[i]*gain*drive)/Math.sqrt(drive)))*seam;
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
