// Authored game preferences, not measurements of historical judges or published rules.
const rounds=new Set(['selection','round-2','round-3','round-4','round-5','final']);
const definitions={
 'makarevich-1':{addressing:.65,approach:'battle',genres:['experimental','boom-bap'],effects:.25},
 'concrete-echo':{addressing:.2,approach:'personal',genres:['boom-bap','experimental'],effects:.1},
 'open-mic-17':{addressing:0,approach:'personal',genres:['experimental','boom-bap','trap'],effects:.35},
 'yard-cipher':{addressing:.5,approach:'battle',genres:['boom-bap','experimental'],effects:.15}
};
const clamp=v=>Math.max(0,Math.min(1,v));
export function battleFormat(battleId,roundId='selection'){
 const p=definitions[battleId];if(!p||!rounds.has(roundId))return null;
 return {battleId,roundId,version:1,provenance:'authored-game-preferences',maxPenalty:1.5,
  axes:{diss_addressing:{weight:.3,target:p.addressing},text_approach:{weight:.3,target:p.approach},genre_profile:{weight:.2,preferred:[...p.genres]},sound_aesthetic:{weight:.2,target:p.effects}},
  hardRules:{maxDurationSeconds:120}};
}
function axisFact(version,key){
 const facts=version?.facts??[],explicit=facts.find(f=>f.key==='format.'+key&&f.value!==null);
 if(explicit)return {fact:explicit,value:explicit.value};
 const mapped={diss_addressing:'text.addressing',text_approach:'text.approach',genre_profile:'music.genre',sound_aesthetic:'audio.intentionalEffects'}[key],fact=facts.find(f=>f.key===mapped&&f.value!==null);
 if(!fact)return null;
 return {fact,value:key==='diss_addressing'&&Number.isFinite(fact.value)?fact.value/100:fact.value};
}
export function formatMismatch(version,format){
 const axes=[],evidenceIds=[];let total=0,weight=0,unknown=false;
 for(const [key,spec]of Object.entries(format?.axes??{})){
  const input=axisFact(version,key);if(!input){unknown=true;continue;}
  const {fact,value}=input;
  const mismatch=Array.isArray(spec.preferred)?(spec.preferred.includes(value)?0:1):Number.isFinite(spec.target)&&Number.isFinite(value)?clamp(Math.abs(spec.target-value)):typeof spec.target===typeof value?Number(spec.target!==value):null;
  if(mismatch===null||!Number.isFinite(spec.weight)||spec.weight<=0){unknown=true;continue;}
  total+=mismatch*spec.weight;weight+=spec.weight;evidenceIds.push(fact.id);axes.push({key,mismatch,evidenceId:fact.id});
 }
 return {value:weight?total/weight:0,evidenceIds:[...new Set(evidenceIds)],axes,limitedEvidence:unknown};
}
export function checkHardRules(version,format){
 const duration=version?.recipe?.descriptor?.durationSeconds??version?.recipe?.descriptor?.duration,violations=[],unknown=[];
 if(format?.hardRules?.maxDurationSeconds){
  if(!Number.isFinite(duration))unknown.push('duration');
  else if(duration>format.hardRules.maxDurationSeconds)violations.push({rule:'maxDurationSeconds',actual:duration,limit:format.hardRules.maxDurationSeconds});
 }
 return {violations,unknown};
}
