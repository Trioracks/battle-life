// Shared real-time work integration for the apartment camera.
import {advanceBeatWork,effectiveBeatSkill} from './beat-production.js?rev=44';
import {advanceLyricWork,effectiveWritingSkill} from './lyric-production.js?rev=44';
import {BEAT_RULES} from './beat-catalog.js?rev=44';
import {advanceVocalWork,effectiveVocalSkill} from './vocal-production.js?rev=44';
import {startCreativeChain,pauseCreativeChain,creativeChainProgress} from './creative-workflow.js?rev=44';
import {advanceStudy} from './rap-analysis.js?rev=44';
import {advanceCaseStudy,STUDY_MINUTES_PER_SECOND} from './rap-research.js?rev=44';
import {gameMinuteStamp} from './game-minute.js?rev=44';
export function creativeWorkDescriptor(state,skills={}){
 if(state.rapResearch?.job?.status==='active'){const job=state.rapResearch.job;return {researching:true,studying:true,writing:false,recording:false,job,project:{id:job.id,kind:'study',name:{battle:'Изучение баттла',round:'Изучение раунда',judge:'Изучение судьи',opponent:'Изучение соперника'}[job.kind]},performance:'typing',chainProgress:null,skill:job.heroSnapshot.intelligence};}
 if(state.rapAnalysis?.job?.status==='active'){const job=state.rapAnalysis.job;return {studying:true,writing:false,recording:false,job,project:{id:job.id,kind:'study',name:job.trackName},performance:'typing',chainProgress:null,skill:job.heroSnapshot.intelligence};}
 const writing=Boolean(state.writing?.job),recording=!writing&&Boolean(state.recording?.job),job=writing?state.writing.job:recording?state.recording.job:state.music?.job;
 const id=writing?job?.projectId:job?.beatId,project=state.projects.find(p=>p.id===id);
 return {writing,recording,job,project,performance:recording&&['draft','clean'].includes(job.kind)?'rapping':'typing',chainProgress:state.creativeWork?.activeId===id?creativeChainProgress(state,id):null,skill:writing?effectiveWritingSkill(state,skills):recording?effectiveVocalSkill(state,skills,job.kind):effectiveBeatSkill(state,skills)};
}
export function advanceCreativeWork(state,seconds,clock=null,skills={}){
 let descriptor=creativeWorkDescriptor(state,skills);
 if(!descriptor.job||!Number.isFinite(seconds)||seconds<=0)return {state,minutes:0,finished:false,blocked:false,practiceGained:0,stageFinished:false};
 if(descriptor.studying){const request=Math.min(seconds*STUDY_MINUTES_PER_SECOND,descriptor.job.total-descriptor.job.elapsed),start=gameMinuteStamp(clock)??descriptor.job.startedAt+descriptor.job.elapsed;return (descriptor.researching?advanceCaseStudy:advanceStudy)(state,{gameMinutes:request,nowMinute:start+request});}
 const projectId=descriptor.project?.id,chain=state.creativeWork?.activeId===projectId;
 const key=descriptor.writing?'writing':'music',before=state[key]?.practice??0;
 let remaining=seconds,minutes=0,stageFinished=false,practiceGained=0,finished=false,blocked=false,reason='';
 // Three base stages at most. Vocal/addition jobs intentionally stay single-stage.
 for(let pass=0;pass<3&&remaining>1e-9;pass++){
  if(pass>0)descriptor=creativeWorkDescriptor(state,skills);const {writing,recording,job}=descriptor;if(!job)break;
  const localClock=clock?{day:clock.day+Math.floor((clock.minutes+minutes)/1440),minutes:(clock.minutes+minutes)%1440}:null;
  const request=Math.min(remaining*job.total/BEAT_RULES.workSeconds,job.total-job.elapsed);
  const r=writing?advanceLyricWork(state,request,localClock):recording?advanceVocalWork(state,request):advanceBeatWork(state,request);
  state=r.state;minutes+=r.minutes;remaining-=r.minutes/job.total*BEAT_RULES.workSeconds;
  practiceGained=r.practiceGained??0;finished=r.finished;blocked=r.blocked;reason=r.reason??'';stageFinished||=r.finished;
  if(!chain||blocked||!finished)break;
  if(state.projects.find(p=>p.id===projectId)?.stages.length===3){state={...state,creativeWork:{...state.creativeWork,activeId:null}};break;}
  const next=startCreativeChain(state,{kind:writing?'lyrics':'beat',projectId,gameDay:localClock?.day??1},skills);
  finished=false;
  if(!next.ok){blocked=true;reason=next.reason;break;}
  state=next.state;
 }
 if(chain&&blocked)state=pauseCreativeChain(state);
 return {state,minutes,finished,blocked,reason,stageFinished,practiceGained:chain?Math.max(0,state[key].practice-before):practiceGained};
}
