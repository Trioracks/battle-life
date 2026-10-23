import {pcButton} from './virtual-pc-dom.js?rev=57';
// Resolve against the package, never an in-game address or an embedding page.
export const socialImageUrl=src=>src?.startsWith('./assets/')?new URL('../'+src.slice(2),import.meta.url).href+'?rev=56':src;
export function recoverableSocialImage(d,img,parent,label){
 const source=img.getAttribute('src'),retry=pcButton(d,'↻',{className:'sn-image-retry',attributes:{'aria-label':'Повторить загрузку: '+label,title:'Изображение не загрузилось. Нажми, чтобы повторить.'}},()=>{retry.hidden=true;img.hidden=false;img.setAttribute('src',source+(source.startsWith('data:')?'':(source.includes('?')?'&':'?')+'retry='+Date.now()));});
 retry.hidden=true;parent.append(retry);
 img.addEventListener('error',()=>{img.hidden=true;retry.hidden=false;});
 img.addEventListener('load',()=>{img.hidden=false;retry.hidden=true;});return retry;
}
