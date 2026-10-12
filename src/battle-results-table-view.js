import {pcElement as el} from './virtual-pc-dom.js?rev=39';
import {socialButton,socialHeading} from './social-dom.js?rev=39';
import {gameDateTimeLabel} from './home-calendar.js?rev=39';
const statuses={accepting:'Приём работ',judging:'Ожидает итога',no_show:'Не сдал',bye:'Проход пустой ветки',empty:'Пустое место',hidden:'░░░░',qualified:'Прошёл',eliminated:'Выбыл',won:'Победа',technical_win:'Технический проход'};
export function createBattleResultsTableView(d,{table,navigate,onAnalyze,audio,getState}={}){
 const root=el(d,'section',{className:'bt-results'});root.append(socialButton(d,'← Сообщество',()=>navigate('underweb://social/community/'+table.battleId),{className:'sn-link'}),socialHeading(d,'Таблица судейства · '+table.title),el(d,'p',{className:'sn-note',text:table.message}));
 const nav=el(d,'nav',{className:'sn-actions',attributes:{'aria-label':'Раунды турнира'}});for(const r of table.availableRounds)nav.append(socialButton(d,r.title,()=>navigate('underweb://social/results/'+table.battleId+'/'+r.id),{attributes:r.id===table.roundId?{'aria-current':'page'}:{}}));root.append(nav);
 if(table.closesAt!==undefined)root.append(el(d,'p',{text:'Сдача до '+gameDateTimeLabel(table.closesAt)}));
 const wrap=el(d,'div',{className:'bt-scroll',attributes:{tabindex:'0','aria-label':'Таблица, прокрутка по горизонтали'}}),grid=el(d,'table',{className:'bt-table'}),head=el(d,'thead'),heading=el(d,'tr');
 for(const label of ['Место / пара','Участник',...table.judges.map(j=>j.name),'Итог','Статус'])heading.append(el(d,'th',{text:label,attributes:{scope:'col'}}));head.append(heading);grid.append(head);const body=el(d,'tbody');
 for(const row of table.rows){const tr=el(d,'tr',{className:'bt-row bt-'+row.tone}),who=el(d,'th',{attributes:{scope:'row'}});who.append(row.profileUrl?socialButton(d,row.name,()=>navigate(row.profileUrl),{className:'sn-link'}):el(d,'span',{text:row.name}));tr.append(el(d,'td',{text:String(row.place??(row.pairNumber?'Пара '+row.pairNumber:'—'))}),who);for(const score of row.scores)tr.append(el(d,'td',{text:score.value===null?'—':String(score.value)}));tr.append(el(d,'td',{text:row.total===null?'—':String(row.total)}),el(d,'td',{text:statuses[row.status]??row.status}));body.append(tr);}
 grid.append(body);wrap.append(grid);root.append(wrap,el(d,'p',{className:'sn-note',text:table.selection?'Отбор: пять оценок до 10, шаг 0.5. Первые 32 места; равная сумма — закреплённый жребий.':'Пары: 0/1 — голос, не оценка до10. Нечётная полная панель определяет победителя.'}));
 if(table.awards.length){root.append(socialHeading(d,'LTR · лучшие треки раунда'));for(const a of table.awards)root.append(el(d,'p',{text:a.judgeName+' → '+a.name}));}
 for(const row of table.rows.filter(r=>!r.masked&&r.trackVersionId)){
  const section=el(d,'section',{className:'bt-track'});section.append(socialHeading(d,row.name));if(audio&&getState)section.append(audio.row(d,{version:getState().trackVersions.byId[row.trackVersionId]}));
  const study=socialButton(d,'Изучить: '+row.name,()=>onAnalyze?.({participantId:row.participantId,trackVersionId:row.trackVersionId,reviewIds:row.reviews.map(r=>r.id)}));study.disabled=!onAnalyze;section.append(study);
  for(const r of row.reviews){const quote=el(d,'blockquote',{className:'bt-review'});quote.append(el(d,'strong',{text:r.judgeName+' · '+(r.score===null?'Комментарий к сданной работе':r.score+(table.selection?' / 10':' голос'))}),el(d,'p',{text:r.comment}));section.append(quote);}root.append(section);
 }return root;
}
