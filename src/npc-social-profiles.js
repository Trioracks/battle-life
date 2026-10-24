import {DEMO_PARTICIPANTS,battleCharacter} from './battle-demo-config.js?rev=60';
import {JUDGE_PROFILES} from './judge-profiles.js?rev=60';
import {APPEARANCE_OPTIONS,normalizeAppearance} from './avatar-v3-profile.js?rev=60';
import {seededLottery,battleRandom} from './battle-seeding.js?rev=60';
import {beatResultSeed} from './beat-result.js?rev=60';
import {publicBattleHistory} from './battle-history.js?rev=60';
import {profileAccess} from './social-profile-policy.js?rev=60';
import {publicRoundAnnouncements} from './round-topics.js?rev=60';
import {npcPhoto,npcLifePhoto} from './battle-content-assets.js?rev=60';
import {npcLifeStory} from './social-life-stories.js?rev=60';
const clone=v=>structuredClone(v),record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const personalIds=new Set(seededLottery(DEMO_PARTICIPANTS.map(p=>p.characterId),'social-personal-v2').slice(0,6)),judgeIds=new Set(JUDGE_PROFILES.map(j=>j.id)),participantIds=new Set(DEMO_PARTICIPANTS.map(p=>p.characterId));
function createTemplate(characterId){
 const character=battleCharacter(characterId),seed=beatResultSeed('social:'+characterId),random=battleRandom(seed),personal=personalIds.has(characterId),appearance=personal?normalizeAppearance(Object.fromEntries(Object.entries(APPEARANCE_OPTIONS).map(([key,c])=>[key,c.options[Math.floor(random()*c.options.length)].id]))):null;
 const count=3+seed%2,poses=['desk','courtyard','street','room'];
 return {characterId,seed,profileType:personal?'personal':'alias',roles:[...(participantIds.has(characterId)?['participant']:[]),...(judgeIds.has(characterId)?['judge']:[])],name:character.nickname,appearance,photoIds:personal?poses.slice(0,count).map(p=>characterId+':'+p):[],datedPosts:personal?[{id:characterId+':august',at:-20160,date:'18.08.2012',body:['Последние тёплые вечера. Опять весь двор на скамейке.','Наконец разобрал фотографии с прогулки. Половина смазана, зато свои.','Сегодня оставил телефон дома. Оказывается, так тоже можно.'][seed%3]},{id:characterId+':later',at:43200,date:'01.10.2012',body:'Дождь третий день. Поставил чайник и остался дома.'}]:[]};
}
const templates=Object.fromEntries([...new Set([...participantIds,...judgeIds])].map(id=>[id,createTemplate(id)]));
export function normalizeNpcSocialProfiles(raw){
 if(raw===undefined||raw===null)return {version:1,byId:clone(templates),recovery:[]};
 const byId={},recovery=Array.isArray(raw.recovery)?clone(raw.recovery):[];
 for(const [id,p]of Object.entries(record(raw.byId)?raw.byId:{})){
  if(templates[id]&&p?.characterId===id&&Number.isSafeInteger(p.seed)&&['personal','alias'].includes(p.profileType)&&typeof p.name==='string'&&Array.isArray(p.roles)&&p.roles.every(r=>['participant','judge'].includes(r))&&Array.isArray(p.photoIds)&&p.photoIds.every(x=>typeof x==='string')&&Array.isArray(p.datedPosts)&&p.datedPosts.every(x=>typeof x?.id==='string'&&typeof x.body==='string'&&Number.isFinite(x.at))&&(p.profileType==='alias'||record(p.appearance)&&JSON.stringify(normalizeAppearance(p.appearance))===JSON.stringify(p.appearance)))byId[id]=clone(p);
  else recovery.push({characterId:id,recoveryData:clone(p),reason:'Профиль повреждён. Внешность не создана заново.'});
 }return {version:1,byId,recovery};
}
export function npcSocialProfile(state,id){const registry=state.npcSocialProfiles??{byId:templates};return registry.byId?.[id]?clone(registry.byId[id]):null;}
export function publicCharacterProfile(state,{characterId,nowMinute,viewerId='player'}={}){
 const access=profileAccess(state,{characterId,nowMinute,viewerId});if(!access.canView)return {characterId,...access};
 const p=npcSocialProfile(state,characterId);if(!p)return {characterId,canView:false,canAddFriend:false,reason:'Профиль не найден.'};
 const history=publicBattleHistory(state,{participantId:characterId,nowMinute}),photos=p.photoIds.map(id=>({id,title:{desk:'За своим столом',courtyard:'Во дворе',street:'На прогулке',room:'Дома'}[id.split(':').at(-1)]??'Фотография',date:'август 2012',src:npcPhoto(id,p).src}));
 const life=npcLifeStory(p),dated=[...(life?.posts??[]),...p.datedPosts].filter(p=>p.at<=nowMinute),announcements=publicRoundAnnouncements(state,{nowMinute}).filter(p=>p.authorJudgeId===characterId).map(p=>p.judgePost);
 const lifePhotos=life?.photos.map(photo=>({...photo,src:npcLifePhoto(photo.id,p).src})),gallery=lifePhotos?.every(photo=>photo.src)?lifePhotos:photos;
 return {characterId,...access,name:p.name,profileType:p.profileType,roles:[...p.roles],description:life?.status??'Сначала послушай, потом расскажешь.',fictionalNotice:'Вымышленная игровая страница, не биография реального участника.',avatar:{mark:p.name.slice(0,2).toUpperCase(),src:photos[0]?.src??null,color:p.profileType==='personal'?'#718879':['#656981','#6c8178','#876f65','#73658a','#526e86'][p.seed%5]},photos:gallery,posts:[...dated,...announcements].map(clone).sort((a,b)=>(a.at??a.createdAt??0)-(b.at??b.createdAt??0)),publicTrackVersionIds:[...new Set(history.filter(e=>e.status==='submitted'&&state.trackVersions?.byId?.[e.trackVersionId]).map(e=>e.trackVersionId))],history};
}
