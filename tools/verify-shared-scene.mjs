// Isolated renderer fixture: no application startup or player save is used.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.SCENE_QA_DIR||'D:/Codex/Builds/Battle/perspective-camera-20261011';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
try{
 await page.route('**/__shared-scene-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script></head><body><canvas id="apartment"></canvas><script type="module">
 import * as THREE from 'three';
 import {createApartmentScene} from '/src/apartment-v3-scene.js?rev=28';
 import {prepareApartmentConfig} from '/src/apartment-v3-runtime.js?rev=31';
 import {ApartmentMotion} from '/src/apartment-v3-motion.js?rev=28';
 // Observe the actual scene at its render boundary without a production debug API.
 const originalAdd=THREE.Scene.prototype.add;let graph,renderCamera;
 THREE.Scene.prototype.add=function(...objects){if(objects.some(o=>o.name==='player')){graph=this;this.onBeforeRender=(_r,_s,camera)=>renderCamera=camera;}return originalAdd.apply(this,objects);};
 const config=prepareApartmentConfig(await(await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';
 const view=await createApartmentScene(document.querySelector('canvas'),config),state=new ApartmentMotion(config);
 THREE.Scene.prototype.add=originalAdd;
 const visible=object=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
 const snapshot=()=>{const meshes=[],courtyard=[],lights=[],targets=[];graph.traverse(o=>{const mesh={uuid:o.uuid,name:o.name,geometry:o.geometry?.uuid,materials:o.material?[o.material].flat().map(m=>m.uuid):[],world:o.matrixWorld.toArray(),visible:visible(o)};if(o.isMesh&&o.name.startsWith('static-'))meshes.push(mesh);if(o.isMesh&&o.name.startsWith('outside-exterior-'))courtyard.push(mesh);if(o.isLight)lights.push([o.uuid,o.intensity]);if(o.userData.action)targets.push([o.uuid,o.userData.action,...o.position]);});const width=z=>new THREE.Vector3(state.cameraX+.5,1.35,z).project(renderCamera).x-new THREE.Vector3(state.cameraX-.5,1.35,z).project(renderCamera).x;return {meshes,courtyard,lights,targets,camera:renderCamera.type,lens:renderCamera.fov,depthRatio:width(-31.5)/width(-1.72),actor:visible(graph.getObjectByName('player')),head:view.getHeadScreenPosition(),door:graph.getObjectByName('hinge-passage').quaternion.toArray(),blanket:visible(graph.getObjectByName('sleep-blanket')),cover:visible(graph.getObjectByName('bed-cover')),clock:graph.getObjectByName('clock-minute-hand').quaternion.toArray()};};
 window.sharedFixture={async show({mode='2D',minutes=720,room='living',lights={living:true,kitchen:true},clip='idle',at}={}){
  view.endComputerView();view.setComputerPresentation({phase:'room',zoom:0},{power:'off'},'Scene QA');const x=at??(room==='living'?3.4:-3.8);state.position=[x,0,.85];state.yaw=0;state.phase='idle';state.clip=clip;state.doorOpen=.35;state.entryOpen=0;
  state.actionId=null;if(clip==='sleep'){state.position=[...config.actions.bed.pose];state.yaw=config.actions.bed.yaw;state.phase='perform';state.actionId='bed';}
  view.modes.mode=mode;view.modes.yaw=0;view.modes.pitch=-.08;view.setTime(minutes);view.setRoomLights(lights);view.render(state,0,{paused:true,instant:true});return snapshot();
 },pick(id){const [center,size]=config.actions[id].hit,corners=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const p=new THREE.Vector3(center[0]+x*size[0]/2,center[1]+y*size[1]/2,center[2]+z*size[2]/2).project(renderCamera);corners.push([(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]);}
  const bounds=[Math.min(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[1]))];let reachable=0,point,hit;
  for(let a=1;a<12;a++)for(let b=1;b<12;b++){const x=bounds[0]+(bounds[1]-bounds[0])*a/12,y=bounds[2]+(bounds[3]-bounds[2])*b/12;if(x<0||x>innerWidth||y<0||y>innerHeight)continue;const candidate=view.pick({clientX:x,clientY:y});if(candidate.id===id){reachable++;point={x,y};hit=candidate;}}
  return {point,hit,reachable,bounds};
 },point(position){const p=new THREE.Vector3(...position).project(renderCamera);return view.pick({clientX:(p.x+1)*innerWidth/2,clientY:(1-p.y)*innerHeight/2});
 },async computer(){await view.prepareComputerView();view.beginComputerView();view.setComputerPresentation({phase:'zoom-in',zoom:.55},{power:'on'},'Scene QA');view.render(state,0,{paused:true});const mid=snapshot();view.setComputerPresentation({phase:'desktop',zoom:1},{power:'on'},'Scene QA');view.render(state,0,{paused:true});const end=snapshot();return {mid,end};
 },preview(){view.endComputerView();view.renderPreview(0,0,{left:0,top:0,right:innerWidth,bottom:innerHeight,width:innerWidth,height:innerHeight});return snapshot();},dispose:()=>view.dispose()};
 </script></body></html>`}));
 await page.goto('http://127.0.0.1:4173/__shared-scene-fixture');await page.waitForFunction(()=>window.sharedFixture);
 const results=[],interactions=[];
 for(const width of [1280,640]){
 await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 for(const room of ['living','kitchen'])for(const [period,minutes,lights] of [['day',720,{living:true,kitchen:true}],['night-off',1410,{living:false,kitchen:false}]]){
  const side=await page.evaluate(options=>window.sharedFixture.show(options),{room,minutes,lights});
  assert.ok(side.meshes.length>0,'2D must load the real furnished scene at startup');
  assert.equal(side.camera,'PerspectiveCamera','side view must preserve distance through the windows');assert.equal(side.actor,true);
  assert.ok(side.depthRatio<.25,'courtyard objects shrink with their distance: '+side.depthRatio);assert.ok(side.courtyard.length>0);
  assert.ok(side.head.x>0&&side.head.x<width&&side.head.y>0&&side.head.y<900,'avatar remains in frame in '+room);
  assert.ok(side.meshes.filter(m=>!m.name.startsWith('static-cutaway-shell-')).every(m=>m.visible||m.name==='static-outside-window-lights'));
  await page.screenshot({path:output+'/'+width+'-'+room+'-'+period+'-2d.png'});
  const first=await page.evaluate(options=>window.sharedFixture.show(options),{room,mode:'3D',minutes,lights});
  assert.equal(first.camera,'PerspectiveCamera');assert.equal(first.actor,false);
  const identity=meshes=>meshes.map(({visible,...mesh})=>mesh);assert.deepEqual(identity(side.meshes),identity(first.meshes));assert.deepEqual(side.lights,first.lights);assert.deepEqual(side.targets,first.targets);assert.deepEqual(side.door,first.door);assert.deepEqual(side.clock,first.clock);
  assert.deepEqual(identity(side.courtyard),identity(first.courtyard),'courtyard geometry, material and scale stay identical between modes');
  assert.ok(first.meshes.filter(m=>m.name.startsWith('static-cutaway-shell-')).every(m=>m.visible));
  assert.ok(side.meshes.filter(m=>m.name.startsWith('static-cutaway-shell-')).every(m=>!m.visible));
  await page.screenshot({path:output+'/'+width+'-'+room+'-'+period+'-3d.png'});results.push({width,room,period,side,first});
 }
 await page.evaluate(()=>window.sharedFixture.show({}));
 assert.deepEqual(await page.evaluate(()=>window.sharedFixture.point([3.4,1,.85])),{hero:true},'side view keeps hero picking');
 const floor=await page.evaluate(()=>window.sharedFixture.point([4.05,.015,.85]));assert.ok(Math.abs(floor.x-4.05)<.01,'real floor remains clickable: '+JSON.stringify(floor));
 for(const id of ['bed','computer','light-living']){const pick=await page.evaluate(id=>window.sharedFixture.pick(id),id);assert.equal(pick.hit.id,id,JSON.stringify(pick));}
 await page.evaluate(()=>window.sharedFixture.show({room:'kitchen'}));
 for(const [id,at] of [['sink',-5.3],['stove',-3.32],['fridge',-1.26],['dining',-7.25],['light-kitchen',-.5]]){await page.evaluate(at=>window.sharedFixture.show({room:'kitchen',at}),at);const pick=await page.evaluate(id=>window.sharedFixture.pick(id),id);assert.equal(pick.hit?.id,id,JSON.stringify(pick));}
 const sleeping=await page.evaluate(()=>window.sharedFixture.show({clip:'sleep'}));assert.equal(sleeping.blanket,true);assert.equal(sleeping.cover,false);await page.screenshot({path:output+'/'+width+'-sleep-2d.png'});
 await page.evaluate(()=>window.sharedFixture.show({}));const computer=await page.evaluate(()=>window.sharedFixture.computer());assert.equal(computer.mid.camera,'PerspectiveCamera');assert.equal(computer.mid.actor,false);assert.ok(computer.mid.meshes.some(m=>m.visible));await page.screenshot({path:output+'/'+width+'-monitor.png'});
 const preview=await page.evaluate(()=>window.sharedFixture.preview());assert.equal(preview.actor,true);assert.ok(preview.meshes.every(m=>!m.visible));await page.screenshot({path:output+'/'+width+'-creator-preview.png'});
 const restored=await page.evaluate(()=>window.sharedFixture.show({}));assert.ok(restored.meshes.some(m=>m.visible));assert.equal(restored.actor,true);
 interactions.push({width,floor,sleeping,computer,preview});
 }
 assert.equal(requests.some(url=>/background(?:-[a-z-]+)?\.png/.test(url)),false,'gameplay does not fetch photographed room backdrops');
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length),0);await page.evaluate(()=>window.sharedFixture.dispose());
 await writeFile(output+'/evidence.json',JSON.stringify({results,interactions,errors,backdropRequests:0},null,2));console.log('PASS 1280/640 perspective depth; shared geometry/material/transform/target identities; same clock, lights and door state; 2D picking in both rooms; sleep; monitor; preview; zero errors and save writes. Captures: '+output);
}finally{await context.close();await browser.close();}
