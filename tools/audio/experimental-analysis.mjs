import {spawnSync} from 'node:child_process';
import {pcmStatistics} from './source-loop.mjs';
export function decodeAudio(path){
 const r=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-threads','1','-i',path,'-ar','44100','-ac','2','-f','f32le','pipe:1'],{windowsHide:true,maxBuffer:20000000});
 if(r.status!==0)throw Error(String(r.stderr));
 return {sampleRate:44100,channels:[0,1].map(ch=>Float32Array.from({length:r.stdout.length/8},(_,i)=>r.stdout.readFloatLE(i*8+ch*4)))};
}
export function measureLoudness(path,gainDb=0){
 const r=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-nostats','-threads','1','-i',path,'-filter_threads','1','-af',`volume=${gainDb}dB,loudnorm=I=-23:TP=-1:LRA=7:print_format=json`,'-f','null','NUL'],{windowsHide:true,maxBuffer:1000000});
 if(r.status!==0)throw Error(String(r.stderr));
 const m=JSON.parse(String(r.stderr).match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]??'null');
 if(!m||!Number.isFinite(Number(m.input_i)))throw Error('Invalid loudness '+path);
 return {lufs:Number(m.input_i),truePeak:Number(m.input_tp),lra:Number(m.input_lra)};
}
function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let size=2;size<=n;size*=2){const a=-2*Math.PI/size,wr=Math.cos(a),wi=Math.sin(a);
  for(let i=0;i<n;i+=size){let ur=1,ui=0;for(let j=0;j<size/2;j++){const k=i+j,l=k+size/2,tr=ur*re[l]-ui*im[l],ti=ur*im[l]+ui*re[l];re[l]=re[k]-tr;im[l]=im[k]-ti;re[k]+=tr;im[k]+=ti;const next=ur*wr-ui*wi;ui=ur*wi+ui*wr;ur=next;}}
 }
}
const round=n=>Number(n.toFixed(5)),names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export function signalEvidence({channels,sampleRate}){
 const n=16384,power=new Float64Array(n/2),mono=Float32Array.from(channels[0],(x,i)=>(x+channels[1][i])/2);
 for(let start=0;start+n<=Math.min(mono.length,235200);start+=8192){const re=Float64Array.from({length:n},(_,i)=>mono[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(n-1)))),im=new Float64Array(n);fft(re,im);for(let i=1;i<n/2;i++)power[i]+=re[i]*re[i]+im[i]*im[i];}
 let sum=0,low=0,centroid=0;const chroma=new Float64Array(12),peaks=[];
 for(let i=1;i<power.length;i++){const f=i*sampleRate/n;sum+=power[i];centroid+=f*power[i];if(f<200)low+=power[i];
  if(f>=30&&f<4000&&power[i]>power[i-1]&&power[i]>power[i+1]){
   const offset=.5*(Math.log(power[i-1]+1e-20)-Math.log(power[i+1]+1e-20))/(Math.log(power[i-1]+1e-20)-2*Math.log(power[i]+1e-20)+Math.log(power[i+1]+1e-20)),frequency=(i+offset)*sampleRate/n,midi=Math.round(69+12*Math.log2(frequency/440));
   chroma[(midi%12+12)%12]+=power[i];peaks.push({hz:round(frequency),note:names[(midi%12+12)%12]+(Math.floor(midi/12)-1),power:power[i]});
  }
 }
 const totalChroma=chroma.reduce((a,b)=>a+b,0),stats=pcmStatistics(channels),envelope=[];
 for(let start=0;start<mono.length;start+=441)envelope.push(pcmStatistics([mono.subarray(start,start+441)]).rms);
 const max=Math.max(...envelope),active=envelope.map((v,i)=>v>max*.05?i:null).filter(i=>i!==null);
 const onsets=[];for(let i=2;i<Math.min(envelope.length-1,533);i++)if(envelope[i]-envelope[i-2]>max*.15&&envelope[i]>=envelope[i+1]&&(!onsets.length||i/100-onsets.at(-1)>.08))onsets.push(i/100);
 const gridError=bpm=>onsets.length?round(onsets.reduce((sum,t)=>sum+Math.abs(t-Math.round(t/(60/bpm/4))*60/bpm/4),0)/onsets.length):null;
 let clips=0,stereoPower=0;for(let i=0;i<mono.length;i++){stereoPower+=(channels[0][i]-channels[1][i])**2;for(const c of channels)if(Math.abs(c[i])>=1)clips++;}
 return {frames:mono.length,seconds:round(mono.length/sampleRate),peak:round(stats.peak),rms:round(stats.rms),rmsDb:round(20*Math.log10(stats.rms)),clippedSamples:clips,stereoDifferenceRms:round(Math.sqrt(stereoPower/mono.length)),lowEnergyBelow200:round(low/sum),centroidHz:round(centroid/sum),spectralPeaks:peaks.sort((a,b)=>b.power-a.power).slice(0,8).map(p=>({hz:p.hz,note:p.note,share:round(p.power/sum)})),pitchClassEnergy:Array.from(chroma,(v,i)=>({note:names[i],share:round(v/totalChroma)})).sort((a,b)=>b.share-a.share),activeStartSeconds:active[0]/100,activeEndSeconds:active.at(-1)/100,onsetsSeconds:onsets,gridErrorSeconds:{bpm88:gridError(88),bpm90:gridError(90),bpm92:gridError(92)},barRms:[0,1].map(i=>round(pcmStatistics(channels.map(c=>c.subarray(i*117600,(i+1)*117600))).rms)),tailRms:round(pcmStatistics(channels.map(c=>c.subarray(235200))).rms)};
}
