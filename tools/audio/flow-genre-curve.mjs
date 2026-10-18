// Additive LOCAL comparison. Never imported by the game.
import {spawnSync} from 'node:child_process';
import {arrangeSongSamples} from '../../src/beat-song-form.js';
import {effectiveSkill,defectParameters,filterPcm,detunePcm,shiftTiming,pcmStats} from './beat-skill-ladder.mjs';
export {effectiveSkill};
export const LEVELS=Object.freeze([0,10,25,50,80,100]);

export function severityAt(skill) {
  effectiveSkill(skill,100);
  if(skill>=80)return .025*((100-skill)/20)**2;
  const knots=[[0,1],[25,.5],[50,.08],[80,.025]];
  for(let i=1;i<knots.length;i++)if(skill<=knots[i][0]){
    const [a,x]=knots[i-1],[b,y]=knots[i];return x*(y/x)**((skill-a)/(b-a));
  }
}
function validate(channels,rate) {
  if(!Number.isInteger(rate)||rate<8000||rate>192000||!Array.isArray(channels)||![1,2].includes(channels.length)||!channels[0]?.length||channels.some(c=>!(c instanceof Float32Array)||c.length!==channels[0].length))throw new RangeError('Invalid PCM');
  pcmStats(channels);
}
const copy=channels=>channels.map(c=>c.slice());
function rank(seed,index,kind) {
  let h=2166136261;
  for(const c of `${seed}:${index}:${kind}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;
}

// Envelope-only approximation: 10ms RMS, 2.5% of peak RMS, >=90ms pauses,
// 30ms guards. Silence after the actual take never creates eligible events.
export function detectPhrases(channels,rate) {
  validate(channels,rate);
  const hop=Math.round(rate*.01),energy=[];
  for(let i=0;i<channels[0].length;i+=hop){let sum=0,n=0;for(const c of channels)for(let j=i;j<Math.min(i+hop,c.length);j++){sum+=c[j]**2;n++;}energy.push(Math.sqrt(sum/n));}
  const threshold=Math.max(1e-5,Math.max(...energy)*.025),active=[];
  for(let i=0;i<energy.length;i++)if(energy[i]>threshold)active.push(i);
  if(!active.length)return [];
  const groups=[];let start=active[0],end=start;
  for(const at of active.slice(1)){if(at-end>9){groups.push([start,end]);start=at;}end=at;}groups.push([start,end]);
  return groups.filter(([a,b])=>(b-a+1)*hop/rate>=.25).map(([a,b])=>({start:Math.max(0,a*hop/rate-.03),end:Math.min(channels[0].length/rate,(b+1)*hop/rate+.03)}));
}

export function vocalPlan(phrases,flow,genreXP,seed=33,durationSeconds=Infinity,penaltyScale=1) {
  const effective=effectiveSkill(flow,genreXP),baseSeverity=severityAt(effective),severity=baseSeverity*penaltyScale;
  if(!Number.isInteger(seed)||!Array.isArray(phrases)||!Number.isFinite(penaltyScale)||penaltyScale<0||penaltyScale>1)throw new RangeError('Invalid vocal plan');
  let prior=0;
  for(const p of phrases){if(!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<prior||p.end<=p.start||p.end>durationSeconds)throw new RangeError('Invalid phrase span');prior=p.end;}
  // Literal density knots: novice 90%, 25=60%, 50=12%, 80=4%, 100=0.
  const densityKnots=[[0,.9],[25,.6],[50,.12],[80,.04],[100,0]];
  let density=0;
  for(let i=1;i<densityKnots.length;i++)if(effective<=densityKnots[i][0]){const [a,x]=densityKnots[i-1],[b,y]=densityKnots[i];density=x+(y-x)*(effective-a)/(b-a);break;}
  const quotaKnots=[[0,1],[10,.75],[25,.75],[50,.25],[80,.04],[100,0]];
  let timingDensity=0;
  for(let i=1;i<quotaKnots.length;i++)if(effective<=quotaKnots[i][0]){const [a,x]=quotaKnots[i-1],[b,y]=quotaKnots[i];timingDensity=x+(y-x)*(effective-a)/(b-a);break;}
  const capacity=phrases.map((p,i)=>({left:i?(p.start-phrases[i-1].end)/2:p.start,right:i+1<phrases.length?(phrases[i+1].start-p.end)/2:durationSeconds-p.end}));
  const eligible=phrases.map((p,index)=>({index,rank:rank(seed,index,'timing')})).filter(({index})=>Math.max(capacity[index].left,capacity[index].right)>=.001).sort((a,b)=>a.rank-b.rank||a.index-b.index);
  const timingCount=Math.min(eligible.length,Math.max(Math.round(eligible.length*timingDensity),effective<=50&&eligible.length?1:0));
  const selected=new Set(eligible.slice(0,timingCount).map(e=>e.index));
  return {effective,baseSeverity,severity,penaltyScale,density,timingDensity,timingEligible:eligible.length,timingCount,seed,segmentation:'10ms RMS energy candidates; no semantic word/stress analysis',events:phrases.map((p,index)=>{
    const timingRank=rank(seed,index,'timing'),speedRank=rank(seed,index,'speed');
    // Half each pause belongs to each neighbor, so even opposite offsets cannot overlap.
    const {left,right}=capacity[index],offsetRank=rank(seed,index,'offset')*2-1;
    let direction=offsetRank<0?-1:1;
    // Choose the sign once from the seed and available pauses, independent of
    // level; reducing magnitude must never turn an early entry into a late one.
    if((direction<0?left:right)<.125&&(direction<0?right:left)>(direction<0?left:right))direction*=-1;
    const desired=direction*(.5+.5*Math.abs(offsetRank))*.25*baseSeverity;
    const timingActive=selected.has(index)&&severity>0,speedActive=speedRank<density;
    return {...p,index,timingRank,speedRank,timingEligible:Math.max(left,right)>=.001,timingActive,speedActive,requestedOffsetSeconds:timingActive?desired*penaltyScale:0,
      offsetSeconds:(timingActive?Math.max(-left,Math.min(right,desired))*penaltyScale:0)||0,tempoAmplitude:speedActive?.4*severity:0,
      accentFraction:.28+.2*rank(seed,index,'accent'),accentDb:(-8*severity)||0,endDb:(-12*severity)||0};
  })};
}

function rubber(channels,rate,filter) {
  const count=channels.length,frames=channels[0].length,input=Buffer.allocUnsafe(frames*count*4);
  for(let i=0;i<frames;i++)for(let ch=0;ch<count;ch++)input.writeFloatLE(channels[ch][i],(i*count+ch)*4);
  const result=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',[
    '-hide_banner','-loglevel','error','-f','f32le','-ar',String(rate),'-ac',String(count),'-i','pipe:0','-af',filter,'-f','f32le','pipe:1'
  ],{input,maxBuffer:Math.max(16*1024*1024,input.length*4),windowsHide:true});
  if(result.error||result.status!==0)throw new Error('Tempo DSP failed: '+(result.error??result.stderr.toString()));
  const length=result.stdout.length/(count*4);
  if(!Number.isInteger(length)||length<1)throw new Error('Incomplete tempo PCM');
  return Array.from({length:count},(_,ch)=>Float32Array.from({length},(_,i)=>result.stdout.readFloatLE((i*count+ch)*4)));
}

// One continuous Rubber Band instance per phrase, not independently stretched
// syllable slices. Balanced source partitions produce equal output halves:
// source fractions (1-a)/2 and (1+a)/2, speeds 1-a and 1+a.
// 64-sample command resolution; a second pitch=1 stretch corrects ONLY actual
// command/FFT rounding. Tail is retained, with zero padding before any trim.
export function warpPhrase(channels,rate,amplitude) {
  validate(channels,rate);
  if(!Number.isFinite(amplitude)||amplitude<0||amplitude>.4)throw new RangeError('Invalid tempo amplitude');
  if(!amplitude)return copy(channels);
  const frames=channels[0].length,seconds=frames/rate,guard=Math.round(rate*.12);
  // Rubber Band's smooth transient detector is amplitude-sensitive even with
  // channels=together. Reversible analysis scaling gives proportional stereo
  // channels the same detector input; restore their exact gain after stretching.
  const powers=channels.map(c=>Math.sqrt(c.reduce((sum,x)=>sum+x*x,0)/c.length));
  const reference=Math.max(...powers),scales=powers.map(p=>p?reference/p:1);
  const padded=channels.map((c,ch)=>{const x=new Float32Array(c.length+2*guard);for(let i=0;i<c.length;i++)x[i+guard]=c[i]*scales[ch];return x;});
  const first=1-amplitude,second=1+amplitude,turn=guard/rate+seconds*first/2,end=guard/rate+seconds;
  const command=`${guard/rate} rubberband tempo ${first};${turn} rubberband tempo ${second};${end} rubberband tempo 1`;
  // Coupled-channel Rubber Band analysis can transfer independent tonal content
  // between L/R. Apart keeps channel signals isolated; the same commands and
  // frame correction still give both channels the identical time mapping.
  const options='pitch=1:channels=apart:phase=laminar:transients=smooth:window=long:pitchq=consistency';
  const stretched=rubber(padded,rate,`asetnsamples=n=64:p=0,asendcmd=commands='${command}',rubberband=tempo=1:${options}`);
  const target=padded[0].length;
  // Preserve all output content: correct duration with tempo, never chop a phrase tail.
  const corrected=stretched[0].length===target?stretched:rubber(stretched,rate,`rubberband=tempo=${stretched[0].length/target}:${options}`);
  // Crop the padded guards, which may contain low-level algorithmic ringing.
  // Actual-rate late-marker tests verify retained content, not exact guard silence.
  if(corrected[0].length<frames+guard)throw new Error('Tempo correction lost phrase duration');
  return corrected.map((c,ch)=>Float32Array.from({length:frames},(_,i)=>c[i+guard]/scales[ch]));
}

export function processVocal(channels,rate,flow,genreXP,{phrases,seed=33,penaltyScale=1}={}) {
  validate(channels,rate);
  const plan=vocalPlan(phrases??detectPhrases(channels,rate),flow,genreXP,seed,channels[0].length/rate,penaltyScale);
  if(!plan.severity)return {channels:copy(channels),plan};
  const output=copy(channels);
  for(const event of plan.events){
    const start=Math.round(event.start*rate),end=Math.round(event.end*rate),length=end-start;
    const source=channels.map(c=>c.slice(start,end)),warped=warpPhrase(source,rate,event.tempoAmplitude);
    const shifted=Math.round(event.offsetSeconds*rate),edge=Math.max(1,Math.round(rate*.004));
    for(let ch=0;ch<output.length;ch++){
      output[ch].fill(0,start,end);
      for(let i=0;i<length;i++){
        const t=i/length,accent=Math.max(0,1-Math.abs(t-event.accentFraction)/.1),ending=Math.max(0,Math.min(1,(t-.72)/.2));
        const gain=10**((event.accentDb*accent+event.endDb*ending)/20);
        const edgeGain=1-plan.severity*(1-Math.max(0,Math.min(1,i/edge,(length-1-i)/edge)));
        const at=start+shifted+i;
        if(at>=0&&at<output[ch].length)output[ch][at]=warped[ch][i]*gain*edgeGain;
      }
    }
  }
  return {channels:output,plan};
}

export function beatParameters(role,beatmaking,genreXP,penaltyScale=1) {
  if(!Number.isFinite(penaltyScale)||penaltyScale<0||penaltyScale>1)throw new RangeError('Invalid penalty scale');
  const effective=effectiveSkill(beatmaking,genreXP),severity=severityAt(effective)*penaltyScale;
  const legacy=defectParameters(role,50*(1-severity),50);
  const tuningKnee=Math.max(0,Math.min(1,(severity-.08)/.42));
  const intendedDetuneCents=(role==='bass'?380:role==='melody'?-460:0)*severity**1.5*tuningKnee**2;
  // An explicit 0.1-cent precision floor avoids invoking Rubber Band's unrelated
  // phase residual at vanishing shifts. This is an offline control deadband,
  // not a claim of sample-wise continuity across the pitch-algorithm bypass.
  const detuneCents=Math.abs(intendedDetuneCents)<=.1?0:intendedDetuneCents;
  return {...legacy,effective,severity,strength:severity,intendedDetuneCents:intendedDetuneCents||0,detuneCents,filterDepth:Math.min(1,severity/.5)};
}

// High/low-pass coefficients approach identity, rather than retaining the phase
// of a nominal 20Hz/18kHz filter at almost zero severity. Gain biquads already
// become identity at 0dB and continue to use the established helper.
function beatFilters(channels,rate,filters,depth){
  let output=channels;
  for(const f of filters){
    if(!['highpass','lowpass'].includes(f.type)){output=filterPcm(output,rate,[f]);continue;}
    const w=2*Math.PI*Math.min(rate*.45,f.frequency)/rate,c=Math.cos(w),s=Math.sin(w),alpha=s/(2*(f.q??Math.SQRT1_2));
    const a0=1+alpha,a1=-2*c/a0,a2=(1-alpha)/a0;
    const raw0=(f.type==='highpass'?(1+c):(1-c))/(2*a0),raw1=(f.type==='highpass'?-(1+c):(1-c))/a0;
    const b0=1+depth*(raw0-1),b1=a1+depth*(raw1-a1),b2=a2+depth*(raw0-a2);
    output=output.map(input=>{const out=new Float32Array(input.length);let z1=0,z2=0;
      for(let i=0;i<input.length;i++){const x=input[i],y=b0*x+z1;z1=b1*x-a1*y+z2;z2=b2*x-a2*y;out[i]=y;}return out;});
  }
  return output;
}
export function processBeat(channels,rate,role,beatmaking,genreXP,penaltyScale=1) {
  validate(channels,rate);const p=beatParameters(role,beatmaking,genreXP,penaltyScale);
  if(!p.severity)return copy(channels);
  // Whole-sample translation avoids fractional linear interpolation acting as
  // an unintended, nonmonotone low-pass on bright melody material.
  const offset=Math.round(p.offsetSeconds*rate)/rate;
  return shiftTiming(detunePcm(beatFilters(channels,rate,p.filters,p.filterDepth),rate,p.detuneCents),rate,offset);
}

export function renderComparison({sampleRate,durationSeconds,outputGain,parts}) {
  if(!Number.isFinite(durationSeconds)||durationSeconds<=0||!Number.isFinite(outputGain)||outputGain<=0||outputGain>1||!Array.isArray(parts)||parts.length!==4||new Set(parts.map(p=>p.role)).size!==4||!parts.some(p=>p.role==='vocal'))throw new RangeError('Invalid comparison recipe');
  const frames=Math.round(sampleRate*durationSeconds),sources=parts.map(p=>{
    validate(p.channels,sampleRate);if(!Number.isFinite(p.sourceGainDb)||p.sourceGainDb< -40||p.sourceGainDb>12)throw new RangeError('Invalid calibration');
    if(p.role!=='vocal')beatParameters(p.role,100,100);
    return {...p,channels:p.channels.map(c=>Float32Array.from(c,x=>x*10**(p.sourceGainDb/20)))};
  });
  const vocal=sources.find(p=>p.role==='vocal'),phrases=detectPhrases(vocal.channels,sampleRate);
  function assemble(kind,level) {
    const vocalChannels=[new Float32Array(frames),new Float32Array(frames)],beatChannels=[new Float32Array(frames),new Float32Array(frames)];let plan=null;
    for(const p of sources){
      let processed=p.channels;
      if(kind==='flow'&&p.role==='vocal'){const v=processVocal(p.channels,sampleRate,level,level,{phrases});processed=v.channels;plan=v.plan;}
      if(kind==='beat'&&p.role!=='vocal')processed=processBeat(p.channels,sampleRate,p.role,level,level);
      const arranged=processed.map(c=>arrangeSongSamples(c,sampleRate,p.windows,durationSeconds));
      const target=p.role==='vocal'?vocalChannels:beatChannels;
      for(let ch=0;ch<2;ch++)for(let i=0;i<frames;i++)target[ch][i]+=(arranged[ch]??arranged[0])[i]*outputGain;
    }
    const channels=vocalChannels.map((c,ch)=>Float32Array.from(c,(v,i)=>v+beatChannels[ch][i]));
    return {kind,level,channels,vocalChannels,beatChannels,plan,unscaledStats:pcmStats(channels)};
  }
  const flow=LEVELS.map(level=>assemble('flow',level)),beat=LEVELS.map(level=>assemble('beat',level));
  const dryReference=assemble('dry',100); // Independent originals, no defect processors.
  const all=[...flow,...beat,dryReference],peak=Math.max(...all.map(v=>v.unscaledStats.peak)),sharedGain=Math.min(1,.95/Math.max(peak,Number.MIN_VALUE));
  for(const v of all){for(const channels of [v.channels,v.vocalChannels,v.beatChannels])for(const c of channels)for(let i=0;i<c.length;i++)c[i]*=sharedGain;v.stats=pcmStats(v.channels);}
  return {sampleRate,frames,durationSeconds,outputGain,sharedGain,phrases,flow,beat,dryReference};
}
