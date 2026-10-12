import {SOCIAL_SECTIONS,communityById,profileById} from './social-catalog.js?rev=38';
export function resolveSocialRoute(address){
 if(typeof address!=='string')return null;
 let u;try{u=new URL(address);}catch{return null;}
 if(u.protocol!=='underweb:'||u.hostname!=='social'||u.hash)return null;
 const p=u.pathname.split('/').filter(Boolean),section=p[0]??'me';
 if(SOCIAL_SECTIONS.some(([id])=>id===section)&&p.length<=1)return {type:'social',section,url:'underweb://social/'+section};
 if(p.length!==2)return null;
 if(section==='profile'&&(p[1]==='me'||profileById(p[1]))){
  const view=u.searchParams.get('view')??'page';if(!['page','friends','photos','audio'].includes(view))return null;
  return {type:'social',section,profileId:p[1],view,url:'underweb://social/profile/'+p[1]+(view==='page'?'':'?view='+view)};
 }
 if(['community','dialog'].includes(section)&&communityById(p[1]))return {type:'social',section,communityId:p[1],...(section==='dialog'?{peer:{kind:'community',id:p[1]}}:{}),url:'underweb://social/'+section+'/'+p[1]};
 if(section==='dialog'&&profileById(p[1]))return {type:'social',section,profileId:p[1],peer:{kind:'person',id:p[1]},url:'underweb://social/dialog/'+p[1]};
 return null;
}
