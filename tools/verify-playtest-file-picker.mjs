import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {publicPreviewFixture} from '../test/helpers/public-preview-fixture.js';
import {savePcDocument} from '../src/pc-filesystem.js';
export async function verifyFilePicker(page,{artifactUrl,outputDir}){
 await fs.mkdir(outputDir,{recursive:true});const address=new URL('__qa-picker',artifactUrl).href,checks=[];
 await page.route(address,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,">'+['virtual-pc','desktop-apps','rap-notebook','rap-notebook-shell'].map(n=>'<link rel="stylesheet" href="'+artifactUrl+n+'.css">').join('')+'<style>body{margin:0}#virtual-pc{position:fixed;inset:0}#root{position:absolute;inset:40px}</style><section id="virtual-pc"><main id="root"></main></section>'}));
 for(const width of [1280,1536,1920]){
  await page.setViewportSize({width,height:width===1280?720:1080});await page.goto(address);
  await page.evaluate(async({base,seed})=>{const {mountBeatStudio}=await import(base+'src/beat-studio-view.js');window.installPicker=()=>{window.pickerView?.dispose();let state=JSON.parse(seed['battle-life-virtual-pc-v1']);window.pickerView=mountBeatStudio(document.querySelector('#root'),{getState:()=>state,getMetadata:()=>({skills:{}}),onChange:s=>{state=s;return true;},audio:{stop(){},getSnapshot(){return {};},capabilities:{recordedPlayback:false}}});};window.installPicker();},{base:artifactUrl,seed:publicPreviewFixture('beat')});
  const open=()=>page.getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click(),row=()=>page.getByRole('button',{name:'Выбрать: Preview beat.flp',exact:true});await open();
  const before=await row().boundingBox();await row().click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const after=await row().boundingBox();
  assert.ok(Math.abs(before.y-after.y)<.5,'Selecting a file must not move the second-click target: '+JSON.stringify({width,before,after}));
  await page.evaluate(()=>window.installPicker());await open();await row().dblclick({delay:100});await page.getByRole('button',{name:'Работать над битом',exact:true}).waitFor({state:'visible'});
  checks.push({width,firstClickShift:after.y-before.y,doubleClickDelay:100,opened:true});await page.screenshot({path:path.join(outputDir,'opened-'+width+'.png')});
  await page.getByRole('button',{name:'Сохранить как',exact:true}).click();const savePicker=page.getByRole('dialog',{name:'Сохранить как',exact:true});await savePicker.getByRole('button',{name:'Создать папку',exact:true}).click();const rename=savePicker.getByRole('textbox',{name:'Имя новой папки',exact:true});await rename.waitFor();
  const selected=await rename.evaluate(n=>({focused:document.activeElement===n,start:n.selectionStart,end:n.selectionEnd,length:n.value.length}));assert.equal(selected.focused,true);assert.equal(selected.start,0);assert.equal(selected.end,selected.length);await page.screenshot({path:path.join(outputDir,'new-folder-rename-'+width+'.png')});
  await rename.fill('Мои биты');await rename.press('Enter');await savePicker.getByRole('button',{name:'Открыть папку Мои биты',exact:true}).dblclick();assert.ok((await savePicker.getByRole('textbox',{name:'Адрес папки файла',exact:true}).inputValue()).endsWith('Мои биты'));await savePicker.getByRole('textbox',{name:'Имя файла',exact:true}).fill('Новый проект.flp');await savePicker.getByRole('button',{name:'Сохранить',exact:true}).click();await savePicker.waitFor({state:'detached'});checks.push({width,inlineRename:true,selected,saveIntoNewFolder:true});
 }
 const filename='Long word '.repeat(10)+'.txt',seed=publicPreviewFixture('lyrics'),saved=savePcDocument(JSON.parse(seed['battle-life-virtual-pc-v1']),{projectId:'preview-lyrics',folderId:'downloads',filename,nowMinute:600});assert.equal(saved.ok,true);
 await page.setViewportSize({width:1280,height:720});await page.goto(address);
 await page.evaluate(async({base,state})=>{const {mountRapNotebook}=await import(base+'src/rap-notebook-view.js');window.pickerView=mountRapNotebook(document.querySelector('#root'),{getState:()=>state,getMetadata:()=>({skills:{},gameMinutes:600}),onChange:s=>{state=s;return true;}});},{base:artifactUrl,state:saved.state});
 await page.getByRole('button',{name:'Открыть текст',exact:true}).click();await page.getByRole('button',{name:'Выбрать: '+filename,exact:true}).click();await page.keyboard.press('Tab');
 const details=page.locator('.pc-picker-details'),info=await details.evaluate(n=>({focused:document.activeElement===n,height:n.clientHeight,scrollHeight:n.scrollHeight,lineHeight:getComputedStyle(n).lineHeight}));assert.equal(info.focused,true,'Selected details must join the keyboard cycle');assert.ok(info.scrollHeight<=info.height+1,'Two-line file details must fit without clipping');
 await details.press('End');await page.screenshot({path:path.join(outputDir,'notebook-long-name.png')});checks.push({notebookLongName:true,...info});
 for(const [width,height]of [[1280,720],[1536,1024],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto(address);
  await page.evaluate(async base=>{const m=Object.assign({},...await Promise.all(['virtual-pc-state','virtual-pc-ui','lyric-production'].map(n=>import(base+'src/'+n+'.js'))));let state=m.createLyric(m.createVirtualPcState({power:'on'}),{id:'ready',name:'Не переключай'}).state;for(let i=0;i<3;i++){state.music.needs={satiety:100,energy:100};state=m.advanceLyricWork(m.startLyricWork(state,{projectId:'ready'},{writing:10},()=>.4).state,1000).state;}state.software.notebook.installed=true;const pc=m.mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:()=>true});pc.showDesktop(state);pc.syncHost({skills:{writing:10},gameDay:1,gameMinutes:600});pc.open('rap-notebook');window.qaPickerPc=pc;},artifactUrl);
  for(const mode of ['maximized','normal',...(width===1280?['narrow']:[])]){
   if(mode==='normal')await page.locator('.pc-window[data-window-id="rap-notebook"]').getByRole('button',{name:'Восстановить окно',exact:true}).click();
   if(mode==='narrow')await page.evaluate(()=>window.qaPickerPc.windowAction({type:'geometry',id:'rap-notebook',rect:{x:100,y:0,width:500,height:650}}));
   const actions=await page.locator('.rn-actions button').evaluateAll(nodes=>nodes.map(n=>{const a=n.getBoundingClientRect(),b=n.closest('.rn-work').getBoundingClientRect();return {label:n.getAttribute('aria-label'),width:a.width,height:a.height,left:a.left,right:a.right,sideLeft:b.left,sideRight:b.right};}));
   await page.screenshot({path:path.join(outputDir,'notebook-actions-'+width+'-'+mode+'.png')});assert.equal(actions.length,2);assert.ok(actions.every(a=>a.height<=34&&a.width<170&&a.left>=a.sideLeft&&a.right<=a.sideRight),'Notebook actions must remain compact and inside the right panel: '+JSON.stringify(actions));checks.push({width,mode,notebookActions:actions});
  }
 }
 await fs.writeFile(path.join(outputDir,'file-picker-report.json'),JSON.stringify({checks},null,2));return checks;
}
