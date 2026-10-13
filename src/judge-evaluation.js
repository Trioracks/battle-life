import {formatMismatch,checkHardRules} from './battle-format.js?rev=41';
import {normalizeContentMix,textMixRetention} from './text-content-mix.js?rev=41';
import {seededLottery} from './battle-seeding.js?rev=41';
const axes=['text','performance','music','sound'],clamp=(v,max=1)=>Math.max(0,Math.min(max,v));
/** JudgeResult: decision is fixed from raw quality; display rounding and comments never decide a pair. */
export function evaluateTrack(version,judge,format,{opponent=null,tieSeed}={}){
 const weights=judge?.weights??{},known=axes.filter(k=>Number.isFinite(version?.qualities?.[k])&&Number.isFinite(weights[k])&&weights[k]>0);
 if(!known.length)return {ok:false,reason:'Недостаточно сохранённых данных для оценки.',trackVersionId:version?.id,judgeId:judge?.id};
 const contentMix=normalizeContentMix(version.facts?.find(f=>f.key==='text.contentMix')?.value),retention=textMixRetention(contentMix,judge.preferredContentMix,judge.contentMixSensitivity);
 const sum=known.reduce((s,k)=>s+weights[k],0),personalQuality=known.reduce((s,k)=>s+clamp(version.qualities[k],10)*weights[k]*(k==='text'?retention:1),0)/sum;
 const mismatch=formatMismatch(version,format),formatPenalty=clamp(Number(judge.formatAdherence)||0)*Math.min(1.5,Math.max(0,format?.maxPenalty??0))*mismatch.value,raw=personalQuality-formatPenalty;
 const result={ok:true,judgeId:judge.id,battleId:format?.battleId??null,roundId:format?.roundId??null,trackVersionId:version.id,opponentTrackVersionId:opponent?.id??null,personalQuality,formatPenalty,raw,grade:Math.round(clamp(raw+(Number(judge.strictnessOffset)||0),10)*2)/2,decision:{kind:'grade'},evidenceIds:mismatch.evidenceIds,formatMismatch:mismatch,hardRules:checkHardRules(version,format),limitedEvidence:known.length<4||mismatch.limitedEvidence};
 if(opponent){
  const other=evaluateTrack(opponent,judge,format);if(!other.ok)return {...result,ok:false,reason:'У соперника недостаточно сохранённых данных.'};
  const difference=raw-other.raw;result.margin=Math.abs(difference);result.decision=difference===0?{kind:'tie',winnerId:null}:{kind:'pair_vote',winnerId:difference>0?version.id:opponent.id};result.opponentRaw=other.raw;
  if(difference===0&&tieSeed!==undefined&&version.id!==opponent.id){
   const adjusted=(v,k)=>clamp(v.qualities[k],10)*(k==='text'?textMixRetention(normalizeContentMix(v.facts?.find(f=>f.key==='text.contentMix')?.value),judge.preferredContentMix,judge.contentMixSensitivity):1);
   for(const key of [...known].sort((a,b)=>weights[b]-weights[a]||axes.indexOf(a)-axes.indexOf(b))){if(!Number.isFinite(opponent.qualities[key]))continue;const delta=adjusted(version,key)-adjusted(opponent,key);if(delta!==0){result.decision={kind:'pair_vote',winnerId:delta>0?version.id:opponent.id,resolvedBy:'preferred-aspect',axis:key};break;}}
   if(result.decision.kind==='tie')result.decision={kind:'pair_vote',winnerId:seededLottery([version.id,opponent.id],[tieSeed,judge.id,...[version.id,opponent.id].sort()].join(':'))[0],resolvedBy:'seeded-lottery'};
  }
 }
 return result;
}
export function perceiveTrack(version,judge,history=[],catalog=[]){
 const observations=[],knownFactIds=[],recognizedReferences=[],attention=judge?.attention??{};
 for(const fact of version?.facts??[]){
  if(fact.value===null||fact.value===undefined)continue;
  knownFactIds.push(fact.id);
  if(Number.isFinite(fact.value)&&/^(text|vocal|music|sound)\./.test(fact.key)){
   const interested=Array.isArray(attention)&&attention.some(k=>k.replace('performance.','vocal.').replace('text.imagery','text.images')===fact.key);
   observations.push({family:fact.key,value:fact.value,polarity:fact.value>=65?'good':fact.value<=35?'bad':'mixed',evidenceIds:[fact.id],attention:interested?2:1});
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
