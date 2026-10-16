import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {summarizeNative,assertNativeTargets} from './qa/acceptance-metrics.mjs';
import {withBrowserWatchdog} from './qa/browser-watchdog.mjs';
import {installWeekplayCounters,instrumentWeekplayModule} from './qa/weekplay-instrumentation.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('.'),out=resolve(process.env.WEEKPLAY_QA_DIR||'artifacts/dossier-weekplay/task-10/native'),port=Number(process.env.WEEKPLAY_QA_PORT||4203);
assert.ok(Number.isInteger(port)&&port>=4193&&port<=65535);assert.ok(out.startsWith('D:')||out.startsWith('d:'));
const base='http://127.0.0.1:'+port,mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.html':'text/html','.glb':'model/gltf-binary','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const evidence={base,headless:true,subjectiveListening:false,errors:[],assetFailures:[],performance:[],shots:[],milestones:[]};
const hash=x=>createHash('sha256').update(x).digest('hex');
const assetPaths=execFileSync('git',['ls-files','-z','assets','stems','src/beat-user-experimental-bank.js','src/source-levels-user-experimental-v1.js'],{encoding:'utf8'}).split('\0').filter(Boolean);
const assets={};for(const path of assetPaths)assets[path]=hash(await readFile(path));evidence.frozenAssets={count:assetPaths.length,manifestHash:hash(JSON.stringify(assets))};
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,base).pathname;
 if(pathname==='/__week'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Isolated weekplay QA</title>');return;}
 const path=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
 let data=await readFile(path);if(pathname.startsWith('/src/')&&extname(path)==='.js')data=instrumentWeekplayModule(pathname,data.toString());
 res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 }catch{res.writeHead(404).end();}
});
let browser,page;const record=async()=>writeFile(out+'/evidence.json',JSON.stringify(evidence,null,2));
const milestone=async(message,data={})=>{evidence.milestones.push({message,...data});console.log(JSON.stringify({message,...data}));await record();};
const evaluate=fn=>withBrowserWatchdog(()=>page.evaluate(fn),browser,60000);
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});await context.addInitScript(installWeekplayCounters);page=await context.newPage();page.setDefaultTimeout(45000);
 page.on('pageerror',e=>evidence.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)evidence.assetFailures.push({status:r.status(),url:r.url()});});page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')evidence.assetFailures.push({url:r.url(),failure:r.failure()});});
 await page.goto(base+'/__week');
 if(process.env.WEEKPLAY_TRANSITION_ONLY==='1'){
  const {verifyWeekplayTransition}=await import('./qa/weekplay-transition.mjs');
  evidence.transition=await verifyWeekplayTransition({page,base,out,evaluate,milestone});evidence.shots.push(...evidence.transition.shots);
  for(const path of assetPaths)assert.equal(hash(await readFile(path)),assets[path],'frozen asset '+path);
  assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.assetFailures,[]);evidence.passed=true;await record();await context.close();
 }else{
 evidence.recovery=await evaluate(async()=>{const {verifyWeekplayRecovery}=await import('/tools/qa/weekplay-recovery.mjs');return verifyWeekplayRecovery();});await milestone('Native stale Worker and save recovery verified',evidence.recovery);
 await evaluate(async()=>{const p=await import('/src/avatar-v3-profile.js?rev=43');if(!p.saveProfile(localStorage,p.createProfile({name:'Неделя проверки'})).ok)throw Error('profile seed');});
 await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await page.waitForFunction(()=>weekQA.sleeping);
 await page.screenshot({path:out+'/initial-bedroom.png'});evidence.shots.push(out+'/initial-bedroom.png');assert.equal(await page.locator('#wake').isVisible(),true);
 await milestone('Initial bedroom and first sleep verified');
 await page.goto(base+'/__week');
 evidence.fixture=await evaluate(async()=>{
  const [{dossierBoardFixture},{longCampaignFixture},saves]=await Promise.all([import('/test/helpers/dossier-board-fixture.js'),import('/test/helpers/long-campaign-fixture.js'),import('/src/virtual-pc-state.js?rev=43')]);
  let s=dossierBoardFixture(),long=longCampaignFixture({tracks:20,day:10,battleId:'makarevich-1'}).state;
  s=saves.createVirtualPcState({...s,power:'on',projects:long.projects,creativeWork:long.creativeWork,music:{...long.music,needs:{satiety:100,energy:100}},lastGameMinute:13900});s.social.subscriptions=['makarevich-1'];s.phonePresentation={firstWakeAtMinute:13800,announcedIds:[]};
  for(const id of ['client','ft','notebook','dossier'])s.software[id].installed=true;
  if(!saves.saveVirtualPcState(localStorage,s))throw Error('campaign seed');
  localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:10,minutes:940,initialRest:false}));
  const stable={projects:s.projects,creativeWork:s.creativeWork,exports:s.audioExports,reports:s.rapAnalysis.reports,versions:s.trackVersions.byId};sessionStorage.setItem('weekplay-frozen',JSON.stringify(stable));
  return {projects:s.projects.length,plans:s.creativeWork.items.length,exports:s.audioExports.files.length,reports:Object.keys(s.rapAnalysis.reports).length};
 });assert.equal(evidence.fixture.projects,40);assert.equal(evidence.fixture.exports,20);assert.equal(evidence.fixture.reports,20);
 await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#continue-game').click();await page.waitForFunction(()=>weekQA.phase==='room'&&!weekQA.background.busy);
 async function measure(label){await evaluate(()=>weekQA.reset());await page.waitForFunction(()=>weekQA.samples.length>=360&&!weekQA.background.busy);const samples=await evaluate(()=>weekQA.samples);const row={label,...summarizeNative(samples),longTasks:await evaluate(()=>weekQA.longTasks)};evidence.performance.push(row);await writeFile(out+'/'+label.replaceAll(' ','-')+'-frames.json',JSON.stringify(samples));await milestone('Measured '+label,row);}
 await measure('20 project room');
 await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=computer]').click();await page.waitForFunction(()=>weekQA.phase==='desktop');
 evidence.coldOpen=await evaluate(()=>{const start=performance.now();weekQA.pc.open('rap-dossier');const opened=performance.now();weekQA.pc.dossierView.focusTarget({caseId:'battle:makarevich-1',trackVersionId:'weak'});return {openMs:opened-start,focusMs:performance.now()-opened,at:performance.now()};});await milestone('Cold board command cost',evidence.coldOpen);
 await measure('20 project caseboard');
 for(const [width,height] of [[1280,720],[1366,768],[1920,1080],[390,844]]){
  await page.setViewportSize({width,height});await page.getByRole('button',{name:'Вписать доску',exact:true}).click();await page.evaluate(()=>new Promise(requestAnimationFrame));
  assert.equal(await evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const path=out+'/whole-game-caseboard-'+width+'.png';await page.screenshot({path});evidence.shots.push(path);
  if(width!==390)await measure('caseboard '+width);
 }
 await page.setViewportSize({width:1280,height:720});
 evidence.svg=await evaluate(async()=>{const url='/assets/ui/virtual-pc/icons/dossier.svg',r=await fetch(url),img=new Image();img.src=url;await img.decode();return {mime:r.headers.get('content-type'),width:img.naturalWidth};});assert.equal(evidence.svg.mime,'image/svg+xml');assert.ok(evidence.svg.width>0);
 // Begin a real timed installer at the desktop; then leave it powered in the room.
 await evaluate(()=>{const s=structuredClone(weekQA.state);s.software.ft.installed=false;s.software.ft.receivedBytes=800000000;weekQA.setState(s);weekQA.pc.softwareAction('installer','ft');});
 for(const name of ['Далее >','Далее >','Установить'])await page.locator('[data-window-id=installer]').getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:'Слобода',exact:true}).click();await page.getByRole('menuitem',{name:'Отойти от ПК',exact:true}).click();await page.waitForFunction(()=>weekQA.phase==='room'&&weekQA.motion.phase==='idle');
 evidence.installAway=await evaluate(()=>({elapsed:weekQA.state.software.installer?.elapsedSeconds,installed:weekQA.state.software.ft.installed}));assert.ok(evidence.installAway.elapsed>0&&!evidence.installAway.installed);
 await milestone('Installer progresses away from desktop',evidence.installAway);
 await page.locator('#apartment').focus();await page.keyboard.press('Enter');await page.locator('#actions [data-action=bed]:not([data-sleep-mode])').click();await page.locator('#actions [data-sleep-mode=manual]').click();await page.waitForFunction(()=>weekQA.sleeping);
 const start=await evaluate(()=>({minute:weekQA.minute,now:performance.now(),resources:weekQA.resources()}));await evaluate(()=>weekQA.reset());
 const duration=process.env.WEEKPLAY_SMOKE==='1'?2000:224000;
 for(let waited=0;waited<duration;waited+=28000){await page.waitForTimeout(Math.min(28000,duration-waited));await milestone('Live manual sleep',await evaluate(()=>({minute:weekQA.minute,sleeping:weekQA.sleeping,installed:weekQA.state.software.ft.installed,frames:weekQA.samples.length})));}
 evidence.sleep=await evaluate(()=>({minute:weekQA.minute,now:performance.now(),sleeping:weekQA.sleeping,installed:weekQA.state.software.ft.installed,samples:weekQA.samples,notices:weekQA.state.phone.queue.length,background:weekQA.background}));
 assert.equal(evidence.sleep.sleeping,true);assert.equal(evidence.sleep.installed,true);assert.ok(evidence.sleep.now-start.now>=duration-20);assert.ok(evidence.sleep.minute-start.minute>=duration/1000*44);
 const sleepSamples=evidence.sleep.samples;delete evidence.sleep.samples;evidence.sleep.elapsedMs=evidence.sleep.now-start.now;evidence.sleep.gameMinutes=evidence.sleep.minute-start.minute;
 evidence.performance.push({label:'live manual sleep',...summarizeNative(sleepSamples)});await writeFile(out+'/live-sleep-frames.json',JSON.stringify(sleepSamples));
 await page.screenshot({path:out+'/live-manual-sleep.png'});evidence.shots.push(out+'/live-manual-sleep.png');await page.locator('#wake').click();await page.waitForFunction(()=>!weekQA.sleeping&&weekQA.motion.phase==='idle');
 await milestone('Manual week woke explicitly',evidence.sleep);
 // UI interaction/lifecycle checks are kept separate from timing collection.
 const {verifyWeekplayUi}=await import('./qa/weekplay-ui.mjs');evidence.ui=await verifyWeekplayUi({page,out,evaluate});
 evidence.preservation=await evaluate(async()=>{
  const before=JSON.parse(sessionStorage.getItem('weekplay-frozen')),s=weekQA.state,hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join(''),rows={};
  for(const [key,after] of Object.entries({projects:s.projects,creativeWork:s.creativeWork,exports:s.audioExports,reports:Object.fromEntries(Object.keys(before.reports).map(k=>[k,s.rapAnalysis.reports[k]])),versions:Object.fromEntries(Object.keys(before.versions).map(k=>[k,s.trackVersions.byId[k]]))}))rows[key]={before:await hash(before[key]),after:await hash(after)};
  return rows;
 });for(const [key,row]of Object.entries(evidence.preservation))assert.equal(row.after,row.before,'frozen '+key);
 evidence.dispose=await evaluate(()=>{const before=weekQA.resources();weekQA.dispose();return {before,after:weekQA.resources()};});for(const key of ['observers','workers','intervals','rows','sources'])assert.equal(evidence.dispose.after[key],0,'disposed '+key);
 for(const path of assetPaths)assert.equal(hash(await readFile(path)),assets[path],'frozen asset '+path);
 assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.assetFailures,[]);
 for(const row of evidence.performance)assertNativeTargets(row,row.label);
 evidence.passed=process.env.WEEKPLAY_SMOKE!=='1';await record();await milestone('Native integration complete',{passed:evidence.passed});await context.close();
 }
}catch(error){evidence.failure=error.stack;if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally{try{await browser?.close();}finally{server.closeAllConnections();if(server.listening)await new Promise(done=>server.close(done));evidence.cleanup={browserClosed:!browser?.isConnected(),serverClosed:!server.listening};await record();}}
