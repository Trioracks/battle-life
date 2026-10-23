import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=58';
import {publicRoundTable,ROUND_LABELS} from './battle-results-table.js?rev=58';
import {publicAnnouncedJudges} from './social-community-publications.js?rev=58';
import {caseStudySources} from './rap-research-sources.js?rev=58';
import {publicAnalysisReport,canStudyTrack} from './rap-analysis.js?rev=58';
import {publicJudgeHypotheses} from './judge-dossier-analysis.js?rev=58';
import {publicCharacterProfile} from './npc-social-profiles.js?rev=58';
import {validGameMinute} from './game-minute.js?rev=58';
import {isForecastReport,publicTrackForecast} from './rap-dossier-forecast.js?rev=58';
import {profileAccess} from './social-profile-policy.js?rev=58';
import {publicDossierCard} from './rap-dossier.js?rev=58';
import {validResearchFinding} from './rap-research.js?rev=58';

const array=v=>Array.isArray(v)?v:[],ids=v=>array(v).filter(x=>typeof x==='string');
const unique=v=>[...new Set(v)].sort();
const safely=(fn,fallback)=>{try{return fn();}catch{return fallback;}};
const title=id=>BATTLE_BRIEFS.find(b=>b.id===id)?.title??'Сохранённое дело';
const legacyCard=(state,characterId,nowMinute)=>safely(()=>publicDossierCard(state,{characterId,nowMinute}),{reports:[],quotes:[],sources:[],hypotheses:[]});
const savedCharacters=(state,nowMinute)=>Object.keys(state.rapDossier?.cards??{}).filter(id=>{const c=legacyCard(state,id,nowMinute);return c.reports.length||c.quotes.length;});
function mergeLegacy(node,card){
 node.reports=[...new Map([...node.reports,...card.reports].map(r=>[r.id,r])).values()];
 node.reportIds=unique([...node.reportIds,...card.reports.map(r=>r.id)]);
 node.sourceIds=unique([...node.sourceIds,...card.sources.map(s=>s.trackVersionId),...card.quotes.map(q=>q.id)]);
 node.quotes=card.quotes.map(q=>({...q,sourceUrl:card.sources.find(s=>s.trackVersionId===q.trackVersionId)?.url??null,reportId:card.reports.find(r=>r.trackVersionId===q.trackVersionId)?.id??null}));
 node.sourceLinks=card.sources.map(s=>({...s,reportId:card.reports.find(r=>r.trackVersionId===s.trackVersionId)?.id??null}));
 if(node.reports.length&&!node.missingReportIds.length)node.status='studied';
}
function studyOutcome(found,damaged=false){
 if(damaged)return {status:'damaged'};
 const latest=found.filter(validResearchFinding).sort((a,b)=>b.createdAt-a.createdAt)[0];
 return latest?{status:latest.evidenceStatus==='unknown'?'completed-empty':'completed',cutoff:latest.cutoff,createdAt:latest.createdAt}:null;
}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
// Small bounded cache, keyed by archive references and exact public cutoff. Do
// not normalize or serialize save archives here. A fractional minute can publish
// evidence; even an earlier query in the same minute must not reuse a later view.
const cache=new Map();
function references(s){return [s.battleApplications,s.battleSubmissions,s.audioExports,s.trackVersions,s.tournaments,s.roundThemes,s.social,s.socialReactions?.plans,s.socialRuntime?.events,s.socialRuntime?.lastMinute,s.rapResearch?.findings,s.rapResearch?.recovery,s.rapAnalysis?.reports,s.rapAnalysis?.recovery,s.judgeDossier?.evidence,s.battleHistory,s.npcSocialProfiles,s.judging?.results,s.rapDossier,s.rapDossier?.cards];}
function memo(s,key,nowMinute,build){
 const refs=references(s),previous=cache.get(key);
 if(previous?.nowMinute===nowMinute&&refs.every((r,i)=>r===previous.refs[i]))return previous.value;
 const value=freeze(build());cache.delete(key);cache.set(key,{refs,nowMinute,value});if(cache.size>24)cache.delete(cache.keys().next().value);return value;
}
export function dossierCases(state,{nowMinute}={}){
 if(!validGameMinute(nowMinute))return [];
 return memo(state,'list',nowMinute,()=>[
  {id:'recordings',title:'Мои записи',kind:'recordings'},
  ...(readableReports(state,nowMinute).length||savedCharacters(state,nowMinute).length?[{id:'archive',title:'Архив наблюдений',kind:'archive'}]:[]),
  ...unique([...array(state.battleApplications).map(a=>a?.battleId),...array(state.battleSubmissions).filter(s=>s?.sentAt==null||s.sentAt<=nowMinute).map(s=>s?.battleId)].filter(id=>typeof id==='string')).map(battleId=>({id:'battle:'+battleId,title:title(battleId),battleId,kind:'battle'})),
 ]);
}
function buildCase(state,entry,caseId,nowMinute){
 const graph={id:caseId,title:entry?.title??'Дело недоступно',status:entry?'available':'unknown',nodes:[],edges:[]};if(!entry)return graph;
 const battleId=entry.battleId,byId=new Map(),savedReports=Object.values(state.rapAnalysis?.reports??{}),reports=savedReports.filter(r=>isForecastReport(r)&&r.createdAt<=nowMinute).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
 if(entry.kind==='archive'){for(const versionId of unique(reports.map(r=>r.trackVersionId))){const target=publicDossierTarget(state,{reportId:reports.find(r=>r.trackVersionId===versionId).id,nowMinute});if(target)graph.nodes.push(target.node);}for(const characterId of savedCharacters(state,nowMinute)){const target=publicDossierTarget(state,{characterId,nowMinute});if(target)graph.nodes.push({...target.node,layout:{column:1,row:graph.nodes.length,parentId:null}});}return graph;}
 const findings=Object.values(state.rapResearch?.findings??{}).filter(f=>f&&f.subject?.battleId===battleId&&typeof f.id==='string'&&validGameMinute(f.createdAt)&&f.createdAt<=nowMinute&&validGameMinute(f.cutoff)&&f.cutoff<=f.createdAt&&Array.isArray(f.reportIds));
 const add=(id,kind,node)=>{if(byId.has(id))return byId.get(id);const n={id,kind,title:'Неизвестно',status:'unknown',reportIds:[],findingIds:[],sourceIds:[],missingReportIds:[],reports:[],action:null,profileUrl:null,...node};byId.set(id,n);graph.nodes.push(n);return n;};
 const edge=(from,to,kind)=>{const id=from+'>'+kind+'>'+to;if(!graph.edges.some(e=>e.id===id))graph.edges.push({id,from,to,kind});};
 const findingsFor=(kind,subject)=>findings.filter(f=>f.kind===kind&&Object.entries(subject).every(([k,v])=>f.subject[k]===v));
 const attach=(node,found,sourceIds=[])=>{
  node.findingIds=unique(found.map(f=>f.id));node.sourceIds=unique(sourceIds);
  const recovered=array(state.rapResearch?.recovery).map(r=>r?.recoveryData).filter(f=>f?.kind===node.kind&&f.subject?.battleId===battleId&&validGameMinute(f.createdAt)&&f.createdAt<=nowMinute&&(node.kind!=='round'||f.subject.roundId===node.roundId)&&(!node.characterId||f.subject.characterId===node.characterId));
  node.recoveryIds=unique(recovered.map(f=>f.id).filter(id=>typeof id==='string'));
  node.reportIds=unique(found.flatMap(f=>ids(f.reportIds)));node.missingReportIds=unique([...node.reportIds.filter(id=>!reports.some(r=>r.id===id&&sourceIds.includes(r.trackVersionId))),...recovered.flatMap(f=>ids(f.reportIds))]);
  node.reports=reports.filter(r=>node.reportIds.includes(r.id)&&!node.missingReportIds.includes(r.id)).map(publicAnalysisReport);
  node.status=node.missingReportIds.length||recovered.length?'unknown':found.length?'studied':'unknown';
  node.studyOutcome=studyOutcome(found,node.missingReportIds.length||recovered.length);
  if(node.characterId)mergeLegacy(node,legacyCard(state,node.characterId,nowMinute));
 };
 const sources=(kind,extra={})=>safely(()=>caseStudySources(state,{kind,battleId,...extra,nowMinute}),{sourceIds:[],judgeIds:[],trackVersionIds:[]});
 const track=(versionId,referenceId,parentId,column=1)=>{
  versionId=typeof versionId==='string'?versionId:null;
  const v=state.trackVersions?.byId?.[versionId],valid=v&&v.id===versionId&&v.schemaVersion===1&&typeof v.signature==='string'&&validGameMinute(v.createdAtMinute)&&v.createdAtMinute<=nowMinute&&v.recipe?.descriptor&&typeof v.name==='string';
  const id='track:'+(versionId??'missing:'+referenceId),ownReports=valid?reports.filter(r=>r.trackVersionId===versionId&&r.subjectId===(v.npc?.characterId??'player')):[];
  const node=add(id,'track',{title:valid?v.name:'Запись недоступна',trackVersionId:versionId??null,subjectId:valid?v.npc?.characterId??'player':null,status:valid?(ownReports.length?'studied':'available'):'unknown',reportIds:ownReports.map(r=>r.id),reports:ownReports.map(publicAnalysisReport),sourceIds:valid?[versionId]:[],action:valid?{type:'startTrackStudy',request:{trackVersionId:versionId}}:null,layout:{column,row:graph.nodes.filter(n=>n.kind==='track').length,parentId}});
  node.missingReportIds=unique([...savedReports.filter(r=>r?.trackVersionId===versionId&&validGameMinute(r.createdAt)&&r.createdAt<=nowMinute&&!isForecastReport(r)).map(r=>r.id),...array(state.rapAnalysis?.recovery).filter(r=>r?.type==='report'&&r.recoveryData?.trackVersionId===versionId&&validGameMinute(r.recoveryData.createdAt)&&r.recoveryData.createdAt<=nowMinute).map(r=>r.id)].filter(id=>typeof id==='string'));
  if(node.missingReportIds.length)node.status='unknown';
  if(parentId)edge(parentId,id,'track');return node;
 };
 if(entry.kind==='recordings'){
  for(const f of array(state.audioExports?.files).filter(f=>f?.kind==='track'&&validGameMinute(f.createdAtMinute)&&f.createdAtMinute<=nowMinute).sort((a,b)=>a.createdAtMinute-b.createdAtMinute||String(a.id).localeCompare(String(b.id))))track(f.trackVersionId,f.id,null,0);
  for(const f of array(state.audioExports?.recovery))if(f?.recoveryData?.kind==='track'&&validGameMinute(f.recoveryData.createdAtMinute)&&f.recoveryData.createdAtMinute<=nowMinute)add('track:recovery:'+f.id,'track',{title:'Запись недоступна',trackVersionId:null,layout:{column:0,row:graph.nodes.length,parentId:null}});
  return graph;
 }
 const center=add(caseId,'battle',{title:entry.title,battleId,profileUrl:'underweb://battles/'+battleId,layout:{column:0,row:0,parentId:null}});
 const tables=Object.entries(state.tournaments?.byId?.[battleId]?.rounds??{}).filter(([,r])=>validGameMinute(r?.opensAt)&&r.opensAt<=nowMinute).sort((a,b)=>a[1].opensAt-b[1].opensAt||a[0].localeCompare(b[0])).map(([roundId,r])=>safely(()=>publicRoundTable(state,{battleId,roundId,nowMinute}),{battleId,roundId,title:ROUND_LABELS[roundId]??'Раунд',opensAt:r.opensAt,rows:[]}));
 const battleFindings=findingsFor('battle',{});attach(center,battleFindings,tables.length?sources('battle').sourceIds:[]);if(tables.length)center.action={type:'startCaseStudy',request:{kind:'battle',battleId}};
 let currentOpponent=null;
 const current=tables.at(-1),ownRow=current?.rows.find(r=>r.participantId==='player');
 if(ownRow?.pairNumber!=null){const row=current.rows.find(r=>!r.masked&&r.participantId!=='player'&&r.pairNumber===ownRow.pairNumber);if(row){const p=safely(()=>publicCharacterProfile(state,{characterId:row.participantId,nowMinute}),{});currentOpponent={...row,canView:p.canView};}}
 for(const [index,t]of tables.entries()){
  const roundId=t.roundId,id='round:'+battleId+':'+roundId,found=findingsFor('round',{roundId}),inherited=battleFindings.filter(f=>f.cutoff>=t.opensAt),discovered=found.length>0||inherited.length>0;
  const roundSources=sources('round',{roundId});
  const inheritedHere=inherited.map(f=>({...f,reportIds:ids(f.reportIds).filter(id=>reports.some(r=>r.id===id&&roundSources.trackVersionIds.includes(r.trackVersionId)))}));
  const n=add(id,'round',{title:t.title,battleId,roundId,scoring:t.scoring??null,profileUrl:'underweb://social/results/'+battleId+'/'+roundId,layout:{column:-1,row:index,parentId:caseId},action:{type:'startCaseStudy',request:{kind:'round',battleId,roundId}}});attach(n,[...found,...inheritedHere],roundSources.sourceIds);edge(caseId,id,'round');
  const announced=safely(()=>publicAnnouncedJudges(state,{battleId,roundId,nowMinute}),[]);
  const known=discovered?announced:[];
  for(const j of known){const judge=add('judge:'+j.id,'judge',{title:j.name,battleId,characterId:j.id,profileUrl:j.profileUrl,layout:{column:-2,row:graph.nodes.filter(n=>n.kind==='judge').length,parentId:id},action:{type:'startCaseStudy',request:{kind:'judge',battleId,characterId:j.id}}});attach(judge,findingsFor('judge',{characterId:j.id}),sources('judge',{characterId:j.id}).sourceIds);judge.hypotheses=safely(()=>publicJudgeHypotheses(array(state.judgeDossier?.evidence).filter(e=>e.judgeId===j.id),nowMinute),[]);if(!judge.hypotheses.length)judge.status='unknown';edge(id,judge.id,'judge');}
  const submissions=array(state.battleSubmissions).filter(s=>s?.battleId===battleId&&s.roundId===roundId&&(s.sentAt==null||validGameMinute(s.sentAt)&&s.sentAt<=nowMinute));
  const publicOwn=t.rows.find(r=>r.participantId==='player')?.trackVersionId;if(publicOwn&&!submissions.some(s=>s.trackVersionId===publicOwn))submissions.push({id:id+':own',trackVersionId:publicOwn});
  for(const submission of submissions){
   const node=track(submission.trackVersionId,submission.id??id,id),report=node.reportIds.length?reports.find(r=>r.id===node.reportIds.at(-1)):null;
   const hypotheses=safely(()=>publicJudgeHypotheses(array(state.judgeDossier?.evidence).filter(e=>known.some(j=>j.id===e.judgeId)),nowMinute),[]);
   const comparisonReport=t===current&&currentOpponent?.trackVersionId?reports.filter(r=>r.trackVersionId===currentOpponent.trackVersionId&&r.subjectId===currentOpponent.participantId).at(-1):null;
   const scale=t.scoring?.mode==='score'?t.scoring.scale:t.scoring?.mode==='comparison'?null:NaN;
   const forecast=publicTrackForecast({report,judgeHypotheses:hypotheses,scale,comparisonReport});if(!t.scoring)forecast.confidenceText='Правила оценки этого раунда пока неизвестны.';
   const f=add('forecast:'+id+':'+(node.trackVersionId??submission.id),'forecast',{title:'Моё предположение',battleId,roundId,trackVersionId:node.trackVersionId,status:forecast.status,forecast,reportIds:report?[report.id]:[],sourceIds:forecast.sources,layout:{column:2,row:index,parentId:node.id}});edge(node.id,f.id,'forecast');
  }
 }
 for(const s of array(state.battleSubmissions))if(s?.battleId===battleId&&!state.tournaments?.byId?.[battleId]?.rounds?.[s.roundId]&&(s.sentAt==null||validGameMinute(s.sentAt)&&s.sentAt<=nowMinute))track(s.trackVersionId,s.id??'legacy',caseId);
 if(currentOpponent){const row=currentOpponent,n=add('opponent:'+row.participantId,'opponent',{title:row.name,battleId,characterId:row.participantId,profileUrl:row.profileUrl,layout:{column:1,row:-1,parentId:caseId},action:row.canView?{type:'startCaseStudy',request:{kind:'opponent',battleId,characterId:row.participantId}}:null});const publicSources=sources('opponent',{characterId:row.participantId});attach(n,findingsFor('opponent',{characterId:row.participantId}),publicSources.sourceIds);edge('round:'+battleId+':'+current.roundId,n.id,'opponent');for(const versionId of publicSources.trackVersionIds)track(versionId,versionId,n.id);}
 return graph;
}
export function publicDossierCase(state,{caseId='recordings',nowMinute}={}){
 if(!validGameMinute(nowMinute))return freeze({id:caseId,title:'Дело недоступно',status:'unknown',nodes:[],edges:[]});
 return memo(state,'case:'+caseId,nowMinute,()=>buildCase(state,dossierCases(state,{nowMinute}).find(c=>c.id===caseId),caseId,nowMinute));
}

function readableReports(state,nowMinute){return Object.values(state.rapAnalysis?.reports??{}).filter(r=>isForecastReport(r)&&r.createdAt<=nowMinute).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));}
function validPublicVersion(state,id,nowMinute){const v=state.trackVersions?.byId?.[id];return v?.id===id&&v.schemaVersion===1&&typeof v.signature==='string'&&validGameMinute(v.createdAtMinute)&&v.createdAtMinute<=nowMinute&&v.recipe?.descriptor&&typeof v.name==='string'&&canStudyTrack(state,id,nowMinute)?v:null;}
// A standalone public target is not a discovered battle assignment. Saved
// observations stay readable even when the original recording is unavailable.
export function publicDossierTarget(state,{trackVersionId,characterId,reportId,nowMinute,battleId='makarevich-1'}={}){
 if(!validGameMinute(nowMinute))return null;
 const reports=readableReports(state,nowMinute),report=reportId?reports.find(r=>r.id===reportId):null;
 if(reportId&&!report)return null;
 if(report)trackVersionId=report.trackVersionId;
 const base={status:'unknown',reportIds:[],findingIds:[],sourceIds:[],missingReportIds:[],reports:[],studyOutcome:null,action:null,profileUrl:null,layout:{column:0,row:0,parentId:null}};
 if(trackVersionId){
  const version=validPublicVersion(state,trackVersionId,nowMinute);if(!version&&!report)return null;
  const subjectId=report?.subjectId??version.npc?.characterId??'player',owned=reports.filter(r=>r.trackVersionId===trackVersionId&&r.subjectId===subjectId),sameSource=version&&(version.npc?.characterId??'player')===subjectId;
  const canView=profileAccess(state,{characterId:subjectId,nowMinute}).canView;
  const node={...base,id:'track:'+trackVersionId,kind:'track',title:report?.trackName??version.name,trackVersionId,subjectId,status:sameSource?(owned.length?'studied':'available'):'unknown',reportIds:owned.map(r=>r.id),reports:owned.map(publicAnalysisReport),sourceIds:unique(owned.flatMap(r=>r.sourceIds).concat(sameSource?[trackVersionId]:[])),action:sameSource?{type:'startTrackStudy',request:{trackVersionId}}:null,profileUrl:canView?'underweb://social/'+(subjectId==='player'?'me':'profile/'+subjectId):null};
  return freeze({caseId:report?'archive':'target:'+node.id,targetId:node.id,node});
 }
 if(characterId){
  const profile=safely(()=>publicCharacterProfile(state,{characterId,nowMinute}),{}),legacy=legacyCard(state,characterId,nowMinute);if(!profile.canView&&!legacy.reports.length&&!legacy.quotes.length)return null;
  const kind=profile.roles?.includes('judge')||legacy.quotes.some(q=>q.judgeId===characterId)?'judge':'person',requestKind=kind==='judge'?'judge':'opponent',source=profile.canView?safely(()=>caseStudySources(state,{kind:requestKind,battleId,characterId,nowMinute}),{sourceIds:[]}):{sourceIds:[]};
  const found=Object.values(state.rapResearch?.findings??{}).filter(f=>f?.kind===requestKind&&f.subject?.battleId===battleId&&f.subject?.characterId===characterId&&typeof f.id==='string'&&validGameMinute(f.createdAt)&&f.createdAt<=nowMinute&&validGameMinute(f.cutoff)&&f.cutoff<=f.createdAt&&Array.isArray(f.reportIds));
  const resultIds=unique(found.flatMap(f=>ids(f.reportIds))),owned=reports.filter(r=>r.subjectId===characterId||resultIds.includes(r.id)&&source.sourceIds.includes(r.trackVersionId)),missingReportIds=resultIds.filter(id=>!owned.some(r=>r.id===id));
  const hypotheses=kind==='judge'?safely(()=>publicJudgeHypotheses(array(state.judgeDossier?.evidence).filter(e=>e.judgeId===characterId),nowMinute),[]):[];
  const recovered=array(state.rapResearch?.recovery).some(r=>r?.type==='finding'&&r.recoveryData?.subject?.characterId===characterId&&r.recoveryData.subject.battleId===battleId&&validGameMinute(r.recoveryData.createdAt)&&r.recoveryData.createdAt<=nowMinute);
  const node={...base,id:kind+':'+characterId,kind,title:profile.canView?profile.name:legacy.name,battleId,characterId,status:missingReportIds.length?'unknown':kind==='judge'?(hypotheses.length?'studied':'unknown'):owned.length?'studied':'unknown',findingIds:found.map(f=>f.id),reportIds:unique([...owned.map(r=>r.id),...resultIds]),missingReportIds,reports:owned.map(publicAnalysisReport),sourceIds:source.sourceIds,profileUrl:legacy.profileUrl,action:profile.canView?{type:'startCaseStudy',request:{kind:requestKind,battleId,characterId}}:null,hypotheses,studyOutcome:studyOutcome(found,missingReportIds.length||recovered)};
  mergeLegacy(node,legacy);
  return freeze({caseId:'target:'+node.id,targetId:node.id,node});
 }
 return null;
}
