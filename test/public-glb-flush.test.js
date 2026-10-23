import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('GLB observation flush waits for delayed digest and evidence delivery before context closes',async()=>{
 const source=await readFile(new URL('../tools/verify-public-preview.mjs',import.meta.url),'utf8');
 const start=source.indexOf('function observeAssetReads(){'),end=source.indexOf('\nexport async function verifyPublicPreview',start);
 assert.ok(start>=0&&end>start);
 let releaseDigest,releaseDelivery,reads=0,events=[];
 const digest=new Promise(resolve=>releaseDigest=resolve),delivery=new Promise(resolve=>releaseDelivery=resolve);
 const url='http://127.0.0.1:43000/battle-life/assets/apartment/v3/static.glb';
 const response={url,status:200,headers:{get:()=>3},body:{getReader:()=>({read:async()=>reads++?{done:true}:{done:false,value:Uint8Array.from([1,2,3])}})}};
 const window={fetch:async()=>response,__previewAssetEvent:async event=>{events.push(event);await delivery;}};
 const crypto={subtle:{digest:async(_algorithm,bytes)=>{assert.deepEqual(Array.from(bytes),[1,2,3]);return digest;}}};
 vm.runInNewContext('('+source.slice(start,end)+')()',{window,crypto,performance:{timeOrigin:500},URL,Date});
 const actual=await window.fetch(url),reader=actual.body.getReader();await reader.read();await reader.read();
 assert.equal(typeof window.__previewFlushAssets,'function','pending evidence must have an explicit drain');
 let drained=false;const flush=window.__previewFlushAssets().then(()=>drained=true);
 await new Promise(setImmediate);assert.equal(drained,false);assert.equal(events.length,0);
 releaseDigest(new Uint8Array(32).buffer);await new Promise(setImmediate);
 assert.equal(events.length,1);assert.equal(drained,false,'binding delivery is part of the drain');
 releaseDelivery();await flush;assert.equal(drained,true);assert.equal(events[0].bytes,3);assert.equal(events[0].eof,true);assert.equal(events[0].sha256,'00'.repeat(32));
 await window.__previewFlushAssets();
});
