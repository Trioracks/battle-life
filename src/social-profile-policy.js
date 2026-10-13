import {npcSocialProfile} from './npc-social-profiles.js?rev=41';
import {profileAccess as legacyAccess} from './social-state.js?rev=41';
import {validGameMinute} from './game-minute.js?rev=41';
export function profileAccess(state,{viewerId='player',characterId,nowMinute}={}){
 if(characterId===viewerId||characterId==='me')return {canView:true,canAddFriend:false,reason:''};
 const profile=npcSocialProfile(state,characterId);
 if(!profile){const old=legacyAccess(state,characterId);return {canView:old.allowed,canAddFriend:old.allowed,reason:old.reason};}
 if(!validGameMinute(nowMinute))return {canView:false,canAddFriend:false,reason:'Не удалось определить игровую дату.'};
 let knownOpponent=false,announcedJudge=false;
 for(const t of Object.values(state.tournaments?.byId??{}))for(const r of Object.values(t.rounds??{})){
  if(r.opensAt>nowMinute)continue;
  knownOpponent||=r.pairs.some(p=>p.participantIds.includes(viewerId)&&p.participantIds.includes(characterId));
  announcedJudge||=r.judgeIds.includes(characterId)&&[...(t.events??[]),...(state.socialRuntime?.events??[])].some(e=>e.type==='round-announced'&&e.roundId===r.roundId&&(e.battleId===undefined||e.battleId===t.battleId)&&e.dueAt<=nowMinute);
 }
 const canView=knownOpponent||announcedJudge;
 return {canView,canAddFriend:false,reason:canView?'Публичная страница участника баттла. Дружба с новыми участниками пока недоступна.':'Закрытый профиль. Ник в таблице не открывает страницу и добавление в друзья.'};
}
