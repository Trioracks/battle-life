import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=57';
import {battleRoster,BATTLE_ROUND_IDS} from './battle-roster.js?rev=43';
import {validGameMinute} from './game-minute.js?rev=43';
const clone=v=>JSON.parse(JSON.stringify(v)),ids=new Set(BATTLE_BRIEFS.map(b=>b.id));
export const isBattleWindowId=(id,battleId)=>BATTLE_ROUND_IDS.some(round=>id===battleId+':'+round+':1');
export function currentBattleWindow(state,battleId,nowMinute=Infinity){
 return (state.battleWindows??[]).filter(w=>w.battleId===battleId&&!w.issue&&w.opensAt<=nowMinute).sort((a,b)=>b.opensAt-a.opensAt)[0]??(state.battleWindows??[]).find(w=>w.battleId===battleId);
}
export function canSubmitToBattleWindow(state,window){
 if(!window||window.issue)return false;if(window.roundId==='selection')return true;
 const t=state.tournaments?.byId?.[window.battleId],round=t?.rounds?.[window.roundId];
 return t?.currentRoundId===window.roundId&&round?.status==='accepting'&&round.id===window.id&&round.pairs?.some(pair=>pair.participantIds.includes('player'));
}
export function normalizeBattleWindows(value){
 const seen=new Set();return (Array.isArray(value)?value:[]).filter(v=>v&&ids.has(v.battleId)&&!seen.has(v.battleId+':'+v.roundId)&&seen.add(v.battleId+':'+v.roundId)).map(v=>{
  if(v.issue&&v.recoveryData)return clone(v);
  const valid=isBattleWindowId(v.id,v.battleId)&&BATTLE_ROUND_IDS.includes(v.roundId)&&validGameMinute(v.opensAt)&&validGameMinute(v.closesAt)&&v.closesAt>v.opensAt&&Array.isArray(v.judgeIds)&&v.judgeIds.length%2===1&&v.judgeIds.every(id=>battleRoster(v.roundId)?.judgeIds.includes(id))&&new Set(v.judgeIds).size===v.judgeIds.length&&Array.isArray(v.judgingOffsets)&&v.judgingOffsets.length===v.judgeIds.length&&v.judgingOffsets.every(t=>Number.isFinite(t)&&t>0&&t<=4320);
  return valid?clone(v):{battleId:v.battleId,roundId:v.roundId,issue:'Сроки приёма повреждены. Новое окно не открыто.',recoveryData:clone(v)};
 });
}
export function ensureBattleWindow(state,{battleId,nowMinute,judgingPolicyVersion=1}={}){
 const fail=reason=>({ok:false,state,reason});
 if(!ids.has(battleId)||!validGameMinute(nowMinute))return fail('Не удалось определить баттл или игровое время.');
 const battleWindows=normalizeBattleWindows(state.battleWindows),existing=battleWindows.find(w=>w.battleId===battleId&&w.roundId==='selection');
 if(existing){
  if(existing.issue)return fail(existing.issue);
  if(battleId==='makarevich-1'&&judgingPolicyVersion===2&&existing.judgingPolicyVersion!==2){const migrated={...existing,judgingPolicyVersion:2,judgingMigration:{fromPolicy:1,activatedAt:nowMinute,legacyOffsets:[...existing.judgingOffsets]}};return {ok:true,state:{...state,battleWindows:battleWindows.map(w=>w.id===existing.id?migrated:w)},reason:'',windowId:existing.id};}
  return {ok:true,state,reason:'',windowId:existing.id};
 }
 const judgeIds=battleRoster('selection').judgeIds,window={id:battleId+':selection:1',battleId,roundId:'selection',opensAt:nowMinute,closesAt:nowMinute+7*1440,judgeIds,judgingOffsets:judgeIds.map((_,i)=>Math.floor((i+1)*4320/judgeIds.length))};
 if(judgingPolicyVersion===2)window.judgingPolicyVersion=2;
 return {ok:true,state:{...state,battleWindows:[...battleWindows,window]},reason:'',windowId:window.id};
}
export const attemptForWindow=(state,w)=>(state.battleSubmissions??[]).find(s=>s.windowId===w.id||!s.windowId&&s.battleId===w.battleId&&s.roundId===w.roundId);
