import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/studio-immersion-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__work-layout',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated layout fixture</body>'}));await page.goto('http://127.0.0.1:4173/__work-layout');
 await page.evaluate(async()=>{
  const [{createProfile},{createVirtualPcState},{createBeat}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=28'),import('/src/virtual-pc-state.js?rev=31'),import('/src/beat-production.js?rev=31')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Проверка композиции'})));
  const state=createBeat(createVirtualPcState({power:'on',download:{status:'installed'},music:{needs:{satiety:100,energy:100}}}),{id:'layout',name:'Рабочий вечер'},{}).state;
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(state));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:720,initialRest:false}));
 });
 await page.goto('http://127.0.0.1:4173/?rev=28');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);await page.locator('#actions [data-action=computer]').click();
 await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='desktop');const pc=page.locator('#virtual-pc');await pc.getByRole('button',{name:'Пуск',exact:true}).click();await pc.getByRole('menuitem',{name:'FT Studio',exact:true}).click();const ft=pc.locator('.pc-window[data-window-id="ft-studio"]');await ft.locator('[data-ft-role=dialog]').getByRole('button',{name:'Открыть проект',exact:true}).click();await ft.getByRole('button',{name:'Рабочий вечер · 0/3',exact:true}).click();await ft.getByRole('button',{name:'Работать над этапом',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-work-role=skill-progress]')?.value>10.1);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 for(const [width,height]of [[1280,900],[940,650],[640,900]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);const hud=await page.locator('.beat-work-hud').boundingBox();
  assert.ok(hud.x>=0&&hud.y>=0&&hud.x+hud.width<=width&&hud.y+hud.height<=height);
  if(width>800)assert.ok(hud.x+hud.width<width/2-35,'HUD must leave centre/typing arms visible');else assert.ok(hud.y>height*.55,'compact HUD stays beneath the actor');
  await page.screenshot({path:output+'/work-layout-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);console.log('PASS work HUD leaves actor centre clear at1280/940; compact640 layout fits viewport');
}catch(error){await page.screenshot({path:output+'/layout-failure.png'}).catch(()=>{});throw error;}finally{await context.close();await browser.close();}
