import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=21';
import {canVocalStage,effectiveVocalSkill,VOCAL_STAGES,recordingQuality} from './vocal-production.js?rev=35';
export function appendRecordingControls({document:d,beat,state,skills={},workflow,panel,onPickText,onStart}){
 const recording=beat.recording,job=state.recording?.job,current=job?.beatId===beat.id?job:null;
 const busy=Boolean(state.music.job||state.writing?.job||job&&!current),texts=state.projects.filter(p=>p.kind==='lyrics'&&p.status==='ready');
 const section=el(d,'section',{className:'ft-vocal-analysis',dataset:{ftRole:'vocal-analysis'}});
 section.append(el(d,'h3',{text:'ЗАПИСЬ ВОКАЛА'}));
 let decisions;
 if(effectiveVocalSkill(state,skills)>=25&&!current){
  decisions=[5,5,5];const controls=el(d,'details',{className:'ft-vocal-decisions'});controls.append(el(d,'summary',{text:'Подход к записи'}));
  ['Попадание в ритм','Дикция','Подача'].forEach((name,i)=>{const row=el(d,'label'),range=el(d,'input',{type:'range',value:'5',attributes:{type:'range',min:'0',max:'10',step:'1','aria-label':name}}),label=el(d,'span',{text:name+' · 5'});range.addEventListener('input',()=>{decisions[i]=Number(range.value);label.textContent=name+' · '+range.value;});row.append(label,range);controls.append(row);});section.append(controls);
 }
 if(current){
  const resume=button(d,'Продолжить: '+VOCAL_STAGES[current.kind].name,{},()=>onStart(current.kind));resume.disabled=busy;workflow.append(resume);
  section.append(el(d,'p',{text:'Сохранено '+Math.floor(current.elapsed)+' / '+current.total+' мин. Выбранный дубль и настройки сохранены.'}));
 }else if(!recording){
  if(texts.length){const add=button(d,'Добавить вокал',{className:'ft-primary'},()=>onPickText(decisions));add.disabled=busy;workflow.append(add);}
  section.append(el(d,'p',{text:texts.length?'Готовый текст → черновая запись → необязательный чистовой дубль.':'Закончи текст в Рэпблокноте — здесь появится «Добавить вокал».'}));
 }else{
  for(const [kind,label]of [['clean','Записать чистовую'],['mix','Свести'],['master','Мастеринг']])if(canVocalStage(recording,kind)){
   const b=button(d,label,{},()=>onStart(kind,undefined,decisions));b.disabled=busy;workflow.append(b);
  }
 }
 if(recording){
  section.append(el(d,'strong',{text:(recording.clean?'Чистовая':'Черновая')+' · '+recordingQuality(recording).toFixed(1)+' / 100'}),el(d,'p',{text:'Текст: '+recording.text.name+' · версия '+recording.text.revision}),el(d,'p',{text:(recording.mix?'✓ Сведено':'○ Без сведения')+' · '+(recording.master?'✓ Мастеринг':'○ Без мастеринга')}));
  if(recording.clean)section.append(el(d,'small',{text:'Черновик выключен окончательно. Играет только чистовая запись.'}));
  else section.append(el(d,'small',{text:'Можно оставить этот дубль. Чистовая запись необязательна.'}));
 }
 section.append(el(d,'p',{className:'ft-production-note',text:'Настольный микрофон · встроенная карта. Тонкий, шипящий звук — предел стартового оборудования.'}));panel.append(section);
}
