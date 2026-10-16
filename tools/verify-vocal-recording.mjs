import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output='D:/Codex/Builds/Battle/vocal-recording';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\/(assets|src)\//.test(new URL(r.url()).pathname))errors.push(r.status()+' '+r.url());});
await context.addInitScript(()=>{const raw=sessionStorage.getItem('vocal-seed');if(raw){sessionStorage.removeItem('vocal-seed');for(const [k,v]of Object.entries(JSON.parse(raw)))localStorage.setItem(k,JSON.stringify(v));}});
const pc=page.locator('#virtual-pc'),ft=pc.locator('.pc-window[data-window-id="ft-studio"]'),dialog=ft.locator('[data-ft-role=dialog]');
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1')));
const phase=name=>page.waitForFunction(n=>document.querySelector('#virtual-pc').dataset.pcTransition===n,name);
const shot=name=>page.screenshot({path:output+'/'+name+'.png'});
async function enter(){await page.locator('#continue-game').click();if(await page.locator('#wake').isVisible())await page.locator('#wake').click();await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));await page.locator('#actions [data-action=computer]').click();await phase('desktop');}
async function open(){await pc.getByRole('button',{name:'Пуск',exact:true}).click();await pc.locator('.pc-start-menu').getByRole('menuitem',{name:'FT Studio',exact:true}).click();await dialog.getByRole('button',{name:'Открыть проект',exact:true}).click();await dialog.getByRole('button',{name:/Вокальный тест ·/}).click();}
async function probe(){await page.evaluate(async()=>{const {BeatAudio}=await import('/src/beat-audio.js?rev=33');window.vocalAudioLog=[];const play=BeatAudio.prototype.playProject;BeatAudio.prototype.playProject=function(b,o){window.vocalAudio=this;return play.call(this,b,o).then(ok=>{window.vocalAudioLog.push({ok,owner:this.descriptor?.owner,parts:this.descriptor?.parts,sources:this.sources.length});return ok;});};});}
async function work(kind){
 await phase('working');await page.waitForFunction(()=>window.vocalAudioLog.some(r=>r.ok&&r.owner==='work'&&r.sources===4));
 if(kind==='draft'){
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await shot('01-recording-work');
  await page.evaluate(async()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await page.locator('.beat-work-hud').getByRole('button',{name:'Включить звук',exact:true}).click();
 }
 await phase('desktop');const s=await saved();assert.equal(s.recording.job,null);assert.ok(s.projects.find(p=>p.id==='vocal-test').recording[kind]);
}
try{
 await page.goto('http://127.0.0.1:4173/?rev=31',{waitUntil:'networkidle'});await page.locator('#new-game').click();await page.locator('#character-name').fill('Проверка вокала');await page.locator('#clothing-tab').click();await page.locator('#start-game').click();await page.locator('#wake').click();
 await page.evaluate(async()=>{
  const [{createVirtualPcState},{createBeat,startBeatStage,advanceBeatWork},{createLyric,startLyricWork,advanceLyricWork}]=await Promise.all([import('/src/virtual-pc-state.js?rev=33'),import('/src/beat-production.js?rev=33'),import('/src/lyric-production.js?rev=33')]);
  let s=createVirtualPcState({power:'on',download:{status:'installed'}});s=createBeat(s,{id:'vocal-test',name:'Вокальный тест'},{},()=>.999).state;
  for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'vocal-test',undefined,{},()=>.6).state,1000).state;}
  s=createLyric(s,{id:'words',name:'Осенний двор'},{}).state;for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceLyricWork(startLyricWork(s,{projectId:'words',kind:'stage'},{}).state,1000).state;}
  s.music.needs={satiety:100,energy:100};sessionStorage.setItem('vocal-seed',JSON.stringify({'battle-life-virtual-pc-v1':s,'battle-life-apartment-v3-time':{day:2,minutes:600,initialRest:false}}));
 });
 await page.reload({waitUntil:'networkidle'});await probe();await enter();await open();
 await ft.getByRole('button',{name:'Добавить вокал',exact:true}).click();await dialog.getByRole('button',{name:'Осенний двор',exact:true}).click();await work('draft');
 assert.equal(await ft.locator('[data-ft-role=track-label]').count(),10);await shot('02-draft');
 await ft.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.vocalAudio.getSnapshot().status==='playing'&&window.vocalAudio.sources.length===4);
 await ft.getByRole('button',{name:'Pause',exact:true}).click();const pos=await page.evaluate(()=>window.vocalAudio.getSnapshot().positionSeconds);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.vocalAudio.getSnapshot().positionSeconds),pos);
 await ft.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.vocalAudio.getSnapshot().status==='playing');await ft.getByRole('button',{name:'Stop',exact:true}).click();assert.equal(await page.evaluate(()=>window.vocalAudio.getSnapshot().positionSeconds),0);
 for(const [kind,label]of [['clean','Записать чистовую'],['mix','Свести'],['master','Мастеринг']]){await ft.getByRole('button',{name:label,exact:true}).click();await work(kind);}
 assert.equal(await ft.locator('[data-ft-role=track-label]').count(),11);assert.equal(await ft.locator('.ft-lane[data-muted=true]').count(),1);
 await shot('03-mastered');const final=await saved();await writeFile(output+'/saved-fixture.json',JSON.stringify(final,null,2));
 for(const width of [640,1280]){await page.setViewportSize({width,height:900});await shot('04-final-'+width);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1);}
 await page.reload({waitUntil:'networkidle'});await probe();await enter();await open();assert.deepEqual((await saved()).projects.find(p=>p.id==='vocal-test').recording,final.projects.find(p=>p.id==='vocal-test').recording);assert.equal(await ft.locator('.ft-lane[data-muted=true]').count(),1);
 await ft.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.vocalAudio.getSnapshot().status==='playing');assert.equal(await page.evaluate(()=>window.vocalAudio.descriptor.parts.at(-1).vocal.kind),'clean');
 assert.deepEqual(errors,[]);await writeFile(output+'/browser-evidence.json',JSON.stringify({passed:true,errors,recording:final.projects[0].recording,practice:final.recording.practice},null,2));console.log('PASS actual app: text picker, four work stages/audio, hidden re-enable, 11 lanes + OFF, transport, reload, 640/1280.');
}catch(error){console.error('PAGE_ERRORS',errors);await shot('failure').catch(()=>{});throw error;}finally{await context.close();await browser.close();}
