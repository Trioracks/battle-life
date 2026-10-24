import {homeDateLabel} from './home-calendar.js?rev=60';

// Two authored word tables, all masculine singular: every pairing agrees.
const MOODS=['Пыльный','Тихий','Ночной','Осенний','Сонный','Ламповый','Сырой','Ржавый','Северный','Тёмный','Дальний','Тёплый','Поздний','Старый','Пустой','Хриплый','Забытый','Стеклянный','Бумажный','Рваный','Медленный','Сломанный','Туманный','Тревожный','Последний','Случайный','Подземный','Обратный','Глухой','Упрямый','Серый','Городской'];
const PLACES=['район','двор','переулок','подъезд','кассетник','сигнал','маршрут','шорох','чердак','переход','трамвай','квартал','рассвет','фонарь','эфир','вокзал','перрон','поворот','пульс','контур','набросок','отголосок','блокнот','асфальт','поезд','почерк','порог','мотив','предел','чертёж','горизонт','маяк'];
const SINGLE=['Петля','Изнанка','Пепел','Пульс','Оттепель','Развязка','Черновик','След','Касание','Инерция','Осколки','Копоть','Пауза','Сдвиг','Привычка','Линия','Примета','Провода','Переезд','Перемотка','Тишина','Нервы','Отражение','Шёпот','Полусон','Заземление','Память','Накал','Послесловие','Отголоски','Бессонница','Кромка','Внутри','Напрямик','Заново','Насквозь','Навылет','Поодиночке','Недосказанность','Дыхание','Невесомость','Окраина','Послезавтра','Смещение','Наброски','Прикосновение','Встречный','Неизбежность'];
const TRIPLE=[...['старым мостом','последним поездом','пустым вокзалом','дальним поворотом','закрытым окном','ночным кварталом','тихим двором','ржавым забором'].flatMap(pair=>['За','Перед'].map(preposition=>preposition+' '+pair)),...['Там, где тихо','Вместо лишних слов','До первых поездов','Между двух миров','На исходе дня','После долгой зимы','Без обратного адреса','В тишине дворов','По ту сторону','Ниже уровня неба','Среди чужих окон','От первого лица','До последней строки','Из последних сил','Мимо старых вывесок','На краю города']];
export const PROJECT_NAMES=Object.freeze([...MOODS.flatMap(mood=>PLACES.map(place=>mood+' '+place)),...SINGLE,...TRIPLE]);

export const baseProjectName=name=>String(name??'').trim().replace(/^\d{2}\.\d{2}\.\d{4}\s*[—–-]\s*/,'').toLocaleLowerCase('ru');
export function distinctProjectName(name,existingNames=[]){
 const used=new Set(existingNames.map(baseProjectName)),base=String(name??'').trim();
 if(!used.has(baseProjectName(base)))return base;
 for(let suffix=2;suffix<=used.size+2;suffix++){const candidate=base.slice(0,Math.max(1,64-String(suffix).length-3))+' ('+suffix+')';if(!used.has(baseProjectName(candidate)))return candidate;}
}
export function randomBeatName(gameDay,previous='',random=Math.random,existingNames=[]){
 const total=PROJECT_NAMES.length,draw=Number(random());
 let index=Math.floor(Math.max(0,Math.min(Number.isFinite(draw)?draw:0,.999999999))*total);
 const title=i=>homeDateLabel(gameDay)+' — '+PROJECT_NAMES[i],used=new Set([...existingNames,previous].filter(Boolean).map(baseProjectName));
 for(let step=0;step<total;step++){const candidate=title((index+step)%total);if(!used.has(baseProjectName(candidate)))return candidate;}
 return distinctProjectName(title(index),[...existingNames,previous]);
}
