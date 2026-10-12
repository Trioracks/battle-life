import data from '../data/judges/comments.json' with {type:'json'};
import expansion from '../data/judges/comment-expansion.json' with {type:'json'};
import individual from '../data/judges/individual-comments.json' with {type:'json'};
import {REFERENCE_CATALOG} from './cultural-references.js?rev=39';
import {evaluateTrack,perceiveTrack} from './judge-evaluation.js?rev=39';
import {conditionPasses,commentEvidence,selectedReference} from './judge-comment-conditions.js?rev=39';
const clone=v=>JSON.parse(JSON.stringify(v));
const commonById=new Map(data.common.map(t=>[t.id,t]));
const legacyOnly=bank=>data.common.filter(t=>t.family==='reaction.overall'&&!bank.templateIds.includes(t.id)).map(t=>({...t,id:bank.judgeId+':'+t.id,judgeId:bank.judgeId,conditions:[...t.conditions,{kind:'limitedFacts'}]}));
export const JUDGE_COMMENTS=Object.freeze([...data.sourceRows,...individual,...data.banks.flatMap(bank=>[...bank.personal,...legacyOnly(bank),...bank.templateIds.map(id=>({...commonById.get(id),id:bank.judgeId+':'+id,judgeId:bank.judgeId})),...expansion.common.map(t=>({...t,id:bank.judgeId+':'+t.id,judgeId:bank.judgeId}))])]);
const byJudge=new Map(data.banks.map(b=>[b.judgeId,JUDGE_COMMENTS.filter(t=>t.judgeId===b.judgeId)]));
function context(input,history=[]){
 const evaluation=evaluateTrack(input.version,input.judge,input.format,{opponent:input.opponent??null});
 const perception=perceiveTrack(input.version,input.judge,history.filter(h=>h.judgeId===input.judge.id),REFERENCE_CATALOG);
 return {...input,evaluation,perception};
}
function render(template,input){
 let text=template.text;
 if(text.includes('{referenceTitle}')){const r=selectedReference(input,template);if(!r)return null;text=text.replaceAll('{referenceTitle}',r.title);}
 if(text.includes('{expectedStyle}')){const names=input.format?.axes?.genre_profile?.preferred;if(!names?.length)return null;text=text.replaceAll('{expectedStyle}',names.join(' / '));}
 return /\{[^}]*\}/.test(text)?null:text;
}
export function eligibleJudgeComments(input,bank=JUDGE_COMMENTS){
 if(!input.evaluation?.ok)return [];
 return (bank===JUDGE_COMMENTS?byJudge.get(input.judge.id)??[]:bank.filter(t=>t.judgeId===input.judge.id)).filter(t=>t.conditions.every(c=>conditionPasses(c,input,t))&&render(t,input)!==null);
}
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(seed){let n=hash(seed);return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function commentSimilarity(a,b){
 const grams=text=>{const words=text.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean);return new Set(words.map((_,i)=>words.slice(i,i+3).join(' ')).filter((_,i)=>i+2<words.length));};
 const x=grams(a),y=grams(b);if(!x.size||!y.size)return a.toLowerCase()===b.toLowerCase()?1:0;
 return [...x].filter(t=>y.has(t)).length/Math.min(x.size,y.size);
}
function choose(pool,rand,weight){let point=rand()*pool.reduce((s,t)=>s+weight(t),0);return pool.find(t=>(point-=weight(t))<0)??pool.at(-1);}
export function generateJudgeReview(input,{seed=0,history=[]}={}){
 const safeHistory=Array.isArray(history)?history:[],id=[input.format?.battleId??'free',input.format?.roundId??'selection',input.version.id,input.judge.id].join(':');
 const existing=safeHistory.find(r=>r.id===id),diagnostics={unsupportedClaims:[],noveltyShortages:[],limitedFamilies:[],nearRepeats:[]};
 if(existing)return {result:clone(existing),history:clone(safeHistory),diagnostics};
 const ctx=context(input,safeHistory),evaluation=ctx.evaluation;
 if(!evaluation.ok)return {result:null,history:safeHistory,diagnostics:{...diagnostics,unsupportedClaims:[evaluation.reason]}};
 const own=safeHistory.filter(r=>r.judgeId===input.judge.id),recent=own.slice(-12),used=new Set(recent.flatMap(r=>r.templateIds)),rand=random(seed+':'+id);
 const eligible=eligibleJudgeComments(ctx),fresh=eligible.filter(t=>!used.has(t.id)&&!recent.some(r=>r.comment===render(t,ctx)));
 if(!fresh.length)return {result:null,history:safeHistory,diagnostics:{...diagnostics,noveltyShortages:[{judgeId:input.judge.id,reason:'No fresh eligible template',eligible:eligible.length}]}};
 const last=own.at(-1)?.focus,repeated=last&&own.at(-2)?.focus===last;
 let pool=fresh;
 const unused=pool.filter(t=>!own.some(r=>r.templateIds.includes(t.id)||r.comment===render(t,ctx)));if(unused.length)pool=unused;
 if(repeated){let alternatives=pool.filter(t=>t.family!==last);if(!alternatives.length)alternatives=fresh.filter(t=>t.family!==last);if(alternatives.length)pool=alternatives;else diagnostics.limitedFamilies.push(last);}
 const novel=pool.filter(t=>!recent.some(r=>commentSimilarity(render(t,ctx),r.comment)>.65));if(novel.length)pool=novel;
 const lengths=input.judge.lengthWeights?.[evaluation.decision.kind==='grade'?'selection':'pair']??{short:1};
 const preferredLength=choose(Object.entries(lengths).map(([id,value])=>({id,value})),rand,t=>t.value).id;
 const attention=(input.judge.attention??[]).map(k=>k.replace('performance.','vocal.').replace('text.imagery','text.images').replace('music.rhythm','music.groove'));
 const weighted=t=>(t.length===preferredLength?2.5:1)*(attention.includes(t.family)?2:1)*(t.sourceRef?.kind==='authored-individual'?2:1)*(t.family==='reaction.overall'?.25:1);
 const selected=[choose(pool,rand,weighted)];
 // Longer pair reviews can discuss a second observed aspect, never padding or fabricated facts.
 if(evaluation.decision.kind!=='grade'&&preferredLength!=='short'&&selected[0].length!=='long'){
  const others=fresh.filter(t=>t.family!==selected[0].family&&t.family!=='reaction.overall'&&!t.trigger.startsWith('pair.')&&render(t,ctx)!==render(selected[0],ctx));
  if(others.length)selected.push(choose(others,rand,weighted));
 }
 const comment=selected.map(t=>render(t,ctx)).join(' '),evidenceIds=[...new Set([...evaluation.evidenceIds,...selected.flatMap(t=>commentEvidence(ctx,t))])];
 diagnostics.unsupportedClaims=evidenceIds.filter(id=>!input.version.facts?.some(f=>f.id===id));
 for(const t of selected)for(const c of t.conditions)if(!conditionPasses(c,ctx,t))diagnostics.unsupportedClaims.push(t.id+':'+c.kind);
 if(recent.some(r=>commentSimilarity(comment,r.comment)>.65))diagnostics.nearRepeats.push(id);
 const result={...evaluation,id,comment,templateIds:selected.map(t=>t.id),families:[...new Set(selected.map(t=>t.family))],focus:selected[0].family,length:comment.length>350?'long':comment.length>170?'medium':'short',evidenceIds,knownFacts:clone(ctx.perception.knownFactIds),recognizedReferences:ctx.perception.recognizedReferences.map(r=>r.referenceId),seed,commentPolicyVersion:1};
 return {result,history:[...clone(safeHistory),result],diagnostics};
}
export function normalizeJudging(raw){
 const results={},recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[];
 for(const [id,result]of Object.entries(raw?.results??{})){
  if(result?.id===id&&typeof result.comment==='string'&&Number.isFinite(result.raw)&&Number.isFinite(result.grade)&&Array.isArray(result.templateIds)&&Array.isArray(result.evidenceIds))results[id]=clone(result);
  else recovery.push({id,result:clone(result)});
 }
 const seen=new Set(),history=(Array.isArray(raw?.history)?raw.history:[]).filter(r=>r&&typeof r.id==='string'&&typeof r.judgeId==='string'&&Array.isArray(r.templateIds)&&typeof r.comment==='string'&&!seen.has(r.id)&&seen.add(r.id)).map(clone);
 return {schemaVersion:1,results,history,recovery};
}
export function finalizeJudgePanel({battleId,roundId,versionIds,judgeIds,results}){
 const rows=Array.isArray(results)?results:Object.values(results??{}),resultsByVersion={},totals={};let complete=Boolean(versionIds.length&&judgeIds.length);
 for(const id of versionIds){
  resultsByVersion[id]=judgeIds.map(j=>rows.find(r=>r.ok&&r.battleId===battleId&&r.roundId===roundId&&r.trackVersionId===id&&r.judgeId===j)).filter(Boolean);
  if(resultsByVersion[id].length!==judgeIds.length)complete=false;
  totals[id]=resultsByVersion[id].length===judgeIds.length?resultsByVersion[id].reduce((sum,r)=>sum+(r.decision.kind==='grade'?r.grade:r.decision.kind==='pair_vote'&&r.decision.winnerId===id?1:0),0):null;
 }
 return {complete,resultsByVersion,totals,events:complete?[{id:battleId+':'+roundId+':panel:'+versionIds.join('|'),type:'judge-panel-complete',versionIds:[...versionIds]}]:[]};
}
