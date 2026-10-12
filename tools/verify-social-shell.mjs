import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/package-one';
await mkdir(output+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=output+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__social-shell-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/desktop-apps.css?rev=37"><link rel="stylesheet" href="/social-network.css?rev=37"><style>html,body,#qa{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="qa"></div>'}));
 await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__social-shell-qa');
 await page.evaluate(async()=>{
  const [{mountUnderweb},{createVirtualPcState},{BeatAudio}]=await Promise.all([import('/src/underweb-view.js?rev=37'),import('/src/virtual-pc-state.js?rev=37'),import('/src/beat-audio.js?rev=37')]);
  let state=createVirtualPcState();window.socialQA={audio:new BeatAudio()};
  socialQA.view=mountUnderweb(document.getElementById('qa'),{getState:()=>state,getMetadata:()=>({gameDay:1,gameMinutes:600,playerName:'Новый голос'}),onChange:next=>{state=next;return true;},onApply:()=>{},audio:socialQA.audio});
 });
 for(const [width,height]of [[800,600],[1280,900],[1920,1080]]){
  await page.setViewportSize({width,height});
  for(const route of ['me','community/makarevich-1','groups','profile/sever']){
   await page.evaluate(route=>socialQA.view.navigate('underweb://social/'+route),route);
   assert.equal(await page.locator('[data-social-section]').count(),6);
   assert.equal(await page.locator('textarea,[contenteditable=true]').count(),0);
   await page.locator('.sn-content img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   await page.screenshot({path:output+'/social-'+width+'-'+route.replaceAll('/','-')+'.png'});
   const overflow=await page.evaluate(()=>{const p=document.querySelector('.uw-page');return p.scrollWidth>p.clientWidth+1;});
   assert.equal(overflow,false,route+' horizontal overflow at '+width);
  }
 }
 await page.evaluate(()=>socialQA.view.navigate('underweb://social/community/makarevich-1'));
 await page.getByRole('button',{name:'Подписаться',exact:true}).click();await page.getByRole('button',{name:'Вы подписаны',exact:true}).waitFor();
 await page.locator('[data-social-audio]').first().click();
 await page.waitForFunction(()=>socialQA.audio.status==='playing'||socialQA.audio.status==='error');
 assert.equal(await page.evaluate(()=>socialQA.audio.status),'playing');
 await page.getByRole('button',{name:'Мои фотографии',exact:true}).click();assert.equal(await page.evaluate(()=>socialQA.audio.status),'stopped');
 await page.evaluate(()=>{socialQA.view.dispose();socialQA.audio.dispose();});assert.deepEqual(errors,[]);
 console.log('PASS six-section navigation, subscriptions, private profiles, native background playback, route cancellation, three viewport widths');
}finally{await browser.close();}
