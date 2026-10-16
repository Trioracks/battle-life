import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('software QA releases its HTTP server when installed browser launch fails',async()=>{
 const child=spawn(process.execPath,['tools/verify-pc-software.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PLAYWRIGHT_MODULE_PATH:fileURLToPath(new URL('./helpers/failed-browser-launch.cjs',import.meta.url)),PLAYWRIGHT_CHROMIUM_EXECUTABLE:fileURLToPath(new URL('./fixtures/no-such-qa-browser.exe',import.meta.url))},windowsHide:true});
 let stderr='',expired=false;child.stderr.on('data',data=>stderr+=data);child.stdout.resume();
 const timer=setTimeout(()=>{expired=true;child.kill();},8000);
 const code=await new Promise((yes,no)=>{child.once('error',no);child.once('exit',yes);});clearTimeout(timer);
 assert.match(stderr,/executable|doesn't exist/i,'expected deliberate browser launch error');
 assert.equal(expired,false,'server leaked after launch failure and kept the process alive');assert.notEqual(code,0);
});
