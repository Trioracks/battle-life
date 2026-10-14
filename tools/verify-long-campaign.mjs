// Isolated real-Edge profiling. No player origin, downloads, or visual changes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('.'),out=resolve(process.env.FT_QA_DIR||'artifacts/v-krugu-qa/long-campaign');
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const specified=process.argv.find(v=>v.startsWith('--label='))?.slice(8);
const exists=await access(out+'/baseline.json').then(()=>true,()=>false),label=specified||(exists?'after':'baseline');
assert.match(label,/^[a-z0-9-]+$/);
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname,path=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
 if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const summarize=rows=>{
 const q=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))]??0;
 const update=rows.map(r=>r.ms).sort((a,b)=>a-b),frames=rows.map(r=>r.dt).filter(n=>n>0).sort((a,b)=>a-b);
 return {frames:rows.length,updateP50:q(update,.5),updateP95:q(update,.95),updateMax:update.at(-1)??0,frameP95:q(frames,.95),frameMax:frames.at(-1)??0,walking:rows.filter(r=>r.walking).length,targetsMet:q(update,.95)<=20&&q(frames,.95)<=25};
};
const original=await readFile('src/apartment-app.js','utf8');
const hook=`window.campaignQA={samples:[],walking:false,get state(){return pcState},get pc(){return virtualPc},get phase(){return pcLifecycle.snapshot.phase},get motion(){return motion},reset(){this.samples=[];this.lastNow=null;}};
 function update(dt,now,step=false){
  if(campaignQA.walking&&mode==='game'&&motion.phase==='idle')motion.move(motion.position[0]>0?-4.5:4.5);
  const start=performance.now();updateOriginal(dt,now,step);
  campaignQA.samples.push({ms:performance.now()-start,dt:campaignQA.lastNow?now-campaignQA.lastNow:0,phase:pcLifecycle.snapshot.phase,walking:motion.phase==='walk'});campaignQA.lastNow=now;
 }
 `;
assert.ok(original.includes('function update(dt,now,step=false){'));
assert.ok(original.includes("loading.hidden=true;setMode('menu');"));
const source=original.replace('function update(dt,now,step=false){','function updateOriginal(dt,now,step=false){').replace("loading.hidden=true;setMode('menu');",hook+"loading.hidden=true;setMode('menu');");
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
const report={label,performanceOnly:process.argv.includes('--performance-only'),base,createdAt:new Date().toISOString(),results:[],errors:[]};
try{
 for(const [tracks,width,height]of [[1,1280,720],[5,1280,720],[10,1280,720],[20,1280,720],[20,1366,768],[20,1920,1080]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/__campaign-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated long campaign</title>'}));
  await page.goto(base+'/__campaign-seed');
  const seed=await page.evaluate(async tracks=>{
   const [fixtures,profiles,saves,beats,workflow,home]=await Promise.all([import('/test/helpers/long-campaign-fixture.js'),import('/src/avatar-v3-profile.js'),import('/src/virtual-pc-state.js'),import('/src/beat-production.js'),import('/src/creative-workflow.js'),import('/src/home-creative-work.js')]);
   const f=fixtures.longCampaignFixture({tracks,day:8});
   let state=beats.createBeat(f.state,{id:'current',name:'После архива'},f.skills,()=>.4).state;
   const started=workflow.startCreativeChain(state,{kind:'beat',projectId:'current',gameDay:8},f.skills,()=>.4);if(!started.ok)throw Error(started.reason);state=started.state;
   const history=JSON.stringify({projects:state.projects.filter(p=>p.id!=='current'),plans:state.creativeWork.items.filter(i=>i.projectId!=='current')});
   const costs={progress:[],descriptor:[],advance:[]};
   for(let i=0;i<60;i++)for(const [key,run]of [['progress',()=>workflow.creativeChainProgress(state,'current')],['descriptor',()=>home.creativeWorkDescriptor(state,f.skills)],['advance',()=>home.advanceCreativeWork(state,.001,{day:8,minutes:720},f.skills)]]){const start=performance.now();run();costs[key].push(performance.now()-start);}
   const profile=profiles.createProfile({name:'Long campaign QA'});profile.skills={...profile.skills,...f.skills};profiles.saveProfile(localStorage,profile);
   if(!saves.saveVirtualPcState(localStorage,state))throw Error('Fixture save failed');
   localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:8,minutes:720,initialRest:false}));
   return {history,costs,projects:state.projects.length,plans:state.creativeWork.items.length,progress:workflow.creativeChainProgress(state,'current')};
  },tracks);
  await page.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));
  await page.route('**/src/virtual-pc-ui.js*',async r=>{const response=await r.fetch(),body=await response.text();assert.ok(body.includes('  return pc;'));await r.fulfill({response,body:body.replace('  return pc;','  window.campaignHost={run:callbacks.onWork};return pc;')});});
  await page.goto(base);await page.waitForFunction(()=>window.campaignQA);await page.locator('#continue-game').click();
  await page.waitForFunction(()=>campaignQA.motion.phase==='idle'&&campaignQA.phase==='room');
  const row={tracks,width,height,seed:{projects:seed.projects,plans:seed.plans,progress:seed.progress},micro:{}};
  for(const [key,times]of Object.entries(seed.costs))row.micro[key]=summarize(times.map(ms=>({ms,dt:0})));
  await page.evaluate(()=>{campaignQA.walking=true;campaignQA.reset();});
  await page.waitForFunction(()=>campaignQA.samples.length>=180);
  row.walking=summarize(await page.evaluate(()=>campaignQA.samples));assert.ok(row.walking.walking>0);
  await page.evaluate(()=>campaignQA.walking=false);await page.waitForFunction(()=>campaignQA.motion.phase==='idle');
  await page.locator('#actions [data-action="computer"]').click();await page.waitForFunction(()=>campaignQA.phase==='desktop');
  await page.evaluate(()=>campaignQA.pc.openNow('ft-studio'));await page.locator('.pc-window[data-window-id="ft-studio"]').waitFor();
  await page.evaluate(()=>campaignQA.reset());await page.waitForFunction(()=>campaignQA.samples.length>=180);
  row.ft=summarize(await page.evaluate(()=>campaignQA.samples));
  const profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');
  await page.evaluate(()=>{if(!campaignHost.run())throw Error('Cannot start work');});await page.waitForFunction(()=>campaignQA.phase==='working');
  await page.evaluate(()=>campaignQA.reset());
  await page.waitForFunction(()=>campaignQA.samples.filter(s=>s.phase==='working').length>=180||campaignQA.phase==='desktop');
  const data=await page.evaluate(()=>({samples:campaignQA.samples.filter(s=>s.phase==='working'),history:JSON.stringify({projects:campaignQA.state.projects.filter(p=>p.id!=='current'),plans:campaignQA.state.creativeWork.items.filter(i=>i.projectId!=='current')}),state:campaignQA.state}));
  const {profile}=await profiler.send('Profiler.stop');await writeFile(`${out}/${label}-${tracks}-${width}x${height}.cpuprofile`,JSON.stringify(profile));
  row.work=summarize(data.samples);assert.ok(row.work.frames>10);assert.equal(data.history,seed.history);row.historyPreserved=true;
  row.currentStages=data.state.projects.find(p=>p.id==='current').stages.length;row.currentElapsed=data.state.music.job?.elapsed??null;
  await page.screenshot({path:`${out}/${label}-${tracks}-${width}x${height}.png`});
  await writeFile(`${out}/${label}-${tracks}-${width}x${height}-samples.json`,JSON.stringify({row,micro:seed.costs,samples:data.samples},null,2));
  report.results.push(row);await writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(row));await context.close();
 }
 assert.deepEqual(report.errors,[]);console.log(`PASS isolated campaign history and native samples: ${out}/${label}.json`);
}finally{await writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
