export const VOCALS=Object.freeze(Array.from({length:54},(_,i)=>{
 const n=String(i+1).padStart(2,'0');
 return Object.freeze({id:'vocal-'+n,name:'Дубль / '+n,bpm:90,bars:4,key:'A minor',path:'./assets/audio/ft/vocals-v'+(i<40?1:2)+'/'+n+'.wav'});
}));
const index=new Map(VOCALS.map(v=>[v.id,v]));
export const vocalById=id=>index.get(id);
