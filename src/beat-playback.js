import {drumById,loopSeconds} from './beat-catalog.js?rev=31';
import {beginnerById} from './beat-beginner-bank.js?rev=31';
import {normalizeBeatMix} from './beat-mix.js?rev=32';
import {normalizeRecording,vocalPlaybackProfile} from './vocal-result.js?rev=33';
import {createBeatSongForm,songPartWindows} from './beat-song-form.js?rev=32';

// A project has one musical clock, even when a legacy drum loop is shorter.
export function resolveBeatPlayback(beat,{workStage=null,recordingPreview=null}={}){
 const fail=reason=>({ok:false,reason});
 if(!beat||![2,3].includes(beat.version)||!Array.isArray(beat.stages))return fail('Этот проект пока нельзя прослушать.');
 if(workStage!==null&&(!Number.isInteger(workStage)||workStage<0||workStage>2))return fail('Неизвестный этап работы.');
 const modern=beat.version===3;
 const ids=modern?[beat.drumId,beat.audio?.themeId,beat.audio?.arrangementId]:[beat.drumId,'melody','bass'];
 const validDrum=drumById(ids[0])||(!modern&&ids[0]==='primitive')||(modern&&beginnerById(ids[0])?.kind==='drums');
 if(!validDrum||modern&&(beat.audioIssue||beat.audio?.bankVersion!==1||beat.audio?.bars!==4||beginnerById(ids[1])?.kind!=='theme'||beginnerById(ids[2])?.kind!=='arrangement'))return fail('Не найден аудиобанк проекта. Проект сохранён.');
 const chosen=workStage===null?ids.slice(0,Math.min(3,beat.stages.length)):[ids[workStage]];
 if(!chosen.length)return fail('Сначала завершите ритмическую основу.');
 const mix=normalizeBeatMix(beat.mix);
 const recording=normalizeRecording(recordingPreview??beat.recording);
 if((recordingPreview||beat.recording)&&!recording)return fail('Не найдена запись вокала. Проект сохранён.');
 const post=(recording?.mix?2:0)+(recording?.master?2:0);
 const form=workStage===null&&!recordingPreview?createBeatSongForm({...beat,recording}):null;
 const durationSeconds=form?.durationSeconds??(modern||recordingPreview||beat.recording?32/3:loopSeconds());
 const owner=workStage===null&&!recordingPreview?'studio':'work',parts=chosen.map((id,index)=>{
  const part={id,loopSeconds:beginnerById(id)?32/3:loopSeconds()},layer=mix?.version===2?mix.layers[workStage??index]:null;
  if(layer)part.result=post&&workStage===null?{...layer,quality:Math.min(110,layer.quality+post),postGain:post}:layer;
  if(form)part.windows=songPartWindows(form,index);return part;
 });
 if(recording&&workStage===null&&beat.stages.length===3){const vocal={id:recording.sourceId,loopSeconds:32/3,vocal:vocalPlaybackProfile(recording)};if(form)vocal.windows=songPartWindows(form,3);parts.push(vocal);}
 return {ok:true,reason:'',descriptor:{key:JSON.stringify([beat.id,owner,workStage,chosen,mix,recording]),owner,durationSeconds,parts,mix}};
}
