import {normalizeAppearance} from './avatar-v3-profile.js?rev=43';
export const portraitKey=appearance=>'portrait-v1:'+JSON.stringify(normalizeAppearance(appearance));
const PREFIX='data:image/jpeg;base64,',MAX_BYTES=96*1024;
export function normalizePlayerPortrait(raw){
 if(!raw||typeof raw.key!=='string'||!raw.key.startsWith('portrait-v1:')||raw.key.length>800||typeof raw.url!=='string'||!raw.url.startsWith(PREFIX))return null;
 const encoded=raw.url.slice(PREFIX.length);if(encoded.length>MAX_BYTES*4/3||encoded.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return null;
 let bytes;try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}catch{return null;}
 if(bytes.length>MAX_BYTES||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)return null;
 let dimensions=false;
 for(let i=2;i+3<bytes.length;){
  if(bytes[i++]!==255)return null;while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===218||marker===217)break;
  const length=bytes[i]*256+bytes[i+1];if(length<2||i+length>bytes.length)return null;
  if([192,193,194].includes(marker)){if(length<8||bytes[i+3]*256+bytes[i+4]!==256||bytes[i+5]*256+bytes[i+6]!==256)return null;dimensions=true;}
  i+=length;
 }
 return dimensions?{key:raw.key,url:raw.url}:null;
}
export function socialPhotoSource(src){
 if(typeof src!=='string')return null;
 if(/^\.\/assets\/social\/photos\/[a-z0-9-]+\.jpg$/.test(src))return src;
 if(/^\.\/assets\/npc-photos\/mak-npc-\d\d-(desk|courtyard|street|room)\.jpg$/.test(src))return src;
 return normalizePlayerPortrait({key:'portrait-v1:validated',url:src})?.url??null;
}
export function createPlayerPortraitController({getState,getAppearance,render,save}){
 const cache=new Map();let pending=null;
 async function request(){
  const appearance=getAppearance();if(!appearance)return {ok:false};const key=portraitKey(appearance);
  if(normalizePlayerPortrait(getState().social?.playerPortrait)?.key===key)return {ok:true};
  if(pending)return pending.key===key?pending.promise:pending.promise.then(request);
  const promise=(async()=>{
   try{
    let portrait=cache.get(key);if(!portrait){const result=await render({...appearance});portrait=normalizePlayerPortrait({key,url:result.url});if(!portrait)throw Error('Invalid portrait');cache.set(key,portrait);if(cache.size>2)cache.delete(cache.keys().next().value);}
    if(portraitKey(getAppearance())!==key)return {ok:false,stale:true};
    const current=getState(),saved=save({...current,social:{...current.social,playerPortrait:portrait}});
    return {ok:saved!==false&&saved?.ok!==false};
   }catch{return {ok:false};}
  })();pending={key,promise};try{return await promise;}finally{if(pending?.promise===promise)pending=null;}
 }
 return {request};
}
