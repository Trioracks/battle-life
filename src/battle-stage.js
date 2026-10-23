import {currentBattleWindow,canSubmitToBattleWindow} from './battle-windows.js?rev=58';
import {gameDateTimeLabel} from './home-calendar.js?rev=58';
import {validGameMinute} from './game-minute.js?rev=58';
const names={selection:'отбора','round-2':'1/16 финала','round-3':'1/8 финала','round-4':'четвертьфинала','round-5':'полуфинала',final:'финала'};
export function battleStage(state,{battleId,roundId,nowMinute}={}){
 const t=state.tournaments?.byId?.[battleId],window=roundId?(state.battleWindows??[]).find(w=>w.battleId===battleId&&w.roundId===roundId):currentBattleWindow(state,battleId,nowMinute);
 roundId??=window?.roundId??t?.currentRoundId??'selection';
 const round=t?.rounds?.[roundId],theme=state.roundThemes?.[battleId+':'+roundId];
 const base={kind:'not-started',roundId,themeId:theme?.id??null,themeTitle:theme?.title??'',heading:'Приём ещё не начался',deadlineMinute:null,deadlineLabel:'',tableUrl:'underweb://social/results/'+battleId+'/'+roundId,canSubmit:false};
 if(window?.issue||state.tournaments?.recovery?.some(r=>r.battleId===battleId))return {...base,kind:'recovery',heading:window?.issue??'Турнир требует восстановления'};
 if(!window||!validGameMinute(nowMinute))return base;
 let kind='accepting',deadlineMinute=window.closesAt,heading='Приём заявок и треков';
 if(nowMinute<window.opensAt){kind='not-started';deadlineMinute=window.opensAt;heading='Начало приёма заявок и треков';}
 else if(round?.status==='complete'&&validGameMinute(round.completedAt)&&round.completedAt<=nowMinute){
  kind=t.status==='complete'?'complete':'waiting-next';deadlineMinute=t.nextRoundAt??null;heading=kind==='complete'?'Турнир завершён':'Итоги '+(names[roundId]??'раунда')+' опубликованы';
 }else if(nowMinute>=window.closesAt){kind='judging';deadlineMinute=Math.ceil((window.closesAt+40*60)/1440)*1440;heading='Судейство '+(names[roundId]??'раунда');}
 return {...base,kind,heading,deadlineMinute,deadlineLabel:deadlineMinute===null?'':gameDateTimeLabel(deadlineMinute),canSubmit:kind==='accepting'&&canSubmitToBattleWindow(state,window)};
}
export function battleStageText(stage){
 if(stage.kind==='judging')return stage.heading+' · оценки не позднее '+stage.deadlineLabel;
 if(stage.kind==='waiting-next')return stage.heading+(stage.deadlineLabel?' · следующий анонс '+stage.deadlineLabel:'');
 return stage.heading+(stage.deadlineLabel?(stage.kind==='accepting'?' до ':' · ')+stage.deadlineLabel:'');
}
