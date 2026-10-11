// Fresh browser contexts only: this never connects to a player's browser or saves.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output=process.env.FRIDGE_QA_DIR||'D:/Codex/Builds/Battle/fridge-shelves';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const errors=[],evidence=[];
async function saved(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1')));}
try{
 for(const width of [1280,640]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.route('**/__fridge-shelves-seed',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated fridge seed</title>'}));
   await page.goto('http://127.0.0.1:4173/__fridge-shelves-seed');
   await page.evaluate(async()=>{
    const [{createProfile,SAVE_KEY},{createVirtualPcState,VIRTUAL_PC_STORAGE_KEY}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=28'),import('/src/virtual-pc-state.js?rev=33')]);
    localStorage.setItem(SAVE_KEY,JSON.stringify(createProfile({name:'Проверка полок'})));
    localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:720,initialRest:false}));
    localStorage.setItem(VIRTUAL_PC_STORAGE_KEY,JSON.stringify(createVirtualPcState({power:'off',household:{fridge:{apple:0,pear:2,banana:0}},music:{needs:{satiety:50,energy:72},cash:123,practice:7}})));
   });
   await page.goto('http://127.0.0.1:4173/');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();
   const fridge=page.getByRole('dialog',{name:'Холодильник'}),action=page.locator('#actions [data-action=fridge]');
   await action.click();await fridge.waitFor({state:'visible'});
   assert.equal(await fridge.getAttribute('aria-modal'),'true');
   assert.equal(await fridge.locator('[data-fridge-compartment=freezer] [data-slot]').count(),3);
   assert.equal(await fridge.locator('[data-fridge-compartment=freezer] button').count(),0);
   assert.deepEqual(await fridge.locator('[data-fridge-shelf]').evaluateAll(shelves=>shelves.map(s=>[...s.querySelectorAll('button')].map(b=>b.dataset.foodId))),[['apple','pear','banana'],[],['sausage','bread','cheese']]);
   assert.deepEqual(await fridge.locator('[data-fridge-shelf]').evaluateAll(shelves=>shelves.map(s=>s.querySelectorAll('[data-slot]').length)),[3,3,3]);
   assert.equal(await fridge.locator('.home-food-stock').allTextContents().then(values=>values.every(value=>value==='Осталось: ∞')),true);
   assert.match(await fridge.locator('.home-fridge-mode').textContent(),/Временный тестовый режим/);
   const before=await saved(page);assert.equal(before.music.needs.satiety,50);assert.equal(before.power,'off');
   const apple=fridge.getByRole('button',{name:'Съесть: Яблоко',exact:true});
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Съесть: Яблоко');
   await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Закрыть');await page.keyboard.press('Tab');
   for(let step=0;step<6;step++)await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Закрыть');await page.keyboard.press('Tab');
   const actor=await page.locator('#state').textContent();await page.waitForTimeout(250);assert.equal(await page.locator('#state').textContent(),actor,'fridge pauses actor state');
   await page.screenshot({path:output+'/fridge-shelves-'+width+'.png'});
   const bounds=await fridge.locator('.home-fridge-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=900);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await apple.click();let after=await saved(page);assert.equal(after.music.needs.satiety,80);assert.deepEqual(after.household,before.household);assert.equal(await apple.isEnabled(),true);assert.equal(await page.evaluate(()=>document.activeElement.dataset.foodId),'apple');
   await page.keyboard.press('Escape');assert.equal(await fridge.isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'apartment');
   await page.reload();await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await action.click();await fridge.waitFor({state:'visible'});
   assert.equal(await apple.isEnabled(),true,'exhausted fruit stays available after reload');
   await fridge.getByRole('button',{name:'Съесть: Колбаса',exact:true}).click();after=await saved(page);assert.equal(after.music.needs.satiety,100);assert.deepEqual(after.household,before.household);assert.equal(after.music.needs.energy,72);assert.equal(after.music.cash,123);assert.equal(after.music.practice,7);assert.deepEqual(after.projects,before.projects);
   assert.equal(await fridge.locator('button[data-food-id]:enabled').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Закрыть');
   await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Закрыть');
   await page.screenshot({path:output+'/fridge-full-'+width+'.png'});
   await fridge.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(await fridge.isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'apartment');
   evidence.push({width,passed:true,quantityPreserved:after.household,satiety:after.music.needs.satiety});
   console.log('PASS '+width+': actual fridge shelves/freezer, infinite exhausted save/reload, +30/cap, finite quantities, keyboard/focus/modal/close, no overflow');
  }catch(error){await page.screenshot({path:output+'/failure-'+width+'.png'}).catch(()=>{});throw error;}finally{await context.close();}
 }
 assert.deepEqual(errors,[]);await writeFile(output+'/browser-evidence.json',JSON.stringify({passed:true,errors,evidence},null,2));console.log('PASS zero page errors');
}finally{await browser.close();}
