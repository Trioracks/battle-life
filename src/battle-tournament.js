import {DEMO_BATTLE,DEMO_PARTICIPANTS} from './battle-demo-config.js?rev=57';
import {ensureNpcRoundTrack,npcMeanSkill} from './battle-npc.js?rev=57';
import {rankTournamentSelection,seedBracket} from './battle-seeding.js?rev=57';
import {decideNoShow,resolveTechnicalPair} from './battle-no-show.js?rev=57';
import {recordBattleHistory} from './battle-history.js?rev=57';
import {beatResultSeed} from './beat-result.js?rev=57';
import {effectiveWritingSkill} from './lyric-production.js?rev=57';
import {effectiveBeatSkill} from './beat-production.js?rev=57';
import {effectiveVocalSkill} from './vocal-production.js?rev=57';
import {validGameMinute} from './game-minute.js?rev=57';
import {ensureRoundTheme} from './round-topics.js?rev=57';
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=57';
export const TOURNAMENT_ROUNDS=Object.freeze(['selection','round-2','round-3','round-4','round-5','final']);
const clone=v=>structuredClone(v),record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),battleId=DEMO_BATTLE.battleId;
function validRoundInternals(r){
 if(!r||!Array.isArray(r.judgeIds)||!record(r.submissions)||!Array.isArray(r.pairs)||!record(r.noShows))return false;
 if(!Object.values(r.submissions).every(id=>typeof id==='string')||!r.pairs.every(p=>typeof p?.nodeId==='string'&&Array.isArray(p.participantIds)&&p.participantIds.length===2&&p.participantIds.every(id=>id===null||typeof id==='string')))return false;
 if(r.judgingClock!==undefined&&(!record(r.judgingClock)||r.judgingClock.policyVersion!==2||!Number.isInteger(r.judgingClock.checkedHour)||r.judgingClock.checkedHour<6||r.judgingClock.checkedHour>40||!record(r.judgingClock.completed)||!Object.entries(r.judgingClock.completed).every(([id,at])=>r.judgeIds.includes(id)&&validGameMinute(at))))return false;
 return r.judgeBatches===undefined||record(r.judgeBatches)&&Object.entries(r.judgeBatches).every(([id,b])=>r.judgeIds.includes(id)&&b?.judgeId===id&&validGameMinute(b.publishedAt)&&Array.isArray(b.resultIds)&&b.resultIds.every(id=>typeof id==='string'));
}
export function heroTournamentSkills(state,skills={}){return {writing:effectiveWritingSkill(state,skills),musicality:Math.max(0,Math.min(100,Number.isFinite(skills.musicality)?skills.musicality:10)),flow:effectiveVocalSkill(state,skills),beatmaking:effectiveBeatSkill(state,skills),sound:effectiveVocalSkill(state,skills,'mix')};}
export function normalizeTournaments(raw){
 const byId={},recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[];
 for(const [id,t]of Object.entries(record(raw?.byId)?raw.byId:{})){
  const valid=id===battleId&&t?.policyVersion===2&&t.battleId===id&&Number.isSafeInteger(t.seed)&&TOURNAMENT_ROUNDS.includes(t.currentRoundId)&&record(t.rounds)&&Array.isArray(t.events)&&Array.isArray(t.participantIds)&&['active','complete'].includes(t.status)&&Object.entries(t.rounds).every(([key,r])=>TOURNAMENT_ROUNDS.includes(key)&&validRoundInternals(r)&&r?.roundId===key&&validGameMinute(r.opensAt)&&validGameMinute(r.closesAt)&&r.closesAt>r.opensAt&&Array.isArray(r.judgeIds)&&record(r.submissions)&&Array.isArray(r.pairs)&&record(r.noShows)&&['accepting','awaiting_judges','complete'].includes(r.status));
  const linksValid=valid&&record(t.rounds[t.currentRoundId])&&t.events.every(e=>record(e)&&typeof e.id==='string'&&typeof e.type==='string'&&e.battleId===id&&Object.hasOwn(t.rounds,e.roundId)&&validGameMinute(e.dueAt));
  if(linksValid)byId[id]=clone(t);else recovery.push({battleId:id,recoveryData:clone(t),reason:'Турнир повреждён. История сохранена без повторного посева.'});
 }return {version:2,byId,recovery};
}
function newRound(window){return {...clone(window),status:'accepting',submissions:{},pairs:[],noShows:{}};}
export function ensureTournament(state,{battleId:id=battleId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),tournaments=normalizeTournaments(state.tournaments);
 if(id!==battleId||!validGameMinute(nowMinute))return fail('Неизвестный турнир или время.');
 if(tournaments.byId[id])return {ok:true,state,reason:''};
 if(tournaments.recovery.some(r=>r.battleId===id))return fail('Сохранённый турнир требует восстановления.');
 const window=state.battleWindows?.find(w=>w.battleId===id&&w.roundId==='selection'&&!w.issue);if(!window)return fail('Сначала нужны сохранённые сроки отбора.');
 tournaments.byId[id]={battleId:id,policyVersion:2,seed:beatResultSeed(window.id+':'+window.opensAt),status:'active',currentRoundId:'selection',participantIds:DEMO_PARTICIPANTS.map(p=>p.characterId),rounds:{selection:newRound(window)},bracket:null,qualifiedIds:[],events:[],nextRoundAt:null,winnerId:null};
 const themed=ensureRoundTheme({...state,tournaments},{battleId:id,roundId:'selection',judgeIds:window.judgeIds,opensAt:window.opensAt,legacyTitle:BATTLE_BRIEFS.find(b=>b.id===id)?.theme});
 if(themed.theme)tournaments.byId[id].events.push(eventFor(window,'round-announced',window.opensAt,{themeId:themed.theme.id,publicationKind:'round-organized',text:'Открыт отбор. Тема и сроки опубликованы.'}));
 return {ok:true,state:themed.state,reason:''};
}
function historyEntry(round,participantId,status,at,trackVersionId=null){return {id:[battleId,round.roundId,participantId,status].join(':'),participantId,battleId,roundId:round.roundId,status,trackVersionId,resultId:null,occurredAt:at};}
function eventFor(round,type,at,payload={}){return {id:[battleId,round.roundId,type].join(':'),battleId,communityId:battleId,roundId:round.roundId,type,dueAt:at,...payload};}
function addEvent(t,event,events){if(!t.events.some(e=>e.id===event.id)){t.events.push(event);events.push(clone(event));}}
function closeRound(state,t,round){
 let s=state;const history=[],player=state.battleSubmissions?.find(row=>row.windowId===round.id&&!row.issue&&row.status!=='recovery'&&state.trackVersions?.byId?.[row.trackVersionId]);
 const participants=round.roundId==='selection'?[...DEMO_PARTICIPANTS.map(p=>p.characterId),...(state.battleApplications?.some(a=>a.battleId===battleId)?['player']:[])]:round.pairs.flatMap(p=>p.participantIds).filter(Boolean);
 if(round.roundId==='selection')t.participantIds=[...participants];
 for(const id of participants){
  if(id==='player'){
   if(player&&(player.sentAt===null&&player.migration||player.sentAt>=round.opensAt&&player.sentAt<round.closesAt))round.submissions[id]=player.trackVersionId;
  }else if(!round.noShows[id]?.misses){const made=ensureNpcRoundTrack(s,{characterId:id,battleId,roundId:round.roundId,nowMinute:round.closesAt});if(!made.ok)throw Error(made.reason);s=made.state;round.submissions[id]=made.trackVersionId;}
  const pair=round.pairs.find(p=>p.participantIds.includes(id)),bye=pair?.participantIds.includes(null);
  if(round.submissions[id])history.push(historyEntry(round,id,'submitted',round.closesAt,round.submissions[id]));
  else if(!bye)history.push(historyEntry(round,id,'no_show',round.closesAt));
 }
 for(const pair of round.pairs)pair.technical=resolveTechnicalPair({participantIds:pair.participantIds,submissionIds:pair.participantIds.map(id=>round.submissions[id]??null)});
 round.status='awaiting_judges';return recordBattleHistory(s,history);
}
function announceNext(state,t,heroSkills){
 const index=TOURNAMENT_ROUNDS.indexOf(t.currentRoundId)+1,roundId=TOURNAMENT_ROUNDS[index],opensAt=t.nextRoundAt;
 if(!roundId||!validGameMinute(opensAt))return null;
 const judgeIds=[...DEMO_BATTLE.panels[roundId].judgeIds],window={id:battleId+':'+roundId+':1',battleId,roundId,opensAt,closesAt:opensAt+7*1440,judgeIds,judgingPolicyVersion:2,policyVersion:2,judgingOffsets:judgeIds.map((_,i)=>(i+1)*60)};
 const round=newRound(window),hero=heroTournamentSkills(state,heroSkills);round.heroSkillSnapshot=hero;
 round.pairs=t.bracket.rounds[index-1].map(n=>({nodeId:n.id,participantIds:[...n.participantIds]}));
 for(const pair of round.pairs)for(const [slot,id]of pair.participantIds.entries()){
  if(!id)continue;const other=pair.participantIds[1-slot],own=id==='player'?hero:DEMO_PARTICIPANTS.find(p=>p.characterId===id)?.skills,opponent=other==='player'?hero:DEMO_PARTICIPANTS.find(p=>p.characterId===other)?.skills;
  if(!own)throw Error('Неизвестный участник сетки.');
  round.noShows[id]=decideNoShow({characterId:id,pairId:battleId+':'+roundId+':'+pair.nodeId,roundId,ownMean:npcMeanSkill(own),opponentMean:opponent?npcMeanSkill(opponent):npcMeanSkill(own),basePercent:other?DEMO_BATTLE.noShow.basePercent:0,seed:t.seed,isPlayer:id==='player'});
 }
 t.rounds[roundId]=round;t.currentRoundId=roundId;t.nextRoundAt=null;
 const themed=ensureRoundTheme({...state,battleWindows:[...(state.battleWindows??[]),window]},{battleId,roundId,judgeIds,opensAt});
 return {state:themed.state,round};
}
export function advanceTournament(input,nowMinute,{heroSkills={}}={}){
 const unchanged={state:input,events:[],changed:false};if(!validGameMinute(nowMinute))return unchanged;
 const tournaments=normalizeTournaments(input.tournaments),t=tournaments.byId[battleId];if(!t||t.status==='complete')return unchanged;
 let state={...input,tournaments},changed=false;const events=[];
 try{
  // A saved closed snapshot may predate a durable outgoing submission. Repair
  // only the still-judging round, from its canonical window and frozen version;
  // never reopen a completed result or admit a late/recovery attachment.
  const pendingRound=t.rounds[t.currentRoundId];
  if(pendingRound.status==='awaiting_judges'&&!pendingRound.submissions.player){
   const row=state.battleSubmissions?.find(s=>s.version===2&&s.playerId==='player'&&s.battleId===battleId&&s.communityId===battleId&&s.roundId===pendingRound.roundId&&s.windowId===pendingRound.id&&!s.issue&&['pending','accepted'].includes(s.status)&&state.trackVersions?.byId?.[s.trackVersionId]&&validGameMinute(s.sentAt)&&s.sentAt>=pendingRound.opensAt&&s.sentAt<pendingRound.closesAt);
   const participates=pendingRound.roundId==='selection'?t.participantIds.includes('player'):pendingRound.pairs.some(p=>p.participantIds.includes('player'));
   if(row&&participates){
    pendingRound.submissions.player=row.trackVersionId;
    for(const pair of pendingRound.pairs)pair.technical=resolveTechnicalPair({participantIds:pair.participantIds,submissionIds:pair.participantIds.map(id=>pendingRound.submissions[id]??null)});
    const entries=(state.battleHistory?.entries??[]).filter(e=>!(e.battleId===battleId&&e.roundId===pendingRound.roundId&&e.participantId==='player'&&e.status==='no_show'));
    state=recordBattleHistory({...state,battleHistory:{...state.battleHistory,entries}},[historyEntry(pendingRound,'player','submitted',pendingRound.closesAt,row.trackVersionId)]);changed=true;
   }
  }
  for(let steps=0;steps<TOURNAMENT_ROUNDS.length*2;steps++){
   let round=t.rounds[t.currentRoundId];
   if(round.status==='complete'&&t.nextRoundAt!==null&&t.nextRoundAt<=nowMinute){const next=announceNext(state,t,heroSkills);if(!next)break;state=next.state;round=next.round;changed=true;addEvent(t,eventFor(round,'round-announced',round.opensAt,{themeId:state.roundThemes?.[battleId+':'+round.roundId]?.id,publicationKind:'round-organized',text:'Объявлены новые пары. Приём работ открыт на семь дней.'}),events);}
   if(round.status==='accepting'&&round.closesAt<=nowMinute){state=closeRound(state,t,round);changed=true;addEvent(t,eventFor(round,'round-closed',round.closesAt,{text:'Приём работ закрыт. Начинается судейство.'}),events);}else break;
   // Only the judging clock may complete the round. Never invent a winner here.
   if(round.status==='awaiting_judges')break;
  }
 }catch(error){return {...unchanged,reason:error.message};}
 return changed?{state:{...state,tournaments},events,changed:true}:unchanged;
}
export function completeTournamentRound(input,{battleId:id=battleId,roundId,completedAt,gradesById,winnersByNode={}}={}){
 const fail=reason=>({ok:false,state:input,reason}),tournaments=normalizeTournaments(input.tournaments),t=tournaments.byId[id],round=t?.rounds[roundId];
 if(!round||round.status!=='awaiting_judges'||!validGameMinute(completedAt)||completedAt<round.closesAt)return fail('Раунд не готов к фиксации итога.');
 const history=[];
 if(roundId==='selection'){
  let selection;try{selection=rankTournamentSelection(Object.keys(round.submissions),gradesById??{},{limit:DEMO_BATTLE.selectionPlaces,seed:t.seed});}catch(e){return fail(e.message);}
  if(selection.pendingIds.length||selection.qualifiedIds.length!==32)return fail('Дождись пяти оценок каждой работы отбора.');
  t.selection=selection;t.qualifiedIds=[...selection.qualifiedIds];t.bracket=seedBracket(t.qualifiedIds,{mode:DEMO_BATTLE.pairing,seed:t.seed});
  for(const id of t.participantIds)if(!t.qualifiedIds.includes(id))history.push(historyEntry(round,id,'eliminated',completedAt,round.submissions[id]??null));
 }else{
  const nodes=t.bracket.rounds[TOURNAMENT_ROUNDS.indexOf(roundId)-1];
  for(const pair of round.pairs){const technical=pair.technical;if(!technical)return fail('Технический исход ещё не проверен.');
   const winner=technical.kind==='judged'?winnersByNode[pair.nodeId]:technical.winnerId;
   if(technical.kind==='judged'&&!pair.participantIds.includes(winner))return fail('Нужен однозначный результат полной панели.');
   const node=nodes.find(n=>n.id===pair.nodeId);node.winnerId=winner??null;node.resolved=true;pair.winnerId=node.winnerId;
   for(const id of pair.participantIds.filter(Boolean)){
    if(id===winner)history.push(historyEntry(round,id,technical.kind==='judged'?'won':technical.kind,completedAt,round.submissions[id]??null));
    else {if(technical.kind==='judged')history.push(historyEntry(round,id,'lost',completedAt,round.submissions[id]));history.push(historyEntry(round,id,'eliminated',completedAt,round.submissions[id]??null));}
   }
   if(node.nextNodeId){const next=t.bracket.rounds.flat().find(n=>n.id===node.nextNodeId);next.participantIds[node.index%2]=node.winnerId;}
  }
 }
 round.status='complete';round.completedAt=completedAt;
 if(roundId==='final'){t.status='complete';t.winnerId=round.pairs[0]?.winnerId??null;t.nextRoundAt=null;}else t.nextRoundAt=completedAt+1440;
 const event=eventFor(round,'round-result',completedAt,{text:roundId==='final'?'Турнир завершён.':'Итог раунда опубликован. Следующий анонс через сутки.'});const events=[];addEvent(t,event,events);
 return {ok:true,state:recordBattleHistory({...input,tournaments},history),events,reason:''};
}
