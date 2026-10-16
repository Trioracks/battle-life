import {SOCIAL_COMMUNITIES,communityById} from './social-catalog.js?rev=44';
import {publicRoundAnnouncements} from './round-topics.js?rev=44';
import {judgeProfile} from './judge-profiles.js?rev=44';
import {validGameMinute} from './game-minute.js?rev=44';
import {receivePhoneEvents,retirePhoneNotices} from './phone-notifications.js?rev=44';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=44';

const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const ordered=(a,b)=>a.at-b.at||a.id.localeCompare(b.id);
const validCadence=p=>p?.version===1&&validGameMinute(p.legacyCutoff);
const quarantined=state=>state.social?.communityPublicationRecovery?.some(r=>r.id==='cadence')||state.social?.communityPublications!=null&&!validCadence(state.social.communityPublications);
const cutoff=state=>quarantined(state)?null:validCadence(state.social?.communityPublications)?state.social.communityPublications.legacyCutoff:validGameMinute(state.socialRuntime?.lastMinute)?state.socialRuntime.lastMinute:0;
const savedJudgePost=(state,id)=>{const p=state.socialReactions?.plans?.[id];return p?.version===1&&p.postId===id&&p.context==='judge-announcement'&&validGameMinute(p.startAt)?p:null;};
function judgePublicationMinute(opensAt,closesAt,index,count){
 const duration=closesAt-opensAt;if(!validGameMinute(closesAt)||duration<=0)return null;
 // Preserve the seven-day offsets proportionally in shorter windows. Longer
 // windows retain +6h for the first post and deadline minus one day for the last.
 const scale=Math.min(1,duration/(7*1440)),first=opensAt+360*scale,last=closesAt-1440*scale;
 return Math.max(opensAt,Math.min(closesAt-Math.min(1,duration/7),Math.round(first+(count>1?index*(last-first)/(count-1):0))));
}
// Additive save fields: invalid records are retained for recovery, never guessed.
export function normalizeCommunityPublicationState(raw={}){
 const recovery=Array.isArray(raw.communityPublicationRecovery)?structuredClone(raw.communityPublicationRecovery):[],communityReads={};
 const quarantine=(id,data)=>{if(!recovery.some(r=>r.id===id))recovery.push({id,recoveryData:structuredClone(data)});};
 const p=raw.communityPublications;
 const communityPublications=p?.version===1&&validGameMinute(p.legacyCutoff)?{version:1,legacyCutoff:p.legacyCutoff}:null;
 if(p!=null&&!communityPublications)quarantine('cadence',p);
 for(const [id,cursor]of Object.entries(record(raw.communityReads)?raw.communityReads:{})){
  if(communityById(id)&&validGameMinute(cursor?.at)&&Array.isArray(cursor.ids)&&cursor.ids.every(v=>typeof v==='string'))communityReads[id]={at:cursor.at,ids:[...new Set(cursor.ids)].sort()};
  else quarantine('read:'+id,cursor);
 }
 if(raw.communityReads!=null&&!record(raw.communityReads))quarantine('reads',raw.communityReads);
 return {communityPublications,communityReads,communityPublicationRecovery:recovery};
}

// Deliberately independent of profileAccess: this projection is its public evidence.
export function publicCommunityPosts(state,{communityId,nowMinute}={}){
 const c=communityById(communityId);if(!c||!validGameMinute(nowMinute))return [];
 const authorName=c.name+' · организаторы',base={communityId:c.id,authorId:c.id,authorName},posts=c.history.map(p=>({...base,authorName:c.name,id:p.id,at:0,kind:'static',body:p.body}));
 if(!c.battleId)return posts.sort(ordered);
 const seen=new Set(),legacyCutoff=cutoff(state),recovering=quarantined(state),announcements=publicRoundAnnouncements(state,{battleId:c.battleId,nowMinute});
 // Pre-theme saves already exposed these panels. Keep that public evidence only
 // through the saved cutoff; never use a future or damaged theme as a disclosure.
 for(const e of state.tournaments?.byId?.[c.battleId]?.events??[])if(e.type==='round-announced'&&validGameMinute(e.dueAt)&&e.dueAt<=nowMinute&&!announcements.some(p=>p.id===e.id)){
  const hasEvidence=recovering&&(state.tournaments.byId[c.battleId].rounds?.[e.roundId]?.judgeIds??[]).some(id=>savedJudgePost(state,e.id+':judge:'+id));
  if(legacyCutoff!==null&&e.dueAt<=legacyCutoff||hasEvidence)announcements.push({id:e.id,at:e.dueAt,roundId:e.roundId});
 }
 for(const p of announcements.sort(ordered)){
  const round=state.tournaments?.byId?.[c.battleId]?.rounds?.[p.roundId];if(!round)continue;
  const shared={...base,battleId:c.battleId,roundId:p.roundId};
  if(p.body)posts.push({...shared,id:p.id,at:p.at,kind:'round-theme',body:p.body,judgeId:p.authorJudgeId});
  const mode=state.tournaments.byId[c.battleId].bracket?.mode;
  if(p.roundId==='round-2'&&mode)posts.push({...shared,id:p.id+':seeding',at:p.at,kind:'seeding',body:'Пары опубликованы. '+(mode==='random'?'Случайный посев':mode==='opposite'?'Посев по отбору: встречный':'Посев по отбору: соседние места')+'. Дальше играем по фиксированной сетке, без перестановок.'});
  const old=legacyCutoff!==null&&p.at<=legacyCutoff,judges=[...new Set(round.judgeIds??[])].filter(id=>!old||!seen.has(id)||savedJudgePost(state,p.id+':judge:'+id));
  for(const [index,judgeId]of judges.entries()){
   seen.add(judgeId);const id=p.id+':judge:'+judgeId,saved=savedJudgePost(state,id);
   if(recovering&&!saved)continue;
   const at=saved?saved.startAt:old?p.at:judgePublicationMinute(p.at,round.closesAt,index,judges.length);
   if(at===null||at>nowMinute)continue;
   const name=judgeProfile(judgeId)?.name??'Судья';
   // Legacy introductions were published at the round announcement itself.
   // A saved reaction plan retains that evidence even if cadence is quarantined.
   const body=old||saved?.startAt===p.at?'В составе панели этого раунда — '+name+'. Страница открыта, отзывы появятся после окончания приёма.':[
    'Знакомим с судьёй раунда: '+name+'. Публичная страница доступна; отзывы будут опубликованы после приёма работ.',
    'Ещё один судья этого раунда — '+name+'. Ему предстоит оценить работы участников. Результаты ещё не опубликованы.',
    'К судьям этого раунда присоединяется '+name+'. Профиль открыт для знакомства; оценки появятся по расписанию после приёма.'
   ][index%3];
   posts.push({...shared,id,at,kind:'judge-announcement',judgeId,body});
  }
 }
 return posts.sort(ordered);
}
export function publicAnnouncedJudges(state,{battleId='makarevich-1',roundId,nowMinute}={}){
 const c=SOCIAL_COMMUNITIES.find(c=>c.battleId===battleId);if(!c)return [];
 const posts=publicCommunityPosts(state,{communityId:c.id,nowMinute});
 const known=new Map();for(const p of posts)if((!roundId||p.roundId===roundId)&&['round-theme','judge-announcement'].includes(p.kind)&&p.judgeId&&!known.has(p.judgeId))known.set(p.judgeId,{id:p.judgeId,name:judgeProfile(p.judgeId)?.name??'Судья',announcedAt:p.at,profileUrl:'underweb://social/profile/'+p.judgeId});
 return [...known.values()];
}
const cursorFor=(posts,at)=>({at,ids:posts.filter(p=>p.at===at).map(p=>p.id).sort()});
const unread=(post,cursor)=>post.at>cursor.at||post.at===cursor.at&&!cursor.ids.includes(post.id);
const readCursor=(state,id)=>{const baseline=cutoff(state)??0;return state.social?.communityReads?.[id]??cursorFor(publicCommunityPosts(state,{communityId:id,nowMinute:baseline}),baseline);};
export function ensureCommunityPublications(state,nowMinute){
 if(!validGameMinute(nowMinute)||state.social?.communityPublications)return {state,changed:false};
 const social={...state.social,...normalizeCommunityPublicationState(state.social)},legacyCutoff=cutoff(state);
 if(social.communityPublicationRecovery.some(r=>r.id==='cadence'))return {state,changed:false};
 social.communityPublications={version:1,legacyCutoff};
 for(const id of social.subscriptions??[])if(!social.communityReads[id])social.communityReads[id]=cursorFor(publicCommunityPosts(state,{communityId:id,nowMinute:legacyCutoff}),legacyCutoff);
 return {state:{...state,social},changed:true};
}
export function baselineCommunityRead(state,{communityId,nowMinute}){
 const posts=publicCommunityPosts(state,{communityId,nowMinute});
 return {...state,social:{...state.social,communityReads:{...state.social?.communityReads,[communityId]:cursorFor(posts,nowMinute)}}};
}
export function communityUnreadCounts(state,{nowMinute}={}){
 const byCommunity={};let total=0;
 for(const id of state.social?.subscriptions??[]){const cursor=readCursor(state,id),count=publicCommunityPosts(state,{communityId:id,nowMinute}).filter(p=>unread(p,cursor)).length;byCommunity[id]=count;total+=count;}
 return {total,byCommunity};
}
export function markCommunitySeen(state,{communityId,nowMinute}={}){
 if(!communityById(communityId)||!validGameMinute(nowMinute))return {ok:false,state};
 const posts=publicCommunityPosts(state,{communityId,nowMinute}),old=readCursor(state,communityId),at=Math.max(old.at,...posts.map(p=>p.at)),cursor=cursorFor(posts,at);
 cursor.ids=[...new Set([...cursor.ids,...(old.at===at?old.ids:[])])].sort();
 const phone=retirePhoneNotices(state.phone,posts.map(p=>'community-post:'+p.id));
 if(old.at===cursor.at&&old.ids.length===cursor.ids.length&&old.ids.every((id,i)=>id===cursor.ids[i])&&phone===state.phone)return {ok:true,state};
 return {ok:true,state:{...state,phone,social:{...state.social,communityReads:{...state.social?.communityReads,[communityId]:cursor}}}};
}
export function publishCommunityNotices(input,nowMinute){
 const initialized=ensureCommunityPublications(input,nowMinute),state=initialized.state,events=[];
 for(const communityId of state.social?.subscriptions??[]){const cursor=readCursor(state,communityId),c=communityById(communityId);if(!c)continue;
  for(const p of publicCommunityPosts(state,{communityId,nowMinute}).filter(p=>unread(p,cursor)))events.push({id:'community-post:'+p.id,type:'community-post',postId:p.id,communityId,dueAt:p.at,source:SOCIAL_IDENTITY.name,sender:c.name,text:p.body});
 }
 const known=new Set([...(state.phone?.queue??[]).map(p=>p.id),...(state.phone?.dismissedIds??[])]),fresh=events.filter(e=>!known.has(e.id));
 return {state:fresh.length?{...state,phone:receivePhoneEvents(state.phone,fresh)}:state,events:fresh,changed:initialized.changed||fresh.length>0};
}
