import {pcElement as el} from './virtual-pc-dom.js?rev=43';
import {socialButton,socialHeading,socialPeerLink,socialLink} from './social-dom.js?rev=57';
import {GOBLIN_ID,GOBLIN_PROFILE} from './goblin-catalog.js?rev=57';
import {goblinChoices,replyToGoblin} from './goblin-mentor.js?rev=57';
import {sendGoblinFile,importGoblinFile} from './goblin-exchange.js?rev=57';
import {gameDateTimeLabel} from './home-calendar.js?rev=43';
import {createDialogLayout,dialogMessageField} from './social-dialog-layout.js?rev=57';
import {createLyricWorkAudio} from './lyric-work-audio.js?rev=43';

const TYPING_SECONDS=3;
const fileBody=kind=>kind==='lyrics'?'Чувак, вот мой текст. Глянешь?':kind==='beat'?'Вот мой бит, зацени!':'Братан, вот с моим голосом получилось.';
const withDraft=(state,draft)=>({...state,social:{...state.social,dialogs:{...state.social.dialogs,[GOBLIN_ID]:{...state.social.dialogs[GOBLIN_ID],replyDraft:draft}}}});

export function mountGoblinDialog(d,{getState,getMetadata,navigate,commit,audio,isVisible=()=>true,onRead=()=>{}}){
 const layout=createDialogLayout(d,{id:GOBLIN_ID,getState,navigate}),{root,history,notice}=layout;
 const peer={kind:'person',id:GOBLIN_ID},heading=socialHeading(d,'Сообщения · ');heading.append(socialPeerLink(d,peer,GOBLIN_PROFILE.name,navigate));
 layout.head.append(heading,socialButton(d,'← Мои сообщения',()=>navigate('underweb://social/messages'),{className:'sn-link'}));
 const field=dialogMessageField(d),actions=el(d,'div',{className:'sn-actions'}),options=el(d,'div',{className:'sn-dialog-options'}),attachment=el(d,'div',{className:'sn-dialog-attachment'}),draftLabel=el(d,'p',{className:'sn-note'}),progress=el(d,'p',{className:'sn-note',attributes:{'aria-live':'polite'}}),guidance=el(d,'div',{className:'sn-dialog-guidance'}),keyboard=createLyricWorkAudio({volume:.014});
 let signature='',actionSignature='',guidanceStage='',readId='',disposed=false,blocked=false,error='',pendingSeconds=0,flushing=false;
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
  blocked=false;error='';options.hidden=true;attachment.hidden=true;void keyboard.unlock();field.focus({preventScroll:true});update(false);
 }
 const answer=socialButton(d,'Ответить',()=>{if(answer.disabled)return;options.hidden=!options.hidden;attachment.hidden=true;});
 const attach=socialButton(d,'Прикрепить',()=>{if(attach.disabled)return;attachment.hidden=!attachment.hidden;options.hidden=true;});
 const cancel=socialButton(d,'Отменить набор',()=>{const previous=pendingSeconds;pendingSeconds=0;if(saveDraft(null)){error='';blocked=false;keyboard.sync({phase:'idle'});update(false);}else pendingSeconds=previous;});
 const send=socialButton(d,'Отправить',()=>{
  if(send.disabled)return;blocked=false;error='';if(!flushProgress())return;const selected=draft();if(!selected)return;
  if(selected.elapsedSeconds<TYPING_SECONDS){void keyboard.unlock();update(false);return;}
  const state=getState(),result=selected.kind==='choice'?replyToGoblin(state,selected.choiceId,now()):sendGoblinFile(state,selected.fileId,now());
  if(result.ok)result.state=withDraft(result.state,null);
  if(commit(result)){blocked=false;error='';}else{blocked=true;error=result.reason||'Не удалось сохранить отправку. Черновик сохранён; повтори отправку.';}
  keyboard.sync({phase:'idle'});update(false);
 });
 options.hidden=true;attachment.hidden=true;actions.append(send,answer,attach,cancel);layout.footer.append(draftLabel,field,actions,progress,options,attachment,guidance,notice);
 const run=result=>{if(commit(result)){error=result.reason??'';update(false);}else{error=result.reason??'Не удалось сохранить.';notice.textContent=error;}};
 function tickOutgoingMessage(activeSeconds=0,{paused=false}={}){
  if(disposed)return;const current=draft();
  if(!current||blocked||!isVisible()||paused||getState().power!=='on'){flushProgress();keyboard.sync({phase:'idle'});return;}
  if(Number.isFinite(activeSeconds)&&activeSeconds>0)pendingSeconds=Math.min(TYPING_SECONDS-current.elapsedSeconds,pendingSeconds+activeSeconds);
  const elapsed=Math.min(TYPING_SECONDS,current.elapsedSeconds+pendingSeconds);if(pendingSeconds>=1||elapsed>=TYPING_SECONDS)flushProgress();
  keyboard.sync({phase:!blocked&&elapsed<TYPING_SECONDS?'working':'idle',job:{projectId:'goblin-reply'}});update(false);
 }
 function update(markRead=true){
  if(disposed)return;if(!isVisible()){readId='';flushProgress();}
  const state=getState(),g=state.social?.goblin,dialog=state.social?.dialogs?.[GOBLIN_ID];
  const key=JSON.stringify([dialog?.messages,g?.received]);
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
     const card=el(d,'div',{className:'sn-mentor-file'});card.append(el(d,'strong',{text:'📎 '+file.filename}));
     if(file.kind==='lyrics')card.append(el(d,'p',{className:'sn-note',text:file.project.sections?.slice(0,1).flatMap(s=>s.lines?.slice(0,2).map(l=>l.words.map(w=>w.text).join(' '))).join('\n')??'Сохранённый текст'}));
     if(!outgoing)card.append(socialButton(d,g.received?.[file.id]?'Открыть полученный проект':file.kind==='lyrics'?'Сохранить и открыть текст':file.exported?'Сохранить сведённый трек':'Импортировать бит в FT Studio',()=>{const open=getMetadata().openMentorFile;if(open){error=open(file.id)??'';update(false);}else run(importGoblinFile(getState(),file.id,now()));}));
     body.append(card);
    }else if(exported&&audio?.row){
     if(exported.trackVersionId)body.append(audio.row(d,{version:state.trackVersions?.byId?.[exported.trackVersionId]}));
     else body.append(audio.row(d,{item:{id:exported.id,title:exported.filename,descriptor:exported.descriptor}}));
    }
    history.append(row);
   }
   if(!dialog?.messages?.length)history.append(el(d,'p',{className:'sn-note',text:'Друг пока не написал. Занимайся своими делами — уведомление придёт на телефон.'}));
   });
  }
  const choices=goblinChoices(state),kind={text:'lyrics',beat:'beat',vocal:'track'}[g?.stage],files=kind==='lyrics'?(g?.files??[]).filter(f=>f.kind==='lyrics'&&f.author==='player'):(state.audioExports?.files??[]).filter(f=>f.kind===kind);
  const actionKey=JSON.stringify([choices,kind,files.map(f=>[f.id,f.filename])]);
  if(actionKey!==actionSignature){
   actionSignature=actionKey;options.replaceChildren();attachment.replaceChildren();
   for(const [choiceId,body]of choices)options.append(socialButton(d,body,()=>prepare({kind:'choice',choiceId,body})));
   if(kind){
    const select=el(d,'select',{attributes:{'aria-label':'Выбрать вложение Гоблину'}});
    for(const f of files)select.append(el(d,'option',{text:f.filename,value:f.id}));if(files.length)select.value=files[0].id;
    const choose=socialButton(d,'Выбрать вложение',()=>{const file=files.find(f=>f.id===select.value);if(file)prepare({kind:'attachment',fileId:file.id,filename:file.filename,body:fileBody(kind)});});choose.disabled=!files.length;attachment.append(select,choose);
   }
  }
  answer.disabled=!choices.length;attach.disabled=!kind;if(answer.disabled)options.hidden=true;if(attach.disabled)attachment.hidden=true;
  const selected=draft(),elapsed=Math.min(TYPING_SECONDS,(selected?.elapsedSeconds??0)+pendingSeconds),body=selected?Array.from(selected.body??'').slice(0,Math.floor(Array.from(selected.body??'').length*elapsed/TYPING_SECONDS)).join(''):'';
  if(field.value!==body)field.value=body;
  draftLabel.hidden=!selected?.filename;draftLabel.textContent=selected?.filename?'📎 '+selected.filename+' · ещё не отправлено':'';
  cancel.hidden=!selected;send.disabled=!selected||!blocked&&elapsed<TYPING_SECONDS;send.textContent=blocked?'Повторить отправку':'Отправить';
  progress.textContent=selected?(elapsed>=TYPING_SECONDS?'Текст готов. Нажми «Отправить».':'Набираем ответ · '+Math.floor(elapsed/TYPING_SECONDS*100)+'%'):'';
  if(error&&selected)progress.textContent=error;
  const pending=(g?.pending??[]).filter(m=>Number.isFinite(m.at)).sort((a,b)=>a.at-b.at),next=pending[0];
  let text='';
  if(next){const minutes=Math.max(0,Math.ceil(next.at-now()));text=minutes?'Гоблин ещё пишет. Следующее сообщение через '+minutes+' игровых минут. Можно закрыть переписку и заняться делами — ответ придёт по игровым часам.':'Новое сообщение Гоблина ожидает обновления игровых часов.';}
  else if(choices.length)text='Нажми «Ответить», выбери реплику и дождись набора. Затем нажми «Отправить».';
  else if(g?.stage==='client')text='Скачай и установи torent. Гоблин увидит установку и продолжит разговор.';
  else if(g?.stage==='software')text='Установи Рэпблокнот и FT Studio. После установки Рэпблокнота Гоблин расскажет про текст.';
  else if(kind)text=kind==='lyrics'?'Закончи текст в Рэпблокноте и нажми «Экспорт текста». Зарегистрируйся на баттл; затем прикрепи текст сюда.':'В FT Studio экспортируй '+(kind==='beat'?'бит':'полный трек')+' в файл. Затем прикрепи сохранённую версию сюда.';
  else if(g?.stage==='finished')text='Совместный трек готов. Сохрани сведённый WAV из сообщения и отправь его в сообщения баттла.';
  notice.textContent=error||text;
  if(guidanceStage!==g?.stage){guidanceStage=g?.stage;guidance.replaceChildren();
  if(g?.stage==='client')guidance.append(socialLink(d,'Скачать torent','underweb://dump/client',navigate));
  if(g?.stage==='software'){guidance.append(socialLink(d,'Скачать Рэпблокнот','underweb://dump/notebook',navigate),socialLink(d,'Скачать FT Studio','underweb://dump/ft-studio',navigate));}
  if(['subscribe','text','finished'].includes(g?.stage))guidance.append(socialLink(d,'Открыть Макаревич Battle','underweb://social/community/makarevich-1',navigate));
  if(kind==='lyrics')guidance.append(socialLink(d,'Рэпблокнот: страница загрузки','underweb://dump/notebook',navigate));
  if(kind==='beat'||kind==='track')guidance.append(socialLink(d,'FT Studio: страница загрузки','underweb://dump/ft-studio',navigate));}
  if(!isVisible())keyboard.sync({phase:'idle'});layout.update();
  const lastId=dialog?.messages?.at(-1)?.id;if(markRead&&dialog?.unread&&isVisible()&&lastId!==readId){readId=lastId;onRead(GOBLIN_ID);}
 }
 update(false);return {root,update,tickOutgoingMessage,dispose(){disposed=true;flushProgress();keyboard.dispose();layout.dispose();audio?.releaseRows?.(root);root.replaceChildren();}};
}
