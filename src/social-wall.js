import templates from '../data/social/post-templates.json' with {type:'json'};
import resultTemplates from '../data/social/result-post-templates.json' with {type:'json'};
import {resolveResultOutcome} from './result-outcome.js?rev=61';
import {ensureSocialReactionPlans} from './social-reactions.js?rev=61';
import {gameDateTimeLabel} from './home-calendar.js?rev=61';
import {normalizeSocial} from './social-state.js?rev=61';
import {judgeProfile} from './judge-profiles.js?rev=61';
import {JUDGE_COMMENTS} from './judge-comments.js?rev=61';
export const POST_TEMPLATES=Object.freeze(templates);
export const RESULT_POST_TEMPLATES=Object.freeze(resultTemplates);
export const AUDIENCE_RULES=Object.freeze({likeProbability:.08,commentProbability:.01,maxSimulatedAudience:5000,maxVisibleComments:40});
export function socialSeed(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function rng(seed){let s=socialSeed(seed);return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function audienceResponse(audienceCount,seed){
 const size=Math.max(0,Math.min(AUDIENCE_RULES.maxSimulatedAudience,Math.floor(Number(audienceCount)||0))),next=rng(seed);let likes=0,comments=0;
 for(let i=0;i<size;i++){if(next()<AUDIENCE_RULES.likeProbability)likes++;if(next()<AUDIENCE_RULES.commentProbability)comments++;}
 return {likes,comments};
}
function contextualReview(state,event){
 const results=(event.resultIds??[]).map(id=>state.judging?.results?.[id]).filter(Boolean);
 // The numeric taste score can be high while the actual chosen comment is a
 // format criticism. Only a known positive comment may motivate a praise post.
 const praise=results.find(r=>(r.templateIds??[]).some(id=>JUDGE_COMMENTS.find(t=>t.id===id)?.trigger.endsWith('.good')));
 return {review:praise??results[0],hasPraise:Boolean(praise)};
}
export function resultReactionContent(state,event){
 const {review,hasPraise}=contextualReview(state,event);
 if(event.outcome){const choices=RESULT_POST_TEMPLATES.filter(t=>t.outcomes.includes(event.outcome)&&(!t.requiresPraise||hasPraise)),grateful=choices.find(t=>t.requiresPraise),template=grateful??choices[socialSeed(event.id)%choices.length];if(!template)return null;const speech={no_show:'Не сдал. Напишу честно, без оправданий.',technical_win:'Технический проход. Так и напишу.',champion:'Вот это да… Сохраню этот момент.',qualified:'Прошёл! Надо поделиться.',selection_loss:'Не прошёл отбор. Напишу пару слов.',pair_loss:'В этой паре проиграл. Оставлю запись об этом.'}[event.outcome];return {review,hasPraise,template,mood:template.mood,speech};}
 if(!review)return null;
 const index=socialSeed(event.id),moods=hasPraise?['joy','relief','surprise','respect']:['hurt','anger','self_irony','relief','respect'],mood=moods[index%moods.length],choices=POST_TEMPLATES.filter(t=>t.mood===mood),template=choices[(index>>>5)%choices.length];
 const speech={joy:'Ого… Это приятно прочитать.',relief:'Ну вот, дождался отзывов.',surprise:'Хм. Со стороны услышали по-другому.',hurt:'Неприятно. Но работу уже не вернёшь.',anger:'Да уж… Надо немного остыть.',self_irony:'Ладно, шедевр пока откладывается.',respect:'Спасибо за отзыв. Есть о чём подумать.'}[mood];
 return {review,hasPraise,mood,template,speech};
}
export function createResultPost(state,panelEventId,{nowMinute=state.socialRuntime?.lastMinute}={}){
 const event=resolveResultOutcome(state,panelEventId),social=normalizeSocial(state.social),fail=reason=>({ok:false,state,reason});
 if(!event)return fail('Полный итог ещё не опубликован.');
 if(event.outcome){const existing=social.posts.find(p=>p.eventId===event.id||resolveResultOutcome(state,p.eventId)?.id===event.id);if(existing)return {ok:true,state,postId:existing.id,reason:''};const content=resultReactionContent(state,event);if(!content)return fail('Не найден подходящий текст реакции.');const {review,template,mood}=content,createdAt=Math.max(event.dueAt,Number.isFinite(nowMinute)?nowMinute:event.dueAt),post={id:'post:'+event.id,eventId:event.id,battleId:event.battleId,roundId:event.roundId,outcome:event.outcome,qualification:event.qualification,trackVersionId:event.trackVersionId,reviewId:review?.id??null,templateId:template.id,mood,createdAt,date:gameDateTimeLabel(createdAt),body:template.body+(review?'\n\n'+(judgeProfile(review.judgeId)?.name??review.judgeId)+': «'+review.comment+'»':''),likes:0,comments:[],audienceSnapshot:social.audienceCount};social.posts.push(post);const next=ensureSocialReactionPlans({...state,social},createdAt).state;return {ok:true,state:next,reason:'',postId:post.id};}
 const id='post:'+event.id+':'+event.trackVersionId;if(social.posts.some(p=>p.id===id))return {ok:true,state,reason:'',postId:id};
 const content=resultReactionContent(state,event);if(!content)return fail('Не найден сохранённый отзыв.');
 const {review,mood,template}=content,response=audienceResponse(social.audienceCount,id),authorIds=social.friends.length?social.friends:['anya'];
 const friendly=['Послушал. Спасибо, что выложил и саму работу.','Интересно почитать чужой взгляд на этот трек.','Оставь запись, потом будет с чем сравнить.','Всё равно хорошо, что довёл до отправки.'];
 const comments=Array.from({length:Math.min(AUDIENCE_RULES.maxVisibleComments,response.comments)},(_,i)=>({id:id+':comment:'+i,authorId:authorIds[i%authorIds.length],body:friendly[(socialSeed(id)+i)%friendly.length]}));
 const opponentId=state.currentOpponentProfileId;
 if(opponentId&&social.accessibleProfiles.includes(opponentId)&&socialSeed(id+':opponent')%4===0)comments.push({id:id+':opponent',authorId:opponentId,body:'Не разделяю восторгов по поводу этой работы.'});
 const post={id,eventId:event.id,trackVersionId:event.trackVersionId,reviewId:review.id,templateId:template.id,mood,date:'После итогов отбора',body:template.body+'\n\n'+(judgeProfile(review.judgeId)?.name??review.judgeId)+': «'+review.comment+'»',likes:response.likes,comments,audienceSnapshot:social.audienceCount,graffiti:socialSeed(id+':graffiti')%4===0?{kind:content.hasPraise?'spark':'keep-going',authorId:authorIds[0]}:null};
 social.posts.push(post);return {ok:true,state:{...state,social},reason:'',postId:id};
}
