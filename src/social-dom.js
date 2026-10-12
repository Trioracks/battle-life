import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=21';
export const socialButton=(d,text,fn,extra={})=>pcButton(d,text,{className:'sn-button',...extra},fn);
export function socialAvatar(d,avatar={},name='',large=false){
 const node=el(d,'div',{className:'sn-avatar'+(large?' sn-avatar-large':''),text:avatar.mark??'Р',attributes:{role:'img','aria-label':'Аватар: '+name}});
 node.style.setProperty('--avatar-color',avatar.color??'#617d94');return node;
}
export function socialHeading(d,title,count){
 const h=el(d,'h2',{className:'sn-heading',text:title});if(count!==undefined)h.append(el(d,'span',{text:String(count)}));return h;
}
export function socialPhoto(d,photo){
 const fig=el(d,'figure',{className:'sn-photo'}),file=['courtyard','factory','room'][Math.abs(photo.scene??0)%3];
 const img=el(d,'img',{attributes:{src:'./assets/ui/virtual-pc/wallpaper-'+file+'.png',alt:photo.title,loading:'lazy'}});
 fig.append(img,el(d,'figcaption',{text:photo.title}),el(d,'small',{text:photo.date}));return fig;
}
export function socialPost(d,post,{author='',navigate,profileById}={}){
 const article=el(d,'article',{className:'sn-post'});
 article.append(el(d,'strong',{text:author}),el(d,'small',{text:post.date??''}),el(d,'p',{text:post.body}));
 const likes=el(d,'div',{className:'sn-post-reactions',text:'Нравится: '+(post.likes??0)+' · Комментарии: '+(post.comments?.length??0)});article.append(likes);
 for(const c of post.comments??[]){const row=el(d,'div',{className:'sn-comment'}),person=profileById?.(c.authorId);
  if(person&&navigate)row.append(socialButton(d,person.name,()=>navigate('underweb://social/profile/'+person.id),{className:'sn-link'}));
  row.append(el(d,'span',{text:c.body}));article.append(row);
 }return article;
}
