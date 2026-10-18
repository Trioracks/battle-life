import jura from '../assets/audio/ft/npc-jura-v1/manifest.json?rev=45' with {type:'json'};
import artem from '../assets/audio/ft/npc-artem-v1/manifest.json?rev=45' with {type:'json'};
import gans from '../assets/audio/ft/npc-gans-v1/manifest.json?rev=45' with {type:'json'};
import kapa from '../assets/audio/ft/npc-kapa-v1/manifest.json?rev=45' with {type:'json'};
export const DEFAULT_VOICE_ID='player-voice:original';
export const VOCALS=Object.freeze(Array.from({length:54},(_,i)=>{
 const n=String(i+1).padStart(2,'0');
 return Object.freeze({id:'vocal-'+n,voiceId:DEFAULT_VOICE_ID,verified:true,name:'Дубль / '+n,bpm:90,bars:4,key:'A minor',seconds:32/3,path:'./assets/audio/ft/vocals-v'+(i<40?1:2)+'/'+n+'.wav'});
}));
const pack=(id,label,parts)=>Object.freeze({id,label,parts:Object.freeze(parts.map(p=>Object.freeze({...p})))});
export const VOICE_PACKS=Object.freeze([
 pack(DEFAULT_VOICE_ID,'Геннадий Зелёнкин',VOCALS),
 pack('npc-voice:kapa-20261018','Глеб Курилков',kapa.parts.filter(p=>p.peak>0&&p.rms>0)),
 pack('npc-voice:gans-20261018','Ганс Аристократов',gans.parts.filter(p=>p.peak>0&&p.rms>0)),
 pack('npc-voice:artem-20261018','Филипп Филов',artem.parts),
 pack('npc-voice:jura-20261018','Юрий Комбучев',jura.parts),
]);
export const voicePackById=id=>VOICE_PACKS.find(p=>p.id===id);
export function normalizeVoiceId(id){if(id===undefined)return DEFAULT_VOICE_ID;if(!voicePackById(id))throw Error('Неизвестный голос героя.');return id;}
export const ALL_VOCALS=Object.freeze([...VOCALS,...kapa.parts,...gans.parts,...artem.parts,...jura.parts].map(p=>Object.freeze({...p})));
const index=new Map(ALL_VOCALS.map(v=>[v.id,v]));
export const vocalById=id=>index.get(id);
