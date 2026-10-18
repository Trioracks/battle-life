import {NPC_VOCAL_CATALOG} from './npc-vocal-catalog.js?rev=45';
export function npcPlaybackDescriptor(version,vocalCatalog=NPC_VOCAL_CATALOG){
 if(!version?.npc||!Array.isArray(version.npc.requiredAssets)||version.npc.requiredAssets.some(a=>!a||typeof a.id!=='string')||!Array.isArray(version.recipe?.descriptor?.parts)||version.recipe.descriptor.parts.some(p=>!p||typeof p.id!=='string'))return {ok:false,reason:'Версия NPC недоступна.',missingAssets:[]};
 const requirements=version.npc.requiredAssets.filter(a=>a.kind==='vocal'),descriptor=structuredClone(version.recipe.descriptor);
 if(version.npc.audioStatus==='complete'&&(requirements.length!==1||descriptor.parts.filter(p=>p.vocal).length!==1||descriptor.parts.some(p=>p.vocal&&!requirements.some(a=>a.id===p.id))))return {ok:false,reason:'Источники голоса NPC не совпадают с сохранённой работой.',missingAssets:[]};
 const missingAssets=requirements.filter(wanted=>wanted.characterId!==version.npc.characterId||wanted.voiceId!==version.npc.voiceId||!descriptor.parts.some(p=>p.vocal&&p.id===wanted.id)||!vocalCatalog.some(asset=>asset.id===wanted.id&&asset.voiceId===wanted.voiceId&&(!asset.characterId||asset.characterId===wanted.characterId)&&asset.verified===true));
 if(version.npc.audioStatus!=='complete'||missingAssets.length){
  return {ok:false,descriptor:null,previewDescriptor:{...descriptor,key:'npc-beat-preview:'+version.id,parts:descriptor.parts.filter(p=>!p.vocal)},missingAssets:missingAssets.length?structuredClone(missingAssets):structuredClone(requirements),reason:'Голос NPC ещё не записан. Доступен только предпросмотр бита без голоса.'};
 }
 return {ok:true,descriptor,missingAssets:[],reason:''};
}
