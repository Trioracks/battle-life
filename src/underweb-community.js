// Original fictional conversations, inspired by the structure of 2007–2013 forums.
// No post or quotation is attributed to a historical performer.
import {LOCAL_MUSIC_BOARDS,LOCAL_MUSIC_TOPICS} from './underweb-community-data.js?rev=43';
export const COMMUNITY_BOARDS=Object.freeze([
 {id:'concrete-echo',title:'Бетонное эхо',description:'Голос спального района. Отбор, звук и первые столкновения.',motto:'Слышно даже за стеной.',host:'Пыльный_Пульт'},
 {id:'open-mic-17',title:'Открытый микрофон 17',description:'Истории без припева. Для первых записей и упрямых рассказчиков.',motto:'Микрофон открыт. Слова за тобой.',host:'кассета_Б'},
 {id:'yard-cipher',title:'Шифр двора',description:'Восемь строк, один ответ. Здесь считают каждую строчку.',motto:'Восемь строк — восемь попаданий.',host:'Ключ_13'},
 {id:'makarevich-1',title:'Макаревич Батл №1',description:'Первый набор. Спорим о тексте, подаче и странных названиях.',motto:'Новый круг, старый магнитофон.',host:'Антенна_Внутри'},
].map(b=>({...b,category:'battles'})).concat(LOCAL_MUSIC_BOARDS));
const casts={
 'concrete-echo':['Пыльный_Пульт','Шум_Подъезда','Без_Запятой','Ржавый_Сэмпл','Щебень_88'],
 'open-mic-17':['кассета_Б','Ночная_Смена','Третий_Перрон','Лампа_В_Окне','Неровный_Почерк'],
 'yard-cipher':['Ключ_13','Восемь_Делений','Острый_Угол','Короткий_Выдох','Смотрящий_Круга'],
 'makarevich-1':['Антенна_Внутри','Радио_Чердак','Пульт_Без_Mute','Тихий_Припев','Ручной_Режим'],
};
const authors={
 'Пыльный_Пульт':{role:'организатор',signature:'Сначала файл. Потом разговоры.'},
 'кассета_Б':{role:'старожил',signature:'На обратной стороне ещё есть место.'},
 'Ключ_13':{role:'участник',signature:'Не тот ключ? Значит, другая дверь.'},
 'Антенна_Внутри':{role:'модератор',signature:'Ловлю сигнал между этажами.'},
 'Шум_Подъезда':{role:'участник',signature:'Читаю после десяти. Соседи тоже слушают.'},
 'Без_Запятой':{role:'участник',signature:'Рифма не исправляет пустую мысль.'},
 'Ржавый_Сэмпл':{role:'участник',signature:'Не клиппуй мне душу.'},
};
const conversations={
 'concrete-echo':[
  'Открыли отбор «Голос спального района». Не тащите чужие куплеты: хочется услышать ваш двор, а не сборник любимых цитат.',
  'Записал у окна. Автобус влетел прямо в последнюю строку. Оставлю: он хотя бы попал в бит.',
  'Автобус у тебя уже второй участник. А где сам текст? Двор — это не просто список подъездов под бочку.',
  'Текст есть. Только не надо опять мерить характер количеством хрипов в микрофон.',
  'Прослушал черновик. Первые четыре строки цепляют, дальше ты объясняешь то, что уже сказал. Режь, не жалей.',
  'Переписал концовку. Теперь автобус молчит, а последняя мысль наконец помещается в такт.',
  'Вот теперь спорить интересно. Раньше было громче, сейчас — точнее. Не путайте эти две вещи.',
  'Удивительно: выключил усилитель, а злости в куплете прибавилось. Спасибо за пинок.',
 ],
 'open-mic-17':[
  'Семнадцатый микрофон открыт. На отборе рассказываем одну историю без припева. Начало, поворот, точка — всё в ваших руках.',
  'У меня история про ночную смену. Припев выкинул, но теперь очень хочется повторять последнюю строчку.',
  'Повторять строчку восемь раз — это припев в накладных усах. Ты нас за кого держишь?',
  'Да понял я. Просто без повторов сразу слышно, где сюжет провисает. Неприятное открытие.',
  'И хорошее. Дай персонажу что-нибудь сделать. Пока он только сообщает слушателю, что устал.',
  'Переделал: он пропускает свой автобус, чтобы вернуть чужую сумку. Теперь история хотя бы куда-то едет.',
  'Сумка едет, автобус едет, а размер опять пешком. Прочитай вслух до записи, серьёзно.',
  'Прочитал. Половину союзов отправил домой. Остальным велел не толкаться.',
 ],
 'yard-cipher':[
  'Первый круг «Свой среди своих»: ровно восемь строк. Слово против слова, без личных данных и чужих куплетов.',
  'Восемь? Я пока обращение к сопернику закончил, уже девять получилось.',
  'Значит, можешь начинать с девятой. Сэкономим время всем присутствующим.',
  'Смешно. Зато у тебя в каждой строке «район» рифмуется с другим районом. География вместо атаки.',
  'Оба выдохнули. Панчи обсуждаем, адреса и семьи не трогаем. Следующая такая попытка — сообщение снимается.',
  'Ладно, ужал до восьми. Самую длинную строчку прочитал с третьего вдоха. Есть над чем работать.',
  'Если для строки нужен запасной баллон, дели мысль. Восемь строк — это ограничение формы, не объёма лёгких.',
  'Убрал вступление. Теперь ответ начинается сразу. Пожалуй, короткий формат полезнее, чем я думал.',
 ],
 'makarevich-1':[
  'Макаревич Батл №1: первый отбор, тема «Не переключай». Это отдельный вымышленный турнир нашей игры; правила и заявки — на его сайте.',
  'Название такое, будто сейчас выйдет человек с гитарой и попросит нас перестать шуметь.',
  'Тебе бы в треке столько же фантазии, сколько в обсуждении вывески. Записывай уже.',
  'Записываю. Хочу начать тихо, а потом разнести финал. Не каждую же строчку орать в красную зону.',
  'Тихо — можно. Неразборчиво — не надо. Финал не спасёт, если до него никто не дослушает.',
  'Сменил расстояние до микрофона, стало лучше. И да, первые две строки выкинул. Они были ни о чём.',
  'Наконец-то технический прогресс: автор сам нашёл воду до того, как её нашли слушатели.',
  'Запомнил. На следующем круге принесу тебе сухой куплет. Без упаковки.',
 ],
};
const generalDays=[1,1,1,2,4,6,8,11];
export const COMMUNITY_TOPICS=Object.freeze(COMMUNITY_BOARDS.filter(b=>b.category==='battles').flatMap(board=>[
 {id:board.id+'-general',boardId:board.id,title:'Отбор · обсуждение и первые работы',author:board.host,gameDay:1,pinned:false,kind:'general'},
 {id:board.id+'-rules',boardId:board.id,title:'Регламент · вопросы организаторам',author:board.host,gameDay:1,pinned:true,kind:'rules'},
 {id:board.id+'-round',boardId:board.id,title:'Мастерская · разбираем черновики',author:casts[board.id][3],gameDay:4,pinned:false,kind:'round'},
]).concat(LOCAL_MUSIC_TOPICS));
const topicIds=new Set(COMMUNITY_TOPICS.map(t=>t.id));
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
const validDay=v=>Number.isSafeInteger(v)&&v>0;
export const communityDay=value=>validDay(value)?value:1;
export const COMMUNITY_REPLY_LIMIT=500;
export function normalizeCommunity(value){
 const v=record(value)?value:{},seen=new Set();
 const replies=(Array.isArray(v.replies)?v.replies:[]).filter(p=>record(p)&&/^local-\d+$/.test(p.id)&&topicIds.has(p.topicId)&&validDay(p.gameDay)&&text(p.author,32).trim()&&text(p.body,4000).trim()&&!seen.has(p.id)&&seen.add(p.id)).map(p=>({id:p.id,topicId:p.topicId,author:text(p.author,32).trim(),body:text(p.body,4000).trim(),gameDay:p.gameDay,quoteId:typeof p.quoteId==='string'?p.quoteId.slice(0,100):null}));
 const readTopics=Object.fromEntries(Object.entries(record(v.readTopics)?v.readTopics:{}).filter(([id,day])=>topicIds.has(id)&&validDay(day)));
 const drafts=Object.fromEntries(Object.entries(record(v.drafts)?v.drafts:{}).filter(([id,draft])=>topicIds.has(id)&&record(draft)&&typeof draft.body==='string').map(([id,draft])=>[id,{body:text(draft.body,4000),quoteId:typeof draft.quoteId==='string'?draft.quoteId.slice(0,100):null}]));
 return {version:1,replies,readTopics,drafts};
}
function seededPosts(topic){
 const board=COMMUNITY_BOARDS.find(b=>b.id===topic.boardId);
 const cast=casts[board.id],sequence=cast&&[cast[0],cast[1],cast[2],cast[1],cast[4],cast[1],cast[3],cast[1]];
 const entries=topic.kind==='discussion'?topic.posts:topic.kind==='general'?conversations[board.id].map((body,i)=>({body,author:sequence[i],gameDay:generalDays[i]})):topic.kind==='rules'?[
  {body:'В этой теме спрашиваем про регламент. Заявка подаётся на сайте баттла. Отправка аудиотреков пока не открыта: наличие черновика в блокноте не означает сдачу.',author:board.host,gameDay:1},
  {body:'Если начал текст до заявки, его придётся писать заново?',author:cast[1],gameDay:2},
  {body:'Нет. Сначала прочитай тему и ограничения, затем регистрируйся. Черновик остаётся твоим; регистрация сама по себе его не отправляет.',author:board.host,gameDay:2},
  {body:'Гостевые куплеты и публикация чужих личных данных запрещены. Разбирать слабые строки можно, устраивать травлю — нельзя.',author:cast[4],gameDay:5},
 ]:[
  {body:'Открыл мастерскую. Здесь разбираем структуру и ритм черновиков. Оценок судей нет: обсуждаем, что можно исправить до записи.',author:cast[3],gameDay:4},
  {body:'Сильное начало не обязывает давить всё оставшееся время. Оставьте паузу, чтобы следующая мысль хоть куда-нибудь поместилась.',author:cast[2],gameDay:4},
  {body:'Проверяю текст под бит. На бумаге выглядел ровным, вслух половина слов мешает. Похоже, блокнот хитрее меня.',author:cast[1],gameDay:7},
  {body:'Блокнот не хитрит. Он просто не дышит за тебя. Убирай лишнее и перечитывай.',author:cast[4],gameDay:10},
 ];
 return entries.map((p,i)=>({...p,id:topic.id+'-'+(i+1),topicId:topic.id,quoteId:null,role:p.author===board.host?'модератор раздела':'участник',signature:board.category==='battles'?board.motto:'Подземка · '+board.title,...authors[p.author]}));
}
export function topicsForDay(boardId,gameDay=1,value){
 const day=communityDay(gameDay),state=normalizeCommunity(value);
 return COMMUNITY_TOPICS.filter(t=>(!boardId||t.boardId===boardId)&&t.gameDay<=day).map(t=>{
  const posts=visiblePosts(t,day,state),last=posts.at(-1);return {...t,replies:Math.max(0,posts.length-1),last,unread:(state.readTopics[t.id]??0)<last.gameDay};
 }).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.last.gameDay-a.last.gameDay||a.id.localeCompare(b.id));
}
function visiblePosts(topic,day,state){return [...seededPosts(topic),...state.replies.filter(p=>p.topicId===topic.id).map(p=>({...p,role:'игрок',signature:'Участник локальной сцены.'}))].filter(p=>p.gameDay<=day&&p.gameDay>=topic.gameDay).sort((a,b)=>a.gameDay-b.gameDay);}
export function topicForDay(id,gameDay=1,value,page=1){
 const day=communityDay(gameDay),topic=COMMUNITY_TOPICS.find(t=>t.id===id&&t.gameDay<=day);if(!topic)return null;
 const all=visiblePosts(topic,day,normalizeCommunity(value)),pages=Math.max(1,Math.ceil(all.length/6)),selected=Math.min(pages,Number.isSafeInteger(page)&&page>0?page:1);
 return {...topic,allPosts:all,posts:all.slice((selected-1)*6,selected*6),page:selected,pages,total:all.length};
}
export function replyToTopic(value,{topicId,author,body,gameDay,quoteId=null}={}){
 const state=normalizeCommunity(value),topic=topicForDay(topicId,gameDay,state),name=text(author,32).trim(),message=text(body,4000).trim();
 if(!validDay(gameDay)||!topic||!name||!message)return {ok:false,reason:'Напиши ответ и проверь доступность темы.',community:state};
 if(quoteId&&!topic.allPosts.some(p=>p.id===quoteId))return {ok:false,reason:'Цитируемое сообщение недоступно на эту дату.',community:state};
 if(state.replies.length>=COMMUNITY_REPLY_LIMIT)return {ok:false,reason:'Достигнут лимит '+COMMUNITY_REPLY_LIMIT+' ответов. Новый ответ не отправлен; существующая история не изменена.',community:state};
 const next=1+Math.max(0,...state.replies.map(p=>Number(p.id.slice(6))||0));
 const post={id:'local-'+next,topicId,author:name,body:message,gameDay,quoteId};
 const drafts={...state.drafts};delete drafts[topicId];
 return {ok:true,reason:'',post,community:normalizeCommunity({...state,replies:[...state.replies,post],readTopics:{...state.readTopics,[topicId]:gameDay},drafts})};
}
