import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
try{
 const original=await readFile(new URL('../src/apartment-app.js',import.meta.url),'utf8');
 assert.ok(original.includes("loading.hidden=true;setMode('menu');"));
 // Test-only instrumentation, served to this isolated context. No production debug API.
 const source=original.replace("loading.hidden=true;setMode('menu');",`window.uploadQA={get state(){return pcState},get motion(){return motion},get pc(){return virtualPc},get mode(){return mode},get time(){return homeTime},persist:next=>{const ok=persistPc(next,{atomic:true});virtualPc.syncState(pcState);return ok},enter:p=>{saveProfile(storage,p);homeTime.initialRest=false;enterApartment(p)},tick:t=>advanceOutgoingTransfer(t),get phase(){return pcLifecycle.snapshot.phase}};loading.hidden=true;setMode('menu');`);
 await page.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(process.env.BATTLE_QA_URL||'http://127.0.0.1:4175');await page.waitForFunction(()=>window.uploadQA);
 await page.evaluate(async()=>{const [{submissionFixture},{createProfile}]=await Promise.all([import('/test/helpers/submission-fixtures.js'),import('/src/avatar-v3-profile.js?rev=39')]);uploadQA.persist(submissionFixture({mixed:true}));uploadQA.enter(createProfile({name:'Загрузка QA'}));});
 await page.locator('#actions [data-action="computer"]').click();await page.waitForFunction(()=>uploadQA.phase==='desktop');
 await page.evaluate(()=>{uploadQA.pc.openNow('underweb');uploadQA.pc.navigateUnderweb('underweb://social/dialog/makarevich-1');});
 const attach=async()=>{await page.getByRole('button',{name:'Прикрепить',exact:true}).click();await page.getByRole('button',{name:'Выбрать: Работа',exact:true}).click();await page.getByRole('button',{name:'Прикрепить выбранный трек',exact:true}).click();};
 await attach();const started=performance.now();assert.equal(await page.evaluate(()=>uploadQA.state.outgoingUpload.totalBytes),512000);assert.equal(await page.getByRole('button',{name:'Отправить',exact:true}).isDisabled(),true);
 await page.waitForFunction(()=>uploadQA.state.outgoingUpload.uploadedBytes>=20000);await page.screenshot({path:out+'/upload-start.png'});
 await page.evaluate(()=>uploadQA.pc.closeNow('underweb'));const beforeClose=await page.evaluate(()=>uploadQA.state.outgoingUpload.uploadedBytes);await page.waitForFunction(n=>uploadQA.state.outgoingUpload.uploadedBytes>n+10000,beforeClose);
 await page.evaluate(()=>uploadQA.pc.requestLeave());await page.waitForFunction(()=>uploadQA.mode==='game'&&uploadQA.phase==='room');await page.locator('#actions [data-action="passage"]').click();await page.waitForFunction(()=>uploadQA.motion.position[0]<-1);
 const kitchen=await page.evaluate(()=>({bytes:uploadQA.state.outgoingUpload.uploadedBytes,x:uploadQA.motion.position[0]}));assert.ok(kitchen.bytes>beforeClose);await page.screenshot({path:out+'/upload-kitchen.png'});
 // Explicit power state edge: using the normal state save, while the actual host ticks.
 await page.evaluate(()=>uploadQA.persist({...uploadQA.state,power:'off'}));await page.waitForTimeout(200);const off=await page.evaluate(()=>uploadQA.state.outgoingUpload.uploadedBytes);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>uploadQA.state.outgoingUpload.uploadedBytes),off);await page.evaluate(()=>uploadQA.persist({...uploadQA.state,power:'on'}));
 await page.waitForFunction(()=>uploadQA.state.outgoingUpload.status==='ready',null,{timeout:60000});const elapsed=(performance.now()-started)/1000;assert.ok(elapsed>=51.2&&elapsed<65,'real upload seconds '+elapsed);
 const ready=await page.evaluate(()=>({upload:uploadQA.state.outgoingUpload,audio:uploadQA.state.social.personalAudioIds,draft:uploadQA.state.social.dialogs['makarevich-1'].draftVersionId,attempts:uploadQA.state.battleSubmissions.length}));assert.equal(ready.draft,ready.upload.versionId);assert.equal(ready.audio.length,1);assert.equal(ready.attempts,0);
 // Start another transfer after cancel, keep the previous ready draft, then reload.
 await page.evaluate(async()=>{const {cancelSubmissionUpload,startSubmissionUpload}=await import('/src/social-upload.js?rev=39');let s=cancelSubmissionUpload(uploadQA.state).state;s=startSubmissionUpload(s,{communityId:'makarevich-1',projectId:'beat',nowMinute:(uploadQA.time.day-1)*1440+uploadQA.time.minutes}).state;uploadQA.persist(s);uploadQA.tick(2);});
 const partial=await page.evaluate(()=>uploadQA.state.outgoingUpload.uploadedBytes);assert.ok(partial>=20000);await page.reload();await page.waitForFunction(()=>window.uploadQA);const loaded=await page.evaluate(()=>uploadQA.state.outgoingUpload.uploadedBytes);assert.ok(loaded>=partial&&loaded<partial+10000);await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>uploadQA.state.outgoingUpload.uploadedBytes),loaded,'menu gives no offline accrual');
 await page.evaluate(async()=>{const {cancelSubmissionUpload}=await import('/src/social-upload.js?rev=39');uploadQA.persist(cancelSubmissionUpload(uploadQA.state).state);});assert.equal(await page.evaluate(()=>uploadQA.state.social.dialogs['makarevich-1'].draftVersionId),ready.draft);
 assert.deepEqual(errors,[]);await writeFile(out+'/upload-native-evidence.json',JSON.stringify({elapsed,kitchen,ready,partial,loaded},null,2));console.log('PASS actual apartment real-time upload '+elapsed.toFixed(2)+'s; dialog close, leave/kitchen, power pause, partial reload, no offline credit, cancel preserves draft');
}catch(e){await page.screenshot({path:out+'/upload-failure.png'});throw e;}finally{await browser.close();}
