// Each scenario uses a fresh browser context; existing user saves are untouched.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.TORRENT_QA_DIR||'D:/Codex/Builds/Battle/torrent-routing';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const errors=[],frame=(page,id)=>page.locator('.pc-window[data-window-id="'+id+'"]');
async function fixture(state){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__torrent-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/virtual-pc.css"><link rel="stylesheet" href="/desktop-apps.css"><main id="virtual-pc" style="position:fixed;inset:0"></main>'}));
 await page.goto('http://127.0.0.1:4173/__torrent-fixture');
 await page.evaluate(async state=>{
  const [{mountVirtualPc},{createVirtualPcState}]=await Promise.all([import('/src/virtual-pc-ui.js'),import('/src/virtual-pc-state.js')]);
  const audio={stop(){},dispose(){},unlock:async()=>true};window.pc=mountVirtualPc(document.querySelector('main'),{audio,beatAudio:audio});pc.showDesktop(createVirtualPcState({power:'on',lastGameMinute:0,...state}));
 },state);return {context,page};
}
try{
 for(const [id,topic,file,archive]of [['ft','ft-studio','FT-Studio.torrent','FT-Studio-setup.zip'],['notebook','notebook','Rap-Notebook.torrent','Rap-Notebook-setup.exe']]){
  const {context,page}=await fixture({software:{client:{installed:true}}});
  try{
   await page.evaluate(topic=>{pc.open('torent');pc.windowAction({type:'minimize',id:'torent'});pc.open('underweb');pc.navigateUnderweb('underweb://dump/'+topic);},topic);
   await frame(page,'underweb').getByRole('button',{name:'Скачать '+file,exact:true}).click();
   assert.deepEqual(await page.evaluate(()=>({active:pc.window,task:pc.state.software.task.appId,mode:pc.windows.windows.find(w=>w.id==='torent').mode,focus:pc.focusScope().contains(document.activeElement)})),{active:'torent',task:id,mode:'normal',focus:true});
   assert.ok((await frame(page,'torent').textContent()).includes(archive));
   await frame(page,'torent').getByRole('button',{name:'Ⅱ Пауза',exact:true}).click();
   await page.evaluate(topic=>{pc.open('underweb');pc.navigateUnderweb('underweb://dump/'+topic);},topic);
   await frame(page,'underweb').getByRole('button',{name:'Открыть '+file,exact:true}).click();assert.equal(await page.evaluate(()=>pc.state.software.task.paused),true);
   await frame(page,'torent').getByRole('button',{name:'▶ Продолжить',exact:true}).click();
   await page.screenshot({path:output+'/'+id+'-client-routing.png'});console.log('PASS '+id+' metadata automatically restores/focuses client; duplicate preserves pause; resume works');
  }finally{await context.close();}
 }
 {
  const {context,page}=await fixture({});try{
   await page.evaluate(()=>{pc.open('underweb');pc.navigateUnderweb('underweb://dump/notebook');});await frame(page,'underweb').getByRole('button',{name:'Скачать Rap-Notebook.torrent',exact:true}).click();
   assert.deepEqual(await page.evaluate(()=>({active:pc.window,task:pc.state.software.task,metadata:pc.state.software.notebookMetadata})),{active:'underweb',task:null,metadata:true});assert.ok((await frame(page,'underweb').textContent()).includes('Сначала скачай и установи torent'));
   await page.evaluate(()=>{pc.open('computer');pc.openFolder('downloads');});await frame(page,'computer').getByRole('button',{name:'Открыть Rap-Notebook.torrent',exact:true}).dblclick();
   assert.equal(await page.evaluate(()=>pc.state.software.task),null);await page.screenshot({path:output+'/notebook-client-required.png'});console.log('PASS missing client retains notebook torrent; forum and Downloads explain prerequisite');
  }finally{await context.close();}
 }
 {
  const {context,page}=await fixture({software:{client:{installed:true},notebook:{receivedBytes:4000000},installer:{appId:'notebook',step:'install',elapsedSeconds:4}}});try{
   await frame(page,'installer').getByRole('button',{name:'Свернуть окно',exact:true}).click();await page.evaluate(()=>{pc.open('underweb');pc.navigateUnderweb('underweb://dump/ft-studio');});await frame(page,'underweb').getByRole('button',{name:'Скачать FT-Studio.torrent',exact:true}).click();
   await page.evaluate(async()=>{const {advanceInstallation}=await import('/src/pc-software.js');pc.syncState(advanceInstallation(pc.state,6).state);});
   assert.deepEqual(await page.evaluate(()=>({active:pc.window,task:pc.state.software.task.appId,installed:pc.state.software.notebook.installed,mode:pc.windows.windows.find(w=>w.id==='installer').mode})),{active:'torent',task:'ft',installed:true,mode:'minimized'});console.log('PASS torrent handoff preserves minimized background installation through completion');
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);console.log('PASS zero browser page errors');
}finally{await browser.close();}
