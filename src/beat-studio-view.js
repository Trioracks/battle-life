import {pcElement as el,pcButton as button,pcFind,pcFocusable} from './virtual-pc-dom.js?rev=58';
import {createStudioWorkspace,FT_TRACKS,renderStudioTracks} from './ft-studio-view.js?rev=58';
import {BEAT_STAGES,RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=58';
import {randomBeatName,distinctProjectName} from './beat-names.js?rev=58';
import {mountProjectPicker} from './project-picker-view.js?rev=58';
import {latestReadyLyrics} from './lyric-production.js?rev=58';
import {resolveBeatPlayback} from './beat-playback.js?rev=58';
import {describeBeatMix} from './beat-mix.js?rev=58';
import {createBeat,startBeatStage,normalizeBeat,effectiveBeatSkill,workBlockReason} from './beat-production.js?rev=58';
import {startVocalWork} from './vocal-production.js?rev=58';
import {startCreativeChain,pauseCreativeChain,creativeChainProgress} from './creative-workflow.js?rev=58';
import {appendRecordingControls} from './recording-studio-view.js?rev=58';
import {normalizeGenreProgression,genreOptions,genreById,genreCap,chooseGenre,chooseSpecialization} from './genre-progression.js?rev=58';
import {mountPcFilePicker} from './pc-file-picker-view.js?rev=58';
import {pcFileById,savePcDocument,openPcDocument} from './pc-filesystem.js?rev=58';
import {documentSession,documentIsDirty} from './pc-document-session.js?rev=58';
import {createDocumentGuard} from './pc-document-guard.js?rev=58';
import {importAudioBacking} from './pc-audio-import.js?rev=58';
import {mountAudioExport} from './pc-audio-export-view.js?rev=58';

export function mountBeatStudio(root,{getState,getMetadata,onChange,onCommit=onChange,onWork,audio,legacyName,initialProject}){
 const d=root.ownerDocument,workspace=createStudioWorkspace(d,{projectName:legacyName});root.replaceChildren(workspace);
 const find=role=>pcFind(workspace,n=>n.dataset?.ftRole===role);
 const body=pcFind(workspace,n=>n.className==='ft-body'),panel=el(d,'aside',{className:'ft-production',dataset:{ftRole:'analytics'},attributes:{'aria-label':'Анализ проекта'}});
 body.append(panel);body.className+=' ft-producing';
 const actions=find('project-actions'),workflow=find('workflow');
 const exportButton=button(d,'Экспорт',{},()=>openDialog('export'));
 actions.append(button(d,'Новый проект',{},()=>replaceProject('new')),button(d,'Открыть проект',{},()=>replaceProject('projects')),button(d,'Сохранить',{},()=>saveDocument()),button(d,'Сохранить как',{},()=>openFilePicker('save')),button(d,'Импорт аудио',{},()=>replaceProject('import')),exportButton);
 const genreButton=button(d,'Жанры',{},()=>openDialog('genres'));
 const footer=pcFind(workspace,n=>n.className==='ft-bottom');footer.replaceChildren(el(d,'span',{text:'●  FIELD TONE / HOME STUDIO'}),el(d,'span',{text:'Три этапа. Твой первый звук.'}),el(d,'span',{text:'44.1 kHz / 16 bit'}));
 const summary=el(d,'p',{className:'ft-needs'}),session=pcFind(workspace,n=>n.className==='ft-session').children[1],tempo=pcFind(workspace,n=>n.className==='ft-tempo').children[0];
 const readout=pcFind(workspace,n=>n.className==='ft-readout').children[1],transport=find('transport'),playhead=find('playhead'),status=find('transport-status');
 const controls=Object.fromEntries(['play','pause','stop'].map(key=>[key,pcFind(transport,n=>n.dataset?.ftAction===key)]));
 let filePicker=null,saveContinuation=null;
 const guard=createDocumentGuard(workspace,{appId:'ft-studio',getState,onCommit,onSave:saveDocument});
 let signature=[],message='',disposed=false,dialog=null,exportView=null,returnFocus=null,frame=null,sessionSelected=false,visible=true;
 const win=d.defaultView??globalThis,requestFrame=win.requestAnimationFrame?.bind(win),cancelFrame=win.cancelAnimationFrame?.bind(win);
 let beatSource,beatCache;
 const currentBeat=()=>{const s=getState(),source=sessionSelected?s.projects.find(p=>p.id===s.music.activeBeatId):null;if(source!==beatSource){beatSource=source;beatCache=normalizeBeat(source);}return beatCache;};
 // State has crossed load/command validation. Published project/plan references
 // change on commands; clock and needs updates retain those references.
 const stateSignature=()=>{const s=getState();return [s.projects,s.music.activeBeatId,s.music.job?.beatId,s.music.job?.stage,Math.floor(s.music.job?.elapsed??0),s.recording?.job?.beatId,s.recording?.job?.kind,s.creativeWork?.items,s.exportJob,s.audioExports,s.retiredSourceWork,s.music.genres,effectiveBeatSkill(s,getMetadata().skills),getMetadata().skills?.sound];};
 const sameInputs=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
 let vocalDecisions;
 function startRecording(kind,textId,sliders){
  const beat=currentBeat();if(!beat)return;
  const r=startVocalWork(getState(),{beatId:beat.id,kind,textId,sliders},getMetadata().skills);message=r.reason??'';
  if(r.ok){closeDialog({restore:false});if(audio.capabilities?.recordedPlayback!==false)Promise.resolve(audio.unlock?.()).catch(()=>{});audio.stop();onChange(r.state);if(onWork?.()===false)message='Запись сохранена. Вернись к ПК, чтобы продолжить.';}render();
 }
 function change(next){onChange(next);render();}
 function closeDialog({restore=true}={}){
  exportView?.dispose();exportView=null;filePicker?.dispose();filePicker=null;
  dialog?.remove();dialog=null;
  for(const child of workspace.children)child.inert=false;
  if(restore){(returnFocus?.isConnected?returnFocus:pcFocusable(actions)[0])?.focus();returnFocus=null;}
 }
 function commitDocument(result){if(!result.ok)return result;if(onCommit(result.state)===false)return {ok:false,reason:'Не удалось сохранить файл. Повтори попытку.'};message='Проект сохранён.';return {ok:true};}
 function boundFile(){const binding=documentSession(getState(),'ft-studio');return binding.projectId===currentBeat()?.id?pcFileById(getState(),binding.fileId):null;}
 function saveDocument(continuation=null){
  if(!currentBeat()){continuation?.onCancel?.();return;}
  if(!boundFile()){saveContinuation=continuation;openFilePicker('save');return;}
  const r=commitDocument(savePcDocument(getState(),{projectId:currentBeat().id,fileId:boundFile().id,nowMinute:getMetadata().gameMinutes??getState().lastGameMinute??0}));message=r.reason??'Проект сохранён.';render();if(r.ok)continuation?.onSaved?.();else continuation?.onCancel?.();
 }
 function replaceProject(mode){if(!currentBeat()){mode==='new'?openDialog('new'):openFilePicker(mode);return;}guard.request({onClose:()=>mode==='new'?openDialog('new'):openFilePicker(mode)});}
 function openFilePicker(mode){
  returnFocus??=d.activeElement;closeDialog({restore:false});dialog=el(d,'div',{className:'ft-dialog-backdrop'});workspace.append(dialog);
  const cancel=()=>{const continuation=saveContinuation;saveContinuation=null;closeDialog();continuation?.onCancel?.();};
  filePicker=mountPcFilePicker(dialog,{getState,mode:mode==='save'?'save':'open',types:mode==='import'?['wav','mp3']:[ 'flp' ],initialFolderId:mode==='import'?'downloads':boundFile()?.folderId??'projects',suggestedName:boundFile()?.filename??(currentBeat()?.name??'Проект')+'.flp',onChange:onCommit,onCancel:cancel,onSelect:value=>{
   const r=mode==='save'?savePcDocument(getState(),{projectId:currentBeat()?.id,folderId:value.folderId,filename:value.filename,fileId:value.overwriteFileId,overwrite:Boolean(value.overwriteFileId),nowMinute:getMetadata().gameMinutes??0}):mode==='import'?importAudioBacking(getState(),{fileId:value,projectId:'backing-'+(globalThis.crypto?.randomUUID?.()??Date.now()),name:(pcFileById(getState(),value)?.filename??'Фонограмма').replace(/\.(wav|mp3)$/i,''),nowMinute:getMetadata().gameMinutes??0}):openPcDocument(getState(),{fileId:value,appId:'ft-studio'});
   const saved=commitDocument(r);if(!saved.ok)return saved;sessionSelected=true;if(mode!=='save'){const opened=getState().projects.find(p=>p.id===r.projectId);legacyName=opened?.kind==='beat'?undefined:opened?.name;}const continuation=saveContinuation;saveContinuation=null;closeDialog();render();continuation?.onSaved?.();return {ok:true};
  }});
 }
 function openDialog(mode='home',choice=null){
  returnFocus??=d.activeElement;closeDialog({restore:false});
  for(const child of workspace.children)child.inert=true;
  dialog=el(d,'div',{className:'ft-dialog-backdrop',dataset:{ftRole:'dialog'},attributes:{role:'dialog','aria-modal':'true','aria-label':mode==='new'?'Новый проект':mode==='projects'?'Открыть проект':'FT Studio — начало работы'}});
  const card=el(d,'section',{className:'ft-dialog-card'});
  card.append(el(d,'span',{className:'ft-eyebrow',text:'FIELD TONE / STUDIO'}),el(d,'h2',{text:mode==='new'?'Как назовём бит?':mode==='projects'?'Твои проекты':'С чего начнём?'}));
  if(mode==='export'){
   card.children[1].textContent='Экспорт аудиофайла';dialog.setAttribute('aria-label','Экспорт аудиофайла');
   exportView=mountAudioExport(card,{getState,getMetadata,projectId:currentBeat()?.id,onCommit,onClose:fileId=>{closeDialog();if(fileId){message='Аудиофайл сохранён. Открой его в «Моём компьютере».';render();}}});
  }else if(mode==='genres'){
   card.children[1].textContent='Жанры и специализация';dialog.setAttribute('aria-label','Жанры и специализация');
   const g=normalizeGenreProgression(getState().music.genres),skill=effectiveBeatSkill(getState(),getMetadata().skills),options=genreOptions(g,skill);
   card.append(el(d,'p',{text:'Битмейкинг '+skill.toFixed(2)+' · свободных слотов '+options.remaining+'. Новые слоты: 25, 50, 75.'}));
   for(const id of options.available)card.append(el(d,'p',{text:genreById(id).name+' · '+g.xp[id].toFixed(2)+' / '+genreCap(g,id)+(g.primary===id?' · главная специализация':'')}));
   if(options.remaining)for(const genre of options.candidates)card.append(button(d,'Выбрать: '+genre.name,{className:'ft-project-item'},()=>openDialog('genre-confirm',{id:genre.id,primary:false})));
   if(options.canSpecialize)for(const id of options.available)card.append(button(d,'Специализация: '+genreById(id).name,{className:'ft-project-item'},()=>openDialog('genre-confirm',{id,primary:true})));
   card.append(el(d,'p',{className:'ft-production-note',text:'Абстрактный хип-хоп использует связанные авторские стемы 90 BPM. Все открытые жанры развиваются до 100.'}));
  }else if(mode==='genre-confirm'){
   card.children[1].textContent=genreById(choice.id).name;dialog.setAttribute('aria-label','Подтверждение выбора жанра');
   card.append(el(d,'p',{text:choice.primary?'Главная специализация отмечает твой основной жанр. Все открытые жанры развиваются до 100. Выбор постоянный.':'Жанр займёт один из трёх дополнительных слотов навсегда. Новый опыт начнётся с нуля.'}));
   card.append(button(d,'Подтвердить выбор',{className:'ft-primary'},()=>{
    const state=getState(),skill=effectiveBeatSkill(state,getMetadata().skills),r=(choice.primary?chooseSpecialization:chooseGenre)(state.music.genres,choice.id,skill);
    message=r.reason;closeDialog({restore:false});if(r.ok)change({...state,music:{...state.music,genres:r.value}});else render();pcFocusable(actions)[0]?.focus();
   }));
  }else if(mode==='vocals'){
   card.children[1].textContent='Текст для записи';dialog.setAttribute('aria-label','Выбрать готовый текст');
   const texts=latestReadyLyrics(getState().projects);
   mountProjectPicker(card,{items:texts,onSelect:p=>startRecording('draft',p.id,vocalDecisions),onCancel:()=>closeDialog()});
   if(!texts.length)card.append(el(d,'p',{text:'Сначала закончи текст в Рэпблокноте.'}));
  }else if(mode==='new'){
   const form=el(d,'form'),name=el(d,'input',{attributes:{'aria-label':'Название бита',maxlength:'64',placeholder:'Например, «Первый двор»',required:'true'}}),notice=el(d,'p',{className:'ft-warning',attributes:{role:'status'}});
   const options=genreOptions(getState().music.genres,effectiveBeatSkill(getState(),getMetadata().skills));let genre='experimental';
   if(options.available.length>1){
    const select=el(d,'select',{value:genre,attributes:{'aria-label':'Жанр проекта'}});
    for(const id of options.available)select.append(el(d,'option',{value:id,text:genreById(id).name}));
    select.value=genre;select.addEventListener('change',()=>{genre=select.value;});form.append(el(d,'label',{text:'Жанр проекта'}),select);
   }else form.append(el(d,'p',{text:'Жанр: Экспериментальный'}));
   const create=()=>{
    const distinct=distinctProjectName(name.value,getState().projects.filter(p=>p.kind!=='lyrics').map(p=>p.name));
    if(distinct!==name.value.trim()){notice.textContent='Такой бит уже есть. Попробуй «'+distinct+'».';return;}
    const r=createBeat(getState(),{id:globalThis.crypto?.randomUUID?.()??'beat-'+Date.now(),name:name.value,genre,gameDay:getMetadata().gameDay},getMetadata().skills);
    if(!r.ok){notice.textContent=r.reason;return;}
    sessionSelected=true;legacyName=undefined;message='';audio.stop();closeDialog({restore:false});change({...r.state,documentSessions:{version:1,...r.state.documentSessions,byApp:{...r.state.documentSessions?.byApp,'ft-studio':{projectId:r.state.music.activeBeatId,fileId:null}}}});pcFocusable(actions)[0]?.focus();
   };
   const naming=el(d,'div',{className:'ft-project-name'});
   naming.append(name,button(d,'⚄ Случайное название',{attributes:{'aria-label':'Случайное название'}},()=>{name.value=randomBeatName(getMetadata().gameDay,name.value,Math.random,getState().projects.map(p=>p.name));name.focus();}));
   form.append(el(d,'label',{text:'Название проекта'}),naming,el(d,'p',{className:'ft-production-note',text:'Начни с простого. Персонаж сам попробует собрать ритм, тему и аранжировку.'}),button(d,'Начать проект',{className:'ft-primary'},create),notice);
   form.addEventListener('submit',e=>{e.preventDefault();create();});card.append(form);
  }else if(mode==='projects'){
   const projects=getState().projects.filter(p=>p.kind!=='lyrics');
   if(!projects.length)card.append(el(d,'p',{className:'ft-production-note',text:'Пока нет сохранённых проектов.'}));
   const list=el(d,'div',{className:'ft-dialog-projects'});
   mountProjectPicker(list,{items:projects,onSelect:selectProject,onCancel:()=>closeDialog()});
   card.append(list,button(d,'Новый проект',{},()=>replaceProject('new')));
  }else{
   card.append(el(d,'p',{className:'ft-production-note',text:'Чистый лист или работа, к которой хочется вернуться.'}),button(d,'Новый проект',{className:'ft-menu-choice'},()=>openDialog('new')),button(d,'Открыть проект',{className:'ft-menu-choice'},()=>replaceProject('projects')));
  }
  if(!['projects','vocals','export'].includes(mode))card.append(button(d,mode==='home'?'Закрыть':'Отмена',{},()=>closeDialog()));
  dialog.append(card);workspace.append(dialog);
  dialog.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}
   if(event.key==='Tab'){const items=pcFocusable(dialog),i=items.indexOf(d.activeElement);event.preventDefault();event.stopPropagation();items[(i+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();}
  });
  pcFocusable(dialog)[0]?.focus();
 }
 function selectProject(project){
  if(project.recoveryIssue){message=project.recoveryIssue;closeDialog();render();return;}
  sessionSelected=true;
  closeDialog({restore:false});legacyName=project.kind==='beat'?undefined:project.name;message='';audio.stop();
  const s=pauseCreativeChain(getState());change({...s,music:{...s.music,activeBeatId:project.kind==='beat'?project.id:null}});
  pcFocusable(actions)[0]?.focus();
 }
 function render(){
  if(disposed)return;const s=getState(),beat=currentBeat();signature=stateSignature();panel.replaceChildren();workflow.replaceChildren();
  for(const child of actions.children)if(['Сохранить','Сохранить как'].includes(child.textContent))child.disabled=!beat;
  exportButton.disabled=!beat||beat.status!=='ready'||Boolean(beat.audioIssue);exportView?.update();filePicker?.update();guard.update();
  if(effectiveBeatSkill(s,getMetadata().skills)>=25){if(!genreButton.parentNode)actions.append(genreButton);}else genreButton.remove();
  panel.append(el(d,'small',{className:'ft-eyebrow',text:'АНАЛИЗ ПРОЕКТА'}),summary);
  const genres=normalizeGenreProgression(s.music.genres),genreId=beat?.genreProfile?.id??'experimental',options=genreOptions(genres,effectiveBeatSkill(s,getMetadata().skills));
  panel.append(el(d,'p',{className:'ft-production-note',dataset:{ftRole:'genre-summary'},text:(beat&&!beat.genreProfile?'Архивная экспериментальная работа · ':genreById(genreId).name+' · ')+genres.xp[genreId].toFixed(2)+' / '+genreCap(genres,genreId)}));
  if(options.remaining)panel.append(button(d,'Доступен новый жанр · '+options.remaining,{},()=>openDialog('genres')));
  if(options.canSpecialize)panel.append(button(d,'Выбрать главную специализацию',{},()=>openDialog('genres')));
  session.textContent=beat?(boundFile()?.filename??beat.name+'.flp')+(documentIsDirty(s,'ft-studio')?' *':''):legacyName??'Сеанс без названия';tempo.textContent=beat?String(beat.bpm):'—';
  renderStudioTracks(workspace,beat);
  if(beat){
   const stage=beat.stages.length,job=s.music.job?.beatId===beat.id?s.music.job:s.creativeWork?.items.find(i=>i.projectId===beat.id)?.pausedJob;
   workflow.append(el(d,'span',{className:'ft-workflow-stage',text:stage===3?'Бит готов · 3 / 3':'Этап '+(stage+1)+' / 3 · '+BEAT_STAGES[stage].name}));
   panel.append(el(d,'h2',{text:beat.name}));
   if(beat.audioIssue)panel.append(el(d,'p',{className:'ft-warning',attributes:{role:'status'},text:beat.audioIssue==='retired-source'?RETIRED_DRUM_MESSAGE:'Не найден аудиобанк проекта. Работа сохранена.'}));
   if(s.retiredSourceWork?.some(a=>a.job.beatId===beat.id))panel.append(el(d,'p',{className:'ft-production-note',text:'Незавершённая работа сохранена в архиве. Она не тратит время и не мешает создавать новые проекты.'}));
   if(stage===3&&!beat.audioIssue)appendRecordingControls({document:d,beat,state:s,skills:getMetadata().skills,workflow,panel,onStart:startRecording,onPickText:values=>{vocalDecisions=values;openDialog('vocals');}});
   const sound=describeBeatMix(beat.mix),mixPanel=el(d,'section',{className:'ft-stage-result',dataset:{ftRole:'mix-character'}});
   mixPanel.append(el(d,'h3',{text:sound.label}),el(d,'p',{text:sound.detail}));
   if(sound.skill!==undefined)mixPanel.append(el(d,'small',{text:'Звук при создании: '+sound.skill+'/100 · сохранён с проектом'}));
   panel.append(mixPanel);
   const steps=el(d,'ol',{className:'ft-stage-list'});BEAT_STAGES.forEach((item,i)=>steps.append(el(d,'li',{text:(i<stage?'✓ ':i===stage?'→ ':'○ ')+item.name,dataset:{complete:String(i<stage)}})));panel.append(steps);
   for(let i=0;i<stage;i++){
    const result=el(d,'section',{className:'ft-stage-result'});
    const layer=beat.mix?.version===2?beat.mix.layers[i]:null;
    result.append(el(d,'h3',{text:BEAT_STAGES[i].name}),el(d,'p',{text:FT_TRACKS.filter(t=>t.stage===i).map(t=>t.name).join(' · ')}),el(d,'small',{text:layer?'Результат '+layer.quality+'/110 · решения '+Math.round(layer.fit)+'% · битмейкинг '+layer.skills.beatmaking.toFixed(1)+' · звук '+layer.skills.sound.toFixed(1):beat.version===3?'Навык при работе: '+beat.stages[i].quality+'/100':'Архивный слой · исходные данные сохранены'}));panel.append(result);
   }
   if(stage<3){
    panel.append(el(d,'p',{className:'ft-production-note',text:['Начнём с пульса. Персонаж подбирает простой ритм и пробует связать ударные.','Теперь мелодия. Несколько нот, немного атмосферы — у бита появляется тема.','Собираем всё вместе: низ, переходы и небольшие детали.'][stage]}));
    if(job)panel.append(el(d,'p',{text:'Сохранено '+Math.floor(job.elapsed)+' из '+job.total+' мин. Можно продолжить.'}));
    const blocked=beat.audioIssue?'':workBlockReason(s);
    if(blocked)panel.append(el(d,'p',{className:'ft-warning',text:blocked}));
    const plans=s.creativeWork?.items.find(i=>i.projectId===beat.id)?.plans,stageSliders=[];
    const readiness=creativeChainProgress(s,beat.id),progress=el(d,'progress',{attributes:{'aria-label':'Готовность бита'}});progress.max=1;progress.value=readiness.overall;
    panel.append(el(d,'p',{text:'Общая готовность · '+Math.round(readiness.overall*100)+'%'}),progress);
    if(effectiveBeatSkill(s,getMetadata().skills)>=25){
     for(let next=stage;next<3;next++){
      const decisions=stageSliders[next]=[...(plans?.[next]?.sliders??(job?.stage===next?job.sliders:[5,5,5]))];
      const fields=el(d,'div',{className:'ft-stage-result ft-beat-decisions'});fields.append(el(d,'h3',{text:BEAT_STAGES[next].name}));
      BEAT_STAGES[next].sliders.forEach((label,i)=>{
       const row=el(d,'label'),caption=el(d,'span',{text:label+' · '+decisions[i]}),input=el(d,'input',{type:'range',value:String(decisions[i]),attributes:{type:'range',min:'0',max:'10',step:'1','aria-label':label}});
       input.disabled=Boolean(plans||job?.stage===next);input.addEventListener('input',()=>{decisions[i]=Number(input.value);caption.textContent=label+' · '+decisions[i];});row.append(caption,input);fields.append(row);
      });panel.append(fields);
     }
    }
    const work=button(d,job||plans||stage?'Продолжить работу':'Работать над битом',{className:'ft-primary'},()=>{
     const r=startCreativeChain(getState(),{kind:'beat',projectId:beat.id,stageSliders,gameDay:getMetadata().gameDay},getMetadata().skills);message=r.reason;
     if(r.ok){
      // Resume AudioContext in the click gesture, before the cinematic transition.
      if(audio.capabilities?.recordedPlayback!==false)Promise.resolve(audio.unlock?.()).catch(()=>{});audio.stop();onChange(r.state);
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
  const beat=currentBeat(),recorded=audio.capabilities?.recordedPlayback!==false,available=recorded&&!!beat?.stages.length&&!beat.audioIssue;
  const current=audio.getSnapshot?.(),expected=available?resolveBeatPlayback(beat):null;
  const snapshot=recorded&&current?.owner==='studio'&&expected?.ok&&current.key===expected.descriptor.key?current:{status:'stopped',positionSeconds:0};
  controls.play.disabled=!available||snapshot.status==='loading'||snapshot.status==='playing';
  controls.pause.disabled=!['playing','loading'].includes(snapshot.status);controls.stop.disabled=!['playing','loading','paused'].includes(snapshot.status);
  const position=snapshot.owner==='work'?0:snapshot.positionSeconds??0,beatPosition=position*90/60;
  readout.textContent=String(Math.floor(beatPosition/4)+1).padStart(2,'0')+' : '+String(Math.floor(beatPosition%4)+1).padStart(2,'0')+' : '+String(Math.floor((beatPosition%1)*1000)).padStart(3,'0');
  playhead.style.left=(position/(60/90*4*16)*100)+'%';
  status.textContent=(!recorded?audio.capabilities.reason:'')||(beat?.audioIssue?'Источник звука недоступен':snapshot.error)||({loading:'Загрузка звука…',playing:'Играет',paused:'Пауза',error:'Звук недоступен',stopped:available?'Готов к прослушиванию':'Нет готового слоя'}[snapshot.status]??'Готов');
  transport.dataset.status=snapshot.status;
 }
 controls.play.addEventListener('click',()=>{const beat=currentBeat();if(!beat||audio.capabilities?.recordedPlayback===false)return;Promise.resolve(audio.playProject(beat)).then(()=>{if(!disposed)updateTransport();});updateTransport();});
 controls.pause.addEventListener('click',()=>{audio.pause();updateTransport();});
 controls.stop.addEventListener('click',()=>{audio.stop();updateTransport();});
 const tick=()=>{frame=null;if(disposed||!visible)return;updateTransport();frame=requestFrame?.(tick)??null;};
 render();if(initialProject)selectProject(initialProject);else openDialog();
 frame=requestFrame?.(tick)??null;
 return {
  openProject:selectProject,
  requestClose(options){
   if(!currentBeat()&&documentIsDirty(getState(),'ft-studio')){const p=getState().projects.find(p=>p.id===getState().music.activeBeatId);if(normalizeBeat(p))selectProject(p);}
   return currentBeat()?guard.request(options):(options?.onClose?.(),Promise.resolve('saved'));
  },
  save:saveDocument,
  focus(){if(dialog)pcFocusable(dialog)[0]?.focus();},
  setVisible(next){visible=next;if(!visible&&frame!==null){cancelFrame?.(frame);frame=null;}else if(visible&&!disposed&&frame===null){updateTransport();frame=requestFrame?.(tick)??null;}},
  update(){if(disposed||!visible)return;if(!sameInputs(stateSignature(),signature))render();else updateSummary();},
  dispose(){guard.dispose();disposed=true;if(frame!==null)cancelFrame?.(frame);closeDialog({restore:false});audio.stop();root.replaceChildren();}
 };
}
