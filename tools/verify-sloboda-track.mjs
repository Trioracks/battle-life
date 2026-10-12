// Isolated DOM integration: real components, public production APIs, no player saves.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const output=process.env.FT_QA_DIR||'D:/Codex/Builds/Battle/sloboda-track';
await mkdir(output+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=output+'/browser-temp';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
const base=process.env.BATTLE_QA_URL||'http://127.0.0.1:4175';
const pc=()=>page.locator('#virtual-pc'),win=id=>pc().locator('.pc-window[data-window-id="'+id+'"]');
async function shot(name){await page.screenshot({path:output+'/'+name+'.png'});console.log('SHOT '+name);}
async function start(label){await pc().getByRole('button',{name:'Слобода',exact:true}).click();await pc().getByRole('menuitem',{name:label,exact:true}).click();}
async function go(url){await start('Underweb');const a=win('underweb').getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true});await a.fill(url);await a.press('Enter');}
try{
 await page.route('**/__sloboda-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/virtual-pc.css?rev=35"><link rel="stylesheet" href="/desktop-apps.css?rev=35"><link rel="stylesheet" href="/rap-notebook.css?rev=35"><style>body{margin:0}</style><section id="virtual-pc"></section>'}));
 await page.goto(base+'/__sloboda-qa');
 await page.evaluate(async()=>{
  const [ui,state,soft,transfer,creative,work,vocal]=await Promise.all(['virtual-pc-ui','virtual-pc-state','pc-software','pc-transfer-runtime','creative-workflow','home-creative-work','vocal-production'].map(n=>import('/src/'+n+'.js?rev=35')));
  window.qa={state,soft,transfer,creative,work,vocal};window.pc=ui.mountVirtualPc(document.querySelector('#virtual-pc'),{onWork:()=>true,getMetadata:()=>({gameDay:2,skills:{writing:10,beatmaking:10,flow:10,sound:10}})});
  pc.showDesktop(state.createVirtualPcState({power:'on'}));pc.syncHost({gameDay:2,skills:{writing:10,beatmaking:10,flow:10,sound:10}});
  qa.install=()=>{pc.softwareAction('next');pc.softwareAction('next');pc.softwareAction('next');pc.syncState(soft.advanceInstallation(pc.state,30).state);};
 });
 await go('underweb://dump');await shot('tracker-1280');
 await go('underweb://dump/client');await win('underweb').getByRole('button',{name:'Скачать установщик torent',exact:true}).click();
 await page.evaluate(()=>pc.syncState(qa.transfer.advanceTransfers(pc.state,0,10).state));
 await win('underweb').getByRole('button',{name:'Открыть установщик torent',exact:true}).click();await shot('installer-client');
 await page.evaluate(()=>qa.install());await win('installer').getByRole('button',{name:'Готово',exact:true}).click();await win('torent').waitFor();
 for(const id of ['ft','notebook'])await page.evaluate(id=>{pc.syncState(qa.soft.downloadMetadata(pc.state,id).state);pc.softwareAction('open-metadata',id);},id);
 // Routing is covered separately; open both metadata files through the public software action.
 await page.evaluate(()=>{for(const id of ['ft','notebook'])pc.syncState(qa.soft.openMetadata(pc.state,id).state);pc.open('torent');pc.syncState(qa.transfer.advanceTransfers(pc.state,10,11).state);});
 await shot('two-transfers');await win('torent').getByRole('button',{name:'Выбрать загрузку FT Studio',exact:true}).click();await win('torent').getByRole('button',{name:/Пауза/}).click();
 assert.equal(await page.evaluate(()=>pc.state.software.transfers.ft.paused),true);
 await page.evaluate(()=>pc.syncState(qa.transfer.advanceTransfers(pc.state,11,21).state));
 await win('torent').getByRole('button',{name:'Выбрать загрузку Рэпблокнот',exact:true}).dblclick();await page.evaluate(()=>qa.install());await win('installer').getByRole('button',{name:'Готово',exact:true}).click();await shot('notebook-empty');
 await page.evaluate(()=>{pc.syncState(qa.soft.resumeTransfer(pc.state,'ft').state);pc.syncState(qa.transfer.advanceTransfers(pc.state,21,1021).state);pc.softwareAction('installer','ft');qa.install();});await win('installer').getByRole('button',{name:'Готово',exact:true}).click();await win('ft-studio').waitFor();
 await page.evaluate(()=>pc.syncState(qa.state.applyToBattle(pc.state,'makarevich-1','Проверка интерфейса')));
 await start('Рэпблокнот');await win('rap-notebook').getByRole('button',{name:'Новый текст',exact:true}).click();
 await win('rap-notebook').getByRole('combobox',{name:'Для чего пишем текст'}).selectOption('makarevich-1');
 await win('rap-notebook').getByRole('button',{name:'Создать текст',exact:true}).click();await shot('notebook-ready-to-start');
 await win('rap-notebook').getByRole('button',{name:'Начать писать',exact:true}).click();
 await page.evaluate(()=>pc.syncState(qa.work.advanceCreativeWork(pc.state,24,{day:2,minutes:720}).state));await shot('notebook-prose');
 await start('FT Studio');
 await win('ft-studio').getByRole('dialog').getByRole('button',{name:'Новый проект',exact:true}).click();
 await win('ft-studio').getByRole('textbox',{name:'Название бита'}).fill('Сквозной трек');
 await win('ft-studio').getByRole('button',{name:'Начать проект',exact:true}).click();
 await page.evaluate(()=>pc.syncState({...pc.state,music:{...pc.state.music,needs:{satiety:100,energy:100}}}));
 await win('ft-studio').getByRole('button',{name:'Работать над битом',exact:true}).click();
 await page.evaluate(()=>pc.syncState(qa.work.advanceCreativeWork(pc.state,24,{day:2,minutes:720}).state));
 await win('ft-studio').getByRole('button',{name:'Добавить вокал',exact:true}).click();
 await win('ft-studio').getByRole('dialog').getByRole('button',{name:'Не переключай',exact:true}).click();
 await page.evaluate(()=>pc.syncState(qa.vocal.advanceVocalWork({...pc.state,music:{...pc.state.music,needs:{satiety:100,energy:100}}},1000).state));
 await shot('studio-draft');
 await go('underweb://battles/makarevich-1');await win('underweb').getByRole('button',{name:'Добавить свою работу',exact:true}).click();
 const picker=pc().getByRole('dialog',{name:'Отправить трек на баттл'});
 for(let i=0;i<7;i++){await page.keyboard.press('Tab');assert.equal(await picker.evaluate(n=>n.contains(document.activeElement)),true);}
 await page.keyboard.press('Escape');assert.equal(await picker.count(),0);
 await win('underweb').getByRole('button',{name:'Добавить свою работу',exact:true}).click();
 await picker.getByRole('button',{name:'Выбрать: Сквозной трек',exact:true}).click();await shot('submission');
 await picker.getByRole('button',{name:'Отправить работу',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>pc.state.battleSubmissions[0].status),'pending');
 await shot('battle-pending');await start('FT Studio');
 for(const label of ['Записать чистовую','Свести','Мастеринг']){
  await page.evaluate(()=>pc.syncState({...pc.state,music:{...pc.state.music,needs:{satiety:100,energy:100}}}));
  await win('ft-studio').getByRole('button',{name:label,exact:true}).click();
  await page.evaluate(()=>pc.syncState(qa.vocal.advanceVocalWork(pc.state,1000).state));
 }
 await shot('studio-mastered');
 for(const size of [{width:800,height:600},{width:1280,height:900}]){
  await page.setViewportSize(size);await go('underweb://iskra');await shot('iskra-'+size.width);
  await go('underweb://dump/notebook');await shot('release-'+size.width);
  await start('Рэпблокнот');await shot('notebook-'+size.width);
  const boxes=await win('rap-notebook').getByRole('button').evaluateAll(nodes=>nodes.filter(n=>n.offsetWidth&&n.offsetHeight).map(n=>({label:n.textContent,x:n.getBoundingClientRect().x,right:n.getBoundingClientRect().right})));
  assert.ok(boxes.every(b=>b.x>=0&&b.right<=size.width),JSON.stringify(boxes));
 }
 await go('underweb://dump');
 assert.equal(await win('underweb').locator('.dump-header button').evaluate(n=>getComputedStyle(n).color),'rgb(60, 89, 93)','tracker heading has readable contrast');
 assert.deepEqual(errors,[]);console.log('PASS real browser software/lyrics/beat/vocal/submission/layout; zero page errors');
}catch(error){await shot('failure');console.log(await page.locator('body').innerText());throw error;}finally{await context.close();await browser.close();}
