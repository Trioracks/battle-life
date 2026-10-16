// Actual host/camera smoke test. New browser context on an isolated origin.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/sloboda-track';await mkdir(output+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=output+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.stack);});const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175',key='battle-life-virtual-pc-v1';
const shot=async n=>{await page.screenshot({path:output+'/'+n+'.png'});console.log('SHOT '+n);};
const idle=()=>page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));
const desktop=()=>page.waitForFunction(()=>document.querySelector('#virtual-pc')?.dataset.pcTransition==='desktop');
const pc=()=>page.locator('#virtual-pc'),win=id=>pc().locator('.pc-window[data-window-id="'+id+'"]');
async function start(label){await pc().getByRole('button',{name:'Слобода',exact:true}).click();await pc().getByRole('menuitem',{name:label,exact:true}).click();}
try{
 await page.route('**/__sloboda-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated save</title>'}));await page.goto(base+'/__sloboda-seed');
 await page.evaluate(async()=>{
  const [{createProfile},{submissionFixture}]=await Promise.all([import('/src/avatar-v3-profile.js'),import('/test/helpers/submission-fixtures.js')]);
  const s=submissionFixture({vocal:false});s.software.ft.installed=true;s.software.client.installed=true;s.software.notebook.receivedBytes=4000000;s.music.needs={satiety:100,energy:100};
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Проверка квартиры'})));
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(s));
  localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:720,initialRest:false}));
 });
 await page.goto(base+'/?rev=35');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await idle();
 assert.equal(await page.locator('#camera-mode').textContent(),'Камера: 3D');await shot('apartment-default-3d');
 await page.locator('#camera-mode').click();await page.waitForFunction(()=>document.querySelector('#camera-mode').textContent==='Камера: 2D');await shot('apartment-2d-1280');
 await page.setViewportSize({width:800,height:600});await shot('apartment-2d-800');await page.setViewportSize({width:1280,height:900});
 await page.locator('#camera-mode').click();await page.locator('#actions [data-action=bed]').click();await page.locator('#wake').waitFor({state:'visible'});
 assert.equal(await page.locator('#camera-mode').textContent(),'Камера: 2D');await shot('sleep-2d');await page.locator('#wake').click();await idle();
 assert.equal(await page.locator('#camera-mode').textContent(),'Камера: 3D');await shot('awake-3d');
 await page.locator('#actions [data-action=fridge]').click();await page.getByRole('heading',{name:'Холодильник',exact:true}).waitFor();
 await shot('fridge-1280');await page.setViewportSize({width:800,height:600});await shot('fridge-800');
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.setViewportSize({width:1280,height:900});await idle();
 await page.locator('#actions [data-action=computer]').click();await desktop();await start('FT Studio');
 await win('ft-studio').getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click();await win('ft-studio').getByRole('button',{name:'Работа · готов',exact:true}).click();
 await win('ft-studio').getByRole('button',{name:'Добавить вокал',exact:true}).click();await win('ft-studio').getByRole('dialog').getByRole('button',{name:'Не переключай',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='working');await page.waitForTimeout(800);await shot('recording-draft');
 await desktop();assert.ok(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).projects.find(p=>p.id==='beat').recording?.draft,key));
 await win('ft-studio').getByRole('button',{name:'Записать чистовую',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#virtual-pc').dataset.pcTransition==='working');await page.waitForTimeout(800);await shot('recording-clean');await desktop();
 await start('Underweb');const address=win('underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});
 await address.fill('underweb://dump/notebook');await address.press('Enter');
 await win('underweb').getByRole('button',{name:'Открыть установщик Рэпблокнот',exact:true}).click();
 await win('installer').getByRole('button',{name:'Далее >',exact:true}).click();await win('installer').getByRole('button',{name:'Далее >',exact:true}).click();await win('installer').getByRole('button',{name:'Установить',exact:true}).click();
 await start('Underweb');await address.fill('underweb://forum');await address.press('Enter');await shot('forum-during-install');
 await start('Отойти от ПК');await idle();await shot('after-recording-stand');
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).software.notebook.installed,key);
 assert.equal(await page.locator('#virtual-pc').isVisible(),false,'background finish does not return the camera');
 await page.locator('#actions [data-action=computer]').click();await desktop();
 await pc().getByRole('button',{name:'Переключить Мастер установки — Рэпблокнот',exact:true}).click();
 await win('installer').getByRole('button',{name:'Готово',exact:true}).click();await win('rap-notebook').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS actual host: default3D / sleep restore / 2D framing / fridge / draft+clean camera work / background install');
}catch(e){await shot('apartment-failure');console.log((await page.locator('body').innerText()).slice(-5000));throw e;}finally{await context.close();await browser.close();}
