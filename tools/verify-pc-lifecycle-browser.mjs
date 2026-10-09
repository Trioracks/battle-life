// Integration regressions in an isolated browser; no player save or profile is used.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.setDefaultTimeout(60000);
const failures=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
function check(name,fn){try{fn();console.log('PASS '+name);}catch(e){failures.push(name+': '+e.message);console.error('FAIL '+name+': '+e.message);}}
let release;
const gate=new Promise(resolve=>release=resolve);
try{
 await page.route('**/static.glb?*',async route=>{await gate;await route.continue();});
 await page.goto(process.env.PC_QA_URL||'http://127.0.0.1:4173/?rev=18',{waitUntil:'networkidle'});
 await page.locator('#new-game').click();await page.locator('#character-name').fill('Регрессия ПК');
 await page.locator('#stats-tab').click();await page.locator('#distribute').click();await page.locator('#start-game').click();await page.locator('#wake').click();
 await page.locator('#actions [data-action="computer"]').click();
 const pc=page.locator('#virtual-pc');await pc.waitFor({state:'visible'});
 const pending=await pc.evaluate(root=>({opacity:root.style.opacity,pointer:root.style.pointerEvents,inert:root.firstElementChild.inert}));
 check('pending desktop is invisible and noninteractive',()=>{assert.equal(pending.opacity,'0');assert.equal(pending.pointer,'none');assert.equal(pending.inert,true);});
 await page.mouse.click(40,704);
 const menus=await pc.locator('.pc-start-menu').count();check('pending has no menus',()=>assert.equal(menus,0));
 // Close any menu left by the unfixed version so focus has an independent reproduction.
 await page.keyboard.press('Escape');release();
 await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='desktop');
 const focus=await page.evaluate(()=>document.activeElement?.dataset.app);
 check('cold entry focuses the desktop after unlock',()=>assert.equal(focus,'computer'));
 await pc.locator('.pc-icon[data-app="underweb"]').dblclick();
 const input=pc.getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await input.fill('Ввод до возврата');
 const before=await pc.evaluate(root=>root.childElementCount);
 await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 const restored=await pc.evaluate(root=>({children:root.childElementCount,phase:root.dataset.pcTransition,stage:root.dataset.pcStage}));
 check('persisted pagehide/pageshow preserves live PC',()=>{assert.equal(restored.children,before);assert.equal(restored.phase,'desktop');assert.equal(restored.stage,'desktop');});
 if(restored.children===before){assert.equal(await input.inputValue(),'Ввод до возврата');await input.fill('После возврата');await pc.getByRole('button',{name:'Пуск',exact:true}).click();await pc.getByRole('menuitem',{name:'Отойти от ПК',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));
  await page.locator('#actions [data-action="computer"]').click();await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='desktop');
  const active=await page.evaluate(()=>document.activeElement?.closest('.pc-window')?.dataset.windowId);check('warm focus belongs to Underweb',()=>assert.equal(active,'underweb'));
 }
 check('zero page errors',()=>assert.deepEqual(errors,[]));
 assert.deepEqual(failures,[]);
}finally{release();await browser.close();}
