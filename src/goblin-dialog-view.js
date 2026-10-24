import {mountReplyPanel} from './social-reply-panel.js?rev=59';
import {mountPcFilePicker} from './pc-file-picker-view.js?rev=59';
import {pcFileById} from './pc-filesystem.js?rev=59';
import {startMentorDownload} from './pc-browser-downloads.js?rev=59';
import {advanceGoblinActiveChat,goblinReplyContext,goblinTypingSeconds} from './goblin-conversation.js?rev=59';
import {pcElement as el} from './virtual-pc-dom.js?rev=59';
import {socialButton,socialHeading,socialPeerLink,socialLink} from './social-dom.js?rev=59';
import {GOBLIN_ID,GOBLIN_PROFILE} from './goblin-catalog.js?rev=59';
import {replyToGoblin} from './goblin-mentor.js?rev=59';
import {sendGoblinFile} from './goblin-exchange.js?rev=59';
import {gameDateTimeLabel} from './home-calendar.js?rev=59';
import {createDialogLayout,dialogMessageField} from './social-dialog-layout.js?rev=59';
import {createLyricWorkAudio} from './lyric-work-audio.js?rev=59';

const TYPING_SECONDS=3;
const fileBody=kind=>kind==='project'?'Вот проект бита, который ты попросил.':kind==='lyrics'?'Чувак, вот мой текст. Глянешь?':kind==='beat'?'Вот мой бит, зацени!':'Братан, вот с моим голосом получилось.';
const withDraft=(state,draft)=>({...state,social:{...state.social,dialogs:{...state.social.dialogs,[GOBLIN_ID]:{...state.social.dialogs[GOBLIN_ID],replyDraft:draft}}}});

export function mountGoblinDialog(d,{getState,getMetadata,navigate,commit,audio,isVisible=()=>true,onRead=()=>{}}){
 const layout=createDialogLayout(d,{id:GOBLIN_ID,getState,navigate}),{root,history,notice}=layout;
 const incoming=el(d,'p',{className:'sn-typing',attributes:{role:'status','aria-live':'polite'}});
 const peer={kind:'person',id:GOBLIN_ID},heading=socialHeading(d,'Сообщения · ');heading.append(socialPeerLink(d,peer,GOBLIN_PROFILE.name,navigate));
 layout.head.append(heading,socialButton(d,'← Мои сообщения',()=>navigate('underweb://social/messages'),{className:'sn-link'}));
 const field=dialogMessageField(d),actions=el(d,'div',{className:'sn-actions'}),options=el(d,'div',{className:'sn-reply-host'}),attachment=el(d,'div',{className:'sn-dialog-attachment'}),draftLabel=el(d,'p',{className:'sn-note'}),progress=el(d,'p',{className:'sn-note',attributes:{'aria-live':'polite'}}),keyboard=createLyricWorkAudio({volume:.014});
 let filePicker=null;
 let signature='',readId='',disposed=false,blocked=false,error='',pendingSeconds=0,pendingChatSeconds=0,flushing=false,lastUpdate=null,incomingBody=null,incomingDuration=0;
 const now=()=>getMetadata().gameMinutes;
 const draft=()=>getState().social?.dialogs?.[GOBLIN_ID]?.replyDraft;
 const saveDraft=value=>commit({ok:true,state:withDraft(getState(),value)});
 function flushProgress(){
  if(blocked)return false;if(flushing||pendingSeconds<=0)return true;const current=draft();if(!current){pendingSeconds=0;return true;}
  const delta=pendingSeconds;pendingSeconds=0;flushing=true;const ok=saveDraft({...current,elapsedSeconds:Math.min(TYPING_SECONDS,current.elapsedSeconds+delta)});flushing=false;
  if(!ok){pendingSeconds=delta;blocked=true;error='Не удалось сохранить набор. Нажми «Повторить отправку».';}return ok;
 }
 function prepare(value){
  const previous=pendingSeconds;pendingSeconds=0;if(!saveDraft({...value,elapsedSeconds:0,totalSeconds:TYPING_SECONDS})){pendingSeconds=previous;return;}
  blocked=false;error='';replyPanel.close();attachment.hidden=true;void keyboard.unlock();field.focus({preventScroll:true});update(false);
 }
 let answer;
 function closeAttachment(){filePicker?.dispose();filePicker=null;attachment.hidden=true;}
 const attach=socialButton(d,'Прикрепить',()=>{
  if(attach.disabled)return;replyPanel.close();if(filePicker){closeAttachment();return;}const context=goblinReplyContext(getState(),now()),kind={text:'lyrics',beat:'beat','beat-project':'project',vocal:'track'}[getState().social.goblin.stage];attachment.hidden=false;
  filePicker=mountPcFilePicker(attachment,{getState,mode:'attach',types:context.expectedFileTypes,initialFolderId:kind==='lyrics'?'documents':kind==='project'?'projects':'exports',filter:file=>kind==='lyrics'?file.type==='txt'&&file.snapshot?.status==='ready':kind==='project'?file.type==='flp':file.kind===kind,onCancel:closeAttachment,onSelect:fileId=>{const file=pcFileById(getState(),fileId);if(!file)return {ok:false,reason:'Файл недоступен.'};prepare({kind:'attachment',fileId,filename:file.filename,body:fileBody(kind)});closeAttachment();return {ok:true};}});
 });
 const cancel=socialButton(d,'Отменить набор',()=>{const previous=pendingSeconds;pendingSeconds=0;if(saveDraft(null)){error='';blocked=false;keyboard.sync({phase:'idle'});update(false);}else pendingSeconds=previous;});
 const send=socialButton(d,'Отправить',()=>{
  if(send.disabled)return;blocked=false;error='';if(!flushProgress())return;const selected=draft();if(!selected)return;
  if(selected.elapsedSeconds<TYPING_SECONDS){void keyboard.unlock();update(false);return;}
  const state=getState(),result=selected.kind==='choice'?replyToGoblin(state,selected.choiceId,now()):sendGoblinFile(state,selected.fileId,now());
  if(result.ok)result.state=withDraft(result.state,null);
  if(commit(result)){blocked=false;error='';}else{blocked=true;error=result.reason||'Не удалось сохранить отправку. Черновик сохранён; повтори отправку.';}
  keyboard.sync({phase:'idle'});update(false);
 });
 const replyPanel=mountReplyPanel(options,{getContext:()=>goblinReplyContext(getState(),now()),onChoose:(choiceId,body)=>prepare({kind:'choice',choiceId,body})});answer=replyPanel.answer;
 options.hidden=false;attachment.hidden=true;actions.append(send,answer,attach,cancel);layout.footer.append(incoming,options,draftLabel,field,actions,progress,attachment,notice);
 const run=result=>{if(commit(result)){error=result.reason??'';update(false);}else{error=result.reason??'Не удалось сохранить.';notice.textContent=error;}};
 function tickOutgoingMessage(activeSeconds=0,{paused=false}={}){
  if(disposed)return;
  const chatting=isVisible()&&!paused&&getState().power==='on'&&getState().social?.goblin?.pending?.length;
  if(chatting&&Number.isFinite(activeSeconds)&&activeSeconds>0)pendingChatSeconds+=activeSeconds;
  if(!chatting)pendingChatSeconds=0;
  const next=chatting?getState().social.goblin.pending.reduce((a,b)=>a.at<=b.at?a:b):null;if(next&&next.body!==incomingBody){incomingBody=next.body;incomingDuration=goblinTypingSeconds(next);}
  const ready=next&&pendingChatSeconds+(next.activeElapsedSeconds??0)>=incomingDuration-1e-8;
  if(pendingChatSeconds>=.5||ready){const chat=advanceGoblinActiveChat(getState(),{nowMinute:now(),activeSeconds:pendingChatSeconds,visible:true,powered:true,paused:false});if(!chat.changed||commit({ok:true,state:chat.state})){pendingChatSeconds=0;update(false);}}
  const current=draft();
  if(!current||blocked||!isVisible()||paused||getState().power!=='on'){flushProgress();keyboard.sync({phase:'idle'});return;}
  if(Number.isFinite(activeSeconds)&&activeSeconds>0)pendingSeconds=Math.min(TYPING_SECONDS-current.elapsedSeconds,pendingSeconds+activeSeconds);
  const elapsed=Math.min(TYPING_SECONDS,current.elapsedSeconds+pendingSeconds);if(pendingSeconds>=1||elapsed>=TYPING_SECONDS)flushProgress();
  keyboard.sync({phase:!blocked&&elapsed<TYPING_SECONDS?'working':'idle',job:{projectId:'goblin-reply'}});update(false);
 }
 function update(markRead=true){
  if(disposed)return;if(!isVisible()){readId='';flushProgress();}
  const state=getState(),g=state.social?.goblin,dialog=state.social?.dialogs?.[GOBLIN_ID];
  const inputs=[state.social,state.software,state.browserDownloads,state.fileSystem,state.audioExports,Math.floor(now()),getMetadata().playerName,isVisible(),pendingSeconds,error,blocked,markRead];
  if(lastUpdate&&inputs.every((value,i)=>value===lastUpdate[i]))return;lastUpdate=inputs;
  const typing=Boolean(isVisible()&&state.power==='on'&&g?.pending?.length);incoming.hidden=!typing;
  const typingText=typing?'Гоблин Ссаблей печатает…':'';if(incoming.textContent!==typingText)incoming.textContent=typingText;
  const key=JSON.stringify([dialog?.messages,g?.received,g?.downloaded,state.browserDownloads?.items.map(i=>[i.id,i.error])]);
  if(key!==signature){
   signature=key;layout.scroller.render(dialog?.messages??[],()=>{audio?.releaseRows?.(history);history.replaceChildren();
   for(const msg of dialog?.messages??[]){
    const outgoing=msg.sender==='player',p=outgoing?{kind:'person',id:'me'}:peer,name=outgoing?getMetadata().playerName??'Игрок':GOBLIN_PROFILE.name;
    const row=el(d,'article',{className:'sn-dialog-message'+(outgoing?' sn-outgoing':'')}),body=el(d,'div');
    row.append(socialPeerLink(d,p,name,navigate,outgoing?{mark:'Я',src:state.social?.playerPortrait?.url}:GOBLIN_PROFILE.avatar),body);
    body.append(socialPeerLink(d,p,name,navigate),el(d,'small',{text:gameDateTimeLabel(msg.at)}),el(d,'p',{text:msg.body}));
    for(const link of msg.links??[])body.append(socialLink(d,link.label,link.url,navigate));
    const file=g?.files?.find(f=>f.id===msg.fileId),exported=msg.exportId&&state.audioExports?.files.find(f=>f.id===msg.exportId);
    if(file){
     const card=el(d,'div',{className:'sn-mentor-file'});card.append(el(d,'strong',{text:'📎 '+(file.exported?.file.filename??file.filename)}));
     if(file.kind==='lyrics')card.append(el(d,'p',{className:'sn-note',text:file.project.sections?.slice(0,1).flatMap(s=>s.lines?.slice(0,2).map(l=>l.words.map(w=>w.text).join(' '))).join('\n')??'Сохранённый текст'}));
     if(!outgoing){const downloaded=g.downloaded?.[file.id],loading=state.browserDownloads?.items.find(i=>i.attachmentId===file.id),download=socialButton(d,downloaded?'Открыть файл':loading&&!loading.error?'Скачивается…':'Скачать '+(file.exported?.file.filename??file.filename),()=>{
      if(downloaded){error=getMetadata().openDownloadedFile?.(downloaded)??'';update(false);}else run(startMentorDownload(getState(),{attachmentId:file.id,nowMinute:now()}));
     });download.disabled=Boolean(!downloaded&&loading&&!loading.error);card.append(download);}
     body.append(card);
    }else if(msg.attachmentSnapshot){body.append(el(d,'p',{className:'sn-mentor-file',text:'📎 '+msg.attachmentSnapshot.filename}));
    }else if(exported&&audio?.row){
     if(exported.trackVersionId)body.append(audio.row(d,{version:state.trackVersions?.byId?.[exported.trackVersionId],displayName:exported.filename.replace(/\.(wav|mp3)$/i,'')}));
     else body.append(audio.row(d,{item:{id:exported.id,title:exported.filename,descriptor:exported.descriptor}}));
    }
    history.append(row);
   }
   if(!dialog?.messages?.length)history.append(el(d,'p',{className:'sn-note',text:'Друг пока не написал. Занимайся своими делами — уведомление придёт на телефон.'}));
   });
  }
  const context=goblinReplyContext(state,now());replyPanel.update();attach.disabled=!context.expectedFileTypes.length;filePicker?.update();
  const selected=draft(),elapsed=Math.min(TYPING_SECONDS,(selected?.elapsedSeconds??0)+pendingSeconds),body=selected?Array.from(selected.body??'').slice(0,Math.floor(Array.from(selected.body??'').length*elapsed/TYPING_SECONDS)).join(''):'';
  if(field.value!==body)field.value=body;
  draftLabel.hidden=!selected?.filename;draftLabel.textContent=selected?.filename?'📎 '+selected.filename+' · ещё не отправлено':'';
  cancel.hidden=!selected;send.disabled=!selected||!blocked&&elapsed<TYPING_SECONDS;send.textContent=blocked?'Повторить отправку':'Отправить';
  progress.textContent=selected&&elapsed<TYPING_SECONDS?'Набираем ответ · '+Math.floor(elapsed/TYPING_SECONDS*100)+'%':'';
  if(error&&selected)progress.textContent=error;
  notice.textContent=error;notice.hidden=!error;
  if(!isVisible())keyboard.sync({phase:'idle'});layout.update();
  const lastId=dialog?.messages?.at(-1)?.id;if(markRead&&dialog?.unread&&isVisible()&&lastId!==readId){readId=lastId;onRead(GOBLIN_ID);}
 }
 update(false);return {root,update,tickOutgoingMessage,dispose(){disposed=true;filePicker?.dispose();replyPanel.dispose();flushProgress();keyboard.dispose();layout.dispose();audio?.releaseRows?.(root);root.replaceChildren();}};
}
