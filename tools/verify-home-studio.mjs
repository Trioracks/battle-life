import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/home-studio-20261010';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/__home-studio-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/virtual-pc.css?rev=21"><link rel="stylesheet" href="/desktop-apps.css?rev=22"><section id="virtual-pc"></section>'}));
try{
 await page.goto('http://127.0.0.1:4173/__home-studio-fixture');
 await page.evaluate(async()=>{
  const [{mountVirtualPc},{createVirtualPcState},production]=await Promise.all([import('/src/virtual-pc-ui.js?rev=22'),import('/src/virtual-pc-state.js?rev=21'),import('/src/beat-production.js?rev=21')]);
  window.production=production;window.pc=mountVirtualPc(document.querySelector('#virtual-pc'));
  pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'}}));pc.syncHost({playerName:'QA',clockLabel:'12:00',gameDay:31,skills:{beatmaking:10}});pc.open('ft-studio');
 });
 const ft=page.locator('.pc-window[data-window-id="ft-studio"]'),dialog=ft.locator('[data-ft-role=dialog]');
 await dialog.getByRole('button',{name:'Новый бит',exact:true}).click();
 const input=dialog.getByRole('textbox',{name:'Название бита'}),random=dialog.getByRole('button',{name:'Случайное название'});
 await random.click();const first=await input.inputValue();assert.match(first,/^01\.10\.2012 — [А-Яа-яё]+ [А-Яа-яё]+$/u);
 await random.click();assert.notEqual(await input.inputValue(),first);
 const chosen=(await input.inputValue())+' демо';await input.fill(chosen);await dialog.getByRole('button',{name:'Начать проект',exact:true}).click();
 assert.equal(await page.locator('[data-pc-role=clock]').getAttribute('title'),'01.10.2012');
 await ft.getByRole('button',{name:'Развернуть окно',exact:true}).click();
 const names=['Drum Kit','Bass','Percussion','Lead','Atmosphere','Harmony','Sound Design','Sub Bass','FX'];
 for(let stage=0;stage<=3;stage++){
  assert.deepEqual(await ft.locator('[data-ft-role=track-label]').allTextContents(),stage?names.slice(0,stage*3):['Дорожка 01']);
  assert.equal(await ft.locator('[data-ft-role=clip]').count(),stage*3);
  assert.equal(await ft.locator('[data-ft-role=analytics] button').count(),0);
  const row=await ft.locator('[data-ft-role=project-actions]').boundingBox(),timeline=await ft.locator('.ft-timeline').boundingBox();assert.ok(row.y+row.height<=timeline.y);
  await page.screenshot({path:output+'/progressive-'+stage+'.png'});
  if(stage<3)await page.evaluate(()=>{
   let s=production.restoreMusicNeeds(production.restoreMusicNeeds(pc.state,'meal'),'sleep',360);
   s=production.startBeatStage(s,s.music.activeBeatId,undefined,{beatmaking:10}).state;s=production.advanceBeatWork(s,600).state;pc.syncState(s);
  });
 }
 for(const width of [640,1280]){
  await page.setViewportSize({width,height:900});
  for(const name of ['Новый бит','Открыть проект','Play','Pause','Stop']){const box=await ft.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width,name+' stays on screen');}
  await page.screenshot({path:output+'/polished-'+width+'.png'});
 }
 await ft.getByRole('button',{name:'Открыть проект',exact:true}).click();await dialog.getByRole('button',{name:chosen+' · готов',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Новый бит');
 assert.equal(await page.evaluate(()=>pc.state.projects[0].name),chosen);assert.deepEqual(errors,[]);
 console.log('PASS date, random/manual title flow, 1/3/6/9 lanes, top controls, factual sidebar, focus, 640/1280');
}finally{await browser.close();}
