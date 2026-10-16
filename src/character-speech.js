import {BEAT_RULES} from './beat-catalog.js?rev=44';
export function workNeedSpeech(state) {
 const needs=state.music?.needs;
 return needs?.satiety<=BEAT_RULES.minSatiety+1e-7?'Не могу работать, хочу поесть.':needs?.energy<=BEAT_RULES.minEnergy+1e-7?'Не могу работать, хочу поспать.':'';
}
export function createCharacterSpeech({beep=()=>{}}={}) {
 let current='',queued='',elapsed=0,count=0,clock=0,lastBeep=-Infinity,present=true,serial=0;
 function start(text){current=text;elapsed=0;count=0;serial++;}
 return {
  say(text,{afterRoom=false}={}){if(!text)return;if(afterRoom){queued=text;current='';count=0;}else{queued='';start(text);}},
  clear(){current=queued='';count=0;},
  tick(dt,{hidden=false,present:shown=true,roomReady=true,audioAllowed=true}={}){
   present=shown&&!hidden;
   if(!present)return;
   const delta=Number.isFinite(dt)?Math.max(0,dt):0;clock+=delta;
   if(queued&&roomReady){const text=queued;queued='';start(text);return;}
   if(!current)return;
   const before=count;elapsed+=delta;
   count=Math.min(current.length,Math.floor(current.length*Math.min(1,elapsed/2)+1e-8));
   if(count>before&&/\S/u.test(current.slice(before,count))&&clock-lastBeep>=.1-1e-8){
    lastBeep=clock;
    if(audioAllowed)try{beep();}catch{/* Audio is optional and never replays. */}
   }
   if(elapsed>=5-1e-8){current='';count=0;}
  },
  get snapshot(){return {text:current.slice(0,count),fullText:current,visible:present&&Boolean(current),serial};},
 };
}
