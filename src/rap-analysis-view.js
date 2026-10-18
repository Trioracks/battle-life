import {pcElement as el} from './virtual-pc-dom.js?rev=45';
import {socialHeading} from './social-dom.js?rev=45';
import {gameDateTimeLabel} from './home-calendar.js?rev=45';
const names={text:'Текст',performance:'Исполнение',music:'Музыка',sound:'Звук'};
export function createPublicAnalysisReportView(d,p){
 const root=el(d,'article',{className:'sn-analysis-report',attributes:{'aria-label':'Субъективный отчёт'}});if(!p)return root;
 root.append(socialHeading(d,'Разбор · '+p.trackName),el(d,'small',{text:gameDateTimeLabel(p.createdAt)+(p.supersedes?' · новое прочтение прежней работы':'')}),el(d,'p',{className:'sn-note',text:p.confidenceText}),el(d,'p',{text:'Впечатление героя об этой записи, не уровень исполнителя.'}));
 for(const [axis,label]of Object.entries(names)){const row=el(d,'section',{className:'sn-analysis-aspect'});row.append(el(d,'strong',{text:label+' — '+p.labels[axis]}));if(p.segments[axis]){const segments=el(d,'div',{className:'sn-analysis-segments',attributes:{role:'list','aria-label':label}});for(const s of p.segments[axis])segments.append(el(d,'span',{className:s.selected?'selected':'',text:s.label,attributes:{role:'listitem',...(s.selected?{'aria-current':'true'}:{})}}));row.append(segments);}root.append(row);}
 return root;
}
