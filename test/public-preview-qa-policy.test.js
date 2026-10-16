import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {startPreviewServer} from '../tools/serve-preview.mjs';

const harness=()=>import('../tools/verify-public-preview.mjs');
const revision='1234567890123456789012345678901234567890';
async function scheduledWatchdog(){
 const source=await fs.readFile(new URL('../tools/verify-public-preview.mjs',import.meta.url),'utf8');
 const assignment=source.match(/^  watchdog=setTimeout\(.+;$/m);
 assert.ok(assignment,'missing QA watchdog scheduling');
 let callback,interval,closed=0;
 const report={pageErrors:[]};
 vm.runInNewContext(assignment[0],{report,browser:{close(){closed++;}},setTimeout(expire,milliseconds){callback=expire;interval=milliseconds;}});
 return {report,interval,expire:()=>callback(),closed:()=>closed};
}
test('hosted QA watchdog leaves eight minutes outside its two-viewport budget',async()=>{
 const watchdog=await scheduledWatchdog();
 assert.equal(watchdog.interval,1_320_000,'full hosted QA has a 22-minute overall deadline');
 const workflow=(await fs.readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
 const checks=workflow.match(/^  checks-build:\n[\s\S]*?^    timeout-minutes: (\d+)$/m);
 const deploy=workflow.match(/^  deploy:\n[\s\S]*?^    timeout-minutes: (\d+)$/m);
 assert.ok(checks,'missing checks-build timeout');assert.ok(deploy,'missing deploy timeout');
 assert.equal(Number(checks[1]),30);assert.equal(Number(deploy[1]),10);
 assert.equal(Number(checks[1])*60_000-watchdog.interval,480_000,'setup, tests, audits, build and upload retain eight minutes');
});
test('expired QA watchdog records failure and closes the owned browser',async()=>{
 const watchdog=await scheduledWatchdog();
 assert.deepEqual(watchdog.report.pageErrors,[]);assert.equal(watchdog.closed(),0);
 watchdog.expire();
 assert.deepEqual(watchdog.report.pageErrors,['QA watchdog expired']);assert.equal(watchdog.closed(),1);
});
async function artifact(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'preview-qa-policy-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'release.json'),JSON.stringify({version:'0.1.0-preview.1',profile:'public-preview',revision}));
 await fs.writeFile(path.join(root,'.nojekyll'),'');await fs.writeFile(path.join(root,'index.html'),'<!doctype html>');
 return root;
}
test('QA refuses the source tree before launching a browser',async()=>{
 const {validateQaOptions}=await harness();
 await assert.rejects(validateQaOptions({root:process.cwd(),expectedRevision:revision}),/built artifact/);
});
test('QA refuses an unexpected artifact revision',async t=>{
 const {validateQaOptions}=await harness(),root=await artifact(t);
 await assert.rejects(validateQaOptions({root,expectedRevision:'a'.repeat(40)}),/revision/);
});
test('QA accepts a built artifact and keeps evidence outside source and artifact',async t=>{
 const {validateQaOptions}=await harness(),root=await artifact(t);
 assert.equal((await validateQaOptions({root,expectedRevision:revision})).manifest.revision,revision);
 for(const outputDir of [root,path.join(root,'qa'),process.cwd(),path.join(process.cwd(),'test','qa')])
  await assert.rejects(validateQaOptions({root,expectedRevision:revision,outputDir}),/outside/);
});
test('QA rejects arbitrary origins and the player port, even with live mode',async t=>{
 const {validateQaOptions}=await harness(),root=await artifact(t);
 for(const options of [{url:'http://127.0.0.1:4173/battle-life/'},{live:true,url:'https://localhost:4173/battle-life/'},{live:true,url:'http://example.com/battle-life/'},{url:'https://example.com/battle-life/'}])
  await assert.rejects(validateQaOptions({root,expectedRevision:revision,...options}),/HTTPS|4173|live/);
});
test('live QA requires fresh contexts and rejects profile reuse options',async t=>{
 const {validateQaOptions}=await harness(),root=await artifact(t);
 for(const options of [{userDataDir:'profile'},{storageState:'save.json'},{context:{}}])
  await assert.rejects(validateQaOptions({root,expectedRevision:revision,live:true,url:'https://example.com/battle-life/',...options}),/isolated/);
 const result=await validateQaOptions({root,expectedRevision:revision,live:true,url:'https://example.com/battle-life/'});
 assert.equal(result.live,true);
});
test('network guard rejects binary audio, bad responses and served test modules',async()=>{
 const {responseViolation}=await harness();
 for(const response of [
  {url:'https://example.com/battle-life/assets/audio/x.wav',status:200,contentType:'audio/wav'},
  {url:'https://example.com/battle-life/x.bin',status:200,contentType:'audio/mpeg'},
  {url:'https://example.com/battle-life/src/beat-pcm-worker.js?rev=44',status:200},
  {url:'https://example.com/battle-life/src/missing.js',status:404},
  {url:'https://example.com/battle-life/src/error.js',status:500},
  {url:'https://example.com/battle-life/test/helpers/fixture.js',status:200},
  {url:'https://example.com/battle-life/tools/qa/helper.js',status:200}
 ])assert.ok(responseViolation(response),response.url);
 assert.equal(responseViolation({url:'https://example.com/battle-life/assets/audio/pc/manifest.json',status:200,contentType:'application/json'}),null);
 assert.equal(responseViolation({url:'https://example.com/battle-life/src/social-worker.js?rev=44',status:200,contentType:'text/javascript'}),null);
});
test('live release validation checks identity without requiring identical build timestamps',async()=>{
 const {validateLiveRelease}=await harness();
 const expected={version:'0.1.0-preview.1',profile:'public-preview',revision,sourceCommit:'b'.repeat(40),builtAt:'2026-10-16T00:00:00Z'};
 assert.doesNotThrow(()=>validateLiveRelease({...expected,builtAt:'2026-10-16T01:00:00Z'},expected));
 for(const change of [{revision:'a'.repeat(40)},{profile:'local-full'},{version:'old'},{sourceCommit:'c'.repeat(40)},{builtAt:'not-a-date'}])
  assert.throws(()=>validateLiveRelease({...expected,...change},expected));
});
test('controlled cache responder primes only old assets then delegates the unchanged artifact',async t=>{
 const {startCacheProbeServer}=await harness(),root=await artifact(t);
 await fs.mkdir(path.join(root,'src'));await fs.writeFile(path.join(root,'src/apartment-app.js'),'export const current=true;');
 const artifactServer=await startPreviewServer({root,port:0});t.after(()=>artifactServer.close());
 const probe=await startCacheProbeServer({artifactUrl:artifactServer.url});t.after(()=>probe.close());
 const old=await fetch(probe.url+'src/apartment-app.js?rev=43');assert.equal(old.headers.get('cache-control'),'public, max-age=3600, immutable');assert.match(await old.text(),/43/);
 probe.useCurrent();assert.equal(await (await fetch(probe.url+'src/apartment-app.js?rev=44')).text(),'export const current=true;');
 assert.equal(await (await fetch(probe.url+'src/apartment-app.js?rev=43')).text(),'export const current=true;');
 assert.equal(await (await fetch(probe.url)).text(),'<!doctype html>');
 assert.equal(probe.priorHits['src/apartment-app.js'],1);
 await assert.rejects(startCacheProbeServer({artifactUrl:'http://127.0.0.1:4173/battle-life/'}),/4173/);
});
test('only fully consumed parsed-scene GLB cancellation signals are classified as complete',async()=>{
 const {isCompletedGlbSignal}=await harness();
 const failure={url:'http://127.0.0.1:43000/battle-life/assets/apartment/v3/interaction.glb?rev=40',why:'net::ERR_ABORTED',startedAt:1000,documentTimeOrigin:500,resourceTiming:[{decodedBodySize:4814552,encodedBodySize:4814552,transferSize:4814852}]};
 const consumption={url:failure.url,startedAt:997,status:200,eof:true,bytes:4814552,declaredBytes:4814552,documentTimeOrigin:500,initiator:'at http://127.0.0.1:43000/battle-life/vendor/three/three.module.js:44865:35'};
 assert.equal(isCompletedGlbSignal(failure,consumption,4814552,true),true);
 for(const change of [{eof:false},{bytes:4814551},{status:404},{declaredBytes:10},{initiator:'unknown'},{startedAt:0},{documentTimeOrigin:501}])
  assert.equal(isCompletedGlbSignal(failure,{...consumption,...change},4814552,true),false);
 assert.equal(isCompletedGlbSignal(failure,consumption,4814552,false),false);
 assert.equal(isCompletedGlbSignal({...failure,why:'net::ERR_CONNECTION_RESET'},consumption,4814552,true),false);
 assert.equal(isCompletedGlbSignal({...failure,resourceTiming:[]},consumption,4814552,true),false);
 assert.equal(isCompletedGlbSignal({...failure,url:failure.url.replace('.glb','.js')},consumption,4814552,true),false);
});
