import {vocalById} from './vocal-catalog.js?rev=28';
export const clampV=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
const text=(v,n=100)=>typeof v==='string'?v.trim().slice(0,n):'';
export const VOCAL_EQUIPMENT=Object.freeze({microphone:'desk-mic',interface:'onboard'});
export const VOCAL_CEILING=44;
export const effectiveSoundSkill=(state,skills={})=>clampV((Number.isFinite(skills.sound)?skills.sound:10)+clampV(state.recording?.practice?.sound));
export function createVocalTake({kind='draft',seed=1,skills={},sliders=[5,5,5]}={}){
 if(!['draft','clean'].includes(kind)||!Array.isArray(sliders)||sliders.length!==3||!sliders.every(Number.isFinite))return null;
 const values=sliders.map(v=>clampV(v,0,10)),snapshot=Object.fromEntries(['flow','sound','musicality','confidence'].map(k=>[k,clampV(skills[k]??10)]));
 const fit=1-values.reduce((sum,v)=>sum+Math.abs(v-8),0)/30;
 const ability=snapshot.flow*.6+snapshot.sound*.15+snapshot.musicality*.15+snapshot.confidence*.1;
 const quality=Math.min(VOCAL_CEILING,Math.max(4,ability*(.55+.45*fit)+10*fit+(kind==='clean'?7:0)));
 return {kind,seed:clampV(seed,1,4294967295)>>>0,skills:snapshot,sliders:values,fit:fit*100,quality,ceiling:VOCAL_CEILING,equipment:{...VOCAL_EQUIPMENT}};
}
function take(v,kind){return v?.kind===kind&&Number.isFinite(v.seed)&&v.skills?createVocalTake(v):null;}
export function normalizeRecording(v){
 if(v?.version!==1||!vocalById(v.sourceId)||!text(v.text?.id)||!text(v.text?.name,64)||!Number.isInteger(v.revision)||v.revision<1)return null;
 const draft=take(v.draft,'draft');if(!draft)return null;
 const clean=take(v.clean,'clean'),post=p=>p&&Number.isFinite(p.skill)?{skill:clampV(p.skill),gain:2}:null;
 if(clean)clean.quality=Math.max(clean.quality,Math.min(VOCAL_CEILING,draft.quality+3));
 return {version:1,revision:v.revision,text:{id:text(v.text.id),name:text(v.text.name,64),revision:Math.max(1,Math.floor(clampV(v.text.revision,1,1e6)))},sourceId:v.sourceId,draft,clean,mix:post(v.mix),master:post(v.master)};
}
export function recordingQuality(value){const r=normalizeRecording(value);if(!r)return 0;const t=r.clean??r.draft;return Math.min(t.ceiling,t.quality+(r.mix?2:0)+(r.master?2:0));}
export function vocalPlaybackProfile(value){const r=normalizeRecording(value);if(!r)return null;return {...(r.clean??r.draft),quality:recordingQuality(r),postGain:(r.mix?2:0)+(r.master?2:0)};}
