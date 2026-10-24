// Notepad-style view of the persisted symbolic lyric projects.
import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=61';
import {LYRIC_STAGES,normalizeLyric,createLyric,startLyricWork,lyricBattleOptions,effectiveWritingSkill,canEditLyricContentMix,setLyricContentMix,lyricRefinementReason} from './lyric-production.js?rev=61';
import {randomBeatName} from './beat-names.js?rev=61';
import {mountProjectPicker} from './project-picker-view.js?rev=61';
import {normalizeBeat} from './beat-production.js?rev=61';
import {startCreativeChain,pauseCreativeChain,creativeChainProgress} from './creative-workflow.js?rev=61';
import {savePcDocument,openPcDocument,pcFileById} from './pc-filesystem.js?rev=61';
import {documentSession,documentIsDirty} from './pc-document-session.js?rev=61';
import {mountPcFilePicker} from './pc-file-picker-view.js?rev=61';
import {explorerPaths} from './virtual-pc-explorer.js?rev=61';
import {createDocumentGuard} from './pc-document-guard.js?rev=61';
import {battleDocumentName} from './battle-document-name.js?rev=61';
import {notebookIcon} from './rap-notebook-icons.js?rev=61';

export function mountRapNotebook(root,{getState,getMetadata=()=>({}),onChange,onCommit=onChange,onWork=()=>false}={}){
 const d=root.ownerDocument;let panel=null,modal=null,filePicker=null,returnFocusLabel='',message='',saveMessage='Черновик не сохранён в файл',saveFailed=false,signature=[],disposed=false,controls=[],needsLabel=null;
 let saveContinuation=null;const guard=createDocumentGuard(root,{appId:'rap-notebook',getState,onCommit,onSave:save});
 function replaceDocument(mode){guard.request({onClose:()=>openPanel(mode)});}
 function openPanel(mode){returnFocusLabel=d.activeElement?.getAttribute('aria-label')??d.activeElement?.textContent??'';panel=mode;message='';render();}
 const active=()=>normalizeLyric(getState().projects.find(p=>p.id===getState().writing.activeTextId));
 const fingerprint=()=>{const s=getState(),selected=s.projects.find(p=>p.id===s.writing.activeTextId);return [s.writing.activeTextId,s.projects,selected?.stages,selected?.stages?.length,s.battleApplications,s.writing.job?.projectId,s.writing.job?.kind,s.writing.job?.stage,Math.floor(s.writing.job?.elapsed??0),Boolean(s.music.job),Boolean(s.recording?.job),s.writing.practice,s.creativeWork?.items,effectiveWritingSkill(s,getMetadata().skills)];};
 const sameInputs=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
 function updateNeeds(){const needs=getState().music.needs,text='Сытость '+Math.round(needs.satiety)+' · энергия '+Math.round(needs.energy);if(needsLabel&&needsLabel.textContent!==text)needsLabel.textContent=text;}
 function choose(id){const s=pauseCreativeChain(getState());persist({...s,writing:{...s.writing,activeTextId:id}});panel=null;message='';render();}
 function persist(next){saveFailed=onChange(next)===false;saveMessage=saveFailed?'Ошибка сохранения':'Изменения в черновике';return !saveFailed;}
 const boundFile=()=>{const s=documentSession(getState(),'rap-notebook');return s.projectId===active()?.id?pcFileById(getState(),s.fileId):null;};
 function commitFile(result){if(!result.ok)return result;saveFailed=onCommit(result.state)===false;if(saveFailed){saveMessage='Ошибка сохранения';return {ok:false,reason:'Не удалось сохранить файл. Повтори попытку.'};}saveMessage='Файл сохранён';message='Текст сохранён.';return {ok:true};}
 function save(continuation=null){const p=active();if(!p){continuation?.onCancel?.();return;}if(!boundFile()){saveContinuation=continuation;openPanel('save');return;}const r=commitFile(savePcDocument(getState(),{projectId:p.id,fileId:boundFile().id,nowMinute:getMetadata().gameMinutes??getState().lastGameMinute??0}));message=r.ok?'Текст сохранён.':r.reason;render();if(r.ok)continuation?.onSaved?.();else continuation?.onCancel?.();}
 function start(kind='stage',extra={}){
  const before=getState(),p=active();if(!p)return;
  const stageSliders=[];for(const c of controls)stageSliders[c.stage]=c.inputs.map(input=>Number(input.value));
  const r=kind==='stage'?startCreativeChain(before,{kind:'lyrics',projectId:p.id,stageSliders,gameDay:getMetadata().gameDay},getMetadata().skills):startLyricWork(before,{projectId:p.id,kind,gameDay:getMetadata().gameDay,...extra},getMetadata().skills);
  if(!r.ok){message=r.reason;render();return;}
  persist(r.state);if(!onWork()){persist(before);message='Сначала сядь за компьютер.';}else message='';panel=null;render();
 }
 function dialog(title){const cover=el(d,'div',{className:'rn-cover'}),box=el(d,'section',{className:'rn-dialog',attributes:{role:'dialog','aria-modal':'true','aria-label':title}});box.append(el(d,'h2',{text:title}));cover.append(box);return {cover,box};}
 function newDialog(){
  const {cover,box}=dialog('Новый текст'),form=el(d,'form'),select=el(d,'select',{value:'free',attributes:{'aria-label':'Для чего пишем текст'}}),options=lyricBattleOptions(getState());
  const free=el(d,'option',{text:'Вне баттла',value:'free'});select.append(free);select.value='free';
  for(const [group,label]of [['registered','Баттлы, где ты зарегистрирован'],['other','Для другого баттла']])if(options[group].length){
   const opt=el(d,'optgroup',{attributes:{label}});box.append(el(d,'p',{className:'rn-dialog-hint',text:label}));
   for(const b of options[group])opt.append(el(d,'option',{text:b.title+' — '+b.theme,value:b.id}));select.append(opt);
  }
  const name=el(d,'input',{attributes:{'aria-label':'Название текста',placeholder:'Название трека',maxlength:'64'}});
  const topicName=()=>{const current=lyricBattleOptions(getState()),b=[...current.registered,...current.other].find(b=>b.id===select.value);return b?battleDocumentName(b.theme,getState().projects.filter(p=>p.kind==='lyrics').map(p=>p.name)):null;};
  const random=button(d,'Случайное название',{},()=>{if(name.readOnly)return;name.value=randomBeatName(getMetadata().gameDay,name.value,Math.random,getState().projects.map(p=>p.name));name.focus();});
  select.addEventListener('change',()=>{const title=topicName();name.readOnly=Boolean(title);random.disabled=Boolean(title);if(title){name.value=title;name.setAttribute('readonly','');}else{name.value='';name.removeAttribute('readonly');}});
  function submit(){const before=getState(),r=createLyric(before,{id:'text-'+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)),name:topicName()??name.value,battleId:select.value==='free'||!select.value?null:select.value,gameDay:getMetadata().gameDay},getMetadata().skills);if(!r.ok){error.textContent=r.reason;return;}
   const id=r.state.writing.activeTextId;let next={...r.state,documentSessions:{version:1,...r.state.documentSessions,byApp:{...r.state.documentSessions?.byApp,'rap-notebook':{projectId:id,fileId:null}}}};
   const quick=effectiveWritingSkill(next,getMetadata().skills)<25;if(quick){const started=startCreativeChain(next,{kind:'lyrics',projectId:id,stageSliders:[],gameDay:getMetadata().gameDay},getMetadata().skills);if(!started.ok){error.textContent=started.reason;return;}next=started.state;}
   if(!persist(next)){error.textContent='Не удалось сохранить начало работы.';return;}panel=null;message='';if(quick&&onWork()===false){persist({...r.state,documentSessions:next.documentSessions});message='Текст создан. Сядь за компьютер, чтобы начать писать.';}render();
  }
  const error=el(d,'p',{className:'rn-message',attributes:{role:'status'}});
  form.append(select,name,random,el(d,'p',{text:'Выбор темы не подаёт заявку на баттл. Сначала набросок, затем рифмы и образы.'}),error,button(d,'Создать текст',{},submit),button(d,'Отмена',{},()=>{panel=null;render();}));form.addEventListener('submit',e=>{e.preventDefault();submit();});box.append(form);return cover;
 }
 function fileDialog(mode){const {cover,box}=dialog(mode==='open'?'Открыть текст':'Сохранить как');
  filePicker=mountPcFilePicker(box,{getState,mode,types:['txt'],initialFolderId:mode==='open'?'downloads':boundFile()?.folderId??'documents',suggestedName:boundFile()?.filename??(active()?.name??'Текст')+'.txt',onChange:next=>onCommit(next),onCancel:()=>{const continuation=saveContinuation;saveContinuation=null;panel=null;render();continuation?.onCancel?.();},onSelect:value=>{
   const result=mode==='open'?openPcDocument(getState(),{fileId:value,appId:'rap-notebook'}):savePcDocument(getState(),{projectId:active()?.id,folderId:value.folderId,filename:value.filename,fileId:value.overwriteFileId,overwrite:Boolean(value.overwriteFileId),nowMinute:getMetadata().gameMinutes??getState().lastGameMinute??0});
   const saved=commitFile(result);if(saved.ok){const continuation=saveContinuation;saveContinuation=null;panel=null;render();continuation?.onSaved?.();}return saved;
  }});return cover;
 }
 function listDialog(mode){
  const {cover,box}=dialog(mode==='open'?'Открыть текст':mode==='adapt'?'Адаптировать под бит':'Добавить в текст');
  if(mode==='add'){
   for(const [kind,label]of [['diss','Диссовую часть'],['story','Сюжетный куплет'],['chorus','Припев']])box.append(button(d,label,{},()=>start(kind)));
   box.append(el(d,'p',{text:'Доработка требует времени. Правила баттла остаются в силе.'}));
  }else {
   const items=getState().projects.map(mode==='open'?normalizeLyric:normalizeBeat).filter(p=>p&&(mode==='open'||p.status==='ready'));
   const current=active();mountProjectPicker(box,{items:items.map(p=>({...p,currentAdaptation:mode==='adapt'&&p.id===current?.adaptation?.beatId})),onSelect:p=>mode==='open'?choose(p.id):start('adapt',{beatId:p.id}),onCancel:()=>{panel=null;render();}});
   if(!items.length)box.append(el(d,'p',{text:mode==='open'?'Текстов пока нет.':'Сначала заверши бит в FT Studio.'}));
  }
  if(mode==='add')box.append(button(d,'Отмена',{},()=>{panel=null;render();}));return cover;
 }
 function render(){
  if(disposed)return;filePicker?.dispose();filePicker=null;const p=active(),s=getState(),skill=effectiveWritingSkill(s,getMetadata().skills),job=s.writing.job??s.creativeWork?.items.find(i=>i.projectId===p?.id)?.pausedJob;
  const wrap=el(d,'section',{className:'rap-notebook',attributes:{'aria-label':'Рэпблокнот'}}),header=el(d,'header',{className:'rn-app-header'}),toolbar=el(d,'nav',{className:'rn-toolbar',attributes:{'aria-label':'Файл текста'}});
  const saveButton=button(d,'Сохранить',{className:'rn-save-button',attributes:{'aria-label':'Сохранить'}},save);saveButton.disabled=!p;
  const saveAs=button(d,'Сохранить как',{attributes:{'aria-label':'Сохранить текст как'}},()=>{saveToggle.focus();openPanel('save');});saveAs.disabled=!p;
  const newButton=button(d,'Новый текст',{className:'rn-new-button',attributes:{'aria-label':'Новый текст'}},()=>replaceDocument('new')),openButton=button(d,'Открыть',{className:'rn-open-button',attributes:{'aria-label':'Открыть текст'}},()=>replaceDocument('open'));
  newButton.append(notebookIcon(d,'new'));openButton.append(notebookIcon(d,'open'));
  const tab=el(d,'div',{className:'rn-tab'}),body=el(d,'div',{className:'rn-body'}),editor=el(d,'div',{className:'rn-editor'}),sheet=el(d,'article',{className:'rn-sheet',dataset:{lyricRole:'document'},attributes:{'aria-label':'Документ текста'}}),side=el(d,'aside',{className:'rn-work',attributes:{'aria-label':'О тексте'}});
  const file=boundFile(),dirty=documentIsDirty(s,'rap-notebook');tab.append(el(d,'span',{className:'rn-file-label',text:p?(file?.filename??p.name+'.txt'):'Нет открытого текста'}),el(d,'span',{className:'rn-save-state'+(saveFailed?' rn-save-error':''),text:p?saveFailed?saveMessage:dirty?'Не сохранено':'Файл сохранён':'Создай или открой текст'}));
  const saveGroup=el(d,'div',{className:'rn-save-group'}),saveMenu=el(d,'details',{className:'rn-save-menu'}),saveToggle=el(d,'summary',{attributes:{'aria-label':'Другие варианты сохранения',title:'Сохранить как'}});saveToggle.append(notebookIcon(d,'chevron','#18231d'));saveMenu.append(saveToggle,saveAs);saveMenu.hidden=!p;saveMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();saveMenu.open=false;saveToggle.focus();}});saveGroup.append(saveButton,saveMenu);toolbar.append(newButton,openButton,tab,saveGroup);header.append(toolbar);editor.append(sheet);
  controls=[];
  if(p){
   const meta=el(d,'header',{className:'rn-meta'});meta.append(el(d,'small',{className:'rn-eyebrow',text:'ТЕКСТ · ВЕРСИЯ '+String(p.revision).padStart(2,'0')}),el(d,'h1',{text:p.name}),el(d,'p',{text:p.battleName+(p.battleId?'  /  '+(p.round==='Отбор'?'Отборочный раунд':p.round):'  /  Свободная тема')}),el(d,'p',{className:'rn-document-hint',text:'Герой пишет сам. Символы показывают ритм текста.'}));sheet.append(meta);
   let number=1;
   for(const section of p.sections){const part=el(d,'section',{className:'rn-section'});if(section.title)part.append(el(d,'h2',{text:section.title}));
    if(section.presentation==='prose'&&p.status!=='ready'){
     let paragraph=el(d,'p',{className:'rn-prose'});part.append(paragraph);
     for(const line of section.lines){if(line.gapBefore){paragraph=el(d,'p',{className:'rn-prose'});part.append(paragraph);}
      for(const w of line.words)paragraph.append(el(d,'span',{className:'rn-word'+(w.error?' rn-error':''),text:w.text+' ',attributes:w.error?{title:'Неточное слово: персонаж ещё учится писать'}:{}}));
     }sheet.append(part);continue;
    }
    for(const line of section.lines){
     const row=el(d,'div',{className:'rn-line'+(line.gapBefore?' rn-line-gap':''),dataset:{unfinished:String(line.unfinished)}}),lineBody=el(d,'div',{className:'rn-line-body',dataset:{indent:String(line.indent)}}),words=el(d,'span',{className:'rn-words'});
     row.append(el(d,'span',{className:'rn-line-number',text:String(number++).padStart(2,'0'),attributes:{'aria-hidden':'true'}}));
     for(const w of line.words)words.append(el(d,'span',{className:'rn-word'+(w.error?' rn-error':''),text:w.text+' ',attributes:w.error?{title:'Неточное слово: персонаж ещё учится писать'}:{}}));
     lineBody.append(words);if(line.note)lineBody.append(el(d,'span',{className:'rn-note',text:'// '+line.note}));row.append(lineBody);part.append(row);
    }sheet.append(part);
   }
   if(!p.sections.length)sheet.append(el(d,'p',{className:'rn-empty',text:'|  Здесь появятся первые строки…'}));
   const documentInfo=el(d,'div',{className:'rn-document-info'});documentInfo.append(el(d,'span',{text:'Строк: '+p.sections.reduce((total,section)=>total+section.lines.length,0)}));sheet.append(documentInfo);
   side.append(el(d,'small',{className:'rn-eyebrow',text:'О ТЕКСТЕ'}));
   const summary=el(d,'section',{className:'rn-stage-summary'}),summaryText=el(d,'div');summaryText.append(el(d,'h2',{text:p.status==='ready'?'Основа готова':LYRIC_STAGES[p.stages.length].name}),el(d,'p',{text:p.status==='ready'?'3 этапа завершены':p.stages.length+' из 3 этапов завершено'}));summary.append(el(d,'span',{className:'rn-stage-badge',text:p.status==='ready'?'✓':String(p.stages.length),attributes:{'aria-hidden':'true'}}),summaryText);side.append(summary);
   const stages=el(d,'ol',{className:'rn-stages',attributes:{'aria-label':'Этапы текста'}});
   for(let i=0;i<3;i++){const row=el(d,'li',{className:i<p.stages.length?'rn-done':'',attributes:{title:LYRIC_STAGES[i].name}});row.append(el(d,'span',{className:'rn-stage-number',text:'0'+(i+1),attributes:{'aria-hidden':'true'}}),el(d,'span',{text:['Набросок','Рифмы','Образы'][i]}),el(d,'span',{className:'rn-stage-mark',text:i<p.stages.length?'✓':'○',attributes:{'aria-label':i<p.stages.length?'Завершён':'Не завершён'}}));stages.append(row);}side.append(stages);
   const beat=el(d,'section',{className:'rn-beat'});beat.append(el(d,'small',{text:'ПРИВЯЗКА К БИТУ'}),el(d,'h3',{text:p.adaptation?p.adaptation.beatName:'Бит не выбран'}),el(d,'p',{text:p.adaptation?p.adaptation.bpm+' BPM · строки адаптированы':'Выбери готовый бит, чтобы подогнать под него строки.'}));side.append(beat);
   const facts=el(d,'dl',{className:'rn-facts'});for(const [label,value]of [['Создан',p.createdDate],['Обновлён',p.updatedDate],['Оппонент',p.battleId?p.opponent:'Не назначен']])facts.append(el(d,'dt',{text:label}),el(d,'dd',{text:value}));side.append(facts);
   const planned=s.creativeWork?.items.some(i=>i.projectId===p.id);
   const budget=el(d,'details',{className:'rn-content-budget',attributes:{'aria-label':'Содержание текста'}});
   const budgetSummary=el(d,'summary');budgetSummary.append(el(d,'span',{text:'Содержание'}),el(d,'span',{text:'100%'}));budget.append(budgetSummary);
   if(skill>=25&&canEditLyricContentMix(s,p)){
    budget.open=true;
    for(const [key,label]of [['topic','Тема'],['diss','Дисс'],['lyric','Лирика']]){
     const field=el(d,'label',{text:label+' '+p.contentMix[key]+'%'}),input=el(d,'input',{type:'range',value:p.contentMix[key],dataset:{contentMixKey:key},attributes:{min:'0',max:'100',step:'10','aria-label':'Доля: '+label}});
     input.addEventListener('change',()=>{const r=setLyricContentMix(getState(),{projectId:p.id,key,value:Number(input.value)},getMetadata().skills);if(r.ok)persist(r.state);else message=r.reason;render();});field.append(input);budget.append(field);
    }
   }else budget.append(el(d,'p',{text:p.contentMix?(skill<25?'Пока содержание складывается само. Доли сохраняются вместе с текстом.':`Тема ${p.contentMix.topic}% · Дисс ${p.contentMix.diss}% · Лирика ${p.contentMix.lyric}%`):'Старый текст: доли содержания неизвестны. Он не переоценивается.'}));
   side.append(budget);
   if(p.status!=='ready'&&!job&&!planned&&skill>=25)for(let stage=p.stages.length;stage<3;stage++){
    const inputs=[];side.append(el(d,'h3',{text:LYRIC_STAGES[stage].name}));
    for(const label of LYRIC_STAGES[stage].sliders){const field=el(d,'label',{text:label}),input=el(d,'input',{type:'range',value:5,attributes:{min:'0',max:'10',step:'1','aria-label':label}});inputs.push(input);field.append(input);side.append(field);}controls.push({stage,inputs});
   }
   if(p.status!=='ready'){
    const call=el(d,'div',{className:'rn-create-action'}),progress=creativeChainProgress(s,p.id),bar=el(d,'progress',{attributes:{'aria-label':'Готовность текста'}});bar.max=1;bar.value=progress.overall;
    call.append(el(d,'p',{text:'Три этапа · готово '+Math.round(progress.overall*100)+'%'}),bar,button(d,job||planned||p.stages.length?'Продолжить писать':'Начать писать',{className:'rn-primary'},()=>start()));
    if(job)call.append(el(d,'small',{text:'Этап '+(job.stage+1)+' / 3 · сохранено '+Math.floor(job.elapsed)+' / '+job.total+' мин.'}));meta.append(call);
   }else {
    const actions=el(d,'section',{className:'rn-actions',attributes:{'aria-label':'Доработка текста'}}),refinement=el(d,'div',{className:'rn-action-group'}),adaptation=el(d,'div',{className:'rn-action-group'}),reason=lyricRefinementReason(s,p,getMetadata().skills),busy=Boolean(job||s.music.job||s.recording?.job),refine=button(d,'Доработать текст',{className:'rn-primary rn-refine-button',attributes:{'aria-label':'Доработать'}},()=>start('refine')),adapt=button(d,'Адаптировать под бит',{className:'rn-adapt-button',attributes:{'aria-label':'Адаптировать под бит'}},()=>openPanel('adapt'));
    refine.disabled=Boolean(reason||busy);adapt.disabled=busy||p.adaptationCount>=3;if(reason)refine.setAttribute('title',reason);
    refine.append(notebookIcon(d,'pencil'));adapt.append(notebookIcon(d,'wave'));
    const refineCopy=el(d,'div',{className:'rn-action-copy'}),adaptCopy=el(d,'div',{className:'rn-action-copy'});refineCopy.append(el(d,'small',{text:'60 мин · до +2 к качеству'}),el(d,'small',{text:'Использовано '+p.refinementCount+' из 3 доработок'}));if(reason)refineCopy.append(el(d,'small',{className:'rn-action-reason',text:reason}));adaptCopy.append(el(d,'small',{text:'Ритм и подача'}),el(d,'small',{text:'Использовано '+p.adaptationCount+' из 3 адаптаций'}));refinement.append(refine,refineCopy);adaptation.append(adapt,adaptCopy);actions.append(el(d,'small',{className:'rn-action-heading',text:'Работа с текстом'}),refinement,adaptation);editor.append(actions);
    const extras=el(d,'div',{className:'rn-extra-actions'}),add=button(d,'Добавить',{className:'rn-add-button'},()=>openPanel('add'));add.disabled=busy;
    extras.append(add);
    if(job?.projectId===p.id)extras.append(button(d,'Продолжить работу',{},()=>start(job.kind,{beatId:job.beatId})));side.append(extras);
   }
  }else {sheet.append(el(d,'div',{className:'rn-welcome',text:'Рэпблокнот'}),el(d,'p',{className:'rn-empty',text:'Тема. Первая мысль. Первая строка. Создай текст для баттла или сохрани собственную идею.'}));side.append(el(d,'h2',{text:'Твой черновик'}),el(d,'p',{text:'Здесь герой пишет сам. Ты выбираешь направление работы; символы показывают ритм и стройность текста.'}));}
  const condition=el(d,'details',{className:'rn-condition'}),conditionSummary=el(d,'summary',{attributes:{'aria-label':'Письмо '+skill.toFixed(2)+' / 100'}});conditionSummary.append(notebookIcon(d,'bars','#8bb39d'),el(d,'span',{text:'Письмо'}),el(d,'span',{text:skill.toFixed(2)+' / 100'}));needsLabel=el(d,'p');updateNeeds();condition.append(conditionSummary,needsLabel);side.append(condition);
  if(!editor.contains(sheet))editor.append(sheet);body.append(editor,side);
  const status=el(d,'footer',{className:'rn-status',attributes:{role:'status'}});status.append(el(d,'span',{className:'rn-status-path',text:p?'Версия '+String(p.revision).padStart(2,'0')+' · '+p.sections.reduce((total,section)=>total+section.lines.length,0)+' строк':'Нет открытого текста',attributes:{title:file?(explorerPaths(s)[file.folderId]?.address??file.folderId)+'\\'+file.filename:'Не сохранён в файл'}}),el(d,'span',{className:'rn-status-message',text:message||(job?'Работа идёт · можно прервать':p?.status==='ready'?'Готов к доработке':p?'Символический текст · UTF-8':'Создай свой первый текст')}));wrap.append(header,body,status);
  const hadModal=Boolean(modal);modal=null;
  if(panel){
   for(const child of wrap.children)child.inert=true;toolbar.inert=true;
   modal=panel==='new'?newDialog():['open','save'].includes(panel)?fileDialog(panel):listDialog(panel);wrap.append(modal);
   modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();panel=null;render();return;}
    if(event.key==='Tab'){const items=pcFocusable(modal),i=items.indexOf(d.activeElement);event.preventDefault();event.stopPropagation();items[(i+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();}
   });
  }
  root.replaceChildren(wrap);guard.update();signature=fingerprint();
  if(modal)pcFocusable(modal)[0]?.focus();
  else if(hadModal){const items=pcFocusable(wrap);(items.find(n=>n.getAttribute('aria-label')===returnFocusLabel||n.textContent===returnFocusLabel)??items[0])?.focus();}
 }
 render();return {requestClose:options=>guard.request(options),save,update(){if(disposed)return;if(!panel&&!sameInputs(signature,fingerprint()))render();else{filePicker?.update();updateNeeds();}},openProject(p){if(normalizeLyric(p))choose(p.id);},focus(){if(modal)pcFocusable(modal)[0]?.focus();},dispose(){guard.dispose();disposed=true;filePicker?.dispose();modal=null;root.replaceChildren();}};
}
