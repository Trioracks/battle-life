import {normalizeVoiceId,DEFAULT_VOICE_ID} from './vocal-catalog.js?rev=57';
import {normalizePlayerVocalBag,selectPlayerVocal} from './npc-vocal-catalog.js?rev=57';
import {clampV,createVocalTake,normalizeRecording,recordingQuality,VOCAL_EQUIPMENT,effectiveSoundSkill} from './vocal-result.js?rev=57';
import {normalizeBeat,normalizeMusic,workBlockReason} from './beat-production.js?rev=57';
import {latestReadyLyric} from './lyric-production.js?rev=57';
import {BEAT_RULES as R,RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=57';
import {vocalOutcomes} from './production-outcomes.js?rev=57';
import {chooseSongForm} from './beat-song-form.js?rev=57';
export {recordingQuality};
export const VOCAL_STAGES=Object.freeze({draft:{name:'Черновая запись',minutes:60,skill:'flow'},clean:{name:'Чистовая запись',minutes:60,skill:'flow'},mix:{name:'Сведение',minutes:45,skill:'sound'},master:{name:'Мастеринг',minutes:30,skill:'sound'}});
export function canVocalStage(recording,kind){
 const r=normalizeRecording(recording);
 return kind==='draft'?!r:kind==='clean'?Boolean(r&&!r.clean):kind==='mix'?Boolean(r&&!r.mix&&!r.master):kind==='master'?Boolean(r&&!r.master):false;
}
function validTransition(before,after,kind){
 if(!canVocalStage(before,kind)||!after)return false;
 if(kind==='draft')return after.revision===1&&!after.clean&&!after.mix&&!after.master;
 const expected={...before,revision:before.revision+1};
 if(kind==='clean'){expected.clean=after.clean;expected.mix=null;expected.master=null;if(!after.clean)return false;}
 else {expected[kind]=after[kind];if(!after[kind])return false;}
 return JSON.stringify(expected)===JSON.stringify(after);
}
export function normalizeRecordingState(value,projects=[],voiceContext=null){
 const s=value??{},j=s.job,beat=projects.find(p=>p.id===j?.beatId&&p.kind==='beat'&&p.status==='ready'),before=normalizeRecording(beat?.recording),output=normalizeRecording(j?.output);
 const vocalBag=j?.kind==='draft'&&output?.voiceId!==undefined?normalizePlayerVocalBag(j.vocalBag,output.voiceId):null;
 // Pending drafts replay their original queue version until committed.
 const nextBag=voiceContext&&vocalBag&&!vocalBag.blocked?selectPlayerVocal(voiceContext.playerVocalBag,{voiceId:voiceContext.voiceId,seed:vocalBag.seed,catalogVersion:vocalBag.catalogVersion??1}):null;
 if(nextBag?.bag&&vocalBag.catalogVersion===undefined)delete nextBag.bag.catalogVersion;
 const valid=beat&&VOCAL_STAGES[j.kind]&&j.baseRevision===(before?.revision??0)&&Number.isFinite(j.total)&&j.total>0&&j.total<=600&&Number.isFinite(j.elapsed)&&j.elapsed>=0&&j.elapsed<j.total&&validTransition(before,output,j.kind)&&(!(j.kind==='draft'&&output.voiceId!==undefined)||vocalBag&&!vocalBag.blocked&&vocalBag.lastId===output.sourceId&&(!voiceContext||nextBag?.ok&&JSON.stringify(nextBag.bag)===JSON.stringify(vocalBag)));
 return {equipment:{...VOCAL_EQUIPMENT},practice:{flow:clampV(s.practice?.flow),sound:clampV(s.practice?.sound)},job:valid?{beatId:beat.id,kind:j.kind,baseRevision:j.baseRevision,output,...(vocalBag?{vocalBag}:{}),total:j.total,elapsed:j.elapsed,skill:clampV(j.skill),practiceCredit:clampV(j.practiceCredit,0,j.elapsed/j.total/3)}:null};
}
export const effectiveVocalSkill=(s,skills={},kind='draft')=>{const k=VOCAL_STAGES[kind]?.skill??'flow';return k==='sound'?effectiveSoundSkill(s,skills):clampV((skills[k]??0)+(s.recording?.practice?.[k]??0));};
const normalized=input=>{const projects=(input.projects??[]).map(p=>p.kind==='beat'&&!p.recoveryIssue?normalizeBeat(p)??{id:p.id,kind:p.kind,name:p.name,recoveryIssue:'Не удалось прочитать проект. Исходные данные сохранены.',recoveryData:structuredClone(p)}:p).filter(Boolean);return {...input,projects,music:normalizeMusic(input.music,projects),recording:normalizeRecordingState(input.recording,projects,{voiceId:input.voiceId===undefined?DEFAULT_VOICE_ID:input.voiceId,playerVocalBag:input.playerVocalBag})};};
export function startVocalWork(input,{beatId,textId,kind='draft',sliders}={},skills={},random=Math.random){
 if(input.rapAnalysis?.job?.status==='active'||input.rapResearch?.job?.status==='active')return {ok:false,state:input,reason:'Сначала приостанови изучение.'};
 const s=normalized(input),fail=reason=>({ok:false,reason,state:s}),beat=s.projects.find(p=>p.id===beatId&&p.kind==='beat');
 let voiceId;try{voiceId=normalizeVoiceId(s.voiceId);}catch{return fail('Неизвестный голос героя.');}
 if(input.music?.job||input.writing?.job)return fail('Сначала заверши текущую работу.');
 if(beat?.audioIssue==='retired-source')return fail(RETIRED_DRUM_MESSAGE);
 if(!beat||beat.status!=='ready'||beat.audioIssue)return fail('Сначала закончи бит.');
 const blocked=workBlockReason(s);if(blocked)return fail(blocked);
 if(s.recording.job){if(s.recording.job.beatId!==beatId||s.recording.job.kind!==kind)return fail('Сначала заверши текущую запись.');s.music.activeBeatId=beatId;return {ok:true,state:s};}
 if(!canVocalStage(beat.recording,kind))return fail('Этот этап записи уже выполнен или пока недоступен.');
 const skill=effectiveVocalSkill(s,skills,kind),before=normalizeRecording(beat.recording),text=kind==='draft'?latestReadyLyric(s.projects,textId):null;
 if(kind==='draft'&&text?.status!=='ready')return fail('Для записи нужен готовый текст.');
 const unit=()=>clampV(random(),0,.999999),selection=before?null:selectPlayerVocal(s.playerVocalBag,{voiceId,seed:Math.floor(unit()*4294967295)});
 if(selection&&!selection.ok)return fail('История голоса героя повреждена. Новый дубль не выбран.');
 const sourceId=before?.sourceId??selection.asset.id;
 const values=sliders===undefined||skill<25?Array.from({length:3},()=>Math.floor(unit()*11)):sliders;
 let output=before?structuredClone(before):{version:1,revision:0,text:{id:text.id,name:text.name,revision:text.revision,snapshot:structuredClone(text)},sourceId,voiceId,draft:null,clean:null,mix:null,master:null};
 output.revision++;
 if(kind==='draft'||kind==='clean'){
  const snapshot={...skills,flow:effectiveVocalSkill(s,skills,'draft'),sound:effectiveVocalSkill(s,skills,'mix')};
  output[kind]=createVocalTake({kind,seed:before?.draft.seed??Math.floor(unit()*4294967294)+1,skills:snapshot,sliders:values});
  if(!output[kind])return fail('Проверь настройки записи.');
  if(kind==='clean'){output.clean.quality=Math.max(output.clean.quality,Math.min(output.clean.ceiling,output.draft.quality+3));output.clean.productionOutcome=vocalOutcomes({take:output.clean});}
  output.mix=null;output.master=null;
 }else output[kind]={skill,gain:2};
 output=normalizeRecording(output);
 s.recording.job={beatId,kind,baseRevision:before?.revision??0,output,...(selection?{vocalBag:selection.bag}:{}),total:Math.round(VOCAL_STAGES[kind].minutes*Math.max(.6,1-skill*.003)),elapsed:0,skill,practiceCredit:0};s.music.activeBeatId=beatId;
 return {ok:true,state:s};
}
export function advanceVocalWork(input,requested){
 if(input.rapAnalysis?.job?.status==='active'||input.rapResearch?.job?.status==='active')return {state:input,minutes:0,finished:false,blocked:true,reason:'Сначала приостанови изучение.'};
 const s=normalized(input),j=s.recording.job;
 if(!j||input.music?.job||input.writing?.job||!Number.isFinite(requested)||requested<=0)return {state:s,minutes:0,finished:false,blocked:false};
 const beat=s.projects.find(p=>p.id===j.beatId);
 if(beat?.audioIssue)return {state:s,minutes:0,finished:false,blocked:true,reason:beat.audioIssue==='retired-source'?RETIRED_DRUM_MESSAGE:'Не найден аудиобанк проекта. Работа сохранена.'};
 const needs=s.music.needs,minutes=Math.max(0,Math.min(requested,j.total-j.elapsed,(needs.satiety-R.minSatiety)/R.satietyPerMinute,(needs.energy-R.minEnergy)/R.energyPerMinute));
 j.elapsed+=minutes;needs.satiety=clampV(needs.satiety-minutes*R.satietyPerMinute);needs.energy=clampV(needs.energy-minutes*R.energyPerMinute);
 const finished=j.total-j.elapsed<1e-7,credit=(finished?1:j.elapsed/j.total)/3,gain=Math.max(0,credit-j.practiceCredit),key=VOCAL_STAGES[j.kind].skill;
 s.recording.practice[key]=clampV(s.recording.practice[key]+gain);j.practiceCredit=credit;
 if(finished){
  const i=s.projects.findIndex(p=>p.id===j.beatId),completed={...s.projects[i],recording:j.output};
  if(j.kind==='mix'&&completed.songFormVersion===1&&completed.songForm===undefined)completed.songForm=chooseSongForm(completed);
  s.projects[i]=completed;s.recording.job=null;
  if(j.kind==='draft'&&j.vocalBag)s.playerVocalBag=j.vocalBag;
 }
 return {state:s,minutes,finished,practiceGained:credit,blocked:!finished&&Boolean(workBlockReason(s))};
}
