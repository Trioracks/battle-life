import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
const status=()=>page.evaluate(()=>musicQA.beatAudio.status);
try{
 await page.route('**/src/virtual-pc-ui.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('  return pc;','  window.musicQA=pc; return pc;')});});
 await page.goto(process.env.BATTLE_QA_URL||'http://127.0.0.1:4175');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#new-game').click();await page.locator('#character-name').fill('Музыка у компьютера');await page.locator('#clothing-tab').click();await page.locator('#start-game').click();await page.locator('#wake').click();
 await page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>window.musicQA?.phase==='desktop'&&!musicQA.locked);
 await page.evaluate(()=>{musicQA.openNow('underweb');musicQA.navigateUnderweb('underweb://social/community/makarevich-1');});
 await page.locator('[data-social-audio]').first().click();await page.waitForFunction(()=>musicQA.beatAudio.status==='playing'||musicQA.beatAudio.status==='error');assert.equal(await status(),'playing');
 await page.getByRole('button',{name:/^Пауза:/}).first().click();assert.equal(await status(),'paused');await page.locator('[data-social-audio]').first().click();await page.waitForFunction(()=>musicQA.beatAudio.status==='playing');
 await page.evaluate(()=>window.musicSources=[...musicQA.beatAudio.sources]);await page.getByRole('button',{name:'Мои друзья',exact:true}).click();assert.equal(await status(),'playing');
 await page.evaluate(()=>musicQA.requestLeave());await page.waitForFunction(()=>document.body.dataset.mode==='game'&&!document.querySelector('#actions [data-action=fridge]').disabled);await page.locator('#actions [data-action=fridge]').click();await page.getByRole('dialog',{name:'Холодильник'}).waitFor();
 assert.equal(await status(),'playing');assert.equal(await page.evaluate(()=>musicSources.every((s,i)=>s===musicQA.beatAudio.sources[i])),true);await page.screenshot({path:out+'/music-at-kitchen.png'});
 await page.getByRole('dialog',{name:'Холодильник'}).getByRole('button',{name:'Закрыть',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>document.body.dataset.mode==='pc'&&!musicQA.locked);
 assert.equal(await status(),'playing');await page.evaluate(()=>musicQA.closeNow('ft-studio'));assert.equal(await status(),'playing');await page.evaluate(()=>musicQA.closeNow('underweb'));assert.equal(await status(),'stopped');assert.deepEqual(errors,[]);
 console.log('PASS actual apartment: social Play/Pause/Resume → friends → kitchen → return; sources unchanged; only owner close stops');
}finally{await browser.close();}
