// Narrow real-DOM focus regression; no scene load or player storage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__home-needs-focus',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/apartment-v3.css?rev=26"><button id="before">Outside before</button><section id="fridge"></section><button id="after">Outside after</button>'}));
 await page.goto('http://127.0.0.1:4173/__home-needs-focus');
 for(const [name,seed,want]of [
  ['stock remains',{music:{needs:{satiety:50}}},'Съесть: Груша'],
  ['full satiety',{music:{needs:{satiety:85}}},'Закрыть'],
  ['last portion',{music:{needs:{satiety:50}},household:{fridge:{apple:1,pear:0,banana:0}}},'Закрыть'],
 ]){
  await page.evaluate(async seed=>{
   const [{mountHomeNeedsView},{consumeFood},{createVirtualPcState}]=await Promise.all([import('/src/home-needs-view.js?rev=26'),import('/src/home-food.js?rev=26'),import('/src/virtual-pc-state.js?rev=26')]);
   window.fridgeView?.dispose();let state=createVirtualPcState(seed);const root=document.querySelector('#fridge');
   window.fridgeView=mountHomeNeedsView(root,{returnFocus:document.querySelector('#before'),onConsume:id=>{state=consumeFood(state,id).state;fridgeView.update(state);}});fridgeView.open(state);
  },seed);
  await page.getByRole('button',{name:'Съесть: Яблоко',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')||document.activeElement.textContent),want,name+' moves focus before disabled control blurs');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Закрыть',name+' traps backward tab');
  assert.equal(await page.evaluate(()=>document.querySelector('#fridge').contains(document.activeElement)),true);
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#fridge').contains(document.activeElement)),true);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'before');
  console.log('PASS '+name+': consume → enabled focus → Shift+Tab/Tab contained → Escape restores');
 }
 assert.deepEqual(errors,[]);console.log('PASS zero page errors');await context.close();
}finally{await browser.close();}
