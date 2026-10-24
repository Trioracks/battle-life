import * as THREE from 'three';
import {applyAppearance,DEFAULT_APPEARANCE} from './avatar-v3-profile.js?rev=59';
import {LIFE_STAGES,lifeAppearance,addLifeScene} from './avatar-life-scene.js?rev=59';

function cloneSkeleton(root){
 const copy=root.clone(true),mapping=new Map();
 const pair=(a,b)=>{mapping.set(a,b);a.children.forEach((child,i)=>pair(child,b.children[i]));};pair(root,copy);
 for(const [source,target]of mapping)if(source.isSkinnedMesh){target.skeleton=source.skeleton.clone();target.skeleton.bones=source.skeleton.bones.map(b=>mapping.get(b));target.bindMatrix.copy(source.bindMatrix);target.bind(target.skeleton,target.bindMatrix);}
 return copy;
}

export const NPC_PORTRAITS=Object.freeze({
 anya:{appearance:{...DEFAULT_APPEARANCE,hair:'longshag',top:'sweater',topColor:'green',bottom:'skinny'},female:true,hair:0x67402b},
 dasha:{appearance:{...DEFAULT_APPEARANCE,hair:'parted',face:'long',top:'turtleneck',topColor:'red',bottom:'skinny'},female:true,hair:0x30231e},
 vitya:{appearance:{...DEFAULT_APPEARANCE,hair:'messy',face:'square',beard:'stubble',top:'hoodie',topColor:'olive',bottom:'sports'},female:false,hair:0x4e4031},
});
// Geometry/textures from the game remain shared and read-only; every material,
// skeleton, transform, camera, animation mixer and output target is portrait-owned.
export async function renderAvatarPortrait({appearance=DEFAULT_APPEARANCE,variant='player',sceneAssets,size=256}){
 if((size!==256&&!(variant.startsWith('life:')&&size===512))||!sceneAssets?.model?.scene)throw Error('Portrait requires a game model and a supported output size');
 const materials=new Set(),ownedGeometry=new Set(),ownedMaterials=new Set(),skeletons=new Set();
 const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:false,alpha:false}),target=new THREE.WebGLRenderTarget(size,size);
 const cloneRoot=root=>{const copy=cloneSkeleton(root),local=new Map();copy.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);if(o.material){const copyMaterial=m=>{if(!local.has(m)){const clone=m.clone();local.set(m,clone);materials.add(clone);}return local.get(m);};o.material=Array.isArray(o.material)?o.material.map(copyMaterial):copyMaterial(o.material);}});return copy;};
 const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.94,flatShading:true});ownedMaterials.add(m);return m;};
 const box=(parent,position,scale,color)=>{const g=new THREE.BoxGeometry(...scale);ownedGeometry.add(g);const m=new THREE.Mesh(g,mat(color));m.position.fromArray(position);parent.add(m);return m;};
 const ellipsoid=(parent,position,scale,color)=>{const g=new THREE.SphereGeometry(1,10,7);ownedGeometry.add(g);const m=new THREE.Mesh(g,mat(color));m.position.fromArray(position);m.scale.fromArray(scale);parent.add(m);return m;};
 let mixer;const companionMixers=[];
 try{
  renderer.setPixelRatio(1);renderer.setSize(size,size,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;target.texture.colorSpace=THREE.SRGBColorSpace;
  const [person,shot='avatar']=variant.split(':'),preset=NPC_PORTRAITS[person],isPlayer=person==='player',life=person==='life'&&LIFE_STAGES.includes(shot),look=life?lifeAppearance(appearance,shot):preset?.appearance??appearance;
  const model=cloneRoot(sceneAssets.model.scene);model.visible=true;model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);
  model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose();});applyAppearance(model,look);scene.add(model);
  mixer=new THREE.AnimationMixer(model);const clip=sceneAssets.model.animations.find(c=>c.name===(life?(shot==='work'?'reach':shot==='barbecue'?'idle':'seated'):isPlayer||shot==='desk'?'seated':'idle'));if(clip){mixer.clipAction(clip).play();mixer.update(life?.65:shot==='street'?.7:.3);}
  const actor=new THREE.Group();scene.add(actor);actor.add(model);
  const addCompanion=({position,yaw,look,clip})=>{const friend=cloneRoot(sceneAssets.model.scene);friend.visible=true;friend.position.fromArray(position);friend.rotation.set(0,yaw,0);friend.scale.set(1,1,1);friend.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose();});applyAppearance(friend,{...DEFAULT_APPEARANCE,...look});const motion=new THREE.AnimationMixer(friend),animation=sceneAssets.model.animations.find(c=>c.name===clip);if(animation){motion.clipAction(animation).play();motion.update(.35);}companionMixers.push(motion);scene.add(friend);};
  const lifeCamera=life?addLifeScene({scene,model,actor,stage:shot,box,ellipsoid,addCompanion}):null;
  if(isPlayer){actor.position.fromArray(sceneAssets.config.actions.computer.pose);actor.rotation.y=sceneAssets.config.actions.computer.yaw;}
  const head=model.getObjectByName('head');if(!head)throw Error('Missing portrait head');
  if(preset?.female){head.scale.multiply(new THREE.Vector3(.91,.98,.94));const chest=model.getObjectByName('chest');if(chest)chest.scale.x*=.91;}
  scene.updateMatrixWorld(true);const face=head.getWorldPosition(new THREE.Vector3());
  if(preset?.female){
   const hair=new THREE.Group();hair.position.copy(face);scene.add(hair);
   // Portrait-only long side locks, behind the face, keep the game's low-poly style.
   ellipsoid(hair,[-.112,.028,-.034],[.052,.22,.085],preset.hair);ellipsoid(hair,[.112,.028,-.034],[.052,.22,.085],preset.hair);
   if(person==='dasha')ellipsoid(hair,[.01,-.05,-.125],[.095,.25,.072],preset.hair);
  }
  if(isPlayer&&sceneAssets.environment&&sceneAssets.staticScene){
   for(const original of [sceneAssets.environment,sceneAssets.staticScene]){const room=cloneRoot(original);room.visible=true;room.traverse(o=>{if(o.name.startsWith('depth-'))o.visible=false;if(o.name.startsWith('static-cutaway-shell-'))o.visible=true;});scene.add(room);}
  }else if(!life){
   const home=['avatar','desk','room'].includes(shot),park=shot==='02'||shot==='street';scene.background=new THREE.Color(home?'#aea596':park?'#82928b':'#899c9e');
   box(scene,[0,-.045,0],[12,.08,12],home?'#80715f':park?'#6f7952':'#77736c');
   if(home){box(scene,[0,1.5,-1],[5,3,.15],person==='anya'?'#9caa91':'#ada194');box(scene,[-.72,1.65,-.85],[.6,.8,.06],'#6a878e');box(scene,[.75,.6,-.7],[.9,1.2,.4],'#655549');}
   else if(park){for(const x of [-1.5,.8,1.8]){box(scene,[x,.8,-1.3],[.1,1.6,.1],'#65513e');ellipsoid(scene,[x,2,-1.3],[.7,.9,.7],'#526b48');}box(scene,[-.7,.4,-.6],[1.3,.08,.4],'#7e6244');}
   else{box(scene,[0,1.6,-1.5],[7,3.2,.3],'#959283');for(const x of [-2,-1,0,1,2])box(scene,[x,1.8,-1.31],[.5,.8,.03],'#4a6268');box(scene,[.8,.5,-.7],[1.2,.1,.45],'#766a59');}
  }
  if(shot==='desk')box(scene,[0,.75,.42],[1.5,.07,.6],'#70553c');
  scene.background??=new THREE.Color('#887e68');scene.add(new THREE.HemisphereLight('#e9edeb','#655744',2.3));const key=new THREE.DirectionalLight('#ffe1b5',2.7);key.position.copy(face).add(new THREE.Vector3(-2,3,isPlayer?-2:3));scene.add(key);
  const camera=new THREE.PerspectiveCamera(38,1,.025,40),distance=lifeCamera?.distance??(shot==='avatar'||shot==='desk'||isPlayer?1.17:['01','courtyard'].includes(shot)?1.7:2.05);
  const direction=new THREE.Vector3(life?(lifeCamera?.directionX??-.42):isPlayer?-.68:['02','street'].includes(shot)?-.35:shot==='room'?.7:.27,life?.18:shot==='room'?.3:.15,isPlayer?-1:1).normalize();camera.position.copy(face).addScaledVector(direction,distance);camera.lookAt(face.clone().add(new THREE.Vector3(0,lifeCamera?.lower??(shot==='avatar'||shot==='desk'||isPlayer?-.075:-.18),0)));
  renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(size*size*4);renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),output=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)output.data.set(pixels.subarray((size-y-1)*size*4,(size-y)*size*4),y*size*4);ctx.putImageData(output,0,0);
  return {url:canvas.toDataURL('image/jpeg',.72),width:size,height:size};
 }finally{mixer?.stopAllAction();for(const motion of companionMixers)motion.stopAllAction();target.dispose();for(const m of materials)m.dispose();for(const m of ownedMaterials)m.dispose();for(const g of ownedGeometry)g.dispose();for(const s of skeletons)s.dispose();renderer.dispose();renderer.forceContextLoss();}
}
