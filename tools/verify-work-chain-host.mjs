import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core'),out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.stack);});
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175';
const desktop=()=>page.waitForFunction(()=>window.workHost?.pc.phase==='desktop'&&!workHost.pc.locked&&document.body.dataset.mode==='pc');
async function sit(){await page.waitForFunction(()=>document.body.dataset.mode==='game'&&!document.querySelector('#actions [data-action=computer]').disabled);await page.locator('#actions [data-action=computer]').click();await desktop();}
async function resume(kind){await page.evaluate(async kind=>{const {startCreativeChain}=await import('/src/creative-workflow.js?rev=38'),r=startCreativeChain(workHost.pc.state,{kind,projectId:kind+'-one'},workHost.pc.metadata.skills,()=>.4);if(!r.ok)throw Error(r.reason);workHost.pc.persist(r.state);if(!workHost.run())throw Error('work did not start');},kind);await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='working');}
try{
 await page.route('**/src/virtual-pc-ui.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('  return pc;','  window.workHost={pc,run:callbacks.onWork};return pc;')});});
 await page.route('**/src/apartment-v3-scene.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('function setWorkCamera(value){','function setWorkCamera(value){window.cameraWorkFrame=value;')});});
 await page.route('**/__work-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await page.goto(base+'/__work-seed');
 await page.evaluate(async()=>{const {createProfile}=await import('/src/avatar-v3-profile.js');localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Проверка цепочки'})));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:720,initialRest:false}));});
 await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await sit();
 for(const kind of ['beat','lyrics']){
  await page.evaluate(async kind=>{const {creativeFixture}=await import('/test/helpers/creative-fixtures.js');workHost.pc.persist(creativeFixture(kind).state);},kind);
  await resume(kind);
  for(let stage=0;stage<3;stage++){
   await page.waitForFunction(({kind,stage})=>{const s=workHost.pc.state,j=s[kind==='beat'?'music':'writing'].job;return j?.stage===stage&&j.elapsed/j.total>.16&&window.cameraWorkFrame?.progress>0;},{kind,stage});
   await page.getByRole('button',{name:'Прервать работу',exact:true}).click();
   const paused=await page.evaluate(kind=>{const s=workHost.pc.state,item=s.creativeWork.items.find(i=>i.projectId===kind+'-one');return {job:item.pausedJob,practice:s[kind==='beat'?'music':'writing'].practice,frame:window.cameraWorkFrame};},kind);
   assert.equal(paused.job.stage,stage);await sit();
   assert.equal(await page.evaluate(kind=>workHost.pc.state[kind==='beat'?'music':'writing'].practice,kind),paused.practice);
   await resume(kind);const frame=await page.evaluate(()=>window.cameraWorkFrame);
   assert.equal(frame.kind,kind);assert.ok(frame.progress>=paused.frame.progress&&frame.progress<paused.frame.progress+.1,'resume must not restart the path');
   console.log('PASS',kind,'stage',stage+1,'resume',frame.progress.toFixed(3));
  }
  await desktop();assert.equal(await page.evaluate(kind=>workHost.pc.state.projects.find(p=>p.id===kind+'-one').stages.length,kind),3);await page.screenshot({path:out+'/chain-'+kind+'-complete.png'});
 }
 await page.evaluate(async()=>{const {creativeFixture}=await import('/test/helpers/creative-fixtures.js');workHost.pc.persist(creativeFixture('beat',{satiety:20.2}).state);});await resume('beat');
 await page.waitForFunction(()=>document.body.dataset.mode==='game');assert.equal(await page.evaluate(()=>workHost.pc.state.creativeWork.activeId),null);assert.ok(await page.evaluate(()=>workHost.pc.state.creativeWork.items[0].pausedJob?.elapsed>0));
 assert.deepEqual(errors,[]);console.log('PASS actual host: pause/resume in all three beat/lyrics stages preserves camera progress and XP; hunger interrupts safely');
}finally{await browser.close();}
