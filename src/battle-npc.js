import {DEMO_BATTLE,DEMO_PARTICIPANTS} from './battle-demo-config.js?rev=42';
import {createLyric,startLyricWork,advanceLyricWork,LYRIC_STAGES} from './lyric-production.js?rev=42';
import {createBeat,startBeatStage,advanceBeatWork} from './beat-production.js?rev=42';
import {genreById} from './genre-progression.js?rev=42';
import {createVocalTake} from './vocal-result.js?rev=42';
import {lyricOutcomes,beatOutcomes,vocalOutcomes,combineProductionOutcomes} from './production-outcomes.js?rev=42';
import {resolveBeatPlayback} from './beat-playback.js?rev=42';
import {createBeatSongForm,songPartWindows} from './beat-song-form.js?rev=42';
import {canonicalTrackSignature,normalizeTrackVersions,TRACK_DSP_VERSION} from './track-version.js?rev=42';
import {beatResultSeed} from './beat-result.js?rev=42';
const clone=v=>structuredClone(v),record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),rounds=new Set(['selection','round-2','round-3','round-4','round-5','final']);
const clamp=v=>Math.max(0,Math.min(100,v));
export const npcMeanSkill=skills=>DEMO_BATTLE.noShow.skillKeys.reduce((n,key)=>n+skills[key],0)/DEMO_BATTLE.noShow.skillKeys.length;
function randomFor(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export function normalizeNpcTracks(raw){
 const byRound={},recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[];
 for(const [key,item]of Object.entries(record(raw?.byRound)?raw.byRound:{})){
  if(item?.policyVersion===2&&typeof item.trackVersionId==='string'&&typeof item.characterId==='string'&&rounds.has(item.roundId)&&item.battleId===DEMO_BATTLE.battleId&&key===[item.battleId,item.roundId,item.characterId].join(':'))Object.defineProperty(byRound,key,{value:clone(item),enumerable:true,writable:true,configurable:true});
  else recovery.push({key,recoveryData:clone(item),reason:'Повреждённая связь NPC-работы. Автоматическая перегенерация запрещена.'});
 }
 return {version:2,byRound,recovery};
}
export function ensureNpcRoundTrack(state,{characterId,battleId,roundId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),person=DEMO_PARTICIPANTS.find(p=>p.characterId===characterId);
 if(!person||battleId!==DEMO_BATTLE.battleId||!rounds.has(roundId)||!Number.isFinite(nowMinute)||nowMinute<0)return fail('Неизвестный участник, раунд или время.');
 const key=[battleId,roundId,characterId].join(':'),registry=normalizeNpcTracks(state.npcTracks),versions=normalizeTrackVersions(state.trackVersions),existing=registry.byRound[key];
 if(existing){const v=versions.byId[existing.trackVersionId];return v?.npc?.characterId===characterId&&v.npc.roundId===roundId?{ok:true,state,trackVersionId:existing.trackVersionId,reason:''}:fail('Сохранённая работа NPC недоступна. Исходник не заменён.');}
 if(registry.recovery.some(r=>r.key===key))return fail('Связь сохранённой работы требует восстановления. Новый трек не создан.');
 const seed=beatResultSeed(person.seed+':'+key),random=randomFor(seed),form=(random()*2-1)*person.formVariation;
 const skills=Object.fromEntries(Object.entries(person.skills).map(([k,v])=>[k,Math.round(clamp(v+form))]));
 const decisions=(targets,skill)=>targets.map(target=>skill<25?Math.floor(random()*11):Math.max(0,Math.min(10,Math.round(target+(random()*2-1)*(1-skill/100)*6))));
 // Work in an isolated production state: no player time, inventory or practice is changed.
 let work={roundThemes:state.roundThemes,tournaments:{byId:{[battleId]:{rounds:{[roundId]:{roundId,opensAt:0}}}}},projects:[],music:{needs:{satiety:100,energy:100},genres:{version:1,chosen:person.style==='experimental'?[]:[person.style],primary:person.style,xp:{[person.style]:Math.min(100,skills.beatmaking)}}},writing:{practice:0},recording:{practice:{flow:0,sound:0}}};
 const check=r=>{if(!r.ok)throw new Error(r.reason);return r.state;};
 const lyricId=key+':lyrics',beatId=key+':beat',day=Math.floor(nowMinute/1440)+1;
 try{
  work=check(createLyric(work,{id:lyricId,name:person.nickname+' · '+roundId,battleId,gameDay:day},skills,random));
  for(let stage=0;stage<3;stage++){work.music.needs={satiety:100,energy:100};work=check(startLyricWork(work,{projectId:lyricId,sliders:decisions(LYRIC_STAGES[stage].target,skills.writing),gameDay:day},skills,random));work=advanceLyricWork(work,1000).state;}
  work.music.needs={satiety:100,energy:100};work=check(createBeat(work,{id:beatId,name:person.nickname+' · '+roundId,genre:person.style},skills,random));
  for(let stage=0;stage<3;stage++){work.music.needs={satiety:100,energy:100};work=check(startBeatStage(work,beatId,decisions(genreById(person.style).targets[stage],skills.beatmaking),skills,random));work=advanceBeatWork(work,1000).state;}
  const lyrics=work.projects.find(p=>p.id===lyricId),beat=work.projects.find(p=>p.id===beatId),take=createVocalTake({kind:skills.flow>=25?'clean':'draft',seed,skills,sliders:decisions([8,8,8],skills.flow)}),mixed=skills.sound>=30,mastered=skills.sound>=55;
  const recording={draft:take,mix:mixed?{skill:skills.sound,gain:2}:null,master:mastered?{skill:skills.sound,gain:2}:null};
  const playback=resolveBeatPlayback(beat);if(!playback.ok)return fail(playback.reason);
  const descriptor=clone(playback.descriptor),songForm=createBeatSongForm({...beat,recording});
  descriptor.owner='social';descriptor.key='npc:'+key;descriptor.outputGain=.55*10**(((mixed?3:0)+(mastered?1:0))/20);
  if(songForm){descriptor.durationSeconds=songForm.durationSeconds;descriptor.parts.forEach((p,i)=>p.windows=songPartWindows(songForm,i));}
  const outcome=combineProductionOutcomes(lyricOutcomes({project:lyrics}),beatOutcomes({recipe:beat,descriptor}),vocalOutcomes({take,recording}));
  const id='npc-track:'+key+':v2',requiredAssets=[...descriptor.parts.map(p=>({id:p.id,kind:'instrument'})),{id:'npc-take:'+characterId+':'+roundId,kind:'vocal',voiceId:person.voiceId,characterId}];
  const recipe={beat,lyrics,npcTake:take,npcRecording:recording,descriptor,dspVersion:TRACK_DSP_VERSION},signature=canonicalTrackSignature({recipe,qualities:outcome.qualities,facts:outcome.facts,availability:outcome.availability});
  const version={schemaVersion:1,id,trackId:beatId,name:person.nickname+' — '+(roundId==='selection'?'На отбор':roundId),createdAtMinute:nowMinute,sourceRevision:{policy:2,lyrics:lyrics.revision},signature,recipe,qualities:outcome.qualities,facts:outcome.facts,availability:{...outcome.availability,'audio.npcVoice':'missing'},legacy:{limitedEvidence:false},npc:{characterId,battleId,roundId,seed,voiceId:person.voiceId,skills,meanSkill:npcMeanSkill(skills),diagnosticIndex:Object.values(outcome.qualities).reduce((n,q)=>n+q,0)/4*5,policyVersion:2,requiredAssets,audioStatus:'awaiting-voice',sourceRef:person.sourceRef}};
  if(Object.hasOwn(versions.byId,id))return fail('ID работы уже существует без связи раунда. Перезапись запрещена.');
  versions.byId[id]=clone(version);registry.byRound[key]={battleId,roundId,characterId,trackVersionId:id,policyVersion:2};
  return {ok:true,state:{...state,npcTracks:registry,trackVersions:versions},trackVersionId:id,reason:''};
 }catch(error){return fail('Не удалось собрать работу NPC: '+error.message);}
}
