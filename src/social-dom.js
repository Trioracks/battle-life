import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=42';
import {socialPhotoSource} from './social-portraits.js?rev=42';
export const socialButton=(d,text,fn,extra={})=>pcButton(d,text,{className:'sn-button',...extra},fn);
export function socialLink(d,text,url,navigate){const link=el(d,'a',{className:'sn-link',text,dataset:{focusId:text},attributes:{href:url}});link.addEventListener('click',e=>{e.preventDefault();navigate(url);});return link;}
export function socialThumbCount(d,kind,count){
 const down=kind==='dislike',label=down?'Не нравится':'Нравится',root=el(d,'span',{className:'sn-thumb-count',attributes:{role:'img','aria-label':label+': '+count}}),make=(tag,attrs)=>{const n=d.createElementNS?d.createElementNS('http://www.w3.org/2000/svg',tag):d.createElement(tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
 const svg=make('svg',{viewBox:'0 0 24 24',width:18,height:18,'aria-hidden':'true',focusable:'false',class:'sn-thumb-icon'}),path=make('path',{d:'M3 10h4v11H3zM10 21h8a2 2 0 0 0 2-1.6l1.5-7A2 2 0 0 0 19.5 10H15l.7-4.1A3.4 3.4 0 0 0 13 2l-3 8z',fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linejoin':'round',...(down?{transform:'rotate(180 12 12)'}:{})});svg.append(path);root.append(svg,el(d,'span',{text:String(count)}));return root;
}
export function showRegistrationNotice(host,name,onContinue){
 const d=host.ownerDocument,previous=d.activeElement,overlay=el(d,'div',{className:'sn-registration-overlay'}),box=el(d,'section',{className:'sn-registration-confirm',attributes:{role:'alertdialog','aria-modal':'true','aria-label':'Заявка принята'}});
 const close=()=>{overlay.remove();if(previous?.isConnected)previous.focus();};
 const proceed=socialButton(d,'Перейти к сдаче',()=>{close();onContinue();}),dismiss=socialButton(d,'Закрыть',close);
 box.append(el(d,'h2',{text:'Заявка принята'}),el(d,'p',{text:'Ваша заявка принята, '+name+'. Ожидаем вашего трека'}),proceed,dismiss);overlay.append(box);host.append(overlay);proceed.focus();
 box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab'){e.preventDefault();e.stopPropagation();(d.activeElement===proceed?dismiss:proceed).focus();}});return close;
}
export function socialAvatar(d,avatar={},name='',large=false){
 const node=el(d,'div',{className:'sn-avatar'+(large?' sn-avatar-large':''),text:avatar.mark??'Р',attributes:{role:'img','aria-label':'Аватар: '+name}});
 node.style.setProperty('--avatar-color',avatar.color??'#617d94');const src=socialPhotoSource(avatar.src)??(/^\.\/assets\/battle-covers\/mak-cover-\d\d\.png$/.test(avatar.src??'')?avatar.src:null);
 if(src){const img=el(d,'img',{attributes:{src,alt:'Аватар: '+name}});node.textContent='';node.append(img);img.addEventListener('error',()=>{node.replaceChildren();node.textContent=avatar.mark??'Фото';});}return node;
}
export function socialHeading(d,title,count){
 const h=el(d,'h2',{className:'sn-heading',text:title});if(count!==undefined)h.append(el(d,'span',{text:String(count)}));return h;
}
export function socialPhoto(d,photo){
 const fig=el(d,'figure',{className:'sn-photo'}),src=socialPhotoSource(photo.src);
 if(src){const img=el(d,'img',{attributes:{src,alt:photo.title,loading:'lazy'}});img.addEventListener('error',()=>{img.remove();fig.prepend?.(el(d,'span',{text:'Фото недоступно'}));});fig.append(img);}
 else fig.append(el(d,'span',{className:'sn-photo-pending',text:'Фото ещё не готово'}));
 fig.append(el(d,'figcaption',{text:photo.title}),el(d,'small',{text:photo.date}));return fig;
}
export function socialPost(d,post,{author='',navigate,profileById,reactions=null}={}){
 const article=el(d,'article',{className:'sn-post'});
 article.append(el(d,'strong',{text:author}),el(d,'small',{text:post.date??''}),el(d,'p',{text:post.body}));
 if(reactions)article.append(reactions);else{
 const likes=el(d,'div',{className:'sn-post-reactions'});likes.append(socialThumbCount(d,'like',post.likes??0),socialThumbCount(d,'dislike',post.dislikes??0),el(d,'span',{text:'Комментарии: '+(post.comments?.length??0)}));article.append(likes);
 for(const c of post.comments??[]){const row=el(d,'div',{className:'sn-comment'}),person=profileById?.(c.authorId);
  if(person&&navigate)row.append(socialButton(d,person.name,()=>navigate('underweb://social/profile/'+person.id),{className:'sn-link'}));
  row.append(el(d,'span',{text:c.body}));article.append(row);
 }
 }if(post.graffiti)article.append(socialGraffiti(d,post.graffiti));return article;
}
export function socialGraffiti(d,graffiti){
 const make=(tag,attrs={})=>{const node=d.createElementNS?d.createElementNS('http://www.w3.org/2000/svg',tag):d.createElement(tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node;};
 const warm=graffiti.kind==='spark',svg=make('svg',{viewBox:'0 0 260 100',role:'img','aria-label':warm?'Граффити друга: огонь':'Граффити друга: не сдавайся',class:'sn-graffiti'});
 svg.append(make('rect',{width:260,height:100,rx:6,fill:warm?'#fff0cb':'#deedf1'}));
 svg.append(make('path',{d:warm?'M35 82 Q4 63 34 26 Q24 56 48 10 Q79 49 61 79 Z':'M18 71 Q43 15 80 51 M61 28 L81 51 L51 55',fill:warm?'#eb854c':'none',stroke:warm?'#b55d3b':'#4b8498','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'}));
 const text=make('text',{x:95,y:57,fill:'#355665','font-size':20,'font-family':'sans-serif','font-weight':'bold',transform:'rotate(-4 95 57)'});text.textContent=warm?'ОГОНЬ!':'ЕЩЁ ЗАПИШЕМ';svg.append(text);return svg;
}
