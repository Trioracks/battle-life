import {drumById,loopSeconds} from './beat-catalog.js';

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
 constructor({contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)(),fetchFn=(...a)=>fetch(...a)}={}){Object.assign(this,{contextFactory,fetchFn});this.cache=new Map();this.sources=[];this.generation=0;this.error='';this.disposed=false;}
 async unlock(){if(this.disposed)return;this.context??=this.contextFactory();if(this.context.state==='suspended')await this.context.resume();}
 async buffer(id){
  if(this.cache.has(id))return this.cache.get(id);
  let buffer;
  if(['primitive','melody','bass'].includes(id)){
   const samples=primitiveSamples(id==='primitive'?'drums':id);buffer=this.context.createBuffer(1,samples.length,44100);buffer.copyToChannel(samples,0);
  }else{
   const asset=drumById(id);if(!asset)throw Error('unknown asset');
   const response=await this.fetchFn(asset.path);if(!response.ok)throw Error('missing asset');buffer=await this.context.decodeAudioData(await response.arrayBuffer());
  }
  if(buffer.duration<loopSeconds()-.02)throw Error('short loop');
  if(!this.disposed){if(this.cache.size>=8)this.cache.delete(this.cache.keys().next().value);this.cache.set(id,buffer);}return buffer;
 }
 async play({drumId='primitive',stage=1}={}){
  this.stop();if(this.disposed)return false;const token=this.generation;this.error='';
  try{
   await this.unlock();if(token!==this.generation||this.disposed)return false;
   const ids=[drumId,...(stage>=2?['melody']:[]),...(stage>=3?['bass']:[])],buffers=await Promise.all(ids.map(id=>this.buffer(id)));
   if(token!==this.generation||this.disposed)return false;
   this.gain=this.context.createGain();this.gain.gain.value=.7;this.gain.connect(this.context.destination);
   const when=this.context.currentTime+.04;
   for(const buffer of buffers){const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=loopSeconds();source.connect(this.gain);this.sources.push(source);source.start(when);}
   return true;
  }catch{if(token===this.generation){this.stop();this.error='Не удалось воспроизвести звук. Файл может быть недоступен; проект сохранён.';}return false;}
 }
 stop(){this.generation++;for(const source of this.sources){try{source.stop();source.disconnect();}catch{/* Already ended. */}}this.sources=[];this.gain?.disconnect();this.gain=null;}
 dispose(){this.stop();this.disposed=true;this.cache.clear();Promise.resolve(this.context?.close()).catch(()=>{});}
}
