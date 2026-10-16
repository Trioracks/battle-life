// Isolated real-browser acceptance test. Never touches the player's context or save.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/studio-immersion-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const pc=page.locator('#virtual-pc'),frame=id=>pc.locator('.pc-window[data-window-id="'+id+'"]'),ft=frame('ft-studio');
const phase=name=>page.waitForFunction(name=>document.querySelector('#virtual-pc').dataset.pcTransition===name,name);
const start=async name=>{await pc.getByRole('button',{name:'Пуск',exact:true}).click();await pc.getByRole('menuitem',{name,exact:true}).click();};
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1')));
const shot=name=>page.screenshot({path:output+'/'+name+'.png'});
try{
 await page.route('**/__immersion-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated acceptance fixture</body>'}));
 await page.goto('http://127.0.0.1:4173/__immersion-fixture');
 await page.evaluate(async()=>{
  const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=28'),import('/src/virtual-pc-state.js?rev=33')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Проверка погружения'})));
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(createVirtualPcState({power:'off',software:{client:{receivedBytes:2000000},ft:{receivedBytes:800000000}},music:{needs:{satiety:100,energy:100}}})));
  localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:600,initialRest:false}));
 });
 await page.goto('http://127.0.0.1:4173/?rev=28');await page.locator('#loading').waitFor({state:'hidden'});
 await page.evaluate(async()=>{
  const [{PcSounds},{ApartmentAnimation}]=await Promise.all([import('/src/virtual-pc-sounds.js?rev=28'),import('/src/apartment-v3-animation.js?rev=28')]);
  window.immersionCues=[];window.immersionAnimations=[];window.immersionTyping={first:null,max:0,frames:0};
  const play=PcSounds.prototype.play;PcSounds.prototype.play=async function(cue){const result=await play.call(this,cue);window.immersionCues.push({cue,...result,nodes:this.nodes.size,state:this.context?.state});return result;};
  const update=ApartmentAnimation.prototype.update;ApartmentAnimation.prototype.update=function(...args){update.apply(this,args);if(!args[0].working)return;const t=window.immersionTyping,q=this.workBones.filter(b=>b.kind==='arm').flatMap(b=>b.node.quaternion.toArray());t.first??=q;t.max=Math.max(t.max,...q.map((v,i)=>Math.abs(v-t.first[i])));t.frames++;};
  document.addEventListener('animationstart',e=>window.immersionAnimations.push(e.animationName));
 });
 await page.locator('#continue-game').click();await page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);
 await page.locator('#actions [data-action=computer]').click();await phase('desktop');
 assert.deepEqual((await page.evaluate(()=>window.immersionCues.filter(x=>x.cue!=='click'))).map(x=>[x.cue,x.ok]),[['bios',true],['startup',true]]);
 await start('Underweb');
 async function navigate(address){const input=frame('underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await input.fill(address);await input.press('Enter');}
 async function install(id,seconds){
  const w=frame('installer');await w.getByRole('button',{name:'Далее >',exact:true}).click();await w.getByRole('button',{name:'Далее >',exact:true}).click();
  const began=Date.now();await w.getByRole('button',{name:'Установить',exact:true}).click();const progress=w.getByRole('progressbar');
  assert.equal(await w.getByRole('button',{name:'Установка…',exact:true}).isDisabled(),true);
  await page.waitForFunction(()=>document.querySelector('.pc-installer progress')?.value>=20);
  const partial=await progress.evaluate(n=>n.value);assert.ok(partial<80);await shot('install-'+id);
  if(id==='client'){
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   const stopped=await progress.evaluate(n=>n.value);await page.waitForTimeout(500);assert.equal(await progress.evaluate(n=>n.value),stopped);
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  }
  await w.getByRole('button',{name:'Готово',exact:true}).waitFor();const elapsed=(Date.now()-began)/1000;
  assert.ok(elapsed>=seconds-.2&&elapsed<seconds+8,'real duration '+id+': '+elapsed);await w.getByRole('button',{name:'Готово',exact:true}).click();
  assert.equal((await state()).software[id].installed,true);console.log('PASS installer '+id+' '+elapsed.toFixed(2)+' real seconds');
 }
 await navigate('underweb://dump/client');await frame('underweb').getByRole('button',{name:'Открыть установщик torent',exact:true}).click();await install('client',10);
 await navigate('underweb://dump/ft-studio');await frame('underweb').getByRole('button',{name:'Открыть установщик FT Studio',exact:true}).click();await install('ft',30);
 await start('FT Studio');const dialog=ft.locator('[data-ft-role=dialog]');await dialog.waitFor();await page.waitForFunction(()=>window.immersionAnimations.includes('ft-window-arrive'));
 await page.waitForFunction(()=>document.querySelector('.pc-window[data-window-id="ft-studio"]').dataset.entering==='false');
 assert.equal(await ft.getAttribute('data-mode'),'maximized');const bounds=await ft.boundingBox();assert.deepEqual([bounds.x,bounds.y,bounds.width,bounds.height],[0,0,1280,868]);
 assert.deepEqual(await dialog.getByRole('button').allTextContents(),['Новый проект','Открыть проект','Закрыть']);await shot('ft-welcome-maximized');
 await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(await ft.locator('[data-ft-role=track-label]').count(),1);await shot('ft-empty');
 await ft.getByRole('button',{name:'Новый проект',exact:true}).click();await ft.getByRole('textbox',{name:'Название бита'}).fill('Рабочий вечер');await ft.getByRole('button',{name:'Начать проект',exact:true}).click();
 await ft.getByRole('button',{name:'Работать над этапом',exact:true}).click();await phase('working');
 await page.waitForFunction(()=>document.querySelector('[data-work-role=skill-progress]')?.value>10.1);
 const bar=page.locator('[data-work-role=skill-progress]'),middle=await bar.evaluate(n=>({value:n.value,min:n.min,max:n.max,label:n.getAttribute('aria-valuetext')}));
 assert.ok(middle.value>10.1&&middle.value<10.3334);assert.equal(middle.min,10);assert.equal(middle.max,11);await shot('working-skills');
 await phase('desktop');assert.ok(Math.abs((await state()).music.practice-1/3)<1e-8);assert.equal(await ft.locator('[data-ft-role=clip]').count(),3);
 const typing=await page.evaluate(()=>window.immersionTyping);assert.ok(typing.frames>30&&typing.max>.03,JSON.stringify(typing));
 await start('Выключение');await pc.getByRole('button',{name:'Выключить',exact:true}).click();await phase('room');
 const cues=await page.evaluate(()=>window.immersionCues.filter(x=>x.cue!=='click'));assert.deepEqual(cues.map(x=>[x.cue,x.ok]),[['bios',true],['startup',true],['studio',true],['shutdown',true]]);assert.ok(cues.every(x=>x.nodes>0&&x.state==='running'));
 assert.deepEqual(errors,[]);console.log('PASS cold boot, distinct real audio nodes, maximized animated FT/welcome/empty, actual rig typing '+typing.max.toFixed(3)+', fractional skill HUD, one-third practice, shutdown');
}catch(error){await shot('failure').catch(()=>{});console.error('PAGE_ERRORS',errors);throw error;}finally{await context.close();await browser.close();}
