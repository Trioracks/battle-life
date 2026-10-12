import {publicAnalysisReport,publishedStudyReviews} from './rap-analysis.js?rev=39';
import {profileAccess} from './social-profile-policy.js?rev=39';
import {battleCharacter} from './battle-demo-config.js?rev=39';
import {publicBattleHistory} from './battle-history.js?rev=39';
import {validGameMinute} from './game-minute.js?rev=39';
import {publicCharacterProfile} from './npc-social-profiles.js?rev=39';
import {publicJudgeHypotheses} from './judge-dossier-analysis.js?rev=39';
const clone=v=>structuredClone(v),record=v=>v&&typeof v==='object'&&!Array.isArray(v),strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
export function normalizeDossier(raw){const cards={},recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[];for(const [id,c]of Object.entries(record(raw?.cards)?raw.cards:{})){if(c?.characterId===id&&strings(c.reportIds)&&Array.isArray(c.quotes)&&c.quotes.every(q=>typeof q.id==='string'&&typeof q.judgeId==='string'&&typeof q.trackVersionId==='string'&&typeof q.comment==='string'&&validGameMinute(q.publishedAt))){Object.defineProperty(cards,id,{value:{characterId:id,firstRecordedAt:validGameMinute(c.firstRecordedAt)?c.firstRecordedAt:0,reportIds:[...new Set(c.reportIds)],quotes:clone(c.quotes)},enumerable:true,writable:true});}else recovery.push({id,recoveryData:clone(c),reason:'Карточка сохранена отдельно: повреждён формат.'});}return {version:1,cards,recovery};}
export function saveAnalysisToDossier(state,reportId){
 const r=state.rapAnalysis?.reports?.[reportId];if(!r)return {ok:false,state,reason:'Сначала закончи изучение трека.'};
 const dossier=normalizeDossier(state.rapDossier),card=dossier.cards[r.subjectId]??{characterId:r.subjectId,reportIds:[],quotes:[]};
 if(!card.reportIds.includes(reportId))card.reportIds.push(reportId);
 for(const q of publishedStudyReviews(state,{trackVersionId:r.trackVersionId,nowMinute:r.createdAt}).filter(q=>r.reviewIds.includes(q.id)))if(!card.quotes.some(x=>x.id===q.id))card.quotes.push({id:q.id,judgeId:q.judgeId,trackVersionId:q.trackVersionId,comment:q.comment,publishedAt:q.publishedAt,grade:q.grade??null,decision:q.decision?.kind==='pair_vote'?{kind:'pair_vote',winnerId:q.decision.winnerId}:null});
 dossier.cards[r.subjectId]=card;return {ok:true,state:{...state,rapDossier:dossier},reason:''};
}
export function dossierCharacterIds(state,{nowMinute}={}){if(!validGameMinute(nowMinute))return [];const ids=new Set();for(const c of Object.values(state.rapDossier?.cards??{}))if((c.firstRecordedAt??0)<=nowMinute&&c.reportIds.some(id=>state.rapAnalysis?.reports?.[id]?.createdAt<=nowMinute))ids.add(c.characterId);for(const e of state.battleHistory?.entries??[])if(e.occurredAt<=nowMinute&&profileAccess(state,{characterId:e.participantId,nowMinute}).canView)ids.add(e.participantId);return [...ids].sort();}
export function publicDossierCard(state,{characterId,nowMinute}={}){
 const access=profileAccess(state,{characterId,nowMinute}),saved=state.rapDossier?.cards?.[characterId],card=(saved?.firstRecordedAt??0)<=nowMinute?saved:null,reports=(card?.reportIds??[]).map(id=>state.rapAnalysis?.reports?.[id]).filter(r=>r&&r.createdAt<=nowMinute),history=access.canView?publicBattleHistory(state,{participantId:characterId,nowMinute}):[];
 const quotes=(card?.quotes??[]).filter(q=>q.publishedAt<=nowMinute&&(q.recordedAt??0)<=nowMinute).map(q=>({...clone(q),judgeName:battleCharacter(q.judgeId)?.nickname??q.judgeId,profileUrl:profileAccess(state,{characterId:q.judgeId,nowMinute}).canView?'underweb://social/profile/'+q.judgeId:null}));
 const sources=reports.map(r=>{const v=state.trackVersions?.byId?.[r.trackVersionId],source=v?.npc??state.battleSubmissions?.find(s=>s.trackVersionId===r.trackVersionId);return {trackVersionId:r.trackVersionId,name:r.trackName,url:source?.battleId&&source?.roundId?'underweb://social/results/'+source.battleId+'/'+source.roundId:null};});
 const avatar=characterId==='player'?{mark:'Я',color:'#667c6b',src:state.social?.playerPortrait?.url}:access.canView?publicCharacterProfile(state,{characterId,nowMinute}).avatar:{mark:'?',color:'#84745f'};
 return {hypotheses:publicJudgeHypotheses((state.judgeDossier?.evidence??[]).filter(e=>e.judgeId===characterId),nowMinute),characterId,avatar,name:characterId==='player'?'Мои работы':battleCharacter(characterId)?.nickname??'Автор',profileUrl:access.canView?(characterId==='player'?'underweb://social/me':'underweb://social/profile/'+characterId):null,accessReason:access.reason,reports:reports.map(publicAnalysisReport),quotes,history,sources};
}
