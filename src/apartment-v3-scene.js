import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ApartmentAnimation} from './apartment-v3-animation.js?rev=38';
import {applyAppearance,DEFAULT_APPEARANCE} from './avatar-v3-profile.js?rev=38';
import {headCameraPose} from './apartment-head-pose.js?rev=38';
import {segmentIntersectsBox} from './pc-room-audio.js?rev=38';
import {workCameraPose} from './work-camera.js?rev=38';
import {homeLight} from './apartment-v3-time.js?rev=38';
import {sceneTimeState,createPracticalLighting} from './apartment-v3-lighting.js?rev=38';
import {createLandingReveal} from './apartment-v3-landing.js?rev=38';
import {CameraModes,cameraPose,pickVisible,createSharedSceneVisibility} from './apartment-v3-camera.js?rev=38';
import {createOutsideLighting,createCourtyardLighting} from './apartment-v3-outside.js?rev=38';
import {createSmoke} from './apartment-v3-smoke.js?rev=38';
import {createRetroPass} from './apartment-v3-retro.js?rev=38';
import {createComputerView} from './apartment-v3-computer.js?rev=38';
import {pcActorVisible} from './virtual-pc-lifecycle.js?rev=38';
import {pcPresentation} from './virtual-pc-presentation.js?rev=38';
import {createWardrobeFurniture} from './home-wardrobe.js?rev=38';
import {applySwitchStyle} from './apartment-switch-style.js?rev=38';

export async function createApartmentScene(canvas,config){
  const BASE=config.assetBase??'./assets/apartment/v3/';
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const retro=createRetroPass(THREE,renderer,canvas);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#141c20');
  const far=config.exterior?.farPlane??80;
  const camera=new THREE.PerspectiveCamera(45,1,.03,far);
  const modes=new CameraModes(),firstCamera=new THREE.PerspectiveCamera(60,1,.03,far);
  let disposed=false;
  const basePosition=new THREE.Vector3(...config.camera.position),baseTarget=new THREE.Vector3(...config.camera.target);
  camera.position.copy(basePosition);camera.lookAt(baseTarget);
  const loader=new GLTFLoader();
  const [environment,model,staticModel]=await Promise.all([
    loader.loadAsync(BASE+config.geometry+'?rev=21'),loader.loadAsync(BASE+config.rig+'?rev=21'),loader.loadAsync(BASE+config.staticGeometry+'?rev=21')
  ]);
  const staticScene=staticModel.scene;
  staticScene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const updateOutside=createOutsideLighting(staticScene);scene.add(staticScene);
  const depthMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
  const courtyard=new THREE.Group();scene.add(courtyard);
  let updateCourtyard=()=>{},smokeSeconds=0;
  if(config.exterior){
    const outside=await loader.loadAsync(BASE+config.exterior.geometry+'?rev=21');
    courtyard.add(outside.scene);updateCourtyard=createCourtyardLighting(THREE,courtyard);
  }
  const smoke=createSmoke(THREE,config.exterior??{emitters:[]});scene.add(smoke.root);
  environment.scene.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    if(o.name.startsWith('depth-')){o.material=depthMaterial;o.renderOrder=-50;}
    else if(o.userData.apartment_role!=='computer-live')for(const material of Array.isArray(o.material)?o.material:[o.material]){material.roughness=.86;material.color.multiplyScalar(.58);}
  });scene.add(environment.scene);
  const switchStyle=applySwitchStyle(THREE,environment.scene);
  const wardrobe=createWardrobeFurniture(THREE);environment.scene.add(wardrobe);
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
  modes.loaded.add('3D'); // All shared geometry has finished loading before first render.
  // Both cameras are ready with the same scene. Keep the async mode contract for
  // camera transitions and the monitor lifecycle without loading a second room.
  async function loadMode(){if(disposed)throw Error('Scene disposed');}
  const applySceneVisibility=createSharedSceneVisibility({staticScene,liveScene:environment.scene,courtyard});
  const rect=canvas.getBoundingClientRect();
  const computer=config.computer?createComputerView({THREE,screen:environment.scene.getObjectByName(config.computer.screen),indicator:environment.scene.getObjectByName(config.computer.indicator),viewport:rect}):null;
  let computerSnapshot={phase:'room',zoom:0},computerActive=false;
  const transitionFrame=new THREE.WebGLRenderTarget(Math.max(1,rect.width),Math.max(1,rect.height));
  transitionFrame.texture.colorSpace=THREE.SRGBColorSpace;
  const transitionBackdrop=new THREE.ShaderMaterial({uniforms:{frame:{value:transitionFrame.texture},pcBlend:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D frame;uniform float pcBlend;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(frame,vUv).rgb,pcBlend);}',transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const transitionQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),transitionBackdrop);transitionQuad.frustumCulled=false;transitionQuad.renderOrder=1000;transitionQuad.visible=false;scene.add(transitionQuad);
  async function prepareComputerView(){if(!computer)throw Error('Computer surfaces are missing');await loadMode('3D');if(disposed)throw Error('Scene disposed');}
  const headViewCamera=new THREE.PerspectiveCamera(60,rect.width/rect.height,.03,far);
  const workViewCamera=new THREE.PerspectiveCamera(55,rect.width/rect.height,.03,far);let workCamera=null;
  function setWorkCamera(value){workCamera=value?{kind:value.kind,progress:value.progress}:null;}
  const living=config.layout?.rooms.living??{x:[0,8.5],height:3,rearZ:-1.72,frontZ:1.82};
  const workBounds={min:[living.x[0]+.25,1.05,living.rearZ+.2],max:[living.x[1]-.25,living.height-.3,living.frontZ-.2],obstacles:['computer','bed','wardrobe'].map(id=>config.actions[id]?.hit).filter(Boolean).map(([center,size])=>({min:center.map((v,i)=>v-size[i]/2),max:center.map((v,i)=>v+size[i]/2)}))};
  // Exported depth proxies are the exact solid sides of the middle partition.
  const acousticWalls=['depth-middle-wall','depth-middle-front-wall'].map(name=>environment.scene.getObjectByName(name)).filter(Boolean);
  const speakerAnchor=environment.scene.getObjectByName(config.computer?.screen);
  function getComputerAudioFrame({desktop=false}={}){
    const pose=getHeadCameraPose(),source=speakerAnchor?.getWorldPosition(new THREE.Vector3()).toArray()??[...config.actions.computer.hit[0]];
    const listener=pose.position,right=new THREE.Vector3(1,0,0);
    if(modes.mode==='3D'&&!computerActive)right.applyEuler(new THREE.Euler(modes.pitch,modes.yaw,0,'YXZ'));
    else right.applyQuaternion(new THREE.Quaternion().fromArray(pose.quaternion));
    const walls=[...acousticWalls,environment.scene.getObjectByName('passage-leaf')].filter(Boolean);
    const occluded=walls.some(node=>{node.updateWorldMatrix(true,false);const box=new THREE.Box3().setFromObject(node);return segmentIntersectsBox(source,listener,{min:box.min.toArray(),max:box.max.toArray()});});
    return {source,listener,right:right.toArray(),desktop,occluded};
  }
  function getHeadCameraPose(){
    actor.updateMatrixWorld(true);
    const anchor=head??actor;
    return headCameraPose({position:anchor.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:anchor.getWorldQuaternion(new THREE.Quaternion()).toArray(),eyeOffset:head?[0,.09,.1]:[0,eyeHeight,.1]});
  }
  function beginComputerView(){
    if(!staticScene||!computer||disposed)throw Error('Computer view is not prepared');
    const pose=getHeadCameraPose();headViewCamera.position.fromArray(pose.position);headViewCamera.quaternion.fromArray(pose.quaternion);headViewCamera.aspect=camera.aspect;headViewCamera.updateProjectionMatrix();headViewCamera.updateMatrixWorld(true);
    computer.begin(headViewCamera);computerActive=true;
  }
  function setComputerPresentation(snapshot,pcState,playerName){computerSnapshot=snapshot;computer?.update(snapshot,pcPresentation(snapshot,pcState.power,playerName));}
  function endComputerView(){computerActive=false;computer?.end();transitionQuad.visible=false;}
  function applyCamera(state){
    modes.onMotionState(state);
    const fp=modes.mode==='3D',pose=cameraPose(modes.mode,state,eyeHeight,{yaw:modes.yaw,pitch:modes.pitch,aspect:camera.aspect});
    if(fp){firstCamera.position.fromArray(pose.position);firstCamera.rotation.set(pose.pitch,pose.yaw,0,'YXZ');firstCamera.updateMatrixWorld();}
    else{
      camera.fov=pose.fov;camera.updateProjectionMatrix();camera.position.fromArray(pose.position);camera.lookAt(new THREE.Vector3(...pose.target));camera.updateMatrixWorld();
    }
    applySceneVisibility({mode:modes.mode,computerActive});
    actor.visible=!fp&&pcActorVisible(state,computerActive,computerSnapshot.workActor);shadowFloor.visible=actor.visible;shadow.visible=actor.visible&&shadow.visible;bones.visible=actor.visible&&bones.visible;
    smoke.root.visible=true;
    if(computerActive){
      const zoom=computerSnapshot.zoom??0,blend=1-THREE.MathUtils.smoothstep(zoom,0,.10);
      transitionBackdrop.uniforms.pcBlend.value=blend;transitionQuad.visible=blend>0;
      actor.visible=false;shadowFloor.visible=false;shadow.visible=false;bones.visible=false;
    }
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
    const blocker=ray.intersectObjects([staticScene,environment.scene],true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;}),distance=blocker?.distance??Infinity;
    const hit=ray.intersectObjects(targets)[0];if(hit&&hit.distance<=distance+.025)return {id:hit.object.userData.action};
    const hero=ray.intersectObject(actor,true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;});if(hero&&hero.distance<=distance+.025)return {hero:true};
    // The furnished floor has thickness above the old mathematical y=0 plane.
    // Walk on its visible upper surface just as the first-person camera does.
    const normal=blocker?.face?.normal.clone().transformDirection(blocker.object.matrixWorld);
    if(blocker&&blocker.point.y<.12&&normal?.y>.7)return {x:blocker.point.x};
    if(ray.ray.intersectPlane(floor,point)&&ray.ray.origin.distanceTo(point)<=distance+.025)return {x:point.x};return {};
  }
  function resize(){const r=canvas.getBoundingClientRect(),aspect=r.width/r.height;
    camera.aspect=aspect;camera.updateProjectionMatrix();firstCamera.aspect=aspect;firstCamera.updateProjectionMatrix();workViewCamera.aspect=aspect;workViewCamera.updateProjectionMatrix();computer?.resize(r.width,r.height);transitionFrame.setSize(Math.max(1,r.width),Math.max(1,r.height));retro.resize(r.width,r.height);}
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
    environment.scene.visible=true;actor.visible=true;
    shadowFloor.visible=true;practical.sky.visible=true;practical.window.visible=true;
    hemi.intensity=0;key.intensity=0;fill.intensity=0;
    for(const room of ['living','kitchen']){
      lightLevels[room]=THREE.MathUtils.lerp(lightLevels[room],Number(roomLights[room]),dt>0?1-Math.exp(-dt*24):1);
      const rocker=switchRockers[room];if(rocker.object)rocker.object.rotation.x=rocker.rotation+(roomLights[room]?-.12:.12);
      for(const material of bulbMaterials[room])material.emissiveIntensity=3*lightLevels[room];
    }
    practical.update({daylight:light.daylight,...lightLevels});
    updateOutside(light.daylight);
    if(!paused)smokeSeconds+=dt;
    smoke.update(smokeSeconds,light.daylight);updateCourtyard(light.daylight);
    scene.background.setRGB(.025+.22*light.daylight,.035+.29*light.daylight,.055+.34*light.daylight);
    lastEntryOpen=state.entryOpen??0;landingReveal.apartment(lastEntryOpen);
    actor.position.fromArray(state.position);actor.rotation.y=state.yaw;
    const threshold=config.entryDoor?.threshold;
    const exteriorProgress=Number.isFinite(threshold)?(state.position[0]-threshold)/1.75:(-state.position[2]-1.45)/.65;
    const thresholdShade=state.actionId==='entry'?1-.75*THREE.MathUtils.clamp(exteriorProgress,0,1):1;
    for(const [material,color] of actorColors)material.color.copy(color).multiplyScalar(thresholdShade);
    animation.update({...state,fade:instant?1:state.fade,working:computerSnapshot.phase==='working',workPerformance:state.workPerformance??'typing'},dt,paused);
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
    if(computerActive&&(computerSnapshot.zoom??0)<.10){
      // Capture the actual room/actor frame, not a scaled backdrop photograph.
      const target=renderer.getRenderTarget();computerActive=false;transitionQuad.visible=false;applyCamera(state);
      actor.visible=shadowFloor.visible=shadow.visible=bones.visible=false;
      renderer.setRenderTarget(transitionFrame);renderer.render(scene,computer.camera);renderer.setRenderTarget(target);computerActive=true;
    }
    applyCamera(state);let activeCamera=computerActive?computer.camera:modes.mode==='3D'?firstCamera:camera;
    if(workCamera&&!computerActive&&computerSnapshot.workActor&&!computerSnapshot.reactionActor){
      applySceneVisibility({mode:'3D',computerActive:false});
      const headPose=getHeadCameraPose(),pose=workCameraPose({...workCamera,headPose,desk:config.actions.computer.pose,bed:config.actions.bed.pose,lamp:config.lampFixtures?.living?.lightPosition??[4.05,2.37,-.1],bounds:workBounds});
      workViewCamera.position.fromArray(pose.position);workViewCamera.up.set(0,1,0);workViewCamera.lookAt(new THREE.Vector3(...pose.target));workViewCamera.rotateZ(pose.roll);workViewCamera.updateMatrixWorld(true);activeCamera=workViewCamera;
      // Never move the lens through a visible head on the final approach.
      actor.visible=workViewCamera.position.distanceTo(new THREE.Vector3(...headPose.position))>.38;
    }
    retro.render(scene,activeCamera);
  }
  const previewCamera=new THREE.OrthographicCamera(-1,1,1.1,-1.1,.1,20);
  previewCamera.position.set(0,1.08,5);previewCamera.lookAt(0,.94,0);
  function renderPreview(dt,yaw,rect,zone='body',zoom=1){
    courtyard.visible=smoke.root.visible=false;transitionQuad.visible=false;
    scene.background.set('#12120f');
    mealPlate.visible=spoon.visible=false;
    if(staticScene)staticScene.visible=false;
    environment.scene.visible=false;plate.visible=false;food.visible=false;water.visible=false;ring.visible=false;bones.visible=false;
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
    courtyard.visible=smoke.root.visible=false;transitionQuad.visible=false;mealPlate.visible=spoon.visible=false;
    if(staticScene)staticScene.visible=false;
    actor.visible=false;shadow.visible=false;ring.visible=false;bones.visible=false;plate.visible=false;food.visible=false;water.visible=false;
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
  function getHeadScreenPosition(){
    const rect=canvas.getBoundingClientRect(),point=head?head.getWorldPosition(new THREE.Vector3()):actor.localToWorld(new THREE.Vector3(0,eyeHeight,0));
    point.y+=.24;point.project(modes.mode==='3D'?firstCamera:camera);
    return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2,visible:actor.visible&&!computerActive&&modes.mode!=='3D'};
  }
  return {modes,loadMode,prepareComputerView,beginComputerView,getHeadCameraPose,getComputerAudioFrame,setWorkCamera,setComputerPresentation,endComputerView,render,renderPreview,renderPeephole,pick,setTime,setRoomLights,setAppearance,getHeadScreenPosition,clips:[...animation.actions.keys()],dispose(){disposed=true;switchStyle.dispose();computer?.dispose();transitionBackdrop.dispose();transitionFrame.dispose();transitionQuad.geometry.dispose();observer.disconnect();smoke.dispose();for(const root of [courtyard,staticScene])root.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==depthMaterial)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});depthMaterial.dispose();retro.dispose();renderer.dispose();}};
}
