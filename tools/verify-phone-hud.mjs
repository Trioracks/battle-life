import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa/task-3-phone',base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4183';
assert.notEqual(new URL(base).port,'4173','QA must use an isolated origin');
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const errors=[],results=[];
const summarize=rows=>{const sorted=rows.slice().sort((a,b)=>a-b);return {samples:sorted.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__phone-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/phone-hud.css?rev=42"><style>body{margin:0;background:#41504a}</style><aside id="phone"></aside>'}));
 await page.goto(base+'/__phone-qa');
 await page.evaluate(async()=>{
  const [{mountPhoneHud},{receivePhoneEvents}]=await Promise.all([import('/src/phone-hud.js?rev=42'),import('/src/phone-notifications.js?rev=42')]);
  const q=window.phoneQA={count:0,saves:0,fail:false,context:{nowMinute:600,sleeping:true,mode:'game',pcPhase:'room',needs:{satiety:71,energy:85}},presentation:{firstWakeAtMinute:null,announcedIds:[]}};
  q.phone=receivePhoneEvents(null,[{id:'ack',dueAt:25,source:'Рифмосеть — сообщение',sender:'Макаревич Battle',text:'Привет! Работа принята. Спасибо, что успел отправить запись. После окончания приёма судьи начнут слушать работы, а эту версию можно будет найти в аудиозаписях сообщества. Оценки придут отдельно.'}]);
  q.options={getState:()=>q.phone,getPresentation:()=>q.presentation,getContext:()=>q.context,onPresentationChange:next=>{q.saves++;if(q.fail)return false;localStorage.setItem('phone-qa-presentation',JSON.stringify(next));q.presentation=next;return true;},onChange:phone=>{q.phone=phone;return true;},playVibration:()=>{q.count++;return Promise.reject(Error('autoplay denied'));}};
  q.mount=()=>q.view=mountPhoneHud(document.getElementById('phone'),q.options);q.mount();
 });
 assert.equal(await page.locator('#phone').isVisible(),true);assert.equal(await page.locator('[data-phone-notice]').isVisible(),false);assert.equal(await page.evaluate(()=>phoneQA.count),0);
 await page.evaluate(()=>{phoneQA.context.sleeping=false;phoneQA.view.update();phoneQA.context.nowMinute=600.249;phoneQA.view.update();});
 assert.equal(await page.locator('[data-phone-notice]').isVisible(),false);
 await page.evaluate(()=>{phoneQA.context.nowMinute=600.25;phoneQA.view.update();});assert.equal(await page.evaluate(()=>phoneQA.count),1);
 assert.equal(await page.locator('.bl-phone-clock').innerText(),'10:00');assert.equal(await page.locator('[data-phone-notice]>small').first().innerText(),'В кругу — сообщение');assert.equal(await page.evaluate(()=>phoneQA.phone.queue[0].source),'Рифмосеть — сообщение');
 const phoneButton=page.getByRole('button',{name:'Телефон: время и потребности'}),panel=page.locator('[data-phone-panel]');
 await phoneButton.click();assert.equal(await panel.isVisible(),true);assert.match(await panel.innerText(),/Сытость · 71/);await phoneButton.click();assert.equal(await panel.isVisible(),false);
 await phoneButton.click();await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);
 await phoneButton.click();await page.mouse.click(800,200);assert.equal(await panel.isVisible(),false);
 for(const [width,height]of [[1280,720],[1366,768],[1920,1080]]){await page.setViewportSize({width,height});await phoneButton.click();await page.screenshot({path:out+'/phone-panel-'+width+'.png'});const bounds=await page.evaluate(()=>{const body=document.querySelector('.bl-phone-body'),root=document.querySelector('.bl-phone-content').getBoundingClientRect();return {height:body.getBoundingClientRect().height,line:parseFloat(getComputedStyle(body).lineHeight),left:root.left,top:root.top,right:root.right};});assert.ok(bounds.height<=bounds.line*3+.1);assert.ok(bounds.left>=0&&bounds.top>=0&&bounds.right<=width);await phoneButton.click();}
 await page.evaluate(()=>{phoneQA.view.dispose();phoneQA.presentation=JSON.parse(localStorage.getItem('phone-qa-presentation'));phoneQA.mount();phoneQA.view.update();});assert.equal(await page.evaluate(()=>phoneQA.count),1,'durable delivery survives mount/reload');
 for(const [mode,pcPhase]of [['pc','desktop'],['game','preparing'],['pc','working']]){await page.evaluate(([mode,pcPhase])=>{Object.assign(phoneQA.context,{mode,pcPhase});phoneQA.view.update();},[mode,pcPhase]);assert.equal(await page.locator('#phone').isVisible(),false);assert.equal(await page.evaluate(()=>phoneQA.phone.queue.length),1);}
 await page.evaluate(()=>{phoneQA.view.dispose();Object.assign(phoneQA.context,{mode:'game',pcPhase:'room'});phoneQA.presentation={firstWakeAtMinute:0,announcedIds:[]};phoneQA.fail=true;phoneQA.mount();for(let i=0;i<200;i++)phoneQA.view.update();});assert.equal(await page.evaluate(()=>phoneQA.saves),3,'one failed save attempt, no retries every frame');assert.equal(await page.evaluate(()=>phoneQA.count),1);
 await page.close();
 // Hooks exist only in this isolated QA route, never in the shipped app.
 let source=await readFile(new URL('../src/apartment-app.js',import.meta.url),'utf8');
 const hook="window.phoneHostQA={cues:0,samples:[],get phase(){return pcLifecycle.snapshot.phase},get state(){return pcState},get motion(){return motion},get minute(){return gameMinuteStamp(homeTime)}};";
 source=source.replace("loading.hidden=true;setMode('menu');",hook+"loading.hidden=true;setMode('menu');")
  .replace("playVibration:()=>{if(audio",'playVibration:()=>{if(window.phoneHostQA)phoneHostQA.cues++;if(audio')
  .replace('last=now;update(dt,now);requestAnimationFrame(frame);','last=now;const qaStart=performance.now();update(dt,now);phoneHostQA.samples.push({phase:pcLifecycle.snapshot.phase,frame:raw*1000,update:performance.now()-qaStart});requestAnimationFrame(frame);');
 assert.ok(source.includes(hook),'host instrumentation attached');
 for(const [width,height]of [[1280,720],[1366,768],[1920,1080]].filter(([width])=>!process.env.PHONE_QA_WIDTH||width===Number(process.env.PHONE_QA_WIDTH))){
  const context=await browser.newContext({viewport:{width,height}}),host=await context.newPage();host.setDefaultTimeout(60000);host.on('pageerror',e=>errors.push(e.message));
  const shot=async name=>{const path=out+'/'+name+'-'+width+'.png';await host.screenshot({path});console.log('SHOT '+path);};
  try{
   await host.route('**/__phone-host-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated phone save</title>'}));await host.goto(base+'/__phone-host-seed');
   await host.evaluate(async()=>{
    const [{createProfile,saveProfile},{submissionFixture},{saveVirtualPcState},{receivePhoneEvents}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=42'),import('/test/helpers/submission-fixtures.js'),import('/src/virtual-pc-state.js?rev=42'),import('/src/phone-notifications.js?rev=42')]);
    const state=submissionFixture({vocal:false});state.software.ft.installed=true;state.software.client.installed=true;state.music.needs={satiety:100,energy:100};state.phone=receivePhoneEvents(null,[{id:'qa-first',dueAt:25,source:'Рифмосеть',sender:'Макаревич Battle',text:'Твоя работа принята. Полный ответ можно прочитать в сообщениях на компьютере.'}]);
    assertSave(saveProfile(localStorage,createProfile({name:'Проверка телефона'})).ok);assertSave(saveVirtualPcState(localStorage,state));
    localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:1410,initialRest:true}));
    function assertSave(ok){if(!ok)throw Error('QA seed save failed');}
   });
   await host.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));await host.goto(base);await host.locator('#loading').waitFor({state:'hidden'});await host.locator('#continue-game').click();
   await host.locator('#wake').waitFor({state:'visible'});assert.equal(await host.locator('.bl-phone-hud').isVisible(),true);assert.equal(await host.evaluate(()=>phoneHostQA.cues),0);
   await host.getByRole('button',{name:'Телефон: время и потребности'}).click();assert.equal(await host.locator('[data-phone-panel]').isVisible(),true);assert.equal(await host.locator('[data-phone-notice]').isVisible(),false);assert.equal(await host.evaluate(()=>phoneHostQA.state.phonePresentation.firstWakeAtMinute),null);await shot('sleep');await host.getByRole('button',{name:'Телефон: время и потребности'}).click();
   await host.locator('#wake').click();await host.waitForFunction(()=>phoneHostQA.motion.phase==='idle');await host.waitForFunction(()=>phoneHostQA.state.phonePresentation.firstWakeAtMinute!==null);assert.equal(await host.evaluate(()=>phoneHostQA.cues),0);
   await host.waitForFunction(()=>phoneHostQA.state.phonePresentation.announcedIds.includes('qa-first'));assert.equal(await host.evaluate(()=>phoneHostQA.cues),1);
   await host.waitForFunction(()=>document.querySelector('#controls').hidden);assert.equal(await host.locator('#rig-toggle').isVisible(),false);assert.equal(await host.locator('#apartment-actions').isVisible(),false);
   assert.equal(await host.locator('#game-header .brand').count(),0);assert.match(await host.locator('#camera-mode').getAttribute('aria-label'),/Камера:/);assert.equal(await host.locator('#menu-button').getAttribute('aria-label'),'Меню и настройки');
   await host.getByRole('button',{name:'Телефон: время и потребности'}).click();await shot('apartment');await host.keyboard.press('Escape');assert.equal(await host.locator('[data-phone-panel]').isVisible(),false);assert.equal(await host.locator('#main-menu').isVisible(),false,'Escape closes phone before menu');
   assert.equal(await host.locator('[data-phone-notice]>small').first().innerText(),'В кругу');assert.match(await host.locator('.bl-phone-clock').innerText(),/^\d\d:\d\d$/);
   await host.evaluate(()=>phoneHostQA.samples=[]);await host.waitForFunction(()=>phoneHostQA.samples.length>=120);
   const room=await host.evaluate(()=>phoneHostQA.samples.slice(20));
   // Keyboard alternatives exercise the same real apartment actions as furniture picks.
   await host.locator('#apartment').focus();await host.keyboard.press('Enter');await host.locator('#actions [data-action=computer]').click();
   await host.waitForFunction(()=>phoneHostQA.phase==='preparing'||phoneHostQA.phase!=='room');assert.equal(await host.locator('.bl-phone-hud').isVisible(),false);
   await host.waitForFunction(()=>phoneHostQA.phase==='desktop');assert.equal(await host.locator('.bl-phone-hud').isVisible(),false);assert.equal(await host.locator('#controls').isVisible(),false);await shot('pc');
   const pc=host.locator('#virtual-pc'),ft=pc.locator('.pc-window[data-window-id="ft-studio"]');await pc.getByRole('button',{name:'Слобода',exact:true}).click();await pc.getByRole('menuitem',{name:'FT Studio',exact:true}).click();
   await ft.getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click();await ft.getByRole('button',{name:'Работа · готов',exact:true}).click();await ft.getByRole('button',{name:'Добавить вокал',exact:true}).click();await ft.getByRole('dialog').getByRole('button',{name:'Не переключай',exact:true}).click();
   await host.waitForFunction(()=>phoneHostQA.phase==='working');assert.equal(await host.locator('.bl-phone-hud').isVisible(),false);assert.equal(await host.locator('.beat-work-hud').isVisible(),true);await shot('work');
   await host.evaluate(()=>phoneHostQA.samples=[]);await host.waitForFunction(()=>phoneHostQA.samples.filter(s=>s.phase==='working').length>=100);
   const work=await host.evaluate(()=>phoneHostQA.samples.filter(s=>s.phase==='working').slice(10));
   const result={width,height,room:{frame:summarize(room.map(s=>s.frame)),update:summarize(room.map(s=>s.update))},work:{frame:summarize(work.map(s=>s.frame)),update:summarize(work.map(s=>s.update))}};results.push(result);console.log(JSON.stringify(result));
   for(const samples of [result.room,result.work]){assert.ok(samples.frame.p95<=25,'native frame p95 <=25ms');assert.ok(samples.update.p95<=20,'native update p95 <=20ms');}
   if(width===1280){await host.reload();await host.locator('#loading').waitFor({state:'hidden'});await host.locator('#continue-game').click();await host.locator('[data-phone-notice]').waitFor({state:'visible'});assert.equal(await host.evaluate(()=>phoneHostQA.cues),0,'full page reload does not replay delivered cue');assert.equal(await host.evaluate(()=>phoneHostQA.state.phonePresentation.announcedIds.includes('qa-first')),true);}
  }catch(error){await shot('failure');await writeFile(out+'/failure-'+width+'.json',JSON.stringify({error:error.stack,errors,results,host:await host.evaluate(()=>({phase:window.phoneHostQA?.phase,body:document.body.innerText.slice(-3000)}))},null,2));throw error;}finally{await context.close();}
 }
 assert.deepEqual(errors,[]);
 await writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));
 console.log('PASS native phone gate, durable delivery, autoplay rejection, failed-save latch, keyboard/pointer panel and three-line clamp');
}finally{await browser.close();}
