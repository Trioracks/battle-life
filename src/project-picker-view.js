import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=59';
import {homeDateLabel} from './home-calendar.js?rev=59';

// A mounted picker owns its inputs, so host clock/needs updates cannot reset a query.
export function mountProjectPicker(root,{items=[],onSelect=()=>{},onCancel=()=>{}}={}){
 const d=root.ownerDocument,wrap=el(d,'section',{className:'project-picker'}),search=el(d,'input',{type:'search',attributes:{'aria-label':'Поиск проектов',placeholder:'Поиск по названию'}}),group=el(d,'select',{attributes:{'aria-label':'Баттл проектов'}}),order=el(d,'select',{value:'newest',attributes:{'aria-label':'Порядок по дате'}}),list=el(d,'div',{className:'project-picker-list'});
 group.append(el(d,'option',{value:'all',text:'Все проекты'}));group.value='all';
 const labels=new Map(items.map(p=>[p.battleId||'free',p.battleId?(p.battleName||p.battleId):'Вне баттла']));
 for(const [id,label]of labels)group.append(el(d,'option',{value:id,text:label}));
 order.append(el(d,'option',{value:'newest',text:'Сначала новые'}),el(d,'option',{value:'oldest',text:'Сначала старые'}));order.value='newest';
 const dateLabel=p=>p.updatedDate??p.createdDate??(p.updatedDay||p.createdDay?homeDateLabel(p.updatedDay??p.createdDay):String(p.name).match(/^\d{2}\.\d{2}\.\d{4}/)?.[0]??'Дата не сохранена');
 const day=p=>Number(dateLabel(p).match(/^(\d{2})\.(\d{2})\.(\d{4})/)?.slice(1).reverse().join('')??0);
 function render(){
  const query=String(search.value??'').trim().toLocaleLowerCase('ru'),filtered=items.filter(p=>(group.value==='all'||(p.battleId||'free')===group.value)&&String(p.name).toLocaleLowerCase('ru').includes(query)).sort((a,b)=>(order.value==='oldest'?1:-1)*(day(a)-day(b)));
  const groups=new Map();for(const p of filtered){const key=p.battleId||'free';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
  list.replaceChildren();
  for(const [id,projects]of groups){
   list.append(el(d,'h3',{className:'project-picker-group',text:labels.get(id)}));
   for(const p of projects){
   const date=dateLabel(p);
   const details=[date,p.bpm?p.bpm+' BPM':'',p.revision?'v'+p.revision:'',p.recoveryIssue?'ошибка формата':p.status==='ready'?'готов':p.kind==='beat'?(p.stages?.length??0)+'/3':p.kind==='lyrics'?'черновик':'архив',p.currentAdaptation?'текущая адаптация':''].filter(Boolean);
   list.append(button(d,p.name+' · '+details.join(' · '),{className:'project-picker-row',dataset:{projectId:p.id}},()=>onSelect(p)));
   }
  }
  if(!filtered.length)list.append(el(d,'p',{text:'Проекты не найдены.'}));
 }
 search.addEventListener('input',render);group.addEventListener('change',render);order.addEventListener('change',render);
 const filters=el(d,'div',{className:'project-picker-filters'});filters.append(group,order);wrap.append(search,filters,list,button(d,'Отмена',{},onCancel));root.append(wrap);render();
 return {focus(){search.focus();},dispose(){wrap.remove();}};
}
