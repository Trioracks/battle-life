// Only separately supplied and cleared NPC recordings belong here.
// Never alias these voices to the player's vocal catalog.
import voices from '../data/audio/npc-voices.json?rev=45' with {type:'json'};
import {VOICE_PACKS,ALL_VOCALS,DEFAULT_VOICE_ID,voicePackById} from './vocal-catalog.js?rev=45';
export const NPC_VOICE_REGISTRY=Object.freeze({...voices,voices:VOICE_PACKS.map(v=>Object.freeze({...v,name:v.label}))});
export const NPC_VOCAL_CATALOG=Object.freeze(NPC_VOICE_REGISTRY.voices.flatMap(v=>v.parts).map(p=>Object.freeze({...p})));
export const npcVocalById=id=>ALL_VOCALS.find(asset=>asset.id===id);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),safeId=v=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
const seedFor=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
function valid(item){
 const ids=NPC_VOCAL_CATALOG.filter(p=>p.voiceId===item?.voiceId).map(p=>p.id);
 const permutation=order=>Array.isArray(order)&&order.length===ids.length&&new Set(order).size===ids.length&&order.every(id=>ids.includes(id));
 if(!(ids.length>0&&Number.isInteger(item.seed)&&item.seed>=0&&item.seed<=4294967295&&Number.isSafeInteger(item.cycle)&&item.cycle>=0&&item.cycle<1000000&&Number.isInteger(item.cursor)&&item.cursor>=0&&item.cursor<=ids.length&&permutation(item.order)&&(item.cursor===0?item.lastId===null:item.lastId===item.order[item.cursor-1])))return false;
 // Only the immediately preceding exhausted order is needed to reproduce the
 // boundary correction. Validation is bounded by catalog size, never cycle age.
 if(item.cycle>0&&!permutation(item.previousOrder))return false;
 const previous=item.cycle>0?{order:item.previousOrder,lastId:item.previousOrder.at(-1)}:undefined;
 return shuffled(item.voiceId,item.seed,item.cycle,previous).every((id,i)=>id===item.order[i]);
}
// Corruption retains a bounded blocking marker: it must never reset a used bag.
export function normalizeNpcVoices(raw){
 if(raw===undefined)return {};
 if(!object(raw))return {__invalid:{blocked:true}};
 const entries=Object.entries(raw);if(entries.length>128)return {__invalid:{blocked:true}};
 return Object.fromEntries(entries.map(([id,item])=>[safeId(id)?id:'__invalid',valid(item)?{voiceId:item.voiceId,seed:item.seed,cycle:item.cycle,cursor:item.cursor,order:[...item.order],lastId:item.lastId,...(item.cycle>0?{previousOrder:[...item.previousOrder]}:{})}:{blocked:true}]));
}
function shuffled(voiceId,seed,cycle,previous){
 const order=NPC_VOCAL_CATALOG.filter(p=>p.voiceId===voiceId).map(p=>p.id);let x=seedFor(seed+':'+cycle);const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 if(previous&&order.length>1&&order[0]===previous.lastId)[order[0],order[1]]=[order[1],order[0]];
 if(previous&&order.length>2&&order.every((id,i)=>id===previous.order[i]))[order[1],order[2]]=[order[2],order[1]];
 return order;
}
// Returns a candidate state. The caller commits it only with a successful track.
export function selectNpcVocal(raw,{characterId,seed,playerVoiceId=DEFAULT_VOICE_ID}={}){
 const state=normalizeNpcVoices(raw),fail=()=>({ok:false,state,asset:null,reason:'История голоса NPC повреждена. Повторная выдача записей запрещена.'});
 if(!voicePackById(playerVoiceId)||!safeId(characterId)||state.__invalid||state[characterId]?.blocked)return fail();
 let item=state[characterId];
 if(!item){
  const eligible=NPC_VOICE_REGISTRY.voices.filter(v=>v.id!==playerVoiceId);
  // Speaker choice has its own seed. Existing Jura bag seeds and orders stay exact.
  const speaker=eligible[seedFor(String(seed)+':'+characterId+':speaker')%eligible.length];
  if(!speaker)return {ok:true,state,asset:null,reason:''};
  const initial=seedFor(String(seed)+':'+characterId);item={voiceId:speaker.id,seed:initial,cycle:0,cursor:0,order:shuffled(speaker.id,initial,0),lastId:null};
 }
 if(item.cursor===item.order.length){if(item.cycle>=999999)return fail();item={...item,cycle:item.cycle+1,cursor:0,previousOrder:[...item.order],order:shuffled(item.voiceId,item.seed,item.cycle+1,item)};}
 const asset=npcVocalById(item.order[item.cursor]);state[characterId]={...item,cursor:item.cursor+1,lastId:asset.id};
 return {ok:true,state,asset,reason:''};
}

// Player and NPC bags share deterministic validation and cycle protections.
export function normalizePlayerVocalBag(raw,voiceId){
 if(raw==null)return null;
 const item=normalizeNpcVoices({player:raw}).player;
 return item?.voiceId===voiceId?item:{blocked:true};
}
export function selectPlayerVocal(raw,{voiceId,seed}={}){
 if(!voicePackById(voiceId))return {ok:false,asset:null};
 let item=normalizePlayerVocalBag(raw,voiceId);
 if(item?.blocked)return {ok:false,asset:null};
 if(!item){const initial=seed>>>0;item={voiceId,seed:initial,cycle:0,cursor:0,order:shuffled(voiceId,initial,0),lastId:null};}
 const result=selectNpcVocal({player:item},{characterId:'player',playerVoiceId:voiceId});
 return {ok:result.ok,asset:result.asset,bag:result.state.player};
}
