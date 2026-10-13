import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {activateSocial,advanceSocial} from '../src/social-runtime.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=resolve('artifacts/v-krugu-qa'),root=resolve('.'),base='http://127.0.0.1:4176';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,base).pathname,path=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4176,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const initial=activateSocial(createVirtualPcState({power:'on'}),600).state,deadline=initial.battleWindows[0].closesAt,results=[];
for(const id of ['client','ft','notebook'])initial.software[id].installed=true;
let source=await readFile('src/apartment-app.js','utf8');
const hook=`window.battleFpsQA={samples:[],saves:[],longTasks:[],walkPasses:0,walking:true,
 get state(){return pcState},get background(){return socialBackground.snapshot},get phase(){return pcLifecycle.snapshot.phase},get sleeping(){return motion.sleeping},
 setMinute(at){homeTime.day=Math.floor(at/1440)+1;homeTime.minutes=at%1440},setCamera(mode){view.modes.mode=mode},
 forceSave(){return persistPc(pcState)},get minute(){return gameMinuteStamp(homeTime)},
 setQuota(value){battleFpsQA.quota=value},pause(value){paused=value},
 resetMetrics(){battleFpsQA.samples=[];battleFpsQA.saves=[];battleFpsQA.longTasks=[];battleFpsQA.lastNow=null;}};
 new PerformanceObserver(list=>battleFpsQA.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask'});
 const qaStorageSet=storage.setItem.bind(storage);storage.setItem=function(key,value){if(battleFpsQA.quota&&key==='battle-life-virtual-pc-v1')throw new DOMException('QA quota','QuotaExceededError');return qaStorageSet(key,value)};
 function update(dt,now,step=false){if(battleFpsQA.walking&&mode==='game'&&motion.phase==='idle'){motion.move(motion.position[0]>0?-4.5:4.5);battleFpsQA.walkPasses++;}const start=performance.now();updateOriginal(dt,now,step);if(mode==='game'||pcLifecycle.snapshot.phase==='working')battleFpsQA.samples.push({ms:performance.now()-start,dt:battleFpsQA.lastNow?now-battleFpsQA.lastNow:0,phase:motion.phase,pcPhase:pcLifecycle.snapshot.phase,sound:virtualPc.beatAudio.status,stage:pcState.music.job?.stage,background:socialBackground.snapshot.busy});battleFpsQA.lastNow=now;}
 `;
// A prototype hook is required: native Storage does not permit overriding one
// instance method by ordinary assignment (it would create a storage key).
source=source.replace('function update(dt,now,step=false){','function updateOriginal(dt,now,step=false){')
 .replace('    const previous=pcState;', '    const qaSaveStart=performance.now();const previous=pcState;')
 .replace('    return saved;', '    window.battleFpsQA?.saves.push(performance.now()-qaSaveStart);return saved;')
 .replace("loading.hidden=true;setMode('menu');",hook.replace("storage.setItem=function(key,value)","Storage.prototype.setItem=function(key,value)")+"loading.hidden=true;setMode('menu');");
const summarize=rows=>{const a=rows.map(r=>r.ms).sort((a,b)=>a-b),dt=rows.map(r=>r.dt).filter(x=>x>0).sort((a,b)=>a-b),q=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))];return {frames:rows.length,fps:1000/(dt.reduce((a,b)=>a+b,0)/dt.length),updateP50:q(a,.5),updateP95:q(a,.95),updateMax:a.at(-1),frameP95:q(dt,.95),frameMax:dt.at(-1),framesOver100ms:dt.filter(x=>x>100).length,walking:rows.filter(r=>r.phase==='walk').length,whileBusy:rows.filter(r=>r.background).length};};
try{
 const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 const profiler=process.env.FPS_PROFILE?await context.newCDPSession(page):null;
 await page.route('**/__fps-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated FPS regression</title>'}));await page.goto(base+'/__fps-seed');
 await page.evaluate(async({initial,deadline})=>{const p=await import('/src/avatar-v3-profile.js?rev=41'),s=await import('/src/virtual-pc-state.js?rev=41');p.saveProfile(localStorage,p.createProfile({name:'FPS regression'}));if(!s.saveVirtualPcState(localStorage,initial))throw Error('Seed save failed');const at=deadline-60;localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:Math.floor(at/1440)+1,minutes:at%1440,initialRest:false}));},{initial,deadline});
 await page.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.battleFpsQA);await page.locator('#continue-game').click();await page.waitForFunction(()=>battleFpsQA.walkPasses>=4&&!battleFpsQA.background.busy);
 async function collect(label,advance=null,condition=null){
  await page.evaluate(at=>{battleFpsQA.resetMetrics();if(at!==null)battleFpsQA.setMinute(at);},advance);
  if(condition)await page.waitForFunction(condition);
  await page.waitForFunction(()=>battleFpsQA.samples.length>=360&&!battleFpsQA.background.busy);
  const data=await page.evaluate(()=>({samples:battleFpsQA.samples,background:battleFpsQA.background,saves:battleFpsQA.saves,longTasks:battleFpsQA.longTasks}));const row={label,...summarize(data.samples),background:data.background,saveMax:Math.max(0,...data.saves),longTasks:data.longTasks};results.push(row);console.log(JSON.stringify(row));return row;
 }
 await collect('before deadline');
 const close=await collect('selection closing while walking',deadline+1,()=>battleFpsQA.state.tournaments.byId['makarevich-1']?.rounds.selection.status==='awaiting_judges');assert.ok(close.whileBusy>5,'render must continue while NPC tracks are generated');
 const judging=await collect('judging while walking',deadline+2400,()=>battleFpsQA.state.tournaments.byId['makarevich-1']?.rounds.selection.status==='complete');assert.ok(judging.whileBusy>5);
 const final=await collect('catch-up through final while walking',70*1440,()=>battleFpsQA.state.tournaments.byId['makarevich-1']?.status==='complete');assert.ok(final.whileBusy>5);
 await collect('final archive 3D');await page.evaluate(()=>battleFpsQA.setCamera('2D'));await page.waitForFunction(()=>battleFpsQA.samples.length>=500);await collect('final archive 2D');
 const actual=await page.evaluate(()=>battleFpsQA.state),expected=advanceSocial(initial,actual.socialRuntime.lastMinute,{heroSkills:{}}).state;
 assert.deepEqual(actual.tournaments,expected.tournaments);assert.deepEqual(actual.trackVersions,expected.trackVersions);assert.deepEqual(actual.judging,expected.judging);assert.equal(new Set(actual.socialRuntime.events.map(e=>e.id)).size,actual.socialRuntime.events.length);
 await page.reload();await page.waitForFunction(()=>window.battleFpsQA);await page.locator('#continue-game').click();await page.waitForFunction(()=>battleFpsQA.background.commits>0&&!battleFpsQA.background.busy);assert.deepEqual(await page.evaluate(()=>battleFpsQA.state.tournaments),actual.tournaments);await collect('reloaded final archive');
 await page.evaluate(()=>battleFpsQA.walking=false);await page.locator('#actions [data-action="computer"]').click();await page.waitForFunction(()=>battleFpsQA.phase==='desktop');
 if(profiler){await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
 await page.getByRole('button',{name:'Слобода',exact:true}).click();await page.getByRole('menuitem',{name:'FT Studio',exact:true}).click();const ft=page.locator('.pc-window[data-window-id="ft-studio"]');await ft.getByRole('dialog').getByRole('button',{name:'Новый проект',exact:true}).click();await ft.getByRole('textbox',{name:'Название бита'}).fill('FPS после финала');await ft.getByRole('button',{name:'Начать проект',exact:true}).click();await ft.getByRole('button',{name:'Работать над битом',exact:true}).click();await page.waitForFunction(()=>battleFpsQA.phase==='working');await page.evaluate(()=>battleFpsQA.resetMetrics());await page.waitForFunction(()=>battleFpsQA.phase==='desktop');
 if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile(out+'/fps-work.cpuprofile',JSON.stringify(profile));}
 const work=await page.evaluate(()=>({samples:battleFpsQA.samples.filter(s=>s.pcPhase==='working'),stages:battleFpsQA.state.projects.find(p=>p.name==='FPS после финала')?.stages.length,saves:battleFpsQA.saves,longTasks:battleFpsQA.longTasks}));assert.equal(work.stages,3);assert.deepEqual([...new Set(work.samples.filter(s=>s.sound==='playing').map(s=>s.stage))].sort(),[0,1,2]);const workResult={label:'three-stage work with final archive',...summarize(work.samples),saveMax:Math.max(0,...work.saves),longTasks:work.longTasks};results.push(workResult);console.log(JSON.stringify(workResult));
 await page.getByRole('button',{name:'Слобода',exact:true}).click();await page.getByRole('menuitem',{name:'Отойти от ПК',exact:true}).click();await page.waitForFunction(()=>battleFpsQA.phase==='room');await page.locator('#actions [data-action="bed"]').click();await page.waitForFunction(()=>battleFpsQA.sleeping);await collect('sleep with final archive',null,()=>!battleFpsQA.sleeping);
 // Independent campaign / storage. Never modify the user's normal 4173 origin.
 await page.goto(base+'/__fps-seed');await page.evaluate(async({initial,deadline})=>{const s=await import('/src/virtual-pc-state.js?rev=41');s.saveVirtualPcState(localStorage,initial);const at=deadline-60;localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:Math.floor(at/1440)+1,minutes:at%1440,initialRest:false}));},{initial,deadline});await page.goto(base);await page.waitForFunction(()=>window.battleFpsQA);await page.locator('#continue-game').click();await page.waitForFunction(()=>battleFpsQA.background.commits>0&&!battleFpsQA.background.busy&&battleFpsQA.samples.length>150);
 const oldSave=await page.evaluate(()=>{battleFpsQA.forceSave();battleFpsQA.setQuota(true);return localStorage.getItem('battle-life-virtual-pc-v1');});
 await collect('failed save at deadline',deadline+1,()=>battleFpsQA.background.failed);await page.locator('#battle-runtime-warning').waitFor({state:'visible'});const jobs=await page.evaluate(()=>battleFpsQA.background.jobsStarted);await collect('walking after save failure');assert.equal(await page.evaluate(()=>battleFpsQA.background.jobsStarted),jobs);assert.equal(await page.evaluate(()=>localStorage.getItem('battle-life-virtual-pc-v1')),oldSave);assert.equal(await page.evaluate(()=>Object.keys(battleFpsQA.state.trackVersions.byId).length),0);
 await page.evaluate(()=>battleFpsQA.setQuota(false));await page.locator('#battle-runtime-warning button').click();await page.waitForFunction(()=>battleFpsQA.state.tournaments.byId['makarevich-1']?.rounds.selection.status==='awaiting_judges');assert.equal(await page.locator('#battle-runtime-warning').isVisible(),false);assert.equal(await page.evaluate(()=>Object.keys(battleFpsQA.state.trackVersions.byId).length),32);
 await page.screenshot({path:out+'/battle-fps-recovered.png'});assert.deepEqual(errors,[]);
 await writeFile(out+'/battle-fps-regression.json',JSON.stringify({results,errors,parity:true,reload:true,quotaRetry:true},null,2));
 for(const r of results){assert.ok(r.updateP95<20,r.label+' update p95');assert.ok(r.frameP95<25,r.label+' frame p95');assert.ok(r.frameMax<250,r.label+' frame max '+r.frameMax);}
}finally{await browser.close();server.close();}
