import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/package-one';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__phone-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/phone-hud.css?rev=37"><style>body{margin:0;background:#41504a}#controls{position:fixed;bottom:8px;left:14px;right:14px;height:98px;background:#24332e;color:white}</style><div id="controls">Область действий квартиры</div><aside id="phone"></aside>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__phone-qa');
 await page.evaluate(async()=>{
  const [{mountPhoneHud},{receivePhoneEvents}]=await Promise.all([import('/src/phone-hud.js?rev=37'),import('/src/phone-notifications.js?rev=37')]);
  const q=window.phoneQA={count:0,unread:true};
  q.phone=receivePhoneEvents(null,[{id:'ack',dueAt:25,source:'Рифмосеть — сообщение',sender:'Макаревич Battle',text:'Привет! Работа принята. Спасибо, что успел отправить запись. После окончания приёма судьи начнут слушать работы, а эту версию можно будет найти в аудиозаписях сообщества. Оценки придут отдельно.'}]);
  q.view=mountPhoneHud(document.getElementById('phone'),{getState:()=>q.phone,onChange:phone=>{q.phone=phone;return true;},playVibration:()=>{q.count++;return Promise.reject(Error('autoplay denied'));}});
 });
 for(const [width,height]of [[800,600],[1280,900]]){
  await page.setViewportSize({width,height});
  await page.screenshot({path:out+'/phone-game-'+width+'.png'});
  const measurements=await page.evaluate(()=>{const body=document.querySelector('.bl-phone-body'),phone=document.getElementById('phone').getBoundingClientRect(),controls=document.getElementById('controls').getBoundingClientRect();return {body:body.getBoundingClientRect().height,line:Number.parseFloat(getComputedStyle(body).lineHeight),overlap:phone.bottom>controls.top};});
  assert.ok(measurements.body<=measurements.line*3+.1);assert.equal(measurements.overlap,false);
 }
 for(let i=0;i<5;i++)await page.evaluate(()=>phoneQA.view.update());assert.equal(await page.evaluate(()=>phoneQA.count),1);
 await page.mouse.move(700,10);assert.equal(await page.evaluate(()=>phoneQA.phone.activeId),'ack');
 await page.locator('[data-phone-notice]').hover();await page.evaluate(()=>{phoneQA.phone=JSON.parse(JSON.stringify(phoneQA.phone));phoneQA.view.update();});
 await page.mouse.move(700,10);assert.equal(await page.evaluate(()=>phoneQA.phone.activeId),null);assert.equal(await page.evaluate(()=>phoneQA.unread),true);
 await page.evaluate(()=>phoneQA.view.dispose());assert.deepEqual(errors,[]);
 console.log('PASS native 3-line clamp, controls clearance, pointer enter/leave, stable queue, optional sound without repeats');
}finally{await browser.close();}
