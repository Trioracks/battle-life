// Agreed fallback epoch; the exact historical PvB 3 launch is not verified.
const START=Date.UTC(2012,8,1),DAY_MS=86400000;
export function homeDateLabel(gameDay=1){
 const day=Number.isSafeInteger(gameDay)&&gameDay>0?gameDay:1;
 const date=new Date(START+(day-1)*DAY_MS);
 if(!Number.isFinite(date.getTime()))return homeDateLabel(1);
 return [date.getUTCDate(),date.getUTCMonth()+1,date.getUTCFullYear()].map((v,i)=>String(v).padStart(i===2?4:2,'0')).join('.');
}
export function gameDateTimeLabel(absoluteMinute){
 if(!Number.isFinite(absoluteMinute)||absoluteMinute<0||absoluteMinute>=1440*100000)return 'время не сохранено';
 const whole=Math.floor(absoluteMinute),minute=whole%1440;return homeDateLabel(Math.floor(whole/1440)+1)+' '+String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
}
export function gameMonthGrid(gameDay=1){
 const valid=Number.isSafeInteger(gameDay)&&gameDay>0&&gameDay<100000?gameDay:1,date=new Date(START+(valid-1)*DAY_MS),year=date.getUTCFullYear(),month=date.getUTCMonth(),first=Date.UTC(year,month,1),length=new Date(Date.UTC(year,month+1,0)).getUTCDate(),leading=(new Date(first).getUTCDay()+6)%7,days=Array(leading).fill(null);
 for(let day=1;day<=length;day++){const absoluteDay=Math.round((first-START)/DAY_MS)+day;days.push({day,gameDay:absoluteDay,current:absoluteDay===valid});}while(days.length%7)days.push(null);
 return {year,month:month+1,days};
}
