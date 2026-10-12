import {pcElement as el} from './virtual-pc-dom.js?rev=38';
import {communityById} from './social-catalog.js?rev=38';
import {socialButton,socialAvatar,socialHeading} from './social-dom.js?rev=38';
import {sendSubmission,dialogIsTyping,markDialogRead} from './social-submission.js?rev=38';
import {attemptForWindow} from './battle-windows.js?rev=38';
import {gameDateTimeLabel} from './home-calendar.js?rev=38';
import {registerBattle,battleDeadlineLabel,metadataGameMinute} from './social-registration.js?rev=38';
import {mountBattleSubmissionPicker} from './battle-submission-view.js?rev=38';
import {mountPersonalDialog,visibleDialogReader} from './social-messages-view.js?rev=38';
import {uploadPresentation,cancelSubmissionUpload} from './social-upload.js?rev=38';
export function mountSocialDialog(d,{id,peer,getState,getMetadata,navigate,commit,audio,isVisible=()=>true,onRegistered=()=>{},onRead=id=>commit(markDialogRead(getState(),id))}){
 if(peer?.kind==='person')return mountPersonalDialog(d,{id,getState,getMetadata,navigate,commit,isVisible,onRead});
 const c=communityById(id),root=el(d,'section',{className:'sn-dialog'}),history=el(d,'div',{className:'sn-dialog-history'}),typing=el(d,'p',{className:'sn-typing',attributes:{'aria-live':'polite'}}),draft=el(d,'div',{className:'sn-dialog-draft'}),actions=el(d,'div',{className:'sn-actions'}),notice=el(d,'p',{className:'sn-note'}),pickerHost=el(d,'div',{className:'sn-file-picker'});
 let picker=null,lastMessages='',lastDraft='',disposed=false;
 const uploadBox=el(d,'div',{className:'sn-upload'}),uploadLabel=el(d,'p'),uploadBar=el(d,'progress',{attributes:{max:'100','aria-label':'Загрузка вложения'}}),uploadCancel=socialButton(d,'Отменить загрузку',()=>commit(cancelSubmissionUpload(getState())));uploadBox.append(uploadLabel,uploadBar,uploadCancel);
 const closePicker=()=>{picker?.dispose();picker=null;attach.focus();};
 const attach=socialButton(d,'Прикрепить',()=>{
  if(picker||attach.disabled)return;
  picker=mountBattleSubmissionPicker(pickerHost,{getState,battleId:c.battleId,communityId:id,getGameMinute:()=>getMetadata().gameMinutes,onChange:state=>commit({ok:true,state}),onClose:closePicker});
 });
 const send=socialButton(d,'Отправить',()=>{if(!send.disabled)commit(sendSubmission(getState(),{communityId:id,nowMinute:getMetadata().gameMinutes}));});
 const read=socialButton(d,'Отметить прочитанным',()=>commit(markDialogRead(getState(),id)),{className:'sn-link'});
 const register=socialButton(d,'Зарегистрироваться',()=>{const result=registerBattle(getState(),{battleId:c.battleId,playerName:getMetadata().playerName,nowMinute:metadataGameMinute(getMetadata())});if(commit(result))onRegistered(c.battleId);});
 root.append(socialHeading(d,'Сообщения · '+c.name),socialButton(d,'← Сообщество',()=>navigate('underweb://social/community/'+id),{className:'sn-link'}),history,typing,draft,uploadBox);actions.append(register,attach,send,read);root.append(actions,notice,pickerHost);
 const autoRead=visibleDialogReader({id,getState,isVisible,onRead});
 function update(markRead=true){
  if(disposed)return;const state=getState(),dialog=state.social?.dialogs?.[id]??{},window=state.battleWindows?.find(w=>w.battleId===c.battleId&&!w.issue),attempt=window&&attemptForWindow(state,window),now=getMetadata().gameMinutes;
  const signature=JSON.stringify(dialog.messages??[]);if(signature!==lastMessages){
   lastMessages=signature;history.replaceChildren();
   for(const msg of dialog.messages??[]){
    const row=el(d,'article',{className:'sn-dialog-message '+(msg.sender==='player'?'sn-outgoing':'')}),body=el(d,'div');
    body.append(el(d,'strong',{text:msg.sender==='player'?getMetadata().playerName??'Игрок':c.name}),el(d,'small',{text:gameDateTimeLabel(msg.at)}),el(d,'p',{text:msg.body}));
    if(msg.trackVersionId)body.append(audio.row(d,{version:state.trackVersions?.byId?.[msg.trackVersionId]}));row.append(socialAvatar(d,msg.sender==='player'?{mark:'Я',color:'#688277'}:c.avatar),body);history.append(row);
   }
   if(!(dialog.messages?.length))history.append(el(d,'p',{className:'sn-empty',text:'Прикрепи готовый трек и отправь его организаторам. Свободных сообщений здесь нет.'}));
  }
  if(lastDraft!==(dialog.draftVersionId??'')){lastDraft=dialog.draftVersionId??'';draft.replaceChildren();if(lastDraft)draft.append(el(d,'strong',{text:'Вложение · ещё не отправлено'}),audio.row(d,{version:state.trackVersions?.byId?.[lastDraft]}));}
  typing.textContent=dialogIsTyping(state,id,now)?c.name+' печатает…':'';
  const registered=state.battleApplications?.some(a=>a.battleId===c.battleId),deadline=battleDeadlineLabel(window,now);register.hidden=Boolean(registered);register.disabled=Boolean(window)&&!deadline.open;
  const upload=uploadPresentation(state),ownUpload=upload&&(upload.status==='error'||upload.communityId===id),waiting=ownUpload&&upload.status!=='ready';
  uploadBox.hidden=!ownUpload;uploadBar.hidden=upload?.status==='error';uploadCancel.textContent=upload?.status==='ready'?'Сменить вложение':'Отменить загрузку';draft.hidden=Boolean(waiting);
  if(ownUpload){uploadBar.value=upload.percent;uploadLabel.textContent=upload.status==='error'?upload.reason:upload.status==='ready'?'Вложение загружено · '+(upload.totalBytes/1000000).toFixed(2)+' МБ':(upload.uploadedBytes/1000000).toFixed(2)+' / '+(upload.totalBytes/1000000).toFixed(2)+' МБ · '+upload.percent+'% · '+(upload.bytesPerSecond/1000)+' КБ/с · осталось '+upload.remainingSeconds+' сек.';}
  attach.disabled=!registered||Boolean(attempt)||!deadline.open||Boolean(upload);send.disabled=!registered||Boolean(attempt)||!dialog.draftVersionId||!deadline.open||Boolean(waiting);
  read.hidden=!dialog.unread;
  notice.textContent=deadline.text+' · '+(attempt?(attempt.status==='recovery'?'Старая работа сохранена с ошибкой источника. Замена закрыта.':attempt.status==='accepted'?'Работа принята. Ответ администратора не является оценкой судей.':'Работа отправлена. Администратор ответит через 1–30 игровых минут.'):registered?'Одна отправка без замены.':'Сначала зарегистрируйся на этот баттл.');
  picker?.update();
  if(markRead)autoRead();
 }
 update(false);return {root,update,dispose(){disposed=true;picker?.dispose();root.replaceChildren();}};
}
