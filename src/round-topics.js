import catalog from '../data/battles/round-topics-v1.json' with {type:'json'};
import {beatResultSeed} from './beat-result.js?rev=60';
import {judgeProfile} from './judge-profiles.js?rev=60';
import {validGameMinute} from './game-minute.js?rev=60';
import {gameDateTimeLabel} from './home-calendar.js?rev=60';
import {battleDeadlineAtMidnight} from './battle-windows.js?rev=60';
export const ROUND_TOPIC_CATALOG=Object.freeze(catalog);
export function normalizeRoundThemeState(source){
 const roundThemes=normalizeRoundThemes(source.roundThemes),roundThemeRecovery=Array.isArray(source.roundThemeRecovery)?structuredClone(source.roundThemeRecovery):[];
 for(const [id,theme]of Object.entries(source.roundThemes??{}))if(!Object.hasOwn(roundThemes,id)&&!roundThemeRecovery.some(r=>r.id===id))roundThemeRecovery.push({id,recoveryData:structuredClone(theme),reason:'Тема повреждена. Исходник сохранён; новая тема не выбрана.'});
 return {roundThemes,roundThemeRecovery};
}
const clone=v=>structuredClone(v),key=(battleId,roundId)=>battleId+':'+roundId;
export function roundTopicCandidates(){const rows=[];for(const [template,pairs]of Object.entries(catalog.whitelist))for(const pair of pairs){if(catalog.blacklist.includes(pair))continue;const [a,b]=pair.split(':'),noun=catalog.right.find(n=>n.id===b),left=(template==='noun-and-noun'?catalog.right:catalog.left).find(n=>n.id===a);let text=template==='adjective-noun'?left.forms[noun.gender]+' '+noun.word:template==='adjective-like-noun'?left.forms.m+' как '+noun.word:left.word+' и '+noun.word;rows.push({template,wordIds:[a,b],title:text[0].toUpperCase()+text.slice(1)});}return rows;}
export function normalizeRoundThemes(raw){const next={};for(const [id,t]of Object.entries(raw??{}))if(t?.id===id&&typeof t.title==='string'&&t.title.length<=100&&typeof t.authorJudgeId==='string'&&Array.isArray(t.wordIds)&&t.wordIds.every(v=>typeof v==='string')&&validGameMinute(t.opensAt)&&validGameMinute(t.closesAt)&&t.closesAt>t.opensAt)Object.defineProperty(next,id,{value:clone(t),enumerable:true});return next;}
export function ensureRoundTheme(state,{battleId,roundId,judgeIds,opensAt,legacyTitle}={}){
 const id=key(battleId,roundId),old=state.roundThemes?.[id];if(old)return {state,theme:old};
 if(state.roundThemeRecovery?.some(r=>r.id===id))return {state,theme:null};
 if(!validGameMinute(opensAt))return {state,theme:null};const authors=(judgeIds??[]).filter(id=>judgeProfile(id));if(!authors.length)return {state,theme:null};
 const seed=beatResultSeed(id+':'+opensAt+':'+(state.tournaments?.byId?.[battleId]?.seed??0)),used=new Set(Object.values(state.roundThemes??{}).filter(t=>t.battleId===battleId).map(t=>t.title)),available=roundTopicCandidates().filter(t=>!used.has(t.title));if(!available.length)return {state,theme:null};
 const choice=available[seed%available.length],covers=catalog.coverBriefs.filter(c=>c.nounIds.some(n=>choice.wordIds.includes(n))),cover=covers[(seed>>>8)%covers.length];
 const theme={id,battleId,roundId,title:legacyTitle??choice.title,wordIds:legacyTitle?[]:choice.wordIds,template:legacyTitle?'legacy-advertised':choice.template,coverId:legacyTitle?null:cover.id,authorJudgeId:authors[(seed>>>16)%authors.length],catalogVersion:legacyTitle?0:1,opensAt,closesAt:state.battleWindows?.find(w=>w.battleId===battleId&&w.roundId===roundId)?.closesAt??battleDeadlineAtMidnight(opensAt),hype:({'round-2':70,'round-3':75,'round-4':80,'round-5':85,final:85})[roundId]??20};
 return {state:{...state,roundThemes:{...state.roundThemes,[id]:theme}},theme};
}
export function currentRoundTopic(state,battleId,nowMinute=Infinity){const t=state.tournaments?.byId?.[battleId],rounds=Object.values(t?.rounds??{}).filter(r=>r.opensAt<=nowMinute).sort((a,b)=>a.opensAt-b.opensAt),round=rounds.at(-1);return round?state.roundThemes?.[key(battleId,round.roundId)]??null:null;}
export function publicRoundAnnouncements(state,{battleId='makarevich-1',nowMinute}={}){if(!validGameMinute(nowMinute))return [];const t=state.tournaments?.byId?.[battleId];return (t?.events??[]).filter(e=>e.type==='round-announced'&&e.dueAt<=nowMinute&&state.roundThemes?.[e.themeId]).map(e=>{const theme=state.roundThemes[e.themeId],date=gameDateTimeLabel(e.dueAt),author=judgeProfile(theme.authorJudgeId)?.name??'Судья';return {id:e.id,eventId:e.id,battleId,roundId:e.roundId,at:e.dueAt,date,theme:clone(theme),author,authorJudgeId:theme.authorJudgeId,body:'Тема раунда: «'+theme.title+'». Автор: '+author+'. Приём заявок и треков до '+gameDateTimeLabel(theme.closesAt)+'.',judgePost:{id:e.id+':author',themeId:theme.id,at:e.dueAt,date,body:'Моя тема для этого этапа — «'+theme.title+'». Единственной правильной трактовки нет: ищите свою мысль.'}};});}
