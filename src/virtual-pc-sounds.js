// Original short motifs: no dependency on proprietary operating-system recordings.
const MOTIFS={
 export:[[1174.66,0,.06],[783.99,.07,.13],[1567.98,.15,.18]],
 startup:[[392,0,.65],[523.25,.17,.72],[659.25,.36,.85],[783.99,.63,1.05]],
 shutdown:[[659.25,0,.55],[493.88,.22,.6],[329.63,.46,.85]],
 studio:[[220,0,.28],[440,.12,.36],[554.37,.28,.62],[880,.4,.55]],
};
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
   }else if(MOTIFS[cue]&&!this.clips[cue]?.path){
    for(const [frequency,offset,length]of MOTIFS[cue]){
     const source=c.createOscillator(),gain=c.createGain(),t=c.currentTime+offset;
     source.type='sine';source.frequency.setValueAtTime(frequency,t);
     gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.055,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+length);
     source.connect(gain).connect(c.destination);this.track(source,gain);source.start(t);source.stop(t+length+.01);
    }
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
