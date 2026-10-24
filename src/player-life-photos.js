import {normalizePlayerPortrait,generatedPortraitKey as portraitKey} from './social-portraits.js?rev=61';
export const PLAYER_LIFE_SCENES=Object.freeze([
 {id:'player-school',stage:'school-group',title:'За последней партой',date:'2005-05-20'},
 {id:'player-barbecue',stage:'barbecue',title:'Шашлыки с ребятами',date:'2012-08-25'},
]);
export function normalizePlayerAlbum(raw){
 if(!raw||typeof raw.key!=='string')return null;
 const photos=PLAYER_LIFE_SCENES.map(scene=>{const p=raw.photos?.find?.(p=>p.id===scene.id),valid=normalizePlayerPortrait({key:raw.key,url:p?.src},{size:512,maxBytes:160*1024});return valid?{...scene,src:valid.url}:null;}).filter(Boolean);
 return photos.length===2?{key:raw.key,photos}:null;
}
export function playerLifePosts(photos){
 return photos.map(photo=>({id:photo.id+'-post',photoId:photo.id,date:photo.id==='player-school'?'2012-08-21':'2012-08-26',body:photo.id==='player-school'?'Нашёл школьную фотку. Все смотрят в камеру, потому что на доску смотреть уже страшно.':'Выбрались на шашлыки. Угли забыли, хлеб забыли. Посидели всё равно хорошо.',likes:photo.id==='player-school'?7:12,comments:photo.id==='player-school'?[{authorId:'anya',body:'А кто фоткал, если вы все в кадре?)'},{authorId:'vitya',body:'Я у тебя тогда ручку занимал. Кажется, ещё не вернул.'}]:[{authorId:'vitya',body:'В следующий раз я отвечаю только за мангал.'},{authorId:'dasha',body:'А я за фотографии. Вот эту хотя бы не удаляй)'}]}));
}
export function createPlayerAlbumController({getState,getAppearance,render,save}){
 const cache=new Map();let pending=null;
 async function request(){
  const appearance=getAppearance();if(!appearance)return {ok:false};const key=portraitKey(appearance);
  if(normalizePlayerAlbum(getState().social?.playerAlbum)?.key===key)return {ok:true};
  if(pending)return pending.key===key?pending.promise:pending.promise.then(request);
  const promise=(async()=>{try{
   let album=cache.get(key);if(!album){const photos=[];for(const scene of PLAYER_LIFE_SCENES){const image=await render({...appearance},scene.stage);photos.push({...scene,src:image.url});}album=normalizePlayerAlbum({key,photos});if(!album)throw Error('Invalid album');cache.set(key,album);if(cache.size>2)cache.delete(cache.keys().next().value);}
   if(portraitKey(getAppearance())!==key)return {ok:false,stale:true};
   const current=getState(),result=save({...current,social:{...current.social,playerAlbum:album}});return {ok:result!==false&&result?.ok!==false};
  }catch{return {ok:false};}})();pending={key,promise};try{return await promise;}finally{if(pending?.promise===promise)pending=null;}
 }
 return {request};
}
