import {drumById,loopSeconds} from './beat-catalog.js';
import {beginnerById} from './beat-beginner-bank.js?rev=21';

// A project has one musical clock, even when a legacy drum loop is shorter.
export function resolveBeatPlayback(beat,{workStage=null}={}){
 const fail=reason=>({ok:false,reason});
 if(!beat||![2,3].includes(beat.version)||!Array.isArray(beat.stages))return fail('Этот проект пока нельзя прослушать.');
 if(workStage!==null&&(!Number.isInteger(workStage)||workStage<0||workStage>2))return fail('Неизвестный этап работы.');
 const modern=beat.version===3,durationSeconds=modern?32/3:loopSeconds();
 const ids=modern?[beat.drumId,beat.audio?.themeId,beat.audio?.arrangementId]:[beat.drumId,'melody','bass'];
 const validDrum=drumById(ids[0])||(!modern&&ids[0]==='primitive')||(modern&&beginnerById(ids[0])?.kind==='drums');
 if(!validDrum||modern&&(beat.audioIssue||beat.audio?.bankVersion!==1||beat.audio?.bars!==4||beginnerById(ids[1])?.kind!=='theme'||beginnerById(ids[2])?.kind!=='arrangement'))return fail('Не найден аудиобанк проекта. Проект сохранён.');
 const chosen=workStage===null?ids.slice(0,Math.min(3,beat.stages.length)):[ids[workStage]];
 if(!chosen.length)return fail('Сначала завершите ритмическую основу.');
 const owner=workStage===null?'studio':'work',parts=chosen.map(id=>({id,loopSeconds:beginnerById(id)?32/3:loopSeconds()}));
 return {ok:true,reason:'',descriptor:{key:JSON.stringify([beat.id,owner,workStage,chosen]),owner,durationSeconds,parts}};
}
