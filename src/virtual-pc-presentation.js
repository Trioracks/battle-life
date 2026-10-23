import {PC_IDENTITY} from './pc-identity.js?rev=57';
export function pcPresentation(snapshot,power,playerName='Игрок'){
 const {phase='room',progress=0,coldStart=false}=snapshot;
 let screen=power==='on'?'desktop':'off',brightness=screen==='off'?0:1;
 if(phase==='power-on'||(phase==='zoom-in'&&coldStart))screen='bios';
 if(['loading','welcome','shutdown','desktop'].includes(phase))screen=phase;
 if(phase==='fade-out'){screen='shutdown';brightness=1-progress;}
 else if(screen!=='off')brightness=1;
 const labels={off:['',''],bios:['Запуск Слобода OS…',''],loading:[PC_IDENTITY.name,'Загрузка системы'],welcome:['Добро пожаловать',playerName],desktop:[PC_IDENTITY.name,playerName],shutdown:['Завершение работы','Сохранение параметров…']};
 return {screen,title:labels[screen][0],subtitle:labels[screen][1],progress,brightness};
}
