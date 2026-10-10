// Each scenario uses a fresh isolated browser context; player storage is never read.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/home-systems-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const errors=[];
async function fixture({satiety=50,energy=72,job=false,denyAudio=false,denyBackup=false}={}){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__home-needs-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated fixture</body>'}));
 await page.goto('http://127.0.0.1:4173/__home-needs-fixture');
 await page.evaluate(async options=>{
  const [{createProfile,STAT_KEYS,SAVE_KEY},{createVirtualPcState,VIRTUAL_PC_STORAGE_KEY},production]=await Promise.all([import('/src/avatar-v3-profile.js?rev=25'),import('/src/virtual-pc-state.js?rev=25'),import('/src/beat-production.js?rev=25')]);
  const profile=createProfile({name:'Проверка дома',allocations:Object.fromEntries(STAT_KEYS.map((k,i)=>[k,i===0?2:1]))});
  localStorage.setItem(SAVE_KEY,JSON.stringify(profile));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:720,initialRest:false}));
  let state=createVirtualPcState({power:options.job?'on':'off',download:{status:options.job?'installed':'idle'},music:{needs:{satiety:options.satiety,energy:options.energy}}});
  if(options.job){state=production.createBeat(state,{id:'keep-beat',name:'Не потерять'},profile.skills,()=>.1).state;state=production.startBeatStage(state,'keep-beat',undefined,profile.skills,()=>.2).state;state.music.job.elapsed=5;}
  if(options.denyBackup)delete state.household;
  localStorage.setItem(VIRTUAL_PC_STORAGE_KEY,JSON.stringify(state));
 },{satiety,energy,job,denyBackup});
 if(denyBackup)await page.addInitScript(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.endsWith('-before-household'))throw new DOMException('Backup denied','QuotaExceededError');return write.call(this,key,value);};});
 if(denyAudio)await page.addInitScript(()=>{window.AudioContext=class{constructor(){throw Error('Audio denied');}};});
 else await page.addInitScript(()=>{window.speechBeeps=0;const NativeAudio=window.AudioContext;window.AudioContext=class extends NativeAudio{createOscillator(){const oscillator=super.createOscillator(),start=oscillator.start.bind(oscillator);oscillator.start=(...args)=>{if(oscillator.frequency.value===470)window.speechBeeps++;return start(...args);};return oscillator;}};});
 await page.goto('http://127.0.0.1:4173/');await page.locator('#continue-game').click();
 return {context,page};
}
async function stored(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1')));}
try{
 {
  const {context,page}=await fixture(),fridge=page.getByRole('dialog',{name:'Холодильник'});
  await page.locator('#actions [data-action=fridge]').click();assert.equal(await fridge.isVisible(),false,'distant click waits for arrival');
  await fridge.waitFor({state:'visible'});assert.equal((await stored(page)).power,'off');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Съесть: Яблоко');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Закрыть');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Съесть: Яблоко');
  assert.equal((await stored(page)).music.needs.satiety,50,'opening alone cannot feed');
  await page.screenshot({path:output+'/fridge-arrived.png'});
  const stateBefore=await page.locator('#state').textContent();await page.waitForTimeout(500);assert.equal(await page.locator('#state').textContent().then(t=>t.split(' · ').slice(0,5).join(' · ')),stateBefore.split(' · ').slice(0,5).join(' · '));
  await fridge.getByRole('button',{name:'Съесть: Яблоко',exact:true}).click();let saved=await stored(page);assert.equal(saved.household.fridge.apple,0);assert.equal(saved.music.needs.satiety,80);assert.equal(await fridge.getByRole('button',{name:'Съесть: Яблоко',exact:true}).isDisabled(),true);
  await page.keyboard.press('Escape');assert.equal(await fridge.isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'apartment');
  await page.reload();await page.locator('#continue-game').click();await page.locator('#actions [data-action=fridge]').click();await fridge.waitFor({state:'visible'});assert.equal(await fridge.getByRole('button',{name:'Съесть: Яблоко',exact:true}).isDisabled(),true);
  await fridge.getByRole('button',{name:'Съесть: Груша',exact:true}).click();saved=await stored(page);assert.equal(saved.music.needs.satiety,100);assert.equal(saved.household.fridge.pear,0);assert.equal(await fridge.getByRole('button',{name:'Съесть: Банан',exact:true}).isDisabled(),true);
  await page.screenshot({path:output+'/fridge-consumed-reloaded.png'});await context.close();console.log('PASS approach, PC off, consume/cap/count/reload, frozen actor, Escape/focus');
 }
 {
  const {context,page}=await fixture({denyBackup:true}),fridge=page.getByRole('dialog',{name:'Холодильник'});await page.locator('#actions [data-action=fridge]').click();await fridge.waitFor({state:'visible'});
  await fridge.getByRole('button',{name:'Съесть: Яблоко',exact:true}).click();assert.match(await fridge.getByRole('status').textContent(),/Сохранение.*недоступно/);
  assert.equal(await fridge.getByRole('button',{name:'Съесть: Яблоко',exact:true}).isDisabled(),true);const original=await stored(page);assert.equal(original.household,undefined);assert.equal(original.music.needs.satiety,50);
  await page.screenshot({path:output+'/fridge-backup-failure.png'});await context.close();console.log('PASS backup failure retains original JSON, in-memory consume and visible warning');
 }
 for(const [satiety,energy,phrase,denied]of [[20,72,'Не могу работать, хочу поесть.',false],[68,15,'Не могу работать, хочу поспать.',true]]){
  const {context,page}=await fixture({satiety,energy,denyAudio:denied}),bubble=page.locator('.character-speech');
  await page.locator('#actions [data-action=computer]').click();await bubble.waitFor({state:'visible'});assert.equal(await page.locator('#virtual-pc').isVisible(),false);
  if(!denied){
   await page.waitForTimeout(150);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   const before=await bubble.locator('[aria-hidden]').textContent(),beeps=await page.evaluate(()=>speechBeeps);await page.waitForTimeout(350);
   assert.equal(await bubble.isVisible(),false);assert.equal(await bubble.locator('[aria-hidden]').textContent(),before);assert.equal(await page.evaluate(()=>speechBeeps),beeps);
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await bubble.waitFor({state:'visible'});
  }
  await page.waitForFunction(text=>document.querySelector('.character-speech [aria-hidden]').textContent===text,phrase);
  const bounds=await bubble.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=1280&&bounds.y+bounds.height<=900);
  assert.equal(await bubble.locator('[aria-live]').textContent(),phrase);await page.screenshot({path:output+(denied?'/sleep-speech-audio-denied.png':'/food-speech-2d.png')});
  if(!denied){
   await page.locator('#camera-mode').click();await page.waitForFunction(()=>document.querySelector('#camera-mode').textContent==='Камера: 3D');
   await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>document.querySelector('.character-speech').dataset.firstPerson==='true');
   await page.screenshot({path:output+'/food-speech-first-person.png'});
   await page.setViewportSize({width:480,height:720});await page.locator('#actions [data-action=computer]').click();await page.waitForTimeout(100);const small=await bubble.boundingBox(),controls=await page.locator('#controls').boundingBox();assert.ok(small.x>=0&&small.x+small.width<=480);assert.ok(small.y+small.height<controls.y,'first person caption clears mobile controls');
   await page.screenshot({path:output+'/food-speech-mobile.png'});
  }
  await context.close();console.log('PASS immediate '+(denied?'sleep/audio denial':'food/2D/3D/resize')+' refusal and live announcement');
 }
 {
  const {context,page}=await fixture({satiety:20.2,job:true}),bubble=page.locator('.character-speech');
  const original=(await stored(page)).projects[0];await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='desktop');
  await page.locator('.pc-icon[data-app=ft-studio]').dblclick();
  const dialog=page.locator('[data-ft-role=dialog]');await dialog.getByRole('button',{name:'Открыть проект',exact:true}).click();await dialog.getByRole('button',{name:/Не потерять ·/}).click();
  await page.getByRole('button',{name:'Продолжить этап',exact:true}).click();
  await bubble.waitFor({state:'visible'});assert.equal(await page.locator('#virtual-pc').isVisible(),false);
  const save=await stored(page);assert.equal(save.music.needs.satiety,20);assert.ok(save.music.job.elapsed>5);assert.deepEqual(save.projects[0],original);assert.equal(save.music.practice,0);
  assert.equal(await bubble.locator('[aria-live]').textContent(),'Не могу работать, хочу поесть.');await page.screenshot({path:output+'/starvation-return-speech.png'});
  await context.close();console.log('PASS starvation exits work and retains partial job/project/audio choices');
 }
 // Browser controller boundary: hidden state and denied audio never replay or age.
 {
  const context=await browser.newContext(),page=await context.newPage();await page.goto('http://127.0.0.1:4173/');
  const result=await page.evaluate(async()=>{const {createCharacterSpeech}=await import('/src/character-speech.js?rev=25');let beeps=0;const speech=createCharacterSpeech({beep:()=>beeps++});speech.say('Не могу работать, хочу поесть.');speech.tick(.2);const text=speech.snapshot.text;speech.tick(30,{hidden:true});const frozen=speech.snapshot.text===text;speech.tick(.001);return {frozen,beeps};});
  assert.deepEqual(result,{frozen:true,beeps:1});await context.close();console.log('PASS hidden speech freezes text and audio budget without replay');
 }
 assert.deepEqual(errors,[]);console.log('PASS zero page errors');
}finally{await browser.close();}
