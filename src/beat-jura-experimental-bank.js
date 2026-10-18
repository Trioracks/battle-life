// Additional user parts, alongside all released experimental and beginner IDs.
export const JURA_EXPERIMENTAL_BANK=Object.freeze([
 ['drumm','drums',1],['drumm-2','drums',2],['bass','arrangement',1],['bass-2','arrangement',2],['lead','theme',1],['lead-2','theme',2],
 ['drumm-3','drums',2],['drumm-4','drums',2],['bass-3','arrangement',2],['bass-4','arrangement',2],['lead-3','theme',2],['lead-4','theme',2],
].map(([name,kind,cycleBars])=>Object.freeze({id:'jura-experimental-20261018-'+name,name:'Авторский эксперимент / '+name,kind,bpm:90,bars:4,cycleBars,key:kind==='drums'?null:'A minor',authorship:'user',path:'./assets/audio/ft/jura-experimental-v'+(/-[34]$/.test(name)?'2':'1')+'/'+name+'.wav'})));
const released=Array.from({length:8},(_,i)=>({drumsId:JURA_EXPERIMENTAL_BANK[i%2].id,themeId:JURA_EXPERIMENTAL_BANK[4+Math.floor(i/2)%2].id,arrangementId:JURA_EXPERIMENTAL_BANK[2+Math.floor(i/4)].id}));
const added=JURA_EXPERIMENTAL_BANK.filter(p=>p.kind==='drums').flatMap(d=>JURA_EXPERIMENTAL_BANK.filter(p=>p.kind==='theme').flatMap(t=>JURA_EXPERIMENTAL_BANK.filter(p=>p.kind==='arrangement').filter(a=>[d,t,a].some(p=>/-[34]$/.test(p.id))).map(a=>({drumsId:d.id,themeId:t.id,arrangementId:a.id}))));
export const JURA_EXPERIMENTAL_RECIPES=Object.freeze([...released,...added].map(Object.freeze));
