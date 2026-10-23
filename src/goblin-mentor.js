import {GOBLIN_ID,GOBLIN_NAME,GOBLIN_DIALOGUE,GOBLIN_RELEASES,GOBLIN_INITIAL_POSTS,normalizeGoblin} from './goblin-catalog.js?rev=57';
import {receivePhoneEvents} from './phone-notifications.js?rev=57';
import {validGameMinute} from './game-minute.js?rev=57';

const battle='underweb://social/community/makarevich-1';
const links={
 client:{label:'Скачать torent',url:'underweb://dump/client'},
 ft:{label:'FT Studio — наш игровой FL',url:'underweb://dump/ft-studio'},
 notebook:{label:'Скачать Рэпблокнот',url:'underweb://dump/notebook'},
 battle:{label:'Макаревич Battle',url:battle},
};
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export const goblinPostChance=days=>Math.max(0,Math.min(100,(days-1)*5));
function writable(state){
 const g=normalizeGoblin(state.social?.goblin),dialog=structuredClone(state.social?.dialogs?.[GOBLIN_ID]??{peer:{kind:'person',id:GOBLIN_ID},messages:[],unread:false});
 return {state:{...state,social:{...state.social,goblin:g,dialogs:{...state.social?.dialogs,[GOBLIN_ID]:dialog}}},g,dialog};
}
function queue(g,key,at,body,extra={}){if(!g.pending.some(m=>m.id===key))g.pending.push({id:key,at,body,...extra});}
export function advanceGoblin(input,now){
 if(!validGameMinute(now))return {state:input,events:[],changed:false};
 const old=input.social?.goblin;
 if(old?.startedAt!==null&&old?.startedAt!==undefined&&now<old.startedAt)return {state:input,events:[],changed:false};
 const needsInit=old?.startedAt==null;
 const due=needsInit||old.pending.some(m=>m.at<=now)||(old.nextDay!==null&&old.nextDay*1440<=now)||(old.scheduled?.at<=now);
 const install=old?.stage==='client'&&input.software?.client?.installed||old?.stage==='software'&&input.software?.notebook?.installed;
 const ft=old?.ftPromptAt!==null&&old?.ftPromptAt!==undefined&&!old.ftReminder&&(input.software?.ft?.installed||now>=old.ftPromptAt+480);
 if(!due&&!install&&!ft)return {state:input,events:[],changed:false};
 const {state,g,dialog}=writable(input),events=[];
 if(needsInit){
  g.startedAt=now;g.nextDay=Math.floor(now/1440)+1;g.lastPostDay=Math.floor(now/1440);
  g.posts=structuredClone(GOBLIN_INITIAL_POSTS);
  g.stage='greeting-wait';queue(g,'hello',now+20,GOBLIN_DIALOGUE['hello'],{nextStage:'hello'});
 }
 if(install&&g.stage==='client'){
  g.stage='software';g.ftPromptAt=now;
  queue(g,'client-done',now+10,GOBLIN_DIALOGUE['client-done'],{links:[links.ft]});
  queue(g,'notebook-link',now+20,GOBLIN_DIALOGUE['notebook-link'],{links:[links.notebook]});
 }
 if(input.software?.notebook?.installed&&g.stage==='software'){
  g.stage='text';
  queue(g,'text-instructions',now+10,GOBLIN_DIALOGUE['text-instructions'],{links:[links.battle]});
  queue(g,'text-export',now+20,GOBLIN_DIALOGUE['text-export']);
 }
 if(ft){g.ftReminder=true;queue(g,'ft-check',now+10,input.software?.ft?.installed?GOBLIN_DIALOGUE['ft-ready']:GOBLIN_DIALOGUE['ft-check'],{links:[links.ft]});}
 for(const msg of g.pending.filter(m=>m.at<=now).sort((a,b)=>a.at-b.at)){
  const id='goblin:'+msg.id;
  if(!dialog.messages.some(m=>m.id===id)){
   const {nextStage,...rest}=msg;dialog.messages.push({...rest,id,kind:'personal',sender:GOBLIN_ID});dialog.unread=true;
   events.push({id,type:'personal-message',source:'В кругу',sender:GOBLIN_NAME,profileId:GOBLIN_ID,dialogId:GOBLIN_ID,dueAt:msg.at,text:msg.body});
   if(nextStage)g.stage=nextStage;
  }
 }
 g.pending=g.pending.filter(m=>m.at>now);
 // Daily, bounded bookkeeping in the social worker. Never decode audio here.
 let checked=0;
 const publish=()=>{
  const s=g.scheduled;if(!s||s.at>now)return;
  const release=GOBLIN_RELEASES[g.releaseIndex];
  if(g.releaseIndex<GOBLIN_RELEASES.length-2&&release){g.posts.push({id:'goblin:release:'+release.id,releaseId:release.id,at:s.at,photoId:['autumn','stairs','portrait','couch','winter','sleep','bathroom','friends'][g.releaseIndex%8]});g.releaseIndex++;}
  else{
   const n=g.posts.filter(p=>!p.releaseId).length;
   // Keep the wall and save bounded, but retain every authored music release.
   if(n>=24){const index=g.posts.findIndex(p=>!p.releaseId);g.posts.splice(index,1);}
   g.posts.push({id:'goblin:diary:'+s.day,at:s.at,diaryIndex:s.day%6,photoId:['autumn','stairs','portrait','couch','winter','sleep','bathroom','friends'][s.day%8]});
  }
  g.lastPostDay=s.day;g.scheduled=null;
 };
 publish();
 while(g.nextDay!==null&&g.nextDay*1440<=now&&checked++<90){
  const day=g.nextDay++;
  publish();if(g.scheduled)continue;
  const roll=hash('goblin:post:'+g.startedAt+':'+day)%100;
  if(roll<goblinPostChance(day-g.lastPostDay)){
   g.scheduled={day,at:day*1440+480+hash('goblin:time:'+g.startedAt+':'+day)%840};
   publish();
  }
 }
 state.phone=receivePhoneEvents(state.phone,events);
 return {state,events,changed:true};
}
export function goblinChoices(state){
 const g=state.social?.goblin;
 if(g?.stage==='hello')return [['good','Хорошо! Сам как?'],['normal','Нормально, сам как?'],['bad','Да так себе...']];
 if(g?.stage==='invite')return [['yes','О, круто! А чё дальше?'],['later','Я пока сам разберусь']];
 if(g?.stage==='subscribe')return [['subscribed','Я подписался, что дальше?']];
 if(g?.stage==='paused')return [['resume','Чувак, давай всё-таки попробуем']];
 return [];
}
export function replyToGoblin(input,choice,now){
 const found=goblinChoices(input).find(([id])=>id===choice);
 if(!found||!validGameMinute(now))return {ok:false,state:input,reason:'Этот ответ уже недоступен.'};
 if(choice==='subscribed'&&!input.social?.subscriptions?.includes('makarevich-1'))return {ok:false,state:input,reason:'Сначала подпишись на Макаревич Battle по ссылке в чате.'};
 const {state,g,dialog}=writable(input);
 dialog.messages.push({id:'goblin:reply:'+g.stage+':'+choice,kind:'personal',sender:'player',at:now,body:found[1]});
 if(['good','normal','bad'].includes(choice)){
  g.stage='invite-wait';
  queue(g,'mood',now+10,choice==='bad'?GOBLIN_DIALOGUE['mood-bad']:GOBLIN_DIALOGUE.mood);
  queue(g,'biography',now+20,GOBLIN_DIALOGUE['biography']);
  queue(g,'company',now+30,GOBLIN_DIALOGUE['company']);
  queue(g,'invite',now+40,GOBLIN_DIALOGUE['invite'],{links:[links.battle],nextStage:'invite'});
 }else if(choice==='yes'||choice==='resume'){
  g.stage='subscribe';queue(g,'subscribe-'+choice,now+10,GOBLIN_DIALOGUE.subscribe,{links:[links.battle]});
 }else if(choice==='later'){g.stage='paused';queue(g,'later',now+10,GOBLIN_DIALOGUE['later']);}
 else if(choice==='subscribed'){
  g.stage='client';queue(g,'client-link',now+10,GOBLIN_DIALOGUE['client-link'],{links:[links.client]});
 }
 return {ok:true,state,reason:''};
}
export function queueGoblinAttachment(input,{key,now,body,fileId,nextStage,delay=20}){
 const {state,g}=writable(input);g.stage=nextStage??g.stage;
 queue(g,key,now+delay,body,{fileId});return state;
}
