// Notepad-style view of the persisted symbolic lyric projects.
import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=21';
import {LYRIC_STAGES,normalizeLyric,createLyric,startLyricWork,lyricBattleOptions,effectiveWritingSkill} from './lyric-production.js?rev=26';
import {normalizeBeat} from './beat-production.js?rev=26';

export function mountRapNotebook(root,{getState,getMetadata=()=>({}),onChange,onWork=()=>false}={}){
 const d=root.ownerDocument;let panel=null,modal=null,returnFocusLabel='',message='',signature='',disposed=false,controls=[];
 function openPanel(mode){returnFocusLabel=d.activeElement?.textContent??'';panel=mode;message='';render();}
 const active=()=>normalizeLyric(getState().projects.find(p=>p.id===getState().writing.activeTextId));
 const fingerprint=()=>JSON.stringify([getState().writing.activeTextId,getState().projects,getState().battleApplications,getState().writing.job?.kind,getState().writing.practice,getState().music.needs]);
 function choose(id){const s=getState();onChange({...s,writing:{...s.writing,activeTextId:id}});panel=null;message='';render();}
 function start(kind='stage',extra={}){
  const before=getState(),p=active();if(!p)return;
  const r=startLyricWork(before,{projectId:p.id,kind,gameDay:getMetadata().gameDay,sliders:controls.length?controls.map(c=>Number(c.value)):undefined,...extra},getMetadata().skills);
  if(!r.ok){message=r.reason;render();return;}
  onChange(r.state);if(!onWork()){onChange(before);message='Сначала сядь за компьютер.';}else message='';panel=null;render();
 }
 function dialog(title){const cover=el(d,'div',{className:'rn-cover'}),box=el(d,'section',{className:'rn-dialog',attributes:{role:'dialog','aria-modal':'true','aria-label':title}});box.append(el(d,'h2',{text:title}));cover.append(box);return {cover,box};}
 function newDialog(){
  const {cover,box}=dialog('Новый текст'),form=el(d,'form'),select=el(d,'select',{value:'free',attributes:{'aria-label':'Для чего пишем текст'}}),options=lyricBattleOptions(getState());
  const free=el(d,'option',{text:'Текст вне баттла',value:'free'});select.append(free);
  for(const [group,label]of [['registered','Баттлы, где ты зарегистрирован'],['other','Для другого баттла']])if(options[group].length){
   const opt=el(d,'optgroup',{attributes:{label}});box.append(el(d,'p',{className:'rn-dialog-hint',text:label}));
   for(const b of options[group])opt.append(el(d,'option',{text:b.title+' — '+b.theme,value:b.id}));select.append(opt);
  }
  const name=el(d,'input',{attributes:{'aria-label':'Название текста',placeholder:'Название трека',maxlength:'64'}});
  select.addEventListener('change',()=>{const b=[...options.registered,...options.other].find(b=>b.id===select.value);name.disabled=Boolean(b);name.value=b?.theme??'';});
  function submit(){const r=createLyric(getState(),{id:'text-'+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)),name:name.value,battleId:select.value==='free'||!select.value?null:select.value,gameDay:getMetadata().gameDay},getMetadata().skills);if(!r.ok){error.textContent=r.reason;return;}onChange(r.state);panel=null;message='';render();}
  const error=el(d,'p',{className:'rn-message',attributes:{role:'status'}});
  form.append(select,name,el(d,'p',{text:'Выбор темы не подаёт заявку на баттл. Сначала набросок, затем рифмы и образы.'}),error,button(d,'Создать текст',{},submit),button(d,'Отмена',{},()=>{panel=null;render();}));form.addEventListener('submit',e=>{e.preventDefault();submit();});box.append(form);return cover;
 }
 function listDialog(mode){
  const {cover,box}=dialog(mode==='open'?'Открыть текст':mode==='adapt'?'Адаптировать под бит':'Добавить в текст');
  if(mode==='add'){
   for(const [kind,label]of [['diss','Диссовую часть'],['story','Сюжетный куплет'],['chorus','Припев']])box.append(button(d,label,{},()=>start(kind)));
   box.append(el(d,'p',{text:'Доработка требует времени. Правила баттла остаются в силе.'}));
  }else {
   const items=getState().projects.map(mode==='open'?normalizeLyric:normalizeBeat).filter(p=>p&&(mode==='open'||p.status==='ready'));
   for(const p of items)box.append(button(d,p.name+(mode==='open'?' · v'+p.revision+' · '+p.updatedDate:' · '+p.bpm+' BPM'),{},()=>mode==='open'?choose(p.id):start('adapt',{beatId:p.id})));
   if(!items.length)box.append(el(d,'p',{text:mode==='open'?'Текстов пока нет.':'Сначала заверши бит в FT Studio.'}));
  }
  box.append(button(d,'Отмена',{},()=>{panel=null;render();}));return cover;
 }
 function render(){
  if(disposed)return;const p=active(),s=getState(),skill=effectiveWritingSkill(s,getMetadata().skills),job=s.writing.job;
  const wrap=el(d,'section',{className:'rap-notebook',attributes:{'aria-label':'Рэпблокнот'}}),toolbar=el(d,'nav',{className:'rn-toolbar'});
  toolbar.append(button(d,'Новый текст',{},()=>openPanel('new')),button(d,'Открыть текст',{},()=>openPanel('open')));
  const add=button(d,'Добавить',{},()=>openPanel('add')),adapt=button(d,'Адаптировать под бит',{},()=>openPanel('adapt'));add.disabled=adapt.disabled=!p||p.status!=='ready'||Boolean(job);toolbar.append(add,adapt);
  const tab=el(d,'div',{className:'rn-tab',text:'▤ '+(p?p.name+'.rap.txt':'Рэпблокнот — начни с чистого листа')}),body=el(d,'div',{className:'rn-body'}),sheet=el(d,'article',{className:'rn-sheet',dataset:{lyricRole:'document'},attributes:{'aria-label':'Документ текста'}}),side=el(d,'aside',{className:'rn-work'});
  controls=[];
  if(p){
   const meta=el(d,'header',{className:'rn-meta'});meta.append(el(d,'h1',{text:p.name}),el(d,'p',{text:`Версия ${p.revision} · написан ${p.createdDate} · обновлён ${p.updatedDate}`}),el(d,'p',{text:`Баттл: ${p.battleName} · Раунд: ${p.battleId?p.round:'—'} · Оппонент: ${p.battleId?p.opponent:'—'}`}));
   if(p.adaptation)meta.append(el(d,'p',{text:'Бит: '+p.adaptation.beatName+' · '+p.adaptation.bpm+' BPM'}));sheet.append(meta);
   let number=1;
   for(const section of p.sections){const part=el(d,'section',{className:'rn-section'});part.append(el(d,'h2',{text:section.title}));
    for(const line of section.lines){const row=el(d,'div',{className:'rn-line'}),words=el(d,'span',{className:'rn-words'});row.append(el(d,'span',{className:'rn-line-number',text:String(number++),attributes:{'aria-hidden':'true'}}));for(const w of line.words)words.append(el(d,'span',{className:'rn-word'+(w.error?' rn-error':''),text:w.text+' ',attributes:w.error?{title:'Неточное слово: персонаж ещё учится писать'}:{}}));row.append(words);part.append(row);}sheet.append(part);
   }
   if(!p.sections.length)sheet.append(el(d,'p',{className:'rn-empty',text:'|  Здесь появятся первые строки…'}));
   side.append(el(d,'small',{text:'РАБОТА С ТЕКСТОМ'}),el(d,'h2',{text:p.status==='ready'?'Текст готов':LYRIC_STAGES[p.stages.length].name}));
   for(let i=0;i<3;i++)side.append(el(d,'p',{className:i<p.stages.length?'rn-done':'',text:(i<p.stages.length?'✓ ':'○ ')+LYRIC_STAGES[i].name}));
   if(p.status!=='ready'&&!job&&skill>=25)for(const label of LYRIC_STAGES[p.stages.length].sliders){const field=el(d,'label',{text:label}),input=el(d,'input',{type:'range',value:5,attributes:{min:'0',max:'10',step:'1','aria-label':label}});controls.push(input);field.append(input);side.append(field);}
   if(job?.projectId===p.id)side.append(el(d,'p',{text:'Незавершённая работа сохранена: '+Math.floor(job.elapsed)+' / '+job.total+' мин.'}),button(d,'Продолжить работу',{},()=>start(job.kind,{beatId:job.beatId})));
   else if(p.status!=='ready')side.append(button(d,'Начать работу',{},()=>start()));
   else side.append(el(d,'p',{text:'Теперь можно добавить часть или подогнать строки под готовый бит. Запись вокала — следующий этап.'}));
  }else {sheet.append(el(d,'div',{className:'rn-welcome',text:'Рэпблокнот'}),el(d,'p',{className:'rn-empty',text:'Тема. Первая мысль. Первая строка. Создай текст для баттла или сохрани собственную идею.'}));side.append(el(d,'h2',{text:'Твой черновик'}),el(d,'p',{text:'Здесь герой пишет сам. Ты выбираешь направление работы; символы показывают ритм и стройность текста.'}));}
  side.append(el(d,'hr'),el(d,'p',{text:'Письмо '+skill.toFixed(2)+' / 100'}),el(d,'p',{text:'Сытость '+Math.round(s.music.needs.satiety)+' · энергия '+Math.round(s.music.needs.energy)}));
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
 render();return {update(){if(signature!==fingerprint()&&!panel)render();},openProject(p){if(normalizeLyric(p))choose(p.id);},focus(){if(modal)pcFocusable(modal)[0]?.focus();},dispose(){disposed=true;modal=null;root.replaceChildren();}};
}
