import {normalizeSocial} from './social-state.js?rev=57';
import {profileById,communityById} from './social-catalog.js?rev=57';
import {receivePhoneEvents} from './phone-notifications.js?rev=57';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=57';
import {validGameMinute} from './game-minute.js?rev=57';
const SCHEDULE=Object.freeze([
 {id:'personal:vitya:day1',dueAt:600,text:'Здорово, мужик. Есть деньги взаймы? Опять до зарплаты не дотянул.'},
 {id:'personal:vitya:day3',dueAt:3480,text:'Ты тут? Мужик, есть деньги взаймы? Хоть немного. Напиши, как увидишь.'},
]);
export const seedPersonalDialogs=state=>({...state,social:normalizeSocial(state.social)});
export function advancePersonalDialogs(input,nowMinute){
 if(!validGameMinute(nowMinute)||Number.isFinite(input.socialRuntime?.lastMinute)&&nowMinute<input.socialRuntime.lastMinute)return {state:input,events:[]};
 const state=seedPersonalDialogs(input),social=state.social,oldEvents=state.socialRuntime?.events??[],seen=new Set(oldEvents.map(e=>e.id));
 if(social.blockedProfileIds.includes('vitya'))return {state,events:[]};
 const events=SCHEDULE.filter(e=>e.dueAt<=nowMinute&&!seen.has(e.id)).map(e=>({...e,type:'personal-message',source:SOCIAL_IDENTITY.name,sender:profileById('vitya').name,profileId:'vitya',dialogId:'vitya'}));
 if(!events.length)return {state,events};
 const dialog=social.dialogs.vitya,ids=new Set((dialog.messages??[]).map(m=>m.id));
 for(const e of events)if(!ids.has(e.id))dialog.messages.push({id:e.id,kind:'personal',sender:'vitya',at:e.dueAt,body:e.text});dialog.unread=true;
 return {state:{...state,social,phone:receivePhoneEvents(state.phone,events),socialRuntime:{...state.socialRuntime,version:1,events:[...oldEvents,...events]}},events};
}
export function blockAndRemoveFriend(state,id){
 if(!profileById(id))return {ok:false,state,reason:'Человек не найден.'};
 const social=normalizeSocial(state.social);social.blockedProfileIds=[...new Set([...social.blockedProfileIds,id])];social.friends=social.friends.filter(friend=>friend!==id);
 return {ok:true,state:{...state,social},reason:''};
}
export const unreadDialogCount=state=>Object.values(normalizeSocial(state.social).dialogs).filter(d=>d.unread).length;
const textKey=value=>String(value??'').toLocaleLowerCase('ru').replaceAll('ё','е').trim();
export function searchDialogs(state,query=''){
 const q=textKey(query);return Object.entries(normalizeSocial(state.social).dialogs).map(([id,dialog])=>{const person=dialog.peer.kind==='person'?profileById(id):communityById(id);return {id,peer:dialog.peer,name:person.name,avatar:person.avatar,lastMessage:dialog.messages?.at(-1)??null,unread:Boolean(dialog.unread),search:textKey(person.name+' '+(dialog.messages??[]).map(m=>m.body).join(' '))};}).filter(row=>row.search.includes(q)).sort((a,b)=>(b.lastMessage?.at??-1)-(a.lastMessage?.at??-1)||a.name.localeCompare(b.name,'ru')).map(({search,...row})=>row);
}
