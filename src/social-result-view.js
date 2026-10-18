import {pcElement as el} from './virtual-pc-dom.js?rev=45';
import {socialButton,socialHeading} from './social-dom.js?rev=45';
import {publicBattleResults} from './social-judging-events.js?rev=45';
import {requestResultReaction} from './social-result-reaction.js?rev=45';
import {judgeProfile} from './judge-profiles.js?rev=45';
import {resolveResultOutcome} from './result-outcome.js?rev=45';
export function createSocialResultView(d,{submission,getState,commit,expandedResults,onResultViewed=()=>{}}){
 const state=getState(),result=publicBattleResults(state,submission.id),pair=submission.roundId!=='selection',root=el(d,'section',{className:'sn-results',dataset:{submissionResults:submission.id}});
 root.append(socialHeading(d,'Судейство',result.results.length+' / '+result.expectedJudgeIds.length));
 if(!result.results.length)root.append(el(d,'p',{className:'sn-note',text:'После дедлайна — шесть часов тишины. Затем судьи заканчивают по очереди; вся панель готова не позднее сорока игровых часов.'}));
 for(const judgeId of result.expectedJudgeIds){
  const review=result.results.find(r=>r.judgeId===judgeId),row=el(d,'article',{className:'sn-review',dataset:review?{judgeReview:review.id}:{}});
  row.append(el(d,'strong',{text:judgeProfile(judgeId)?.name??judgeId}),el(d,'span',{className:'sn-grade',text:review?(pair?(review.decision.kind==='pair_vote'?Number(review.decision.winnerId===submission.trackVersionId)+' голос':'Без парного голоса'):review.grade+' / 10'):'Ожидается'}));
  if(review)row.append(el(d,'p',{text:review.comment}));root.append(row);
 }
 if(result.complete){
  const actual=resolveResultOutcome(state,result.panelEvent.id),technical=actual?.outcome==='technical_win',message=({champion:'Ты выиграл финал. Турнир завершён.',qualified:'Ты прошёл в следующий раунд.',selection_loss:'По результатам отбора ты не прошёл дальше.',pair_loss:'Эта пара проиграна. Ты выбыл из турнира.',no_show:'Работа не сдана в срок.',technical_win:'Технический проход без полноценного сравнения работ.'})[actual?.outcome]??'Решение о проходе ещё не опубликовано. Это сумма судейских оценок, не место в отборе.';
  const opened=expandedResults.has(result.panelEvent.id);
  if(opened){
   root.append(el(d,'h3',{text:technical?'Технический результат':(pair?'Голоса: ':'Общий итог: ')+result.total+' / '+result.expectedJudgeIds.length*(pair?1:10),dataset:{resultSummary:result.panelEvent.id},attributes:{tabindex:'-1'}}),el(d,'p',{className:'sn-note',text:message}));
  }else root.append(socialButton(d,'Открыть общий итог',()=>{
   expandedResults.add(result.panelEvent.id);
   if(!commit(requestResultReaction(getState(),result.panelEvent.id))){expandedResults.delete(result.panelEvent.id);return;}
   onResultViewed(result.panelEvent.id);
  },{dataset:{resultToggle:result.panelEvent.id}}));
 }
 return root;
}
