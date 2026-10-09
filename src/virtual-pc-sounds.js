export class PcSounds{
 constructor({AudioContext=globalThis.AudioContext??globalThis.webkitAudioContext,fetch=globalThis.fetch,clips={}}={}){this.AudioContext=AudioContext;this.fetch=fetch;this.clips=clips;this.context=null;this.generation=0;this.nodes=new Set();this.disposed=false;}
 async unlock(){if(this.disposed||!this.AudioContext)return;this.context??=new this.AudioContext();await this.context.resume();}
 async play(cue){
  if(this.disposed||!this.AudioContext)return {ok:false,reason:'audio-unavailable'};
  const generation=this.generation;
  try{
   await this.unlock();if(this.disposed||generation!==this.generation)return {ok:false,reason:'cancelled'};
   const c=this.context;
   if(cue==='bios'||cue==='click'){
    const count=cue==='bios'?4:1;
    for(let i=0;i<count;i++){const source=c.createOscillator(),gain=c.createGain(),t=c.currentTime+i*.19,length=cue==='bios'?.075:.023;source.type='triangle';source.frequency.setValueAtTime(cue==='bios'?760:1350,t);gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(cue==='bios'?.045:.018,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+length);source.connect(gain).connect(c.destination);this.track(source,gain);source.start(t);source.stop(t+length+.005);}
   }else{
    const path=this.clips[cue]?.path;if(!path)return {ok:false,reason:'missing-clip'};
    const response=await this.fetch(path);if(!response.ok)return {ok:false,reason:'clip-unavailable'};
    const buffer=await c.decodeAudioData(await response.arrayBuffer());if(this.disposed||generation!==this.generation)return {ok:false,reason:'cancelled'};
    const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.setValueAtTime(.3,c.currentTime);source.connect(gain).connect(c.destination);this.track(source,gain);source.start(c.currentTime);
   }
   return {ok:true,reason:null};
  }catch{return {ok:false,reason:'audio-unavailable'};}
 }
 track(source,gain){const group={source,gain};this.nodes.add(group);source.onended=()=>{source.disconnect();gain.disconnect();this.nodes.delete(group);};}
 stop(){this.generation++;for(const {source,gain} of this.nodes){try{source.stop();}catch{}source.disconnect();gain.disconnect();}this.nodes.clear();}
 dispose(){this.stop();this.disposed=true;try{Promise.resolve(this.context?.close()).catch(()=>{});}catch{}}
}
