import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {startPreviewServer} from '../tools/serve-preview.mjs';

const harness=()=>import('../tools/verify-public-preview.mjs');
const revision='1234567890123456789012345678901234567890';
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
