// Fresh browser contexts keep this regression independent from the user's saves.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.INSTALLER_QA_DIR||'D:/Codex/Builds/Battle/background-installer';
const scratch=process.env.INSTALLER_QA_TEMP||'D:/Codex/Temp/background-installer';
await mkdir(output,{recursive:true});await mkdir(scratch,{recursive:true});process.env.TEMP=scratch;process.env.TMP=scratch;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const errors=[],failures=[],key='battle-life-virtual-pc-v1',origin=process.env.BATTLE_QA_ORIGIN||'http://127.0.0.1:4173';
const pc=page=>page.locator('#virtual-pc'),frame=(page,id)=>pc(page).locator('.pc-window[data-window-id="'+id+'"]');
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const idle=page=>page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);
const phase=(page,value)=>page.waitForFunction(value=>document.querySelector('#virtual-pc')?.dataset.pcTransition===value,value);
async function start(page,label){await pc(page).getByRole('button',{name:'Пуск',exact:true}).click();await pc(page).getByRole('menuitem',{name:label,exact:true}).click();}
async function enter(page){await idle(page);await page.locator('#actions [data-action=computer]').click();await phase(page,'desktop');}
async function navigate(page,url){const input=frame(page,'underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await input.fill(url);await input.press('Enter');}
async function fixture(){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__background-installer-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated installer fixture</body>'}));
 await page.goto(origin+'/__background-installer-fixture');await page.evaluate(async()=>{
  const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=28'),import('/src/virtual-pc-state.js?rev=31')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Background installer QA'})));
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},ft:{receivedBytes:800000000}}})));
  localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:720,initialRest:false}));
 });
 await page.goto(origin+'/?qa=background-installer');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await enter(page);
 await start(page,'Underweb');return {context,page};
}
async function install(page,id){
 await navigate(page,'underweb://dump/'+(id==='client'?'client':'ft-studio'));
 await frame(page,'underweb').getByRole('button',{name:'Открыть установщик '+(id==='client'?'torent':'FT Studio'),exact:true}).click();
 const wizard=frame(page,'installer');for(const label of ['Далее >','Далее >','Установить'])await wizard.getByRole('button',{name:label,exact:true}).click();
 assert.equal((await state(page)).software[id].installed,false);
 await wizard.getByRole('button',{name:'Свернуть окно',exact:true}).click();assert.equal(await wizard.isVisible(),false);
 await start(page,'Underweb');
}
async function run(name,check){
 if(process.env.PC_INSTALLER_QA_CASE&&process.env.PC_INSTALLER_QA_CASE!==name)return;
 const {context,page}=await fixture();
 try{await check(page);console.log('PASS '+name);}
 catch(error){await page.screenshot({path:output+'/'+name+'-failed.png'});const s=await state(page);failures.push(name+': '+error.message);console.log('FAIL '+name+' '+JSON.stringify({power:s.power,installer:s.software.installer,ft:s.software.ft.installed})+' '+error.message);}
 finally{await context.close();}
}
try{
 await run('browser',async page=>{
  await install(page,'client');await navigate(page,'underweb://dump');
  const address=frame(page,'underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await address.fill('Незавершённый адрес');
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).software.client.installed,key,{timeout:20000});
  assert.equal(await address.inputValue(),'Незавершённый адрес');assert.equal(await address.evaluate(n=>n===document.activeElement),true);
  assert.equal(await frame(page,'underweb').getAttribute('data-active'),'true');assert.equal(await frame(page,'installer').isVisible(),false);
  await page.screenshot({path:output+'/browser-complete.png'});
  await pc(page).getByRole('button',{name:'Переключить Мастер установки — torent',exact:true}).click();await frame(page,'installer').getByRole('button',{name:'Готово',exact:true}).click();
  assert.equal((await state(page)).software.installer,null);
 });
 await run('room-modal',async page=>{
  await install(page,'ft');await navigate(page,'underweb://forum');await page.screenshot({path:output+'/ft-browser-running.png'});
  await start(page,'Отойти от ПК');await phase(page,'room');await idle(page);
  const left=await state(page);assert.equal(left.power,'on');assert.ok(left.software.installer.elapsedSeconds>0);assert.equal(left.software.ft.installed,false);
  await page.locator('#actions [data-action=fridge]').click();const fridge=page.getByRole('dialog',{name:'Холодильник',exact:true});await fridge.waitFor({state:'visible'});
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).software.ft.installed,key,{timeout:35000});
  assert.equal(await fridge.isVisible(),true);const finished=await state(page);assert.equal(finished.software.installer.step,'finish');assert.equal(finished.software.installer.elapsedSeconds,30);assert.equal(finished.software.ft.receivedBytes,800000000);
  await page.screenshot({path:output+'/ft-fridge-finished.png'});await fridge.getByRole('button',{name:'Закрыть',exact:true}).click();await enter(page);
  assert.equal(await frame(page,'underweb').getAttribute('data-active'),'true');assert.equal(await frame(page,'installer').isVisible(),false);
  await pc(page).getByRole('button',{name:'Переключить Мастер установки — FT Studio',exact:true}).click();await frame(page,'installer').getByRole('button',{name:'Готово',exact:true}).waitFor();
  await page.screenshot({path:output+'/ft-return-finished.png'});
  console.log('EVIDENCE '+JSON.stringify({savedOnLeave:left.software.installer.elapsedSeconds,finished:finished.software.installer.elapsedSeconds,archive:finished.software.ft.receivedBytes}));
 });
 assert.deepEqual(errors,[],'zero browser page errors');assert.deepEqual(failures,[]);console.log('PASS zero browser page errors');
}finally{await browser.close();}
