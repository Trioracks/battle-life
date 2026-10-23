const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function normalizePhotoFeedback(raw){
 return Object.fromEntries(Object.entries(record(raw)?raw:{}).filter(([key,v])=>/^[a-z0-9:-]{1,150}$/.test(key)&&record(v)).slice(0,1000).map(([key,v])=>[key,{liked:v.liked===true,comments:(Array.isArray(v.comments)?v.comments:[]).filter(c=>typeof c?.body==='string'&&c.body.trim()&&Number.isFinite(c.at)).slice(0,100).map(c=>({body:c.body.trim().slice(0,1000),at:c.at}))}]));
}
export const photoFeedbackKey=(profileId,photo)=>profileId+':'+photo.id;
export function changePhotoFeedback(state,key,{like,body,at}={}){
 if(!/^[a-z0-9:-]{1,150}$/.test(key))return {ok:false,state,reason:'Фотография не найдена.'};
 const feedback=normalizePhotoFeedback(state.social?.photoFeedback),entry=feedback[key]??{liked:false,comments:[]};
 if(like!==undefined)entry.liked=!!like;
 else{
  if(typeof body!=='string'||!body.trim())return {ok:false,state,reason:'Напиши комментарий.'};
  if(body.trim().length>1000||entry.comments.length>=100||!Number.isFinite(at))return {ok:false,state,reason:'Комментарий не сохранён: максимум 1000 знаков и 100 комментариев к фото.'};
  entry.comments.push({body:body.trim(),at});
 }
 feedback[key]=entry;return {ok:true,state:{...state,social:{...state.social,photoFeedback:feedback}}};
}
