// Isolated contexts only; these fixtures never access the user's browser saves.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/home-systems-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});const errors=[];
async function fixture({legacy=false,denied=false}={}){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__wardrobe-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated wardrobe fixture</body>'}));await page.goto('http://127.0.0.1:4173/__wardrobe-fixture');
 if(legacy)await page.evaluate(async()=>{
  const [{STAT_KEYS,DEFAULT_APPEARANCE},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=23'),import('/src/virtual-pc-state.js?rev=23')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify({version:3,name:'Прежний герой',skills:Object.fromEntries(STAT_KEYS.map((k,i)=>[k,i===0?30:20])),appearance:{...DEFAULT_APPEARANCE,hair:'shaggy',beard:'broad',mustache:'chevron',top:'hoodie',topColor:'red'}}));
  const pc=createVirtualPcState({projects:[{id:'preserved',name:'Мой проект',sourceStems:['kick.wav','bass.wav'],chosenAudio:'bass.wav'}],music:{cash:987,practice:23,genrePractice:{boom_bap:8}},household:{fridge:{apple:0,pear:2,banana:3}},download:{status:'installed'},lastGameMinute:6480});delete pc.noviceSchema;
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(pc));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:5,minutes:720,initialRest:false}));
 });
 if(denied)await page.addInitScript(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.endsWith('-before-novice-v1'))throw new DOMException('Backup denied','QuotaExceededError');return write.call(this,key,value);};});
 await page.goto('http://127.0.0.1:4173/');await page.locator('#loading').waitFor({state:'hidden'});return {context,page};
}
const profile=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-apartment-v3')));
const pc=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1')));
const idle=page=>page.waitForFunction(()=>!document.querySelector('#actions [data-action=wardrobe]').disabled);
async function wardrobe(page){const dialog=page.getByRole('dialog',{name:'Шкаф'});await idle(page);await page.locator('#actions [data-action=wardrobe]').click();assert.equal(await dialog.isVisible(),false,'opening waits for approach');await dialog.waitFor({state:'visible'});return dialog;}
try{
 {
  const {context,page}=await fixture();await page.locator('#new-game').click();await page.locator('#character-name').fill('Новый новичок');assert.equal(await page.locator('#stats-tab').count(),0);
  await page.locator('[data-category=hair]').click();await page.locator('[data-option=parted]').click();await page.locator('#clothing-tab').click();await page.locator('[data-option=hoodie]').click();await page.locator('[data-color=red]').click();await page.screenshot({path:output+'/wardrobe-fresh-creator.png'});await page.locator('#start-game').click();
  assert.deepEqual(Object.values((await profile(page)).skills),[10,10,10,10,10,10,10,10,10]);assert.deepEqual((await profile(page)).wardrobe.top,[{id:'hoodie',color:'red'}]);
  await page.locator('#wake').click();await idle(page);await page.screenshot({path:output+'/wardrobe-room-2d.png'});
  const dialog=await wardrobe(page);assert.equal(await dialog.locator('[data-category=top][data-option="hoodie:red"]').isEnabled(),true);await dialog.getByRole('button',{name:/Недоступные варианты/}).filter({visible:true}).click();
  assert.equal(await dialog.locator('[data-category=top][data-option="tee:red"]').isDisabled(),true);const before=await profile(page);await dialog.locator('[data-category=top][data-option="tee:red"]').dispatchEvent('click');assert.deepEqual(await profile(page),before);
  assert.equal(await page.locator('#game-header').evaluate(n=>getComputedStyle(n).visibility),'hidden');assert.equal(await page.locator('#controls').evaluate(n=>getComputedStyle(n).visibility),'hidden');
  await page.screenshot({path:output+'/wardrobe-locked-preview.png'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'apartment');assert.deepEqual(await profile(page),before);
  await idle(page);await page.screenshot({path:output+'/wardrobe-furniture-2d.png'});await page.mouse.move(720,350);assert.match(await page.locator('#hover-label').textContent(),/шкафа/);await page.mouse.click(720,350);await dialog.waitFor({state:'visible'});await page.keyboard.press('Escape');
  await idle(page);await page.locator('#actions [data-action=wardrobe]').click();await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'Применить',exact:true}).click();await page.reload();await page.locator('#continue-game').click();assert.equal((await profile(page)).appearance.topColor,'red');
  await idle(page);await page.locator('#camera-mode').click();await page.waitForFunction(()=>document.querySelector('#camera-mode').textContent==='Камера: 3D');await page.screenshot({path:output+'/wardrobe-room-3d.png'});
  await wardrobe(page);await page.keyboard.press('Escape');await idle(page);await page.screenshot({path:output+'/wardrobe-furniture-3d.png'});await page.mouse.move(640,400);assert.match(await page.locator('#hover-label').textContent(),/шкафа/);await page.mouse.click(640,400);await dialog.waitFor({state:'visible'});
  await page.setViewportSize({width:480,height:720});await page.screenshot({path:output+'/wardrobe-narrow.png'});const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.width<=480&&bounds.height<=720);
  assert.equal(await page.locator('#game-header').evaluate(n=>getComputedStyle(n).visibility),'hidden');assert.equal(await dialog.evaluate(n=>{const title=n.querySelector('h2'),apply=[...n.querySelectorAll('button')].find(b=>b.textContent==='Применить');return [title,apply].every(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});}),true,'title and apply remain unobstructed');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('.home-wardrobe').contains(document.activeElement)),true);await context.close();console.log('PASS fresh creator, approach, locked choices, cancel/apply/reload, 2D/3D furniture raycast, narrow stacking and focus');
 }
 {
  const {context,page}=await fixture({legacy:true}),migrated=await profile(page),state=await pc(page);assert.equal(migrated.version,4);assert.deepEqual(Object.values(migrated.skills),[10,10,10,10,10,10,10,10,10]);assert.equal(migrated.appearance.hair,'bowl');assert.equal(state.music.practice,0);assert.equal(state.music.cash,987);assert.equal(state.household.fridge.pear,2);assert.deepEqual(state.projects[0].sourceStems,['kick.wav','bass.wav']);assert.equal(state.download.status,'installed');
  await page.locator('#continue-game').click();await wardrobe(page);await page.screenshot({path:output+'/wardrobe-migrated.png'});await page.keyboard.press('Escape');await page.goto('http://127.0.0.1:4173/__wardrobe-fixture');await page.evaluate(()=>{const key='battle-life-virtual-pc-v1',state=JSON.parse(localStorage.getItem(key));state.music.practice=3;localStorage.setItem(key,JSON.stringify(state));});await page.goto('http://127.0.0.1:4173/');await page.locator('#loading').waitFor({state:'hidden'});assert.equal((await pc(page)).music.practice,3);assert.equal((await profile(page)).appearance.hair,'bowl');await context.close();console.log('PASS legacy migration preserves project/audio/wallet/fridge/time and later practice');
 }
 {
  const {context,page}=await fixture({legacy:true,denied:true});assert.match(await page.locator('#save-note').textContent(),/Автосохранение отключено/);const original=await pc(page);await page.locator('#continue-game').click();await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.waitForTimeout(500);assert.deepEqual(await pc(page),original);assert.equal((await profile(page)).version,3);await page.screenshot({path:output+'/wardrobe-migration-failure.png'});await context.close();console.log('PASS migration failure blocks later destructive autosave');
 }
 assert.deepEqual(errors,[]);console.log('PASS zero page errors');
}finally{await browser.close();}
