import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

// This runs only in the isolated QA page. No diagnostic hooks ship in the app.
export async function verifyFinalWorkflows({browser,base,out,label,source,errors,workerTimeoutMs=15000}){
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.route('**/__final-workflows',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated final campaign acceptance</title>'}));await page.goto(base+'/__final-workflows');
  const result=await page.evaluate(async({workerTimeoutMs})=>{
   const mod=async name=>import('/src/'+name+'.js?rev=43');
   const [fixture,saves,vocal,exports,upload,composer,submission,social,bg,downloads,profiles]=await Promise.all([import('/test/helpers/long-campaign-fixture.js'),mod('virtual-pc-state'),mod('vocal-production'),mod('pc-audio-exports'),mod('social-upload'),mod('social-composer'),mod('social-submission'),mod('social-runtime'),mod('social-background'),mod('pc-browser-downloads'),mod('avatar-v3-profile')]);
   const {canonicalTrackSignature}=await mod('track-version');
   const check=(ok,why)=>{if(!ok)throw Error(why);},same=(a,b,why)=>{if(canonicalTrackSignature(a)!==canonicalTrackSignature(b)){window.finalMismatch={why,actual:a,expected:b};throw Error(why);}},take=r=>{check(r.ok,r.reason);return r.state;};
   const f=fixture.longCampaignFixture({tracks:20,day:8,battleId:'makarevich-1'}),nowMinute=10560;
   let state=f.state;
   for(let i=1;i<=20;i++){
    state={...state,music:{...state.music,needs:{satiety:100,energy:100}}};
    state=take(vocal.startVocalWork(state,{beatId:'campaign-beat-'+i,textId:'campaign-lyrics-'+i},f.skills,()=>.4));
    const finished=vocal.advanceVocalWork(state,1000);check(finished.finished,'recorded campaign take completes');state=finished.state;
   }
   check(state.projects.length===40&&state.creativeWork.items.length===40,'twenty beat/text pairs retain forty completed plans');
   const projects=structuredClone(state.projects),plans=structuredClone(state.creativeWork);
   state=saves.applyToBattle(state,'makarevich-1','Campaign QA');state=take(social.activateSocial(state,600));
   for(const kind of ['track','beat','vocal'])state=take(exports.createAudioExport(state,{id:'campaign-'+kind,projectId:'campaign-beat-20',kind,folderId:'exports',filename:'campaign-'+kind,nowMinute}));
   state=take(upload.startSubmissionUpload(state,{communityId:'makarevich-1',fileId:'campaign-track',nowMinute}));
   const {createHeldWorkerReply}=await import('/tools/qa/held-worker-reply.js');
   const reply=createHeldWorkerReply(()=>new Worker('/src/social-worker.js?rev=43',{type:'module'}),{timeoutMs:workerTimeoutMs});let background,concurrent,version;
   try{
    background=bg.createSocialBackground({getState:()=>state,createWorker:()=>reply.worker,persist:next=>saves.saveVirtualPcState(localStorage,next),onState:next=>state=next});
    background.tick(nowMinute,{},0);
    state=upload.advanceSubmissionUpload(state,{activeSeconds:.75,powered:true,paused:false}).state;
    state=take(downloads.startBrowserDownload(state,{appId:'dossier',kind:'metadata'}));state=downloads.advanceBrowserDownloads(state,{activeSeconds:.25,powered:true,paused:false}).state;
    state=take(exports.createAudioExport(state,{id:'concurrent-vocal',projectId:'campaign-beat-19',kind:'vocal',folderId:'music',filename:'concurrent-vocal',nowMinute}));
    state={...state,phonePresentation:{firstWakeAtMinute:nowMinute-1,announcedIds:['already-shown']}};
    concurrent=structuredClone({browserDownloads:state.browserDownloads,audioExports:state.audioExports,phonePresentation:state.phonePresentation,outgoingUpload:state.outgoingUpload});version=structuredClone(state.trackVersions.byId[state.outgoingUpload.versionId]);
    await reply.received;reply.deliver();check(background.snapshot.commits===1,'real late Worker result commits');
   }finally{background?.dispose();reply.dispose();}
   for(const key of Object.keys(concurrent))same(state[key],concurrent[key],'late Worker preserves '+key);
   same(state.trackVersions.byId[state.outgoingUpload.versionId],version,'partial upload keeps frozen binding');
   check(saves.saveVirtualPcState(localStorage,state),'partial upload durable save');state=saves.loadVirtualPcState(localStorage).state;
   same(state.outgoingUpload,concurrent.outgoingUpload,'partial upload survives reload');
   state=upload.advanceSubmissionUpload(state,{activeSeconds:1.25,powered:true,paused:false}).state;check(state.outgoingUpload.status==='ready','two active seconds complete file upload');
   state=take(composer.startSubmissionMessage(state,{communityId:'makarevich-1',nowMinute}));state=composer.advanceSubmissionMessage(state,{activeSeconds:6,visible:true,powered:true,paused:false}).state;state=take(submission.sendSubmission(state,{communityId:'makarevich-1',nowMinute}));
   const submissionId=state.battleSubmissions[0].id;
   for(const minute of [nowMinute+31,10681,13080,70*1440])state=social.advanceSocial(state,minute,{heroSkills:f.skills}).state;
   check(state.tournaments.byId['makarevich-1'].status==='complete','real submitted campaign reaches final archive');check(Object.keys(state.judging.results).length>0,'published judging retained');
   same(state.projects,projects,'recorded project archive preserved');same(state.creativeWork,plans,'forty campaign plans preserved');
   const immutable=structuredClone({audioExports:state.audioExports,trackVersions:state.trackVersions,battleSubmissions:state.battleSubmissions,tournaments:state.tournaments,judging:state.judging});
   const beforeQuota=localStorage.getItem(saves.VIRTUAL_PC_STORAGE_KEY),quota={getItem:k=>localStorage.getItem(k),setItem(){throw new DOMException('QA quota','QuotaExceededError');}};
   check(saves.saveVirtualPcState(quota,state)===false,'quota failure is explicit');check(localStorage.getItem(saves.VIRTUAL_PC_STORAGE_KEY)===beforeQuota,'quota leaves prior durable bytes intact');
   state={...state,projects:[],music:{...state.music,practice:100}};check(saves.saveVirtualPcState(localStorage,state),'archive save after editable projects removed');
   const loaded=saves.loadVirtualPcState(localStorage);check(loaded.ok,'new save reloads');state=loaded.state;
   for(const key of Object.keys(immutable))same(state[key],immutable[key],'new save preserves '+key);
   const damaged={version:1,power:'on',projects:[{id:'broken',kind:'beat',audio:{unrecognized:true}}],audioExports:{version:1,files:[{id:'lost',descriptor:{parts:[]}}],recovery:[]}};
   localStorage.setItem(saves.VIRTUAL_PC_STORAGE_KEY,JSON.stringify(damaged));const recovered=saves.loadVirtualPcState(localStorage);check(recovered.ok,'damaged sections isolate recovery');check(recovered.state.projects[0]?.recoveryIssue,'damaged project retained');check(recovered.state.audioExports.recovery.length===1,'damaged exported file retained');
   localStorage.setItem(saves.VIRTUAL_PC_STORAGE_KEY,'{broken');check(!saves.loadVirtualPcState(localStorage).ok,'invalid whole save fails explicitly');check(localStorage.getItem(saves.VIRTUAL_PC_STORAGE_KEY)==='{broken','invalid raw save is not replaced');
   localStorage.removeItem(saves.VIRTUAL_PC_STORAGE_KEY);check(saves.loadVirtualPcState(localStorage).ok,'empty/new campaign loads');
   localStorage.setItem(saves.VIRTUAL_PC_STORAGE_KEY,JSON.stringify({version:1,power:'on',projects:projects.slice(0,2)}));const legacy=saves.loadVirtualPcState(localStorage);check(legacy.ok,'legacy save migrates');check(legacy.state.projects.length===2,'legacy projects retained');
   check(saves.saveVirtualPcState(localStorage,state),'restore final archive for native UI');profiles.saveProfile(localStorage,profiles.createProfile({name:'Final campaign QA'}));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:71,minutes:0,initialRest:false}));
   const archiveHashes={};for(const [key,value]of Object.entries(immutable))archiveHashes[key]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalTrackSignature(value)))),n=>n.toString(16).padStart(2,'0')).join('');
   sessionStorage.setItem('__final-campaign-expected',JSON.stringify(archiveHashes));
   return {pairs:20,completedPlans:40,recordedVocals:20,exports:state.audioExports.files.length,lateNativeWorker:true,partialUploadSeconds:.75,totalUploadSeconds:2,submissionId,finalStatus:state.tournaments.byId['makarevich-1'].status,judgingResults:Object.keys(state.judging.results).length,archiveHashes,immutable: true,quotaRollback:true,legacy:true,empty:true,damaged:true,invalidRawPreserved:true};
  },{workerTimeoutMs});
  await writeFile(`${out}/${label}-integration.json`,JSON.stringify(result,null,2));
  await page.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await page.waitForFunction(()=>window.campaignQA);await page.locator('#continue-game').click();await page.waitForFunction(()=>campaignQA.phase==='room');
  await page.locator('#apartment').focus();await page.locator('#apartment').press('Enter');await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>campaignQA.phase==='desktop');
  await page.evaluate(()=>{campaignQA.pc.openNow('underweb');campaignQA.pc.navigateUnderweb('underweb://social/results/makarevich-1/selection');});
  await page.getByRole('button',{name:'← Группа',exact:true}).waitFor();await page.screenshot({path:`${out}/${label}-campaign-results.png`});
  await page.reload();await page.waitForFunction(()=>window.campaignQA);await page.locator('#continue-game').click();await page.waitForFunction(()=>campaignQA.phase==='room');
  await page.evaluate(async()=>{const {canonicalTrackSignature}=await import('/src/track-version.js?rev=43'),expected=JSON.parse(sessionStorage.getItem('__final-campaign-expected'));for(const [key,value]of Object.entries(expected)){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalTrackSignature(campaignQA.state[key])))),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==value)throw Error('Actual browser reload changed '+key);}});
  const restored=await page.evaluate(()=>({files:campaignQA.state.audioExports.files.length,submissionId:campaignQA.state.battleSubmissions[0].id,status:campaignQA.state.tournaments.byId['makarevich-1'].status}));assert.equal(restored.files,result.exports);assert.equal(restored.submissionId,result.submissionId);assert.equal(restored.status,'complete');
  result.actualPageReload=true;await writeFile(`${out}/${label}-integration.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({integration:result}));return result;
 }catch(error){await page.screenshot({path:`${out}/${label}-integration-failure.png`}).catch(()=>{});await writeFile(`${out}/${label}-integration-failure.json`,JSON.stringify({error:error.stack,body:await page.locator('body').innerText(),mismatch:await page.evaluate(()=>window.finalMismatch??null)},null,2));throw error;}finally{await context.close();}
}
