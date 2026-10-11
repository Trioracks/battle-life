import {createVirtualPcState} from './virtual-pc-state.js?rev=28';
import {softwareDiskBytes,withSoftware} from './pc-software.js?rev=28';
import {SOFTWARE} from './pc-software-catalog.js?rev=28';
const RATES=[24,31,37,28,35,26];
const PERIOD_BYTES=RATES.reduce((n,r)=>n+r*60000,0);
export function gameMinuteStamp(clock){return Number.isSafeInteger(clock?.day)&&clock.day>=1&&Number.isFinite(clock.minutes)&&clock.minutes>=0&&clock.minutes<1440?(clock.day-1)*1440+clock.minutes:null;}
function integral(minute){const periods=Math.floor(minute/6),remainder=minute-periods*6,whole=Math.floor(remainder);return periods*PERIOD_BYTES+RATES.slice(0,whole).reduce((n,r)=>n+r*60000,0)+(remainder-whole)*RATES[whole]*60000;}
export function advanceVirtualPc(state,clock){
 const s=createVirtualPcState(state),stamp=gameMinuteStamp(clock),t=s.software.task;
 if(stamp===null)return {state:s,advancedBytes:0};
 const previous=s.lastGameMinute,reset=previous===null||stamp<previous||s.power!=='on'||t?.paused||Boolean(t?.error);
 s.lastGameMinute=stamp;
 if(!t)return {state:s,advancedBytes:0};
 if(reset){t.baseMinute=stamp;t.baseBytes=s.software[t.appId].receivedBytes;return {state:s,advancedBytes:0};}
 if(t.baseMinute===null){t.baseMinute=previous;t.baseBytes=s.software[t.appId].receivedBytes;}
 const app=s.software[t.appId],total=SOFTWARE[t.appId].downloadBytes,free=softwareDiskBytes(s).free;
 const desired=Math.max(app.receivedBytes,Math.min(total,t.baseBytes+integral(stamp)-integral(t.baseMinute)));
 const advancedBytes=Math.min(desired-app.receivedBytes,free);app.receivedBytes+=advancedBytes;
 if(app.receivedBytes>=total)s.software.task=null;
 else if(desired-app.receivedBytes>0||free===0)t.error='insufficient-space';
 return {state:withSoftware(s,s.software),advancedBytes};
}
export function downloadPresentation(state){
 const s=createVirtualPcState(state),t=s.software.task,appId=t?.appId??'ft',app=s.software[appId],total=SOFTWARE[appId].downloadBytes,received=app.receivedBytes;
 const running=Boolean(t&&!t.paused&&!t.error&&s.power==='on'),minute=s.lastGameMinute??0,speed=running?RATES[Math.floor(minute)%6]:0,remaining=total-received;
 let eta=0;if(running&&remaining>0){let lo=0,hi=total/(24000*60)+6;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(integral(minute+mid)-integral(minute)<remaining)lo=mid;else hi=mid;}eta=Math.ceil(hi);}
 return {status:s.download.status,appId,speedKbPerSecond:speed,totalMb:total/1000000,receivedMb:received/1000000,percent:Math.floor(received/total*100),remainingGameMinutes:running?eta:null,seeds:running?6+Math.floor(minute)%7:0,peers:running?2+Math.floor(minute)%5:0,paused:Boolean(t?.paused),error:t?.error??''};
}
