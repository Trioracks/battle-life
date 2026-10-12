import {createVirtualPcState} from './virtual-pc-state.js?rev=38';
import {softwareDiskBytes} from './pc-software.js?rev=38';
import {SOFTWARE} from './pc-software-catalog.js?rev=38';
import {advanceTransfers,TRANSFER_RATES} from './pc-transfer-runtime.js?rev=38';
import {gameMinuteStamp} from './game-minute.js?rev=38';
import {advanceSocial} from './social-runtime.js?rev=38';
import {advanceSubmissionUpload,UPLOAD_BYTES_PER_SECOND} from './social-upload.js?rev=38';
// Only the buffered fraction of active time is ephemeral. State exposed to the
// UI is always the last durable checkpoint, never an optimistic ready draft.
export function createSubmissionTransferClock(){
 let pending=0,lastKey='',lastPhase=null;
 return {tick(input,{activeSeconds=0,powered=false,paused=true,phase=''}={},persist=()=>false){
  const u=input.outgoingUpload,key=JSON.stringify(u??null);if(key!==lastKey)pending=0;lastKey=key;
  const phaseChanged=lastPhase!==null&&phase!==lastPhase;lastPhase=phase;
  const unchanged={state:input,changed:false,completed:false,saveFailed:false};
  if(!u||u.issue||u.status!=='uploading'){pending=0;return unchanged;}
  if(powered&&!paused&&Number.isFinite(activeSeconds)&&activeSeconds>0)pending+=activeSeconds;
  const remaining=(u.totalBytes-u.uploadedBytes-u.fractionalBytes)/UPLOAD_BYTES_PER_SECOND;
  if(pending<=0||pending<1&&!phaseChanged&&pending+1e-9<remaining)return unchanged;
  const next=advanceSubmissionUpload(input,{activeSeconds:pending,powered:true,paused:false});pending=0;
  let saved;try{saved=persist(next.state);}catch{saved=false;}
  if(saved===false||saved?.ok===false)return {...unchanged,saveFailed:true};
  lastKey=JSON.stringify(next.state.outgoingUpload);return {...next,saveFailed:false};
 }};
}
export {gameMinuteStamp};
export function advanceVirtualPc(input,clock){
 let s=createVirtualPcState(input);const stamp=gameMinuteStamp(clock),previous=s.lastGameMinute;
 if(stamp===null)return {state:s,advancedBytes:0};
 const social=advanceSocial(s,stamp);s=social.state;
 s.lastGameMinute=stamp;
 if(previous===null||stamp<previous||s.power!=='on')return {state:s,advancedBytes:0,events:social.events};
 return {...advanceTransfers(s,previous,stamp),events:social.events};
}
// A domain event becomes visible only after its state has been durably saved.
// Ordinary frame progress retains the host's existing batched-save policy.
export function advanceVirtualPcDurably(input,clock,persist){
 const next=advanceVirtualPc(input,clock);
 const migration=JSON.stringify(input.battleSubmissions??[])!==JSON.stringify(next.state.battleSubmissions??[]);
 if(next.events?.length||migration){
  let saved;try{saved=persist(next.state);}catch{saved=false;}
  if(saved===false||saved?.ok===false)return {...next,state:input,events:[],advancedBytes:0,saveFailed:true};
 }
 return next;
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
