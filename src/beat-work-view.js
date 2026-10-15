import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=42';
import {BEAT_STAGES} from './beat-catalog.js?rev=42';
import {LYRIC_STAGES} from './lyric-production.js?rev=42';
import {VOCAL_STAGES} from './vocal-production.js?rev=42';
const trainingLevel=value=>Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
const formatLevel=value=>trainingLevel(value).toFixed(2);

export function createBeatWorkPanel(document,{onCancel=()=>{},onEnableAudio=()=>{}}={}){
 const root=el(document,'section',{className:'beat-work-hud',attributes:{'aria-label':'Работа над битом'}}),nodes={};
 const node=(role,tag,className)=>nodes[role]=el(document,tag,{className,dataset:{workRole:role}});
 const head=el(document,'div',{className:'beat-work-head'}),title=node('title','h2'),stage=node('stage','span','beat-work-stage'),time=node('time','span','beat-work-time');
 head.append(stage,time,title);
 const overall=node('overall','progress');overall.max=1;overall.setAttribute('aria-label','Общая готовность');
 const overallLabel=node('overall-label','span','beat-work-overall-label');
 const progress=node('progress','progress');progress.max=1;progress.setAttribute('aria-label','Работа над битом');
 const details=el(document,'div',{className:'beat-work-details'}),skill=node('skill','span'),reward=node('reward','strong','beat-work-reward');reward.hidden=true;
 details.append(reward,node('minutes','span'));
 const training=el(document,'div',{className:'beat-work-training'});
 const row=el(document,'label',{className:'beat-work-training-row'}),bar=node('skill-progress','meter','beat-work-skill-meter');bar.min=0;bar.max=100;bar.setAttribute('aria-label','Битмейкинг');
 row.append(skill,node('skill-gain','span','beat-work-skill-gain'),bar);training.append(row);
 const genreRow=el(document,'label',{className:'beat-work-training-row'}),genreLabel=node('genre','span'),genreGain=node('genre-gain','span','beat-work-skill-gain'),genreBar=node('genre-progress','meter','beat-work-skill-meter');
 genreRow.append(genreLabel,genreGain,genreBar);
 const needs=el(document,'div',{className:'beat-work-needs'});
 for(const [key,label]of [['satiety','Сытость'],['energy','Энергия']]){
  const row=el(document,'label'),bar=node(key,'meter');bar.min=0;bar.max=100;bar.low=25;bar.high=70;bar.optimum=100;bar.setAttribute('aria-label',label);
  row.append(el(document,'span',{text:label}),bar,node(key+'-value','span'));needs.append(row);
 }
 const foot=el(document,'div',{className:'beat-work-foot'}),audioStatus=node('audio','span','beat-work-audio'),enable=button(document,'Включить звук',{},onEnableAudio),cancel=button(document,'Прервать работу',{},onCancel);
 foot.append(audioStatus,enable,cancel);root.append(head,overallLabel,overall,progress,details,training,needs,foot);
 return {element:root,update({beat,job,recordingShot,chainProgress,needs:values={},skill:level=0,genreProgress,clockLabel='',reward:earned=0,finished=false,audioError='',needsGesture=false}={}){
  const recordingScreen=recordingShot?.phase==='screen';
  root.dataset.recordingPhase=recordingShot?.phase??'';
  root.style.zIndex=recordingScreen?'45':'';root.style.left=recordingScreen?'auto':'';root.style.right=recordingScreen?'24px':'';
  details.hidden=needs.hidden=recordingScreen;
  overall.hidden=overallLabel.hidden=!chainProgress;overall.value=chainProgress?.overall??0;
  overallLabel.textContent='Общая готовность · '+Math.round(overall.value*100)+'% · '+((chainProgress?.index??0)+1)+' / 3';
  const writing=beat?.kind==='lyrics',stages=writing?LYRIC_STAGES:BEAT_STAGES,extra=writing&&job?.kind!=='stage'?({diss:'Диссовая часть',story:'Сюжетный куплет',chorus:'Припев',adapt:'Адаптация под бит',refine:'Доработка текста'})[job?.kind]:null;
  const vocal=job?.output?.draft?VOCAL_STAGES[job.kind]:null;
  title.textContent=beat?.name??'Работа над битом';stage.textContent=vocal?.name??extra??('ЭТАП '+((job?.stage??0)+1)+' / 3 · '+(stages[job?.stage??0]?.name??'Работа'));
  root.setAttribute('aria-label',writing?'Работа над текстом':'Работа над битом');progress.setAttribute('aria-label',writing?'Работа над текстом':'Работа над битом');
  if(vocal){root.setAttribute('aria-label',vocal.name);progress.setAttribute('aria-label',vocal.name);}
  time.textContent=clockLabel;progress.value=Math.min(1,Math.max(0,(job?.elapsed??0)/(job?.total||1)));
  const complete=finished||earned>0,label=writing?'Письмо':vocal?(vocal.skill==='flow'?'Флоу':'Звук'):'Битмейкинг';
  const value=trainingLevel(level),next=Math.min(100,Math.floor(value)+1),hint=value===100?'максимум':'до '+next;
  bar.min=Math.min(99,Math.floor(value));bar.max=next;bar.value=value;
  bar.setAttribute('aria-label',label);bar.setAttribute('aria-valuetext','Уровень '+formatLevel(value)+' из 100 · '+hint);
  skill.textContent=label+' '+formatLevel(value)+' · '+hint;
  nodes['skill-gain'].textContent='+'+formatLevel(value-trainingLevel(job?.skill??level))+' за этап';
  if(genreProgress&&!writing&&!vocal){
   if(!genreRow.parentNode)training.append(genreRow);
   const xp=trainingLevel(genreProgress.xp),cap=genreProgress.cap===100?100:75;
   genreBar.min=Math.min(cap-1,Math.floor(xp));genreBar.max=Math.min(cap,Math.floor(xp)+1);genreBar.value=xp;
   genreBar.setAttribute('aria-label','Жанр '+genreProgress.name);genreBar.setAttribute('aria-valuetext',xp.toFixed(2)+' из '+cap);
   genreLabel.textContent=genreProgress.name+' '+xp.toFixed(2)+' / '+cap;
   genreGain.textContent='+'+formatLevel(xp-trainingLevel(job?.genreSkill??xp))+' за этап';
  }else genreRow.remove();
  reward.hidden=!complete;reward.textContent=complete?(earned>0?'Практика +'+formatLevel(earned)+' · этап завершён':'Этап завершён · навык на максимуме'):'';
  nodes.minutes.textContent=Math.floor(job?.elapsed??0)+' / '+(job?.total??0)+' мин';
  for(const key of ['satiety','energy']){const value=Math.max(0,Math.min(100,values[key]??0));nodes[key].value=value;nodes[key+'-value'].textContent=String(Math.round(value));}
  audioStatus.textContent=audioError||(needsGesture?'Звук приостановлен':writing?'Слышно, как герой печатает на клавиатуре':vocal?'Бит и вокал · '+vocal.name:'Сейчас звучит партия этого этапа');
  enable.hidden=!needsGesture&&!audioError;cancel.hidden=complete;
  const studying=beat?.kind==='study'||job?.kind==='study';training.hidden=studying||recordingScreen;
  if(studying){title.textContent=beat?.name??'Изучение трека';stage.textContent='ИЗУЧЕНИЕ · '+(job?.total??45)+' игровых минут';const studyLabel={battle:'Изучение баттла',round:'Изучение раунда',judge:'Изучение судьи',opponent:'Изучение соперника'}[job?.kind]??'Изучение трека';root.setAttribute('aria-label',studyLabel);progress.setAttribute('aria-label',studyLabel);genreRow.remove();reward.hidden=!finished;reward.textContent=finished?'Разбор сохранён'+(earned>0?' · новый источник наслушанности':''):'';audioStatus.textContent='Герой изучает опубликованные материалы';enable.hidden=true;}
 },dispose(){root.remove();}};
}
