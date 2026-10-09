export function pcPresentation(snapshot,power,playerName='Игрок'){
 const {phase='room',progress=0,coldStart=false}=snapshot;
 let screen=power==='on'?'desktop':'off',brightness=screen==='off'?0:1;
 if(phase==='power-on'||(phase==='zoom-in'&&coldStart))screen='bios';
 if(['loading','welcome','shutdown','desktop'].includes(phase))screen=phase;
 if(phase==='fade-out'){screen='shutdown';brightness=1-progress;}
 else if(screen!=='off')brightness=1;
 const labels={off:['',''],bios:['SLOBODA BIOS','Memory test… OK'],loading:['Windows HP','Загрузка системы'],welcome:['Добро пожаловать',playerName],desktop:['Windows HP',playerName],shutdown:['Завершение работы','Сохранение параметров…']};
 return {screen,title:labels[screen][0],subtitle:labels[screen][1],progress,brightness};
}
