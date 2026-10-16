import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../tools/qa/held-worker-reply.js').catch(()=>({}));
function setup(timeoutMs=1000){
 assert.equal(typeof api.createHeldWorkerReply,'function','bounded native Worker reply wait exists');
 const native={sent:[],terminated:0,postMessage(value){this.sent.push(value);},terminate(){this.terminated++;}};
 return {native,reply:api.createHeldWorkerReply(()=>native,{timeoutMs})};
}
test('successful native reply stays held until explicit delivery and disposes once',async()=>{
 const {native,reply}=setup(),delivered=[];reply.worker.onmessage=e=>delivered.push(e.data);reply.worker.postMessage({id:1});
 const event={data:{id:1,patch:{kept:true}}};native.onmessage(event);await reply.received;assert.deepEqual(delivered,[]);
 reply.deliver();assert.deepEqual(delivered,[{id:1,patch:{kept:true}}]);reply.dispose();reply.worker.terminate();assert.equal(native.terminated,1);
});
test('asynchronous native Worker error rejects the awaited reply without throwing from the handler',async()=>{
 const {native,reply}=setup();let prevented=false;
 try{const rejected=assert.rejects(reply.received,/Worker failed: injected load failure/);assert.doesNotThrow(()=>native.onerror({message:'injected load failure',preventDefault(){prevented=true;}}));await rejected;assert.equal(prevented,true);}
 finally{reply.dispose();}assert.equal(native.terminated,1);
});
test('absent native reply rejects on its explicit deadline and cleanup releases the worker',async()=>{
 const {native,reply}=setup(20);
 try{await assert.rejects(reply.received,/reply timed out after 20 ms/);}finally{reply.dispose();}
 assert.equal(native.terminated,1);assert.equal(native.onmessage,null);assert.equal(native.onerror,null);
});
