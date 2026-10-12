import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/package-one';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__social-send-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/desktop-apps.css?rev=37"><link rel="stylesheet" href="/social-network.css?rev=37"><style>body{margin:0}#qa{height:100vh}</style><div id="qa"></div>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__social-send-qa');
 await page.evaluate(async()=>{
  const [{submissionFixture},{mountUnderweb},{advanceVirtualPcDurably},{BeatAudio},{saveVirtualPcState,loadVirtualPcState}]=await Promise.all([import('/test/helpers/submission-fixtures.js'),import('/src/underweb-view.js?rev=37'),import('/src/virtual-pc-runtime.js?rev=37'),import('/src/beat-audio.js?rev=37'),import('/src/virtual-pc-state.js?rev=37')]);
  const q=window.sendQA={state:submissionFixture(),minute:600,fail:false,audio:new BeatAudio()};
  q.persist=next=>{if(q.fail)return false;const saved=saveVirtualPcState(localStorage,next);if(saved)q.state=next;return saved;};
  q.reload=()=>{q.state=loadVirtualPcState(localStorage).state;};
  q.advance=minute=>{q.minute=minute;q.state=advanceVirtualPcDurably(q.state,{day:Math.floor(minute/1440)+1,minutes:minute%1440},q.persist).state;q.view.update();};
  q.view=mountUnderweb(document.getElementById('qa'),{getState:()=>q.state,getMetadata:()=>({gameDay:Math.floor(q.minute/1440)+1,gameMinutes:q.minute,playerName:'Новый голос'}),onChange:q.persist,onApply:()=>{},audio:q.audio});
  q.view.navigate('underweb://social/community/makarevich-1');
 });
 await page.getByRole('button',{name:'Сдать трек',exact:true}).click();await page.getByRole('button',{name:'Прикрепить',exact:true}).click();
 await page.getByRole('button',{name:'Выбрать: Работа',exact:true}).click();await page.getByRole('button',{name:'Прикрепить выбранный трек',exact:true}).click();
 assert.equal(await page.evaluate(()=>sendQA.state.battleSubmissions.length),0);
 assert.equal(await page.evaluate(()=>sendQA.state.social.personalAudioIds.length),1);
 await page.evaluate(()=>{sendQA.fail=true;});await page.getByRole('button',{name:'Отправить',exact:true}).click();
 assert.equal(await page.evaluate(()=>sendQA.state.battleSubmissions.length),0);
 await page.evaluate(()=>{sendQA.fail=false;});await page.getByRole('button',{name:'Отправить',exact:true}).click();
 assert.equal(await page.evaluate(()=>sendQA.state.battleSubmissions.length),1);assert.equal(await page.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await page.evaluate(()=>{sendQA.state.projects=[];sendQA.persist(sendQA.state);sendQA.reload();sendQA.state.power='off';sendQA.advance(sendQA.state.battleSubmissions[0].ackAt-.5);});
 assert.match(await page.locator('.sn-typing').textContent(),/печатает/);
 await page.evaluate(()=>sendQA.advance(sendQA.state.battleSubmissions[0].ackAt));
 assert.equal(await page.evaluate(()=>sendQA.state.battleSubmissions[0].status),'accepted');
 for(const width of [800,1280]){await page.setViewportSize({width,height:width===800?600:900});await page.screenshot({path:out+'/social-dialog-'+width+'.png'});assert.equal(await page.evaluate(()=>{const p=document.querySelector('.uw-page');return p.scrollWidth>p.clientWidth+1;}),false);}
 await page.evaluate(()=>sendQA.advance(sendQA.state.battleWindows[0].closesAt));
 assert.equal(await page.evaluate(()=>sendQA.state.communityAudio['makarevich-1'].length),1);
 await page.evaluate(()=>sendQA.view.navigate('underweb://social/community/makarevich-1'));
 await page.locator('[data-social-audio]').first().click();await page.waitForFunction(()=>sendQA.audio.status==='playing'||sendQA.audio.status==='error');assert.equal(await page.evaluate(()=>sendQA.audio.status),'playing');
 assert.equal(await page.evaluate(()=>sendQA.audio.descriptor.key),'version:'+await page.evaluate(()=>sendQA.state.battleSubmissions[0].trackVersionId));
 await page.evaluate(()=>{sendQA.view.dispose();sendQA.audio.dispose();});assert.deepEqual(errors,[]);
 console.log('PASS native attach/save failure/send/reload/original deletion/offline ack/deadline publication/snapshot playback');
}finally{await browser.close();}
