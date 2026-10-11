export const BEGINNER_BANK = Object.freeze(['drums','theme','arrangement'].flatMap(kind =>
  Array.from({length:16}, (_,index) => {
    const number=String(index+1).padStart(2,'0');
    return Object.freeze({id:'beginner-'+kind+'-'+number,kind,bpm:90,bars:4,key:'A minor',
      name:({drums:'Ритм',theme:'Тема',arrangement:'Развитие'})[kind]+' / '+number,
      path:'./assets/audio/ft/beginner-v1/'+kind+'/'+number+'.wav'});
  })
));
const catalogue=new Map(BEGINNER_BANK.map(part=>[part.id,part]));
export const beginnerById=id=>catalogue.get(id);
export function chooseBeginnerParts(random=Math.random){
  const select=kind=>{
    const value=random(),unit=Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;
    return 'beginner-'+kind+'-'+String(1+Math.floor(unit*16)).padStart(2,'0');
  };
  return {drumsId:select('drums'),themeId:select('theme'),arrangementId:select('arrangement')};
}
