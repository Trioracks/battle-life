import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4185',out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa/task-5-browser';
assert.notEqual(new URL(base).port,'4173','Use an isolated QA origin');
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
let source=await readFile(new URL('../src/apartment-app.js',import.meta.url),'utf8');
const hook='window.task5QA={samples:[],get phase(){return pcLifecycle.snapshot.phase},get pc(){return virtualPc},get state(){return pcState}};';
source=source.replace("loading.hidden=true;setMode('menu');",hook+"loading.hidden=true;setMode('menu');").replace('last=now;update(dt,now);requestAnimationFrame(frame);','last=now;const qaStart=performance.now();update(dt,now);task5QA.samples.push({phase:pcLifecycle.snapshot.phase,frame:raw*1000,update:performance.now()-qaStart});requestAnimationFrame(frame);');
assert.ok(source.includes(hook)&&source.includes('qaStart'),'Native instrumentation attached');
const summary=values=>{const sorted=values.toSorted((a,b)=>a-b);return {samples:sorted.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),errors=[],results=[];
try{
 for(const [width,height]of [[1280,720],[1366,768],[1920,1080]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  const shot=async name=>{const path=out+'/'+name+'-'+width+'.png';await page.screenshot({path});console.log('SHOT '+path);};
  const desktop=()=>page.waitForFunction(()=>task5QA.phase==='desktop'&&!task5QA.pc.locked);
  const open=async label=>{await page.locator('#virtual-pc').getByRole('button',{name:'Слобода',exact:true}).click();await page.getByRole('menuitem',{name:label,exact:true}).click();};
  const sample=async()=>{await page.evaluate(()=>task5QA.samples=[]);await page.waitForFunction(()=>task5QA.samples.length>=140);const rows=await page.evaluate(()=>task5QA.samples.slice(20));return {frame:summary(rows.map(r=>r.frame)),update:summary(rows.map(r=>r.update))};};
  try{
   await page.route('**/__task5-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated Task 5 save</title>'}));await page.goto(base+'/__task5-seed');
   await page.evaluate(async()=>{
    const [{createProfile,saveProfile},{createVirtualPcState,saveVirtualPcState},lyric,beat,vocal]=await Promise.all([import('/src/avatar-v3-profile.js?rev=41'),import('/src/virtual-pc-state.js?rev=41'),import('/src/lyric-production.js?rev=41'),import('/src/beat-production.js?rev=41'),import('/src/vocal-production.js?rev=41')]);
    const profile=createProfile({name:'Проверка доработок'});profile.skills.writing=60;if(!saveProfile(localStorage,profile).ok)throw Error('Profile save failed');
    let s=createVirtualPcState({power:'on',music:{needs:{satiety:100,energy:100}}});for(const id of ['client','ft','notebook'])s.software[id].installed=true;
    s=lyric.createLyric(s,{id:'text',name:'Сентябрьские строки'},{writing:10},()=>.3).state;
    for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=lyric.advanceLyricWork(lyric.startLyricWork(s,{projectId:'text'},{writing:10},()=>.5).state,180).state;}
    s=beat.createBeat(s,{id:'beat-0',name:'Старый дубль',gameDay:1},{},()=>.3).state;
    for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=beat.advanceBeatWork(beat.startBeatStage(s,'beat-0',undefined,{},()=>.5).state,180).state;}
    const template=structuredClone(s.projects.find(p=>p.id==='beat-0'));
    for(let i=1;i<20;i++)s.projects.push({...structuredClone(template),id:'beat-'+i,name:i===13?'Нужный двор':'Запасной бит '+i,createdDay:i+1});
    s.music.needs={satiety:100,energy:100};s=vocal.advanceVocalWork(vocal.startVocalWork(s,{beatId:'beat-0',textId:'text',kind:'draft'},{},()=>.2).state,180).state;s.music.needs={satiety:100,energy:100};
    if(!saveVirtualPcState(localStorage,s))throw Error('PC seed failed');localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:21,minutes:600,initialRest:false}));
   });
   await page.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));
   const enter=async()=>{await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await page.waitForFunction(()=>task5QA.phase==='room');await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=computer]').click();await desktop();};
   await page.goto(base);await enter();const frozen=await page.evaluate(()=>JSON.stringify(task5QA.state.projects.find(p=>p.id==='beat-0').recording));
   await open('Рэпблокнот');const notebook=page.locator('.pc-window[data-window-id="rap-notebook"]');
   await notebook.getByRole('button',{name:'Адаптировать под бит',exact:true}).click();const picker=notebook.getByRole('dialog');assert.equal(await picker.locator('[data-project-id]').count(),20);await shot('adapt-picker-all');
   const search=picker.getByRole('searchbox',{name:'Поиск проектов'});await search.fill('НУЖНЫЙ');await search.evaluate(n=>n.dataset.task5Probe='same');
   await page.evaluate(()=>{const pc=task5QA.pc;pc.syncHost({...pc.metadata,gameMinutes:pc.metadata.gameMinutes+1});pc.notebookView.update();});
   assert.equal(await search.inputValue(),'НУЖНЫЙ');assert.equal(await search.getAttribute('data-task5-probe'),'same');assert.equal(await search.evaluate(n=>document.activeElement===n),true);
   assert.equal(await picker.locator('[data-project-id]').count(),1);await shot('adapt-picker');
   const pickerPerf=await sample();await picker.locator('[data-project-id="beat-13"]').click();await page.waitForFunction(()=>task5QA.phase==='working');await desktop();
   assert.equal(await page.evaluate(()=>task5QA.state.projects.find(p=>p.id==='text').adaptation.beatId),'beat-13');
   await notebook.getByRole('button',{name:'Доработать',exact:true}).click();await page.waitForFunction(()=>task5QA.phase==='working');assert.equal(await page.locator('[data-work-role=stage]').textContent(),'Доработка текста');await shot('refine-working');
   const workPerf=await sample();await desktop();
   const refined=await page.evaluate(()=>{const p=task5QA.state.projects.find(p=>p.id==='text');return {revision:p.revision,refinementCount:p.refinementCount,adaptationCount:p.adaptationCount,history:p.revisionHistory.length};});
   assert.deepEqual(refined,{revision:3,refinementCount:1,adaptationCount:1,history:2});await shot('refine-complete');
   await page.reload();await enter();assert.equal(await page.evaluate(()=>task5QA.state.projects.find(p=>p.id==='text').revision),3);
   await open('FT Studio');const studio=page.locator('.pc-window[data-window-id="ft-studio"]');await studio.getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click();
   const projectSearch=studio.getByRole('searchbox',{name:'Поиск проектов'});await projectSearch.fill('Нужный');await studio.locator('[data-project-id="beat-13"]').click();
   await studio.getByRole('button',{name:'Добавить вокал',exact:true}).click();const texts=studio.getByRole('dialog');assert.equal(await texts.locator('[data-project-id]').count(),1);assert.match(await texts.locator('[data-project-id="text"]').innerText(),/v3/);await shot('vocal-picker');await texts.locator('[data-project-id="text"]').click();await page.waitForFunction(()=>task5QA.phase==='working');await desktop();
   const recording=await page.evaluate(()=>task5QA.state.projects.find(p=>p.id==='beat-13').recording);assert.equal(recording.text.id,'text');assert.equal(recording.text.revision,3);assert.equal(await page.evaluate(()=>JSON.stringify(task5QA.state.projects.find(p=>p.id==='beat-0').recording)),frozen);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('recording-current');
   for(const perf of [pickerPerf,workPerf]){assert.ok(perf.frame.p95<=25,'frame p95 '+JSON.stringify(perf));assert.ok(perf.update.p95<=20,'update p95 '+JSON.stringify(perf));}
   results.push({width,height,refined,recordingRevision:recording.text.revision,frozenRecordingUnchanged:true,picker:pickerPerf,working:workPerf});await writeFile(out+'/saved-'+width+'.json',JSON.stringify(await page.evaluate(()=>task5QA.state),null,2));console.log(JSON.stringify(results.at(-1)));
  }catch(error){await shot('failure');await writeFile(out+'/failure-'+width+'.json',JSON.stringify({error:error.stack,errors,body:await page.locator('body').innerText()},null,2));throw error;}finally{await context.close();}
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));console.log('PASS native twenty-beat search, adaptation/refinement, reload, latest vocal and frozen old take at 1280/1366/1920');
}finally{await browser.close();}
