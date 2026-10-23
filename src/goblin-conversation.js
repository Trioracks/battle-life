import {GOBLIN_ID,GOBLIN_NAME,normalizeGoblin} from './goblin-catalog.js?rev=57';
import {receivePhoneEvents} from './phone-notifications.js?rev=57';
import {validGameMinute} from './game-minute.js?rev=57';
import {battleStage,battleStageText} from './battle-stage.js?rev=57';
const battleLink={label:'Макаревич Battle',url:'underweb://social/community/makarevich-1'};
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
export function goblinReplyContext(state,nowMinute=state.socialRuntime?.lastMinute??state.lastGameMinute??0){
 const g=state.social?.goblin??{},stage=g.stage,choices=[],used=new Set(g.contextUsed??[]),messages=state.social?.dialogs?.[GOBLIN_ID]?.messages??[],seen=id=>messages.some(m=>m.id==='goblin:'+id);
 const add=(id,label,condition=true)=>{if(condition&&!used.has(stage+':'+id))choices.push([id,label]);};
 const specs=goblinContextResponses(state,nowMinute);let hint='Гоблин пока занят. Новые сообщения появятся здесь.',expectedFileTypes=[];
 if(stage==='hello')choices.push(['good','Хорошо! Сам как?'],['normal','Нормально, сам как?'],['bad','Да так себе...']);
 if(stage==='invite-wait'&&seen('mood')){add('music','О, чё за музыка?');add('old-band','А как твоя старая группа?');if(seen('company'))choices.push(['yes','Давай попробуем. Что нужно сделать?']);hint='Можно спросить про музыку или подождать продолжения.';}
 if(stage==='invite')choices.push(['yes','О, круто! А чё дальше?'],['later','Я пока сам разберусь']);
 if(stage==='subscribe'){if(state.social?.subscriptions?.includes('makarevich-1'))choices.push(['subscribed','Я подписался, что дальше?']);hint='Открой группу по ссылке в сообщении и подпишись. Регистрация на баттл подаётся отдельно.';}
 if(stage==='paused')choices.push(['resume','Чувак, давай всё-таки попробуем']);
 if(stage==='client')hint='Скачай torent по ссылке в сообщении, открой загрузки и заверши установку.';
 if(stage==='software')hint='Ссылки на Рэпблокнот и FT Studio придут в сообщениях. Скачай и установи программы.';
 if(stage==='text'){expectedFileTypes=['txt'];hint='Закончи текст и сохрани его в TXT через «Сохранить». Затем прикрепи файл сюда.';}
 if(stage==='beat'){expectedFileTypes=['wav','mp3'];hint='Собери бит в FT Studio и экспортируй WAV или MP3. Сам проект сохраняется отдельно в FLP.';}
 if(stage==='beat-project'){expectedFileTypes=['flp'];hint='Сохрани проект в FT Studio и прикрепи FLP из выбранной папки.';}
 if(stage==='vocal'){expectedFileTypes=['wav','mp3'];hint='Открой полученный проект, добавь свой вокал и экспортируй полный трек.';}
 if(stage==='finished')hint='Скачай готовый трек из сообщения. В группе баттла нажми «Сдать трек», прикрепи файл и отправь работу.';
 for(const [id,spec]of Object.entries(specs))add(id,spec.label,spec.available);
 if(g.activeFollowup){const id=g.activeFollowup;add('working:'+id,'Пишу понемногу, пробую новое.');add('resting:'+id,'Пока отдыхаю, позже вернусь.');add('results:'+id,'Где посмотреть этап и оценки?');}
 return {choices,hint,expectedFileTypes};
}
export function goblinContextResponses(state,nowMinute){
 const g=state.social?.goblin??{},stage=g.stage,s=state.software??{},allowed=ids=>ids.includes(stage),installing=id=>s.installer?.appId===id&&s.installer.step!=='finish';
 return {
  'downloading-client':{available:stage==='client'&&s.client?.receivedBytes>0&&!s.client.installed,label:'Качаю torent.',body:'Ага, дождись загрузки. Потом открой установщик из «Загрузок» и пройди до конца.'},
  'installing-client':{available:stage==='client'&&installing('client'),label:'Устанавливаю torent.',body:'Ну хорош) Дойди до кнопки «Готово», потом за программами пойдём.'},
  'help-client':{available:stage==='client',label:'Не понял, как установить torent.',body:'Открой ссылку из моего сообщения, скачай установщик. В «Моём компьютере» зайди в «Загрузки», открой его и нажимай «Далее», затем «Установить» и «Готово».'},
  'installing-notebook':{available:allowed(['software','text'])&&installing('notebook'),label:'Рэпблокнот устанавливается.',body:'Отлично. Дождись конца установки — появится значок на рабочем столе. Потом создадим текст.'},
  'installed-notebook':{available:allowed(['software','text'])&&s.notebook?.installed&&!state.projects?.some(p=>p.kind==='lyrics'),label:'Блокнот установил, ещё ничего не писал.',body:'Тогда открой его и нажми «Новый». Для баттла выбери Макаревича: тема подставится сама. На первых шагах герой пишет сам, дальше будут доступны настройки.'},
  'installing-ft':{available:allowed(['software','text','beat'])&&installing('ft'),label:'FT Studio устанавливается.',body:'Кайф. Установка закончится — открой студию. Сначала собери бит, голос добавим после.'},
  'installed-ft':{available:allowed(['software','text','beat'])&&s.ft?.installed&&!state.projects?.some(p=>p.kind==='beat'),label:'FT Studio поставил, пока не начинал.',body:'Открывай и создавай новый проект. Для начала экспериментальный жанр. Три этапа: ритм, музыкальная основа и аранжировка. Не жди идеального результата с первого раза.'},
  'help-text':{available:stage==='text',label:'Напомни, как написать и сохранить текст.',body:'В Рэпблокноте нажми «Новый», выбери баттл и закончи этапы. Нажми «Сохранить»: выберешь папку и имя TXT. В чате «Прикрепить» откроет те же папки.'},
  'saved-text':{available:stage==='text'&&state.fileSystem?.files.some(f=>f.type==='txt'&&f.snapshot?.status==='ready'),label:'Текст сохранил. Как тебе его скинуть?',body:'Жми «Прикрепить» под сообщением, найди свой TXT в папке, куда сохранял. Выбери файл, затем отправь сообщение.'},
  'help-beat':{available:allowed(['beat','beat-project']),label:'Объясни ещё раз про бит и проект.',body:'FLP — это проект с настройками и дорожками. Кнопка «Сохранить» пишет FLP. WAV или MP3 — готовый звук: их получаешь через «Экспорт». Сначала пришли звук, потом сам проект, чтобы я мог поправить настройки.'},
  'help-vocal':{available:stage==='vocal',label:'Как добавить голос к твоему биту?',body:'Скачай мой FLP, открой его в FT Studio через «Открыть проект». Выбери готовый текст и запиши вокал. Потом сделай сведение и экспорт полного трека в WAV или MP3.'},
  'help-submit':{available:stage==='finished',label:'Куда теперь сдавать трек?',body:'Зайди в Макаревич Battle по ссылке. Справа «Сдать трек». В переписке прикрепи готовый WAV или MP3, выбери отправку работы и нажми «Отправить». Сверху будет текущий этап и срок.',links:[battleLink]},
 };
}
export function goblinContextResponse(state,choice,nowMinute){
 if(choice==='music')return {body:'Сейчас экспериментальный хип-хоп пробую. До сих пор учусь, но одному скучнее. Есть идея, куда с этим залететь)',cancel:['biography','company']};
 if(choice==='old-band')return {body:'Разбежались мы. Железо продали, на репетиции времени ни у кого. Но писать музыку всё равно хочется, поэтому в рэп полез. Давай и тебя подтянем)',cancel:['biography','company']};
 if(choice.startsWith('working:'))return {body:'Хорош. Делай в своём темпе. Если застрянешь на тексте или звуке, спрашивай)',clearFollowup:true};
 if(choice.startsWith('resting:'))return {body:'Да, отдых тоже нужен. Я пока поковыряю своё. Вернёшься — пиши.',clearFollowup:true};
 if(choice.startsWith('results:')){const stage=battleStage(state,{battleId:'makarevich-1',nowMinute});return {body:battleStageText(stage)+'. Нажми на таблицу раунда: там оценки и комментарии судей.',links:[{label:'Таблица раунда',url:stage.tableUrl}],clearFollowup:true};}
 return goblinContextResponses(state,nowMinute)[choice]??null;
}
export function deliverGoblinMessage(g,dialog,msg,at){
 const id='goblin:'+msg.id;if(dialog.messages.some(m=>m.id===id))return null;
 const rank={new:0,'greeting-wait':1,hello:2,'invite-wait':3,invite:4,paused:4,subscribe:5,client:6,software:7,text:8,'waiting-text':8,beat:9,'waiting-beat':9,'beat-project':10,'waiting-project':10,vocal:11,'waiting-track':11,finished:12};
 if(msg.nextStage&&rank[msg.nextStage]<rank[g.stage])return null;
 const {nextStage,activeElapsedSeconds,chatSeconds,...rest}=msg;dialog.messages.push({...rest,id,at,kind:'personal',sender:GOBLIN_ID});dialog.unread=true;if(nextStage)g.stage=nextStage;if(msg.followupId)g.activeFollowup=msg.followupId;
 return {id,type:'personal-message',source:'В кругу',sender:GOBLIN_NAME,profileId:GOBLIN_ID,dialogId:GOBLIN_ID,dueAt:at,text:msg.body};
}
export function advanceGoblinActiveChat(input,{nowMinute,activeSeconds,visible,powered,paused}={}){
 if(!validGameMinute(nowMinute)||!Number.isFinite(activeSeconds)||activeSeconds<=0||!visible||!powered||paused||!input.social?.goblin?.pending?.length)return {state:input,events:[],changed:false};
 const g=normalizeGoblin(input.social.goblin),dialog=structuredClone(input.social.dialogs?.[GOBLIN_ID]??{peer:{kind:'person',id:GOBLIN_ID},messages:[],unread:false}),events=[];let budget=Math.min(3,activeSeconds);
 for(let count=0;count<16&&budget>0&&g.pending.length;count++){
  const msg=g.pending.sort((a,b)=>a.at-b.at)[0],total=1+hash(msg.id)%3,elapsed=Math.max(0,Math.min(total,Number.isFinite(msg.activeElapsedSeconds)?msg.activeElapsedSeconds:0)),spent=Math.min(budget,total-elapsed);msg.activeElapsedSeconds=elapsed+spent;budget-=spent;
  if(msg.activeElapsedSeconds<total-1e-8)break;g.pending=g.pending.filter(m=>m.id!==msg.id);const event=deliverGoblinMessage(g,dialog,msg,nowMinute);if(event)events.push(event);
 }
 return {state:{...input,social:{...input.social,goblin:g,dialogs:{...input.social.dialogs,[GOBLIN_ID]:dialog}},phone:receivePhoneEvents(input.phone,events)},events,changed:true};
}
export function goblinFollowupPlan(state,now){
 const g=state.social?.goblin;if(g?.startedAt==null||['new','greeting-wait','hello','invite-wait','invite','subscribe','client','software','paused'].includes(g.stage))return {messages:[],seen:g?.followupSeen??[],lastSmallTalkAt:g?.lastSmallTalkAt??null,changed:false};
 const seen=new Set(g.followupSeen??[]),messages=[],applications=new Set(state.battleApplications?.map(a=>a.battleId)),candidate=[];
 for(const s of state.battleSubmissions??[])if(!s.issue&&s.id&&Number.isFinite(s.sentAt)&&s.sentAt<=now)candidate.push({id:'submitted:'+s.id,at:s.sentAt,body:'Ну что, сдал? Вижу, работа ушла. Выдыхай пока) Когда судьи закончат, посмотрим оценки и подумаем, что подтянуть.',links:[battleLink]});
 for(const e of state.socialRuntime?.events??[])if(applications.has(e.battleId)&&e.dueAt<=now&&e.type==='round-result')candidate.push({id:e.id,at:e.dueAt,body:'О, оценки уже выложили. Смотрел свои? Открой таблицу раунда, там у судей ещё комментарии бывают.',links:[{label:'Таблица раунда',url:'underweb://social/results/'+e.battleId+'/'+e.roundId}]});
 for(const w of state.battleWindows??[])if(applications.has(w.battleId)&&now>=w.closesAt-4320&&now<w.closesAt-2880)candidate.push({id:'deadline:'+w.id,at:w.closesAt-4320,body:'Чувак, через три дня приём закроется. Как твой трек? Если уже сдал — хорошо, если ещё пишешь, оставь время на экспорт и отправку.',links:[battleLink]});
 let changed=false;for(const e of candidate.filter(e=>!seen.has(e.id)).sort((a,b)=>b.at-a.at)){seen.add(e.id);changed=true;if(!messages.length&&now-e.at<2880)messages.push({id:'follow:'+e.id,at:now+10,body:e.body,links:e.links,followupId:e.id});}
 let lastSmallTalkAt=g.lastSmallTalkAt??now;if(g.lastSmallTalkAt==null)changed=true;
 if(now-lastSmallTalkAt>=2880&&g.stage==='finished'){lastSmallTalkAt=now;changed=true;if(!messages.length&&!g.pending.some(m=>m.followupId?.startsWith('chat:')))messages.push({id:'follow:chat:'+now,at:now+20,body:'Здорово) Как сам? Что-нибудь новое пишешь или пока отдыхаешь от музыки?',followupId:'chat:'+now});}
 return {messages,seen:[...seen],lastSmallTalkAt,changed};
}
