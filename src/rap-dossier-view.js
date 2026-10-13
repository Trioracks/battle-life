import {pcElement as el} from './virtual-pc-dom.js?rev=40';
import {socialButton,socialAvatar} from './social-dom.js?rev=40';
import {dossierCharacterIds,publicDossierCard,saveAnalysisToDossier} from './rap-dossier.js?rev=40';
import {metadataGameMinute} from './social-registration.js?rev=40';
import {gameDateTimeLabel} from './home-calendar.js?rev=40';
import {createPublicAnalysisReportView} from './rap-analysis-view.js?rev=40';
import {ROUND_LABELS} from './battle-results-table.js?rev=40';
const statuses={submitted:'Работа сдана',no_show:'Не сдал',won:'Победа',lost:'Поражение',technical_win:'Технический проход',bye:'Проход пустой ветки',eliminated:'Выбыл'};
export function mountRapDossier(root,{getState,getMetadata=()=>({}),navigate=()=>{},commit=()=>false}){
 const d=root.ownerDocument;let selected=null,selectedReport=null,last='',disposed=false,error='';
 const signature=()=>JSON.stringify([getState().rapDossier,getState().rapAnalysis,getState().battleHistory,getState().tournaments?.byId?.['makarevich-1']?.currentRoundId,Math.floor(metadataGameMinute(getMetadata())??0)]);
 function render(){if(disposed)return;const state=getState(),nowMinute=metadataGameMinute(getMetadata()),ids=dossierCharacterIds(state,{nowMinute});if(!ids.includes(selected))selected=ids[0]??null;
  const shell=el(d,'section',{className:'rap-dossier',attributes:{'aria-label':'Рэп-досье'}}),header=el(d,'header',{className:'rd-head'}),list=el(d,'nav',{className:'rd-list',attributes:{'aria-label':'Карточки людей'}}),main=el(d,'main',{className:'rd-card'});header.append(el(d,'h1',{text:'Рэп-досье'}),el(d,'span',{text:'Факты отдельно. Версии и сомнения — рядом.'}));
  header.append(socialButton(d,'Собрать готовые отчёты',()=>{let next=state;for(const r of Object.values(state.rapAnalysis.reports).filter(r=>r.createdAt<=nowMinute)){const result=saveAnalysisToDossier(next,r.id);if(result.ok)next=result.state;}if(!commit({ok:true,state:next}))error='Не удалось сохранить карточки.';render();}));
  for(const id of ids){const p=publicDossierCard(state,{characterId:id,nowMinute});list.append(socialButton(d,p.name,()=>{selected=id;selectedReport=null;render();},{attributes:id===selected?{'aria-current':'page'}:{}}));}
  if(!selected)main.append(el(d,'h2',{text:'Пока нет дел'}),el(d,'p',{text:'Изучи доступный трек во «В кругу», затем сохрани отчёт. Уже собранные наблюдения доступны после переустановки.'}),socialButton(d,'Открыть В кругу',()=>navigate('underweb://social/me')));
  else{const p=publicDossierCard(state,{characterId:selected,nowMinute});main.append(socialAvatar(d,p.avatar,p.name),el(d,'h2',{text:p.name}));if(p.profileUrl)main.append(socialButton(d,'Открыть профиль',()=>navigate(p.profileUrl)));else main.append(el(d,'p',{text:'Источник закрыт. Карточка не даёт доступ к личной странице.'}));
   main.append(el(d,'h3',{text:'Публичные факты'}));for(const h of p.history)main.append(el(d,'p',{text:gameDateTimeLabel(h.occurredAt)+' · '+(ROUND_LABELS[h.roundId]??h.roundId)+' · '+(statuses[h.status]??h.status)}));if(!p.history.length)main.append(el(d,'p',{text:'Доступных событий пока нет.'}));
   main.append(el(d,'h3',{text:'Наблюдения героя'}));for(const report of p.reports)main.append(socialButton(d,report.trackName,()=>{selectedReport=report.id;render();}),el(d,'small',{text:gameDateTimeLabel(report.createdAt)+(report.supersedes?' · пересмотр':' · первый разбор')}));const report=p.reports.find(r=>r.id===selectedReport)??p.reports.at(-1);if(report)main.append(createPublicAnalysisReportView(d,report));
   main.append(el(d,'h3',{text:'Гипотезы о судье'}));for(const h of p.hypotheses){main.append(el(d,'p',{text:h.statement}),el(d,'small',{text:h.confidenceText}));}if(!p.hypotheses.length)main.append(el(d,'p',{text:'Пока не понимаю, за что он цепляется. Нужен разбор конкретного отзыва вместе с работой.'}));
   main.append(el(d,'h3',{text:'Цитаты судей · не объективный уровень автора'}));for(const q of p.quotes){const quote=el(d,'blockquote');quote.append(el(d,'strong',{text:q.judgeName}),el(d,'small',{text:gameDateTimeLabel(q.publishedAt)}),el(d,'p',{text:q.comment}));if(q.profileUrl)quote.append(socialButton(d,'Страница судьи',()=>navigate(q.profileUrl)));main.append(quote);}if(!p.quotes.length)main.append(el(d,'p',{text:'Нет сохранённых опубликованных отзывов.'}));
   main.append(el(d,'h3',{text:'Источники'}));for(const source of p.sources)if(source.url)main.append(socialButton(d,'Таблица · '+source.name,()=>navigate(source.url)));else main.append(el(d,'p',{text:source.name+' · сохранённая версия'}));
  }
  const body=el(d,'div',{className:'rd-body'});body.append(list,main);shell.append(header,body,el(d,'p',{text:error,attributes:{role:'status'}}));root.replaceChildren(shell);last=signature();
 }render();return {update(){if(last!==signature())render();},dispose(){disposed=true;root.replaceChildren();}};
}
