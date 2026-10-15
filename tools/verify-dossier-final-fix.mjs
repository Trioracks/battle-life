import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {withBrowserWatchdog} from './qa/browser-watchdog.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/zubko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('.'),out=resolve('artifacts/dossier-weekplay/final-fix/native'),base='http://127.0.0.1:4206';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.html':'text/html'};
const evidence={base,headless:true,subjectiveListening:false,scope:'Focused real PC/dossier view; no timing or repeated live-week measurement',errors:[],assetFailures:[],shots:[]};
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,base).pathname;
 if(pathname==='/__fix'){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" href="data:,"><link rel="stylesheet" href="/virtual-pc.css?rev=43"><link rel="stylesheet" href="/desktop-apps.css?rev=43"><link rel="stylesheet" href="/social-network.css?rev=43"><link rel="stylesheet" href="/rap-dossier.css?rev=43"><style>body{margin:0;background:#242524}#virtual-pc{position:fixed;inset:0}</style><main id="virtual-pc"></main>');return;}
 const file=resolve(root,'.'+decodeURIComponent(pathname));if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
 res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
let browser,page;const record=()=>writeFile(out+'/evidence.json',JSON.stringify(evidence,null,2));
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(4206,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>evidence.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)evidence.assetFailures.push(r.url());});
 await page.goto(base+'/__fix');const evaluate=fn=>withBrowserWatchdog(()=>page.evaluate(fn),browser,60000);
 evidence.initial=await evaluate(async()=>{
  const [{mountVirtualPc},{dossierLegacyFixture},{topicFixture}]=await Promise.all([import('/src/virtual-pc-ui.js?rev=43'),import('/test/helpers/dossier-legacy-fixture.js'),import('/test/helpers/round-topic-fixture.js')]);
  const old=dossierLegacyFixture(),s=topicFixture();Object.assign(s,{rapAnalysis:old.rapAnalysis,rapDossier:old.rapDossier,judgeDossier:old.judgeDossier,trackVersions:old.trackVersions,judging:old.judging,battleSubmissions:old.battleSubmissions});s.software.dossier.installed=true;s.power='on';s.tournaments.byId['makarevich-1'].rounds.selection.submissions.player='weak';
  window.fixPC=mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:()=>true});fixPC.showDesktop(s);fixPC.syncHost({gameMinutes:13800});fixPC.open('rap-dossier');fixPC.dossierView.focusTarget({characterId:'eparhiya'});
  const response=await fetch('/assets/ui/virtual-pc/icons/dossier.svg'),img=new Image();img.src='/assets/ui/virtual-pc/icons/dossier.svg';await img.decode();
  return {reports:Object.keys(fixPC.state.rapAnalysis.reports),findings:Object.keys(fixPC.state.rapResearch.findings),svg:{mime:response.headers.get('content-type'),width:img.naturalWidth}};
 });
 assert.deepEqual(evidence.initial.findings,[]);assert.equal(evidence.initial.svg.mime,'image/svg+xml');assert.ok(evidence.initial.svg.width>0);
 const capture=async name=>{const path=out+'/'+name+'.png';await page.screenshot({path});evidence.shots.push(path);};
 assert.equal(await page.locator('.rd-detail').getByRole('button',{name:'Первая демка · study:1',exact:true}).count(),1);
 await capture('legacy-judge-report');
 const quote=page.locator('.rd-detail blockquote');assert.match(await quote.innerText(),/Без дисса сюда зачем/);await quote.scrollIntoViewIfNeeded();
 assert.match(await page.locator('.rd-detail').innerText(),/01.09.2012 02:30/);await capture('legacy-quote-attribution');
 const source=page.locator('.rd-detail').getByRole('button',{name:'Открыть источник цитаты',exact:true});await source.focus();await page.keyboard.press('Enter');
 evidence.navigation=await page.getByRole('textbox',{name:'Адрес или поиск Underweb',exact:true}).inputValue();assert.equal(evidence.navigation,'underweb://social/results/makarevich-1/selection');await capture('legacy-quote-source');
 await evaluate(()=>{fixPC.closeWindow('underweb');fixPC.open('rap-dossier');fixPC.dossierView.focusTarget({caseId:'archive'});});
 evidence.archive=await evaluate(()=>[...document.querySelectorAll('[data-dossier-node]')].map(n=>({id:n.dataset.dossierNode,x:Number(n.dataset.boardX),y:Number(n.dataset.boardY)})));
 assert.ok(evidence.archive.some(n=>n.id==='judge:eparhiya'));assert.equal(new Set(evidence.archive.map(n=>n.x+':'+n.y)).size,evidence.archive.length);await capture('legacy-archive');
 evidence.empty=await evaluate(async()=>{
  const [{topicFixture},{startCaseStudy,advanceCaseStudy},{mountVirtualPc}]=await Promise.all([import('/test/helpers/round-topic-fixture.js'),import('/src/rap-research.js?rev=43'),import('/src/virtual-pc-ui.js?rev=43')]);
  let s=topicFixture();s.software.dossier.installed=true;s.music.needs={satiety:100,energy:100};s.power='on';const characterId=s.roundThemes['makarevich-1:round-2'].authorJudgeId;
  const begun=startCaseStudy(s,{kind:'judge',battleId:'makarevich-1',characterId,nowMinute:13440});if(!begun.ok)throw Error(begun.reason);s=advanceCaseStudy(begun.state,{gameMinutes:45,nowMinute:13485}).state;
  fixPC.dispose();window.fixPC=mountVirtualPc(document.querySelector('#virtual-pc'),{onPersist:()=>true});fixPC.showDesktop(s);fixPC.syncHost({gameMinutes:13485});fixPC.open('rap-dossier');fixPC.dossierView.focusTarget({characterId});
  return {characterId,finding:Object.values(s.rapResearch.findings)[0].evidenceStatus};
 });
 assert.equal(evidence.empty.finding,'unknown');assert.match(await page.locator('.rd-detail').innerText(),/Изучение завершено.*10.09.2012 08:00/s);assert.doesNotMatch(await page.locator('.rd-detail').innerText(),/Наблюдений пока нет/);await capture('completed-empty-study');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Вписать доску',exact:true}).click();await page.locator('.rd-detail').scrollIntoViewIfNeeded();assert.equal(await evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await capture('completed-empty-narrow');
 await evaluate(()=>fixPC.dispose());assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.assetFailures,[]);evidence.passed=true;await context.close();
}catch(error){evidence.failure=error.stack;if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally{await browser?.close();server.closeAllConnections();if(server.listening)await new Promise(done=>server.close(done));evidence.cleanup={browserClosed:!browser?.isConnected(),serverClosed:!server.listening};await record();console.log(JSON.stringify(evidence,null,2));}
