import {prepareBeatPcm} from './beat-pcm-runtime.js?rev=44';
export function createBeatPcmProcessor({createWorker=typeof Worker==='undefined'?null:()=>new Worker(new URL('./beat-pcm-worker.js?rev=44',import.meta.url),{type:'module'})}={}){
 let worker=null,sequence=0,disposed=false;const pending=new Map();
 function cancel(reason='PCM cancelled'){
  const previous=worker;worker=null;previous?.terminate();
  for(const job of pending.values())job.reject(Error(reason));pending.clear();
 }
 function getWorker(){
  if(worker)return worker;
  const current=createWorker();worker=current;
  current.onmessage=({data})=>{
   if(worker!==current)return;
   const job=pending.get(data.id);if(!job)return;pending.delete(data.id);
   if(data.error){job.reject(Error(data.error));return;}
   try{const buffer=job.context.createBuffer(data.channels.length,data.channels[0].length,data.sampleRate);data.channels.forEach((ch,i)=>buffer.copyToChannel(ch,i));job.resolve(buffer);}catch(error){job.reject(error);}
  };
  current.onerror=event=>{event.preventDefault?.();if(worker===current)cancel('PCM worker failed');};
  current.onmessageerror=()=>{if(worker===current)cancel('PCM worker message failed');};
  return current;
 }
 return {
  async prepare(context,buffer,part,duration){
   if(disposed)throw Error('PCM processor disposed');
   if(!part.sourceGainDb&&!part.vocal&&!part.result&&!part.windows)return buffer;
   // Non-browser callers (offline tools and Node tests) retain the synchronous
   // reference path; browser worker errors never fall back to blocking DSP.
   if(!createWorker)return prepareBeatPcm(context,buffer,part,duration);
   const active=getWorker(),id=++sequence,channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i).slice());
   return new Promise((resolve,reject)=>{
    pending.set(id,{context,resolve,reject});
    try{active.postMessage({id,channels,sampleRate:buffer.sampleRate,part,duration},channels.map(ch=>ch.buffer));}catch(error){pending.delete(id);reject(error);}
   });
  },cancel,dispose(){disposed=true;cancel();}
 };
}
