// Built-artifact QA only. The caller owns a fresh context/server and external output directory.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function verifyCameraHandoffs(page,{artifactUrl,outputDir}){
 const traceViewport={width:320,height:180},screenshotViewport={width:1280,height:720};
 const address=new URL('__qa-camera',artifactUrl).href;
 await page.route(address,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>html,body{margin:0;background:#151c1c}canvas{width:100vw;height:100vh;display:block}</style><canvas id="scene"></canvas><script type="importmap">{"imports":{"three":"${artifactUrl}vendor/three/three.module.js","three/addons/":"${artifactUrl}vendor/three/addons/"}}</script>`}));
 // Keep the same 16:9 lens while limiting SwiftShader pixel work for every
 // trajectory frame. The screenshot pair is rendered afresh at full size below.
 await page.setViewportSize(traceViewport);await page.goto(address);
 const result=await page.evaluate(async base=>{
  const [{createApartmentScene},{ApartmentMotion},{prepareApartmentConfig},{CameraModes},{createComputerView},{PcLifecycle,beginPcCutscene,pcNeedsSceneFrame},THREE]=await Promise.all(['apartment-v3-scene','apartment-v3-motion','apartment-v3-runtime','apartment-v3-camera','apartment-v3-computer','virtual-pc-lifecycle'].map(n=>import(base+'src/'+n+'.js')).concat(import(base+'vendor/three/three.module.js')));
  const config=prepareApartmentConfig(await fetch(base+'assets/apartment/v3/scene.json').then(r=>r.json()));config.assetBase=base+'assets/apartment/v3/';
  const records=[];
  for(const dt of [1/24,1/60,1/144])for(const initial of ['2D','3D']){
   const m=new ApartmentMotion(config),c=new CameraModes({initialMode:initial});m.startSleeping();for(const e of m.drainEvents())c.onMotionEvent(e);m.interact('computer');let started=false,count=0;
   for(let i=0;i<10000;i++){m.tick(dt,true);for(const e of m.drainEvents())c.onMotionEvent(e);c.onMotionState(m);if(m.phase==='return-in')started=true;if(started&&m.fade<1&&c.mode!=='2D')throw Error('Visible first-person handoff: '+m.phase);count++;if(m.actionId==='computer'&&m.phase==='perform')break;}
   records.push({dt,initial,frames:count,final:c.mode});
  }
  // Capture the real camera handed to the furnished scene's renderer.
  let lens,graph;const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...nodes){if(nodes.some(n=>n.name==='player')){graph=this;this.onBeforeRender=(_renderer,_scene,camera)=>lens=camera;}return add.apply(this,nodes);};
  let scene;try{scene=await createApartmentScene(document.querySelector('canvas'),config);}finally{THREE.Scene.prototype.add=add;}
  const flights=[],timings=[];let motion;
  const renderedPose=()=>({position:lens.position.toArray(),quaternion:lens.quaternion.toArray(),fov:lens.fov,mode:scene.modes.mode,actor:graph.getObjectByName('player').visible,motionPhase:motion.phase,fade:motion.fade});
  const comparePose=(actual,expected,label,{position=true}={})=>{
   const positionError=position?Math.hypot(...actual.position.map((v,i)=>v-expected.position[i])):0;
   // q and -q represent the same orientation.
   const quaternionError=Math.min(...[1,-1].map(sign=>Math.hypot(...actual.quaternion.map((v,i)=>v-sign*expected.quaternion[i]))));
   const fovError=Math.abs(actual.fov-expected.fov);
   if(positionError>1e-8||quaternionError>1e-8||fovError>1e-8)throw Error(label+': '+JSON.stringify({positionError,quaternionError,fovError}));
   return {positionError,quaternionError,fovError};
  };
  for(const dt of [1/24,1/60,1/144])for(const initial of ['2D','3D'])for(const power of ['off','on']){
   scene.endComputerView();motion=new ApartmentMotion(config);scene.modes.reset({initialMode:initial});scene.modes.yaw=.63;scene.modes.pitch=-.17;
   scene.setComputerPresentation({phase:'room',zoom:0},{power},'Игрок');scene.render(motion,0,{paused:true});
   const before=renderedPose(),head=scene.getHeadCameraPose(),expected=initial==='3D'?before:{...head,fov:60},pending=[],entry=[],exit=[];
   let state={power},roomReady=0,life;
   const render=(target,phase)=>{
    scene.setComputerPresentation(life.snapshot,state,'Игрок');scene.render(motion,0,{paused:true});
    const frame={...renderedPose(),pcPhase:life.snapshot.phase,overlay:life.snapshot.overlay,zoom:life.snapshot.zoom,phase};target.push(frame);
    if(frame.fade<1&&frame.overlay<1&&frame.mode!==initial)throw Error('Visible camera mode flash: '+JSON.stringify(frame));
    if(initial==='3D'&&frame.actor)throw Error('First-person entry/exit exposed the actor');
    if(initial==='3D'&&roomReady)comparePose(frame,before,'3D room return changed look orientation',{position:false});
    return frame;
   };
   life=new PcLifecycle({view:scene,getState:()=>state,setPower:power=>state={power},onRoom(){
    motion.leaveAction();roomReady++;
    // setMode('game') renders synchronously in the application. Check that frame,
    // before the host's later restore(motion.phase) can hide a wrong mode.
    render(exit,'synchronous-room-ready');
   }});
   if(!beginPcCutscene(motion,{firstPerson:initial==='3D'}))throw Error('PC click rejected');
   if(!life.prepare())throw Error('PC preparation rejected');
   if(initial==='3D'){
    if(motion.phase!=='perform'||motion.fade!==0)throw Error('3D entry staged an intermediate room action');
    // Rendering updates the live first-person camera to the seated actor. The
    // displayed clone and later flight must retain the exact clicked lens.
    for(let n=0;n<3;n++)comparePose(render(pending,'preparing'),before,'Pending 3D camera changed');
   }else{
    for(let n=0;n<10000&&motion.phase!=='perform';n++){
     motion.tick(dt,true);for(const event of motion.drainEvents())scene.modes.onMotionEvent(event);scene.modes.onMotionState(motion);
    }
    if(motion.phase!=='perform')throw Error('2D approach stalled');
    scene.render(motion,0,{paused:true});
   }
   if(!await life.seated())throw Error('Prepared PC did not enter');
   const origin=render(entry,'flight-origin'),errors=comparePose(origin,expected,initial+' flight changed its source camera');
   if(initial==='3D'&&origin.mode!=='3D')throw Error('3D flight began in overview');
   for(let n=0;n<3000&&life.snapshot.phase!=='desktop';n++){
    motion.tick(dt,true);for(const event of motion.drainEvents())scene.modes.onMotionEvent(event);scene.modes.onMotionState(motion);life.tick(dt);
    if(pcNeedsSceneFrame(life.snapshot,'pc'))render(entry,'entry');
   }
   if(life.snapshot.phase!=='desktop')throw Error('Boot stalled');
   if(dt===1/60&&power==='on')for(let n=0;n<35;n++){
    const start=performance.now();scene.setComputerPresentation(life.snapshot,state,'Игрок');scene.render(motion,0,{paused:true});if(n>=5)timings.push(performance.now()-start);
   }
   if(!life.leave())throw Error('Desktop exit rejected');render(exit,'exit-start');
   for(let n=0;n<3000&&(!roomReady||motion.phase!=='idle');n++){
    motion.tick(dt,true);for(const event of motion.drainEvents())scene.modes.onMotionEvent(event);scene.modes.onMotionState(motion);life.tick(dt);life.restore(motion.phase);
    if(roomReady||pcNeedsSceneFrame(life.snapshot,'pc'))render(exit,'exit');
   }
   if(roomReady!==1||motion.phase!=='idle')throw Error('Room return stalled');
   flights.push({dt,initial,power,before,head,pending,origin,errors,entry,exit,roomReady});
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.4,.3),new THREE.MeshBasicMaterial()),indicator=screen.clone(),source=new THREE.PerspectiveCamera(35,1280/720,.03,100);source.position.set(4,2,8);source.lookAt(4,1,0);source.updateMatrixWorld();const monitor=createComputerView({THREE,screen,indicator,viewport:{width:1280,height:720}});monitor.begin(source);const projectionError=Math.max(...source.projectionMatrix.elements.map((v,i)=>Math.abs(v-monitor.camera.projectionMatrix.elements[i])).filter((_,i)=>i!==10&&i!==14));monitor.dispose();
  // A screenshot pair uses the same current 3D lens before and at entry zero.
  scene.endComputerView();motion=new ApartmentMotion(config);scene.modes.reset();scene.modes.yaw=.63;scene.modes.pitch=-.17;scene.setComputerPresentation({phase:'room',zoom:0},{power:'on'},'Игрок');scene.render(motion,0,{paused:true});
  let previewPose;timings.sort((a,b)=>a-b);window.qaCamera={scene,motion,renderRoom(){scene.render(motion,0,{paused:true});previewPose=renderedPose();return previewPose;},async enter(){beginPcCutscene(motion,{firstPerson:true});await scene.prepareComputerView();scene.beginComputerView();scene.setComputerPresentation({phase:'zoom-in',zoom:0},{power:'on'},'Игрок');scene.render(motion,0,{paused:true});const origin=renderedPose();comparePose(origin,previewPose,'Full-size screenshot flight changed its source camera');return origin;}};return {traceViewport:{width:innerWidth,height:innerHeight},records,projectionError,flights,renderMs:{p50:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)}};
 },artifactUrl);
 assert.equal(result.records.length,6);assert.ok(result.records.every(r=>r.frames>10&&r.final==='2D'));assert.ok(result.projectionError<1e-9);assert.equal(result.flights.length,12);
 assert.ok(result.flights.every(flight=>flight.roomReady===1&&flight.exit.some(frame=>frame.phase==='synchronous-room-ready')));
 assert.deepEqual(result.traceViewport,traceViewport);await page.setViewportSize(screenshotViewport);
 const before=await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return window.qaCamera.renderRoom();});
 await fs.mkdir(outputDir,{recursive:true});await page.screenshot({path:path.join(outputDir,'camera-room-before-entry.png')});
 const origin=await page.evaluate(()=>window.qaCamera.enter());result.screenshots={viewport:screenshotViewport,before,origin};
 await page.screenshot({path:path.join(outputDir,'camera-room-at-entry-zero.png')});await page.evaluate(()=>{window.qaCamera.scene.dispose();delete window.qaCamera;});
 await fs.writeFile(path.join(outputDir,'camera-handoffs.json'),JSON.stringify(result,null,2));await page.unroute(address);return result;
}
