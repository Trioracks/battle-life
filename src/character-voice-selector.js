import {VOICE_PACKS,DEFAULT_VOICE_ID} from './vocal-catalog.js?rev=61';

// Native select supplies keyboard and screen-reader interaction. Selection is silent.
export function mountVoiceSelector(select){
 select.replaceChildren(...VOICE_PACKS.map(pack=>{const option=select.ownerDocument.createElement('option');option.value=pack.id;option.textContent=pack.label;return option;}));
 const reset=()=>{select.value=DEFAULT_VOICE_ID;};reset();
 return {get value(){return select.value;},reset};
}
