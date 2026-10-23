import {ensureBattleWindow} from './battle-windows.js?rev=58';
import {applyToBattle} from './virtual-pc-state.js?rev=58';
import {gameDateTimeLabel} from './home-calendar.js?rev=58';
import {validGameMinute} from './game-minute.js?rev=58';
export function metadataGameMinute(metadata={}){
 if(validGameMinute(metadata.gameMinutes))return metadata.gameMinutes;
 const match=/^(\d{1,2}):(\d{2})$/.exec(metadata.clockLabel??''),day=Number.isSafeInteger(metadata.gameDay)&&metadata.gameDay>0?metadata.gameDay:1;
 return (day-1)*1440+(match&&Number(match[1])<24&&Number(match[2])<60?Number(match[1])*60+Number(match[2]):0);
}
export function battleDeadlineLabel(window,nowMinute){
 if(!window||window.issue)return {text:window?.issue??'Срок приёма ещё не сохранён. Повтори открытие страницы.',open:false};
 const open=validGameMinute(nowMinute)&&nowMinute>=window.opensAt&&nowMinute<window.closesAt;
 return {text:(open?'':nowMinute<window.opensAt?'Приём ещё не начался. ':'Приём закрыт. ')+'Приём заявок и треков до '+gameDateTimeLabel(window.closesAt),open};
}
export function registerBattle(state,{battleId,playerName,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason,alreadyRegistered:false});
 if(typeof playerName!=='string'||!playerName.trim())return fail('Не удалось определить ник героя.');
 const ensured=ensureBattleWindow(state,{battleId,nowMinute,judgingPolicyVersion:2});if(!ensured.ok)return fail(ensured.reason);
 const window=ensured.state.battleWindows.find(w=>w.id===ensured.windowId);if(!battleDeadlineLabel(window,nowMinute).open)return fail('Приём заявок и треков закрыт.');
 const alreadyRegistered=Boolean(ensured.state.battleApplications?.some(a=>a.battleId===battleId));
 return {ok:true,state:alreadyRegistered?ensured.state:applyToBattle(ensured.state,battleId,playerName),alreadyRegistered,reason:''};
}
