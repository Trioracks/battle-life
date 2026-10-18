// Additional user parts, alongside all released experimental and beginner IDs.
export const JURA_EXPERIMENTAL_BANK=Object.freeze([
 ['drumm','drums',1],['drumm-2','drums',2],['bass','arrangement',1],['bass-2','arrangement',2],['lead','theme',1],['lead-2','theme',2],
].map(([name,kind,cycleBars])=>Object.freeze({id:'jura-experimental-20261018-'+name,name:'Авторский эксперимент / '+name,kind,bpm:90,bars:4,cycleBars,key:kind==='drums'?null:'A minor',authorship:'user',path:'./assets/audio/ft/jura-experimental-v1/'+name+'.wav'})));
export const JURA_EXPERIMENTAL_RECIPES=Object.freeze(Array.from({length:8},(_,i)=>Object.freeze({drumsId:JURA_EXPERIMENTAL_BANK[i%2].id,themeId:JURA_EXPERIMENTAL_BANK[4+Math.floor(i/2)%2].id,arrangementId:JURA_EXPERIMENTAL_BANK[2+Math.floor(i/4)].id})));
