// Narrow final-review regressions. Fresh contexts never touch the user's saves.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/home-systems-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const errors=[],failures=[],key='battle-life-virtual-pc-v1';
const pc=page=>page.locator('#virtual-pc'),frame=(page,id)=>pc(page).locator('.pc-window[data-window-id="'+id+'"]');
async function start(page,label){await pc(page).getByRole('button',{name:'Пуск',exact:true}).click();await pc(page).getByRole('menuitem',{name:label,exact:true}).click();}
async function fixture(){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__software-final-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated final-fix fixture</body>'}));
 await page.goto('http://127.0.0.1:4173/__software-final-fixture');
 await page.evaluate(async()=>{
  const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=28'),import('/src/virtual-pc-state.js?rev=31')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Final fix QA'})));
  const state=createVirtualPcState({power:'on',download:{status:'installed'}});delete state.software;
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(state));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:720,initialRest:false}));
 });
 await page.goto('http://127.0.0.1:4173/?qa=software-final-fixes');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();
 await page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);await page.locator('#actions [data-action=computer]').click();
 await page.waitForFunction(()=>document.querySelector('#virtual-pc')?.dataset.pcTransition==='desktop');
 await start(page,'Underweb');const address=frame(page,'underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await address.fill('underweb://dump/client');await address.press('Enter');
 await frame(page,'underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();await frame(page,'underweb').getByRole('button',{name:'Открыть установщик torent',exact:true}).waitFor();
 return {context,page};
}
async function run(name,check){const {context,page}=await fixture();try{await check(page);console.log('PASS '+name);}catch(error){failures.push(name+': '+error.message);console.log('FAIL '+name+': '+error.message);}finally{await context.close();}}
try{
 await run('pending FT launch yields to installer; Tab/Escape scope and subsequent FT launch',async page=>{
  await start(page,'FT Studio');assert.equal(await pc(page).getAttribute('aria-busy'),'true');
  await frame(page,'underweb').getByRole('button',{name:'Открыть установщик torent',exact:true}).click();
  await page.waitForTimeout(2800);const wizard=frame(page,'installer');
  assert.equal(await wizard.getAttribute('data-active'),'true','installer remains active after FT delay');
  assert.equal(await frame(page,'ft-studio').count(),0,'pending FT does not open behind or above modal');assert.equal(await pc(page).getAttribute('aria-busy'),'false');
  for(let i=0;i<12;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert.ok(await wizard.evaluate(n=>n.contains(document.activeElement)),'Tab stays inside installer');}
  await page.screenshot({path:output+'/software-final-modal.png'});await page.keyboard.press('Escape');assert.equal(await wizard.count(),0);
  await start(page,'FT Studio');await frame(page,'ft-studio').waitFor();assert.equal(await frame(page,'ft-studio').getAttribute('data-active'),'true');
 });
 await run('keyboard Next/Back preserve focus and clock ticks preserve typing, selection and control identity',async page=>{
  await frame(page,'underweb').getByRole('button',{name:'Открыть установщик torent',exact:true}).click();const wizard=frame(page,'installer');
  await wizard.getByRole('button',{name:'Далее >',exact:true}).focus();await page.keyboard.press('Enter');const input=wizard.getByRole('textbox',{name:'Папка установки',exact:true});
  assert.ok(await input.evaluate(n=>n===document.activeElement),'Next focuses destination input');await input.fill('C:\\Keyboard\\torent');
  await input.evaluate(n=>{n.setSelectionRange(3,11);window.finalInput=n;window.finalNext=n.closest('.pc-installer').querySelector('.installer-actions button:nth-child(2)');});
  const minute=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).lastGameMinute,key);
  await page.waitForFunction(({key,minute})=>JSON.parse(localStorage.getItem(key)).lastGameMinute!==minute,{key,minute});
  assert.deepEqual(await input.evaluate(n=>({same:n===window.finalInput,active:n===document.activeElement,value:n.value,start:n.selectionStart,end:n.selectionEnd,next:window.finalNext===n.closest('.pc-installer').querySelector('.installer-actions button:nth-child(2)')})),{same:true,active:true,value:'C:\\Keyboard\\torent',start:3,end:11,next:true});
  await wizard.getByRole('button',{name:'Далее >',exact:true}).focus();await page.keyboard.press('Enter');
  assert.ok(await wizard.getByRole('heading',{name:'Всё готово к установке',exact:true}).evaluate(n=>n===document.activeElement),'Next focuses summary heading');
  await wizard.getByRole('button',{name:'< Назад',exact:true}).focus();await page.keyboard.press('Enter');assert.ok(await input.evaluate(n=>n===document.activeElement),'Back focuses destination input');assert.equal(await input.inputValue(),'C:\\Keyboard\\torent');
  await wizard.getByRole('button',{name:'< Назад',exact:true}).focus();await page.keyboard.press('Enter');assert.ok(await wizard.getByRole('heading',{name:'Добро пожаловать',exact:true}).evaluate(n=>n===document.activeElement),'Back focuses welcome heading');
  await page.screenshot({path:output+'/software-final-keyboard.png'});await page.keyboard.press('Escape');assert.equal(await wizard.count(),0);
 });
 assert.deepEqual(errors,[],'zero browser page errors');assert.deepEqual(failures,[]);console.log('PASS zero browser page errors');
}finally{await browser.close();}
