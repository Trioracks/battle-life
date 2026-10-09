import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ApartmentAnimation} from './apartment-v3-animation.js?rev=8';
import {applyAppearance,DEFAULT_APPEARANCE} from './avatar-v3-profile.js?rev=10';
import {homeLight} from './apartment-v3-time.js?rev=12';
import {createBackdropMaterial,sceneTimeState,createPracticalLighting} from './apartment-v3-lighting.js?rev=8';
import {createLandingReveal} from './apartment-v3-landing.js?rev=7';
import {CameraModes,cameraPose,pickVisible} from './apartment-v3-camera.js?rev=12';
import {createOutsideLighting,createCourtyardLighting} from './apartment-v3-outside.js?rev=12';
import {createSmoke} from './apartment-v3-smoke.js?rev=12';
import {createRetroPass} from './apartment-v3-retro.js?rev=11';

export async function createApartmentScene(canvas,config){
  const BASE=config.assetBase??'./assets/apartment/v3/';
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const retro=createRetroPass(THREE,renderer,canvas);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#141c20');
  const far=config.exterior?.farPlane??80;
  const camera=new THREE.OrthographicCamera(-5,5,2.7,-2.7,.1,far);
  const modes=new CameraModes(),firstCamera=new THREE.PerspectiveCamera(60,1,.03,far);
  let staticScene=null,updateOutside=()=>{};const backdropSets=new Map();
  const basePosition=new THREE.Vector3(...config.camera.position),baseTarget=new THREE.Vector3(...config.camera.target);
  camera.position.copy(basePosition);camera.lookAt(baseTarget);
  const loader=new GLTFLoader();
  const textureLoader=new THREE.TextureLoader(),textureCache=new Map();
  function loadTexture(file){
    if(!textureCache.has(file))textureCache.set(file,textureLoader.loadAsync(BASE+file+'?rev=12').then(texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
    }).catch(error=>{textureCache.delete(file);throw error;}));return textureCache.get(file);
  }
  const stateFiles=config.lightingStates??{both:{night:config.background,day:config.backgroundDay}};
  const [stateEntries,environment,model]=await Promise.all([
    Promise.all(Object.entries(stateFiles).map(async([name,files])=>[name,{night:await loadTexture(files.night),day:await loadTexture(files.day)}])),
    loader.loadAsync(BASE+config.geometry+'?rev=12'),loader.loadAsync(BASE+config.rig+'?rev=12')
  ]);
  const lightingStates=Object.fromEntries(stateEntries);
  backdropSets.set('2D',lightingStates);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(config.camera.width,config.camera.height),createBackdropMaterial(THREE,lightingStates.both.night,lightingStates.both.day,lightingStates));
  back.position.copy(baseTarget).add(basePosition.clone().sub(baseTarget).normalize().multiplyScalar(-8));
  back.quaternion.copy(camera.quaternion);back.renderOrder=-100;scene.add(back);
  const depthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  const courtyard=new THREE.Group(),outsideMask=new THREE.Group();scene.add(courtyard,outsideMask);
  let updateCourtyard=()=>{},smokeSeconds=0;
  if(config.exterior){
    const [outside,mask]=await Promise.all([loader.loadAsync(BASE+config.exterior.geometry+'?rev=12'),loader.loadAsync(BASE+config.exterior.occluders+'?rev=12')]);
    courtyard.add(outside.scene);outsideMask.add(mask.scene);updateCourtyard=createCourtyardLighting(THREE,courtyard);
    outsideMask.traverse(o=>{if(o.isMesh){o.material=depthMaterial;o.renderOrder=-60;}});
  }
  const smoke=createSmoke(THREE,config.exterior??{emitters:[]});scene.add(smoke.root);
  environment.scene.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    if(o.name.startsWith('depth-')){o.material=depthMaterial;o.renderOrder=-50;}
    else for(const material of Array.isArray(o.material)?o.material:[o.material]){material.roughness=.86;material.color.multiplyScalar(.58);}
    const bulbRoom=o.name.match(/^lamp-(living|kitchen)-bulb/)?.[1];
    if(bulbRoom&&config.lampFixtures?.[bulbRoom]?.bakedBulb){o.visible=false;o.castShadow=false;}
  });scene.add(environment.scene);
  const switchRockers=Object.fromEntries(['living','kitchen'].map(room=>{const o=environment.scene.getObjectByName('switch-'+room+'-rocker');return [room,{object:o,rotation:o?.rotation.x??0}];}));
  const bulbMaterials=Object.fromEntries(['living','kitchen'].map(room=>{const o=environment.scene.getObjectByName('lamp-'+room+'-bulb');return [room,o?(Array.isArray(o.material)?o.material:[o.material]):[]];}));
  const landing=environment.scene.getObjectByName('landing-root'),landingReveal=createLandingReveal(landing);
  let lastEntryOpen=0;
  const clockHour=environment.scene.getObjectByName('clock-hour-hand'),clockMinute=environment.scene.getObjectByName('clock-minute-hand');
  const clockBases=[clockHour?.quaternion.clone(),clockMinute?.quaternion.clone()];
  const hinges={passage:environment.scene.getObjectByName('hinge-passage'),fridge:environment.scene.getObjectByName('hinge-fridge'),entry:environment.scene.getObjectByName('hinge-entry')};
  const hingeBases=Object.fromEntries(Object.entries(hinges).map(([k,o])=>[k,o.quaternion.clone()]));
  const up=new THREE.Vector3(0,1,0),rotation=new THREE.Quaternion();
  function hinge(id,angle){hinges[id].quaternion.copy(hingeBases[id]).premultiply(rotation.setFromAxisAngle(up,angle));}
  const actor=new THREE.Group();actor.name='player';scene.add(actor);actor.add(model.scene);
  applyAppearance(model.scene,DEFAULT_APPEARANCE);
  model.scene.updateMatrixWorld(true);
  const head=model.scene.getObjectByName('head');
  const eyeHeight=head?head.getWorldPosition(new THREE.Vector3()).y+.09:1.61;
  async function loadMode(mode){
    if(mode==='3D'){
      if(!staticScene){const result=await loader.loadAsync(BASE+config.staticGeometry+'?rev=12');staticScene=result.scene;staticScene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});updateOutside=createOutsideLighting(staticScene);staticScene.visible=false;scene.add(staticScene);}return;
    }
  }
  let appliedMode='2D';
  function applyCamera(state){
    const fp=modes.mode==='3D',pose=cameraPose(modes.mode,state,eyeHeight,modes);
    if(fp){firstCamera.position.fromArray(pose.position);firstCamera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');firstCamera.updateMatrixWorld();}
    else{
      camera.position.fromArray(pose.position);camera.lookAt(new THREE.Vector3(...pose.target));camera.updateMatrixWorld();
      if(appliedMode!==modes.mode){const set=backdropSets.get(modes.mode);back.material.dispose();back.material=createBackdropMaterial(THREE,set.both.night,set.both.day,set);}
      const view=config.cameraViews?.[modes.mode]??config.camera;
      back.position.fromArray(view.target).add(new THREE.Vector3(...view.position).sub(new THREE.Vector3(...view.target)).normalize().multiplyScalar(-8));back.quaternion.copy(camera.quaternion);
    }
    appliedMode=modes.mode;back.visible=!fp;actor.visible=!fp;shadowFloor.visible=!fp;shadow.visible=!fp&&shadow.visible;bones.visible=!fp&&bones.visible;
    if(staticScene)staticScene.visible=fp;
    courtyard.visible=fp;outsideMask.visible=!fp;smoke.root.visible=true;
    environment.scene.traverse(o=>{if(o.name.startsWith('depth-'))o.visible=!fp;if(/^lamp-(living|kitchen)-bulb/.test(o.name))o.visible=fp;});
  }
  const actorColors=[];
  model.scene.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;for(const material of Array.isArray(o.material)?o.material:[o.material])actorColors.push([material,material.color.clone()]);}});
  const blanket=environment.scene.getObjectByName('sleep-blanket');if(blanket)blanket.visible=false;
  const bedCover=environment.scene.getObjectByName('bed-cover');
  let leftHand;model.scene.traverse(o=>{if(o.isBone&&o.name.replace(/[._]/g,'')==='handL')leftHand=o;});
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(.115,.105,.017,32),new THREE.MeshStandardMaterial({color:0xc4c1a8,roughness:.55}));
  plate.rotation.z=Math.PI/2;plate.position.y=.08;leftHand?.add(plate);plate.visible=false;
  const food=new THREE.Mesh(new THREE.BoxGeometry(.065,.12,.065),new THREE.MeshStandardMaterial({color:0xacaa76,roughness:.85}));
  food.position.y=.08;leftHand?.add(food);food.visible=false;
  const water=new THREE.Mesh(new THREE.CylinderGeometry(.006,.007,.15,8),new THREE.MeshBasicMaterial({color:0x9bbec4,transparent:true,opacity:.6}));
  water.position.set(-5.3,1.055,-.96);scene.add(water);water.visible=false;
  const mealPlate=new THREE.Mesh(new THREE.CylinderGeometry(.14,.12,.023,24),new THREE.MeshStandardMaterial({color:0xb6b3a0,roughness:.75}));
  mealPlate.position.set(config.actions.dining?.pose[0]??-7.25,.843,-.67);scene.add(mealPlate);mealPlate.visible=false;
  const meal=new THREE.Mesh(new THREE.SphereGeometry(.10,12,6),new THREE.MeshStandardMaterial({color:0xa58c51,roughness:1}));meal.scale.set(1,.24,1);meal.position.y=.023;mealPlate.add(meal);
  const spoon=new THREE.Group(),spoonMetal=new THREE.MeshStandardMaterial({color:0x92968a,metalness:.4,roughness:.6});
  const handle=new THREE.Mesh(new THREE.BoxGeometry(.01,.105,.007),spoonMetal);handle.position.y=.12;spoon.add(handle);
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.019,10,6),spoonMetal);bowl.scale.set(.7,1,.25);bowl.position.y=.184;spoon.add(bowl);leftHand?.add(spoon);spoon.visible=false;
  const animation=new ApartmentAnimation(new THREE.AnimationMixer(model.scene),model.animations,config.stride);
  const bones=new THREE.SkeletonHelper(model.scene);bones.visible=false;bones.material.depthTest=false;bones.material.transparent=true;bones.renderOrder=10;scene.add(bones);
  const hemi=new THREE.HemisphereLight(0xb3c6d4,0x494333,2);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffdda8,2.5);key.position.set(-3,6,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9db9e5,.8);fill.position.set(3,3,-3);scene.add(fill);
  const practical=createPracticalLighting(THREE,scene,{living:config.lampFixtures?.living?.lightPosition??[4.05,2.37,-.1],kitchen:config.lampFixtures?.kitchen?.lightPosition??[-4.8,2.37,-.1]});
  const left=config.layout?.rooms.kitchen.x[0]??-6.5,right=config.layout?.rooms.living.x[1]??6.5;
  const shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(right-left,3.5),new THREE.ShadowMaterial({opacity:.32,depthWrite:false}));
  shadowFloor.position.x=(left+right)/2;
  shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=.009;shadowFloor.receiveShadow=true;scene.add(shadowFloor);
  // A subtle contact patch remains when all practical lamps are off.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'),g=ctx.createRadialGradient(64,64,3,64,64,62);
  g.addColorStop(0,'rgba(0,0,0,.44)');g.addColorStop(.5,'rgba(0,0,0,.23)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.85,.65),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}));
  shadow.rotation.x=-Math.PI/2;shadow.renderOrder=-10;scene.add(shadow);
  const targets=[];
  for(const [id,a] of Object.entries(config.actions)){
    if(!a.hit)continue;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...a.hit[1]),new THREE.MeshBasicMaterial({visible:false}));
    mesh.position.fromArray(a.hit[0]);mesh.userData.action=id;scene.add(mesh);targets.push(mesh);
  }
  const ring=new THREE.Mesh(new THREE.RingGeometry(.065,.082,32),new THREE.MeshBasicMaterial({color:0xddc59c,side:THREE.DoubleSide,transparent:true,opacity:.8}));
  ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
  function pick(event){
    scene.updateMatrixWorld(true);
    const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,modes.mode==='3D'?firstCamera:camera);
    if(modes.mode==='3D'){
      const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
      const blockers=ray.intersectObjects([staticScene,environment.scene].filter(Boolean),true).filter(h=>visible(h.object));
      const hits=ray.intersectObjects(targets).map(h=>({distance:h.distance,id:h.object.userData.action}));
      const surface=blockers[0],normal=surface?.face?.normal.clone().transformDirection(surface.object.matrixWorld);
      const f=surface&&surface.point.y<.12&&normal?.y>.7?{distance:surface.distance,x:surface.point.x}:null;
      return pickVisible(hits,blockers,f);
    }
    const blocker=ray.intersectObject(environment.scene,true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;}),distance=blocker?.distance??Infinity;
    const hit=ray.intersectObjects(targets)[0];if(hit&&hit.distance<=distance+.025)return {id:hit.object.userData.action};
    const hero=ray.intersectObject(actor,true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;});if(hero&&hero.distance<=distance+.025)return {hero:true};
    if(ray.ray.intersectPlane(floor,point)&&ray.ray.origin.distanceTo(point)<=distance+.025)return {x:point.x};return {};
  }
  function resize(){const r=canvas.getBoundingClientRect(),aspect=r.width/r.height,h=Math.max(4.1,5.6/aspect);
    camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();firstCamera.aspect=aspect;firstCamera.updateProjectionMatrix();retro.resize(r.width,r.height);}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  let fridgeOpen=0,light=homeLight(1410),roomLights={living:true,kitchen:true},lightLevels={living:1,kitchen:1};
  function setRoomLights(lights){roomLights={living:lights.living!==false,kitchen:lights.kitchen!==false};}
  function setTime(minutes,lightingMinutes=minutes){
    const time=sceneTimeState(minutes,lightingMinutes);light=time.light;const angles=time.hands;
    for(const [hand,base,angle] of [[clockHour,clockBases[0],angles.hour],[clockMinute,clockBases[1],angles.minute]]){
      if(hand)hand.quaternion.copy(base).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-angle));
    }
  }
  function render(state,dt,{skeleton=false,paused=false,instant=false}={}){
    applyCamera(state);
    back.visible=true;environment.scene.visible=true;actor.visible=true;
    shadowFloor.visible=true;practical.sky.visible=true;practical.window.visible=true;
    hemi.intensity=0;key.intensity=0;fill.intensity=0;
    for(const room of ['living','kitchen']){
      lightLevels[room]=THREE.MathUtils.lerp(lightLevels[room],Number(roomLights[room]),dt>0?1-Math.exp(-dt*24):1);
      back.material.uniforms[room+'Light'].value=lightLevels[room];
      const rocker=switchRockers[room];if(rocker.object)rocker.object.rotation.x=rocker.rotation+(roomLights[room]?-.12:.12);
      for(const material of bulbMaterials[room])material.emissiveIntensity=3*lightLevels[room];
    }
    practical.update({daylight:light.daylight,...lightLevels});
    updateOutside(light.daylight);
    if(!paused)smokeSeconds+=dt;
    smoke.update(smokeSeconds,light.daylight);updateCourtyard(light.daylight);
    scene.background.setRGB(.025+.22*light.daylight,.035+.29*light.daylight,.055+.34*light.daylight);
    lastEntryOpen=state.entryOpen??0;landingReveal.apartment(lastEntryOpen);
    back.material.uniforms.daylight.value=light.daylight;back.material.uniforms.warmth.value=light.warmth;
    actor.position.fromArray(state.position);actor.rotation.y=state.yaw;
    const threshold=config.entryDoor?.threshold;
    const exteriorProgress=Number.isFinite(threshold)?(state.position[0]-threshold)/1.75:(-state.position[2]-1.45)/.65;
    const thresholdShade=state.actionId==='entry'?1-.75*THREE.MathUtils.clamp(exteriorProgress,0,1):1;
    for(const [material,color] of actorColors)material.color.copy(color).multiplyScalar(thresholdShade);
    animation.update(instant?{clip:state.clip,fade:1,walkDistance:state.walkDistance}:state,dt,paused);
    // Follow the actual hero root, including during transitions; no room snapping.
    hinge('passage',state.doorOpen*config.passageOpenAngle);
    const inAction=['perform','approach-depth'].includes(state.phase),lerp=1-Math.exp(-dt*6);
    fridgeOpen=THREE.MathUtils.lerp(fridgeOpen,inAction&&state.actionId==='fridge'?1:0,lerp);
    hinge('fridge',-fridgeOpen*Math.PI*.49);hinge('entry',(state.entryOpen??0)*(config.entryDoor?.openAngle??Math.PI*.51));
    shadow.position.set(actor.position.x,.014,actor.position.z);shadow.visible=!['sleep','seated','eat'].includes(state.clip);bones.visible=skeleton;
    mealPlate.visible=spoon.visible=state.clip==='eat';
    plate.visible=state.phase==='perform'&&state.actionId==='sink';food.visible=state.phase==='perform'&&state.actionId==='fridge';water.visible=plate.visible;
    if(blanket)blanket.visible=state.clip==='sleep';
    if(bedCover)bedCover.visible=state.clip!=='sleep';
    ring.visible=state.phase==='walk';ring.position.set(state.targetX,.015,config.spawn[2]);
    applyCamera(state);retro.render(scene,modes.mode==='3D'?firstCamera:camera);
  }
  const previewCamera=new THREE.OrthographicCamera(-1,1,1.1,-1.1,.1,20);
  previewCamera.position.set(0,1.08,5);previewCamera.lookAt(0,.94,0);
  function renderPreview(dt,yaw,rect,zone='body',zoom=1){
    courtyard.visible=outsideMask.visible=smoke.root.visible=false;
    scene.background.set('#12120f');
    mealPlate.visible=spoon.visible=false;
    if(staticScene)staticScene.visible=false;
    back.visible=false;environment.scene.visible=false;plate.visible=false;food.visible=false;water.visible=false;ring.visible=false;bones.visible=false;
    shadowFloor.visible=false;practical.update({daylight:0,living:0,kitchen:0});practical.sky.visible=false;practical.window.visible=false;
    hemi.intensity=2;key.intensity=2.5;fill.intensity=.8;
    actor.visible=true;actor.position.set(0,0,0);actor.rotation.y=yaw;
    for(const [material,color] of actorColors)material.color.copy(color);
    animation.update({clip:'idle',fade:1,walkDistance:0},dt);
    shadow.position.set(0,.014,0);shadow.visible=true;
    const framing={body:[.94,2.12],head:[1.68,.62],top:[1.23,1.04],bottom:[.53,1.14],footwear:[.17,.5]}[zone]??[.94,2.12];
    previewCamera.position.set(0,framing[0]+.14,5);previewCamera.lookAt(0,framing[0],0);
    const aspect=rect.width/rect.height,h=Math.max(framing[1],(zone==='body'?.72:.42)/aspect)/zoom;
    previewCamera.left=-h*aspect/2;previewCamera.right=h*aspect/2;previewCamera.top=h/2;previewCamera.bottom=-h/2;previewCamera.updateProjectionMatrix();
    retro.render(scene,previewCamera,rect);
  }
  const peepholeCamera=new THREE.PerspectiveCamera(92,1,.04,30);
  peepholeCamera.position.fromArray(config.peepholeCamera?.position??[6.61,1.645,.675]);
  peepholeCamera.lookAt(new THREE.Vector3(...(config.peepholeCamera?.target??[9.05,1.51,-.15])));
  function renderPeephole(rect){
    courtyard.visible=outsideMask.visible=smoke.root.visible=false;mealPlate.visible=spoon.visible=false;
    if(staticScene)staticScene.visible=false;
    back.visible=false;actor.visible=false;shadow.visible=false;ring.visible=false;bones.visible=false;plate.visible=false;food.visible=false;water.visible=false;
    environment.scene.visible=true;landingReveal.peephole();
    const visible=[];
    environment.scene.traverse(o=>{if(!o.isMesh)return;let inLanding=false;for(let p=o;p;p=p.parent)if(p===landing)inLanding=true;visible.push([o,o.visible]);o.visible=inLanding;});
    shadowFloor.visible=false;practical.update({daylight:0,living:0,kitchen:0});practical.sky.visible=false;practical.window.visible=false;
    hemi.intensity=1.3;key.intensity=2.5;fill.intensity=.35;
    peepholeCamera.aspect=rect.width/rect.height;peepholeCamera.updateProjectionMatrix();retro.render(scene,peepholeCamera,rect);
    for(const [o,value] of visible)o.visible=value;
    landingReveal.apartment(lastEntryOpen);
  }
  function setAppearance(appearance){
    const result=applyAppearance(model.scene,appearance);
    for(const [material,color] of actorColors)if(material.userData.tintChannel)color.copy(material.color);
    return result;
  }
  return {modes,loadMode,render,renderPreview,renderPeephole,pick,setTime,setRoomLights,setAppearance,clips:[...animation.actions.keys()],dispose(){observer.disconnect();smoke.dispose();for(const root of [courtyard,outsideMask])root.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==depthMaterial)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});depthMaterial.dispose();retro.dispose();renderer.dispose();}};
}
