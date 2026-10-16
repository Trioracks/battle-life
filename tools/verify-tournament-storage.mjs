import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {advanceBattleLifecycle} from '../src/battle-judging-clock.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core'),out=process.env.FT_QA_DIR||'D:/Project/Battle/artifacts/v-krugu-qa';
await mkdir(out+'/browser-temp',{recursive:true});process.env.TEMP=process.env.TMP=out+'/browser-temp';
const started=performance.now(),initial=ensureBattleWindow(createVirtualPcState(),{battleId:'makarevich-1',nowMinute:600,judgingPolicyVersion:2}).state,done=advanceBattleLifecycle(initial,100000);
assert.equal(done.reason,undefined);assert.equal(done.state.tournaments.byId['makarevich-1'].status,'complete');const simulationMs=performance.now()-started;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage();await page.route('**/__tournament-storage-qa',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated tournament storage QA</title>'}));await page.goto((process.env.BATTLE_QA_URL||'http://127.0.0.1:4175')+'/__tournament-storage-qa');
 const evidence=await page.evaluate(async state=>{
  const {saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY}=await import('/src/virtual-pc-state.js?rev=40'),before=JSON.stringify(state),start=performance.now(),saved=saveVirtualPcState(localStorage,state),saveMs=performance.now()-start;
  if(!saved)throw Error('Native browser quota rejected final tournament');const raw=localStorage.getItem(VIRTUAL_PC_STORAGE_KEY),restored=loadVirtualPcState(localStorage).state;
  return {saved,saveMs,rawCharacters:before.length,storedCharacters:raw.length,compressed:/^(BLPC-LZW1:|BLPC-PARTS1:)/.test(raw),same:JSON.stringify(restored.trackVersions)===JSON.stringify(state.trackVersions)&&JSON.stringify(restored.judging)===JSON.stringify(state.judging),status:restored.tournaments.byId['makarevich-1'].status,versions:Object.keys(restored.trackVersions.byId).length,results:Object.keys(restored.judging.results).length};
 },done.state);
 assert.equal(evidence.same,true);assert.equal(evidence.status,'complete');assert.equal(evidence.compressed,true);assert.ok(evidence.storedCharacters<2_000_000);await page.reload();assert.ok(await page.evaluate(()=>localStorage.length>0));
 await writeFile(out+'/tournament-storage-evidence.json',JSON.stringify({...evidence,simulationMs},null,2));console.log('PASS full NPC tournament and native lossless storage',JSON.stringify({...evidence,simulationMs}));
}finally{await browser.close();}
