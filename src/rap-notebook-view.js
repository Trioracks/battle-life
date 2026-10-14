// Notepad-style view of the persisted symbolic lyric projects.
import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=41';
import {LYRIC_STAGES,normalizeLyric,createLyric,startLyricWork,lyricBattleOptions,effectiveWritingSkill,canEditLyricContentMix,setLyricContentMix,lyricRefinementReason} from './lyric-production.js?rev=41';
import {randomBeatName} from './beat-names.js?rev=41';
import {mountProjectPicker} from './project-picker-view.js?rev=41';
import {normalizeBeat} from './beat-production.js?rev=41';
import {startCreativeChain,pauseCreativeChain,creativeChainProgress} from './creative-workflow.js?rev=41';

export function mountRapNotebook(root,{getState,getMetadata=()=>({}),onChange,onWork=()=>false}={}){
 const d=root.ownerDocument;let panel=null,modal=null,returnFocusLabel='',message='',signature=[],disposed=false,controls=[],needsLabel=null;
 function openPanel(mode){returnFocusLabel=d.activeElement?.textContent??'';panel=mode;message='';render();}
 const active=()=>normalizeLyric(getState().projects.find(p=>p.id===getState().writing.activeTextId));
 const fingerprint=()=>{const s=getState(),selected=s.projects.find(p=>p.id===s.writing.activeTextId);return [s.writing.activeTextId,s.projects,selected?.stages,selected?.stages?.length,s.battleApplications,s.writing.job?.kind,s.writing.job?.stage,Math.floor(s.writing.job?.elapsed??0),s.writing.practice,s.creativeWork?.items,effectiveWritingSkill(s,getMetadata().skills)];};
 const sameInputs=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
 function updateNeeds(){const needs=getState().music.needs;if(needsLabel)needsLabel.textContent='Сытость '+Math.round(needs.satiety)+' · энергия '+Math.round(needs.energy);}
 function choose(id){const s=pauseCreativeChain(getState());onChange({...s,writing:{...s.writing,activeTextId:id}});panel=null;message='';render();}
 function start(kind='stage',extra={}){
  const before=getState(),p=active();if(!p)return;
  const stageSliders=[];for(const c of controls)stageSliders[c.stage]=c.inputs.map(input=>Number(input.value));
  const r=kind==='stage'?startCreativeChain(before,{kind:'lyrics',projectId:p.id,stageSliders,gameDay:getMetadata().gameDay},getMetadata().skills):startLyricWork(before,{projectId:p.id,kind,gameDay:getMetadata().gameDay,...extra},getMetadata().skills);
  if(!r.ok){message=r.reason;render();return;}
  onChange(r.state);if(!onWork()){onChange(before);message='Сначала сядь за компьютер.';}else message='';panel=null;render();
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
  select.addEventListener('change',()=>{const b=[...options.registered,...options.other].find(b=>b.id===select.value);if(!name.value)name.value=b?.theme??'';});
  function submit(){const r=createLyric(getState(),{id:'text-'+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)),name:name.value,battleId:select.value==='free'||!select.value?null:select.value,gameDay:getMetadata().gameDay},getMetadata().skills);if(!r.ok){error.textContent=r.reason;return;}onChange(r.state);panel=null;message='';render();}
  const error=el(d,'p',{className:'rn-message',attributes:{role:'status'}});
  form.append(select,name,button(d,'Случайное название',{},()=>{name.value=randomBeatName(getMetadata().gameDay,name.value,Math.random,getState().projects.map(p=>p.name));name.focus();}),el(d,'p',{text:'Выбор темы не подаёт заявку на баттл. Сначала набросок, затем рифмы и образы.'}),error,button(d,'Создать текст',{},submit),button(d,'Отмена',{},()=>{panel=null;render();}));form.addEventListener('submit',e=>{e.preventDefault();submit();});box.append(form);return cover;
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
  if(disposed)return;const p=active(),s=getState(),skill=effectiveWritingSkill(s,getMetadata().skills),job=s.writing.job??s.creativeWork?.items.find(i=>i.projectId===p?.id)?.pausedJob;
  const wrap=el(d,'section',{className:'rap-notebook',attributes:{'aria-label':'Рэпблокнот'}}),toolbar=el(d,'nav',{className:'rn-toolbar'});
  toolbar.append(button(d,'Новый текст',{},()=>openPanel('new')),button(d,'Открыть текст',{},()=>openPanel('open')));
  if(p?.status==='ready'){const add=button(d,'Добавить',{},()=>openPanel('add')),adapt=button(d,'Адаптировать под бит',{},()=>openPanel('adapt'));add.disabled=Boolean(job);adapt.disabled=Boolean(job)||p.adaptationCount>=3;toolbar.append(add,adapt);}
  const tab=el(d,'div',{className:'rn-tab',text:'▤ '+(p?p.name+'.rap.txt':'Рэпблокнот — начни с чистого листа')}),body=el(d,'div',{className:'rn-body'}),sheet=el(d,'article',{className:'rn-sheet',dataset:{lyricRole:'document'},attributes:{'aria-label':'Документ текста'}}),side=el(d,'aside',{className:'rn-work'});
  controls=[];
  if(p){
   const meta=el(d,'header',{className:'rn-meta'});meta.append(el(d,'h1',{text:p.name}),el(d,'p',{text:`Версия ${p.revision} · написан ${p.createdDate} · обновлён ${p.updatedDate}`}),el(d,'p',{text:`Баттл: ${p.battleName} · Раунд: ${p.battleId?p.round:'—'} · Оппонент: ${p.battleId?p.opponent:'—'}`}));
   if(p.adaptation)meta.append(el(d,'p',{text:'Бит: '+p.adaptation.beatName+' · '+p.adaptation.bpm+' BPM'}));sheet.append(meta);
   let number=1;
   for(const section of p.sections){const part=el(d,'section',{className:'rn-section'});if(section.title)part.append(el(d,'h2',{text:section.title}));
    if(section.presentation==='prose'){
     let paragraph=el(d,'p',{className:'rn-prose'});part.append(paragraph);
     for(const line of section.lines){if(line.gapBefore){paragraph=el(d,'p',{className:'rn-prose'});part.append(paragraph);}
      for(const w of line.words)paragraph.append(el(d,'span',{className:'rn-word'+(w.error?' rn-error':''),text:w.text+' ',attributes:w.error?{title:'Неточное слово: персонаж ещё учится писать'}:{}}));
     }sheet.append(part);continue;
    }
    for(const line of section.lines){
     const row=el(d,'div',{className:'rn-line'+(line.gapBefore?' rn-line-gap':''),dataset:{unfinished:String(line.unfinished)}}),lineBody=el(d,'div',{className:'rn-line-body',dataset:{indent:String(line.indent)}}),words=el(d,'span',{className:'rn-words'});
     row.append(el(d,'span',{className:'rn-line-number',text:String(number++),attributes:{'aria-hidden':'true'}}));
     for(const w of line.words)words.append(el(d,'span',{className:'rn-word'+(w.error?' rn-error':''),text:w.text+' ',attributes:w.error?{title:'Неточное слово: персонаж ещё учится писать'}:{}}));
     lineBody.append(words);if(line.note)lineBody.append(el(d,'span',{className:'rn-note',text:'// '+line.note}));row.append(lineBody);part.append(row);
    }sheet.append(part);
   }
   if(!p.sections.length)sheet.append(el(d,'p',{className:'rn-empty',text:'|  Здесь появятся первые строки…'}));
   side.append(el(d,'small',{text:'РАБОТА С ТЕКСТОМ'}),el(d,'h2',{text:p.status==='ready'?'Основа текста готова':LYRIC_STAGES[p.stages.length].name}));
   for(let i=0;i<3;i++)side.append(el(d,'p',{className:i<p.stages.length?'rn-done':'',text:(i<p.stages.length?'✓ ':'○ ')+LYRIC_STAGES[i].name}));
   const planned=s.creativeWork?.items.some(i=>i.projectId===p.id);
   const budget=el(d,'section',{className:'rn-content-budget',attributes:{'aria-label':'Содержание текста'}});
   budget.append(el(d,'h3',{text:'Содержание · 100%'}));
   if(skill>=25&&canEditLyricContentMix(s,p)){
    for(const [key,label]of [['topic','Тема'],['diss','Дисс'],['lyric','Лирика']]){
     const field=el(d,'label',{text:label+' '+p.contentMix[key]+'%'}),input=el(d,'input',{type:'range',value:p.contentMix[key],dataset:{contentMixKey:key},attributes:{min:'0',max:'100',step:'10','aria-label':'Доля: '+label}});
     input.addEventListener('change',()=>{const r=setLyricContentMix(getState(),{projectId:p.id,key,value:Number(input.value)},getMetadata().skills);if(r.ok)onChange(r.state);else message=r.reason;render();});field.append(input);budget.append(field);
    }
   }else budget.append(el(d,'p',{text:p.contentMix?(skill<25?'Пока содержание складывается само. Доли сохраняются вместе с текстом.':`Тема ${p.contentMix.topic}% · Дисс ${p.contentMix.diss}% · Лирика ${p.contentMix.lyric}%`):'Старый текст: доли содержания неизвестны. Он не переоценивается.'}));
   if(p.status==='ready'){
    const reason=lyricRefinementReason(s,p,getMetadata().skills),refine=button(d,'Доработать',{},()=>start('refine'));
    refine.disabled=Boolean(reason||job||s.music.job||s.recording?.job);
    budget.append(el(d,'p',{text:'Доработки '+p.refinementCount+'/3 · адаптации '+p.adaptationCount+'/3. Доработка: 60 мин., до +2 качества, до 1/9 опыта создания.'}),refine);
    if(reason)budget.append(el(d,'p',{text:reason}));
   }
   side.append(budget);
   if(p.status!=='ready'&&!job&&!planned&&skill>=25)for(let stage=p.stages.length;stage<3;stage++){
    const inputs=[];side.append(el(d,'h3',{text:LYRIC_STAGES[stage].name}));
    for(const label of LYRIC_STAGES[stage].sliders){const field=el(d,'label',{text:label}),input=el(d,'input',{type:'range',value:5,attributes:{min:'0',max:'10',step:'1','aria-label':label}});inputs.push(input);field.append(input);side.append(field);}controls.push({stage,inputs});
   }
   if(p.status!=='ready'){
    const call=el(d,'div',{className:'rn-create-action'}),progress=creativeChainProgress(s,p.id),bar=el(d,'progress',{attributes:{'aria-label':'Готовность текста'}});bar.max=1;bar.value=progress.overall;
    call.append(el(d,'p',{text:'Три этапа · готово '+Math.round(progress.overall*100)+'%'}),bar,button(d,job||planned||p.stages.length?'Продолжить писать':'Начать писать',{className:'rn-primary'},()=>start()));
    if(job)call.append(el(d,'small',{text:'Этап '+(job.stage+1)+' / 3 · сохранено '+Math.floor(job.elapsed)+' / '+job.total+' мин.'}));meta.append(call);
   }else if(job?.projectId===p.id)side.append(button(d,'Продолжить работу',{},()=>start(job.kind,{beatId:job.beatId})));
   else side.append(el(d,'p',{text:'Основная структура собрана. Доработай текст или адаптируй строки под готовый бит. Запись вокала — следующий этап.'}));
  }else {sheet.append(el(d,'div',{className:'rn-welcome',text:'Рэпблокнот'}),el(d,'p',{className:'rn-empty',text:'Тема. Первая мысль. Первая строка. Создай текст для баттла или сохрани собственную идею.'}));side.append(el(d,'h2',{text:'Твой черновик'}),el(d,'p',{text:'Здесь герой пишет сам. Ты выбираешь направление работы; символы показывают ритм и стройность текста.'}));}
  needsLabel=el(d,'p');updateNeeds();side.append(el(d,'hr'),el(d,'p',{text:'Письмо '+skill.toFixed(2)+' / 100'}),needsLabel);
  body.append(sheet,side);wrap.append(toolbar,tab,body,el(d,'footer',{className:'rn-status',text:message||'UTF-8 · Символический текст · Сохраняется автоматически',attributes:{role:'status'}}));
  const hadModal=Boolean(modal);modal=null;
  if(panel){
   for(const child of wrap.children)child.inert=true;
   modal=panel==='new'?newDialog():listDialog(panel);wrap.append(modal);
   modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();panel=null;render();return;}
    if(event.key==='Tab'){const items=pcFocusable(modal),i=items.indexOf(d.activeElement);event.preventDefault();event.stopPropagation();items[(i+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();}
   });
  }
  root.replaceChildren(wrap);signature=fingerprint();
  if(modal)pcFocusable(modal)[0]?.focus();
  else if(hadModal){const items=pcFocusable(toolbar);(items.find(n=>n.textContent===returnFocusLabel)??items[0])?.focus();}
 }
 render();return {update(){if(disposed)return;if(!panel&&!sameInputs(signature,fingerprint()))render();else updateNeeds();},openProject(p){if(normalizeLyric(p))choose(p.id);},focus(){if(modal)pcFocusable(modal)[0]?.focus();},dispose(){disposed=true;modal=null;root.replaceChildren();}};
}
