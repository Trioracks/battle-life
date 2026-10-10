const apps = Object.freeze([
  { id: 'computer', label: 'Мой компьютер', iconId: 'computer', description: 'Диск C: и Мои проекты' },
  { id: 'underweb', label: 'Underweb', iconId: 'underweb', description: 'Локальная сеть баттлов' },
  { id: 'torent', label: 'torent', iconId: 'torent', description: 'Каталог игровых загрузок' },
  { id: 'ft-studio', label: 'FT Studio', iconId: 'studio', description: 'Музыкальная станция' },
  { id: 'ripline', label: 'RIPLINE', iconId: 'torent', description: 'Игровое извлечение лупов из роликов' },
]);

export const WALLPAPERS = Object.freeze([
  { id: 'courtyard', label: 'Ночной двор', path: './assets/ui/virtual-pc/wallpaper-courtyard.png' },
  { id: 'factory', label: 'Заводской рассвет', path: './assets/ui/virtual-pc/wallpaper-factory.png' },
  { id: 'room', label: 'Лампа у стены', path: './assets/ui/virtual-pc/wallpaper-room.png' },
]);

export const BATTLE_BRIEFS = Object.freeze([
  { id: 'concrete-echo', title: 'Бетонное эхо', condition: '90–104 BPM · жёсткий куплет · ночь района', season:'СЕЗОН 01', mark:'БЭ', theme:'Голос спального района', color:'concrete', prize:'5 000 ₽', format:'Аудио · онлайн', description:'Независимый баттл для тех, кому есть что сказать о своём дворе. Живые истории, характер и собственный голос важнее громкого имени.', rules:['Сольная работа на русском языке','Продолжительность от 60 до 120 секунд','Один участник — одна заявка'], organizer:'Объединение «Бетон»' },
  { id: 'open-mic-17', title: 'Открытый микрофон 17', condition: '72–92 BPM · история без припева', season:'ВЫПУСК 17', mark:'17', theme:'Без лишних слов', color:'mic', prize:'Без денежного приза', format:'Аудио · онлайн', description:'Место для первых работ и новых имён. Расскажи небольшую историю без припева: здесь слушают подачу, содержание и настроение.', rules:['Свободная тема в рамках задания','Одна история, без припева','До двух минут аудио'], organizer:'Клуб «Открытый микрофон»' },
  { id: 'yard-cipher', title: 'Шифр двора', condition: '96–120 BPM · ответ сопернику · 8 строк', season:'ПЕРВЫЙ КРУГ', mark:'ШД', theme:'Свой среди своих', color:'cipher', prize:'3 000 ₽', format:'Аудио · онлайн', description:'Короткий формат, в котором каждая строка на счету. Дворовый характер и точность формулировок — отправная точка этого турнира.', rules:['Восемь строк в отборочной работе','Без чужих куплетов и личных данных','Один аудиофайл на участника'], organizer:'Студия «Шифр»' },
]);

export function desktopApps(state) {
  const installed = state?.download?.status === 'installed';
  return apps.filter(app => (app.id !== 'ft-studio' || installed)&&(app.id!=='ripline'||state?.music?.ripline)).map(app => ({ ...app }));
}

export function resolveUnderweb(address) {
  const raw=typeof address==='string'?address.trim():'';
  const normalized = raw.toLowerCase().replaceAll('ё','е');
  if(!normalized||['underweb://iskra','underweb://iskra/','искра'].includes(normalized))return {type:'home',url:'underweb://iskra'};
  if (normalized === 'underweb://battles' || normalized === 'баттлы' || normalized === 'battle') {
    return { type: 'battles', url:'underweb://battles', briefs: BATTLE_BRIEFS.map(brief => ({ ...brief })) };
  }
  const id = normalized.startsWith('underweb://battles/') ? normalized.slice('underweb://battles/'.length) : '';
  const brief = BATTLE_BRIEFS.find(item => item.id === id);
  if (brief) return { type: 'battle',url:'underweb://battles/'+brief.id, brief: { ...brief } };
  if(normalized==='underweb://software/ft-studio')return {type:'software',url:normalized};
  if(['underweb://samples','underweb://ripline'].includes(normalized))return {type:normalized.endsWith('samples')?'samples':'ripline',url:normalized};
  if(normalized.includes('://')&&!normalized.startsWith('underweb://iskra/search?'))return {type:'error',url:raw,message:'Такой адрес в Underweb не найден.'};
  let query=raw;
  if(normalized.startsWith('underweb://iskra/search?'))query=new URL(raw).searchParams.get('q')??'';
  // Limit the decoded query, never its percent-encoded history address.
  query=Array.from(query).slice(0,160).join('');
  const words=query.toLowerCase().replaceAll('ё','е').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const pages=[{title:'Каталог рэп-баттлов',url:'underweb://battles',site:'Район / Баттлы',description:'Открытые аудиобаттлы, правила, темы отборов и заявки. Бетонное эхо, Открытый микрофон 17, Шифр двора.',keywords:'рэп баттлы рэп-баттлы рэп батл rap battle турнир аудио конкурс'},...BATTLE_BRIEFS.map(b=>({title:b.title,url:'underweb://battles/'+b.id,site:'Район / '+b.season,description:b.description,keywords:'рэп баттл турнир '+b.theme})),{title:'FT Studio — домашняя студия',url:'underweb://software/ft-studio',site:'Софт / FT Studio',description:'Музыкальная рабочая среда. Установка через torent, 800 МБ.',keywords:'fl ft studio студия программа музыка скачать софт бит'}];
  pages.push({title:'Базар — лупы для FT',url:'underweb://samples',site:'Музыка / Базар',description:'Барабанные лупы 90 BPM. Прослушать и купить для своего бита.',keywords:'биты бит купить сэмплы samples drums барабаны лупы магазин'}, {title:'RIPLINE — срез сигнала',url:'underweb://ripline',site:'Софт / RIPLINE',description:'Игровое извлечение звука из роликов. Осторожно: риск заражения виртуального ПК.',keywords:'ripline видео youtube вырезать скачать пиратский'});
  const results=words.length?pages.map(p=>({...p,score:words.reduce((n,w)=>n+(p.title+' '+p.description+' '+p.keywords).toLowerCase().replaceAll('ё','е').includes(w),0)})).filter(p=>p.score>0).sort((a,b)=>b.score-a.score).map(({keywords,score,...p})=>p):[];
  return {type:'search',url:'underweb://iskra/search?q='+encodeURIComponent(query),query,results};
}
