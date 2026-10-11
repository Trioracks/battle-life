// The whole download/install chain is a local game simulation in isolated contexts.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/home-systems-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});const errors=[];
const key='battle-life-virtual-pc-v1';
async function fixture(seed){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__software-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated software fixture</body>'}));
 if(seed){await page.goto('http://127.0.0.1:4173/__software-fixture');await page.evaluate(async seed=>{
  const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=28'),import('/src/virtual-pc-state.js?rev=32')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Software QA'})));
  const pc=createVirtualPcState(seed);if(seed.legacy)delete pc.software;
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(pc));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:720,initialRest:false}));
 },seed);}
 await page.goto('http://127.0.0.1:4173/?qa=software');await page.locator('#loading').waitFor({state:'hidden'});return {context,page};
}
const pc=page=>page.locator('#virtual-pc'),frame=(page,id)=>pc(page).locator('.pc-window[data-window-id="'+id+'"]');
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const idle=page=>page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);
const phase=(page,value)=>page.waitForFunction(value=>document.querySelector('#virtual-pc')?.dataset.pcTransition===value,value);
async function enter(page){await idle(page);await page.locator('#actions [data-action=computer]').click();await phase(page,'desktop');}
async function start(page,label){await pc(page).getByRole('button',{name:'Пуск',exact:true}).click();await pc(page).getByRole('menuitem',{name:label,exact:true}).click();}
async function launch(page,id){await start(page,{'computer':'Мой компьютер',underweb:'Underweb',torent:'torent','ft-studio':'FT Studio'}[id]);await frame(page,id).waitFor({state:'visible'});}
async function navigate(page,address){const input=frame(page,'underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await input.fill(address);await input.press('Enter');}
async function leave(page){await start(page,'Отойти от ПК');await phase(page,'room');await idle(page);}
async function sleep(page){await idle(page);await page.locator('#actions [data-action=bed]').click();await page.locator('#wake').waitFor({state:'visible'});await page.locator('#wake').waitFor({state:'hidden'});await idle(page);}
async function install(page,{destination,screenshot}={}){
 const w=frame(page,'installer');await w.getByRole('button',{name:'Далее >',exact:true}).click();
 if(destination)await w.getByRole('textbox',{name:'Папка установки',exact:true}).fill(destination);
 await w.getByRole('button',{name:'Далее >',exact:true}).click();if(screenshot)await page.screenshot({path:output+'/'+screenshot});
 await w.getByRole('button',{name:'Установить',exact:true}).click();
 assert.equal(await w.getByRole('button',{name:'Установка…',exact:true}).isDisabled(),true);
 assert.equal(await w.getByRole('progressbar').count(),1);
 await w.getByRole('button',{name:'Готово',exact:true}).click({timeout:45000});
}
try{
 if(process.env.PC_SOFTWARE_QA_CASES!=='supplement'){
  const {context,page}=await fixture();await page.locator('#new-game').click();await page.locator('#character-name').fill('Софт из форума');await page.locator('#clothing-tab').click();await page.locator('#start-game').click();await page.locator('#wake').click();await enter(page);
  assert.equal(await pc(page).locator('.pc-icon[data-app=torent]').count(),0);await launch(page,'underweb');await navigate(page,'underweb://dump');await page.screenshot({path:output+'/software-forum.png'});
  await frame(page,'underweb').getByRole('button',{name:'torent — торрент-клиент',exact:true}).click();await frame(page,'underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();
  await frame(page,'underweb').getByRole('button',{name:'Открыть установщик torent',exact:true}).waitFor();await frame(page,'underweb').getByRole('button',{name:'Открыть установщик torent',exact:true}).click();
  await install(page,{destination:'C:\\Tools\\torent',screenshot:'software-client-wizard.png'});await launch(page,'torent');assert.match(await frame(page,'torent').innerText(),/Нет задач/);await page.screenshot({path:output+'/software-empty-client.png'});
  await start(page,'Underweb');await navigate(page,'underweb://dump/ft-studio');await frame(page,'underweb').getByRole('button',{name:'Скачать FT-Studio.torrent',exact:true}).click();await frame(page,'underweb').getByRole('button',{name:'Открыть FT-Studio.torrent',exact:true}).click();
  assert.equal(await frame(page,'torent').getAttribute('data-active'),'true');assert.equal(await pc(page).locator('.pc-window[data-window-id=torent]').count(),1);
  await frame(page,'torent').getByRole('button',{name:'Ⅱ Пауза',exact:true}).click();const paused=(await state(page)).software.ft.receivedBytes;await page.waitForTimeout(900);assert.equal((await state(page)).software.ft.receivedBytes,paused);
  await frame(page,'torent').getByRole('button',{name:'▶ Продолжить',exact:true}).click();await start(page,'Выключение');await pc(page).getByRole('button',{name:'Выключить',exact:true}).click();await phase(page,'room');await idle(page);const stopped=(await state(page)).software.ft.receivedBytes;
  await sleep(page);assert.equal((await state(page)).software.ft.receivedBytes,stopped);await enter(page);await launch(page,'torent');await page.screenshot({path:output+'/software-transfer.png'});
  await leave(page);await sleep(page);assert.ok((await state(page)).software.ft.receivedBytes>stopped+600000000);await sleep(page);assert.equal((await state(page)).download.status,'ready-to-install');
  const before=await state(page);await page.reload();await page.locator('#loading').waitFor({state:'hidden'});assert.equal((await state(page)).software.ft.receivedBytes,before.software.ft.receivedBytes);await page.locator('#continue-game').click();await enter(page);await launch(page,'torent');await frame(page,'torent').getByRole('button',{name:'Открыть установщик FT Studio',exact:true}).click();
  await frame(page,'installer').getByRole('button',{name:'Далее >',exact:true}).click();const input=frame(page,'installer').getByRole('textbox',{name:'Папка установки',exact:true});await input.fill('C:\\Audio\\FT Studio');await input.focus();await page.waitForTimeout(800);assert.equal(await input.inputValue(),'C:\\Audio\\FT Studio');assert.equal(await input.evaluate(n=>document.activeElement===n),true);
  await frame(page,'installer').getByRole('button',{name:'Далее >',exact:true}).click();await page.screenshot({path:output+'/software-ft-wizard.png'});await page.keyboard.press('Escape');assert.equal((await state(page)).software.installer,null);assert.equal((await state(page)).software.ft.receivedBytes,800000000);
  await frame(page,'torent').getByRole('button',{name:'Открыть установщик FT Studio',exact:true}).click();await page.setViewportSize({width:480,height:720});await frame(page,'installer').getByRole('button',{name:'Далее >',exact:true}).click();await page.screenshot({path:output+'/software-narrow-wizard.png'});
  const bounds=await frame(page,'installer').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=480&&bounds.y+bounds.height<=689);
  await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height:900});await frame(page,'torent').getByRole('button',{name:'Открыть установщик FT Studio',exact:true}).click();await install(page,{destination:'C:\\Audio\\FT Studio'});
  assert.equal((await state(page)).software.ft.path,'C:\\Audio\\FT Studio');await launch(page,'computer');const address=frame(page,'computer').getByRole('textbox',{name:'Адрес папки',exact:true});await address.fill('C:\\Audio\\FT Studio');await address.press('Enter');for(const name of ['Data','Projects','Plugins','Presets'])assert.equal(await frame(page,'computer').getByRole('button',{name:'Открыть папку '+name,exact:true}).count(),1);await page.screenshot({path:output+'/software-explorer.png'});
  await address.fill('C:\\Загрузки');await address.press('Enter');assert.equal(await frame(page,'computer').getByRole('button',{name:'Открыть FT-Studio-setup.zip',exact:true}).count(),1);await launch(page,'ft-studio');await page.screenshot({path:output+'/software-ft-open.png'});await context.close();console.log('PASS real new game: forum → client → empty queue → metadata → pause/shutdown → sleep → reload → wizard → custom Explorer path → FT');
 }
 if(process.env.PC_SOFTWARE_QA_CASES!=='supplement'){
  const {context,page}=await fixture({power:'on',legacy:true,download:{status:'installed'},projects:[{id:'keep',name:'Архив',sourceStems:['kick.wav'],chosenAudio:'kick.wav'}],household:{fridge:{pear:3}},music:{cash:321,practice:7}});const s=await state(page);assert.equal(s.download.status,'installed');assert.deepEqual(s.projects[0].sourceStems,['kick.wav']);assert.equal(s.music.cash,321);assert.equal(s.household.fridge.pear,3);await page.locator('#continue-game').click();await enter(page);await launch(page,'ft-studio');await page.screenshot({path:output+'/software-legacy-ft.png'});await context.close();console.log('PASS old installed FT and projects/audio/wallet/household preserved');
 }
 if(process.env.PC_SOFTWARE_QA_CASES!=='supplement'){
  const {context,page}=await fixture({power:'on',projects:Array.from({length:1000},(_,i)=>({id:String(i)}))});await page.locator('#continue-game').click();await enter(page);await launch(page,'underweb');await navigate(page,'underweb://dump/client');await frame(page,'underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();assert.match(await frame(page,'underweb').innerText(),/Недостаточно места/);assert.equal((await state(page)).software.task,null);await page.screenshot({path:output+'/software-disk-full.png'});await context.close();console.log('PASS shared disk full rejects new bytes with visible reason');
 }
 if(process.env.PC_SOFTWARE_QA_CASES==='supplement'){
  const {context,page}=await fixture({power:'on',lastGameMinute:0,software:{client:{installed:true,receivedBytes:2000000},ft:{receivedBytes:10000000},metadata:true,task:{appId:'ft',baseMinute:0,baseBytes:10000000}}});
  await page.locator('#continue-game').click();await enter(page);await launch(page,'torent');assert.ok((await state(page)).software.ft.receivedBytes<20000000,'stale saved game clock cannot credit the whole interval after load');
  await frame(page,'torent').getByRole('button',{name:'Ⅱ Пауза',exact:true}).click();const partial=(await state(page)).software.ft.receivedBytes;await page.reload();await page.locator('#loading').waitFor({state:'hidden'});assert.equal((await state(page)).software.ft.receivedBytes,partial);
  await page.locator('#continue-game').click();await enter(page);await launch(page,'torent');assert.equal((await state(page)).software.ft.receivedBytes,partial);await frame(page,'torent').getByRole('button',{name:'× Отменить',exact:true}).click();
  for(const name of ['Ⅱ Пауза','▶ Продолжить','× Отменить']){const control=frame(page,'torent').getByRole('button',{name,exact:true});assert.equal(await control.isDisabled(),true);assert.equal(await control.evaluate(n=>getComputedStyle(n).color),'rgb(150, 149, 143)');}
  await page.screenshot({path:output+'/software-empty-client.png'});await launch(page,'underweb');await navigate(page,'underweb://dump');
  assert.equal(await frame(page,'underweb').getByRole('button',{name:'Файловая помойка',exact:true}).last().evaluate(n=>getComputedStyle(n).fontSize),'28px');
  await page.screenshot({path:output+'/software-forum.png'});await page.setViewportSize({width:480,height:720});await page.screenshot({path:output+'/software-narrow-forum.png'});
  await context.close();console.log('PASS partial reload has no retroactive credit, toolbar disabled appearance, final compact forum desktop/narrow');
 }
 assert.deepEqual(errors,[]);console.log('PASS zero browser page errors');
}finally{await browser.close();}
