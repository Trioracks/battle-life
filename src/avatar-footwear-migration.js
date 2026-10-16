// Kept independent of the appearance/wardrobe modules so migration runs before validation.
const aliases=Object.freeze({flipflops:'ankleboots',sandals:'highcanvas'});
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export const closedFootwearId=id=>Object.hasOwn(aliases,id)?aliases[id]:id;
export function migrateClosedFootwear(input){
 if(!record(input))return {profile:input,changed:false};
 const worn=record(input.appearance)&&Object.hasOwn(aliases,input.appearance.footwear);
 const owned=Array.isArray(input.wardrobe?.footwear)&&input.wardrobe.footwear.some(item=>record(item)&&Object.hasOwn(aliases,item.id));
 if(!worn&&!owned)return {profile:input,changed:false};
 const profile={...input};
 if(worn)profile.appearance={...input.appearance,footwear:closedFootwearId(input.appearance.footwear)};
 if(owned)profile.wardrobe={...input.wardrobe,footwear:input.wardrobe.footwear.map(item=>record(item)?{...item,id:closedFootwearId(item.id)}:item)};
 return {profile,changed:true};
}
export function reserveFootwearBackup(storage,raw){
 const key='battle-life-apartment-v3-before-closed-footwear-v1';
 if(storage.getItem(key)===null)storage.setItem(key,raw);
}
