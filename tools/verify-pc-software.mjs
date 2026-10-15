// The whole download/install chain is a local game simulation in isolated contexts.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||resolve('artifacts/task8-browser-downloads'),root=resolve('.'),base='http://127.0.0.1:4188';await mkdir(output,{recursive:true});
await mkdir(resolve('artifacts/v-krugu-qa/browser-temp'),{recursive:true});process.env.TEMP=process.env.TMP=resolve('artifacts/v-krugu-qa/browser-temp');
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,base).pathname,path=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
const qaCase=process.env.PC_SOFTWARE_QA_CASES||'browser-downloads';
let source=await readFile('src/apartment-app.js','utf8');
source=source.replace('function update(dt,now,step=false){','function updateOriginal(dt,now,step=false){').replace("loading.hidden=true;setMode('menu');",`window.softwareQA={samples:[],get state(){return pcState},get pc(){return virtualPc},pause(value){paused=value},save(){persistPc(pcState)},quota(value){const real=window.localStorage;storage=value?{getItem:k=>real.getItem(k),setItem(){throw Error('QA quota');}}:real},resetMetrics(){this.samples=[];this.lastNow=null}};
function update(dt,now,step=false){const start=performance.now();updateOriginal(dt,now,step);if(mode==='pc')softwareQA.samples.push({ms:performance.now()-start,dt:softwareQA.lastNow?now-softwareQA.lastNow:0});softwareQA.lastNow=now;}
loading.hidden=true;setMode('menu');`);
let browser;const errors=[];
const key='battle-life-virtual-pc-v1';
async function fixture(seed){
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/apartment-app.js*',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.route('**/__software-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body>Isolated software fixture</body>'}));
 if(seed){await page.goto(base+'/__software-fixture');await page.evaluate(async seed=>{
  const [{createProfile},{createVirtualPcState}]=await Promise.all([import('/src/avatar-v3-profile.js?rev=42'),import('/src/virtual-pc-state.js?rev=42')]);
  localStorage.setItem('battle-life-apartment-v3',JSON.stringify(createProfile({name:'Software QA'})));
  const pc=createVirtualPcState(seed);if(seed.legacy)delete pc.software;
  localStorage.setItem('battle-life-virtual-pc-v1',JSON.stringify(pc));localStorage.setItem('battle-life-apartment-v3-time',JSON.stringify({day:1,minutes:720,initialRest:false}));
 },seed);}
 await page.goto(base+'/?qa=software');await page.locator('#loading').waitFor({state:'hidden'});return {context,page};
}
const pc=page=>page.locator('#virtual-pc'),frame=(page,id)=>pc(page).locator('.pc-window[data-window-id="'+id+'"]');
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const idle=page=>page.waitForFunction(()=>!document.querySelector('#actions [data-action=computer]').disabled);
const phase=(page,value)=>page.waitForFunction(value=>document.querySelector('#virtual-pc')?.dataset.pcTransition===value,value);
async function enter(page){await idle(page);await page.locator('#apartment').focus();await page.locator('#apartment').press('Enter');await page.locator('#actions [data-action=computer]').click();await phase(page,'desktop');}
async function start(page,label){await pc(page).getByRole('button',{name:'Слобода',exact:true}).click();await pc(page).getByRole('menuitem',{name:label,exact:true}).click();}
async function launch(page,id){await start(page,{'computer':'Мой компьютер',underweb:'Underweb',torent:'torent','ft-studio':'FT Studio'}[id]);await frame(page,id).waitFor({state:'visible'});}
async function navigate(page,address){const input=frame(page,'underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await input.fill(address);await input.press('Enter');}
async function leave(page){await start(page,'Отойти от ПК');await phase(page,'room');await idle(page);}
async function sleep(page){await idle(page);await page.locator('#apartment').focus();await page.locator('#apartment').press('Enter');await page.locator('#actions [data-action=bed]').click();await page.locator('#wake').waitFor({state:'visible'});await page.locator('#wake').waitFor({state:'hidden'});await idle(page);}
async function install(page,{destination,screenshot}={}){
 const w=frame(page,'installer');await w.getByRole('button',{name:'Далее >',exact:true}).click();
 if(destination)await w.getByRole('textbox',{name:'Папка установки',exact:true}).fill(destination);
 await w.getByRole('button',{name:'Далее >',exact:true}).click();if(screenshot)await page.screenshot({path:output+'/'+screenshot});
 await w.getByRole('button',{name:'Установить',exact:true}).click();
 assert.equal(await w.getByRole('button',{name:'Установка…',exact:true}).isDisabled(),true);
 assert.equal(await w.getByRole('progressbar').count(),1);
 await w.getByRole('button',{name:'Готово',exact:true}).click({timeout:45000});
}
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(4188,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
 if(qaCase==='browser-downloads'){
  const {context,page}=await fixture({power:'on',software:{notebook:{receivedBytes:4000000}}});
  await page.locator('#continue-game').click();await enter(page);await launch(page,'underweb');await navigate(page,'underweb://dump/ft-studio');
  await frame(page,'underweb').getByRole('button',{name:'Скачать FT-Studio.torrent',exact:true}).click();
  await page.waitForFunction(()=>softwareQA.state.browserDownloads.items[0]?.elapsedSeconds>=.3);await page.evaluate(()=>{softwareQA.pause(true);softwareQA.save();});
  const partial=await page.evaluate(()=>softwareQA.state.browserDownloads.items[0].elapsedSeconds);assert.ok(partial>0&&partial<1);assert.equal(await page.evaluate(()=>softwareQA.state.software.metadata),false);
  await page.screenshot({path:output+'/browser-partial.png'});await page.reload();await page.locator('#loading').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>softwareQA.state.browserDownloads.items[0].elapsedSeconds),partial);
  await page.locator('#continue-game').click();await enter(page);await launch(page,'underweb');
  const metadata=frame(page,'underweb').getByRole('button',{name:'Открыть файл FT-Studio.torrent',exact:true});await metadata.waitFor();await metadata.click();
  assert.equal(await frame(page,'underweb').getAttribute('data-active'),'true');assert.equal(await page.evaluate(()=>Object.keys(softwareQA.state.software.transfers).length),0);
  assert.match(await frame(page,'underweb').innerText(),/Сначала скачай и установи torent/);
  await navigate(page,'underweb://dump/client');const began=performance.now();await frame(page,'underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();
  const address=frame(page,'underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await address.fill('Незавершённый адрес');await address.evaluate(n=>{n.focus();n.setSelectionRange(3,9);});
  await page.waitForFunction(()=>softwareQA.state.software.client.receivedBytes===2000000);const downloadSeconds=(performance.now()-began)/1000;assert.ok(downloadSeconds>=.9&&downloadSeconds<2,downloadSeconds);
  assert.equal(await address.inputValue(),'Незавершённый адрес');assert.deepEqual(await address.evaluate(n=>[document.activeElement===n,n.selectionStart,n.selectionEnd]),[true,3,9]);assert.equal(await frame(page,'installer').count(),0);
  await page.screenshot({path:output+'/browser-complete.png'});
  const installerFile=frame(page,'underweb').getByRole('button',{name:'Открыть файл torent-setup.exe',exact:true});await installerFile.click();
  await frame(page,'underweb').getByRole('button',{name:'Закрыть окно',exact:true}).click();await page.waitForTimeout(1200);assert.equal(await frame(page,'installer').count(),0);
  await launch(page,'underweb');const launched=performance.now();await installerFile.click();await frame(page,'installer').waitFor({state:'visible'});const launchSeconds=(performance.now()-launched)/1000;assert.ok(launchSeconds>=.9&&launchSeconds<2,launchSeconds);
  await install(page,{destination:'C:\\Tools\\torent',screenshot:'browser-panel-installer.png'});assert.equal(await page.evaluate(()=>softwareQA.state.software.client.installed),true);
  await launch(page,'underweb');await metadata.click();assert.equal(await frame(page,'torent').getAttribute('data-active'),'true');
  await launch(page,'underweb');await navigate(page,'underweb://dump/dossier');await frame(page,'underweb').getByRole('button',{name:'Скачать Rap-Dossier.torrent',exact:true}).click();await frame(page,'underweb').getByRole('button',{name:'Открыть файл Rap-Dossier.torrent',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>Object.keys(softwareQA.state.software.transfers).sort()),['dossier','ft']);
  await launch(page,'computer');const folder=frame(page,'computer').getByRole('textbox',{name:'Адрес папки',exact:true});await folder.fill('C:\\Загрузки');await folder.press('Enter');
  const archive=frame(page,'computer').getByRole('button',{name:'Открыть Rap-Notebook-setup.exe',exact:true});await archive.click();await folder.fill('C:\\Черновик');await folder.focus();await page.waitForTimeout(700);
  assert.equal(await archive.getAttribute('aria-pressed'),'true');assert.equal(await folder.inputValue(),'C:\\Черновик');assert.equal(await folder.evaluate(n=>document.activeElement===n),true);await page.screenshot({path:output+'/explorer-selected.png'});
  await archive.press('Enter');await frame(page,'installer').waitFor({state:'visible'});await install(page,{screenshot:'explorer-installer.png'});assert.equal(await page.evaluate(()=>softwareQA.state.software.notebook.installed),true);
  await launch(page,'underweb');await navigate(page,'underweb://dump/notebook');await page.evaluate(()=>softwareQA.quota(true));
  const count=await page.evaluate(()=>softwareQA.state.browserDownloads.items.length);await frame(page,'underweb').getByRole('button',{name:'Скачать Rap-Notebook.torrent',exact:true}).click();assert.equal(await page.evaluate(()=>softwareQA.state.browserDownloads.items.length),count);assert.match(await pc(page).innerText(),/Сохранение браузера недоступно/);await page.evaluate(()=>softwareQA.quota(false));
  const metrics=[];for(const [width,height]of [[1280,720],[1366,768],[1920,1080]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>softwareQA.resetMetrics());await page.waitForFunction(()=>softwareQA.samples.length>=180);
   const samples=await page.evaluate(()=>softwareQA.samples),times=samples.map(s=>s.ms).sort((a,b)=>a-b),frames=samples.map(s=>s.dt).filter(n=>n>0).sort((a,b)=>a-b),p95=a=>a[Math.floor(a.length*.95)];
   const metric={width,height,samples:samples.length,updateP95:p95(times),updateMax:times.at(-1),frameP95:p95(frames),frameMax:frames.at(-1)};metrics.push(metric);console.log(JSON.stringify(metric));await page.screenshot({path:output+'/browser-'+width+'x'+height+'.png'});
   assert.ok(metric.updateP95<=20,'update p95');assert.ok(metric.frameP95<=25,'frame p95');
  }
  await writeFile(output+'/native-results.json',JSON.stringify({origin:base,partial,downloadSeconds,launchSeconds,metrics,errors},null,2));await context.close();
  console.log('PASS actual host: partial reload → metadata without client → 1s browser file → 1s cancellable launch → panel installation → two manual torrents → Explorer selection and installation → quota rollback');
  const full=await fixture({power:'on',projects:Array.from({length:1000},(_,i)=>({id:String(i)}))});await full.page.locator('#continue-game').click();await enter(full.page);await launch(full.page,'underweb');await navigate(full.page,'underweb://dump/client');await frame(full.page,'underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();assert.match(await frame(full.page,'underweb').innerText(),/Недостаточно места/);assert.equal(await full.page.evaluate(()=>softwareQA.state.browserDownloads.items.length),0);await full.page.screenshot({path:output+'/browser-disk-full.png'});await full.context.close();console.log('PASS native shared disk capacity rejection');
 }
 if(qaCase==='legacy-full'){
  const {context,page}=await fixture();await page.locator('#new-game').click();await page.locator('#character-name').fill('Софт из форума');await page.locator('#next-step').click();await page.locator('#start-game').click();await page.locator('#wake').click();await enter(page);
  assert.equal(await pc(page).locator('.pc-icon[data-app=torent]').count(),0);await launch(page,'underweb');await navigate(page,'underweb://dump');await page.screenshot({path:output+'/software-forum.png'});
  await frame(page,'underweb').getByRole('button',{name:'torent — торрент-клиент',exact:true}).click();await frame(page,'underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();
  await frame(page,'underweb').getByRole('button',{name:'Открыть файл torent-setup.exe',exact:true}).waitFor();await frame(page,'underweb').getByRole('button',{name:'Открыть файл torent-setup.exe',exact:true}).click();
  await install(page,{destination:'C:\\Tools\\torent',screenshot:'software-client-wizard.png'});await launch(page,'torent');assert.match(await frame(page,'torent').innerText(),/Нет задач/);await page.screenshot({path:output+'/software-empty-client.png'});
  await start(page,'Underweb');await navigate(page,'underweb://dump/ft-studio');await frame(page,'underweb').getByRole('button',{name:'Скачать FT-Studio.torrent',exact:true}).click();await frame(page,'underweb').getByRole('button',{name:'Открыть файл FT-Studio.torrent',exact:true}).click();
  assert.equal(await frame(page,'torent').getAttribute('data-active'),'true');assert.equal(await pc(page).locator('.pc-window[data-window-id=torent]').count(),1);
  await frame(page,'torent').getByRole('button',{name:'Ⅱ Пауза',exact:true}).click();const paused=(await state(page)).software.ft.receivedBytes;await page.waitForTimeout(900);assert.equal((await state(page)).software.ft.receivedBytes,paused);
  await frame(page,'torent').getByRole('button',{name:'▶ Продолжить',exact:true}).click();await start(page,'Выключение');await pc(page).getByRole('button',{name:'Выключить',exact:true}).click();await phase(page,'room');await idle(page);const stopped=(await state(page)).software.ft.receivedBytes;
  await sleep(page);assert.equal((await state(page)).software.ft.receivedBytes,stopped);await enter(page);await launch(page,'torent');await page.screenshot({path:output+'/software-transfer.png'});
  await leave(page);await sleep(page);assert.ok((await state(page)).software.ft.receivedBytes>stopped+600000000);await sleep(page);assert.equal((await state(page)).download.status,'ready-to-install');
  const before=await state(page);await page.reload();await page.locator('#loading').waitFor({state:'hidden'});assert.equal((await state(page)).software.ft.receivedBytes,before.software.ft.receivedBytes);await page.locator('#continue-game').click();await enter(page);await launch(page,'torent');await frame(page,'torent').getByRole('button',{name:'Установить',exact:true}).click();
  await frame(page,'installer').getByRole('button',{name:'Далее >',exact:true}).click();const input=frame(page,'installer').getByRole('textbox',{name:'Папка установки',exact:true});await input.fill('C:\\Audio\\FT Studio');await input.focus();await page.waitForTimeout(800);assert.equal(await input.inputValue(),'C:\\Audio\\FT Studio');assert.equal(await input.evaluate(n=>document.activeElement===n),true);
  await frame(page,'installer').getByRole('button',{name:'Далее >',exact:true}).click();await page.screenshot({path:output+'/software-ft-wizard.png'});await page.keyboard.press('Escape');assert.equal((await state(page)).software.installer,null);assert.equal((await state(page)).software.ft.receivedBytes,800000000);
  await frame(page,'torent').getByRole('button',{name:'Установить',exact:true}).click();await page.setViewportSize({width:480,height:720});await frame(page,'installer').getByRole('button',{name:'Далее >',exact:true}).click();await page.screenshot({path:output+'/software-narrow-wizard.png'});
  const bounds=await frame(page,'installer').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=480&&bounds.y+bounds.height<=689);
  await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height:900});await frame(page,'torent').getByRole('button',{name:'Установить',exact:true}).click();await install(page,{destination:'C:\\Audio\\FT Studio'});
  assert.equal((await state(page)).software.ft.path,'C:\\Audio\\FT Studio');await launch(page,'computer');const address=frame(page,'computer').getByRole('textbox',{name:'Адрес папки',exact:true});await address.fill('C:\\Audio\\FT Studio');await address.press('Enter');for(const name of ['Data','Projects','Plugins','Presets'])assert.equal(await frame(page,'computer').getByRole('button',{name:'Открыть папку '+name,exact:true}).count(),1);await page.screenshot({path:output+'/software-explorer.png'});
  await address.fill('C:\\Загрузки');await address.press('Enter');assert.equal(await frame(page,'computer').getByRole('button',{name:'Открыть FT-Studio-setup.zip',exact:true}).count(),1);await launch(page,'ft-studio');await page.screenshot({path:output+'/software-ft-open.png'});await context.close();console.log('PASS real new game: forum → client → empty queue → metadata → pause/shutdown → sleep → reload → wizard → custom Explorer path → FT');
 }
 if(qaCase==='legacy-full'){
  const {context,page}=await fixture({power:'on',legacy:true,download:{status:'installed'},projects:[{id:'keep',name:'Архив',sourceStems:['kick.wav'],chosenAudio:'kick.wav'}],household:{fridge:{pear:3}},music:{cash:321,practice:7}});const s=await state(page);assert.equal(s.download.status,'installed');assert.deepEqual(s.projects[0].sourceStems,['kick.wav']);assert.equal(s.music.cash,321);assert.equal(s.household.fridge.pear,3);await page.locator('#continue-game').click();await enter(page);await launch(page,'ft-studio');await page.screenshot({path:output+'/software-legacy-ft.png'});await context.close();console.log('PASS old installed FT and projects/audio/wallet/household preserved');
 }
 if(qaCase==='legacy-full'){
  const {context,page}=await fixture({power:'on',projects:Array.from({length:1000},(_,i)=>({id:String(i)}))});await page.locator('#continue-game').click();await enter(page);await launch(page,'underweb');await navigate(page,'underweb://dump/client');await frame(page,'underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();assert.match(await frame(page,'underweb').innerText(),/Недостаточно места/);assert.deepEqual((await state(page)).software.transfers,{});await page.screenshot({path:output+'/software-disk-full.png'});await context.close();console.log('PASS shared disk full rejects new bytes with visible reason');
 }
 if(qaCase==='supplement'){
  const {context,page}=await fixture({power:'on',lastGameMinute:0,software:{client:{installed:true,receivedBytes:2000000},ft:{receivedBytes:10000000},metadata:true,task:{appId:'ft',baseMinute:0,baseBytes:10000000}}});
  await page.locator('#continue-game').click();await enter(page);await launch(page,'torent');assert.ok((await state(page)).software.ft.receivedBytes<20000000,'stale saved game clock cannot credit the whole interval after load');
  await frame(page,'torent').getByRole('button',{name:'Ⅱ Пауза',exact:true}).click();const partial=(await state(page)).software.ft.receivedBytes;await page.reload();await page.locator('#loading').waitFor({state:'hidden'});assert.equal((await state(page)).software.ft.receivedBytes,partial);
  await page.locator('#continue-game').click();await enter(page);await launch(page,'torent');assert.equal((await state(page)).software.ft.receivedBytes,partial);await frame(page,'torent').getByRole('button',{name:'× Отменить',exact:true}).click();
  for(const name of ['Ⅱ Пауза','▶ Продолжить','× Отменить']){const control=frame(page,'torent').getByRole('button',{name,exact:true});assert.equal(await control.isDisabled(),true);assert.equal(await control.evaluate(n=>getComputedStyle(n).color),'rgb(150, 149, 143)');}
  await page.screenshot({path:output+'/software-empty-client.png'});await launch(page,'underweb');await navigate(page,'underweb://dump');
  assert.equal(await frame(page,'underweb').getByRole('button',{name:'Файловая помойка',exact:true}).last().evaluate(n=>getComputedStyle(n).fontSize),'28px');
  await page.screenshot({path:output+'/software-forum.png'});await page.setViewportSize({width:480,height:720});await page.screenshot({path:output+'/software-narrow-forum.png'});
  await context.close();console.log('PASS partial reload has no retroactive credit, toolbar disabled appearance, final compact forum desktop/narrow');
 }
 assert.deepEqual(errors,[]);console.log('PASS zero browser page errors');
}catch(error){for(const context of browser?.contexts()??[])for(const page of context.pages()){await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.log((await page.locator('body').innerText()).slice(-2500));}throw error;}finally{try{await browser?.close();}finally{server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));}}
