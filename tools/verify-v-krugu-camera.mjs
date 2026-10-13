import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({recordVideo:{dir:out+'/camera-video',size:{width:1280,height:900}}}),page=await context.newPage(),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
try{
 await page.route('**/__v-krugu-camera',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0}canvas{width:100vw;height:100vh;display:block}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script><canvas></canvas><script type="module">
 import * as THREE from 'three';import {createApartmentScene} from '/src/apartment-v3-scene.js?rev=40';import {ApartmentMotion} from '/src/apartment-v3-motion.js';import {prepareApartmentConfig} from '/src/apartment-v3-runtime.js?rev=40';
 let camera;const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...o){if(o.some(x=>x.name==='player'))this.onBeforeRender=(_r,_s,c)=>camera=c;return add.apply(this,o);};
 const config=prepareApartmentConfig(await(await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';
 const view=await createApartmentScene(document.querySelector('canvas'),config);THREE.Scene.prototype.add=add;let motion=new ApartmentMotion(config);view.setTime(720);
 const render=()=>view.render(motion,0,{paused:true,instant:true});
 const until=predicate=>{for(let i=0;i<3000&&!predicate();i++){motion.tick(.05);for(const e of motion.drainEvents())view.modes.onMotionEvent(e);}if(!predicate())throw Error('motion stalled');};
 window.qa={view,show(x){view.endComputerView();motion=new ApartmentMotion(config);motion.position[0]=x;view.modes.mode='2D';render();return view.getHeadScreenPosition();},
 sleep(mode){motion=new ApartmentMotion(config);view.modes.reset({initialMode:mode});motion.startSleeping();for(const e of motion.drainEvents())view.modes.onMotionEvent(e);view.modes.onMotionEvent({type:'started',id:'bed'});render();return view.modes.mode;},
 wake(){motion.wakeUp();until(()=>motion.phase==='idle');render();return view.modes.mode;},
 async seated(mode){view.endComputerView();motion=new ApartmentMotion(config);view.modes.reset({initialMode:mode});motion.interact('computer');until(()=>motion.phase==='perform');render();const head=view.getHeadCameraPose();await view.prepareComputerView();view.beginComputerView();this.zoom(0);return {head,camera:camera.position.toArray()};},
 audioFrame(mode='2D',yaw=0,desktop=false){view.endComputerView();view.modes.mode=mode;view.modes.yaw=yaw;render();return view.getComputerAudioFrame({desktop});},
 zoom(t){view.setComputerPresentation({phase:t===1?'desktop':'zoom-in',zoom:t,progress:t,overlay:0},{power:'on'},'Проверка');render();return camera.position.toArray();},dispose(){view.dispose();}};
 </script>`}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__v-krugu-camera');await page.waitForFunction(()=>window.qa);
 for(const [width,height]of [[800,600],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  for(const [room,x]of [['living',3.4],['kitchen',-3.8],['left',-7.7],['right',8.1]]){const head=await page.evaluate(x=>qa.show(x),x);assert.ok(head.x>0&&head.x<width&&head.y>0&&head.y<height,room);await page.screenshot({path:out+'/camera-'+width+'-'+room+'.png'});}
  for(const mode of ['2D','3D']){assert.equal(await page.evaluate(mode=>qa.sleep(mode),mode),'2D');await page.screenshot({path:out+'/camera-'+width+'-sleep.png'});assert.equal(await page.evaluate(()=>qa.wake()),mode);}
  for(const mode of ['2D','3D']){
   const start=await page.evaluate(mode=>qa.seated(mode),mode);assert.ok(Math.hypot(...start.camera.map((x,i)=>x-start.head.position[i]))<1e-8,'flight starts at actual head');evidence.push({width,mode,...start});
   for(const t of [0,.25,.5,.75,1,.75,.5,.25,0]){const position=await page.evaluate(t=>qa.zoom(t),t);assert.ok(Math.hypot(...position.map((x,i)=>x-start.head.position[i]))<1.2,'flight stays near computer');await page.screenshot({path:out+'/camera-'+width+'-'+mode+'-flight-'+t+'.png'});}
  }
 }
 const audioFrames=await page.evaluate(()=>{qa.show(3.4);const near=qa.audioFrame(),right=qa.audioFrame('3D'),left=qa.audioFrame('3D',Math.PI),desktop=qa.audioFrame('2D',0,true);qa.show(-3.8);return {near,right,left,desktop,kitchen:qa.audioFrame()};});
 assert.equal(audioFrames.near.occluded,false);assert.equal(audioFrames.kitchen.occluded,true);assert.deepEqual(audioFrames.left.listener,audioFrames.right.listener);
 await writeFile(out+'/camera-audio-frames.json',JSON.stringify(audioFrames,null,2));
 assert.deepEqual(errors,[]);await writeFile(out+'/camera-evidence.json',JSON.stringify(evidence,null,2));await page.evaluate(()=>qa.dispose());console.log('PASS close framing, both rooms/edges/sleep restore at three sizes; head-anchored 2D/3D monitor flights; real speaker/partition audio frames');
}finally{await context.close();await browser.close();}
