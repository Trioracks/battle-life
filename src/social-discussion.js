import {profileById} from './social-catalog.js?rev=57';
import {playerLifePosts,PLAYER_LIFE_SCENES} from './player-life-photos.js?rev=57';
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);};
const validThread=id=>typeof id==='string'&&!['__proto__','constructor','prototype'].includes(id)&&/^[a-zA-Z0-9:._-]{1,200}$/.test(id);
export function normalizeDiscussions(raw){
 const threads={};for(const [id,comments]of Object.entries(raw?.threads??{}).slice(0,1000)){
  if(!validThread(id)||!Array.isArray(comments))continue;const seen=new Set();threads[id]=comments.filter(c=>typeof c?.id==='string'&&!seen.has(c.id)&&seen.add(c.id)&&typeof c.body==='string'&&c.body.trim()&&c.body.length<=1000&&Number.isFinite(c.at)&&c.at>=0).slice(0,100).map(c=>({id:c.id,body:c.body,at:c.at,authorId:'me'}));
 }return {version:1,threads};
}
const posts=(state,profileId)=>profileId==='me'?[...playerLifePosts(PLAYER_LIFE_SCENES),...(state.social?.posts??[])]:profileById(profileId)?.wall??[];
export function discussionForPost(state,{profileId,post,nowMinute=state.socialRuntime?.lastMinute??state.lastGameMinute??0}={}){
 const threadId=post?.discussionId??'post:'+profileId+':'+post?.id,photoKey=post?.photoId?profileId+':'+post.photoId:null;
 const planned=state.socialReactions?.plans?.[post?.id],comments=planned?(planned.startAt<=nowMinute?planned.comments??[]:[]).filter(c=>c.dueAt<=nowMinute).map(c=>({...c,at:c.dueAt})):(post?.comments??[]).map((c,i)=>({...c,id:c.id??threadId+':authored:'+i,date:c.date??post.date}));
 for(const [i,c]of (state.social?.photoFeedback?.[photoKey]?.comments??[]).entries())comments.push({...c,authorId:'me',id:threadId+':legacy:'+i+':'+hash(c.body+':'+c.at)});
 comments.push(...(normalizeDiscussions(state.social?.discussions).threads[threadId]??[]));const seen=new Set();return {threadId,comments:comments.filter(c=>!seen.has(c.id)&&seen.add(c.id))};
}
export function discussionForPhoto(state,{profileId,photoId,postId,post,nowMinute}={}){
 const linked=post??posts(state,profileId).find(p=>postId?p.id===postId:p.photoId===photoId);
 return discussionForPost(state,{profileId,post:linked??{id:'photo:'+photoId,photoId,discussionId:'photo:'+profileId+':'+photoId},nowMinute});
}
export function addDiscussionComment(state,{threadId,body,at}={}){
 const fail=reason=>({ok:false,state,reason});if(!validThread(threadId))return fail('Обсуждение не найдено.');if(typeof body!=='string'||!body.trim())return fail('Напиши комментарий.');if(body.trim().length>1000||!Number.isFinite(at)||at<0)return fail('Комментарий не сохранён: максимум 1000 знаков.');
 const discussions=normalizeDiscussions(state.social?.discussions),comments=discussions.threads[threadId]??[];if(comments.length>=100)return fail('В этом обсуждении уже 100 комментариев.');
 const comment={id:'comment:'+hash(threadId)+':'+at+':'+comments.length,authorId:'me',body:body.trim(),at};return {ok:true,state:{...state,social:{...state.social,discussions:{...discussions,threads:{...discussions.threads,[threadId]:[...comments,comment]}}}},reason:''};
}
