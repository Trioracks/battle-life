import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4187',out='D:/Project/Battle/artifacts/v-krugu-qa/task-7-audio-exports';
assert.notEqual(new URL(base).port,'4173');await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const errors=[],results=[],shots=[];
let source=await readFile(new URL('../src/apartment-app.js',import.meta.url),'utf8');
const hook="window.exportQA={samples:[],sampling:false,get state(){return pcState},get pc(){return virtualPc},get phase(){return pcLifecycle.snapshot.phase},persist:next=>{const saved=persistPc(next,{atomic:true});virtualPc.syncState(pcState);return saved;}};";
source=source.replace("loading.hidden=true;setMode('menu');",hook+"loading.hidden=true;setMode('menu');").replace('last=now;update(dt,now);requestAnimationFrame(frame);','last=now;const qaStart=performance.now();update(dt,now);if(window.exportQA?.sampling)exportQA.samples.push({phase:pcLifecycle.snapshot.phase,frame:raw*1000,update:performance.now()-qaStart});requestAnimationFrame(frame);');
assert.ok(source.includes(hook));
const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/assets/'))errors.push(r.status()+' '+r.url());});
const shot=async name=>{const path=out+'/'+name+'.png';await page.screenshot({path});shots.push(path);};
const stats=values=>{const sorted=values.slice().sort((a,b)=>a-b);return {samples:sorted.length,p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};};
async function enter(){
 await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await page.waitForFunction(()=>document.querySelector('#apartment')&&!document.querySelector('#apartment').hidden);
 await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>exportQA.phase==='desktop');
}
async function openApp(name){const pc=page.locator('#virtual-pc');await pc.getByRole('button',{name:'Слобода',exact:true}).click();await pc.getByRole('menuitem',{name,exact:true}).click();}
async function fingerprint(filename){
 const computer=page.locator('.pc-window[data-window-id=computer]');await computer.getByRole('button',{name:'Открыть '+filename,exact:true}).dblclick();await page.waitForFunction(()=>exportQA.pc.beatAudio.status==='playing');
 return page.evaluate(()=>{
  const audio=exportQA.pc.beatAudio;
  const sources=audio.sources.map(source=>{const buffer=source.buffer;let hash=2166136261,peak=0,power=0,finite=true;for(let c=0;c<buffer.numberOfChannels;c++)for(const sample of buffer.getChannelData(c)){finite&&=Number.isFinite(sample);peak=Math.max(peak,Math.abs(sample));power+=sample*sample;hash=Math.imul(hash^Math.round(sample*2147483647),16777619)>>>0;}return {hash:hash.toString(16),peak,rms:Math.sqrt(power/(buffer.length*buffer.numberOfChannels)),finite,frames:buffer.length,channels:buffer.numberOfChannels};});
  audio.pause();return {sources,durationSeconds:audio.descriptor.durationSeconds,parts:audio.descriptor.parts.map(p=>({id:p.id,vocal:Boolean(p.vocal),songSection:p.songSection,windows:p.windows,sourceGainDb:p.sourceGainDb}))};
 });
}
try{
 await page.route('**/__export-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated export QA</title>'}));await page.goto(base+'/__export-seed');
 await page.evaluate(async()=>{
  const [{submissionFixture},{createProfile,saveProfile},{saveVirtualPcState},{startVocalWork,advanceVocalWork}]=await Promise.all([import('/test/helpers/submission-fixtures.js'),import('/src/avatar-v3-profile.js?rev=41'),import('/src/virtual-pc-state.js?rev=41'),import('/src/vocal-production.js?rev=41')]);
  let state=submissionFixture();state.projects.find(p=>p.id==='beat').recording.draft.seed=15;state.music.needs={satiety:100,energy:100};state=advanceVocalWork(startVocalWork(state,{beatId:'beat',kind:'mix'},{},()=>.4).state,1000).state;
  state.software.ft.installed=true;state.software.client.installed=true;state.music.needs={satiety:100,energy:100};state.phonePresentation={firstWakeAtMinute:0,announcedIds:['qa-existing']};
  if(!saveProfile(localStorage,createProfile({name:'Проверка экспорта'})).ok||!saveVirtualPcState(localStorage,state))throw Error('QA seed failed');
  localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:2,minutes:60,initialRest:false}));
 });
 await page.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));await page.goto(base);await enter();
 console.log('Native host desktop entered');await openApp('FT Studio');const studio=page.locator('.pc-window[data-window-id=ft-studio]');await studio.getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click();await studio.getByRole('button',{name:/^Работа ·.*готов$/}).click();
 for(const kind of ['beat','vocal','track']){
  await studio.getByRole('button',{name:'Экспорт',exact:true}).click();const dialog=studio.getByRole('dialog',{name:'Экспорт аудиофайла'});await dialog.getByLabel('Вид аудиофайла',{exact:true}).selectOption(kind);await dialog.getByLabel('Имя аудиофайла',{exact:true}).fill(kind+'.wav');
  if(kind==='track')await shot('export-dialog-1280');await dialog.getByRole('button',{name:'Сохранить аудиофайл'}).click();await dialog.waitFor({state:'detached'});
 }
 console.log('All three exports saved');const saved=await page.evaluate(()=>({files:structuredClone(exportQA.state.audioExports),versions:structuredClone(exportQA.state.trackVersions),presentation:structuredClone(exportQA.state.phonePresentation)}));assert.equal(saved.files.files.length,3);assert.ok(saved.files.files.find(f=>f.kind==='track').createdAtMinute>=1500);
 await studio.getByRole('button',{name:'Экспорт',exact:true}).click();const duplicate=studio.getByRole('dialog');await duplicate.getByLabel('Имя аудиофайла',{exact:true}).fill('TRACK.WAV');await duplicate.getByRole('button',{name:'Сохранить аудиофайл'}).click();await duplicate.getByRole('status').filter({hasText:'уже существует'}).waitFor();await shot('collision-1280');await duplicate.getByRole('button',{name:'Отмена',exact:true}).click();
 await openApp('Мой компьютер');let computer=page.locator('.pc-window[data-window-id=computer]');await computer.getByLabel('Адрес папки',{exact:true}).fill('C:\\Мои документы\\Музыка\\Экспорт');await computer.getByLabel('Адрес папки',{exact:true}).press('Enter');
 const audioBefore={};for(const kind of ['beat','vocal','track'])audioBefore[kind]=await fingerprint(kind+'.wav');
 assert.ok(audioBefore.beat.parts.some(p=>p.songSection));assert.ok(audioBefore.beat.parts.every(p=>!p.vocal));assert.ok(audioBefore.vocal.parts.every(p=>p.vocal));
 for(const evidence of Object.values(audioBefore))assert.ok(evidence.sources.every(s=>s.finite&&s.peak>0&&s.rms>0));
 await shot('explorer-playing-1280');
 // Edit the actual saved source, then delete it; exports must remain playable.
 await page.evaluate(()=>{const next=structuredClone(exportQA.state),beat=next.projects.find(p=>p.id==='beat');beat.recording.draft.seed+=999;beat.mix.layers[0].quality=100;if(!exportQA.persist(next))throw Error('edit save');next.projects=[];if(!exportQA.persist(next))throw Error('delete save');});
 assert.deepEqual(await page.evaluate(()=>exportQA.state.audioExports),saved.files);await page.reload();await enter();await openApp('Мой компьютер');computer=page.locator('.pc-window[data-window-id=computer]');await computer.getByLabel('Адрес папки',{exact:true}).fill('C:\\Мои документы\\Музыка\\Экспорт');await computer.getByLabel('Адрес папки',{exact:true}).press('Enter');
 const audioAfter={};for(const kind of ['beat','vocal','track'])audioAfter[kind]=await fingerprint(kind+'.wav');assert.deepEqual(audioAfter,audioBefore);console.log('Immutable native PCM playback verified after edit/delete/reload');
 assert.deepEqual(await page.evaluate(()=>exportQA.state.audioExports),saved.files);for(const [id,version]of Object.entries(saved.versions.byId))assert.deepEqual(await page.evaluate(id=>exportQA.state.trackVersions.byId[id],id),version);
 assert.ok((await page.evaluate(()=>exportQA.state.phonePresentation.announcedIds)).includes('qa-existing'));assert.equal(await page.evaluate(()=>exportQA.state.projects.length),0);
 for(const [width,height]of [[1280,720],[1366,768],[1920,1080]]){
  await page.setViewportSize({width,height});await computer.getByRole('button',{name:'Открыть track.wav',exact:true}).dblclick();await page.waitForFunction(()=>exportQA.pc.beatAudio.status==='playing');
  await page.evaluate(()=>{exportQA.samples=[];exportQA.sampling=true;});await page.waitForFunction(()=>exportQA.samples.length>=150);const rows=await page.evaluate(()=>{exportQA.sampling=false;return exportQA.samples.slice(20);});
  const result={width,height,frame:stats(rows.map(s=>s.frame)),update:stats(rows.map(s=>s.update))};results.push(result);console.log('Native profile '+JSON.stringify(result));await shot('reload-playback-'+width);assert.ok(result.frame.p95<=25,'native frame p95 <=25ms');assert.ok(result.update.p95<=20,'native update p95 <=20ms');
  const bounds=await page.evaluate(()=>[...document.querySelectorAll('.pc-window:not([hidden])')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));for(const r of bounds)assert.ok(r.x>=0&&r.y>=0&&r.right<=width+1&&r.bottom<=height-31);
 }
 await computer.getByRole('button',{name:'Закрыть окно',exact:true}).click();assert.equal(await page.evaluate(()=>exportQA.pc.beatAudio.status),'stopped');assert.deepEqual(errors,[]);
 const result={passed:true,audioEvidence:'Real Web Audio playback and processed source PCM fingerprints; no human listening or Windows WAV export performed.',audioBefore,audioAfter,performance:results,shots,errors};await writeFile(out+'/evidence.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){await shot('failure');await writeFile(out+'/failure.json',JSON.stringify({error:error.stack,errors,results,host:await page.evaluate(()=>({phase:window.exportQA?.phase,text:document.body.innerText.slice(-4500)}))},null,2));throw error;}finally{await context.close();await browser.close();}
