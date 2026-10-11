import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/ft-beginner-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/__beat-review-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/virtual-pc.css?rev=21"><link rel="stylesheet" href="/desktop-apps.css?rev=21"><section id="virtual-pc"></section>'}));
try{
 await page.goto('http://127.0.0.1:4173/__beat-review-fixture');
 await page.evaluate(async()=>{
  const [{mountVirtualPc},{createVirtualPcState},production,{createStudioProject}]=await Promise.all([import('/src/virtual-pc-ui.js?rev=21'),import('/src/virtual-pc-state.js?rev=21'),import('/src/beat-production.js?rev=21'),import('/src/ft-studio-project.js')]);
  let state=createVirtualPcState({power:'on',download:{status:'installed'}});state=production.createBeat(state,{id:'saved',name:'Сохранённый бит'},{}).state;
  state=production.startBeatStage(state,'saved',undefined,{}).state;state.music.infected=true;
  state.projects.push(createStudioProject({id:'old',name:'Архивный',battleId:'concrete-echo'}).project);
  state.projects.push({version:2,kind:'beat',id:'v2',name:'Прежний звук',genre:'boombap',bpm:90,drumId:'primitive',stages:[{sliders:[5,5,5],quality:38,fit:12}],status:'draft'});
  window.pc=mountVirtualPc(document.querySelector('#virtual-pc'));pc.showDesktop(state);pc.open('ft-studio');window.production=production;
 });
 const ft=page.locator('.pc-window[data-window-id="ft-studio"]'),dialog=ft.locator('[data-ft-role=dialog]');
 await dialog.waitFor();assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Новый бит');
 await page.evaluate(()=>{let s=production.advanceBeatWork(pc.state,9).state;s=production.restoreMusicNeeds(s,'meal');s=production.cleanMusicVirus(s).state;pc.syncState(s);});
 await dialog.getByRole('button',{name:'Открыть проект',exact:true}).click();
 const live=await page.evaluate(()=>pc.state.music);assert.equal(live.cash,4900);assert.equal(live.infected,false);assert.equal(live.needs.satiety,100);assert.equal(live.job.elapsed,9);
 await dialog.getByRole('button',{name:'Новый бит',exact:true}).click();await dialog.getByRole('textbox').fill('Не выбран');
 await page.evaluate(()=>pc.open('computer'));const explorer=page.locator('.pc-window[data-window-id="computer"]');await explorer.getByRole('button',{name:'Перейти: Мои проекты',exact:true}).click();await explorer.getByRole('button',{name:'Открыть проект Сохранённый бит',exact:true}).dblclick();
 assert.equal(await dialog.count(),0);await ft.getByRole('button',{name:'Продолжить этап',exact:true}).waitFor();
 await ft.getByRole('button',{name:'Новый бит',exact:true}).click();await dialog.getByRole('textbox').fill('Другой');
 await page.evaluate(()=>pc.open('computer'));await explorer.getByRole('button',{name:'Открыть проект Прежний звук',exact:true}).dblclick();
 assert.equal(await dialog.count(),0);assert.equal(await ft.locator('[data-ft-role=clip]').count(),3);
 await ft.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>pc.beatAudio.getSnapshot().status==='playing');
 assert.deepEqual(await page.evaluate(()=>({duration:pc.beatAudio.getSnapshot().durationSeconds,parts:pc.beatAudio.descriptor.parts.map(p=>p.id)})),{duration:16/3,parts:['primitive']});
 await page.evaluate(()=>pc.open('computer'));await explorer.getByRole('button',{name:'Открыть проект Архивный',exact:true}).dblclick();await ft.getByText('Открыт прежний проект: Архивный. Старые данные сохранены без изменений.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>pc.state.music.activeBeatId),null);
 await page.evaluate(()=>{
  let s=pc.state;for(let i=0;i<3;i++){s=production.restoreMusicNeeds(production.restoreMusicNeeds(s,'meal'),'sleep',360);s=production.startBeatStage(s,'saved',undefined,{}).state;s=production.advanceBeatWork(s,600).state;}pc.syncState(s);pc.openProject(s.projects.find(p=>p.id==='saved'));
 });
 await ft.getByRole('button',{name:'Развернуть окно',exact:true}).click();await page.screenshot({path:output+'/review-nine-lanes.png'});
 // A market preview must not masquerade as this project's transport.
 await page.evaluate(()=>pc.open('underweb'));const marketWindow=page.locator('.pc-window[data-window-id="underweb"]');
 await marketWindow.locator('.uw-bookmarks').getByRole('button',{name:'Базар',exact:true}).click();
 await marketWindow.getByRole('button',{name:'Слушать Архив / 01',exact:true}).click();
 await page.waitForFunction(()=>pc.beatAudio.getSnapshot().owner==='preview'&&pc.beatAudio.getSnapshot().status==='playing');
 await page.evaluate(()=>pc.open('ft-studio'));
 assert.equal(await ft.getByRole('button',{name:'Play',exact:true}).isEnabled(),true);
 assert.equal(await ft.getByRole('button',{name:'Pause',exact:true}).isEnabled(),false);
 assert.equal(await ft.locator('[data-ft-role=transport-status]').textContent(),'Готов к прослушиванию');
 assert.equal(await ft.locator('[data-ft-role=playhead]').evaluate(n=>n.style.left),'0%');
 await ft.getByRole('button',{name:'Play',exact:true}).click();
 await page.waitForFunction(()=>pc.beatAudio.getSnapshot().owner==='studio'&&pc.beatAudio.getSnapshot().status==='playing');
 assert.equal(await page.evaluate(()=>pc.beatAudio.sources.length),3);
 await ft.getByRole('button',{name:'Stop',exact:true}).click();
 // Delay a real decoder, then close FT before it resolves.
 await page.evaluate(async()=>{
  window.qaAudio=pc.beatAudio;qaAudio.cache.clear();await qaAudio.unlock();const decode=qaAudio.context.decodeAudioData.bind(qaAudio.context);
  const gate=new Promise(r=>window.releaseDecode=r);qaAudio.context.decodeAudioData=async bytes=>{window.decodePending=true;await gate;return decode(bytes);};
 });
 await ft.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>window.decodePending);await ft.getByRole('button',{name:'Закрыть окно',exact:true}).click();
 await page.evaluate(()=>releaseDecode());await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>qaAudio.sources.length),0);assert.equal(await page.evaluate(()=>qaAudio.getSnapshot().status),'stopped');
 const failures=await page.evaluate(async()=>{
  const {BeatAudio}=await import('/src/beat-audio.js?rev=27'),project=pc.state.projects.find(p=>p.id==='saved'),before=JSON.stringify(project);
  const denied=new BeatAudio({contextFactory:()=>({state:'suspended',resume:async()=>{},close(){}})});
  const deniedOK=await denied.playProject(project);denied.dispose();
  const missing=new BeatAudio({fetchFn:async()=>({ok:false})});const missingOK=await missing.playProject(project);const result={deniedOK,missingOK,unchanged:JSON.stringify(project)===before,sources:missing.sources.length};missing.dispose();return result;
 });assert.deepEqual(failures,{deniedOK:false,missingOK:false,unchanged:true,sources:0});
 const decoded=await page.evaluate(async()=>{
  const {BEGINNER_BANK}=await import('/src/beat-beginner-bank.js?rev=21'),context=new AudioContext(),result=[];
  for(const asset of BEGINNER_BANK){const response=await fetch(asset.path);if(!response.ok)throw Error(asset.path);const buffer=await context.decodeAudioData(await response.arrayBuffer());result.push({id:asset.id,frames:buffer.length,rate:buffer.sampleRate,duration:buffer.duration,channels:buffer.numberOfChannels});}
  await context.close();return result;
 });console.log('Decoded PCM',JSON.stringify(decoded[0]));assert.equal(decoded.length,45);assert.ok(decoded.every(b=>b.rate>0&&b.frames===Math.round(b.rate*32/3)&&b.channels===1&&Math.abs(b.duration-32/3)<1e-6));
 await page.evaluate(()=>pc.open('underweb'));const uw=page.locator('.pc-window[data-window-id="underweb"]');await uw.locator('.uw-bookmarks').getByRole('button',{name:'Базар',exact:true}).click();
 await uw.getByRole('button',{name:'Купить Архив / 01',exact:true}).click();const money=await page.evaluate(()=>pc.state.music.cash);assert.equal(money,4650);
 await uw.locator('.uw-bookmarks').getByRole('button',{name:'RIPLINE',exact:true}).click();await uw.getByRole('button',{name:'Установить RIPLINE',exact:true}).click();assert.equal(await page.evaluate(()=>pc.state.music.ripline),true);
 assert.deepEqual(errors,[]);console.log('PASS live state, Explorer v1/v2/v3, legacy audio, late decode after close, denied context, missing file, all 45 real WAVs, market/RIPLINE; '+output);
}finally{await browser.close();}
