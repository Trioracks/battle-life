import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=38';
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
 }
 if(post.graffiti)article.append(socialGraffiti(d,post.graffiti));return article;
}
export function socialGraffiti(d,graffiti){
 const make=(tag,attrs={})=>{const node=d.createElementNS?d.createElementNS('http://www.w3.org/2000/svg',tag):d.createElement(tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;};
 const warm=graffiti.kind==='spark',svg=make('svg',{viewBox:'0 0 260 100',role:'img','aria-label':warm?'Граффити друга: огонь':'Граффити друга: не сдавайся',class:'sn-graffiti'});
 svg.append(make('rect',{width:260,height:100,rx:6,fill:warm?'#fff0cb':'#deedf1'}));
 svg.append(make('path',{d:warm?'M35 82 Q4 63 34 26 Q24 56 48 10 Q79 49 61 79 Z':'M18 71 Q43 15 80 51 M61 28 L81 51 L51 55',fill:warm?'#eb854c':'none',stroke:warm?'#b55d3b':'#4b8498','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'}));
 const text=make('text',{x:95,y:57,fill:'#355665','font-size':20,'font-family':'sans-serif','font-weight':'bold',transform:'rotate(-4 95 57)'});text.textContent=warm?'ОГОНЬ!':'ЕЩЁ ЗАПИШЕМ';svg.append(text);return svg;
}
