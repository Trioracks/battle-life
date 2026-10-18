// Local comparison only. This module is deliberately not imported by the game.
import {spawnSync} from 'node:child_process';
import {arrangeSongSamples} from '../../src/beat-song-form.js';
import {encodePcm16} from './source-loop.mjs';

export function effectiveSkill(beatmaking, genreXP) {
  for (const skill of [beatmaking, genreXP]) {
    if (typeof skill !== 'number' || !Number.isFinite(skill) || skill < 0 || skill > 100) throw new RangeError('Skill must be a finite number in 0..100');
  }
  return Math.min(beatmaking, genreXP);
}

export function defectParameters(role, beatmaking, genreXP) {
  if (!['drums','bass','melody'].includes(role)) throw new RangeError('Unknown preview role');
  const effective = effectiveSkill(beatmaking, genreXP), strength = Math.max(0, 1 - effective / 50);
  const base = {role,effective,strength,detuneCents:0,offsetSeconds:0,filters:[]};
  if (!strength) return base; // Exact dry bypass: even neutral filters alter phase.
  if (role === 'drums') return {...base,offsetSeconds:.095*strength,filters:[
    {type:'highpass',frequency:20*90**strength,q:Math.SQRT1_2},
    {type:'lowshelf',frequency:350,gainDb:-24*strength},
    {type:'peaking',frequency:950,q:.8,gainDb:-18*strength}
  ]};
  if (role === 'bass') return {...base,detuneCents:380*strength,offsetSeconds:-.13*strength,filters:[
    {type:'lowshelf',frequency:220,gainDb:-24*strength},
    {type:'peaking',frequency:1000,q:.8,gainDb:14*strength}
  ]};
  return {...base,detuneCents:-460*strength,offsetSeconds:.17*strength,filters:[
    {type:'highpass',frequency:20*32.5**strength,q:Math.SQRT1_2},
    {type:'lowpass',frequency:18000*(2100/18000)**strength,q:Math.SQRT1_2}
  ]};
}

function validatePcm(channels, sampleRate) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || !Array.isArray(channels) || ![1,2].includes(channels.length) || !channels[0]?.length) throw new RangeError('Invalid PCM format');
  if (channels.some(channel => !(channel instanceof Float32Array) || channel.length !== channels[0].length)) throw new RangeError('Mismatched PCM channels');
  for (const channel of channels) for (const sample of channel) if (!Number.isFinite(sample)) throw new RangeError('Nonfinite PCM');
}

export function prepareSourcePcm({channels,sampleRate}, targetRate, loopSeconds) {
  validatePcm(channels,sampleRate);
  if(!Number.isInteger(targetRate)||targetRate<8000||targetRate>192000||!Number.isFinite(loopSeconds)||loopSeconds<=0)throw new RangeError('Invalid source preparation');
  let source=channels;
  if(sampleRate!==targetRate) {
    const count=channels.length,frames=channels[0].length,input=Buffer.allocUnsafe(frames*count*4);
    for(let i=0;i<frames;i++)for(let ch=0;ch<count;ch++)input.writeFloatLE(channels[ch][i],(i*count+ch)*4);
    const result=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',[
      '-hide_banner','-loglevel','error','-f','f32le','-ar',String(sampleRate),'-ac',String(count),'-i','pipe:0',
      '-ar',String(targetRate),'-f','f32le','pipe:1'
    ],{input,maxBuffer:Math.max(16*1024*1024,input.length*targetRate/sampleRate*2),windowsHide:true});
    if(result.error||result.status!==0)throw new Error('Source resample failed: '+(result.error??result.stderr?.toString()));
    const length=result.stdout.length/(count*4);
    if(!Number.isInteger(length))throw new Error('Incomplete resampled PCM frame');
    source=Array.from({length:count},(_,ch)=>Float32Array.from({length},(_,i)=>result.stdout.readFloatLE((i*count+ch)*4)));
  }
  const length=Math.round(targetRate*loopSeconds);
  return source.map(channel=>{
    const out=new Float32Array(length);out.set(channel.subarray(0,length));return out;
  });
}

// RBJ cookbook biquads, double-precision state, independent channel histories.
export function filterPcm(channels, sampleRate, filters) {
  validatePcm(channels,sampleRate);
  let output = channels.map(channel=>channel.slice());
  for (const filter of filters) {
    const w=2*Math.PI*Math.min(sampleRate*.45,filter.frequency)/sampleRate, c=Math.cos(w), s=Math.sin(w), A=10**((filter.gainDb??0)/40);
    const alpha=s/(2*(filter.q??Math.SQRT1_2));
    let b0,b1,b2,a0,a1,a2;
    if(filter.type==='highpass') {
      b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;
    } else if(filter.type==='lowpass') {
      b0=(1-c)/2;b1=1-c;b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;
    } else if(filter.type==='peaking') {
      b0=1+alpha*A;b1=-2*c;b2=1-alpha*A;a0=1+alpha/A;a1=-2*c;a2=1-alpha/A;
    } else if(filter.type==='lowshelf') {
      const t=2*Math.sqrt(A)*s/Math.SQRT2;
      b0=A*((A+1)-(A-1)*c+t);b1=2*A*((A-1)-(A+1)*c);b2=A*((A+1)-(A-1)*c-t);
      a0=(A+1)+(A-1)*c+t;a1=-2*((A-1)+(A+1)*c);a2=(A+1)+(A-1)*c-t;
    } else throw new RangeError('Unknown filter');
    output=output.map(input=>{
      const out=new Float32Array(input.length);let z1=0,z2=0;
      for(let i=0;i<input.length;i++) {
        const x=input[i],y=b0/a0*x+z1;
        z1=b1/a0*x-a1/a0*y+z2;z2=b2/a0*x-a2/a0*y;out[i]=y;
      }
      return out;
    });
  }
  return output;
}

// Rubber Band is already installed in the pinned local FFmpeg. Pipe PCM only;
// tempo=1 preserves the clock, channels=together shares the stereo analysis.
export function detunePcm(channels, sampleRate, cents) {
  validatePcm(channels,sampleRate);
  if (!Number.isFinite(cents) || Math.abs(cents)>1200) throw new RangeError('Invalid detune');
  if (!cents) return channels.map(channel=>channel.slice());
  const frames=channels[0].length,count=channels.length,input=Buffer.allocUnsafe(frames*count*4);
  for(let i=0;i<frames;i++)for(let ch=0;ch<count;ch++)input.writeFloatLE(channels[ch][i],(i*count+ch)*4);
  const result=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',[
    '-hide_banner','-loglevel','error','-f','f32le','-ar',String(sampleRate),'-ac',String(count),'-i','pipe:0',
    '-af',`rubberband=tempo=1:pitch=${2**(cents/1200)}:channels=together,apad=whole_len=${frames},atrim=end_sample=${frames}`,
    '-f','f32le','pipe:1'
  ],{input,maxBuffer:Math.max(16*1024*1024,input.length*2),windowsHide:true});
  if(result.error||result.status!==0)throw new Error('Pitch DSP failed: '+(result.error??result.stderr?.toString()));
  if(result.stdout.length!==input.length)throw new Error('Pitch DSP changed frame count');
  const output=Array.from({length:count},()=>new Float32Array(frames));
  for(let i=0;i<frames;i++)for(let ch=0;ch<count;ch++)output[ch][i]=result.stdout.readFloatLE((i*count+ch)*4);
  validatePcm(output,sampleRate);return output;
}

// One fixed fractional-sample translation per track. No warp, slicing, retrigger,
// or tempo change. A 4ms fade applies only at introduced nonzero-shift edges.
export function shiftTiming(channels, sampleRate, seconds) {
  validatePcm(channels,sampleRate);
  if (!Number.isFinite(seconds) || Math.abs(seconds)>1) throw new RangeError('Invalid timing offset');
  if (!seconds) return channels.map(channel=>channel.slice());
  const offset=seconds*sampleRate,frames=channels[0].length,edge=Math.max(1,Math.round(sampleRate*.004));
  return channels.map(input=>Float32Array.from({length:frames},(_,i)=>{
    const at=i-offset;
    if(at<0||at>frames-1)return 0;
    const start=Math.max(0,offset),end=Math.min(frames-1,frames-1+offset),fade=Math.max(0,Math.min(1,(i-start)/edge,(end-i)/edge));
    const floor=Math.floor(at),fraction=at-floor;
    return (input[floor]*(1-fraction)+(input[Math.min(frames-1,floor+1)]??0)*fraction)*fade;
  }));
}

export function processRole(channels, sampleRate, role, beatmaking, genreXP) {
  validatePcm(channels,sampleRate);
  const params=defectParameters(role,beatmaking,genreXP);
  if (!params.strength) return channels.map(channel=>channel.slice());
  const processed=shiftTiming(detunePcm(filterPcm(channels,sampleRate,params.filters),sampleRate,params.detuneCents),sampleRate,params.offsetSeconds);
  // Real EQ/pitch algorithms can retain phase changes at near-neutral settings.
  // Last-five-skill wet fade guarantees convergence, including every sample.
  const wet=Math.min(1,params.strength*10);
  if(wet===1)return processed;
  return processed.map((channel,ch)=>Float32Array.from(channel,(x,i)=>channels[ch][i]+wet*(x-channels[ch][i])));
}

export function pcmStats(channels) {
  let peak=0,power=0,clippedSamples=0;
  for(const channel of channels)for(const sample of channel) {
    if(!Number.isFinite(sample))throw new RangeError('Nonfinite PCM');
    peak=Math.max(peak,Math.abs(sample));power+=sample*sample;if(Math.abs(sample)>=1)clippedSamples++;
  }
  return {peak,rms:Math.sqrt(power/(channels.length*channels[0].length)),clippedSamples};
}

export function renderLadder({sampleRate,durationSeconds,outputGain,parts}) {
  if(!Number.isFinite(durationSeconds)||durationSeconds<=0||!Number.isFinite(outputGain)||outputGain<=0||outputGain>1||!Array.isArray(parts)||parts.length!==4||parts.filter(p=>p.role==='vocal').length!==1)throw new RangeError('Invalid preview recipe');
  const frames=Math.round(durationSeconds*sampleRate);
  const sources=parts.map(part=>{
    validatePcm(part.channels,sampleRate);
    if(!Number.isFinite(part.sourceGainDb)||part.sourceGainDb < -40||part.sourceGainDb > 12)throw new RangeError('Invalid source gain');
    if(part.role!=='vocal')defectParameters(part.role,50,50);
    const gain=10**(part.sourceGainDb/20);
    return {...part,channels:part.channels.map(c=>Float32Array.from(c,x=>x*gain))};
  });
  function render(level,dry=false) {
    const channels=[new Float32Array(frames),new Float32Array(frames)],layers=[];
    let vocalChannels;
    for(const part of sources) {
      const processed=dry||part.role==='vocal'?part.channels:processRole(part.channels,sampleRate,part.role,level,level);
      const arranged=processed.map(c=>arrangeSongSamples(c,sampleRate,part.windows,durationSeconds));
      const stereo=[arranged[0],arranged[1]??arranged[0]];
      const contribution=stereo.map(c=>Float32Array.from(c,x=>x*outputGain));
      for(let ch=0;ch<2;ch++)for(let i=0;i<frames;i++)channels[ch][i]+=contribution[ch][i];
      if(part.role==='vocal')vocalChannels=contribution;
      layers.push({id:part.id,role:part.role,calibrated:pcmStats(part.channels),processed:pcmStats(processed),arranged:pcmStats(contribution)});
    }
    return {level,channels,vocalChannels,layers,unscaledStats:pcmStats(channels)};
  }
  const variants=[0,10,20,30,40,50].map(level=>render(level));
  // Separately assemble calibrated originals; deliberately never call processRole.
  const dryReference=render(null,true),peak=Math.max(...variants.map(v=>v.unscaledStats.peak),dryReference.unscaledStats.peak),sharedGain=Math.min(1,.95/Math.max(peak,Number.MIN_VALUE));
  for(const item of [...variants,dryReference]) {
    for(const channel of [...item.channels,...item.vocalChannels])for(let i=0;i<channel.length;i++)channel[i]*=sharedGain;
    item.stats=pcmStats(item.channels);
  }
  return {sampleRate,frames,durationSeconds,outputGain,sharedGain,variants,dryReference};
}

export function encodeSafePcm16({sampleRate,channels}) {
  validatePcm(channels,sampleRate);
  if(pcmStats(channels).peak>1)throw new RangeError('PCM would clip');
  return encodePcm16({sampleRate,channels});
}
