import {createPcRoomOutput} from './pc-room-audio.js?rev=43';

// A separate voice through the apartment's existing speaker acoustics. It never
// takes ownership of, stops or queues behind a song playing on the computer.
export function createPcSocialNotifications({contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)()}={}){
 let context=null,output=null,disposed=false,baseline=false,lastEvents,lastQueue;
 const seen=new Set(),voices=new Set();
 function consume(state){
  const events=state?.socialRuntime?.events,queue=state?.phone?.queue;
  if(baseline&&events===lastEvents&&queue===lastQueue)return false;
  lastEvents=events;lastQueue=queue;let fresh=false;
  const incoming=[...(events??[]).filter(e=>['personal-message','submission-ack'].includes(e.type)),...(queue??[]).filter(e=>e.source==='В кругу')];
  for(const event of incoming)if(typeof event.id==='string'&&!seen.has(event.id)){seen.add(event.id);fresh=true;}
  const audible=baseline&&fresh;baseline=true;return audible;
 }
 function stop(){
  for(const {source,gain} of voices){try{source.stop();}catch{}source.disconnect();gain.disconnect();}voices.clear();
 }
 function play(){
  if(!context||context.state!=='running'||!output)return;
  // Coalesce a worker batch into one motif; overlapping beeps are not useful.
  stop();
  for(let i=0;i<4;i++){
   const source=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*.16;
   source.type='sine';source.frequency.setValueAtTime(880,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(.065,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+.085);
   source.connect(gain).connect(output.input);const voice={source,gain};voices.add(voice);
   source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(voice);};source.start(at);source.stop(at+.09);
  }
 }
 return {
  async unlock(){if(disposed)return;try{context??=contextFactory();if(context.state==='suspended')await context.resume();if(disposed)return;if(!output)output=createPcRoomOutput(context);}catch{/* Audio may be unavailable; no delayed notification backlog. */}},
  update(state,{frame,enabled=true}={}){
   if(disposed)return;
   output?.update({...frame,desktop:false});
   const fresh=consume(state);
   if(!enabled||state?.power!=='on'){stop();return;}
   if(fresh)play();
  },
  reset(state){stop();seen.clear();baseline=false;lastEvents=lastQueue=undefined;if(state)consume(state);},
  stop,
  dispose(){if(disposed)return;disposed=true;stop();output?.dispose();output=null;seen.clear();},
 };
}
