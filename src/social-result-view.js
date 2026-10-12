import {pcElement as el} from './virtual-pc-dom.js?rev=39';
import {socialButton,socialHeading} from './social-dom.js?rev=39';
import {publicBattleResults} from './social-judging-events.js?rev=39';
import {requestResultReaction} from './social-result-reaction.js?rev=39';
import {judgeProfile} from './judge-profiles.js?rev=39';
export function createSocialResultView(d,{submission,getState,commit,expandedResults,onResultViewed=()=>{}}){
 const state=getState(),result=publicBattleResults(state,submission.id),root=el(d,'section',{className:'sn-results',dataset:{submissionResults:submission.id}});
 root.append(socialHeading(d,'Судейство',result.results.length+' / '+result.expectedJudgeIds.length));
 if(!result.results.length)root.append(el(d,'p',{className:'sn-note',text:'Отзывы появятся в течение трёх игровых дней после окончания приёма.'}));
 for(const judgeId of result.expectedJudgeIds){
  const review=result.results.find(r=>r.judgeId===judgeId),row=el(d,'article',{className:'sn-review',dataset:review?{judgeReview:review.id}:{}});
  row.append(el(d,'strong',{text:judgeProfile(judgeId)?.name??judgeId}),el(d,'span',{className:'sn-grade',text:review?review.grade+' / 10':'Ожидается'}));
  if(review)row.append(el(d,'p',{text:review.comment}));root.append(row);
 }
 if(result.complete){
  const opened=expandedResults.has(result.panelEvent.id);
  if(opened){
   root.append(el(d,'h3',{text:'Общий итог: '+result.total+' / '+result.expectedJudgeIds.length*10,dataset:{resultSummary:result.panelEvent.id},attributes:{tabindex:'-1'}}),
    el(d,'p',{className:'sn-note',text:result.qualification==='qualified'?'Ты прошёл в следующий раунд.':result.qualification==='eliminated'?'По результатам отбора ты не прошёл дальше.':'Решение о проходе ещё не опубликовано. Это сумма судейских оценок, не место в отборе.'}));
  }else root.append(socialButton(d,'Открыть общий итог',()=>{
   expandedResults.add(result.panelEvent.id);
   if(!commit(requestResultReaction(getState(),result.panelEvent.id))){expandedResults.delete(result.panelEvent.id);return;}
   onResultViewed(result.panelEvent.id);
  },{dataset:{resultToggle:result.panelEvent.id}}));
 }
 return root;
}
