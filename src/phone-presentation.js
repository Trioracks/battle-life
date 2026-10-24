import {gameDateTimeLabel} from './home-calendar.js?rev=61';

export function normalizePhonePresentation(raw){
 return {
  firstWakeAtMinute:Number.isFinite(raw?.firstWakeAtMinute)&&raw.firstWakeAtMinute>=0?raw.firstWakeAtMinute:null,
  announcedIds:[...new Set((Array.isArray(raw?.announcedIds)?raw.announcedIds:[]).filter(id=>typeof id==='string'&&id.length>0))],
 };
}

// Presentation is deliberately outside the social Worker's phone queue domain.
export function phonePresentation(state,{nowMinute,sleeping,mode,pcPhase}){
 const presentation=normalizePhonePresentation(state?.phonePresentation),visible=mode==='game'&&pcPhase==='room';
 const need=value=>Number.isFinite(value)?Math.max(0,Math.min(100,value)):100;
 return {visible,canNotify:visible&&!sleeping&&presentation.firstWakeAtMinute!==null&&Number.isFinite(nowMinute)&&nowMinute>=presentation.firstWakeAtMinute+.25,
  time:gameDateTimeLabel(nowMinute),needs:{satiety:need(state?.music?.needs?.satiety),energy:need(state?.music?.needs?.energy)}};
}
