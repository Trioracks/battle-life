import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=39';
import {battleRoster} from './battle-roster.js?rev=39';
import {validGameMinute} from './game-minute.js?rev=39';
const clone=v=>JSON.parse(JSON.stringify(v)),ids=new Set(BATTLE_BRIEFS.map(b=>b.id));
export function normalizeBattleWindows(value){
 const seen=new Set();return (Array.isArray(value)?value:[]).filter(v=>v&&ids.has(v.battleId)&&!seen.has(v.battleId+':'+v.roundId)&&seen.add(v.battleId+':'+v.roundId)).map(v=>{
  if(v.issue&&v.recoveryData)return clone(v);
  const valid=typeof v.id==='string'&&v.roundId==='selection'&&validGameMinute(v.opensAt)&&validGameMinute(v.closesAt)&&v.closesAt>v.opensAt&&Array.isArray(v.judgeIds)&&v.judgeIds.length%2===1&&v.judgeIds.every(id=>battleRoster('selection').judgeIds.includes(id))&&new Set(v.judgeIds).size===v.judgeIds.length&&Array.isArray(v.judgingOffsets)&&v.judgingOffsets.length===v.judgeIds.length&&v.judgingOffsets.every(t=>Number.isFinite(t)&&t>0&&t<=4320);
  return valid?clone(v):{battleId:v.battleId,roundId:v.roundId,issue:'Сроки приёма повреждены. Новое окно не открыто.',recoveryData:clone(v)};
 });
}
export function ensureBattleWindow(state,{battleId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason});
 if(!ids.has(battleId)||!validGameMinute(nowMinute))return fail('Не удалось определить баттл или игровое время.');
 const battleWindows=normalizeBattleWindows(state.battleWindows),existing=battleWindows.find(w=>w.battleId===battleId&&w.roundId==='selection');
 if(existing)return existing.issue?fail(existing.issue):{ok:true,state,reason:'',windowId:existing.id};
 const judgeIds=battleRoster('selection').judgeIds,window={id:battleId+':selection:1',battleId,roundId:'selection',opensAt:nowMinute,closesAt:nowMinute+7*1440,judgeIds,judgingOffsets:judgeIds.map((_,i)=>Math.floor((i+1)*4320/judgeIds.length))};
 return {ok:true,state:{...state,battleWindows:[...battleWindows,window]},reason:'',windowId:window.id};
}
export const attemptForWindow=(state,w)=>(state.battleSubmissions??[]).find(s=>s.windowId===w.id||!s.windowId&&s.battleId===w.battleId&&s.roundId==='selection');
