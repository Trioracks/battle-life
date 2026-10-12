import {COMMUNITY_BOARDS,COMMUNITY_TOPICS,communityDay} from './underweb-community.js?rev=37';
import {newsIssue,archiveForDay} from './underweb-news.js?rev=37';
import {resolveSocialRoute} from './social-routing.js?rev=37';
import {SOCIAL_COMMUNITIES} from './social-catalog.js?rev=37';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=37';
import {FORUM_ARCHIVE_BOARDS,archiveTopicsForDay,archiveTopicForDay} from './underweb-forum-archive.js?rev=37';
const apps = Object.freeze([
  { id: 'computer', label: 'Мой компьютер', iconId: 'computer', description: 'Диск C: и Мои проекты' },
  { id: 'underweb', label: 'Underweb', iconId: 'underweb', description: 'Локальная сеть баттлов' },
  { id: 'torent', label: 'torent', iconId: 'torent', description: 'Каталог игровых загрузок' },
  { id: 'ft-studio', label: 'FT Studio', iconId: 'studio', description: 'Музыкальная станция' },
  { id: 'ripline', label: 'RIPLINE', iconId: 'torent', description: 'Игровое извлечение лупов из роликов' },
  { id: 'rap-notebook', label: 'Рэпблокнот', iconId: 'notebook', description: 'Тексты, рифмы и черновики' },
]);

export const WALLPAPERS = Object.freeze([
  { id: 'courtyard', label: 'Ночной двор', path: './assets/ui/virtual-pc/wallpaper-courtyard.png' },
  { id: 'factory', label: 'Заводской рассвет', path: './assets/ui/virtual-pc/wallpaper-factory.png' },
  { id: 'room', label: 'Лампа у стены', path: './assets/ui/virtual-pc/wallpaper-room.png' },
]);

export const BATTLE_BRIEFS = Object.freeze([
  { id: 'concrete-echo', title: 'Бетонное эхо', condition: '90–104 BPM · жёсткий куплет · ночь района', season:'СЕЗОН 01', mark:'БЭ', theme:'Голос спального района', color:'concrete', prize:'5 000 ₽', format:'Аудио · онлайн', description:'Независимый баттл для тех, кому есть что сказать о своём дворе. Живые истории, характер и собственный голос важнее громкого имени.', rules:['Сольная работа на русском языке','Демо-формат: 4 или 8 тактов, около 11 или 21 секунды при 90 BPM','Один участник — одна заявка'], organizer:'Объединение «Бетон»' },
  { id: 'open-mic-17', title: 'Открытый микрофон 17', condition: '72–92 BPM · история без припева', season:'ВЫПУСК 17', mark:'17', theme:'Без лишних слов', color:'mic', prize:'Без денежного приза', format:'Аудио · онлайн', description:'Место для первых работ и новых имён. Расскажи небольшую историю без припева: здесь слушают подачу, содержание и настроение.', rules:['Свободная тема в рамках задания','Одна история, без припева','До двух минут аудио'], organizer:'Клуб «Открытый микрофон»' },
  { id: 'yard-cipher', title: 'Шифр двора', condition: '96–120 BPM · ответ сопернику · 8 строк', season:'ПЕРВЫЙ КРУГ', mark:'ШД', theme:'Свой среди своих', color:'cipher', prize:'3 000 ₽', format:'Аудио · онлайн', description:'Короткий формат, в котором каждая строка на счету. Дворовый характер и точность формулировок — отправная точка этого турнира.', rules:['Восемь строк в отборочной работе','Без чужих куплетов и личных данных','Один аудиофайл на участника'], organizer:'Студия «Шифр»' },
  {id:'makarevich-1',title:'Макаревич Батл №1',condition:'80–100 BPM · законченная мысль · без чужих куплетов',season:'ПЕРВЫЙ СЕЗОН',mark:'МБ/1',theme:'Не переключай',color:'makarevich',prize:'Публикация в игровом сборнике',format:'Аудио · онлайн',description:'Первый сезон вымышленного камерного турнира. Начни с простой мысли и доведи её до последней строки. Название — часть игрового мира; турнир не связан с реальным артистом.',rules:['Одна сольная работа на участника','Тема отбора — «Не переключай»','Демо-формат: 4 или 8 тактов, около 11 или 21 секунды при 90 BPM. Без чужих куплетов'],organizer:'Редакция «Первый дубль»'},
]);

export function desktopApps(state) {
  const installed = state?.download?.status === 'installed';
  return apps.filter(app => (app.id !== 'ft-studio' || installed)&&(app.id!=='torent'||state?.software?.client?.installed)&&(app.id!=='ripline'||state?.music?.ripline)&&(app.id!=='rap-notebook'||state?.software?.notebook?.installed)).map(app => ({ ...app }));
}

export function resolveUnderweb(address,metadata={}) {
  const raw=typeof address==='string'?address.trim():'';
  const normalized = raw.toLowerCase().replaceAll('ё','е');
  const social=resolveSocialRoute(normalized);if(social)return social;
  if(!normalized||['underweb://iskra','underweb://iskra/','искра'].includes(normalized))return {type:'home',url:'underweb://iskra'};
  if(normalized==='underweb://iskra/archive')return {type:'news-archive',url:normalized,issues:archiveForDay(metadata.gameDay)};
  if(normalized.startsWith('underweb://iskra/news/')){const issue=newsIssue(normalized.slice('underweb://iskra/news/'.length),metadata.gameDay);return issue?{type:'news',url:'underweb://iskra/news/'+issue.id,issue}:{type:'error',url:raw,message:'Этот выпуск ещё не опубликован или не найден в архиве.'};}
  if (normalized === 'underweb://battles' || normalized === 'баттлы' || normalized === 'battle') {
    return { type: 'battles', url:'underweb://battles', briefs: BATTLE_BRIEFS.map(brief => ({ ...brief })) };
  }
  const [id,tab='home',extra] = normalized.startsWith('underweb://battles/') ? normalized.slice('underweb://battles/'.length).split('/') : [];
  const brief = BATTLE_BRIEFS.find(item => item.id === id);
  if (brief&&!extra&&['home','rules','rounds','players'].includes(tab)) return { type: 'battle',url:'underweb://battles/'+brief.id+(tab==='home'?'':'/'+tab),tab,brief: { ...brief } };
  const gameDay=communityDay(metadata.gameDay);
  if(['underweb://forum','underweb://forum/','форум'].includes(normalized))return {type:'forum',url:'underweb://forum'};
  if(normalized.startsWith('underweb://forum/')){
   const url=new URL(normalized),parts=url.pathname.split('/').filter(Boolean),board=COMMUNITY_BOARDS.find(b=>b.id===parts[0]);
   if(parts[0]==='archive'){
    if(parts.length===1){
     const archiveBoardId=url.searchParams.get('board');
     if(!archiveBoardId||FORUM_ARCHIVE_BOARDS.some(b=>b.id===archiveBoardId))return {type:'forum-archive',url:'underweb://forum/archive'+(archiveBoardId?'?board='+archiveBoardId:''),archiveBoardId};
    }
    if(parts.length===3&&parts[1]==='topic'){
     const n=Number(url.searchParams.get('page')),topic=archiveTopicForDay(parts[2],gameDay,Number.isSafeInteger(n)?n:1);
     if(topic)return {type:'forum-archive-topic',url:'underweb://forum/archive/topic/'+topic.id+(topic.page>1?'?page='+topic.page:''),archiveTopicId:topic.id,page:topic.page};
    }
    return {type:'error',url:raw,message:'Материал архива недоступен на текущую игровую дату.'};
   }
   if(board&&parts.length===1)return {type:'forum-board',url:'underweb://forum/'+board.id,board};
   const topic=parts[0]==='topic'&&parts.length===2?COMMUNITY_TOPICS.find(t=>t.id===parts[1]&&t.gameDay<=gameDay):null;
   if(topic){const n=Number(url.searchParams.get('page')),page=Number.isSafeInteger(n)&&n>0?n:1;return {type:'forum-topic',url:'underweb://forum/topic/'+topic.id+(page>1?'?page='+page:''),topic,page};}
   return {type:'error',url:raw,message:'Тема недоступна или ещё не опубликована на текущую игровую дату.'};
  }
  if(normalized==='underweb://software/ft-studio')return {type:'dump',url:'underweb://dump/ft-studio',topic:'ft-studio'};
  if(['underweb://dump','underweb://dump/','файловая помойка'].includes(normalized))return {type:'dump',url:'underweb://dump',topic:null};
  if(['underweb://dump/client','underweb://dump/ft-studio','underweb://dump/notebook'].includes(normalized))return {type:'dump',url:normalized,topic:normalized.split('/').at(-1)};
  if(['underweb://samples','underweb://ripline'].includes(normalized))return {type:normalized.endsWith('samples')?'samples':'ripline',url:normalized};
  if(normalized.includes('://')&&!normalized.startsWith('underweb://iskra/search?'))return {type:'error',url:raw,message:'Такой адрес в Underweb не найден.'};
  let query=raw;
  if(normalized.startsWith('underweb://iskra/search?'))query=new URL(raw).searchParams.get('q')??'';
  // Limit the decoded query, never its percent-encoded history address.
  query=Array.from(query).slice(0,160).join('');
  const words=query.toLowerCase().replaceAll('ё','е').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const pages=[{title:'Каталог рэп-баттлов',url:'underweb://battles',site:'Район / Баттлы',description:'Открытые аудиобаттлы, правила, темы отборов и заявки. Бетонное эхо, Открытый микрофон 17, Шифр двора.',keywords:'рэп баттлы рэп-баттлы рэп батл rap battle турнир аудио конкурс'},...BATTLE_BRIEFS.map(b=>({title:b.title,url:'underweb://battles/'+b.id,site:'Район / '+b.season,description:b.description,keywords:'рэп баттл турнир '+b.theme})),{title:'Файловая помойка — программы',url:'underweb://dump',site:'Файловая помойка / Форум',description:'Клиент torent и FT Studio для домашней студии. Темы, установщики, файлы .torrent.',keywords:'fl ft studio студия программа музыка скачать софт бит torent торрент клиент'}];
  pages.push({title:'Базар — лупы для FT',url:'underweb://samples',site:'Музыка / Базар',description:'Барабанные лупы 90 BPM. Прослушать и купить для своего бита.',keywords:'биты бит купить сэмплы samples drums барабаны лупы магазин'}, {title:'RIPLINE — срез сигнала',url:'underweb://ripline',site:'Софт / RIPLINE',description:'Игровое извлечение звука из роликов. Осторожно: риск заражения виртуального ПК.',keywords:'ripline видео youtube вырезать скачать пиратский'});
  pages.push({title:'Рэпблокнот — тексты и рифмы',url:'underweb://dump/notebook',site:'Файловая помойка / Программы',description:'Установщик Рэпблокнота: черновики, рифмы и работа над текстом для баттла.',keywords:'рэпблокнот блокнот notebook тексты скачать программа'}, {title:'Форум «Подземка»',url:'underweb://forum',site:'Подземка / Форум',description:'Вымышленный игровой форум. Баттлы, обсуждения, цитаты и ответы.',keywords:'рэп форум обсуждение баттлы'});
  for(const topic of COMMUNITY_TOPICS.filter(t=>t.gameDay<=gameDay))pages.push({title:topic.title+' — '+COMMUNITY_BOARDS.find(b=>b.id===topic.boardId).title,url:'underweb://forum/topic/'+topic.id,site:'Подземка / Форум',description:'Тема вымышленного игрового форума. Открыта с игрового дня '+topic.gameDay+'.',keywords:'форум обсуждение '+topic.title});
  for(const issue of archiveForDay(metadata.gameDay))pages.push({title:issue.title,url:'underweb://iskra/news/'+issue.id,site:'Искра / Новости / '+issue.publishDate,description:issue.body[0]??'',keywords:issue.category+' '+issue.sourceTitle});
  pages.push({title:'Исторический архив Hip-Hop.ru',url:'underweb://forum/archive',site:'Hip-Hop.ru / Историческая подборка',description:'Реальные даты и авторы, краткие пересказы, короткие цитаты и ссылки на оригинал. Архив только для чтения.',keywords:'хип хоп hip hop ru форум архив 2012'});
  for(const topic of archiveTopicsForDay(null,gameDay))pages.push({title:topic.title,url:'underweb://forum/archive/topic/'+topic.id,site:'Hip-Hop.ru / Архив / '+topic.date,description:topic.posts[0]?.body??'',keywords:'исторический архив 2012 '+topic.posts.map(p=>p.author).join(' ')});
  const results=words.length?pages.map(p=>({...p,score:words.reduce((n,w)=>n+(p.title+' '+p.description+' '+p.keywords).toLowerCase().replaceAll('ё','е').includes(w),0)})).filter(p=>p.score>0).sort((a,b)=>b.score-a.score).map(({keywords,score,...p})=>p):[];
  const socialPages=[{title:SOCIAL_IDENTITY.name+' — люди и музыка',url:'underweb://social/me',site:SOCIAL_IDENTITY.name,description:'Друзья, фотографии, аудио, сообщения и сообщества.',keywords:SOCIAL_IDENTITY.name+' соцсеть социальная сеть друзья'},...SOCIAL_COMMUNITIES.map(c=>({title:c.name,url:'underweb://social/community/'+c.id,site:SOCIAL_IDENTITY.name+' / Сообщества',description:c.description,keywords:SOCIAL_IDENTITY.name+' сообщество '+c.category}))];
  for(const {keywords,...p} of socialPages)if(words.some(w=>(p.title+' '+p.description+' '+keywords).toLowerCase().replaceAll('ё','е').includes(w)))results.push(p);
  return {type:'search',url:'underweb://iskra/search?q='+encodeURIComponent(query),query,results};
}
