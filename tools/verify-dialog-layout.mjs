import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {validateQaOptions} from './public-preview-qa-options.mjs';
import {startPreviewServer} from './serve-preview.mjs';

export async function verifyDialogLayout(options={}){
 const qa=await validateQaOptions(options),server=await startPreviewServer({root:qa.root,port:0}),{chromium}=await import('playwright'),browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));await fs.mkdir(qa.outputDir,{recursive:true});
 const base=server.url,url=new URL('__qa-dialog-layout',base).href;
 await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,">'+['virtual-pc','desktop-apps','rap-notebook','rap-notebook-shell','social-network','social-dialogs','social-community'].map(n=>'<link rel="stylesheet" href="'+base+n+'.css">').join('')+'<style>html,body{margin:0;height:100%;overflow:hidden}#virtual-pc{position:fixed;inset:0;display:block}</style><section id="virtual-pc"></section>'}));
 try{
  for(const [width,height,mode]of [[1280,720,'maximized'],[1536,1024,'maximized'],[1920,1080,'maximized'],[1280,720,'normal'],[1536,1024,'normal'],[1920,1080,'normal']]){
   const label=width+'-'+mode;
   await page.setViewportSize({width,height});await page.goto(url);
   await page.evaluate(async base=>{const m=Object.assign({},...await Promise.all(['virtual-pc-ui','virtual-pc-state','goblin-mentor'].map(n=>import(base+'src/'+n+'.js'))));let state=m.advanceGoblin(m.advanceGoblin(m.createVirtualPcState({power:'on'}),0).state,21).state;state=m.replyToGoblin(state,'normal',21).state;state=m.advanceGoblin(state,80).state;const pc=m.mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:()=>true});pc.showDesktop(state);pc.syncHost({playerName:'Игрок',gameDay:1,gameMinutes:80});pc.open('underweb');pc.navigateUnderweb('underweb://social/dialog/mak-npc-06');window.dialogLayoutQA=pc;},base);
   await page.evaluate(mode=>{const pc=window.dialogLayoutQA;if(pc.windows.windows.find(w=>w.id==='underweb').mode!==mode)pc.windowAction({type:'toggle-maximize',id:'underweb'});if(mode==='normal')pc.windowAction({type:'geometry',id:'underweb',rect:{x:20,y:10,width:940,height:620}});},mode);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(qa.outputDir,'dialog-'+label+'-latest.png')});
   await page.locator('.sn-dialog-history').evaluate(n=>{n.scrollTop=0;n.dispatchEvent(new Event('scroll'));});
   const measure=()=>page.evaluate(()=>{const n=document.querySelector('.sn-dialog-history'),r=n.getBoundingClientRect(),p=document.querySelector('.uw-page').getBoundingClientRect(),send=document.querySelector('.sn-dialog-footer .sn-actions button').getBoundingClientRect(),layout=document.querySelector('.sn-dialog-layout').getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height,scrollTop:n.scrollTop,sendBottom:send.bottom,pageBottom:p.bottom,pageHeight:p.height,outerScrollTop:document.querySelector('.uw-page').scrollTop,widthRatio:r.width/layout.width};});
   const stages=[];
   for(const phase of ['closed','answers','selected']){
    if(phase==='answers')await page.getByRole('button',{name:'Ответить',exact:true}).click();
    if(phase==='selected'){await page.getByRole('button',{name:'О, круто! А чё дальше?',exact:true}).click();await page.evaluate(()=>window.dialogLayoutQA.tickOutgoingMessage(3,{paused:false}));}
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));stages.push({phase,...await measure()});await page.screenshot({path:path.join(qa.outputDir,'dialog-'+label+'-'+phase+'.png')});
   }
   checks.push({width,height,mode,stages});
   if(mode==='maximized'){await page.evaluate(()=>window.dialogLayoutQA.navigateUnderweb('underweb://social/profile/me'));await page.screenshot({path:path.join(qa.outputDir,'profile-'+width+'.png')});const gutters=await page.evaluate(()=>{const p=document.querySelector('.uw-page').getBoundingClientRect(),n=document.querySelector('.sn-network').getBoundingClientRect();return {left:n.left-p.left,right:p.right-n.right,width:n.width};});assert.ok(Math.abs(gutters.left-gutters.right)<=3,'Social work area must be centered: '+JSON.stringify(gutters));assert.ok(gutters.width<=1441,'Social work area must keep a readable maximum width');if(width>=1536)assert.ok(gutters.left>=40,'Wide screens retain side gutters');}
  }
  await fs.writeFile(path.join(qa.outputDir,'report.json'),JSON.stringify({revision:qa.expectedRevision,checks,errors},null,2));
  for(const c of checks){const before=c.stages[0];assert.ok(before.height>=(before.pageHeight<=430?96:before.pageHeight<=700?240:320),'Conversation history must be taller: '+JSON.stringify(c));assert.ok(before.widthRatio>=.74,'Conversation must use most of the central area');for(const after of c.stages.slice(1)){for(const key of ['height','top','left','width','scrollTop','outerScrollTop'])assert.ok(Math.abs(after[key]-before[key])<1,'Opening answers must preserve history '+key+': '+JSON.stringify(c));assert.ok(after.sendBottom<=after.pageBottom+1,'Composer actions must remain on screen: '+JSON.stringify(c));}}
  assert.deepEqual(errors,[]);return {revision:qa.expectedRevision,checks:checks.length,errors,outputDir:qa.outputDir};
 }finally{await context.close();await browser.close();await server.close();}
}
