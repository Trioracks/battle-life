import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/ft-beginner-20261010';await mkdir(output,{recursive:true});
const revision='21',browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);
await context.addInitScript(()=>{
 const raw=sessionStorage.getItem('ft-seed');if(raw){sessionStorage.removeItem('ft-seed');for(const [k,v]of Object.entries(JSON.parse(raw)))localStorage.setItem(k,JSON.stringify(v));}
});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\/(assets|stems)\//.test(new URL(r.url()).pathname))errors.push(r.status()+' '+r.url());});
const pc=page.locator('#virtual-pc'),ft=pc.locator('.pc-window[data-window-id="ft-studio"]'),dialog=ft.locator('[data-ft-role=dialog]');
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1')));
const shot=name=>page.screenshot({path:output+'/'+name+'.png'});
const phase=name=>page.waitForFunction(name=>document.querySelector('#virtual-pc').dataset.pcTransition===name,name);
const start=async name=>{await pc.getByRole('button',{name:'Пуск',exact:true}).click();await pc.locator('.pc-start-menu').getByRole('menuitem',{name,exact:true}).click();};
const enter=async()=>{await page.locator('#continue-game').click();if(await page.locator('#wake').isVisible())await page.locator('#wake').click();await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));await page.locator('#actions [data-action=computer]').click();await phase('desktop');};
const chooseSaved=async()=>{await start('FT Studio');await dialog.getByRole('button',{name:'Открыть проект',exact:true}).click();await dialog.getByRole('button',{name:/Первый двор ·/}).click();};
async function probe(){
 await page.evaluate(async()=>{
  const {BeatAudio}=await import('./src/beat-audio.js?rev=21');window.ftAudioLog=[];window.ftAudioInstance=null;
  const play=BeatAudio.prototype.playProject;
  BeatAudio.prototype.playProject=function(beat,options){window.ftAudioInstance=this;const row={name:beat.name,stage:options?.workStage??null};window.ftAudioLog.push(row);return play.call(this,beat,options).then(ok=>{Object.assign(row,{ok,ids:this.descriptor?.parts.map(p=>p.id),sources:this.sources.length});return ok;});};
 });
}
try{
 await page.goto('http://127.0.0.1:4173/?rev='+revision,{waitUntil:'networkidle'});
 await page.locator('#new-game').click();await page.locator('#character-name').fill('Проверка FT');await page.locator('#stats-tab').click();await page.locator('#distribute').click();await page.locator('#start-game').click();await page.locator('#wake').click();
 await page.evaluate(async revision=>{const {createVirtualPcState}=await import('./src/virtual-pc-state.js?rev='+revision);sessionStorage.setItem('ft-seed',JSON.stringify({'battle-life-virtual-pc-v1':createVirtualPcState({power:'on',download:{status:'installed'}}),'battle-life-apartment-v3-time':{day:2,minutes:600,initialRest:false}}));},revision);
 await page.reload({waitUntil:'networkidle'});await probe();await enter();await start('FT Studio');
 await dialog.getByRole('button',{name:'Новый бит',exact:true}).click();await dialog.getByRole('textbox',{name:'Название бита'}).fill('Первый двор');await dialog.getByRole('button',{name:'Начать проект',exact:true}).click();
 assert.equal(await ft.locator('select,input[type=range]').count(),0);
 await ft.getByRole('button',{name:'Работать над этапом',exact:true}).click();await phase('work-out');
 assert.equal((await saved()).music.job.elapsed,0,'camera departure does not charge work');await phase('working');
 await page.waitForFunction(()=>window.ftAudioLog.some(r=>r.stage===0&&r.ok));
 await shot('04-working-rhythm');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 const hiddenState=await saved(),count=await page.evaluate(()=>window.ftAudioLog.length);
 await page.waitForTimeout(200);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.evaluate(()=>window.ftAudioLog.length),count);assert.ok((await saved()).music.job.elapsed>=hiddenState.music.job.elapsed);
 await page.locator('.beat-work-hud').getByRole('button',{name:'Включить звук',exact:true}).click();
 await page.waitForFunction(()=>window.ftAudioLog.length>=2);await phase('desktop');assert.equal((await saved()).projects[0].stages.length,1);assert.equal(await ft.locator('[data-ft-role=clip]').count(),3);
 await ft.getByRole('button',{name:'Работать над этапом',exact:true}).click();await phase('working');
 await page.waitForFunction(()=>window.ftAudioLog.some(r=>r.stage===1&&r.ok));await page.waitForFunction(()=>document.querySelector('.beat-work-hud progress').value>.2);await shot('05-working-theme');
 await page.reload({waitUntil:'networkidle'});const interrupted=await saved();assert.ok(interrupted.music.job.elapsed>0&&interrupted.music.job.elapsed<interrupted.music.job.total);
 const ids=structuredClone(interrupted.projects[0]);await probe();await enter();await chooseSaved();await ft.getByRole('button',{name:'Продолжить этап',exact:true}).click();await phase('working');await phase('desktop');
 let state=await saved();assert.equal(state.projects[0].stages.length,2);assert.equal(state.music.practice,2);assert.equal(state.projects[0].drumId,ids.drumId);assert.deepEqual(state.projects[0].audio,ids.audio);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1'));s.music.needs={satiety:21,energy:72};sessionStorage.setItem('ft-seed',JSON.stringify({'battle-life-virtual-pc-v1':s}));});
 await page.reload({waitUntil:'networkidle'});await probe();await enter();await chooseSaved();await ft.getByRole('button',{name:'Работать над этапом',exact:true}).click();await phase('working');
 await page.waitForFunction(()=>window.ftAudioLog.some(r=>r.stage===2&&r.ok));
 await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle')&&document.body.dataset.mode==='game');
 state=await saved();assert.equal(state.projects[0].stages.length,2);assert.ok(state.music.job);assert.ok(state.music.needs.satiety<=20.00001);
 assert.equal(await page.evaluate(()=>window.ftAudioInstance.getSnapshot().status),'stopped');
 await page.locator('#actions [data-action=computer]').click();await page.getByText('Хочу поесть. Сейчас не могу работать.',{exact:true}).waitFor();await shot('06-hungry');
 await page.locator('#actions [data-action=stove]').click();await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));
 await page.locator('#actions [data-action=dining]').click();await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('idle'));
 await page.locator('#actions [data-action=computer]').click();await phase('desktop');await ft.getByRole('button',{name:'Продолжить этап',exact:true}).click();await phase('working');await phase('desktop');
 state=await saved();assert.equal(state.projects[0].status,'ready');assert.equal(state.music.practice,3);assert.equal(await ft.locator('[data-ft-role=clip]').count(),9);
 const startOffset=await ft.locator('[data-ft-role=clip]').first().evaluate(n=>n.getBoundingClientRect().left-n.parentElement.getBoundingClientRect().left);assert.ok(Math.abs(startOffset)<=1);
 await ft.getByRole('button',{name:'Развернуть окно',exact:true}).click();
 await ft.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.ftAudioLog.some(r=>r.stage===null&&r.ok&&r.sources===3));
 const playing=await page.evaluate(()=>window.ftAudioInstance.getSnapshot());assert.equal(playing.status,'playing');await shot('07-complete');
 await ft.getByRole('button',{name:'Pause',exact:true}).click();const paused=await page.evaluate(()=>window.ftAudioInstance.getSnapshot().positionSeconds);
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.ftAudioInstance.getSnapshot().positionSeconds),paused);
 await ft.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.ftAudioInstance.getSnapshot().status==='playing');
 await ft.getByRole('button',{name:'Stop',exact:true}).click();assert.equal(await page.evaluate(()=>window.ftAudioInstance.getSnapshot().positionSeconds),0);
 for(const width of [640,1280]){
  await page.setViewportSize({width,height:900});
  const library=ft.locator('[data-ft-role=library]'),rhythm=ft.locator('[data-ft-role=rhythm]'),wasHidden=await library.evaluate(n=>n.hidden);
  await ft.getByRole('button',{name:'Библиотека',exact:true}).click();assert.equal(await library.evaluate(n=>n.hidden),!wasHidden);
  await ft.getByRole('button',{name:'Ритм-панель',exact:true}).click();assert.equal(await rhythm.evaluate(n=>n.hidden),false);
  await ft.getByRole('button',{name:'Ритм-панель',exact:true}).click();assert.equal(await rhythm.evaluate(n=>n.hidden),true);
  for(const name of ['Play','Pause','Stop']){const box=await ft.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);}
  await shot('08-final-'+width);
 }
 const log=await page.evaluate(()=>window.ftAudioLog);assert.ok(log.filter(r=>r.stage!==null&&r.ok).every(r=>r.sources===1));assert.deepEqual(errors,[]);
 console.log('PASS three audible stages, hidden/re-enable, reload mid-stage, hunger/food/resume, 9 lanes, real transport, 640/1280. AUDIO '+JSON.stringify(log));
}catch(error){console.error('PAGE_ERRORS',errors);await shot('failure').catch(()=>{});throw error;}finally{await context.close();await browser.close();}
