import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateQaOptions,responseViolation} from './verify-public-preview.mjs';
import {startPreviewServer} from './serve-preview.mjs';
export async function verifySocialDialogPolish(options={}){
 const qa=await validateQaOptions(options),server=await startPreviewServer({root:qa.root,port:0}),{chromium}=await import('playwright'),browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage(),errors=[],violations=[],checks=[];
 const out=qa.outputDir;await fs.mkdir(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(!r.url().includes('__qa-social')){const why=responseViolation({url:r.url(),status:r.status(),contentType:r.headers()['content-type']??''});if(why)violations.push({url:r.url(),why});}});
 const base=server.url,address=new URL('__qa-social',base).href;
 await page.route(address,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,">'+['apartment-v3','virtual-pc','desktop-apps','rap-notebook','rap-notebook-shell','rap-dossier','social-network','social-dialogs','social-community'].map(n=>'<link rel="stylesheet" href="'+base+n+'.css">').join('')+'<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#virtual-pc{position:fixed;inset:0;display:block}</style><section id="virtual-pc"></section>'}));
 try{
  for(const [width,height]of [[1920,1080],[1536,1024],[1280,720]]){
   await page.setViewportSize({width,height});await page.goto(address);
   await page.evaluate(async base=>{const [{mountVirtualPc},{createVirtualPcState},{advanceGoblin},{activateSocial,advanceSocial},{registerBattle}]=await Promise.all(['virtual-pc-ui','virtual-pc-state','goblin-mentor','social-runtime','social-registration'].map(n=>import(base+'src/'+n+'.js')));let state=advanceGoblin(advanceGoblin(createVirtualPcState({power:'on'}),0).state,21).state;state=registerBattle(activateSocial(state,21).state,{battleId:'makarevich-1',playerName:'123',nowMinute:21}).state;state=advanceSocial(state,21).state;const pc=mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:s=>{state=s;return true;}});pc.showDesktop(state);pc.syncHost({playerName:'123',gameDay:1,gameMinutes:21,clockLabel:'00:21'});pc.open('underweb');if(pc.windows.windows.find(w=>w.id==='underweb')?.mode!=='maximized')pc.windowAction({type:'toggle-maximize',id:'underweb'});window.socialQA={pc};},base);
   for(const [name,url]of [['messages','underweb://social/messages'],['dialog','underweb://social/dialog/mak-npc-06'],['community','underweb://social/community/makarevich-1'],['round-table','underweb://social/results/makarevich-1/selection'],['audio','underweb://social/profile/mak-npc-06?view=audio']]){
    await page.evaluate(url=>window.socialQA.pc.navigateUnderweb(url),url);
    if(name==='dialog'){await page.getByRole('button',{name:'Ответить',exact:true}).click();await page.getByRole('button',{name:'Хорошо! Сам как?',exact:true}).click();await page.evaluate(()=>window.socialQA.pc.tickOutgoingMessage(3,{paused:false}));}
    if(name==='community')await page.locator('.sn-community-archive').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,name+'-'+width+'.png')});
    const measured=await page.evaluate(name=>{
     const style=s=>getComputedStyle(document.querySelector(s)),rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
     const values={name,pageBackground:style('.uw-page').backgroundColor,page:rect('.uw-page'),network:rect('.sn-network'),mark:document.querySelector('.sn-brandmark').textContent};
     values.iconCenterErrors=[...document.querySelectorAll('.uw-toolbar .uw-icon-control')].map(n=>{const a=n.getBoundingClientRect(),b=n.querySelector('.uw-glyph').getBoundingClientRect();return Math.max(Math.abs(a.x+a.width/2-b.x-b.width/2),Math.abs(a.y+a.height/2-b.y-b.height/2));});
     if(document.querySelector('.sn-search')){values.searchBackground=style('.sn-search').backgroundColor;values.searchHeight=rect('.sn-search').height;}
     values.whiteBlocks=[...document.querySelectorAll('.sn-network *')].filter(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n).backgroundColor.match(/[\d.]+/g)?.map(Number)??[];return r.width>25&&r.height>15&&c.length>=3&&c.slice(0,3).every(v=>v>200)&&!(c.length===4&&c[3]===0);}).map(n=>({tag:n.tagName,className:n.className}));
     if(name==='messages'){values.rowBackground=style('.sn-message-row').backgroundColor;values.nameFont=parseFloat(style('.sn-message-row strong').fontSize);values.previewFont=parseFloat(style('.sn-message-row p').fontSize);}
     else if(name==='dialog'){values.history=rect('.sn-dialog-history');values.send=rect('.sn-dialog-footer .sn-actions button');values.sendBackground=style('.sn-dialog-footer .sn-actions button').backgroundImage;values.inputFont=parseFloat(style('.sn-dialog-input').fontSize);}
     return values;
    },name);
    const performance=await page.evaluate(async()=>{window.socialQA.pc.underwebView.update();window.socialQA.pc.underwebView.update();let mutations=0;const observer=new MutationObserver(records=>mutations+=records.length);observer.observe(document.querySelector('.uw-page'),{subtree:true,childList:true,attributes:true,characterData:true});const samples=[];for(let i=0;i<120;i++){const start=window.performance.now();window.socialQA.pc.underwebView.update();samples.push(window.performance.now()-start);}await Promise.resolve();observer.disconnect();samples.sort((a,b)=>a-b);return {updates:120,p50:samples[60],p95:samples[114],max:samples.at(-1),mutations};});
    checks.push({width,height,...measured,performance});
    if(name==='dialog'){
     await page.getByRole('button',{name:'Отправить',exact:true}).click();
     await page.evaluate(async base=>{const {advanceSocial}=await import(base+'src/social-runtime.js'),q=window.socialQA,p=q.pc;const message=p.state.social.goblin.pending[0],duration=Array.from(message.body).length/3;p.tickOutgoingMessage(1,{paused:false});if(!p.isGoblinChatOnline())throw Error('Fixture must exercise live chat presence');p.syncState(advanceSocial(p.state,500,{goblinOnline:p.isGoblinChatOnline()}).state);p.syncHost({playerName:'123',gameDay:1,gameMinutes:500,clockLabel:'08:20'});const delivered=()=>p.state.social.dialogs['mak-npc-06'].messages.some(m=>m.id==='goblin:'+message.id);if(delivered())throw Error('Game clock bypassed online typing');p.tickOutgoingMessage(duration-1-.1,{paused:false});if(delivered())throw Error('Message arrived before three characters per second');p.tickOutgoingMessage(.1,{paused:false});if(!delivered())throw Error('Completed typed message was not delivered');},base);
    }
   }
  }
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({revision:qa.expectedRevision,checks,errors,violations},null,2));
  const dark=value=>{const rgb=value.match(/[\d.]+/g)?.map(Number)??[];return rgb.length===4&&rgb[3]===0||Math.max(...rgb.slice(0,3))<100;};
  for(const c of checks){assert.ok(c.iconCenterErrors.every(e=>e<.5),'Browser icons must be centered');assert.equal(c.mark,'В');assert.deepEqual(c.whiteBlocks,[],'White social blocks: '+c.name);assert.ok(dark(c.pageBackground),'Social page must cover the white browser canvas: '+JSON.stringify(c));if(c.searchBackground)assert.ok(dark(c.searchBackground),'Search must use the dark theme');assert.ok(c.network.height>=c.page.height-2,'Social shell must fill the browser viewport');if(c.name==='messages'){assert.ok(dark(c.rowBackground),'Dialog rows must not be white');assert.ok(c.nameFont>=16&&c.previewFont>=14,'Dialog list typography must match the reference');}else if(c.name==='dialog'){assert.ok(c.history.height>=160,'Answer choices must leave a readable message history');assert.ok(c.send.bottom<=c.page.bottom+2,'Composer actions must remain visible: '+JSON.stringify(c));assert.ok(/rgb\(255,\s*165,\s*75\)/.test(c.sendBackground),'Send must have the orange primary treatment');assert.ok(c.inputFont>=14,'Composer text must remain readable');}}
  assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);return {revision:qa.expectedRevision,checks:checks.length,errors,violations,outputDir:out};
 }finally{await context.close();await browser.close();await server.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const options={};for(let i=2;i<process.argv.length;i+=2){const key={'--root':'root','--output-dir':'outputDir','--expected-revision':'expectedRevision'}[process.argv[i]];if(!key)throw Error('Unknown option');options[key]=process.argv[i+1];}console.log(JSON.stringify(await verifySocialDialogPolish(options)));}
