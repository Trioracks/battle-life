import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175';
const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
try{
 await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#new-game').click();await page.locator('#character-name').fill('Закрытая обувь');await page.locator('#clothing-tab').click();
 for(const bottom of ['jeans','shorts']){
  await page.locator('[data-category=bottom]').click();await page.locator('[data-option='+bottom+']').click();await page.locator('[data-category=footwear]').click();
  for(const id of ['sneakers','canvas','boots','ankleboots','highcanvas']){
   await page.locator('[data-option='+id+']').click();
   for(const color of ['white','black','red','blue','brown']){
    await page.locator('[data-color='+color+']').click();await frame();
    await page.locator('.preview-card').screenshot({path:out+'/shoe-'+bottom+'-'+id+'-'+color+'.png'});
   }
  }
 }
 await page.locator('#start-game').click();await page.locator('#wake').click();
 await page.waitForFunction(()=>!document.querySelector('#actions [data-action=wardrobe]').disabled);
 await page.locator('#actions [data-action=wardrobe]').click();const wardrobe=page.getByRole('dialog',{name:'Шкаф'});await wardrobe.waitFor();
 assert.equal(await wardrobe.locator('[data-category=footwear][data-option="highcanvas:brown"]').isEnabled(),true);
 await page.screenshot({path:out+'/shoe-wardrobe.png'});await wardrobe.getByRole('button',{name:'Применить',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('#actions [data-action=wardrobe]').disabled);
 if(await page.locator('#camera-mode').textContent()!=='Камера: 2D')await page.locator('#camera-mode').click();
 await page.waitForFunction(()=>document.querySelector('#camera-mode').textContent==='Камера: 2D'&&!document.querySelector('#camera-mode').disabled);await frame();await page.screenshot({path:out+'/shoe-apartment.png'});
 await page.reload();await page.locator('#loading').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-apartment-v3')).appearance.footwear),'highcanvas');
 assert.deepEqual(errors,[]);console.log('PASS five closed models × five colors × jeans/shorts; creator → wardrobe → apartment → reload');
}finally{await browser.close();}
