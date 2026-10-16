const statuses=new Set(['submitted','no_show','won','lost','technical_win','bye','eliminated']),clone=v=>structuredClone(v);
export function normalizeBattleHistory(raw){
 const entries=[],seen=new Set(),recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[];
 for(const entry of Array.isArray(raw?.entries)?raw.entries:[]){
  if(entry&&typeof entry.id==='string'&&typeof entry.participantId==='string'&&typeof entry.battleId==='string'&&typeof entry.roundId==='string'&&statuses.has(entry.status)&&Number.isFinite(entry.occurredAt)&&entry.occurredAt>=0){if(!seen.has(entry.id)){seen.add(entry.id);entries.push(clone(entry));}}
  else recovery.push({recoveryData:clone(entry),reason:'Не удалось прочитать историческую запись.'});
 }return {version:2,entries,recovery};
}
export function recordBattleHistory(state,entries){
 const history=normalizeBattleHistory(state.battleHistory);return {...state,battleHistory:normalizeBattleHistory({...history,entries:[...history.entries,...entries]})};
}
export function publicBattleHistory(state,{participantId,nowMinute}={}){
 if(!Number.isFinite(nowMinute))return [];
 return normalizeBattleHistory(state.battleHistory).entries.filter(e=>e.participantId===participantId&&e.occurredAt<=nowMinute).map(clone);
}
