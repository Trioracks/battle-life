import {pcElement as el} from './virtual-pc-dom.js?rev=37';
import {socialButton} from './social-dom.js?rev=37';
import {playTrackVersion} from './track-version-audio.js?rev=37';
import {chooseBeginnerParts} from './beat-beginner-bank.js?rev=37';
// These authored background demos use the cleared in-game bank. They are not
// historical recordings or entries in the current submission window.
export function backgroundAudioDescriptor(item){
 const parts=chooseBeginnerParts(()=>((item.seed??0)*37%997)/997);
 return {key:'social-background:'+item.id,owner:'social',durationSeconds:32/3,parts:Object.values(parts).map(id=>({id,loopSeconds:32/3})),mix:null};
}
export function createSocialAudio(audio){
 let disposed=false,generation=0,owned=false;
 const stop=()=>{generation++;if(owned){audio?.stop?.();owned=false;}};
 return {
  row(d,{version,item}){
   const row=el(d,'div',{className:'sn-audio'}),title=version?.name??item?.title??'Сохранённая работа недоступна';
   const status=el(d,'small',{attributes:{'aria-live':'polite'}}),play=socialButton(d,'▶',async()=>{
    if(disposed)return;stop();owned=true;const token=++generation;status.textContent='Загрузка…';
    try{
     const result=version?await playTrackVersion(audio,version):item?{ok:Boolean(await audio?.playDescriptor(backgroundAudioDescriptor(item)))}:{ok:false,reason:'Версия недоступна. Исходник не подменён.'};
     if(disposed||token!==generation)return;
     status.textContent=result.ok?'Играет':result.reason??'Не удалось воспроизвести запись.';
    }catch{if(!disposed&&token===generation)status.textContent='Не удалось воспроизвести запись.';}
   },{dataset:{socialAudio:version?.id??item?.id??'missing'},attributes:{'aria-label':'Слушать: '+title}});
   row.append(play,el(d,'div',{className:'sn-audio-title',text:title}),socialButton(d,'■',()=>{stop();status.textContent='Остановлено';},{attributes:{'aria-label':'Остановить: '+title}}),el(d,'span',{className:'sn-audio-duration',text:'0:'+String(Math.round(version?.recipe?.descriptor?.durationSeconds??32/3)).padStart(2,'0')}),status);
   return row;
  },stop,dispose(){disposed=true;stop();}
 };
}
