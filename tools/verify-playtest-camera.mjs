// Built-artifact QA only. The caller owns a fresh context/server and external output directory.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function verifyCameraHandoffs(page,{artifactUrl,outputDir}){
 const address=new URL('__qa-camera',artifactUrl).href;
 await page.route(address,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>html,body{margin:0;background:#151c1c}canvas{width:100vw;height:100vh;display:block}</style><canvas id="scene"></canvas><script type="importmap">{"imports":{"three":"${artifactUrl}vendor/three/three.module.js","three/addons/":"${artifactUrl}vendor/three/addons/"}}</script>`}));
 await page.goto(address);await page.setViewportSize({width:1280,height:720});
 const result=await page.evaluate(async base=>{
  const [{createApartmentScene},{ApartmentMotion},{prepareApartmentConfig},{CameraModes},{createComputerView},THREE]=await Promise.all(['apartment-v3-scene','apartment-v3-motion','apartment-v3-runtime','apartment-v3-camera','apartment-v3-computer'].map(n=>import(base+'src/'+n+'.js')).concat(import(base+'vendor/three/three.module.js')));
  const config=prepareApartmentConfig(await fetch(base+'assets/apartment/v3/scene.json').then(r=>r.json()));config.assetBase=base+'assets/apartment/v3/';
  const records=[];
  for(const dt of [1/24,1/60,1/144])for(const initial of ['2D','3D']){
   const m=new ApartmentMotion(config),c=new CameraModes({initialMode:initial});m.startSleeping();for(const e of m.drainEvents())c.onMotionEvent(e);m.interact('computer');let started=false,count=0;
   for(let i=0;i<10000;i++){m.tick(dt,true);for(const e of m.drainEvents())c.onMotionEvent(e);c.onMotionState(m);if(m.phase==='return-in')started=true;if(started&&m.fade<1&&c.mode!=='2D')throw Error('Visible first-person handoff: '+m.phase);count++;if(m.actionId==='computer'&&m.phase==='perform')break;}
   records.push({dt,initial,frames:count,final:c.mode});
  }
  // Capture the real camera handed to the furnished scene's renderer.
  let lens;const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...nodes){if(nodes.some(n=>n.name==='player'))this.onBeforeRender=(_renderer,_scene,camera)=>lens=camera;return add.apply(this,nodes);};
  const scene=await createApartmentScene(document.querySelector('canvas'),config);THREE.Scene.prototype.add=add;
  const flights=[],timings=[];let motion;
  for(const initial of ['2D','3D']){
   motion=new ApartmentMotion(config);scene.modes.reset({initialMode:initial});scene.render(motion,0,{paused:true});const head=scene.getHeadCameraPose();await scene.prepareComputerView();motion.interact('computer');
   for(let i=0;i<1000&&motion.phase!=='perform';i++){motion.tick(.05);for(const event of motion.drainEvents())scene.modes.onMotionEvent(event);scene.modes.onMotionState(motion);}
   scene.render(motion,0,{paused:true});scene.beginComputerView();scene.setComputerPresentation({phase:'zoom-in',zoom:0},{power:'on'},'Игрок');scene.render(motion,0,{paused:true});
   const error=Math.hypot(...lens.position.toArray().map((v,i)=>v-head.position[i]));if(error>1e-8)throw Error('Flight origin moved away from the pre-action head: '+error);flights.push({initial,head,origin:lens.position.toArray(),error});
   for(let i=0;i<35;i++){const start=performance.now();scene.setComputerPresentation({phase:'desktop',zoom:1},{power:'on'},'Игрок');scene.render(motion,0,{paused:true});if(i>=5)timings.push(performance.now()-start);}scene.endComputerView();
  }
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.4,.3),new THREE.MeshBasicMaterial()),indicator=screen.clone(),source=new THREE.PerspectiveCamera(35,1280/720,.03,100);source.position.set(4,2,8);source.lookAt(4,1,0);source.updateMatrixWorld();const monitor=createComputerView({THREE,screen,indicator,viewport:{width:1280,height:720}});monitor.begin(source);const projectionError=Math.max(...source.projectionMatrix.elements.map((v,i)=>Math.abs(v-monitor.camera.projectionMatrix.elements[i])).filter((_,i)=>i!==10&&i!==14));monitor.dispose();
  timings.sort((a,b)=>a-b);window.qaCamera={scene,motion};return {records,projectionError,flights,renderMs:{p50:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)}};
 },artifactUrl);
 assert.equal(result.records.length,6);assert.ok(result.records.every(r=>r.frames>10&&r.final==='2D'));assert.ok(result.projectionError<1e-9);
 await fs.mkdir(outputDir,{recursive:true});await page.screenshot({path:path.join(outputDir,'camera-room-before-entry.png')});
 await page.evaluate(()=>{const {scene,motion}=window.qaCamera;scene.beginComputerView();scene.setComputerPresentation({phase:'zoom-in',zoom:0},{power:'on'},'Игрок');scene.render(motion,0,{paused:true});});
 await page.screenshot({path:path.join(outputDir,'camera-room-at-entry-zero.png')});await page.evaluate(()=>{window.qaCamera.scene.dispose();delete window.qaCamera;});
 await fs.writeFile(path.join(outputDir,'camera-handoffs.json'),JSON.stringify(result,null,2));await page.unroute(address);return result;
}
