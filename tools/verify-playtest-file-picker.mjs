import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {publicPreviewFixture} from '../test/helpers/public-preview-fixture.js';
export async function verifyFilePicker(page,{artifactUrl,outputDir}){
 await fs.mkdir(outputDir,{recursive:true});const address=new URL('__qa-picker',artifactUrl).href,checks=[];
 await page.route(address,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,">'+['virtual-pc','desktop-apps','rap-notebook-shell'].map(n=>'<link rel="stylesheet" href="'+artifactUrl+n+'.css">').join('')+'<style>body{margin:0}#root{position:fixed;inset:40px}</style><main id="root"></main>'}));
 for(const width of [1280,1536,1920]){
  await page.setViewportSize({width,height:width===1280?720:1080});await page.goto(address);
  await page.evaluate(async({base,seed})=>{const {mountBeatStudio}=await import(base+'src/beat-studio-view.js');window.installPicker=()=>{window.pickerView?.dispose();let state=JSON.parse(seed['battle-life-virtual-pc-v1']);window.pickerView=mountBeatStudio(document.querySelector('#root'),{getState:()=>state,getMetadata:()=>({skills:{}}),onChange:s=>{state=s;return true;},audio:{stop(){},getSnapshot(){return {};},capabilities:{recordedPlayback:false}}});};window.installPicker();},{base:artifactUrl,seed:publicPreviewFixture('beat')});
  const open=()=>page.getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click(),row=()=>page.getByRole('button',{name:'Выбрать: Preview beat.flp',exact:true});await open();
  const before=await row().boundingBox();await row().click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const after=await row().boundingBox();
  assert.ok(Math.abs(before.y-after.y)<.5,'Selecting a file must not move the second-click target: '+JSON.stringify({width,before,after}));
  await page.evaluate(()=>window.installPicker());await open();await row().dblclick({delay:100});await page.getByRole('button',{name:'Работать над битом',exact:true}).waitFor({state:'visible'});
  checks.push({width,firstClickShift:after.y-before.y,doubleClickDelay:100,opened:true});await page.screenshot({path:path.join(outputDir,'opened-'+width+'.png')});
 }
 await fs.writeFile(path.join(outputDir,'file-picker-report.json'),JSON.stringify({checks},null,2));return checks;
}
