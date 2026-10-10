import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=21';
import {BEAT_STAGES,BEAT_GENRES} from './beat-catalog.js';
import {LYRIC_STAGES} from './lyric-production.js?rev=26';
const trainingLevel=value=>Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
const formatLevel=value=>trainingLevel(value).toFixed(2);

export function createBeatWorkPanel(document,{onCancel=()=>{},onEnableAudio=()=>{}}={}){
 const root=el(document,'section',{className:'beat-work-hud',attributes:{'aria-label':'Работа над битом'}}),nodes={};
 const node=(role,tag,className)=>nodes[role]=el(document,tag,{className,dataset:{workRole:role}});
 const head=el(document,'div',{className:'beat-work-head'}),title=node('title','h2'),stage=node('stage','span','beat-work-stage'),time=node('time','span','beat-work-time');
 head.append(stage,time,title);
 const progress=node('progress','progress');progress.max=1;progress.setAttribute('aria-label','Работа над битом');
 const details=el(document,'div',{className:'beat-work-details'}),skill=node('skill','span'),reward=node('reward','strong','beat-work-reward');reward.hidden=true;
 details.append(reward,node('minutes','span'));
 const training=el(document,'div',{className:'beat-work-training'});
 for(const [key,label]of [['skill','Битмейкинг'],['genre','Жанровая практика']]){
  const row=el(document,'label',{className:'beat-work-training-row'}),bar=node(key+'-progress','meter','beat-work-skill-meter');bar.min=0;bar.max=100;bar.setAttribute('aria-label',label);
  row.append(key==='skill'?skill:node(key,'span'),node(key+'-gain','span','beat-work-skill-gain'),bar);training.append(row);
 }
 const needs=el(document,'div',{className:'beat-work-needs'});
 for(const [key,label]of [['satiety','Сытость'],['energy','Энергия']]){
  const row=el(document,'label'),bar=node(key,'meter');bar.min=0;bar.max=100;bar.low=25;bar.high=70;bar.optimum=100;bar.setAttribute('aria-label',label);
  row.append(el(document,'span',{text:label}),bar,node(key+'-value','span'));needs.append(row);
 }
 const foot=el(document,'div',{className:'beat-work-foot'}),audioStatus=node('audio','span','beat-work-audio'),enable=button(document,'Включить звук',{},onEnableAudio),cancel=button(document,'Прервать работу',{},onCancel);
 foot.append(audioStatus,enable,cancel);root.append(head,progress,details,training,needs,foot);
 return {element:root,update({beat,job,needs:values={},skill:level=0,genrePractice=0,clockLabel='',reward:earned=0,finished=false,audioError='',needsGesture=false}={}){
  const writing=beat?.kind==='lyrics',stages=writing?LYRIC_STAGES:BEAT_STAGES,extra=writing&&job?.kind!=='stage'?({diss:'Диссовая часть',story:'Сюжетный куплет',chorus:'Припев',adapt:'Адаптация под бит'})[job?.kind]:null;
  title.textContent=beat?.name??'Работа над битом';stage.textContent=extra??('ЭТАП '+((job?.stage??0)+1)+' / 3 · '+(stages[job?.stage??0]?.name??'Работа'));
  root.setAttribute('aria-label',writing?'Работа над текстом':'Работа над битом');progress.setAttribute('aria-label',writing?'Работа над текстом':'Работа над битом');
  nodes.genre.parentElement.hidden=writing;
  time.textContent=clockLabel;progress.value=Math.min(1,Math.max(0,(job?.elapsed??0)/(job?.total||1)));
  const genreName=BEAT_GENRES.find(g=>g.id===beat?.genre)?.name??'Жанровая практика',complete=finished||earned>0;
  for(const [key,label,current,start]of [['skill',writing?'Письмо':'Битмейкинг',level,job?.skill],['genre',genreName,genrePractice,job?.genreSkill]]){
   const value=trainingLevel(current),bar=nodes[key+'-progress'],next=Math.min(100,Math.floor(value)+1),hint=value===100?'максимум':'до '+next;
   bar.min=Math.min(99,Math.floor(value));bar.max=next;bar.value=value;
   bar.setAttribute('aria-label',label);bar.setAttribute('aria-valuetext','Уровень '+formatLevel(value)+' из 100 · '+hint);
   nodes[key].textContent=label+' '+formatLevel(value)+' · '+hint;
   nodes[key+'-gain'].textContent='+'+formatLevel(value-trainingLevel(start??current))+' за этап';
  }
  reward.hidden=!complete;reward.textContent=complete?(earned>0?'Практика +'+formatLevel(earned)+' · этап завершён':'Этап завершён · навык на максимуме'):'';
  nodes.minutes.textContent=Math.floor(job?.elapsed??0)+' / '+(job?.total??0)+' мин';
  for(const key of ['satiety','energy']){const value=Math.max(0,Math.min(100,values[key]??0));nodes[key].value=value;nodes[key+'-value'].textContent=String(Math.round(value));}
  audioStatus.textContent=audioError||(needsGesture?'Звук приостановлен':writing?'Слышно, как герой печатает на клавиатуре':'Сейчас звучит партия этого этапа');
  enable.hidden=!needsGesture&&!audioError;cancel.hidden=complete;
 },dispose(){root.remove();}};
}
