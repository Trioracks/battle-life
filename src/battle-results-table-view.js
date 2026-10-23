import {pcElement as el} from './virtual-pc-dom.js?rev=57';
import {socialButton,socialHeading} from './social-dom.js?rev=57';
import {gameDateTimeLabel} from './home-calendar.js?rev=57';
import {requestResultReaction} from './social-result-reaction.js?rev=57';
const statuses={processing:'Обрабатываем сдачу',accepting:'Приём работ',judging:'Ожидает итога',no_show:'Не сдал',bye:'Проход пустой ветки',empty:'Пустое место',hidden:'░░░░',qualified:'Прошёл',eliminated:'Выбыл',won:'Победа',technical_win:'Технический проход'};
export function createBattleResultsTableView(d,{table,navigate,onAnalyze,audio,getState,commit,onResultViewed=()=>{},uiState={},isVisible=()=>true}={}){
 const root=el(d,'section',{className:'bt-results'});root.append(socialButton(d,'← Группа',()=>navigate('underweb://social/community/'+table.battleId),{className:'sn-link'}),socialHeading(d,'Таблица судейства · '+table.title),el(d,'p',{className:'sn-note',text:table.message}));
 const nav=el(d,'nav',{className:'sn-actions',attributes:{'aria-label':'Раунды турнира'}});for(const r of table.availableRounds)nav.append(socialButton(d,r.title,()=>navigate('underweb://social/results/'+table.battleId+'/'+r.id),{attributes:r.id===table.roundId?{'aria-current':'page'}:{}}));root.append(nav);
 if(table.closesAt!==undefined)root.append(el(d,'p',{text:'Сдача до '+gameDateTimeLabel(table.closesAt)}));
 const own=table.rows.find(r=>r.participantId==='player'),event=table.complete&&own&&getState?.().socialRuntime?.events?.find(e=>e.type==='round-result'&&e.battleId===table.battleId&&e.roundId===table.roundId);if(event&&commit)root.append(socialButton(d,'Открыть мой итог',()=>{if(commit(requestResultReaction(getState(),event.id)))onResultViewed(event.id);},{dataset:{resultSummary:event.id}}));
 const wrap=el(d,'div',{className:'bt-scroll',attributes:{'aria-label':'Все оценки выбранных участников'}}),grid=el(d,'table',{className:'bt-table'}),head=el(d,'thead'),heading=el(d,'tr'),cols=el(d,'colgroup');
 for(const width of ['6%','21%',...table.judges.map(()=>55/Math.max(1,table.judges.length)+'%'),'7%','11%'])cols.append(el(d,'col',{attributes:{style:'width:'+width}}));grid.append(cols);
 for(const [i,label]of ['№','Участник',...table.judges,'Σ','Статус'].entries()){const cell=el(d,'th',{attributes:{scope:'col'}});if(typeof label==='string'){cell.textContent=label;if(i===0)cell.setAttribute('title','Место в отборе / номер пары');if(label==='Σ')cell.setAttribute('title','Сумма оценок или голосов');}else{const short=String(i-1),title=short+' · '+label.name;cell.setAttribute('aria-label',title);cell.setAttribute('title',title);cell.append(el(d,'abbr',{text:short,attributes:{title}}));}heading.append(cell);}head.append(heading);grid.append(head);const body=el(d,'tbody');
 const pager=el(d,'nav',{className:'bt-pagination',attributes:{'aria-label':'Страницы участников'}}),pageLabel=el(d,'span',{attributes:{'aria-live':'polite'}}),ownIndex=table.rows.findIndex(r=>r.participantId==='player');
 uiState.rowsPerPage=Math.max(1,Math.floor(uiState.rowsPerPage??8));uiState.page=Math.max(0,Math.floor(uiState.page??0));
 const previous=socialButton(d,'←',()=>changePage(uiState.page-1),{attributes:{'aria-label':'Предыдущая страница'}}),next=socialButton(d,'→',()=>changePage(uiState.page+1),{attributes:{'aria-label':'Следующая страница'}}),ownPlace=socialButton(d,'К моему месту',()=>{uiState.followPlayer=true;uiState.page=Math.floor(ownIndex/uiState.rowsPerPage);fill();});ownPlace.disabled=ownIndex<0;
 pager.append(previous,pageLabel,next,ownPlace);
 function fill(){
  const pages=Math.max(1,Math.ceil(table.rows.length/uiState.rowsPerPage));uiState.page=Math.min(pages-1,Math.max(0,uiState.page));const start=uiState.page*uiState.rowsPerPage;body.replaceChildren();
  for(const row of table.rows.slice(start,start+uiState.rowsPerPage)){const tr=el(d,'tr',{className:'bt-row bt-'+row.tone,dataset:{participant:row.participantId??row.key}}),who=el(d,'th',{attributes:{scope:'row'}});who.append(row.profileUrl?socialButton(d,row.name,()=>navigate(row.profileUrl),{className:'sn-link'}):el(d,'span',{text:row.name}));tr.append(el(d,'td',{text:String(row.place??row.pairNumber??'—'),attributes:{title:row.pairNumber?'Пара '+row.pairNumber:'Место '+(row.place??'не определено')}}),who);
   for(const score of row.scores){const value=score.value===null?'—':String(score.value),name=table.judges.find(j=>j.id===score.judgeId)?.name??'Судья';tr.append(el(d,'td',{text:value,dataset:{judgeScore:score.judgeId},attributes:{'aria-label':name+': '+value}}));}
   const status=statuses[row.status]??row.status;tr.append(el(d,'td',{text:row.total===null?'—':String(row.total)}),el(d,'td',{text:status,attributes:{title:status}}));body.append(tr);
  }
  previous.disabled=uiState.page===0;next.disabled=uiState.page>=pages-1;pageLabel.textContent=(uiState.page+1)+' / '+pages+' · '+(table.rows.length?start+1:0)+'–'+Math.min(start+uiState.rowsPerPage,table.rows.length)+' из '+table.rows.length;
 }
 function changePage(page){uiState.followPlayer=false;uiState.page=page;fill();}
 grid.append(body);wrap.append(grid);root.append(wrap,pager,el(d,'p',{className:'bt-key',text:table.selection?'№ — место · Σ — сумма. Отбор: оценки до 10, шаг 0.5; первые 32 места.':'№ — пара · Σ — голоса. 0/1 — голос судьи; большинство определяет победителя.'}));fill();
 const details=el(d,'details',{className:'bt-details'});details.append(el(d,'summary',{text:'Судьи, отзывы и треки участников'}));
 const legend=el(d,'ol',{className:'bt-judges'});for(const judge of table.judges){const item=el(d,'li');item.append(judge.profileUrl?socialButton(d,judge.name,()=>navigate(judge.profileUrl),{className:'sn-link'}):el(d,'span',{text:judge.name}));legend.append(item);}details.append(legend);
 if(table.awards.length){details.append(socialHeading(d,'LTR · лучшие треки раунда'));for(const a of table.awards)details.append(el(d,'p',{text:a.judgeName+' → '+a.name}));}
 for(const row of table.rows.filter(r=>!r.masked&&r.trackVersionId)){
  const section=el(d,'section',{className:'bt-track'});section.append(socialHeading(d,row.name));if(audio&&getState)section.append(audio.row(d,{version:getState().trackVersions.byId[row.trackVersionId]}));
  for(const r of row.reviews){const quote=el(d,'blockquote',{className:'bt-review'});quote.append(el(d,'strong',{text:r.judgeName+' · '+(r.score===null?'Комментарий к сданной работе':r.score+(table.selection?' / 10':' голос'))}),el(d,'p',{text:r.comment}));section.append(quote);}details.append(section);
 }
 root.append(details);
 let observer=null,disposed=false;
 root.layout=()=>{
  if(disposed||!isVisible()||!root.isConnected||!d.defaultView)return;
  let viewport=root.parentElement;while(viewport&&!viewport.className?.split(' ').includes('uw-page'))viewport=viewport.parentElement;
  const bounds=wrap.getBoundingClientRect(),bottom=viewport?.getBoundingClientRect().bottom??d.defaultView.innerHeight;if(bounds.width<=0||bottom<=bounds.top)return;
  const rowHeight=Math.max(32,...[...body.children].map(n=>n.getBoundingClientRect().height)),available=bottom-bounds.top-head.getBoundingClientRect().height-pager.getBoundingClientRect().height-72,capacity=Math.max(1,Math.floor(available/rowHeight));
  if(capacity!==uiState.rowsPerPage){const anchor=uiState.followPlayer&&ownIndex>=0?ownIndex:uiState.page*uiState.rowsPerPage;uiState.rowsPerPage=capacity;uiState.page=Math.floor(anchor/capacity);fill();}
  if(!observer&&viewport&&d.defaultView.ResizeObserver){observer=new d.defaultView.ResizeObserver(root.layout);observer.observe(viewport);}
 };
 d.defaultView?.addEventListener('resize',root.layout);root.dispose=()=>{disposed=true;observer?.disconnect();d.defaultView?.removeEventListener('resize',root.layout);};
 return root;
}
