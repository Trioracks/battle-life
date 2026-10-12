import {drumById,loopSeconds,RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=38';
import {beginnerById} from './beat-beginner-bank.js?rev=38';
import {resolveBeatPlayback} from './beat-playback.js?rev=38';
import {connectBeatMix} from './beat-mix.js?rev=38';
import {transformBeatBuffer,connectBeatResult,connectBeatResultMaster} from './beat-result-dsp.js?rev=38';
import {vocalById} from './vocal-catalog.js?rev=38';
import {transformVocalBuffer} from './vocal-result-dsp.js?rev=38';
import {arrangeSongBuffer} from './beat-song-form.js?rev=38';
import {calibratedSourceBuffer,descriptorOutputGain} from './audio-levels.js?rev=38';

// Authored placeholder PCM, not a remix of third-party music. Sliders never enter here.
export function primitiveSamples(kind,rate=44100){
 const duration=loopSeconds(),data=new Float32Array(Math.round(duration*rate)),beat=60/90;
 let seed=73;const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2147483648-1;};
 const notes=[220,261.6256,329.6276,293.6648,220,329.6276,261.6256,220];
 for(let i=0;i<data.length;i++){
  const t=i/rate,step=Math.floor(t/beat),phase=t%beat;let value=0;
  if(kind==='drums'){
   if(step%2===0&&phase<.2)value+=Math.sin(2*Math.PI*(55*phase+5*(1-Math.exp(-phase*30))))*Math.exp(-phase*24)*.5;
   if(step%2===1&&phase<.15)value+=noise()*Math.exp(-phase*32)*.23;
   const hat=t%(beat/2);if(hat<.035)value+=noise()*Math.exp(-hat*140)*.09;
  }else{
   const freq=kind==='bass'?55:notes[step%notes.length];
   const envelope=Math.min(1,phase/.015)*Math.min(1,(beat-phase)/.04)*Math.exp(-phase*3);
   value=(kind==='bass'?Math.sin(t*freq*2*Math.PI)*.09:Math.round(Math.sin(t*freq*2*Math.PI)*4)/4*.105)*envelope;
  }
  data[i]=value;
 }
 return data;
}
export class BeatAudio{
 constructor({contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)(),fetchFn=(...a)=>fetch(...a)}={}){
  Object.assign(this,{contextFactory,fetchFn});this.cache=new Map();this.resultCache=new Map();this.sources=[];this.retiring=[];this.generation=0;this.error='';this.disposed=false;this.status='stopped';this.offset=0;this.startedAt=0;this.descriptor=null;this.pending=null;
 }
 async unlock(){
  if(this.disposed)return;
  this.context??=this.contextFactory();
  if(this.context.state==='suspended')await this.context.resume();
  if(this.context.state!=='running')throw Error('audio context unavailable');
 }
 current(token){return token===this.generation&&!this.disposed;}
 async buffer(id,token=this.generation){
  if(drumById(id)?.retired)throw Error('retired source');
  if(this.cache.has(id))return this.cache.get(id);
  let buffer;
  if(['primitive','melody','bass'].includes(id)){
   const samples=primitiveSamples(id==='primitive'?'drums':id);buffer=this.context.createBuffer(1,samples.length,44100);buffer.copyToChannel(samples,0);
  }else{
   const asset=beginnerById(id)||drumById(id)||vocalById(id);if(!asset)throw Error('unknown asset');
   const response=await this.fetchFn(asset.path);if(!this.current(token))return null;
   if(!response.ok)throw Error('missing asset');
   const bytes=await response.arrayBuffer();if(!this.current(token))return null;
   buffer=await this.context.decodeAudioData(bytes);if(!this.current(token))return null;
  }
  if(buffer.duration<(beginnerById(id)||vocalById(id)?32/3:loopSeconds())-.02)throw Error('short loop');
  if(!this.disposed){if(this.cache.size>=8)this.cache.delete(this.cache.keys().next().value);this.cache.set(id,buffer);}return buffer;
 }
 play({drumId='primitive',stage=1}={}){
  const ids=[drumId,...(stage>=2?['melody']:[]),...(stage>=3?['bass']:[])];
  return this.playDescriptor({key:JSON.stringify(['preview',ids]),owner:'preview',durationSeconds:loopSeconds(),parts:ids.map(id=>({id,loopSeconds:loopSeconds()}))});
 }
 playProject(beat,options){
  if(this.disposed)return Promise.resolve(false);
  const result=resolveBeatPlayback(beat,options);
  if(!result.ok){this.stop();this.status='error';this.error=result.reason;return Promise.resolve(false);}
  return this.playDescriptor(result.descriptor);
 }
 playDescriptor(descriptor){
  if(this.disposed)return Promise.resolve(false);
  if(descriptor.parts.some(part=>drumById(part.id)?.retired)){this.stop();this.status='error';this.error=RETIRED_DRUM_MESSAGE;return Promise.resolve(false);}
  if(this.descriptor?.key===descriptor.key){
   if(this.status==='playing')return Promise.resolve(true);
   if(this.status==='loading')return this.pending;
  }
  const offset=this.descriptor?.key===descriptor.key&&this.status==='paused'?this.offset:0;
  this.stop();this.descriptor=descriptor;this.offset=offset;this.status='loading';this.error='';
  const token=this.generation;this.pending=this.startDescriptor(descriptor,token,offset);return this.pending;
 }
 async startDescriptor(descriptor,token,offset){
  try{
   await this.unlock();if(!this.current(token))return false;
   const buffers=await Promise.all(descriptor.parts.map(part=>this.buffer(part.id,token)));
   if(!this.current(token))return false;
   this.gain=this.context.createGain();this.gain.gain.value=descriptorOutputGain(descriptor);
   const layerEffects=[];
   const master=descriptor.mix?.version===2||descriptor.parts.some(p=>p.vocal)?connectBeatResultMaster(this.context,this.context.destination):connectBeatMix(this.context,descriptor.mix,this.context.destination);
   this.effects={input:master.input,dispose(){layerEffects.forEach(fx=>fx.dispose());master.dispose();}};this.gain.connect(master.input);
   let beatInput=this.gain;
   if(descriptor.mix?.version===1&&descriptor.parts.some(p=>p.vocal)){
    const legacy=connectBeatMix(this.context,descriptor.mix,this.gain);layerEffects.push(legacy);beatInput=legacy.input;
   }
   // Prepare all PCM before reading the shared scheduling clock.
   const prepared=buffers.map((buffer,index)=>{
    const part=descriptor.parts[index];
    buffer=calibratedSourceBuffer(this.context,buffer,part.sourceGainDb);
    if(part.vocal){
     const key=JSON.stringify([part.id,part.loopSeconds,part.vocal]);let processed=this.resultCache.get(key);
     if(!processed){processed=transformVocalBuffer(this.context,buffer,part.vocal,part.loopSeconds);if(this.resultCache.size>=8)this.resultCache.delete(this.resultCache.keys().next().value);this.resultCache.set(key,processed);}
     return {buffer:processed,input:this.gain};
    }
    if(!part.result)return {buffer,input:beatInput};
    const key=JSON.stringify([part.id,part.loopSeconds,part.result,part.sourceGainDb]);
    let transformed=this.resultCache.get(key);
    if(!transformed){transformed=transformBeatBuffer(this.context,buffer,part.result,part.loopSeconds);if(this.resultCache.size>=8)this.resultCache.delete(this.resultCache.keys().next().value);this.resultCache.set(key,transformed);}
    const fx=connectBeatResult(this.context,part.result,beatInput);layerEffects.push(fx);return {buffer:transformed,input:fx.input};
   });
   const arranged=prepared.map(({buffer,input},index)=>{
    const part=descriptor.parts[index];if(!part.windows)return {buffer,input};
    const key=JSON.stringify(['song',part.id,part.loopSeconds,part.result,part.vocal,part.windows,descriptor.durationSeconds,part.sourceGainDb]);let complete=this.resultCache.get(key);
    if(!complete){complete=arrangeSongBuffer(this.context,buffer,part.windows,descriptor.durationSeconds,part.loopSeconds);if(this.resultCache.size>=8)this.resultCache.delete(this.resultCache.keys().next().value);this.resultCache.set(key,complete);}
    return {buffer:complete,input};
   });
   const when=this.context.currentTime+.04;this.startedAt=when;
   arranged.forEach(({buffer,input},index)=>{
    const part=descriptor.parts[index],loop=part.windows?descriptor.durationSeconds:part.loopSeconds,source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=loop;source.connect(input);this.sources.push(source);source.start(when,offset%loop);
   });
   this.status='playing';this.pending=null;
   return true;
  }catch{
   if(this.current(token)){this.stop();this.status='error';this.error='Не удалось воспроизвести звук. Файл может быть недоступен; проект сохранён.';}
   return false;
  }
 }
 getSnapshot(){
  const durationSeconds=this.descriptor?.durationSeconds??0;
  const elapsed=this.status==='playing'?Math.max(0,(this.context?.currentTime??0)-this.startedAt):0;
  return {status:this.status,key:this.descriptor?.key??'',owner:this.descriptor?.owner??null,positionSeconds:durationSeconds?(this.offset+elapsed)%durationSeconds:0,durationSeconds,error:this.error};
 }
 pause(){
  if(!['playing','loading'].includes(this.status))return;
  const offset=this.getSnapshot().positionSeconds;
  this.stop();this.offset=offset;this.status='paused';
 }
 release(voices,gain,effects){
  for(const source of voices){try{source.stop();}catch{/* Already ended. */}try{source.disconnect();}catch{/* Already disconnected. */}}
  try{gain?.disconnect();}catch{/* Already disconnected. */}
  effects?.dispose();
 }
 clearRetiring(){
  for(const item of this.retiring){clearTimeout(item.timer);this.release(item.voices,item.gain,item.effects);}
  this.retiring=[];
 }
 stop({fadeSeconds=0}={}){
  this.generation++;this.pending=null;this.clearRetiring();
  const voices=this.sources,gain=this.gain,effects=this.effects;this.sources=[];this.gain=null;this.effects=null;
  const fade=Math.min(.08,Math.max(0,Number(fadeSeconds)||0));
  if(fade&&voices.length&&gain?.gain?.linearRampToValueAtTime){
   const now=this.context.currentTime;gain.gain.setValueAtTime?.(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+fade);
   for(const source of voices){try{source.stop(now+fade);}catch{/* Already ended. */}}
   const item={voices,gain,effects,timer:null};item.timer=setTimeout(()=>{this.release(voices,gain,effects);this.retiring=this.retiring.filter(other=>other!==item);},fade*1000+20);this.retiring.push(item);
  }else this.release(voices,gain,effects);
  this.offset=0;this.status='stopped';this.error='';
 }
 dispose(){this.stop();this.disposed=true;this.cache.clear();this.resultCache.clear();Promise.resolve(this.context?.close()).catch(()=>{});}
}
