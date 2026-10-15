// Isolated native acceptance; no player's origin/profile is read or modified.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const root=resolve('.'),out=resolve('artifacts/dossier-weekplay/task-5'),port=4196,base='http://127.0.0.1:'+port;
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,base).pathname,path=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}});
let browser,context,page;const errors=[],evidence={origin:base};
const frame=id=>page.locator('.pc-window[data-window-id="'+id+'"]'),downloads=()=>frame('underweb').getByRole('dialog',{name:'Загрузки Underweb',exact:true});
const button=name=>frame('underweb').getByRole('button',{name,exact:true});
async function boot(){
 await page.goto(base+'/__download-popover');
 await page.evaluate(async()=>{
  const [{mountVirtualPc},{createVirtualPcState,loadVirtualPcState,saveVirtualPcState,diskUsage},{explorerEntries}]=await Promise.all([import('/src/virtual-pc-ui.js?rev=42'),import('/src/virtual-pc-state.js?rev=42'),import('/src/virtual-pc-explorer.js?rev=42')]);
  const listeners=new Set(),add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
  document.addEventListener=(type,fn,options)=>{if(options===true&&['keydown','pointerdown'].includes(type))listeners.add(fn);add(type,fn,options);};
  document.removeEventListener=(type,fn,options)=>{listeners.delete(fn);remove(type,fn,options);};
  const state=localStorage.getItem('battle-life-virtual-pc-v1')?loadVirtualPcState(localStorage).state:createVirtualPcState({power:'on'});
  const pc=mountVirtualPc(document.querySelector('main'),{onPersist:next=>saveVirtualPcState(localStorage,next)});
  window.qa={pc,listeners,diskUsage,explorerEntries,files:()=>explorerEntries(pc.state,'downloads'),usage:()=>diskUsage(pc.state)};
  pc.showDesktop(state);pc.open('underweb');
 });
 await frame('underweb').waitFor();
}
async function snapshot(name){await page.screenshot({path:out+'/'+name+'.png'});}
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 context=await browser.newContext({viewport:{width:1280,height:800}});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/__download-popover',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Downloads isolated acceptance</title><link rel="stylesheet" href="/virtual-pc.css"><link rel="stylesheet" href="/desktop-apps.css"><link rel="stylesheet" href="/underweb-world.css"><style>body{margin:0;height:100vh}#virtual-pc{position:relative;display:block;width:100vw;height:100vh}</style><main id="virtual-pc"></main>'}));
 await boot();assert.equal(await downloads().isVisible(),false);
 const svg=await page.request.get(base+'/assets/ui/virtual-pc/icons/underweb.svg');assert.match(svg.headers()['content-type'],/^image\/svg\+xml/);assert.equal(svg.ok(),true);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));evidence.svgMime=svg.headers()['content-type'];evidence.svgDecode=true;
 const address=frame('underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await address.fill('underweb://dump/client');await address.press('Enter');
 await button('Скачать установщик torent').click();assert.equal(await downloads().isVisible(),true);
 evidence.arrivalAnimation=await button('Загрузки').locator('.uw-download-arrival').evaluate(node=>getComputedStyle(node).animationName);assert.equal(evidence.arrivalAnimation,'uw-download-arrival');
 await page.evaluate(()=>qa.pc.tickBrowserDownloads(.35));assert.match(await downloads().innerText(),/1 с/);await snapshot('popover-partial');
 await page.keyboard.press('Escape');assert.equal(await downloads().isVisible(),false);assert.equal(await button('Загрузки').evaluate(n=>n===document.activeElement),true);assert.equal(await frame('underweb').isVisible(),true);
 await page.keyboard.press('Enter');assert.equal(await downloads().isVisible(),true);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Открыть папку загрузок');
 await address.click();assert.equal(await downloads().isVisible(),false);evidence.keyboardAndOutside=true;
 await page.evaluate(()=>{qa.pc.tickBrowserDownloads(.65);for(const id of ['ft','dossier']){qa.pc.softwareAction('download-metadata',id);qa.pc.tickBrowserDownloads(1);}qa.pc.softwareAction('download-metadata','notebook');qa.pc.tickBrowserDownloads(.5);});
 assert.equal(await frame('installer').count(),0,'completion never opens an installer');
 evidence.controlContrast=await button('Очистить завершённые загрузки').evaluate(node=>{
  const style=getComputedStyle(node),channels=color=>color.match(/[\d.]+/g).slice(0,3).map(Number),luminance=color=>channels(color).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const ink=luminance(style.color),paper=luminance(style.backgroundColor);return {ratio:(Math.max(ink,paper)+.05)/(Math.min(ink,paper)+.05),surfaceLuminance:paper};
 });assert.ok(evidence.controlContrast.ratio>=4.5&&evidence.controlContrast.surfaceLuminance<.2,'download controls must remain legible on their dark popover surface');
 assert.equal(await downloads().locator('.uw-download-row').count(),3);assert.deepEqual(await downloads().locator('.uw-download-name').allTextContents(),['Rap-Notebook.torrent','Rap-Dossier.torrent','FT-Studio.torrent']);
 evidence.compact=await downloads().boundingBox();assert.ok(evidence.compact.width<=361);await snapshot('popover-latest-three');
 await button('Подробнее о загрузках').click();assert.equal(await downloads().locator('.uw-download-row').count(),4);await snapshot('popover-full-history');
 evidence.beforeClear=await page.evaluate(()=>({files:qa.files(),usage:qa.usage()}));await button('Очистить завершённые загрузки').click();assert.deepEqual(await downloads().locator('.uw-download-name').allTextContents(),['Rap-Notebook.torrent']);
 assert.deepEqual(await page.evaluate(()=>({files:qa.files(),usage:qa.usage()})),evidence.beforeClear);await boot();assert.equal(await downloads().isVisible(),false);
 assert.deepEqual(await page.evaluate(()=>({files:qa.files(),usage:qa.usage()})),evidence.beforeClear);await button('Загрузки').click();assert.deepEqual(await downloads().locator('.uw-download-name').allTextContents(),['Rap-Notebook.torrent']);await snapshot('popover-reloaded-partial');
 await button('Открыть папку загрузок').click();assert.equal(await frame('computer').getByRole('textbox',{name:'Адрес папки',exact:true}).inputValue(),'C:\\Загрузки');await snapshot('explorer-preserved-files');
 await frame('computer').getByRole('button',{name:'Закрыть окно',exact:true}).click();await page.evaluate(()=>qa.pc.open('underweb'));
 const initialListeners=await page.evaluate(()=>qa.listeners.size);assert.equal(initialListeners,2);
 for(let i=0;i<3;i++){await frame('underweb').getByRole('button',{name:'Закрыть окно',exact:true}).click();assert.equal(await page.evaluate(()=>qa.listeners.size),0);await page.evaluate(()=>qa.pc.open('underweb'));assert.equal(await page.evaluate(()=>qa.listeners.size),initialListeners);assert.equal(await downloads().isVisible(),false);}
 evidence.reopenCycles=3;
 await page.evaluate(()=>{qa.pc.softwareAction('download-client');});assert.equal(await downloads().isVisible(),true);assert.equal(await page.evaluate(()=>qa.pc.state.browserDownloads.items.length),4);assert.deepEqual(await page.evaluate(()=>qa.usage()),evidence.beforeClear.usage);evidence.repeatNoDuplicate=true;
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>qa.pc.softwareAction('download-metadata','ft'));
 evidence.reducedMotion=await button('Загрузки').locator('.uw-download-arrival').evaluate(n=>({display:getComputedStyle(n).display,animation:getComputedStyle(n).animationName}));assert.deepEqual(evidence.reducedMotion,{display:'none',animation:'none'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(requestAnimationFrame));const narrow=await downloads().boundingBox();assert.ok(narrow.x>=0&&narrow.x+narrow.width<=391);await snapshot('popover-narrow-reduced-motion');evidence.narrow=narrow;
 await page.setViewportSize({width:1280,height:800});await page.evaluate(async()=>{
  const [{mountVirtualPc},{createVirtualPcState}]=await Promise.all([import('/src/virtual-pc-ui.js?rev=42'),import('/src/virtual-pc-state.js?rev=42')]);
  qa.pc.dispose();qa.pc=mountVirtualPc(document.querySelector('main'),{onPersist:()=>true});qa.pc.showDesktop(createVirtualPcState({power:'on',projects:Array.from({length:1000},(_,i)=>({id:String(i)}))}));qa.pc.open('underweb');qa.pc.softwareAction('download-metadata','notebook');
 });
 assert.match(await downloads().innerText(),/Недостаточно места/);await snapshot('popover-no-room');evidence.noRoom=true;
 assert.deepEqual(errors,[]);evidence.pageErrors=errors;await writeFile(out+'/native-evidence.json',JSON.stringify(evidence,null,2));
 console.log('PASS native: compact latest3/full4, one-second partial/completion, manual installer, Escape/Tab/outside, durable clear/files/bytes/reload, folder routing, repeat dedup,3close/reopens, narrow/reduced-motion, no-room, SVG MIME/decode, zero page errors');
}catch(error){if(page){await snapshot('native-failure').catch(()=>{});await writeFile(out+'/native-failure.json',JSON.stringify({error:error.stack,pageErrors:errors,body:await page.locator('body').innerText()},null,2)).catch(()=>{});}throw error;}
finally{await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));}
