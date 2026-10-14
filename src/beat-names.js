import {homeDateLabel} from './home-calendar.js?rev=41';

// Two authored word tables, all masculine singular: every pairing agrees.
const MOODS=['Пыльный','Тихий','Ночной','Осенний','Сонный','Ламповый','Сырой','Ржавый','Северный','Тёмный','Дальний','Тёплый','Поздний','Старый','Пустой','Хриплый'];
const PLACES=['район','двор','переулок','подъезд','кассетник','сигнал','маршрут','шорох','чердак','переход','трамвай','квартал','рассвет','фонарь','эфир','вокзал'];

export const baseProjectName=name=>String(name??'').trim().replace(/^\d{2}\.\d{2}\.\d{4}\s*[—–-]\s*/,'').toLocaleLowerCase('ru');
export function distinctProjectName(name,existingNames=[]){
 const used=new Set(existingNames.map(baseProjectName)),base=String(name??'').trim();
 if(!used.has(baseProjectName(base)))return base;
 for(let suffix=2;suffix<=used.size+2;suffix++){const candidate=base.slice(0,Math.max(1,64-String(suffix).length-3))+' ('+suffix+')';if(!used.has(baseProjectName(candidate)))return candidate;}
}
export function randomBeatName(gameDay,previous='',random=Math.random,existingNames=[]){
 const total=MOODS.length*PLACES.length,draw=Number(random());
 let index=Math.floor(Math.max(0,Math.min(Number.isFinite(draw)?draw:0,.999999999))*total);
 const title=i=>homeDateLabel(gameDay)+' — '+MOODS[Math.floor(i/PLACES.length)]+' '+PLACES[i%PLACES.length],used=new Set([...existingNames,previous].filter(Boolean).map(baseProjectName));
 for(let step=0;step<total;step++){const candidate=title((index+step)%total);if(!used.has(baseProjectName(candidate)))return candidate;}
 return distinctProjectName(title(index),[...existingNames,previous]);
}
