// Fixed LOCAL GANS comparison; no live game state or sound-skill mapping.
import {processBeat,processVocal,detectPhrases,beatParameters} from './flow-genre-curve.mjs';
import {filterPcm,pcmStats} from './beat-skill-ladder.mjs';
import {arrangeSongSamples} from '../../src/beat-song-form.js';

const BAR=8/3,DURATION=64/3;
const scaled=(channels,gain)=>channels.map(c=>Float32Array.from(c,x=>x*gain));
const sum=(a,b)=>a.map((c,ch)=>Float32Array.from(c,(x,i)=>x+b[ch][i]));
const stereo=c=>[c[0],c[1]??c[0]];
function validatePart(p,rate){
  if(typeof p.id!=='string'||!p.id||!Number.isFinite(p.sourceGainDb)||p.sourceGainDb< -40||p.sourceGainDb>12||!Array.isArray(p.channels)||![1,2].includes(p.channels.length)||!p.channels[0]?.length||p.channels.some(c=>!(c instanceof Float32Array)||c.length!==p.channels[0].length)||!Number.isInteger(rate)||rate<8000||rate>192000)throw new RangeError('Invalid local source');
  pcmStats(p.channels);
}

export function renderGansMix({sampleRate,voice,parts,flow=25,beatmaking=50,genreXP=100,seed=33,outputGain=.776895649542515}){
  validatePart(voice,sampleRate);
  if(!Array.isArray(parts)||parts.length!==3||new Set(parts.map(p=>p.role)).size!==3||parts.some(p=>!['drums','bass','melody'].includes(p.role))||!Number.isInteger(seed)||!Number.isFinite(outputGain)||outputGain<=0||outputGain>1)throw new RangeError('Invalid GANS recipe');
  for(const p of parts)validatePart(p,sampleRate);
  const slotFrames=Math.round(2*BAR*sampleRate),frames=Math.round(DURATION*sampleRate);
  if(voice.channels[0].length>slotFrames)throw new RangeError('Full GANS take too long to fit two complete performances in four bars');
  const prepared=voice.channels.map(c=>{const out=new Float32Array(slotFrames);out.set(c);return out;});
  const calibratedVoice=scaled(prepared,10**(voice.sourceGainDb/20)),phrases=detectPhrases(calibratedVoice,sampleRate);
  if(!phrases.length)throw new RangeError('No active vocal phrases');
  const seeds=[seed,(seed^0x5bd1e995)>>>0],baselineGain=outputGain*10**(-2/20),masterGain=10**(1.5/20);
  const colors={before:[{type:'lowshelf',frequency:180,gainDb:-1},{type:'peaking',frequency:900,q:.7,gainDb:-2}],after:[{type:'lowshelf',frequency:180,gainDb:-.4},{type:'peaking',frequency:900,q:.7,gainDb:-1}]};
  function render(kind,penaltyScale,count){
    let beatChannels=[new Float32Array(frames),new Float32Array(frames)];const beat=[];
    for(const part of parts){
      const calibrated=scaled(part.channels,10**(part.sourceGainDb/20));
      const processed=processBeat(calibrated,sampleRate,part.role,beatmaking,genreXP,penaltyScale);
      const windows=part.role==='bass'?[{startBar:0,bars:2,sourceBar:0},{startBar:2,bars:4,sourceBar:0}]:part.role==='melody'?[{startBar:2,bars:4,sourceBar:0},{startBar:6,bars:2,sourceBar:2}]:[{startBar:2,bars:4,sourceBar:0}];
      const arranged=stereo(processed.map(c=>arrangeSongSamples(c,sampleRate,windows,DURATION)));beatChannels=sum(beatChannels,arranged);
      beat.push({id:part.id,role:part.role,windows,parameters:beatParameters(part.role,beatmaking,genreXP,penaltyScale)});
    }
    let vocalChannels=[new Float32Array(frames),new Float32Array(frames)];const occurrences=[];
    for(let i=0;i<count;i++){
      // Independently process the original source once per occurrence, never a
      // copied damaged take. The first keeps the before seed during mastering.
      const v=processVocal(calibratedVoice,sampleRate,flow,genreXP,{phrases,seed:seeds[i],penaltyScale});
      const startBar=2+i*2,arranged=stereo(v.channels.map(c=>arrangeSongSamples(c,sampleRate,[{startBar,bars:2,sourceBar:0}],DURATION)));
      vocalChannels=sum(vocalChannels,arranged);
      occurrences.push({seed:seeds[i],sourceFrames:voice.channels[0].length,startSeconds:startBar*BAR,endSeconds:(startBar+2)*BAR,plan:v.plan,channels:v.channels});
    }
    const preColor=sum(beatChannels,vocalChannels),colored=filterPcm(preColor,sampleRate,colors[kind]),gain=baselineGain*(kind==='after'?masterGain:1);
    return {kind,channels:scaled(colored,gain),preOutputChannels:colored,beatChannels,vocalChannels,occurrences,beat,penaltyScale,outputGain:gain,filters:colors[kind]};
  }
  const before=render('before',1,1),after=render('after',.9,2);
  // One shared safety factor, chosen before the scalar-only comparison match.
  const sharedGain=Math.min(1,.95/Math.max(pcmStats(before.channels).peak,pcmStats(after.channels).peak,Number.MIN_VALUE));
  for(const item of [before,after]){item.channels=scaled(item.channels,sharedGain);item.stats=pcmStats(item.channels);}
  const matchGain=before.stats.rms/after.stats.rms,matched={kind:'matched',channels:scaled(after.channels,matchGain),comparisonOnly:true};
  matched.stats=pcmStats(matched.channels);
  if(matched.stats.peak>.95+1e-6)throw new RangeError('Gain-matched comparison exceeds shared headroom');
  return {sampleRate,frames,durationSeconds:DURATION,bpm:90,bars:8,main:{startBar:2,bars:4},voiceId:voice.id,beatIds:parts.map(p=>p.id),flow,beatmaking,genreXP,seed,seeds,phrases,baselineGain,masterGain,sharedGain,matchGain,before,after,matched};
}
