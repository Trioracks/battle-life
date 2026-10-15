import {pcElement as el} from './virtual-pc-dom.js?rev=42';
import {communityById} from './social-catalog.js?rev=42';
import {socialButton,socialAvatar,socialHeading} from './social-dom.js?rev=42';
import {sendSubmission,dialogIsTyping,markDialogRead} from './social-submission.js?rev=42';
import {attemptForWindow,currentBattleWindow,canSubmitToBattleWindow} from './battle-windows.js?rev=42';
import {gameDateTimeLabel} from './home-calendar.js?rev=42';
import {registerBattle,battleDeadlineLabel,metadataGameMinute} from './social-registration.js?rev=42';
import {mountBattleSubmissionPicker} from './battle-submission-view.js?rev=42';
import {mountPersonalDialog,visibleDialogReader} from './social-messages-view.js?rev=42';
import {uploadPresentation,cancelSubmissionUpload} from './social-upload.js?rev=42';
import {startSubmissionMessage,advanceSubmissionMessage,cancelSubmissionMessage} from './social-composer.js?rev=42';
import {createLyricWorkAudio} from './lyric-work-audio.js?rev=42';
export function mountSocialDialog(d,{id,peer,getState,getMetadata,navigate,commit,audio,isVisible=()=>true,onRegistered=()=>{},onRead=id=>commit(markDialogRead(getState(),id))}){
 if(peer?.kind==='person')return mountPersonalDialog(d,{id,getState,getMetadata,navigate,commit,isVisible,onRead});
 const c=communityById(id),root=el(d,'section',{className:'sn-dialog'}),history=el(d,'div',{className:'sn-dialog-history'}),typing=el(d,'p',{className:'sn-typing',attributes:{'aria-live':'polite'}}),draft=el(d,'div',{className:'sn-dialog-draft'}),actions=el(d,'div',{className:'sn-actions'}),notice=el(d,'p',{className:'sn-note'}),pickerHost=el(d,'div',{className:'sn-file-picker'});
 let picker=null,lastMessages='',lastDraft='',disposed=false;
 let pendingSeconds=0,flushing=false,blocked=false,composerError='',armed=(getState().outgoingMessage?.elapsedSeconds??6)<6;
 const keyboard=createLyricWorkAudio({volume:.014}),composerBox=el(d,'div',{className:'sn-composer'}),composerText=el(d,'p',{className:'sn-composer-text'}),composerStatus=el(d,'p',{className:'sn-note',attributes:{role:'status'}}),cancelMessage=socialButton(d,'Отменить набор',()=>{if(commit(cancelSubmissionMessage(getState()))){pendingSeconds=0;blocked=false;armed=false;composerError='';update();}});composerBox.append(composerText,composerStatus,cancelMessage);
 if(armed)void keyboard.unlock();
 const uploadBox=el(d,'div',{className:'sn-upload'}),uploadLabel=el(d,'p'),uploadBar=el(d,'progress',{attributes:{max:'100','aria-label':'Загрузка вложения'}}),uploadCancel=socialButton(d,'Отменить загрузку',()=>commit(cancelSubmissionUpload(getState())));uploadBox.append(uploadLabel,uploadBar,uploadCancel);
 const closePicker=()=>{picker?.dispose();picker=null;attach.focus();};
 const attach=socialButton(d,'Прикрепить',()=>{
  if(picker||attach.disabled)return;
  picker=mountBattleSubmissionPicker(pickerHost,{getState,battleId:c.battleId,communityId:id,getGameMinute:()=>getMetadata().gameMinutes,onChange:state=>commit({ok:true,state}),onClose:closePicker});
 });
 const send=socialButton(d,'Отправить',()=>{if(send.disabled)return;const result=startSubmissionMessage(getState(),{communityId:id,nowMinute:getMetadata().gameMinutes});if(!result.ok){commit(result);return;}if(result.state!==getState()&&!commit(result))return;blocked=false;composerError='';armed=true;void keyboard.unlock();tickOutgoingMessage(0,{paused:false});update();});
 const read=socialButton(d,'Отметить прочитанным',()=>commit(markDialogRead(getState(),id)),{className:'sn-link'});
 const register=socialButton(d,'Зарегистрироваться',()=>{const result=registerBattle(getState(),{battleId:c.battleId,playerName:getMetadata().playerName,nowMinute:metadataGameMinute(getMetadata())});if(commit(result))onRegistered(c.battleId);});
 root.append(socialHeading(d,'Сообщения · '+c.name),socialButton(d,'← Сообщество',()=>navigate('underweb://social/community/'+id),{className:'sn-link'}),history,typing,draft,uploadBox,composerBox);actions.append(register,attach,send,read);root.append(actions,notice,pickerHost);
 const message=()=>{const m=getState().outgoingMessage;return m&&(m.issue||m.communityId===id)?m:null;};
 function flushProgress(){
  if(blocked)return false;
  if(flushing||pendingSeconds<=0)return true;const m=message();if(!m||m.issue){pendingSeconds=0;return true;}
  const delta=pendingSeconds;pendingSeconds=0;flushing=true;const next=advanceSubmissionMessage(getState(),{activeSeconds:delta,visible:true,powered:true,paused:false});const ok=commit({ok:true,state:next.state});flushing=false;
  if(!ok){pendingSeconds=delta;blocked=true;armed=false;composerError='Не удалось сохранить набор. Вложение на месте. Нажми «Повторить отправку».';}return ok;
 }
 function finishMessage(){
  armed=false;const result=sendSubmission(getState(),{communityId:id,nowMinute:getMetadata().gameMinutes});
  if(!commit(result)){blocked=true;composerError=result.reason||'Не удалось сохранить отправку. Текст и вложение сохранены; повтори отправку.';}else{pendingSeconds=0;composerError='';blocked=false;}
  keyboard.sync({phase:'idle'});update();
 }
 function tickOutgoingMessage(activeSeconds=0,{paused=false}={}){
  if(disposed)return;const m=message(),active=m&&!m.issue&&isVisible()&&!paused&&getState().power==='on';
  if(!active){flushProgress();keyboard.sync({phase:'idle'});return;}
  if(blocked){keyboard.sync({phase:'idle'});return;}
  if(Number.isFinite(activeSeconds)&&activeSeconds>0)pendingSeconds=Math.min(6-m.elapsedSeconds,pendingSeconds+activeSeconds);
  const progress=m.elapsedSeconds+pendingSeconds;keyboard.sync({phase:progress<6?'working':'idle',job:{projectId:'submission:'+m.versionId}});
  if((pendingSeconds>=1||progress>=6)&&!flushProgress()){update();return;}
  if(message()?.elapsedSeconds>=6&&armed)finishMessage();else update();
 }
 const autoRead=visibleDialogReader({id,getState,isVisible,onRead});
 function update(markRead=true){
  if(disposed)return;if(!isVisible()){flushProgress();keyboard.sync({phase:'idle'});}const state=getState(),dialog=state.social?.dialogs?.[id]??{},window=currentBattleWindow(state,c.battleId,getMetadata().gameMinutes),attempt=window&&attemptForWindow(state,window),now=getMetadata().gameMinutes;
  const signature=JSON.stringify(dialog.messages??[]);if(signature!==lastMessages){
   lastMessages=signature;audio.releaseRows?.(history);history.replaceChildren();
   for(const msg of dialog.messages??[]){
    const row=el(d,'article',{className:'sn-dialog-message '+(msg.sender==='player'?'sn-outgoing':'')}),body=el(d,'div');
    body.append(el(d,'strong',{text:msg.sender==='player'?getMetadata().playerName??'Игрок':c.name}),el(d,'small',{text:gameDateTimeLabel(msg.at)}),el(d,'p',{text:msg.body}));
    if(msg.trackVersionId)body.append(audio.row(d,{version:state.trackVersions?.byId?.[msg.trackVersionId]}));row.append(socialAvatar(d,msg.sender==='player'?{mark:'Я',color:'#688277'}:c.avatar),body);history.append(row);
   }
   if(!(dialog.messages?.length))history.append(el(d,'p',{className:'sn-empty',text:'Прикрепи готовый трек и отправь его организаторам. Свободных сообщений здесь нет.'}));
  }
  if(lastDraft!==(dialog.draftVersionId??'')){lastDraft=dialog.draftVersionId??'';audio.releaseRows?.(draft);draft.replaceChildren();if(lastDraft)draft.append(el(d,'strong',{text:'Вложение · ещё не отправлено'}),audio.row(d,{version:state.trackVersions?.byId?.[lastDraft]}));}
  typing.textContent=dialogIsTyping(state,id,now)?c.name+' печатает…':'';
  const registered=state.battleApplications?.some(a=>a.battleId===c.battleId),deadline=battleDeadlineLabel(window,now);register.hidden=Boolean(registered);register.disabled=Boolean(window)&&!deadline.open;
  const upload=uploadPresentation(state),ownUpload=upload&&(upload.status==='error'||upload.communityId===id),waiting=ownUpload&&upload.status!=='ready';
  uploadBox.hidden=!ownUpload;uploadBar.hidden=upload?.status==='error';uploadCancel.textContent=upload?.status==='ready'?'Сменить вложение':'Отменить загрузку';draft.hidden=Boolean(waiting);
  if(ownUpload){uploadBar.value=upload.percent;uploadLabel.textContent=upload.status==='error'?upload.reason:upload.status==='ready'?'Вложение загружено · '+(upload.totalBytes/1000000).toFixed(2)+' МБ':(upload.uploadedBytes/1000000).toFixed(2)+' / '+(upload.totalBytes/1000000).toFixed(2)+' МБ · '+upload.percent+'% · '+(upload.bytesPerSecond/1000).toFixed(1)+' КБ/с · осталось '+upload.remainingSeconds+' сек.';}
  attach.disabled=!canSubmitToBattleWindow(state,window)||!registered||Boolean(attempt)||!deadline.open||Boolean(upload);send.disabled=!canSubmitToBattleWindow(state,window)||!registered||Boolean(attempt)||!dialog.draftVersionId||!deadline.open||Boolean(waiting);
  const composing=message(),elapsed=composing&&!composing.issue?Math.min(6,composing.elapsedSeconds+pendingSeconds):0;
  composerBox.hidden=!composing;uploadCancel.disabled=Boolean(composing);attach.disabled||=Boolean(composing);
  if(composing){composerText.textContent=composing.issue?'':Array.from(composing.body).slice(0,Math.floor(Array.from(composing.body).length*elapsed/6)).join('');composerStatus.textContent=composing.issue||composerError||(elapsed>=6?'Текст готов. Нажми «Повторить отправку».':'Набираем сообщение · '+Math.floor(elapsed/6*100)+'%');}
  send.textContent=composing?(blocked||elapsed>=6?'Повторить отправку':'Набираем сообщение…'):'Отправить';send.disabled||=Boolean(composing?.issue||composing&&!blocked&&elapsed<6);
  read.hidden=!dialog.unread;
  notice.textContent=deadline.text+' · '+(attempt?(attempt.status==='recovery'?'Старая работа сохранена с ошибкой источника. Замена закрыта.':attempt.status==='accepted'?'Работа принята. Ответ администратора не является оценкой судей.':'Работа отправлена. Администратор ответит через 1–30 игровых минут.'):registered?'Одна отправка без замены.':'Сначала зарегистрируйся на этот баттл.');
  picker?.update();
  if(markRead)autoRead();
 }
 update(false);return {root,update,tickOutgoingMessage,dispose(){disposed=true;flushProgress();keyboard.dispose();picker?.dispose();audio.releaseRows?.(root);root.replaceChildren();}};
}
