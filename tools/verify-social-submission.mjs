import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/package-one';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__social-send-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/desktop-apps.css?rev=41"><link rel="stylesheet" href="/social-network.css?rev=41"><style>body{margin:0}#qa{height:100vh}</style><div id="qa"></div>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__social-send-qa');
 await page.evaluate(async()=>{
  const [{submissionFixture},{mountUnderweb},{advanceVirtualPcDurably,createSubmissionTransferClock},{BeatAudio},{saveVirtualPcState,loadVirtualPcState}]=await Promise.all([import('/test/helpers/submission-fixtures.js'),import('/src/underweb-view.js?rev=41'),import('/src/virtual-pc-runtime.js?rev=41'),import('/src/beat-audio.js?rev=41'),import('/src/virtual-pc-state.js?rev=41')]);
  const q=window.sendQA={state:submissionFixture(),minute:600,fail:false,audio:new BeatAudio()};
  q.persist=next=>{if(q.fail||q.failSend&&next.battleSubmissions.length>q.state.battleSubmissions.length)return false;const saved=saveVirtualPcState(localStorage,next);if(saved)q.state=next;return saved;};
  q.reload=()=>{q.state=loadVirtualPcState(localStorage).state;};
  q.advance=minute=>{q.minute=minute;q.state=advanceVirtualPcDurably(q.state,{day:Math.floor(minute/1440)+1,minutes:minute%1440},q.persist).state;q.view.update();};
  q.mount=()=>q.view=mountUnderweb(document.getElementById('qa'),{getState:()=>q.state,getMetadata:()=>({gameDay:Math.floor(q.minute/1440)+1,gameMinutes:q.minute,playerName:'Новый голос'}),onChange:q.persist,onApply:()=>{},audio:q.audio});q.mount();
  q.view.navigate('underweb://social/community/makarevich-1');
  const transfer=createSubmissionTransferClock();let last=performance.now();q.running=true;const frame=now=>{if(!q.running)return;const dt=Math.min(.25,(now-last)/1000);last=now;const r=transfer.tick(q.state,{activeSeconds:dt,powered:q.state.power==='on',paused:document.hidden,phase:String(document.hidden)},q.persist);q.state=r.state;q.view.tickOutgoingMessage(dt,{paused:document.hidden});q.view.update();requestAnimationFrame(frame);};requestAnimationFrame(frame);
 });
 await page.getByRole('button',{name:'Сдать трек',exact:true}).click();await page.getByRole('button',{name:'Прикрепить',exact:true}).click();
 await page.getByRole('button',{name:'Выбрать: Работа',exact:true}).click();await page.getByRole('button',{name:'Прикрепить выбранный трек',exact:true}).click();
 assert.equal(await page.evaluate(()=>sendQA.state.battleSubmissions.length),0);
 assert.equal(await page.evaluate(()=>sendQA.state.social.personalAudioIds.length),0);
 await page.waitForFunction(()=>sendQA.state.outgoingUpload?.status==='ready',null,{timeout:35000});assert.equal(await page.evaluate(()=>sendQA.state.social.personalAudioIds.length),1);
 await page.evaluate(()=>{sendQA.failSend=true;});await page.getByRole('button',{name:'Отправить',exact:true}).click();
 await page.waitForFunction(()=>sendQA.state.outgoingMessage?.elapsedSeconds>=2);assert.ok((await page.locator('.sn-composer-text').innerText()).startsWith('Привет!'));await page.screenshot({path:out+'/social-typing.png'});
 await page.evaluate(()=>{sendQA.persist({...sendQA.state,power:'off'});sendQA.view.tickOutgoingMessage(0,{paused:false});});const poweredOff=await page.evaluate(()=>sendQA.state.outgoingMessage.elapsedSeconds);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>sendQA.state.outgoingMessage.elapsedSeconds),poweredOff);await page.evaluate(()=>sendQA.persist({...sendQA.state,power:'on'}));
 await page.evaluate(()=>sendQA.view.navigate('underweb://social/friends'));const paused=await page.evaluate(()=>sendQA.state.outgoingMessage.elapsedSeconds);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>sendQA.state.outgoingMessage.elapsedSeconds),paused);
 await page.evaluate(()=>{sendQA.view.dispose();sendQA.reload();sendQA.mount();sendQA.view.navigate('underweb://social/dialog/makarevich-1');});await page.waitForFunction(()=>sendQA.state.outgoingMessage?.elapsedSeconds===6);await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>sendQA.state.battleSubmissions.length),0);
 await page.evaluate(()=>{sendQA.failSend=false;});await page.getByRole('button',{name:'Повторить отправку',exact:true}).click();
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
 await page.evaluate(()=>{sendQA.running=false;sendQA.view.dispose();sendQA.audio.dispose();});assert.deepEqual(errors,[]);
 console.log('PASS native attach/save failure/send/reload/original deletion/offline ack/deadline publication/snapshot playback');
}finally{await browser.close();}
