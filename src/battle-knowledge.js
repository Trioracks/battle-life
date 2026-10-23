import {battleFormat} from './battle-format.js?rev=58';
const clone=v=>JSON.parse(JSON.stringify(v));
export function normalizeBattleKnowledge(raw){
 const byRound={};
 for(const [key,row]of Object.entries(raw?.byRound??{})){
  const [battleId,roundId]=key.split(':');if(!battleFormat(battleId,roundId)||!Array.isArray(row?.evidence))continue;
  const seen=new Set();byRound[key]={evidence:row.evidence.filter(e=>typeof e?.id==='string'&&Number.isFinite(e.strength)&&!seen.has(e.id)&&seen.add(e.id)).map(e=>({id:e.id,strength:Math.max(0,Math.min(1,e.strength))}))};
 }
 return {schemaVersion:1,byRound};
}
export function revealBattleKnowledge(raw,{battleId,roundId='selection',analysisSkill=0,evidenceId}={}){
 const k=normalizeBattleKnowledge(raw);if(!battleFormat(battleId,roundId)||typeof evidenceId!=='string'||!evidenceId)return k;
 const key=battleId+':'+roundId,row=k.byRound[key]??{evidence:[]};if(row.evidence.some(e=>e.id===evidenceId))return k;
 row.evidence.push({id:evidenceId,strength:.15+.7*Math.max(0,Math.min(100,Number(analysisSkill)||0))/100});k.byRound[key]=row;return k;
}
export function battleKnowledgeHints(raw,{battleId,roundId='selection'}={}){
 const k=normalizeBattleKnowledge(raw),f=battleFormat(battleId,roundId),evidence=k.byRound[battleId+':'+roundId]?.evidence??[];
 const confidence=Math.min(.95,evidence.reduce((sum,e)=>sum+e.strength,0)),hints=[];
 if(f&&confidence>0)hints.push('Это баттловая площадка: оценивают законченную работу, а не только качество записи.');
 if(f&&confidence>=.35)hints.push(f.axes.diss_addressing.target>=.5?'Адресность и состязательный характер здесь заметно важны.':'Личная тема здесь уместна; дисс не выглядит обязательным.');
 if(f&&confidence>=.6)hints.push(f.axes.sound_aesthetic.target<.3?'Более сдержанная обработка ближе привычкам этой площадки.':'На площадке есть место заметной обработке и экспериментам.');
 if(f&&confidence>=.8)hints.push('Судьи слышат одну работу по-разному. Совпадение с форматом не заменяет сильный текст и исполнение.');
 return clone({confidence:confidence>=.8?'Высокая':confidence>=.35?'Средняя':confidence>0?'Низкая':'Пока нет',hints});
}
