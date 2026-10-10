import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/__beat-review-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/virtual-pc.css?rev=20"><link rel="stylesheet" href="/desktop-apps.css?rev=20"><section id="virtual-pc"></section>'}));
try{
 await page.goto('http://127.0.0.1:4173/__beat-review-fixture');
 await page.evaluate(async()=>{
  const [{mountVirtualPc},{createVirtualPcState},production,{createStudioProject}]=await Promise.all([import('/src/virtual-pc-ui.js?rev=20'),import('/src/virtual-pc-state.js?rev=20'),import('/src/beat-production.js'),import('/src/ft-studio-project.js')]);
  let state=createVirtualPcState({power:'on',download:{status:'installed'}});state=production.createBeat(state,{id:'saved',name:'Сохранённый бит',genre:'boombap'},{}).state;
  state=production.startBeatStage(state,'saved',[5,5,5],{}).state;state.music.infected=true;
  state.projects.push(createStudioProject({id:'old',name:'Архивный',battleId:'concrete-echo'}).project);
  window.pc=mountVirtualPc(document.querySelector('#virtual-pc'));pc.showDesktop(state);pc.open('ft-studio');window.production=production;
 });
 const ft=page.locator('.pc-window[data-window-id="ft-studio"]');await ft.getByRole('button',{name:'Проекты',exact:true}).waitFor();
 await page.evaluate(()=>{let s=production.advanceBeatWork(pc.state,9).state;s=production.restoreMusicNeeds(s,'meal');s=production.cleanMusicVirus(s).state;pc.syncState(s);});
 await ft.getByRole('button',{name:'Проекты',exact:true}).click();
 const live=await page.evaluate(()=>pc.state.music);assert.equal(live.cash,4900);assert.equal(live.infected,false);assert.equal(live.needs.satiety,100);assert.equal(live.job.elapsed,9);
 await ft.getByRole('button',{name:'Новый бит',exact:true}).click();await ft.getByRole('textbox',{name:'Название бита'}).fill('Не выбран');
 await page.evaluate(()=>pc.open('computer'));const explorer=page.locator('.pc-window[data-window-id="computer"]');await explorer.getByRole('button',{name:'Перейти: Мои проекты',exact:true}).click();await explorer.getByRole('button',{name:'Открыть проект Сохранённый бит',exact:true}).dblclick();
 assert.equal(await ft.getByRole('textbox',{name:'Название бита'}).count(),0);await ft.getByRole('button',{name:'Продолжить этап',exact:true}).waitFor();
 await page.evaluate(()=>pc.open('computer'));await explorer.getByRole('button',{name:'Открыть проект Архивный',exact:true}).dblclick();await ft.getByText('Открыт прежний проект: Архивный. Старые данные сохранены без изменений.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>pc.state.music.activeBeatId),null);assert.equal(await ft.getByRole('button',{name:'Работать над этапом',exact:true}).count(),0);
 await page.screenshot({path:'D:/Codex/Builds/Battle/beat-production-20261009-01/review-fixes.png'});assert.deepEqual(errors,[]);console.log('PASS real DOM live-state navigation and Explorer opening v2/legacy projects; no page errors');
}finally{await browser.close();}
