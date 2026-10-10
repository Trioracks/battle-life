import {pcElement as el,pcButton as button,pcFind,pcFocusable} from './virtual-pc-dom.js?rev=21';
import {createStudioWorkspace,FT_TRACKS,renderStudioTracks} from './ft-studio-view.js?rev=24';
import {BEAT_STAGES} from './beat-catalog.js';
import {randomBeatName} from './beat-names.js?rev=24';
import {resolveBeatPlayback} from './beat-playback.js?rev=21';
import {createBeat,startBeatStage,normalizeBeat,effectiveBeatSkill,workBlockReason} from './beat-production.js?rev=24';

export function mountBeatStudio(root,{getState,getMetadata,onChange,onWork,audio,legacyName,initialProject}){
 const d=root.ownerDocument,workspace=createStudioWorkspace(d,{projectName:legacyName});root.replaceChildren(workspace);
 const find=role=>pcFind(workspace,n=>n.dataset?.ftRole===role);
 const body=pcFind(workspace,n=>n.className==='ft-body'),panel=el(d,'aside',{className:'ft-production',dataset:{ftRole:'analytics'},attributes:{'aria-label':'Анализ проекта'}});
 body.append(panel);body.className+=' ft-producing';
 const actions=find('project-actions'),workflow=find('workflow');
 actions.append(button(d,'Новый проект',{},()=>openDialog('new')),button(d,'Открыть проект',{},()=>openDialog('projects')));
 const footer=pcFind(workspace,n=>n.className==='ft-bottom');footer.replaceChildren(el(d,'span',{text:'●  FIELD TONE / HOME STUDIO'}),el(d,'span',{text:'Три этапа. Твой первый звук.'}),el(d,'span',{text:'44.1 kHz / 16 bit'}));
 const summary=el(d,'p',{className:'ft-needs'}),session=pcFind(workspace,n=>n.className==='ft-session').children[1],tempo=pcFind(workspace,n=>n.className==='ft-tempo').children[0];
 const readout=pcFind(workspace,n=>n.className==='ft-readout').children[1],transport=find('transport'),playhead=find('playhead'),status=find('transport-status');
 const controls=Object.fromEntries(['play','pause','stop'].map(key=>[key,pcFind(transport,n=>n.dataset?.ftAction===key)]));
 let signature='',message='',disposed=false,dialog=null,returnFocus=null,frame=null,sessionSelected=false;
 const win=d.defaultView??globalThis,requestFrame=win.requestAnimationFrame?.bind(win),cancelFrame=win.cancelAnimationFrame?.bind(win);
 const currentBeat=()=>sessionSelected?normalizeBeat(getState().projects.find(p=>p.id===getState().music.activeBeatId)):null;
 const stateSignature=()=>{const s=getState();return JSON.stringify([s.projects,s.music.activeBeatId,s.music.job?.beatId,s.music.job?.stage]);};
 function change(next){onChange(next);render();}
 function closeDialog({restore=true}={}){
  dialog?.remove();dialog=null;
  for(const child of workspace.children)child.inert=false;
  if(restore){(returnFocus?.isConnected?returnFocus:pcFocusable(actions)[0])?.focus();returnFocus=null;}
 }
 function openDialog(mode='home'){
  returnFocus??=d.activeElement;closeDialog({restore:false});
  for(const child of workspace.children)child.inert=true;
  dialog=el(d,'div',{className:'ft-dialog-backdrop',dataset:{ftRole:'dialog'},attributes:{role:'dialog','aria-modal':'true','aria-label':mode==='new'?'Новый проект':mode==='projects'?'Открыть проект':'FT Studio — начало работы'}});
  const card=el(d,'section',{className:'ft-dialog-card'});
  card.append(el(d,'span',{className:'ft-eyebrow',text:'FIELD TONE / STUDIO'}),el(d,'h2',{text:mode==='new'?'Как назовём бит?':mode==='projects'?'Твои проекты':'С чего начнём?'}));
  if(mode==='new'){
   const form=el(d,'form'),name=el(d,'input',{attributes:{'aria-label':'Название бита',maxlength:'64',placeholder:'Например, «Первый двор»',required:'true'}}),notice=el(d,'p',{className:'ft-warning',attributes:{role:'status'}});
   const create=()=>{
    const r=createBeat(getState(),{id:globalThis.crypto?.randomUUID?.()??'beat-'+Date.now(),name:name.value},getMetadata().skills);
    if(!r.ok){notice.textContent=r.reason;return;}
    sessionSelected=true;legacyName=undefined;message='';audio.stop();closeDialog({restore:false});change(r.state);pcFocusable(actions)[0]?.focus();
   };
   const naming=el(d,'div',{className:'ft-project-name'});
   naming.append(name,button(d,'⚄ Случайное название',{attributes:{'aria-label':'Случайное название'}},()=>{name.value=randomBeatName(getMetadata().gameDay,name.value);name.focus();}));
   form.append(el(d,'label',{text:'Название проекта'}),naming,el(d,'p',{className:'ft-production-note',text:'Начни с простого. Персонаж сам попробует собрать ритм, тему и аранжировку.'}),button(d,'Начать проект',{className:'ft-primary'},create),notice);
   form.addEventListener('submit',e=>{e.preventDefault();create();});card.append(form);
  }else if(mode==='projects'){
   const projects=getState().projects;
   if(!projects.length)card.append(el(d,'p',{className:'ft-production-note',text:'Пока нет сохранённых проектов.'}));
   const list=el(d,'div',{className:'ft-dialog-projects'});
   for(const p of projects)list.append(button(d,p.name+' · '+(p.kind==='beat'?(p.status==='ready'?'готов':p.stages.length+'/3'):'архив'),{className:'ft-project-item'},()=>selectProject(p)));
   card.append(list,button(d,'Новый проект',{},()=>openDialog('new')));
  }else{
   card.append(el(d,'p',{className:'ft-production-note',text:'Чистый лист или работа, к которой хочется вернуться.'}),button(d,'Новый проект',{className:'ft-menu-choice'},()=>openDialog('new')),button(d,'Открыть проект',{className:'ft-menu-choice'},()=>openDialog('projects')));
  }
  card.append(button(d,mode==='home'?'Закрыть':'Отмена',{},()=>closeDialog()));
  dialog.append(card);workspace.append(dialog);
  dialog.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}
   if(event.key==='Tab'){const items=pcFocusable(dialog),i=items.indexOf(d.activeElement);event.preventDefault();event.stopPropagation();items[(i+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();}
  });
  pcFocusable(dialog)[0]?.focus();
 }
 function selectProject(project){
  sessionSelected=true;
  closeDialog({restore:false});legacyName=project.kind==='beat'?undefined:project.name;message='';audio.stop();
  const s=getState();change({...s,music:{...s.music,activeBeatId:project.kind==='beat'?project.id:null}});
  pcFocusable(actions)[0]?.focus();
 }
 function render(){
  if(disposed)return;const s=getState(),beat=currentBeat();signature=stateSignature();panel.replaceChildren();workflow.replaceChildren();
  panel.append(el(d,'small',{className:'ft-eyebrow',text:'АНАЛИЗ ПРОЕКТА'}),summary);
  session.textContent=beat?.name??legacyName??'Сеанс без названия';tempo.textContent=beat?String(beat.bpm):'—';
  renderStudioTracks(workspace,beat);
  if(beat){
   const stage=beat.stages.length,job=s.music.job?.beatId===beat.id?s.music.job:null;
   workflow.append(el(d,'span',{className:'ft-workflow-stage',text:stage===3?'Бит готов · 3 / 3':'Этап '+(stage+1)+' / 3 · '+BEAT_STAGES[stage].name}));
   panel.append(el(d,'h2',{text:beat.name}));
   const steps=el(d,'ol',{className:'ft-stage-list'});BEAT_STAGES.forEach((item,i)=>steps.append(el(d,'li',{text:(i<stage?'✓ ':i===stage?'→ ':'○ ')+item.name,dataset:{complete:String(i<stage)}})));panel.append(steps);
   for(let i=0;i<stage;i++){
    const result=el(d,'section',{className:'ft-stage-result'});
    result.append(el(d,'h3',{text:BEAT_STAGES[i].name}),el(d,'p',{text:FT_TRACKS.filter(t=>t.stage===i).map(t=>t.name).join(' · ')}),el(d,'small',{text:beat.version===3?'Навык при работе: '+beat.stages[i].quality+'/100':'Архивный слой · исходные данные сохранены'}));panel.append(result);
   }
   if(stage<3){
    panel.append(el(d,'p',{className:'ft-production-note',text:['Начнём с пульса. Персонаж подбирает простой ритм и пробует связать ударные.','Теперь мелодия. Несколько нот, немного атмосферы — у бита появляется тема.','Собираем всё вместе: низ, переходы и небольшие детали.'][stage]}));
    if(job)panel.append(el(d,'p',{text:'Сохранено '+Math.floor(job.elapsed)+' из '+job.total+' мин. Можно продолжить.'}));
    const blocked=beat.audioIssue?'Не найден аудиобанк проекта. Работа сохранена.':workBlockReason(s);
    if(blocked)panel.append(el(d,'p',{className:'ft-warning',text:blocked}));
    const work=button(d,job?'Продолжить этап':'Работать над этапом',{className:'ft-primary'},()=>{
     const r=startBeatStage(getState(),beat.id,undefined,getMetadata().skills);message=r.reason;
     if(r.ok){
      // Resume AudioContext in the click gesture, before the cinematic transition.
      Promise.resolve(audio.unlock?.()).catch(()=>{});audio.stop();onChange(r.state);
      if(onWork?.()===false)message='Работа сохранена. Вернись к ПК и продолжи этап.';
     }render();
    });work.disabled=Boolean(beat.audioIssue);workflow.append(work);
   }else{
    const quality=Math.round(beat.stages.reduce((n,v)=>n+v.quality,0)/3);
    panel.append(el(d,'small',{className:'ft-eyebrow',text:'Впечатление героя'}),el(d,'p',{text:quality<40?'Пока сыровато. Но это уже твой бит.':quality<70?'Кажется, получилось. Хочется попробовать ещё.':'Мне нравится. Можно двигаться дальше.'}),el(d,'p',{className:'ft-production-note',text:'Бит сохранён. Практика засчитана. Это впечатление персонажа, не оценка судей.'}));
   }
   panel.append(el(d,'p',{className:'ft-group-note',text:'Готово слоёв: '+stage+'/3 · дорожек: '+stage*3+'. Прослушивание — целиком.'}));
  }else{
   workflow.append(el(d,'span',{text:'Создай новый бит или открой проект'}));
   panel.append(el(d,'p',{className:'ft-production-note',text:legacyName?'Открыт прежний проект: '+legacyName+'. Старые данные сохранены без изменений.':'Здесь появятся готовые слои, результат каждого этапа и следующая цель.'}));
  }
  if(message)panel.append(el(d,'p',{className:'ft-warning',text:message,attributes:{role:'status'}}));updateSummary();updateTransport();
 }
 function updateSummary(){const s=getState();summary.textContent='Битмейкинг '+effectiveBeatSkill(s,getMetadata().skills).toFixed(2)+' · сытость '+Math.round(s.music.needs.satiety)+' · энергия '+Math.round(s.music.needs.energy)+(s.music.infected?' · ⚠ вирус замедляет ПК':'');}
 function updateTransport(){
  const beat=currentBeat(),available=!!beat?.stages.length&&!beat.audioIssue;
  const current=audio.getSnapshot?.(),expected=available?resolveBeatPlayback(beat):null;
  const snapshot=current?.owner==='studio'&&expected?.ok&&current.key===expected.descriptor.key?current:{status:'stopped',positionSeconds:0};
  controls.play.disabled=!available||snapshot.status==='loading'||snapshot.status==='playing';
  controls.pause.disabled=!['playing','loading'].includes(snapshot.status);controls.stop.disabled=!['playing','loading','paused'].includes(snapshot.status);
  const position=snapshot.owner==='work'?0:snapshot.positionSeconds??0,beatPosition=position*90/60;
  readout.textContent=String(Math.floor(beatPosition/4)+1).padStart(2,'0')+' : '+String(Math.floor(beatPosition%4)+1).padStart(2,'0')+' : '+String(Math.floor((beatPosition%1)*1000)).padStart(3,'0');
  playhead.style.left=(position/(60/90*4*16)*100)+'%';
  status.textContent=snapshot.error||({loading:'Загрузка звука…',playing:'Играет',paused:'Пауза',error:'Звук недоступен',stopped:available?'Готов к прослушиванию':'Нет готового слоя'}[snapshot.status]??'Готов');
  transport.dataset.status=snapshot.status;
 }
 controls.play.addEventListener('click',()=>{const beat=currentBeat();if(!beat)return;Promise.resolve(audio.playProject(beat)).then(()=>{if(!disposed)updateTransport();});updateTransport();});
 controls.pause.addEventListener('click',()=>{audio.pause();updateTransport();});
 controls.stop.addEventListener('click',()=>{audio.stop();updateTransport();});
 const tick=()=>{if(disposed)return;updateTransport();frame=requestFrame?.(tick);};
 render();if(initialProject)selectProject(initialProject);else openDialog();
 frame=requestFrame?.(tick);
 return {
  openProject:selectProject,
  focus(){if(dialog)pcFocusable(dialog)[0]?.focus();},
  update(){if(stateSignature()!==signature)render();else{updateSummary();updateTransport();}},
  dispose(){disposed=true;if(frame!==null)cancelFrame?.(frame);closeDialog({restore:false});audio.stop();root.replaceChildren();}
 };
}
