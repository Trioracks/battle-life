import {SOCIAL_COMMUNITIES,SOCIAL_PROFILES,profileById} from './social-catalog.js?rev=39';
import {normalizePlayerPortrait} from './social-portraits.js?rev=39';
import conversations from '../data/social/conversations.json' with {type:'json'};
const copy=value=>JSON.parse(JSON.stringify(value));
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const ids=(v,allow=()=>true)=>[...new Set((Array.isArray(v)?v:[]).filter(id=>typeof id==='string'&&id.length>0&&id.length<180&&allow(id)))];
const communities=new Set(SOCIAL_COMMUNITIES.map(c=>c.id)),people=new Set(SOCIAL_PROFILES.map(p=>p.id));
const known=SOCIAL_PROFILES.filter(p=>p.known).map(p=>p.id);
const records=v=>{const seen=new Set();return (Array.isArray(v)?v:[]).filter(x=>record(x)&&typeof x.id==='string'&&!seen.has(x.id)&&seen.add(x.id)).map(copy);};
export function normalizeSocial(raw){
 const s=record(raw)?raw:{},accessibleProfiles=ids([...known,...ids(s.accessibleProfiles)],id=>people.has(id));
 const blockedProfileIds=ids(s.blockedProfileIds,id=>people.has(id));
 const dialogs=Object.fromEntries(Object.entries(record(s.dialogs)?s.dialogs:{}).filter(([id,v])=>(communities.has(id)||people.has(id))&&record(v)).map(([id,v])=>[id,{...copy(v),peer:{kind:people.has(id)?'person':'community',id}}]));
 for(const [id,messages]of Object.entries(conversations))if(!dialogs[id])dialogs[id]={peer:{kind:'person',id},messages:messages.map(m=>({...m,kind:'personal',at:null,archived:true})),unread:false};
 return {schemaVersion:2,subscriptions:ids(s.subscriptions,id=>communities.has(id)),friends:ids(s.friends??known,id=>accessibleProfiles.includes(id)&&!blockedProfileIds.includes(id)),blockedProfileIds,
  accessibleProfiles,personalAudioIds:ids(s.personalAudioIds),dialogs,
  playerPortrait:normalizePlayerPortrait(s.playerPortrait),posts:records(s.posts),reactions:records(s.reactions),audienceCount:Number.isFinite(s.audienceCount)?Math.max(0,Math.min(1e7,Math.floor(s.audienceCount))):12};
}
export function listCommunities(state,{query=''}={}){
 const social=normalizeSocial(state.social),q=String(query).toLocaleLowerCase('ru').replaceAll('ё','е').trim();
 return SOCIAL_COMMUNITIES.filter(c=>(c.name+' '+c.description).toLocaleLowerCase('ru').replaceAll('ё','е').includes(q)).map(c=>({...copy(c),subscribed:social.subscriptions.includes(c.id),displayMemberCount:c.memberCount+Number(social.subscriptions.includes(c.id))})).sort((a,b)=>Number(b.subscribed)-Number(a.subscribed)||a.name.localeCompare(b.name,'ru'));
}
export function subscribeCommunity(state,id,subscribed=true){
 if(!communities.has(id))return {ok:false,state,reason:'Сообщество не найдено.'};
 const social=normalizeSocial(state.social);social.subscriptions=social.subscriptions.filter(v=>v!==id);if(subscribed)social.subscriptions.push(id);
 return {ok:true,state:{...state,social},reason:''};
}
export function profileAccess(state,id){
 if(id==='me')return {allowed:true,reason:''};
 if(!people.has(id))return {allowed:false,reason:'Профиль не найден.'};
 const allowed=normalizeSocial(state.social).accessibleProfiles.includes(id);
 return {allowed,reason:allowed?'':'Закрытый профиль. Сначала познакомьтесь с человеком или встретьтесь в баттле.'};
}
export function addSocialFriend(state,id){
 if(id==='me'||!profileAccess(state,id).allowed)return {ok:false,state,reason:'Нельзя добавить незнакомого человека из закрытого профиля.'};
 const social=normalizeSocial(state.social);social.friends=ids([...social.friends,id]);
 if(social.blockedProfileIds.includes(id))return {ok:false,state,reason:'Этот человек заблокирован.'};
 return {ok:true,state:{...state,social},reason:''};
}
// Called by the matchup domain, never exposed as a UI privacy override.
export function grantOpponentAccess(state,id){
 if(!profileById(id))return {ok:false,state,reason:'Участник не найден.'};
 const social=normalizeSocial(state.social);social.accessibleProfiles=ids([...social.accessibleProfiles,id]);
 return {ok:true,state:{...state,social},reason:''};
}
