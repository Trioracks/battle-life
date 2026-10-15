// Stable authored source identities. Tone labels describe spectral roles, not a listening claim.
const roles=['drums','bass','keys-a','keys-b'];
export const USER_EXPERIMENTAL_BANK=Object.freeze(Array.from({length:28},(_,index)=>{
 const family=Math.floor(index/4)+1,role=roles[index%4],number=String(family).padStart(2,'0');
 const stem=`family-${number}-${index===15?'low-keys':role}`;
 return Object.freeze({id:`user-experimental-20261015-${stem}`,kind:role==='drums'?'drums':role==='bass'?'arrangement':'theme',family,bpm:90,bars:4,key:role==='drums'?null:'A minor',authorship:'user',name:`Авторский эксперимент / ${number} / ${role}`,path:`./assets/audio/ft/user-experimental-v1/${stem}.wav`});
}));
export const USER_EXPERIMENTAL_RECIPES=Object.freeze(Array.from({length:14},(_,index)=>{
 const offset=Math.floor(index/2)*4;
 return Object.freeze({drumsId:USER_EXPERIMENTAL_BANK[offset].id,themeId:USER_EXPERIMENTAL_BANK[offset+2+index%2].id,arrangementId:USER_EXPERIMENTAL_BANK[offset+1].id});
}));
