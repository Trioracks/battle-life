import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core'),out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__text-mix-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/rap-notebook.css?rev=39"><style>body{margin:0;height:100vh}main{height:100vh}</style><main></main>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__text-mix-qa');
 await page.evaluate(async()=>{
  const [lyrics,{createVirtualPcState},{mountRapNotebook},{submissionFixture},{captureTrackVersion}]=await Promise.all([import('/src/lyric-production.js?rev=39'),import('/src/virtual-pc-state.js?rev=39'),import('/src/rap-notebook-view.js?rev=39'),import('/test/helpers/submission-fixtures.js'),import('/src/track-version.js?rev=39')]);
  window.qa={lyrics,createVirtualPcState,mountRapNotebook};qa.frozen=captureTrackVersion(submissionFixture(),{projectId:'beat',nowMinute:600});qa.old=JSON.stringify(qa.frozen.state.trackVersions);
  qa.setup=practice=>{qa.view?.dispose();qa.state=lyrics.createLyric(createVirtualPcState(),{id:'text',name:'Проверка содержания'},{writing:24},()=>.3).state;qa.state.writing.practice=practice;qa.mount();};
  qa.mount=()=>{qa.view=mountRapNotebook(document.querySelector('main'),{getState:()=>qa.state,getMetadata:()=>({skills:{writing:24},gameDay:1}),onChange:s=>{qa.state=createVirtualPcState(s);localStorage.setItem('mix-fixture',JSON.stringify(qa.state));},onWork:()=>true});};
 });
 for(const [width,height]of [[800,600],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa.setup(0));assert.equal(await page.locator('[data-content-mix-key]').count(),0);await page.screenshot({path:out+'/text-mix-'+width+'-24.png'});
  await page.evaluate(()=>qa.setup(1));assert.equal(await page.locator('[data-content-mix-key]').count(),3);
  const slider=page.getByRole('slider',{name:'Доля: Тема'});await slider.fill('80');await slider.dispatchEvent('change');
  assert.equal(await page.locator('[data-content-mix-key]').evaluateAll(nodes=>nodes.reduce((n,e)=>n+Number(e.value),0)),100);assert.equal(await page.evaluate(()=>qa.state.projects[0].contentMix.topic),80);
  await page.screenshot({path:out+'/text-mix-'+width+'-25.png'});
  await page.getByRole('button',{name:'Начать писать',exact:true}).click();assert.equal(await page.locator('[data-content-mix-key]').count(),0);
  await page.evaluate(()=>{qa.view.dispose();qa.state=qa.createVirtualPcState(JSON.parse(localStorage.getItem('mix-fixture')));qa.mount();});assert.equal(await page.locator('[data-content-mix-key]').count(),0);
  assert.equal(await page.evaluate(()=>qa.state.projects[0].contentMix.topic),80);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(qa.createVirtualPcState(qa.frozen.state).trackVersions)===qa.old),true);assert.deepEqual(errors,[]);
 console.log('PASS native writing24/25 by practice, conserved sliders, frozen-on-start/reload, archived version at 800/1280/1920');
}finally{await browser.close();}
