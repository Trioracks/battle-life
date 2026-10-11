// Real application and HUD in a fresh browser context; never the player's save.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.SCENE_QA_DIR||'D:/Codex/Builds/Battle/perspective-camera-gameplay';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],results=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__camera-seed',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated camera QA seed</title>'}));
 await page.goto('http://127.0.0.1:4173/__camera-seed');
 await page.evaluate(async()=>{
  const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js'),import('/src/virtual-pc-state.js')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Проверка камеры'})));
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(createVirtualPcState({power:'off',music:{needs:{satiety:100,energy:100}}})));
  localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:720,initialRest:false}));
 });
 await page.goto('http://127.0.0.1:4173/');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();
 await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));
 const freeze=hidden=>page.evaluate(hidden=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});document.dispatchEvent(new Event('visibilitychange'));},hidden);
 await freeze(true);
 for(const room of ['living','kitchen']){
  if(room==='kitchen'){
   await freeze(false);await page.locator('#actions [data-action=passage]').click();
   await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle')&&document.querySelector('#room').textContent==='КУХНЯ');await freeze(true);
  }
  for(const width of [1280,640]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const clock=await page.locator('#home-time').textContent(),state=await page.locator('#state').textContent();
   for(const mode of ['2D','3D']){
    if(await page.locator('#camera-mode').textContent()!=='Камера: '+mode)await page.locator('#camera-mode').click();
    await page.waitForFunction(mode=>document.querySelector('#camera-mode').textContent==='Камера: '+mode&&!document.querySelector('#camera-mode').disabled,mode);
    assert.equal(await page.locator('#home-time').textContent(),clock,'clock stays fixed between cameras');
    assert.equal((await page.locator('#state').textContent()).split(' · ').slice(0,6).join(' · '),state.split(' · ').slice(0,6).join(' · '),'actor, action and door stay fixed');
    await page.screenshot({path:output+'/'+width+'-'+room+'-'+mode.toLowerCase()+'-hud.png'});
    results.push({width,room,mode,clock,state:await page.locator('#state').textContent()});
   }
   await page.locator('#camera-mode').click();await page.waitForFunction(()=>document.querySelector('#camera-mode').textContent==='Камера: 2D'&&!document.querySelector('#camera-mode').disabled);
  }
 }
 assert.deepEqual(errors,[]);await writeFile(output+'/gameplay-evidence.json',JSON.stringify({results,errors},null,2));
 console.log('PASS real game HUD at1280/640 in both rooms and cameras; fixed clock, actor and door; no page errors. Captures: '+output);
}finally{await context.close();await browser.close();}
