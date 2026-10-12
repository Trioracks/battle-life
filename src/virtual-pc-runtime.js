import {createVirtualPcState} from './virtual-pc-state.js?rev=36';
import {softwareDiskBytes} from './pc-software.js?rev=35';
import {SOFTWARE} from './pc-software-catalog.js?rev=35';
import {advanceTransfers,TRANSFER_RATES} from './pc-transfer-runtime.js?rev=35';
export function gameMinuteStamp(clock){return Number.isSafeInteger(clock?.day)&&clock.day>=1&&Number.isFinite(clock.minutes)&&clock.minutes>=0&&clock.minutes<1440?(clock.day-1)*1440+clock.minutes:null;}
export function advanceVirtualPc(input,clock){
 const s=createVirtualPcState(input),stamp=gameMinuteStamp(clock),previous=s.lastGameMinute;
 if(stamp===null)return {state:s,advancedBytes:0};
 s.lastGameMinute=stamp;
 if(previous===null||stamp<previous||s.power!=='on')return {state:s,advancedBytes:0};
 return advanceTransfers(s,previous,stamp);
}
export function downloadPresentation(input,appId='ft'){
 const s=createVirtualPcState(input),id=SOFTWARE[appId]?appId:'ft',t=s.software.transfers[id],app=s.software[id],total=SOFTWARE[id].downloadBytes,received=app.receivedBytes;
 const running=Boolean(t&&!t.paused&&!t.error&&s.power==='on'),minute=s.lastGameMinute??0;
 const count=Object.values(s.software.transfers).filter(t=>!t.paused&&!t.error).length;
 const speed=running?TRANSFER_RATES[Math.floor(minute)%6]/count:0;
 let eta=null;
 const outstanding=Object.values(s.software.transfers).filter(t=>!t.paused&&!t.error).reduce((n,t)=>n+SOFTWARE[t.appId].downloadBytes-s.software[t.appId].receivedBytes,0);
 if(running&&softwareDiskBytes(s).free>=outstanding){
  let lo=0,hi=outstanding/(24000*60)+6;
  for(let n=0;n<40;n++){const mid=(lo+hi)/2;if(advanceTransfers(s,minute,minute+mid).state.software[id].receivedBytes<total)lo=mid;else hi=mid;}
  eta=Math.ceil(hi);
 }
 return {status:app.installed?'installed':received===total?'ready-to-install':t?'downloading':'idle',appId:id,speedKbPerSecond:speed,totalMb:total/1000000,receivedMb:received/1000000,percent:Math.floor(received/total*100),remainingGameMinutes:eta,seeds:running?6+Math.floor(minute)%7:0,peers:running?2+Math.floor(minute)%5:0,paused:Boolean(t?.paused),error:t?.error??''};
}
