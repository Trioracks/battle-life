import {formatMismatch,checkHardRules} from './battle-format.js?rev=36';
const axes=['text','performance','music','sound'],clamp=(v,max=1)=>Math.max(0,Math.min(max,v));
/** JudgeResult: decision is fixed from raw quality; display rounding and comments never decide a pair. */
export function evaluateTrack(version,judge,format,{opponent=null}={}){
 const weights=judge?.weights??{},known=axes.filter(k=>Number.isFinite(version?.qualities?.[k])&&Number.isFinite(weights[k])&&weights[k]>0);
 if(!known.length)return {ok:false,reason:'Недостаточно сохранённых данных для оценки.',trackVersionId:version?.id,judgeId:judge?.id};
 const sum=known.reduce((s,k)=>s+weights[k],0),personalQuality=known.reduce((s,k)=>s+clamp(version.qualities[k],10)*weights[k],0)/sum;
 const mismatch=formatMismatch(version,format),formatPenalty=clamp(Number(judge.formatAdherence)||0)*Math.min(1.5,Math.max(0,format?.maxPenalty??0))*mismatch.value,raw=personalQuality-formatPenalty;
 const result={ok:true,judgeId:judge.id,battleId:format?.battleId??null,roundId:format?.roundId??null,trackVersionId:version.id,opponentTrackVersionId:opponent?.id??null,personalQuality,formatPenalty,raw,grade:Math.round(clamp(raw+(Number(judge.strictnessOffset)||0),10)*2)/2,decision:{kind:'grade'},evidenceIds:mismatch.evidenceIds,formatMismatch:mismatch,hardRules:checkHardRules(version,format),limitedEvidence:known.length<4||mismatch.limitedEvidence};
 if(opponent){
  const other=evaluateTrack(opponent,judge,format);if(!other.ok)return {...result,ok:false,reason:'У соперника недостаточно сохранённых данных.'};
  const difference=raw-other.raw;result.margin=Math.abs(difference);result.decision=difference===0?{kind:'tie',winnerId:null}:{kind:'pair_vote',winnerId:difference>0?version.id:opponent.id};result.opponentRaw=other.raw;
 }
 return result;
}
export function perceiveTrack(version,judge,history=[],catalog=[]){
 const observations=[],knownFactIds=[],recognizedReferences=[],attention=judge?.attention??{};
 for(const fact of version?.facts??[]){
  if(fact.value===null||fact.value===undefined)continue;
  knownFactIds.push(fact.id);
  if(Number.isFinite(fact.value)&&/^(text|vocal|music|sound)\./.test(fact.key)){
   observations.push({family:fact.key,value:fact.value,polarity:fact.value>=65?'good':fact.value<=35?'bad':'mixed',evidenceIds:[fact.id],attention:attention[fact.key]??attention[fact.key.replace('vocal.','performance.')]??1});
  }
  if(fact.key!=='text.reference'||!Array.isArray(fact.value))continue;
  for(const use of fact.value){
   const ref=catalog.find(r=>r.id===use.referenceId&&r.sourceId===use.sourceId);
   if(!ref||!judge.knowledge?.sourceIds?.includes(ref.sourceId)||!Number.isFinite(use.clarity)||use.clarity<=0||use.clarity*(.5+.5*(ref.obviousness??.5))<.25)continue;
   recognizedReferences.push({...use,title:ref.title,motif:ref.motif,group:ref.group,evidenceIds:[fact.id],knownSource:true,organic:Number.isFinite(use.fit)&&use.fit>=.65,strained:Number.isFinite(use.fit)&&use.fit<=.35});
  }
 }
 return {observations,knownFactIds:[...new Set(knownFactIds)],recognizedReferences,previousVersionIds:[...new Set((Array.isArray(history)?history:[]).map(h=>h?.trackVersionId).filter(id=>typeof id==='string'&&id!==version.id))]};
}
