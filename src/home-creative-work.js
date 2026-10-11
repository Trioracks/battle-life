// Shared real-time work integration for the apartment camera.
import {advanceBeatWork,effectiveBeatSkill} from './beat-production.js?rev=28';
import {advanceLyricWork,effectiveWritingSkill} from './lyric-production.js?rev=28';
import {BEAT_RULES} from './beat-catalog.js';
import {advanceVocalWork,effectiveVocalSkill} from './vocal-production.js?rev=28';
export function creativeWorkDescriptor(state,skills={}){
 const writing=Boolean(state.writing?.job),recording=!writing&&Boolean(state.recording?.job),job=writing?state.writing.job:recording?state.recording.job:state.music?.job;
 const id=writing?job?.projectId:job?.beatId,project=state.projects.find(p=>p.id===id);
 return {writing,recording,job,project,skill:writing?effectiveWritingSkill(state,skills):recording?effectiveVocalSkill(state,skills,job.kind):effectiveBeatSkill(state,skills)};
}
export function advanceCreativeWork(state,seconds,clock=null){
 const {writing,recording,job}=creativeWorkDescriptor(state);
 const minutes=job&&Number.isFinite(seconds)&&seconds>0?seconds*job.total/BEAT_RULES.workSeconds:0;
 return writing?advanceLyricWork(state,minutes,clock):recording?advanceVocalWork(state,minutes):advanceBeatWork(state,minutes);
}
