import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=21';
import {DRUMS,BEAT_RULES} from './beat-catalog.js';
import {acquireDrum,installRipline,cleanMusicVirus} from './beat-production.js?rev=27';
export function createBeatMarket(d,{getState,onChange,audio,navigate,ripline=false}){
 const root=el(d,'section',{className:'beat-market'+(ripline?' ripline':'')}),status=el(d,'p',{className:'beat-market-status',attributes:{role:'status'}});
 function render(){
  const s=getState();root.replaceChildren();root.append(el(d,'small',{text:ripline?'UNDERWEB / UNOFFICIAL TOOLS':'UNDERWEB / SAMPLE EXCHANGE'}),el(d,'h1',{text:ripline?'RIPLINE_':'БАЗАР / ЛУПЫ'}),el(d,'p',{className:'beat-market-intro',text:ripline?'Срез сигнала. Местный инструмент для извлечения лупов.':'Барабанные лупы для домашней студии. 90 BPM / 2 такта.'}),el(d,'strong',{text:`Кошелёк: ${s.music.cash} ₽`}),status);
  if(ripline){root.append(el(d,'p',{text:'Только внутриигровая симуляция. Нет доступа к реальным роликам, торрентам или файлам компьютера.'}));if(!s.music.ripline)root.append(button(d,'Установить RIPLINE',{},()=>{onChange(installRipline(getState()));render();}));else root.append(el(d,'p',{text:'RIPLINE установлен / модуль захвата готов'}));}
  else root.append(button(d,'Открыть RIPLINE',{},()=>navigate('underweb://ripline')));
  if(s.music.infected)root.append(el(d,'p',{className:'beat-virus',text:'⚠ Подозрительное ПО. Работа персонажа за ПК замедлена на 35%.'}),button(d,`Очистить ПК · ${BEAT_RULES.cleanup} ₽`,{},()=>{const r=cleanMusicVirus(getState());onChange(r.state);status.textContent=r.reason;render();}));
  const grid=el(d,'div',{className:'beat-market-grid'});
  for(const a of DRUMS.filter(a=>a.bank==='shop')){
   const owned=s.music.owned.find(o=>o.id===a.id),card=el(d,'article',{className:'beat-market-card'});
   card.append(el(d,'div',{className:'beat-cover',text:a.id.slice(-2)}),el(d,'h2',{text:a.name}),el(d,'p',{text:'Барабанный луп · 90 BPM · не готовый бит'}),button(d,'▶ Слушать',{attributes:{'aria-label':'Слушать '+a.name}},async()=>{status.textContent='Загрузка звука…';const ok=await audio.play({drumId:a.id,stage:1});status.textContent=ok?'Играет: '+a.name:audio.error;}));
   if(owned)card.append(el(d,'strong',{text:'В библиотеке · '+({buy:'куплен',torrent:'torent',rip:'RIPLINE'}[owned.method])}));
   else{
    const obtain=method=>{const r=acquireDrum(getState(),a.id,method);onChange(r.state);status.textContent=r.reason;render();};
    if(ripline){const b=button(d,'Вырезать из ролика',{attributes:{'aria-label':'Вырезать '+a.name}},()=>obtain('rip'));b.disabled=!s.music.ripline;card.append(b,el(d,'small',{text:'Игровой риск вируса: 25%'}));}
    else card.append(button(d,`Купить · ${a.price} ₽`,{attributes:{'aria-label':'Купить '+a.name}},()=>obtain('buy')),button(d,'Получить через torent',{attributes:{'aria-label':'torent '+a.name}},()=>obtain('torrent')),el(d,'small',{text:'torent: бесплатно · игровой риск вируса 15%'}));
   }grid.append(card);
  }
  root.append(button(d,'■ Стоп',{},()=>{audio.stop();status.textContent='Воспроизведение остановлено.';}),grid,el(d,'p',{className:'beat-market-license',text:'Это внутриигровая покупка за игровую валюту, не реальная лицензия. Использование исходных MP3 в коммерческой сборке требует отдельного подтверждения прав.'}));
 }
 render();return root;
}
