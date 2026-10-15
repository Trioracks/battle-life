import {createResultPost,resultReactionContent} from './social-wall.js?rev=42';
import {resolveResultOutcome} from './result-outcome.js?rev=42';
const clone=v=>JSON.parse(JSON.stringify(v));
export function normalizeResultReactions(raw){
 const seen=new Set();return {schemaVersion:1,items:(Array.isArray(raw?.items)?raw.items:[]).filter(r=>r&&typeof r.id==='string'&&typeof r.panelEventId==='string'&&typeof r.speech==='string'&&['pending','complete'].includes(r.status)&&!seen.has(r.id)&&seen.add(r.id)).map(clone)};
}
export function requestResultReaction(state,panelEventId){
 const event=resolveResultOutcome(state,panelEventId),reactions=normalizeResultReactions(state.resultReactions),id='reaction:'+(event?.id??panelEventId);
 if(reactions.items.some(r=>r.id===id||event&&resolveResultOutcome(state,r.panelEventId)?.id===event.id))return {ok:true,state,reason:''};
 const content=event&&resultReactionContent(state,event);
 if(!content)return {ok:false,state,reason:'Полный результат ещё недоступен.'};
 reactions.items.push({id,panelEventId:event.id,status:'pending',speech:content.speech});return {ok:true,state:{...state,resultReactions:reactions},reason:''};
}
export function nextSafeResultReaction(state,{atDesktop,creativeJob,transitionPhase,modalOpen=false}={}){
 if(!atDesktop||creativeJob||transitionPhase!=='desktop'||modalOpen)return null;
 return normalizeResultReactions(state.resultReactions).items.find(r=>r.status==='pending')??null;
}
export function completeResultReaction(state,id,options){
 const reactions=normalizeResultReactions(state.resultReactions),reaction=reactions.items.find(r=>r.id===id);
 if(!reaction)return {ok:false,state,reason:'Реакция не найдена.'};if(reaction.status==='complete')return {ok:true,state,reason:''};
 const posted=createResultPost(state,reaction.panelEventId,options);if(!posted.ok)return posted;
 reaction.status='complete';return {...posted,state:{...posted.state,resultReactions:reactions}};
}
