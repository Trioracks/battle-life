import {homeDateLabel} from './home-calendar.js?rev=24';

// Two authored word tables, all masculine singular: every pairing agrees.
const MOODS=['Пыльный','Тихий','Ночной','Осенний','Сонный','Ламповый','Сырой','Ржавый','Северный','Тёмный','Дальний','Тёплый','Поздний','Старый','Пустой','Хриплый'];
const PLACES=['район','двор','переулок','подъезд','кассетник','сигнал','маршрут','шорох','чердак','переход','трамвай','квартал','рассвет','фонарь','эфир','вокзал'];

export function randomBeatName(gameDay,previous='',random=Math.random){
 const total=MOODS.length*PLACES.length,draw=Number(random());
 let index=Math.floor(Math.max(0,Math.min(Number.isFinite(draw)?draw:0,.999999999))*total);
 const title=i=>homeDateLabel(gameDay)+' — '+MOODS[Math.floor(i/PLACES.length)]+' '+PLACES[i%PLACES.length];
 if(title(index)===previous)index=(index+1)%total;
 return title(index);
}
