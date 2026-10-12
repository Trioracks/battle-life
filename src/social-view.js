import {pcElement as el,pcFind} from './virtual-pc-dom.js?rev=38';
import {SOCIAL_SECTIONS,communityById} from './social-catalog.js?rev=38';
import {normalizeSocial,listCommunities} from './social-state.js?rev=38';
import {socialAvatar,socialButton,socialHeading} from './social-dom.js?rev=38';
import {createSocialAudio} from './social-audio-view.js?rev=38';
import {createSocialProfileView} from './social-profile-view.js?rev=38';
import {createSocialCommunityView} from './social-community-view.js?rev=38';
import {mountSocialDialog} from './social-dialog-view.js?rev=38';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=38';
export function mountSocial(root,{route,getState,getMetadata=()=>({}),onChange,navigate,audio,onResultViewed=()=>{}}){
 const d=root.ownerDocument,shell=el(d,'section',{className:'sn-network',attributes:{'aria-label':SOCIAL_IDENTITY.name}}),head=el(d,'header',{className:'sn-top'});
 const brand=el(d,'strong',{className:'sn-brand'});brand.append(el(d,'span',{className:'sn-brandmark',text:SOCIAL_IDENTITY.mark}),el(d,'b',{text:SOCIAL_IDENTITY.name}));
 head.append(brand,el(d,'span',{className:'sn-tagline',text:'Друзья. Знакомые. Наши истории.'}));
 const grid=el(d,'div',{className:'sn-layout'}),nav=el(d,'nav',{className:'sn-nav',attributes:{'aria-label':'Разделы: '+SOCIAL_IDENTITY.name}}),content=el(d,'div',{className:'sn-content'}),message=el(d,'p',{className:'sn-message',attributes:{'aria-live':'polite'}});
 for(const [id,title]of SOCIAL_SECTIONS)nav.append(socialButton(d,title,()=>navigate('underweb://social/'+id),{className:'sn-nav-link',dataset:{socialSection:id},attributes:route.section===id?{'aria-current':'page'}:{}}));
 grid.append(nav,content);shell.append(head,grid,message,el(d,'footer',{className:'sn-footer',text:SOCIAL_IDENTITY.name+' · '+SOCIAL_IDENTITY.year+' · Вымышленная локальная сеть'}));root.replaceChildren(shell);
 const playback=createSocialAudio(audio),expandedResults=new Set();let last='',query='',disposed=false,dialogView=null;
 const signature=()=>JSON.stringify([getState().social,Object.keys(getState().trackVersions?.byId??{}),getState().communityAudio,getState().battleSubmissions,getState().socialRuntime?.events,getState().battleKnowledge,getMetadata().playerName]);
 function commit(result){
  if(!result?.ok){message.textContent=result?.reason??'Не удалось выполнить действие.';return false;}
  let saved;try{saved=onChange(result.state);}catch{saved=false;}
  if(saved===false||saved?.ok===false){message.textContent='Не удалось сохранить изменение. Освободи место для сохранения и повтори.';return false;}
  message.textContent='';render();return true;
 }
 function groups(){
  const section=el(d,'section');section.append(socialHeading(d,'Сообщества',listCommunities(getState()).length));
  const input=el(d,'input',{className:'sn-search',value:query,attributes:{'aria-label':'Поиск сообществ',placeholder:'Название или интерес…'}}),list=el(d,'div');section.append(input,list);
  const fill=()=>{list.replaceChildren();for(const c of listCommunities(getState(),{query})){
   const card=el(d,'article',{className:'sn-group-card'}),info=el(d,'div');info.append(socialButton(d,c.name,()=>navigate('underweb://social/community/'+c.id),{className:'sn-link'}),el(d,'p',{text:c.description}),el(d,'small',{text:c.displayMemberCount+' участников'+(c.subscribed?' · Вы подписаны':'')}));
   card.append(socialAvatar(d,c.avatar,c.name),info);list.append(card);
  }if(!list.children.length)list.append(el(d,'p',{className:'sn-empty',text:'Сообществ по этому запросу нет.'}));};
  input.addEventListener('input',()=>{query=input.value;fill();});fill();return section;
 }
 function messages(){
  const node=el(d,'section');node.append(socialHeading(d,'Мои сообщения'));const dialogs=normalizeSocial(getState().social).dialogs;
  for(const [id,dialog]of Object.entries(dialogs)){const c=communityById(id);if(!c)continue;const row=el(d,'article',{className:'sn-group-card'});row.append(socialAvatar(d,c.avatar,c.name),socialButton(d,c.name+(dialog.unread?' · новое сообщение':''),()=>navigate('underweb://social/dialog/'+id),{className:'sn-link'}));node.append(row);}
  if(!Object.keys(dialogs).length)node.append(el(d,'p',{className:'sn-empty',text:'Здесь появятся ответы организаторов. Найди баттл в сообществах и открой «Сдать трек».'}),socialButton(d,'Найти сообщество',()=>navigate('underweb://social/groups')));
  return node;
 }
 function render(){
  if(dialogView){dialogView.update();last=signature();return;}
  const focus=content.contains(d.activeElement)?d.activeElement:null,label=focus?.getAttribute?.('aria-label'),start=focus?.selectionStart,end=focus?.selectionEnd;
  const options={getState,getMetadata,navigate,commit,audio:playback,onResultViewed:id=>{pcFind(content,n=>n.dataset?.resultSummary===id)?.focus?.({preventScroll:true});onResultViewed(id);},expandedResults};
  let node;
  if(route.section==='groups')node=groups();
  else if(route.section==='community')node=createSocialCommunityView(d,{...options,id:route.communityId});
  else if(route.section==='messages')node=messages();
  else if(route.section==='dialog'){dialogView=mountSocialDialog(d,{...options,id:route.communityId});node=dialogView.root;}
  else node=createSocialProfileView(d,{...options,id:route.profileId??'me',view:route.section==='profile'?route.view:['friends','photos','audio'].includes(route.section)?route.section:'page'});
  content.replaceChildren(node);last=signature();
  if(label){const field=pcFind(content,n=>n.getAttribute?.('aria-label')===label);field?.focus?.({preventScroll:true});if(Number.isInteger(start))field?.setSelectionRange?.(start,end);}
 }
 render();return {update(){if(disposed)return;if(last!==signature())render();else dialogView?.update();},dispose(){disposed=true;dialogView?.dispose();playback.dispose();root.replaceChildren();}};
}
