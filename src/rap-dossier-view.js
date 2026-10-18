import {pcElement as el,pcFind} from './virtual-pc-dom.js?rev=43';
import {socialButton} from './social-dom.js?rev=43';
import {dossierCases,publicDossierCase,publicDossierTarget} from './rap-dossier-cases.js?rev=47';
import {metadataGameMinute} from './social-registration.js?rev=47';
import {createPublicAnalysisReportView} from './rap-analysis-view.js?rev=43';
import {startTrackStudy,pauseStudy,effectiveStudySkills} from './rap-analysis.js?rev=47';
import {startCaseStudy,pauseCaseStudy} from './rap-research.js?rev=47';
import {mountDossierBoard,forecastText} from './rap-dossier-board-view.js?rev=43';
import {gameDateTimeLabel} from './home-calendar.js?rev=43';
const studyLabel=n=>n.kind==='track'?'Изучить трек · 45 мин':['battle','round'].includes(n.kind)?'Изучить '+(n.kind==='battle'?'баттл':'раунд')+' · 6 ч':'Изучить · 45 мин';
const currentStudy=state=>{const jobs=[state.rapResearch?.job,state.rapAnalysis?.job];return jobs.find(job=>job?.status==='active')??jobs.find(Boolean);};
export function mountRapDossier(root,{getState,getMetadata=()=>({}),navigate=()=>{},commit=()=>false,onWork=()=>false,isVisible=()=>true}){
 const d=root.ownerDocument;let caseId=null,targetRequest=null,selectedId=null,selectedReport=null,graph=null,board=null,disposed=false,lastKey='',lastRefs=[],lastMinute=null,lastProjection=-Infinity,error='';
 const shell=el(d,'section',{className:'rap-dossier',attributes:{'aria-label':'Рэп-досье'}}),header=el(d,'header',{className:'rd-head'}),controls=el(d,'div',{className:'rd-controls'}),cases=el(d,'select',{attributes:{'aria-label':'Выбрать дело'}}),rounds=el(d,'select',{attributes:{'aria-label':'Выбрать раунд'}}),body=el(d,'div',{className:'rd-body'}),boardRoot=el(d,'div',{className:'rd-board'}),detail=el(d,'aside',{className:'rd-detail'}),status=el(d,'p',{className:'rd-status',attributes:{role:'status'}}),progress=el(d,'div',{className:'rd-progress',attributes:{'aria-live':'polite'}});
 const now=()=>metadataGameMinute(getMetadata())??0;
 const guarded=fn=>(...args)=>{if(!disposed)fn(...args);};
 header.append(el(d,'div',{className:'rd-title',text:'Рэп-досье'}),el(d,'span',{className:'rd-subtitle',text:'Факты. Наблюдения. Версии.'}));
 controls.append(cases,rounds,socialButton(d,'Вписать доску',guarded(()=>board?.fit())));header.append(controls);body.append(boardRoot,detail);shell.append(header,progress,body,status);root.replaceChildren(shell);
 cases.addEventListener('change',guarded(()=>{caseId=cases.value;targetRequest=null;selectedId=null;selectedReport=null;refresh(true);}));rounds.addEventListener('change',guarded(()=>select(rounds.value,true)));
 function select(id,focus=false){selectedId=id;selectedReport=null;board?.select(id);renderDetail();if(focus)board?.focus(id);else if(shell.getBoundingClientRect().width<600){detail.setAttribute('tabindex','-1');detail.focus();detail.scrollIntoView?.({block:'start'});}}
 function save(result){if(!result?.state)return false;let saved;try{saved=commit({...result,ok:true});}catch{saved=false;}if(saved===false||saved?.ok===false){error='Не удалось сохранить изменение. Повтори попытку.';return false;}return true;}
 function study(node){
  if(disposed||!node.action)return;const state=getState(),metadata=getMetadata(),request={...node.action.request,heroSnapshot:effectiveStudySkills(state,metadata.skills),nowMinute:now()},result=(node.action.type==='startCaseStudy'?startCaseStudy:startTrackStudy)(state,request);
  error=result.reason??'';if(result.state!==state&&!save(result)){status.textContent=error;return;}
  if(result.ok&&result.jobId&&!onWork()){save({state:pauseCaseStudy(pauseStudy(getState()))});error='Изучение сохранено на паузе. Сначала сядь за компьютер.';}
  if(result.reportId)selectedReport=result.reportId;refresh(true);
 }
 const progressText=el(d,'span');progress.append(progressText,socialButton(d,'К изучаемой карточке',guarded(()=>{const j=currentStudy(getState());if(j)focusTarget(j.subject?{...j.subject}:{trackVersionId:j.trackVersionId});})),socialButton(d,'Пауза',guarded(()=>{save({state:pauseCaseStudy(pauseStudy(getState()))});refresh(true);})));progress.hidden=true;
 function renderProgress(){const j=currentStudy(getState());const text=j?(j.status==='paused'?'На паузе':'Изучаю')+' · '+Math.floor(j.elapsed)+' / '+j.total+' игровых минут':'';if(progressText.textContent!==text)progressText.textContent=text;progress.hidden=!j;}
 function renderDetail(){
  const focus=detail.contains(d.activeElement)?d.activeElement?.dataset?.focusId:null;detail.replaceChildren();const n=graph?.nodes.find(n=>n.id===selectedId);detail.setAttribute('aria-label',n?'Детали: '+n.title:'Детали дела');
  if(!n){detail.append(el(d,'h2',{text:graph?.status==='unknown'?'Дело недоступно':'Выбери карточку'}),el(d,'p',{text:'Публичные факты, впечатления и предположения хранятся отдельно.'}));return;}
  detail.append(el(d,'h2',{text:n.title}),el(d,'h3',{text:'Публичные факты'}),el(d,'p',{text:n.kind==='forecast'?'Это предположение героя, а не результат судейства.':n.sourceIds.length?'Ссылок на источники: '+n.sourceIds.length+'.':'Пока нет доступных источников.'}));
  if(n.profileUrl)detail.append(socialButton(d,['judge','opponent','person','track'].includes(n.kind)?'Открыть профиль':'Открыть источник',guarded(()=>navigate(n.profileUrl))));
  if(n.scoring)detail.append(el(d,'p',{text:n.scoring.mode==='score'?'Публичная шкала: '+n.scoring.scale:'Сравнение работ в паре'}));
  if(n.action)detail.append(socialButton(d,studyLabel(n),guarded(()=>study(n))));else if(n.kind!=='forecast')detail.append(el(d,'p',{className:'rd-unknown',text:'Изучение недоступно: источник не найден или ещё не опубликован.'}));
  detail.append(el(d,'h3',{text:'Наблюдения героя'}));
  if(n.studyOutcome?.status==='completed-empty')detail.append(el(d,'p',{className:'rd-unknown',text:'Изучение завершено. На момент '+gameDateTimeLabel(n.studyOutcome.cutoff)+' подходящих опубликованных работ или отзывов не найдено.'}));
  if(n.studyOutcome?.status==='damaged')detail.append(el(d,'p',{className:'rd-unknown',text:'Результат изучения повреждён. Исходные данные сохранены для восстановления.'}));
  for(const report of n.reports??[])detail.append(socialButton(d,report.trackName+' · '+report.id,guarded(()=>{selectedReport=report.id;renderDetail();})));
  const report=n.reports?.find(r=>r.id===selectedReport)??n.reports?.at(-1);if(report)detail.append(createPublicAnalysisReportView(d,report));else if(!n.studyOutcome)detail.append(el(d,'p',{className:'rd-unknown',text:'Наблюдений пока нет. Неизвестное не означает плохое.'}));
  if(n.quotes?.length)detail.append(el(d,'h3',{text:'Сохранённые цитаты'}));
  for(const q of n.quotes??[]){detail.append(el(d,'blockquote',{text:q.comment}),el(d,'small',{text:q.judgeName+' · опубликовано: '+gameDateTimeLabel(q.publishedAt)+(q.recordedAt==null?'':' · сохранено: '+gameDateTimeLabel(q.recordedAt))}));if(q.profileUrl)detail.append(socialButton(d,'Профиль автора цитаты',guarded(()=>navigate(q.profileUrl))));if(q.sourceUrl)detail.append(socialButton(d,'Открыть источник цитаты',guarded(()=>navigate(q.sourceUrl))));else if(q.reportId)detail.append(socialButton(d,'Открыть разбор источника цитаты',guarded(()=>focusTarget({reportId:q.reportId}))));else detail.append(el(d,'small',{text:'Исходная запись недоступна; цитата сохранена.'}));}
  for(const h of n.hypotheses??[])detail.append(el(d,'p',{text:h.statement}),el(d,'small',{text:h.confidenceText}));
  if(n.missingReportIds?.length)detail.append(el(d,'p',{className:'rd-unknown',text:'Сохранённый отчёт недоступен. Исходные данные сохранены для восстановления.'}));
  const forecasts=n.forecast?[n]:graph.nodes.filter(f=>f.kind==='forecast'&&f.layout?.parentId===n.id);
  if(forecasts.length){detail.append(el(d,'h3',{text:'Моё предположение'}));for(const f of forecasts)detail.append(el(d,'p',{className:'rd-forecast-value',text:forecastText(f.forecast)}),el(d,'p',{text:f.forecast?.confidenceText??'Недостаточно данных.'}));}
  detail.append(el(d,'h3',{text:'Источники'}));for(const source of n.sourceLinks??[])if(source.url)detail.append(socialButton(d,source.name+' · открыть источник',guarded(()=>navigate(source.url))));else if(source.reportId)detail.append(socialButton(d,source.name+' · открыть разбор',guarded(()=>focusTarget({reportId:source.reportId}))));for(const id of n.sourceIds??[])detail.append(el(d,'small',{text:id}));if(!n.sourceIds?.length)detail.append(el(d,'p',{text:'Нет подтверждённых источников.'}));if(focus)pcFind(detail,n=>n.dataset?.focusId===focus)?.focus?.({preventScroll:true});
 }
 function refresh(force=false){
  if(disposed||(!force&&!isVisible()))return;renderProgress();const s=getState(),minute=now(),clock=globalThis.performance?.now?.()??Date.now();
  const refs=[s.battleApplications,s.battleSubmissions,s.audioExports,s.trackVersions,s.tournaments,s.roundThemes,s.social,s.socialReactions?.plans,s.socialRuntime?.events,s.rapResearch?.findings,s.rapResearch?.recovery,s.rapAnalysis?.reports,s.rapAnalysis?.recovery,s.judgeDossier?.evidence,s.battleHistory,s.npcSocialProfiles,s.judging?.results,s.rapDossier,s.rapDossier?.cards];
  const unchanged=refs.every((v,i)=>v===lastRefs[i]),finished=lastRefs.length&&(s.rapResearch?.findings!==lastRefs[9]||s.rapAnalysis?.reports!==lastRefs[11]||s.rapDossier!==lastRefs[17]||s.rapDossier?.cards!==lastRefs[18]);if(!force&&!finished&&(unchanged&&minute===lastMinute||clock-lastProjection<250))return;
  lastRefs=refs;lastMinute=minute;lastProjection=clock;const entries=[...dossierCases(s,{nowMinute:minute})];if(caseId===null)caseId=entries.some(c=>c.id==='archive')?'archive':entries.find(c=>c.kind==='battle')?.id??'recordings';
  const target=targetRequest?publicDossierTarget(s,{...targetRequest,nowMinute:minute}):null;
  const next=target?{id:target.caseId,title:target.node.title,status:'available',nodes:[target.node],edges:[]}:publicDossierCase(s,{caseId,nowMinute:minute});if(target)entries.push({id:target.caseId,title:target.node.title});
  const key=JSON.stringify([entries,next]);graph=next;
  if(force||key!==lastKey){const focus=boardRoot.contains(d.activeElement)?d.activeElement?.dataset?.dossierNode:null;lastKey=key;
   cases.replaceChildren();for(const c of entries)cases.append(el(d,'option',{text:c.title,value:c.id}));cases.value=caseId;
   rounds.replaceChildren(el(d,'option',{text:'Раунды дела',value:''}));for(const n of graph.nodes.filter(n=>n.kind==='round'))rounds.append(el(d,'option',{text:n.title,value:n.id}));rounds.disabled=!graph.nodes.some(n=>n.kind==='round');
   if(!graph.nodes.some(n=>n.id===selectedId))selectedId=graph.nodes[0]?.id??null;
   board?.dispose();board=mountDossierBoard(boardRoot,{graph,selectedId,onSelect:guarded(id=>select(id))});
   if(!graph.nodes.length)boardRoot.append(el(d,'p',{className:'rd-empty',text:graph.status==='unknown'?'Дело недоступно':'Пока нет записей. Экспортируй трек или открой дело баттла.'}));
   renderDetail();if(focus)board.focus(focus);
  }status.textContent=error;
 }
 function focusTarget(target={}){if(disposed)return;targetRequest=null;error='';const s=getState(),minute=now();if(target.caseId)caseId=target.caseId;else if(target.battleId)caseId='battle:'+target.battleId;
  const match=n=>target.nodeId?n.id===target.nodeId:target.judgeId||target.characterId?n.characterId===(target.judgeId??target.characterId):target.trackVersionId?n.kind==='track'&&n.trackVersionId===target.trackVersionId:target.roundId?n.roundId===target.roundId:target.reportId?n.reportIds.includes(target.reportId):false;
  let found=publicDossierCase(s,{caseId,nowMinute:minute}).nodes.find(match);if(!found&&!target.caseId)for(const c of dossierCases(s,{nowMinute:minute})){found=publicDossierCase(s,{caseId:c.id,nowMinute:minute}).nodes.find(match);if(found){caseId=c.id;break;}}
  if(!found&&!target.caseId){const request={trackVersionId:target.judgeId?undefined:target.trackVersionId,characterId:target.judgeId??target.characterId,reportId:target.reportId,battleId:target.battleId},publicTarget=publicDossierTarget(s,{...request,nowMinute:minute});if(publicTarget){found=publicTarget.node;caseId=publicTarget.caseId;if(caseId!=='archive')targetRequest=request;}else if(target.trackVersionId||target.characterId||target.judgeId||target.reportId){caseId='unavailable';error='Источник недоступен или ещё не опубликован.';}}
  selectedId=found?.id??target.nodeId??null;selectedReport=target.reportId??null;refresh(true);if(found)board?.focus(found.id);
 }
 refresh(true);return {update:()=>refresh(),focusTarget,dispose(){disposed=true;board?.dispose();root.replaceChildren();}};
}
