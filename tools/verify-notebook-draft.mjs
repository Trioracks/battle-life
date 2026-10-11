import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core');
const output=process.env.NOTEBOOK_DRAFT_QA_DIR||'D:/Codex/Builds/Battle/notebook-draft-20261011';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],metrics=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/__notebook-draft-qa',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/virtual-pc.css"><link rel="stylesheet" href="/desktop-apps.css"><link rel="stylesheet" href="/rap-notebook.css"><style>html,body{height:100%;margin:0}</style><section id="virtual-pc"></section><script type="module">
import {mountVirtualPc} from '/src/virtual-pc-ui.js?rev=32';import {createVirtualPcState} from '/src/virtual-pc-state.js?rev=32';import {advanceLyricWork} from '/src/lyric-production.js?rev=32';
window.pc=mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:s=>{localStorage.setItem('isolated-notebook',JSON.stringify(s));return true;},onWork:()=>true});
pc.showDesktop(createVirtualPcState(JSON.parse(localStorage.getItem('isolated-notebook')||'null')||{power:'on',software:{notebook:{installed:true}},music:{needs:{satiety:100,energy:100}}}));pc.syncHost({gameDay:1,playerName:'Проверка',skills:{writing:10},clockLabel:'12:00'});pc.open('rap-notebook');
window.finish=()=>{const next=advanceLyricWork(pc.state,1000).state;pc.syncState(next);pc.persist(next);};window.ready=true;
</script>`}));
const shot=name=>page.screenshot({path:output+'/'+name+'.png'});
async function layout(label){
 const result=await page.evaluate(()=>{
  const sheet=document.querySelector('.rn-sheet'),box=sheet.getBoundingClientRect();
  const nodes=[...sheet.querySelectorAll('.rn-empty,.rn-line-body,.rn-meta h1')];
  return {gutter:42,offsets:nodes.map(n=>n.getBoundingClientRect().left-box.left),sheetOverflow:sheet.scrollWidth-sheet.clientWidth,rootOverflow:document.documentElement.scrollWidth-innerWidth};
 });metrics.push({label,...result});assert.ok(result.offsets.length);assert.ok(result.offsets.every(x=>x>=46),label+': content overlaps gutter '+JSON.stringify(result));assert.ok(result.sheetOverflow<=1);assert.ok(result.rootOverflow<=1);
}
try{
 await page.goto('http://127.0.0.1:4173/__notebook-draft-qa');await page.waitForFunction(()=>window.ready);
 await shot('00-welcome');await layout('welcome');
 await page.getByRole('button',{name:'Новый текст',exact:true}).click();await page.getByRole('textbox',{name:'Название текста'}).fill('Голос спального района');await page.getByRole('button',{name:'Создать текст',exact:true}).click();
 await shot('01-empty-document');await layout('empty document');
 for(let stage=1;stage<=3;stage++){
  await page.getByRole('button',{name:'Начать работу',exact:true}).click();await page.evaluate(()=>finish());
  await shot('stage-'+stage+'-1280');await layout('stage'+stage);
  if(stage===1){assert.equal(await page.locator('.rn-section h2').count(),0);assert.ok(await page.locator('.rn-note').count()>0);}
 }
 for(const width of [640,480,1280]){await page.setViewportSize({width,height:900});await shot('finished-'+width);await layout('finished'+width);}
 const icons=await page.locator('.pc-window[data-window-id=rap-notebook] .pc-window-title img').first().getAttribute('src');assert.match(icons,/notebook\.svg$/);
 const before=await page.evaluate(()=>JSON.stringify(pc.state.projects));await page.reload();await page.waitForFunction(()=>window.ready);assert.equal(await page.evaluate(()=>JSON.stringify(pc.state.projects)),before);
 assert.deepEqual(errors,[]);await writeFile(output+'/evidence.json',JSON.stringify({passed:true,metrics,errors},null,2));console.log('PASS notebook gutter, progressive document, own icon, 480/640/1280 and reload');
}catch(error){await shot('failure').catch(()=>{});throw error;}finally{await context.close();await browser.close();}
