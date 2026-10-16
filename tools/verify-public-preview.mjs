import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {startPreviewServer} from './serve-preview.mjs';
import {decodePcSave} from '../src/pc-save-codec.js';

const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const inside=(base,target)=>{const relative=path.relative(base,target);return !relative||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
async function noLinks(target){
 let current=path.parse(target).root;
 for(const part of target.slice(current.length).split(path.sep).filter(Boolean)){
  current=path.join(current,part);try{if((await fs.lstat(current)).isSymbolicLink())throw Error('Linked QA path: '+current);}catch(error){if(error.code!=='ENOENT')throw error;}
 }
}
export async function validateQaOptions(options={}){
 const {live=false,url,prefix='/battle-life/'}=options;
 if(['userDataDir','storageState','context','browser'].some(key=>key in options))throw Error('QA requires a fresh isolated context; profile reuse is forbidden');
 if(!/^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(prefix))throw Error('Invalid QA prefix');
 if(url&&!live)throw Error('A supplied URL requires --live');
 if(live){const parsed=new URL(url);if(parsed.port==='4173')throw Error('Player port 4173 is forbidden');if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!==prefix)throw Error('Live QA requires an HTTPS URL with the exact prefix');}
 const root=path.resolve(options.root??path.join(sourceRoot,'dist/public-preview'));
 await noLinks(root);
 let manifest;
 try{
  if(await fs.stat(path.join(root,'package.json')).then(()=>true,()=>false))throw Error('source');
  await fs.access(path.join(root,'.nojekyll'));await fs.access(path.join(root,'index.html'));
  manifest=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8'));
 }catch{throw Error('QA root must be a built artifact, never the source root');}
 const expectedRevision=options.expectedRevision??execFileSync('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8',windowsHide:true}).trim();
 if(!/^[a-f0-9]{40}$/.test(expectedRevision)||manifest.revision!==expectedRevision)throw Error('Artifact revision differs from expected revision');
 if(manifest.version!=='0.1.0-preview.1'||manifest.profile!=='public-preview')throw Error('Unexpected preview release metadata');
 const outputDir=path.resolve(options.outputDir??(process.platform==='win32'?'D:/Codex/Builds/Battle/public-preview-qa':path.join(os.tmpdir(),'battle-public-preview-qa')));
 if(inside(root,outputDir)||inside(sourceRoot,outputDir)||inside(outputDir,root)||inside(outputDir,sourceRoot))throw Error('QA output must be outside source and built artifact');
 await noLinks(outputDir);
 return {root,outputDir,manifest,expectedRevision,prefix,live,url};
}
export function responseViolation({url,status=200,contentType=''}){
 const pathname=decodeURIComponent(new URL(url).pathname);
 if(/\.(?:wav|wave|mp3|ogg|flac|m4a|aac|opus|aiff?|aifc|wma|midi?)(?:$|[?#])/i.test(pathname)||/^audio\//i.test(contentType))return 'binary audio';
 if(/\/beat-pcm-worker\.js$/i.test(pathname))return 'recorded PCM worker';
 if(/\/(?:test|tools|\.git)(?:\/|$)/i.test(pathname))return 'served test/source module';
 if(status>=400)return 'HTTP '+status;
 return null;
}
export function validateLiveRelease(release,expected){
 for(const key of ['version','profile','revision','sourceCommit'])assert.equal(release[key],expected[key],'live release '+key);
 assert.ok(Number.isFinite(Date.parse(release.builtAt)),'live release timestamp');
}
export function isCompletedGlbSignal(failure,consumption,expectedBytes,sceneReady){
 if(failure.why!=='net::ERR_ABORTED'||!sceneReady||!Number.isSafeInteger(expectedBytes)||expectedBytes<=0)return false;
 if(!new URL(failure.url).pathname.endsWith('.glb')||consumption?.url!==failure.url||consumption.status!==200||consumption.eof!==true)return false;
 if(!Number.isFinite(failure.documentTimeOrigin)||consumption.documentTimeOrigin!==failure.documentTimeOrigin)return false;
 if(consumption.bytes!==expectedBytes||consumption.declaredBytes!==0&&consumption.declaredBytes!==expectedBytes||Math.abs(consumption.startedAt-failure.startedAt)>250)return false;
 if(!/\/vendor\/three\/three\.module\.js:/.test(consumption.initiator??''))return false;
 return failure.resourceTiming?.some(t=>t.decodedBodySize===expectedBytes&&t.encodedBodySize>0&&t.transferSize>=t.encodedBodySize)===true;
}
// QA-only controlled old cohort. No route or synthetic bytes are built/published.
export async function startCacheProbeServer({artifactUrl}){
 const artifact=new URL(artifactUrl),prefix=artifact.pathname;
 if(artifact.port==='4173')throw Error('Player port 4173 is forbidden');
 if(artifact.protocol!=='http:'||artifact.hostname!=='127.0.0.1'||!/^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(prefix))throw Error('Cache probe requires an owned loopback artifact server');
 const oldAssets={
  'src/apartment-app.js':{type:'text/javascript',body:`window.__cacheProbe={script:43,worker:null};window.__cacheWorker=new Worker('${prefix}src/social-worker.js?rev=43',{type:'module'});window.__cacheWorker.onmessage=e=>window.__cacheProbe.worker=e.data.revision;`},
  'apartment-v3.css':{type:'text/css',body:':root{--preview-cache-probe:43}'},
  'src/social-worker.js':{type:'text/javascript',body:'postMessage({revision:43});'}
 };
 const priorHits=Object.fromEntries(Object.keys(oldAssets).map(name=>[name,0]));let old=true;
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,artifact.origin);if(req.method!=='GET'||!url.pathname.startsWith(prefix))throw Error('outside probe prefix');
   const relative=url.pathname.slice(prefix.length),asset=oldAssets[relative];
   if(old&&asset&&url.search==='?rev=43'){
    priorHits[relative]++;res.writeHead(200,{'Content-Type':asset.type,'Cache-Control':'public, max-age=3600, immutable'});res.end(asset.body);return;
   }
   if(old&&!relative){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(`<!doctype html><link rel="icon" href="data:,"><link rel="stylesheet" href="${prefix}apartment-v3.css?rev=43"><script type="module" src="${prefix}src/apartment-app.js?rev=43"></script>`);return;}
   const response=await fetch(new URL(url.pathname+url.search,artifact.origin),{signal:AbortSignal.timeout(30000)});
   const bytes=Buffer.from(await response.arrayBuffer());res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')??'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}${prefix}`,priorHits,useCurrent(){old=false;},close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}

const notice='Музыка и вокал отключены в тестовой веб-версии';
const saveKey='battle-life-virtual-pc-v1';
const frame=(page,id)=>page.locator('.pc-window[data-window-id="'+id+'"]');
const state=async page=>decodePcSave(await page.evaluate(key=>localStorage.getItem(key),saveKey));
async function waitState(page,predicate,timeout=60000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){const saved=await state(page);if(predicate(saved))return saved;await page.waitForTimeout(200);}
 throw Error('Timed out waiting for durable save state: '+predicate.toString());
}
const phase=(page,value)=>page.waitForFunction(value=>document.querySelector('#virtual-pc')?.dataset.pcTransition===value,value);
async function recordReady(page){const timeOrigin=await page.evaluate(()=>document.querySelector('#loading')?.hidden===true?performance.timeOrigin:null);if(timeOrigin!==null)page._qaReadyDocuments?.add(timeOrigin);}
async function reload(page){page._qaPhase='reload-drain';await page.waitForLoadState('networkidle',{timeout:30000});page._qaPhase='reload-navigation';await page.reload();page._qaPhase='reload-ready-wait';await page.locator('#loading').waitFor({state:'hidden'});page._qaPhase='reload-ready';await recordReady(page);}
async function action(page,id){
 await page.waitForFunction(()=>document.body.dataset.mode==='game'&&!document.querySelector('#actions [data-action=computer]').disabled);
 await page.locator('#apartment').focus();await page.locator('#apartment').press('Enter');
 await page.locator('#actions [data-action='+id+']').first().click();
}
async function enter(page){await action(page,'computer');await phase(page,'desktop');}
async function app(page,label){await page.locator('#virtual-pc').getByRole('button',{name:'Слобода',exact:true}).click();await page.getByRole('menuitem',{name:label,exact:true}).click();}
async function navigate(page,address){await app(page,'Underweb');const input=frame(page,'underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await input.fill(address);await input.press('Enter');}
async function manualSleep(page){
 await action(page,'bed');await page.getByRole('button',{name:'Спать до пробуждения (тест)',exact:true}).click();await page.locator('#wake').waitFor({state:'visible'});
}
// Observe recorded PCM and media starts without muting or changing their behavior.
function observeAudio(){
 const event=type=>{void window.__previewAudioEvent({type});};
 const wrap=(object,key,count)=>{if(!object?.[key])return;const original=object[key];object[key]=function(...args){event(count);return original.apply(this,args);};};
 const originalStart=window.AudioBufferSourceNode?.prototype.start;
 if(originalStart)window.AudioBufferSourceNode.prototype.start=function(...args){
  const stack=new Error().stack??'',duration=this.buffer?.duration??Infinity;
  const procedural=/\/src\/(?:lyric-work-audio|indoor-footsteps|sound-cues)\.js/.test(stack)&&duration<2;
  event(procedural?'proceduralBufferStarts':'bufferStarts');return originalStart.apply(this,args);
 };
 wrap(window.HTMLMediaElement?.prototype,'play','mediaStarts');
 wrap(window.BaseAudioContext?.prototype,'decodeAudioData','decodes');
}
// Observe EOF on the same reader consumed by Three's FileLoader. No clone,
// replacement body, generated geometry, extra asset request or state hook.
function observeAssetReads(){
 const originalFetch=window.fetch;
 window.fetch=async function(...args){
  const startedAt=Date.now(),response=await originalFetch.apply(this,args);
  if(!response.url||!new URL(response.url).pathname.endsWith('.glb')||!response.body)return response;
  const url=response.url,status=response.status,declaredBytes=Number(response.headers.get('content-length')),body=response.body,getReader=body.getReader.bind(body);
  body.getReader=function(...options){
   const reader=getReader(...options),read=reader.read.bind(reader),initiator=new Error().stack;let bytes=0;
   reader.read=async function(...readOptions){const chunk=await read(...readOptions);if(chunk.done)void window.__previewAssetEvent({url,status,startedAt,finishedAt:Date.now(),documentTimeOrigin:performance.timeOrigin,declaredBytes,bytes,eof:true,initiator});else bytes+=chunk.value.byteLength;return chunk;};
   return reader;
  };
  return response;
 };
}
export async function verifyPublicPreview(options={}){
 const config=await validateQaOptions(options);
 await fs.mkdir(config.outputDir,{recursive:true});await noLinks(config.outputDir);
 const out=await fs.mkdtemp(path.join(config.outputDir,'run-'));
 const report={version:config.manifest.version,revision:config.manifest.revision,live:config.live,viewports:[{width:1280,height:720},{width:1920,height:1080}],checks:[],audioRequests:[],unexpectedResponses:[],intentionalCloseAborts:[],pageErrors:[],screenshots:[],audioObservations:[],assetConsumptions:[],requests:[],outputDirectory:out};
 let server,browser,watchdog,currentPage,cacheProbe;
 const check=(name,evidence={})=>{report.checks.push({name,...evidence});console.log('PASS '+name);};
 const screenshot=async(page,name)=>{const filename=path.join(out,name+'.png');await page.screenshot({path:filename,timeout:30000});report.screenshots.push(filename);};
 const contexts=new Set(),closingContexts=new Set(),audioByContext=new Map(),requestInfo=new WeakMap(),readyDocuments=new Set();
 const observed=new Set();
 async function isolatedContext(viewport){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});contexts.add(context);
  const audio={bufferStarts:0,mediaStarts:0,decodes:0,proceduralBufferStarts:0};audioByContext.set(context,audio);
  await context.exposeBinding('__previewAudioEvent',(_source,{type})=>{if(Object.hasOwn(audio,type))audio[type]++;});
  await context.exposeBinding('__previewAssetEvent',(_source,event)=>{if(event.eof)report.assetConsumptions.push(event);});
  context.on('request',request=>{
   const url=request.url();if(!/^https?:/.test(url))return;
   let page;try{page=request.frame().page();}catch{}
   requestInfo.set(request,{phase:page?._qaPhase??'worker',startedAt:Date.now()});
   report.requests.push(url);const why=responseViolation({url});if(why==='binary audio'||why==='recorded PCM worker')report.audioRequests.push(url);else if(why)report.unexpectedResponses.push({url,why});
  });
  context.on('response',response=>{
   const url=response.url(),contentType=response.headers()['content-type']??'',status=response.status();
   const why=responseViolation({url,status,contentType});if(why==='binary audio'||why==='recorded PCM worker')report.audioRequests.push(url);else if(why)report.unexpectedResponses.push({url,status,why});
  });
  context.on('requestfailed',request=>{
   let page;try{page=request.frame().page();}catch{}
   const failure={url:request.url(),why:request.failure()?.errorText??'request failed',...requestInfo.get(request),failedPhase:page?._qaPhase??'worker',failedAt:Date.now()};
   (closingContexts.has(context)&&failure.why==='net::ERR_ABORTED'?report.intentionalCloseAborts:report.unexpectedResponses).push(failure);
   if(page&&!page.isClosed())void page.evaluate(url=>({documentTimeOrigin:performance.timeOrigin,resourceTiming:performance.getEntriesByName(url).map(({startTime,duration,transferSize,encodedBodySize,decodedBodySize})=>({startTime,duration,transferSize,encodedBodySize,decodedBodySize}))}),request.url()).then(evidence=>Object.assign(failure,evidence),()=>{});
  });
  await context.addInitScript(observeAudio);
  await context.addInitScript(observeAssetReads);
  return context;
 }
 async function fresh(viewport,seed){
  const context=await isolatedContext(viewport);
  if(seed)await context.addInitScript(({seed,origin})=>{if(location.origin===origin&&!sessionStorage.getItem('__previewSeeded')){for(const [key,value]of Object.entries(seed))localStorage.setItem(key,value);sessionStorage.setItem('__previewSeeded','yes');}},{seed,origin:new URL(report.url).origin});
  const page=await context.newPage();currentPage=page;page._qaReadyDocuments=readyDocuments;page._qaPhase='fresh-navigation';page.setDefaultTimeout(45000);page.setDefaultNavigationTimeout(60000);
  const diagnostic=await context.newCDPSession(page),network=new Map();await diagnostic.send('Network.enable');
  diagnostic.on('Network.requestWillBeSent',event=>network.set(event.requestId,{url:event.request.url,initiator:event.initiator}));
  diagnostic.on('Network.loadingFailed',event=>{const request=network.get(event.requestId);if(request?.url.includes('.glb')){report.networkDiagnostics??=[];report.networkDiagnostics.push({...request,...event,phase:page._qaPhase});}});
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(report.url);await page.locator('#loading').waitFor({state:'hidden'});
  const release=await page.locator('#release-info').innerText();assert.ok(release.includes(config.manifest.version));assert.ok(release.includes(config.expectedRevision.slice(0,7)));assert.ok(release.includes(notice));
  page._qaPhase='fresh-ready';
  await recordReady(page);
  if(seed){await page.locator('#continue-game').click();await phase(page,'room');}
  return {context,page};
 }
 async function observe(page,label){
  await recordReady(page);
  await page.evaluate(async()=>{await window.__previewAudioEvent({type:'flush'});});
  const counts={...audioByContext.get(page.context())};report.audioObservations.push({label,...counts});
  assert.equal(counts.bufferStarts,0,label+' starts no recorded PCM');assert.equal(counts.mediaStarts,0,label+' starts no media');assert.equal(counts.decodes,0,label+' decodes no recorded audio');
  for(const url of await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name)))observed.add(url);
 }
 async function close(context,page,label){page._qaPhase='close-drain:'+label;await page.waitForLoadState('networkidle',{timeout:30000});await observe(page,label);closingContexts.add(context);page._qaPhase='context-close:'+label;await context.close();contexts.delete(context);}
 try{
  if(!config.live){server=await startPreviewServer({root:config.root,port:0,prefix:config.prefix});assert.notEqual(new URL(server.url).port,'4173');report.url=server.url;}
  else report.url=config.url;
  const {chromium}=await import('playwright');
  if(process.platform==='win32'){
   for(const key of ['TEMP','TMP','PLAYWRIGHT_BROWSERS_PATH'])if(!/^D:[\\/]/i.test(process.env[key]??''))throw Error(key+' must point to D: before browser launch on Windows');
  }
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,timeout:30000});
  report.browserVersion=browser.version();report.browserExecutable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??'locked Playwright default';
  // Hosted software rendering covers both viewports; the 30-minute job leaves eight minutes outside this QA deadline.
  watchdog=setTimeout(()=>{report.pageErrors.push('QA watchdog expired');void browser.close();},22*60*1000);
  if(config.live){
   const context=await browser.newContext();contexts.add(context);
   const response=await context.request.get(new URL('release.json',report.url).href,{timeout:30000});assert.equal(response.status(),200);validateLiveRelease(await response.json(),config.manifest);await context.close();contexts.delete(context);
  }
  const {publicPreviewFixture}=await import('../test/helpers/public-preview-fixture.js');
  if(!config.live){
   cacheProbe=await startCacheProbeServer({artifactUrl:report.url});
   const context=await isolatedContext(report.viewports[0]),page=await context.newPage();currentPage=page;page._qaReadyDocuments=readyDocuments;page.setDefaultTimeout(45000);page.on('pageerror',error=>report.pageErrors.push(error.message));
   await page.goto(cacheProbe.url,{timeout:60000});await page.waitForFunction(()=>window.__cacheProbe?.worker===43);
   assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--preview-cache-probe').trim()),'43');
   cacheProbe.useCurrent();
   const paths=['src/apartment-app.js','apartment-v3.css','src/social-worker.js'];
   const hits=await page.evaluate(async({base,paths})=>Promise.all(paths.map(async name=>{const url=base+name+'?rev=43',response=await fetch(url),text=await response.text(),timing=performance.getEntriesByName(url).at(-1);return {name,status:response.status,text,transferSize:timing.transferSize};})),{base:cacheProbe.url,paths});
   for(const hit of hits){assert.equal(hit.status,200);assert.ok(hit.text.includes('43'));assert.equal(hit.transferSize,0,'old asset served from browser HTTP cache');assert.equal(cacheProbe.priorHits[hit.name],1,'old asset had only one network response');}
   await page.evaluate(()=>window.__cacheWorker.terminate());
   await context.addInitScript(seed=>{for(const [key,value]of Object.entries(seed))localStorage.setItem(key,value);},publicPreviewFixture('installer'));
   const currentRequests=[];context.on('request',request=>currentRequests.push(request.url()));
   await page.goto(cacheProbe.url,{timeout:60000});await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await phase(page,'room');
   await page.waitForFunction(()=>document.body.dataset.mode==='game');
   const until=Date.now()+30000;while(!currentRequests.some(url=>url.includes('social-worker.js?rev=44'))&&Date.now()<until)await page.waitForTimeout(100);
   const resources=currentRequests.filter(url=>/\.(?:js|css)(?:\?|$)/.test(url)&&!url.includes('/vendor/'));
   assert.ok(resources.some(url=>url.includes('apartment-app.js?rev=44')));assert.ok(resources.some(url=>url.includes('.css?rev=44')));assert.ok(resources.some(url=>url.includes('social-worker.js?rev=44')));assert.ok(resources.every(url=>new URL(url).searchParams.get('rev')==='44'));
   assert.equal(await page.evaluate(()=>typeof window.__cacheProbe),'undefined');assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--preview-cache-probe').trim()),'');
   await screenshot(page,'stale-http-cache-to-current-1280');
   report.cacheEvidence={syntheticPriorRevision:43,priorHits:{...cacheProbe.priorHits},cachedResponses:hits.map(({text,...hit})=>hit),currentResources:resources,scope:'Controlled synthetic old JS/CSS/Worker cached with immutable max-age, then unchanged current artifact on the same owned origin. Not an old gameplay migration test.'};
   check('stale HTTP-cached JS/CSS/Worker cohort cannot replace canonical 44 entry',{cacheHits:3,syntheticPriorRevision:43});await close(context,page,'stale-http-cache');await cacheProbe.close();cacheProbe=null;
  }
  for(const viewport of report.viewports){
   const suffix=String(viewport.width);
   {
    const {context,page}=await fresh(viewport);
    await screenshot(page,'release-menu-'+suffix);
    // Warm a prior module URL in the isolated context's module cache, then enter
    // a new document. Local server uses no-store; this is not an HTTP-cache claim.
    await page.evaluate(async prefix=>{await import(prefix+'src/build-info.js?rev=43');},config.prefix);
    await observe(page,'prior-module-'+suffix);observed.clear();await reload(page);
    await page.locator('#new-game').click();await page.locator('#character-name').fill('Preview '+suffix);await page.locator('#next-step').click();await page.locator('#start-game').click();
    await page.locator('#wake').waitFor({state:'visible'});await page.locator('#wake').click();await phase(page,'room');
    await page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);
    await screenshot(page,'natural-scene-'+suffix);
    await manualSleep(page);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('battle-life-apartment-v3-time'))?.sleep?.mode==='manual');
    await screenshot(page,'natural-manual-sleep-'+suffix);await page.locator('#wake').click();
    await reload(page);await page.locator('#continue-game').click();await phase(page,'room');assert.equal(await page.locator('#player-name').textContent(),'Preview '+suffix);
    check('natural character, scene, manual sleep and reload '+suffix,{fixtureAssisted:false});
    await close(context,page,'natural-'+suffix);
   }
   if(options.smoke)continue;
   {
    const {context,page}=await fresh(viewport,publicPreviewFixture('installer'));await enter(page);await app(page,'torent');
    await frame(page,'torent').getByRole('button',{name:'Выбрать загрузку FT Studio',exact:true}).dblclick();
    for(const label of ['Далее >','Далее >','Установить'])await frame(page,'installer').getByRole('button',{name:label,exact:true}).click();
    await frame(page,'installer').getByRole('button',{name:'Свернуть окно',exact:true}).click();await app(page,'Отойти от ПК');await phase(page,'room');await manualSleep(page);
    await waitState(page,saved=>saved.software.ft.installed);
    await screenshot(page,'background-install-sleep-'+suffix);await page.locator('#wake').click();
    assert.equal((await state(page)).software.installer.elapsedSeconds,30);
    check('background FT installation advances during manual sleep '+suffix,{fixtureAssisted:true,archiveBytes:800000000,installationSeconds:30});await close(context,page,'installer-'+suffix);
   }
   for(const kind of ['lyrics','beat']){
    const {context,page}=await fresh(viewport,publicPreviewFixture(kind));await enter(page);await app(page,kind==='lyrics'?'Рэпблокнот':'FT Studio');
    if(kind==='beat'){
     await frame(page,'ft-studio').getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click();await frame(page,'ft-studio').locator('[data-project-id="preview-beat"]').click();
    }
    await frame(page,kind==='lyrics'?'rap-notebook':'ft-studio').getByRole('button',{name:kind==='lyrics'?'Начать писать':'Работать над битом',exact:true}).click();
    await phase(page,'working');await screenshot(page,kind+'-work-'+suffix);
    if(kind==='beat')assert.ok((await page.locator('.beat-work-audio').innerText()).includes(notice));
    await waitState(page,saved=>saved.projects.find(p=>p.id==='preview-'+kind)?.stages.length===3);await phase(page,'desktop');
    const saved=await state(page);assert.equal(saved.projects.find(p=>p.id==='preview-'+kind).status,'ready');assert.ok(saved[kind==='lyrics'?'writing':'music'].practice>0);
    if(kind==='beat'){assert.equal(await frame(page,'ft-studio').getByRole('button',{name:'Play',exact:true}).isDisabled(),true);assert.ok((await frame(page,'ft-studio').innerText()).includes(notice));}
    await screenshot(page,kind+'-complete-'+suffix);check(kind+' UI work completes and saves practice '+suffix,{fixtureAssisted:true,completedStages:3});await close(context,page,kind+'-'+suffix);
   }
   {
    const {context,page}=await fresh(viewport,publicPreviewFixture('vocal'));await enter(page);await app(page,'FT Studio');
    await frame(page,'ft-studio').getByRole('dialog').getByRole('button',{name:'Открыть проект',exact:true}).click();await frame(page,'ft-studio').locator('[data-project-id="beat"]').click();
    await frame(page,'ft-studio').getByRole('button',{name:'Добавить вокал',exact:true}).click();await frame(page,'ft-studio').getByRole('dialog').locator('[data-project-id="lyrics"]').click();
    await phase(page,'working');assert.ok((await page.locator('.beat-work-audio').innerText()).includes(notice));await screenshot(page,'vocal-work-'+suffix);await phase(page,'desktop');assert.ok((await state(page)).projects.find(p=>p.id==='beat').recording.draft);
    await frame(page,'ft-studio').getByRole('button',{name:'Свести',exact:true}).click();await phase(page,'working');await phase(page,'desktop');assert.ok((await state(page)).projects.find(p=>p.id==='beat').recording.mix);
    await frame(page,'ft-studio').getByRole('button',{name:'Экспорт',exact:true}).click();
    const exported=frame(page,'ft-studio').getByRole('dialog',{name:'Экспорт аудиофайла'});await exported.getByLabel('Вид аудиофайла',{exact:true}).selectOption('track');await exported.getByLabel('Имя аудиофайла',{exact:true}).fill('Preview.wav');await exported.getByRole('button',{name:'Сохранить аудиофайл',exact:true}).click();await exported.waitFor({state:'detached'});
    const before=await state(page),file=before.audioExports.files.find(file=>file.filename==='Preview.wav');assert.ok(file?.descriptor);const frozen=JSON.stringify(file),frozenVersion=JSON.stringify(before.trackVersions.byId[file.trackVersionId]);
    await navigate(page,'underweb://social/community/makarevich-1');await screenshot(page,'social-group-'+suffix);await page.getByRole('button',{name:'Сдать трек',exact:true}).click();await page.getByRole('button',{name:'Прикрепить',exact:true}).click();await page.getByRole('button',{name:'Выбрать: Preview.wav',exact:true}).click();await page.getByRole('button',{name:'Прикрепить выбранный трек',exact:true}).click();
    await waitState(page,saved=>saved.outgoingUpload?.status==='ready');await page.getByRole('button',{name:'Отправить',exact:true}).click();
    await waitState(page,saved=>saved.battleSubmissions.length===1,30000);await screenshot(page,'submission-dialog-'+suffix);
    await navigate(page,'underweb://social/audio');
    const plays=page.locator('[data-social-audio]');assert.ok(await plays.count());for(const play of await plays.all())assert.equal(await play.isDisabled(),true);assert.ok((await frame(page,'underweb').innerText()).includes(notice));await screenshot(page,'social-audio-disabled-'+suffix);
    await app(page,'Мой компьютер');
    const explorer=frame(page,'computer');await explorer.getByRole('button',{name:'Перейти: Экспорт',exact:true}).click();await explorer.getByRole('button',{name:'Открыть Preview.wav',exact:true}).dblclick();
    assert.equal(await page.getByRole('button',{name:'▶ Слушать файл',exact:true}).isDisabled(),true);await screenshot(page,'export-player-disabled-'+suffix);
    await navigate(page,'underweb://social/dialog/anya');await screenshot(page,'social-navigation-'+suffix);
    await navigate(page,'underweb://social/audio');
    await page.getByRole('button',{name:'Изучить трек · 45 мин',exact:true}).first().click();await frame(page,'rap-dossier').getByRole('button',{name:'Изучить трек · 45 мин',exact:true}).click();await phase(page,'working');await screenshot(page,'dossier-study-work-'+suffix);await phase(page,'desktop');
    assert.ok(Object.keys((await state(page)).rapAnalysis.reports).length>0);await app(page,'Рэп-досье');await screenshot(page,'dossier-report-'+suffix);
    assert.equal(JSON.stringify((await state(page)).audioExports.files.find(item=>item.id===file.id)),frozen);
    await reload(page);await page.locator('#continue-game').click();await phase(page,'room');
    const restored=await state(page);assert.equal(JSON.stringify(restored.audioExports.files.find(item=>item.id===file.id)),frozen);assert.equal(JSON.stringify(restored.trackVersions.byId[file.trackVersionId]),frozenVersion);assert.equal(restored.battleSubmissions.length,1);
    check('vocal, mix, metadata export, attach/send, social, dossier and durable frozen recipe '+suffix,{fixtureAssisted:true,fileId:file.id,submissionId:restored.battleSubmissions[0].id});await close(context,page,'vocal-social-'+suffix);
   }
  }
  const active=[...observed].filter(url=>/\.(?:js|css)(?:\?|$)/.test(url)&&!url.includes('/vendor/'));
  assert.ok(active.some(url=>url.includes('apartment-app.js?rev=44')));assert.ok(active.some(url=>url.includes('.css?rev=44')));assert.ok(active.every(url=>new URL(url).searchParams.get('rev')==='44'),'all active first-party JS/CSS use canonical revision 44');
  const workers=report.requests.filter(url=>new URL(url).origin===new URL(report.url).origin&&/\/[^/]*worker\.js(?:\?|$)/.test(url));
  assert.ok(workers.every(url=>new URL(url).searchParams.get('rev')==='44'),'all real Worker entries use canonical revision 44');
  if(!options.smoke)assert.ok(workers.some(url=>url.includes('social-worker.js?rev=44')),'real canonical social Worker requested');
  check('prior module URL followed by canonical revision 44 entry, CSS and Worker',{priorRevision:43,canonicalRevision:44,workerRequired:!options.smoke,cacheScope:'isolated module URL warmup; local HTTP responses are no-store'});
  report.completedGlbSignals=[];report.readyDocuments=[...readyDocuments];
  const rawFailures=report.unexpectedResponses;report.unexpectedResponses=[];
  for(const failure of rawFailures){
   let matched=false;
   if(failure.why==='net::ERR_ABORTED'){
    const url=new URL(failure.url),relative=url.pathname.startsWith(config.prefix)?url.pathname.slice(config.prefix.length):'',filename=path.resolve(config.root,relative);
    if(relative.startsWith('assets/')&&relative.endsWith('.glb')&&inside(config.root,filename)){
     const expectedBytes=await fs.stat(filename).then(info=>info.size,()=>0),consumption=report.assetConsumptions.find(entry=>isCompletedGlbSignal(failure,entry,expectedBytes,readyDocuments.has(entry.documentTimeOrigin)));
     if(consumption){matched=true;report.completedGlbSignals.push({...failure,expectedBytes,consumption,sceneReady:true});}
    }
   }
   if(!matched)report.unexpectedResponses.push(failure);
  }
  assert.deepEqual(report.audioRequests,[]);assert.deepEqual(report.unexpectedResponses,[]);assert.deepEqual(report.pageErrors,[]);check('zero recorded-audio requests/PCM/media/decode starts, unexpected responses and page errors');
  report.passed=true;return report;
 }catch(error){
  report.passed=false;report.failure=error.stack;
  if(currentPage&&!currentPage.isClosed()){await screenshot(currentPage,'failure').catch(()=>{});report.failureBody=await currentPage.locator('body').innerText({timeout:5000}).catch(()=>'(page unavailable)');}
  throw error;
 }finally{
  clearTimeout(watchdog);for(const context of contexts)await context.close().catch(()=>{});await browser?.close().catch(()=>{});await cacheProbe?.close();await server?.close();
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('QA evidence: '+path.join(out,'report.json'));
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)try{
 const options={};for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];if(flag==='--live')options.live=true;else if(flag==='--smoke')options.smoke=true;
  else {const value=process.argv[++i];if(!value)throw Error('Missing '+flag);const key={'--root':'root','--prefix':'prefix','--url':'url','--output-dir':'outputDir','--expected-revision':'expectedRevision'}[flag];if(!key)throw Error('Unknown option '+flag);options[key]=value;}
 }
 await verifyPublicPreview(options);
}catch(error){console.error(error.stack);process.exitCode=1;}
