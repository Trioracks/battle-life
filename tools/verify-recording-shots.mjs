import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH);
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4190',out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/task-10';
assert.equal(new URL(base).port,'4190');await mkdir(out+'/browser-temp',{recursive:true});process.env.TMP=process.env.TEMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),errors=[],evidence=[],samples=[];
let activePage;
try{
 const context=await browser.newContext({viewport:{width:1366,height:768}}),page=activePage=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 const shot=async name=>{await page.screenshot({path:out+'/'+name+'.png'});console.log('SHOT '+name);};
 await page.route('**/__task10-geometry',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0}canvas{width:100vw;height:100vh;display:block}</style><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script><canvas></canvas><script type="module">
 import * as THREE from 'three';import {createApartmentScene} from '/src/apartment-v3-scene.js';import {ApartmentMotion} from '/src/apartment-v3-motion.js';import {prepareApartmentConfig} from '/src/apartment-v3-runtime.js';import {workCameraFrame} from '/src/work-camera.js';
 let scene,override;const add=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...objects){if(objects.some(o=>o.name==='player')){scene=this;this.onBeforeRender=(_renderer,_scene,camera)=>{if(override){override.updateMatrixWorld(true);camera.copy(override);}};}return add.apply(this,objects);};
 const config=prepareApartmentConfig(await(await fetch('/assets/apartment/v3/scene.json')).json());config.assetBase='/assets/apartment/v3/';const view=await createApartmentScene(document.querySelector('canvas'),config),motion=new ApartmentMotion(config);
 Object.assign(motion,{position:[...config.actions.computer.pose],yaw:config.actions.computer.yaw,targetYaw:config.actions.computer.yaw,actionId:'computer',phase:'perform',clip:'seated',fade:1,workPerformance:'typing'});
 window.qa={view,show(position,target,time=0){override=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.03,80);override.position.fromArray(position);override.lookAt(new THREE.Vector3(...target));view.setTime(720);view.setRoomLights({living:true,kitchen:true});view.setComputerPresentation({phase:'working',workActor:true,zoom:0},{power:'on'},'QA');view.setWorkCamera({kind:'beat',progress:.3});view.render(motion,time,{instant:true});return this.hands();},hands(){const result={};scene.updateMatrixWorld(true);for(const side of ['L','R']){const bone=scene.getObjectByName('hand'+side);result[side]=[.045,.105].map(n=>bone.localToWorld(new THREE.Vector3(0,n,0)).toArray());}return result;},dispose(){view.dispose();}};
 </script>`}));
 await page.goto(base+'/__task10-geometry');await page.waitForFunction(()=>window.qa);
 for(const [name,position,target,time]of [
  ['hands-left-extreme',[3.65,1.22,-.12],[4.48,.88,-.54],Math.PI/64],
  ['hands-right-extreme',[5.35,1.22,-.12],[4.48,.88,-.54],Math.PI/32],
  ['pot-left',[-3.65,1.33,-.38],[-3.10,1.07,-.81],0],
  ['pot-right',[-2.55,1.26,-.38],[-3.10,1.07,-.81],0]
 ]){const hands=await page.evaluate(a=>qa.show(...a),[position,target,time]);evidence.push({name,hands});await shot(name);}
 await page.evaluate(()=>qa.dispose());await page.close();await context.close();

 let source=await readFile(new URL('../src/apartment-app.js',import.meta.url),'utf8');
 const hook=`window.task10={get state(){return pcState},get phase(){return pcLifecycle.snapshot.phase},get shot(){return workCameraFrame(creativeWorkDescriptor(pcState,profile?.skills),{reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches})},get motion(){return motion},get transport(){return virtualPc.beatAudio.getSnapshot()},get pc(){return virtualPc},pause(value){paused=value},save(){persistPc(pcState)}};`;
 source=source.replace("loading.hidden=true;setMode('menu');",hook+"window.task10Samples=[];loading.hidden=true;setMode('menu');").replace('last=now;update(dt,now);requestAnimationFrame(frame);',"last=now;const began=performance.now();update(dt,now);if(!paused&&pcLifecycle.snapshot.phase==='working')task10Samples.push({width:innerWidth,frame:raw*1000,update:performance.now()-began});requestAnimationFrame(frame);");assert.ok(source.includes(hook));
 const ctx=await browser.newContext({viewport:{width:1280,height:720}}),host=activePage=await ctx.newPage();host.setDefaultTimeout(90000);host.on('pageerror',e=>errors.push(e.message));
 const snap=async name=>{await host.screenshot({path:out+'/'+name+'.png'});evidence.push({name,...await host.evaluate(()=>({phase:task10.phase,frame:task10.shot,job:task10.state.recording.job,transport:task10.transport}))});console.log('SHOT '+name);};
 await host.route('**/__task10-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Task10 isolated seed</title>'}));await host.goto(base+'/__task10-seed');
 await host.evaluate(async()=>{const [{createProfile,saveProfile},{submissionFixture},{saveVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js'),import('/test/helpers/submission-fixtures.js'),import('/src/virtual-pc-state.js')]);const s=submissionFixture({vocal:false});s.software.ft.installed=true;s.software.client.installed=true;s.music.needs={satiety:100,energy:100};saveProfile(localStorage,createProfile({name:'Запись'}));if(!saveVirtualPcState(localStorage,s))throw Error('save');localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:600,initialRest:false}));});
 await host.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));await host.goto(base);await host.locator('#loading').waitFor({state:'hidden'});await host.locator('#continue-game').click();
 if(await host.locator('#wake').isVisible())await host.locator('#wake').click();await host.waitForFunction(()=>task10.motion.phase==='idle');
 const enter=async()=>{await host.locator('#apartment').focus();await host.keyboard.press('Enter');await host.locator('#actions [data-action=computer]').click();await host.waitForFunction(()=>task10.phase==='desktop');};await enter();
 const pc=host.locator('#virtual-pc'),ft=pc.locator('.pc-window[data-window-id="ft-studio"]');
 const openStudio=async()=>{await pc.getByRole('button',{name:'Слобода',exact:true}).click();await pc.getByRole('menuitem',{name:'FT Studio',exact:true}).click();await ft.getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click();await ft.locator('.project-picker-row[data-project-id="beat"]').click();};await openStudio();
 await ft.getByRole('button',{name:'Добавить вокал',exact:true}).click();await ft.getByRole('dialog').locator('.project-picker-row[data-project-id="lyrics"]').click();
 await host.waitForFunction(()=>task10.phase==='working'&&task10.shot?.elapsedSeconds>.5);await snap('draft-mic');
 await host.waitForFunction(()=>task10.shot?.shot?.phase==='screen');await snap('draft-screen-rec');
 const cursor=await host.evaluate(()=>{const root=document.querySelector('[data-pc-role="recording-screen"]'),wave=root.querySelector('[data-ft-role="recording-region"]').getBoundingClientRect(),head=root.querySelector('[data-ft-role="playhead"]').getBoundingClientRect();return {waveRight:wave.right,headLeft:head.left,bpm:root.querySelector('[data-ft-role="recording-tempo"]').textContent,bars:root.dataset.recordingBars,position:root.querySelector('[data-ft-role="recording-position"]').textContent};});
 assert.ok(Math.abs(cursor.waveRight-cursor.headLeft)<2,'REC growing edge follows playhead');assert.equal(cursor.bpm,'90');assert.equal(cursor.bars,'4');assert.notEqual(cursor.position,'01 : 01 : 000');evidence.push({name:'recording-cursor',...cursor});
 await host.evaluate(()=>task10.pause(true));await host.waitForTimeout(100);const frozen=await host.evaluate(()=>({frame:task10.shot,elapsed:task10.state.recording.job.elapsed}));await snap('draft-screen-paused');await host.waitForTimeout(250);assert.deepEqual(await host.evaluate(()=>({frame:task10.shot,elapsed:task10.state.recording.job.elapsed})),frozen);
 await host.evaluate(()=>task10.pause(false));await host.waitForFunction(()=>task10.shot?.shot?.phase==='rear');await snap('draft-rear');await host.waitForFunction(()=>task10.phase==='desktop');assert.ok(await host.evaluate(()=>task10.state.projects.find(p=>p.id==='beat').recording.draft));
 await host.setViewportSize({width:1366,height:768});await host.emulateMedia({reducedMotion:'reduce'});await ft.getByRole('button',{name:'Записать чистовую',exact:true}).click();await host.waitForFunction(()=>task10.phase==='working'&&task10.shot?.elapsedSeconds>.5);assert.equal(await host.evaluate(()=>task10.shot.shot.bob),0);await snap('clean-mic-reduced-motion');
 await host.waitForFunction(()=>task10.shot?.shot?.phase==='screen');await host.evaluate(()=>task10.pause(true));await host.waitForTimeout(50);await snap('clean-screen-before-cancel');
 const output=await host.evaluate(()=>JSON.stringify(task10.state.recording.job.output));await host.locator('.beat-work-hud').getByRole('button',{name:'Прервать работу',exact:true}).click();await host.evaluate(()=>task10.pause(false));await host.waitForFunction(()=>task10.phase==='room');await snap('clean-cancelled');assert.equal(await host.locator('[data-pc-role="recording-screen"]').isVisible(),false);assert.equal(await host.evaluate(()=>JSON.stringify(task10.state.recording.job.output)),output);
 const restoredElapsed=await host.evaluate(()=>task10.state.recording.job.elapsed);samples.push(...await host.evaluate(()=>task10Samples));await host.setViewportSize({width:1920,height:1080});await host.reload();await host.locator('#loading').waitFor({state:'hidden'});await host.locator('#continue-game').click();await host.waitForFunction(()=>task10.motion.phase==='idle');assert.equal(await host.evaluate(()=>task10.state.recording.job.elapsed),restoredElapsed);
 await enter();await openStudio();await ft.getByRole('button',{name:'Продолжить: Чистовая запись',exact:true}).click();await host.waitForFunction(()=>task10.phase==='working');assert.equal(await host.evaluate(()=>JSON.stringify(task10.state.recording.job.output)),output);await snap('clean-restored-screen');await host.waitForFunction(()=>task10.shot?.shot?.phase==='rear');await snap('clean-rear');await host.waitForFunction(()=>task10.phase==='desktop');assert.ok(await host.evaluate(()=>task10.state.projects.find(p=>p.id==='beat').recording.clean));assert.notEqual(await host.evaluate(()=>task10.transport.status),'playing');
 samples.push(...await host.evaluate(()=>task10Samples));await ctx.close();assert.deepEqual(errors,[]);
 const summary=values=>{values.sort((a,b)=>a-b);return {count:values.length,p95:values[Math.floor(values.length*.95)],max:values.at(-1)};};
 const performance=[1280,1366,1920].map(width=>{const rows=samples.filter(s=>s.width===width).slice(20);return {width,frame:summary(rows.map(s=>s.frame)),update:summary(rows.map(s=>s.update))};});
 await writeFile(out+'/native-evidence.json',JSON.stringify({evidence,errors,performance},null,2));console.log(JSON.stringify(performance));
 for(const p of performance){assert.ok(p.frame.count>=60);assert.ok(p.frame.p95<=25,'native frame p95');assert.ok(p.update.p95<=20,'native update p95');}
 console.log('PASS geometry angles, draft/clean phases, frozen pause, reduced motion, cancel/reload/resume and no user transport restart');
}catch(error){
 await activePage?.screenshot({path:out+'/failure.png'}).catch(()=>{});
 const state=await activePage?.evaluate(()=>({phase:window.task10?.phase,body:document.body.innerText.slice(-5000)})).catch(()=>null);
 await writeFile(out+'/failure.json',JSON.stringify({error:error.stack,errors,state,evidence},null,2));throw error;
}finally{await browser.close();}
