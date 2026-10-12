import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core'),out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),context=await browser.newContext({recordVideo:{dir:out+'/work-camera-video',size:{width:1280,height:900}}}),page=await context.newPage(),errors=[],evidence=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__work-camera',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script><canvas></canvas><script type="module">
 import * as THREE from 'three';import {createApartmentScene} from '/src/apartment-v3-scene.js?rev=38';import {ApartmentMotion} from '/src/apartment-v3-motion.js';import {prepareApartmentConfig} from '/src/apartment-v3-runtime.js?rev=38';
 let camera,scene;const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){if(o.some(x=>x.name==='player')){scene=this;this.onBeforeRender=(_r,_s,c)=>camera=c;}return add.apply(this,o);};
 const config=prepareApartmentConfig(await(await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';const view=await createApartmentScene(document.querySelector('canvas'),config);THREE.Scene.prototype.add=add;
 const motion=new ApartmentMotion(config);motion.position=[...config.actions.computer.pose];motion.yaw=motion.targetYaw=config.actions.computer.yaw;motion.actionId='computer';motion.phase='perform';motion.clip='seated';motion.fade=1;
 window.qa={view,show(kind,progress,minutes=720,paused=false){view.endComputerView();view.modes.mode='2D';view.setTime(minutes);view.setRoomLights({living:true,kitchen:false});motion.workPerformance=kind==='vocal'?'rapping':'typing';view.setComputerPresentation({phase:'working',workActor:true,zoom:0},{power:'on'},'Проверка');view.setWorkCamera({kind,progress});view.render(motion,paused?0:.12,{paused,instant:true});const shell=[];scene.traverse(o=>{if(o.name.startsWith('static-cutaway-shell-'))shell.push(o.visible);});return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),head:view.getHeadCameraPose(),audio:view.getComputerAudioFrame(),performance:motion.workPerformance,shell};},
 async finish(){view.setWorkCamera(null);await view.prepareComputerView();view.beginComputerView();view.setComputerPresentation({phase:'work-in',zoom:0},{power:'on'},'Проверка');view.render(motion,0,{paused:true});return {position:camera.position.toArray(),head:view.getHeadCameraPose().position};},dispose(){view.dispose();}};
 </script>`}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__work-camera');await page.waitForFunction(()=>window.qa);
 for(const [width,height]of [[800,600],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  for(const [light,minutes]of [['day',720],['night',1380]])for(const kind of ['beat','vocal','lyrics']){
   for(const progress of [0,.25,.5,.75,1]){
    const frame=await page.evaluate(({kind,progress,minutes})=>qa.show(kind,progress,minutes),{kind,progress,minutes});evidence.push({width,light,kind,progress,...frame});
    const paused=await page.evaluate(({kind,progress,minutes})=>qa.show(kind,progress,minutes,true),{kind,progress,minutes});assert.deepEqual(paused.position,frame.position);assert.deepEqual(paused.quaternion,frame.quaternion);
    if(progress===1)assert.deepEqual(frame.position,frame.head.position);assert.equal(frame.performance,kind==='vocal'?'rapping':'typing');assert.ok(frame.shell.length&&frame.shell.every(Boolean),'interior cinematic must retain front walls');
    await page.screenshot({path:out+'/work-'+width+'-'+light+'-'+kind+'-'+progress+'.png'});
   }
   const end=await page.evaluate(()=>qa.finish());assert.ok(Math.hypot(...end.position.map((v,i)=>v-end.head[i]))<.2,'return stays at animated head');
  }
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/work-camera-evidence.json',JSON.stringify(evidence,null,2));await page.evaluate(()=>qa.dispose());console.log('PASS day/night × three widths × beat/vocal/lyrics × five progress points; paused camera stable; final PC return at head');
}finally{await context.close();await browser.close();}
