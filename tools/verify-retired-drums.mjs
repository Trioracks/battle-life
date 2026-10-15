// Isolated browser QA: never loads or overwrites the player's saved game.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/bl001';
await mkdir(output+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=output+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
try{
 await page.route('**/__retired-drums',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/virtual-pc.css?rev=43"><link rel="stylesheet" href="/desktop-apps.css?rev=43"><style>body{margin:0}</style><section id="virtual-pc"></section>'}));
 const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175';await page.goto(base+'/__retired-drums');
 await page.evaluate(async()=>{
  const [ui,state,production]=await Promise.all(['virtual-pc-ui','virtual-pc-state','beat-production'].map(n=>import('/src/'+n+'.js?rev=43')));
  window.qa={state,production};window.pc=ui.mountVirtualPc(document.querySelector('#virtual-pc'));
  pc.showDesktop(state.createVirtualPcState({power:'on',download:{status:'installed'}}));pc.open('underweb');pc.navigateUnderweb('underweb://samples');
 });
 const market=page.locator('.beat-market');await market.getByText('Магазин пока пуст',{exact:true}).waitFor();
 assert.equal(await market.locator('.beat-cover').count(),0);assert.equal(await market.getByRole('button',{name:/Купить|Слушать|Получить через/}).count(),0);
 await page.screenshot({path:output+'/empty-shop.png'});
 await market.getByRole('button',{name:'Открыть RIPLINE',exact:true}).click();
 await page.getByText('Нет доступных источников',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Вырезать из ролика',exact:true}).count(),0);
 await page.evaluate(()=>{
  let s=qa.production.createBeat(pc.state,{id:'retired',name:'Архив — источник удалён'},{beatmaking:100},()=>0).state;
  s.projects[0].drumId='shop-01';s.projects[0].stages=Array.from({length:3},()=>({sliders:[5,5,5],fit:50,quality:30}));
  s=qa.state.createVirtualPcState(s);pc.syncState(s);pc.openProject(s.projects[0]);
 });
 await page.getByText(/старый луп удалён из игры/).waitFor();
 await page.screenshot({path:output+'/retired-project.png',animations:'disabled'});
 const result=await page.evaluate(async()=>{
  const {BeatAudio}=await import('/src/beat-audio.js?rev=43');
  let s=qa.production.createBeat(qa.state.createVirtualPcState(),{id:'current',name:'Новый авторский бит'},{beatmaking:100},()=>0).state;
  s=qa.production.advanceBeatWork(qa.production.startBeatStage(s,'current',[5,5,5],{beatmaking:100}).state,1000).state;
  const audio=new BeatAudio(),ok=await audio.playProject(s.projects[0]);
  const result={ok,error:audio.error,source:s.projects[0].drumId,voices:audio.sources.length};audio.dispose();return result;
 });
 assert.equal(result.ok,true,result.error);assert.match(result.source,/^beginner-drums-/);assert.equal(result.voices,1);
 assert.equal(requests.some(url=>url.includes('/stems/drums/')),false);
 for(const bank of ['free','shops'])for(let i=1;i<=(bank==='free'?5:10);i++){
  assert.equal((await page.request.get(base+'/stems/drums/'+bank+'/'+String(i).padStart(2,'0')+'.mp3')).status(),404);
 }
 assert.deepEqual(errors,[]);console.log('PASS empty shop/RIPLINE, retired FT warning, native authored-bank audio, 15 HTTP 404s, no retired audio requests');
}finally{await browser.close();}
