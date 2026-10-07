import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ApartmentAnimation} from './apartment-v3-animation.js?rev=8';
import {applyAppearance,DEFAULT_APPEARANCE} from './avatar-v3-profile.js?rev=7';
import {homeLight} from './apartment-v3-time.js?rev=8';
import {createBackdropMaterial,sceneTimeState,createPracticalLighting} from './apartment-v3-lighting.js?rev=8';
import {createLandingReveal} from './apartment-v3-landing.js?rev=7';

const BASE='./assets/apartment/v3/';
export async function createApartmentScene(canvas,config){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#141c20');
  const camera=new THREE.OrthographicCamera(-5,5,2.7,-2.7,.1,80);
  const basePosition=new THREE.Vector3(...config.camera.position),baseTarget=new THREE.Vector3(...config.camera.target);
  camera.position.copy(basePosition);camera.lookAt(baseTarget);
  const loader=new GLTFLoader();
  const textureLoader=new THREE.TextureLoader(),textureCache=new Map();
  function loadTexture(file){
    if(!textureCache.has(file))textureCache.set(file,textureLoader.loadAsync(BASE+file+'?rev=8').then(texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
    }));return textureCache.get(file);
  }
  const stateFiles=config.lightingStates??{both:{night:config.background,day:config.backgroundDay}};
  const [stateEntries,environment,model]=await Promise.all([
    Promise.all(Object.entries(stateFiles).map(async([name,files])=>[name,{night:await loadTexture(files.night),day:await loadTexture(files.day)}])),
    loader.loadAsync(BASE+config.geometry+'?rev=8'),loader.loadAsync(BASE+config.rig+'?rev=8')
  ]);
  const lightingStates=Object.fromEntries(stateEntries);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(config.camera.width,config.camera.height),createBackdropMaterial(THREE,lightingStates.both.night,lightingStates.both.day,lightingStates));
  back.position.copy(baseTarget).add(basePosition.clone().sub(baseTarget).normalize().multiplyScalar(-8));
  back.quaternion.copy(camera.quaternion);back.renderOrder=-100;scene.add(back);
  const depthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  environment.scene.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    if(o.name.startsWith('depth-')){o.material=depthMaterial;o.renderOrder=-50;}
    else for(const material of Array.isArray(o.material)?o.material:[o.material]){material.roughness=.86;material.color.multiplyScalar(.58);}
    const bulbRoom=o.name.match(/^lamp-(living|kitchen)-bulb/)?.[1];
    if(bulbRoom&&config.lampFixtures?.[bulbRoom]?.bakedBulb){o.visible=false;o.castShadow=false;}
  });scene.add(environment.scene);
  const switchRockers=Object.fromEntries(['living','kitchen'].map(room=>{const o=environment.scene.getObjectByName('switch-'+room+'-rocker');return [room,{object:o,rotation:o?.rotation.x??0}];}));
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
  const animation=new ApartmentAnimation(new THREE.AnimationMixer(model.scene),model.animations,config.stride);
  const bones=new THREE.SkeletonHelper(model.scene);bones.visible=false;bones.material.depthTest=false;bones.material.transparent=true;bones.renderOrder=10;scene.add(bones);
  const hemi=new THREE.HemisphereLight(0xb3c6d4,0x494333,2);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffdda8,2.5);key.position.set(-3,6,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9db9e5,.8);fill.position.set(3,3,-3);scene.add(fill);
  const practical=createPracticalLighting(THREE,scene,{living:config.lampFixtures?.living?.lightPosition??[4.05,2.37,-.1],kitchen:config.lampFixtures?.kitchen?.lightPosition??[-4.8,2.37,-.1]});
  const shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(13,3.5),new THREE.ShadowMaterial({opacity:.32,depthWrite:false}));
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
    const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObjects(targets)[0];if(hit)return {id:hit.object.userData.action};
    const hero=ray.intersectObject(actor,true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;});if(hero)return {hero:true};
    if(ray.ray.intersectPlane(floor,point))return {x:point.x};return {};
  }
  function resize(){const r=canvas.getBoundingClientRect(),aspect=r.width/r.height,h=Math.max(4.1,5.6/aspect);
    camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);}
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
    back.visible=true;environment.scene.visible=true;actor.visible=true;
    shadowFloor.visible=true;practical.sky.visible=true;practical.window.visible=true;
    hemi.intensity=0;key.intensity=0;fill.intensity=0;
    for(const room of ['living','kitchen']){
      lightLevels[room]=THREE.MathUtils.lerp(lightLevels[room],Number(roomLights[room]),dt>0?1-Math.exp(-dt*24):1);
      back.material.uniforms[room+'Light'].value=lightLevels[room];
      const rocker=switchRockers[room];if(rocker.object)rocker.object.rotation.x=rocker.rotation+(roomLights[room]?-.12:.12);
    }
    practical.update({daylight:light.daylight,...lightLevels});
    lastEntryOpen=state.entryOpen??0;landingReveal.apartment(lastEntryOpen);
    back.material.uniforms.daylight.value=light.daylight;back.material.uniforms.warmth.value=light.warmth;
    actor.position.fromArray(state.position);actor.rotation.y=state.yaw;
    const threshold=config.entryDoor?.threshold;
    const exteriorProgress=Number.isFinite(threshold)?(state.position[0]-threshold)/1.75:(-state.position[2]-1.45)/.65;
    const thresholdShade=state.actionId==='entry'?1-.75*THREE.MathUtils.clamp(exteriorProgress,0,1):1;
    for(const [material,color] of actorColors)material.color.copy(color).multiplyScalar(thresholdShade);
    animation.update(instant?{clip:state.clip,fade:1,walkDistance:state.walkDistance}:state,dt,paused);
    // Follow the actual hero root, including during transitions; no room snapping.
    camera.position.copy(basePosition);camera.position.x=state.cameraX+basePosition.x-baseTarget.x;camera.updateMatrixWorld();
    hinge('passage',state.doorOpen*config.passageOpenAngle);
    const inAction=['perform','approach-depth'].includes(state.phase),lerp=1-Math.exp(-dt*6);
    fridgeOpen=THREE.MathUtils.lerp(fridgeOpen,inAction&&state.actionId==='fridge'?1:0,lerp);
    hinge('fridge',-fridgeOpen*Math.PI*.49);hinge('entry',(state.entryOpen??0)*(config.entryDoor?.openAngle??Math.PI*.51));
    shadow.position.set(actor.position.x,.014,actor.position.z);shadow.visible=!['sleep','seated'].includes(state.clip);bones.visible=skeleton;
    plate.visible=state.phase==='perform'&&state.actionId==='sink';food.visible=state.phase==='perform'&&state.actionId==='fridge';water.visible=plate.visible;
    if(blanket)blanket.visible=state.clip==='sleep';
    if(bedCover)bedCover.visible=state.clip!=='sleep';
    ring.visible=state.phase==='walk';ring.position.set(state.targetX,.015,config.spawn[2]);
    renderer.render(scene,camera);
  }
  const previewCamera=new THREE.OrthographicCamera(-1,1,1.1,-1.1,.1,20);
  previewCamera.position.set(0,1.08,5);previewCamera.lookAt(0,.94,0);
  function renderPreview(dt,yaw,rect){
    back.visible=false;environment.scene.visible=false;plate.visible=false;food.visible=false;water.visible=false;ring.visible=false;bones.visible=false;
    shadowFloor.visible=false;practical.update({daylight:0,living:0,kitchen:0});practical.sky.visible=false;practical.window.visible=false;
    hemi.intensity=2;key.intensity=2.5;fill.intensity=.8;
    actor.visible=true;actor.position.set(0,0,0);actor.rotation.y=yaw;
    for(const [material,color] of actorColors)material.color.copy(color);
    animation.update({clip:'idle',fade:1,walkDistance:0},dt);
    shadow.position.set(0,.014,0);shadow.visible=true;
    const canvasRect=canvas.getBoundingClientRect(),aspect=rect.width/rect.height,h=Math.max(2.12,.72/aspect);
    previewCamera.left=-h*aspect/2;previewCamera.right=h*aspect/2;previewCamera.top=h/2;previewCamera.bottom=-h/2;previewCamera.updateProjectionMatrix();
    renderer.setViewport(0,0,canvasRect.width,canvasRect.height);renderer.clear();
    renderer.setViewport(rect.left-canvasRect.left,canvasRect.bottom-rect.bottom,rect.width,rect.height);
    renderer.setScissor(rect.left-canvasRect.left,canvasRect.bottom-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);
    renderer.render(scene,previewCamera);renderer.setScissorTest(false);renderer.setViewport(0,0,canvasRect.width,canvasRect.height);
  }
  const peepholeCamera=new THREE.PerspectiveCamera(92,1,.04,30);
  peepholeCamera.position.fromArray(config.peepholeCamera?.position??[6.61,1.645,.675]);
  peepholeCamera.lookAt(new THREE.Vector3(...(config.peepholeCamera?.target??[9.05,1.51,-.15])));
  function renderPeephole(rect){
    back.visible=false;actor.visible=false;shadow.visible=false;ring.visible=false;bones.visible=false;plate.visible=false;food.visible=false;water.visible=false;
    environment.scene.visible=true;landingReveal.peephole();
    const visible=[];
    environment.scene.traverse(o=>{if(!o.isMesh)return;let inLanding=false;for(let p=o;p;p=p.parent)if(p===landing)inLanding=true;visible.push([o,o.visible]);o.visible=inLanding;});
    shadowFloor.visible=false;practical.update({daylight:0,living:0,kitchen:0});practical.sky.visible=false;practical.window.visible=false;
    hemi.intensity=1.3;key.intensity=2.5;fill.intensity=.35;
    const r=canvas.getBoundingClientRect();renderer.setViewport(0,0,r.width,r.height);renderer.clear();
    renderer.setViewport(rect.left-r.left,r.bottom-rect.bottom,rect.width,rect.height);
    renderer.setScissor(rect.left-r.left,r.bottom-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);
    peepholeCamera.aspect=rect.width/rect.height;peepholeCamera.updateProjectionMatrix();renderer.render(scene,peepholeCamera);
    renderer.setScissorTest(false);renderer.setViewport(0,0,r.width,r.height);
    for(const [o,value] of visible)o.visible=value;
    landingReveal.apartment(lastEntryOpen);
  }
  return {render,renderPreview,renderPeephole,pick,setTime,setRoomLights,setAppearance:appearance=>applyAppearance(model.scene,appearance),clips:[...animation.actions.keys()],dispose(){observer.disconnect();renderer.dispose();}};
}
