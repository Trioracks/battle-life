import {GOBLIN_ID,GOBLIN_PROFILE,GOBLIN_RELEASES,GOBLIN_PHOTOS,goblinArt} from './goblin-catalog.js?rev=57';
import {publicBattleHistory} from './battle-history.js?rev=57';
import {createMusicianProfileView} from './musician-profile-view.js?rev=57';
const diaries=[
 ['Соседи попросили потише. Записал тишину. Теперь жалуются на бас в тишине.','МЦ Филя: вырежи у тишины низ.'],
 ['Продал педаль, купил продукты. Теперь дисторшн только у чайника...','МЦ Филя: хлеб через овердрайв не пропускай.'],
 ['На репетицию пришёл один. Перекличка прошла без замечаний xD','МЦ Филя: барабанщик опять виртуально опоздал.'],
 ['Сфоткался для обложки. Получилось для пропуска на склад.','Анна Лесная: андерграунд начинается с цоколя.'],
 ['Сегодня ничего не записал. Зато придумал название альбома из сорока слов.','МЦ Филя: это уже трек, прочитай.'],
 ['Смотрю старые фотки. Группы нет, а звон в ушах остался. Делаем дальше ^_^','МЦ Филя: я гитару принесу. соль верни.'],
];
function themeArt(name){
 const s=String(name).toLowerCase();
 for(const [re,id]of [[/дожд|слез|осен/,'rain'],[/войн|битв|меч/,'teutonic'],[/сон|ноч|спат/,'run-lie'],[/люб|слад|ед/,'pastry'],[/район|город|двор/,'vicecity'],[/гриб|чай/,'kombucha'],[/свет|окн/,'bitboy-demo']])if(re.test(s))return id;
 let n=0;for(const c of s)n=(n+c.charCodeAt(0))%GOBLIN_RELEASES.length;return GOBLIN_RELEASES[n].art;
}
export function goblinPublicPosts(state,now){
 const authored=(state.social?.goblin?.posts??[]).filter(p=>p.at<=now).map(p=>{
  const r=GOBLIN_RELEASES.find(r=>r.id===p.releaseId),diary=diaries[(p.diaryIndex??0)%diaries.length];
  return {...p,body:r?.body??diary[0],comment:r?.comment??diary[1],art:r?.art??p.photoId,release:r};
 });
 const seen=new Set();
 for(const e of publicBattleHistory(state,{participantId:GOBLIN_ID,nowMinute:now})){
  const v=state.trackVersions?.byId?.[e.trackVersionId];
  if(e.status!=='submitted'||!v||seen.has(v.id))continue;
  const round=state.tournaments?.byId?.[e.battleId]?.rounds?.[e.roundId],result=(state.socialRuntime?.events??[]).find(event=>event.type==='round-result'&&event.battleId===e.battleId&&event.roundId===e.roundId&&event.dueAt<=now),at=result?.dueAt??(round?.status==='complete'?round.completedAt:null);
  if(!Number.isFinite(at)||at>now)continue;seen.add(v.id);
  authored.push({id:'goblin:battle:'+v.id,at,trackVersionId:v.id,body:'Судьи уже выставили оценки, теперь могу показать. Сдал «'+v.name+'» на баттл. Тема: '+(v.recipe?.lyrics?.name??v.name)+'. В голове был эпос, на выходе — сосед с перфоратором xD Зацените, пока я не передумал.',comment:'МЦ Филя: перфоратор в тональности, уже прогресс.',art:themeArt(v.name)});
 }
 return authored.sort((a,b)=>b.at-a.at);
}
export function createGoblinProfileView(d,options){
 const state=options.getState(),now=options.getMetadata().gameMinutes??state.socialRuntime?.lastMinute??0;
 const posts=goblinPublicPosts(state,now).map(p=>({...p,src:goblinArt(p.art)})),photoIds=new Set(['avatar','rehearsal',...posts.map(p=>p.photoId)]);
 return createMusicianProfileView(d,{...options,profile:GOBLIN_PROFILE,posts,photos:GOBLIN_PHOTOS.filter(p=>photoIds.has(p.id)),stateKey:'goblin',subtitle:'У вас в друзьях · Плата Гоблина',historyLabel:'Публичных баттловых работ пока нет. На баттлах ищи ник Плата Гоблина.'});
}
