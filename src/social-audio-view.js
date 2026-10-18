import {pcElement as el} from './virtual-pc-dom.js?rev=43';
import {socialButton} from './social-dom.js?rev=43';
import {playTrackVersion} from './track-version-audio.js?rev=47';
import {backgroundAudioDescriptor as archiveDescriptor} from './social-background-audio.js?rev=47';
import {npcPlaybackDescriptor} from './battle-npc-audio.js?rev=47';
import {profileAccess} from './social-profile-policy.js?rev=43';
import {battleCharacter} from './battle-demo-config.js?rev=43';
import {metadataGameMinute} from './social-registration.js?rev=47';
// Retain the catalog-item entry point for existing callers; recipes use IDs.
export const backgroundAudioDescriptor=item=>archiveDescriptor(typeof item==='string'?item:item?.id);
const clock=seconds=>{const n=Math.max(0,Math.floor(seconds+1e-6));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
const idle=()=>({status:'stopped',key:'',owner:null,positionSeconds:0});
export function createSocialAudio(audio,{getState,getMetadata,navigate,onAnalyze}={}){
 let disposed=false,generation=0,snapshot=audio?.getSnapshot?.()??idle();const rows=new Map();
 const releaseRow=(row,entry)=>{entry.active=false;for(const [node,handler]of entry.listeners)node.removeEventListener('click',handler);entry.listeners.length=0;rows.delete(row);};
 // Called before an owner replaces its content. Newly constructed rows outside
 // that subtree keep their registration even before their first attachment.
 const releaseRows=root=>{for(const [row,entry]of rows)if(root.contains(row))releaseRow(row,entry);};
 const update=next=>{if(disposed)return;snapshot=next;for(const entry of rows.values())entry.render();};
 const refresh=()=>update(audio?.getSnapshot?.()??snapshot);
 const unsubscribe=audio?.subscribe?.(update);
 const stop=()=>{generation++;audio?.stop?.();if(!audio?.getSnapshot)snapshot=idle();refresh();};
 // Saved-version validation/cloning stays in its existing adapter. The one-shot
 // option belongs to this playback request, never to a saved recipe or export.
 const player={playDescriptor:descriptor=>audio?.playDescriptor?.(descriptor,{loop:false}),stop:()=>audio?.stop?.(),get error(){return audio?.error??'';}};
 return {
  row(d,{version,item}){
   const entry={active:true,listeners:[],render:null};
   const button=(d,text,handler,options)=>{const node=socialButton(d,text,handler,options);entry.listeners.push([node,handler]);return node;};
   const descriptor=version?null:item?backgroundAudioDescriptor(item):null,key=version?'version:'+version.id:descriptor?.key;
   const title=version?.name??(item?[(item.archive?item.author:null),item.title].filter(Boolean).join(' — '):'Сохранённая работа недоступна');
   const duration=version?.recipe?.descriptor?.durationSeconds??descriptor?.durationSeconds??32/3;
   const row=el(d,'div',{className:'sn-audio'}),status=el(d,'small',{attributes:{'aria-live':'polite'}});
   const progress=el(d,'div',{className:'sn-audio-progress',attributes:{role:'progressbar','aria-label':'Воспроизведение: '+title,'aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':'0'}}),fill=el(d,'span',{className:'sn-audio-progress-fill'}),time=el(d,'span',{className:'sn-audio-time'});
   progress.append(fill);let failure='',unavailable='',previewKey=null,previewDescriptor=null;
   const matches=()=>snapshot.owner==='social'&&Boolean(key)&&(snapshot.key===key||snapshot.key===previewKey);
   const start=async(preview=null)=>{
    if(disposed||!entry.active)return;const token=++generation;failure='';
    if(!audio?.getSnapshot)update({status:'loading',key:preview?.key??key,owner:'social',positionSeconds:0});
    try{
     const result=preview?{ok:Boolean(await player.playDescriptor(preview))}:version?await playTrackVersion(player,version):descriptor?{ok:Boolean(await player.playDescriptor(descriptor))}:{ok:false,reason:'Версия недоступна. Исходник не подменён.'};
     if(disposed||!entry.active||token!==generation)return;
     if(!result.ok)failure=result.reason??audio?.error??'Не удалось воспроизвести запись.';
     if(!audio?.getSnapshot)update({status:result.ok?'playing':'error',key:preview?.key??key,owner:'social',positionSeconds:0});
     refresh();
    }catch{if(!disposed&&entry.active&&token===generation){failure='Не удалось воспроизвести запись.';refresh();}}
   };
   const play=button(d,'▶',()=>{
    if(disposed||!entry.active)return;refresh();
    if(matches()&&snapshot.status==='playing'){generation++;audio?.pause?.();if(!audio?.getSnapshot)update({...snapshot,status:'paused'});refresh();}
    else if(!(matches()&&snapshot.status==='loading'))void start(matches()&&snapshot.key===previewKey?previewDescriptor:null);
   },{dataset:{socialAudio:version?.id??item?.id??'missing'},attributes:{'aria-label':'Слушать: '+title}});
   const halt=button(d,'■',()=>{if(!disposed&&entry.active&&matches()){failure='';stop();}},{attributes:{'aria-label':'Остановить: '+title}});
   const body=el(d,'div',{className:'sn-audio-body'}),detail=el(d,'div',{className:'sn-audio-detail'});
   detail.append(progress,time);body.append(el(d,'div',{className:'sn-audio-title',text:title}),detail);row.append(play,body,halt,status);
   const render=()=>{
    const own=matches(),state=own?snapshot.status:'stopped',playing=state==='playing',loading=state==='loading';
    if(own&&playing)failure='';
    const position=own?Math.max(0,Math.min(duration,snapshot.positionSeconds||0)):0,percent=Math.round(position/duration*100);
    play.textContent=playing?'Ⅱ':'▶';play.setAttribute('aria-label',(playing?'Пауза: ':'Слушать: ')+title);play.disabled=Boolean(unavailable)&&!(own&&snapshot.key===previewKey);play.setAttribute('aria-disabled',String(play.disabled||loading));
    row.setAttribute('aria-busy',String(loading));halt.disabled=!own||state==='stopped';
    progress.setAttribute('aria-valuenow',String(percent));progress.setAttribute('aria-valuetext',clock(position)+' из '+clock(duration));fill.style.setProperty('width',percent+'%');time.textContent=clock(position)+' / '+clock(duration);
    status.textContent=failure||(loading?'Загрузка…':playing?(snapshot.key===previewKey?'Играет бит без голоса':'Играет'):state==='paused'?'Пауза':state==='error'?snapshot.error||'Не удалось воспроизвести запись.':'')||unavailable;
   };
   entry.render=render;rows.set(row,entry);
   if(version?.npc){
    const id=version.npc.characterId,name=battleCharacter(id)?.nickname??'Автор';
    if(getState&&getMetadata&&navigate&&profileAccess(getState(),{characterId:id,nowMinute:metadataGameMinute(getMetadata())}).canView)row.append(button(d,name,()=>navigate('underweb://social/profile/'+id),{className:'sn-link sn-audio-extra',attributes:{'aria-label':'Страница автора: '+name}}));
    const npc=npcPlaybackDescriptor(version);if(!npc.ok)unavailable=npc.reason;
    if(npc.previewDescriptor){previewDescriptor={...npc.previewDescriptor,owner:'social'};previewKey=previewDescriptor.key;row.append(button(d,'Предпросмотр бита — без голоса',()=>void start(previewDescriptor),{className:'sn-button sn-audio-extra',attributes:{'aria-label':'Предпросмотр бита — без голоса'}}));}
   }
   if(version&&onAnalyze){row.append(button(d,'Изучить трек · 45 мин',()=>onAnalyze({trackVersionId:version.id,reviewIds:[]}),{className:'sn-button sn-audio-extra'}));if(getState&&!getState().software?.dossier?.installed)row.append(el(d,'small',{className:'sn-audio-extra',text:'Для изучения скачай и установи Рэп-досье. Все разборы открываются в приложении.'}));}
   render();return row;
  },stop,releaseRows,dispose(){if(disposed)return;disposed=true;generation++;unsubscribe?.();for(const [row,entry]of rows)releaseRow(row,entry);}
 };
}
