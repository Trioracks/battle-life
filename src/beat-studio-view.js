import {pcElement as el,pcButton as button,pcFind} from './virtual-pc-dom.js?rev=20';
import {createStudioWorkspace} from './ft-studio-view.js?rev=20';
import {BEAT_GENRES,BEAT_STAGES,BEAT_RULES,drumById} from './beat-catalog.js';
import {createBeat,startBeatStage,normalizeBeat,effectiveBeatSkill,workBlockReason} from './beat-production.js';

export function mountBeatStudio(root,{getState,getMetadata,onChange,onWork,audio,legacyName}){
 const d=root.ownerDocument,workspace=createStudioWorkspace(d,{projectName:legacyName});root.replaceChildren(workspace);
 const body=pcFind(workspace,n=>n.className==='ft-body'),panel=el(d,'aside',{className:'ft-production',attributes:{'aria-label':'Создание бита'}});
 body.append(panel);body.className+=' ft-producing';
 const footer=pcFind(workspace,n=>n.className==='ft-bottom');footer.replaceChildren(el(d,'span',{text:'●  FIELD TONE / ПРОИЗВОДСТВО'}),el(d,'span',{text:'Решения — игроку. Работа — персонажу.'}));
 let creating=false,signature='',message='',disposed=false;
 const summary=el(d,'p',{className:'ft-needs'});
 function change(next){onChange(next);render();}
 function play(beat){audio.play({drumId:beat.drumId,stage:beat.stages.length}).then(ok=>{if(!ok&&!disposed){message=audio.error;render();}});}
 function render(){
  if(disposed)return;const s=getState(),beat=normalizeBeat(s.projects.find(p=>p.id===s.music.activeBeatId));
  signature=JSON.stringify([s.projects,s.music.activeBeatId,s.music.owned,s.music.job?.beatId,s.music.job?.stage]);panel.replaceChildren();
  const actions=el(d,'div',{className:'ft-production-actions'});
  actions.append(button(d,'Новый бит',{},()=>{creating=true;legacyName=undefined;message='';render();}),button(d,'Проекты',{},()=>{creating=false;legacyName=undefined;const current=getState();change({...current,music:{...current.music,activeBeatId:null}});}));panel.append(actions,summary);
  if(creating||!beat){
   pcFind(workspace,n=>n.className==='ft-session').children[1].textContent=creating?'Новый бит':legacyName??'Сеанс без названия';
   pcFind(workspace,n=>n.className==='ft-tempo').children[0].textContent='—';
   const clear=n=>{if(n.className==='ft-lane-grid')n.replaceChildren();for(const child of n.children??[])clear(child);};clear(workspace);
  }
  if(creating){
   panel.append(el(d,'small',{className:'ft-eyebrow',text:'НОВАЯ РАБОТА'}),el(d,'h2',{text:'С чего начнём?'}));
   const form=el(d,'form'),name=el(d,'input',{attributes:{'aria-label':'Название бита',maxlength:'64',placeholder:'Название бита',required:'true'}}),genre=el(d,'select',{attributes:{'aria-label':'Жанр бита'}}),asset=el(d,'select',{attributes:{'aria-label':'Луп из библиотеки'}});
   for(const g of BEAT_GENRES){const option=el(d,'option',{value:g.id,text:g.name+(g.available?'':' — ждём аудиобанк')});option.disabled=!g.available;genre.append(option);}genre.value='boombap';
   asset.append(el(d,'option',{value:'',text:'Автовыбор по навыку'}));for(const a of s.music.owned)asset.append(el(d,'option',{value:a.id,text:drumById(a.id).name+' · получен'}));asset.value='';
   const create=()=>{const r=createBeat(getState(),{id:globalThis.crypto?.randomUUID?.()??'beat-'+Date.now(),name:name.value,genre:genre.value,assetId:asset.value},getMetadata().skills);message=r.reason;if(r.ok){creating=false;change(r.state);}else{notice.textContent=message;}};
   const notice=el(d,'p',{className:'ft-production-note',attributes:{role:'status'}});
   form.append(el(d,'label',{text:'Название'}),name,el(d,'label',{text:'Жанр'}),genre,el(d,'label',{text:'Ритмический источник'}),asset,el(d,'p',{className:'ft-production-note',text:'Темп назначает банк: 90 BPM. Free открывается с битмейкинга 40. Выбранный купленный луп останется в результате.'}),button(d,'Начать проект',{className:'ft-primary'},create),notice);form.addEventListener('submit',e=>{e.preventDefault();create();});panel.append(form);
  }else if(beat){
   pcFind(workspace,n=>n.className==='ft-session').children[1].textContent=beat.name;
   pcFind(workspace,n=>n.className==='ft-tempo').children[0].textContent=String(beat.bpm);
   const stage=beat.stages.length,job=s.music.job?.beatId===beat.id?s.music.job:null;
   panel.append(el(d,'small',{className:'ft-eyebrow',text:stage===3?'РАБОТА ЗАВЕРШЕНА':`ЭТАП ${stage+1} / 3`}),el(d,'h2',{text:stage===3?beat.name:BEAT_STAGES[stage].name}),el(d,'p',{className:'ft-source',text:'Источник: '+(drumById(beat.drumId)?.name??'Первые шаги / простой ритм')}));
   const steps=el(d,'ol',{className:'ft-stage-list'});BEAT_STAGES.forEach((item,i)=>steps.append(el(d,'li',{text:(i<stage?'✓ ':i===stage?'→ ':'○ ')+item.name,dataset:{complete:String(i<stage)}})));panel.append(steps);
   if(stage<3){
    const values=job?.sliders??[5,5,5];
    BEAT_STAGES[stage].sliders.forEach((title,i)=>{const label=el(d,'label',{className:'ft-slider'}),value=el(d,'output',{text:String(values[i])}),input=el(d,'input',{type:'range',value:String(values[i]),attributes:{min:'0',max:'10',step:'1','aria-label':title}});input.disabled=Boolean(job);input.addEventListener('input',()=>{values[i]=Number(input.value);value.textContent=input.value;});label.append(el(d,'span',{text:title}),value,input);panel.append(label);});
    panel.append(el(d,'p',{className:'ft-production-note',text:'Это акценты замысла, не громкость. Больше — не всегда лучше. Качество зависит от навыка и сочетания решений.'}));
    if(job)panel.append(el(d,'p',{text:`Сохранено ${Math.floor(job.elapsed)} из ${job.total} мин. Можно продолжить.`}));
    const blocked=workBlockReason(s);if(blocked)panel.append(el(d,'p',{className:'ft-warning',text:blocked}));
    panel.append(button(d,job?'Продолжить этап':'Работать над этапом',{className:'ft-primary'},()=>{
     const r=startBeatStage(getState(),beat.id,values,getMetadata().skills);message=r.reason;
     if(r.ok){audio.stop();onChange(r.state);if(onWork?.()===false)message='Работа сохранена. Вернись к ПК и продолжи этап.';}render();
    }));
   }else{
    const quality=Math.round(beat.stages.reduce((n,v)=>n+v.quality,0)/3);
    panel.append(el(d,'small',{className:'ft-eyebrow',text:'Впечатление героя'}),el(d,'div',{className:'ft-score',text:quality<40?'Первые шаги':quality<70?'Есть основа':'Звучит уверенно'}),el(d,'p',{text:quality<40?'Пока сыровато. Практика уже засчитана.':quality<70?'Кажется, получилось. Хочется попробовать ещё.':'Мне нравится. Можно двигаться дальше.'}),el(d,'p',{className:'ft-production-note',text:'Это впечатление персонажа, не оценка судей. Бит сохранён. Текст и запись голоса появятся позже.'}));
   }
   if(stage>0){panel.append(button(d,'Слушать результат',{},()=>play(beat)),button(d,'Стоп',{},()=>audio.stop()));}
   panel.append(el(d,'p',{className:'ft-production-note',text:'Мелодия и бас — временные авторские заглушки. Твои MP3 используются в барабанной дорожке.'}));
   const lanes=[];const collect=n=>{if(n.className==='ft-lane-grid')lanes.push(n);for(const child of n.children??[])collect(child);};collect(workspace);
   lanes.forEach((lane,i)=>{lane.replaceChildren();if(i<stage)lane.append(el(d,'span',{className:'ft-audio-clip',text:[drumById(beat.drumId)?.name??'Первый ритм','Тема / A minor · временно','Бас / аранжировка · временно'][i]}));});
  }else{
   panel.append(el(d,'small',{className:'ft-eyebrow',text:'ТВОЯ ДОМАШНЯЯ СТУДИЯ'}),el(d,'h2',{text:'Мои работы'}));
   const projects=s.projects.map(normalizeBeat).filter(Boolean);
   if(!projects.length)panel.append(el(d,'p',{className:'ft-production-note',text:'Назови первый бит. Персонаж сам возьмётся за ритм, музыкальную основу и аранжировку.'}));
   for(const p of projects)panel.append(button(d,p.name+' · '+(p.status==='ready'?'готов':`${p.stages.length}/3`),{className:'ft-project-item'},()=>change({...getState(),music:{...getState().music,activeBeatId:p.id}})));
   if(legacyName)panel.append(el(d,'p',{text:'Открыт прежний проект: '+legacyName+'. Старые данные сохранены без изменений.'}));
  }
  if(message)panel.append(el(d,'p',{className:'ft-warning',text:message,attributes:{role:'status'}}));updateSummary();
 }
 function updateSummary(){const s=getState();summary.textContent=`Навык ${effectiveBeatSkill(s,getMetadata().skills)} · сытость ${Math.round(s.music.needs.satiety)} · энергия ${Math.round(s.music.needs.energy)}${s.music.infected?' · ⚠ вирус замедляет ПК':''}`;}
 render();return {openProject(project){creating=false;legacyName=project.kind==='beat'?undefined:project.name;message='';audio.stop();render();},update(){const s=getState(),sig=JSON.stringify([s.projects,s.music.activeBeatId,s.music.owned,s.music.job?.beatId,s.music.job?.stage]);if(sig!==signature)render();else updateSummary();},dispose(){disposed=true;audio.stop();root.replaceChildren();}};
}
