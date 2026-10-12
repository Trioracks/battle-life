const stopped=()=>({status:'stopped',key:'',owner:null,positionSeconds:0,durationSeconds:0,error:''});

// App lifetime, not page lifetime. BeatAudio's generation invalidates decoding;
// this generation also prevents stale adapter promises reporting a new owner.
export function createPcAudioSession(audio){
 let owner=null,generation=0,disposed=false;
 const adapters=new Map();
 const stopAll=options=>{generation++;owner=null;audio.stop(options);};
 function stopOwner(id,options){if(owner===id)stopAll(options);}
 function forOwner(id){
  if(adapters.has(id))return adapters.get(id);
  const play=async(method,args)=>{
   if(disposed)return false;
   if(owner!==id){stopAll();owner=id;}
   const token=++generation;
   const result=await audio[method](...args);
   return !disposed&&owner===id&&token===generation&&Boolean(result);
  };
  const adapter={
   play:(...args)=>play('play',args),playProject:(...args)=>play('playProject',args),playDescriptor:(...args)=>play('playDescriptor',args),
   unlock:()=>disposed?Promise.resolve():audio.unlock?.(),
   getSnapshot:()=>!disposed&&owner===id?audio.getSnapshot():stopped(),
   get error(){return !disposed&&owner===id?audio.error??'':'';},
   pause(){if(!disposed&&owner===id){generation++;audio.pause();}},
   stop:options=>stopOwner(id,options),
  };
  adapters.set(id,adapter);return adapter;
 }
 return {forOwner,isOwner:id=>!disposed&&owner===id,stopOwner,stopAll,
  dispose(){if(disposed)return;stopAll();disposed=true;audio.dispose();adapters.clear();}};
}
