import {BEGINNER_BANK,USER_DRUM_BANK,beginnerById} from './beat-beginner-bank.js?rev=44';
import {SOURCE_GAINS_DB} from './source-levels.js?rev=44';
const BAR_SECONDS=8/3;
const kinds=['drums','theme','arrangement'];
const sourceIds=beat=>[beat.drumId,beat.audio?.themeId,beat.audio?.arrangementId];
function choice(key){
 let hash=2166136261;
 for(const char of key){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);return (hash^(hash>>>16))>>>0;
}

// Saved project identity and the first take define the form. A clean take or
// mastering changes the sound, but never the musical arrangement choices.
export function createBeatSongForm(beat){
 const recording=beat?.recording;
 if(beat?.stages?.length!==3||!recording?.draft)return null;
 if(beat.songForm)return normalizeSongForm(beat.songForm,beat);
 if(!recording.mix)return null;
 const key=String(beat.id)+':'+recording.draft.seed;
 return {bars:8,barSeconds:BAR_SECONDS,durationSeconds:64/3,introStage:choice(key+':intro')%3,outroStage:choice(key+':outro')%3,vocalOutro:choice(key+':vocal-outro')%4===0};
}

// Only production completion calls this selector. Reads never choose new sources.
export function chooseSongForm(beat,{pool=[...BEGINNER_BANK,...USER_DRUM_BANK],seed=beat?.recording?.draft?.seed}={}){
 const base=createBeatSongForm({...beat,songForm:null});if(!base)return null;
 const ids=sourceIds(beat),key=String(beat.id)+':'+seed;
 const form={version:1,...base};
 for(const [section,startBar,sourceBar] of [['intro',0,0],['outro',6,2]]){
  const stage=form[section+'Stage'],current=ids[stage],tonal=beginnerById(ids[1]);
  const candidates=pool.filter(p=>p&&p.id!==current&&p.available!==false&&beginnerById(p.id)&&p.path&&p.kind===kinds[stage]&&p.bpm===beat.bpm&&p.bars===4&&Number.isFinite(SOURCE_GAINS_DB[p.id])&&(stage===0||p.key&&p.key===tonal?.key));
  const alternate=candidates.length&&choice(key+':'+section+':alternate')%2===0?candidates[choice(key+':'+section+':source')%candidates.length]:null;
  form[section+'SourceId']=alternate?.id??current;
  form[section+'Window']={startBar,bars:2,sourceBar:alternate?choice(key+':'+section+':window')%3:sourceBar};
 }
 return form;
}

export function normalizeSongForm(value,beat){
 if(value?.version!==1||value.bars!==8||value.barSeconds!==BAR_SECONDS||value.durationSeconds!==64/3||typeof value.vocalOutro!=='boolean')return null;
 const form={version:1,bars:8,barSeconds:BAR_SECONDS,durationSeconds:64/3},ids=sourceIds(beat);
 for(const [section,startBar] of [['intro',0],['outro',6]]){
  const stage=value[section+'Stage'],id=value[section+'SourceId'],window=value[section+'Window'];
  if(!Number.isInteger(stage)||stage<0||stage>2||typeof id!=='string'||!id||id!==ids[stage]&&beginnerById(id)?.kind!==kinds[stage]||window?.startBar!==startBar||window.bars!==2||!Number.isInteger(window.sourceBar)||window.sourceBar<0||window.sourceBar>2)return null;
  form[section+'Stage']=stage;form[section+'SourceId']=id;form[section+'Window']={startBar,bars:2,sourceBar:window.sourceBar};
 }
 form.vocalOutro=value.vocalOutro;return form;
}

export function songPartWindows(form,stage,sourceId){
 const windows=[];
 if(stage===form.introStage&&(!form.version||sourceId===undefined||sourceId===form.introSourceId))windows.push(form.introWindow??{startBar:0,bars:2,sourceBar:0});
 windows.push({startBar:2,bars:4,sourceBar:0});
 if(stage===form.outroStage&&(!form.version||sourceId===undefined||sourceId===form.outroSourceId))windows.push(form.outroWindow??{startBar:6,bars:2,sourceBar:2});
 if(stage===3&&form.vocalOutro)windows.push({startBar:6,bars:1,sourceBar:0});
 return windows;
}

// Assemble already processed source PCM, so the repeated vocal is the same
// active take. Each section has a tiny edge fade to avoid clicks at cuts.
export function arrangeSongSamples(input,rate,windows,durationSeconds){
 const output=new Float32Array(Math.round(durationSeconds*rate));
 if(!input.length)return output;
 const edge=Math.max(1,Math.round(rate*.004));
 for(const {startBar,bars,sourceBar=0} of windows){
  const start=Math.round(startBar*BAR_SECONDS*rate),end=Math.min(output.length,Math.round((startBar+bars)*BAR_SECONDS*rate)),source=Math.round(sourceBar*BAR_SECONDS*rate);
  for(let i=start;i<end;i++){
   const local=i-start,fade=Math.min(1,local/edge,(end-1-i)/edge);
   output[i]+=input[(source+local)%input.length]*Math.max(0,fade);
  }
 }
 return output;
}

export function arrangeSongBuffer(context,buffer,windows,durationSeconds,sourceLoopSeconds=buffer.duration){
 const rate=buffer.sampleRate,out=context.createBuffer(buffer.numberOfChannels,Math.round(durationSeconds*rate),rate),sourceLength=Math.round(sourceLoopSeconds*rate);
 for(let channel=0;channel<buffer.numberOfChannels;channel++)out.copyToChannel(arrangeSongSamples(buffer.getChannelData(channel).subarray(0,sourceLength),rate,windows,durationSeconds),channel);
 return out;
}
