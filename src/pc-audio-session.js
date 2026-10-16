const stopped=()=>({status:'stopped',key:'',owner:null,positionSeconds:0,durationSeconds:0,error:''});

// App lifetime, not page lifetime. BeatAudio's generation invalidates decoding;
// this generation also prevents stale adapter promises reporting a new owner.
export function createPcAudioSession(audio){
 let owner=null,generation=0,disposed=false,timer=null;
 const adapters=new Map(),subscriptions=new Set();
 const snapshot=id=>!disposed&&owner===id?audio.getSnapshot():stopped();
 const notify=()=>{for(const entry of subscriptions)entry.listener(snapshot(entry.id));};
 const clearTimer=()=>{if(timer!==null)clearInterval(timer);timer=null;};
 const stopAll=options=>{generation++;owner=null;audio.stop(options);notify();};
 function stopOwner(id,options){if(owner===id)stopAll(options);}
 function forOwner(id){
  if(adapters.has(id))return adapters.get(id);
  const play=async(method,args)=>{
   if(disposed||audio.capabilities?.recordedPlayback===false)return false;
   if(owner!==id){stopAll();owner=id;}
   const token=++generation;
   const pending=audio[method](...args);notify();
   const result=await pending;
   if(!disposed&&owner===id&&token===generation){notify();return Boolean(result);}
   return false;
  };
  const adapter={
   get capabilities(){return audio.capabilities;},
   play:(...args)=>play('play',args),playProject:(...args)=>play('playProject',args),playDescriptor:(...args)=>play('playDescriptor',args),
   unlock:()=>disposed?Promise.resolve():audio.unlock?.(),
   getSnapshot:()=>snapshot(id),
   subscribe(listener){
    if(disposed)return ()=>{};
    const entry={id,listener};subscriptions.add(entry);listener(snapshot(id));
    // One app-lifetime clock for every row and owner; no DOM or audio preparation.
    if(timer===null){timer=setInterval(notify,100);timer.unref?.();}
    return ()=>{subscriptions.delete(entry);if(!subscriptions.size)clearTimer();};
   },
   get error(){return !disposed&&owner===id?audio.error??'':'';},
   pause(){if(!disposed&&owner===id){generation++;audio.pause();notify();}},
   stop:options=>stopOwner(id,options),
  };
  adapters.set(id,adapter);return adapter;
 }
 return {forOwner,isOwner:id=>!disposed&&owner===id,stopOwner,stopAll,
  dispose(){if(disposed)return;stopAll();disposed=true;clearTimer();subscriptions.clear();audio.dispose();adapters.clear();}};
}
