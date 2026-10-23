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
  // Render the real room and verify the initial monitor camera consumes exactly
  // the current overview, rather than an unrelated head pose.
  const scene=await createApartmentScene(document.querySelector('canvas'),config),motion=new ApartmentMotion(config);scene.modes.reset({initialMode:'2D'});scene.render(motion,0,{paused:true});await scene.prepareComputerView();
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.4,.3),new THREE.MeshBasicMaterial()),indicator=screen.clone(),source=new THREE.PerspectiveCamera(35,1280/720,.03,100);source.position.set(4,2,8);source.lookAt(4,1,0);source.updateMatrixWorld();const monitor=createComputerView({THREE,screen,indicator,viewport:{width:1280,height:720}});monitor.begin(source);const projectionError=Math.max(...source.projectionMatrix.elements.map((v,i)=>Math.abs(v-monitor.camera.projectionMatrix.elements[i])).filter((_,i)=>i!==10&&i!==14));monitor.dispose();
  window.qaCamera={scene,motion};return {records,projectionError};
 },artifactUrl);
 assert.equal(result.records.length,6);assert.ok(result.records.every(r=>r.frames>10&&r.final==='2D'));assert.ok(result.projectionError<1e-9);
 await fs.mkdir(outputDir,{recursive:true});await page.screenshot({path:path.join(outputDir,'camera-room-before-entry.png')});
 await page.evaluate(()=>{const {scene,motion}=window.qaCamera;scene.beginComputerView();scene.setComputerPresentation({phase:'zoom-in',zoom:0},{power:'on'},'Игрок');scene.render(motion,0,{paused:true});});
 await page.screenshot({path:path.join(outputDir,'camera-room-at-entry-zero.png')});await page.evaluate(()=>{window.qaCamera.scene.dispose();delete window.qaCamera;});
 await fs.writeFile(path.join(outputDir,'camera-handoffs.json'),JSON.stringify(result,null,2));await page.unroute(address);return result;
}
