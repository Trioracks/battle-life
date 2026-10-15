import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),output=resolve(root,'artifacts/dossier-weekplay/task-4');
const port=Number(process.env.SOCIAL_CONTROLS_QA_PORT||4197);assert.ok(Number.isInteger(port)&&port>=4193&&port<=65535);
const base='http://127.0.0.1:'+port,mime={'.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
await mkdir(output+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=output+'/browser-temp';
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,base).pathname;
  if(pathname==='/__social-controls'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><link rel="stylesheet" href="/social-network.css"><title>Isolated social attachment controls QA</title><style>body{margin:24px;background:#d9e0e5}#root{max-width:900px;margin:auto}.sn-layout{grid-template-columns:145px minmax(0,1fr)}</style><div id="root"></div>');return;}
  const path=resolve(root,'.'+decodeURIComponent(pathname));
  if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
let browser;
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1100,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(45000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
 await page.goto(base+'/__social-controls');
 const setup=await page.evaluate(async()=>{
  const [{BeatAudio},{createPcAudioSession},{mountSocial},{createSocialAudio},{exportedSubmissionFixture}]=await Promise.all([import('/src/beat-audio.js?rev=43'),import('/src/pc-audio-session.js?rev=43'),import('/src/social-view.js?rev=43'),import('/src/social-audio-view.js?rev=43'),import('/test/helpers/submission-fixtures.js')]);
  const state=exportedSubmissionFixture({mixed:true}),file=state.audioExports.files[0],version=state.trackVersions.byId[file.trackVersionId];
  const before=JSON.stringify([state.trackVersions,state.audioExports,state.battleSubmissions]);state.social.dialogs['makarevich-1']={messages:[],draftVersionId:version.id};
  const audio=new BeatAudio(),session=createPcAudioSession(audio),adapter=session.forOwner('underweb');
  const social=mountSocial(document.querySelector('#root'),{route:{section:'dialog',communityId:'makarevich-1'},getState:()=>state,getMetadata:()=>({gameMinutes:600,gameDay:1,playerName:'Игрок'}),onChange:()=>true,navigate:()=>{},audio:adapter});
  const duplicate=createSocialAudio(adapter),copy=duplicate.row(document,{version});copy.dataset.qaCopy='true';document.querySelector('.sn-dialog').append(copy);
  const svgPath='/assets/ui/virtual-pc/icons/dossier.svg',response=await fetch(svgPath),image=new Image();image.src=svgPath;await image.decode();
  window.qa={audio,session,social,duplicate,state,before,version};
  return {origin:location.origin,duration:version.recipe.descriptor.durationSeconds,name:version.name,svg:{mime:response.headers.get('content-type'),width:image.naturalWidth,height:image.naturalHeight}};
 });
 assert.equal(setup.svg.mime,'image/svg+xml');assert.ok(setup.svg.width>0&&setup.svg.height>0);
 const attachment=page.locator('.sn-dialog-draft .sn-audio'),play=attachment.locator('[data-social-audio]'),stop=attachment.getByRole('button',{name:'Остановить: '+setup.name,exact:true}),copy=page.locator('[data-qa-copy]');
 assert.equal(await attachment.locator('button').count(),3); // transport pair and existing study action
 await play.evaluate(node=>{window.focusEvents=[];node.addEventListener('blur',()=>focusEvents.push({event:'blur',disabled:node.disabled,busy:node.closest('.sn-audio').getAttribute('aria-busy')}));});
 await play.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>qa.audio.status==='playing');
 const focus=await play.evaluate(node=>({retained:node===document.activeElement,events:focusEvents}));console.log(JSON.stringify({focus}));assert.equal(focus.retained,true);
 assert.equal(await play.getAttribute('aria-label'),'Пауза: '+setup.name);assert.equal(await copy.locator('[data-social-audio]').getAttribute('aria-label'),'Пауза: '+setup.name);
 await page.waitForFunction(()=>qa.audio.getSnapshot().positionSeconds>=qa.version.recipe.descriptor.durationSeconds/2);
 const halfway=await attachment.getByRole('progressbar').getAttribute('aria-valuenow');assert.ok(Number(halfway)>=49&&Number(halfway)<=65);
 await page.screenshot({path:output+'/attachment-playing.png',fullPage:true});
 assert.equal(await play.evaluate(node=>node===document.activeElement),true);await page.keyboard.press('Space');await page.waitForFunction(()=>qa.audio.status==='paused');
 const paused=await page.evaluate(()=>qa.audio.getSnapshot().positionSeconds);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>qa.audio.getSnapshot().positionSeconds),paused);
 await page.keyboard.press('Space');await page.waitForFunction(()=>qa.audio.status==='playing');await stop.click();
 assert.equal(await attachment.getByRole('progressbar').getAttribute('aria-valuenow'),'0');assert.equal(await copy.getByRole('progressbar').getAttribute('aria-valuenow'),'0');
 await play.click();await page.waitForFunction(()=>qa.audio.status==='playing');await page.waitForFunction(()=>qa.audio.status==='stopped',null,{timeout:35000});
 await page.waitForFunction(()=>document.querySelector('.sn-dialog-draft [role="progressbar"]').getAttribute('aria-valuenow')==='0');
 assert.equal(await play.getAttribute('aria-label'),'Слушать: '+setup.name);assert.equal(await copy.locator('[data-social-audio]').getAttribute('aria-label'),'Слушать: '+setup.name);
 const ended=await page.evaluate(()=>({voices:qa.audio.sources.length,position:qa.audio.getSnapshot().positionSeconds,unchanged:JSON.stringify([qa.state.trackVersions,qa.state.audioExports,qa.state.battleSubmissions])===qa.before}));assert.deepEqual(ended,{voices:0,position:0,unchanged:true});
 await page.setViewportSize({width:560,height:900});await page.screenshot({path:output+'/attachment-narrow.png',fullPage:true});
 const layout=await attachment.evaluate(node=>{const row=node.getBoundingClientRect(),buttons=[...node.querySelectorAll(':scope>button')].map(n=>n.getBoundingClientRect());return {width:row.width,overflow:node.scrollWidth>node.clientWidth,left:buttons[0].left>=row.left,right:buttons[1].right<=row.right,columns:getComputedStyle(node).gridTemplateColumns};});
 assert.equal(layout.overflow,false);assert.equal(layout.left,true);assert.equal(layout.right,true);
 const ft=await page.evaluate(async()=>{const descriptor={...qa.version.recipe.descriptor,key:'qa-ft',owner:'studio',durationSeconds:.2};await qa.session.forOwner('ft-studio').playDescriptor(descriptor);return qa.audio.status;});assert.equal(ft,'playing');await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>qa.audio.status),'playing');
 await page.evaluate(()=>{qa.social.dispose();qa.duplicate.dispose();qa.session.dispose();});assert.deepEqual(errors,[]);
 const evidence={passed:true,...setup,halfway:Number(halfway),paused,ended,layout,keyboard:true,duplicateSync:true,naturalEnd:true,ftDefaultLoops:true,errors};
 await writeFile(output+'/native-controls-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));await context.close();
}finally{
 try{await browser?.close();}finally{server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));}
}
