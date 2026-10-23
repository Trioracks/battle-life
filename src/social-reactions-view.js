import {pcElement as el} from './virtual-pc-dom.js?rev=43';
import {socialButton,socialThumbCount,socialComment} from './social-dom.js?rev=57';
import {publicPostReactions,setPostVote} from './social-reactions.js?rev=57';
import {gameDateTimeLabel} from './home-calendar.js?rev=43';
export function createPostReactionsView(d,{postId,state,getState=()=>state,nowMinute,commit,collapseComments=false}={}){
 const plan=state.socialReactions?.plans?.[postId],root=el(d,'section',{className:'sn-live-reactions',dataset:{reactionPost:postId}});if(!plan)return root;
 const r=publicPostReactions(plan,nowMinute,state.socialReactions.votes[postId]),meta=el(d,'div',{className:'sn-post-reactions'});
 for(const [vote,label,count]of [['like','Нравится',r.likes],['dislike','Не нравится',r.dislikes]]){const thumb=socialThumbCount(d,vote,count);if(plan.channel!=='forum'&&commit){const control=socialButton(d,'',()=>commit(setPostVote(getState(),{postId,vote,nowMinute})),{className:'sn-reaction-button',attributes:{'aria-label':label+': '+count,'aria-pressed':String(r.playerVote===vote)}});control.dataset.focusId='reaction:'+postId+':'+vote;control.append(thumb);meta.append(control);}else meta.append(thumb);}
 meta.append(el(d,'span',{text:'Комментарии: '+r.comments.length}));root.append(meta);
 const thread=collapseComments&&r.comments.length?el(d,'details',{className:'sn-comment-thread'}):root;if(thread!==root){thread.append(el(d,'summary',{text:'Обсуждение · '+r.comments.length}));root.append(thread);}
 for(const c of r.comments)thread.append(socialComment(d,{body:c.body,author:{name:c.authorName??'Читатель'},date:plan.context==='static'?'':gameDateTimeLabel(c.at),administrator:c.administrator}));if(plan.limited)thread.append(el(d,'small',{text:'Показано небольшое обсуждение. Счётчики учитывают только опубликованные реакции.'}));return root;
}
export function reactionVisibilitySignature(state,nowMinute){return JSON.stringify(Object.values(state.socialReactions?.plans??{}).map(p=>{const r=publicPostReactions(p,nowMinute,state.socialReactions?.votes?.[p.postId]);return [p.postId,r.comments.length,r.likes,r.dislikes,r.playerVote];}));}
