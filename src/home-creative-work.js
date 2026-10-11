// Shared real-time work integration for the apartment camera.
import {advanceBeatWork,effectiveBeatSkill} from './beat-production.js?rev=27';
import {advanceLyricWork,effectiveWritingSkill} from './lyric-production.js?rev=27';
import {BEAT_RULES} from './beat-catalog.js';
export function creativeWorkDescriptor(state,skills={}){
 const writing=Boolean(state.writing?.job),job=writing?state.writing.job:state.music?.job;
 const id=writing?job?.projectId:job?.beatId,project=state.projects.find(p=>p.id===id);
 return {writing,job,project,skill:writing?effectiveWritingSkill(state,skills):effectiveBeatSkill(state,skills)};
}
export function advanceCreativeWork(state,seconds,clock=null){
 const {writing,job}=creativeWorkDescriptor(state);
 const minutes=job&&Number.isFinite(seconds)&&seconds>0?seconds*job.total/BEAT_RULES.workSeconds:0;
 return writing?advanceLyricWork(state,minutes,clock):advanceBeatWork(state,minutes);
}
