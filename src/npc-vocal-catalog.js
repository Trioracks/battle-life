// Choice uses current packs; source resolution retains historical takes.
import voices from '../data/audio/npc-voices.json?rev=47' with {type:'json'};
import {VOICE_PACKS,ALL_VOCALS,DEFAULT_VOICE_ID,voicePackById,voiceCatalog,vocalById} from './vocal-catalog.js?rev=61';
import {voiceBagSeed,shuffledVoiceOrder,validVoiceBag,migrateVoiceBag} from './voice-bank-migration.js?rev=61';
export const NPC_VOICE_REGISTRY=Object.freeze({...voices,voices:VOICE_PACKS.map(v=>Object.freeze({...v,name:v.label}))});
export const NPC_VOCAL_CATALOG=Object.freeze(NPC_VOICE_REGISTRY.voices.flatMap(v=>v.parts));
export const NPC_VOCAL_SOURCES=ALL_VOCALS;
export const npcVocalById=vocalById;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),safeId=v=>typeof v==='string'&&/^[\w:-]{1,100}$/.test(v);
export function normalizeNpcVoices(raw){
 if(raw===undefined)return {};
 if(!object(raw))return {__invalid:{blocked:true}};
 const entries=Object.entries(raw);if(entries.length>128)return {__invalid:{blocked:true}};
 return Object.fromEntries(entries.map(([id,item])=>[safeId(id)?id:'__invalid',validVoiceBag(item)?{voiceId:item.voiceId,...(item.catalogVersion!==undefined?{catalogVersion:item.catalogVersion}:{}),seed:item.seed,cycle:item.cycle,cursor:item.cursor,order:[...item.order],lastId:item.lastId,...(item.cycle>0?{previousOrder:[...item.previousOrder]}:{}),...(item.migration?{migration:structuredClone(item.migration)}:{})}:{blocked:true}]));
}
function nextTake(item,targetVersion){
 const migrated=migrateVoiceBag(item,{voiceId:item.voiceId,targetVersion});if(!migrated.ok)return null;
 item=migrated.bag;const catalog=voiceCatalog(item.voiceId,targetVersion);
 if(item.cursor===item.order.length){
  if(item.cycle>=999999)return null;
  const {migration,...previous}=item;
  item={...previous,cycle:item.cycle+1,cursor:0,previousOrder:[...item.order],order:shuffledVoiceOrder(catalog,item.seed,item.cycle+1,item)};
 }
 const asset=npcVocalById(item.order[item.cursor]);return {asset,bag:{...item,cursor:item.cursor+1,lastId:asset.id}};
}
function newBag(voiceId,seed,version){return {voiceId,catalogVersion:version,seed,cycle:0,cursor:0,order:shuffledVoiceOrder(voiceCatalog(voiceId,version),seed,0),lastId:null};}
export function selectNpcVocal(raw,{characterId,seed,playerVoiceId=DEFAULT_VOICE_ID}={}){
 const state=normalizeNpcVoices(raw),fail=()=>({ok:false,state,asset:null,reason:'История голоса NPC повреждена. Повторная выдача записей запрещена.'});
 if(!voicePackById(playerVoiceId)||!safeId(characterId)||state.__invalid||state[characterId]?.blocked)return fail();
 let item=state[characterId];
 if(!item){const eligible=NPC_VOICE_REGISTRY.voices.filter(v=>v.id!==playerVoiceId),speaker=eligible[voiceBagSeed(String(seed)+':'+characterId+':speaker')%eligible.length];if(!speaker)return {ok:true,state,asset:null,reason:''};item=newBag(speaker.id,voiceBagSeed(String(seed)+':'+characterId),speaker.catalogVersion);}
 const next=nextTake(item,voicePackById(item.voiceId).catalogVersion);if(!next)return fail();state[characterId]=next.bag;
 return {ok:true,state,asset:next.asset,reason:''};
}
export function normalizePlayerVocalBag(raw,voiceId){
 if(raw==null)return null;
 const item=normalizeNpcVoices({player:raw}).player;return item?.voiceId===voiceId?item:{blocked:true};
}
export function selectPlayerVocal(raw,{voiceId,seed,catalogVersion=voicePackById(voiceId)?.catalogVersion}={}){
 if(!voicePackById(voiceId)||!voiceCatalog(voiceId,catalogVersion))return {ok:false,asset:null};
 let item=normalizePlayerVocalBag(raw,voiceId);if(item?.blocked)return {ok:false,asset:null};
 if(!item)item=newBag(voiceId,seed>>>0,catalogVersion);
 const next=nextTake(item,catalogVersion);return next?{ok:true,...next}:{ok:false,asset:null};
}
