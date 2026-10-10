import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=20';

export const FT_TRACKS=Object.freeze([
 ...['Drum Kit','Bass','Percussion'].map(name=>({name,stage:0,color:'rhythm'})),
 ...['Lead','Atmosphere','Harmony'].map(name=>({name,stage:1,color:'theme'})),
 ...['Sound Design','Sub Bass','FX'].map(name=>({name,stage:2,color:'arrangement'})),
]);

// Visual workspace only. Musical decisions will belong to the game simulation.
export function createStudioWorkspace(document,{projectName='Сеанс без названия'}={}){
 const root=el(document,'section',{className:'ft-workspace',attributes:{'aria-label':'Рабочее пространство FT Studio'}});
 const header=el(document,'header',{className:'ft-top'});
 const brand=el(document,'div',{className:'ft-brand'});
 brand.append(el(document,'span',{className:'ft-monogram',text:'FT'}),el(document,'div',{className:'ft-brand-name',text:'FIELD TONE',attributes:{'aria-label':'FT Studio'}}));
 const session=el(document,'div',{className:'ft-session'});session.append(el(document,'small',{text:'STUDIO / SESSION 01'}),el(document,'strong',{text:projectName}));
 const readout=el(document,'div',{className:'ft-readout'});readout.append(el(document,'small',{text:'ПОЗИЦИЯ'}),el(document,'span',{text:'01 : 01 : 000'}));
 const tempo=el(document,'div',{className:'ft-tempo'});tempo.append(el(document,'strong',{text:'—'}),el(document,'small',{text:'BPM'}));
 header.append(brand,session,readout,tempo);
 const body=el(document,'div',{className:'ft-body'}),library=el(document,'aside',{className:'ft-library',dataset:{ftRole:'library'}});
 library.append(el(document,'h2',{text:'Библиотека'}),el(document,'p',{className:'ft-section-note',text:'ЛОКАЛЬНОЕ ОКРУЖЕНИЕ'}));
 for(const [title,items]of [['Сеанс',['Текущая работа','Архив проектов']],['Источники',['Ударные','Бас','Клавиши','Атмосферы','Записи']],['Окружение',['Инструменты','Обработки','Библиотеки']]]){
  const group=el(document,'section',{className:'ft-library-group'});group.append(el(document,'h3',{text:title}));
  for(const item of items){const line=el(document,'div',{className:'ft-library-item'});line.append(el(document,'i',{className:'ft-folder',attributes:{'aria-hidden':'true'}}),el(document,'span',{text:item}));group.append(line);}library.append(group);
 }
 library.append(el(document,'div',{className:'ft-library-foot',text:'FT / WORKSTATION 1.0'}));
 const main=el(document,'main',{className:'ft-main'}),arrangement=el(document,'section',{className:'ft-playlist',attributes:{'aria-label':'Дорожки проекта'}});
 const title=el(document,'div',{className:'ft-panel-heading'});title.append(el(document,'h2',{text:'Дорожки'}),el(document,'span',{text:'ARRANGEMENT 01'}),el(document,'small',{text:'9 TRACKS'}));arrangement.append(title);
 const transport=el(document,'div',{className:'ft-transport',dataset:{ftRole:'transport'},attributes:{'aria-label':'Воспроизведение'}});
 for(const [label,glyph]of [['Play','▶'],['Pause','Ⅱ'],['Stop','■']])transport.append(button(document,glyph,{dataset:{ftAction:label.toLowerCase()},attributes:{'aria-label':label,title:label}}));
 const transportStatus=el(document,'span',{className:'ft-transport-status',text:'Готов',dataset:{ftRole:'transport-status'},attributes:{role:'status'}});
 const toggles=el(document,'div',{className:'ft-panel-toggles'});
 transport.append(transportStatus,toggles);arrangement.append(transport);
 const scroll=el(document,'div',{className:'ft-playlist-scroll',attributes:{tabindex:'0','aria-label':'Прокрутка дорожек'}});
 const grid=el(document,'div',{className:'ft-grid-inner'});scroll.append(grid);
 const timeline=el(document,'div',{className:'ft-timeline'});timeline.append(el(document,'span',{className:'ft-track-corner',text:'ТАКТ'}));
 for(let bar=1;bar<=16;bar++)timeline.append(el(document,'span',{text:String(bar)}));grid.append(timeline);
 for(const track of FT_TRACKS){
  const row=el(document,'div',{className:'ft-lane',dataset:{stage:String(track.stage),color:track.color}}),label=el(document,'div',{className:'ft-lane-label'});label.append(el(document,'i',{attributes:{'aria-hidden':'true'}}),el(document,'span',{text:track.name,dataset:{ftRole:'track-label'}}));
  row.append(label,el(document,'div',{className:'ft-lane-grid',dataset:{ftRole:'lane'},attributes:{'aria-hidden':'true'}}));grid.append(row);
 }
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
 root.append(header,body,footer);return root;
}
