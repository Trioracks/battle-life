// Repeatable screenshots of actual runtime views from the audited built artifact.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateQaOptions,responseViolation} from './verify-public-preview.mjs';
import {startPreviewServer} from './serve-preview.mjs';
import {verifyShoulderCoverage} from './verify-shoulder-coverage.mjs';
import {verifyNoBankJudging} from './verify-playtest-no-bank.mjs';
import {verifyCameraHandoffs} from './verify-playtest-camera.mjs';
export async function verifyPlaytestVisuals(options={}){
 const qa=await validateQaOptions(options),server=await startPreviewServer({root:qa.root,port:0}),{chromium}=await import('playwright'),browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']}),context=await browser.newContext(),page=await context.newPage(),errors=[],violations=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(!r.url().includes('__qa')){const reason=responseViolation({url:r.url(),status:r.status(),contentType:r.headers()['content-type']??''});if(reason)violations.push({url:r.url(),reason});}});
 const artifactUrl=server.url,outputDir=qa.outputDir;await fs.mkdir(outputDir,{recursive:true});
 const address=new URL('__qa-visuals',artifactUrl).href;
 await page.route(address,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#virtual-pc{display:block;position:fixed;inset:0}#virtual-pc[hidden]{display:none}#work{position:fixed;inset:0;background:linear-gradient(120deg,#a79777,#506246)}</style>'+['apartment-v3','virtual-pc','desktop-apps','rap-notebook','rap-notebook-shell','rap-dossier','social-network','social-dialogs','social-community'].map(n=>'<link rel="stylesheet" href="'+artifactUrl+n+'.css">').join('')+'<script type="importmap">{"imports":{"three":"'+artifactUrl+'vendor/three/three.module.js","three/addons/":"'+artifactUrl+'vendor/three/addons/"}}</script><section id="virtual-pc"></section><section id="work" hidden></section>'}));
 const shots=[];let portraits=null;
 try{
  for(const [width,height] of [[1920,1080],[1536,1024],[1280,720]]){
   await page.setViewportSize({width,height});await page.goto(address);
   portraits=await page.evaluate(async ({base,portraits})=>{
    const [{mountVirtualPc},{createVirtualPcState},{advanceGoblin},{registerBattle},{createBeatWorkPanel}]=await Promise.all(['virtual-pc-ui','virtual-pc-state','goblin-mentor','social-registration','beat-work-view'].map(n=>import(base+'src/'+n+'.js')));
    if(!portraits){const [{createApartmentScene},{DEFAULT_APPEARANCE},{portraitKey},{PLAYER_LIFE_SCENES}]=await Promise.all(['apartment-v3-scene','avatar-v3-profile','social-portraits','player-life-photos'].map(n=>import(base+'src/'+n+'.js')));const canvas=document.createElement('canvas');Object.assign(canvas.style,{position:'fixed',left:'-2000px',width:'512px',height:'512px'});document.body.append(canvas);const config=await fetch(base+'assets/apartment/v3/scene.json').then(r=>r.json());config.assetBase=base+'assets/apartment/v3/';const scene=await createApartmentScene(canvas,config),appearance={...DEFAULT_APPEARANCE,topColor:'white'},key=portraitKey(appearance),portrait=await scene.capturePlayerPortrait(appearance),photos=[];for(const item of PLAYER_LIFE_SCENES){const image=await scene.capturePlayerLifePhoto(appearance,item.stage);photos.push({...item,src:image.url});}portraits={portrait:{key,url:portrait.url},album:{key,photos}};scene.dispose();canvas.remove();}
    let state=createVirtualPcState({power:'on'});state.social.playerPortrait=portraits.portrait;state.social.playerAlbum=portraits.album;state=advanceGoblin(state,0).state;state=advanceGoblin(state,21).state;state=registerBattle(state,{battleId:'makarevich-1',playerName:'123',nowMinute:21}).state;
    const root=document.querySelector('#virtual-pc'),pc=mountVirtualPc(root,{onPersist:s=>{state=s;return true;}});pc.showDesktop(state);pc.syncHost({playerName:'123',gameDay:2,gameMinutes:1441,clockLabel:'00:01'});window.qaViews={pc,state,createBeatWorkPanel};return portraits;
   },{base:artifactUrl,portraits});
   for(const [name,phase,progress] of [['bios','power-on',.7],['boot','loading',.55]]){await page.evaluate(({phase,progress})=>window.qaViews.pc.presentTransition({phase,progress,coldStart:true,overlay:1,zoom:1,locked:true}),{phase,progress});const file=name+'-'+width+'.png';await page.screenshot({path:path.join(outputDir,file)});shots.push(file);}
   await page.evaluate(()=>{const p=window.qaViews.pc;p.presentTransition({phase:'desktop',progress:0,overlay:1,zoom:1,locked:false});p.open('underweb');if(p.windows.windows.find(w=>w.id==='underweb')?.mode!=='maximized')p.windowAction({type:'toggle-maximize',id:'underweb'});});
   for(const [name,route] of [['browser','underweb://iskra'],['profile','underweb://social/me'],['dialog','underweb://social/dialog/mak-npc-06']]){
    await page.evaluate(url=>window.qaViews.pc.navigateUnderweb(url),route);
    if(name==='dialog'){await page.getByRole('button',{name:'Ответить',exact:true}).click();await page.getByRole('button',{name:'Хорошо! Сам как?',exact:true}).click();await page.evaluate(()=>window.qaViews.pc.tickOutgoingMessage(3,{paused:false}));await page.locator('.uw-page').evaluate(n=>n.scrollTop=0);}
    await page.evaluate(()=>document.fonts.ready);await page.locator('.uw-page img').evaluateAll(images=>Promise.all(images.filter(img=>{const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0;}).map(img=>img.decode())));const file=name+'-'+width+'.png';await page.screenshot({path:path.join(outputDir,file)});shots.push(file);
    assert.equal(await page.locator('.uw-browser').evaluate(n=>n.scrollWidth>n.clientWidth+2),false,'browser width overflow '+width);
   }
   await page.evaluate(()=>{document.querySelector('#virtual-pc').hidden=true;const host=document.querySelector('#work');host.hidden=false;const panel=window.qaViews.createBeatWorkPanel(document);host.append(panel.element);panel.update({beat:{name:'Макаревич · раунд 1'},job:{stage:1,elapsed:25,total:90,skill:1,genreSkill:2},chainProgress:{overall:.36,index:1,count:3},needs:{satiety:36,energy:91},skill:1.29,genreProgress:{name:'Экспериментальный',xp:2.58,cap:100},clockLabel:'01:25',audioNotice:'Музыка и вокал отключены в тестовой веб-версии'});});
   const file='production-'+width+'.png';await page.screenshot({path:path.join(outputDir,file)});shots.push(file);
  }
  if(options.camera)await verifyCameraHandoffs(page,{artifactUrl,outputDir:path.join(outputDir,'camera')});
  if(options.shoulders)await verifyShoulderCoverage(page,{artifactUrl,outputDir:path.join(outputDir,'shoulders')});
  if(options.noBank)await verifyNoBankJudging(page,{artifactUrl,outputDir:path.join(outputDir,'no-bank')});
  assert.deepEqual(errors,[],'page errors');assert.deepEqual(violations,[],'network violations');
  const report={revision:qa.expectedRevision,shots,errors,violations};await fs.writeFile(path.join(outputDir,'visual-report.json'),JSON.stringify(report,null,2));return report;
 }finally{await context.close();await browser.close();await server.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i++){const key=args[i];if(key==='--camera')options.camera=true;else if(key==='--no-bank')options.noBank=true;else if(key==='--shoulders')options.shoulders=true;else if(key==='--root')options.root=args[++i];else if(key==='--output-dir')options.outputDir=args[++i];else if(key==='--expected-revision')options.expectedRevision=args[++i];else throw Error('Unknown option '+key);}console.log(JSON.stringify(await verifyPlaytestVisuals(options)));}
