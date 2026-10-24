// Real renderer and motion/clock integration in an isolated browser context.
// The fixture never reads or writes the player's local storage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.SCENE_QA_DIR||'D:/Codex/Builds/Battle/home-camera-comfort';await mkdir(output,{recursive:true});
const browserTemp=output+'/browser-temp';await mkdir(browserTemp,{recursive:true});process.env.TEMP=browserTemp;process.env.TMP=browserTemp;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],results=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
const compactSnapshot=({meshes,targets,...snapshot})=>({...snapshot,meshCount:meshes.length,sceneIdentity:createHash('sha256').update(JSON.stringify(meshes)).digest('hex'),targetCount:targets.length,targetIdentity:createHash('sha256').update(JSON.stringify(targets)).digest('hex')});
try{
 await page.route('**/__home-camera-comfort',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script></head><body><canvas></canvas><script type="module">
 import * as THREE from 'three';
 import {createApartmentScene} from '/src/apartment-v3-scene.js?rev=33';
 import {prepareApartmentConfig,advanceHomeFrame} from '/src/apartment-v3-runtime.js?rev=33';
 import {ApartmentMotion} from '/src/apartment-v3-motion.js';
 import {ApartmentTime} from '/src/apartment-v3-time.js';
 let graph,camera;const add=THREE.Scene.prototype.add;
 THREE.Scene.prototype.add=function(...objects){if(objects.some(o=>o.name==='player')){graph=this;this.onBeforeRender=(_renderer,_scene,view)=>camera=view;}return add.apply(this,objects);};
 const config=prepareApartmentConfig(await(await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';
 const view=await createApartmentScene(document.querySelector('canvas'),config);THREE.Scene.prototype.add=add;
 let motion=new ApartmentMotion(config),clock=new ApartmentTime({day:2,minutes:720});
 const visible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
 const render=()=>{view.setTime(clock.minutes);view.render(motion,0,{paused:true,instant:true});};
 const project=position=>new THREE.Vector3(...position).project(camera).toArray();
 const snapshot=()=>{const meshes=[],targets=[];graph.traverse(o=>{if(o.isMesh&&!o.name.startsWith('static-cutaway-shell-'))meshes.push([o.uuid,o.geometry.uuid,[o.material].flat().map(m=>m.uuid),o.matrixWorld.toArray()]);if(o.userData.action)targets.push([o.uuid,o.userData.action,o.position.toArray()]);});return {mode:view.modes.mode,phase:motion.phase,clip:motion.clip,actionId:motion.actionId,position:[...motion.position],camera:camera.type,cameraPosition:camera.position.toArray(),fov:camera.fov,actor:visible(graph.getObjectByName('player')),head:view.getHeadScreenPosition(),stove:project([-3.32,.8,-1]),wardrobe:project([6.9,1,-1]),meshes,targets,door:graph.getObjectByName('hinge-passage').quaternion.toArray(),blanket:visible(graph.getObjectByName('sleep-blanket')),cover:visible(graph.getObjectByName('bed-cover'))};};
 const step=()=>{const frame=advanceHomeFrame(motion,clock,.05);for(const event of frame.events)view.modes.onMotionEvent(event);return frame;};
 const until=predicate=>{for(let i=0;i<3000&&!predicate();i++)step();if(!predicate())throw Error('Motion stalled: '+motion.phase);};
 window.cameraComfort={show({x=3.4,mode='2D'}={}){motion=new ApartmentMotion(config);motion.position[0]=x;view.modes.mode=mode;view.modes.yaw=0;view.modes.pitch=-.08;render();return snapshot();},
  pick(id){const [center,size]=config.actions[id].hit,points=[];
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const p=project(center.map((v,i)=>v+[x,y,z][i]*size[i]/2));points.push([(p[0]+1)*innerWidth/2,(1-p[1])*innerHeight/2]);}
   const box=[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[1]))];
   for(let a=1;a<16;a++)for(let b=1;b<16;b++){const x=box[0]+(box[1]-box[0])*a/16,y=box[2]+(box[3]-box[2])*b/16;if(x<0||x>innerWidth||y<0||y>innerHeight)continue;const hit=view.pick({clientX:x,clientY:y});if(hit.id===id)return {hit,point:[x,y]};}return {hit:null,box};},
  sleep({mode='3D',wake='early'}={}){motion=new ApartmentMotion(config);clock=new ApartmentTime({day:2,minutes:720});view.modes.mode=mode;motion.interact('bed');until(()=>motion.phase==='perform');render();const sleeping=snapshot();if(wake==='early')motion.wakeUp();until(()=>motion.phase==='return-in');render();const standingUp=snapshot();until(()=>motion.phase==='idle');render();const standing=snapshot();return {sleeping,standingUp,standing};},
  dispose(){view.dispose();}};
 </script></body></html>`}));
 await page.goto('http://127.0.0.1:4173/__home-camera-comfort');await page.waitForFunction(()=>window.cameraComfort);
 for(const width of [1280,640]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  for(const [room,x] of [['living',3.4],['kitchen',-3.8],['left-end',-7.7],['right-end',8.1]]){
   const side=await page.evaluate(options=>cameraComfort.show(options),{x});
   await page.screenshot({path:output+'/'+width+'-'+room+'-2d.png'});
   assert.ok(side.head.x>0&&side.head.x<width&&side.head.y>0&&side.head.y<900,room+' actor stays in frame');
   assert.equal(side.camera,'PerspectiveCamera');assert.equal(side.actor,true);
   if(!process.env.CAMERA_BASELINE&&width===1280&&room==='living')assert.ok(Math.abs(side.stove[0])<1,'adjacent kitchen stove is visible from living-room spawn');
   const first=await page.evaluate(options=>cameraComfort.show(options),{x,mode:'3D'});
   assert.deepEqual(side.meshes,first.meshes,'camera changes preserve geometry, materials and live object transforms');
   assert.deepEqual(side.targets,first.targets);assert.deepEqual(side.door,first.door);assert.equal(first.actor,false);
   results.push({width,room,side:compactSnapshot(side),first:compactSnapshot(first),sameScene:true});
  }
  await page.evaluate(()=>cameraComfort.show({}));
  for(const id of ['bed','computer','light-living'])assert.equal((await page.evaluate(id=>cameraComfort.pick(id),id)).hit?.id,id,'visible target remains clickable at '+width);
 }
 const sleeps=[];
 if(!process.env.CAMERA_BASELINE)for(const mode of ['2D','3D'])for(const wake of ['early','clock']){
  const result=await page.evaluate(options=>cameraComfort.sleep(options),{mode,wake});assert.equal(result.sleeping.mode,'2D');assert.equal(result.sleeping.blanket,true);assert.equal(result.sleeping.cover,false);
  assert.equal(result.standingUp.mode,mode);assert.equal(result.standing.mode,mode);assert.equal(result.standing.clip,'idle');assert.equal(result.standing.blanket,false);assert.equal(result.standing.cover,true);sleeps.push({mode,wake,result:Object.fromEntries(Object.entries(result).map(([phase,snapshot])=>[phase,compactSnapshot(snapshot)]))});
 }
 const ui=[];
 if(!process.env.CAMERA_BASELINE){
  await page.evaluate(()=>cameraComfort.dispose());
  await page.route('**/__home-camera-seed',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated home camera UI seed</title>'}));
  await page.goto('http://127.0.0.1:4173/__home-camera-seed');
  await page.evaluate(async()=>{
   const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js'),import('/src/virtual-pc-state.js')]);
   localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Camera comfort QA'})));
   localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(createVirtualPcState({power:'off',music:{needs:{satiety:100,energy:100}}})));
   localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:720,initialRest:false}));
  });
  await page.setViewportSize({width:1280,height:900});await page.goto('http://127.0.0.1:4173/');
  await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();
  await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));
  const capture=async name=>{const state=await page.locator('#state').textContent(),label=await page.locator('#camera-mode').textContent();ui.push({name,state,label,disabled:await page.locator('#camera-mode').isDisabled()});await page.screenshot({path:output+'/app-'+name+'.png'});};
  await capture('overview-2d');await page.locator('#camera-mode').click();
  await page.waitForFunction(()=>document.querySelector('#camera-mode').textContent==='Камера: 3D'&&!document.querySelector('#camera-mode').disabled);
  await capture('before-sleep-3d');await page.locator('#actions [data-action=bed]').click();
  await page.waitForFunction(()=>document.querySelector('#camera-mode').textContent==='Камера: 2D'&&!document.querySelector('#wake').hidden);
  await capture('sleeping-2d');await page.locator('#wake').click();
  await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle')&&document.querySelector('#camera-mode').textContent==='Камера: 3D'&&!document.querySelector('#camera-mode').disabled);
  await capture('awake-3d');assert.equal(ui.at(-1).label,'Камера: 3D');assert.equal(ui.at(-1).disabled,false);
  // Start a new character while the old 3D character is still asleep. The new
  // game's initial bed sequence must not inherit the previous restore mode.
  await page.locator('#actions [data-action=bed]').click();
  await page.waitForFunction(()=>!document.querySelector('#wake').hidden&&document.querySelector('#camera-mode').textContent==='Камера: 2D');
  await page.locator('#menu-button').click();await page.locator('#new-game').click();
  await page.locator('#character-name').fill('Новая камера');await page.locator('#next-step').click();await page.locator('#start-game').click();
  await page.waitForFunction(()=>!document.querySelector('#wake').hidden&&!document.querySelector('#game-header').hidden);
  await capture('new-character-sleeping-2d');await page.locator('#wake').click();
  await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle')&&!document.querySelector('#camera-mode').disabled);
  await capture('new-character-awake-2d');assert.equal(ui.at(-1).label,'Камера: 2D');
 }
 assert.deepEqual(errors,[]);await writeFile(output+'/camera-comfort-evidence.json',JSON.stringify({results,sleeps,ui,errors},null,2));
 console.log('PASS camera scene identity, 1280/640 framing and picking'+(process.env.CAMERA_BASELINE?' (baseline)':', normal/early sleep camera restoration, real application sleep/wake camera labels')+'; evidence: '+output);
}finally{await context.close();await browser.close();}
