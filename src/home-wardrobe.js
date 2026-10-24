import {APPEARANCE_OPTIONS,normalizeAppearance} from './avatar-v3-profile.js?rev=59';

export const WARDROBE_STYLES=Object.freeze(['hair','beard','mustache']);
export const WARDROBE_CLOTHING=Object.freeze(['top','bottom','footwear']);
const known=(key,id)=>APPEARANCE_OPTIONS[key]?.options.some(option=>option.id===id);
export function createWardrobe(appearance){
 const a=normalizeAppearance(appearance);
 return Object.fromEntries([...WARDROBE_STYLES.map(key=>[key,[a[key]]]),...WARDROBE_CLOTHING.map(key=>[key,[{id:a[key],color:a[key+'Color']} ]])]);
}
export function validWardrobe(wardrobe){
 return wardrobe&&WARDROBE_STYLES.every(key=>Array.isArray(wardrobe[key])&&wardrobe[key].every(id=>known(key,id)))&&WARDROBE_CLOTHING.every(key=>Array.isArray(wardrobe[key])&&wardrobe[key].every(item=>known(key,item?.id)&&known(key+'Color',item?.color)));
}
export function canWear(profile,appearance){
 if(!appearance||!profile?.appearance||!validWardrobe(profile?.wardrobe)||!Object.entries(APPEARANCE_OPTIONS).every(([key])=>known(key,appearance[key])))return false;
 return appearance.face===profile.appearance.face&&WARDROBE_STYLES.every(key=>profile.wardrobe[key].includes(appearance[key]))&&WARDROBE_CLOTHING.every(key=>profile.wardrobe[key].some(item=>item.id===appearance[key]&&item.color===appearance[key+'Color']));
}
export function wearAppearance(profile,appearance){
 if(!canWear(profile,appearance))return {ok:false,reason:'Этот вариант пока недоступен. Форма лица не меняется.',profile};
 return {ok:true,reason:'',profile:{...profile,appearance:{...appearance}}};
}

// Runtime furniture owns its geometry; exported apartment assets stay intact.
export function wardrobeAction(){return {label:'Переодеться у шкафа',approach:[6.6,0,.85],pose:[6.6,0,.05],yaw:Math.PI,clip:'idle',fade:false,duration:Infinity,hit:[[6.6,1.15,-.65],[1.4,2.3,1.06]]};}
export function createWardrobeFurniture(THREE){
 const root=new THREE.Group();root.name='home-wardrobe';
 const wood=new THREE.MeshStandardMaterial({color:0x79583a,roughness:.9}),panel=new THREE.MeshStandardMaterial({color:0x98724c,roughness:.88}),metal=new THREE.MeshStandardMaterial({color:0xd6b77d,metalness:.55,roughness:.5});
 const box=(name,size,position,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);};
 box('wardrobe-cabinet',[1.4,2.3,.8],[6.6,1.15,-.65],wood);
 for(const side of [-1,1]){box('wardrobe-door-'+side,[.655,2.12,.055],[6.6+side*.34,1.17,-.222],panel);box('wardrobe-handle-'+side,[.025,.19,.06],[6.6+side*.08,1.12,-.175],metal);}
 box('wardrobe-cornice',[1.48,.09,.86],[6.6,2.31,-.65],wood);return root;
}
