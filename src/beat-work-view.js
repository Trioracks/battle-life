import {pcElement as el,pcButton as button} from './virtual-pc-dom.js';
import {BEAT_STAGES} from './beat-catalog.js';

export function createBeatWorkPanel(document,{onCancel=()=>{},onEnableAudio=()=>{}}={}){
 const root=el(document,'section',{className:'beat-work-hud',attributes:{'aria-label':'Работа над битом'}}),nodes={};
 const node=(role,tag,className)=>nodes[role]=el(document,tag,{className,dataset:{workRole:role}});
 const head=el(document,'div',{className:'beat-work-head'}),title=node('title','h2'),stage=node('stage','span','beat-work-stage'),time=node('time','span','beat-work-time');
 head.append(stage,time,title);
 const progress=node('progress','progress');progress.max=1;progress.setAttribute('aria-label','Работа над битом');
 const details=el(document,'div',{className:'beat-work-details'}),skill=node('skill','span'),reward=node('reward','strong','beat-work-reward');reward.hidden=true;
 details.append(skill,reward,node('minutes','span'));
 const needs=el(document,'div',{className:'beat-work-needs'});
 for(const [key,label]of [['satiety','Сытость'],['energy','Энергия']]){
  const row=el(document,'label'),bar=node(key,'meter');bar.min=0;bar.max=100;bar.low=25;bar.high=70;bar.optimum=100;bar.setAttribute('aria-label',label);
  row.append(el(document,'span',{text:label}),bar,node(key+'-value','span'));needs.append(row);
 }
 const foot=el(document,'div',{className:'beat-work-foot'}),audioStatus=node('audio','span','beat-work-audio'),enable=button(document,'Включить звук',{},onEnableAudio),cancel=button(document,'Прервать работу',{},onCancel);
 foot.append(audioStatus,enable,cancel);root.append(head,progress,details,needs,foot);
 return {element:root,update({beat,job,needs:values={},skill:level=0,clockLabel='',reward:earned=0,audioError='',needsGesture=false}={}){
  title.textContent=beat?.name??'Работа над битом';stage.textContent='ЭТАП '+((job?.stage??0)+1)+' / 3 · '+(BEAT_STAGES[job?.stage??0]?.name??'Работа');
  time.textContent=clockLabel;progress.value=Math.min(1,Math.max(0,(job?.elapsed??0)/(job?.total||1)));skill.textContent='Битмейкинг '+Math.round(level);
  reward.hidden=!earned;reward.textContent=earned?'Практика +'+earned+' · этап завершён':'';
  nodes.minutes.textContent=Math.floor(job?.elapsed??0)+' / '+(job?.total??0)+' мин';
  for(const key of ['satiety','energy']){const value=Math.max(0,Math.min(100,values[key]??0));nodes[key].value=value;nodes[key+'-value'].textContent=String(Math.round(value));}
  audioStatus.textContent=audioError||(needsGesture?'Звук приостановлен':'Сейчас звучит партия этого этапа');
  enable.hidden=!needsGesture&&!audioError;cancel.hidden=Boolean(earned);
 },dispose(){root.remove();}};
}
