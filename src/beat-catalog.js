// Prototype balance, deliberately centralized pending the next design session.
export const BEAT_RULES=Object.freeze({freeSkill:40,startingCash:5000,price:250,cleanup:100,torrentRisk:.15,ripRisk:.25,stageMinutes:[60,90,90],workSeconds:8,minSatiety:20,minEnergy:15,satietyPerMinute:.12,energyPerMinute:.1});
export const BEAT_STAGES=Object.freeze([
 {name:'Ритмическая основа',sliders:['Ровный грув','Подвижность','Сбивки']},
 {name:'Музыкальная основа',sliders:['Мелодия','Гармония','Фактура']},
 {name:'Аранжировка',sliders:['Повторяемость','Контраст частей','Переходы']},
]);
export const BEAT_GENRES=Object.freeze([
 {id:'boombap',name:'Бум-бэп',available:true,targets:[[9,3,2],[5,5,8],[9,4,2]]},
 {id:'trap',name:'Трэп',targets:[[7,8,5],[4,3,9],[8,7,5]]},
 {id:'drill',name:'Дрилл',targets:[[5,9,6],[4,3,8],[7,7,6]]},
 {id:'lofi',name:'Лоу-фай',targets:[[8,3,1],[6,8,7],[9,3,2]]},
 {id:'chiptune',name:'Чиптюн',targets:[[6,7,4],[10,5,9],[6,8,7]]},
 {id:'gfunk',name:'Джи-фанк',targets:[[8,6,3],[8,7,8],[8,6,5]]},
]);
export const DRUMS=Object.freeze(['free','shop'].flatMap(bank=>Array.from({length:bank==='free'?5:10},(_,i)=>{
 const number=String(i+1).padStart(2,'0');
 return Object.freeze({id:`${bank}-${number}`,name:`${bank==='free'?'Практика':'Архив'} / ${number}`,bank,bpm:90,bars:2,kind:'drums',path:`./stems/drums/${bank==='shop'?'shops':'free'}/${number}.mp3`,price:bank==='shop'?BEAT_RULES.price:0});
})));
export const drumById=id=>DRUMS.find(d=>d.id===id);
export const loopSeconds=(bpm=90,bars=2)=>60/bpm*4*bars;
