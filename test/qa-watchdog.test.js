import test from 'node:test';
import assert from 'node:assert/strict';
const {withBrowserWatchdog}=await import('../tools/qa/browser-watchdog.mjs').catch(()=>({}));
test('stalled browser evaluation rejects promptly and closes the owned browser',async()=>{
 assert.equal(typeof withBrowserWatchdog,'function');let closed=0;
 await assert.rejects(withBrowserWatchdog(()=>new Promise(()=>{}),{close:async()=>{closed++;}},20),/timed out/);
 assert.equal(closed,1);
});
test('successful and rejected evaluation clear the watchdog without closing a healthy browser',async()=>{
 assert.equal(typeof withBrowserWatchdog,'function');let closed=0;const browser={close:async()=>{closed++;}};
 assert.equal(await withBrowserWatchdog(async()=>42,browser,20),42);
 await assert.rejects(withBrowserWatchdog(async()=>{throw Error('evaluation failed');},browser,20),/evaluation failed/);
 await new Promise(resolve=>setTimeout(resolve,35));assert.equal(closed,0);
});
