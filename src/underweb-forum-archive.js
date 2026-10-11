// Curated historical reading, never player conversations. Every row is tied to
// an observed source post. Paraphrases are editorial, not invented quotations.
const forum='https://www.hip-hop.ru/forum/';
export const FORUM_ARCHIVE_BOARDS=Object.freeze([
 {id:'official-battle',title:'Официальные баттлы',description:'Девятый официальный: итоги и разговоры после финала.'},
 {id:'russian-rap',title:'Русский рэп',description:'Исполнители и обсуждения слушателей.'},
 {id:'rap-releases',title:'Rap / MCing · релизы',description:'Что слушали и как выбирали альбомы года.'},
 {id:'production',title:'DJing / создание музыки',description:'Микрофоны, домашняя запись и звук.'},
 {id:'demos',title:'Демо-музыка',description:'Первые отклики на опубликованные работы.'},
 {id:'community',title:'Жизнь форума',description:'Форумный быт, шутки и цитатник.'},
]);
const row=(author,date,time,body,kind='paraphrase')=>({author,date,time,body,kind});
const entries=[
 {id:'repac-winner',boardId:'official-battle',title:'RE-pac: обсуждение победы в девятом официальном',sourceTitle:'Hip-Hop.ru · обсуждение победителя · исходная страница 50',sourceUrl:forum+'re-pac-pobeditel-9-go-oficialnogo-battl-hip-416368-print50/',posts:[
  row('OneShotForEnemy','2012-02-03','11:22','Знал что Пак победит','excerpt'),
  row('Vitaliss','2012-02-03','12:56','Автор доволен победой RE-pac, вспоминает выбывших участников и спор вокруг судейства.'),
  row('GOR 228','2012-02-03','18:18','Короткое поздравление победителю, сопровождаемое выпадом в адрес другого участника.'),
  row('Саша Герасимов','2012-02-03','18:24','Автор спрашивает об отсутствии фестиваля и о сроках десятого официального баттла.'),
  row('Shift017','2012-02-04','12:23','Положительный отклик на интервью, вышедшее после победы.'),
  row('Vitalik Xp02','2012-02-04','14:31','Автор поддерживает предыдущую оценку интервью.'),
  row('Movs','2012-02-04','16:06','В споре об официальных и независимых баттлах приводит участие Оксимирона как контрпример.'),
  row('iсe','2012-02-04','17:27','Предполагает, что следующим будет независимый баттл, но подчёркивает неопределённость.'),
  row('bazzookast','2012-02-04','22:18','Ищет треки отбора восьмого официального и спрашивает о существовании архива.'),
  row('Dmight','2012-02-04','23:02','В ответ на вопрос об архиве указывает на тему RuTracker.'),
  row('meds','2012-02-05','09:38','Уточняет, что в найденной подборке первый раунд представлен выборочно.'),
 ]},
 {id:'vet-numbasis',boardId:'demos',title:'Вет / iSQUAD: отклики на летнее демо',sourceTitle:'Hip-Hop.ru · демо Вета · исходная страница 1',sourceUrl:forum+'vet-isquad-numbasis-2012-demo-444242/',posts:[
  row('вова ванэс','2012-08-14','19:13','Автор рад снова услышать исполнителя, но считает, что молодая аудитория сравнит его с более новыми именами.'),
  row('Ветал','2012-08-14','19:18','Cпасибо за гуманный тон','excerpt'),
  row('вова ванэс','2012-08-14','19:31','Спрашивает о дальнейших музыкальных планах.'),
  row('Ветал','2012-08-15','13:32','Рассказывает о переменном интересе к музыке и о нескольких идеях на будущее.'),
  row('LonGGG','2012-08-15','14:10','Отмечает, что давно не слышал новых работ.'),
  row('Aspid','2012-08-15','15:39','Рад знакомому голосу; одновременно сравнивает запись с работами более молодых исполнителей.'),
  row('zerno','2012-08-19','09:55','Критикует инструментал и считает прежние записи сильнее.'),
  row('May\'M','2012-08-29','21:49','Оставляет положительный отклик, хотя вспоминает более удачные работы автора.'),
 ]},
 {id:'babangida-listeners',boardId:'russian-rap',title:'Бабангида: слушатели спорят об исполнителе',sourceTitle:'Hip-Hop.ru · обсуждение Бабангиды · исходная страница 51',sourceUrl:forum+'kto-takoi-babangida-babangida-obsuzhdenie-ispolnitelya-chast-04-a-437981/index51.html',posts:[
  row('ШТАНГЕНЦИРКУЛЬ','2012-07-03','17:36','В споре о конфликте исполнителей уточняет последовательность публичных сообщений.'),
  row('TheRexam','2012-07-03','21:17','Несмотря на отрицательное отношение к исполнителю, собирается послушать альбом.'),
 ]},
 {id:'sasisa-discussion',boardId:'demos',title:'Стивен Сига: обсуждение трека и сетки sasisa3',sourceTitle:'Hip-Hop.ru · трек Стивена Сиги · исходная страница 6',sourceUrl:forum+'stiven-siga-space-music-inc-bilet-v-odin-444535/index6.html',posts:[
  row('7nikichan7','2012-08-31','19:49','Уточняет, что обсуждаемый участник дошёл до седьмого раунда.'),
  row('thesatorii','2012-08-31','19:52','Пишет, что ожидал прохода Mask Musical.'),
  row('Le Taon','2012-08-31','19:54','Считает, что интересных ему участников в баттле осталось мало.'),
 ]},
 {id:'microphones-october',boardId:'production',title:'Выбор микрофона: домашняя запись и сравнение моделей',sourceTitle:'Hip-Hop.ru · вопросы о микрофонах · исходная страница 115',sourceUrl:forum+'mikrofony-voprosy-i-otvety-chast-a-6-a-397066/index115.html',posts:[
  row('everLay','2012-10-02','13:51','Возвращает спор к своему вопросу: какую из обсуждаемых моделей выбрать.'),
  row('Qdesnik_mad','2012-10-02','14:30','Обращает внимание на допустимое звуковое давление Audio-Technica.'),
  row('NikiNik','2012-10-02','14:31','Сообщает об опыте использования AT2035; с Rode лично не работал.'),
  row('Гуник','2012-10-02','15:01','Сомневается в практической значимости небольшой разницы паспортных характеристик.'),
  row('Dobermann','2012-10-02','17:59','Советует сравнить звуковые примеры в интернете и в специальной теме форума.'),
  row('uNkind','2012-10-04','15:38','Предлагает два примера вокала и просит помочь сравнить их звучание.'),
  row('[Inkogn1to]','2012-10-04','16:14','Сравнивает несколько Rode и AT4040; спрашивает о ламповом микрофоне в неподготовленной комнате.'),
  row('Dobermann','2012-10-04','16:16','Из перечисленных вариантов субъективно предпочитает RODE NT2A.'),
 ]},
 {id:'albums-2012',boardId:'rap-releases',title:'Слушатели выбирают альбомы 2012 года',sourceTitle:'Hip-Hop.ru · релизы 2012 года · исходная страница 1',sourceUrl:forum+'2012-albomy-relizy-goda-453446-print/',posts:[
  row('sickdog','2012-10-31','10:35','Открывает обсуждение музыкальных итогов, хотя до конца года остаются два месяца.'),
  row('Chaos','2012-10-31','10:43','Свой список вывалю, когда год кончится.','excerpt'),
  row('Radio','2012-10-31','11:13','Не согласен с оценкой года как слабого; выделяет свежий альбом Journalist 103.'),
  row('Chaos','2012-10-31','11:17','Снова защищает прошлогодние релизы.'),
  row('U_DUN','2012-10-31','11:49','Выделяет новые альбомы Кендрика и Шона, ожидает релиз Roc Marciano.'),
  row('Radio','2012-10-31','12:25','Объясняет, что списки помогают находить музыку, когда не успеваешь читать все темы.'),
  row('Салатный Кот','2012-10-31','12:26','Пишет, что мало слушал в этом году и планирует небольшой личный топ.'),
  row('\'CASPER','2012-10-31','18:37','Считает год удачным, но подводить итог рано; перечисляет запомнившиеся релизы.'),
 ]},
 {id:'forum-quotes',boardId:'community',title:'Форумный цитатник: сентябрьские разговоры',sourceTitle:'Hip-Hop.ru · цитатник форума · исходная страница 32',sourceUrl:forum+'citaty-foruma-chast-a-4-a-368857/index32.html',posts:[
  row('коуч','2012-09-01','11:18','Переносит в цитатник обмен репликами из обсуждения концертов Оксимирона.'),
  row('Bellief','2012-09-01','18:56','Сохраняет шутливый разговор о преподавателе английского и произношении.'),
  row('Radio','2012-09-01','20:03','Цитирует обсуждение анонса совместного мини-альбома Nekby и Кита.'),
  row('illectah','2012-09-09','22:45','Приносит в цитатник просьбу SkipMC изменить ник вслед за творческим псевдонимом.'),
 ]},
];
export const FORUM_ARCHIVE_TOPICS=Object.freeze(entries.map(t=>Object.freeze({...t,posts:Object.freeze(t.posts.map((p,i)=>Object.freeze({...p,id:t.id+'-source-'+(i+1),sourceUrl:t.sourceUrl,sourceTitle:t.sourceTitle})))})));
const gameDate=day=>new Date(Date.UTC(2012,8,1)+(Number.isSafeInteger(day)&&day>0?day-1:0)*86400000).toISOString().slice(0,10);
const visible=(topic,day)=>topic.posts.filter(p=>p.date<=gameDate(day));
export function archiveTopicsForDay(boardId,day=1){
 return FORUM_ARCHIVE_TOPICS.filter(t=>!boardId||t.boardId===boardId).flatMap(t=>{const posts=visible(t,day);return posts.length?[{...t,posts,total:posts.length,last:posts.at(-1),date:posts[0].date}]:[];}).sort((a,b)=>b.last.date.localeCompare(a.last.date)||a.id.localeCompare(b.id));
}
export function archiveBoardsForDay(day=1){return FORUM_ARCHIVE_BOARDS.map(b=>({...b,topics:archiveTopicsForDay(b.id,day)})).filter(b=>b.topics.length);}
export function archiveTopicForDay(id,day=1,page=1){
 const topic=FORUM_ARCHIVE_TOPICS.find(t=>t.id===id);if(!topic)return null;
 const allPosts=visible(topic,day);if(!allPosts.length)return null;
 const pages=Math.max(1,Math.ceil(allPosts.length/6)),selected=Math.min(pages,Number.isSafeInteger(page)&&page>0?page:1);
 return {...topic,allPosts,posts:allPosts.slice((selected-1)*6,selected*6),total:allPosts.length,page:selected,pages};
}
