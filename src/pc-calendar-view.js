import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=41';
import {gameMonthGrid,homeDateLabel} from './home-calendar.js?rev=41';
const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
export function mountPcCalendar({document:d,anchor,getGameDay,onClose=()=>{}}){
 const root=el(d,'section',{className:'pc-calendar',attributes:{role:'dialog','aria-label':'Игровой календарь',tabindex:'-1'}}),title=el(d,'h2'),today=el(d,'p'),grid=el(d,'div',{className:'pc-calendar-grid'});let last='',disposed=false;
 const close=()=>{if(disposed)return;dispose();anchor?.focus?.();onClose();},button=pcButton(d,'Закрыть календарь',{},close);root.append(title,today,grid,button);
 const outside=e=>{if(!root.contains(e.target)&&!anchor?.contains?.(e.target))close();};
 const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab'){e.preventDefault();e.stopPropagation();button.focus();}};
 function update(){if(disposed)return;const day=getGameDay(),data=gameMonthGrid(day),signature=JSON.stringify(data);if(signature===last)return;last=signature;title.textContent=MONTHS[data.month-1]+' '+data.year;today.textContent='Сегодня: '+homeDateLabel(day);grid.replaceChildren();for(const name of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'])grid.append(el(d,'b',{text:name}));for(const cell of data.days)grid.append(el(d,'span',{text:cell?String(cell.day):'',attributes:cell?.current?{'aria-current':'date'}:{}}));}
 function dispose(){if(disposed)return;disposed=true;d.removeEventListener?.('pointerdown',outside);root.removeEventListener('keydown',key);root.remove();}
 root.addEventListener('keydown',key);d.addEventListener?.('pointerdown',outside);update();return {root,update,dispose};
}
