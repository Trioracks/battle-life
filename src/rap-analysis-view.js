import {pcElement as el} from './virtual-pc-dom.js?rev=40';
import {socialButton,socialHeading} from './social-dom.js?rev=40';
import {publicAnalysisReport,pauseStudy} from './rap-analysis.js?rev=40';
import {gameDateTimeLabel} from './home-calendar.js?rev=40';
import {saveAnalysisToDossier} from './rap-dossier.js?rev=40';
const names={text:'Текст',performance:'Исполнение',music:'Музыка',sound:'Звук'};
export function createAnalysisReportView(d,report){
 return createPublicAnalysisReportView(d,publicAnalysisReport(report));
}
export function createPublicAnalysisReportView(d,p){
 const root=el(d,'article',{className:'sn-analysis-report',attributes:{'aria-label':'Субъективный отчёт'}});if(!p)return root;
 root.append(socialHeading(d,'Разбор · '+p.trackName),el(d,'small',{text:gameDateTimeLabel(p.createdAt)+(p.supersedes?' · новое прочтение прежней работы':'')}),el(d,'p',{className:'sn-note',text:p.confidenceText}),el(d,'p',{text:'Впечатление героя об этой записи, не уровень исполнителя.'}));
 for(const [axis,label]of Object.entries(names)){const row=el(d,'section',{className:'sn-analysis-aspect'});row.append(el(d,'strong',{text:label+' — '+p.labels[axis]}));if(p.segments[axis]){const segments=el(d,'div',{className:'sn-analysis-segments',attributes:{role:'list','aria-label':label}});for(const s of p.segments[axis])segments.append(el(d,'span',{className:s.selected?'selected':'',text:s.label,attributes:{role:'listitem',...(s.selected?{'aria-current':'true'}:{})}}));row.append(segments);}root.append(row);}
 return root;
}
export function createRapAnalysisView(d,{getState,onStart,commit,selectedReportId,navigate=()=>{}}){
 const a=getState().rapAnalysis,root=el(d,'section',{className:'sn-analysis'});if(!a)return root;
 if(a.job){const j=a.job;root.append(socialHeading(d,'Изучение · '+j.trackName),el(d,'p',{text:Math.floor(j.elapsed)+' / '+j.total+' игровых минут · прогресс сохранён'}),socialButton(d,j.status==='paused'?'Продолжить изучение':'Вернуться к изучению',()=>onStart({trackVersionId:j.trackVersionId,reviewIds:j.reviewIds})),socialButton(d,'Поставить изучение на паузу',()=>commit({ok:true,state:pauseStudy(getState())})));}
 const report=a.reports[selectedReportId]??Object.values(a.reports).sort((x,y)=>x.createdAt-y.createdAt).at(-1);if(report){root.append(createAnalysisReportView(d,report));if(getState().software.dossier.installed){const saved=getState().rapDossier.cards[report.subjectId]?.reportIds.includes(report.id),save=socialButton(d,saved?'Сохранено в досье':'Сохранить в досье',()=>commit(saveAnalysisToDossier(getState(),report.id)));save.disabled=Boolean(saved);root.append(save);}else root.append(socialButton(d,'Скачать Рэп-досье',()=>navigate('underweb://dump/dossier')));}return root;
}
