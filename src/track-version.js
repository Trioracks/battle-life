import {normalizeBeat} from './beat-production.js?rev=58';
import {normalizeLyric} from './lyric-production.js?rev=58';
import {resolveBeatPlayback} from './beat-playback.js?rev=58';
import {lyricOutcomes,beatOutcomes,vocalOutcomes,combineProductionOutcomes} from './production-outcomes.js?rev=58';
import {validBeatExecutionMix,validBeatExecutionDescriptor} from './beat-execution-snapshot.js?rev=58';
export const TRACK_DSP_VERSION=1;
const clone=value=>JSON.parse(JSON.stringify(value));
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function canonicalTrackSignature(value){
 if(Array.isArray(value))return '['+value.map(canonicalTrackSignature).join(',')+']';
 if(object(value))return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonicalTrackSignature(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
function digest(value){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(16).padStart(8,'0');}
export function normalizeTrackVersions(raw){
 const byId={},recovery=(Array.isArray(raw?.recovery)?raw.recovery:[]).map(clone);
 for(const [id,v]of Object.entries(object(raw?.byId)?raw.byId:{})){
  if(v?.schemaVersion===1&&v.id===id&&typeof v.trackId==='string'&&typeof v.signature==='string'&&Number.isFinite(v.createdAtMinute)&&v.createdAtMinute>=0&&object(v.recipe)&&object(v.recipe.descriptor)&&Array.isArray(v.recipe.descriptor.parts)&&validBeatExecutionMix(v.recipe.beat?.mix)&&validBeatExecutionDescriptor(v.recipe.descriptor)&&Array.isArray(v.facts)&&object(v.qualities)&&['text','performance','music','sound'].every(k=>v.qualities[k]===null||Number.isFinite(v.qualities[k])&&v.qualities[k]>=0&&v.qualities[k]<=10)){
   // No migration may rerender, rescore, or replace an archived recipe.
   Object.defineProperty(byId,id,{value:clone(v),enumerable:true,writable:true,configurable:true});
  }else recovery.push({id,reason:'Неподдерживаемая или повреждённая версия. Исходные данные сохранены.',recoveryData:clone(v)});
 }
 return {byId,recovery};
}
export function captureTrackVersion(state,{projectId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason});
 if(!Number.isFinite(nowMinute)||nowMinute<0)return fail('Не удалось определить игровое время.');
 const raw=state.projects?.find(p=>p.id===projectId&&p.kind==='beat');
 if(raw?.recoveryIssue)return fail(raw.recoveryIssue);
 const beat=normalizeBeat(raw);
 if(!beat||beat.status!=='ready'||!beat.recording?.draft)return fail('Для сдачи нужен готовый бит и хотя бы черновая запись.');
 const play=resolveBeatPlayback(beat);if(!play.ok)return fail(play.reason);
 const ref=beat.recording.text;
 const lyrics=normalizeLyric(ref.snapshot??state.projects?.find(p=>p.id===ref.id));
 const compatible=lyrics?.status==='ready'&&lyrics.id===ref.id&&lyrics.revision===ref.revision;
 const savedLyrics=compatible?lyrics:null,descriptor=clone(play.descriptor);
 const recipe=clone({beat,lyrics:savedLyrics,descriptor,dspVersion:TRACK_DSP_VERSION});
 const take=beat.recording.clean??beat.recording.draft;
 const textOutcome=savedLyrics?.productionOutcome??lyricOutcomes({project:{id:ref.id,stages:[]}});
 const musicOutcome=beatOutcomes({recipe:beat,descriptor});
 const voiceOutcome=vocalOutcomes({take,recording:beat.recording,descriptor});
 // Preserve the recorded artistic outcome; only the frozen post-processing
 // descriptor adds technical facts. Current character skills never enter here.
 if(take.productionOutcome){
  voiceOutcome.qualities.performance=take.productionOutcome.qualities.performance;
  voiceOutcome.facts=voiceOutcome.facts.filter(f=>!f.key.startsWith('vocal.'));
  voiceOutcome.facts.push(...clone(take.productionOutcome.facts.filter(f=>f.key.startsWith('vocal.'))));
 }
 const outcome=combineProductionOutcomes(textOutcome,musicOutcome,voiceOutcome);
 // Identity includes the realized evidence, not only the audible recipe. A later
 // outcome adapter may create a new attachment, but cannot rewrite an old one.
 const content={recipe,qualities:outcome.qualities,facts:outcome.facts,availability:outcome.availability};
 const signature=canonicalTrackSignature(content),trackVersions=normalizeTrackVersions(state.trackVersions);
 const existing=Object.values(trackVersions.byId).find(v=>canonicalTrackSignature({recipe:v.recipe,qualities:v.qualities,facts:v.facts,availability:v.availability})===signature);
 if(existing)return {ok:true,state:{...state,trackVersions},versionId:existing.id,reason:''};
 const stem='track-'+digest(signature);let id=stem,suffix=1;
 while(Object.hasOwn(trackVersions.byId,id))id=stem+'-'+suffix++;
 const version={schemaVersion:1,id,trackId:beat.id,name:beat.name,createdAtMinute:nowMinute,
  sourceRevision:{beat:digest(canonicalTrackSignature(beat)),lyrics:savedLyrics?.revision??null,vocal:beat.recording.revision},
  signature,recipe,qualities:outcome.qualities,facts:outcome.facts,availability:outcome.availability,
  legacy:{limitedEvidence:Object.values(outcome.qualities).some(v=>v===null)||!savedLyrics?.contentMix,missingContentMix:!savedLyrics?.contentMix,missingText:!savedLyrics,performanceUnavailable:outcome.qualities.performance===null}};
 trackVersions.byId[id]=clone(version);
 return {ok:true,state:{...state,trackVersions},versionId:id,reason:''};
}
