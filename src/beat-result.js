// Temporary balance: a novice's lucky decisions cannot buy professional execution.
import {normalizeGenreSnapshot} from './genre-progression.js?rev=49';
import {normalizeBeatExecutionSnapshot} from './beat-execution-snapshot.js?rev=49';
export const BEAT_RESULT_RULES=Object.freeze({max:110,performanceWeight:.8,base:.55,fitWeight:.55,decisionBonus:20,decisionExponent:6,weakerSkillBase:55,weakerSkillWeight:.55});
const clamp=(x,hi=100)=>Math.max(0,Math.min(hi,x));
const validSkills=s=>Number.isFinite(s?.beatmaking)&&Number.isFinite(s?.sound);
export const beatResultSkills=s=>({beatmaking:clamp(Number.isFinite(s?.beatmaking)?s.beatmaking:10),sound:clamp(Number.isFinite(s?.sound)?s.sound:10)});
export function beatResultSeed(id){let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
export function normalizeBeatResult(value){
 if(!value||!Number.isInteger(value.stage)||value.stage<0||value.stage>2||!Number.isInteger(value.seed)||value.seed<0||value.seed>0xffffffff||!validSkills(value.skills)||!Number.isFinite(value.fit)||!Number.isFinite(value.quality)||!Array.isArray(value.sliders)||value.sliders.length!==3||!value.sliders.every(Number.isFinite))return null;
 const genreProfile=normalizeGenreSnapshot(value.genreProfile);
 const marked=Object.hasOwn(value,'execution'),execution=normalizeBeatExecutionSnapshot(value.execution);if(marked&&!execution)return null;
 return {stage:value.stage,seed:value.seed,skills:beatResultSkills(value.skills),sliders:value.sliders.map(x=>Math.round(clamp(x,10))),fit:clamp(value.fit),quality:clamp(value.quality,110),...(genreProfile?{genreProfile}:{}),...(marked?{execution}:{})};
}
export function createBeatResult({seed,stage,skills,sliders,targets,genreProfile,execution}){
 const snapshot=beatResultSkills(skills),fit=clamp(100-sliders.reduce((sum,v,i)=>sum+Math.abs(v-targets[i]),0)/30*100),f=fit/100,R=BEAT_RESULT_RULES;
 const marked=execution!==undefined,limit=marked?normalizeBeatExecutionSnapshot(execution):null;if(marked&&!limit)return null;
 const skill=limit?.effective??snapshot.beatmaking;
 const ability=skill*R.performanceWeight+snapshot.sound*(1-R.performanceWeight);
 const ceiling=Math.min(limit?.effective??R.max,R.weakerSkillBase+R.weakerSkillWeight*Math.min(skill,snapshot.sound));
 const rounded=Math.round(clamp(ability*(R.base+R.fitWeight*f)+R.decisionBonus*f**R.decisionExponent,ceiling)*10)/10;
 const quality=limit?Math.min(rounded,limit.effective):rounded;
 return normalizeBeatResult({stage,seed,skills:snapshot,sliders,fit,quality,genreProfile,...(marked?{execution:limit}:{})});
}
export function normalizeResultMix(value){
 if(value?.version!==2||!Number.isInteger(value.seed)||value.seed<0||value.seed>0xffffffff||!validSkills(value.skills)||!Array.isArray(value.layers)||value.layers.length!==3)return null;
 const layers=value.layers.map((v,i)=>v===null?null:normalizeBeatResult(v));
 if(layers.some((v,i)=>value.layers[i]!==null&&(!v||v.stage!==i)))return null;
 return {version:2,seed:value.seed,skills:beatResultSkills(value.skills),layers};
}
