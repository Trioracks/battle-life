import {TRACK_DSP_VERSION} from './track-version.js?rev=57';
import {beginnerById} from './beat-beginner-bank.js?rev=57';
import {drumById,RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=57';
import {vocalById,DEFAULT_VOICE_ID} from './vocal-catalog.js?rev=57';
import {npcPlaybackDescriptor} from './battle-npc-audio.js?rev=57';
import {npcVocalById} from './npc-vocal-catalog.js?rev=57';
export async function playTrackVersion(audio,version){
 const fail=reason=>{audio?.stop?.();return {ok:false,reason};};
 if(version?.schemaVersion!==1||version.recipe?.dspVersion!==TRACK_DSP_VERSION)return fail('Эта версия обработки пока не поддерживается. Работа сохранена без изменений.');
 if(version.npc){const npc=npcPlaybackDescriptor(version);if(!npc.ok)return fail(npc.reason);}
 const descriptor=version.recipe.descriptor;
 if(!Array.isArray(descriptor?.parts)||!descriptor.parts.length||!Number.isFinite(descriptor.durationSeconds)||descriptor.durationSeconds<=0)return fail('Аудиорецепт повреждён. Работа сохранена.');
 for(const part of descriptor.parts){
  if(!version.npc&&(part.vocal||vocalById(part.id))){
   const recording=version.recipe.beat?.recording,voiceId=recording?.voiceId===undefined?DEFAULT_VOICE_ID:recording.voiceId;
   if(!part.vocal||!recording||part.id!==recording.sourceId||vocalById(part.id)?.voiceId!==voiceId||(part.voiceId!==undefined&&part.voiceId!==voiceId))return fail('Голос не совпадает с сохранённой записью.');
  }
  if(drumById(part.id)?.retired)return fail(RETIRED_DRUM_MESSAGE);
  if(!['primitive','melody','bass'].includes(part.id)&&!beginnerById(part.id)&&!drumById(part.id)&&!vocalById(part.id)&&!(version.npc&&part.vocal&&npcVocalById(part.id)))return fail('Источник этой версии недоступен. Подмена звука не выполнялась.');
 }
 try{
  const ok=await audio.playDescriptor(JSON.parse(JSON.stringify({...descriptor,key:'version:'+version.id,owner:'social'})));
  return {ok:Boolean(ok),reason:ok?'':audio.error||'Не удалось воспроизвести сохранённую работу.'};
 }catch{return fail('Не удалось воспроизвести сохранённую работу.');}
}
