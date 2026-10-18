import {pcElement as el,pcButton as button,pcFind} from './virtual-pc-dom.js?rev=43';
import {createBeatSongForm,songPartWindows} from './beat-song-form.js?rev=45';
import {createPcIcon} from './virtual-pc-icons.js?rev=43';
import {beginnerById} from './beat-beginner-bank.js?rev=45';

export const FT_TRACKS=Object.freeze([
 ...['Drum Kit','Bass','Percussion'].map(name=>({name,stage:0,color:'rhythm'})),
 ...['Lead','Atmosphere','Harmony'].map(name=>({name,stage:1,color:'theme'})),
 ...['Sound Design','Sub Bass','FX'].map(name=>({name,stage:2,color:'arrangement'})),
]);

// Read-only recording surface. It consumes a job snapshot and owns no transport.
export function presentRecordingWorkspace(root,{beat,job,shot,paused=false}={}){
 const status=pcFind(root,n=>n.dataset?.ftRole==='recording-status');
 const waveform=pcFind(root.recordingLane,n=>n.dataset?.ftRole==='recording-waveform');
 const active=Boolean(job&&shot&&['draft','clean'].includes(job.kind));
 status.hidden=waveform.hidden=!active;
 root.recordingLane.hidden=!active;
 if(!active)return;
 if(!root.recordingLane.parentNode)pcFind(root,n=>n.className==='ft-grid-inner').append(root.recordingLane);
 status.textContent=(paused?'Пауза':'REC')+' · '+(job.kind==='clean'?'Чистовая запись':'Черновая запись');
 root.dataset.recordingPhase=shot.phase;
 const key=[beat?.id,beat?.revision,beat?.stages?.length,beat?.recording?.revision,job.kind].join(':');
 if(root.recordingKey!==key){
  const form=createBeatSongForm(beat),bars=form?.bars??4;
  root.recordingBars=bars;root.recordingBpm=beat?.bpm??90;root.dataset.recordingBars=String(bars);
  root.recordingWindows=form?songPartWindows(form,3):[{startBar:0,bars}];
  renderStudioTracks(root,beat,{timelineBars:bars});root.recordingKey=key;
  const timeline=pcFind(root,n=>n.className==='ft-timeline');
  timeline.replaceChildren(el(root.ownerDocument,'span',{className:'ft-track-corner',text:'ТАКТ'}));
  for(let bar=1;bar<=bars;bar++)timeline.append(el(root.ownerDocument,'span',{text:String(bar)}));
  timeline.style.gridTemplateColumns='110px repeat('+bars+',minmax(0,1fr))';
  pcFind(root,n=>n.dataset?.ftRole==='section-markers').style.gridTemplateColumns=timeline.style.gridTemplateColumns;
  pcFind(pcFind(root,n=>n.dataset?.ftRole==='recording-lane'),n=>n.className==='ft-lane-grid').style.backgroundSize=(16/bars*100)+'% 100%';
  root.recordingWaveStyle??={background:waveform.style.background,clipPath:waveform.style.clipPath};
  Object.assign(waveform.style,{width:'100%',position:'relative',background:'none',clipPath:'none'});
  waveform.replaceChildren(...root.recordingWindows.map(()=>{
   const region=el(root.ownerDocument,'div',{dataset:{ftRole:'recording-region'}});
   Object.assign(region.style,root.recordingWaveStyle,{position:'absolute',top:'0',height:'32px'});return region;
  }));
  pcFind(root,n=>n.dataset?.ftRole==='session-name').textContent=beat?.name??'Запись';
 }
 const progress=Math.max(0,Math.min(1,shot.progress)),bars=root.recordingBars,position=progress*bars*4;
 pcFind(root,n=>n.dataset?.ftRole==='playhead').style.left=(progress*100)+'%';
 pcFind(root,n=>n.dataset?.ftRole==='recording-position').textContent=String(Math.floor(position/4)+1).padStart(2,'0')+' : '+String(Math.floor(position%4)+1).padStart(2,'0')+' : '+String(Math.floor((position%1)*1000)).padStart(3,'0');
 pcFind(root,n=>n.dataset?.ftRole==='recording-tempo').textContent=String(root.recordingBpm);
 pcFind(root,n=>n.dataset?.ftRole==='transport-status').textContent=paused?'Пауза записи':'Запись';
 root.recordingWindows.forEach((window,index)=>{
  const region=waveform.children[index];region.style.left=(window.startBar/bars*100)+'%';
  region.style.width=(Math.max(0,Math.min(window.bars,progress*bars-window.startBar))/bars*100)+'%';
 });
}

export function renderStudioTracks(root,beat,{timelineBars=16}={}){
 const d=root.ownerDocument,stage=beat?.stages?.length??0,form=createBeatSongForm(beat);
 const sections=pcFind(root,n=>n.dataset?.ftRole==='section-markers');sections.replaceChildren();sections.hidden=!form;
 if(form){
  sections.append(el(d,'span',{className:'ft-section-corner',attributes:{'aria-hidden':'true'}}));
  for(const [name,section,startBar,bars]of [['Интро','intro',1,2],['Куплет','verse',3,4],['Аутро','outro',7,2]]){
   const marker=el(d,'span',{className:'ft-section-marker',text:name,dataset:{ftRole:'section-marker',section,startBar:String(startBar),bars:String(bars)},attributes:{title:'Такты '+startBar+'–'+(startBar+bars-1)}});
   marker.style.gridColumn=(startBar+1)+' / span '+bars;sections.append(marker);
  }
 }
 const tracks=stage?FT_TRACKS.slice(0,stage*3):[{name:'Дорожка 01',stage:0,color:'empty'}];
 if(stage===3&&beat.recording?.draft){
  tracks.push({name:'Draft Vocal',stage:3,color:'vocal',muted:Boolean(beat.recording.clean)});
  if(beat.recording.clean)tracks.push({name:'Clean Vocal',stage:4,color:'vocal-clean'});
 }
 const rows=pcFind(root,n=>n.dataset?.ftRole==='lanes');rows.replaceChildren();
 pcFind(root,n=>n.dataset?.ftRole==='track-count').textContent=tracks.length+' TRACKS';
 for(const track of tracks){
  const row=el(d,'div',{className:'ft-lane',dataset:{stage:String(track.stage),color:track.color,muted:String(Boolean(track.muted))}}),label=el(d,'div',{className:'ft-lane-label'});
  label.append(track.stage>=3?createPcIcon(d,'microphone',{size:14}):el(d,'i',{attributes:{'aria-hidden':'true'}}),el(d,'span',{text:track.name,dataset:{ftRole:'track-label'}}));
  if(track.muted)label.append(el(d,'small',{text:'OFF',attributes:{title:'Черновик заменён чистовой записью и больше не воспроизводится'}}));
  const lane=el(d,'div',{className:'ft-lane-grid',dataset:{ftRole:'lane'},attributes:{'aria-hidden':'true'}});
  lane.style.backgroundSize=(16/timelineBars*100)+'% 100%';
  if(stage){
   const windows=form?songPartWindows(form,Math.min(3,track.stage)):[{startBar:0,bars:beat.version===3?4:2}];
   if(form)lane.style.position='relative';
   for(const window of windows){
    const sourceId=form?.version&&track.stage<3?(window.startBar===0?form.introSourceId:window.startBar===6?form.outroSourceId:[beat.drumId,beat.audio?.themeId,beat.audio?.arrangementId][track.stage]):null;
    const clip=el(d,'span',{className:'ft-audio-clip',text:sourceId?beginnerById(sourceId)?.name??track.name:track.name,dataset:{ftRole:'clip',color:track.color,startBar:String(window.startBar+1),bars:String(window.bars),...(sourceId?{sourceId,sourceBar:String((window.sourceBar??0)+1)}:{})}});
    clip.style.marginLeft=(window.startBar*100/timelineBars)+'%';clip.style.width=(window.bars*100/timelineBars)+'%';
    if(form){clip.style.position='absolute';clip.style.top='2px';}lane.append(clip);
   }
  }
  row.append(label,lane);rows.append(row);
 }
}

// Visual workspace only. Musical decisions will belong to the game simulation.
export function createStudioWorkspace(document,{projectName='Сеанс без названия'}={}){
 const root=el(document,'section',{className:'ft-workspace',attributes:{'aria-label':'Рабочее пространство FT Studio'}});
 const header=el(document,'header',{className:'ft-top'});
 const brand=el(document,'div',{className:'ft-brand'});
 brand.append(el(document,'span',{className:'ft-monogram',text:'FT'}),el(document,'div',{className:'ft-brand-name',text:'FIELD TONE',attributes:{'aria-label':'FT Studio'}}));
 const session=el(document,'div',{className:'ft-session'});session.append(el(document,'small',{text:'STUDIO / SESSION 01'}),el(document,'strong',{text:projectName,dataset:{ftRole:'session-name'}}));
 const readout=el(document,'div',{className:'ft-readout'});readout.append(el(document,'small',{text:'ПОЗИЦИЯ'}),el(document,'span',{text:'01 : 01 : 000',dataset:{ftRole:'recording-position'}}));
 const tempo=el(document,'div',{className:'ft-tempo'});tempo.append(el(document,'strong',{text:'—',dataset:{ftRole:'recording-tempo'}}),el(document,'small',{text:'BPM'}));
 header.append(brand,session,readout,tempo);
 const body=el(document,'div',{className:'ft-body'}),library=el(document,'aside',{className:'ft-library',dataset:{ftRole:'library'}});
 library.append(el(document,'h2',{text:'Библиотека'}),el(document,'p',{className:'ft-section-note',text:'ЛОКАЛЬНОЕ ОКРУЖЕНИЕ'}));
 for(const [title,items]of [['Сеанс',['Текущая работа','Архив проектов']],['Источники',['Ударные','Бас','Клавиши','Атмосферы','Записи']],['Окружение',['Инструменты','Обработки','Библиотеки']]]){
  const group=el(document,'section',{className:'ft-library-group'});group.append(el(document,'h3',{text:title}));
  for(const item of items){const line=el(document,'div',{className:'ft-library-item'});line.append(el(document,'i',{className:'ft-folder',attributes:{'aria-hidden':'true'}}),el(document,'span',{text:item}));group.append(line);}library.append(group);
 }
 library.append(el(document,'div',{className:'ft-library-foot',text:'FT / WORKSTATION 1.0'}));
 const main=el(document,'main',{className:'ft-main'}),arrangement=el(document,'section',{className:'ft-playlist',attributes:{'aria-label':'Дорожки проекта'}});
 const actions=el(document,'div',{className:'ft-project-actions',dataset:{ftRole:'project-actions'}});
 const title=el(document,'div',{className:'ft-panel-heading'});title.append(el(document,'h2',{text:'Дорожки'}),el(document,'span',{text:'ARRANGEMENT 01'}),el(document,'small',{dataset:{ftRole:'track-count'}}));arrangement.append(actions,title);
 arrangement.append(el(document,'div',{className:'ft-workflow',dataset:{ftRole:'workflow'}}));
 const transport=el(document,'div',{className:'ft-transport',dataset:{ftRole:'transport'},attributes:{'aria-label':'Воспроизведение'}});
 for(const [label,glyph]of [['Play','▶'],['Pause','Ⅱ'],['Stop','■']])transport.append(button(document,glyph,{dataset:{ftAction:label.toLowerCase()},attributes:{'aria-label':label,title:label}}));
 const transportStatus=el(document,'span',{className:'ft-transport-status',text:'Готов',dataset:{ftRole:'transport-status'},attributes:{role:'status'}});
 const recordingStatus=el(document,'strong',{text:'',dataset:{ftRole:'recording-status'},attributes:{role:'status'}});recordingStatus.hidden=true;recordingStatus.style.color='#ff6969';
 const toggles=el(document,'div',{className:'ft-panel-toggles'});
 transport.append(transportStatus,recordingStatus,toggles);arrangement.append(transport);
 const scroll=el(document,'div',{className:'ft-playlist-scroll',attributes:{tabindex:'0','aria-label':'Прокрутка дорожек'}});
 const grid=el(document,'div',{className:'ft-grid-inner'});scroll.append(grid);
 const timelineHeader=el(document,'div',{className:'ft-timeline-header'});
 timelineHeader.append(el(document,'div',{className:'ft-section-markers',dataset:{ftRole:'section-markers'},attributes:{role:'group','aria-label':'Части песни'}}));
 const timeline=el(document,'div',{className:'ft-timeline'});timeline.append(el(document,'span',{className:'ft-track-corner',text:'ТАКТ'}));
 for(let bar=1;bar<=16;bar++)timeline.append(el(document,'span',{text:String(bar)}));timelineHeader.append(timeline);grid.append(timelineHeader);
 grid.append(el(document,'div',{dataset:{ftRole:'lanes'}}));
 const recordingLane=el(document,'div',{className:'ft-lane',dataset:{ftRole:'recording-lane'}});
 recordingLane.append(el(document,'div',{className:'ft-lane-label',text:'Vocal / REC'}));
 const recordingGrid=el(document,'div',{className:'ft-lane-grid'}),waveform=el(document,'div',{dataset:{ftRole:'recording-waveform'},attributes:{'aria-label':'Записываемая волна'}});waveform.hidden=true;
 waveform.style.height='32px';waveform.style.background='repeating-linear-gradient(90deg,#e86b68 0 2px,transparent 2px 5px)';waveform.style.clipPath='polygon(0 45%,4% 20%,8% 35%,12% 5%,18% 30%,24% 15%,29% 40%,36% 10%,43% 25%,51% 4%,58% 35%,67% 15%,74% 30%,83% 5%,90% 25%,100% 40%,100% 60%,90% 75%,83% 95%,74% 70%,67% 85%,58% 65%,51% 96%,43% 75%,36% 90%,29% 60%,24% 85%,18% 70%,12% 95%,8% 65%,4% 80%,0 55%)';
 recordingGrid.append(waveform);recordingLane.append(recordingGrid);recordingLane.hidden=true;root.recordingLane=recordingLane;
 const playheadArea=el(document,'div',{className:'ft-playhead-area',attributes:{'aria-hidden':'true'}});
 playheadArea.append(el(document,'i',{className:'ft-playhead',dataset:{ftRole:'playhead'}}));grid.append(playheadArea);
 arrangement.append(scroll);
 const rhythm=el(document,'section',{className:'ft-rhythm',dataset:{ftRole:'rhythm'},attributes:{'aria-label':'Область ритма, только внешний вид'}}),rhythmTitle=el(document,'div',{className:'ft-panel-heading'});
 rhythm.hidden=true;
 const libraryToggle=button(document,'Библиотека',{attributes:{'aria-expanded':'true'}},()=>{library.hidden=!library.hidden;body.dataset.libraryHidden=String(library.hidden);libraryToggle.setAttribute('aria-expanded',String(!library.hidden));});
 const rhythmToggle=button(document,'Ритм-панель',{attributes:{'aria-expanded':'false'}},()=>{rhythm.hidden=!rhythm.hidden;rhythmToggle.setAttribute('aria-expanded',String(!rhythm.hidden));});
 toggles.append(libraryToggle,rhythmToggle);
 rhythmTitle.append(el(document,'h2',{text:'Ритм'}),el(document,'span',{text:'PATTERN / —'}),el(document,'small',{text:'16 ШАГОВ'}));rhythm.append(rhythmTitle);
 const rack=el(document,'div',{className:'ft-rack'});
 for(const [index,label]of ['Бочка','Малый','Хэты','Перкуссия'].entries()){
  const row=el(document,'div',{className:'ft-rack-row'});row.append(el(document,'span',{className:'ft-channel-number',text:String(index+1).padStart(2,'0')}),el(document,'span',{className:'ft-channel-name',text:label}));
  const steps=el(document,'div',{className:'ft-steps',attributes:{'aria-hidden':'true'}});for(let i=0;i<16;i++)steps.append(el(document,'i',{className:Math.floor(i/4)%2?'ft-step alternate':'ft-step'}));row.append(steps);rack.append(row);
 }
 rhythm.append(rack);main.append(arrangement,rhythm);body.append(library,main);
 const footer=el(document,'footer',{className:'ft-bottom'});footer.append(el(document,'span',{text:'●  СТУДИЯ ГОТОВА'}),el(document,'span',{text:'Рабочее пространство · музыкальные действия появятся позже'}),el(document,'span',{text:'44.1 kHz / 16 bit'}));
 root.append(header,body,footer);renderStudioTracks(root,null);return root;
}
