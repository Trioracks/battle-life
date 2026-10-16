export const validGameMinute=value=>Number.isFinite(value)&&value>=0&&value<1440*100000;
export function gameMinuteStamp(clock){return Number.isSafeInteger(clock?.day)&&clock.day>=1&&Number.isFinite(clock.minutes)&&clock.minutes>=0&&clock.minutes<1440?(clock.day-1)*1440+clock.minutes:null;}
export function gameMinuteLabel(value){if(!validGameMinute(value))return 'время не сохранено';const day=Math.floor(value/1440)+1,minute=Math.floor(value%1440);return 'День '+day+' · '+String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');}
