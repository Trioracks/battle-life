import test from 'node:test';
import assert from 'node:assert/strict';
import {isCompletedGlbSignal} from '../tools/verify-public-preview.mjs';

test('missing Chromium resource timing requires independently matching consumed GLB bytes',()=>{
 const hash='ab'.repeat(32),url='http://127.0.0.1:43000/battle-life/assets/apartment/v3/static.glb?rev=21';
 const failure={url,why:'net::ERR_ABORTED',startedAt:1000,documentTimeOrigin:500,resourceTiming:[]};
 const consumed={url,status:200,eof:true,bytes:60090988,declaredBytes:60090988,startedAt:997,documentTimeOrigin:500,initiator:'at http://127.0.0.1:43000/battle-life/vendor/three/three.module.js:44865:35',sha256:hash};
 assert.equal(isCompletedGlbSignal(failure,consumed,60090988,true,hash),true);
 for(const change of [{sha256:'cd'.repeat(32)},{sha256:undefined},{eof:false},{bytes:60090987},{status:404},{documentTimeOrigin:501}])assert.equal(isCompletedGlbSignal(failure,{...consumed,...change},60090988,true,hash),false);
 assert.equal(isCompletedGlbSignal(failure,consumed,60090988,false,hash),false);
 assert.equal(isCompletedGlbSignal(failure,consumed,60090988,true),false);
 assert.equal(isCompletedGlbSignal({...failure,why:'net::ERR_CONNECTION_RESET'},consumed,60090988,true,hash),false);
});
