// Focused failure-path check. No frame profiling or player-origin access.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {verifyFinalWorkflows} from './qa/final-workflows.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const out=resolve(process.env.FT_QA_DIR||'artifacts/task-11/worker-reply-review'),root=resolve('.'),base='http://127.0.0.1:4191';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
assert.equal(await access(out+'/results.json').then(()=>true,()=>false),false,'Choose a new evidence directory');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,base).pathname,file=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}});
const original=await readFile('src/apartment-app.js','utf8'),source=original.replace("loading.hidden=true;setMode('menu');","window.campaignQA={get state(){return pcState},get pc(){return virtualPc},get phase(){return pcLifecycle.snapshot.phase}};loading.hidden=true;setMode('menu');");
let browser;const results=[],failures=[];
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(4191,'127.0.0.1',yes);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
 for(const mode of ['error','silent','success']){
  const label='worker-'+mode;let context,closed=false,guard,guardExpired=false;const errors=[],start=performance.now();
  const scopedBrowser={async newContext(options){context=await browser.newContext(options);return {async newPage(){const page=await context.newPage();if(mode!=='success')await page.route('**/src/social-worker.js*',r=>r.fulfill({contentType:'text/javascript',body:mode==='error'?"throw Error('injected native Worker execution failure')":"self.onmessage=()=>{};"}));return page;},async close(){closed=true;await context.close();}};}};
  try{
   const work=verifyFinalWorkflows({browser:scopedBrowser,base,out,label,source,errors,workerTimeoutMs:mode==='success'?15000:250});let caught,result;
   try{result=await Promise.race([work,new Promise((_,no)=>guard=setTimeout(()=>{guardExpired=true;no(Error('focused acceptance path did not settle'));},mode==='success'?90000:10000))]);}catch(error){caught=error;}finally{clearTimeout(guard);}
   if(guardExpired){await context?.close();await work.catch(()=>{});}
   assert.equal(guardExpired,false,mode+' acceptance wait remained pending');
   if(mode==='success'){assert.equal(caught,undefined);assert.equal(result.actualPageReload,true);assert.equal(result.lateNativeWorker,true);}
   else{assert.ok(caught,mode+' must reject');const expected=mode==='error'?/Worker failed:.*injected native Worker execution failure/:/reply timed out after 250 ms/;assert.match(caught.message,expected);const artifact=JSON.parse(await readFile(`${out}/${label}-integration-failure.json`,'utf8'));assert.match(artifact.error,expected);assert.ok((await readFile(`${out}/${label}-integration-failure.png`)).length>100);}
   assert.equal(closed,true,mode+' context cleanup');assert.equal(browser.contexts().length,0,mode+' leaked browser contexts');assert.deepEqual(errors,[],mode+' leaked asynchronous page errors');
   results.push({mode,passed:true,elapsedMs:performance.now()-start,contextClosed:closed,errors});
  }catch(error){failures.push({mode,error:error.stack});results.push({mode,passed:false,elapsedMs:performance.now()-start,contextClosed:closed});await context?.close().catch(()=>{});}
 }
 assert.deepEqual(failures,[]);console.log('PASS native acceptance Worker error, absent reply timeout and successful held reply; artifacts captured and contexts closed');
}finally{try{await browser?.close();}finally{server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));await writeFile(out+'/results.json',JSON.stringify({base,results,failures,cleanup:{serverClosed:!server.listening,browserClosed:Boolean(browser)}},null,2));console.log(JSON.stringify(results));}}
