import {pcElement as el} from './virtual-pc-dom.js?rev=40';
import {socialButton} from './social-dom.js?rev=40';
import {playTrackVersion} from './track-version-audio.js?rev=40';
import {chooseBeginnerParts} from './beat-beginner-bank.js?rev=40';
import {npcPlaybackDescriptor} from './battle-npc-audio.js?rev=40';
import {profileAccess} from './social-profile-policy.js?rev=40';
import {battleCharacter} from './battle-demo-config.js?rev=40';
import {metadataGameMinute} from './social-registration.js?rev=40';
// These authored background demos use the cleared in-game bank. They are not
// historical recordings or entries in the current submission window.
export function backgroundAudioDescriptor(item){
 const parts=chooseBeginnerParts(()=>((item.seed??0)*37%997)/997);
 return {key:'social-background:'+item.id,owner:'social',durationSeconds:32/3,parts:Object.values(parts).map(id=>({id,loopSeconds:32/3})),mix:null};
}
export function createSocialAudio(audio,{getState,getMetadata,navigate,onAnalyze}={}){
 let disposed=false,generation=0;const listeners=[];
 const button=(d,text,handler,options)=>{const node=socialButton(d,text,handler,options);listeners.push([node,handler]);return node;};
 const stop=()=>{generation++;audio?.stop?.();};
 return {
  row(d,{version,item}){
   const row=el(d,'div',{className:'sn-audio'}),title=version?.name??(item?[(item.archive?item.author:null),item.title].filter(Boolean).join(' — '):'Сохранённая работа недоступна');
   const status=el(d,'small',{attributes:{'aria-live':'polite'}}),play=button(d,'▶',async()=>{
    if(disposed)return;const token=++generation;status.textContent='Загрузка…';
    try{
     const result=version?await playTrackVersion(audio,version):item?{ok:Boolean(await audio?.playDescriptor(backgroundAudioDescriptor(item)))}:{ok:false,reason:'Версия недоступна. Исходник не подменён.'};
     if(disposed||token!==generation)return;
     status.textContent=result.ok?'Играет':result.reason??'Не удалось воспроизвести запись.';
    }catch{if(!disposed&&token===generation)status.textContent='Не удалось воспроизвести запись.';}
   },{dataset:{socialAudio:version?.id??item?.id??'missing'},attributes:{'aria-label':'Слушать: '+title}});
   row.append(play,el(d,'div',{className:'sn-audio-title',text:title}),button(d,'Ⅱ',()=>{generation++;audio?.pause?.();status.textContent='Пауза';},{attributes:{'aria-label':'Пауза: '+title}}),button(d,'■',()=>{stop();status.textContent='Остановлено';},{attributes:{'aria-label':'Остановить: '+title}}),el(d,'span',{className:'sn-audio-duration',text:'0:'+String(Math.round(version?.recipe?.descriptor?.durationSeconds??32/3)).padStart(2,'0')}),status);
   if(version?.npc){
    const id=version.npc.characterId,name=battleCharacter(id)?.nickname??'Автор';
    if(getState&&getMetadata&&navigate&&profileAccess(getState(),{characterId:id,nowMinute:metadataGameMinute(getMetadata())}).canView)row.append(button(d,name,()=>navigate('underweb://social/profile/'+id),{className:'sn-link',attributes:{'aria-label':'Страница автора: '+name}}));
    const npc=npcPlaybackDescriptor(version);
    if(!npc.ok){status.textContent=npc.reason;play.disabled=true;}
    if(npc.previewDescriptor)row.append(button(d,'Предпросмотр бита — без голоса',async()=>{
     if(disposed)return;const token=++generation;status.textContent='Загрузка бита…';
     try{const ok=await audio?.playDescriptor(npc.previewDescriptor);if(!disposed&&token===generation)status.textContent=ok?'Играет бит без голоса':'Не удалось воспроизвести бит.';}
     catch{if(!disposed&&token===generation)status.textContent='Не удалось воспроизвести бит.';}
    },{attributes:{'aria-label':'Предпросмотр бита — без голоса'}}));
   }
   if(version&&onAnalyze)row.append(button(d,'Изучить трек · 45 мин',()=>onAnalyze({trackVersionId:version.id,reviewIds:[]})));
   return row;
  },stop,dispose(){disposed=true;generation++;for(const [node,handler]of listeners)node.removeEventListener('click',handler);listeners.length=0;}
 };
}
