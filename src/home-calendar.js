// Agreed fallback epoch; the exact historical PvB 3 launch is not verified.
const START=Date.UTC(2012,8,1),DAY_MS=86400000;
export function homeDateLabel(gameDay=1){
 const day=Number.isSafeInteger(gameDay)&&gameDay>0?gameDay:1;
 const date=new Date(START+(day-1)*DAY_MS);
 if(!Number.isFinite(date.getTime()))return homeDateLabel(1);
 return [date.getUTCDate(),date.getUTCMonth()+1,date.getUTCFullYear()].map((v,i)=>String(v).padStart(i===2?4:2,'0')).join('.');
}
