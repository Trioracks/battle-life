import {battleCharacter} from './battle-demo-config.js?rev=57';
import {judgeProfile} from './judge-profiles.js?rev=43';
import {validGameMinute} from './game-minute.js?rev=43';
import {profileAccess} from './social-profile-policy.js?rev=57';
import {BATTLE_PUBLIC_SCORING} from './virtual-pc-catalog.js?rev=57';
export const ROUND_LABELS=Object.freeze({selection:'Отбор','round-2':'1/16 финала','round-3':'1/8 финала','round-4':'Четвертьфинал','round-5':'Полуфинал',final:'Финал'});
export function publicTournamentTrackIds(state,{battleId='makarevich-1',nowMinute}={}){return new Set(Object.keys(state.tournaments?.byId?.[battleId]?.rounds??{}).flatMap(roundId=>publicRoundTable(state,{battleId,roundId,nowMinute}).rows.map(r=>r.trackVersionId).filter(Boolean)));}
export function publicRoundTable(state,{battleId='makarevich-1',roundId='selection',nowMinute,viewerId='player'}={}){
 const t=state.tournaments?.byId?.[battleId],round=t?.rounds?.[roundId],empty={battleId,roundId,title:ROUND_LABELS[roundId]??'Раунд',complete:false,scoring:null,rows:[],judges:[],awards:[],availableRounds:[],message:'Таблица этого раунда ещё не опубликована.'};
 if(!validGameMinute(nowMinute)||!round||round.opensAt>nowMinute)return empty;
 const complete=round.status==='complete'&&round.completedAt<=nowMinute,selection=roundId==='selection',closed=nowMinute>=round.closesAt,processing=closed&&round.status==='accepting';
 const name=id=>id==='player'?(state.battleApplications?.find(a=>a.battleId===battleId)?.nickname??'Герой'):battleCharacter(id)?.nickname??'Участник';
 const judges=round.judgeIds.map(id=>({id,profileUrl:profileAccess(state,{viewerId,characterId:id,nowMinute}).canView?'underweb://social/profile/'+id:null,name:judgeProfile(id)?.name??'Судья',published:Boolean(round.judgeBatches?.[id]&&round.judgeBatches[id].publishedAt<=nowMinute)}));
 const published=Object.values(round.judgeBatches??{}).filter(b=>b.publishedAt<=nowMinute),reviews=published.flatMap(b=>b.resultIds.map(id=>({result:state.judging?.results?.[id],at:b.publishedAt}))).filter(x=>x.result);
 let slots=selection?[...new Set([...t.participantIds,...(state.battleApplications?.some(a=>a.battleId===battleId)?['player']:[])])].map(id=>({id,pair:null})):round.pairs.flatMap((pair,i)=>pair.participantIds.map(id=>({id,pair,pairNumber:i+1})));
 const place=id=>t.selection?.ranked?.find(r=>r.participantId===id)?.place??999;
 if(selection&&complete)slots.sort((a,b)=>place(a.id)-place(b.id));
 const rows=slots.map(({id,pair,pairNumber},index)=>{
  const visible=id&&(id===viewerId||!selection||complete&&t.qualifiedIds.includes(id)),key='row-'+index;
  if(!visible)return {key,masked:true,name:id?'░░░░░░░░':'Пустое место',status:id?'hidden':'empty',tone:'muted',reviews:[],scores:judges.map(j=>({judgeId:j.id,value:null})),total:null,pairNumber:pairNumber??null};
  const trackVersionId=closed?round.submissions[id]??null:null,technical=!selection&&pair?.technical?.kind!=='judged',missing=closed&&!processing&&!trackVersionId,own=reviews.filter(x=>x.result.trackVersionId===trackVersionId);
  const publicReviews=own.map(({result:r,at})=>({id:r.id,judgeId:r.judgeId,judgeName:judgeProfile(r.judgeId)?.name??'Судья',comment:r.comment,publishedAt:at,score:selection?r.grade:technical?null:Number(r.decision.kind==='pair_vote'&&r.decision.winnerId===trackVersionId)}));
  let status=processing?'processing':closed?'judging':'accepting',outcome=null;if(missing)status=!selection&&pair?.technical?.kind==='bye'?'bye':'no_show';
  if(complete){outcome=selection?(t.qualifiedIds.includes(id)?'qualified':'eliminated'):(pair.winnerId===id?(pair.technical?.kind==='judged'?'won':pair.technical?.kind??'won'):'eliminated');if(!missing)status=outcome;}
  const scores=judges.map(j=>({judgeId:j.id,value:publicReviews.find(r=>r.judgeId===j.id)?.score??null})),total=complete&&!missing&&!technical&&scores.every(s=>s.value!==null)?scores.reduce((n,s)=>n+s.value,0):null;
  return {key,masked:false,participantId:id,name:name(id),trackVersionId,profileUrl:id===viewerId?'underweb://social/me':profileAccess(state,{viewerId,characterId:id,nowMinute}).canView?'underweb://social/profile/'+id:null,status,outcome,tone:status==='no_show'||outcome==='eliminated'?'danger':complete?'success':'normal',pairNumber:pairNumber??null,place:selection&&complete?place(id):null,scores,total,reviews:publicReviews};
 });
 const awards=published.filter(b=>b.ltr).map(b=>{const a=b.ltr,visible=rows.find(r=>r.participantId===a.participantId);return {judgeId:b.judgeId,judgeName:judgeProfile(b.judgeId)?.name??'Судья',name:name(a.participantId),profileUrl:visible?.profileUrl??null,trackVersionId:visible?.trackVersionId??null};});
 const scoring=BATTLE_PUBLIC_SCORING[battleId]?.[roundId];
 return {...empty,complete,scoring:scoring?{...scoring}:null,opensAt:round.opensAt,closesAt:round.closesAt,completedAt:complete?round.completedAt:null,selection,rows,judges,awards,availableRounds:Object.values(t.rounds).filter(r=>r.opensAt<=nowMinute).sort((a,b)=>a.opensAt-b.opensAt).map(r=>({id:r.roundId,title:ROUND_LABELS[r.roundId]})),message:processing?'Приём завершён. Обрабатываем отправленные работы.':complete?'Полная панель опубликована. Итог закреплён.':closed?'Судейство продолжается. Проход ещё не определён.':'Приём работ открыт. Оценок пока нет.'};
}
